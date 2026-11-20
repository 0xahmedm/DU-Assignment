import type Phaser from 'phaser';
import type { ChamberId } from '../core/chamber/types';
import { generateRun, runAbilities, type RunPlan } from '../core/run/generator';
import { isComplete, loadProgress, saveProgress, sealsOf, solve } from '../core/run/progression';
import type { RoomDef } from '../core/run/rooms';
import { recordRemixTime } from '../core/run/records';
import { formatTime } from '../core/run/telemetry';
import { newRun, type RunState } from '../core/run/upgrades';
import { CHAMBERS } from '../data/chambers';
import { CONNECTORS, EXIT_ROOM, REWARD_ROOM, START_ROOM } from '../data/rooms/expedition';
import { browserStore, PROGRESS_GRAPH } from './progress';
import { ROOM_EVENTS, type ChamberScene, type PlayData } from './scenes/ChamberScene';

const LAST_SEED_KEY = 'seal-chambers.lastSeed';
const cap = (s: string) => s[0]!.toUpperCase() + s.slice(1);

/**
 * Runs one expedition (C8, C12, C72): plays the generated rooms in order through the chamber
 * scene, records every solved chamber in the save at once (so a lost run keeps it, C7), passes
 * the run's hearts and upgrades from room to room, and shows the summary at the Seal altar.
 * Returning to the menu (Esc, run over, run complete) ends it.
 */
export class Expedition {
  private static current: Expedition | undefined;

  private step = 0;
  private run: RunState;
  private readonly solvedThisRun: ChamberId[] = [];

  /** Starts a run from `from` (the menu). Remix once every seal is restored (C71). */
  static start(from: Phaser.Scene, seed: number): RunPlan {
    Expedition.stop();
    const store = browserStore();
    const progress = loadProgress(PROGRESS_GRAPH, store);
    const remix = isComplete(PROGRESS_GRAPH, progress);
    const plan = generateRun(PROGRESS_GRAPH, progress, seed, CONNECTORS.map((c) => c.id), remix);
    try {
      store?.setItem(LAST_SEED_KEY, String(plan.seed));
    } catch {
      // Replay seed just won't remember it.
    }
    const exp = new Expedition(from.game, plan, newRun(plan.seed, runAbilities(PROGRESS_GRAPH, progress, remix)));
    Expedition.current = exp;
    from.scene.start('Chamber', exp.playData(firstBanner(plan)));
    return plan;
  }

  /** Ends the current run (called whenever the menu opens). */
  static stop(): void {
    Expedition.current?.detach();
    Expedition.current = undefined;
  }

  static get active(): boolean {
    return Expedition.current !== undefined;
  }

  /** The seed of the last run started on this browser (for "Replay seed"). */
  static lastSeed(): number | undefined {
    try {
      const n = Number(browserStore()?.getItem(LAST_SEED_KEY));
      return Number.isInteger(n) && n > 0 ? n : undefined;
    } catch {
      return undefined;
    }
  }

  private constructor(
    private readonly game: Phaser.Game,
    readonly plan: RunPlan,
    run: RunState,
  ) {
    this.run = run;
    game.events.on(ROOM_EVENTS.done, this.onDone, this);
    game.events.on(ROOM_EVENTS.runComplete, this.onComplete, this);
  }

  private detach(): void {
    this.game.events.off(ROOM_EVENTS.done, this.onDone, this);
    this.game.events.off(ROOM_EVENTS.runComplete, this.onComplete, this);
  }

  /** What the chamber scene needs for the current step. */
  private playData(banner?: string): PlayData {
    const step = this.plan.steps[this.step]!;
    const expedition = { seed: this.plan.seed, step: this.step + 1, total: this.plan.steps.length, remix: this.plan.remix, banner };
    if (step.kind === 'chamber') return { id: step.id, run: this.run, expedition };
    const def: RoomDef =
      step.kind === 'start' ? START_ROOM : step.kind === 'reward' ? REWARD_ROOM : step.kind === 'exit' ? EXIT_ROOM : CONNECTORS.find((c) => c.id === step.roomId)!;
    // Outside chambers every owned ability works (C24).
    return { room: { def, tier: this.plan.tier, kit: this.run.abilities }, run: this.run, expedition };
  }

  /** A room or chamber was finished: record a solved chamber, then play the next step. */
  private onDone(_id: string, run: RunState | undefined): void {
    if (run) this.run = run;
    const step = this.plan.steps[this.step]!;
    let banner: string | undefined;
    if (step.kind === 'chamber') banner = this.recordSolve(step.id);
    this.step = Math.min(this.step + 1, this.plan.steps.length - 1);
    this.chamberScene()?.scene.restart(this.playData(banner));
  }

  /** Saves the solve at once (C7) and returns what it gave, for the next room's banner. */
  private recordSolve(id: ChamberId): string {
    const store = browserStore();
    const result = solve(PROGRESS_GRAPH, loadProgress(PROGRESS_GRAPH, store), id);
    saveProgress(store, result.progress);
    this.solvedThisRun.push(id);
    const name = `${id} ${CHAMBERS[id]?.name ?? ''} solved`;
    if (result.ability && !this.run.abilities.includes(result.ability)) {
      // A new permanent ability works for the rest of this run, too (outside chambers, C24).
      this.run = { ...this.run, abilities: [...this.run.abilities, result.ability] };
    }
    if (!result.first) return `${name}`;
    if (result.completed) return `${name}!\nAll three seals are restored.`;
    if (result.seal) return `${name}!\nSeal ${result.seal} restored.`;
    if (result.ability) return `${name}!\nNew ability: ${cap(result.ability)}`;
    return `${name}!`;
  }

  /** The Seal altar: the run is won. */
  private onComplete(run: RunState | undefined): void {
    if (run) this.run = run;
    const progress = loadProgress(PROGRESS_GRAPH, browserStore());
    const seals = sealsOf(PROGRESS_GRAPH, progress);
    const sealLine = `Seals ${[1, 2, 3].map((s) => (seals.includes(s as 1 | 2 | 3) ? '●' : '○')).join('')}`;
    const solved = this.solvedThisRun.length ? `Solved: ${this.solvedThisRun.join(', ')}` : 'No new chambers';
    const end = isComplete(PROGRESS_GRAPH, progress) && !this.plan.remix ? '\nRemix expeditions unlocked.' : '';
    // Run time; Remix runs also chase a best time (C71).
    let time = `Time ${formatTime(this.run.timeMs)}`;
    if (this.plan.remix) {
      const r = recordRemixTime(browserStore(), this.run.timeMs);
      time += r.improved ? '  (new best!)' : `  (best ${formatTime(r.best)})`;
    }
    this.chamberScene()?.showEnd(
      `${this.plan.remix ? 'Remix complete!' : 'Expedition complete!'}\nSeed ${this.plan.seed}   ${time}\n${this.plan.remix ? '' : `${solved}\n`}${sealLine}${end}`,
    );
  }

  private chamberScene(): ChamberScene | undefined {
    return this.game.scene.getScene('Chamber') as ChamberScene | undefined;
  }
}

function firstBanner(plan: RunPlan): string {
  const names = plan.chambers.map((id) => `${id} ${CHAMBERS[id]?.name ?? ''}`).join(' · ');
  return `${plan.remix ? 'Remix expedition' : 'Expedition'} · seed ${plan.seed}\n${names}`;
}
