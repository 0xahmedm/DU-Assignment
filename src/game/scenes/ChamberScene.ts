import Phaser from 'phaser';
import { symbolInfo } from '../../core/chamber/legend';
import { cellsHitBySwing } from '../../core/combat/melee';
import { exposedFaces } from '../../core/chamber/collision';
import { dropCell, feedingDispenser } from '../../core/chamber/dispensers';
import { ChamberLogic, type HitResult } from '../../core/chamber/logic';
import { beamContact, segmentLine, traceBeams, type BeamTrace, type BeamWorld } from '../../core/light/beams';
import { GateMap, passThrough } from '../../core/gates/gates';
import { nearestFreeMirror, nearestSource, targetsOf, withMirrorFlipped } from '../../core/light/insight';
import { BOLT, boltEnemyLanes, boltStart, enemiesOnLanes, traceBolt } from '../../core/player/bolt';
import { parseChamber } from '../../core/chamber/parser';
import type { Ability, ChamberDef, ChamberId, ChamberModel } from '../../core/chamber/types';
import { roomToChamber, type RewardChoice, type RoomDef, type Tier } from '../../core/run/rooms';
import {
  effectsOf,
  newRun,
  NO_UPGRADES,
  offersFor,
  takeUpgrade,
  upgradeById,
  UPGRADES,
  type RunState,
  type UpgradeEffects,
  type UpgradeId,
} from '../../core/run/upgrades';
import { MELEE, swingBox } from '../../core/combat/melee';
import { loseHeart, newHearts, type Hearts } from '../../core/run/hearts';
import { replacedBy } from '../../core/run/upgrades';
import { enemiesLeft, enemiesRespawn } from '../../core/run/clearing';
import { controlsLine } from '../input/controlsText';
import { DevOptions } from '../devOptions';
import { Telemetry } from '../telemetry';
import { formatTime } from '../../core/run/telemetry';
import type { Device } from '../../core/chamber/types';
import { validateChamber } from '../../core/chamber/validator';
import { PLAYER_BODY, TILE } from '../../core/player/metrics';
import { CHAMBERS } from '../../data/chambers';
import { Controls } from '../input/Controls';
import { touches, type HitOutcome } from '../../core/combat/enemies';
import { Sfx } from '../audio/Sfx';
import { PatrolEnemy, SHIELDBEARER_KIND, WALKER_KIND } from '../enemies/PatrolEnemy';
import { Crate } from '../player/Crate';
import { Player } from '../player/Player';
import { ChamberView } from '../render/ChamberView';
import { bandBounds } from '../render/camera';
import { afterimage, dust, ring, sparks } from '../render/fx';
import { cssHex, gateColor, PALETTE } from '../render/palette';

const RESET_HOLD_MS = 1000; // hold R this long to reset (C51)

/**
 * What to play: a puzzle chamber by id, or an expedition room with its encounter tier (C101).
 * `run` is the expedition's hearts and upgrades (C10); without it there are none (level select,
 * C67). A room opened alone (URL) gets a fresh run so its pedestals and upgrades can be tried.
 */
export interface PlayData {
  id?: ChamberId;
  /** `mods`: endless runs harden combat rooms (C113): extra hits per enemy, faster patrols. */
  room?: { def: RoomDef; tier: Tier; choices?: readonly RewardChoice[]; kit?: readonly Ability[]; mods?: { extraHp: number; speedScale: number } };
  run?: RunState;
  /**
   * Set by the expedition controller: the seed (shown only with developer options, C114), rooms
   * cleared so far (never the total), the mode, and a one-off banner.
   */
  expedition?: { seed: number; cleared: number; remix: boolean; endless: boolean; banner?: string };
}

const GUARD_GRACE = 1; // s of invulnerability after Guard absorbs a hit
const BEAM_GRACE = 1; // s after a beam hit before the next one costs a heart (C110); the push back never stops
const QUIET_START_STEPS = 20; // ~1/3 s: crates settling and starting signals make no sound
/** HUD bars (C116): the title and hearts on top, the controls at the bottom; the world sits between. */
export const HUD_TOP = 48;
export const HUD_BOTTOM = 26;

/** Game events a run controller listens to (the expedition loop, Day 5). */
export const ROOM_EVENTS = { done: 'room-done', reward: 'reward-picked', runComplete: 'run-complete', runOver: 'run-over' } as const;
/** Cells whose solidity changes during play (doors, trapdoors, exit, phase blocks). */
const SWITCHABLE = new Set(['R', 'B', '|', 'K', '=', 'E']);
const key = (r: number, c: number) => `${r},${c}`;

interface Bounds {
  left: number;
  right: number;
  top: number;
  bottom: number;
}

/**
 * Plays one puzzle chamber. Physics bodies and drawing live here; every rule comes from
 * core/ChamberLogic. Once per physics step: move the player, report plates and occupancy to the
 * logic, then switch door / phase-block bodies on or off to match what the logic says is solid.
 */
export class ChamberScene extends Phaser.Scene {
  private model!: ChamberModel;
  private logic!: ChamberLogic;
  private view!: ChamberView;
  private player!: Player;
  private controls!: Controls;
  private crates: Crate[] = [];
  private enemies: PatrolEnemy[] = [];
  private cellBodies: { r: number; c: number; body: Phaser.Physics.Arcade.StaticBody }[] = [];
  private pressed: ReadonlySet<string> = new Set();
  private beams: BeamTrace = { segments: [], lit: new Set(), cells: new Set(), gateCells: new Set() };
  private gates!: GateMap;
  /** Each body's centre x on the previous physics step, to see it cross a gate's centre line (C106). */
  private prevCentre = new Map<Phaser.Physics.Arcade.Body, number>();
  /** Cells overlapped by bodies at the last step (ghost rule for hits that land later, e.g. a Bolt). */
  private lastOccupied: ReadonlySet<string> = new Set();
  private resetHeldMs = 0;
  private resetRing!: Phaser.GameObjects.Graphics;
  private solved = false;
  /** Set during the defeat sequence (C54, C62): the step loop stops until the chamber restarts. */
  private defeated = false;
  private chamberId: ChamberId = 'W-E';
  private play: PlayData = {};
  private pedestals: { col: number; row: number; label: Phaser.GameObjects.Text; block: Phaser.GameObjects.Rectangle }[] = [];
  private picked = false;
  private info!: Phaser.GameObjects.Text;
  private fx: UpgradeEffects = NO_UPGRADES;
  private offers: readonly RewardChoice[] = [];
  private guardLeft = 0;
  /** Enemies already hit by the current Dash (Phantom Dash hits each once). */
  private dashHit = new Set<PatrolEnemy>();
  private hud: Phaser.GameObjects.Text | undefined;
  /** Insight (C67): the beam a flip of the nearest free mirror would make, and plate targets. */
  private insight: { mirror?: Device; ghost?: BeamTrace; targets: Device[] } = { targets: [] };
  private insightG: Phaser.GameObjects.Graphics | undefined;
  /** The Remix clock's last shown second (-1 = no clock). */
  private shownSecond = -1;
  /** Steps at room start without state-change feedback (a door that starts powered isn't news). */
  private quietSteps = QUIET_START_STEPS;
  /** Seconds until a beam hit costs a heart again (C110). */
  private beamGrace = 0;
  /** Chamber select: 3 hearts per attempt, lost only to beams (C110); undefined in a run. */
  private selectHearts: Hearts | undefined;
  /** Enemies the exit still waits for (C109), and whether that was true last step. */
  private enemiesNote: Phaser.GameObjects.Text | undefined;
  private waitingForEnemies = false;
  /** Each enemy's spawn row, to notice one that fell far below it (out of reach, C109). */
  private enemySpawnRows: number[] = [];
  /** "[E] take …" over the player on a reward pedestal (C116). */
  private prompt: Phaser.GameObjects.Text | undefined;

