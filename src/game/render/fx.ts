import Phaser from 'phaser';
import { PALETTE } from './palette';

/**
 * Small particle effects shared by the player, crates and the chamber (C52, C58): dust at the
 * feet, sparks on a device that changes state. Plain rectangles with tweens: no assets.
 */

/**
 * Dust kicked up along a floor at (x, y): bits start at the edges of something `halfWidth` wide
 * (a foot, a crate), drift sideways and up, then fade.
 */
export function dust(scene: Phaser.Scene, x: number, y: number, count = 6, spread = 14, halfWidth = 6, color: number = PALETTE.dust): void {
  for (let i = 0; i < count; i++) {
    const side = i % 2 === 0 ? -1 : 1;
    const bit = scene.add.rectangle(x + side * (halfWidth + Math.random() * 3), y - 2, 4, 4, color).setDepth(11);
    scene.tweens.add({
      targets: bit,
      x: bit.x + side * (spread * (0.5 + Math.random() * 0.8)),
      y: bit.y - 4 - Math.random() * 8,
      alpha: 0,
      scale: 0.4,
      duration: 220 + Math.random() * 120,
      onComplete: () => bit.destroy(),
    });
  }
}

/** Sparks rising from a device cell that just changed (a door opening, a receiver lighting up). */
export function sparks(scene: Phaser.Scene, x: number, y: number, color: number, count = 6): void {
  for (let i = 0; i < count; i++) {
    const bit = scene.add.rectangle(x + (Math.random() - 0.5) * 20, y + (Math.random() - 0.5) * 20, 3, 3, color).setDepth(12);
    scene.tweens.add({
      targets: bit,
      y: bit.y - 10 - Math.random() * 12,
      alpha: 0,
      duration: 280 + Math.random() * 160,
      onComplete: () => bit.destroy(),
    });
  }
}
