import { Routes } from "../lib/types.ts";
import {
  getErrorMessage,
  playgroundWrapReactElem,
  redirect,
} from "./helpers.tsx";
import { LoginPage } from "../lib/components/LoginPage.tsx";

export const loginRoutes: Routes = {
  "/login": {
    GET: ({ req }) => {
      const state = {
        error: getErrorMessage(req),
      };
      return playgroundWrapReactElem(LoginPage, state);
    },
    POST: async ({ req, requestAuthContext }) => {
      const formData = await req.formData();
      const username = formData.get("username");
      const password = formData.get("password");

      const missingFields: string[] = [];

      if (!username || typeof username !== "string") {
        missingFields.push("username");
      }

      if (!password || typeof password !== "string") {
        missingFields.push("password");
      }

      if (missingFields.length > 0) {
        const state = {
          error: getErrorMessage(req, missingFields),
          prefilledUsername: typeof username === "string" ? username : "",
        };
        return playgroundWrapReactElem(
          LoginPage,
          state,
        );
      }

      if (typeof username !== "string" || typeof password !== "string") {
        throw new Error("this case should already have been dealt with!");
      }

      if (
        await requestAuthContext.validateCredentialsAndCreateSession(
          username,
          password,
        )
      ) {
        return redirect("/account");
      }

      return redirect("/login?error=user-not-found");
    },
  },
};
