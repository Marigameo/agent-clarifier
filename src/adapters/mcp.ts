// MCP elicitation (elicitation/create, form mode) ↔ the native format (BUILD §6.5).
// Checked against the MCP spec 2026-07-28 (and 2025-11-25):
//   params: { mode?: 'form', message, requestedSchema: { type: 'object', properties, required? } }
//   each property: string (text), number/integer (text, sent back as a number), boolean (Yes/No),
//     single-select: { enum } | { oneOf: [{ const, title }] } | legacy { enum, enumNames },
//     multi-select:  { type: 'array', items: { enum } | { anyOf: [{ const, title }] }, minItems?, maxItems? }
//   result: { action: 'accept' | 'decline' | 'cancel', content? }
//
//   const q = fromElicitation(params, { source: serverName });
//   if (q) return toElicitation(await ask(q, { container, transcript }), params);

import { hash } from '../model/ids.js';
import type { ClarifyResult, Option, Question, Questionnaire } from '../model/types.js';

type Const = { const: string; title?: string };
export interface PrimitiveSchema {
  type?: 'string' | 'number' | 'integer' | 'boolean' | 'array';
  title?: string;
  description?: string;
  enum?: string[];
  enumNames?: string[];
  oneOf?: Const[];
  items?: { type?: 'string'; enum?: string[]; anyOf?: Const[] };
  minItems?: number;
  maxItems?: number;
  default?: string | number | boolean | string[];
  [key: string]: unknown;
}
export interface ElicitParams {
  mode?: 'form' | 'url';
  message: string;
  requestedSchema?: { type: 'object'; properties: Record<string, PrimitiveSchema>; required?: string[] };
  [key: string]: unknown;
}
export interface ElicitResult {
  action: 'accept' | 'decline' | 'cancel';
  content?: Record<string, string | number | boolean | string[]>;
}

export interface FromElicitationOptions {
  /** Who is asking. MCP requires clients to make the requesting server clear. */
  source?: string;
  /** Default 'all': the spec asks that users can review and change answers before sending. */
  flow?: 'sequential' | 'all';
  /** Labels for boolean questions. */
  yes?: string;
  no?: string;
}

function choices(s: PrimitiveSchema): Option[] | null {
  const titled = s.oneOf ?? s.items?.anyOf;
  if (titled) return titled.map((c) => ({ id: c.const, label: c.title ?? c.const }));
  const values = s.enum ?? s.items?.enum;
  if (values) return values.map((v, i) => ({ id: v, label: s.enumNames?.[i] ?? v }));
  return null;
}

/** null for URL mode or a missing schema: those aren't forms. */
export function fromElicitation(params: ElicitParams, opts: FromElicitationOptions = {}): Questionnaire | null {
  if (params.mode === 'url' || !params.requestedSchema) return null;
  const required = new Set(params.requestedSchema.required ?? []);
  const props = params.requestedSchema.properties ?? {};
  const questions: Question[] = Object.entries(props).map(([key, s]) => {
    const base = {
      id: key,
      // `||`, not `??`: a blank description or title falls back too, instead of dropping the question (round 23).
      prompt: s.description || s.title || key,
      label: s.title || key,
      required: required.has(key),
      // The schema is closed: there's no free-text "Something else" in MCP.
      other: false,
    };
    const opts2 = choices(s);
    if (s.type === 'array') {
      return {
        ...base,
        type: 'multi',
        options: opts2 ?? [],
        ...(s.minItems !== undefined ? { min: s.minItems } : {}),
        ...(s.maxItems !== undefined ? { max: s.maxItems } : {}),
        ...(Array.isArray(s.default) ? { default: s.default } : {}),
      };
    }
    if (opts2) return { ...base, type: 'single', options: opts2, ...(typeof s.default === 'string' ? { default: s.default } : {}) };
    if (s.type === 'boolean') {
      return {
        ...base,
        type: 'single',
        options: [{ id: 'true', label: opts.yes ?? 'Yes' }, { id: 'false', label: opts.no ?? 'No' }],
        ...(typeof s.default === 'boolean' ? { default: String(s.default) } : {}),
      };
    }
    return { ...base, type: 'text', ...(s.default !== undefined && !Array.isArray(s.default) ? { default: String(s.default) } : {}) };
  });
  return {
    id: 'm' + hash(params.message + Object.keys(props).join()),
    title: params.message,
    flow: opts.flow ?? 'all',
    ...(opts.source ? { source: opts.source } : {}),
    questions,
  };
}

/**
 * - sent → accept, with each answer typed back from the schema (skipped answers left out)
 * - skipped → decline ("explicitly declined"); expired/closed → cancel ("dismissed")
 * - replied in own words → accept with the picks if every required field has one, else decline.
 *   MCP has no free-text slot, so the app reads `result.message` itself.
 * - any required field missing after conversion → decline (never an accept the schema rejects)
 */
export function toElicitation(result: ClarifyResult, params: ElicitParams): ElicitResult {
  if (result.status === 'skipped') return { action: 'decline' };
  if (result.status === 'dismissed') return { action: 'cancel' };
  const props = params.requestedSchema?.properties ?? {};
  const content: Record<string, string | number | boolean | string[]> = {};
  for (const [key, s] of Object.entries(props)) {
    const a = result.answers[key];
    if (!a || a.status !== 'answered') continue;
    // Fewer than `minItems` (picks kept when replying in own words) would break the schema: left out (round 23).
    if (s.type === 'array') {
      if (a.values.length >= (s.minItems ?? 0)) content[key] = a.values;
    }
    else if (s.type === 'boolean') content[key] = a.values[0] === 'true';
    else if (s.type === 'number' || s.type === 'integer') {
      const n = Number(a.values[0]);
      // Not a number, or "3.7" for an integer: left out rather than changed (round 23).
      if (Number.isFinite(n) && (s.type === 'number' || Number.isInteger(n))) content[key] = n;
    } else content[key] = a.values[0] ?? '';
  }
  // Never send an accept that breaks the server's own schema (a required field missing, say a
  // "number" that wasn't one): decline instead, and the server can ask again.
  const missing = (params.requestedSchema?.required ?? []).some((k) => !Object.hasOwn(content, k));
  return missing ? { action: 'decline' } : { action: 'accept', content };
}
