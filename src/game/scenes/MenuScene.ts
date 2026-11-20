import Phaser from 'phaser';
import type { ChamberDef, ChamberId, Mechanic, Seal } from '../../core/chamber/types';
import { newSeed } from '../../core/run/generator';
import { abilitiesOf, frontier, isComplete, isSolved, loadProgress, resetProgress, sealsOf, type Progress } from '../../core/run/progression';
import type { Tier } from '../../core/run/rooms';
import { CHAMBER_GRID, CHAMBERS } from '../../data/chambers';
import { CONNECTORS, EXIT_ROOM, REWARD_ROOM, START_ROOM } from '../../data/rooms/expedition';
import { Sfx } from '../audio/Sfx';
import { Expedition } from '../expedition';
import { browserStore, PROGRESS_GRAPH } from '../progress';
import { copyText, Telemetry } from '../telemetry';
import { loadBest } from '../../core/run/records';
import { formatTime } from '../../core/run/telemetry';
import { cssHex, PALETTE } from '../render/palette';

/**
 * Main menu (C53, C72, reworked as C108): a title screen with three entries, each opening its own
 * screen:
 * - Expedition: New (or Remix) expedition, Replay seed, saved progress (seals, abilities, solved).
 * - Chamber select: the 4 × 3 grid as tiles coloured by mechanic, with details of the selected one.
 * - Options & tools: sound, the movement test room, playtest stats, reset progress.
 * Arrow keys + Enter, or the mouse; Esc goes back. Opening the menu ends any running expedition.
 * Leaving for a chamber, a run or the test room remembers the screen, so Esc there comes back to it.
 */
type Page = 'title' | 'expedition' | 'chambers' | 'tools';

interface Item {
  activate(): void;
  setSelected(on: boolean): void;
  /** Extra work when this item becomes selected (the chamber details panel). */
  onSelect?: () => void;
}

const MECHANIC_NAMES: Record<Mechanic, string> = { weight: 'Weight', light: 'Light', phase: 'Phase', gate: 'Gates' };
const DIFFICULTIES = ['Easy', 'Medium', 'Hard'];
const SEALS: readonly Seal[] = [1, 2, 3, 4]; // C105
const MAX_SEED_DIGITS = 6;
const W = 1024;
const CX = W / 2;
const PANEL = 0x1c1e24;
const PANEL_SELECTED = 0x262932;
const DANGER = 0xff6b6b;
const cap = (s: string) => s[0]!.toUpperCase() + s.slice(1);

/** The colour language of each mechanic (C52); Phase is red | blue. */
const mechanicColor = (m: Mechanic): number => ({ weight: PALETTE.weight, light: PALETTE.light, phase: PALETTE.phaseRed, gate: PALETTE.gatePairs[0]! })[m];
/** Which mechanic each seal belongs to: the Hard that restores it (C21, C105). */
const SEAL_MECHANIC: Record<Seal, Mechanic> = { 1: 'weight', 2: 'light', 3: 'gate', 4: 'phase' };

const text = (size: number, color: number = PALETTE.text, bold = false): Phaser.Types.GameObjects.Text.TextStyle => ({
  fontFamily: 'monospace',
  fontSize: `${size}px`,
  color: cssHex(color),
  fontStyle: bold ? 'bold' : 'normal',
});

export class MenuScene extends Phaser.Scene {
  private page: Page = 'title';
  private rows: Item[][] = [];
  private selRow = 0;
  private selCol = 0;
  private seedText = '';
  private deco?: Phaser.GameObjects.Graphics;

  constructor() {
    super('Menu');
  }

