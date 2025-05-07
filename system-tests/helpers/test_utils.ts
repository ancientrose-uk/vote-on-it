import { chromium } from "playwright";
import { EventEmitter } from "node:events";
import { verboseLog } from "../../lib/utils.ts";
import { afterAll } from "jsr:@std/testing/bdd";
import path from "node:path";
import { randomUUID } from "node:crypto";

const logStdio = Deno.env.get("VOI__LOG_STDIO") === "true";

afterAll(async () => {
  await runCleanupTasks();
});

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

let existingDelayBeforeClosingBrowser: Promise<void> | null = null;
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

function getSelectorForFormField(key: string) {
  return `input[name="${key}"]`;
}

type BrowserPageConfig = {
  jsEnabled: boolean;
};

export async function getBrowserPage(
  baseUrl: string,
  { jsEnabled = true } = {} as BrowserPageConfig,
) {
  const showBrowser = Deno.env.get("VOI__SHOW_BROWSER") === "true";

  const defaultTimeout = 1000;

  const browser = await chromium.launch({ headless: !showBrowser });
  const context = await browser.newContext({
    javaScriptEnabled: jsEnabled,
  });
  const page = await context.newPage();

  addCleanupTask(async () => {
    await waitForDelayBeforeClosingBrowser();
    await browser.close();
  });

  function raceAgainstTimeout<T>(
    name: string,
    task: () => Promise<T>,
    timeout: number = defaultTimeout,
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

  // deno-lint-ignore ban-types
  const browserFns: { [name: string]: Function } = {};

  // deno-lint-ignore no-explicit-any
  function addBrowserFunction<T extends (...args: any[]) => any>(
    name: string,
    fn: T,
  ) {
    browserFns[name] = (
      ...args: Parameters<T>
    ): Promise<Awaited<ReturnType<T>>> =>
      raceAgainstTimeout<Awaited<ReturnType<T>>>(
        name,
        async () => await fn(...args),
      );
  }

  addBrowserFunction("visit", async (uri) => {
    const fullUrl = baseUrl + uri;
    verboseLog(`visiting [${uri}] ([${fullUrl}])`);
    await page.goto(fullUrl);
    verboseLog("successfully visited", uri);
  });

  addBrowserFunction("getHeading", async (level = 1) => {
    verboseLog(`getting heading`, level);
    const heading = await page.getByRole("heading", level).textContent();
    verboseLog(`heading`, level, `is`, heading);
    return heading;
  });

  addBrowserFunction("fillFormWith", async (input: Record<string, string>) => {
    verboseLog("filling form with", input);
    for (const [key, value] of Object.entries(input)) {
      await page.locator(getSelectorForFormField(key)).fill(value);
      verboseLog(`filled ${(getSelectorForFormField(key))} with ${value}`);
    }
    verboseLog("form filled");
  });

  addBrowserFunction("clickButton", async (buttonText: string) => {
    verboseLog("clicking button with text", buttonText);
    const button = page.locator(`button:has-text("${buttonText}")`);
    await button.click();
    verboseLog("clicked button with text");
  });

  addBrowserFunction("getCurrentUri", () =>
    new Promise((resolve) => {
      verboseLog("getting current uri");
      const url = page.url().replace(baseUrl, "");
      verboseLog("current uri is", url);
      resolve(url);
    }));

  addBrowserFunction("getErrorMessage", async () => {
    verboseLog("getting error message");
    const message = await page.locator(".errorMessage").textContent();
    verboseLog("got error message", message);
    return message;
  });

  addBrowserFunction("getFieldValue", async (fieldName: string) => {
    verboseLog("getting field value");
    const value = await page.locator(getSelectorForFormField(fieldName))
      .inputValue();
    verboseLog("got field value", value);
    return value;
  });

  addBrowserFunction("differentUsersBrowser", () => {
    return getBrowserPage(baseUrl);
  });

  return { page, browserFns };
}

type StartServerConfig = {
  env?: Record<string, string>;
};

export async function startServer(config: StartServerConfig = {}) {
  verboseLog("Starting server...");
  const logLineToLookFor = "Listening on url: ";

  const events = new EventEmitter();
  let fullStdout = "";
  let fullStderr = "";
  let fullStdoutAndStderr = "";
  let processStillOpen = false;

  const preparedEnvVars = ensureSqliteLocationSet({
    PORT: "0",
    NODE_ENV: "production",
    VOI__VERBOSE: Deno.env.get("VOI__VERBOSE") || "",
    ...config?.env,
  });
  const server = new Deno.Command("deno", {
    args: ["task", "start"],
    env: preparedEnvVars,
    stdout: "piped",
    stderr: "piped",
    stdin: "piped",
  });
  const streamPromises: Promise<void>[] = [];

  const process = server.spawn();
  processStillOpen = true;

  const serverFinishedPromise = process.status.then(async (status) => {
    processStillOpen = false;
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

  const stopServer = async () => {
    if (processStillOpen) {
      process.kill("SIGINT");
    }
    await serverFinishedPromise;
  };
  addCleanupTask(stopServer, -1);

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
    port: new URL(url).port,
    dbFile: preparedEnvVars.VOI__SQLITE_LOCATION,
    stopServer,
  };

  function logStdOutAndError() {
    console.log(" -- -- -- -- --");
    console.log("STDOUT & STDERR from server");
    console.log("");
    console.log(fullStdoutAndStderr);
    console.log(" -- -- -- -- --");
  }

  function ensureSqliteLocationSet(env?: Record<string, string>) {
    const sqliteLocation = env?.VOI__SQLITE_LOCATION;
    if (sqliteLocation) {
      return env;
    }
    const generatedSqliteLocation = path.join(
      ".persistence",
      "test-runs",
      `sqlite-for-test-${randomUUID()}`,
      "db.sqlite",
    );
    const dir = path.dirname(generatedSqliteLocation);
    addCleanupTask(async () => {
      await Deno.remove(dir, { recursive: true });
    }, -2);
    return {
      ...env,
      VOI__SQLITE_LOCATION: generatedSqliteLocation,
    };
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
