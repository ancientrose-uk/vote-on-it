import { randomUUID } from "node:crypto";
import * as dbAccess from "../lib/db-functions/database-access.ts";
import {
  CurrentVote,
  GuestRoomEventData,
  HostRoomStatsData,
  Routes,
  VoterId,
} from "../lib/types.ts";
import {
  addGuestRoomEventListener,
  addHostRoomStatsListener,
  emitGuestRoomEvent,
  emitHostRoomStats,
  emitPreviousGuestStats,
  emitPreviousSummaryEvent,
  removeGuestRoomEventListener,
  removeHostRoomStatsListener,
} from "../lib/events.ts";
import { playgroundWrapReactElem, redirect } from "./helpers.tsx";
import { getFullRoomUrlFromUrlName } from "../lib/utils.ts";
import { RoomPage } from "../web-server/components.tsx";
import {
  addVoterIdToGuestsInRoom,
  clearPreviousVoteSummary,
  getCurrentStatsByRoomUrlName,
  getCurrentVoteByRoomUrlName,
  getPreviousVoteSummaryByRoomUrlName,
  moveCurrentVoteToPreviousVote,
  removeVoterIdToGuestsInRoom,
  setCurrentVoteByRoomUrlName,
  validateAndRegisterVote,
} from "../lib/db-functions/faked-databse-interactions.ts";