  create(data?: { page?: Page }): void {
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

    const back = this.registry.get('menuReturn') as Page | undefined;
    this.registry.remove('menuReturn');
    this.page = data?.page ?? back ?? 'title';
    this.rows = [];
    this.selRow = 0;
    this.selCol = 0;
    this.deco = undefined;
    this.seedText = String(urlSeed ?? Expedition.lastSeed() ?? '');
    this.cameras.main.setBackgroundColor(PALETTE.background).fadeIn(160, 21, 22, 26);
    this.drawFloor();

    const progress = loadProgress(PROGRESS_GRAPH, browserStore());
    if (this.page === 'title') this.buildTitle(progress);
    else if (this.page === 'expedition') this.buildExpedition(progress);
    else if (this.page === 'chambers') this.buildChambers(progress);
    else this.buildTools();

    const kb = this.input.keyboard!;
    kb.on('keydown-UP', () => this.select(this.selRow - 1, this.selCol));
    kb.on('keydown-DOWN', () => this.select(this.selRow + 1, this.selCol));
    kb.on('keydown-LEFT', () => this.select(this.selRow, this.selCol - 1));
    kb.on('keydown-RIGHT', () => this.select(this.selRow, this.selCol + 1));
    kb.on('keydown-ENTER', () => this.rows[this.selRow]?.[this.selCol]?.activate());
    kb.on('keydown-ESC', () => this.goBack());

    // Back to a chamber's tile when returning from it.
    const lastChamber = this.registry.get('menuChamber') as ChamberId | undefined;
    if (this.page === 'chambers' && lastChamber) {
      const r = CHAMBER_GRID.findIndex((row) => row.includes(lastChamber));
      if (r >= 0) return void this.select(r, CHAMBER_GRID[r]!.indexOf(lastChamber), false);
    }
    this.select(0, 0, false);
  }

  override update(): void {
    // The title's beam: a pulsing cyan line with a white core, in the game's Light language (C52).
    if (!this.deco) return;
    const pulse = 0.75 + 0.25 * Math.sin(this.time.now / 140);
    const g = this.deco.clear();
    g.fillStyle(0x1d2a33, 1).fillRect(286, 150, 18, 18);
    g.fillStyle(PALETTE.light, 1).fillRect(298, 154, 5, 10);
    g.lineStyle(10, PALETTE.light, 0.2 * pulse).lineBetween(304, 159, 724, 159);
    g.lineStyle(4, PALETTE.light, 0.85).lineBetween(304, 159, 724, 159);
    g.lineStyle(1.5, PALETTE.lightCore, 0.95).lineBetween(304, 159, 724, 159);
    g.fillStyle(0x1d2a33, 1).fillRect(724, 150, 18, 18);
    g.lineStyle(2, PALETTE.light, 1).strokeCircle(733, 159, 5);
    g.fillStyle(PALETTE.lightCore, pulse).fillCircle(733, 159, 3);
  }

  // --- screens ------------------------------------------------------------------------------------

  private buildTitle(progress: Progress): void {
    this.add.text(CX, 108, 'SEAL CHAMBERS', text(52, PALETTE.player, true)).setOrigin(0.5);
    this.deco = this.add.graphics();
    this.drawSeals(CX, 212, sealsOf(PROGRESS_GRAPH, progress), 17, 58);
    const total = CHAMBER_GRID.flat().length;
    this.add.text(CX, 248, `${progress.solved.length} / ${total} chambers solved`, text(13, PALETTE.dim)).setOrigin(0.5);

    const entries: [string, string, Page][] = [
      ['Expedition', isComplete(PROGRESS_GRAPH, progress) ? 'Remix runs, best time' : 'Runs through combat, puzzles and rewards', 'expedition'],
      ['Chamber select', 'Any of the twelve chambers, any time', 'chambers'],
      ['Options & tools', 'Sound, test room, playtest stats, reset', 'tools'],
    ];
    entries.forEach(([label, sub, page], i) => {
      this.rows.push([this.button(CX, 314 + i * 64, 400, 52, label, { sub, size: 19, onActivate: () => this.open(page) })]);
    });
    this.hint('arrows / mouse: choose    Enter: open    M: sound');
  }

