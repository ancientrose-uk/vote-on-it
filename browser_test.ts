import { chromium } from "playwright";
import { expect } from "jsr:@std/expect";
import { afterAll, describe, it } from "jsr:@std/testing/bdd";

type CleanupFn = () => Promise<void>;

const cleanupFunctions: { priority: number; task: CleanupFn }[] = [];

function addCleanupTask(task: CleanupFn, priority: number = 0) {
  cleanupFunctions.push({ task, priority });
  cleanupFunctions.sort((a, b) => a.priority - b.priority);
}

async function runCleanupTasks() {
  while (cleanupFunctions.length > 0) {
    const { task } = cleanupFunctions.shift()!;
    await task();
  }
}

async function getBrowserPage() {
  const showBrowser = Deno.env.get("SHOW_BROWSER") === "true";
  const delayBeforeClosingBrowser = Number(Deno.env.get("DELAY_BEFORE_CLOSING_BROWSER") || 0);

  const browser = await chromium.launch({ headless: !showBrowser });
  const page = await browser.newPage();

  addCleanupTask(async () => {
    await sleep(delayBeforeClosingBrowser);
    await browser.close();
  });
  return { page };
}

const sleep =(ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

afterAll(async () => {
  await runCleanupTasks();
})

describe("Browser Tests", () => {
  it("should fail when the title is not as expected", async () => {
    // Check if the SHOW_BROWSER environment variable is set
    const { page } = await getBrowserPage();

    await page.goto("https://ancientrose.uk");
    const title = await page.title();

    // Expect the title to be a specific incorrect value to test failure mode
    expect(title).toBe("this is not the actual title (testing failure mode)");;

  });
});
