import { EMITTER_DIRS, isPlate, symbolInfo } from './legend';
import type { Cell, ChamberDef, ChamberModel, Device, DeviceKind, MirrorState, Spawn } from './types';

export interface ParseResult {
  model?: ChamberModel;
  errors: string[];
}

const PAD = '#';
const DOOR_LIKE = new Set(['|', 'K', 'E', '=', 'D']);

/**
 * Turns a ChamberDef into a ChamberModel: checks every section, stitches sections into one world
 * grid (each later section's `attach.at` cell lands on the previous section's `attach.onto` cell),
 * then finds the start, spawns and devices and resolves names and links.
 */
export function parseChamber(def: ChamberDef): ParseResult {
  const errors: string[] = [];
  const where = (sec: string, r: number, c: number) => `${def.id} section ${sec} row ${r} col ${c}`;

  // 1. Section shape and symbols ---------------------------------------------------------------
  for (const sec of def.sections) {
    if (sec.grid.length === 0) {
      errors.push(`${def.id} section ${sec.id}: empty grid`);
      continue;
    }
    const width = sec.grid[0]!.length;
    sec.grid.forEach((row, r) => {
      if (row.length !== width) {
        errors.push(`${def.id} section ${sec.id} row ${r}: width ${row.length}, expected ${width}`);
      }
      [...row].forEach((ch, c) => {
        if (!symbolInfo(ch)) errors.push(`${where(sec.id, r, c)}: unknown symbol "${ch}"`);
      });
    });
  }
  if (errors.length > 0) return { errors };

  // 2. Stitch sections into world coordinates ---------------------------------------------------
  const rawOrigins: [number, number][] = [];
  def.sections.forEach((sec, i) => {
    if (i === 0) {
      rawOrigins.push([0, 0]);
      return;
    }
    if (!sec.attach) {
      errors.push(`${def.id} section ${sec.id}: needs "attach" to place it after section ${def.sections[i - 1]!.id}`);
      rawOrigins.push([0, 0]);
      return;
    }
    const prev = rawOrigins[i - 1]!;
    const [ar, ac] = sec.attach.at;
    const [or, oc] = sec.attach.onto;
    rawOrigins.push([prev[0] + or - ar, prev[1] + oc - ac]);
  });
  if (errors.length > 0) return { errors };

  const minR = Math.min(...rawOrigins.map((o) => o[0]));
  const minC = Math.min(...rawOrigins.map((o) => o[1]));
  const origins = rawOrigins.map(([r, c]) => [r - minR, c - minC] as const);
  const height = Math.max(...def.sections.map((s, i) => origins[i]![0] + s.grid.length));
  const width = Math.max(...def.sections.map((s, i) => origins[i]![1] + s.grid[0]!.length));

  const world: string[][] = Array.from({ length: height }, () => Array<string>(width).fill(PAD));
  const written: boolean[][] = Array.from({ length: height }, () => Array<boolean>(width).fill(false));
  const sectionOrigins: Record<string, Cell> = {};

  def.sections.forEach((sec, i) => {
    const [r0, c0] = origins[i]!;
    sectionOrigins[sec.id] = [r0, c0];
    sec.grid.forEach((row, r) => {
      [...row].forEach((ch, c) => {
        const wr = r0 + r;
        const wc = c0 + c;
        const existing = world[wr]![wc]!;
        if (!written[wr]![wc] || existing === ch) {
          world[wr]![wc] = ch;
        } else if (existing === '#' && DOOR_LIKE.has(ch)) {
          world[wr]![wc] = ch; // a door in one section opens the shared wall
        } else if (!(ch === '#' && DOOR_LIKE.has(existing))) {
          errors.push(`${where(sec.id, r, c)}: overlaps "${existing}" from an earlier section with "${ch}"`);
        }
        written[wr]![wc] = true;
      });
    });
  });
  if (errors.length > 0) return { errors };

  const grid = world.map((row) => row.join(''));

  // 3. Start, spawns, devices -------------------------------------------------------------------
  let start: Cell | undefined;
  const spawns: Spawn[] = [];
  const devices: Device[] = [];
  const plateCells = new Map<string, Cell[]>();
  const claimed = new Set<string>();
  const key = (r: number, c: number) => `${r},${c}`;

  const groupRun = (r: number, c: number, ch: string): Cell[] => {
    // Flood fill of orthogonally adjacent cells with the same door-like symbol.
    const cells: Cell[] = [];
    const stack: Cell[] = [[r, c]];
    while (stack.length > 0) {
      const [cr, cc] = stack.pop()!;
      if (claimed.has(key(cr, cc)) || grid[cr]?.[cc] !== ch) continue;
      claimed.add(key(cr, cc));
      cells.push([cr, cc]);
      stack.push([cr + 1, cc], [cr - 1, cc], [cr, cc + 1], [cr, cc - 1]);
    }
    return cells.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  };

  const add = (kind: DeviceKind, cells: Cell[], extra: Partial<Device> = {}) => {
    const [r, c] = cells[0]!;
    devices.push({ id: kind === 'exit' ? 'exit' : `${kind}@${r},${c}`, kind, cells, ...extra });
  };

  grid.forEach((row, r) => {
    [...row].forEach((ch, c) => {
      if (ch === 'S') {
        if (start) errors.push(`${def.id}: more than one start (S)`);
        start = [r, c];
      } else if (ch === 'w') spawns.push({ kind: 'walker', cell: [r, c] });
      else if (ch === 'H') spawns.push({ kind: 'shieldbearer', cell: [r, c] });
      else if (ch === 'C') spawns.push({ kind: 'crate', cell: [r, c] });
      else if (isPlate(ch)) plateCells.set(ch, [...(plateCells.get(ch) ?? []), [r, c]]);
      else if (ch === 'E' && !claimed.has(key(r, c))) add('exit', groupRun(r, c, ch));
      else if ((ch === '|' || ch === 'K') && !claimed.has(key(r, c))) add('door', groupRun(r, c, ch));
      else if (ch === '=' && !claimed.has(key(r, c))) add('trapdoor', groupRun(r, c, ch));
      else if (ch === 'U') add('dispenser', [[r, c]]);
      else if (ch === '*') add('crystal', [[r, c]]);
      else if (ch === 'o') add('receiver', [[r, c]]);
      else if (ch in EMITTER_DIRS) add('emitter', [[r, c]], { dir: EMITTER_DIRS[ch] });
      else if (ch === '/' || ch === '\\') add('mirror', [[r, c]], { mirror: ch as MirrorState });
    });
  });
  for (const [letter, cells] of plateCells) devices.push({ id: letter, kind: 'plate', cells });

  if (!start) errors.push(`${def.id}: no start (S)`);
  if (devices.filter((d) => d.kind === 'exit').length > 1) errors.push(`${def.id}: exit cells must be one connected door`);

  // 4. Names ------------------------------------------------------------------------------------
  for (const [ref, name] of Object.entries(def.names ?? {})) {
    const m = /^([^:]+):(\d+),(\d+)$/.exec(ref);
    const origin = m ? sectionOrigins[m[1]!] : undefined;
    if (!m || !origin) {
      errors.push(`${def.id}: bad name reference "${ref}" (expected "section:row,col")`);
      continue;
    }
    const wr = origin[0] + Number(m[2]);
    const wc = origin[1] + Number(m[3]);
    const dev = devices.find((d) => d.cells.some(([r, c]) => r === wr && c === wc));
    if (!dev) errors.push(`${def.id}: name "${name}" points at "${ref}", which holds no device`);
    else if (devices.some((d) => d.id === name)) errors.push(`${def.id}: duplicate device id "${name}"`);
    else dev.id = name;
  }

  // 5. Links ------------------------------------------------------------------------------------
  const ids = new Set(devices.map((d) => d.id));
  const links = def.links.map((l) => {
    const from = typeof l.from === 'string' ? [l.from] : [...l.from];
    for (const f of [...from, l.to]) if (!ids.has(f)) errors.push(`${def.id}: link refers to unknown device "${f}"`);
    const target = devices.find((d) => d.id === l.to);
    return { from, to: l.to, logic: l.logic ?? (target?.kind === 'exit' ? 'AND' : 'OR') } as const;
  });

  if (errors.length > 0 || !start) return { errors };
  return {
    model: { def, grid, width, height, sectionOrigins, start, devices, spawns, links },
    errors,
  };
}
