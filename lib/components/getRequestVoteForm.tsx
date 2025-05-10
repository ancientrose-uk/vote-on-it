import React from "react";
import {
  buttonClasses,
  normalAreaClasses,
  normalInputClasses,
  normalLabelClasses,
  normalTextClasses,
} from "./sharedStyles.ts";

export function getRequestVoteForm(roomUrlName: string) {
  return (
    <div className={normalAreaClasses}>
      <p className={normalTextClasses}>Enter a question to vote on below:</p>
      <form action="/request-vote" method="post">
        <input
          type="hidden"
          name="roomUrlName"
          value={roomUrlName}
        />
        <label
          htmlFor="voteTitle"
          className={normalLabelClasses}
        >
          Question to vote on:
        </label>
        <input
          type="text"
          id="voteTitle"
          name="voteTitle"
          className={normalInputClasses}
        />
        <button className={buttonClasses} type="submit">
          Request Vote
        </button>
      </form>
    </div>
  );
}
