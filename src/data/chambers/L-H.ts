import type { ChamberDef } from '../../core/chamber/types';

/**
 * L-H "Chain Reaction" (concept C38, layout C42, recovery C41). Grid from the decision log with
 * the Day 4 revisions approved before building:
 * - C97: the walker starts caged on top of the trapdoor (literal walker rule C91), so it drops
 *   onto `b` whenever the trapdoor opens, with no timing.
 * - C98: the left shaft is five alternating 3-high steps (the Day 1 shaft could not be climbed).
 * Mirrors: Mh (high, Bolt-only), Mc (corner), Mb (locked to plate b), Ma (locked to plate a).
 */
export const L_H: ChamberDef = {
  id: 'L-H',
  name: 'Chain Reaction',
  mechanic: 'light',
  difficulty: 'hard',
  prerequisites: ['L-M', 'W-E'],
  kit: ['bolt'],
  seal: 2,
  initialPhase: 'red',
  sections: [
    {
      id: 'A',
      grid: [
        '##########################',
        '#.........o.........######',
        'E........./........\\######',
        'E.........#.........######',
        '###.................######',
        '#...................######',
        '#..............#w#..######',
        '#..##..........#=##.######',
        '#...................######',
        '#...................######',
        '###.................######',
        '#.............#bbb#.######',
        '#....##############.######',
        '#..###....U..............#',
        '#....#.............\\.....<',
        '#....#...................#',
        '###..o.............\\...a.#',
        'D.....................####',
        'DS........C...........####',
        '##########################',
      ],
    },
  ],
  names: {
    'A:2,10': 'Mh',
    'A:2,19': 'Mc',
    'A:14,19': 'Mb',
    'A:16,19': 'Ma',
    'A:1,10': 'receiverTop',
    'A:16,5': 'receiverExit',
    'A:7,16': 'trapdoor',
  },
  links: [
    { from: 'receiverTop', to: 'trapdoor' },
    { from: 'b', to: 'Mb' },
    { from: 'a', to: 'Ma' },
    { from: 'receiverExit', to: 'exit' },
  ],
  solution: [
    'The beam climbs the light column to the corner mirror, runs along the top and hits the high mirror, which points it into a stopper.',
    'Fetch the crate and carry it right, under the mirrors, up the 2-high step; put it on plate a (its mirror Ma turns; no beam reaches it yet).',
    'Climb the left shaft (alternating 3-high steps) to the Bolt ledge beside the exit.',
    'Bolt right along the top: the high mirror flips, the beam lights the receiver above it, the trapdoor opens and the caged walker drops onto plate b.',
    'Plate b turns Mb: the beam drops down the light column to Ma (crate) and runs left into the exit receiver. The exit, right beside you, opens.',
    'Wrong order (Bolt before the crate): the rerouted beam fences the a step. Undo: Bolt the high mirror back, kill the walker in the pen (it respawns caged), place the crate, Bolt again; or hold R.',
  ],
  intendedFeeling: 'Setting up a Rube Goldberg machine: "one shot, and everything I prepared falls into place."',
};
