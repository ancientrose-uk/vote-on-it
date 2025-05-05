Deno.serve({
  port: Deno.env.get("PORT") ? Number(Deno.env.get("PORT")) : 0,
  handler: () => {
    return new Response("<h1>Welcome to Vote On It!</h1>", {
      headers: {
        "Content-Type": "text/html",
      },
    })
  },
});
Deno.addSignalListener("SIGINT", () => {
  console.log("interrupted!");
  Deno.exit();
});
