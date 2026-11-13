import Phaser from 'phaser';
import { TILE } from '../../core/player/metrics';
import { DEFAULT_MOVEMENT } from '../../core/player/movement';
import { PALETTE } from '../render/palette';

/** A carryable crate (C30): solid, falls with gravity, never pushed by the player. */
export class Crate {
  readonly rect: Phaser.GameObjects.Rectangle;
  readonly body: Phaser.Physics.Arcade.Body;
  carried = false;

  constructor(scene: Phaser.Scene, x: number, y: number) {
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
}
