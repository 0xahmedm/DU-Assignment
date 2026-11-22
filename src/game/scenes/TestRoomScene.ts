import Phaser from 'phaser';
import { PLAYER_BODY, TILE } from '../../core/player/metrics';
import { MOVEMENT_TEST_ROOM } from '../../data/rooms/movementTest';
import { Controls } from '../input/Controls';
import { controlsLine } from '../input/controlsText';
import { Crate } from '../player/Crate';
import { Player } from '../player/Player';
import { bandBounds } from '../render/camera';
import { HUD_BOTTOM, HUD_TOP } from './ChamberScene';
import { cssHex, PALETTE } from '../render/palette';
import { buildSolids, findCell } from '../render/solids';

/** Day 2 movement test room: verify the C29 metrics by hand against tile-height pillars and pits. */
export class TestRoomScene extends Phaser.Scene {
  private player!: Player;
  private crates: Crate[] = [];

  constructor() {
    super('TestRoom');
  }

  create(): void {
    this.crates = []; // scene.restart() reuses this instance: drop the previous run's crates
    const room = MOVEMENT_TEST_ROOM;
    const width = room.grid[0]!.length * TILE;
    const height = room.grid.length * TILE;
    this.physics.world.setBounds(0, 0, width, height);
    const cam = bandBounds(width, height, this.scale.width, this.scale.height, HUD_TOP, HUD_BOTTOM); // between the HUD bars (C116)
    this.cameras.main.setBounds(cam.x, cam.y, cam.width, cam.height).setBackgroundColor(PALETTE.background);

    const solids = buildSolids(this, room.grid);
    const controls = new Controls(this);

    const start = findCell(room.grid, 'S');
    if (!start) throw new Error('movement test room has no start (S)');
    this.player = new Player(
      this,
      start.col * TILE + TILE / 2,
      (start.row + 1) * TILE - PLAYER_BODY.height / 2,
      controls,
      new Set(['throw', 'bolt', 'dash'] as const), // every ability, to verify the metrics
    );
    this.physics.add.collider(this.player.hitbox, solids);

    room.grid.forEach((row, r) => {
      [...row].forEach((ch, c) => {
        if (ch !== 'C') return;
        const crate = new Crate(this, c * TILE + TILE / 2, r * TILE + TILE / 2);
        this.crates.push(crate);
        this.physics.add.collider(crate.rect, solids);
        this.physics.add.collider(this.player.hitbox, crate.rect);
      });
    });

    for (const l of room.labels) {
      this.add.text(l.col * TILE, l.row * TILE, l.text, {
        fontFamily: 'monospace',
        fontSize: '14px',
        color: cssHex(PALETTE.dim),
      });
    }
    this.add
      .text(12, 10, 'Movement test room | move: arrows or A/D | jump: Space or Z (hold = higher) | carry: C | throw: V | Esc: menu', {
        fontFamily: 'monospace',
        fontSize: '13px',
        color: cssHex(PALETTE.text),
      })
      .setScrollFactor(0)
      .setDepth(100);

    // Opaque HUD bars, as in every chamber (C116).
    const bars = this.add.graphics().setScrollFactor(0).setDepth(99);
    bars.fillStyle(0x0e0f12, 1).fillRect(0, 0, this.scale.width, HUD_TOP).fillRect(0, this.scale.height - HUD_BOTTOM, this.scale.width, HUD_BOTTOM);
    bars.fillStyle(PALETTE.terrainEdge, 1).fillRect(0, HUD_TOP - 2, this.scale.width, 2).fillRect(0, this.scale.height - HUD_BOTTOM, this.scale.width, 2);
    // The controls line, as in every chamber (C111); the line at the top stays.
    this.add
      .text(12, this.scale.height - 6, controlsLine(new Set(['throw', 'bolt', 'dash'] as const)), { fontFamily: 'monospace', fontSize: '12px', color: cssHex(PALETTE.text) })
      .setOrigin(0, 1)
      .setScrollFactor(0)
      .setDepth(100);
    this.cameras.main.startFollow(this.player.hitbox, true, 0.15, 0.15);
    // Back to the menu's Options & tools screen (it had no way out before the menu rework, C108).
    this.input.keyboard?.on('keydown-ESC', () => this.scene.start('Menu', { page: 'tools' }));
    // Run the movement model once per fixed physics step (60 Hz), in lockstep with the tests.
    const isSolid = (r: number, c: number) => (room.grid[r]?.[c] ?? '#') === '#';
    this.physics.world.on('worldstep', (dt: number) => {
      this.player.step(dt, this.crates);
      for (const c of this.crates) c.stepFlight(dt, isSolid);
    });
  }

  override update(): void {
    this.player.render();
  }
}
