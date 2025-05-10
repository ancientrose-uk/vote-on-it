import React from "react";
import { RouteHandler, Routes } from "../lib/types.ts";
import { wrapReactElem } from "./helpers.tsx";
import { HomePage, NotFoundPage } from "../web-server/components.tsx";

export const staticRoutes: Routes = {
  "/": {
    GET: () => {
      return wrapReactElem(<HomePage />);
    },
  },
};

export const defaultHandler: RouteHandler = () => {
  return wrapReactElem(<NotFoundPage />);
};
