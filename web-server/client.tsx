/// <reference lib="dom" />
import React from "react";
import { hydrateRoot } from "react-dom/client";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import { HomePage, LoginPage } from "./components.tsx";

const router = createBrowserRouter([
  { path: "/", element: <HomePage /> },
  // { path: '/account', element: <AccountPage /> },
  { path: "/login", element: <LoginPage /> },
]);

const rootElement = document.getElementById("root");
if (!rootElement) throw new Error("Root element not found");

hydrateRoot(
  rootElement,
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>,
);
