import type { ChamberDef } from '../../core/chamber/types';

/**
 * W-M "Borrowed Weight" (approved C32). Grid copied from the decision log.
 * Data-entry note (symbol only, no design change): the draft had no start symbol; `S` is placed
 * at row 14, col 1, next to the entry door.
 * C91 (literal walker rule): the walker turns at an open trapdoor, so it only drops in if the
 * trapdoor opens while the walker is over it.
 */
export const W_M: ChamberDef = {
  id: 'W-M',
  name: 'Borrowed Weight',
  mechanic: 'weight',
  difficulty: 'medium',
  prerequisites: ['W-E'],
  kit: [],
  grants: 'throw',
  initialPhase: 'red',
  sections: [
    {
      id: 'A',
      grid: [
        '########################',
        '#......................#',
        '#......................#',
        '#......................#',
        '####...................#',
        '#..K...................#',
        '#C.K....w..............#',
        '####=############......#',
        '####t############......#',
        '###################....#',
        '#......................#',
        '#......................#',
        '#...................####',
        'D......................E',
        'DS.....s..........x....E',
        '########################',
      ],
    },
  ],
  names: { 'A:7,4': 'trapdoor', 'A:5,3': 'doorK' },
  links: [
    { from: 's', to: 'trapdoor' },
    { from: 't', to: 'doorK' },
    { from: 'x', to: 'exit' },
  ],
  solution: [
    'The crate is locked in a cubby behind door K, which opens while plate t (in a slot under the trapdoor) is weighed down.',
    'Plate s opens the trapdoor. Watch the walker patrolling the gallery: step on s while it walks over the trapdoor, and it drops onto t; K opens.',
    'Step off s: the trapdoor closes over the walker, which stays on t.',
    'Climb the right shaft (+3, +3, +2) into the gallery, fetch the crate, drop down and put it on x: the exit opens.',
  ],
  intendedFeeling: '"The enemy is my second weight": using the level\'s inhabitant as a puzzle piece.',
  cratesCannotBeLost: 'No pits or hazards: the crate cannot be lost; hold-R reset covers misplacement.',
};
