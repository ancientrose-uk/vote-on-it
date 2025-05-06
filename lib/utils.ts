export const verboseLog = Deno.env.get("VOI__VERBOSE") === "true"
  ? console.log
  : () => {};
