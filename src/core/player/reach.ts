/**
 * Headless reachability checker (layout tooling, C51). Day 1 layouts were drawn by hand for a
 * player "about 1 tile" tall; the real body is 1.375 tiles, and several drawings turned out to
 * have too little headroom. This module answers "can the player get from here to there?" by
 * running the REAL movement model (stepMovement) against a tile grid with simple AABB collision,
 * trying a fan of jump/steer timings from many standing spots, and flooding outwards.
 *
 * It is a design aid, not a proof: it is slightly optimistic (it assumes a run-up is always
 * possible) and ignores crates and enemies. Results are confirmed in the real game.
 */
import type { Cell } from '../chamber/types';
import { PLAYER_BODY, TILE } from './metrics';
import { DEFAULT_MOVEMENT, initialMovementState, stepMovement, type MovementParams } from './movement';

const DT = 1 / 60;
const W = PLAYER_BODY.width;
const H = PLAYER_BODY.height;

export interface ReachWorld {
  width: number; // cells
  height: number; // cells
  isSolid(r: number, c: number): boolean;
}

/** A run of floor tiles you can stand on: solid row `row`, columns c0..c1, standing room above. */
export interface Segment {
  row: number;
  c0: number;
  c1: number;
}

const segKey = (s: Segment) => `${s.row}:${s.c0}-${s.c1}`;

function overlaps(world: ReachWorld, left: number, top: number): boolean {
  const r0 = Math.floor(top / TILE);
  const r1 = Math.floor((top + H - 0.001) / TILE);
  const c0 = Math.floor(left / TILE);
  const c1 = Math.floor((left + W - 0.001) / TILE);
  for (let r = r0; r <= r1; r++) for (let c = c0; c <= c1; c++) if (world.isSolid(r, c)) return true;
  return false;
}

/** All standable floor segments (a solid tile with air above it). */
export function floorSegments(world: ReachWorld): Segment[] {
  const out: Segment[] = [];
  for (let r = 1; r < world.height; r++) {
    let c = 0;
    while (c < world.width) {
      // Standable: solid tile with room for the body above it (44 px needs two clear rows).
      const floor = (x: number) => world.isSolid(r, x) && !world.isSolid(r - 1, x) && !world.isSolid(r - 2, x);
      if (!floor(c)) {
        c++;
        continue;
      }
      const c0 = c;
      while (c < world.width && floor(c)) c++;
      out.push({ row: r, c0, c1: c - 1 });
    }
  }
  return out;
}

export function segmentAt(segments: readonly Segment[], row: number, col: number): Segment | undefined {
  return segments.find((s) => s.row === row && col >= s.c0 && col <= s.c1);
}

interface Attempt {
  dir: -1 | 0 | 1;
  steerFrom: number;
  steerFor: number;
  jump: boolean;
  jumpHoldFrames: number;
  runStart: boolean;
  /** Frame on which Dash is pressed (only when the kit has Dash). */
  dashAt?: number;
}

function attempts(): Attempt[] {
  const list: Attempt[] = [];
  for (const jump of [true, false]) {
    for (const jumpHoldFrames of jump ? [999, 8] : [0]) {
      list.push({ dir: 0, steerFrom: 0, steerFor: 0, jump, jumpHoldFrames, runStart: false });
      for (const dir of [-1, 1] as const) {
        for (const steerFrom of [0, 4, 8, 12, 18]) {
          for (const steerFor of [4, 8, 12, 18, 26, 40, 999]) {
            for (const runStart of steerFrom === 0 ? [false, true] : [false]) {
              if (!jump && (steerFrom > 0 || steerFor < 999)) continue; // walking off: hold one way
              list.push({ dir, steerFrom, steerFor, jump, jumpHoldFrames, runStart });
            }
          }
        }
      }
    }
  }
  return list;
}

const ATTEMPTS = attempts();

