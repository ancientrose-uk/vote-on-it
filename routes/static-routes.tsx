import { RouteHandler, Routes } from "../lib/types.ts";
import { playgroundWrapReactElem } from "./helpers.tsx";
import { HomePage, NotFoundPage } from "../web-server/components.tsx";

export const staticRoutes: Routes = {
  "/": {
    GET: () => {
      return playgroundWrapReactElem(HomePage, {});
    },
  },
};

export const defaultHandler: RouteHandler = () => {
  return playgroundWrapReactElem(NotFoundPage, {});
};
