import { chromium } from "playwright";

const browser = await chromium.launch();
const page = await browser.newPage();

await page.goto("https://ancientrose.uk");
const title = await page.title();

console.log(`Page title: ${title}`);
await browser.close();
