# Round 23 · Pre-release code review (frozen before fixes)

12 Oct 2026, at `3ac7d4b`. Scope: everything that ships (`src/`, `types/jsx.d.ts`, `package.json`, the built tarball).
Four parallel read-only reviewers (model + converters; element, composer, `ask()`; view layer; styles + packaging),
each finding reproduced (throwaway Vitest/Playwright probes, a scratch consumer project installing the packed tarball)
or traced end to end, then spot-checked by the lead reviewer. No P0. No XSS sinks anywhere.

Priority: P1 = users will hit it, P2 = minor/edge, P3 = suggestion.

## P1

| # | Finding | Where | Scenario |
|---|---|---|---|
| 1 | Types silently become `any` under `moduleResolution: node16/nodenext` | every `dist/**/*.d.ts` (extensionless relative imports) | With `skipLibCheck`, `Questionnaire`, `el.state`, event details and JSX props are `any`; without it, 7 TS2834 errors |
| 2 | `import '@marigameo/agent-clarifier/jsx'` (as the README says) breaks the build | `package.json` `./jsx` has only `types` | Vite 8: `"./jsx" is not exported under the conditions …` |
| 3 | A multi question can exceed `max` through "Something else" | `reducer.ts` `OTHER_INPUT`; `isInvalid` checks only `min` | `max: 2`: open Something else (empty), tick A, B, type "zzz" → sends 3 labels |
| 4 | `ask()` never settles when the questionnaire is unusable | `ask.ts` `DONE` lacks `clarify:error` | LLM sends `questions: []` → `await ask()` hangs; the next `ask()` on that element resolves the old promise |
| 5 | Composer writes bypass React's value tracker | `composer.ts` `set value` | React controlled textarea: the sent reply reappears on the next re-render; a compose sentence isn't in React state |
| 6 | Properties set before the element is defined are lost | `element.ts` (no upgrade-property step) | README's load-on-first-use recipe: `el.questionnaire = q` before the code arrives → card stays hidden |
| 7 | With `ask()` + `transcript`, focus drops to `<body>` after Send/Skip | `ask.ts` moves the focused element; reconnect sees no focus | The README's Claude/MCP recipe |
| 8 | Focus drops to `<body>` after Undo on the send countdown | `chrome.ts` `footLeft` replaces the focused button; no view swap → no focus restore | `undo-window`, Send, Tab to Undo, Enter |
| 9 | Safari + Japanese/Chinese IME: the Enter that confirms a conversion also advances | `element.ts` key guard checks only `isComposing` | WebKit sends that keydown with `isComposing: false`, `keyCode: 229` |

## P2

| # | Finding | Where |
|---|---|---|
| 10 | Replace mode: a card opened before it's connected never gets focus (React/Vue path) | `element.ts` `#focusView` clears `#wantFocus` while detached |
| 11 | Ctrl+Z while a progress dash has focus drops focus | `step.ts` rebuilds the dashes on every update |
| 12 | The pill goes stale while streaming continues behind it (text + `aria-label`) | `endings.ts` `pillView.update` is a no-op |
| 13 | A repeated pick-limit notice can stay invisible (old node kept at opacity 0 by `fill: forwards`) | `chrome.ts` early return + `motion.ts` |
| 14 | All-at-once "Something else" is an `<input>`, not the growing `<textarea>` of BUILD §8.2 (round 16 fixed only the step view) | `form.ts` |
| 15 | A progress dash can jump forward past a question the user never saw (optional → sent as skipped unseen; required → error on a hidden step) | `reducer.ts` `GOTO` checks only the target |
| 16 | A final stream with no valid questions leaves "Writing questions…" forever | `reducer.ts` STREAM + `element.ts` `open` |
| 17 | MCP: a blank `description`/`title` drops the question (`??` instead of `\|\|`) | `mcp.ts` |
| 18 | MCP: `toElicitation` can `accept` content that breaks the schema (integer "3.7" → 3; fewer than `minItems`) | `mcp.ts` |
| 19 | MCP: required check uses `in` (inherited keys like `toString` count as present) | `mcp.ts` |
| 20 | MCP enums with more than 9 values lose their extra choices, with no free-text way round | `normalize.ts` cap + `mcp.ts` `other: false` |
| 21 | Option ids `__other` / `__delegate` aren't reserved; a click on such an option acts as "Something else" | `normalize.ts` |
| 22 | Compose into a `contenteditable` composer flattens rich content and puts the caret before the sentence (BUILD §7 says insert a text node, caret after) | `composer.ts` |
| 23 | `open()` mid-flow is silently ignored; `ask()` reusing a card the user reopened ("Edit answers") never shows or settles; `clarify:revise` after `ask()` isn't documented | `reducer.ts` OPEN, `ask.ts`, README |
| 24 | Shipped JS ends in `//# sourceMappingURL=…map` but maps aren't shipped (DevTools / bundler warnings) | `vite.config.ts` `sourcemap: true` |
| 25 | `VERSION` is hard-coded `'0.0.0'` (and a test asserts the literal) | `index.ts`, `tests/unit/smoke.test.ts` |
| 26 | No `prepublishOnly`: `npm publish` ships whatever is in `dist/` | `package.json` |
| 27 | README links to `DESIGN.md`/`JOURNAL.md` are relative; dead on npmjs.com | `README.md` |
| 28 | `--clarify-accent-soft` is documented as the record tick's halo; the CSS uses it only for the pill dot | README, `DESIGN.md:50`, stale CSS comment |

