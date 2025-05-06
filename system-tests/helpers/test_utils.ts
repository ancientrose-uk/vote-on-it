import {chromium} from "playwright";
import {EventEmitter} from "node:events";
import {verboseLog} from "../../lib/utils.ts";

const logStdio = Deno.env.get("VOI__LOG_STDIO") === "true"

setTimeout(() => {
  throw new Error("Test took too long!");
}, 15_000);

type CleanupFn = () => Promise<void>;

const cleanupFunctions: { priority: number; task: CleanupFn }[] = [];

function addCleanupTask(task: CleanupFn, priority: number = 0) {
  cleanupFunctions.push({ task, priority });
  cleanupFunctions.sort((a, b) => b.priority - a.priority);
}

export async function runCleanupTasks() {
  while (cleanupFunctions.length > 0) {
    const { task } = cleanupFunctions.shift()!;
    await task();
  }
}

function processBaseUrl(url: string) {
  const parsedUrl = new URL(url);
  const port = parsedUrl.port ? `:${parsedUrl.port}` : "";
  return `${parsedUrl.protocol}//${parsedUrl.hostname}${port}`;
}

let existingDelayBeforeClosingBrowser: Promise<void> | null = null
function waitForDelayBeforeClosingBrowser() {
  if (existingDelayBeforeClosingBrowser) {
    return existingDelayBeforeClosingBrowser;
  }
  const delayBeforeClosingBrowser = Number(
    Deno.env.get("VOI__DELAY_BEFORE_CLOSING_BROWSER") || 0,
  );
  existingDelayBeforeClosingBrowser = new Promise((resolve) => {
    setTimeout(() => {
      resolve();
    }, delayBeforeClosingBrowser);
  });
  return existingDelayBeforeClosingBrowser;
}

export async function getBrowserPage(baseUrl: string) {
  const showBrowser = Deno.env.get("VOI__SHOW_BROWSER") === "true";

  const defaultTimeout = 1000;

  const browser = await chromium.launch({ headless: !showBrowser });
  const page = await browser.newPage();

  addCleanupTask(async () => {
    console.log('cleaning up browser')
    await waitForDelayBeforeClosingBrowser();
    await browser.close();
  });

  function raceAgainstTimeout<T>(
    name: string,
    task: () => Promise<T>,
    timeout: number = defaultTimeout, // Default timeout of 5 seconds
  ): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error(`Task [${name}] timed out after [${timeout}]ms`));
      }, timeout);

      task()
        .then((result) => {
          clearTimeout(timer);
          resolve(result);
        })
        .catch((error) => {
          clearTimeout(timer);
          reject(error);
        });
    });
  }

  const browserFns: { [name: string]: Function } = {};

  function addBrowserFunction(
    name: string,
    fn: (...args: any[]) => Promise<any>,
  ) {
    browserFns[name] = (...args: any[]) =>
      raceAgainstTimeout(name, () => fn(...args));
  }

  addBrowserFunction("visit", async (uri) => {
    const fullUrl = baseUrl + uri;
    verboseLog(`visiting [${uri}] ([${fullUrl}])`);
    await page.goto(fullUrl);
    verboseLog("successfully visited", uri);
  });

  addBrowserFunction("getHeading", async (level = 1) => {
    verboseLog(`getting heading`, level);
    const heading = await page.locator(`h${level}`).textContent();
    verboseLog(`heading`, level, `is`, heading);
    return heading;
  });

  return { page, browserFns };
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export async function startServer() {
  verboseLog("Starting server...");
  const logLineToLookFor = "Listening on url: ";

  const events = new EventEmitter();
  let fullStdout = "";
  let fullStderr = "";
  let fullStdoutAndStderr = "";
  let processStillOpen = false;

  const server = new Deno.Command("deno", {
    args: ["task", "start"],
    env: {
      PORT: "0",
      NODE_ENV: "production",
      VOI__VERBOSE: Deno.env.get('VOI__VERBOSE') || '',
    },
    stdout: "piped",
    stderr: "piped",
    stdin: "piped",
  });
  const streamPromises: Promise<void>[] = [];

  const process = server.spawn();
  processStillOpen = true;

  const serverFinishedPromise = process.status.then(async (status) => {
    processStillOpen = false;
    console.log({
      status,
    });
    await Promise.all(streamPromises);
    await process.stdout.cancel();
    await process.stderr.cancel();
    await process.stdin.close();
    if (!status.success) {
      events.emit("SERVER_CRASHED");
      logStdOutAndError();

      throw new Error("Server process exited with error");
    }
  });

  streamPromises.push(
    streamToEventEmitter(
      process.stdout,
      events,
      "stdout",
      serverFinishedPromise,
    ),
  );
  streamPromises.push(
    streamToEventEmitter(
      process.stderr,
      events,
      "stderr",
      serverFinishedPromise,
    ),
  );

  events.on("stdout", (data) => {
    fullStdout += data;
    fullStdoutAndStderr += data;
    if (logStdio) {
      console.log(data);
    }
  });
  events.on("stderr", (data) => {
    fullStderr += data;
    fullStdoutAndStderr += data;
    if (logStdio) {
      console.error(data);
    }
  });
  events.on("stdout", (data) => {
    if (data.startsWith(logLineToLookFor)) {
      const url = processBaseUrl(data.substring(logLineToLookFor.length));
      events.emit("SERVER_STARTED", {
        url,
      });
    }
  });

  addCleanupTask(async () => {
    console.log('stopping server')
    if (processStillOpen) {
      process.kill("SIGINT");
    }
    await serverFinishedPromise;
  }, -100);

  const url: string = await new Promise((resolve, reject) => {
    let hasReturned = false;
    const timeout = setTimeout(() => {
      if (!hasReturned) {
        hasReturned = true;
        logStdOutAndError();
        reject(new Error("Timed out waiting for server to start"));
      }
    }, 3000);
    events.on("SERVER_STARTED", (info) => {
      if (!hasReturned) {
        clearTimeout(timeout);
        hasReturned = true;
        resolve(info.url);
      }
    });
    events.on("SERVER_CRASHED", () => {
      if (!hasReturned) {
        clearTimeout(timeout);
        hasReturned = true;
        reject(new Error("Server crashed while starting"));
      }
    });
  });

  return {
    baseUrl: url,
  };

  function logStdOutAndError() {
    console.log(" -- -- -- -- --");
    console.log("STDOUT & STDERR from server");
    console.log("");
    console.log(fullStdoutAndStderr);
    console.log(" -- -- -- -- --");
  }
}

async function streamToEventEmitter(
  stream: ReadableStream<Uint8Array>,
  emitter: EventEmitter,
  eventName: string,
  stopOnPromiseResolveOrReject: Promise<void>,
) {
  const reader = stream.getReader();
  const decoder = new TextDecoder();

  while (true) {
    const { done, value } = await Promise.any([
      reader.read(),
      stopOnPromiseResolveOrReject.catch(() => {}).then(() => {
        return {
          done: true,
          value: new Uint8Array(),
        };
      }),
    ]);
    if (done) {
      break;
    }
    const decodedValue = decoder.decode(value);
    emitter.emit(eventName, decodedValue);
  }

  reader.releaseLock();
  await stream.cancel();
}
