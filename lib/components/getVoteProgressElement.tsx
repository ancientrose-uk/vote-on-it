import React from "react";
import { CurrentStats, CurrentVote } from "../types.ts";

export function getVoteProgressElement(
  { currentVote, stats }: { currentVote: CurrentVote; stats: CurrentStats },
) {
  if (!currentVote) {
    return <p>No current vote info</p>;
  }
  const totals = [
    stats.totalVotes,
    stats.votedAgainst + stats.votedFor + stats.abstained,
    currentVote.alreadyVoted.length,
  ];
  const firstTotal = totals[0];
  const checkAgainstTotal = (total: number) =>
    (total || 0) !== (firstTotal || 0);
  if (totals.some(checkAgainstTotal)) {
    console.error("!!!!!");
    console.error(
      "Totals diverged",
      firstTotal,
      totals,
      totals.map(checkAgainstTotal),
    );
    console.error("!!!!!");
  }
  const totalVotes = stats.totalVotes || 0;
  const totalGuests = stats.totalGuests || 0;
  if (totalVotes >= totalGuests) {
    return <p>Vote complete</p>;
  }
  const percentage = Math.round((totalVotes / totalGuests) * 100);
  const progress = (
    <>
      <div className="flex justify-between mb-1">
        <span className="text-base font-medium text-blue-700 dark:text-white">
          Voting progress
        </span>
        <span className="text-sm font-medium text-blue-700 dark:text-white">
          {percentage}%
        </span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-2.5 dark:bg-gray-700">
        <div
          className="bg-blue-500 h-2.5 rounded-full"
          style={{ width: `${percentage}%` }}
        >
        </div>
      </div>
      <p>
        Vote progress: {percentage}% ({totalVotes} out of {totalGuests} votes)
      </p>
    </>
  );
  return progress;
}
