import type { ChamberDef } from '../../core/chamber/types';

/**
 * P-M "Footing" (approved C44, layout C47, front-armoured bridge enemy C48). Grids copied from the
 * decision log. Data-entry notes (symbols only, no design change): the bridge enemy is drawn `w`
 * in the draft and entered as `H` (Shieldbearer, C48); the exit has no inputs (reaching it is the
 * goal), so it is declared a plain doorway.
 * C94: the phase is shared by the whole chamber (C28) and the tower needs Blue, so the
 * Shieldbearer always falls into the chasm during the tower climb; the bridge step is "swap back
 * to Red to restore the bridge". C95: the right half of the chasm is one tile deeper (exit-side
 * wall 4 high), so the exit cannot be reached through the chasm in Blue; falls still escape to the
 * entry ledge.
 */
export const P_M: ChamberDef = {
  id: 'P-M',
  name: 'Footing',
  mechanic: 'phase',
  difficulty: 'medium',
  prerequisites: ['P-E'],
  kit: [],
  grants: 'dash',
  initialPhase: 'red',
  sections: [
    {
      id: 'T',
      grid: [
        '################',
        '#..............|',
        '#..............|',
        '#..........#####',
        '#..............#',
        '#..............#',
        '#......BBBB....#',
        '#..............#',
        '#..........*...#',
        '#...........#..#',
        '#..............#',
        '#.......RRRR...#',
        '#..............#',
        '#....*.........#',
        '#.....#........#',
        '#..............#',
        '#.BBBB.........#',
        'D........*.....#',
        'DS.............#',
        '################',
      ],
    },
    {
      id: 'B',
      attach: { at: [6, 0], onto: [1, 15] },
      grid: [
        '########################',
        '################.......#',
        '################.......#',
        '################.......#',
        '################.......#',
        '#......................#',
        '|.*.......H............E',
        '|...RRRRRRRRRRRR.......E',
        '####............########',
        '####............########',
        '####............########',
        '##########......########',
        '########################',
      ],
    },
  ],
  names: { 'T:17,9': 'crystalFloor', 'T:13,5': 'crystalLow', 'T:8,11': 'crystalHigh', 'B:6,2': 'crystalBridge' },
  links: [],
  exitAlwaysOpen: 'The design has no exit inputs: crossing the bridge to the exit is the goal.',
  solution: [
    'Tower: hit the floor crystal (the floor is neutral, so it is safe) → Blue.',
    'Climb the blue platform. Its crystal is right above your head, and hitting it from there removes your footing: step onto the 1-tile neutral nub instead and hit the crystal sideways → Red.',
    'Climb the red platform. Same trap, mirrored: use the next neutral nub → Blue.',
    'Climb the blue platform to the exit ledge and go through the doorway.',
    'Bridge: hit the crystal on the entry ledge → Blue: the Shieldbearer falls into the sealed chasm.',
    'Hit it again → Red: the bridge returns, empty. Walk across to the exit.',
  ],
  intendedFeeling: '"Where I stand when I swap matters", then "the swap reshapes the room for everyone in it".',
};
