import {
  CurrentStats,
  CurrentVote,
  GuestRoomEventData,
  HostRoomStatsData,
  PreviousVoteStats,
  VoterId,
} from "../types.ts";
import { useEffect, useState } from "react";
import { mainHeadingClasses, pageContainer } from "./sharedStyles.ts";
import { RoomDisplayForHost } from "./RoomDisplayForHost.tsx";
import React from "react";
import { RoomDisplayForGuest } from "./RoomDisplayForGuests.tsx";

export function RoomPage(
  {
    roomName,
    roomUrlName,
    fullRoomUrl,
    statusMessageInput,
    userIsOwner,
    roomOpenAtLoad,
    initialCurrentVote,
    initialStats,
    initialHasAlreadyVotedInThisVote,
    voterId,
    initialPreviousVoteSummary,
  }: {
    roomName: string;
    roomUrlName: string;
    fullRoomUrl: string;
    statusMessageInput: string;
    userIsOwner: boolean;
    roomOpenAtLoad: boolean;
    initialCurrentVote?: CurrentVote;
    initialStats?: CurrentStats;
    initialHasAlreadyVotedInThisVote?: boolean;
    voterId: VoterId;
    initialPreviousVoteSummary?: CurrentStats;
  },
) {
  const [statusMessage, setRoomStatusMessage] = useState(statusMessageInput);
  const [isOpen, setIsOpen] = useState(roomOpenAtLoad);
  const [stats, setStats] = useState(initialStats);
  const [currentVote, setCurrentVote] = useState(initialCurrentVote);
  const [hasAlreadyVotedInThisVote, setHasAlreadyVotedInThisVote] = useState(
    initialHasAlreadyVotedInThisVote,
  );
  const [previousVoteSummary, setPreviousVoteSummary] = useState(
    initialPreviousVoteSummary,
  );
  useEffect(() => {
    const eventSource = new EventSource(
      `/api/room/${encodeURIComponent(roomUrlName)}/events`,
    );
    eventSource.onmessage = (event: { data: string }) => {
      const data: GuestRoomEventData | HostRoomStatsData | PreviousVoteStats =
        JSON.parse(
          event.data,
        );
      if (data.type === "GUEST_ROOM_EVENT") {
        setRoomStatusMessage(data.statusMessage);
        setIsOpen(data.isOpen);
        setCurrentVote(data.currentVote);
        const hasVoted = data.currentVote?.alreadyVoted.includes(voterId) ||
          false;
        setHasAlreadyVotedInThisVote(hasVoted);
      }
      if (data.type === "PREVIOUS_VOTE_SUMMARY") {
        setPreviousVoteSummary(data.previousVoteSummary);
      }
      if (userIsOwner && data.type === "HOST_ROOM_STATS") {
        setStats(data.currentStats);
      }
    };
    return () => {
      eventSource.close();
    };
  }, []);
  return (
    <div className={pageContainer}>
      <h1 className={mainHeadingClasses}>{roomName}</h1>
      {userIsOwner && stats
        ? (
          <RoomDisplayForHost
            isOpen={isOpen}
            roomUrlName={roomUrlName}
            roomUrl={fullRoomUrl}
            currentVote={currentVote}
            stats={stats}
            previousVoteSummary={previousVoteSummary}
          />
        )
        : (
          <RoomDisplayForGuest
            statusMessage={statusMessage}
            currentVote={currentVote}
            roomUrlName={roomUrlName}
            hasAlreadyVotedInThisVote={hasAlreadyVotedInThisVote}
            previousVoteSummary={previousVoteSummary}
          />
        )}
    </div>
  );
}
