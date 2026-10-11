// Filmstrips of the round 9 motion: Chrome's animation clock slowed 10×, frames at real-time ms.
// Usage: node scripts/motion-strips.mjs <outDir>
// (Chrome's clock is slowed through the DevTools Protocol, so a 160ms move plays over 1.6s.)
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

async function open(query, { vw = 1280, reduced = false } = {}) {
  const page = await browser.newPage({ viewport: { width: vw, height: 900 }, deviceScaleFactor: 2 });
  if (reduced) await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto(`${base}demo/?${query}`);
  await page.waitForFunction(() => document.querySelector('agent-clarifier')?.shadowRoot?.childElementCount);
  await page.waitForTimeout(400);
  return page;
}
const slow = async (page) => {
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Animation.enable');
  await cdp.send('Animation.setPlaybackRate', { playbackRate: RATE });
};
const c = (page, css) => page.locator(`agent-clarifier >> ${css}`).first();
async function box(page, pad = 16) {
  const b = await page.locator('agent-clarifier').boundingBox();
  return { x: b.x - pad, y: b.y - pad, width: b.width + pad * 2, height: b.height + pad * 2 };
}

/** Pick on step 1 and wait for the real-time 120ms auto-advance, so frames time the animation itself. */
async function nextStep(page) {
  await c(page, '[data-opt="covent"]').click();
  await page.waitForFunction(() => document.querySelector('agent-clarifier').shadowRoot.querySelector('.title')?.textContent.includes('budget'));
}

/** Run `act`, then take a frame at each real-time ms (scaled by the slowed clock). */
async function strip(name, page, act, times, clip) {
  const frames = [];
  await act();
  const t0 = Date.now();
  for (const t of times) {
    const wait = t / RATE - (Date.now() - t0);
    if (wait > 0) await page.waitForTimeout(wait);
    frames.push({ t, png: (await page.screenshot({ clip })).toString('base64') });
  }
  await sheet(name, frames);
  await page.close();
}

async function sheet(name, frames, caption = (f) => `${f.t}ms`) {
  const page = await browser.newPage({ viewport: { width: 2400, height: 700 }, deviceScaleFactor: 1 });
  await page.setContent(`<body style="margin:0;padding:16px;background:#888;font:600 22px system-ui;display:flex;gap:12px;inline-size:max-content">
    ${frames.map((f) => `<figure style="margin:0"><img src="data:image/png;base64,${f.png}" style="display:block;max-block-size:520px"><figcaption style="color:#fff;padding-top:6px">${caption(f)}</figcaption></figure>`).join('')}</body>`);
  await page.locator('body').screenshot({ path: `${outDir}/${name}.png` });
  await page.close();
  console.log(`${outDir}/${name}.png`);
}

// 1 · toast rises in after Skip (light, desktop)
{
  const page = await open('scenario=hotel&theme=light&width=768');
  const b = await box(page);
  const clip = { ...b, y: b.y + b.height - 90, height: 90 };
  await slow(page);
  await strip('1-toast-enter-light', page, () => c(page, '[data-act="skip"]').click(), [0, 40, 80, 120, 200], clip);
}
// 2 · fold into the pill (dark, phone width)
{
  const page = await open('scenario=hotel&theme=dark&width=375', { vw: 500 });
  const st = await page.locator('.stage').boundingBox();
  const clip = { ...st, y: st.y + st.height - 520, height: 520 };
  await slow(page);
  await strip('2-fold-to-pill-dark-phone', page, () => c(page, '[data-act="minimise"]').click(), [0, 25, 50, 100, 200], clip);
}
// 3 · press feedback: Continue at rest, held down (light, zoomed)
{
  const page = await open('scenario=hotel&theme=light&width=768');
  await c(page, '[data-opt="covent"]').click();
  await page.waitForTimeout(500);
  await c(page, '[data-opt="mid"]').click();
  await page.waitForTimeout(500);
  await c(page, '[data-opt="walk"]').click();
  await page.waitForTimeout(400);
  const btn = c(page, '[data-act="next"]');
  const b = await btn.boundingBox();
  const clip = { x: b.x - 24, y: b.y - 14, width: b.width + 48, height: b.height + 28 };
  const rest = (await page.screenshot({ clip })).toString('base64');
  await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2);
  await page.mouse.down();
  await page.waitForTimeout(400);
  const held = (await page.screenshot({ clip })).toString('base64');
  await page.mouse.up();
  await sheet('3-press-continue-light', [{ t: 'at rest', png: rest }, { t: 'held (scale .97)', png: held }], (f) => f.t);
  await page.close();
}
// 4 · reduced motion: a step change crossfades, nothing slides (light)
{
  const page = await open('scenario=hotel&theme=light&width=768', { reduced: true });
  const clip = await box(page);
  await slow(page);
  await strip('4-reduced-step-crossfade-light', page, () => nextStep(page), [0, 15, 30, 60, 160], clip);
}
// 5 · normal motion, same step change, for comparison
{
  const page = await open('scenario=hotel&theme=light&width=768');
  const clip = await box(page);
  await slow(page);
  await strip('5-normal-step-slide-light', page, () => nextStep(page), [0, 15, 30, 60, 160], clip);
}

// 6 · loading shimmer: a highlight band sliding on transform (real time, one 1.4s sweep)
{
  const page = await open('scenario=stream&theme=light&width=768');
  const clip = await box(page);
  const frames = [];
  for (const t of [0, 350, 700, 1050]) {
    frames.push({ t, png: (await page.screenshot({ clip })).toString('base64') });
    await page.waitForTimeout(350);
  }
  await sheet('6-shimmer-light', frames, (f) => `+${f.t}ms`);
  await page.close();
}

await browser.close();
await server.close();
process.exit(0);
