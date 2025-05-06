import React from "react";
import { renderToString } from "https://esm.sh/react-dom/server";

const report = `Env var: ${Deno.env.get('NODE_ENV')}`

Deno.serve({
  port: Deno.env.get("PORT") ? Number(Deno.env.get("PORT")) : 0,
  handler: () => {
    return new Response(renderToString(<h1>Welcome to Vote On It! {report}</h1>), {
      headers: {
        "Content-Type": "text/html",
      },
    });
  },
});
Deno.addSignalListener("SIGINT", () => {
  console.log("interrupted!");
  Deno.exit();
});