  constructor() {
    super('Chamber');
  }

  init(data: PlayData): void {
    this.play = data.room ? data : { ...data, id: data.id ?? this.chamberId };
    this.dashHit = new Set();
    this.insight = { targets: [] };
    this.hud = undefined;
    this.insightG = undefined;
    this.shownSecond = -1;
    this.quietSteps = QUIET_START_STEPS;
    this.chamberId = data.id ?? this.chamberId;
    this.pedestals = [];
    this.picked = false;
    this.crates = [];
    this.enemies = [];
    this.cellBodies = [];
    this.pressed = new Set();
    this.beams = { segments: [], lit: new Set(), cells: new Set(), gateCells: new Set() };
    this.resetHeldMs = 0;
    this.solved = false;
    this.defeated = false;
  }

  create(): void {
    const room = this.play.room;
    const def: ChamberDef | undefined = room ? roomToChamber(room.def) : CHAMBERS[this.chamberId];
    if (!def) {
      this.showMessage(`Chamber ${this.chamberId} is not built yet.\nPress Esc for the menu.`);
      this.input.keyboard?.once('keydown-ESC', () => this.scene.start('Menu'));
      return;
    }
    const parsed = parseChamber(def);
    if (!parsed.model) {
      this.showMessage(`Chamber ${def.id} failed to parse:\n${parsed.errors.join('\n')}`);
      return;
    }
    this.model = parsed.model;
    const report = validateChamber(this.model);
    if (report.errors.length > 0) {
      this.showMessage(`Chamber ${def.id} failed validation:\n${report.errors.join('\n')}`);
      return;
    }
    if (import.meta.env.DEV && report.warnings.length > 0) console.warn(report.warnings.join('\n'));

    this.logic = new ChamberLogic(this.model);
    const width = this.model.width * TILE;
    const height = this.model.height * TILE;
    this.physics.world.setBounds(0, 0, width, height);
    // The world sits in the band between the HUD bars (C116): centred when it is smaller, and able to
    // scroll fully into view when it is larger, so the bars never hide part of it.
    const cam = bandBounds(width, height, this.scale.width, this.scale.height, HUD_TOP, HUD_BOTTOM);
    this.cameras.main.setBounds(cam.x, cam.y, cam.width, cam.height).setBackgroundColor(PALETTE.background);

    // Collision: one static body per cell that is, or can become, solid (terrain, solid devices,
    // doors, trapdoors, the exit, phase blocks). syncSolids() switches bodies on/off from the logic
    // and turns off faces between solid cells, so walls have no seams to snag on.
    const solids = this.physics.add.staticGroup();
    this.model.grid.forEach((row, r) => {
      [...row].forEach((ch, c) => {
        if (!SWITCHABLE.has(ch) && symbolInfo(ch)?.tile !== 'solid') return;
        const rect = this.add.rectangle(c * TILE + TILE / 2, r * TILE + TILE / 2, TILE, TILE).setVisible(false);
        solids.add(rect);
        this.cellBodies.push({ r, c, body: rect.body as Phaser.Physics.Arcade.StaticBody });
      });
    });

    this.view = new ChamberView(this, this.model, this.logic);
    this.gates = new GateMap(this.model);
    this.prevCentre = new Map();
    this.controls = new Controls(this);
    const [sr, sc] = this.model.start;
    const kitOverride = this.registry.get('kitOverride') as readonly Ability[] | undefined; // dev only (main.ts)
    const kit = new Set(kitOverride ?? room?.kit ?? def.kit);
    // A room opened alone (URL) gets a fresh run, so its pedestals deal real offers (C64). The
    // dev-only ?upgrades= also gives a URL-opened chamber a run, to try Insight / Throw Sight.
    const devUpgrades = this.registry.get('upgradeOverride') as UpgradeId[] | undefined; // dev only (main.ts)
    if ((room || devUpgrades) && !this.play.run) {
      const seed = (this.registry.get('seed') as number | undefined) ?? Math.floor(Math.random() * 2 ** 31);
      const run = newRun(seed, [...kit]);
      this.play.run = devUpgrades ? devUpgrades.reduce(takeUpgrade, run) : run;
    }
    const run = this.play.run;
    this.fx = run ? effectsOf(run.upgrades) : NO_UPGRADES;
    this.guardLeft = this.fx.guardPerRoom;
    this.player = new Player(this, sc * TILE + TILE / 2, (sr + 1) * TILE - PLAYER_BODY.height / 2, this.controls, kit, this.fx);
    this.physics.add.collider(this.player.hitbox, solids);

    for (const s of this.model.spawns.filter((x) => x.kind === 'crate')) {
      const crate = new Crate(this, s.cell[1] * TILE + TILE / 2, s.cell[0] * TILE + TILE / 2, feedingDispenser(this.model, s.cell));
      this.crates.push(crate);
      this.physics.add.collider(crate.rect, solids);
      this.physics.add.collider(this.player.hitbox, crate.rect);
    }
    // Patrolling enemies stand on their spawn cell's floor. No player collider: touching one is a
    // defeat (C55), checked every step. `enemies` holds every patroller.
    // Rooms take their enemies from the encounter tier (R4) and never respawn them (R1).
    const spawns = room ? (room.def.tiers?.[room.tier] ?? []) : this.model.spawns.filter((x) => x.kind === 'walker' || x.kind === 'shieldbearer');
    // Respawning (C109): only in a chamber whose enemies are all used by its solution.
    const respawns = enemiesRespawn(room ? 'connector' : 'chamber', spawns.length, room ? 0 : (def.enemiesUsed ?? 0));
    this.enemySpawnRows = spawns.map((s) => s.cell[0]);
    const mods = room?.mods;
    for (const s of spawns) {
      const base = s.kind === 'walker' ? WALKER_KIND : SHIELDBEARER_KIND;
      const kind = mods ? { ...base, speed: base.speed * mods.speedScale } : base;
      const enemy = new PatrolEnemy(this, s.cell[1] * TILE + TILE / 2, (s.cell[0] + 1) * TILE, kind, respawns, mods?.extraHp ?? 0);
      this.enemies.push(enemy);
      this.physics.add.collider(enemy.rect, solids);
      for (const c of this.crates) this.physics.add.collider(enemy.rect, c.rect);
    }

    for (let i = 0; i < this.crates.length; i++) {
      for (let j = i + 1; j < this.crates.length; j++) this.physics.add.collider(this.crates[i]!.rect, this.crates[j]!.rect);
    }

    this.add
      .text(12, 10, `${room ? `${def.name} (${room.tier})` : `${def.id}  ${def.name}`}   |   hold R: reset   Esc: menu   M: sound`, {
        fontFamily: 'monospace',
        fontSize: '13px',
        color: cssHex(PALETTE.text),
      })
      .setScrollFactor(0)
      .setDepth(100);
    this.resetRing = this.add.graphics().setScrollFactor(0).setDepth(101);
    this.input.keyboard?.on('keydown-ESC', () => this.scene.start('Menu'));

    this.info = this.add
      .text(this.scale.width / 2, HUD_TOP + 8, '', { fontFamily: 'monospace', fontSize: '15px', color: cssHex(PALETTE.text), align: 'center', backgroundColor: '#000000aa', padding: { x: 10, y: 6 } })
      .setOrigin(0.5, 0)
      .setScrollFactor(0)
      .setDepth(100)
      .setVisible(false);
    // Chamber select has 3 hearts per attempt, lost only to beams (C110); a run carries its own.
    this.selectHearts = run ? undefined : newHearts();
    this.beamGrace = 0;
    this.waitingForEnemies = false;
    this.hud = this.add
      .text(12, 30, '', { fontFamily: 'monospace', fontSize: '13px', color: cssHex(PALETTE.text) })
      .setScrollFactor(0)
      .setDepth(100);
    this.refreshHud();
    // Opaque HUD bars (C116, a playtest fix: the text used to sit on top of the chamber).
    const bars = this.add.graphics().setScrollFactor(0).setDepth(99);
    bars.fillStyle(0x0e0f12, 1).fillRect(0, 0, this.scale.width, HUD_TOP).fillRect(0, this.scale.height - HUD_BOTTOM, this.scale.width, HUD_BOTTOM);
    bars.fillStyle(PALETTE.terrainEdge, 1).fillRect(0, HUD_TOP - 2, this.scale.width, 2).fillRect(0, this.scale.height - HUD_BOTTOM, this.scale.width, 2);
    // The interact prompt (C116): a key cap over the player when something underfoot can be used.
    this.prompt = this.add
      .text(0, 0, '', { fontFamily: 'monospace', fontSize: '13px', color: '#15161a', backgroundColor: '#ffd166', padding: { x: 6, y: 3 }, fontStyle: 'bold' })
      .setOrigin(0.5, 1)
      .setDepth(60)
      .setVisible(false);
    // The controls, always on screen (C111): base controls plus the abilities this room allows.
    this.add
      .text(12, this.scale.height - 6, controlsLine(kit, Boolean(room?.def.pedestals)), { fontFamily: 'monospace', fontSize: '12px', color: cssHex(PALETTE.text) })
      .setOrigin(0, 1)
      .setScrollFactor(0)
      .setDepth(100);
    // What the exit still waits for (C109): enemies to defeat.
    this.enemiesNote = this.add
      .text(this.scale.width - 12, 10, '', { fontFamily: 'monospace', fontSize: '13px', color: cssHex(PALETTE.enemy) })
      .setOrigin(1, 0)
      .setScrollFactor(0)
      .setDepth(100);
    // A one-off banner from the run controller (e.g. "W-M solved: Throw unlocked"); not repeated
    // when the room restarts after a defeat or a reset.
    const banner = this.play.expedition?.banner;
    if (banner) {
      this.play = { ...this.play, expedition: { ...this.play.expedition!, banner: undefined } };
      const t = this.add
        .text(this.scale.width / 2, 96, banner, { fontFamily: 'monospace', fontSize: '18px', color: cssHex(PALETTE.lightCore), align: 'center', backgroundColor: '#000000cc', padding: { x: 14, y: 8 } })
        .setOrigin(0.5, 0)
        .setScrollFactor(0)
        .setDepth(150);
      this.tweens.add({ targets: t, alpha: 0, delay: 2600, duration: 600, onComplete: () => t.destroy() });
    }
    if (this.fx.insight) this.insightG = this.add.graphics().setDepth(7);
    if (room) {
      this.offers = room.choices ?? (run && room.def.pedestals ? offersFor(run) : []);
      this.setUpRoom(room.def);
    }
    // Playtest telemetry (C81): chambers and combat rooms (start, reward and exit rooms aren't challenges).
    if (!room || room.def.kind === 'connector') {
      Telemetry.enter(def.id, room ? 'room' : 'chamber', this.play.expedition ? 'expedition' : 'select', this.play.expedition?.seed);
    }

    this.cameras.main.startFollow(this.player.hitbox, true, 0.15, 0.15);
    this.syncSolids();
    this.physics.world.on('worldstep', this.onStep, this);
    // On restart Phaser may clear the physics world before this runs, so guard the lookup.
    this.events.once('shutdown', () => this.physics.world?.off('worldstep', this.onStep, this));
  }

