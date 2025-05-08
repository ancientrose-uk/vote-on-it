import {
  pathJoin,
  persistenceDir,
  projectDir,
  publicDir,
  webserverDir,
} from "../lib/paths.ts";

const starttime = Date.now();

import { bundle } from "jsr:@deno/emit";
import { execAndWaitOrThrow } from "../lib/exec.ts";
import { sleep } from "../lib/utils.ts";

await writeLockFile();

async function recursivelyGetMaxUpdatedDate(
  dir: string,
  ignoreDirName?: string,
): Promise<Date> {
  if (!await fileExists(dir)) {
    console.log(`dir does not exist: ${dir}`);
    return new Date(0);
  }
  let maxDate = new Date(0);
  for await (const entry of Deno.readDir(dir)) {
    const fullPath = pathJoin(dir, entry.name);
    if (entry.isDirectory && entry.name !== ignoreDirName) {
      const date = await recursivelyGetMaxUpdatedDate(fullPath, ignoreDirName);
      if (date > maxDate) {
        maxDate = date;
      }
    } else if (entry.isFile) {
      const stat = await Deno.stat(fullPath);
      if (stat.mtime && stat.mtime > maxDate) {
        maxDate = stat.mtime;
      }
    }
  }
  return maxDate;
}

if (
  await recursivelyGetMaxUpdatedDate(projectDir, "public") <
    await recursivelyGetMaxUpdatedDate(publicDir)
) {
  console.log(
    `public dir is newer than webserver dir, skipping build ([${
      Date.now() - starttime
    }]ms)`,
  );
  await releaseLockFile();
  Deno.exit(0);
}
async function cleanPublicDir() {
  console.log(`cleaning public dir [${publicDir}]`);
  await Deno.remove(publicDir, { recursive: true }).catch(() => {});
  await Deno.mkdir(publicDir, { recursive: true });
}

async function buildAndWriteClientJs() {
  const start = Date.now();
  console.log("starting client js build");
  const result = await bundle("./web-server/client.tsx", {
    importMap: "./import_map.json",
    minify: false,
    compilerOptions: {
      jsx: "react",
      jsxFactory: "React.createElement",
      jsxFragmentFactory: "React.Fragment",
    },
  });

  await Deno.writeTextFile(
    "./web-server/public/client.js",
    "// deno-lint-ignore-file\n" + result.code,
  );
  console.log(`finished client js build in [${Date.now() - start}]ms`);
}

async function buildAndWriteClientCss() {
  const start = Date.now();
  const cwd = webserverDir;
  console.log("starting css build");
  await execAndWaitOrThrow("npx", [
    "tailwindcss@3",
    "-i",
    pathJoin(webserverDir, "style.css"),
    "-o",
    pathJoin(publicDir, "output.css"),
  ], { cwd });
  console.log(`finished css build in [${Date.now() - start}]ms`);
}

await cleanPublicDir();
await Promise.all([
  buildAndWriteClientJs(),
  buildAndWriteClientCss(),
]);

async function fileExists(filePath: string) {
  try {
    await Deno.lstat(filePath);
  } catch (err) {
    if (!(err instanceof Deno.errors.NotFound)) {
      throw err;
    }
    return false;
  }
  return true;
}

async function writeLockFile() {
  await buildLockReleased();
  const lockFile = pathJoin(persistenceDir, ".build-lock");
  console.log("writing build lock file", Deno.pid);
  await Deno.mkdir(persistenceDir, { recursive: true });
  await Deno.writeTextFile(lockFile, Date.now().toString());
  console.log("build lock file written", Deno.pid);
}

async function releaseLockFile() {
  const lockFile = pathJoin(persistenceDir, ".build-lock");
  console.log("removing build lock file", Deno.pid);
  await Deno.remove(lockFile).catch(() => {});
}

async function buildLockReleased() {
  const lockFile = pathJoin(persistenceDir, ".build-lock");
  while (await fileExists(lockFile)) {
    const fileContents = Number(await Deno.readTextFile(lockFile));
    if (fileContents > (Date.now() - 1500) && fileContents < Date.now()) {
      await sleep(50);
    } else {
      console.log("build lock file is stale or broken, replace it", Deno.pid);
      await Deno.remove(lockFile).catch(() => {});
    }
  }
}

await releaseLockFile();
console.log("");
console.log(`build completed in [${Date.now() - starttime}]ms`);
console.log("");
