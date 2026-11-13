import { symbolInfo } from './legend';
import type { ChamberModel, Device, MirrorState, PhaseColor } from './types';

/** Inputs the game layer reports to the logic once per physics step. */
export interface WorldReport {
  /** Ids of plates with something heavy resting on them (player, crate, enemy). */
  pressedPlates: ReadonlySet<string>;
  /** "row,col" keys of every cell currently overlapped by a body (for "never close on occupants"). */
  occupiedCells: ReadonlySet<string>;
}

/** What changed during the last update, so the game can play feedback (sound, particles, flash). */
export interface LogicEvents {
  opened: string[];
  closed: string[];
  phaseSwapped: boolean;
  mirrorsFlipped: string[];
}

const cellKey = (r: number, c: number) => `${r},${c}`;
const flip = (m: MirrorState): MirrorState => (m === '/' ? '\\' : '/');

/**
 * The puzzle rules of one chamber, independent of any engine (C85). It owns phase state, mirror
 * states and signal evaluation, and answers "is this cell solid right now?".
 *
 * Rules implemented here (decision log):
 * - Signals: a target is powered when its sources are on (OR, or AND for exits / explicit AND). C30
 * - Doors and trapdoors open while powered and never close on an occupant. C30
 * - Unwired doors are permanent doorways. Legend
 * - One red/blue state per chamber; crystals toggle it, never a timer. C28
 * - Ghost rule: a block that becomes solid on an occupant stays non-solid until vacated. C30
 * - Mirrors are 2-state and flipped by hits; mirrors wired to a plate are locked to it. C26, C42
 */
export class ChamberLogic {
  phase: PhaseColor;
  private readonly devices: ReadonlyMap<string, Device>;
  private readonly sourcesOf = new Map<string, { from: readonly string[]; logic: 'OR' | 'AND' }>();
  private readonly openDoors = new Set<string>();
  private readonly mirrorStates = new Map<string, MirrorState>();
  private readonly wiredMirrors = new Set<string>();
  private readonly ghosted = new Set<string>();
  private readonly deviceAt = new Map<string, Device>();
  private pressed = new Set<string>();
  private litReceivers = new Set<string>();
  private pending: LogicEvents = { opened: [], closed: [], phaseSwapped: false, mirrorsFlipped: [] };

  constructor(private readonly model: ChamberModel) {
    this.phase = model.def.initialPhase;
    this.devices = new Map(model.devices.map((d) => [d.id, d]));
    for (const d of model.devices) for (const [r, c] of d.cells) this.deviceAt.set(cellKey(r, c), d);
    for (const l of model.links) {
      this.sourcesOf.set(l.to, { from: l.from, logic: l.logic });
      if (this.devices.get(l.to)?.kind === 'mirror') this.wiredMirrors.add(l.to);
    }
    for (const d of model.devices) if (d.kind === 'mirror' && d.mirror) this.mirrorStates.set(d.id, d.mirror);
    // Unwired doors are doorways: always open.
    for (const d of model.devices) if (d.kind === 'door' && !this.sourcesOf.has(d.id)) this.openDoors.add(d.id);
  }

  // --- player / world actions -------------------------------------------------------------------

  /** A crystal was hit (melee or Bolt): swap the colours. */
  hitCrystal(id: string, occupied: ReadonlySet<string>): void {
    if (this.devices.get(id)?.kind !== 'crystal') return;
    this.phase = this.phase === 'red' ? 'blue' : 'red';
    this.pending.phaseSwapped = true;
    // Ghost rule: newly solid blocks that are occupied right now stay passable until vacated.
    const nowSolid = this.phase === 'red' ? 'R' : 'B';
    this.model.grid.forEach((row, r) => {
      [...row].forEach((ch, c) => {
        if (ch === nowSolid && occupied.has(cellKey(r, c))) this.ghosted.add(cellKey(r, c));
      });
    });
  }

