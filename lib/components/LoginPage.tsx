import React, { useState } from "react";
import {
  buttonClasses,
  errorMessageClasses,
  headingClasses,
  normalFormClasses,
  normalInputClasses,
  normalLabelClasses,
  smallPageContainer,
} from "./sharedStyles.ts";

export function LoginPage(
  { error = "", prefilledUsername = "" },
) {
  const [username, setUsername] = useState(prefilledUsername);
  return (
    <div className={smallPageContainer}>
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

          <input
            type="text"
            id="username"
            name="username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className={normalInputClasses}
          />
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
