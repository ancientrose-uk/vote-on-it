import { renderToString } from "react-dom/server";
import React from "react";
import { pathJoin, publicDir } from "../lib/paths.ts";

let lastBuildTime = "";
try {
  lastBuildTime = await getLastBuildTime();
} catch (e) {
  console.error("Error reading last build time", e);
  throw new Error(
    "Error reading last build time, this might mean the build wasn't performed",
  );
}

setInterval(async () => {
  try {
    lastBuildTime = await getLastBuildTime();
  } catch (e) {
    console.error("Error reading last build time", e);
  }
}, 5000);

export function redirect(url: string, status = 302): Response {
  return new Response(renderToString(<a href={url} />), {
    status,
    headers: {
      Location: url,
    },
  });
}

// deno-lint-ignore no-explicit-any
export function playgroundWrapReactElem<T extends Record<string, any>>(
  Component: React.ComponentType<T>,
  props: T,
): Response {
  return wrapReactElem(<Component {...props} />, props);
}

export function wrapReactElem(
  reactElement: React.JSX.Element,
  initialState = {},
): Response {
  const html = renderToString(reactElement);
  return new Response(
    `<!DOCTYPE html>
    <html>
      <head>
        <title>Vote On It!</title>
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <link rel="stylesheet" href="/static/output.css?cb=${lastBuildTime}" />
      </head>
      <body class="ml-16 mr-16">
        <div id="root">${html}</div>
        <script>
          window.__INITIAL_STATE__ = ${JSON.stringify(initialState)};
        </script>
        <script type="module" src="/static/client.js?cb=${lastBuildTime}"></script>
      </body>
    </html>`,
    {
      headers: { "Content-Type": "text/html" },
    },
  );
}

export function getErrorMessage(req: Request, missingFields: string[] = []) {
  if (missingFields.length > 0) {
    return `Please enter your ${missingFields.join(" and ")}`;
  }
  const url = new URL(req.url);
  const error = url.searchParams.get("error");
  switch (error) {
    case "user-not-found":
      return `We couldn't find your account`;
    default:
      return "";
  }
}

async function getLastBuildTime() {
  return await Deno.readTextFile(pathJoin(publicDir, "last-updated.txt")).then(
    (x) => x.trim(),
  ).catch(() => "" + Math.random());
}
