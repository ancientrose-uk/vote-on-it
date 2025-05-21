import React from "react";
import {
  buttonClasses,
  errorMessageClasses,
  headingClasses,
  mainHeadingClasses,
  normalFormClasses,
  normalInputClasses,
  normalLabelClasses,
  pageContainer,
} from "./sharedStyles.ts";
import { getLatestRoomDisplay } from "./getLatestRoomDisplay.tsx";

export function AccountPage(
  { username, roomName, roomUrl, errorMessage }: {
    username: string;
    roomName?: string;
    roomUrl?: string;
    errorMessage?: string;
  },
) {
  return (
    <div className={pageContainer}>
      <h1 className={mainHeadingClasses}>
        Welcome to your account{" "}
        <span className="text-blue-600">{username}</span>!
      </h1>
      <form action="/create-room" method="POST" className={normalFormClasses}>
        <div className="mb-4">
          {errorMessage
            ? (
              <p className={errorMessageClasses}>
                {errorMessage}
              </p>
            )
            : null}
          <h2 className={headingClasses}>Create a new room</h2>
          <label
            htmlFor="roomName"
            className={normalLabelClasses}
          >
            Room Name
          </label>
          <input
            type="text"
            id="roomName"
            name="roomName"
            className={normalInputClasses}
          />
        </div>
        <button
          type="submit"
          className={buttonClasses}
        >
          Create Room
        </button>
      </form>
      {getLatestRoomDisplay({ roomName, roomUrl })}
    </div>
  );
}
