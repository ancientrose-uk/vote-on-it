import { RouteHandler, Routes } from "../lib/types.ts";
import { playgroundWrapReactElem } from "./helpers.tsx";
import { HomePage } from "../lib/components/HomePage.tsx";
import { NotFoundPage } from "../lib/components/NotFoundPage.tsx";

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
