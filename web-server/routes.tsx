import React from "react";
import { renderToString } from "react-dom/server";
import { AuthHandler } from "../lib/AuthHandler.ts";

type RouteContext = {
  req: Request;
  authHandler: AuthHandler;
};

type RouteHandler = (routeContext: RouteContext) => Response;

type Routes = {
  [path: string]: {
    [method: string]: RouteHandler;
  };
};

let hackyCurrentUser: string | null = null;

export const routes: Routes = {
  '/': {
    GET: () => {
      return wrapReactElem(<h1>Welcome to Vote On It!</h1>);
    }
  },
  '/login': {
    GET: ({req}) => {
      function getErrorMessage(req: Request) {
        const url = new URL(req.url);
        const error = url.searchParams.get("error");
        console.log('error', error);
        switch (error) {
          case "user-not-found":
            return <p className="errorMessage">We couldn't find your account</p>;
          default:
            return ''
        }
      }
      return wrapReactElem(<>
        <h1>Log in to your account</h1>
        {getErrorMessage(req)}
        <form method="POST" action="/login">
          <input type="text" name="username" />
          <input type="text" name="password" />
          <button type="submit">Log In</button>
        </form>
      </>);
    },
    POST: async ({req, authHandler}) => {
      const formData = await req.formData();
      const username = formData.get("username");
      const password = formData.get("password");

      if (!authHandler) {
        return wrapReactElem(<h1>Auth handler not found</h1>);
      }

      if (typeof username !== "string" || typeof password !== "string") {
        return redirect('/login?error=missing-fields');
      }

      if (await authHandler.createSession(username, password)) {
        hackyCurrentUser = username;
        return redirect('/account');
      }

      return redirect('/login?error=user-not-found');
    }
  },
  '/account': {
    GET: () => {
      if (!hackyCurrentUser) {
        return redirect('/login');
      }
      return wrapReactElem(<h1>Welcome to your account {hackyCurrentUser}!</h1>);
    },
    POST: () => {
      hackyCurrentUser = null;
      return redirect('/login');
    }
  }
}

export const defaultHandler: RouteHandler = () => {
  return wrapReactElem(<h1>You seem to be lost!</h1>);
}

function wrapReactElem(reactElement: React.JSX.Element): Response {
  return new Response(renderToString(reactElement), {
    headers: { "Content-Type": "text/html" },
  });
}

function redirect(url: string, status = 302): Response {
  return new Response(renderToString(<a href={url}/>), {
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
