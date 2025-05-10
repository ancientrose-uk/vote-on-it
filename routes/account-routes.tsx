import {
  getLatestRoomNameForOwnerName,
  getUrlForRoomNameAndOwner,
} from "../lib/database-access.ts";

import { playgroundWrapReactElem, redirect } from "./helpers.tsx";
import { getFullRoomUrlFromUrlName } from "../lib/utils.ts";
import { AccountPage } from "../web-server/components.tsx";
import { Routes } from "../lib/types.ts";

export const accountRoutes: Routes = {
  "/account": {
    GET: ({ requestAuthContext }) => {
      const user = requestAuthContext.getUser();
      if (!user) {
        return redirect("/login");
      }
      const state: { username: string; roomUrl?: string; roomName?: string } = {
        username: user.username,
      };
      const latestRoomName = getLatestRoomNameForOwnerName(user.username);
      if (latestRoomName) {
        const urlName = getUrlForRoomNameAndOwner(
          latestRoomName,
          user.username,
        );
        if (urlName) {
          state.roomName = latestRoomName;
          state.roomUrl = getFullRoomUrlFromUrlName(urlName);
        }
      }

      return playgroundWrapReactElem(AccountPage, state);
    },
  },
};
