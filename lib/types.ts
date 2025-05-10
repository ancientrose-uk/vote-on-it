import { AuthHandler, RequestContext } from "./AuthHandler.ts";

export type RouteContext = {
  req: Request;
  authHandler: AuthHandler;
  requestAuthContext: RequestContext;
  urlParams: Record<string, string | undefined>;
};

export type RouteHandler = (
  routeContext: RouteContext,
) => Response | Promise<Response>;

export type Routes = {
  [path: string]: {
    [method: string]: RouteHandler;
  };
};
