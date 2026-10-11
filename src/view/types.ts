import type { LabelKey } from '../labels';
import type { ReviewMode, State } from '../model/types';

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

/** Row ids for the two rows that aren't options. */
export const OTHER = '__other';
export const DELEGATE = '__delegate';
