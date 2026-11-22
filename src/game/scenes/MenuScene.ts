import Phaser from 'phaser';
import type { ChamberDef, ChamberId, Mechanic, Seal } from '../../core/chamber/types';
import { newSeed } from '../../core/run/generator';
import { abilitiesOf, frontier, isComplete, isSolved, loadProgress, resetProgress, sealsOf, type Progress } from '../../core/run/progression';
import type { Tier } from '../../core/run/rooms';
import { CHAMBER_GRID, CHAMBERS } from '../../data/chambers';
import { CONNECTORS, EXIT_ROOM, REWARD_ROOM, START_ROOM } from '../../data/rooms/expedition';
import { Sfx } from '../audio/Sfx';
import { Expedition } from '../expedition';
import { DevOptions } from '../devOptions';
import { browserStore, PROGRESS_GRAPH } from '../progress';
import { copyText, Telemetry } from '../telemetry';
import { loadBest, loadEndlessBest } from '../../core/run/records';
import { formatTime } from '../../core/run/telemetry';
import { cssHex, PALETTE } from '../render/palette';
import { CONTROL_ROWS } from '../input/controlsText';

/**
 * Main menu (C53, C72, reworked as C108): a title screen with three entries, each opening its own
 * screen:
 * - Expedition: New (or Remix) expedition, Replay seed, saved progress (seals, abilities, solved).
 * - Chamber select: the 4 × 3 grid as tiles coloured by mechanic, with details of the selected one.
 * - How to play and Controls (C111): the goal, the rules, the four mechanics; every key.
 * - Options & tools: sound, the movement test room, playtest stats, reset progress.
 * Arrow keys + Enter, or the mouse; Esc goes back. Opening the menu ends any running expedition.
 * Leaving for a chamber, a run or the test room remembers the screen, so Esc there comes back to it.
 */
