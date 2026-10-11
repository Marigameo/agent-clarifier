// Round 18: playground scenarios scrolled 200px inside the card. node process/18-sticky-header/scrolled.mjs <outDir>
import { createServer } from 'vite';
import { chromium } from 'playwright-core';
const out = process.argv[2];
const server = await createServer({ logLevel: 'silent', server: { port: 0 } }); await server.listen();
const browser = await chromium.launch({ channel: 'chrome' });
for (const [name, q, vw, vh] of [['long-light', 'scenario=long&theme=light', 1280, 1100], ['long-dark', 'scenario=long&theme=dark', 1280, 1100], ['all-light', 'scenario=all&theme=light', 500, 900], ['long-phone', 'scenario=long&theme=light', 375, 812]]) {
  const page = await browser.newPage({ viewport: { width: vw, height: vh }, deviceScaleFactor: 2 });
  await page.goto(`${server.resolvedUrls.local[0]}demo/?${q}&vw=${vw}`);
  await page.waitForFunction(() => document.querySelector('agent-clarifier')?.shadowRoot?.childElementCount);
  await page.waitForTimeout(400);
  await page.evaluate(() => { document.querySelector('agent-clarifier').shadowRoot.querySelector('.scroll').scrollTop = 200; });
  await page.waitForTimeout(300);
  const b = await page.locator('agent-clarifier').boundingBox();
  await page.screenshot({ path: `${out}/${name}.png`, clip: { x: b.x - 8, y: Math.max(0, b.y - 8), width: b.width + 16, height: Math.min(360, b.height + 16) } });
  await page.close();
}
await browser.close(); await server.close();
