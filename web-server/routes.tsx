import React from "react";
import { renderToString } from "react-dom/server";
import { AuthHandler, RequestContext } from "../lib/AuthHandler.ts";

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
    return (
      <p className="errorMessage">
        Please enter your {missingFields.join(" and ")}
      </p>
    );
  }
  const url = new URL(req.url);
  const error = url.searchParams.get("error");
  console.log("error", error);
  switch (error) {
    case "user-not-found":
      return <p className="errorMessage">We couldn't find your account</p>;
    default:
      return "";
  }
}

function getLoginPage(
  req: Request,
  missingFields: string[] = [],
  prefilledUsername = "",
) {
  return (
    <>
      <h1>Log in to your account</h1>
      {getErrorMessage(req, missingFields)}
      <form method="POST" action="/login">
        <div style={{ padding: "2rem" }}>
          <label
            htmlFor="username"
            style={{
              display: "block",
              fontSize: "1.5rem",
              paddingBottom: "1rem",
            }}
          >
            Username
          </label>
          <input
            type="text"
            id="username"
            name="username"
            value={prefilledUsername}
          />
        </div>
        <div style={{ padding: "2rem" }}>
          <label
            htmlFor="password"
            style={{
              display: "block",
              fontSize: "1.5rem",
              paddingBottom: "1rem",
            }}
          >
            Password
          </label>
          <input type="password" id="password" name="password" />
        </div>
        <button type="submit" style={{ zoom: 1.25 }}>Log In</button>
      </form>
    </>
  );
}

export const routes: Routes = {
  "/": {
    GET: () => {
      return wrapReactElem(<h1>Welcome to Vote On It!</h1>);
    },
  },
  "/login": {
    GET: ({ req }) => {
      return wrapReactElem(getLoginPage(req));
    },
    POST: async ({ req, requestAuthContext }) => {
      const formData = await req.formData();
      const username = formData.get("username");
      const password = formData.get("password");

      const missingFields = [];

      if (!username || typeof username !== "string") {
        missingFields.push("username");
      }

      if (!password || typeof password !== "string") {
        missingFields.push("password");
      }

      if (missingFields.length > 0) {
        return wrapReactElem(
          getLoginPage(
            req,
            missingFields,
            typeof username === "string" ? username : "",
          ),
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
      return wrapReactElem(<h1>Welcome to your account {user.username}!</h1>);
    },
  },
};

export const defaultHandler: RouteHandler = () => {
  return wrapReactElem(<h1>You seem to be lost!</h1>);
};

function wrapReactElem(reactElement: React.JSX.Element): Response {
  return new Response(renderToString(reactElement), {
    headers: { "Content-Type": "text/html" },
  });
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
