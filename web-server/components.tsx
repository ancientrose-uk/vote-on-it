import React, { useEffect } from "react";

export function HomePage() {
  const [count, setCount] = React.useState(0);

  return (
    <div className="max-w-4xl mx-auto p-8">
      <h1 className="text-4xl font-bold mb-8 text-gray-800">
        Welcome to Vote On It!
      </h1>
      <div className="bg-white p-6 rounded-lg shadow-lg">
        <p className="text-lg text-gray-700 mb-4">Hydration test: {count}</p>
        <button
          type="button"
          onClick={() => setCount((c) => c + 1)}
          className="bg-blue-500 hover:bg-blue-600 text-white font-semibold py-2 px-4 rounded-md transition-colors"
        >
          Click me to test hydration
        </button>
      </div>
    </div>
  );
}

export function LoginPage(
  { error = "", prefilledUsername = "" },
) {
  return (
    <div className="max-w-md mx-auto p-8">
      <h1 className="text-3xl font-bold mb-8 text-gray-800 text-center">
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
        className="bg-white p-6 rounded-lg shadow-lg"
      >
        <div className="mb-4">
          <label
            htmlFor="username"
            className="block text-gray-700 text-sm font-bold mb-2"
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
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            )
            : (
              <input
                type="text"
                id="username"
                name="username"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            )}
        </div>
        <div className="mb-6">
          <label
            htmlFor="password"
            className="block text-gray-700 text-sm font-bold mb-2"
          >
            Password
          </label>
          <input
            type="password"
            id="password"
            name="password"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <button
          type="submit"
          className="w-full bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded-md transition-colors"
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
    <div className="mt-8">
      <p className="text-2xl font-bold text-gray-800 mb-4">
        Your Latest Room
      </p>
      <div className="text-gray-600">
        <span className="newlyCreatedRoomUrl">
          {roomUrl}
        </span>
        <form action="/open-room" method="post">
          <input
            type="hidden"
            name="roomName"
            value={roomName}
          />
          <button type="submit">Start Voting Session {roomName}</button>
        </form>
      </div>
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
      <h1 className="text-4xl font-bold text-gray-800">
        Welcome to your account{" "}
        <span className="text-blue-600">{username}</span>!
      </h1>
      <p className="text-gray-600 mt-4">
        This is your account page. You can create a new room here.
      </p>
      <form action="/create-room" method="POST" className="mt-6">
        <div className="mb-4">
          <label
            htmlFor="roomName"
            className="block text-gray-700 text-sm font-bold mb-2"
          >
            Room Name
          </label>
          <input
            type="text"
            id="roomName"
            name="roomName"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <button
          type="submit"
          className="bg-blue-500 hover:bg-blue-600 text-white font-semibold py-2 px-4 rounded-md transition-colors"
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
      <h1>Welcome to the room: {roomName}</h1>
      <p className="roomStatusMessage">
        {roomStatusMessage}
      </p>
    </div>
  );
}

export function NotFoundPage() {
  return (
    <div className="max-w-4xl mx-auto p-8 text-center">
      <h1 className="text-4xl font-bold text-gray-800 mb-4">
        You seem to be lost!
      </h1>
      <p className="text-gray-600">
        The page you're looking for doesn't exist.
      </p>
    </div>
  );
}