  private onStep(dt: number): void {
    if (this.solved || this.defeated) return;
    Telemetry.tick(dt * 1000);
    if (this.play.expedition && this.play.run) this.play.run.timeMs += dt * 1000; // run time (C71)
    this.stepGates();
    this.player.step(dt, this.crates);
    const world = { isSolid: (r: number, c: number) => this.logic.isSolid(r, c) };
    for (const c of this.crates) c.stepFlight(dt, world.isSolid);
    this.quietSteps = Math.max(0, this.quietSteps - 1);
    for (const c of this.crates) {
      // A crate landing from a throw, a drop or a recall thuds and kicks up dust (C52).
      if (c.stepLanding() !== undefined && !this.quietSteps) {
        Sfx.crateLand();
        dust(this, c.rect.x, c.rect.y + TILE / 2, 8, 16, TILE / 2 - 2);
      }
    }
    const playerBox = this.boundsOf(this.player.body);
    for (const w of this.enemies) w.step(dt, world, playerBox);
    const alive = this.enemies.filter((w) => w.alive);

    // Everything with weight: the player first (checkExit uses it), crates on the ground, walkers.
    const bodies: Bounds[] = [this.boundsOf(this.player.body)];
    for (const c of this.crates) if (!c.carried && !c.flying) bodies.push(this.boundsOf(c.body));
    for (const w of alive) bodies.push(w.bounds());

    const occupied = new Set<string>();
    for (const b of bodies) {
      for (let r = Math.floor(b.top / TILE); r <= Math.floor((b.bottom - 1) / TILE); r++) {
        for (let c = Math.floor(b.left / TILE); c <= Math.floor((b.right - 1) / TILE); c++) occupied.add(key(r, c));
      }
    }

    // A plate is pressed when a body stands on the tile it sits on: bottom edge at the cell's floor.
    const pressed = new Set<string>();
    for (const d of this.model.devices) {
      if (d.kind !== 'plate') continue;
      const hit = d.cells.some(([r, c]) =>
        bodies.some((b) => Math.abs(b.bottom - (r + 1) * TILE) <= 3 && b.right > c * TILE + 2 && b.left < (c + 1) * TILE - 2),
      );
      if (hit) pressed.add(d.id);
    }
    if (!this.quietSteps) {
      // Plates click down and up (C52).
      for (const id of pressed) if (!this.pressed.has(id)) this.feedback(id, 'plateDown');
      for (const id of this.pressed) if (!pressed.has(id)) this.feedback(id, 'plateUp');
    }
    this.pressed = pressed;

    const swing = this.player.takeSwing();
    if (swing) {
      const cells = cellsHitBySwing(swing.box, swing.facing, swing.dir, {
        isSolid: (r, c) => this.logic.isSolid(r, c),
        isHittable: (r, c) => this.logic.hittableAt(r, c) !== undefined,
      });
      this.onHits(this.logic.resolveHits(cells, occupied));
      Sfx.swing();
      // Enemies inside the swing (C62): melee reach beats contact range, so a swing lands first.
      // Long Reach lengthens the swing against enemies only; puzzle hits above keep MELEE.reach.
      const fromX = (playerBox.left + playerBox.right) / 2;
      const enemyBox = this.fx.enemyReachBonus ? swingBox(playerBox, swing.facing, swing.dir, MELEE.reach + this.fx.enemyReachBonus) : swing.box;
      const mods = { damage: this.fx.meleeDamage, knockbackScale: this.fx.knockbackScale, stagger: this.fx.shieldStagger };
      for (const w of alive) if (overlap(enemyBox, w.bounds())) this.onEnemyHit(w, w.hit('melee', fromX, mods));
    }
    if (this.player.takeInteract()) this.tryPick(playerBox);
    this.updateRoomRules(playerBox);
    this.lastOccupied = occupied;
    const bolt = this.player.takeBolt();
    if (bolt) this.fireBolt(bolt.body, bolt.facing, bolt.dir);

    // Light: beams are blocked by crates and enemies (C30); lit receivers feed the signals.
    const blockers = new Set<string>();
    const mark = (b: Bounds) => {
      for (let r = Math.floor(b.top / TILE); r <= Math.floor((b.bottom - 1) / TILE); r++) {
        for (let c = Math.floor(b.left / TILE); c <= Math.floor((b.right - 1) / TILE); c++) blockers.add(key(r, c));
      }
    };
    for (const c of this.crates) if (!c.carried && !c.flying) mark(this.boundsOf(c.body));
    for (const w of alive) mark(w.bounds());
    const beamWorld: BeamWorld = {
      isSolid: (r, c) => this.logic.isSolid(r, c),
      mirrorAt: (r, c) => this.logic.mirrorAt(r, c),
      blocks: (r, c) => blockers.has(key(r, c)),
      gateOn: (id) => this.logic.isGateOn(id),
    };
    const litBefore = this.beams.lit;
    this.beams = traceBeams(this.model, beamWorld);
    if (!this.quietSteps) {
      // Receivers chime when light reaches them, and fade when it leaves (C52).
      for (const id of this.beams.lit) if (!litBefore.has(id)) this.feedback(id, 'receiverOn');
      for (const id of litBefore) if (!this.beams.lit.has(id)) this.feedback(id, 'receiverOff');
    }
    this.logic.setLitReceivers(this.beams.lit);
    if (this.fx.insight) {
      const px = (playerBox.left + playerBox.right) / 2;
      const py = (playerBox.top + playerBox.bottom) / 2;
      const mirror = nearestFreeMirror(this.model, (id) => this.logic.isMirrorLocked(id), px, py);
      const source = nearestSource(this.model, px, py);
      this.insight = {
        mirror,
        ghost: mirror ? traceBeams(this.model, withMirrorFlipped(beamWorld, mirror)) : undefined,
        targets: source ? [source, ...targetsOf(this.model, source.id)] : [],
      };
    }

    this.logic.update({ pressedPlates: pressed, occupiedCells: occupied });

    // Beams kill enemies outright (C27); an enemy stopping a beam is touching it.
    for (const w of alive) {
      const b = w.bounds();
      const grown = { left: b.left - 4, right: b.right + 4, top: b.top - 4, bottom: b.bottom + 4 };
      if (w.alive && beamContact(this.beams.segments, grown, TILE)) this.onEnemyHit(w, w.hit('beam', b.left));
    }

    // Phantom Dash (C67): a Dash hits each enemy it passes through once, through the shield.
    if (this.fx.dashHits && this.player.dashing) {
      for (const w of alive) {
        if (!w.alive || this.dashHit.has(w) || !touches(bodies[0]!, w.bounds(), 0)) continue;
        this.dashHit.add(w);
        this.onEnemyHit(w, w.hit('melee', w.rect.x - w.facing * TILE, { knockbackScale: this.fx.knockbackScale }));
      }
    } else if (this.dashHit.size > 0) this.dashHit.clear();

    // Any contact with an enemy is a defeat (C55), unless the player is dashing (C60).
    const toucher = this.player.invulnerable ? undefined : alive.find((w) => w.alive && touches(bodies[0]!, w.bounds()));
    if (toucher) {
      // Guard (C67): the first hit in each room is absorbed: pushed back, a moment of safety.
      if (this.guardLeft > 0) {
        this.guardLeft--;
        Sfx.clang();
        this.cameras.main.flash(120, 255, 209, 102, false);
        this.player.knockback('x', toucher.rect.x);
        this.player.protect(GUARD_GRACE);
        this.view.puff(this.player.hitbox.x, this.player.hitbox.y, PALETTE.lightCore);
      } else {
        this.defeat();
        return;
      }
    }

    // Beams push the player back (C27) and each hit costs a heart (C110), with a moment of grace so
    // one touch costs one heart. Dashing makes the player immune to beams (C60).
    this.beamGrace = Math.max(0, this.beamGrace - dt);
    const touch = beamContact(this.beams.segments, bodies[0]!, TILE);
    if (touch && !this.player.invulnerable) {
      if (this.player.knockback(touch.axis, touch.at)) this.cameras.main.shake(60, 0.002);
      if (this.beamGrace <= 0) {
        this.beamGrace = BEAM_GRACE;
        if (this.beamHit()) return;
      }
    }
    // Doors, trapdoors, the exit and plate-wired mirrors changing state (C52). Mirrors flipped by
    // a hit already answered in onHits, so only wired ones are handled here.
    const events = this.logic.takeEvents();
    if (!this.quietSteps) {
      const isGate = (id: string) => this.model.devices.some((d) => d.id === id && d.kind === 'gate');
      for (const id of events.opened) this.feedback(id, id === 'exit' ? 'exitOpen' : isGate(id) ? 'gateOn' : 'doorOpen');
      for (const id of events.closed) this.feedback(id, isGate(id) ? 'gateOff' : 'doorClose');
      for (const id of events.mirrorsFlipped) if (this.logic.isMirrorLocked(id)) this.feedback(id, 'mirror');
    }
    this.updateEnemyLock(alive.length);
    this.syncSolids();
    this.checkExit(bodies[0]!);
    this.updateReset(dt);
  }