/** Extra attempts with a Dash: running jumps dashing at different moments, and dashing off a ledge. */
function dashAttempts(): Attempt[] {
  const list: Attempt[] = [];
  for (const dir of [-1, 1] as const) {
    for (const runStart of [false, true]) {
      for (const dashAt of [0, 4, 8, 12, 16, 20, 26, 32]) {
        list.push({ dir, steerFrom: 0, steerFor: 999, jump: true, jumpHoldFrames: 999, runStart, dashAt });
      }
      for (const dashAt of [0, 6, 12]) list.push({ dir, steerFrom: 0, steerFor: 999, jump: false, jumpHoldFrames: 0, runStart, dashAt });
    }
  }
  return list;
}

const DASH_ATTEMPTS = dashAttempts();

/** Simulates one attempt from a standing spot; returns every segment it lands on along the way. */
function simulate(
  world: ReachWorld,
  segments: readonly Segment[],
  startLeft: number,
  floorRow: number,
  a: Attempt,
  carrying: boolean,
  p: MovementParams,
  onFrame?: FrameCallback,
  fromSeg: Segment = { row: floorRow, c0: -1, c1: -1 },
): Segment[] {
  let left = startLeft;
  let top = floorRow * TILE - H;
  const speed = p.runSpeed * (carrying ? p.carrySpeedFactor : 1);
  let s = { ...initialMovementState(), vx: a.runStart ? a.dir * speed : 0 };
  let grounded = true;
  const landings: Segment[] = [];
  const landedOn = (): Segment | undefined => {
    const row = Math.round((top + H) / TILE);
    return (
      segmentAt(segments, row, Math.floor((left + W / 2) / TILE)) ??
      segmentAt(segments, row, Math.floor(left / TILE)) ??
      segmentAt(segments, row, Math.floor((left + W - 0.01) / TILE))
    );
  };
  for (let f = 0; f < 150; f++) {
    const steering = f >= a.steerFrom && f < a.steerFrom + a.steerFor;
    s = stepMovement(
      s,
      {
        move: steering ? a.dir : 0,
        jumpPressed: a.jump && f === 0,
        jumpHeld: a.jump && f < a.jumpHoldFrames,
        carrying,
        dashPressed: a.dashAt === f,
        facing: a.dir === -1 ? -1 : 1,
      },
      grounded,
      p,
      DT,
    );
    // Move x, then y, resolving against tiles (snap to the blocking tile's edge).
    const nx = left + s.vx * DT;
    if (overlaps(world, nx, top)) {
      const snapped = s.vx > 0 ? Math.floor((nx + W) / TILE) * TILE - W - 0.01 : (Math.floor(nx / TILE) + 1) * TILE + 0.01;
      if (!overlaps(world, snapped, top)) left = snapped;
      s = { ...s, vx: 0 };
    } else left = nx;
    const ny = top + s.vy * DT;
    if (overlaps(world, left, ny)) {
      const snapped = s.vy > 0 ? Math.floor((ny + H) / TILE) * TILE - H : (Math.floor(ny / TILE) + 1) * TILE;
      if (!overlaps(world, left, snapped)) top = snapped;
      s = { ...s, vy: 0 };
    } else top = ny;
    if (top > world.height * TILE) break;
    onFrame?.({ left, top, right: left + W, bottom: top + H }, a.dir === -1 ? -1 : 1, fromSeg, a.dashAt !== undefined && f >= a.dashAt);
    const wasGrounded = grounded;
    grounded = overlaps(world, left, top + 1);
    if (grounded && !wasGrounded) {
      const seg = landedOn();
      if (seg) landings.push(seg);
      if (!steering) break;
    }
    if (grounded && !steering && f > 2) break;
  }
  if (grounded) {
    const seg = landedOn();
    if (seg) landings.push(seg);
  }
  return landings;
}

/** Standing spots sampled along a segment (dense near the ends, where jumps start). */
function spots(world: ReachWorld, seg: Segment): number[] {
  const xs = new Set<number>();
  const lo = seg.c0 * TILE - W + 2; // overhanging the left end by almost the whole body
  const hi = (seg.c1 + 1) * TILE - 2;
  for (let x = lo; x <= hi; x += 8) {
    const nearEnd = x - lo < 56 || hi - x < 56;
    if (nearEnd || (x - lo) % 32 < 8) xs.add(x);
  }
  return [...xs].filter((x) => !overlaps(world, x, seg.row * TILE - H));
}

