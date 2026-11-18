import Phaser from 'phaser';
import type { ChamberId } from '../../core/chamber/types';
import type { Tier } from '../../core/run/rooms';
import { CHAMBER_GRID, CHAMBERS } from '../../data/chambers';
import { CONNECTORS, EXIT_ROOM, REWARD_ROOM, START_ROOM } from '../../data/rooms/expedition';
import { abilitiesOf, isSolved, loadProgress, resetProgress, sealsOf } from '../../core/run/progression';
import { browserStore, PROGRESS_GRAPH } from '../progress';
import { cssHex, PALETTE } from '../render/palette';

const MECHANICS = ['Weight', 'Light', 'Phase'];
const cap = (s: string) => s[0]!.toUpperCase() + s.slice(1);
const DIFFICULTIES = ['Easy', 'Medium', 'Hard'];

/**
 * Level select (C53): a 3 x 3 grid of chambers (mechanic x difficulty) plus the movement test
 * room. Arrow keys + Enter, or click. Expedition mode is added on Day 5.
 */
export class MenuScene extends Phaser.Scene {
  private selRow = 0;
  private selCol = 0;
  private cells: Phaser.GameObjects.Text[][] = [];

  constructor() {
    super('Menu');
  }

  create(): void {
    // A start route from the URL (?chamber=W-E / ?room=movement) is consumed once.
    const route = this.registry.get('route') as { chamber?: ChamberId; room?: string; tier?: string } | undefined;
    if (route) {
      this.registry.remove('route');
      if (route.chamber) return void this.scene.start('Chamber', { id: route.chamber });
      if (route.room === 'movement') return void this.scene.start('TestRoom');
      const room = [START_ROOM, REWARD_ROOM, EXIT_ROOM, ...CONNECTORS].find((r) => r.id === route.room);
      const tier: Tier = route.tier === 'T2' || route.tier === 'T3' ? route.tier : 'T1';
      if (room) return void this.scene.start('Chamber', { room: { def: room, tier } });
    }

    this.cameras.main.setBackgroundColor(PALETTE.background);
    const style = (size: number, color: number = PALETTE.text) => ({ fontFamily: 'monospace', fontSize: `${size}px`, color: cssHex(color) });
    this.add.text(512, 60, 'SEAL CHAMBERS', style(34)).setOrigin(0.5);
    this.add.text(512, 100, 'prototype: chamber select', style(14, PALETTE.dim)).setOrigin(0.5);

    // Permanent progress (C76): seals, abilities, solved chambers. Level select plays every
    // chamber regardless (C53); progress is earned in expeditions.
    const progress = loadProgress(PROGRESS_GRAPH, browserStore());
    const seals = sealsOf(PROGRESS_GRAPH, progress);
    const abilities = abilitiesOf(PROGRESS_GRAPH, progress);
    const summary = `Seals ${[1, 2, 3].map((s) => (seals.includes(s as 1 | 2 | 3) ? '●' : '○')).join('')}   Abilities: ${abilities.length ? abilities.map(cap).join(', ') : 'none'}   Solved ${progress.solved.length}/9`;
    this.add.text(512, 128, summary, style(13, PALETTE.dim)).setOrigin(0.5);

    DIFFICULTIES.forEach((d, c) => this.add.text(380 + c * 170, 160, d, style(14, PALETTE.dim)).setOrigin(0.5));
    this.cells = CHAMBER_GRID.map((row, r) => {
      this.add.text(190, 220 + r * 70, MECHANICS[r]!, style(16, PALETTE.dim)).setOrigin(0, 0.5);
      return row.map((id, c) => {
        const built = CHAMBERS[id] !== undefined;
        const mark = isSolved(progress, id) ? ' ✓' : '';
        const label = built ? `${id}${mark}\n${CHAMBERS[id]!.name}` : `${id}\n(not built yet)`;
        const t = this.add
          .text(380 + c * 170, 220 + r * 70, label, { ...style(13, built ? PALETTE.text : PALETTE.dim), align: 'center' })
          .setOrigin(0.5)
          .setInteractive({ useHandCursor: true });
        t.on('pointerdown', () => this.open(id));
        t.on('pointerover', () => this.select(r, c));
        return t;
      });
    });

    const test = this.add.text(512, 470, 'Movement test room', style(14, PALETTE.dim)).setOrigin(0.5).setInteractive({ useHandCursor: true });
    test.on('pointerdown', () => this.scene.start('TestRoom'));

    // Reset progress (C76), with a second press to confirm.
    const reset = this.add.text(512, 500, 'Reset progress', style(12, PALETTE.dim)).setOrigin(0.5).setInteractive({ useHandCursor: true });
    let armed = false;
    const tryReset = () => {
      if (!armed) {
        armed = true;
        reset.setText('Press again to erase all progress').setColor('#ff6b6b');
        this.time.delayedCall(3000, () => {
          armed = false;
          if (reset.active) reset.setText('Reset progress').setColor(cssHex(PALETTE.dim));
        });
        return;
      }
      resetProgress(browserStore());
      this.scene.restart();
    };
    reset.on('pointerdown', tryReset);
    this.add.text(512, 530, 'arrows: choose   Enter: play   Delete: reset progress   (in a chamber: hold R to reset, Esc for this menu)', style(12, PALETTE.dim)).setOrigin(0.5);

    const kb = this.input.keyboard!;
    kb.on('keydown-UP', () => this.select(this.selRow - 1, this.selCol));
    kb.on('keydown-DOWN', () => this.select(this.selRow + 1, this.selCol));
    kb.on('keydown-LEFT', () => this.select(this.selRow, this.selCol - 1));
    kb.on('keydown-RIGHT', () => this.select(this.selRow, this.selCol + 1));
    kb.on('keydown-ENTER', () => this.open(CHAMBER_GRID[this.selRow]![this.selCol]!));
    kb.on('keydown-DELETE', tryReset);
    this.select(0, 0);
  }

  private select(r: number, c: number): void {
    this.selRow = Phaser.Math.Wrap(r, 0, 3);
    this.selCol = Phaser.Math.Wrap(c, 0, 3);
    this.cells.forEach((row, rr) => row.forEach((t, cc) => t.setBackgroundColor(rr === this.selRow && cc === this.selCol ? '#2b2d33' : '')));
  }

  private open(id: ChamberId): void {
    this.scene.start('Chamber', { id });
  }
}