  /**
   * A beam hit (C110): Guard absorbs the first hit in a room (C67); otherwise a heart is lost, from
   * the run or from chamber select's three. Returns true when the room ends (out of hearts).
   */
  private beamHit(): boolean {
    this.player.blink(BEAM_GRACE);
    if (this.guardLeft > 0) {
      this.guardLeft--;
      Sfx.clang();
      this.cameras.main.flash(120, 255, 209, 102, false);
      return false;
    }
    Sfx.hurt();
    this.cameras.main.flash(140, 255, 90, 90, false);
    this.cameras.main.shake(90, 0.004);
    Telemetry.heartLost();
    const run = this.play.run;
    const lost = loseHeart(run ? run.hearts : this.selectHearts!);
    if (run) this.play.run = { ...run, hearts: lost.hearts };
    else this.selectHearts = lost.hearts;
    this.refreshHud();
    this.tweens.add({ targets: this.hud, scale: 1.25, duration: 120, yoyo: true });
    if (!lost.runOver) return false;
    if (run) {
      // The last heart: the run is over, as after a defeat (C54).
      this.defeated = true;
      this.physics.world.timeScale = 3;
      this.time.delayedCall(350, () => this.endRun());
    } else {
      this.defeat(); // chamber select: out of hearts restarts the chamber with three
    }
    return true;
  }

