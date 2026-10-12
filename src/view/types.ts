import type { LabelKey } from '../labels.js';
import type { ReviewMode, State } from '../model/types.js';

/** What every view gets on build and on each update. */
export interface Ctx {
  s: State;
  review: ReviewMode;
  /** A label in the page's language, with values filled in. */
  t: (key: LabelKey, vars?: Record<string, string | number>) => string;
  /** Answers joined the local way. */
  list: (items: string[]) => string;
  /** A number written the local way. */
  num: (n: number) => string;
}

/** A view builds its DOM once, then `update` only changes what moved, so focus and typing survive. */
export interface View {
  el: HTMLElement;
  update: (ctx: Ctx) => void;
}

export { DELEGATE, OTHER } from '../model/normalize.js';
