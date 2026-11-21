/**
 * Chamber data model. `ChamberDef` is what data files (src/data/chambers) declare;
 * `ChamberModel` is what the parser produces for the game and the logic systems.
 */

export type ChamberId =
  | 'W-E' | 'W-M' | 'W-H'
  | 'L-E' | 'L-M' | 'L-H'
  | 'P-E' | 'P-M' | 'P-H'
  | 'G-E' | 'G-M' | 'G-H';
/** Expedition rooms go through the same parser and scene; their ids are prefixed (core/run/rooms). */
export type RoomRef = `room:${string}`;
export type Mechanic = 'weight' | 'light' | 'phase' | 'gate';
/** Seals restored by the Hards (C21); the fourth arrived with the Gates mechanic (C105). */
export type Seal = 1 | 2 | 3 | 4;
export type Difficulty = 'easy' | 'medium' | 'hard';
export type Ability = 'throw' | 'bolt' | 'dash';
export type PhaseColor = 'red' | 'blue';
export type Dir = 'up' | 'down' | 'left' | 'right';
export type MirrorState = '/' | '\\';

/** Cell address inside one section: [row, col]. */
export type Cell = readonly [number, number];

export interface SectionDef {
  id: string;
  /** Text grid copied verbatim from the decision log (C53). */
  grid: readonly string[];
  /**
   * For every section after the first: this section's cell `at` is placed on top of the previous
   * section's cell `onto`. Overlapping cells merge (a door wins over a wall).
   */
  attach?: { at: Cell; onto: Cell };
}

export interface LinkDef {
  /** Source device ids (plates by letter, receivers/crystals by name). */
  from: string | readonly string[];
  /** Target device id (door, trapdoor, exit, wired mirror). */
  to: string;
  /** How multiple sources combine. Exits default to AND (one lamp per input), others to OR. */
  logic?: 'OR' | 'AND';
}

export interface ChamberDef {
  id: ChamberId | RoomRef;
  name: string;
  mechanic: Mechanic;
  difficulty: Difficulty;
  prerequisites: readonly ChamberId[];
  /** Abilities allowed inside the chamber besides the base kit (C24). */
  kit: readonly Ability[];
  /** Ability granted when the chamber is solved (C23). */
  grants?: Ability;
  /** Seal restored when solved (C21). */
  seal?: Seal;
  initialPhase: PhaseColor;
  sections: readonly SectionDef[];
  /** Gives readable ids to devices: key "sectionId:row,col" (any cell of the device). */
  names?: Readonly<Record<string, string>>;
  links: readonly LinkDef[];
  /** Ordered intended solution (debug overlay, playtest checklist). */
  solution: readonly string[];
  /** The feeling this chamber is designed to create (GDD, follow-up call). */
  intendedFeeling: string;
  /** Set when the exit has no inputs on purpose (a plain doorway, e.g. P-E, P-M); states why. */
  exitAlwaysOpen?: string;
  /** Set when crates have no dispenser because the layout cannot lose them (validator warning otherwise). */
  cratesCannotBeLost?: string;
  /**
   * Enemies the solution uses (a walker it needs on a plate, C109): they need not be defeated for
   * the exit to open. Every other enemy must be. Default 0.
   */
  enemiesUsed?: number;
}

// ---------------------------------------------------------------------------------------------
// Parsed model

export type TileKind = 'empty' | 'solid' | 'red' | 'blue';

export type DeviceKind =
  | 'plate'
  | 'door'
  | 'exit'
  | 'trapdoor'
  | 'dispenser'
  | 'crystal'
  | 'emitter'
  | 'mirror'
  | 'receiver'
  | 'gate';

export interface Device {
  id: string;
  kind: DeviceKind;
  /** World cells this device occupies (plate strips and doors can span several). */
  cells: readonly Cell[];
  /** Emitters only. */
  dir?: Dir;
  /** Mirrors only: initial state. */
  mirror?: MirrorState;
  /** Gate pairs only (C106): the two gates' cells, each top to bottom. `cells` holds both. */
  gates?: readonly [readonly Cell[], readonly Cell[]];
}

export interface Spawn {
  kind: 'walker' | 'shieldbearer' | 'crate';
  cell: Cell;
}

export interface ChamberModel {
  def: ChamberDef;
  /** Stitched world grid (all sections), padded with '#'. */
  grid: readonly string[];
  width: number;
  height: number;
  /** Where each section's [0,0] landed in the world. */
  sectionOrigins: Readonly<Record<string, Cell>>;
  start: Cell;
  devices: readonly Device[];
  spawns: readonly Spawn[];
  links: readonly { from: readonly string[]; to: string; logic: 'OR' | 'AND' }[];
}
