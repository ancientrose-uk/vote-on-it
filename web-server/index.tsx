import React from "react";
import { renderToString } from "react-dom/server";

Deno.serve({
  port: Deno.env.get("PORT") ? Number(Deno.env.get("PORT")) : 0,
  handler: () => {
    return new Response(renderToString(<h1>Welcome to Vote On It!</h1>), {
      headers: {
        "Content-Type": "text/html",
      },
    });
  },
  onListen: (addr) => {
    console.log(`Listening on url: http://localhost:${addr.port}/`)
  }
});

Deno.addSignalListener("SIGINT", () => {
  console.log("interrupted!");
  Deno.exit();
});
