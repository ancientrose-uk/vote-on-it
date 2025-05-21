import { CurrentStats, CurrentVote, VoterId } from "../types.ts";
import { persistenceDir } from "../paths.ts";

const currentVoteByRoomUrlName: Record<string, CurrentVote> = {};
const currentStatsByRoomUrlName: Record<string, CurrentStats> = {};
const previousVoteSummaryByRoomUrlName: Record<string, CurrentStats> = {};
const currentUserListByRoomUrlName: Record<string, Set<VoterId>> = {};

function deepClone<T>(obj: T): T {
  if (obj === null || obj === undefined) {
    return obj;
  }
  return JSON.parse(JSON.stringify(obj));
}

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
  return deepClone(currentVoteByRoomUrlName[roomUrlName]);
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
  clearCurrentStatsByRoomUrlName(roomUrlName);
  return deepClone(getCurrentStatsByRoomUrlName(roomUrlName));
}

function clearCurrentStatsByRoomUrlName(roomUrlName: string) {
  const state = currentStatsByRoomUrlName[roomUrlName];
  if (state) {
    state.totalVotes = 0;
    state.votedAgainst = 0;
    state.votedFor = 0;
    state.abstained = 0;
  }
}

export function getPreviousVoteSummaryByRoomUrlName(
  roomUrlName: string,
): CurrentStats | undefined {
  return deepClone(previousVoteSummaryByRoomUrlName[roomUrlName]);
}

export function getCurrentStatsByRoomUrlName(
  roomUrlName: string,
): CurrentStats | undefined {
  ensureRoomHasVotingStats(roomUrlName);
  return deepClone(currentStatsByRoomUrlName[roomUrlName]);
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

export function addVoterIdToAlreadyVoted(
  roomUrlName: string,
  voterId: VoterId,
) {
  currentVoteByRoomUrlName[roomUrlName]?.alreadyVoted.push(voterId);
}

export function validateAndRegisterVote(
  roomUrlName: string,
  voterId: VoterId,
  vote: "votedFor" | "votedAgainst" | "abstained",
) {
  ensureRoomHasVotingStats(roomUrlName);
  const currentVote = getCurrentVoteByRoomUrlName(roomUrlName);
  if (!currentVote) {
    return {
      wasAllowedToVote: false,
    };
  }
  const userVotedAlready = currentVote.alreadyVoted.includes(voterId);
  if (userVotedAlready) {
    return {
      wasAllowedToVote: false,
    };
  }
  addVoterIdToAlreadyVoted(roomUrlName, voterId);
  currentStatsByRoomUrlName[roomUrlName].totalVotes++;
  switch (vote) {
    case "votedFor":
      currentStatsByRoomUrlName[roomUrlName].votedFor++;
      break;
    case "votedAgainst":
      currentStatsByRoomUrlName[roomUrlName].votedAgainst++;
      break;
    case "abstained":
      currentStatsByRoomUrlName[roomUrlName].abstained++;
      break;
  }
  return {
    wasAllowedToVote: true,
  };
}

const voteSummariesDir = `${persistenceDir}/vote-summaries`;
await Deno.mkdir(voteSummariesDir, { recursive: true });
export async function writeVoteSummary(
  roomUrlName: string,
  voteSummary: CurrentStats | undefined,
) {
  if (!voteSummary) {
    console.log("- - - - ");
    console.log("Missing vote summary, couldn't write it");
    console.log("- - - - ");
  }
  const filePath = `${voteSummariesDir}/${roomUrlName}.json`;

  await Deno.writeTextFile(
    filePath,
    JSON.stringify(voteSummary) + "\n",
    { append: true },
  );
}
