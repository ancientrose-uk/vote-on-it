import React from "react";
import { renderToString } from "react-dom/server";
import { AuthHandler, RequestContext } from "../lib/AuthHandler.ts";
import { AccountPage, HomePage, LoginPage } from "./components.tsx";

type RouteContext = {
  req: Request;
  authHandler: AuthHandler;
  requestAuthContext: RequestContext;
};

type RouteHandler = (
  routeContext: RouteContext,
) => Response | Promise<Response>;

type Routes = {
  [path: string]: {
    [method: string]: RouteHandler;
  };
};

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
      const state = { username: user.username };
      return wrapReactElem(AccountPage(state), state);
    },
  },
};

export const clientRoutes = Object.keys(routes).reduce((acc, path) => {
  acc[path] = routes[path].GET;
  return acc;
}, {} as { [path: string]: RouteHandler });

console.log("clientRoutes", clientRoutes);

export const defaultHandler: RouteHandler = () => {
  return wrapReactElem(<h1>You seem to be lost!</h1>);
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

export function lookupRoute(method: string, path: string): RouteHandler {
  const route = routes[path];
  if (route) {
    const handler = route[method];
    if (handler) {
      return handler;
    }
  }
  return defaultHandler;
}
