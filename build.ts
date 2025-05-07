import { bundle } from "jsr:@deno/emit";

const pathSeperator = "/";
const dirname =
  new URL(import.meta.url).pathname.split(pathSeperator).slice(0, -1).join(
    pathSeperator,
  ) + pathSeperator;

async function buildAndWriteClientJs() {
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
}

async function buildAndWriteClientCss() {
  const cwd = dirname + pathSeperator + "web-server";
  console.log("starting css build", { cwd });
  const args = [
    "tailwindcss@3",
    "-i",
    "./style.css",
    "-o",
    "./public/output.css",
  ];
  console.log("running:");
  console.log("npx", args.join(" "));
  const process = new Deno.Command("npx", {
    cwd,
    args,
    stdout: "inherit",
    stderr: "inherit",
  });

  const { code } = await process.output();
  if (code !== 0) {
    throw new Error("Tailwind build failed");
  }
  console.log("finished css build");
}

await Promise.all([
  buildAndWriteClientJs(),
  buildAndWriteClientCss(),
]);
