import { describe, expect, it } from 'vitest';
import { ABILITY_INFO, chamberKit } from '../../src/core/player/abilities';
import { METRICS } from '../../src/core/player/metrics';

describe('abilities (C117, C121)', () => {
  it('a chamber gives its declared kit plus every owned ability, in a fixed order', () => {
    expect(chamberKit([], [])).toEqual([]);
    expect(chamberKit(['bolt'], [])).toEqual(['bolt']); // L-H's own kit, nothing owned yet
    expect(chamberKit([], ['dash', 'throw'])).toEqual(['throw', 'dash']); // owned abilities work in L-E too
    expect(chamberKit(['dash', 'bolt'], ['throw', 'bolt'])).toEqual(['throw', 'bolt', 'dash']); // no duplicates
  });

  it("the unlock card's numbers are the movement promises", () => {
    expect(ABILITY_INFO.throw.what).toContain(`${METRICS.throwTiles} tiles`);
    expect(ABILITY_INFO.dash.what).toContain(`${METRICS.dashTiles} tiles`);
  });
});