## P3

| # | Finding | Where |
|---|---|---|
| 29 | A question id `__proto__` disappears from the result (re-prototypes the answers object) | `selectors.ts`, `reducer.ts` |
| 30 | `fromClaude`/`fromElicitation` throw on malformed input (missing `questions`/`options`/`properties`) | `claude.ts`, `mcp.ts` |
| 31 | `format()` crashes on a non-string plural form in a label override | `labels.ts` |
| 32 | `Answer.values` doc says "Option ids"; text questions put the text there (ships in `.d.ts`) | `types.ts` |
| 33 | Holding Enter/Space/a digit races through steps (`e.repeat` not ignored) | `element.ts` |
| 34 | Countdown interval: doubles on quick Undo + re-Send; runs forever if a prevented submit is never resolved | `element.ts` |
| 35 | The live region is removed and re-inserted on every view swap (screen readers can miss announcements) | `element.ts` `replaceChildren(view, live)` |
| 36 | An old record's re-render or disconnect strips `data-clarifier-docked` from the live docked card | `composer.ts` `dock(false)` |
| 37 | Restoring a composer that had no placeholder leaves `placeholder=""` | `composer.ts` |
| 38 | The composer is resolved once; an invalid selector throws from `connectedCallback` | `element.ts`, `composer.ts` |
| 39 | In jsdom (apps' unit tests) creating the element throws (no `ResizeObserver`, no constructable sheets) | `element.ts` |
| 40 | BUILD §6.1 lists `density`/`theme` properties; only the attributes exist (README matches code) | `BUILD.md` |
| 41 | README hero snippet uses an unpinned CDN URL while a later section says to pin | `README.md` |
| 42 | `types/jsx.d.ts` augments React only; no Vue/Preact typings | `types/jsx.d.ts` |
| 43 | No `"./package.json"` export | `package.json` |
| 44 | Firefox has no `field-sizing: content`, so "Something else" may not grow there; needs a manual check | `styles.css` |

## Checked and fine

XSS (no `innerHTML`-family sinks; all LLM text via `textContent`/`setAttribute`) · SSR import of all three entries in Node 22 ·
double `define` guarded · capture-phase submit beats React's delegated `onSubmit` · composer hide/show restored exactly ·
shared viewport listener ref-counted · each event fires once, details match README and typings · all BUILD §3.1 normalise
rules and §4.2 transitions · undo history (one stack, cap 50) · result rules · `fromClaude`/`toClaude` round trip ·
ids unique per shadow root · `aria-checked`/`aria-pressed` re-synced · roving tabindex · number keys blocked in fields ·
RTL arrows mirrored · reduced motion · fields never overwritten while focused · tarball: 32 files, 43.3 kB packed,
132.5 kB unpacked, no maps/tests/demo/process · every `exports` target exists · all 24 `--clarify-*` tokens read under
the documented names · no physical `left`/`right` · every CSS selector matches markup · forced-colors focus coverage.
