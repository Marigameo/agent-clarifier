// Round 15 filmstrips: the multi checkbox under a slowed clock (10×), frames at real-time ms.
// Usage (from the repo root): node process/15-checkbox-motion/strip.mjs <outDir>
import { createServer } from 'vite';
import { chromium } from 'playwright-core';
import { mkdirSync } from 'node:fs';

const outDir = process.argv[2];
mkdirSync(outDir, { recursive: true });
const RATE = 0.1;
const server = await createServer({ logLevel: 'silent', server: { port: 0 } });
await server.listen();
const base = server.resolvedUrls.local[0];
const browser = await chromium.launch({ channel: 'chrome' });

async function open({ reduced = false, theme = 'light' } = {}) {
  const page = await browser.newPage({ viewport: { width: 600, height: 900 }, deviceScaleFactor: 3 });
  if (reduced) await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto(`${base}demo/?scenario=multi&vw=600&theme=${theme}`);
  await page.waitForFunction(() => document.querySelector('agent-clarifier')?.shadowRoot?.childElementCount);
  await page.waitForTimeout(400);
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Animation.enable');
  await cdp.send('Animation.setPlaybackRate', { playbackRate: RATE });
  return page;
}
const row = (page, id) => page.locator(`agent-clarifier >> [data-opt="${id}"]`).first();
async function clipOf(page, id) {
  const b = await row(page, id).locator('.key').boundingBox();
  return { x: b.x - 14, y: b.y - 14, width: 150, height: b.height + 28 };
}
async function frames(page, clip, times) {
  const out = [];
  const t0 = Date.now();
  for (const t of times) {
    const wait = t / RATE - (Date.now() - t0);
    if (wait > 0) await page.waitForTimeout(wait);
    out.push({ t, png: (await page.screenshot({ clip })).toString('base64') });
  }
  return out;
}
async function sheet(name, groups) {
  const page = await browser.newPage({ viewport: { width: 3000, height: 600 }, deviceScaleFactor: 1 });
  await page.setContent(`<body style="margin:0;padding:16px;background:#888;font:600 20px system-ui;color:#fff;display:flex;flex-direction:column;gap:14px;inline-size:max-content">
    ${groups.map((g) => `<div><div style="padding-bottom:6px">${g.title}</div><div style="display:flex;gap:10px">${g.frames.map((f) => `<figure style="margin:0"><img src="data:image/png;base64,${f.png}" style="display:block;block-size:150px"><figcaption style="padding-top:4px;font-weight:500">${f.label ?? f.t + 'ms'}</figcaption></figure>`).join('')}</div></div>`).join('')}</body>`);
  await page.locator('body').screenshot({ path: `${outDir}/${name}.png` });
  await page.close();
}

const T = [0, 20, 40, 60, 80, 100, 120, 160];
async function pointer(opts) {
  const page = await open(opts);
  const clip = await clipOf(page, 'japanese');
  const b = await row(page, 'japanese').boundingBox();
  await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2);
  await page.waitForTimeout(300);
  const rest = await frames(page, clip, [0]);
  await page.mouse.down();
  const press = await frames(page, clip, [0, 40, 80, 160]);
  await page.mouse.up();
  const tick = await frames(page, clip, T);
  await page.close();
  return [
    { title: 'Mouse: rest → held down (press)', frames: [{ ...rest[0], label: 'rest' }, ...press.map((f) => ({ ...f, label: `down +${f.t}ms` }))] },
    { title: 'Mouse: released (ticks)', frames: tick.map((f) => ({ ...f, label: `up +${f.t}ms` })) },
  ];
}
async function keyboard(opts) {
  const page = await open(opts);
  const clip = await clipOf(page, 'japanese');
  await page.keyboard.press('ArrowDown'); // Italian → Japanese
  await page.waitForTimeout(300);
  await page.keyboard.press(' ');
  const tick = await frames(page, clip, [0, 40, 80, 120]);
  await page.close();
  return [{ title: 'Keyboard: Space (must be instant)', frames: tick.map((f) => ({ ...f, label: `+${f.t}ms` })) }];
}

await sheet('light', [...(await pointer({})), ...(await keyboard({}))]);
await sheet('dark', await pointer({ theme: 'dark' }));
await sheet('reduced-motion', await pointer({ reduced: true }));
await browser.close();
await server.close();
console.log(outDir);
