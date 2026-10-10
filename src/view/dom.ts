// A tiny element builder and the inline icons. No framework: views build DOM once and then
// update it in place, so focus, text selection and IME input survive re-renders (BUILD §4.3).

type Child = Node | string | null | undefined | false;
type Props = Record<string, string | number | boolean | null | undefined>;

/** h('button', { class: 'btn', 'data-act': 'next' }, 'Continue') */
export function h<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  props: Props = {},
  ...children: (Child | Child[])[]
): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(props)) {
    if (v === null || v === undefined || v === false) continue;
    el.setAttribute(k === 'className' ? 'class' : k, v === true ? '' : String(v));
  }
  for (const c of children.flat()) if (c !== null && c !== undefined && c !== false) el.append(c);
  return el;
}

/** Set or remove an attribute, and only touch the DOM when the value changes. */
export function attr(el: Element, name: string, value: string | boolean | null): void {
  if (value === false || value === null) {
    if (el.hasAttribute(name)) el.removeAttribute(name);
  } else {
    const v = value === true ? '' : value;
    if (el.getAttribute(name) !== v) el.setAttribute(name, v);
  }
}

export function text(el: Element, value: string): void {
  if (el.textContent !== value) el.textContent = value;
}

// 16×16 strokes, drawn with currentColor so they follow the text colour in every theme.
const PATHS = {
  back: 'M10 3.5 5.5 8l4.5 4.5',
  arrow: 'M3 8h10M9 4l4 4-4 4',
  check: 'M3.5 8.5l3 3 6-7',
  pencil: 'M10.5 2.5l3 3L6 13l-3.5.5L3 10z',
  minimise: 'M4 6l4 4 4-4',
  undo: 'M5 4 2.5 6.5 5 9M3 6.5h6.5a3.5 3.5 0 0 1 0 7H7',
  alert: 'M8 1.75a6.25 6.25 0 1 0 0 12.5 6.25 6.25 0 0 0 0-12.5zM8 4.8v3.8M8 10.9v.1',
  // "Decide for me": a hand-off arrow. Placeholder until the icon is settled in review.
  delegate: 'M2.5 8h7M7 4.5 10.5 8 7 11.5M13.5 3.5v9',
} as const;

export type IconName = keyof typeof PATHS;

export function icon(name: IconName, cls = ''): SVGSVGElement {
  const ns = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(ns, 'svg');
  svg.setAttribute('viewBox', '0 0 16 16');
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('class', `i ${cls}`.trim());
  const path = document.createElementNS(ns, 'path');
  path.setAttribute('d', PATHS[name]);
  svg.append(path);
  return svg;
}