  /**
   * C109: the exit stays shut while enemies the solution does not use are alive (in a combat room,
   * any enemy). A lamp on the exit and a note in the corner show it; clearing them opens the exit.
   */
  private updateEnemyLock(alive: number): void {
    const room = this.play.room;
    const applies = room ? room.def.kind === 'connector' && this.enemies.length > 0 : this.enemies.length > (this.model.def.enemiesUsed ?? 0);
    if (!applies) {
      this.view.enemyLamp = undefined;
      return;
    }
    const left = enemiesLeft(alive, room ? 0 : (this.model.def.enemiesUsed ?? 0));
    const waiting = left > 0;
    this.logic.holdClosed('exit', waiting || (Boolean(room?.def.pedestals) && !this.picked));
    this.view.enemyLamp = !waiting;
    // An enemy that fell 3+ tiles below its spawn in a chamber may be out of reach (P-M's guard
    // dropped into the sealed chasm): suggest a reset. Every enemy in a combat room can be reached.
    const fell = !room && this.enemies.some((w, i) => w.alive && w.rect.y / TILE - (this.enemySpawnRows[i] ?? Infinity) >= 3);
    this.enemiesNote?.setText(waiting ? `${left} enem${left === 1 ? 'y' : 'ies'} left to defeat${fell ? '  (fell out of reach? hold R)' : ''}` : '');
    if (this.waitingForEnemies && !waiting && !this.quietSteps) {
      // Cleared: the exit answers (C52).
      if (this.logic.isOpen('exit')) this.feedback('exit', 'exitOpen');
      else {
        Sfx.pick();
        this.view.flash('exit');
      }
      this.cameras.main.flash(120, 255, 255, 255, false);
    }
    this.waitingForEnemies = waiting;
  }

  /**
   * Bolt: the path is traced now (core/player/bolt); a bright dart flies along it and the hit is
   * applied when it arrives, so what the player sees and what happens always match.
   */
  private fireBolt(body: Bounds, facing: 1 | -1, dir: 'forward' | 'up'): void {
    const start = boltStart(body, facing, dir);
    const path = traceBolt(start.cell, start.step, {
      isSolid: (r, c) => this.logic.isSolid(r, c),
      isHittable: (r, c) => this.logic.hittableAt(r, c) !== undefined,
    });
    // Enemies (C103): a forward Bolt hits an enemy in front of any part of the body (one lane per
    // body row, each stopped by walls, never past what stops the Bolt); an up-Bolt only its line.
    // The nearest enemy takes the Bolt and stops it; with Piercing Bolt (C67) it passes through
    // every enemy on its lanes, hitting each, and goes on to whatever it would have hit.
    const isSolid = (r: number, c: number) => this.logic.isSolid(r, c);
    const lanes = dir === 'up' ? [{ row: start.cell[0], cells: path.cells }] : boltEnemyLanes(body, facing, isSolid, path.cells.length);
    const found = enemiesOnLanes(lanes, (r, c) => {
      const cell = { left: c * TILE, right: (c + 1) * TILE, top: r * TILE, bottom: (r + 1) * TILE };
      return this.enemies.filter((w) => w.alive && overlap(cell, w.bounds()));
    });
    const first = this.fx.piercingBolt ? undefined : found[0];
    const target = first?.enemy;
    const pierced = this.fx.piercingBolt ? found.map((f) => f.enemy) : [];
    if (first) path.hit = undefined;
    Sfx.bolt();
    const [dr, dc] = start.step;
    // A Bolt at an enemy flies level along that enemy's lane (a walker: the player's lower row).
    const row = dir === 'forward' && first ? first.cell[0] : start.cell[0];
    const from =
      dir === 'up'
        ? { x: (body.left + body.right) / 2, y: body.top }
        : { x: facing === 1 ? body.right : body.left, y: row * TILE + TILE / 2 };
    const last = first?.cell ?? path.cells.at(-1) ?? start.cell;
    // End at the target's centre, or at the face of whatever stopped it.
    const to = {
      x: last[1] * TILE + TILE / 2 + (path.hit || target ? 0 : (dc * TILE) / 2),
      y: last[0] * TILE + TILE / 2 + (path.hit || target ? 0 : (dr * TILE) / 2),
    };
    const dist = Math.hypot(to.x - from.x, to.y - from.y);
    // Piercing Bolt: each enemy on the line is hit as the dart passes it.
    for (const w of pierced) {
      const at = Math.hypot(w.rect.x - from.x, dir === 'up' ? w.rect.y - from.y : 0);
      this.time.delayedCall((at / BOLT.speed) * 1000, () => {
        if (w.alive) this.onEnemyHit(w, w.hit('bolt', from.x, { knockbackScale: this.fx.knockbackScale }));
      });
    }
    const dart = this.add
      .rectangle(from.x, from.y, dir === 'up' ? 4 : 14, dir === 'up' ? 14 : 4, PALETTE.lightCore)
      .setStrokeStyle(2, PALETTE.light)
      .setDepth(12);
    this.tweens.add({
      targets: dart,
      x: to.x,
      y: to.y,
      duration: Math.max(30, (dist / BOLT.speed) * 1000),
      onComplete: () => {
        dart.destroy();
        if (target) {
          if (target.alive) this.onEnemyHit(target, target.hit('bolt', from.x, { knockbackScale: this.fx.knockbackScale }));
        } else if (path.hit && this.logic) this.onHits(this.logic.resolveHits([path.hit], this.lastOccupied));
        else this.view.puff(to.x, to.y, PALETTE.light);
      },
    });
  }

