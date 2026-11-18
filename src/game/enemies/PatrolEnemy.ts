import Phaser from 'phaser';
import { ENEMY_RULES, hitEnemy, playerBehind, type EnemyKind, type HitOutcome, type HitSource } from '../../core/combat/enemies';
import type { Box } from '../../core/combat/melee';
import { SHIELDBEARER } from '../../core/enemies/shieldbearer';
import { stepPatrol, WALKER, type WalkerWorld } from '../../core/enemies/walker';
import { DEFAULT_MOVEMENT } from '../../core/player/movement';
import { PALETTE } from '../render/palette';

/** What differs between patrolling enemies. Behaviour itself is shared (core/enemies, core/combat). */
export interface PatrolKind {
  kind: EnemyKind;
  width: number;
  height: number;
  speed: number;
  /** Shieldbearer: a shield bar on its front (C52: "armoured enemy shows a front shield"). */
  shield: boolean;
}

/** Upgrade modifiers for one hit (C67). */
export interface HitMods {
  damage?: number;
  knockbackScale?: number;
  /** Seconds a blocked hit staggers a Shieldbearer. */
  stagger?: number;
}

export const WALKER_KIND: PatrolKind = { kind: 'walker', ...WALKER, shield: false };
export const SHIELDBEARER_KIND: PatrolKind = { kind: 'shieldbearer', ...SHIELDBEARER, shield: true };

/**
 * Phaser adapter for a patrolling enemy (walker or Shieldbearer). Physics handles gravity and
 * collisions; core decides the patrol (core/enemies/walker) and the combat rules (core/combat).
 * Killed enemies reappear at their spawner after a short delay.
 */
