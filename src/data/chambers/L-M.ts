import type { ChamberDef } from '../../core/chamber/types';

/**
 * L-M "Order of Light" (concept C37, layout C40). Grid copied from the decision log.
 * C96 (user-approved): the small step beside M1 moved one tile left (row 12, cols 15-16). As drawn
 * it ended right under M1, which hangs one tile above it, so the 1.375-tile body could not get
 * down past M1 to the exit floor: the exit was unreachable.
 */
export const L_M: ChamberDef = {
  id: 'L-M',
  name: 'Order of Light',
  mechanic: 'light',
  difficulty: 'medium',
  prerequisites: ['L-E'],
  kit: [],
  grants: 'bolt',
  initialPhase: 'red',
  sections: [
    {
      id: 'A',
      grid: [
        '########################',
        '##o................#####',
        '##.................#####',
        '##.................#####',
        '##.................#####',
        '##.................#####',
        '##.................#####',
        '##/.............../#####',
        '##.######..#######.#####',
        '#..................#####',
        '#................./....<',
        'D........##............E',
        'DS.......##....##......E',
        '########################',
      ],
    },
  ],
  names: { 'A:10,18': 'M1', 'A:7,18': 'M2', 'A:7,2': 'M3', 'A:1,2': 'receiver' },
  links: [{ from: 'receiver', to: 'exit' }],
  solution: [
    'The beam from the right hits M1 and drops a light barrier in front of the exit; all three mirrors start wrong.',
    'Climb the step and jump up through the hole in the gallery floor.',
    'Walk left along the gallery and flip M3 (far end).',
    'Walk right and flip M2 (no beam reaches it yet).',
    'Drop down, climb the small step next to M1 and flip it (forward attack): the beam climbs to M2, runs along the gallery, turns up at M3 into the receiver. The barrier is gone: walk to the exit.',
    'Wrong order: with M1 and M2 set before M3, the beam fills the gallery walkway and M3 is out of reach; flip M1 back from its step.',
  ],
  intendedFeeling: '"Set the far mirror before the light fills the path to it": planning the order, not the aim.',
};
