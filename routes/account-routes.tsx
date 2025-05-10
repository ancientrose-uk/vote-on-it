import {
  getLatestRoomNameForOwnerName,
  getUrlForRoomNameAndOwner,
} from "../lib/db-functions/database-access.ts";

import { playgroundWrapReactElem, redirect } from "./helpers.tsx";
import { getFullRoomUrlFromUrlName } from "../lib/utils.ts";
import { Routes } from "../lib/types.ts";
import { AccountPage } from "../lib/components/AccountPage.tsx";

export const accountRoutes: Routes = {
  "/account": {
    GET: ({ requestAuthContext, req }) => {
      const user = requestAuthContext.getUser();
      const errorMessage = getErrorMessage(req);
      if (!user) {
        return redirect("/login");
      }
      const state: {
        username: string;
        roomUrl?: string;
        roomName?: string;
        errorMessage?: string;
      } = {
        username: user.username,
        errorMessage,
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

export function getErrorMessage(req: Request) {
  const url = new URL(req.url);
  const error = url.searchParams.get("error");
  if (!error) {
    return undefined;
  }
  switch (error) {
    case "room-name-empty":
      return `Please enter a room name`;
    default:
      return `Unknown error: ${error}`;
  }
}
