import React from "react";
import { renderToString } from "react-dom/server";
import { AuthHandler, RequestContext } from "../lib/AuthHandler.ts";
import {
  AccountPage,
  HomePage,
  LoginPage,
  NotFoundPage,
  RoomPage,
} from "./components.tsx";
import { getFullRoomUrlFromUrlName } from "../lib/utils.ts";
import {
  createRoom,
  getLatestRoomNameForOwnerName,
  getUrlForRoomNameAndOwner,
  isRoomOpenByUrlName,
  isUserOwnerOfRoom,
  openRoom,
  roomNameByUrlName,
} from "../lib/database-access.ts";
import {
  addRoomEventListener,
  CurrentVote,
  emitRoomEvent,
  RoomEventData,
} from "../lib/events.ts";

type RouteContext = {
  req: Request;
  authHandler: AuthHandler;
  requestAuthContext: RequestContext;
  urlParams: Record<string, string | undefined>;
};

type RouteHandler = (
  routeContext: RouteContext,
) => Response | Promise<Response>;

type Routes = {
  [path: string]: {
    [method: string]: RouteHandler;
  };
};

const currentVoteByRoomUrlName: Record<string, CurrentVote> = {};

function getErrorMessage(req: Request, missingFields: string[] = []) {
  if (missingFields.length > 0) {
    return `Please enter your ${missingFields.join(" and ")}`;
  }
  const url = new URL(req.url);
  const error = url.searchParams.get("error");
  switch (error) {
    case "user-not-found":
      return `We couldn't find your account`;
    default:
      return "";
  }
}

function getStatusMessageText(isOpen: boolean, currentVote?: CurrentVote) {
  if (currentVote) {
    return `Vote requested`;
  }
  if (isOpen) {
    return "Voting session started.";
  }
  return "Waiting for host to start voting session.";
}

function prepareDataForEventEnqueue(
  value: RoomEventData,
  encoder: TextEncoder,
) {
  const eventData = `data: ${JSON.stringify(value)}\n\n`;
  return encoder.encode(eventData);
}

