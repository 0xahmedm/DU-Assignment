import Phaser from 'phaser';
import type { Box } from '../../core/combat/melee';
import { stepWalker, WALKER, type WalkerWorld } from '../../core/enemies/walker';
import { DEFAULT_MOVEMENT } from '../../core/player/movement';
import { PALETTE } from '../render/palette';

/**
 * Phaser adapter for the walker (C59). Physics handles gravity and collisions; core/enemies/walker
 * decides the patrol. Combat (2 hits, respawn, contact costs a heart) arrives on Day 4.
 */
export class Walker {
  readonly rect: Phaser.GameObjects.Rectangle;
  readonly body: Phaser.Physics.Arcade.Body;
  private readonly eye: Phaser.GameObjects.Rectangle;
  private dir: 1 | -1 = 1;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    this.rect = scene.add.rectangle(x, y, WALKER.width, WALKER.height, PALETTE.enemy).setDepth(9);
    scene.physics.add.existing(this.rect);
    this.body = this.rect.body as Phaser.Physics.Arcade.Body;
    this.body.setGravityY(DEFAULT_MOVEMENT.gravityDown);
    this.body.setMaxVelocityY(DEFAULT_MOVEMENT.maxFallSpeed);
    this.body.pushable = false;
    this.eye = scene.add.rectangle(x, y, 5, 7, PALETTE.background).setDepth(9);
  }

  bounds(): Box {
    return { left: this.body.left, top: this.body.top, right: this.body.right, bottom: this.body.bottom };
  }

  /** One fixed physics step. */
  step(world: WalkerWorld): void {
    const b = this.body;
    const grounded = b.blocked.down || b.touching.down;
    const blockedAhead = this.dir === 1 ? b.blocked.right || b.touching.right : b.blocked.left || b.touching.left;
    const next = stepWalker(this.bounds(), this.dir, grounded, blockedAhead, world);
    this.dir = next.dir;
    b.setVelocityX(next.vx);
  }

  render(): void {
    this.eye.setPosition(this.rect.x + 6 * this.dir, this.rect.y - 4);
  }
}