  /** A mirror was hit. Returns false if it is locked to a plate (C42). */
  hitMirror(id: string): boolean {
    const state = this.mirrorStates.get(id);
    if (state === undefined || this.wiredMirrors.has(id)) return false;
    this.mirrorStates.set(id, flip(state));
    this.pending.mirrorsFlipped.push(id);
    return true;
  }

  /** Beam results from the light system (Day 3). */
  setLitReceivers(ids: ReadonlySet<string>): void {
    this.litReceivers = new Set(ids);
  }

  // --- evaluation -----------------------------------------------------------------------------------

  /** Re-evaluates signals for this step. Call once per physics step. */
  update(report: WorldReport): void {
    this.pressed = new Set(report.pressedPlates);

    // Release ghosted cells that are no longer occupied.
    for (const k of [...this.ghosted]) if (!report.occupiedCells.has(k)) this.ghosted.delete(k);

    // Wired mirrors follow their plate: flipped from their initial state while powered.
    for (const id of this.wiredMirrors) {
      const initial = this.devices.get(id)!.mirror!;
      const want = this.isPowered(id) ? flip(initial) : initial;
      if (this.mirrorStates.get(id) !== want) {
        this.mirrorStates.set(id, want);
        this.pending.mirrorsFlipped.push(id);
      }
    }

    // Doors, trapdoors and the exit.
    for (const [id, dev] of this.devices) {
      if (!(dev.kind === 'door' || dev.kind === 'trapdoor' || dev.kind === 'exit')) continue;
      if (!this.sourcesOf.has(id)) continue; // unwired doorway stays open
      const wasOpen = this.openDoors.has(id);
      const powered = this.isPowered(id);
      const blocked = dev.cells.some(([r, c]) => report.occupiedCells.has(cellKey(r, c)));
      const open = powered || (wasOpen && blocked); // never close on an occupant
      if (open && !wasOpen) {
        this.openDoors.add(id);
        this.pending.opened.push(id);
      } else if (!open && wasOpen) {
        this.openDoors.delete(id);
        this.pending.closed.push(id);
      }
    }
  }

  /** Returns and clears the events collected since the last call. */
  takeEvents(): LogicEvents {
    const e = this.pending;
    this.pending = { opened: [], closed: [], phaseSwapped: false, mirrorsFlipped: [] };
    return e;
  }

  // --- queries ------------------------------------------------------------------------------------

  /** Is a signal source (plate or receiver) on right now? Wires light up from this. */
  isSourceOn(id: string): boolean {
    return this.pressed.has(id) || this.litReceivers.has(id);
  }

  isPowered(targetId: string): boolean {
    const s = this.sourcesOf.get(targetId);
    if (!s) return false;
    const on = (id: string) => this.isSourceOn(id);
    return s.logic === 'AND' ? s.from.every(on) : s.from.some(on);
  }

  /** One entry per exit input, for the lamps on the exit door (C52). */
  exitLamps(): { source: string; on: boolean }[] {
    const s = this.sourcesOf.get('exit');
    return (s?.from ?? []).map((source) => ({ source, on: this.isSourceOn(source) }));
  }

  isOpen(id: string): boolean {
    return this.openDoors.has(id);
  }

  mirrorState(id: string): MirrorState | undefined {
    return this.mirrorStates.get(id);
  }

  isMirrorLocked(id: string): boolean {
    return this.wiredMirrors.has(id);
  }

  isGhosted(r: number, c: number): boolean {
    return this.ghosted.has(cellKey(r, c));
  }

  /** Is this cell solid right now? (terrain, solid devices, closed doors, the active phase colour). */
  isSolid(r: number, c: number): boolean {
    const ch = this.model.grid[r]?.[c] ?? '#';
    if (ch === 'R' || ch === 'B') {
      const active = (ch === 'R') === (this.phase === 'red');
      return active && !this.ghosted.has(cellKey(r, c));
    }
    const dev = this.deviceAt.get(cellKey(r, c));
    if (dev && (dev.kind === 'door' || dev.kind === 'trapdoor' || dev.kind === 'exit')) return !this.openDoors.has(dev.id);
    return symbolInfo(ch)?.tile === 'solid';
  }
}
