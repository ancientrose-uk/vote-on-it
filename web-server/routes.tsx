import React from "react";
import { HomePage, NotFoundPage, RoomPage } from "./components.tsx";
import { getFullRoomUrlFromUrlName } from "../lib/utils.ts";
import {
  createRoom,
  isRoomOpenByUrlName,
  isUserOwnerOfRoom,
  openRoom,
  roomNameByUrlName,
} from "../lib/database-access.ts";
import {
  addGuestRoomEventListener,
  addHostRoomStatsListener,
  CurrentStats,
  CurrentVote,
  emitGuestRoomEvent,
  emitHostRoomStats,
  emitPreviousGuestStats,
  emitPreviousSummaryEvent,
  GuestRoomEventData,
  HostRoomStatsData,
  VoterId,
} from "../lib/events.ts";
import { randomUUID } from "node:crypto";
import { RouteHandler, Routes } from "../lib/types.ts";
import { redirect, wrapReactElem } from "../routes/helpers.tsx";
import { loginRoutes } from "../routes/login-routes.tsx";
import { account } from "../routes/account-routes.tsx";

const currentVoteByRoomUrlName: Record<string, CurrentVote> = {};
const currentStatsByRoomUrlName: Record<string, CurrentStats> = {};
const previousVoteSummaryByRoomUrlName: Record<string, CurrentStats> = {};
const currentUserListByRoomUrlName: Record<string, Set<VoterId>> = {};

function emitRoomSizeChange(urlName: string) {
  currentStatsByRoomUrlName[urlName].totalGuests =
    currentUserListByRoomUrlName[urlName].size;
  emitHostRoomStats(urlName, currentStatsByRoomUrlName[urlName]);
}

function addOneGuestToRoom(urlName: string, voterId: VoterId) {
  currentUserListByRoomUrlName[urlName] =
    currentUserListByRoomUrlName[urlName] || new Set<VoterId>();
  currentStatsByRoomUrlName[urlName] = currentStatsByRoomUrlName[urlName] || {};
  currentUserListByRoomUrlName[urlName].add(voterId);
  emitRoomSizeChange(urlName);
}

