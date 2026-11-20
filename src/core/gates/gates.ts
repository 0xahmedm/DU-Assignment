import type { Cell, ChamberModel, Device } from '../chamber/types';

/**
 * Gates, the fourth mechanic (C104, rules C106). Engine-free, like the other mechanics.
 *
 * - A gate is a frame one cell wide and two cells tall; the same digit drawn twice is a linked pair.
 *   Gates are never solid.
 * - When the centre of a body (the player with or without a crate, a crate, a walker, a
 *   Shieldbearer) crosses a gate's centre line moving sideways, it comes out beside the twin, on the
 *   side it was heading to, at the same height and with the same speed.
 * - A sideways beam that enters a gate cell leaves the twin's matching cell the same way. Vertical
 *   beams pass gates as if they were air.
 * - An unwired pair is always on; a wired pair is on while powered. An off pair is an empty frame.
 * - A gate whose twin is blocked on the exit side (something solid there right now) does not carry
 *   bodies; it acts as an empty frame. A beam still goes through and stops at the blocker.
 */

const key = (r: number, c: number) => `${r},${c}`;

interface GateSlot {
  pair: Device;
  /** Which of the pair's two gates this cell belongs to. */
  gate: 0 | 1;
  /** 0 = top cell, 1 = bottom cell. */
  index: number;
}

export class GateMap {
  private readonly slots = new Map<string, GateSlot>();
  readonly pairs: readonly Device[];

  constructor(model: ChamberModel) {
    this.pairs = model.devices.filter((d) => d.kind === 'gate' && d.gates);
    for (const pair of this.pairs) {
      pair.gates!.forEach((cells, gate) => cells.forEach(([r, c], index) => this.slots.set(key(r, c), { pair, gate: gate as 0 | 1, index })));
    }
  }

  /** Id of the gate pair occupying this cell, if any. */
  pairAt(r: number, c: number): string | undefined {
    return this.slots.get(key(r, c))?.pair.id;
  }

  /** The twin's cell matching (r, c): the same row within the gate. */
  twinOf(r: number, c: number): Cell | undefined {
    const s = this.slots.get(key(r, c));
    return s ? s.pair.gates![1 - s.gate]![s.index] : undefined;
  }
}

/** A body's box in world pixels. */
export interface GateBody {
  left: number;
  top: number;
  width: number;
  height: number;
}

export interface GatePass {
  pair: string;
  /** The gate the body entered and the twin it comes out of (cells, top to bottom). */
  from: readonly Cell[];
  to: readonly Cell[];
  dir: 1 | -1;
  /** The body's new top-left corner. */
  left: number;
  top: number;
}

/** Is the column beside `gate` on side `dir` free at both of the gate's rows right now? */
export function exitClear(gate: readonly Cell[], dir: 1 | -1, isSolid: (r: number, c: number) => boolean): boolean {
  return gate.every(([r, c]) => !isSolid(r, c + dir));
}

/**
 * One step of a body through the gates. `prevCentreX` is the body's centre on the previous step.
 * Returns where the body comes out if its centre crossed the centre line of a gate that is on,
 * while its vertical centre was within the gate's rows and the twin's exit side is clear.
 */
export function passThrough(
  pairs: readonly Device[],
  body: GateBody,
  prevCentreX: number,
  tile: number,
  isOn: (pair: string) => boolean,
  isSolid: (r: number, c: number) => boolean,
): GatePass | undefined {
  const cx = body.left + body.width / 2;
  const cy = body.top + body.height / 2;
  if (cx === prevCentreX) return undefined;
  const dir: 1 | -1 = cx > prevCentreX ? 1 : -1;
  for (const pair of pairs) {
    if (!isOn(pair.id)) continue;
    for (const g of [0, 1] as const) {
      const from = pair.gates![g]!;
      const [top, col] = from[0]!;
      const line = col * tile + tile / 2;
      const crossed = dir === 1 ? prevCentreX < line && cx >= line : prevCentreX > line && cx <= line;
      if (!crossed || cy < top * tile || cy >= (top + from.length) * tile) continue;
      const to = pair.gates![1 - g]!;
      if (!exitClear(to, dir, isSolid)) continue;
      const [toTop, toCol] = to[0]!;
      const left = dir === 1 ? (toCol + 1) * tile + 0.5 : toCol * tile - body.width - 0.5;
      return { pair: pair.id, from, to, dir, left, top: body.top + (toTop - top) * tile };
    }
  }
  return undefined;
}
