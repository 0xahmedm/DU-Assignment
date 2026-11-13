/** One place for all bindings, so a live change in the follow-up call is a one-line edit. */
export const KEYMAP = {
  left: ['LEFT', 'A'],
  right: ['RIGHT', 'D'],
  up: ['UP', 'W'], // aim up (up-attack / up-Bolt)
  jump: ['SPACE', 'Z'],
  attack: ['X', 'J'],
  carry: ['C', 'K'], // pick up / put down
  throw: ['V', 'L'], // needs Throw
  bolt: ['F', 'I'], // needs Bolt
  dash: ['SHIFT', 'O'], // needs Dash
  reset: ['R'], // hold ~1 s
} as const;

export type Action = keyof typeof KEYMAP;
