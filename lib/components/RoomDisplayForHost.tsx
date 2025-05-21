import { CurrentStats, CurrentVote } from "../types.ts";
import React from "react";
import {
  largeContainer,
  normalLinkClasses,
  normalTextClasses,
} from "./sharedStyles.ts";
import { getOpenVotingForm } from "./getOpenVotingForm.tsx";
import { PreviousVoteSummaryList } from "./PreviousVoteSummaryList.tsx";
import { getVoteControls } from "./getVoteControls.ts";

export function RoomDisplayForHost(
  { roomUrl, roomUrlName, isOpen, currentVote, stats, previousVoteSummary }: {
    roomUrl: string;
    roomUrlName: string;
    isOpen: boolean;
    currentVote?: CurrentVote;
    stats: CurrentStats;
    previousVoteSummary?: CurrentStats;
  },
) {
  return (
    <>
      <div className={largeContainer}>
        <p className={normalTextClasses}>
          The room is currently {isOpen
            ? `open and ${stats.totalGuests} guests are connected`
            : "closed"}.
        </p>
        <p className={normalTextClasses}>
          To invite others share this link:
        </p>
        <p className={normalTextClasses}>
          <a className={normalLinkClasses} href={roomUrl}>{roomUrl}</a>
        </p>
      </div>
      {isOpen
        ? getVoteControls(roomUrlName, currentVote, stats)
        : getOpenVotingForm(roomUrlName)}
      <PreviousVoteSummaryList voteSummary={previousVoteSummary} />
    </>
  );
}
