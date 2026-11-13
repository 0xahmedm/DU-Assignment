/**
 * Movement test room (Day 2). Lets anyone verify the C29 metrics by hand:
 *  - pillars 2 / 3 / 4 tiles high: a full jump clears 2 and 3 but not 4;
 *    while carrying the crate (C, next to the 3-wide pit), 2 but not 3;
 *  - pits 3 / 4 / 5 tiles wide: a running jump clears 3 and 4 but not 5;
 *    while carrying, 3 but not 4.
 *  - Throw (lands exactly 5 tiles ahead): carry the crate over the 3-wide pit, stand on the last
 *    tile before the 4-wide pit and throw: it lands on the first tile past it. Thrown from the
 *    last tile before the 5-wide pit, it falls in.
 * Pits are 2 deep, so falling in is always escapable.
 */
export const MOVEMENT_TEST_ROOM = {
  id: 'movement-test',
  grid: [
    '################################################',
    '#..............................................#',
    '#..............................................#',
    '#..............................................#',
    '#..............................................#',
    '#..............................................#',
    '#..............................................#',
    '#..............................................#',
    '#..............................................#',
    '#..............................................#',
    '#..............................................#',
    '#.............##...............................#',
    '#........##...##...............................#',
    '#...##...##...##...............................#',
    '#.S.##...##...##.C.............................#',
    '####################...###....###.....##########',
    '####################...###....###.....##########',
    '################################################',
  ],
  labels: [
    { col: 4, row: 12, text: '2' },
    { col: 9, row: 11, text: '3' },
    { col: 14, row: 10, text: '4' },
    { col: 21, row: 13, text: 'gap 3' },
    { col: 27, row: 13, text: 'gap 4' },
    { col: 35, row: 13, text: 'gap 5' },
    { col: 16, row: 12, text: 'crate' },
    { col: 23, row: 12, text: 'throw' },
  ],
} as const;
