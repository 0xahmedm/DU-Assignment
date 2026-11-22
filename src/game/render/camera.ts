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

/**
 * Camera bounds for the band between the HUD bars (C116): the top bar (title, hearts) and the
 * bottom bar (controls) are opaque, so the world is laid out in the band between them. A world
 * shorter than the band is centred in it; a taller one can scroll until its top row sits just under
 * the top bar and its bottom row just above the bottom bar, so nothing is ever hidden behind text.
 * Horizontally it is centredBounds.
 */
export function bandBounds(worldW: number, worldH: number, viewW: number, viewH: number, top: number, bottom: number): Rect {
  const band = viewH - top - bottom;
  const x = centredBounds(worldW, worldH, viewW, viewH);
  if (worldH <= band) return { x: x.x, width: x.width, y: -(top + (band - worldH) / 2), height: viewH };
  return { x: x.x, width: x.width, y: -top, height: worldH + top + bottom };
}