export interface ReachResult {
  segments: Segment[];
  reached: Segment[];
  canReach(row: number, col: number): boolean;
}

/** Called for every simulated frame: the body box and the way it faces (melee-reach checks). */
export type FrameCallback = (
  body: { left: number; top: number; right: number; bottom: number },
  facing: 1 | -1,
  from: Segment,
  dashed: boolean,
) => void;

/** A linked gate pair that is on (C106): the two gates' cells, top to bottom. */
export type ReachGatePair = readonly [readonly Cell[], readonly Cell[]];

/**
 * Walking through a gate (C106): from a segment the body can stand on beside a floor-standing gate,
 * it comes out beside the twin, on the far side, and falls from there. Returns the landings.
 */
function throughGates(world: ReachWorld, segments: readonly Segment[], seg: Segment, gates: readonly ReachGatePair[], carrying: boolean, p: MovementParams): Segment[] {
  const out: Segment[] = [];
  const stand: Attempt = { dir: 0, steerFrom: 0, steerFor: 0, jump: false, jumpHoldFrames: 0, runStart: false };
  for (const pair of gates) {
    for (const g of [0, 1] as const) {
      const from = pair[g];
      const to = pair[1 - g];
      const bottom = from[from.length - 1]!;
      if (bottom[0] + 1 !== seg.row || bottom[1] < seg.c0 || bottom[1] > seg.c1) continue; // not standing on this floor
      for (const dir of [1, -1] as const) {
        const approach = bottom[1] - dir; // walking in from this side
        if (approach < seg.c0 || approach > seg.c1) continue;
        if (to.some(([r, c]) => world.isSolid(r, c + dir))) continue; // the twin's exit side is blocked
        const toBottom = to[to.length - 1]!;
        const left = dir === 1 ? (toBottom[1] + 1) * TILE + 0.5 : toBottom[1] * TILE - W - 0.5;
        out.push(...simulate(world, segments, left, toBottom[0] + 1, stand, carrying, p));
      }
    }
  }
  return out;
}

/**
 * Floods out from the segment the player stands on at (row = floor tile row, col).
 * `dash` adds Dash attempts (kit with Dash); `onFrame` sees every frame of every attempt;
 * `gates` lists the gate pairs that are on (walking through a floor-standing gate).
 */
export function reachFrom(
  world: ReachWorld,
  start: { row: number; col: number },
  opts: { carrying?: boolean; params?: MovementParams; dash?: boolean; onFrame?: FrameCallback; gates?: readonly ReachGatePair[] } = {},
): ReachResult {
  const p = opts.params ?? DEFAULT_MOVEMENT;
  const carrying = opts.carrying ?? false;
  const segments = floorSegments(world);
  const first = segmentAt(segments, start.row, start.col);
  const seen = new Map<string, Segment>();
  const queue: Segment[] = [];
  if (first) {
    seen.set(segKey(first), first);
    queue.push(first);
  }
  const visit = (landed: Segment) => {
    if (seen.has(segKey(landed))) return;
    seen.set(segKey(landed), landed);
    queue.push(landed);
  };
  while (queue.length > 0) {
    const seg = queue.shift()!;
    for (const landed of throughGates(world, segments, seg, opts.gates ?? [], carrying, p)) visit(landed);
    for (const x of spots(world, seg)) {
      for (const a of opts.dash && !carrying ? [...ATTEMPTS, ...DASH_ATTEMPTS] : ATTEMPTS) {
        for (const landed of simulate(world, segments, x, seg.row, a, carrying, p, opts.onFrame, seg)) visit(landed);
      }
    }
  }
  const reached = [...seen.values()];
  return {
    segments,
    reached,
    canReach: (row, col) => reached.some((s) => s.row === row && col >= s.c0 && col <= s.c1),
  };
}
