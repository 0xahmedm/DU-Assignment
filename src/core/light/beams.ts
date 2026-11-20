import type { Cell, ChamberModel, Dir, MirrorState } from '../chamber/types';
import { GateMap } from '../gates/gates';

/**
 * Beam tracer (Light mechanic, C19, C26, C27, C30). Engine-free and deterministic: beams are
 * straight lines along the grid, recomputed from scratch whenever the game asks (cheap: chambers
 * are small).
 *
 * Rules:
 * - An emitter fires one beam in its direction, starting from the next cell.
 * - A mirror turns the beam 90°: `/` sends right→up, up→right, left→down, down→left;
 *   `\` sends right→down, down→right, left→up, up→left.
 * - A receiver the beam enters is lit; the beam ends there.
 * - The beam stops at anything solid (terrain, closed doors, the active phase colour, emitters,
 *   dispensers) and at anything `blocks` reports (crates, enemies).
 * - It passes through air, crystals, plates, open doors, the inactive phase colour and the player
 *   (the player is pushed back by the game instead, C27).
 * - A sideways beam entering a gate that is on leaves the twin's matching cell the same way (C106);
 *   vertical beams pass gates as air.
 */

export interface BeamWorld {
  isSolid(r: number, c: number): boolean;
  mirrorAt(r: number, c: number): MirrorState | undefined;
  /** Crates and enemies (cells they overlap). */
  blocks(r: number, c: number): boolean;
  /** Is this gate pair on? (C106) Without it, every gate pair counts as on. */
  gateOn?(pair: string): boolean;
}

/**
 * One straight piece of a beam, from cell `from` to cell `to` inclusive. The ends are cell centres
 * (mirrors, receivers) or cell edges: `fromEdge` when it leaves an emitter, `toEdge` when it is
 * stopped by something in the next cell (the beam visibly ends on that wall).
 */
export interface BeamSegment {
  from: Cell;
  to: Cell;
  dir: Dir;
  fromEdge: boolean;
  toEdge: boolean;
}

export interface BeamTrace {
  segments: BeamSegment[];
  /** Ids of lit receivers. */
  lit: Set<string>;
  /** "r,c" of every cell a beam passes through (for knockback and, on Day 4, enemy damage). */
  cells: Set<string>;
  /** "r,c" of gate cells a beam enters or leaves sideways (C106), so the frames can glow. */
  gateCells: Set<string>;
}

const STEP: Record<Dir, readonly [number, number]> = { up: [-1, 0], down: [1, 0], left: [0, -1], right: [0, 1] };

const REFLECT: Record<MirrorState, Record<Dir, Dir>> = {
  '/': { right: 'up', up: 'right', left: 'down', down: 'left' },
  '\\': { right: 'down', down: 'right', left: 'up', up: 'left' },
};

export function reflect(mirror: MirrorState, dir: Dir): Dir {
  return REFLECT[mirror][dir];
}

export function traceBeams(model: ChamberModel, world: BeamWorld): BeamTrace {
  const receiverAt = new Map<string, string>();
  for (const d of model.devices) if (d.kind === 'receiver') for (const [r, c] of d.cells) receiverAt.set(`${r},${c}`, d.id);

  const gates = new GateMap(model);
  const segments: BeamSegment[] = [];
  const lit = new Set<string>();
  const cells = new Set<string>();
  const gateCells = new Set<string>();

  for (const emitter of model.devices) {
    if (emitter.kind !== 'emitter' || !emitter.dir) continue;
    let dir: Dir = emitter.dir;
    let [r, c] = emitter.cells[0]!;
    let start: Cell | undefined;
    let last: Cell | undefined;
    let fromEdge = true;
    let toEdge = false;
    const seen = new Set<string>(); // (cell, direction): a mirror loop ends the beam
    const close = () => {
      if (start && last) segments.push({ from: start, to: last, dir, fromEdge, toEdge });
    };

    for (;;) {
      const [dr, dc] = STEP[dir];
      r += dr;
      c += dc;
      const key = `${r},${c}`;
      if (r < 0 || c < 0 || r >= model.height || c >= model.width || seen.has(`${key}:${dir}`)) break;
      seen.add(`${key}:${dir}`);

      const receiver = receiverAt.get(key);
      if (receiver) {
        start ??= [r, c];
        last = [r, c];
        lit.add(receiver);
        break;
      }
      const mirror = world.mirrorAt(r, c);
      if (mirror) {
        start ??= [r, c];
        last = [r, c];
        cells.add(key);
        close();
        dir = reflect(mirror, dir);
        start = [r, c];
        fromEdge = false;
        continue;
      }
      const pair = dir === 'left' || dir === 'right' ? gates.pairAt(r, c) : undefined;
      if (pair !== undefined && (world.gateOn?.(pair) ?? true)) {
        // Into the gate: this piece ends at the gate's centre, the next starts at the twin's.
        start ??= [r, c];
        last = [r, c];
        cells.add(key);
        gateCells.add(key);
        close();
        [r, c] = gates.twinOf(r, c)!;
        start = last = [r, c];
        cells.add(`${r},${c}`);
        gateCells.add(`${r},${c}`);
        fromEdge = false;
        toEdge = false;
        continue;
      }
      if (world.isSolid(r, c) || world.blocks(r, c)) {
        toEdge = true;
        if (!start) {
          // Blocked right away (by the wall in front of the emitter, or after a mirror).
          start = last = [r - dr, c - dc];
        }
        break;
      }
      start ??= [r, c];
      last = [r, c];
      cells.add(key);
    }
    close();
  }
  return { segments, lit, cells, gateCells };
}

/** A segment as a line in world pixels (cell size `tile`), for drawing and for contact tests. */
export function segmentLine(seg: BeamSegment, tile: number): { x1: number; y1: number; x2: number; y2: number } {
  const [dr, dc] = STEP[seg.dir];
  const centre = ([r, c]: Cell) => ({ x: c * tile + tile / 2, y: r * tile + tile / 2 });
  const a = centre(seg.from);
  const b = centre(seg.to);
  if (seg.fromEdge) {
    a.x -= (dc * tile) / 2;
    a.y -= (dr * tile) / 2;
  }
  if (seg.toEdge) {
    b.x += (dc * tile) / 2;
    b.y += (dr * tile) / 2;
  }
  return { x1: a.x, y1: a.y, x2: b.x, y2: b.y };
}

/**
 * Does a beam touch this box (e.g. the player)? Returns the first beam touched: `axis: 'x'` is a
 * vertical beam at x = `at`, `axis: 'y'` a horizontal beam at y = `at`. The game pushes the
 * player away from that line (barrier, C27: knockback only, never a heart).
 */
export function beamContact(
  segments: readonly BeamSegment[],
  box: { left: number; top: number; right: number; bottom: number },
  tile: number,
  halfWidth = 3,
): { axis: 'x' | 'y'; at: number } | undefined {
  for (const seg of segments) {
    const l = segmentLine(seg, tile);
    const vertical = l.x1 === l.x2;
    const minX = Math.min(l.x1, l.x2) - (vertical ? halfWidth : 0);
    const maxX = Math.max(l.x1, l.x2) + (vertical ? halfWidth : 0);
    const minY = Math.min(l.y1, l.y2) - (vertical ? 0 : halfWidth);
    const maxY = Math.max(l.y1, l.y2) + (vertical ? 0 : halfWidth);
    if (box.right > minX && box.left < maxX && box.bottom > minY && box.top < maxY) {
      return vertical ? { axis: 'x', at: l.x1 } : { axis: 'y', at: l.y1 };
    }
  }
  return undefined;
}