export const roomsAndVotingRoutes: Routes = {
  "/request-vote": {
    POST: async ({ req, requestAuthContext }) => {
      const formData = await req.formData();
      const roomUrlName = formData.get("roomUrlName");
      const voteTitle = formData.get("voteTitle");
      const user = requestAuthContext.getUser();
      if (typeof roomUrlName !== "string") {
        return genericResponse("roomUrlName is not a string");
      }
      if (typeof voteTitle !== "string") {
        return genericResponse("voteTitle is not a string");
      }
      if (!user) {
        return genericResponse(
          '"You need to be logged in to perform this action"',
        );
      }
      if (!dbAccess.isUserOwnerOfRoom(user, roomUrlName)) {
        return genericResponse("Wrong user trying to request a vote");
      }
      const roomName = dbAccess.roomNameByUrlName(roomUrlName);
      if (!roomName) {
        return genericResponse("Room not found");
      }
      const voteId = randomUUID();

      clearPreviousVoteSummary(roomUrlName);
      emitPreviousSummaryEvent(roomUrlName, {
        type: "PREVIOUS_VOTE_SUMMARY",
        previousVoteSummary: undefined,
      });
      const currentVote = {
        questionText: voteTitle,
        voteId,
        alreadyVoted: [],
      };
      setCurrentVoteByRoomUrlName(roomUrlName, currentVote);
      emitGuestRoomEvent(roomUrlName, {
        type: "GUEST_ROOM_EVENT",
        statusMessage: "Vote requested",
        isOpen: !!roomName,
        currentVote,
      });

      return redirect(getFullRoomUrlFromUrlName(roomUrlName));

      function genericResponse(reason: string) {
        console.error(reason);
        return new Response(
          "An error occurred while processing your request. Maybe the room doesn't exist, maybe you don't have access, maybe something went wrong  on our side.",
          { status: 500 },
        );
      }
    },
  },
  "/create-room": {
    POST: async ({ req, requestAuthContext }) => {
      const user = requestAuthContext.getUser();

      const formData = await req.formData();
      const roomName = formData.get("roomName");
      if (typeof roomName !== "string") {
        throw new Error("roomName is not a string");
      }
      if (!user) {
        throw new Error("You need to be logged in to perform this action");
      }
      // if (roomName.length === 0) {
      //   return redirect("/account?error=room-name-empty");
      // }
      dbAccess.createRoom(roomName, user.username);
      return redirect("/account");
    },
  },
  "/open-room": {
    POST: async ({ req, requestAuthContext }) => {
      const formData = await req.formData();
      const roomUrlName = formData.get("roomUrlName");
      const user = requestAuthContext.getUser();
      if (typeof roomUrlName !== "string") {
        return redirect("/account?error=room-name-empty");
      }
      if (!user) {
        return redirect("/account?error=not-logged-in");
      }
      console.log("opened room", {
        roomName: roomUrlName,
        user: user.username,
      });
      if (!roomUrlName) {
        return redirect("/account?error=room-name-not-found-a");
      }
      const result = dbAccess.openRoom(roomUrlName, user.username);
      if (result) {
        emitGuestRoomEvent(roomUrlName, {
          type: "GUEST_ROOM_EVENT",
          isOpen: true,
          statusMessage: getStatusMessageText(true),
        });
        return redirect(getFullRoomUrlFromUrlName(roomUrlName));
      }
      return redirect("/account?error=room-name-not-found-b");
    },
  },
  "/end-vote": {
    POST: async ({ req, requestAuthContext }) => {
      const formData = await req.formData();
      const roomUrlName = formData.get("roomUrlName");
      const voteId = formData.get("voteId");
      const user = requestAuthContext.getUser();
      if (typeof roomUrlName !== "string" || typeof voteId !== "string") {
        return redirect("/account?error=room-name-or-vote-id-empty");
      }
      if (!dbAccess.isUserOwnerOfRoom(user, roomUrlName)) {
        return redirect("/?error=not-logged-in");
      }
      const currentVoteForRoom = getCurrentVoteByRoomUrlName(roomUrlName);
      if (currentVoteForRoom?.voteId !== voteId) {
        return redirect("/?error=vote-id-doesnt-match");
      }
      moveCurrentVoteToPreviousVote(
        roomUrlName,
        currentVoteForRoom,
      );
      emitGuestRoomEvent(roomUrlName, {
        type: "GUEST_ROOM_EVENT",
        isOpen: true,
        statusMessage: getStatusMessageText(true),
      });
      emitPreviousSummaryEvent(roomUrlName, {
        type: "PREVIOUS_VOTE_SUMMARY",
        previousVoteSummary: getPreviousVoteSummaryByRoomUrlName(roomUrlName),
      });
      return redirect(getFullRoomUrlFromUrlName(roomUrlName));
    },
  },
  "/room/:urlName": {
    GET: ({ urlParams, requestAuthContext }) => {
      const { urlName } = urlParams;
      const voterId = requestAuthContext.getVoterId();
      if (!urlName) {
        return redirect("/");
      }
      const roomName = dbAccess.roomNameByUrlName(urlName);
      const isOpen = dbAccess.isRoomOpenByUrlName(urlName);
      const user = requestAuthContext.getUser();
      if (!roomName) {
        return redirect("/");
      }
      const userIsOwner = dbAccess.isUserOwnerOfRoom(user, urlName);

      const currentVote = getCurrentVoteByRoomUrlName(urlName);
      const userAlreadyVoted = (currentVote?.alreadyVoted || []).includes(
        voterId,
      );
      const state = {
        roomName: roomName,
        statusMessageInput: getStatusMessageText(!!isOpen),
        roomUrlName: urlName,
        fullRoomUrl: getFullRoomUrlFromUrlName(urlName),
        userIsOwner: !!userIsOwner,
        roomOpenAtLoad: !!isOpen,
        initialCurrentVote: currentVote,
        initialStats: getCurrentStatsByRoomUrlName(urlName),
        initialHasAlreadyVotedInThisVote: userAlreadyVoted,
        initialPreviousVoteSummary: getPreviousVoteSummaryByRoomUrlName(
          urlName,
        ),
        voterId,
      };
      return playgroundWrapReactElem(RoomPage, state);
    },
    POST: async ({ req, requestAuthContext, urlParams }) => {
      const { urlName: roomUrlName } = urlParams;
      const formData = await req.formData();
      const vote = getVoteFromFormData(formData);
      const formDataRoomUrl = formData.get("roomUrlName");
      if (!vote) {
        return redirect(req.url + "/?error=vote-not-valid");
      }
      if (roomUrlName !== formDataRoomUrl) {
        return redirect(req.url + "?error=room-combination-not-valid");
      }
      const voterId = requestAuthContext.getVoterId();
      if (!roomUrlName) {
        return redirect("/?error=room-not-found");
      }
      const { wasAllowedToVote } = validateAndRegisterVote(
        roomUrlName,
        voterId,
        vote,
      );
      if (!wasAllowedToVote) {
        return redirect(req.url + "?error=already-voted");
      }

      const currentStatsByRoomUrlName = getCurrentStatsByRoomUrlName(
        roomUrlName,
      );
      if (currentStatsByRoomUrlName) {
        emitHostRoomStats(roomUrlName, currentStatsByRoomUrlName);
      }
      emitPreviousGuestStats(roomUrlName);
      return redirect(req.url);
    },
  },
  "/api/room/:urlName/events": {
    GET: ({ urlParams, requestAuthContext }) => {
      const { urlName } = urlParams;

      if (!urlName) {
        return genericError("No url name");
      }
      const roomName = dbAccess.roomNameByUrlName(urlName);
      if (!roomName) {
        return genericError("failed to find room name");
      }
      const encoder = new TextEncoder();
      let interval = -1;

      const isForOwner = dbAccess.isUserOwnerOfRoom(
        requestAuthContext.getUser(),
        urlName,
      );
      const voterId = requestAuthContext.getVoterId();

      const closeFns = [] as (() => void)[];

      const readableStreamDefaultWriter = new ReadableStream({
        start(controller) {
          if (!isForOwner) {
            addOneGuestToRoom(urlName, voterId);
          }

          function send(
            eventData: GuestRoomEventData | HostRoomStatsData,
          ) {
            try {
              controller.enqueue(
                prepareDataForEventEnqueue(eventData, encoder),
              );
            } catch (_) {
              // ignore
            }
          }

          const listener = (data: GuestRoomEventData | HostRoomStatsData) => {
            send(data);
          };

          addGuestRoomEventListener(urlName, listener);
          closeFns.push(() => {
            removeGuestRoomEventListener(urlName, listener);
          });
          if (isForOwner) {
            addHostRoomStatsListener(urlName, listener);
            closeFns.push(() => {
              removeHostRoomStatsListener(urlName, listener);
            });
          }
          const sendCurrentStatus = () => {
            const isOpen = dbAccess.isRoomOpenByUrlName(urlName); // todo: cache this
            if (!isForOwner) {
              addOneGuestToRoom(urlName, voterId);
            }
            send({
              type: "GUEST_ROOM_EVENT",
              statusMessage: getStatusMessageText(!!isOpen),
              isOpen: !!isOpen,
              currentVote: getCurrentVoteByRoomUrlName(urlName),
            });
          };
          interval = setInterval(sendCurrentStatus, 10_000);
          sendCurrentStatus();
        },
        cancel() {
          clearInterval(interval);

          if (!isForOwner && getCurrentStatsByRoomUrlName(urlName)) {
            removeOneGuestFromRoom(urlName, voterId);
          }

          while (closeFns.length > 0) {
            const closeFn = closeFns.pop();
            if (closeFn) {
              closeFn();
            }
          }
        },
      });

      return new Response(readableStreamDefaultWriter, {
        headers: {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          "Connection": "keep-alive",
        },
      });

      function genericError(reason: string) {
        console.error(reason);
        return new Response(
          "An error occurred while processing your request. Maybe the room doesn't exist, maybe you don't have access, maybe something went wrong  on our side.",
          { status: 500 },
        );
      }
    },
  },
};

