import React, { useEffect } from "react";
import { CurrentVote, RoomEventData } from "../lib/events.ts";

const buttonClasses =
  "bg-blue-500 hover:bg-blue-600 text-white font-semibold py-2 px-4 rounded-md transition-colors";
const normalTextClasses = "text-gray-700 text-lg mb-4";
const headingClasses = "text-3xl font-bold mb-8 text-gray-800 text-center";
const normalFormClasses =
  "bg-white p-6 rounded-lg shadow-lg mb-16 border-gray-300";
const normalAreaClasses = normalFormClasses;
const normalLinkClasses =
  "text-blue-500 hover:underline focus:outline-none focus:ring-2 focus:ring-blue-500";
const normalLabelClasses = "block text-gray-700 text-lg font-bold mb-2";
const normalInputClasses =
  "w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500";
const roomUrlClasses = `newlyCreatedRoomUrl mt-6 mb-8 ${normalTextClasses}`;

export function HomePage() {
  return (
    <div className="max-w-4xl mx-auto p-8">
      <h1 className={headingClasses}>
        Welcome to Vote On It!
      </h1>
      <div className="bg-white p-6 rounded-lg shadow-lg">
        <p className={normalTextClasses}>
          If you're supposed to be using this site you will have been provided
          with the correct link. Please follow that link.
        </p>
        <p className={normalTextClasses}>
          If you're just curious about the project it's open source and you can
          {" "}
          <a
            className={normalLinkClasses}
            href="https://github.com/ancientrose-uk/vote-on-it"
            target="_blank"
          >
            find out more on the GitHub page
          </a>.
        </p>
      </div>
    </div>
  );
}

export function LoginPage(
  { error = "", prefilledUsername = "" },
) {
  return (
    <div className="max-w-md mx-auto p-8">
      <h1 className={headingClasses}>
        Log in to your account
      </h1>
      {error && (
        <p className="errorMessage bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </p>
      )}
      <form
        method="POST"
        action="/login"
        className={normalFormClasses}
      >
        <div className="mb-4">
          <label
            htmlFor="username"
            className={normalLabelClasses}
          >
            Username
          </label>
          {prefilledUsername
            ? (
              <input
                type="text"
                id="username"
                name="username"
                value={prefilledUsername}
                className={normalInputClasses}
              />
            )
            : (
              <input
                type="text"
                id="username"
                name="username"
                className={normalInputClasses}
              />
            )}
        </div>
        <div className="mb-6">
          <label
            htmlFor="password"
            className={normalLabelClasses}
          >
            Password
          </label>
          <input
            type="password"
            id="password"
            name="password"
            className={normalInputClasses}
          />
        </div>
        <button
          type="submit"
          className={buttonClasses}
        >
          Log In
        </button>
      </form>
    </div>
  );
}

function getLatestRoomDisplay(
  { roomUrl, roomName }: {
    roomUrl?: string;
    roomName?: string;
  },
) {
  if (!roomUrl || !roomName) {
    return null;
  }
  return (
    <div className={normalAreaClasses}>
      <h2 className={headingClasses}>{roomName}</h2>
      <p className={normalTextClasses}>
        This is the link to share for others to vote with you:
      </p>
      <p className={roomUrlClasses}>
        <a href={roomUrl} className={normalLinkClasses}>{roomUrl}</a>
      </p>
    </div>
  );
}

export function AccountPage(
  { username, roomName, roomUrl }: {
    username: string;
    roomName?: string;
    roomUrl?: string;
  },
) {
  return (
    <div className="max-w-4xl mx-auto p-8">
      <h1 className={headingClasses}>
        Welcome to your account{" "}
        <span className="text-blue-600">{username}</span>!
      </h1>
      <p className={normalTextClasses}>
        This is your account page. You can create a new room here.
      </p>
      <form action="/create-room" method="POST" className={normalFormClasses}>
        <div className="mb-4">
          <label
            htmlFor="roomName"
            className={normalLabelClasses}
          >
            Room Name
          </label>
          <input
            type="text"
            id="roomName"
            name="roomName"
            className={normalInputClasses}
          />
        </div>
        <button
          type="submit"
          className={buttonClasses}
        >
          Create Room
        </button>
      </form>
      {getLatestRoomDisplay({ roomName, roomUrl })}
    </div>
  );
}

