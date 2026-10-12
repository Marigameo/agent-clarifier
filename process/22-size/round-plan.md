# Round 22 · Size (plan, frozen before the change)

**Date:** 12 Oct 2026
**Brief (Mari):** I want the component to feel light: nobody should think twice about installing it. Is an npm package the right way to ship it, or is there something better? What can be optimised without breaking any feature or styling? Is the current size OK for a component like this, and what's a fair benchmark? Plan first, no changes.

## Measured (Claude), before any change

Baseline at `50ce57e` (core = `dist/index.js` + the shared ids chunk, as size-limit measures it):

| | Minified | Gzip | Brotli |
|---|---|---|---|
| Core | 72.7 KB | **21.93 KB** | 19.2 KB |
| of which the CSS string | 23.0 KB | 5.1 KB | |
| of which JS | 49.8 KB | 16.2 KB | |

- **Already lean.** Zero runtime dependencies. JS is fully minified (private fields are one letter). CSS is minified (lightningcss would save 34 more bytes). No dead code, no unused selectors.
- **Where the minified JS goes:** element 13.6 KB, reducer 6.8, step view 4.7, form view 3.8, labels 3.2, normalize 2.8, endings 2.5, chrome 2.3, composer 2.2, smaller files below 1.5 each.
- **The npm package:** 115 KB packed, **380 KB unpacked**, which is what npmjs.com shows as "Unpacked Size". 245 KB of that is source maps, and 161 KB of the maps is a copy of the source (`sourcesContent`).

Peer benchmarks (measured the same way, gzip, dependencies included) are in `benchmarks.md`. In short: primitives 2–6 KB, "small and polished" 9–13 KB, mid-weight widgets 16–23 KB (cmdk, Shoelace's dialog, tom-select, vaul, choices.js), chat kits 40 KB and up. **21.9 KB sits in the mid-weight band**, and does more than any single widget there.

## Answers given

- **npm: yes.** It's the primary channel and feeds jsDelivr, unpkg and esm.sh for free. Copy-paste builds or JSR could come later; not now.
- **"Heavy" is judged from two numbers that browsers never download:** the npm page's unpacked size (inflated by maps), and the page-load cost. The card appears only when an agent asks, so an app can load it on first use: 0 KB at page load.
- **"Optional" features** (asked as a follow-up): they're optional to *use* today, but always *downloaded*. Making them optional to download means either opt-in imports (breaks zero-config) or lazy chunks fetched when the card opens (a visible delay at the worst moment, async rendering, ~3 KB saved and only for some apps). Turned down; lazy-load the whole component instead.
- **12 KB isn't reachable without cutting features.** Every safe change below adds up to ~0.6 KB.

## Audits (Claude, three parallel read-only agents, measured in throwaway copies)

**JS (the real repo untouched):**

| Change | Gzip | Note |
|---|---|---|
| Action types as numeric constants (`Act.OPEN`), inlined by Rolldown | −323 | Debugger shows numbers; 227 test lines change. All unit and component tests passed with it. |
| Minifier `treeshake.propertyReadSideEffects: false` (needs the full minify object, or whitespace removal silently turns off: +13 KB) | −28 | A bare `el.offsetWidth;` written to force a reflow would be dropped. None exists today. |
| Strip `/* @__PURE__ */` from the output | −40 | **Turned down (Claude):** the audit said they do nothing for consumers. Not so: `sideEffects` only stops a bundler dropping the whole file, it can still drop an unused `ask()`, and the annotations help it do that. |
| Drop the normalize warnings in production | −202 | Turned down: developers lose documented warnings. |
| Mangle internal state field names | −155 | Turned down: changes the public `snapshot` shape. |
| Everything else tried (helpers, tables, enums for view names, targets) | ±15 | Gzip already absorbs repetition. |

**CSS (pixel-checked: every computed style and element rect on all 34 break-page scenarios, light, dark, forced colors, reduced motion, 375px touch, 60 Tab steps, 40 hovers; 0 diffs):**

| Change | Gzip |
|---|---|
| Short private `--_*` names, at build time (source stays readable). `--_duration`, `--_ease`, `--_vvh` stay: JS reads them. | −119 |
| `css.lightningcss.exclude: Features.LightDark`: stops lightningcss adding unused light/dark toggles each time `color-scheme` is declared | −30 |
| Merge duplicate rules (option/review row inset, divider selectors, focus rings, foot rules, reduced-motion blocks…) | −92 |
| Dark tokens via `light-dark()` | turned down: −11 only, or drops Safari 16.4–17.4 natively |
| A shared transition token | +4, turned down |

**Found along the way (a bug, not size):** on touch, the "Something else" field is **14px**, so iOS zooms the page when it's focused. `.other-field textarea { font: inherit }` (specificity 0,1,1) beats round 11's `@media (pointer: coarse) { textarea { font-size: 16px } }` (0,0,1). Introduced in round 16 when the field became a textarea.

## Decided (Mari)

1. **Target: about 21 KB gzip, with a strict guard**, instead of 12 KB. Brotli reported too (what CDNs send).
2. **Packaging: go with the recommendation.** Source maps stay out of the npm package; README shows loading on first use and a pinned CDN version.
3. **Numeric action types: yes.** "Mostly I'd be coding with agents, so if it saves some, let's go with that."
4. **Fix the 14px bug.**

## Steps

1. The 14px fix, checked at 375px with touch.
2. Packaging: maps out of `files`, README snippets, `npm pack --dry-run`.
3. Build settings (lightningcss, minifier) and the CSS: build-time short names, then the merges, re-checked with the pixel dump.
4. Numeric action types.
5. Budget: size-limit guard just above the new size, a brotli line, BUILD §0 and §11, CLAUDE.md, the journal.
