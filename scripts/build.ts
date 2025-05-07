const starttime = Date.now();

import { bundle } from "jsr:@deno/emit";
import { execAndWaitOrThrow } from "../lib/exec.ts";
import * as path from "jsr:@std/path";

const dirname = path.dirname(new URL(import.meta.url).pathname);

const projectDir = path.join(dirname, "..");
const webserverDir = path.join(projectDir, "web-server");
const publicDir = path.join(webserverDir, "public");

await Deno.mkdir(publicDir, { recursive: true });

async function recursivelyGetMaxUpdatedDate(
  dir: string,
  ignoreDirName?: string,
): Promise<Date> {
  let maxDate = new Date(0);
  for await (const entry of Deno.readDir(dir)) {
    const fullPath = path.join(dir, entry.name);
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
  Deno.exit(0);
}

async function cleanPublicDir() {
  console.log(`cleaning public dir [${publicDir}]`);
  await Deno.remove(publicDir, { recursive: true });
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
    path.join(webserverDir, "style.css"),
    "-o",
    path.join(publicDir, "output.css"),
  ], { cwd });
  console.log(`finished css build in [${Date.now() - start}]ms`);
}

await cleanPublicDir();
await Promise.all([
  buildAndWriteClientJs(),
  buildAndWriteClientCss(),
]);
console.log("");
console.log(`build completed in [${Date.now() - starttime}]ms`);
console.log("");
