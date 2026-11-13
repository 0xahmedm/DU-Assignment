import Phaser from 'phaser';
import { symbolInfo } from '../../core/chamber/legend';
import { cellsHitBySwing } from '../../core/combat/melee';
import { exposedFaces } from '../../core/chamber/collision';
import { WALKER } from '../../core/enemies/walker';
import { dropCell, feedingDispenser } from '../../core/chamber/dispensers';
import { ChamberLogic, type HitResult } from '../../core/chamber/logic';
import { parseChamber } from '../../core/chamber/parser';
import type { ChamberId, ChamberModel } from '../../core/chamber/types';
import { validateChamber } from '../../core/chamber/validator';
import { PLAYER_BODY, TILE } from '../../core/player/metrics';
import { CHAMBERS } from '../../data/chambers';
import { Controls } from '../input/Controls';
import { Walker } from '../enemies/Walker';
import { Crate } from '../player/Crate';
import { Player } from '../player/Player';
import { ChamberView } from '../render/ChamberView';
import { cssHex, PALETTE } from '../render/palette';

const RESET_HOLD_MS = 1000; // hold R this long to reset (C51)
/** Cells whose solidity changes during play (doors, trapdoors, exit, phase blocks). */
const SWITCHABLE = new Set(['R', 'B', '|', 'K', '=', 'E']);
const key = (r: number, c: number) => `${r},${c}`;

interface Bounds {
  left: number;
  right: number;
  top: number;
  bottom: number;
}

/**
 * Plays one puzzle chamber. Physics bodies and drawing live here; every rule comes from
 * core/ChamberLogic. Once per physics step: move the player, report plates and occupancy to the
 * logic, then switch door / phase-block bodies on or off to match what the logic says is solid.
 */
export class ChamberScene extends Phaser.Scene {
  private model!: ChamberModel;
  private logic!: ChamberLogic;
  private view!: ChamberView;
  private player!: Player;
  private controls!: Controls;
  private crates: Crate[] = [];
  private walkers: Walker[] = [];
  private cellBodies: { r: number; c: number; body: Phaser.Physics.Arcade.StaticBody }[] = [];
  private pressed: ReadonlySet<string> = new Set();
  private resetHeldMs = 0;
  private resetRing!: Phaser.GameObjects.Graphics;
  private solved = false;
  private chamberId: ChamberId = 'W-E';

  constructor() {
    super('Chamber');
  }

  init(data: { id?: ChamberId }): void {
    this.chamberId = data.id ?? this.chamberId;
    this.crates = [];
    this.walkers = [];
    this.cellBodies = [];
    this.pressed = new Set();
    this.resetHeldMs = 0;
    this.solved = false;
  }