function emitRoomSizeChange(roomUrlName: string) {
  const stats = getCurrentStatsByRoomUrlName(roomUrlName);
  if (stats) {
    emitHostRoomStats(roomUrlName, stats);
  }
}

function addOneGuestToRoom(roomUrlName: string, voterId: VoterId) {
  addVoterIdToGuestsInRoom(roomUrlName, voterId);
  emitRoomSizeChange(roomUrlName);
}

function removeOneGuestFromRoom(roomUrlName: string, voterId: VoterId) {
  removeVoterIdToGuestsInRoom(roomUrlName, voterId);
  emitRoomSizeChange(roomUrlName);
}

function getStatusMessageText(isOpen: boolean, currentVote?: CurrentVote) {
  if (currentVote) {
    return `Vote requested`;
  }
  if (isOpen) {
    return "Voting session started.";
  }
  return "Waiting for host to start voting session.";
}

function prepareDataForEventEnqueue(
  value: GuestRoomEventData | HostRoomStatsData,
  encoder: TextEncoder,
) {
  const eventData = `data: ${JSON.stringify(value)}\n\n`;
  return encoder.encode(eventData);
}

function getVoteFromFormData(
  formData: FormData,
): "votedFor" | "votedAgainst" | "abstained" | undefined {
  const vote = formData.get("vote");
  if (typeof vote !== "string") {
    console.log("vote invalid - not string");
    return;
  }
  if (vote === "for") {
    return "votedFor";
  }
  if (vote === "against") {
    return "votedAgainst";
  }
  if (vote === "abstain") {
    return "abstained";
  }
  console.log("vote not valid", vote);
}