  /** Feel of a hit on an enemy (C62): hit-stop, shake, sound; a clang pushes the player back. */
  private onEnemyHit(enemy: PatrolEnemy, outcome: HitOutcome): void {
    if (outcome === 'blocked') {
      Sfx.clang();
      this.cameras.main.shake(70, 0.003);
      // Shield Breaker: the stagger replaces the push back, so you can follow up.
      if (!enemy.staggered) this.player.knockback('x', enemy.rect.x);
      return;
    }
    if (outcome === 'killed') Sfx.kill();
    else Sfx.hit();
    this.cameras.main.shake(outcome === 'killed' ? 110 : 70, outcome === 'killed' ? 0.006 : 0.004);
    this.hitStop(60);
  }

  /** Freeze the physics for a moment, so a hit lands with weight. */
  private hitStop(ms: number): void {
    this.physics.world.pause();
    this.time.delayedCall(ms, () => this.physics.world.resume());
  }

  /**
   * Defeat (C54, C55, C62): a short slow-motion flash, a fade, and the chamber restarts with the
   * player at its entrance. In an expedition it also costs a heart; at zero the run is over
   * (abilities and solved chambers are kept, C7). Hearts are off in level select (C54).
   */
  private defeat(): void {
    this.defeated = true;
    Sfx.defeat();
    this.player.body.setVelocity(0, 0);
    this.physics.world.timeScale = 3; // slow motion
    this.cameras.main.flash(180, 255, 80, 80, false);
    let runOver = false;
    const run = this.play.run;
    Telemetry.defeat(run !== undefined);
    if (run) {
      const lost = loseHeart(run.hearts);
      this.play.run = { ...run, hearts: lost.hearts };
      runOver = lost.runOver;
      this.refreshHud();
      if (this.hud) this.tweens.add({ targets: this.hud, scale: 1.25, duration: 120, yoyo: true });
    }
    this.time.delayedCall(350, () => {
      if (runOver) return this.endRun();
      this.cameras.main.fadeOut(250, 0, 0, 0);
      this.cameras.main.once('camerafadeoutcomplete', () => {
        this.physics.world.timeScale = 1;
        this.scene.restart(this.play);
      });
    });
  }

  /** Out of hearts (C54): the run ends. The run controller takes over; opened alone, back to the menu. */
  private endRun(): void {
    Telemetry.end('run-over');
    this.physics.world.timeScale = 1;
    this.physics.world.pause();
    this.game.events.emit(ROOM_EVENTS.runOver, this.play.run);
    if (this.game.events.listenerCount(ROOM_EVENTS.runOver) > 0) return;
    this.showMessage('Out of hearts: the run is over.\nAbilities and solved chambers are kept.\nEnter: menu');
    this.input.keyboard?.once('keydown-ENTER', () => this.scene.start('Menu'));
  }

  // --- expedition rooms (C101, C102) ------------------------------------------------------------

  /** Pedestals (R3), the Seal altar, and exits held shut by the room rules (R2, R3). */
  private setUpRoom(room: RoomDef): void {
    if (room.pedestals) {
      this.logic.holdClosed('exit', true);
      room.pedestals.forEach(([row, col], i) => {
        const x = col * TILE + TILE / 2;
        const y = (row + 1) * TILE;
        const block = this.add.rectangle(x, y - 6, TILE - 6, 12, PALETTE.weight).setStrokeStyle(2, PALETTE.lightCore).setDepth(4);
        const label = this.add
          .text(x, y - 34, this.pedestalLabel(i), { fontFamily: 'monospace', fontSize: '11px', color: cssHex(PALETTE.text), align: 'center' })
          .setOrigin(0.5, 1)
          .setDepth(4);
        this.pedestals.push({ col, row, label, block });
      });
    }
    if (room.altar) {
      const [row, col] = room.altar;
      this.add.rectangle(col * TILE + TILE / 2, (row + 1) * TILE - 10, TILE, 20, PALETTE.lightCore).setStrokeStyle(3, PALETTE.light).setDepth(4);
    }
  }

  /** A pedestal's label: the upgrade's name and, at the Endless limit, what taking it replaces (C115). */
  private pedestalLabel(i: number): string {
    const choice = this.offers[i];
    if (!choice) return '';
    const out = this.play.run && UPGRADE_IDS.has(choice.id) ? replacedBy(this.play.run, choice.id as UpgradeId) : undefined;
    return out ? `${choice.name}\n− ${upgradeById(out).name}` : choice.name;
  }

  private pedestalUnder(player: Bounds): number {
    const col = Math.floor((player.left + player.right) / 2 / TILE);
    const row = Math.round(player.bottom / TILE) - 1;
    return this.pedestals.findIndex((p) => p.col === col && p.row === row);
  }

  /** R3: attack while standing on a pedestal takes its upgrade; the others fade; the exit opens. */
  private tryPick(player: Bounds): void {
    const room = this.play.room;
    if (!room?.def.pedestals || this.picked) return;
    const i = this.pedestalUnder(player);
    if (i < 0) return;
    const choice = this.offers[i];
    if (!choice) return;
    this.picked = true;
    // Take it into the run (Mend heals at once, C66). Later rooms read the run's upgrades.
    if (this.play.run && UPGRADE_IDS.has(choice.id)) {
      this.play.run = takeUpgrade(this.play.run, choice.id as UpgradeId);
      this.refreshHud();
      if (choice.id === 'mend') this.cameras.main.flash(160, 255, 120, 140, false);
    }
    Sfx.pick();
    const chosen = this.pedestals[i];
    if (chosen) sparks(this, chosen.col * TILE + TILE / 2, (chosen.row + 1) * TILE - 12, PALETTE.lightCore, 10);
    this.pedestals.forEach((p, j) => {
      if (j === i) this.tweens.add({ targets: [p.block, p.label], y: '-=12', duration: 200 });
      else this.tweens.add({ targets: [p.block, p.label], alpha: 0, duration: 300 });
    });
    this.logic.holdClosed('exit', false);
    this.prompt?.setVisible(false);
    this.info.setText(`${choice.name}\n${choice.description}`).setVisible(true);
    this.game.events.emit(ROOM_EVENTS.reward, choice, this.play.run);
  }

  /** Hearts and run upgrades, under the title; chamber select shows its own 3 hearts (C110). */
  private refreshHud(): void {
    const run = this.play.run;
    if (!this.hud) return;
    if (!run) {
      const h = this.selectHearts;
      if (h) this.hud.setText(`${'♥'.repeat(h.current)}${'♡'.repeat(Math.max(0, h.max - h.current))}   (beam hits cost a heart; at 0 the chamber restarts)`);
      return;
    }
    const hearts = '♥'.repeat(run.hearts.current) + '♡'.repeat(Math.max(0, run.hearts.max - run.hearts.current));
    const names = run.upgrades.filter((u) => u !== 'mend').map((u) => upgradeById(u).name);
    const e = this.play.expedition;
    // Remix runs show their clock (C71); normal runs don't put time pressure on puzzles.
    const clock = e?.remix ? ` · ${formatTime(run.timeMs)}` : '';
    // Rooms cleared, never how many are left (C114); the seed only for testers.
    const mode = e?.endless ? 'Endless · ' : e?.remix ? 'Remix · ' : '';
    const seed = e && DevOptions.on ? ` · seed ${e.seed}` : '';
    const where = e ? `   ${mode}rooms cleared ${e.cleared}${clock}${seed}` : '';
    this.hud.setText(`${hearts}${where}${names.length ? `   ${names.join(' · ')}` : ''}`);
  }

