// The *visible* screen height (BUILD §8.3). On phones the on-screen keyboard shrinks the visual
// viewport but not the layout viewport, so `vh`/`dvh` alone would let the card hide behind it.
// One listener for every instance; it writes `--_vvh` into a shared stylesheet, so nothing is
// written into the app's DOM (no inline styles on the host).

let users = 0;
let raf = 0;
let shared: CSSStyleSheet | null = null;

function write(): void {
  raf = 0;
  const h = window.visualViewport?.height;
  shared?.replaceSync(h ? `:host { --_vvh: ${Math.round(h)}px; }` : '');
}

const onResize = (): void => {
  if (!raf) raf = requestAnimationFrame(write);
};

/** The sheet each instance adopts. With no visualViewport, it stays empty and CSS falls back to 100dvh. */
export function viewportSheet(): CSSStyleSheet {
  shared ??= new CSSStyleSheet();
  return shared;
}

/** Start listening while at least one element is on the page. */
export function watchViewport(): void {
  if (users++ > 0 || !window.visualViewport) return;
  write();
  window.visualViewport.addEventListener('resize', onResize);
}

export function unwatchViewport(): void {
  if (--users > 0 || !window.visualViewport) return;
  window.visualViewport.removeEventListener('resize', onResize);
  cancelAnimationFrame(raf);
  raf = 0;
}
