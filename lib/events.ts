import EventEmitter from "node:events";
const guestRoomEvents = new EventEmitter();
const hostRoomStats = new EventEmitter();
guestRoomEvents.setMaxListeners(1000);
hostRoomStats.setMaxListeners(100);

export type VoterId = `${string}-${string}-${string}-${string}-${string}`;
export type CurrentStats = {
  totalGuests: number;
  votedFor: number;
  votedAgainst: number;
  abstained: number;
  totalVotes: number;
  question: string;
};
export type CurrentVote = {
  questionText: string;
  voteId: string;
  alreadyVoted: VoterId[];
};
export type GuestRoomEventData = {
  type: "GUEST_ROOM_EVENT";
  statusMessage: string;
  isOpen: boolean;
  currentVote?: CurrentVote;
};
export type HostRoomStatsData = {
  type: "HOST_ROOM_STATS";
  currentStats: CurrentStats;
};
export type PreviousVoteStats = {
  type: "PREVIOUS_VOTE_SUMMARY";
  previousVoteSummary: CurrentStats;
};

export function addGuestRoomEventListener(
  roomUrlName: string,
  listener: (data: GuestRoomEventData) => void | Promise<void>,
) {
  guestRoomEvents.on(`room-events-${roomUrlName}`, listener);
}
export function removeGuestRoomEventListener(
  roomUrlName: string,
  listener: (data: GuestRoomEventData) => void | Promise<void>,
) {
  guestRoomEvents.off(`room-events-${roomUrlName}`, listener);
}
const previousGuestRoomEventByRoomUrlName: Record<string, GuestRoomEventData> =
  {};
export function emitGuestRoomEvent(
  roomUrlName: string,
  data: GuestRoomEventData,
) {
  guestRoomEvents.emit(`room-events-${roomUrlName}`, data);
  previousGuestRoomEventByRoomUrlName[roomUrlName] = data;
}
export function emitPreviousGuestStats(roomUrlName: string) {
  const data = previousGuestRoomEventByRoomUrlName[roomUrlName];
  if (data) {
    guestRoomEvents.emit(`room-events-${roomUrlName}`, data);
  }
}

export function emitPreviousSummaryEvent(
  roomUrlName: string,
  data: PreviousVoteStats,
) {
  guestRoomEvents.emit(`room-events-${roomUrlName}`, data);
}

export function addHostRoomStatsListener(
  roomUrlName: string,
  listener: (data: HostRoomStatsData) => void | Promise<void>,
) {
  setTimeout(() => {
    hostRoomStats.on(`room-events-${roomUrlName}`, listener);
  }, 100);
}
export function removeHostRoomStatsListener(
  roomUrlName: string,
  listener: (data: HostRoomStatsData) => void | Promise<void>,
) {
  hostRoomStats.off(`room-events-${roomUrlName}`, listener);
}
export function emitHostRoomStats(
  roomUrlName: string,
  data: CurrentStats,
) {
  hostRoomStats.emit(`room-events-${roomUrlName}`, {
    type: "HOST_ROOM_STATS",
    currentStats: data,
  });
}
