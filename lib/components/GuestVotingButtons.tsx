import React from "react";
import { CurrentVote } from "../types.ts";
import { buttonClasses, normalFormClasses } from "./sharedStyles.ts";

export function GuestVotingButtons(
  { currentVote, roomUrlName }: {
    currentVote: CurrentVote;
    roomUrlName: string;
  },
) {
  return (
    <form action="?" className={normalFormClasses} method="post">
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
        className={`${buttonClasses} bg-green-800`}
        type="submit"
        name="vote"
        value="for"
      >
        Yes (vote for)
      </button>
      <button
        className={`${buttonClasses} bg-red-800`}
        type="submit"
        name="vote"
        value="against"
      >
        No (vote against)
      </button>
      <button
        className={`${buttonClasses} bg-gray-500`}
        type="submit"
        name="vote"
        value="abstain"
      >
        Abstain (do not vote on this question)
      </button>
    </form>
  );
}
