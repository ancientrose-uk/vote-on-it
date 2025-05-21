import React from "react";
import { CurrentVote } from "../types.ts";
import { voteButtonClasses } from "./sharedStyles.ts";

export function GuestVotingButtons(
  { currentVote, roomUrlName }: {
    currentVote: CurrentVote;
    roomUrlName: string;
  },
) {
  return (
    <form action="?" method="post">
      <input
        type="hidden"
        name="voteId"
        value={currentVote.voteId}
      />
      <input
        type="hidden"
        name="roomUrlName"
        value={roomUrlName}
      />
      <button
        className={`${voteButtonClasses} bg-green-800 hover:bg-green-600`}
        type="submit"
        name="vote"
        value="for"
      >
        Yes (vote for)
      </button>
      <button
        className={`${voteButtonClasses} bg-red-800 hover:bg-red-600`}
        type="submit"
        name="vote"
        value="against"
      >
        No (vote against)
      </button>
      <button
        className={`${voteButtonClasses} bg-gray-500 hover:bg-gray-700`}
        type="submit"
        name="vote"
        value="abstain"
      >
        Abstain (do not vote on this question)
      </button>
    </form>
  );
}
