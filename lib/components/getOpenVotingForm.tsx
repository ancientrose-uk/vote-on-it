import React from "react";
import { buttonClasses } from "./sharedStyles.ts";

export function getOpenVotingForm(roomUrlName: string) {
  return (
    <form action="/open-room" method="post">
      <input
        type="hidden"
        name="roomUrlName"
        value={roomUrlName}
      />
      <button className={buttonClasses} type="submit">
        Start Voting Session
      </button>
    </form>
  );
}
