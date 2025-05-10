import React from "react";
import {
  headingClasses,
  normalAreaClasses,
  normalLinkClasses,
  normalTextClasses,
  roomUrlClasses,
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
      <h2 className={headingClasses}>{roomName}</h2>
      <p className={normalTextClasses}>
        This is the link to share for others to vote with you:
      </p>
      <p className={roomUrlClasses}>
        <a href={roomUrl} className={normalLinkClasses}>{roomUrl}</a>
      </p>
    </div>
  );
}
