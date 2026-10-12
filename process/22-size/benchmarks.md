# Size benchmarks (measured 12 Oct 2026)

**Method.** `npm pack <pkg>@latest`, installed with `--ignore-scripts` in a separate folder (nothing downloaded was executed). Each entry bundled with this repo's Vite 8 / Rolldown (`minify: true`, es2022), runtime dependencies included, React peers left out, whole namespace kept. gzip -9 and brotli q11 with Node's zlib. Figures in KiB. Cross-check: agent-clarifier through the same script gives 71.5 / 21.4 / 19.0, matching its own build.

"+CSS gz" is a stylesheet the package needs you to load separately (sonner, react-hot-toast and vaul inject theirs from JS, so it's in the JS figure).

| Package | Ver | Measured | Min | Gzip | Brotli | +CSS gz | Runtime deps | npm unpacked |
|---|---|---|---|---|---|---|---|---|
| **Small web components** |
| @github/details-dialog-element | 3.1.4 | bundled entry | 4.3 | 1.5 | 1.3 | – | none | 19.5 KB |
| @github/include-fragment-element | 6.4.1 | bundled entry | 4.6 | 1.9 | 1.6 | – | none | 33.5 KB |
| @github/relative-time-element | 5.3.1 | bundled entry | 19.7 | 6.0 | 5.4 | – | none | 137 KB |
| emoji-picker-element (JS only) | 1.29.1 | bundled `picker.js` | 38.0 | 13.3 | 11.9 | – | none | 437 KB |
| @lit/reactive-element | 2.1.2 | bundled | 7.5 | 2.9 | 2.6 | – | incl. | 865 KB |
| lit (full base) | 3.3.3 | bundled | 15.3 | 5.9 | 5.3 | – | incl. | 106 KB |
| Shoelace `sl-dialog` alone | 2.20.1 | component + Lit | 51.2 | 17.1 | 15.0 | 4.1 | incl. | 8.35 MB |
| **Interactive UI libraries** |
| a11y-dialog | 8.1.5 | bundled | 4.8 | 1.8 | 1.6 | – | incl. | 88 KB |
| micromodal | 0.7.0 | `micromodal.min.js` | 8.8 | 3.0 | 2.6 | – | none | 32.5 KB |
| canvas-confetti | 1.9.4 | bundled | 10.5 | 4.2 | 3.8 | – | none | 92 KB |
| react-hot-toast | 2.6.1 | bundled | 11.5 | 4.7 | 4.2 | in JS | incl. | 199 KB |
| driver.js | 1.9.0 | bundled | 25.7 | 7.4 | 6.6 | 0.9 | none | 159 KB |
| @floating-ui/dom | 1.8.0 | bundled | 20.9 | 8.1 | 7.3 | – | incl. | 174 KB |
| sonner | 2.0.8 | bundled | 33.7 | 9.3 | 8.2 | in JS | none | 174 KB |
| shepherd.js | 15.3.0 | bundled | 43.8 | 15.0 | 13.6 | 1.0 | incl. | 814 KB |
| cmdk | 1.1.1 | bundled | 49.8 | 16.4 | 14.8 | unstyled | incl. | 82 KB |
| tom-select | 2.6.2 | bundled "complete" | 53.6 | 17.6 | 15.5 | 2.0 | incl. | 3.55 MB |
| vaul | 1.1.2 | bundled | 67.9 | 20.6 | 18.6 | in JS | incl. | 184 KB |
| choices.js | 11.2.4 | bundled | 76.4 | 20.7 | 18.3 | 2.3 | incl. | 2.00 MB |
| **Chat / AI UI** |
| @chatscope/chat-ui-kit-react | 2.1.1 | 5 basic components | 158.6 | 39.0 | 32.7 | 6.1 | incl. | 719 KB |
| deep-chat (web component) | 2.5.1 | prebuilt bundle | 377.9 | 104.9 | 87.2 | in JS | incl. | 6.88 MB |
| @copilotkit/react-ui | 1.78.0 | first-load chunks (approx.) | 2,657 | 805 | 663 | 7.1 | incl. | 1.57 MB |
| **Upper bounds** |
| @formkit/core (core only) | 2.1.2 | bundled | 28.6 | 10.3 | 9.5 | – | incl. | 1.07 MB |
| survey-core (model only, no renderer) | 3.2.0 | `survey.core.min.js` | 1,469 | 325 | 251 | 47.9 | none | 57.3 MB |
| React 19 (react + react-dom/client) | 19 | bundled | 213.9 | 65.8 | 56.7 | – | – | – |

React libraries (sonner, cmdk, vaul, react-hot-toast, chatscope, CopilotKit) also need React's ~66 KB gzip.

**Unpacked vs install size** (from knowledge, not measured): npmjs.com's "Unpacked Size" is every file in the tarball (maps, types, docs), without dependencies. packagephobia's "install size" adds every transitive dependency. Neither is what a browser downloads (survey-core: 57 MB unpacked, 325 KB gzip loaded).
