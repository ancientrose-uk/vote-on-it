import EventEmitter from "node:events";
import { projectDir } from "../lib/paths.ts";

const ee = new EventEmitter();

const port = Deno.env.get("PORT") || Deno.env.get("VOI__PORT") || 3000;
const shouldFixFormatting =
  Deno.env.get("VOI__DEV__AUTO_FIX_FORMATTING") === "true";

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
  console.log("SIGINT received, stopping all processes");
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
  if (shouldFixFormatting) {
    testCommandsToRun.unshift("check:all:fix");
  }
  const serverToRun = ["server:dev"];
  await Promise.all([
    runCommandSequence(testCommandsToRun),
    runCommandSequence(serverToRun),
  ]);
}

async function runCommandSequence(commands: string[]) {
  let changeOccurredWhileRunning = false;
  ee.on("change", () => {
    changeOccurredWhileRunning = true;
  });
  while (commands.length > 0) {
    const command = commands.shift();
    if (!command) {
      throw new Error("Empty command, WTF?");
    }
    const handler = runDenoCommand(command);
    processes.push(handler);
    const { shouldRunNext } = await handler.finished;
    removeProcess(handler);
    console.log(`Server should be running on`, assumedServerUrl);
    if (!shouldRunNext || changeOccurredWhileRunning) {
      return;
    }
  }
}

function runDenoCommand(command: string) {
  console.log("running deno command", command);
  let manuallyStopped = false;
  const cmd = new Deno.Command("deno", {
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
          !pathParts.includes(".persistence");
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
