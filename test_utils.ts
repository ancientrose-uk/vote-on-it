import { chromium } from "playwright";
import { getAvailablePort } from "https://deno.land/x/port/mod.ts";
import { EventEmitter } from "node:events";

const verboseLog =
  Deno.env.get("VOI__VERBOSE") === "true" ? console.log : () => {};

setTimeout(() => {
  console.error("Test took too long!");
  Deno.exit(1);
}, 10_000);

type CleanupFn = () => Promise<void>;

const cleanupFunctions: { priority: number; task: CleanupFn }[] = [];

function addCleanupTask(task: CleanupFn, priority: number = 0) {
  cleanupFunctions.push({ task, priority });
  cleanupFunctions.sort((a, b) => a.priority - b.priority);
}

export async function runCleanupTasks() {
  while (cleanupFunctions.length > 0) {
    const { task } = cleanupFunctions.shift()!;
    await task();
  }
}

export async function getBrowserPage() {
  const showBrowser = Deno.env.get("SHOW_BROWSER") === "true";
  const delayBeforeClosingBrowser = Number(
    Deno.env.get("DELAY_BEFORE_CLOSING_BROWSER") || 0
  );

  const browser = await chromium.launch({ headless: !showBrowser });
  const page = await browser.newPage();

  addCleanupTask(async () => {
    await sleep(delayBeforeClosingBrowser);
    await browser.close();
  });
  return { page };
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function arrayBufferToString(arrayBuffer: Uint8Array<ArrayBuffer>) {
  const decoder = new TextDecoder();
  const data = decoder.decode(arrayBuffer);
  return data;
}

export async function startServer() {
  verboseLog("Starting server...");
  const logLineToLookFor = "Listening on url: ";

  const events = new EventEmitter();
  let fullStdout = ''
  let fullStderr = ''

  const server = new Deno.Command("deno", {
    args: ["task", "start"],
    env: {
      PORT: "0",
      NODE_ENV: "production",
    },
    stdout: "piped",
    stderr: "piped",
    stdin: "piped",
  });

  const streamPromises:Promise<void>[] = []
  const process = server.spawn();

  const serverFinishedPromise = process.status.then(async (status) => {
    console.log({
      status,
    });
    await Promise.all(streamPromises);
    await process.stdout.cancel();
    await process.stderr.cancel();
    await process.stdin.close();
    if (!status.success) {
      throw new Error("Server process exited with error");
      }
  });

  streamPromises.push(streamToEventEmitter(process.stdout, events, "stdout", serverFinishedPromise))
  streamPromises.push(streamToEventEmitter(process.stderr, events, "stderr", serverFinishedPromise))

  events.on('stdout', (data) => {
    fullStdout += data
  })
  events.on('stderr', (data) => {
    fullStderr += data
  })
  events.on('stdout', (data) => {
    if (data.startsWith(logLineToLookFor)) {
      const url = data.substring(logLineToLookFor.length)
        events.emit('SERVER_STARTED', {
            url
        })
    }
  })

  addCleanupTask(async () => {
    process.kill("SIGINT");
    await serverFinishedPromise;
  });

  const url: string = await new Promise((resolve, reject) => {
    let hasReturned = false;
    const timeout = setTimeout(() => {
      if (!hasReturned) {
        hasReturned = true;
        reject(new Error("Timed out waiting for server to start"));
      }
    }, 3000);
    events.on("SERVER_STARTED", (info) => {
      clearTimeout(timeout);
      if (!hasReturned) {
        hasReturned = true;
        resolve(info.url);
      }
    });
  });

  return {
    baseUrl: url.substring(0, url.length - 1),
  };
}

async function streamToEventEmitter(
  stream: ReadableStream<Uint8Array>,
  emitter: EventEmitter,
  eventName: string,
  stopOnPromiseResolveOrReject: Promise<void>
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
