import React from "react";
import {
  buttonClasses,
  headingClasses,
  normalFormClasses,
  normalInputClasses,
  normalLabelClasses,
  normalTextClasses,
} from "./sharedStyles.ts";
import { getLatestRoomDisplay } from "./getLatestRoomDisplay.tsx";

export function AccountPage(
  { username, roomName, roomUrl }: {
    username: string;
    roomName?: string;
    roomUrl?: string;
  },
) {
  return (
    <div className="max-w-4xl mx-auto p-8">
      <h1 className={headingClasses}>
        Welcome to your account{" "}
        <span className="text-blue-600">{username}</span>!
      </h1>
      <p className={normalTextClasses}>
        This is your account page. You can create a new room here.
      </p>
      <form action="/create-room" method="POST" className={normalFormClasses}>
        <div className="mb-4">
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
