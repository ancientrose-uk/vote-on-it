import { verboseLog } from "../lib/utils.ts";
import { defaultHandler, lookupRoute } from "./routes.tsx";
import { AuthHandler } from "../lib/AuthHandler.ts";
import { serveFile } from "jsr:@std/http/file-server";
import path from "node:path";

const dirname = path.dirname(new URL(import.meta.url).pathname);

const authHandler = new AuthHandler({
  allowedUsersFromEnvVars: Deno.env.get("VOI__ALLOWED_USERS"),
});

Deno.serve({
  port: Deno.env.get("PORT") ? Number(Deno.env.get("PORT")) : 0,
  handler: async (req: Request) => {
    const url = new URL(req.url);
    const { pathname } = url;
    const { method } = req;
    if (
      pathname.startsWith("/static/") && method === "GET" &&
      !pathname.includes("..")
    ) {
      const staticFilePath = path.join(
        dirname,
        pathname.replace("/static/", "/public/"),
      );
      return serveFile(req, staticFilePath);
    }
    verboseLog(`Request: ${method} ${pathname}`);
    const routeHandler = lookupRoute(method, pathname);
    const requestContext = authHandler.getRequestContext(req);
    if (routeHandler) {
      return requestContext.setCookieOnResponse(
        await routeHandler({
          req,
          authHandler,
          requestAuthContext: requestContext,
        }),
      );
    }
    return defaultHandler({
      req,
      authHandler,
      requestAuthContext: requestContext,
    });
  },
  onListen: (addr) => {
    console.log(`Listening on url: http://localhost:${addr.port}/`);
  },
  onError: (err) => {
    console.error("Error:", err);
    return new Response("An error occurred", { status: 500 });
  },
});

Deno.addSignalListener("SIGINT", () => {
  console.log("interrupted!");
  Deno.exit();
});
