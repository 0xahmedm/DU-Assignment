import Phaser from 'phaser';
import type { ChamberId } from '../../core/chamber/types';
import { newSeed } from '../../core/run/generator';
import { abilitiesOf, frontier, isComplete, isSolved, loadProgress, resetProgress, sealsOf } from '../../core/run/progression';
import type { Tier } from '../../core/run/rooms';
import { CHAMBER_GRID, CHAMBERS } from '../../data/chambers';
import { CONNECTORS, EXIT_ROOM, REWARD_ROOM, START_ROOM } from '../../data/rooms/expedition';
import { Expedition } from '../expedition';
import { browserStore, PROGRESS_GRAPH } from '../progress';
import { copyText, Telemetry } from '../telemetry';
import { loadBest } from '../../core/run/records';
import { formatTime } from '../../core/run/telemetry';
import { cssHex, PALETTE } from '../render/palette';

const MECHANICS = ['Weight', 'Light', 'Phase'];
const DIFFICULTIES = ['Easy', 'Medium', 'Hard'];
const cap = (s: string) => s[0]!.toUpperCase() + s.slice(1);

/** Menu rows: 0 New expedition, 1 Replay seed, 2–4 the chamber grid, 5 the movement test room. */
const ROW = { newRun: 0, replay: 1, grid: 2, test: 5 } as const;
const ROWS = 6;
const MAX_SEED_DIGITS = 6;

/**
 * Main menu (C53, C72): New expedition / Replay seed / Chamber select (3 × 3, every chamber with
 * its declared kit) and the movement test room; saved progress at the top with a reset (C76).
 * Arrow keys + Enter, or the mouse. Opening the menu ends any running expedition.
 */
export class MenuScene extends Phaser.Scene {
  private selRow = 0;
  private selCol = 0;
  private rows: Phaser.GameObjects.Text[][] = [];
  private seedText = '';
  private replay!: Phaser.GameObjects.Text;

  constructor() {
    super('Menu');
  }

