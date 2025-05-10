#!/usr/bin/env -S deno run --allow-all

import { execAndWaitOrThrow } from "../../lib/exec.ts";
import { pathJoin, projectDir } from "../../lib/paths.ts";
import { runWithLockfile } from "../../lib/runWithLockfile.ts";
import { sleep } from "../../lib/utils.ts";

const proc = Deno.args[0];

if (proc) {
  const lockFilePath = pathJoin(projectDir, ".test-lockfile-lockfile");

  let lastDate = Date.now();
  console.log(
    await runWithLockfile(lockFilePath, () =>
      sleep(1000).then(() => {
        const timeSince = Date.now() - lastDate;
        lastDate = Date.now();
        return `this is thread [${proc}], [${
          timeSince / 1000
        }] seconds since the process started`;
      })),
  );
  Deno.exit(0);
}

const startTime = Date.now();

const totalRuns = 3;
let index = 0;
const __filename = import.meta.url.replace("file://", "");

let lastDate = Date.now();
await Promise.all(
  Array.from({ length: totalRuns }).map(() =>
    execAndWaitOrThrow("deno", [
      "run",
      "--allow-all",
      __filename,
      "run-" + (++index),
    ]).then(() => {
      const timeSince = Date.now() - lastDate;
      lastDate = Date.now();
      console.log(`complete, [${timeSince}]ms since last call`);
    })
  ),
);

const totalTime = Date.now() - startTime;
const average = totalTime / totalRuns;

const isAcceptable = average < 1100 && average > 1000;

console.log(
  `complete in [${totalTime}]ms, that's a [${average}]ms average which ${
    isAcceptable ? "is" : "is not"
  } acceptable.`,
);

Deno.exit(isAcceptable ? 0 : 1);
