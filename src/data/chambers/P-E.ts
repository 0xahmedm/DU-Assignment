import type { ChamberDef } from '../../core/chamber/types';

/**
 * P-E "First Phase" (approved C43, layout C46). Grids copied from the decision log.
 * C90: crystal added in section B's pit (row 9, col 8) so a fall in Red is never a dead end.
 * The exit has no inputs in the design (walking the blue platforms to it is the goal), so it is
 * declared a plain doorway.
 */
export const P_E: ChamberDef = {
  id: 'P-E',
  name: 'First Phase',
  mechanic: 'phase',
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
        '#..................|',
        '#..................|',
        '#..............#####',
        '#.........R........#',
        '#.........R........#',
        'D.......*.R.BB.....#',
        'DS........R.BB.....#',
        '####################',
      ],
    },
    {
      id: 'B',
      attach: { at: [4, 0], onto: [4, 19] },
      grid: [
        '########################',
        '#......................#',
        '#......................#',
        '#.........*............#',
        '|...*..................E',
        '|......................E',
        '####RRRRRR##BBBBBB######',
        '####......##......######',
        '#####.............######',
        '#####...*.........######',
        '#####.............######',
        '########################',
      ],
    },
  ],
  names: { 'A:9,8': 'crystalA', 'B:4,4': 'crystalNear', 'B:3,10': 'crystalFar', 'B:9,8': 'crystalPit' },
  links: [],
  exitAlwaysOpen: 'The design has no exit inputs: reaching the exit across the blue platforms is the puzzle.',
  solution: [
    'A: a 4-high red wall blocks the way. Hit the crystal: the wall turns to outline and the blue step becomes solid.',
    'A: climb the blue step (+2) and the ledge (+3) to the doorway.',
    'B: you arrive in Blue. From the start pillar, hit the near crystal: Red.',
    'B: walk the red platforms to the neutral block; up-attack its crystal: Blue.',
    'B: walk the blue platforms to the exit.',
    'Recovery: any fall lands in the pit; hit the pit crystal if needed (Blue), climb the step left of the pit back to the start pillar.',
  ],
  intendedFeeling:
    'Curiosity and a small "aha": "the outlines show what the other colour would give me", then "do not stand on the colour you are about to remove".',
};
