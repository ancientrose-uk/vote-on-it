import { AuthHandler, RequestContext } from "./AuthHandler.ts";

export type RouteContext = {
  req: Request;
  authHandler: AuthHandler;
  requestAuthContext: RequestContext;
  urlParams: Record<string, string | undefined>;
};

export type RouteHandler = (
  routeContext: RouteContext,
) => Response | Promise<Response>;

export type Routes = {
  [path: string]: {
    [method: string]: RouteHandler;
  };
};

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
  previousVoteSummary?: CurrentStats;
};
