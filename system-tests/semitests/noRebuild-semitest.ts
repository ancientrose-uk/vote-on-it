import { pathJoin, webserverDir } from "../../lib/paths.ts";
import { execAndWaitOrThrow } from "../../lib/exec.ts";

async function triggerRebuild() {
  await execAndWaitOrThrow("touch", [
    pathJoin(webserverDir, "tailwind.config.js"),
  ]);
}

async function runBuildStep() {
  const start = Date.now();
  console.log("running build step");
  await execAndWaitOrThrow("deno", [
    "task",
    "build",
  ]);
  const timeTaken = Date.now() - start;
  console.log(`build step complete [${timeTaken}]ms`);
  return timeTaken;
}

await triggerRebuild();
const allRebuildTimes: number[] = [];
const allNonRebuildTimes: number[] = [];
allRebuildTimes.push(await runBuildStep());
for (let i = 0; i < 10; i++) {
  allNonRebuildTimes.push(await runBuildStep());
}
await triggerRebuild();
allRebuildTimes.push(await runBuildStep());

const minRebuildTime = allRebuildTimes.reduce(
  (a, b) => Math.min(a, b),
  Infinity,
);
const maxNoRebuild = allNonRebuildTimes.reduce((a, b) => Math.max(a, b), 0);

const threshold = maxNoRebuild * 10;
const acceptable = minRebuildTime > threshold;
console.log({
  minRebuildTime,
  maxNoRebuild,
  threshold,
  acceptable,
  allNonRebuildTimes,
  allRebuildTimes,
});

Deno.exit(acceptable ? 0 : 1);
