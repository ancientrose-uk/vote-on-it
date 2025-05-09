import { LoginPage } from "../web-server/components.tsx";
import { Routes } from "../lib/types.ts";
import { getErrorMessage, redirect, wrapReactElem } from "./helpers.tsx";

export const loginRoutes: Routes = {
  "/login": {
    GET: ({ req }) => {
      const model = {
        error: getErrorMessage(req),
      };
      return wrapReactElem(LoginPage(model), model);
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
        return wrapReactElem(
          LoginPage(state),
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
