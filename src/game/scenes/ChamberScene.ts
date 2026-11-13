import Phaser from 'phaser';
import { symbolInfo } from '../../core/chamber/legend';
import { ChamberLogic } from '../../core/chamber/logic';
import { parseChamber } from '../../core/chamber/parser';
import type { ChamberId, ChamberModel } from '../../core/chamber/types';
import { validateChamber } from '../../core/chamber/validator';
import { PLAYER_BODY, TILE } from '../../core/player/metrics';
import { CHAMBERS } from '../../data/chambers';
import { Controls } from '../input/Controls';
import { Crate } from '../player/Crate';
import { Player } from '../player/Player';
import { ChamberView } from '../render/ChamberView';
import { cssHex, PALETTE } from '../render/palette';

const RESET_HOLD_MS = 1000; // hold R this long to reset (C51)
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
  private toggles = new Map<string, Phaser.GameObjects.Rectangle>();
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
    this.toggles = new Map();
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

    // Static solids (terrain, dispensers, emitters, mirrors, receivers): merged per horizontal run.
    const solids = this.physics.add.staticGroup();
    const isStatic = (ch: string) => symbolInfo(ch)?.tile === 'solid';
    this.model.grid.forEach((row, r) => {
      let c = 0;
      while (c < row.length) {
        if (!isStatic(row[c]!)) {
          c++;
          continue;
        }
        const start = c;
        while (c < row.length && isStatic(row[c]!)) c++;
        const w = (c - start) * TILE;
        solids.add(this.add.rectangle(start * TILE + w / 2, r * TILE + TILE / 2, w, TILE).setVisible(false));
      }
    });
    solids.refresh();

    // Switchable solids: doors, trapdoors, exit, phase blocks (one body per cell).
    const switchable = this.physics.add.staticGroup();
    this.model.grid.forEach((row, r) => {
      [...row].forEach((ch, c) => {
        if (!['R', 'B', '|', 'K', '=', 'E'].includes(ch)) return;
        const rect = this.add.rectangle(c * TILE + TILE / 2, r * TILE + TILE / 2, TILE, TILE).setVisible(false);
        switchable.add(rect);
        this.toggles.set(key(r, c), rect);
      });
    });

    this.view = new ChamberView(this, this.model, this.logic);
    this.controls = new Controls(this);
    const [sr, sc] = this.model.start;
    this.player = new Player(this, sc * TILE + TILE / 2, (sr + 1) * TILE - PLAYER_BODY.height / 2, this.controls);
    this.physics.add.collider(this.player.hitbox, solids);
    this.physics.add.collider(this.player.hitbox, switchable);

    for (const s of this.model.spawns.filter((x) => x.kind === 'crate')) {
      const crate = new Crate(this, s.cell[1] * TILE + TILE / 2, s.cell[0] * TILE + TILE / 2);
      this.crates.push(crate);
      this.physics.add.collider(crate.rect, solids);
      this.physics.add.collider(crate.rect, switchable);
      this.physics.add.collider(this.player.hitbox, crate.rect);
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

    const bodies: Bounds[] = [this.boundsOf(this.player.body)];
    for (const c of this.crates) if (!c.carried) bodies.push(this.boundsOf(c.body));

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

    this.logic.update({ pressedPlates: pressed, occupiedCells: occupied });
    this.logic.takeEvents(); // feedback hooks (sound/particles) arrive with the FX pass
    this.syncSolids();
    this.checkExit(bodies[0]!);
    this.updateReset(dt);
  }

  private boundsOf(body: Phaser.Physics.Arcade.Body): Bounds {
    return { left: body.left, right: body.right, top: body.top, bottom: body.bottom };
  }

  private syncSolids(): void {
    for (const [k, rect] of this.toggles) {
      const [r, c] = k.split(',').map(Number) as [number, number];
      (rect.body as Phaser.Physics.Arcade.StaticBody).enable = this.logic.isSolid(r, c);
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