const routes: Routes = {
  "/": {
    GET: () => {
      return wrapReactElem(<HomePage />);
    },
  },
  "/login": {
    GET: ({ req }) => {
      const model = {
        error: getErrorMessage(req),
      };
      return wrapReactElem(LoginPage(model), model);
    },
    POST: async ({ req, requestAuthContext }) => {
      const formData = await req.formData();
      const username = formData.get("username");
      const password = formData.get("password");

      const missingFields: string[] = [];

      if (!username || typeof username !== "string") {
        missingFields.push("username");
      }

      if (!password || typeof password !== "string") {
        missingFields.push("password");
      }

      if (missingFields.length > 0) {
        const state = {
          error: getErrorMessage(req, missingFields),
          prefilledUsername: typeof username === "string" ? username : "",
        };
        return wrapReactElem(
          LoginPage(state),
          state,
        );
      }

      if (typeof username !== "string" || typeof password !== "string") {
        throw new Error("this case should already have been dealt with!");
      }

      if (
        await requestAuthContext.validateCredentialsAndCreateSession(
          username,
          password,
        )
      ) {
        return redirect("/account");
      }

      return redirect("/login?error=user-not-found");
    },
  },
  "/account": {
    GET: ({ requestAuthContext }) => {
      const user = requestAuthContext.getUser();
      if (!user) {
        return redirect("/login");
      }
      const state: { username: string; roomUrl?: string; roomName?: string } = {
        username: user.username,
      };
      const latestRoomName = getLatestRoomNameForOwnerName(user.username);
      if (latestRoomName) {
        const urlName = getUrlForRoomNameAndOwner(
          latestRoomName,
          user.username,
        );
        if (urlName) {
          state.roomName = latestRoomName;
          state.roomUrl = getFullRoomUrlFromUrlName(urlName);
        }
      }

      return wrapReactElem(AccountPage(state), state);
    },
  },
  "/request-vote": {
    POST: async ({ req, requestAuthContext }) => {
      const formData = await req.formData();
      const roomUrlName = formData.get("roomUrlName");
      const voteTitle = formData.get("voteTitle");
      const user = requestAuthContext.getUser();
      if (typeof roomUrlName !== "string") {
        return genericResponse("roomUrlName is not a string");
      }
      if (typeof voteTitle !== "string") {
        return genericResponse("voteTitle is not a string");
      }
      if (!user) {
        return genericResponse(
          '"You need to be logged in to perform this action"',
        );
      }
      if (!isUserOwnerOfRoom(user, roomUrlName)) {
        return genericResponse("Wrong user trying to request a vote");
      }
      const isOpen = roomNameByUrlName(roomUrlName);
      if (!isOpen) {
        return genericResponse("Room not found");
      }
      currentVoteByRoomUrlName[roomUrlName] = {
        questionText: voteTitle,
      };
      emitRoomEvent(roomUrlName, {
        statusMessage: "Vote requested",
        isOpen: !!isOpen,
        currentVote: {
          questionText: voteTitle,
        },
      });

      return redirect(getFullRoomUrlFromUrlName(roomUrlName));
      function genericResponse(reason: string) {
        console.error(reason);
        return new Response(
          "An error occurred while processing your request. Maybe the room doesn't exist, maybe you don't have access, maybe something went wrong  on our side.",
          { status: 500 },
        );
      }
    },
  },
  "/create-room": {
    POST: async ({ req, requestAuthContext }) => {
      const user = requestAuthContext.getUser();

      const formData = await req.formData();
      const roomName = formData.get("roomName");
      if (typeof roomName !== "string") {
        throw new Error("roomName is not a string");
      }
      if (!user) {
        throw new Error("You need to be logged in to perform this action");
      }
      // if (roomName.length === 0) {
      //   return redirect("/account?error=room-name-empty");
      // }
      createRoom(roomName, user.username);
      return redirect("/account");
    },
  },
  "/open-room": {
    POST: async ({ req, requestAuthContext }) => {
      const formData = await req.formData();
      const roomUrlName = formData.get("roomUrlName");
      const user = requestAuthContext.getUser();
      if (typeof roomUrlName !== "string") {
        return redirect("/account?error=room-name-empty");
      }
      if (!user) {
        return redirect("/account?error=not-logged-in");
      }
      console.log({
        roomName: roomUrlName,
        user: user.username,
      });
      if (!roomUrlName) {
        return redirect("/account?error=room-name-not-found-a");
      }
      const result = openRoom(roomUrlName, user.username);
      if (result) {
        emitRoomEvent(roomUrlName, {
          isOpen: true,
          statusMessage: getStatusMessageText(true),
        });
        return redirect(getFullRoomUrlFromUrlName(roomUrlName));
      }
      return redirect("/account?error=room-name-not-found-b");
    },
  },
  "/room/:urlName": {
    GET: ({ urlParams, requestAuthContext }) => {
      const { urlName } = urlParams;
      if (!urlName) {
        return redirect("/");
      }
      const roomName = roomNameByUrlName(urlName);
      const isOpen = isRoomOpenByUrlName(urlName);
      const user = requestAuthContext.getUser();
      if (!roomName) {
        return redirect("/");
      }
      const userIsOwner = isUserOwnerOfRoom(user, urlName);
      const state = {
        roomName: roomName,
        statusMessageInput: getStatusMessageText(!!isOpen),
        roomUrlName: urlName,
        fullRoomUrl: getFullRoomUrlFromUrlName(urlName),
        userIsOwner: !!userIsOwner,
        roomOpenAtLoad: !!isOpen,
        initialCurrentVote: currentVoteByRoomUrlName[urlName],
      };
      console.log("room state", state);
      return wrapReactElem(RoomPage(state), state);
    },
  },
  "/api/room/:urlName/events": {
    GET: ({ urlParams }) => {
      const { urlName } = urlParams;

      if (!urlName) {
        return genericError("No url name");
      }
      const roomName = roomNameByUrlName(urlName);
      if (!roomName) {
        return genericError("failed to find room name");
      }
      const encoder = new TextEncoder();
      let interval = setInterval(() => {}, 9999);
      clearInterval(interval);

      const readableStreamDefaultWriter = new ReadableStream({
        start(controller) {
          function send(
            eventData: RoomEventData,
          ) {
            try {
              controller.enqueue(
                prepareDataForEventEnqueue(eventData, encoder),
              );
            } catch (e) {
              console.error("failed to send event", e);
            }
          }
          console.log("streaming events started");
          addRoomEventListener(urlName, (data: RoomEventData) => {
            send(data);
          });
          interval = setInterval(() => {
            const isOpen = isRoomOpenByUrlName(urlName);
            send({
              statusMessage: getStatusMessageText(!!isOpen),
              isOpen: !!isOpen,
              currentVote: currentVoteByRoomUrlName[urlName],
            });
          }, 10_000);
        },
        cancel() {
          clearInterval(interval);
          console.log("streaming events cancelled");
        },
      });

      return new Response(readableStreamDefaultWriter, {
        headers: {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          "Connection": "keep-alive",
        },
      });

      function genericError(reason: string) {
        console.error(reason);
        return new Response(
          "An error occurred while processing your request. Maybe the room doesn't exist, maybe you don't have access, maybe something went wrong  on our side.",
          { status: 500 },
        );
      }
    },
  },
};

export const clientRoutes = Object.keys(routes).reduce((acc, path) => {
  if (!path.includes("/api/")) {
    acc[path] = routes[path].GET;
  }
  return acc;
}, {} as { [path: string]: RouteHandler });

console.log("clientRoutes", clientRoutes);

export const defaultHandler: RouteHandler = () => {
  return wrapReactElem(<NotFoundPage />);
};

function wrapReactElem(
  reactElement: React.JSX.Element,
  initialState = {},
): Response {
  const html = renderToString(reactElement);
  return new Response(
    `<!DOCTYPE html>
    <html>
      <head>
        <title>Vote On It!</title>
        <link rel="stylesheet" href="/static/output.css" />
      </head>
      <body>
        <div id="root">${html}</div>
        <script>
          window.__INITIAL_STATE__ = ${JSON.stringify(initialState)};
        </script>
        <script type="module" src="/static/client.js"></script>
      </body>
    </html>`,
    {
      headers: { "Content-Type": "text/html" },
    },
  );
}

function redirect(url: string, status = 302): Response {
  return new Response(renderToString(<a href={url} />), {
    status,
    headers: {
      Location: url,
    },
  });
}

export function lookupRoute(
  method: string,
  path: string,
): { handler: RouteHandler; params: Record<string, string | undefined> } {
  if (path === "/favicon.ico") {
    return {
      handler: defaultHandler,
      params: {},
    };
  }
  const fakeActualUrl = `http://abc${path}`;
  const match = Object.keys(routes).map((relativeUrl) => {
    const fakeRouteUrl = `http://abc${relativeUrl}`;
    const result = new URLPattern(fakeRouteUrl).exec(fakeActualUrl);
    if (result && routes[relativeUrl][method]) {
      return {
        handler: routes[relativeUrl][method],
        params: result.pathname.groups,
      };
    }
  }).filter((x) => x)[0];

  if (match) {
    return match;
  }
  return {
    handler: defaultHandler,
    params: {},
  };
}
