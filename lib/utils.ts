export const verboseLog = Deno.env.get("VOI__VERBOSE") === "true"
  ? console.log
  : () => {};

export const sleep = (ms: number) =>
  new Promise((resolve) => setTimeout(resolve, ms));

let knownRunningPort = 0;

export function setRunningPort(port: number) {
  knownRunningPort = port;
}

export function getPort() {
  if (knownRunningPort) {
    return knownRunningPort;
  }
  const port = Number(Deno.env.get("PORT"));
  const voiPort = Number(Deno.env.get("VOI__PORT"));
  if (!isNaN(voiPort)) {
    return voiPort;
  }
  if (!isNaN(port)) {
    return port;
  }
  return 0;
}

export function getPublicUrl() {
  return Deno.env.get("VOI__CANONICAL_BASE_URL") ||
    `http://localhost:${getPort()}`;
}

export function getFullRoomUrlFromUrlName(urlName: string) {
  return getPublicUrl() +
    `/room/${encodeURIComponent(urlName)}`;
}