  /** The run controller's end screen (run complete): a message, then Enter → menu. */
  showEnd(text: string): void {
    this.showMessage(`${text}\nEnter: menu`);
    this.input.keyboard?.once('keydown-ENTER', () => this.scene.start('Menu'));
  }

  /** Shows what a pedestal offers; opens the Arena when it is cleared (R2); the altar ends the run. */
  private updateRoomRules(player: Bounds): void {
    const room = this.play.room;
    if (!room) return;
    if (room.def.pedestals && !this.picked) {
      const i = this.pedestalUnder(player);
      const choice = this.offers[i];
      const out = choice && this.play.run && UPGRADE_IDS.has(choice.id) ? replacedBy(this.play.run, choice.id as UpgradeId) : undefined;
      this.info.setText(choice ? `${choice.name}\n${choice.description}${out ? `\nReplaces ${upgradeById(out).name} (you hold 4 at most)` : ''}` : '').setVisible(Boolean(choice));
      // The pedestal underfoot hides its label: the key cap and the box above say it all.
      this.pedestals.forEach((p, j) => p.label.setAlpha(j === i ? 0 : 1));
      // The key cap over the player, so the way to take it is never missed (playtest fix, C116).
      if (this.prompt) {
        this.prompt.setText(choice ? `E  take ${choice.name}` : '').setVisible(Boolean(choice));
        if (choice) this.prompt.setPosition((player.left + player.right) / 2, player.top - 10);
      }
    }
    if (room.def.altar) {
      const [row, col] = room.def.altar;
      const cell = { left: col * TILE, right: (col + 1) * TILE, top: row * TILE, bottom: (row + 1) * TILE };
      if (overlap(player, cell)) {
        this.solved = true;
        this.player.body.setVelocity(0, 0);
        // The run controller writes the summary; a room opened alone just says so.
        if (this.play.expedition && this.game.events.listenerCount(ROOM_EVENTS.runComplete) > 0) {
          Sfx.swap();
          this.cameras.main.flash(250, 255, 255, 255, false);
          this.game.events.emit(ROOM_EVENTS.runComplete, this.play.run);
          return;
        }
        this.showMessage('Run complete!\nEsc: menu');
      }
    }
  }

  /**
   * One device changed state (C52: sound + particles + flash on every state change): its sound,
   * a flash on the device and sparks (or dust for a plate) at its cells.
   */
  private feedback(id: string, kind: 'plateDown' | 'plateUp' | 'receiverOn' | 'receiverOff' | 'doorOpen' | 'doorClose' | 'exitOpen' | 'mirror' | 'gateOn' | 'gateOff'): void {
    const d = this.model.devices.find((x) => x.id === id);
    if (!d) return;
    Sfx[kind]();
    this.view.flash(id);
    const color = kind.startsWith('plate')
      ? PALETTE.weight
      : kind.startsWith('receiver') || kind === 'mirror'
        ? PALETTE.light
        : kind.startsWith('gate')
          ? gateColor(id)
          : PALETTE.lightCore;
    for (const [r, c] of d.cells) {
      const x = c * TILE + TILE / 2;
      if (kind === 'plateDown') dust(this, x, (r + 1) * TILE, 3, 8, TILE / 2 - 4);
      else if (kind !== 'plateUp' && kind !== 'receiverOff' && kind !== 'gateOff') sparks(this, x, r * TILE + TILE / 2, color, kind === 'exitOpen' ? 8 : 3);
    }
  }

  /**
   * Gates (C106): every body whose centre crossed the centre line of a gate that is on comes out
   * beside the twin, same height, same speed. A carried crate goes with the player (it follows the
   * player when drawn); a crate in a Throw arc is left alone (no Gates chamber has Throw, G6).
   */
  private stepGates(): void {
    if (this.gates.pairs.length === 0) return;
    const crateCells = new Set<string>();
    for (const c of this.crates) {
      if (c.carried || c.flying) continue;
      const b = this.boundsOf(c.body);
      for (let r = Math.floor(b.top / TILE); r <= Math.floor((b.bottom - 1) / TILE); r++) {
        for (let col = Math.floor(b.left / TILE); col <= Math.floor((b.right - 1) / TILE); col++) crateCells.add(key(r, col));
      }
    }
    const isSolid = (r: number, c: number) => this.logic.isSolid(r, c) || crateCells.has(key(r, c));
    const isOn = (id: string) => this.logic.isGateOn(id);
    // Each body with the colour of its afterimage.
    const bodies: { body: Phaser.Physics.Arcade.Body; color: number }[] = [{ body: this.player.body, color: PALETTE.player }];
    for (const c of this.crates) {
      if (!c.carried && !c.flying && c.body.enable) bodies.push({ body: c.body, color: PALETTE.weight });
      else this.prevCentre.delete(c.body); // carried or flying: its old spot means nothing on landing
    }
    for (const w of this.enemies) {
      if (w.alive) bodies.push({ body: w.body, color: PALETTE.enemy });
      else this.prevCentre.delete(w.body);
    }
    for (const { body, color } of bodies) {
      const cx = body.x + body.width / 2;
      const last = this.prevCentre.get(body);
      // A jump of more than half a tile in one step is a placement (put down, respawn, reset),
      // never a walk across a gate's centre line.
      const prev = last === undefined || Math.abs(cx - last) > TILE / 2 ? cx : last;
      const pass = passThrough(this.gates.pairs, { left: body.x, top: body.y, width: body.width, height: body.height }, prev, TILE, isOn, isSolid);
      if (!pass || pass.blocked) {
        this.prevCentre.set(body, cx);
        // The player walked into a gate whose far side is blocked (G5): say no, as the game does
        // everywhere else (C52), and mark what blocks it. Other bodies just pass the empty frame.
        if (pass?.blocked && body === this.player.body) {
          Sfx.refuse();
          this.cameras.main.shake(60, 0.002);
          this.view.flashCells(pass.to.map(([r, c]) => [r, c + pass.dir] as const), 0xff6b6b);
        }
        continue;
      }
      const { x: vx, y: vy } = body.velocity;
      const from = { x: body.x + body.width / 2, y: body.y + body.height / 2 };
      body.reset(pass.left + body.width / 2, pass.top + body.height / 2);
      body.velocity.set(vx, vy);
      this.prevCentre.set(body, pass.left + body.width / 2);
      // Juice (C52, C58): an afterimage shrinking into the gate it entered, one popping out of the
      // twin, a ring in the pair's colour, sparks at both gates, a flash, the pass sound and, for
      // the player, a stretch in the direction of travel.
      const pairColor = gateColor(pass.pair);
      afterimage(this, from.x, from.y, body.width, body.height, color, 'from');
      afterimage(this, pass.left + body.width / 2, pass.top + body.height / 2, body.width, body.height, color, 'to');
      ring(this, pass.left + body.width / 2, pass.top + body.height / 2, pairColor);
      if (body === this.player.body) this.player.popOut();
      Sfx.gate();
      this.view.flash(pass.pair);
      for (const gate of [pass.from, pass.to]) {
        const [r, c] = gate[0]!;
        sparks(this, (c + 0.5) * TILE, (r + 1) * TILE, pairColor, 5);
      }
    }
  }

