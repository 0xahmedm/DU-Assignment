import Phaser from 'phaser';
import { PLAYER_BODY, TILE } from '../../core/player/metrics';
import { MOVEMENT_TEST_ROOM } from '../../data/rooms/movementTest';
import { Controls } from '../input/Controls';
import { Crate } from '../player/Crate';
import { Player } from '../player/Player';
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
    this.cameras.main.setBounds(0, 0, width, height).setBackgroundColor(PALETTE.background);

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
      .text(12, 10, 'Movement test room | move: arrows or A/D | jump: Space or Z (hold = higher) | carry: C | throw: V', {
        fontFamily: 'monospace',
        fontSize: '13px',
        color: cssHex(PALETTE.text),
      })
      .setScrollFactor(0)
      .setDepth(100);

    this.cameras.main.startFollow(this.player.hitbox, true, 0.15, 0.15);
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
