import type { ChamberDef, ChamberId } from '../../core/chamber/types';
import { P_E } from './P-E';
import { W_M } from './W-M';
import { W_E } from './W-E';

/** All chambers entered so far (the rest are added on Days 3-4; see docs/tasks.md). */
export const CHAMBERS: Partial<Record<ChamberId, ChamberDef>> = {
  'W-E': W_E,
  'W-M': W_M,
  'P-E': P_E,
};

/** Level-select layout (C53): rows = mechanic, columns = difficulty. */
export const CHAMBER_GRID: readonly (readonly ChamberId[])[] = [
  ['W-E', 'W-M', 'W-H'],
  ['L-E', 'L-M', 'L-H'],
  ['P-E', 'P-M', 'P-H'],
];
