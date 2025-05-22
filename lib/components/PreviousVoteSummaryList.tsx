import React from "react";
import { CurrentStats } from "../types.ts";
import {
  normalAreaClasses,
  normalLabelClasses,
  normalTextClasses,
} from "./sharedStyles.ts";

export function PreviousVoteSummaryList(
  { voteSummary }: { voteSummary?: CurrentStats },
) {
  console.log("voteSummary", voteSummary);
  if (!voteSummary || voteSummary.votedFor === undefined) {
    return null;
  }
  const outcomeSummary = getOutcomeSummary(voteSummary);
  let borderColorClass = "border-gray-300";
  if (outcomeSummary === "Accepted") {
    borderColorClass = "border-green-600";
  } else if (outcomeSummary === "Rejected") {
    borderColorClass = "border-red-500";
  }
  return (
    <div className={normalAreaClasses + " " + borderColorClass}>
      <p className={normalTextClasses}>
        Previous question: {voteSummary.question}
      </p>
      <dl className={`p-4 voteSummary`}>
        <div className="mb-4">
          <dt className={normalLabelClasses}>Outcome</dt>
          <dd className={normalTextClasses}>
            {outcomeSummary}
          </dd>
        </div>
        <div className="mb-4">
          <dt className={normalLabelClasses}>Votes for</dt>
          <dd className={normalTextClasses}>{voteSummary.votedFor}</dd>
        </div>
        <div className="mb-4">
          <dt className={normalLabelClasses}>Votes against</dt>
          <dd className={normalTextClasses}>{voteSummary.votedAgainst}</dd>
        </div>
        <div className="mb-4">
          <dt className={normalLabelClasses}>Abstained</dt>
          <dd className={normalTextClasses}>{voteSummary.abstained}</dd>
        </div>
      </dl>
    </div>
  );
}

function getOutcomeSummary(voteSummary: CurrentStats) {
  if (voteSummary.votedFor > voteSummary.votedAgainst) {
    return "Accepted";
  }
  if (voteSummary.votedFor < voteSummary.votedAgainst) {
    return "Rejected";
  }
  return "Tied";
}
