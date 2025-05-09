import EventEmitter from "node:events";
import { projectDir } from "../lib/paths.ts";

const ee = new EventEmitter();

const port = Deno.env.get("VOI__DEV__PORT") ||
  Deno.env.get("VOI__PORT") || Deno.env.get("PORT") || "3000";

const args = Deno.args;

const allowedArgs = ["server", "tests", "all"];

const invalidArgs = args.filter((arg) => !allowedArgs.includes(arg));
if (invalidArgs.length > 0) {
  console.error(
    `Invalid argument(s) [${invalidArgs.join(", ")}]. Allowed arguments are: ${
      allowedArgs.join(", ")
    }`,
  );
  Deno.exit(1);
}

if (args.length === 0) {
  console.error(
    `No arguments provided. Allowed arguments are: ${allowedArgs.join(", ")}`,
  );
  Deno.exit(1);
}

const shouldRunTests = args.includes("tests") || args.includes("all");
const shodulRunServer = args.includes("server") || args.includes("all");

const shouldFixFormatting =
  Deno.env.get("VOI__DEV__AUTO_FIX_FORMATTING") === "true";

const priorityTestTask = Deno.env.get("VOI__DEV__PRIORITY_TEST_TASK");
const priorityCheckTask = Deno.env.get("VOI__DEV__PRIORITISE_TYPE_CHECKING");

const assumedServerUrl = `http://localhost:${port}`;

const watcher = Deno.watchFs([projectDir], {
  recursive: true,
});

const processes: ReturnType<typeof runDenoCommand>[] = [];

function removeProcess(proc: ReturnType<typeof runDenoCommand>) {
  const index = processes.indexOf(proc);
  if (index !== -1) {
    processes.splice(index, 1);
  }
}

ee.on("change", async () => {
  await stopExistingProcesses();
  await startTheWholeChain();
});

Deno.addSignalListener("SIGINT", async () => {
  try {
    console.log("SIGINT received, stopping all processes");
  } catch (_) {
    // ignore error
  }
  await stopExistingProcesses();
  Deno.exit(0);
});

await Promise.all([
  startTheWholeChain(),
  watchForFileSystemChanges(),
  listenForStdIn(),
]);

async function stopExistingProcesses() {
  console.log("stopping existing processes");
  while (processes.length > 0) {
    console.log(`stopping (${processes.length}) remaining processes`);
    const process = processes.pop();
    if (process) {
      process.stop();
      await process.finished;
    }
  }
}

async function startTheWholeChain() {
  console.clear();
  console.log("starting");
  const testCommandsToRun = [
    "test:unit",
    "test:browser:all",
    "test:browser:all:no-js",
    "check:all",
  ];
  if (priorityTestTask) {
    testCommandsToRun.unshift(priorityTestTask);
  }
  if (shouldFixFormatting) {
    testCommandsToRun.unshift("check:all:fix");
  }
  if (priorityCheckTask) {
    testCommandsToRun.unshift("check:types.ts");
  }
  const serverToRun = ["server:dev"];
  await Promise.all([
    shouldRunTests ? runCommandSequence(testCommandsToRun) : [],
    shodulRunServer ? runCommandSequence(serverToRun) : [],
  ]);
}

async function runCommandSequence(commands: string[]) {
  let changeOccurredWhileRunning = false;
  ee.on("change", () => {
    changeOccurredWhileRunning = true;
  });
  const start = Date.now();
  while (commands.length > 0) {
    const command = commands.shift();
    if (!command) {
      throw new Error("Empty command, WTF?");
    }
    const handler = runDenoCommand(command);
    processes.push(handler);
    const { shouldRunNext } = await handler.finished;
    removeProcess(handler);
    if (!shouldRunNext || changeOccurredWhileRunning) {
      if (!shouldRunNext) {
        console.log(`Chain broken by command: [${command}]`);
      }
      console.log(`Server should be running on`, assumedServerUrl);
      return;
    }
    console.log(`Server should be running on`, assumedServerUrl);
  }
  console.log(`Finished running all commands in [${Date.now() - start}]ms`);
}

function getEnvToPassThrough(command: string) {
  const allEnvVars = Deno.env.toObject();
  const result = Object.entries(allEnvVars).reduce((acc, [key, value]) => {
    if (["VOI__DEV__PORT", "VOI__PORT", "PORT"].includes(key)) {
      if (command === "server:dev") {
        acc["PORT"] = port;
      }
    } else {
      acc[key] = value;
    }
    return acc;
  }, {} as Record<string, string>);
  console.log(
    `passing env vars (${result.PORT}), (${result.VOI__PORT}), (${result.VOI__DEV__PORT})`,
  );
  return result;
}

function runDenoCommand(command: string) {
  console.log("running deno command", command);
  let manuallyStopped = false;
  const cmd = new Deno.Command("deno", {
    env: getEnvToPassThrough(command),
    args: ["task", command],
    stdout: "inherit",
    stderr: "inherit",
  });

  const proc = cmd.spawn();
  const finished = proc.status.then((status) => {
    if (!manuallyStopped && status.success) {
      console.log(`Process finished successfully: ${command}`);
      return { shouldRunNext: true };
    }
    return { shouldRunNext: false };
  });

  function stop() {
    manuallyStopped = true;
    proc.kill("SIGINT");
    console.log(`Process stopped: ${command}`);
  }

  return {
    proc,
    stop,
    finished,
  };
}
async function watchForFileSystemChanges() {
  for await (const event of watcher) {
    if (
      event.paths.some((path) => {
        const pathParts = path.split("/");
        return !pathParts.includes("public") &&
          !pathParts.some((part) => part.startsWith("."));
      })
    ) {
      console.log("firing change event");
      ee.emit("change");
    }
  }
}
async function listenForStdIn() {
  const decoder = new TextDecoder();
  const stdin = Deno.stdin.readable.getReader();
  while (true) {
    const { done, value } = await stdin.read();
    if (done) {
      break;
    }
    console.log("received stdin", decoder.decode(value));
    ee.emit("change");
  }
}
