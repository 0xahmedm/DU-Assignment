import type { ChamberDef } from '../../core/chamber/types';

/**
 * W-E "First Weight" (approved C31). Grids copied from the decision log.
 * Data-entry notes (symbols only, no design change): section B's plate is `q` (the draft reused `p`,
 * and a repeated letter means one combined plate strip).
 */
export const W_E: ChamberDef = {
  id: 'W-E',
  name: 'First Weight',
  mechanic: 'weight',
  difficulty: 'easy',
  prerequisites: [],
  kit: [],
  initialPhase: 'red',
  sections: [
    {
      id: 'A',
      grid: [
        '####################',
        '#..................#',
        '#..................#',
        '#..................#',
        '#..................#',
        '#..................#',
        '#..................#',
        '#...........C......#',
        '#..........######..#',
        'D..................|',
        'D.S.....p..........|',
        '####################',
      ],
    },
    {
      id: 'B',
      attach: { at: [9, 0], onto: [9, 19] },
      grid: [
        '####################',
        '#...U..............#',
        '#..................#',
        '#..................#',
        '#..................#',
        '#..................#',
        '#..................E',
        '#........###...q...E',
        '#............#######',
        '|......##....#######',
        '|...C..##....#######',
        '####################',
      ],
    },
  ],
  names: { 'A:9,19': 'doorAB' },
  links: [
    { from: 'p', to: 'doorAB' },
    { from: 'q', to: 'exit' },
  ],
  solution: [
    'A: stand on the plate; the door opens, and closes again when you step off (it is too far to reach in time).',
    'A: jump onto the 3-high ledge, carry the crate down and put it on the plate; walk through the door.',
    'B: the plate is on a 3-high plateau you cannot climb while carrying (carry jump = 2).',
    'B: carry the crate up the 2-high step, onto the walkway, drop onto the plateau, put it on the plate; exit.',
  ],
  intendedFeeling:
    'Calm discovery: "a plate opens a door, but only while something heavy stays on it", then "carrying makes me weaker".',
  cratesCannotBeLost: 'Section A has no pits or hazards, so its crate cannot be lost; hold-R reset covers misplacement.',
};
