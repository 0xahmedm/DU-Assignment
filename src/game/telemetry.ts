import {
  addDefeat,
  addHeartLost,
  addReset,
  addTime,
  clearLog,
  finish,
  formatReport,
  loadLog,
  saveLog,
  startAttempt,
  type Attempt,
  type Outcome,
} from '../core/run/telemetry';
import { CHAMBERS } from '../data/chambers';
import { CONNECTORS } from '../data/rooms/expedition';
import type { ChamberId } from '../core/chamber/types';
import { browserStore } from './progress';

/**
 * Records playtest telemetry (C81) for the chamber scene: the open attempt lives here, so it
 * survives the scene restarts that defeats and resets cause. Finished attempts are saved at once,
 * so a reload doesn't lose a session.
 */
let current: Attempt | undefined;
let log: Attempt[] | undefined;
const records = () => (log ??= loadLog(browserStore()));

/** Local time, "2026-11-19 14:03" (the report shows HH:MM). */
const stamp = (d = new Date()) => {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
};

export const Telemetry = {
  /** Entering a chamber or combat room. The same room again (after a defeat or reset) continues the attempt. */
  enter(id: string, kind: Attempt['kind'], mode: Attempt['mode'], seed?: number): void {
    if (current && current.id === id) return;
    Telemetry.end('left');
    current = startAttempt({ id, kind, mode, seed, started: stamp() });
  },
  tick(ms: number): void {
    if (current) current = addTime(current, ms);
  },
  reset(): void {
    if (current) current = addReset(current);
  },
  defeat(heartLost: boolean): void {
    if (current) current = addDefeat(current, heartLost);
  },
  /** A heart lost to a beam (C110), in a run or in chamber select. */
  heartLost(): void {
    if (current) current = addHeartLost(current);
  },
  /** Closes the open attempt (solved, left, run over) and saves the log. */
  end(outcome: Outcome): void {
    if (!current) return;
    records().push(finish(current, outcome));
    current = undefined;
    saveLog(browserStore(), records());
  },
  count(): number {
    return records().length;
  },
  report(): string {
    return formatReport(records(), stamp(), nameOf);
  },
  clear(): void {
    log = [];
    current = undefined;
    clearLog(browserStore());
  },
};

function nameOf(id: string): string {
  if (id.startsWith('room:')) {
    const room = CONNECTORS.find((c) => `room:${c.id}` === id);
    return room ? `${room.name} (room)` : id;
  }
  const c = CHAMBERS[id as ChamberId];
  return c ? `${id} ${c.name}` : id;
}

/**
 * Copies text to the clipboard. The Clipboard API needs a secure page (https, localhost); the
 * old textarea + execCommand route covers the double-clicked single-file build.
 */
export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // fall through
  }
  try {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand('copy');
    ta.remove();
    return ok;
  } catch {
    return false;
  }
}
