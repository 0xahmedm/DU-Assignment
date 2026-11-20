/**
 * Dashed polylines for signal wires (C52). Wires are dashed so they never read as beams (beams
 * are solid and glowing); a powered wire's dashes travel from its source to its target, which is
 * the "pulse when powered" of C52 and shows which way the signal goes. No Phaser here, so it can
 * be unit-tested.
 */
export interface Pt {
  x: number;
  y: number;
}

/**
 * The dash pieces along `points`: `dash` px drawn, `gap` px skipped, the pattern shifted forward
 * by `offset` px (animate it to make the dashes travel). Each piece is [from, to].
 */
export function dashSegments(points: readonly Pt[], dash: number, gap: number, offset = 0): [Pt, Pt][] {
  const period = dash + gap;
  const out: [Pt, Pt][] = [];
  // Where along the whole line the first dash starts (may be before 0, then clipped).
  let phase = (((offset % period) + period) % period) - period;
  let travelled = 0;
  for (let i = 0; i + 1 < points.length; i++) {
    const a = points[i]!;
    const b = points[i + 1]!;
    const len = Math.hypot(b.x - a.x, b.y - a.y);
    if (len === 0) continue;
    const at = (d: number): Pt => ({ x: a.x + ((b.x - a.x) * d) / len, y: a.y + ((b.y - a.y) * d) / len });
    // Dashes overlapping this piece of the line, in this piece's own distance.
    for (let s = phase - travelled; s < len; s += period) {
      const from = Math.max(0, s);
      const to = Math.min(len, s + dash);
      if (to > from) out.push([at(from), at(to)]);
    }
    travelled += len;
    // Keep `phase` close to the current piece so the loop above starts near it.
    while (phase + period <= travelled) phase += period;
  }
  return out;
}
