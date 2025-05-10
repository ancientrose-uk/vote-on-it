import { CurrentStats, CurrentVote } from "../types.ts";
import { getCurrentlyVotingHostInfo } from "./getCurrentlyVotingHostInfo.tsx";
import { getRequestVoteForm } from "./getRequestVoteForm.tsx";

export function getVoteControls(
  roomUrlName: string,
  currentVote?: CurrentVote,
  stats?: CurrentStats,
) {
  return currentVote
    ? getCurrentlyVotingHostInfo({ currentVote, roomUrlName, stats })
    : getRequestVoteForm(roomUrlName);
}
