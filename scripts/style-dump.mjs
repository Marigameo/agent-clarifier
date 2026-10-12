// Proves a CSS change is invisible: dumps every computed style and element box of the component on
// demo/break.html (34 scenarios) in light, dark, forced colors, reduced motion and 375px touch, plus 60 Tab
// steps, 6 arrow steps and 40 hovers; then diffs two dumps (round 22, DESIGN §18).
// Usage: node scripts/style-dump.mjs dump before.json   (make the change)   node scripts/style-dump.mjs dump after.json
//        node scripts/style-dump.mjs diff before.json after.json   → "total diffs 0" means pixel-identical.
// Inject a 1px change once to see the diff isn't blind (round 22: 336 diffs).
import { createServer } from 'vite';
import { chromium } from 'playwright-core';
import fs from 'node:fs';
const [mode, out, other] = process.argv.slice(2);
if (mode === 'diff') {
  diffDumps(out, other);
  process.exit(0);
}
const server = await createServer({ logLevel: 'silent', server: { port: 0 } });
await server.listen();
const base = server.resolvedUrls.local[0];
const browser = await chromium.launch({ channel: 'chrome' });

const collect = (onlyActive) => {
  const res = [];
  const hosts = [...document.querySelectorAll('agent-clarifier')];
  hosts.forEach((host, hi) => {
    const root = host.shadowRoot;
    if (!root) return;
    if (onlyActive === 1 && !root.activeElement) return;
    if (onlyActive === 2 && !host.matches(':hover')) return;
    const all = [host, ...root.querySelectorAll('*')];
    const hr = host.getBoundingClientRect();
    all.forEach((el, ei) => {
      for (const pseudo of [null, '::before', '::after']) {
        const cs = getComputedStyle(el, pseudo);
        if (pseudo && (cs.content === 'none' || cs.content === 'normal')) continue;
        const o = {};
        const anim = el.matches?.('.spin') || (pseudo === '::after' && el.matches?.('.sk'));
        for (let i = 0; i < cs.length; i++) { const p = cs[i]; if (anim && p === 'transform') continue; if (p.startsWith('--') || p === 'transition-property' && false) continue; o[p] = cs.getPropertyValue(p); }
        const r = el.getBoundingClientRect();
        o.rect_box = [r.x - hr.x, r.y - hr.y, r.width, r.height].map((v) => Math.round(v * 100) / 100).join(',');
        res.push([`${hi}/${ei}/${el.tagName}.${el.getAttribute?.('class') ?? ''}${pseudo ?? ''}`, o]);
      }
    });
  });
  return res;
};

const result = {};
const modes = {
  light: { colorScheme: 'light' },
  dark: { colorScheme: 'dark' },
  forced: { colorScheme: 'light', forcedColors: 'active' },
  reduced: { colorScheme: 'light', reducedMotion: 'reduce' },
};
for (const [name, emu] of Object.entries(modes)) {
  for (const [vw, touch] of [[1280, false], [375, true]]) {
    if (name !== 'light' && vw === 375) continue;
    const page = await browser.newPage({ viewport: { width: vw, height: 900 }, hasTouch: touch, isMobile: touch });
    await page.emulateMedia(emu);
    await page.goto(`${base}demo/break.html`);
    await page.waitForTimeout(1500);
    result[`${name}@${vw}`] = await page.evaluate(collect, false);
    if (vw === 1280 && (name === 'light' || name === 'forced')) {
      // keyboard focus pass: Tab through, dumping the focused component each time
      for (let t = 0; t < 60; t++) {
        await page.keyboard.press('Tab');
        await page.waitForTimeout(30);
        result[`${name}@tab${t}`] = await page.evaluate(collect, 1);
      }
      // a few arrow presses (roving focus inside a radio group)
      for (let t = 0; t < 6; t++) {
        await page.keyboard.press('ArrowDown');
        await page.waitForTimeout(30);
        result[`${name}@arrow${t}`] = await page.evaluate(collect, 1);
      }
      // hover pass on option rows, chips, buttons in the first components
      const targets = await page.locator('agent-clarifier >> .opt, agent-clarifier >> .chip, agent-clarifier >> .btn, agent-clarifier >> button.dot').all();
      for (let i = 0; i < Math.min(targets.length, 40); i++) {
        try { await targets[i].hover({ timeout: 500 }); } catch { continue; }
        await page.waitForTimeout(20);
        result[`${name}@hover${i}`] = await page.evaluate(collect, 2);
      }
    }
    await page.close();
  }
}
fs.writeFileSync(out, JSON.stringify(result));
await browser.close();
await server.close();
console.log('wrote', out, Object.keys(result).length, 'snapshots');

function diffDumps(fa, fb) {
  const [a, b] = [fa, fb].map((f) => JSON.parse(fs.readFileSync(f, 'utf8')));
  let diffs = 0; const seen = new Map();
  for (const snap of Object.keys(a)) {
    if (!b[snap]) { console.log('missing snap', snap); continue; }
    const A = a[snap], B = b[snap];
    if (A.length !== B.length) console.log(snap, 'element count', A.length, B.length);
    for (let i = 0; i < Math.min(A.length, B.length); i++) {
      const [ka, oa] = A[i], [kb, ob] = B[i];
      if (ka !== kb) { console.log(snap, 'key', ka, kb); continue; }
      for (const p of new Set([...Object.keys(oa), ...Object.keys(ob)])) {
        if (p === 'rect_box' && (oa[p].endsWith(',0,0') && ob[p].endsWith(',0,0') || /spin/.test(ka))) continue;
        if (oa[p] !== ob[p]) { diffs++; const k = ka.replace(/^\d+\/\d+\//, '') + ' ' + p; const v = `${oa[p]} -> ${ob[p]}`; if (!seen.has(k)) seen.set(k, [snap, v, 0]); seen.get(k)[2]++; }
      }
    }
  }
  for (const [k, [snap, v, n]] of seen) console.log(n, snap, k, v.slice(0, 160));
  console.log('total diffs', diffs, 'snapshots', Object.keys(a).length);
}
