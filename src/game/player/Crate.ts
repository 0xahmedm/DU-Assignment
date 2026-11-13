import Phaser from 'phaser';
import { TILE } from '../../core/player/metrics';
import { DEFAULT_MOVEMENT } from '../../core/player/movement';
import { THROW, throwArc, throwVelocity, type Point } from '../../core/player/throw';
import { PALETTE } from '../render/palette';

/** A carryable crate (C30): solid, falls with gravity, never pushed by the player. */
export class Crate {
  readonly rect: Phaser.GameObjects.Rectangle;
  readonly body: Phaser.Physics.Arcade.Body;
  carried = false;
  /** Set while the crate flies along a Throw arc (no physics body during the flight). */
  private flight: { start: Point; target: Point; t: number } | undefined;

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

  get flying(): boolean {
    return this.flight !== undefined;
  }

  /** Throw (C29): fly from `start` (in the hands) to `target` along the fixed arc. */
  launch(start: Point, target: Point): void {
    this.carried = false;
    this.body.enable = false;
    this.flight = { start, target, t: 0 };
    this.rect.setPosition(start.x, start.y);
  }

  /**
   * Advances a flight by one physics step. Touching anything solid ends it on the spot (the crate
   * drops); reaching the target hands the crate back to physics, which lands it or lets it fall.
   */
  stepFlight(dt: number, isSolid: (r: number, c: number) => boolean): void {
    const f = this.flight;
    if (!f) return;
    const t = Math.min(1, f.t + dt / THROW.duration);
    const p = throwArc(f.start, f.target, t);
    if (this.touchesSolid(p, isSolid)) {
      this.endFlight(this.rect.x, this.rect.y, 0, 0);
      return;
    }
    this.rect.setPosition(p.x, p.y);
    f.t = t;
    if (t >= 1) this.endFlight(p.x, p.y, 0, Math.max(0, throwVelocity(f.start, f.target, 1).y));
  }

  private touchesSolid(p: Point, isSolid: (r: number, c: number) => boolean): boolean {
    const half = TILE / 2 - 2;
    const cells = (a: number, b: number) => [Math.floor(a / TILE), Math.floor(b / TILE)] as const;
    const [r0, r1] = cells(p.y - half, p.y + half - 1);
    const [c0, c1] = cells(p.x - half, p.x + half - 1);
    for (let r = r0; r <= r1; r++) for (let c = c0; c <= c1; c++) if (isSolid(r, c)) return true;
    return false;
  }

  private endFlight(x: number, y: number, vx: number, vy: number): void {
    this.flight = undefined;
    this.body.enable = true;
    this.body.reset(x, y);
    this.body.setVelocity(vx, vy);
  }

  putDownAt(x: number, y: number): void {
    this.flight = undefined;
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
