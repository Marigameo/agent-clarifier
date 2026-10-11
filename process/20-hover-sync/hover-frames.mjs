// Round 20: step the mouse across the rows one frame at a time, mouse-only and after one key press.
// Usage (from the repo root): node process/20-hover-sync/hover-frames.mjs <out.png> [theme]
import { createServer } from 'vite';
import { chromium } from 'playwright-core';
const [out, theme = 'light'] = process.argv.slice(2);
const server = await createServer({ logLevel: 'silent', server: { port: 0 } }); await server.listen();
const browser = await chromium.launch({ channel: 'chrome' });
const ids = ['covent', 'southbank', 'kensington'];
async function run(keyboardFirst) {
  const page = await browser.newPage({ viewport: { width: 600, height: 900 }, deviceScaleFactor: 2 });
  await page.goto(`${server.resolvedUrls.local[0]}demo/?scenario=hotel&theme=${theme}&vw=600`);
  await page.waitForFunction(() => document.querySelector('agent-clarifier')?.shadowRoot?.childElementCount);
  await page.waitForTimeout(400);
  if (keyboardFirst) { await page.keyboard.press('ArrowDown'); await page.waitForTimeout(100); }
  const boxes = await Promise.all(ids.map((id) => page.locator(`agent-clarifier >> [data-opt="${id}"]`).boundingBox()));
  const clip = { x: boxes[0].x - 8, y: boxes[0].y - 4, width: boxes[0].width + 16, height: boxes[2].y + boxes[2].height - boxes[0].y + 8 };
  const frames = [];
  for (const b of boxes) {
    await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2);
    await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => r())));
    frames.push((await page.screenshot({ clip })).toString('base64'));
  }
  await page.close();
  return frames;
}
const rows = [['Mouse only', await run(false)], ['After one key (keyboard focus on row 2)', await run(true)]];
const page = await browser.newPage({ viewport: { width: 1500, height: 600 } });
await page.setContent(`<body style="margin:0;padding:8px;background:#888;font:600 15px system-ui;color:#fff">${rows.map(([t, f]) => `<div style="margin:6px 0">${t} · mouse on row 1, 2, 3</div><div style="display:flex;gap:8px">${f.map((p) => `<img src="data:image/png;base64,${p}" style="width:480px">`).join('')}</div>`).join('')}</body>`);
await page.screenshot({ path: out, fullPage: true });
await browser.close(); await server.close();
