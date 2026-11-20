import type { ChamberDef } from '../../core/chamber/types';

/**
 * G-H "Handover" (Gates x Light; C107, rules C106). One beam can power gate 2 (Ma `/`, into r1) or
 * the exit (Ma `\`, through the light slots and gate 1 to r2), never both; the crate, which starts
 * in the sealed room, takes over r1's job. Gate 1 has only light slots beside it, so it carries the
 * beam but never a body (G5). Ma is hit with an up-attack from the floor. Seal 3 (C105).
 */
export const G_H: ChamberDef = {
  id: 'G-H',
  name: 'Handover',
  mechanic: 'gate',
  difficulty: 'hard',
  prerequisites: ['G-M', 'L-E'],
  kit: [],
  seal: 3,
  initialPhase: 'red',
  sections: [
    {
      id: 'A',
      grid: [
        '########v#######################',
        '#..............######..........#',
        '#..............######..........#',
        '#..............######..........#',
        '#..............######..........#',
        '#..............######..........#',
        '#..............######..........#',
        '#..............######..........#',
        '#..............######..........#',
        'o.......\\.......1##1...........o',
        'D...........2..#1##1#..2.......E',
        'DS..p.......2..######..2...C...E',
        '################################',
      ],
    },
  ],
  names: { 'A:9,0': 'r1', 'A:9,31': 'r2', 'A:9,8': 'Ma' },
  links: [
    { from: ['r1', 'p'], to: '2' },
    { from: 'r2', to: 'exit' },
  ],
  solution: [
    'At the start Ma sends the beam through gate 1 to r2: the exit is open, but gate 2 is off and the sealed room is out of reach.',
    'Hit Ma (up-attack from the floor): the beam turns into r1 and gate 2 turns on.',
    'Walk through gate 2 into the sealed room and carry the crate back through it.',
    'Put the crate on p: gate 2 now has a second power source.',
    'Hit Ma again: the beam goes through gate 1 and lights r2, so the exit opens, and the crate keeps gate 2 on. Walk through gate 2 and out.',
  ],
  intendedFeeling: '"One beam can\'t do both jobs, so the crate takes one over."',
  cratesCannotBeLost: 'No pits or hazards: the crate cannot be lost; hold-R reset covers misplacement.',
};
