import React from "react";
import { Routes } from "../lib/types.ts";
import { wrapReactElem } from "./helpers.tsx";
import { HomePage } from "../web-server/components.tsx";

export const staticRoutes: Routes = {
  "/": {
    GET: () => {
      return wrapReactElem(<HomePage />);
    },
  },
};
