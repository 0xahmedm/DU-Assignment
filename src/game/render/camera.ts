/**
 * Camera bounds that centre a world smaller than the screen (Day 2 polish note). Phaser clamps
 * the camera to its bounds, so with bounds equal to a small world the world sits in the top-left
 * corner and leaves an empty band (below W-E, beside W-M). Widening the bounds to at least the
 * view, centred on the world, puts the world in the middle; along an axis where the world is
 * larger than the view nothing changes and the camera still follows the player. No Phaser here.
 */
export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export function centredBounds(worldW: number, worldH: number, viewW: number, viewH: number): Rect {
  return {
    x: worldW < viewW ? (worldW - viewW) / 2 : 0,
    y: worldH < viewH ? (worldH - viewH) / 2 : 0,
    width: Math.max(worldW, viewW),
    height: Math.max(worldH, viewH),
  };
}
