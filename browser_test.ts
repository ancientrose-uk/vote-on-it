import { chromium } from "playwright";

// Check if the SHOW_BROWSER environment variable is set
const showBrowser = Deno.env.get("SHOW_BROWSER") === "true";

const browser = await chromium.launch({ headless: !showBrowser });
const page = await browser.newPage();

await page.goto("https://ancientrose.uk");
const title = await page.title();

console.log(`Page title: ${title}`);
await browser.close();
