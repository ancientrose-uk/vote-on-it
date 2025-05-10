import { CurrentStats, CurrentVote, VoterId } from "../types.ts";

const currentVoteByRoomUrlName: Record<string, CurrentVote> = {};
const currentStatsByRoomUrlName: Record<string, CurrentStats> = {};
const previousVoteSummaryByRoomUrlName: Record<string, CurrentStats> = {};
const currentUserListByRoomUrlName: Record<string, Set<VoterId>> = {};

export function clearPreviousVoteSummary(
  roomUrlName: string,
) {
  delete previousVoteSummaryByRoomUrlName[roomUrlName];
}

export function setCurrentVoteByRoomUrlName(
  roomUrlName: string,
  currentVote: CurrentVote,
) {
  currentVoteByRoomUrlName[roomUrlName] = currentVote;
}

export function getCurrentVoteByRoomUrlName(
  roomUrlName: string,
): CurrentVote | undefined {
  return currentVoteByRoomUrlName[roomUrlName];
}

export function moveCurrentVoteToPreviousVote(
  roomUrlName: string,
  currentVoteForRoom: CurrentVote,
) {
  previousVoteSummaryByRoomUrlName[roomUrlName] = Object.assign(
    {},
    getCurrentStatsByRoomUrlName(roomUrlName),
  );
  if (!previousVoteSummaryByRoomUrlName[roomUrlName].question) {
    previousVoteSummaryByRoomUrlName[roomUrlName].question =
      currentVoteForRoom.questionText;
  }

  delete currentVoteByRoomUrlName[roomUrlName];
  return getCurrentStatsByRoomUrlName(roomUrlName);
}

export function getPreviousVoteSummaryByRoomUrlName(
  roomUrlName: string,
): CurrentStats | undefined {
  return previousVoteSummaryByRoomUrlName[roomUrlName];
}

export function getCurrentStatsByRoomUrlName(
  roomUrlName: string,
): CurrentStats | undefined {
  ensureRoomHasVotingStats(roomUrlName);
  return currentStatsByRoomUrlName[roomUrlName];
}

function ensureRoomHasVotingStats(roomUrlName: string) {
  if (!currentStatsByRoomUrlName[roomUrlName]) {
    currentStatsByRoomUrlName[roomUrlName] = {
      totalGuests: 0,
      votedFor: 0,
      votedAgainst: 0,
      abstained: 0,
      totalVotes: 0,
      question: getCurrentVoteByRoomUrlName(roomUrlName)?.questionText || "",
    };
  }
}

function ensureRoomHasCurrentAttendeesList(roomUrlName: string) {
  if (!currentUserListByRoomUrlName[roomUrlName]) {
    currentUserListByRoomUrlName[roomUrlName] = new Set();
  }
}

function ensureTotalAtendeeCountMatchesInUserListAndStats(roomUrlName: string) {
  currentStatsByRoomUrlName[roomUrlName].totalGuests =
    currentUserListByRoomUrlName[roomUrlName].size;
}

export function addVoterIdToGuestsInRoom(
  roomUrlName: string,
  voterId: VoterId,
) {
  ensureRoomHasCurrentAttendeesList(roomUrlName);
  ensureRoomHasVotingStats(roomUrlName);
  currentUserListByRoomUrlName[roomUrlName].add(voterId);
  ensureTotalAtendeeCountMatchesInUserListAndStats(roomUrlName);
}
export function removeVoterIdToGuestsInRoom(
  roomUrlName: string,
  voterId: VoterId,
) {
  ensureRoomHasCurrentAttendeesList(roomUrlName);
  ensureRoomHasVotingStats(roomUrlName);
  currentUserListByRoomUrlName[roomUrlName].delete(voterId);
  ensureTotalAtendeeCountMatchesInUserListAndStats(roomUrlName);
}
