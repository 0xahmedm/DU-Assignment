import type { ChamberModel, Device, MirrorState } from '../chamber/types';
import { TILE } from '../player/metrics';
import type { BeamWorld } from './beams';

/**
 * Insight (run upgrade, C67): near a free mirror, show where the beams would go if it were
 * flipped; near a plate or receiver, show what it is wired to. Read-only: nothing here changes
 * the chamber, so the puzzles stay exactly as proven.
 */

/** How close (px, from the player's centre to a device's centre) Insight looks. */
export const INSIGHT_RADIUS = 2.5 * TILE;

const centre = (d: Device) => {
  const rs = d.cells.map(([r]) => r);
  const cs = d.cells.map(([, c]) => c);
  return { x: ((Math.min(...cs) + Math.max(...cs) + 1) / 2) * TILE, y: ((Math.min(...rs) + Math.max(...rs) + 1) / 2) * TILE };
};

function nearest(devices: readonly Device[], x: number, y: number, radius: number): Device | undefined {
  let best: Device | undefined;
  let bestD = radius;
  for (const d of devices) {
    const c = centre(d);
    const dist = Math.hypot(c.x - x, c.y - y);
    if (dist <= bestD) {
      best = d;
      bestD = dist;
    }
  }
  return best;
}

/** The free (hit-flippable) mirror nearest the player, if one is within reach of Insight. */
export function nearestFreeMirror(model: ChamberModel, isLocked: (id: string) => boolean, x: number, y: number, radius = INSIGHT_RADIUS): Device | undefined {
  return nearest(model.devices.filter((d) => d.kind === 'mirror' && !isLocked(d.id)), x, y, radius);
}

/** The plate or receiver nearest the player that is wired to something. */
export function nearestSource(model: ChamberModel, x: number, y: number, radius = INSIGHT_RADIUS): Device | undefined {
  const wired = new Set(model.links.flatMap((l) => l.from));
  return nearest(model.devices.filter((d) => (d.kind === 'plate' || d.kind === 'receiver') && wired.has(d.id)), x, y, radius);
}

/** Every device a source feeds (doors, trapdoors, the exit, wired mirrors). */
export function targetsOf(model: ChamberModel, sourceId: string): Device[] {
  const ids = new Set(model.links.filter((l) => l.from.includes(sourceId)).map((l) => l.to));
  return model.devices.filter((d) => ids.has(d.id));
}

/** The same beam world, but with one mirror flipped: what a hit on it would do. */
export function withMirrorFlipped(world: BeamWorld, mirror: Device): BeamWorld {
  const cells = new Set(mirror.cells.map(([r, c]) => `${r},${c}`));
  return {
    ...world,
    mirrorAt: (r, c) => {
      const m = world.mirrorAt(r, c);
      if (m === undefined || !cells.has(`${r},${c}`)) return m;
      return (m === '/' ? '\\' : '/') as MirrorState;
    },
  };
}
