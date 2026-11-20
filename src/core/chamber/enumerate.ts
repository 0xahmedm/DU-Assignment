import { traceBeams } from '../light/beams';
import { ChamberLogic } from './logic';
import type { ChamberModel, MirrorState, PhaseColor } from './types';

/**
 * Logic-state enumerator (C51). Tries every combination of the chamber's logical inputs:
 * - the phase colour (if the chamber has phase blocks or crystals),
 * - every free mirror's two states (plate-wired mirrors follow their plates, C42),
 * - every plate pressed or not (what weighs it down is a physical question, left to the
 *   reachability checker and playtests),
 * lets signals and beams settle, and records which receivers light and whether the exit opens.
 *
 * It proves the intended configuration opens the exit and lists every other configuration that
 * also does, so unintended solutions can be reviewed by hand (docs/enumerator-report.md).
 */
export interface Configuration {
  phase: PhaseColor;
  mirrors: Record<string, MirrorState>;
  plates: string[];
}

export interface Outcome extends Configuration {
  lit: string[];
  exitOpen: boolean;
}

const flip = (m: MirrorState): MirrorState => (m === '/' ? '\\' : '/');

/** The chamber's logical inputs. */
export function inputsOf(model: ChamberModel): { phases: PhaseColor[]; mirrors: string[]; plates: string[] } {
  const wired = new Set(model.links.map((l) => l.to));
  const hasPhase = model.grid.some((row) => /[RB]/.test(row)) || model.devices.some((d) => d.kind === 'crystal');
  return {
    phases: hasPhase ? ['red', 'blue'] : [model.def.initialPhase],
    mirrors: model.devices.filter((d) => d.kind === 'mirror' && !wired.has(d.id)).map((d) => d.id),
    plates: model.devices.filter((d) => d.kind === 'plate').map((d) => d.id),
  };
}

/** Settles one configuration: beams light receivers, receivers drive doors and mirrors, repeat. */
export function evaluate(model: ChamberModel, config: Configuration): Outcome {
  const logic = new ChamberLogic(model);
  logic.phase = config.phase;
  const initial = new Map(model.devices.filter((d) => d.kind === 'mirror').map((d) => [d.id, d.mirror!]));
  for (const [id, state] of Object.entries(config.mirrors)) if (initial.get(id) !== state) logic.hitMirror(id);
  const report = { pressedPlates: new Set(config.plates), occupiedCells: new Set<string>() };
  let lit = new Set<string>();
  for (let i = 0; i < 8; i++) {
    logic.update(report);
    const trace = traceBeams(model, { isSolid: (r, c) => logic.isSolid(r, c), mirrorAt: (r, c) => logic.mirrorAt(r, c), blocks: () => false, gateOn: (id) => logic.isGateOn(id) });
    const same = trace.lit.size === lit.size && [...trace.lit].every((x) => lit.has(x));
    lit = trace.lit;
    logic.setLitReceivers(lit);
    if (same && i > 0) break;
  }
  logic.update(report);
  return { ...config, lit: [...lit].sort(), exitOpen: logic.isOpen('exit') };
}

/** Every configuration, in a stable order. */
export function enumerate(model: ChamberModel): Outcome[] {
  const { phases, mirrors, plates } = inputsOf(model);
  const initial = new Map(model.devices.filter((d) => d.kind === 'mirror').map((d) => [d.id, d.mirror!]));
  const out: Outcome[] = [];
  for (const phase of phases) {
    for (let m = 0; m < 1 << mirrors.length; m++) {
      const mirrorStates: Record<string, MirrorState> = {};
      mirrors.forEach((id, i) => (mirrorStates[id] = m & (1 << i) ? flip(initial.get(id)!) : initial.get(id)!));
      for (let p = 0; p < 1 << plates.length; p++) {
        out.push(evaluate(model, { phase, mirrors: mirrorStates, plates: plates.filter((_, i) => p & (1 << i)) }));
      }
    }
  }
  return out;
}