  create(): void {
    Expedition.stop();
    Telemetry.end('left');
    const route = this.registry.get('route') as { chamber?: ChamberId; room?: string; tier?: string; expedition?: boolean } | undefined;
    const urlSeed = this.registry.get('seed') as number | undefined;
    // A start route from the URL (?chamber=W-E / ?room=movement / ?expedition) is consumed once.
    if (route) {
      this.registry.remove('route');
      if (route.expedition) return void Expedition.start(this, urlSeed ?? newSeed());
      if (route.chamber) return void this.scene.start('Chamber', { id: route.chamber });
      if (route.room === 'movement') return void this.scene.start('TestRoom');
      const room = [START_ROOM, REWARD_ROOM, EXIT_ROOM, ...CONNECTORS].find((r) => r.id === route.room);
      const tier: Tier = route.tier === 'T2' || route.tier === 'T3' ? route.tier : 'T1';
      if (room) return void this.scene.start('Chamber', { room: { def: room, tier } });
    }

    this.cameras.main.setBackgroundColor(PALETTE.background);
    const style = (size: number, color: number = PALETTE.text) => ({ fontFamily: 'monospace', fontSize: `${size}px`, color: cssHex(color) });
    this.add.text(512, 44, 'SEAL CHAMBERS', style(34)).setOrigin(0.5);

    // Permanent progress (C76). Level select plays every chamber regardless (C53); progress is
    // earned in expeditions.
    const progress = loadProgress(PROGRESS_GRAPH, browserStore());
    const seals = sealsOf(PROGRESS_GRAPH, progress);
    const abilities = abilitiesOf(PROGRESS_GRAPH, progress);
    const complete = isComplete(PROGRESS_GRAPH, progress);
    const summary = `Seals ${[1, 2, 3].map((s) => (seals.includes(s as 1 | 2 | 3) ? '●' : '○')).join('')}   Abilities: ${abilities.length ? abilities.map(cap).join(', ') : 'none'}   Solved ${progress.solved.length}/9`;
    this.add.text(512, 82, summary, style(13, PALETTE.dim)).setOrigin(0.5);

    // Expeditions (C72).
    const best = loadBest(browserStore());
    const next = complete
      ? `any three chambers, hardest encounters · best time ${best !== undefined ? formatTime(best) : '–'}`
      : frontier(PROGRESS_GRAPH, progress).slice(0, 3).join(' · ');
    const newRun = this.item(512, 124, complete ? 'Remix expedition' : 'New expedition', 18, () => this.startRun(newSeed()));
    this.add.text(512, 146, next, style(11, PALETTE.dim)).setOrigin(0.5);
    this.seedText = String(urlSeed ?? Expedition.lastSeed() ?? '');
    this.replay = this.item(512, 178, '', 16, () => this.replaySeed());
    this.refreshReplay();

    // Chamber select (C53).
    this.add.text(512, 216, 'Chamber select', style(12, PALETTE.dim)).setOrigin(0.5);
    DIFFICULTIES.forEach((d, c) => this.add.text(380 + c * 170, 240, d, style(13, PALETTE.dim)).setOrigin(0.5));
    const grid = CHAMBER_GRID.map((row, r) => {
      this.add.text(190, 280 + r * 56, MECHANICS[r]!, style(15, PALETTE.dim)).setOrigin(0, 0.5);
      return row.map((id, c) => {
        const mark = isSolved(progress, id) ? ' ✓' : '';
        const t = this.item(380 + c * 170, 280 + r * 56, `${id}${mark}\n${CHAMBERS[id]?.name ?? '(not built yet)'}`, 13, () => this.scene.start('Chamber', { id }));
        t.setAlign('center');
        t.on('pointerover', () => this.select(ROW.grid + r, c));
        return t;
      });
    });
    const test = this.item(512, 452, 'Movement test room', 13, () => this.scene.start('TestRoom'));
    this.rows = [[newRun], [this.replay], ...grid, [test]];
    newRun.on('pointerover', () => this.select(ROW.newRun, 0));
    this.replay.on('pointerover', () => this.select(ROW.replay, 0));
    test.on('pointerover', () => this.select(ROW.test, 0));

    // Playtest stats (C81): copy the report to the clipboard, or clear it (twice).
    const n = Telemetry.count();
    const stats = this.add.text(512, 486, `Playtest stats: ${n} attempt${n === 1 ? '' : 's'}`, style(12, PALETTE.dim)).setOrigin(1, 0.5);
    const copy = this.add.text(522, 486, '[copy]', style(12, PALETTE.text)).setOrigin(0, 0.5).setInteractive({ useHandCursor: true });
    const clear = this.add.text(582, 486, '[clear]', style(12, PALETTE.dim)).setOrigin(0, 0.5).setInteractive({ useHandCursor: true });
    const copyStats = async () => {
      const report = Telemetry.report();
      const ok = await copyText(report);
      if (!ok) console.log(report); // last resort: the console
      if (stats.active) stats.setText(ok ? 'Copied to the clipboard' : 'Copy blocked: report printed to the console');
    };
    let clearArmed = false;
    copy.on('pointerdown', () => void copyStats());
    clear.on('pointerdown', () => {
      if (!clearArmed) {
        clearArmed = true;
        clear.setText('[clear: again]').setColor('#ff6b6b');
        return;
      }
      Telemetry.clear();
      this.scene.restart();
    });

    // Reset progress (C76), with a second press to confirm.
    const reset = this.add.text(512, 512, 'Reset progress', style(12, PALETTE.dim)).setOrigin(0.5).setInteractive({ useHandCursor: true });
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
    this.add.text(512, 548, 'arrows: choose   Enter: play   digits: seed   C: copy stats   Delete: reset progress   Esc (in play): menu', style(12, PALETTE.dim)).setOrigin(0.5);

    const kb = this.input.keyboard!;
    kb.on('keydown-UP', () => this.select(this.selRow - 1, this.selCol));
    kb.on('keydown-DOWN', () => this.select(this.selRow + 1, this.selCol));
    kb.on('keydown-LEFT', () => this.select(this.selRow, this.selCol - 1));
    kb.on('keydown-RIGHT', () => this.select(this.selRow, this.selCol + 1));
    kb.on('keydown-ENTER', () => this.rows[this.selRow]?.[this.selCol]?.emit('pointerdown'));
    kb.on('keydown-DELETE', tryReset);
    kb.on('keydown-C', () => void copyStats());
    // Typing a seed (C72): the first digit replaces the remembered seed, the next ones append;
    // Backspace deletes one.
    let typing = false;
    kb.on('keydown', (e: KeyboardEvent) => {
      if (/^[0-9]$/.test(e.key)) {
        const base = typing && this.seedText !== '0' ? this.seedText : '';
        typing = true;
        if (base.length >= MAX_SEED_DIGITS) return;
        this.seedText = base + e.key;
        this.select(ROW.replay, 0);
      } else if (e.key === 'Backspace') {
        typing = true;
        this.seedText = this.seedText.slice(0, -1);
        this.select(ROW.replay, 0);
      } else return;
      this.refreshReplay();
    });
    this.select(ROW.newRun, 0);
  }

  private item(x: number, y: number, label: string, size: number, onPick: () => void): Phaser.GameObjects.Text {
    const t = this.add
      .text(x, y, label, { fontFamily: 'monospace', fontSize: `${size}px`, color: cssHex(PALETTE.text), padding: { x: 6, y: 2 } })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });
    t.on('pointerdown', onPick);
    return t;
  }

  private refreshReplay(): void {
    this.replay.setText(`Replay seed: ${this.seedText || '(type a number)'}`);
  }

  private replaySeed(): void {
    const seed = Number(this.seedText);
    if (Number.isInteger(seed) && seed > 0) this.startRun(seed);
    else this.cameras.main.shake(80, 0.003);
  }

  private startRun(seed: number): void {
    try {
      Expedition.start(this, seed);
    } catch {
      this.cameras.main.shake(80, 0.003); // nothing to deal (cannot happen: Remix once complete)
    }
  }

  private select(r: number, c: number): void {
    this.selRow = Phaser.Math.Wrap(r, 0, ROWS);
    const width = this.rows[this.selRow]?.length ?? 1;
    this.selCol = Math.min(Phaser.Math.Wrap(c, 0, Math.max(width, 1)), width - 1);
    this.rows.forEach((row, rr) => row.forEach((t, cc) => t.setBackgroundColor(rr === this.selRow && cc === this.selCol ? '#2b2d33' : '')));
  }
}
