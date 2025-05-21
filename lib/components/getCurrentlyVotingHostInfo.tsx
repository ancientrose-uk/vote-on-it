import React from "react";
import { CurrentStats, CurrentVote } from "../types.ts";
import { getVoteProgressElement } from "./getVoteProgressElement.tsx";
import { buttonClasses, largeContainer } from "./sharedStyles.ts";

export function getCurrentlyVotingHostInfo(
  { currentVote, roomUrlName, stats }: {
    currentVote: CurrentVote;
    roomUrlName: string;
    stats?: CurrentStats;
  },
) {
  return (
    <div className={largeContainer}>
      <p>Currently voting on: {currentVote.questionText}</p>
      {currentVote && stats
        ? getVoteProgressElement({ currentVote, stats })
        : null}
      <form action="/end-vote" method="post">
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
        <button className={buttonClasses} type="submit">
          End Vote
        </button>
      </form>
    </div>
  );
}
