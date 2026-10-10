// Small id helpers shared by normalize and the converters. Kept on their own so a converter
// doesn't pull in all of normalize.

/** "Near King's Cross" → "near-king-s-cross". Keeps letters in any script. */
export function slug(label: string): string {
  return (
    label
      .toLowerCase()
      .replace(/[^\p{L}\p{N}]+/gu, '-')
      .replace(/^-+|-+$/g, '') || 'option'
  );
}

/** Short, stable id from text (djb2). Same questions → same id. */
export function hash(text: string): string {
  let h = 5381;
  for (let i = 0; i < text.length; i++) h = (h * 33) ^ text.charCodeAt(i);
  return (h >>> 0).toString(36);
}

/** Returns `base`, or `base-2`, `base-3`… whichever is free, and claims it. */
export function claim(base: string, used: Set<string>): string {
  let id = base;
  for (let n = 2; used.has(id); n++) id = `${base}-${n}`;
  used.add(id);
  return id;
}
