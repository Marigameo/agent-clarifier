// One constructable stylesheet, shared by every instance. The CSS lives in styles.css.
import css from './styles.css?inline';

let shared: CSSStyleSheet | null = null;

/** The stylesheet every instance adopts. Created on first use, never at import (SSR-safe). */
export function sheet(): CSSStyleSheet {
  if (!shared) {
    shared = new CSSStyleSheet();
    shared.replaceSync(css);
  }
  return shared;
}
