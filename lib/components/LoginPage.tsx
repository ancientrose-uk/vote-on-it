import React from "react";
import {
  buttonClasses,
  errorMessageClasses,
  headingClasses,
  normalFormClasses,
  normalInputClasses,
  normalLabelClasses,
} from "./sharedStyles.ts";

export function LoginPage(
  { error = "", prefilledUsername = "" },
) {
  return (
    <div className="max-w-md mx-auto p-8">
      <h1 className={headingClasses}>
        Log in to your account
      </h1>
      {error && (
        <p className={errorMessageClasses}>
          {error}
        </p>
      )}
      <form
        method="POST"
        action="/login"
        className={normalFormClasses}
      >
        <div className="mb-4">
          <label
            htmlFor="username"
            className={normalLabelClasses}
          >
            Username
          </label>
          {prefilledUsername
            ? (
              <input
                type="text"
                id="username"
                name="username"
                value={prefilledUsername}
                className={normalInputClasses}
              />
            )
            : (
              <input
                type="text"
                id="username"
                name="username"
                className={normalInputClasses}
              />
            )}
        </div>
        <div className="mb-6">
          <label
            htmlFor="password"
            className={normalLabelClasses}
          >
            Password
          </label>
          <input
            type="password"
            id="password"
            name="password"
            className={normalInputClasses}
          />
        </div>
        <button
          type="submit"
          className={buttonClasses}
        >
          Log In
        </button>
      </form>
    </div>
  );
}
