import type Phaser from 'phaser';
import type { ChamberId } from '../core/chamber/types';
import { generateRun, runAbilities, type RunPlan, type RunStep } from '../core/run/generator';
import { ENDLESS_LIMITS, endlessLevel, endlessStep } from '../core/run/endless';
import { isComplete, loadProgress, saveProgress, sealsOf, solve } from '../core/run/progression';
import type { RoomDef } from '../core/run/rooms';
import { recordEndless, recordRemixTime } from '../core/run/records';
import { formatTime } from '../core/run/telemetry';
import { gainAbility, newRun, type RunState } from '../core/run/upgrades';
import type { Ability } from '../core/chamber/types';
import { ABILITY_INFO } from '../core/player/abilities';
import { CHAMBER_GRID, CHAMBERS } from '../data/chambers';
import { CONNECTORS, EXIT_ROOM, REWARD_ROOM, START_ROOM } from '../data/rooms/expedition';
import { DevOptions } from './devOptions';
import { browserStore, PROGRESS_GRAPH } from './progress';
import { ROOM_EVENTS, type ChamberScene, type PlayData } from './scenes/ChamberScene';

const LAST_SEED_KEY = 'seal-chambers.lastSeed';

/**
 * Runs one expedition (C8, C12, C72): plays the generated rooms in order through the chamber
 * scene, records every solved chamber in the save at once (so a lost run keeps it, C7), passes
 * the run's hearts and upgrades from room to room, and shows the summary at the Seal altar.
 * Endless runs (C113) have no altar: rooms keep coming, harder every loop, until the hearts run
 * out; the score is the rooms cleared. Returning to the menu (Esc, run over, run complete) ends it.
 * The HUD shows rooms cleared, never how many are left (C114); seeds only with developer options.
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
    rememberSeed(plan.seed);
    const exp = new Expedition(from.game, plan, newRun(plan.seed, runAbilities(PROGRESS_GRAPH, progress, remix)), false);
    Expedition.current = exp;
    from.scene.start('Chamber', exp.playData(firstBanner(plan, false, exp.run.abilities)));
    return plan;
  }

  /** Starts an endless run (C113): after completion, every chamber and ability, no altar. */
  static startEndless(from: Phaser.Scene, seed: number): void {
    Expedition.stop();
    const plan: RunPlan = { seed: seed >>> 0, remix: false, tier: 'T2', chambers: [], steps: [] };
    rememberSeed(plan.seed);
    // Endless limits (C115): 4 upgrades at most (a new one replaces the oldest), max hearts 4.
    const run = { ...newRun(plan.seed, runAbilities(PROGRESS_GRAPH, loadProgress(PROGRESS_GRAPH, browserStore()), true)), limits: ENDLESS_LIMITS };
    const exp = new Expedition(from.game, plan, run, true);
    Expedition.current = exp;
    from.scene.start('Chamber', exp.playData(firstBanner(plan, true)));
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
    private readonly endless: boolean,
  ) {
    this.run = run;
    game.events.on(ROOM_EVENTS.done, this.onDone, this);
    game.events.on(ROOM_EVENTS.runComplete, this.onComplete, this);
    if (endless) game.events.on(ROOM_EVENTS.runOver, this.onEndlessOver, this);
  }

  private detach(): void {
    this.game.events.off(ROOM_EVENTS.done, this.onDone, this);
    this.game.events.off(ROOM_EVENTS.runComplete, this.onComplete, this);
    this.game.events.off(ROOM_EVENTS.runOver, this.onEndlessOver, this);
  }

  /** The room at position `i`: from the plan, or generated on the fly in an endless run. */
  private stepAt(i: number): RunStep {
    if (this.endless) return endlessStep(this.plan.seed, i, CHAMBER_GRID.flat(), CONNECTORS.map((c) => c.id));
    return this.plan.steps[Math.min(i, this.plan.steps.length - 1)]!;
  }

  /** What the chamber scene needs for the current step. */
  private playData(banner?: string, unlocked?: Ability): PlayData {
    const step = this.stepAt(this.step);
    // Rooms cleared so far (the start room counts once you leave it); never the total (C114).
    const expedition = { seed: this.plan.seed, cleared: this.step, remix: this.plan.remix, endless: this.endless, banner, unlocked };
    if (step.kind === 'chamber') return { id: step.id, run: this.run, expedition };
    const def: RoomDef =
      step.kind === 'start' ? START_ROOM : step.kind === 'reward' ? REWARD_ROOM : step.kind === 'exit' ? EXIT_ROOM : CONNECTORS.find((c) => c.id === step.roomId)!;
    // Endless: combat rooms harden every loop (C113); puzzle chambers never change.
    const level = this.endless ? endlessLevel(this.step) : undefined;
    const tier = level?.tier ?? this.plan.tier;
    const mods = level && step.kind === 'connector' ? { extraHp: level.extraHp, speedScale: level.speedScale } : undefined;
    // Outside chambers every owned ability works (C24).
    return { room: { def, tier, kit: this.run.abilities, mods }, run: this.run, expedition };
  }

  /** A room or chamber was finished: record a solved chamber, then play the next step. */
  private onDone(_id: string, run: RunState | undefined): void {
    if (run) this.run = run;
    const step = this.stepAt(this.step);
    const solved = step.kind === 'chamber' ? this.recordSolve(step.id) : undefined;
    this.step = this.endless ? this.step + 1 : Math.min(this.step + 1, this.plan.steps.length - 1);
    this.chamberScene()?.scene.restart(this.playData(solved?.banner, solved?.unlocked));
  }

  /**
   * Saves the solve at once (C7) and returns what it gave, for the next room: a banner, and a new
   * ability for the unlock card (C117), which takes the banner's place.
   */
  private recordSolve(id: ChamberId): { banner: string; unlocked?: Ability } {
    const store = browserStore();
    const result = solve(PROGRESS_GRAPH, loadProgress(PROGRESS_GRAPH, store), id);
    saveProgress(store, result.progress);
    this.solvedThisRun.push(id);
    const name = `${id} ${CHAMBERS[id]?.name ?? ''} solved`;
    // A new permanent ability works for the rest of this run, too (outside chambers, C24).
    this.run = gainAbility(this.run, result.ability);
    if (!result.first) return { banner: name };
    if (result.completed) return { banner: `${name}!\nAll four seals are restored.` };
    if (result.seal) return { banner: `${name}!\nSeal ${result.seal} restored.` };
    if (result.ability) return { banner: `${name}!`, unlocked: result.ability };
    return { banner: `${name}!` };
  }

  /** The Seal altar: the run is won. */
  private onComplete(run: RunState | undefined): void {
    if (run) this.run = run;
    const progress = loadProgress(PROGRESS_GRAPH, browserStore());
    const seals = sealsOf(PROGRESS_GRAPH, progress);
    const sealLine = `Seals ${([1, 2, 3, 4] as const).map((s) => (seals.includes(s) ? '●' : '○')).join('')}`;
    const solved = this.solvedThisRun.length ? `Solved: ${this.solvedThisRun.join(', ')}` : 'No new chambers';
    const end = isComplete(PROGRESS_GRAPH, progress) && !this.plan.remix ? '\nRemix expeditions unlocked.' : '';
    // Run time; Remix runs also chase a best time (C71).
    let time = `Time ${formatTime(this.run.timeMs)}`;
    if (this.plan.remix) {
      const r = recordRemixTime(browserStore(), this.run.timeMs);
      time += r.improved ? '  (new best!)' : `  (best ${formatTime(r.best)})`;
    }
    const seed = DevOptions.on ? `Seed ${this.plan.seed}   ` : '';
    this.chamberScene()?.showEnd(
      `${this.plan.remix ? 'Remix complete!' : 'Expedition complete!'}\n${seed}${this.step + 1} rooms cleared   ${time}\n${this.plan.remix ? '' : `${solved}\n`}${sealLine}${end}`,
    );
  }

  /** An endless run ends when the hearts run out (C113): the score is the rooms cleared. */
  private onEndlessOver(run: RunState | undefined): void {
    if (run) this.run = run;
    const rooms = this.step;
    const r = recordEndless(browserStore(), rooms);
    const best = r.improved ? 'New best!' : `Best: ${r.best} rooms`;
    const seed = DevOptions.on ? `Seed ${this.plan.seed}   ` : '';
    this.chamberScene()?.showEnd(`Endless run over\n${seed}${rooms} room${rooms === 1 ? '' : 's'} cleared, reached level ${endlessLevel(rooms).level + 1}\n${best}`);
  }

  private chamberScene(): ChamberScene | undefined {
    return this.game.scene.getScene('Chamber') as ChamberScene | undefined;
  }
}

function rememberSeed(seed: number): void {
  try {
    browserStore()?.setItem(LAST_SEED_KEY, String(seed));
  } catch {
    // Replay seed just won't remember it.
  }
}

/**
 * The opening banner: the mode, the seed for testers (C114), the chambers dealt and, in a normal
 * run, the abilities you own (C117), so an ability upgrade later on never comes as a surprise.
 */
function firstBanner(plan: RunPlan, endless: boolean, abilities: readonly Ability[] = []): string {
  const seed = DevOptions.on ? ` · seed ${plan.seed}` : '';
  if (endless) return `Endless expedition${seed}\nRooms keep coming, harder as you go. How far can you get?`;
  const names = plan.chambers.map((id) => `${id} ${CHAMBERS[id]?.name ?? ''}`).join(' · ');
  const owned = !plan.remix && abilities.length ? `\nYour abilities: ${abilities.map((a) => ABILITY_INFO[a].name).join(' · ')}` : '';
  return `${plan.remix ? 'Remix expedition' : 'Expedition'}${seed}\n${names}${owned}`;
}
