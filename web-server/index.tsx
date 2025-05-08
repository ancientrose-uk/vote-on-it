import { getPort, setRunningPort, verboseLog } from "../lib/utils.ts";
import { defaultHandler, lookupRoute } from "./routes.tsx";
import { AuthHandler } from "../lib/AuthHandler.ts";
import { serveFile } from "jsr:@std/http/file-server";
import path from "node:path";

const dirname = path.dirname(new URL(import.meta.url).pathname);

const authHandler = new AuthHandler({
  allowedUsersFromEnvVars: Deno.env.get("VOI__ALLOWED_USERS"),
});

const targetPort = getPort();
try {
  Deno.serve({
    port: targetPort,
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
      const port = addr.port;
      setRunningPort(port);
      console.log(`Listening on url: http://localhost:${port}/`);
    },
    onError: (err) => {
      console.error("Error:", err);
      return new Response("An error occurred", { status: 500 });
    },
  });
} catch (e) {
  if (isErrorWithCode(e) && e.code === "EADDRINUSE") {
    console.error(
      `Port ${targetPort} is already in use. Please stop the process using it.`,
    );
    throw new Error(`Port ${targetPort} is already in use`);
  }
  console.error(
    `Error (${isErrorWithCode(e) ? e.code : "unknown"}) starting server:`,
    e,
  );
  Deno.exit(1);
}

function isErrorWithCode(error: unknown): error is { code: string } {
  return typeof error === "object" && error !== null && "code" in error &&
    // deno-lint-ignore no-explicit-any
    typeof (error as any).code === "string";
}
Deno.addSignalListener("SIGINT", () => {
  console.log("interrupted!");
  Deno.exit();
});
