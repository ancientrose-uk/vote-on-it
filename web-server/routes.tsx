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
function getErrorMessage(req: Request, missingFields: string[] = []) {
  if (missingFields.length > 0) {
    return <p className="errorMessage">Please enter your {missingFields.join(' and ')}</p>;
  }
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

function getLoginPage(req: Request, missingFields: string[] = [], prefilledUsername = '') {
  return <>
    <h1>Log in to your account</h1>
    {getErrorMessage(req, missingFields)}
    <form method="POST" action="/login">
      <input type="text" name="username" value={prefilledUsername}/>
      <input type="text" name="password"/>
      <button type="submit">Log In</button>
    </form>
  </>;
}

export const routes: Routes = {
  '/': {
    GET: () => {
      return wrapReactElem(<h1>Welcome to Vote On It!</h1>);
    }
  },
  '/login': {
    GET: ({req}) => {
      return wrapReactElem(getLoginPage(req));
    },
    POST: async ({req, authHandler}) => {
      const formData = await req.formData();
      const username = formData.get("username");
      const password = formData.get("password");

      if (!authHandler) {
        return wrapReactElem(<h1>Auth handler not found</h1>);
      }

      const missingFields = []

      if (!username || typeof username !== 'string') {
        missingFields.push('username');
      }

      if (!password || typeof password !== 'string') {
        missingFields.push('password');
      }

      if (missingFields.length > 0) {
        return wrapReactElem(getLoginPage(req, missingFields, typeof username === 'string' ? username : ''));
      }

      if (typeof username !== 'string' || typeof password !== 'string') {
        throw new Error('this case should already have been dealt with!')
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
