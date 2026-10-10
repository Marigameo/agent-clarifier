// Every user-visible string, in one place (BUILD §9), plus how a label becomes text:
// plural forms picked with Intl.PluralRules and numbers written with Intl.NumberFormat,
// both built into the browser, so other languages cost no dependency.

/** A label with plural forms. `other` is required; any language's forms are accepted. */
export type PluralForms = Partial<Record<Intl.LDMLPluralRule, string>> & { other: string };
export type Label = string | PluralForms;

/** Every user-visible string. Override any of them through the element's `labels` property. */
export interface Labels {
  // Rows and buttons
  somethingElse: Label;
  decideForMe: Label;
  delegated: Label;
  clearsPicks: Label;
  skip: Label;
  skipAll: Label;
  continue: Label;
  keepAndNext: Label;
  review: Label;
  send: Label;
  sendAnswers: Label;
  startOver: Label;
  edit: Label;
  editLabel: Label;
  answer: Label;
  back: Label;
  minimise: Label;
  reopen: Label;
  undo: Label;
  tryAgain: Label;
  recommended: Label;
  writeIt: Label;
  skipped: Label;

  // Counts and hints
  upTo: Label;
  stepOf: Label;
  answeredOf: Label;
  pickedOf: Label;
  pickOne: Label;
  checkAnswers: Label;
  yourPick: Label;
  sendingIn: Label;
  writing: Label;

  // Toasts
  skippedToast: Label;
  clearedToast: Label;

  // Composer, pill and records
  composerPlaceholder: Label;
  pillLabel: Label;
  youAnswered: Label;
  editAnswers: Label;
  skippedRecord: Label;
  answerNow: Label;
  replied: Label;
  picksKept: Label;
  answerQuestions: Label;
  expiredRecord: Label;
  sendFailed: Label;

  // Live region (BUILD §5.4): read aloud by screen readers
  liveStep: Label;
  liveSkipped: Label;
  liveCleared: Label;
  liveLimit: Label;
  liveDelegated: Label;
  liveReview: Label;
  liveSent: Label;
  liveMinimised: Label;
  liveFailed: Label;
}

export type LabelKey = keyof Labels;

export const DEFAULT_LABELS: Labels = {
  // Rows and buttons
  somethingElse: 'Something else',
  decideForMe: 'Decide for me',
  delegated: 'Left to the agent', // working copy, still to settle
  clearsPicks: 'Clears your other picks',
  skip: 'Skip',
  skipAll: 'Skip all',
  continue: 'Continue',
  keepAndNext: 'Keep & next',
  review: 'Review',
  send: 'Send',
  sendAnswers: 'Send answers',
  startOver: 'Start over',
  edit: 'Edit',
  editLabel: 'Edit {label}',
  answer: 'Answer',
  back: 'Back',
  minimise: 'Minimise',
  reopen: 'Reopen',
  undo: 'Undo',
  tryAgain: 'Try again',
  recommended: 'Recommended',
  writeIt: 'write it ↗',
  skipped: 'Skipped',

  // Counts and hints
  upTo: 'Up to {max}',
  stepOf: '{n} of {total}',
  answeredOf: '{n} of {total} answered',
  pickedOf: '{n} of {total} picked',
  pickOne: 'Pick one to continue',
  checkAnswers: 'Check your answers',
  yourPick: 'Your pick',
  sendingIn: 'Sending in {s}s',
  writing: 'Writing questions…',

  // Toasts
  skippedToast: 'Skipped “{label}”',
  clearedToast: 'Answers cleared',

  // Composer, pill and records
  composerPlaceholder: 'Or reply in your own words…',
  pillLabel: '{n} of {total} answered. Reopen questions',
  youAnswered: 'You answered {n} of {total}',
  editAnswers: 'Edit answers',
  skippedRecord: 'Skipped. The agent used its own judgement.',
  answerNow: 'Answer now',
  replied: 'Replied in your own words',
  picksKept: { one: '{n} pick kept', other: '{n} picks kept' },
  answerQuestions: 'Answer the questions',
  expiredRecord: 'Not answered. The agent continued without these.',
  sendFailed: 'Couldn’t send your answers',

  // Live region (BUILD §5.4): read aloud by screen readers
  liveStep: 'Question {n} of {total}: {prompt}',
  liveSkipped: 'Skipped {label}. Undo available.',
  liveCleared: 'Answers cleared. Undo available.',
  liveLimit: { one: 'Up to {max} choice.', other: 'Up to {max} choices.' },
  liveDelegated: '{label}: left to the agent.',
  liveReview: 'Review your answers.',
  liveSent: 'Answers sent.',
  liveMinimised: 'Questions minimised. Type a message to reply in your own words.',
  liveFailed: 'Couldn’t send your answers.',
};

const isLabel = (v: unknown): v is Label =>
  typeof v === 'string' ||
  (typeof v === 'object' && v !== null && typeof (v as { other?: unknown }).other === 'string');

/** Defaults with the app's overrides on top. Overrides that aren't a valid label are ignored. */
export function mergeLabels(overrides?: Partial<Record<LabelKey, unknown>>): Labels {
  const labels: Labels = { ...DEFAULT_LABELS };
  for (const key of Object.keys(overrides ?? {}) as LabelKey[]) {
    const v = overrides?.[key];
    if (key in DEFAULT_LABELS && isLabel(v)) labels[key] = v;
  }
  return labels;
}

// Intl objects are slow to create, so keep one per language.
const plurals = new Map<string, Intl.PluralRules>();
const numbers = new Map<string, Intl.NumberFormat>();

/** A usable language tag: malformed ones (like "en_US") fall back to English instead of throwing. */
function safeLang(lang: string): string {
  try {
    return Intl.getCanonicalLocales(lang)[0] ?? 'en';
  } catch {
    return 'en';
  }
}

function intl(lang: string): { plural: Intl.PluralRules; number: Intl.NumberFormat } {
  let plural = plurals.get(lang);
  let number = numbers.get(lang);
  if (!plural || !number) {
    const tag = safeLang(lang);
    plural = new Intl.PluralRules(tag);
    number = new Intl.NumberFormat(tag);
    plurals.set(lang, plural);
    numbers.set(lang, number);
  }
  return { plural, number };
}

/**
 * Turn a label into text.
 * - Plural forms: **the first number in `vars`** picks the form, so pass the counted value first
 *   (`{ n, total }` counts `n`; `{ max }` counts `max`). A missing form falls back to `other`.
 * - `{name}` is replaced by `vars.name`. Numbers are written the local way ("٢" on Arabic pages).
 *   A placeholder with no value is left as it is, so a typo shows up instead of vanishing.
 */
export function format(label: Label, vars: Record<string, string | number> = {}, lang = 'en'): string {
  const { plural, number } = intl(lang);
  let template: string;
  if (typeof label === 'string') template = label;
  else {
    const count = Object.values(vars).find((v): v is number => typeof v === 'number');
    template = (count === undefined ? undefined : label[plural.select(count)]) ?? label.other;
  }
  return template.replace(/\{(\w+)\}/g, (match, name: string) => {
    const v = vars[name];
    return v === undefined ? match : typeof v === 'number' ? number.format(v) : v;
  });
}
