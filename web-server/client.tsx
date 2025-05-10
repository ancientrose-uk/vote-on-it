/// <reference lib="dom" />
import React from "react";
import { hydrateRoot } from "react-dom/client";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import { HomePage } from "../lib/components/HomePage.tsx";
import { AccountPage } from "../lib/components/AccountPage.tsx";
import { LoginPage } from "../lib/components/LoginPage.tsx";
import { RoomPage } from "../lib/components/RoomPage.tsx";
import { NotFoundPage } from "../lib/components/NotFoundPage.tsx";

// deno-lint-ignore no-explicit-any
const initialState = (window as any).__INITIAL_STATE__ || {};

const router = createBrowserRouter([
  { path: "/", element: <HomePage /> },
  {
    path: "/account",
    element: (
      <AccountPage
        {...initialState}
      />
    ),
  },
  {
    path: "/login",
    element: (
      <LoginPage
        {...initialState}
      />
    ),
  },
  {
    path: "/room/:urlName",
    element: (
      <RoomPage
        {...initialState}
      />
    ),
  },
  {
    path: "*",
    element: (
      <NotFoundPage
        {...initialState}
      />
    ),
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
