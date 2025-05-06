import React from "react";
import { renderToString } from "react-dom/server";

type RouteHandler = (req?: Request) => Response;

type Routes = {
  [path: string]: {
    [method: string]: RouteHandler;
  };
};

export const routes: Routes = {
  '/': {
    GET: () => {
      return wrapReactElem(<h1>Welcome to Vote On It!</h1>);
    }
  },
  '/login': {
    GET: () => {
      return wrapReactElem(<>
        <h1>Log in to your account</h1>
        <form method="POST" action="/login">
          <input type="text" name="username" />
          <input type="text" name="password" />
          <button type="submit">Log In</button>
        </form>
      </>);
    },
    POST: async (req: Request) => {
      const formData = await req.formData();
      const username = '' + formData.get("username");
      const password = formData.get("password");

      if (!username || !password) {
        return wrapReactElem(<h1>Missing username or password</h1>);
        // return redirect('/login?error=missing_fields');
      }

      return wrapReactElem(<h1>Welcome to your account {username}!</h1>);
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
