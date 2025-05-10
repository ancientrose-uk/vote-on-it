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
  return (
    <>
      <p className={normalTextClasses}>
        Previous question: {voteSummary.question}
      </p>
      <dl className={`${normalAreaClasses} p-4 voteSummary`}>
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
    </>
  );
}
