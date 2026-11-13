import Phaser from 'phaser';
import { MELEE, swingBox, type Box, type SwingDir } from '../../core/combat/melee';
import type { Ability } from '../../core/chamber/types';
import { PLAYER_BODY, TILE } from '../../core/player/metrics';
import { throwTarget } from '../../core/player/throw';
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
  private swingCooldown = 0;
  private pendingSwing: { box: Box; facing: 1 | -1; dir: SwingDir } | undefined;

  constructor(
    private readonly scene: Phaser.Scene,
    x: number,
    y: number,
    private readonly controls: Controls,
    /** Abilities usable here: the chamber's declared kit (C24), or all of them in the test room. */
    private readonly abilities: ReadonlySet<Ability> = new Set(),
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
    if (this.controls.consume('throw')) this.throwCrate(grounded);
    this.swingCooldown = Math.max(0, this.swingCooldown - dt);
    if (this.controls.consume('attack') && this.swingCooldown === 0) this.swing();

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

  /**
   * The swing started this step, if any; the scene resolves what it hits (core/combat/melee).
   * Hits are resolved on the frame the swing starts, so puzzle hits are instant and predictable.
   */
  takeSwing(): { box: Box; facing: 1 | -1; dir: SwingDir } | undefined {
    const s = this.pendingSwing;
    this.pendingSwing = undefined;
    return s;
  }

  /** Bounds of the physics body in world pixels. */
  bounds(): Box {
    return { left: this.body.left, top: this.body.top, right: this.body.right, bottom: this.body.bottom };
  }

  /** Drops whatever is carried without placing it (used when a dispenser recalls that crate). */
  releaseCarried(): void {
    this.carried = undefined;
  }

  /** Throw (C23, C29): from the ground only, so "5 tiles ahead" is always measured on the player's floor. */
  private throwCrate(grounded: boolean): void {
    const crate = this.carried;
    if (!crate || !this.abilities.has('throw')) return;
    if (!grounded) {
      this.scene.cameras.main.shake(60, 0.002);
      return;
    }
    const feet = this.hitbox.y + PLAYER_BODY.height / 2;
    crate.launch({ x: crate.rect.x, y: crate.rect.y }, throwTarget(this.hitbox.x, feet, this.facing));
    this.carried = undefined;
    this.squash(1.15, 0.9);
  }

  /** Melee (C35): up-swing while holding up, otherwise forward. Allowed while carrying. */
  private swing(): void {
    const dir: SwingDir = this.controls.held('up') ? 'up' : 'forward';
    const box = swingBox(this.bounds(), this.facing, dir);
    this.pendingSwing = { box, facing: this.facing, dir };
    this.swingCooldown = MELEE.recovery;

    // Visual: a short bright slash over the swing area.
    const slash = this.scene.add
      .rectangle((box.left + box.right) / 2, (box.top + box.bottom) / 2, box.right - box.left, box.bottom - box.top, PALETTE.lightCore, 0.35)
      .setDepth(11);
    this.scene.tweens.add({ targets: slash, alpha: 0, duration: MELEE.showTime * 1000, onComplete: () => slash.destroy() });
    if (dir === 'forward') this.squash(1.12, 0.94);
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
        !c.flying &&
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