  /** Feedback for a swing's hits, and the physical part of dispenser recall. */
  private onHits(hit: HitResult): void {
    if (hit.crystal) {
      Sfx.swap();
      this.view.flash(hit.crystal);
      this.cameras.main.flash(90, 255, 255, 255, false);
    }
    for (const id of hit.flipped) this.view.flash(id);
    if (hit.flipped.length > 0) Sfx.mirror();
    if (hit.locked.length > 0) Sfx.clang();
    if (hit.locked.length > 0) this.cameras.main.shake(70, 0.004); // "clang": locked to its plate (C42)
    for (const id of hit.dispensers) this.recall(id);
  }

  /**
   * Dispenser recall (C50): the dispenser's crate vanishes wherever it is (even from the player's
   * hands) and a fresh one drops from the dispenser. Refused, with a shake, if something is in the way.
   */
  private recall(dispenserId: string): void {
    const crate = this.crates.find((c) => c.dispenser === dispenserId);
    const cell = dropCell(this.model, dispenserId);
    if (!crate || !cell) return;
    const x = cell[1] * TILE + TILE / 2;
    const y = cell[0] * TILE + TILE / 2;
    const blocking = this.physics
      .overlapRect(x - TILE / 2 + 2, y - TILE / 2 + 2, TILE - 4, TILE - 4, true, false)
      .filter((b) => b !== crate.body);
    if (blocking.length > 0) {
      this.cameras.main.shake(80, 0.003);
      return;
    }
    this.view.puff(crate.rect.x, crate.rect.y);
    if (this.player.carried === crate) this.player.releaseCarried();
    crate.respawnAt(x, y);
    this.view.flash(dispenserId);
  }

  private boundsOf(body: Phaser.Physics.Arcade.Body): Bounds {
    return { left: body.left, right: body.right, top: body.top, bottom: body.bottom };
  }

  private syncSolids(): void {
    const isSolid = (r: number, c: number) => this.logic.isSolid(r, c);
    for (const { r, c, body } of this.cellBodies) {
      body.enable = isSolid(r, c);
      if (body.enable) Object.assign(body.checkCollision, exposedFaces(r, c, isSolid));
    }
  }

  private checkExit(player: Bounds): void {
    if (!this.logic.isOpen('exit')) return;
    const exit = this.model.devices.find((d) => d.kind === 'exit');
    const inside = exit?.cells.some(
      ([r, c]) => player.right > c * TILE && player.left < (c + 1) * TILE && player.bottom > r * TILE && player.top < (r + 1) * TILE,
    );
    if (!inside) return;
    this.solved = true;
    this.player.body.setVelocity(0, 0);
    Telemetry.end('solved');
    // In an expedition: a short fade, then hand over to the run controller with the run's state.
    if (this.play.expedition && this.game.events.listenerCount(ROOM_EVENTS.done) > 0) {
      Sfx.swap();
      this.cameras.main.fadeOut(300, 0, 0, 0);
      this.cameras.main.once('camerafadeoutcomplete', () => this.game.events.emit(ROOM_EVENTS.done, this.model.def.id, this.play.run));
      return;
    }
    if (this.play.room) {
      this.showMessage(`${this.model.def.name}: cleared!\nEnter: play again    Esc: menu`);
    } else {
      this.showMessage(`${this.model.def.name}: solved!\nEnter: play again    Esc: menu`);
    }
    this.input.keyboard?.once('keydown-ENTER', () => this.scene.restart(this.play));
  }

  private updateReset(dt: number): void {
    this.resetHeldMs = this.controls.held('reset') ? this.resetHeldMs + dt * 1000 : 0;
    const g = this.resetRing.clear();
    if (this.resetHeldMs <= 0) return;
    const t = Math.min(1, this.resetHeldMs / RESET_HOLD_MS);
    g.lineStyle(4, PALETTE.text, 0.9).beginPath();
    g.arc(this.scale.width - 30, 30, 14, -Math.PI / 2, -Math.PI / 2 + t * Math.PI * 2).strokePath();
    if (t >= 1) {
      Telemetry.reset();
      this.scene.restart(this.play);
    }
  }

  override update(): void {
    if (!this.model || !this.player) return;
    this.player.render();
    for (const w of this.enemies) w.render();
    this.view.draw(this.pressed, this.beams);
    this.drawInsight();
    // The Remix clock ticks once a second.
    const second = this.play.expedition?.remix && this.play.run ? Math.floor(this.play.run.timeMs / 1000) : -1;
    if (second !== this.shownSecond) {
      this.shownSecond = second;
      this.refreshHud();
    }
  }

  /** Insight: a dashed ghost of the beams after a flip, and outlines on a plate's targets. */
  private drawInsight(): void {
    const g = this.insightG?.clear();
    if (!g) return;
    const { mirror, ghost, targets } = this.insight;
    if (mirror && ghost) {
      const [mr, mc] = mirror.cells[0]!;
      g.lineStyle(2, PALETTE.lightCore, 0.8).strokeCircle((mc + 0.5) * TILE, (mr + 0.5) * TILE, TILE * 0.62);
      g.lineStyle(2, PALETTE.lightCore, 0.55);
      for (const seg of ghost.segments) {
        const l = segmentLine(seg, TILE);
        const len = Math.hypot(l.x2 - l.x1, l.y2 - l.y1);
        for (let d = 0; d < len; d += 12) {
          const t0 = d / len;
          const t1 = Math.min(1, (d + 6) / len);
          g.lineBetween(l.x1 + (l.x2 - l.x1) * t0, l.y1 + (l.y2 - l.y1) * t0, l.x1 + (l.x2 - l.x1) * t1, l.y1 + (l.y2 - l.y1) * t1);
        }
      }
    }
    const pulse = 0.55 + 0.35 * Math.sin(this.time.now / 140);
    g.lineStyle(2, PALETTE.lightCore, pulse);
    for (const d of targets) for (const [r, c] of d.cells) g.strokeRect(c * TILE + 1, r * TILE + 1, TILE - 2, TILE - 2);
  }

  private showMessage(text: string): void {
    this.add
      .text(this.scale.width / 2, this.scale.height / 2, text, {
        fontFamily: 'monospace',
        fontSize: '18px',
        color: cssHex(PALETTE.text),
        align: 'center',
        backgroundColor: '#000000aa',
        padding: { x: 16, y: 12 },
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(200);
  }
}

const overlap = (a: Bounds, b: Bounds) => a.right > b.left && a.left < b.right && a.bottom > b.top && a.top < b.bottom;

const UPGRADE_IDS: ReadonlySet<string> = new Set(UPGRADES.map((u) => u.id));
