import type { ChamberDef } from '../../core/chamber/types';

/**
 * P-H "Eclipse", the final chamber (concept C45, layout C49, revision C56). Grid from the decision
 * log with the Day 4 fix approved before building (C99):
 * - The walker sits in a sealed pocket in the ground under the right floor (red roof over the
 *   plate strip `qqq`); the raised box of C56 could be reached with jump + Dash.
 * - Two "housing" blocks beside the high mirror's column (rows 3-4, cols 22-23) keep every jump
 *   and Dash too far for a melee swing: the mirror is Bolt-only, and in Blue the blue block
 *   shadows the up-Bolt as well as the beam.
 * - C100: plate p moved from col 18 to col 27. Beside the low tier, a crate on p blocked the way
 *   back to the chasm (the player cannot hop it under the tier), so the Dash home was unreachable.
 * C105: the Gates Hard joined the prerequisites and Eclipse restores the fourth (last) seal.
 * Data-entry note: the draft had no start symbol; `S` is on the entry shelf (row 2, col 1).
 */
export const P_H: ChamberDef = {
  id: 'P-H',
  name: 'Eclipse',
  mechanic: 'phase',
  difficulty: 'hard',
  prerequisites: ['P-M', 'W-H', 'L-H', 'G-H'],
  kit: ['dash', 'bolt'],
  seal: 4,
  initialPhase: 'red',
  sections: [
    {
      id: 'A',
      grid: [
        '################################',
        'D.......................o......#',
        'DS....................../...R..<',
        '###...................##.......#',
        '#.....................##B......#',
        '#..............................#',
        '#...................*..........#',
        '#..............................#',
        '#U.................###.........#',
        'E..............................#',
        'EC.........................p...#',
        '###########RRRRR################',
        '###########.....#########.w.####',
        '###########.....#########RRR####',
        '###########....##########qqq####',
        '###########....#################',
        '###########....#################',
        '################################',
      ],
    },
  ],
  names: { 'A:2,24': 'mirror', 'A:1,24': 'receiver', 'A:6,20': 'crystal' },
  links: [{ from: ['receiver', 'p', 'q'], to: 'exit' }],
  solution: [
    'Drop from the entry shelf. The exit (left) has three lamps: the beam receiver, plate p and the walker plate qqq.',
    'Carry the crate across the red bridge, under the tier, and put it on p (right part of the floor).',
    'Stand under the high mirror and up-Bolt it while Red (in Blue the blue block shadows the shot as well as the beam).',
    'Climb the tier and hit the crystal → Blue: the red shutter opens and the beam reaches the receiver; the walker drops onto qqq; the bridge vanishes. All three lamps light.',
    'Jump + Dash back across the 5-tile chasm to the exit (swapping back to Red would close the shutter and put the beam lamp out).',
  ],
  intendedFeeling: 'The finale\'s dilemma: "light needs Blue, the bridge needs Red", resolved by an ability you earned.',
};