function removeOneGuestFromRoom(urlName: string, voterId: VoterId) {
  currentUserListByRoomUrlName[urlName] =
    currentUserListByRoomUrlName[urlName] || new Set<VoterId>();
  currentStatsByRoomUrlName[urlName] = currentStatsByRoomUrlName[urlName] || {};
  currentUserListByRoomUrlName[urlName].delete(voterId);
  emitRoomSizeChange(urlName);
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
  value: GuestRoomEventData | HostRoomStatsData,
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
  ...loginRoutes,
  ...account,
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
      const voteId = randomUUID();

      delete previousVoteSummaryByRoomUrlName[roomUrlName];
      emitPreviousSummaryEvent(roomUrlName, {
        type: "PREVIOUS_VOTE_SUMMARY",
        previousVoteSummary: undefined,
      });
      const currentVote = {
        questionText: voteTitle,
        voteId,
        alreadyVoted: [],
      };
      currentVoteByRoomUrlName[roomUrlName] = currentVote;
      emitGuestRoomEvent(roomUrlName, {
        type: "GUEST_ROOM_EVENT",
        statusMessage: "Vote requested",
        isOpen: !!isOpen,
        currentVote,
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
      console.log("opened room", {
        roomName: roomUrlName,
        user: user.username,
      });
      if (!roomUrlName) {
        return redirect("/account?error=room-name-not-found-a");
      }
      const result = openRoom(roomUrlName, user.username);
      if (result) {
        emitGuestRoomEvent(roomUrlName, {
          type: "GUEST_ROOM_EVENT",
          isOpen: true,
          statusMessage: getStatusMessageText(true),
        });
        return redirect(getFullRoomUrlFromUrlName(roomUrlName));
      }
      return redirect("/account?error=room-name-not-found-b");
    },
  },
  "/end-vote": {
    POST: async ({ req, requestAuthContext }) => {
      const formData = await req.formData();
      const roomUrlName = formData.get("roomUrlName");
      const voteId = formData.get("voteId");
      const user = requestAuthContext.getUser();
      if (typeof roomUrlName !== "string" || typeof voteId !== "string") {
        return redirect("/account?error=room-name-or-vote-id-empty");
      }
      if (!isUserOwnerOfRoom(user, roomUrlName)) {
        return redirect("/?error=not-logged-in");
      }
      const currentVoteForRoom = currentVoteByRoomUrlName[roomUrlName];
      if (currentVoteForRoom?.voteId !== voteId) {
        return redirect("/?error=vote-id-doesnt-match");
      }
      previousVoteSummaryByRoomUrlName[roomUrlName] = Object.assign(
        {},
        currentStatsByRoomUrlName[roomUrlName],
      );
      if (!previousVoteSummaryByRoomUrlName[roomUrlName].question) {
        previousVoteSummaryByRoomUrlName[roomUrlName].question =
          currentVoteForRoom.questionText;
      }

      delete currentVoteByRoomUrlName[roomUrlName];
      const state = currentStatsByRoomUrlName[roomUrlName];
      if (state) {
        state.totalVotes = 0;
        state.votedAgainst = 0;
        state.votedFor = 0;
        state.abstained = 0;
      }
      emitGuestRoomEvent(roomUrlName, {
        type: "GUEST_ROOM_EVENT",
        isOpen: true,
        statusMessage: getStatusMessageText(true),
      });
      emitPreviousSummaryEvent(roomUrlName, {
        type: "PREVIOUS_VOTE_SUMMARY",
        previousVoteSummary: previousVoteSummaryByRoomUrlName[roomUrlName],
      });
      return redirect(getFullRoomUrlFromUrlName(roomUrlName));
    },
  },
  "/room/:urlName": {
    GET: ({ urlParams, requestAuthContext }) => {
      const { urlName } = urlParams;
      const voterId = requestAuthContext.getVoterId();
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

      currentStatsByRoomUrlName[urlName] = currentStatsByRoomUrlName[urlName] ||
        {
          totalGuests: 0,
        };
      const currentVote = currentVoteByRoomUrlName[urlName];
      const userAlreadyVoted = (currentVote?.alreadyVoted || []).includes(
        voterId,
      );
      const state = {
        roomName: roomName,
        statusMessageInput: getStatusMessageText(!!isOpen),
        roomUrlName: urlName,
        fullRoomUrl: getFullRoomUrlFromUrlName(urlName),
        userIsOwner: !!userIsOwner,
        roomOpenAtLoad: !!isOpen,
        initialCurrentVote: currentVote,
        initialStats: currentStatsByRoomUrlName[urlName],
        initialHasAlreadyVotedInThisVote: userAlreadyVoted,
        initialPreviousVoteSummary: previousVoteSummaryByRoomUrlName[urlName],
        voterId,
      };
      return wrapReactElem(RoomPage(state), state);
    },
    POST: async ({ req, requestAuthContext, urlParams }) => {
      const { urlName: roomUrlName } = urlParams;
      const formData = await req.formData();
      const vote = getVoteFromFormData(formData);
      const formDataRoomUrl = formData.get("roomUrlName");
      if (!vote) {
        return redirect(req.url + "/?error=vote-not-valid");
      }
      if (roomUrlName !== formDataRoomUrl) {
        return redirect(req.url + "?error=room-combination-not-valid");
      }
      const voterId = requestAuthContext.getVoterId();
      if (!roomUrlName) {
        return redirect("/?error=room-not-found");
      }
      const currentVote = currentVoteByRoomUrlName[roomUrlName];
      const voteStats = currentStatsByRoomUrlName[roomUrlName];
      if (!currentVote || !voteStats) {
        return redirect(req.url + "?error=vote-not-found");
      }
      const alreadyVoted = currentVote.alreadyVoted;
      if (alreadyVoted.includes(voterId)) {
        return redirect(req.url + "?error=already-voted");
      }
      if (!voterId) {
        throw new Error("No voter id, wtf?");
      }
      alreadyVoted.push(voterId);
      voteStats.totalVotes = voteStats.totalVotes || 0;
      voteStats.votedFor = voteStats.votedFor || 0;
      voteStats.votedAgainst = voteStats.votedAgainst || 0;
      voteStats.abstained = voteStats.abstained || 0;
      voteStats.totalVotes = voteStats.totalVotes + 1;
      voteStats[vote] += 1;
      emitHostRoomStats(roomUrlName, voteStats);
      emitPreviousGuestStats(roomUrlName);
      return redirect(req.url);
    },
  },
  "/api/room/:urlName/events": {
    GET: ({ urlParams, requestAuthContext }) => {
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

      const isForOwner = isUserOwnerOfRoom(
        requestAuthContext.getUser(),
        urlName,
      );
      const voterId = requestAuthContext.getVoterId();

      const readableStreamDefaultWriter = new ReadableStream({
        start(controller) {
          if (!isForOwner) {
            addOneGuestToRoom(urlName, voterId);
          }
          function send(
            eventData: GuestRoomEventData | HostRoomStatsData,
          ) {
            try {
              controller.enqueue(
                prepareDataForEventEnqueue(eventData, encoder),
              );
            } catch (_) {
              // ignore
            }
          }
          addGuestRoomEventListener(urlName, (data: GuestRoomEventData) => {
            send(data);
          });
          if (isForOwner) {
            addHostRoomStatsListener(urlName, (data) => {
              send(data);
            });
          }
          const sendCurrentStatus = () => {
            const isOpen = isRoomOpenByUrlName(urlName);
            if (!isForOwner) {
              addOneGuestToRoom(urlName, voterId);
            }
            send({
              type: "GUEST_ROOM_EVENT",
              statusMessage: getStatusMessageText(!!isOpen),
              isOpen: !!isOpen,
              currentVote: currentVoteByRoomUrlName[urlName],
            });
          };
          interval = setInterval(sendCurrentStatus, 10_000);
          sendCurrentStatus();
        },
        cancel() {
          clearInterval(interval);
          if (!isForOwner && currentStatsByRoomUrlName[urlName]) {
            removeOneGuestFromRoom(urlName, voterId);
          }
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

export const defaultHandler: RouteHandler = () => {
  return wrapReactElem(<NotFoundPage />);
};

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

function getVoteFromFormData(
  formData: FormData,
): "votedFor" | "votedAgainst" | "abstained" | undefined {
  const vote = formData.get("vote");
  if (typeof vote !== "string") {
    console.log("vote invalid - not string");
    return;
  }
  if (vote === "for") {
    return "votedFor";
  }
  if (vote === "against") {
    return "votedAgainst";
  }
  if (vote === "abstain") {
    return "abstained";
  }
  console.log("vote not valid", vote);
}
