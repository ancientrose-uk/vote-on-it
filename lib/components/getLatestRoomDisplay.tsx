import React from "react";
import {
  headingClasses,
  normalAreaClasses,
  normalLinkClasses,
  normalTextClasses,
  roomUrlClasses,
  subHeadingClasses,
} from "./sharedStyles.ts";

export function getLatestRoomDisplay(
  { roomUrl, roomName }: {
    roomUrl?: string;
    roomName?: string;
  },
) {
  if (!roomUrl || !roomName) {
    return null;
  }
  return (
    <div className={normalAreaClasses}>
      <h2 className={headingClasses}>Your latest room</h2>
      <h3 className={subHeadingClasses}>{roomName}</h3>
      <p className={normalTextClasses}>
        Use the link below to join the room, and share it with guests who will
        join you for voting.
      </p>
      <p className={roomUrlClasses}>
        <a href={roomUrl} className={normalLinkClasses}>{roomUrl}</a>
      </p>
    </div>
  );
}
