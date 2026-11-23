import type { Ability } from '../../core/chamber/types';
import { KEYMAP, type Action } from './keymap';

/**
 * Controls written out (C111), built from KEYMAP so the menu's Controls screen and the in-game line
 * can never disagree with the real bindings.
 */
const KEY_NAMES: Record<string, string> = { LEFT: '←', RIGHT: '→', UP: '↑', DOWN: '↓', SPACE: 'Space', SHIFT: 'Shift' };
const keyName = (k: string) => KEY_NAMES[k] ?? k;

/** "← / A" style: every key bound to the action. */
export const keysOf = (action: Action): string => KEYMAP[action].map(keyName).join(' / ');
/** Left and right together: "← → / A D". */
const moveKeys = (): string => KEYMAP.left.map((k, i) => `${keyName(k)} ${keyName(KEYMAP.right[i] ?? '')}`).join(' / ');

export interface ControlRow {
  action: string;
  keys: string;
  /** Only once the ability is unlocked (then everywhere, C121). */
  ability?: Ability;
}

/** Every control, in the order a player learns them. */
export const CONTROL_ROWS: readonly ControlRow[] = [
  { action: 'Move', keys: moveKeys() },
  { action: 'Jump (hold = higher)', keys: keysOf('jump') },
  { action: 'Attack (hold ↑ / W: up)', keys: keysOf('attack') },
  { action: 'Pick up / put down a crate', keys: keysOf('carry') },
  { action: 'Throw a crate', keys: keysOf('throw'), ability: 'throw' },
  { action: 'Bolt (hold ↑ / W: up)', keys: keysOf('bolt'), ability: 'bolt' },
  { action: 'Dash', keys: keysOf('dash'), ability: 'dash' },
  { action: 'Interact (take an upgrade)', keys: keysOf('interact') },
  { action: 'Reset the chamber', keys: `hold ${keysOf('reset')}` },
  { action: 'Menu', keys: 'Esc' },
  { action: 'Sound on / off', keys: 'M' },
];

/**
 * The one-line reminder shown in game: the base controls plus the abilities usable here, and
 * the interact key where there is something to interact with (a reward room).
 */
export function controlsLine(kit: ReadonlySet<Ability>, interact = false): string {
  const parts = [
    `move ${moveKeys()}`,
    `jump ${keysOf('jump')}`,
    `attack ${keysOf('attack')} (+↑ up)`,
    `carry ${keysOf('carry')}`,
  ];
  if (kit.has('throw')) parts.push(`throw ${keysOf('throw')}`);
  if (kit.has('bolt')) parts.push(`bolt ${keysOf('bolt')}`);
  if (kit.has('dash')) parts.push(`dash ${keysOf('dash')}`);
  if (interact) parts.push(`interact ${keysOf('interact')}`);
  return parts.join('   ');
}
