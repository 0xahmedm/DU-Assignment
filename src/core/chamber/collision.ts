/** Which sides of a solid cell can be collided with. */
export interface Faces {
  up: boolean;
  down: boolean;
  left: boolean;
  right: boolean;
}

/**
 * The faces of a solid cell that touch a non-solid neighbour. Faces between two solid cells are
 * internal: if they stayed active, a body sliding along a wall would catch on the seam between
 * two stacked tiles (the physics engine resolves the vertical axis first and "lands" the player's
 * head on the lower tile's top edge). This is how tile engines avoid internal-edge snagging.
 *
 * `isSolid` must report the *current* state (closed doors, the active phase colour), so faces are
 * recomputed whenever solidity changes. Cells outside the grid count as solid.
 */
export function exposedFaces(r: number, c: number, isSolid: (r: number, c: number) => boolean): Faces {
  return {
    up: !isSolid(r - 1, c),
    down: !isSolid(r + 1, c),
    left: !isSolid(r, c - 1),
    right: !isSolid(r, c + 1),
  };
}
