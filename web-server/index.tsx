import React from "react";
import { renderToString } from "react-dom/server";
import {verboseLog} from "../lib/utils.ts";
import {lookupRoute} from "./routes.tsx";

Deno.serve({
  port: Deno.env.get("PORT") ? Number(Deno.env.get("PORT")) : 0,
  handler: (req: Request) => {
    const url = new URL(req.url);
    const { pathname } = url;
    const { method } = req;
    verboseLog((`Request: ${method} ${pathname}`));
    const routeHandler = lookupRoute(method, pathname);
    if (routeHandler) {
      return routeHandler(req);
    }
    return new Response(renderToString(<h1>You seem to be lost!</h1>), {
      headers: { "Content-Type": "text/html" },
    });
  },
  onListen: (addr) => {
    console.log(`Listening on url: http://localhost:${addr.port}/`)
  },
  onError: (err) => {
    console.error("Error:", err);
    return new Response('An error occurred', { status: 500 });
  }
});

Deno.addSignalListener("SIGINT", () => {
  console.log("interrupted!");
  Deno.exit();
});
