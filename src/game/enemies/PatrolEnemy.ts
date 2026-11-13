import Phaser from 'phaser';
import type { Box } from '../../core/combat/melee';
import { SHIELDBEARER } from '../../core/enemies/shieldbearer';
import { stepPatrol, WALKER, type WalkerWorld } from '../../core/enemies/walker';
import { DEFAULT_MOVEMENT } from '../../core/player/movement';
import { PALETTE } from '../render/palette';

/** What differs between patrolling enemies. Behaviour itself is shared (core/enemies/walker). */
export interface PatrolKind {
  width: number;
  height: number;
  speed: number;
  /** Shieldbearer: a shield bar on its front (C52: "armoured enemy shows a front shield"). */
  shield: boolean;
}

export const WALKER_KIND: PatrolKind = { ...WALKER, shield: false };
export const SHIELDBEARER_KIND: PatrolKind = { ...SHIELDBEARER, shield: true };

/**
 * Phaser adapter for a patrolling enemy (walker or Shieldbearer). Physics handles gravity and
 * collisions; core/enemies/walker decides the patrol. Combat arrives on Day 4.
 */
export class PatrolEnemy {
  readonly rect: Phaser.GameObjects.Rectangle;
  readonly body: Phaser.Physics.Arcade.Body;
  private readonly eye: Phaser.GameObjects.Rectangle;
  private readonly shield: Phaser.GameObjects.Rectangle | undefined;
  private dir: 1 | -1 = 1;

  constructor(
    scene: Phaser.Scene,
    x: number,
    bottomY: number,
    readonly kind: PatrolKind,
  ) {
    const y = bottomY - kind.height / 2;
    this.rect = scene.add.rectangle(x, y, kind.width, kind.height, PALETTE.enemy).setDepth(9);
    scene.physics.add.existing(this.rect);
    this.body = this.rect.body as Phaser.Physics.Arcade.Body;
    this.body.setGravityY(DEFAULT_MOVEMENT.gravityDown);
    this.body.setMaxVelocityY(DEFAULT_MOVEMENT.maxFallSpeed);
    this.body.pushable = false;
    this.eye = scene.add.rectangle(x, y, 5, 7, PALETTE.background).setDepth(9);
    this.shield = kind.shield
      ? scene.add.rectangle(x, y, 6, kind.height - 6, PALETTE.lightCore).setStrokeStyle(2, PALETTE.dim).setDepth(9)
      : undefined;
  }

  bounds(): Box {
    return { left: this.body.left, top: this.body.top, right: this.body.right, bottom: this.body.bottom };
  }

  /** One fixed physics step. */
  step(world: WalkerWorld): void {
    const b = this.body;
    const grounded = b.blocked.down || b.touching.down;
    const blockedAhead = this.dir === 1 ? b.blocked.right || b.touching.right : b.blocked.left || b.touching.left;
    const next = stepPatrol(this.bounds(), this.dir, grounded, blockedAhead, world, this.kind.speed);
    this.dir = next.dir;
    b.setVelocityX(next.vx);
  }

  render(): void {
    const { x, y } = this.rect;
    this.eye.setPosition(x + 6 * this.dir, y - this.kind.height / 2 + 9);
    this.shield?.setPosition(x + this.dir * (this.kind.width / 2 + 2), y);
  }
}
