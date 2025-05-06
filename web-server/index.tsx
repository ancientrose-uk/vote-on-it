import React from "react";
import { renderToString } from "react-dom/server";

const report = `Env var: ${Deno.env.get('NODE_ENV')}`

await new Promise(resolve => setTimeout(resolve, 1000))

Deno.serve({
  port: Deno.env.get("PORT") ? Number(Deno.env.get("PORT")) : 0,
  handler: () => {
    return new Response(renderToString(<h1>Welcome to Vote On It! {report}</h1>), {
      headers: {
        "Content-Type": "text/html",
      },
    });
  },
  onListen: (addr) => {
    console.log(`Listening on http://localhost:${addr.port}/`)
  }
});

Deno.addSignalListener("SIGINT", () => {
  console.log("interrupted!");
  Deno.exit();
});
