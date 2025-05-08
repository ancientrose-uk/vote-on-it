import React, { useEffect } from "react";

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
      <p className={normalTextClasses}>
        This is the link to share for others to vote with you:
      </p>
      <p className={roomUrlClasses}>
        {roomUrl}
      </p>
      <form action="/open-room" method="post">
        <input
          type="hidden"
          name="roomName"
          value={roomName}
        />
        <button className={buttonClasses} type="submit">
          Start Voting Session {roomName}
        </button>
      </form>
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
  console.table({ username, roomUrl, roomName });
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

export function RoomPage(
  { roomName, roomUrlName, isClientSide, statusMessage }: {
    roomName: string;
    roomUrlName: string;
    isClientSide?: boolean;
    statusMessage?: string;
  },
) {
  const initialRoomStatusMessage = statusMessage || "Waiting for update...";
  const [roomStatusMessage, setRoomStatusMessage] = isClientSide === true
    ? React.useState(
      initialRoomStatusMessage,
    )
    : [initialRoomStatusMessage, () => {}];
  if (isClientSide === true) {
    useEffect(() => {
      const eventSource = new EventSource(
        `/api/room/${encodeURIComponent(roomUrlName)}/events`,
      );
      eventSource.onmessage = (event) => {
        const data = JSON.parse(event.data);
        console.log("data", data);
        setRoomStatusMessage(data.statusMessage);
      };
      return () => {
        eventSource.close();
      };
    }, []);
  }
  return (
    <div className="">
      <h1 className={headingClasses}>Welcome to the room: {roomName}</h1>
      <p className={"roomStatusMessage " + normalTextClasses}>
        {roomStatusMessage}
      </p>
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
