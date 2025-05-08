/// <reference lib="dom" />
import React from "react";
import { hydrateRoot } from "react-dom/client";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import {
  AccountPage,
  HomePage,
  LoginPage,
  NotFoundPage,
  RoomPage,
} from "./components.tsx";

// deno-lint-ignore no-explicit-any
const initialState = (window as any).__INITIAL_STATE__ || {};

const router = createBrowserRouter([
  { path: "/", element: <HomePage /> },
  {
    path: "/account",
    element: (
      <AccountPage
        username={initialState.username}
        roomName={initialState.roomName}
        roomUrl={initialState.roomUrl}
      />
    ),
  },
  {
    path: "/login",
    element: (
      <LoginPage
        error={initialState.error}
        prefilledUsername={initialState.prefilledUsername}
      />
    ),
  },
  {
    path: "/room/:urlName",
    element: (
      <RoomPage
        roomName={initialState.roomName}
        isClientSide
        statusMessage={initialState.statusMessage}
        roomUrlName={initialState.roomUrlName}
      />
    ),
  },
  {
    path: "*",
    element: <NotFoundPage />,
  },
]);

const rootElement = document.getElementById("root");
if (!rootElement) throw new Error("Root element not found");

hydrateRoot(
  rootElement,
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>,
  {
    onCaughtError: (error, errorInfo) => {
      console.log({
        error,
        componentStack: errorInfo.componentStack,
      });
    },
  },
);
