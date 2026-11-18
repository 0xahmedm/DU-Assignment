import type { KeyValueStore } from './progression';

/**
 * Built-in playtest telemetry (C81): one record per attempt at a chamber or combat room, with
 * active play time, hold-R resets, defeats (hearts lost in an expedition) and how it ended.
 * Defeats and resets restart the room but continue the same attempt; it ends when the room is
 * solved, left (menu, next room) or the run is over. Exported as a Markdown table for
 * `docs/playtests/`, the hard numbers behind the Day 6 before/after. Engine-free.
 */

export type Outcome = 'solved' | 'left' | 'run-over';

export interface Attempt {
  /** Chamber id (W-E) or room id (room:arena). */
  id: string;
  kind: 'chamber' | 'room';
  mode: 'select' | 'expedition';
  seed?: number;
  /** ISO time the attempt started (passed in by the game). */
  started: string;
  /** Active play time, ms (physics steps only: not paused, not in the defeat sequence). */
  timeMs: number;
  resets: number;
  defeats: number;
  heartsLost: number;
  outcome?: Outcome;
}

export function startAttempt(a: Pick<Attempt, 'id' | 'kind' | 'mode' | 'seed' | 'started'>): Attempt {
  return { ...a, timeMs: 0, resets: 0, defeats: 0, heartsLost: 0 };
}

export const addTime = (a: Attempt, ms: number): Attempt => ({ ...a, timeMs: a.timeMs + Math.max(0, ms) });
export const addReset = (a: Attempt): Attempt => ({ ...a, resets: a.resets + 1 });
export const addDefeat = (a: Attempt, heartLost: boolean): Attempt => ({ ...a, defeats: a.defeats + 1, heartsLost: a.heartsLost + (heartLost ? 1 : 0) });
export const finish = (a: Attempt, outcome: Outcome): Attempt => ({ ...a, outcome });

// --- the log -------------------------------------------------------------------------------------

export const TELEMETRY_KEY = 'seal-chambers.telemetry';
/** Plenty for three playtest sessions; the oldest records go first. */
export const MAX_RECORDS = 500;

export function serializeLog(log: readonly Attempt[]): string {
  return JSON.stringify({ version: 1, attempts: log.slice(-MAX_RECORDS) });
}

export function parseLog(text: string | null): Attempt[] {
  if (!text) return [];
  try {
    const data = JSON.parse(text) as { version?: unknown; attempts?: unknown };
    if (data.version !== 1 || !Array.isArray(data.attempts)) return [];
    return data.attempts.filter(
      (a): a is Attempt =>
        typeof a === 'object' && a !== null && typeof (a as Attempt).id === 'string' && typeof (a as Attempt).timeMs === 'number',
    );
  } catch {
    return [];
  }
}

export function loadLog(store: KeyValueStore | undefined): Attempt[] {
  try {
    return parseLog(store?.getItem(TELEMETRY_KEY) ?? null);
  } catch {
    return [];
  }
}

export function saveLog(store: KeyValueStore | undefined, log: readonly Attempt[]): boolean {
  try {
    store?.setItem(TELEMETRY_KEY, serializeLog(log));
    return store !== undefined;
  } catch {
    return false;
  }
}

export function clearLog(store: KeyValueStore | undefined): void {
  try {
    store?.removeItem(TELEMETRY_KEY);
  } catch {
    // nothing reachable to clear
  }
}

// --- the report ----------------------------------------------------------------------------------

/** 95 s → "1:35". */
export function formatTime(ms: number): string {
  const s = Math.round(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

/**
 * The clipboard export: every attempt in order, then a summary per chamber/room (attempts,
 * solved, total and best solve time, resets, defeats, hearts lost). `nameOf` adds readable names.
 */
export function formatReport(log: readonly Attempt[], exportedAt: string, nameOf: (id: string) => string = (id) => id): string {
  const lines: string[] = [`# Seal Chambers playtest stats`, ``, `Exported ${exportedAt}; ${log.length} attempt${log.length === 1 ? '' : 's'}.`, ``];
  if (log.length === 0) return [...lines, 'No attempts recorded yet.'].join('\n');

  lines.push('## Attempts', '', '| # | Started | Chamber / room | Mode | Seed | Result | Time | Resets | Defeats | Hearts lost |', '|---|---|---|---|---|---|---|---|---|---|');
  log.forEach((a, i) => {
    lines.push(
      `| ${i + 1} | ${a.started.slice(11, 16)} | ${nameOf(a.id)} | ${a.mode} | ${a.seed ?? ''} | ${a.outcome ?? 'in progress'} | ${formatTime(a.timeMs)} | ${a.resets} | ${a.defeats} | ${a.mode === 'expedition' ? a.heartsLost : '–'} |`,
    );
  });

  lines.push('', '## Per chamber / room', '', '| Chamber / room | Attempts | Solved | Total time | Best solve | Resets | Defeats | Hearts lost |', '|---|---|---|---|---|---|---|---|');
  const ids = [...new Set(log.map((a) => a.id))];
  for (const id of ids) {
    const rows = log.filter((a) => a.id === id);
    const solved = rows.filter((a) => a.outcome === 'solved');
    const sum = (f: (a: Attempt) => number) => rows.reduce((n, a) => n + f(a), 0);
    const best = solved.length ? formatTime(Math.min(...solved.map((a) => a.timeMs))) : '–';
    lines.push(`| ${nameOf(id)} | ${rows.length} | ${solved.length} | ${formatTime(sum((a) => a.timeMs))} | ${best} | ${sum((a) => a.resets)} | ${sum((a) => a.defeats)} | ${sum((a) => a.heartsLost)} |`);
  }
  return lines.join('\n');
}
