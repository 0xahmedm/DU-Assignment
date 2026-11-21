import type { ChamberDef } from '../../core/chamber/types';

/**
 * G-M "Gatekeeper" (C107; rules C106). Gates carry enemies too, and a plate can turn a gate pair
 * on. The walker paces a sealed pen past gate 2; the twin stands on a pillar between two slots that
 * both hold plate a, so whichever way the walker walks in, it drops onto a and keeps gate 1 on.
 * Grants nothing (C105).
 */
export const G_M: ChamberDef = {
  id: 'G-M',
  name: 'Gatekeeper',
  mechanic: 'gate',
  difficulty: 'medium',
  prerequisites: ['G-E'],
  kit: [],
  enemiesUsed: 1, // the walker delivered onto a (C109): it need not be defeated
  initialPhase: 'red',
  sections: [
    {
      id: 'A',
      grid: [
        '##############################',
        '##############################',
        '###....2.###.2.###############',
        '###.w..2.###.2.###############',
        '############a#a###############',
        '##############################',
        '#.................##.........#',
        '#.................##.........#',
        '#.................##.........#',
        'D..............1..##.1.......E',
        'DS.C...c.......1..##.1.x.....E',
        '##############################',
      ],
    },
  ],
  links: [
    { from: 'c', to: '2' },
    { from: 'a', to: '1' },
    { from: 'x', to: 'exit' },
  ],
  solution: [
    'Stand on c (or put the crate on it): gate pair 2 turns on, and the next time the walker paces through gate 2 it drops out beside the twin onto a.',
    'Plate a turns gate pair 1 on for good: the walker cannot leave its slot.',
    'Carry the crate through gate 1 into the sealed room.',
    'Put the crate on x: the exit opens.',
  ],
  intendedFeeling: '"I opened the door for the enemy, and now it holds my door open."',
  cratesCannotBeLost: 'No pits or hazards: the crate cannot be lost; hold-R reset covers misplacement.',
};
