import { feedingDispenser } from './dispensers';
import { symbolInfo } from './legend';
import type { ChamberModel, DeviceKind } from './types';

export interface ValidationReport {
  errors: string[];
  warnings: string[];
}

const SOURCES: ReadonlySet<DeviceKind> = new Set(['plate', 'receiver']);
const TARGETS: ReadonlySet<DeviceKind> = new Set(['door', 'exit', 'trapdoor', 'mirror', 'gate']);
const BORDER_OK = new Set(['#', 'D', 'E', '|', 'K', 'U', 'o', '>', '<', '^', 'v', '/', '\\']);

/**
 * Design-data checks on a parsed chamber (C51, "dev-mode validator"). Runs in tests for all
 * chambers and on load in dev builds. Errors make a chamber unplayable or unfair; warnings flag
 * things a designer should confirm on purpose.
 */
export function validateChamber(model: ChamberModel): ValidationReport {
  const errors: string[] = [];
  const warnings: string[] = [];
  const { grid, def } = model;
  const id = def.id;
  const at = (r: number, c: number) => grid[r]?.[c] ?? '#';
  const isStaticSolid = (ch: string) => symbolInfo(ch)?.tile === 'solid';

  // Outer ring must be closed, so nothing can leave the world.
  for (let r = 0; r < model.height; r++) {
    for (let c = 0; c < model.width; c++) {
      const edge = r === 0 || c === 0 || r === model.height - 1 || c === model.width - 1;
      if (edge && !BORDER_OK.has(at(r, c))) errors.push(`${id}: open border at row ${r} col ${c} ("${at(r, c)}")`);
    }
  }

  const byId = new Map(model.devices.map((d) => [d.id, d]));

  // Plates rest on solid, static ground (never on phase blocks or air).
  for (const d of model.devices.filter((x) => x.kind === 'plate')) {
    for (const [r, c] of d.cells) {
      if (!isStaticSolid(at(r + 1, c))) errors.push(`${id}: plate "${d.id}" at row ${r} col ${c} is not on solid ground`);
    }
  }

  // Links connect signal sources to signal targets.
  const driven = new Set<string>();
  const driving = new Set<string>();
  for (const l of model.links) {
    const target = byId.get(l.to);
    if (target && !TARGETS.has(target.kind)) errors.push(`${id}: "${l.to}" (${target.kind}) cannot be driven by a signal`);
    driven.add(l.to);
    for (const f of l.from) {
      const src = byId.get(f);
      if (src && !SOURCES.has(src.kind)) errors.push(`${id}: "${f}" (${src.kind}) cannot send a signal`);
      driving.add(f);
    }
  }
  // An unwired exit is always open; that must be declared, so a forgotten link is still caught.
  if (!driven.has('exit') && !def.exitAlwaysOpen) {
    errors.push(`${id}: the exit has no inputs (declare exitAlwaysOpen if the exit is a plain doorway)`);
  }
  if (driven.has('exit') && def.exitAlwaysOpen) errors.push(`${id}: exitAlwaysOpen is declared but the exit is wired`);
  for (const d of model.devices) {
    if (SOURCES.has(d.kind) && !driving.has(d.id)) warnings.push(`${id}: ${d.kind} "${d.id}" is not wired to anything`);
  }

  // Crates should have a dispenser directly above them (recall = softlock safety net, C50).
  for (const s of model.spawns.filter((x) => x.kind === 'crate')) {
    const [r, c] = s.cell;
    if (!feedingDispenser(model, s.cell) && !def.cratesCannotBeLost) {
      warnings.push(`${id}: crate at row ${r} col ${c} has no dispenser above it (declare cratesCannotBeLost if intended)`);
    }
  }

  // Enemies must start standing on something (a trapdoor counts: it starts closed, L-H C97).
  for (const s of model.spawns.filter((x) => x.kind !== 'crate')) {
    const below = at(s.cell[0] + 1, s.cell[1]);
    if (symbolInfo(below)?.tile === 'empty' && below !== '=') warnings.push(`${id}: ${s.kind} at row ${s.cell[0]} col ${s.cell[1]} starts in mid-air`);
  }

  // Enemies the solution uses (C109) cannot outnumber the enemies there are.
  const enemyCount = model.spawns.filter((x) => x.kind !== 'crate').length;
  if ((def.enemiesUsed ?? 0) > enemyCount) errors.push(`${id}: enemiesUsed is ${def.enemiesUsed} but the chamber has ${enemyCount} enemies`);

  // Gates (C106): a gate walled in on both sides can never be used. (A side with only one open
  // row is legal: a beam can use that row; bodies cannot, they need both rows clear.)
  for (const d of model.devices.filter((x) => x.kind === 'gate')) {
    for (const gate of d.gates ?? []) {
      const sideUsable = (dir: 1 | -1) => gate.some(([r, c]) => !isStaticSolid(at(r, c + dir)));
      if (!sideUsable(1) && !sideUsable(-1)) errors.push(`${id}: gate "${d.id}" at row ${gate[0]![0]} col ${gate[0]![1]} is walled in on both sides`);
    }
  }

  return { errors, warnings };
}
