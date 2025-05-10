import { RouteHandler, Routes } from "../lib/types.ts";
import { loginRoutes } from "../routes/login-routes.tsx";
import { accountRoutes } from "../routes/account-routes.tsx";
import { defaultHandler, staticRoutes } from "../routes/static-routes.tsx";
import { roomsAndVotingRoutes } from "../routes/rooms-and-voting-routes.tsx";

const routes: Routes = {
  ...staticRoutes,
  ...loginRoutes,
  ...accountRoutes,
  ...roomsAndVotingRoutes,
};

export function lookupRoute(
  method: string,
  path: string,
): { handler: RouteHandler; params: Record<string, string | undefined> } {
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