  private buildExpedition(progress: Progress): void {
    this.header('EXPEDITION');
    const complete = isComplete(PROGRESS_GRAPH, progress);
    // What the next run deals (C11): exact when three or fewer chambers are open; otherwise the seed
    // picks three of the open ones, easiest first.
    const open = frontier(PROGRESS_GRAPH, progress);
    const sub = complete
      ? 'Any three chambers, hardest encounters, against the clock'
      : open.length <= 3
        ? `Deals: ${open.map((id) => CHAMBERS[id]?.name ?? id).join(' · ')}`
        : `Deals three of: ${open.join(' · ')}`;
    this.rows.push([this.button(CX, 150, 460, 70, complete ? 'Remix expedition' : 'New expedition', { sub, size: 22, accent: PALETTE.lightCore, onActivate: () => this.startRun(newSeed()) })]);

    const replay = this.button(CX, 238, 460, 48, '', { size: 16, onActivate: () => this.replaySeed() });
    this.rows.push([replay]);
    const refreshReplay = () => replay.label.setText(`Replay seed  ${this.seedText || '(type a number)'}`);
    refreshReplay();
    this.add.text(CX, 272, 'digits: type a seed    Backspace: delete', text(11, PALETTE.dim)).setOrigin(0.5);
    // Typing a seed (C72): the first digit replaces the remembered seed, the next ones append.
    let typing = false;
    this.input.keyboard!.on('keydown', (e: KeyboardEvent) => {
      if (/^[0-9]$/.test(e.key)) {
        const base = typing && this.seedText !== '0' ? this.seedText : '';
        typing = true;
        if (base.length >= MAX_SEED_DIGITS) return;
        this.seedText = base + e.key;
      } else if (e.key === 'Backspace') {
        typing = true;
        this.seedText = this.seedText.slice(0, -1);
      } else return;
      this.select(1, 0);
      refreshReplay();
    });

    // Saved progress (C76): seals, abilities, chambers solved, the Remix best time.
    this.panel(CX, 390, 560, 170);
    this.add.text(CX - 262, 318, 'PROGRESS', text(11, PALETTE.dim)).setOrigin(0, 0.5);
    const seals = sealsOf(PROGRESS_GRAPH, progress);
    this.add.text(CX - 262, 352, 'Seals', text(14)).setOrigin(0, 0.5);
    this.drawSeals(CX + 30, 352, seals, 13, 46);
    this.add.text(CX + 262, 352, `${seals.length} / 4`, text(13, PALETTE.dim)).setOrigin(1, 0.5);

    const owned = new Set(abilitiesOf(PROGRESS_GRAPH, progress));
    this.add.text(CX - 262, 396, 'Abilities', text(14)).setOrigin(0, 0.5);
    (['throw', 'bolt', 'dash'] as const).forEach((a, i) => {
      const x = CX - 70 + i * 100;
      const has = owned.has(a);
      this.add.rectangle(x, 396, 84, 26, has ? PANEL_SELECTED : PANEL).setStrokeStyle(2, has ? PALETTE.lightCore : PALETTE.terrainEdge);
      this.add.text(x, 396, cap(a), text(13, has ? PALETTE.lightCore : PALETTE.dim, has)).setOrigin(0.5);
    });

    const total = CHAMBER_GRID.flat().length;
    this.add.text(CX - 262, 440, 'Chambers', text(14)).setOrigin(0, 0.5);
    this.add.text(CX - 70 - 42, 440, `${progress.solved.length} / ${total} solved`, text(13, PALETTE.dim)).setOrigin(0, 0.5);
    const best = loadBest(browserStore());
    if (complete || best !== undefined) {
      this.add.text(CX + 262, 440, `Remix best ${best !== undefined ? formatTime(best) : '–'}`, text(13, PALETTE.dim)).setOrigin(1, 0.5);
    }
    this.hint('arrows / mouse: choose    Enter: start    digits: seed    Esc: back');
  }

