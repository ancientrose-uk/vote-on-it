import React from "react";
import { NotFoundPage } from "./components.tsx";

import { RouteHandler, Routes } from "../lib/types.ts";
import { wrapReactElem } from "../routes/helpers.tsx";
import { loginRoutes } from "../routes/login-routes.tsx";
import { accountRoutes } from "../routes/account-routes.tsx";
import { staticRoutes } from "../routes/static-routes.tsx";
import { roomsAndVotingRoutes } from "../routes/rooms-and-voting-routes.tsx";

const routes: Routes = {
  ...staticRoutes,
  ...loginRoutes,
  ...accountRoutes,
  ...roomsAndVotingRoutes,
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
