import {chromium} from "playwright";
import {
  getAvailablePort
} from "https://deno.land/x/port/mod.ts";

const verboseLog = Deno.env.get("VOI__VERBOSE") === "true" ? console.log : () => {};

setTimeout(() => {
  console.error('Test took too long!')
  Deno.exit(1)
}, 10_000)

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
  const delayBeforeClosingBrowser = Number(Deno.env.get("DELAY_BEFORE_CLOSING_BROWSER") || 0);

  const browser = await chromium.launch({ headless: !showBrowser });
  const page = await browser.newPage();

  addCleanupTask(async () => {
    await sleep(delayBeforeClosingBrowser);
    await browser.close();
  });
  return { page };
}

const sleep =(ms: number) => new Promise((resolve) => setTimeout(resolve, ms))


function arrayBufferToString(arrayBuffer: Uint8Array<ArrayBuffer>) {
  const decoder = new TextDecoder()
  const data = decoder.decode(arrayBuffer);
  return data;
}

export async function startServer() {
  verboseLog("Starting server...");
  const port = await getAvailablePort();
  verboseLog('Starting server on port', port);
  const server = new Deno.Command("deno", {
    args: [
      "task",
      "start",
    ],
    env: {
      PORT: '' + port,
      NODE_ENV: 'production'
    },
    stdout: "piped",
    stderr: "piped",
    stdin: "piped",
  });

  await sleep(300)

  const process = server.spawn();

  const serverFinishedPromise = process.status.then(async (status) => {
    console.log({
      status
    })
    if (status.success) {
      await process.stdout.cancel();
      await process.stderr.cancel();
      await process.stdin.close();
      return
    }
    const commandOutput = await process.output();
    console.error(' - - - - STD ERR - - - - ')
    console.error(arrayBufferToString(commandOutput.stderr))
    console.log(' - - - - STD OUT - - - - ')
    console.error(arrayBufferToString(commandOutput.stdout))
    console.log(' - - - - - - - - - - - - ')

    throw(new Error("Server process exited with error"));
  })
  // await sleep(1000)

  addCleanupTask(async () => {
    process.kill("SIGINT");
    await serverFinishedPromise
  });

  return {
    baseUrl: `http://localhost:${port}`,
  }
}