  create(): void {
    const def = CHAMBERS[this.chamberId];
    if (!def) {
      this.showMessage(`Chamber ${this.chamberId} is not built yet.\nPress Esc for the menu.`);
      this.input.keyboard?.once('keydown-ESC', () => this.scene.start('Menu'));
      return;
    }
    const parsed = parseChamber(def);
    if (!parsed.model) {
      this.showMessage(`Chamber ${def.id} failed to parse:\n${parsed.errors.join('\n')}`);
      return;
    }
    this.model = parsed.model;
    const report = validateChamber(this.model);
    if (report.errors.length > 0) {
      this.showMessage(`Chamber ${def.id} failed validation:\n${report.errors.join('\n')}`);
      return;
    }
    if (import.meta.env.DEV && report.warnings.length > 0) console.warn(report.warnings.join('\n'));

    this.logic = new ChamberLogic(this.model);
    const width = this.model.width * TILE;
    const height = this.model.height * TILE;
    this.physics.world.setBounds(0, 0, width, height);
    this.cameras.main.setBounds(0, 0, width, height).setBackgroundColor(PALETTE.background);

    // Collision: one static body per cell that is, or can become, solid (terrain, solid devices,
    // doors, trapdoors, the exit, phase blocks). syncSolids() switches bodies on/off from the logic
    // and turns off faces between solid cells, so walls have no seams to snag on.
    const solids = this.physics.add.staticGroup();
    this.model.grid.forEach((row, r) => {
      [...row].forEach((ch, c) => {
        if (!SWITCHABLE.has(ch) && symbolInfo(ch)?.tile !== 'solid') return;
        const rect = this.add.rectangle(c * TILE + TILE / 2, r * TILE + TILE / 2, TILE, TILE).setVisible(false);
        solids.add(rect);
        this.cellBodies.push({ r, c, body: rect.body as Phaser.Physics.Arcade.StaticBody });
      });
    });

    this.view = new ChamberView(this, this.model, this.logic);
    this.controls = new Controls(this);
    const [sr, sc] = this.model.start;
    this.player = new Player(this, sc * TILE + TILE / 2, (sr + 1) * TILE - PLAYER_BODY.height / 2, this.controls);
    this.physics.add.collider(this.player.hitbox, solids);

    for (const s of this.model.spawns.filter((x) => x.kind === 'crate')) {
      const crate = new Crate(this, s.cell[1] * TILE + TILE / 2, s.cell[0] * TILE + TILE / 2, feedingDispenser(this.model, s.cell));
      this.crates.push(crate);
      this.physics.add.collider(crate.rect, solids);
      this.physics.add.collider(this.player.hitbox, crate.rect);
    }
    // Walkers stand on their spawn cell's floor. No player collider: contact will cost a heart (Day 4).
    for (const s of this.model.spawns.filter((x) => x.kind === 'walker')) {
      const walker = new Walker(this, s.cell[1] * TILE + TILE / 2, (s.cell[0] + 1) * TILE - WALKER.height / 2);
      this.walkers.push(walker);
      this.physics.add.collider(walker.rect, solids);
      for (const c of this.crates) this.physics.add.collider(walker.rect, c.rect);
    }

    for (let i = 0; i < this.crates.length; i++) {
      for (let j = i + 1; j < this.crates.length; j++) this.physics.add.collider(this.crates[i]!.rect, this.crates[j]!.rect);
    }

    this.add
      .text(12, 10, `${def.id}  ${def.name}   |   hold R: reset   Esc: menu`, {
        fontFamily: 'monospace',
        fontSize: '13px',
        color: cssHex(PALETTE.text),
      })
      .setScrollFactor(0)
      .setDepth(100);
    this.resetRing = this.add.graphics().setScrollFactor(0).setDepth(101);
    this.input.keyboard?.on('keydown-ESC', () => this.scene.start('Menu'));

    this.cameras.main.startFollow(this.player.hitbox, true, 0.15, 0.15);
    this.syncSolids();
    this.physics.world.on('worldstep', this.onStep, this);
    this.events.once('shutdown', () => this.physics.world.off('worldstep', this.onStep, this));
  }

  private onStep(dt: number): void {
    if (this.solved) return;
    this.player.step(dt, this.crates);
    const world = { isSolid: (r: number, c: number) => this.logic.isSolid(r, c) };
    for (const w of this.walkers) w.step(world);

    // Everything with weight: the player first (checkExit uses it), crates on the ground, walkers.
    const bodies: Bounds[] = [this.boundsOf(this.player.body)];
    for (const c of this.crates) if (!c.carried) bodies.push(this.boundsOf(c.body));
    for (const w of this.walkers) bodies.push(w.bounds());

    const occupied = new Set<string>();
    for (const b of bodies) {
      for (let r = Math.floor(b.top / TILE); r <= Math.floor((b.bottom - 1) / TILE); r++) {
        for (let c = Math.floor(b.left / TILE); c <= Math.floor((b.right - 1) / TILE); c++) occupied.add(key(r, c));
      }
    }

    // A plate is pressed when a body stands on the tile it sits on: bottom edge at the cell's floor.
    const pressed = new Set<string>();
    for (const d of this.model.devices) {
      if (d.kind !== 'plate') continue;
      const hit = d.cells.some(([r, c]) =>
        bodies.some((b) => Math.abs(b.bottom - (r + 1) * TILE) <= 3 && b.right > c * TILE + 2 && b.left < (c + 1) * TILE - 2),
      );
      if (hit) pressed.add(d.id);
    }
    this.pressed = pressed;

    const swing = this.player.takeSwing();
    if (swing) {
      const cells = cellsHitBySwing(swing.box, swing.facing, swing.dir, {
        isSolid: (r, c) => this.logic.isSolid(r, c),
        isHittable: (r, c) => this.logic.hittableAt(r, c) !== undefined,
      });
      this.onHits(this.logic.resolveHits(cells, occupied));
    }

    this.logic.update({ pressedPlates: pressed, occupiedCells: occupied });
    this.logic.takeEvents(); // feedback hooks (sound/particles) arrive with the FX pass
    this.syncSolids();
    this.checkExit(bodies[0]!);
    this.updateReset(dt);
  }

