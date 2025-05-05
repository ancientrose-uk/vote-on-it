console.log('testing log')
console.error('testing error')

Deno.serve({
  port: 3123,
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
