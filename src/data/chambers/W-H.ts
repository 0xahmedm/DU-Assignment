import type { ChamberDef } from '../../core/chamber/types';

/**
 * W-H "Drop Delivery" (approved C34). Grid copied from the decision log.
 * Data-entry note (symbols only, no design change): the draft's crystals `1` and `2` are entered as
 * `*` and named crystal1 / crystal2 (the legend has one crystal symbol).
 * C92 (user-approved revision): the right-hand climb is a diagonal staircase in a room widened
 * from 26 to 32 columns (step 17, ledge 15, blue 13 / 11 / 9), and L is extended to meet it. As
 * drawn on Day 1 the blue steps hung over each other's take-off spots and could not be climbed by
 * a 1.375-tile-tall player. The staircase starts at column 19 with a 1-tile gap after the bottom
 * step, so the exit floor and the left floor stay connected (no dead end). Left of column 19 is
 * unchanged.
 * C93: the dispenser stays out of melee reach; hold-R is the fallback for a stuck crate.
 */
export const W_H: ChamberDef = {
  id: 'W-H',
  name: 'Drop Delivery',
  mechanic: 'weight',
  difficulty: 'hard',
  prerequisites: ['W-M', 'P-E'],
  kit: ['throw'],
  seal: 1,
  initialPhase: 'red',
  sections: [
    {
      id: 'A',
      grid: [
        '################################',
        '######.........................#',
        '######.........................#',
        '######.........................#',
        '######.........................#',
        '######.........................#',
        '######............*............#',
        '######RRR....##############....#',
        '######x........................#',
        '#######.....................BB.#',
        '#######......#..w..#...........#',
        '#..U.........#RRRRR#......BB...#',
        '#............#yyyyy#...........#',
        '#............#######....BB.....#',
        '#..............................#',
        '#.....................##.......#',
        '#..............................#',
        'D..................##..........E',
        'DS.C............*..............E',
        '################################',
      ],
    },
  ],
  names: { 'A:18,16': 'crystal1', 'A:6,18': 'crystal2' },
  links: [{ from: ['x', 'y'], to: 'exit' }],
  solution: [
    'Hit crystal 1 → Blue: the walker drops onto y; the blue steps appear.',
    'Carry the crate up the diagonal staircase on the right (2-high steps; the top three are blue) to the ledge L.',
    'Hit crystal 2 → Red: the red platform appears across the 4-gap.',
    'Throw from L\'s left edge: the crate lands on the red platform (5 tiles ahead).',
    'Jump the 4-gap without the crate, carry it 2 tiles left over pocket x, put it down, jump back.',
    'Hit crystal 2 → Blue: the crate drops onto x; the exit opens.',
    'Walk down the staircase to the exit.',
  ],
  intendedFeeling: 'Planning a delivery: "throw in Red, drop in Blue", and "the ledge only exists via Blue".',
};
