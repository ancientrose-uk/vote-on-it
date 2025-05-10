import { CurrentStats, CurrentVote } from "../types.ts";
import { normalTextClasses } from "./sharedStyles.ts";
import React from "react";
import { GuestVotingButtons } from "./GuestVotingButtons.tsx";
import { PreviousVoteSummaryList } from "./PreviousVoteSummaryList.tsx";

export function RoomDisplayForGuest(
  {
    statusMessage,
    currentVote,
    roomUrlName,
    hasAlreadyVotedInThisVote,
    previousVoteSummary,
  }: {
    statusMessage: string;
    currentVote?: CurrentVote;
    roomUrlName: string;
    hasAlreadyVotedInThisVote?: boolean;
    previousVoteSummary?: CurrentStats;
  },
) {
  let voteDisplay = <span />;
  if (currentVote) {
    if (hasAlreadyVotedInThisVote) {
      voteDisplay = (
        <p className={`${normalTextClasses} voteReceivedMessage`}>
          Your vote has been received
        </p>
      );
    } else {
      voteDisplay = GuestVotingButtons({ currentVote, roomUrlName });
    }
  }
  return (
    <>
      <p className={"roomStatusMessage " + normalTextClasses}>
        {currentVote
          ? ("Question: " + currentVote.questionText)
          : statusMessage}
      </p>
      {voteDisplay}
      <PreviousVoteSummaryList voteSummary={previousVoteSummary} />
    </>
  );
}