export class PatrolEnemy {
  readonly rect: Phaser.GameObjects.Rectangle;
  readonly body: Phaser.Physics.Arcade.Body;
  private readonly eye: Phaser.GameObjects.Rectangle;
  private readonly shield: Phaser.GameObjects.Rectangle | undefined;
  private readonly alert: Phaser.GameObjects.Text;
  private dir: 1 | -1 = 1;
  private hp: number;
  private respawnIn = 0;
  private knockTimer = 0;
  private knockVx = 0;
  private telegraph = 0;
  private stagger = 0;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly spawnX: number,
    private readonly spawnBottom: number,
    readonly kind: PatrolKind,
    /** Puzzle chambers respawn their enemies; expedition connectors do not (R1, C102). */
    private readonly respawns = true,
  ) {
    const y = spawnBottom - kind.height / 2;
    this.rect = scene.add.rectangle(spawnX, y, kind.width, kind.height, PALETTE.enemy).setDepth(9);
    scene.physics.add.existing(this.rect);
    this.body = this.rect.body as Phaser.Physics.Arcade.Body;
    this.body.setGravityY(DEFAULT_MOVEMENT.gravityDown);
    this.body.setMaxVelocityY(DEFAULT_MOVEMENT.maxFallSpeed);
    this.body.pushable = false;
    this.eye = scene.add.rectangle(spawnX, y, 5, 7, PALETTE.background).setDepth(9);
    this.shield = kind.shield
      ? scene.add.rectangle(spawnX, y, 6, kind.height - 6, PALETTE.lightCore).setStrokeStyle(2, PALETTE.dim).setDepth(9)
      : undefined;
    this.alert = scene.add
      .text(spawnX, y, '!', { fontFamily: 'monospace', fontSize: '18px', color: '#ffd166' })
      .setOrigin(0.5)
      .setDepth(13)
      .setVisible(false);
    this.hp = ENEMY_RULES.health[kind.kind];
  }

  get alive(): boolean {
    return this.respawnIn <= 0;
  }

  /** Killed for good (a connector enemy, R1). */
  get gone(): boolean {
    return !this.alive && !this.respawns;
  }

  get facing(): 1 | -1 {
    return this.dir;
  }

  bounds(): Box {
    return { left: this.body.left, top: this.body.top, right: this.body.right, bottom: this.body.bottom };
  }

  /**
   * A hit from `fromX` (C62). Returns what happened so the scene can play feedback. Run upgrades
   * (C67) pass more damage (Heavy Swing), a longer knockback (Shockwave) or a stagger on a shield
   * hit (Shield Breaker).
   */
  hit(source: HitSource, fromX: number, mods: HitMods = {}): HitOutcome {
    // A staggered Shieldbearer has its shield down: hits land from either side.
    const guarding = this.stagger > 0 ? (Math.sign(this.rect.x - fromX) || 1) as 1 | -1 : this.dir;
    const r = hitEnemy(this.kind.kind, this.hp, guarding, this.rect.x, fromX, source, mods.damage);
    this.hp = r.hp;
    if (r.outcome === 'blocked') {
      this.flash(0xffd166, this.shield); // the shield lights up: "clang"
      if (mods.stagger) {
        this.stagger = mods.stagger;
        this.telegraph = 0;
        this.alert.setVisible(false);
        this.body.setVelocityX(0);
        this.rect.setAngle(-8 * this.dir);
        this.shield?.setAlpha(0.3);
      }
      return r.outcome;
    }
    if (r.outcome === 'killed') {
      this.die();
      return r.outcome;
    }
    // Damaged: flash and get knocked back about a tile, away from the hit.
    this.flash(PALETTE.lightCore, this.rect);
    this.knockVx = Math.sign(this.rect.x - fromX || 1) * ENEMY_RULES.knockbackSpeed;
    this.knockTimer = ENEMY_RULES.knockbackTime * (mods.knockbackScale ?? 1);
    return r.outcome;
  }

  /** Staggered by Shield Breaker: stands still, can't turn, and the next hit from behind lands. */
  get staggered(): boolean {
    return this.stagger > 0;
  }

  /** One fixed physics step. */
  step(dt: number, world: WalkerWorld, player: Box): void {
    if (!this.alive) {
      if (!this.respawns) return;
      this.respawnIn -= dt;
      if (this.alive) this.respawn();
      return;
    }
    const b = this.body;
    if (this.stagger > 0) {
      this.stagger -= dt;
      b.setVelocityX(0);
      if (this.stagger <= 0) {
        this.rect.setAngle(0);
        this.shield?.setAlpha(1);
      }
      return;
    }
    if (this.knockTimer > 0) {
      this.knockTimer -= dt;
      b.setVelocityX(this.knockVx);
      return;
    }
    // Shieldbearer: notices a player behind it, pauses (telegraph), then turns to face them.
    if (this.kind.shield) {
      if (this.telegraph > 0) {
        this.telegraph -= dt;
        b.setVelocityX(0);
        if (this.telegraph <= 0) {
          this.dir = -this.dir as 1 | -1;
          this.alert.setVisible(false);
        }
        return;
      }
      const grounded = b.blocked.down || b.touching.down;
      if (grounded && playerBehind(this.bounds(), this.dir, player)) {
        this.telegraph = ENEMY_RULES.turnTelegraph;
        this.alert.setVisible(true);
        b.setVelocityX(0);
        return;
      }
    }
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
    this.alert.setPosition(x, y - this.kind.height / 2 - 12);
  }

  private die(): void {
    this.respawnIn = ENEMY_RULES.respawnDelay;
    this.telegraph = 0;
    this.stagger = 0;
    this.rect.setAngle(0);
    this.shield?.setAlpha(1);
    this.body.enable = false;
    for (const o of [this.rect, this.eye, this.shield, this.alert]) o?.setVisible(false);
    // A burst where it fell.
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2;
      const bit = this.scene.add.rectangle(this.rect.x, this.rect.y, 6, 6, PALETTE.enemy).setDepth(12);
      this.scene.tweens.add({
        targets: bit,
        x: this.rect.x + Math.cos(a) * 28,
        y: this.rect.y + Math.sin(a) * 28,
        alpha: 0,
        duration: 320,
        onComplete: () => bit.destroy(),
      });
    }
  }

  private respawn(): void {
    this.hp = ENEMY_RULES.health[this.kind.kind];
    this.dir = 1;
    this.body.enable = true;
    this.body.reset(this.spawnX, this.spawnBottom - this.kind.height / 2);
    for (const o of [this.rect, this.eye, this.shield]) o?.setVisible(true);
    this.rect.setAlpha(0);
    this.scene.tweens.add({ targets: this.rect, alpha: 1, duration: 250 });
  }

  private flash(color: number, target: Phaser.GameObjects.Rectangle | undefined): void {
    if (!target) return;
    const original = target.fillColor;
    target.setFillStyle(color);
    this.scene.time.delayedCall(70, () => target.setFillStyle(original));
  }
}
