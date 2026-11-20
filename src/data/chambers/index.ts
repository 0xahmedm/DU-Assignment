import type { ChamberDef, ChamberId } from '../../core/chamber/types';
import { L_E } from './L-E';
import { L_H } from './L-H';
import { L_M } from './L-M';
import { P_E } from './P-E';
import { P_H } from './P-H';
import { P_M } from './P-M';
import { W_H } from './W-H';
import { W_M } from './W-M';
import { W_E } from './W-E';
import { G_E } from './G-E';
import { G_H } from './G-H';
import { G_M } from './G-M';

/** Every chamber: three mechanics from Day 1 plus Gates (C104). */
export const CHAMBERS: Partial<Record<ChamberId, ChamberDef>> = {
  'W-E': W_E,
  'W-M': W_M,
  'W-H': W_H,
  'L-E': L_E,
  'L-M': L_M,
  'L-H': L_H,
  'P-E': P_E,
  'P-M': P_M,
  'P-H': P_H,
  'G-E': G_E,
  'G-M': G_M,
  'G-H': G_H,
};

/** Level-select layout (C53): rows = mechanic, columns = difficulty. */
export const CHAMBER_GRID: readonly (readonly ChamberId[])[] = [
  ['W-E', 'W-M', 'W-H'],
  ['L-E', 'L-M', 'L-H'],
  ['P-E', 'P-M', 'P-H'],
  ['G-E', 'G-M', 'G-H'],
];