  /** Feedback for a swing's hits, and the physical part of dispenser recall. */
  private onHits(hit: HitResult): void {
    if (hit.crystal) {
      this.view.flash(hit.crystal);
      this.cameras.main.flash(90, 255, 255, 255, false);
    }
    for (const id of hit.flipped) this.view.flash(id);
    if (hit.locked.length > 0) this.cameras.main.shake(70, 0.004); // "clang": locked to its plate (C42)
    for (const id of hit.dispensers) this.recall(id);
  }

  /**
   * Dispenser recall (C50): the dispenser's crate vanishes wherever it is (even from the player's
   * hands) and a fresh one drops from the dispenser. Refused, with a shake, if something is in the way.
   */
  private recall(dispenserId: string): void {
    const crate = this.crates.find((c) => c.dispenser === dispenserId);
    const cell = dropCell(this.model, dispenserId);
    if (!crate || !cell) return;
    const x = cell[1] * TILE + TILE / 2;
    const y = cell[0] * TILE + TILE / 2;
    const blocking = this.physics
      .overlapRect(x - TILE / 2 + 2, y - TILE / 2 + 2, TILE - 4, TILE - 4, true, false)
      .filter((b) => b !== crate.body);
    if (blocking.length > 0) {
      this.cameras.main.shake(80, 0.003);
      return;
    }
    this.view.puff(crate.rect.x, crate.rect.y);
    if (this.player.carried === crate) this.player.releaseCarried();
    crate.respawnAt(x, y);
    this.view.flash(dispenserId);
  }

  private boundsOf(body: Phaser.Physics.Arcade.Body): Bounds {
    return { left: body.left, right: body.right, top: body.top, bottom: body.bottom };
  }

  private syncSolids(): void {
    const isSolid = (r: number, c: number) => this.logic.isSolid(r, c);
    for (const { r, c, body } of this.cellBodies) {
      body.enable = isSolid(r, c);
      if (body.enable) Object.assign(body.checkCollision, exposedFaces(r, c, isSolid));
    }
  }

  private checkExit(player: Bounds): void {
    if (!this.logic.isOpen('exit')) return;
    const exit = this.model.devices.find((d) => d.kind === 'exit');
    const inside = exit?.cells.some(
      ([r, c]) => player.right > c * TILE && player.left < (c + 1) * TILE && player.bottom > r * TILE && player.top < (r + 1) * TILE,
    );
    if (!inside) return;
    this.solved = true;
    this.player.body.setVelocity(0, 0);
    this.showMessage(`${this.model.def.name}: solved!\nEnter: play again    Esc: menu`);
    this.input.keyboard?.once('keydown-ENTER', () => this.scene.restart({ id: this.chamberId }));
  }

  private updateReset(dt: number): void {
    this.resetHeldMs = this.controls.held('reset') ? this.resetHeldMs + dt * 1000 : 0;
    const g = this.resetRing.clear();
    if (this.resetHeldMs <= 0) return;
    const t = Math.min(1, this.resetHeldMs / RESET_HOLD_MS);
    g.lineStyle(4, PALETTE.text, 0.9).beginPath();
    g.arc(this.scale.width - 30, 30, 14, -Math.PI / 2, -Math.PI / 2 + t * Math.PI * 2).strokePath();
    if (t >= 1) this.scene.restart({ id: this.chamberId });
  }

  override update(): void {
    if (!this.model || !this.player) return;
    this.player.render();
    for (const w of this.walkers) w.render();
    this.view.draw(this.pressed);
  }

  private showMessage(text: string): void {
    this.add
      .text(this.scale.width / 2, this.scale.height / 2, text, {
        fontFamily: 'monospace',
        fontSize: '18px',
        color: cssHex(PALETTE.text),
        align: 'center',
        backgroundColor: '#000000aa',
        padding: { x: 16, y: 12 },
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(200);
  }
}
