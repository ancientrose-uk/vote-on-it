import { CurrentStats, CurrentVote } from "../types.ts";
import {
  largeContainer,
  normalTextClasses,
  smallPageContainer,
  subHeadingClasses,
} from "./sharedStyles.ts";
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
        <p className={`${normalTextClasses} voteReceivedMessage text-center`}>
          Your vote has been received
        </p>
      );
    } else {
      voteDisplay = GuestVotingButtons({ currentVote, roomUrlName });
    }
  }
  return (
    <div className={smallPageContainer}>
      <div className={largeContainer + " pt-4"}>
        <p className={"roomStatusMessage text-center " + normalTextClasses}>
          {currentVote
            ? (
              <h2
                className={subHeadingClasses +
                  " currentQuestionForGuests text-center"}
              >
                {currentVote.questionText}
              </h2>
            )
            : statusMessage}
        </p>
        {voteDisplay}
      </div>
      {!currentVote
        ? <PreviousVoteSummaryList voteSummary={previousVoteSummary} />
        : null}
    </div>
  );
}
