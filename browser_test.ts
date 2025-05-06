import {expect} from "jsr:@std/expect";
import {afterAll, describe, it} from "jsr:@std/testing/bdd";
import { runCleanupTasks, startServer, getBrowserPage } from "./test_utils.ts";

afterAll(async () => {
  await runCleanupTasks();
})

describe("Browser Tests", () => {
  it("should fail when the heading is not as expected", async () => {
    // Check if the SHOW_BROWSER environment variable is set
    const { baseUrl } = await startServer()
    const { page } = await getBrowserPage();

    await page.goto(baseUrl);
    const heading = await page.getByRole('heading', {level: 1}).textContent();

    // Expect the title to be a specific incorrect value to test failure mode
    expect(heading).toBe("Welcome to Vote On It!");
  });
});
