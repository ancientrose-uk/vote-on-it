import { CurrentStats, CurrentVote } from "../types.ts";
import React from "react";
import { normalTextClasses } from "./sharedStyles.ts";
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
      <p className={"roomStatusMessage " + normalTextClasses}>
        You are the host of this room
      </p>
      <p className={normalTextClasses}>
        The room is currently {isOpen
          ? `open and ${stats.totalGuests} guests are connected`
          : "closed"}.
      </p>

      <p className={normalTextClasses}>
        To invite others share this link: {roomUrl}
      </p>
      {isOpen
        ? getVoteControls(roomUrlName, currentVote, stats)
        : getOpenVotingForm(roomUrlName)}
      <PreviousVoteSummaryList voteSummary={previousVoteSummary} />
    </>
  );
}
