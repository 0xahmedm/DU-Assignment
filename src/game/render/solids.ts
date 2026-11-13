import Phaser from 'phaser';
import { TILE } from '../../core/player/metrics';
import { PALETTE } from './palette';

/**
 * Builds static collision rectangles from a text grid ('#' = solid) and draws them.
 * Horizontal runs of solid tiles are merged into one body per run to keep the body count low.
 */
export function buildSolids(scene: Phaser.Scene, grid: readonly string[]): Phaser.Physics.Arcade.StaticGroup {
  const group = scene.physics.add.staticGroup();
  const g = scene.add.graphics();
  grid.forEach((row, y) => {
    let x = 0;
    while (x < row.length) {
      if (row[x] !== '#') { x++; continue; }
      const start = x;
      while (x < row.length && row[x] === '#') x++;
      const w = (x - start) * TILE;
      const rect = scene.add.rectangle(start * TILE + w / 2, y * TILE + TILE / 2, w, TILE);
      rect.setVisible(false);
      group.add(rect);
    }
    for (let cx = 0; cx < row.length; cx++) {
      if (row[cx] !== '#') continue;
      g.fillStyle(PALETTE.terrain, 1).fillRect(cx * TILE, y * TILE, TILE, TILE);
      const above = grid[y - 1]?.[cx];
      if (above !== '#') g.fillStyle(PALETTE.terrainEdge, 1).fillRect(cx * TILE, y * TILE, TILE, 4);
    }
  });
  group.refresh();
  return group;
}

/** Finds the first cell holding `ch`, as tile coordinates. */
export function findCell(grid: readonly string[], ch: string): { col: number; row: number } | undefined {
  for (let row = 0; row < grid.length; row++) {
    const col = grid[row]!.indexOf(ch);
    if (col >= 0) return { col, row };
  }
  return undefined;
}