  private buildChambers(progress: Progress): void {
    this.header('CHAMBER SELECT');
    this.add.text(CX, 82, 'Every chamber opens with its own kit. Progress is earned in expeditions.', text(12, PALETTE.dim)).setOrigin(0.5);
    const colX = [336, 566, 796];
    DIFFICULTIES.forEach((d, c) => this.add.text(colX[c]!, 114, d, text(13, PALETTE.dim)).setOrigin(0.5));

    const detail = {
      name: this.add.text(CX - 390, 410, '', text(18, PALETTE.player, true)).setOrigin(0, 0.5),
      facts: this.add.text(CX - 390, 438, '', text(13)).setOrigin(0, 0.5),
      feeling: this.add.text(CX - 390, 462, '', { ...text(13, PALETTE.dim), wordWrap: { width: 780 } }).setOrigin(0, 0),
    };
    this.panel(CX, 444, 820, 102).setDepth(-1);
    const show = (def: ChamberDef) => {
      detail.name.setText(def.name);
      const facts = [
        `${MECHANIC_NAMES[def.mechanic]} · ${cap(def.difficulty)}`,
        `kit: ${def.kit.length ? def.kit.map(cap).join(', ') : 'base'}`,
        ...(def.grants ? [`grants ${cap(def.grants)}`] : []),
        ...(def.seal ? [def.seal === 4 ? 'final chamber, seal 4' : `restores seal ${def.seal}`] : []),
        ...(isSolved(progress, def.id as ChamberId) ? ['solved ✓'] : []),
      ];
      detail.facts.setText(facts.join('   ·   '));
      detail.feeling.setText(def.intendedFeeling);
    };

    CHAMBER_GRID.forEach((row, r) => {
      const y = 150 + r * 58;
      const mech = CHAMBERS[row[0]!]!.mechanic;
      this.add.rectangle(146, y, 6, 30, mechanicColor(mech));
      if (mech === 'phase') this.add.rectangle(146, y + 7.5, 6, 15, PALETTE.phaseBlue);
      this.add.text(158, y, MECHANIC_NAMES[mech], text(15, PALETTE.dim)).setOrigin(0, 0.5);
      this.rows.push(
        row.map((id, c) => {
          const def = CHAMBERS[id]!;
          const item = this.tile(colX[c]!, y, def, isSolved(progress, id), () => {
            this.registry.set('menuReturn', 'chambers');
            this.registry.set('menuChamber', id);
            this.leave(() => this.scene.start('Chamber', { id }));
          });
          item.onSelect = () => show(def);
          return item;
        }),
      );
    });
    this.hint('arrows / mouse: choose    Enter: play    Esc: back');
  }

  private buildTools(): void {
    this.header('OPTIONS & TOOLS');
    const sound = this.button(CX, 150, 460, 48, '', {
      size: 16,
      onActivate: () => {
        Sfx.toggleMute();
        refreshSound();
      },
    });
    const refreshSound = () => sound.label.setText(`Sound: ${Sfx.muted ? 'off' : 'on'}   (M)`);
    refreshSound();
    this.input.keyboard!.on('keydown-M', () => this.time.delayedCall(0, refreshSound)); // M is handled globally (main.ts)

    const test = this.button(CX, 214, 460, 48, 'Movement test room', {
      size: 16,
      sub: 'tile markers for the movement metrics',
      onActivate: () => {
        this.registry.set('menuReturn', 'tools');
        this.leave(() => this.scene.start('TestRoom'));
      },
    });

    // Playtest stats (C81): copy the report to the clipboard, or clear it (twice).
    const n = Telemetry.count();
    const statsNote = this.add.text(CX, 254, `Playtest stats: ${n} attempt${n === 1 ? '' : 's'} recorded on this browser`, text(11, PALETTE.dim)).setOrigin(0.5);
    const copy = this.button(CX - 117, 290, 226, 44, 'Copy stats  (C)', {
      size: 15,
      onActivate: () => void copyStats(),
    });
    let clearArmed = false;
    const clear = this.button(CX + 117, 290, 226, 44, 'Clear stats', {
      size: 15,
      onActivate: () => {
        if (!clearArmed) {
          clearArmed = true;
          clear.label.setText('Clear: press again').setColor(cssHex(DANGER));
          return;
        }
        Telemetry.clear();
        this.scene.restart({ page: 'tools' });
      },
    });
    const copyStats = async () => {
      const report = Telemetry.report();
      const ok = await copyText(report);
      if (!ok) console.log(report); // last resort: the console
      if (statsNote.active) statsNote.setText(ok ? 'Copied to the clipboard' : 'Copy blocked: report printed to the console');
    };

    // Reset progress (C76), with a second press to confirm.
    let armed = false;
    const reset = this.button(CX, 368, 460, 48, 'Reset progress  (Delete)', {
      size: 16,
      sub: 'forget every solved chamber, ability and seal',
      onActivate: () => tryReset(),
    });
    const tryReset = () => {
      if (!armed) {
        armed = true;
        reset.label.setText('Press again to erase all progress').setColor(cssHex(DANGER));
        Sfx.refuse();
        this.time.delayedCall(3000, () => {
          armed = false;
          if (reset.label.active) reset.label.setText('Reset progress  (Delete)').setColor(cssHex(PALETTE.text));
        });
        return;
      }
      resetProgress(browserStore());
      this.scene.restart({ page: 'tools' });
    };

    this.rows = [[sound], [test], [copy, clear], [reset]];
    this.input.keyboard!.on('keydown-C', () => void copyStats());
    this.input.keyboard!.on('keydown-DELETE', tryReset);
    this.hint('arrows / mouse: choose    Enter: use    C: copy stats    Delete: reset    Esc: back');
  }

