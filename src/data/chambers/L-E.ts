import type { ChamberDef } from '../../core/chamber/types';

/**
 * L-E "First Light" (concept C36, layout C39). Grids copied from the decision log.
 * Data-entry fix (drawing error, no design change): section B row 6 was drawn 19 tiles wide; one
 * `.` is added so the emitter sits on the right wall (col 19) and the mirror stays at col 10, as
 * the layout text describes. Found by the parser's row-width check.
 */
export const L_E: ChamberDef = {
  id: 'L-E',
  name: 'First Light',
  mechanic: 'light',
  difficulty: 'easy',
  prerequisites: [],
  kit: [],
  initialPhase: 'red',
  sections: [
    {
      id: 'A',
      grid: [
        '####################',
        '#.........v........#',
        '#..................#',
        '#..................#',
        '#..................#',
        '#..................#',
        '#..................#',
        '#..................#',
        'o.........\\........#',
        'D..................|',
        'DS.................|',
        '####################',
      ],
    },
    {
      id: 'B',
      attach: { at: [9, 0], onto: [9, 19] },
      grid: [
        '####################',
        '#.........o........#',
        '#..................#',
        '#..................#',
        '#..................#',
        '#..................#',
        '#........./........<',
        '#..................#',
        '#......###.........#',
        '|..................E',
        '|..................E',
        '####################',
      ],
    },
  ],
  names: { 'A:8,0': 'receiverA', 'A:9,19': 'doorAB', 'A:8,10': 'mirrorA', 'B:1,10': 'receiverB', 'B:6,10': 'mirrorB' },
  links: [
    { from: 'receiverA', to: 'doorAB' },
    { from: 'receiverB', to: 'exit' },
  ],
  solution: [
    'A: the beam falls onto the mirror and is reflected into the wall, just above head height.',
    'A: stand under the mirror and up-attack: the beam turns left into the receiver; the door opens.',
    'B: the mirror sends the beam down across the walkway, a barrier that pushes you back.',
    'B: climb the floating platform and forward-attack the mirror: the beam turns up into the receiver; the exit opens and the walkway clears.',
    'B: drop off the platform and walk under it to the exit.',
  ],
  intendedFeeling: 'Wonder, then understanding: "light goes where I point it, and where light goes I cannot walk."',
};
