import Phaser from 'phaser';
import { PLAYER_BODY, TILE } from '../../core/player/metrics';
import {
  DEFAULT_MOVEMENT,
  initialMovementState,
  stepMovement,
  type MovementState,
} from '../../core/player/movement';
import type { Controls } from '../input/Controls';
import { PALETTE } from '../render/palette';
import type { Crate } from './Crate';

/**
 * Phaser adapter for the core movement model. The physics engine handles collisions; every
 * fixed step this class asks core/stepMovement for the new velocity (C58), so the game moves
 * exactly as the metric tests prove (C29).
 */
export class Player {
  readonly hitbox: Phaser.GameObjects.Rectangle;
  readonly body: Phaser.Physics.Arcade.Body;
  carried: Crate | undefined;

  private readonly visual: Phaser.GameObjects.Container;
  private readonly sprite: Phaser.GameObjects.Rectangle;
  private readonly eye: Phaser.GameObjects.Rectangle;
  private state: MovementState = initialMovementState();
  private facing: 1 | -1 = 1;
  private wasGrounded = true;

  constructor(
    private readonly scene: Phaser.Scene,
    x: number,
    y: number,
    private readonly controls: Controls,
  ) {
    this.hitbox = scene.add.rectangle(x, y, PLAYER_BODY.width, PLAYER_BODY.height).setVisible(false);
    scene.physics.add.existing(this.hitbox);
    this.body = this.hitbox.body as Phaser.Physics.Arcade.Body;
    this.body.setAllowGravity(false); // gravity comes from the core model
    this.body.setCollideWorldBounds(true);

    this.sprite = scene.add.rectangle(0, 0, PLAYER_BODY.width, PLAYER_BODY.height, PALETTE.player);
    this.eye = scene.add.rectangle(5, -10, 5, 7, PALETTE.playerEye);
    this.visual = scene.add.container(x, y, [this.sprite, this.eye]).setDepth(10);
  }

  get grounded(): boolean {
    return this.body.blocked.down || this.body.touching.down;
  }

  /** One fixed physics step (60 Hz). */
  step(dt: number, crates: readonly Crate[]): void {
    const grounded = this.grounded;
    if (this.controls.consume('carry')) this.toggleCarry(crates);

    const move = this.controls.horizontal();
    const before = this.state.jumpedSinceGrounded;
    this.state = stepMovement(
      this.state,
      {
        move,
        jumpPressed: this.controls.consume('jump'),
        jumpHeld: this.controls.held('jump'),
        carrying: this.carried !== undefined,
      },
      grounded,
      DEFAULT_MOVEMENT,
      dt,
    );
    this.body.setVelocity(this.state.vx, this.state.vy);

    if (move !== 0) this.facing = move;
    if (!before && this.state.jumpedSinceGrounded) this.squash(0.85, 1.18);
    if (grounded && !this.wasGrounded) this.squash(1.2, 0.8);
    this.wasGrounded = grounded;
  }

  /** Every rendered frame: keep visuals on the physics body. */
  render(): void {
    this.visual.setPosition(this.hitbox.x, this.hitbox.y);
    this.eye.x = 5 * this.facing;
    if (this.carried) {
      this.carried.rect.setPosition(this.hitbox.x, this.hitbox.y - PLAYER_BODY.height / 2 - TILE / 2 + 2);
    }
  }

  private toggleCarry(crates: readonly Crate[]): void {
    if (this.carried) {
      this.putDown();
      return;
    }
    const reach = PLAYER_BODY.width / 2 + TILE / 2 + 6;
    const feet = this.hitbox.y + PLAYER_BODY.height / 2;
    const target = crates.find(
      (c) =>
        !c.carried &&
        Math.abs(c.rect.x - this.hitbox.x) <= reach &&
        Math.abs(c.rect.y + TILE / 2 - feet) <= TILE / 2,
    );
    if (target) {
      target.pickUp();
      this.carried = target;
    }
  }

  private putDown(): void {
    const crate = this.carried;
    if (!crate) return;
    const feet = this.hitbox.y + PLAYER_BODY.height / 2;
    const x = this.hitbox.x + this.facing * (PLAYER_BODY.width / 2 + TILE / 2 + 1);
    const y = feet - TILE / 2;
    const blocked = this.scene.physics.overlapRect(x - TILE / 2 + 2, y - TILE / 2 + 2, TILE - 4, TILE - 4, true, true);
    if (blocked.length > 0) {
      this.scene.cameras.main.shake(80, 0.003); // no room: refuse, with feedback
      return;
    }
    crate.putDownAt(x, y);
    this.carried = undefined;
  }

  private squash(sx: number, sy: number): void {
    this.scene.tweens.killTweensOf(this.sprite);
    this.sprite.setScale(sx, sy);
    this.scene.tweens.add({ targets: this.sprite, scaleX: 1, scaleY: 1, duration: 140, ease: 'Quad.Out' });
  }
}