  // --- building blocks ---------------------------------------------------------------------------

  private header(title: string): void {
    this.add.text(CX, 44, title, text(26, PALETTE.player, true)).setOrigin(0.5);
    const back = this.add.text(24, 24, '‹ Esc: back', text(13, PALETTE.dim)).setOrigin(0, 0.5).setInteractive({ useHandCursor: true });
    back.on('pointerover', () => back.setColor(cssHex(PALETTE.text)));
    back.on('pointerout', () => back.setColor(cssHex(PALETTE.dim)));
    back.on('pointerdown', () => this.goBack());
  }

  private hint(s: string): void {
    this.add.text(CX, 530, s, text(12, PALETTE.dim)).setOrigin(0.5);
  }

  private panel(x: number, y: number, w: number, h: number): Phaser.GameObjects.Rectangle {
    return this.add.rectangle(x, y, w, h, PANEL, 0.6).setStrokeStyle(1, PALETTE.terrainEdge);
  }

  /** The terrain strip along the bottom of every screen (the game's floor, C52). */
  private drawFloor(): void {
    const g = this.add.graphics().setDepth(-2);
    g.fillStyle(PALETTE.terrain, 1).fillRect(0, 552, W, 24);
    g.fillStyle(PALETTE.terrainEdge, 1).fillRect(0, 552, W, 4);
  }

  /** Seals 1–4, each in its Hard's mechanic colour: filled when restored, an outline when not. */
  private drawSeals(cx: number, y: number, restored: readonly Seal[], r: number, gap: number): void {
    const g = this.add.graphics();
    SEALS.forEach((s, i) => {
      const x = cx + (i - 1.5) * gap;
      const mech = SEAL_MECHANIC[s];
      const on = restored.includes(s);
      if (mech === 'phase') {
        // Red | blue halves, like a crystal.
        g.fillStyle(PALETTE.phaseRed, on ? 1 : 0.18).slice(x, y, r, Math.PI / 2, (3 * Math.PI) / 2, false).fillPath();
        g.fillStyle(PALETTE.phaseBlue, on ? 1 : 0.18).slice(x, y, r, -Math.PI / 2, Math.PI / 2, false).fillPath();
      } else {
        g.fillStyle(mechanicColor(mech), on ? 1 : 0.18).fillCircle(x, y, r);
      }
      g.lineStyle(2, on ? PALETTE.lightCore : mechanicColor(mech), on ? 1 : 0.55).strokeCircle(x, y, r);
      if (on) g.fillStyle(PALETTE.lightCore, 1).fillCircle(x, y, r * 0.3);
    });
  }

  private button(
    x: number,
    y: number,
    w: number,
    h: number,
    label: string,
    opts: { size?: number; sub?: string; accent?: number; onActivate: () => void },
  ): Item & { label: Phaser.GameObjects.Text } {
    const accent = opts.accent ?? PALETTE.text;
    const box = this.add.rectangle(x, y, w, h, PANEL).setStrokeStyle(2, PALETTE.terrainEdge).setInteractive({ useHandCursor: true });
    const marker = this.add.rectangle(x - w / 2 + 3, y, 4, h - 10, accent).setVisible(false);
    const labelY = opts.sub ? y - 8 : y;
    const t = this.add.text(x, labelY, label, text(opts.size ?? 16, PALETTE.text, true)).setOrigin(0.5);
    const sub = opts.sub ? this.add.text(x, y + 12, opts.sub, text(11, PALETTE.dim)).setOrigin(0.5) : undefined;
    const item: Item & { label: Phaser.GameObjects.Text } = {
      label: t,
      activate: () => {
        Sfx.menuSelect();
        opts.onActivate();
      },
      setSelected: (on) => {
        box.setFillStyle(on ? PANEL_SELECTED : PANEL).setStrokeStyle(2, on ? accent : PALETTE.terrainEdge);
        marker.setVisible(on);
        sub?.setColor(cssHex(on ? PALETTE.text : PALETTE.dim));
      },
    };
    this.wire(box, item);
    return item;
  }