type Page = 'title' | 'expedition' | 'chambers' | 'howto' | 'controls' | 'tools';

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
    else if (this.page === 'howto') this.buildHowTo();
    else if (this.page === 'controls') this.buildControls();
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
    this.add.text(CX, 96, 'SEAL CHAMBERS', text(52, PALETTE.player, true)).setOrigin(0.5);
    this.deco = this.add.graphics();
    this.drawSeals(CX, 196, sealsOf(PROGRESS_GRAPH, progress), 17, 58);
    const total = CHAMBER_GRID.flat().length;
    this.add.text(CX, 230, `${progress.solved.length} / ${total} chambers solved`, text(13, PALETTE.dim)).setOrigin(0.5);

    const y0 = 290;
    const step = 58;
    const entry = (y: number, label: string, sub: string, page: Page) => this.button(CX, y, 400, 48, label, { sub, size: 18, onActivate: () => this.open(page) });
    this.rows.push([entry(y0, 'Expedition', isComplete(PROGRESS_GRAPH, progress) ? 'Remix runs, best time' : 'Runs through combat, puzzles and rewards', 'expedition')]);
    this.rows.push([entry(y0 + step, 'Chamber select', 'Any of the twelve chambers, any time', 'chambers')]);
    this.rows.push([
      this.button(CX - 103, y0 + 2 * step, 194, 48, 'How to play', { size: 16, onActivate: () => this.open('howto') }),
      this.button(CX + 103, y0 + 2 * step, 194, 48, 'Controls', { size: 16, onActivate: () => this.open('controls') }),
    ]);
    this.rows.push([entry(y0 + 3 * step, 'Options & tools', 'Sound, test room, playtest stats, reset', 'tools')]);
    this.hint('arrows / mouse: choose    Enter: open    M: sound');
  }

  private buildExpedition(progress: Progress): void {
    this.header('EXPEDITION');
    const complete = isComplete(PROGRESS_GRAPH, progress);
    if (complete) {
      // After completion (C71, C113): Remix runs against the clock, or Endless for the longest run.
      const best = loadBest(browserStore());
      const endlessBest = loadEndlessBest(browserStore());
      this.rows.push([
        this.button(CX - 117, 146, 226, 76, 'Remix', {
          sub: `four chambers, timed\nbest ${best !== undefined ? formatTime(best) : '–'}`,
          size: 20,
          accent: PALETTE.lightCore,
          onActivate: () => this.startRun(newSeed()),
        }),
        this.button(CX + 117, 146, 226, 76, 'Endless', {
          sub: `harder every few rooms\nbest ${endlessBest !== undefined ? `${endlessBest} rooms` : '–'}`,
          size: 20,
          accent: PALETTE.enemy,
          onActivate: () => this.startEndless(),
        }),
      ]);
    } else {
      // What the next run deals (C11): exact when four or fewer chambers are open; otherwise the
      // seed picks four of the open ones, easiest first.
      const open = frontier(PROGRESS_GRAPH, progress);
      const sub = open.length <= 4 ? `Deals: ${open.map((id) => CHAMBERS[id]?.name ?? id).join(' · ')}` : `Deals four of: ${open.join(' · ')}`;
      this.rows.push([this.button(CX, 150, 460, 70, 'New expedition', { sub, size: 22, accent: PALETTE.lightCore, onActivate: () => this.startRun(newSeed()) })]);
    }

    // Replay seed: testers only (developer options, C114).
    const replay = DevOptions.on ? this.button(CX, 238, 460, 44, '', { size: 16, onActivate: () => this.replaySeed() }) : undefined;
    if (replay) this.rows.push([replay]);
    const refreshReplay = () => replay?.label.setText(`Replay seed  ${this.seedText || '(type a number)'}`);
    refreshReplay();
    if (replay) this.add.text(CX, 270, 'developer option · digits: type a seed    Backspace: delete', text(11, PALETTE.dim)).setOrigin(0.5);
    // Typing a seed (C72): the first digit replaces the remembered seed, the next ones append.
    let typing = false;
    if (replay) this.input.keyboard!.on('keydown', (e: KeyboardEvent) => {
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

    this.hint(DevOptions.on ? 'arrows / mouse: choose    Enter: start    digits: seed    Esc: back' : 'arrows / mouse: choose    Enter: start    Esc: back');
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

  /** How to play (C111): the goal, the rules and the four mechanics, in two columns. */
  private buildHowTo(): void {
    this.header('HOW TO PLAY');
    const col = (x: number, y: number, title: string, lines: readonly (readonly [string, number?])[]) => {
      this.add.text(x, y, title, text(12, PALETTE.dim)).setOrigin(0, 0);
      let yy = y + 22;
      for (const [line, swatch] of lines) {
        const indent = swatch !== undefined ? 16 : 0;
        if (swatch !== undefined) this.add.rectangle(x + 4, yy + 8, 6, 14, swatch);
        if (swatch === PALETTE.phaseRed) this.add.rectangle(x + 4, yy + 11.5, 6, 7, PALETTE.phaseBlue);
        const t = this.add.text(x + indent, yy, line, { ...text(12, PALETTE.text), wordWrap: { width: 410 - indent }, lineSpacing: 2 });
        yy += t.height + 9;
      }
      return yy;
    };
    const left = 92;
    const right = 532;
    const y = col(left, 84, 'THE GOAL', [
      ['Restore the four seals. Each Hard chamber restores one; Eclipse, the last, needs the other three.'],
      ['An expedition: two combat rooms, a puzzle chamber and an upgrade pick (stand on a pedestal, press E), up to four times, then the Seal altar. Solved chambers, abilities and seals are kept; hearts and upgrades last one run.'],
      ['Chamber select plays any chamber at any time. Progress is earned in expeditions.'],
    ]);
    col(left, y + 6, 'THE RULES', [
      ['An exit opens when its puzzle is solved and its enemies are defeated. A walker the puzzle needs on a plate may stay.'],
      ['In a run: touching an enemy costs a heart and restarts the room; a beam pushes you back and costs a heart. 3 hearts per run (the Mend upgrade gives one back).'],
      ['In chamber select: touching an enemy restarts the chamber; you get 3 hearts per attempt for beam hits. Stuck anywhere? Hold R to reset.'],
    ]);
    col(right, 84, 'THE MECHANICS', [
      ['Weight: a plate holds its door open while something heavy rests on it: you, a crate or an enemy.', PALETTE.weight],
      ['Light: hit mirrors to turn beams; a lit receiver powers its door. Beams block your way and hurt.', PALETTE.light],
      ['Phase: hit a crystal to swap which colour, red or blue, is solid. Where you stand matters.', PALETTE.phaseRed],
      ['Gates: what goes into one frame comes out of its twin, going the same way. Light, crates and enemies too.', PALETTE.gatePairs[0]!],
      ['Abilities, from the Medium chambers: Throw a crate 5 tiles, Bolt a target from afar, Dash 4 tiles (beams cannot touch you).'],
    ]);
    this.hint('Esc: back    Controls are on their own screen');
  }

  /** Controls (C111): every key, from the keymap; abilities marked until they are unlocked. */
  private buildControls(): void {
    this.header('CONTROLS');
    const keysX = CX + 40;
    CONTROL_ROWS.forEach((row, i) => {
      const y = 100 + i * 30;
      this.add.rectangle(CX, y, 620, 26, i % 2 === 0 ? PANEL : PALETTE.background, 0.8);
      this.add.text(CX - 296, y, row.action, text(14)).setOrigin(0, 0.5);
      if (row.ability) this.add.text(keysX - 20, y, 'ability', text(11, PALETTE.dim)).setOrigin(1, 0.5);
      this.add.text(keysX, y, row.keys, text(14, PALETTE.lightCore, true)).setOrigin(0, 0.5);
    });
    const y = 100 + CONTROL_ROWS.length * 30 + 18;
    this.add.text(CX, y, 'Abilities work once unlocked, and only in chambers that allow them.', text(12, PALETTE.dim)).setOrigin(0.5);
    this.add.text(CX, y + 30, 'MENU', text(12, PALETTE.dim)).setOrigin(0.5);
    this.add
      .text(CX, y + 54, 'arrows or mouse: choose    Enter or click: open    Esc: back\ndigits: type a seed (Expedition)    C: copy stats    Delete: reset progress (Options & tools)', { ...text(12), align: 'center', lineSpacing: 4 })
      .setOrigin(0.5, 0);
    this.hint('Esc: back');
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

    // Developer options (C114): seeds and Replay seed, for testers.
    const dev = this.button(CX, 440, 460, 48, '', {
      size: 16,
      sub: 'for testers: shows seeds and Replay seed',
      onActivate: () => {
        DevOptions.toggle();
        refreshDev();
      },
    });
    const refreshDev = () => dev.label.setText(`Developer options: ${DevOptions.on ? 'on' : 'off'}`);
    refreshDev();

    this.rows = [[sound], [test], [copy, clear], [reset], [dev]];
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
    const subLines = opts.sub ? opts.sub.split('\n').length : 0;
    const labelY = subLines > 1 ? y - 16 : subLines ? y - 8 : y;
    const t = this.add.text(x, labelY, label, text(opts.size ?? 16, PALETTE.text, true)).setOrigin(0.5);
    const sub = opts.sub ? this.add.text(x, y + 12, opts.sub, { ...text(11, PALETTE.dim), align: 'center' }).setOrigin(0.5) : undefined;
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

  private startEndless(): void {
    this.registry.set('menuReturn', 'expedition');
    this.leave(() => Expedition.startEndless(this, newSeed()));
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
