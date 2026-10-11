// Usage (from the repo root): node process/16-skill-recheck/stress-shot.mjs <out.png> [forced]
import { createServer } from 'vite';
import { chromium } from 'playwright-core';
const [out, forced] = process.argv.slice(2);
const server = await createServer({ logLevel: 'silent', server: { port: 0 } }); await server.listen();
const browser = await chromium.launch({ channel: 'chrome' });
const page = await browser.newPage({ viewport: { width: 1300, height: 900 }, deviceScaleFactor: 2 });
if (forced) await page.emulateMedia({ forcedColors: 'active' });
await page.goto(`${server.resolvedUrls.local[0]}process/16-skill-recheck/stress.html`);
await page.waitForSelector('body[data-ready]'); await page.waitForTimeout(500);
await page.screenshot({ path: out, fullPage: true });
await browser.close(); await server.close();
