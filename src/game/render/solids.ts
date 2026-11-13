import Phaser from 'phaser';
import { exposedFaces } from '../../core/chamber/collision';
import { TILE } from '../../core/player/metrics';
import { PALETTE } from './palette';

/**
 * Builds static collision from a text grid ('#' = solid) and draws it. One body per tile, with the
 * faces between solid tiles switched off (core/chamber/collision) so walls have no seams.
 */
export function buildSolids(scene: Phaser.Scene, grid: readonly string[]): Phaser.Physics.Arcade.StaticGroup {
  const group = scene.physics.add.staticGroup();
  const g = scene.add.graphics();
  const isSolid = (r: number, c: number) => (grid[r]?.[c] ?? '#') === '#';
  grid.forEach((row, y) => {
    for (let x = 0; x < row.length; x++) {
      if (row[x] !== '#') continue;
      const rect = scene.add.rectangle(x * TILE + TILE / 2, y * TILE + TILE / 2, TILE, TILE).setVisible(false);
      group.add(rect);
      Object.assign((rect.body as Phaser.Physics.Arcade.StaticBody).checkCollision, exposedFaces(y, x, isSolid));
      g.fillStyle(PALETTE.terrain, 1).fillRect(x * TILE, y * TILE, TILE, TILE);
      if (!isSolid(y - 1, x)) g.fillStyle(PALETTE.terrainEdge, 1).fillRect(x * TILE, y * TILE, TILE, 4);
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