  /** A chamber tile: mechanic stripe, id, name, a ✓ when solved, and its seal on the Hards. */
  private tile(x: number, y: number, def: ChamberDef, solved: boolean, onActivate: () => void): Item {
    const w = 214;
    const h = 46;
    const color = mechanicColor(def.mechanic);
    const box = this.add.rectangle(x, y, w, h, PANEL).setStrokeStyle(2, PALETTE.terrainEdge).setInteractive({ useHandCursor: true });
    this.add.rectangle(x - w / 2 + 4, y, 5, h - 8, color);
    if (def.mechanic === 'phase') this.add.rectangle(x - w / 2 + 4, y + (h - 8) / 4, 5, (h - 8) / 2, PALETTE.phaseBlue);
    this.add.text(x - w / 2 + 16, y - 10, def.id, text(11, PALETTE.dim)).setOrigin(0, 0.5);
    const name = this.add.text(x - w / 2 + 16, y + 8, def.name, text(14, PALETTE.text, true)).setOrigin(0, 0.5);
    if (solved) this.add.text(x + w / 2 - 10, y - 10, '✓', text(14, PALETTE.gatePairs[0]!, true)).setOrigin(1, 0.5);
    if (def.seal) {
      const g = this.add.graphics();
      const sx = x + w / 2 - 16;
      g.lineStyle(2, def.seal === 4 ? PALETTE.lightCore : color, 0.9).strokeCircle(sx, y + 8, 7);
      this.add.text(sx, y + 8, String(def.seal), text(9, PALETTE.dim)).setOrigin(0.5);
    }
    const item: Item = {
      activate: () => {
        Sfx.menuSelect();
        onActivate();
      },
      setSelected: (on) => {
        box.setFillStyle(on ? PANEL_SELECTED : PANEL).setStrokeStyle(2, on ? color : PALETTE.terrainEdge);
        name.setColor(cssHex(on ? PALETTE.player : PALETTE.text));
      },
    };
    this.wire(box, item);
    return item;
  }

  /** Mouse: hovering selects, clicking activates. */
  private wire(box: Phaser.GameObjects.Rectangle, item: Item): void {
    box.on('pointerover', () => {
      const r = this.rows.findIndex((row) => row.includes(item));
      if (r >= 0) this.select(r, this.rows[r]!.indexOf(item));
    });
    box.on('pointerdown', () => item.activate());
  }

  // --- navigation --------------------------------------------------------------------------------

  private select(r: number, c: number, sound = true): void {
    if (this.rows.length === 0) return;
    const row = Phaser.Math.Wrap(r, 0, this.rows.length);
    const width = this.rows[row]!.length;
    const col = Math.min(Phaser.Math.Wrap(c, 0, Math.max(width, 1)), width - 1);
    if (sound && (row !== this.selRow || col !== this.selCol)) Sfx.menuMove();
    this.selRow = row;
    this.selCol = col;
    this.rows.forEach((items, rr) => items.forEach((it, cc) => it.setSelected(rr === row && cc === col)));
    this.rows[row]![col]!.onSelect?.();
  }

  private open(page: Page): void {
    this.leave(() => this.scene.restart({ page }));
  }

  private goBack(): void {
    if (this.page === 'title') return;
    Sfx.menuBack();
    this.leave(() => this.scene.restart({ page: 'title' }));
  }

  /** A short fade, then the next screen or scene. */
  private leave(next: () => void): void {
    this.input.keyboard?.removeAllListeners();
    this.cameras.main.fadeOut(120, 21, 22, 26);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, next);
  }

  private replaySeed(): void {
    const seed = Number(this.seedText);
    if (Number.isInteger(seed) && seed > 0) this.startRun(seed);
    else {
      Sfx.refuse();
      this.cameras.main.shake(80, 0.003);
    }
  }

  private startRun(seed: number): void {
    this.registry.set('menuReturn', 'expedition');
    this.leave(() => {
      try {
        Expedition.start(this, seed);
      } catch {
        this.scene.restart({ page: 'expedition' }); // nothing to deal (cannot happen: Remix once complete)
      }
    });
  }
}
