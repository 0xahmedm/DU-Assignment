import { symbolInfo } from './legend';
import type { Cell, ChamberModel } from './types';

/**
 * The dispenser that feeds a crate spawn: the nearest dispenser straight above it with only air
 * in between (decision log drafts: every dispenser is drawn above its crate). Returns its id, or
 * undefined if the crate has none. Used by the validator and by dispenser recall (C50).
 */
export function feedingDispenser(model: ChamberModel, crate: Cell): string | undefined {
  const [r, c] = crate;
  for (let y = r - 1; y >= 0; y--) {
    const d = model.devices.find((x) => x.kind === 'dispenser' && x.cells[0]![0] === y && x.cells[0]![1] === c);
    if (d) return d.id;
    if (symbolInfo(model.grid[y]?.[c] ?? '#')?.tile !== 'empty') return undefined;
  }
  return undefined;
}

/** The cell a recalled crate appears in: directly under its dispenser. */
export function dropCell(model: ChamberModel, dispenserId: string): Cell | undefined {
  const d = model.devices.find((x) => x.id === dispenserId && x.kind === 'dispenser');
  return d ? [d.cells[0]![0] + 1, d.cells[0]![1]] : undefined;
}
