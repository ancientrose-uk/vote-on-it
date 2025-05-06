import { bundle } from "jsr:@deno/emit";

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
