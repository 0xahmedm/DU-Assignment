import type { ChamberDef } from '../../core/chamber/types';

/**
 * G-E "First Gate" (C107; rules C106). Teaches the gate rule on its own: what goes into one gate
 * comes out of the other, both ways, carrying a crate too.
 */
export const G_E: ChamberDef = {
  id: 'G-E',
  name: 'First Gate',
  mechanic: 'gate',
  difficulty: 'easy',
  prerequisites: [],
  kit: [],
  initialPhase: 'red',
  sections: [
    {
      id: 'A',
      grid: [
        '############################',
        '#.............##...........#',
        '#.............##...........#',
        '#.............##...........#',
        'D.........1...##...1.......E',
        'DS...a....1...##...1...C...E',
        '############################',
      ],
    },
  ],
  links: [{ from: 'a', to: 'exit' }],
  solution: [
    'The exit is behind a wall that reaches the ceiling, and the only crate is on that side too.',
    'Walk into gate 1: you come out of its twin, beside the crate.',
    'Pick up the crate and walk back into the twin: you come out of the first gate, carrying it.',
    'Put the crate on a: the exit opens. Walk through the gate once more and out.',
  ],
  intendedFeeling: '"That frame is a door through the wall": what goes in here comes out there, both ways.',
  cratesCannotBeLost: 'No pits or hazards: the crate cannot be lost; hold-R reset covers misplacement.',
};
