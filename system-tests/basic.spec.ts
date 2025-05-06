import {expect} from "jsr:@std/expect";
import {afterAll, describe, it} from "jsr:@std/testing/bdd";
import { runCleanupTasks, startServer, getBrowserPage } from "./helpers/test_utils.ts";

afterAll(async () => {
  await runCleanupTasks();
})

describe("Browser Tests", () => {
  it("should have a sensible main heading", async () => {
    const { baseUrl } = await startServer()
    const { browserFns } = await getBrowserPage(baseUrl);

    await browserFns.visit('/');
    const heading = await browserFns.getHeading();

    expect(heading).toBe("Welcome to Vote On It!");
  });
  it("should 404 when requesting a page that doesn't exist", async () => {
    const { baseUrl } = await startServer()
    const { browserFns } = await getBrowserPage(baseUrl);

    await browserFns.visit('/nope');
    const heading = await browserFns.getHeading();

    expect(heading).toBe("You seem to be lost!");
  });
});
