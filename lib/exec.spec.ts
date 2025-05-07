import { expect } from "jsr:@std/expect";
import { describe, it } from "jsr:@std/testing/bdd";
const { execAndWait, execAndWaitOrThrow } = await import("./exec.ts");

describe("execAndWait", () => {
  it("should show echo to stdout", async () => {
    const { success, code } = await execAndWait("echo", [
      "hello",
    ], { hideStdErr: true, hideStdOut: true });
    expect(success).toBe(true);
    expect(code).toBe(0);
  });
  it("should work with js command", async () => {
    const { success, code } = await execAndWait(
      "./lib/test-fixtures/exec/stdout.js",
      [],
      { hideStdErr: true, hideStdOut: true },
    );
    expect(success).toBe(true);
    expect(code).toBe(0);
  });
  it("should collect from js command", async () => {
    const { success, code } = await execAndWait(
      "./lib/test-fixtures/exec/stderr.js",
      [],
      { hideStdErr: true, hideStdOut: true },
    );
    expect(success).toBe(false);
    expect(code).toBe(30);
  });
  it("should return stdout from failed which", async () => {
    const { success, code } = await execAndWait("which", [
      "lskdfjlfkjewoihfewj",
    ], { hideStdErr: true, hideStdOut: true });
    expect(success).toBe(false);
    expect(code).toBe(1);
  });
});
describe("execAndWaitOrThrow", () => {
  it("should show echo to stdout", async () => {
    const { success, code } = await execAndWaitOrThrow("echo", [
      "hello",
    ], { hideStdErr: true, hideStdOut: true });
    expect(success).toBe(true);
    expect(code).toBe(0);
  });
  it("should collect from js command", async () => {
    const { success, code } = await execAndWaitOrThrow(
      "./lib/test-fixtures/exec/stdout.js",
      [],
      { hideStdErr: true, hideStdOut: true },
    );
    expect(success).toBe(true);
    expect(code).toBe(0);
  });
  it("should throw from js command", async () => {
    let errorCaught;
    await execAndWaitOrThrow("./lib/test-fixtures/exec/stderr.js", [], {
      hideStdErr: true,
      hideStdOut: true,
    }).catch(
      (e) => {
        errorCaught = e;
      },
    );
    expect(errorCaught).toEqual(
      new Error(
        "Command [./lib/test-fixtures/exec/stderr.js] failed with code [30]",
      ),
    );
  });
  it("should throw from failed which", async () => {
    let errorCaught;
    await execAndWaitOrThrow("which", ["lskdfjlfkjewoihfewj"], {
      hideStdErr: true,
      hideStdOut: true,
    }).catch((e) => {
      errorCaught = e;
    });
    expect(errorCaught).toEqual(
      new Error("Command [which lskdfjlfkjewoihfewj] failed with code [1]"),
    );
  });
});
