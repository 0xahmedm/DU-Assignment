import Phaser from 'phaser';
import { TILE } from '../../core/player/metrics';
import { DEFAULT_MOVEMENT } from '../../core/player/movement';
import { PALETTE } from '../render/palette';

/** A carryable crate (C30): solid, falls with gravity, never pushed by the player. */
export class Crate {
  readonly rect: Phaser.GameObjects.Rectangle;
  readonly body: Phaser.Physics.Arcade.Body;
  carried = false;

  /** @param dispenser the dispenser that recalls this crate (C50), if it has one. */
  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    readonly dispenser?: string,
  ) {
    this.rect = scene.add
      .rectangle(x, y, TILE - 2, TILE - 2, PALETTE.weight)
      .setStrokeStyle(3, PALETTE.weightDark);
    scene.physics.add.existing(this.rect);
    this.body = this.rect.body as Phaser.Physics.Arcade.Body;
    this.body.setGravityY(DEFAULT_MOVEMENT.gravityDown);
    this.body.setMaxVelocityY(DEFAULT_MOVEMENT.maxFallSpeed);
    this.body.pushable = false; // the player can stand on crates without shoving them
  }

  pickUp(): void {
    this.carried = true;
    this.body.enable = false;
  }

  putDownAt(x: number, y: number): void {
    this.carried = false;
    this.body.enable = true;
    this.body.reset(x, y);
  }

  /** Dispenser recall (C50): the crate reappears at (x, y) and falls from there. */
  respawnAt(x: number, y: number): void {
    this.putDownAt(x, y);
    this.rect.setAlpha(0);
    this.rect.scene.tweens.add({ targets: this.rect, alpha: 1, duration: 180 });
  }
}
