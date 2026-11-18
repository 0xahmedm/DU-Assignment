/**
 * Seeded randomness for runs (C15, C64): the same seed always gives the same expedition and the
 * same upgrade offers, so a seed can be shown, shared and replayed.
 */

/** mulberry32: a small, fast generator with good spread. Returns numbers in [0, 1). */
export function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** A shuffled copy (Fisher–Yates) driven by `next`. */
export function shuffled<T>(items: readonly T[], next: () => number): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(next() * (i + 1));
    [out[i], out[j]] = [out[j]!, out[i]!];
  }
  return out;
}

/** Mixes a seed with a stream number, so independent choices (deal, rooms, offers) don't correlate. */
export const subSeed = (seed: number, stream: number): number => (seed ^ Math.imul(stream + 1, 0x9e3779b1)) >>> 0;
