import { pathJoin, projectDir, publicDir, webserverDir } from "../lib/paths.ts";

const start = Date.now();

import { bundle } from "jsr:@deno/emit";
import { execAndWaitOrThrow } from "../lib/exec.ts";
import { runWithLockfile } from "../lib/runWithLockfile.ts";

const lockFilePath = pathJoin(projectDir, ".build-lockfile");

await runWithLockfile(lockFilePath, runBuild);

async function runBuild() {
  const buildFilesDate = await recursivelyGetMaxUpdatedDate(projectDir, [
    "public",
    ".persistence",
  ]);
  const publicDirDate = await getLastUpdatedFromUpdatedFile();
  if (buildFilesDate.maxDate.getTime() < publicDirDate) {
    return;
  }

  await cleanPublicDir();
  await Promise.all([
    buildAndWriteClientJs(),
    buildAndWriteClientCss(),
  ]);

  await writeLatUpdatedFile();

  console.log("");
  console.log(`build completed in [${Date.now() - start}]ms`);
  console.log("");
}

async function writeLatUpdatedFile() {
  const publicDirDate = await recursivelyGetMaxUpdatedDate(publicDir);
  const file = pathJoin(publicDir, "last-updated.txt");
  const contents = publicDirDate.maxDate.getTime() + "\n";
  console.log("writing file", file, contents);
  await Deno.writeTextFile(file, contents);
}
async function getLastUpdatedFromUpdatedFile() {
  const file = pathJoin(publicDir, "last-updated.txt");
  return await Deno.readTextFile(file).then((str) => Number(str.trim())).catch(
    () => 0,
  );
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
async function recursivelyGetMaxUpdatedDate(
  dir: string,
  ignoreDirName?: string[],
): Promise<{ maxDate: Date; latestFile: string }> {
  if (!await fileExists(dir)) {
    console.log(`dir does not exist: ${dir}`);
    return {
      maxDate: new Date(0),
      latestFile: "",
    };
  }
  let maxDate: Date = new Date(0);
  let latestFile = "";
  for await (const entry of Deno.readDir(dir)) {
    const fullPath = pathJoin(dir, entry.name);
    if (
      entry.isDirectory && !entry.name.startsWith(".") &&
      !ignoreDirName?.includes(entry.name)
    ) {
      const date = await recursivelyGetMaxUpdatedDate(fullPath, ignoreDirName);
      if (date.maxDate > maxDate) {
        maxDate = date.maxDate;
        latestFile = fullPath;
      }
    } else if (entry.isFile && !entry.name.startsWith(".")) {
      const stat = await Deno.stat(fullPath);
      if (stat.mtime && stat.mtime > maxDate) {
        maxDate = stat.mtime;
        latestFile = fullPath;
      }
    }
  }
  return { maxDate, latestFile };
}