function getOpenVotingForm(roomUrlName: string) {
  return (
    <form action="/open-room" method="post">
      <input
        type="hidden"
        name="roomUrlName"
        value={roomUrlName}
      />
      <button className={buttonClasses} type="submit">
        Start Voting Session
      </button>
    </form>
  );
}

function getRequestVoteForm(roomUrlName: string) {
  return (
    <div className={normalAreaClasses}>
      <p className={normalTextClasses}>Enter a question to vote on below:</p>
      <form action="/request-vote" method="post">
        <input
          type="hidden"
          name="roomUrlName"
          value={roomUrlName}
        />
        <label
          htmlFor="voteTitle"
          className={normalLabelClasses}
        >
          Question to vote on:
        </label>
        <input
          type="text"
          id="voteTitle"
          name="voteTitle"
          className={normalInputClasses}
        />
        <button className={buttonClasses} type="submit">
          Request Vote
        </button>
      </form>
    </div>
  );
}

export function getVoteControls(
  roomUrlName: string,
  currentVote?: CurrentVote,
) {
  return currentVote
    ? <p>Currently voting on: {currentVote.questionText}</p>
    : getRequestVoteForm(roomUrlName);
}

export function RoomDisplayForHost(
  { roomUrl, roomUrlName, isOpen, currentVote }: {
    roomUrl: string;
    roomUrlName: string;
    isOpen: boolean;
    currentVote?: CurrentVote;
  },
) {
  return (
    <>
      <p className={"roomStatusMessage " + normalTextClasses}>
        You are the host of this room
      </p>
      <p className={normalTextClasses}>
        To invite others share this link: {roomUrl}
      </p>
      {isOpen
        ? getVoteControls(roomUrlName, currentVote)
        : getOpenVotingForm(roomUrlName)}
    </>
  );
}

export function RoomDisplayForGuest(
  { statusMessage, currentVote }: {
    statusMessage: string;
    currentVote?: CurrentVote;
  },
) {
  return (
    <>
      <p className={"roomStatusMessage " + normalTextClasses}>
        {currentVote
          ? ("Question: " + currentVote.questionText)
          : statusMessage}
      </p>
    </>
  );
}

export function RoomPage(
  {
    roomName,
    roomUrlName,
    fullRoomUrl,
    isClientSide,
    statusMessageInput,
    userIsOwner,
    roomOpenAtLoad,
    initialCurrentVote,
  }: {
    roomName: string;
    roomUrlName: string;
    fullRoomUrl: string;
    isClientSide?: boolean;
    statusMessageInput: string;
    userIsOwner: boolean;
    roomOpenAtLoad: boolean;
    initialCurrentVote?: { questionText: string };
  },
) {
  const [statusMessage, setRoomStatusMessage] = isClientSide === true
    ? React.useState(
      statusMessageInput,
    )
    : [statusMessageInput, () => {}];
  const [isOpen, setIsOpen] = isClientSide === true
    ? React.useState(
      roomOpenAtLoad,
    )
    : [roomOpenAtLoad, () => {}];

  const [currentVote, setCurrentVote] = isClientSide === true
    ? React.useState(
      initialCurrentVote,
    )
    : [initialCurrentVote, () => {}];
  if (isClientSide === true) {
    useEffect(() => {
      const eventSource = new EventSource(
        `/api/room/${encodeURIComponent(roomUrlName)}/events`,
      );
      eventSource.onmessage = (event: { data: string }) => {
        const data: RoomEventData = JSON.parse(event.data);
        setRoomStatusMessage(data.statusMessage);
        setIsOpen(data.isOpen);
        setCurrentVote(data.currentVote);
      };
      return () => {
        eventSource.close();
      };
    }, []);
  }
  return (
    <div>
      <h1 className={headingClasses}>Welcome to the room: {roomName}</h1>
      {userIsOwner
        ? (
          <RoomDisplayForHost
            isOpen={isOpen}
            roomUrlName={roomUrlName}
            roomUrl={fullRoomUrl}
            currentVote={currentVote}
          />
        )
        : (
          <RoomDisplayForGuest
            statusMessage={statusMessage}
            currentVote={currentVote}
          />
        )}
    </div>
  );
}

export function NotFoundPage() {
  return (
    <div className="max-w-4xl mx-auto p-8 text-center">
      <h1 className={headingClasses}>
        You seem to be lost!
      </h1>
      <p className={normalTextClasses}>
        The page you're looking for doesn't exist.
      </p>
    </div>
  );
}
