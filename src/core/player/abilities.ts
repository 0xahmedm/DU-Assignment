import type { Ability } from '../chamber/types';
import { METRICS } from './metrics';

/**
 * The three permanent abilities (C23, C29), one per solved Medium, as the game announces them
 * (the unlock card, C117). The numbers come from METRICS, so the text can't drift from the
 * promises every layout is drawn against.
 */
export interface AbilityInfo {
  name: string;
  /** One line: what it does. */
  what: string;
}

export const ABILITY_INFO: Readonly<Record<Ability, AbilityInfo>> = {
  throw: { name: 'Throw', what: `Throw a carried crate: it always lands exactly ${METRICS.throwTiles} tiles ahead.` },
  bolt: { name: 'Bolt', what: 'Fire a bolt straight ahead (or up): it hits the first enemy or puzzle target.' },
  dash: { name: 'Dash', what: `Dash exactly ${METRICS.dashTiles} tiles, briefly invulnerable; once per jump.` },
};

export const ABILITIES: readonly Ability[] = ['throw', 'bolt', 'dash'];

/**
 * The abilities usable in a chamber (C121, the user's call, replacing C24's "exactly its kit"):
 * its declared kit (what it is proven solvable with) plus every ability the player owns.
 */
export function chamberKit(declared: readonly Ability[], owned: readonly Ability[]): Ability[] {
  return ABILITIES.filter((a) => declared.includes(a) || owned.includes(a));
}
