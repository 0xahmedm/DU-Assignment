import Phaser from 'phaser';
import { symbolInfo } from '../../core/chamber/legend';
import { cellsHitBySwing } from '../../core/combat/melee';
import { exposedFaces } from '../../core/chamber/collision';
import { dropCell, feedingDispenser } from '../../core/chamber/dispensers';
import { ChamberLogic, type HitResult } from '../../core/chamber/logic';
import { beamContact, segmentLine, traceBeams, type BeamTrace, type BeamWorld } from '../../core/light/beams';
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
import { loseHeart } from '../../core/run/hearts';
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
import { centredBounds } from '../render/camera';
import { cssHex, PALETTE } from '../render/palette';

const RESET_HOLD_MS = 1000; // hold R this long to reset (C51)

/**
 * What to play: a puzzle chamber by id, or an expedition room with its encounter tier (C101).
 * `run` is the expedition's hearts and upgrades (C10); without it there are none (level select,
 * C67). A room opened alone (URL) gets a fresh run so its pedestals and upgrades can be tried.
 */
export interface PlayData {
  id?: ChamberId;
  room?: { def: RoomDef; tier: Tier; choices?: readonly RewardChoice[]; kit?: readonly Ability[] };
  run?: RunState;
  /** Set by the expedition controller: the seed and where we are (HUD, C72), and a one-off banner. */
  expedition?: { seed: number; step: number; total: number; remix: boolean; banner?: string };
}

const GUARD_GRACE = 1; // s of invulnerability after Guard absorbs a hit

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
  private beams: BeamTrace = { segments: [], lit: new Set(), cells: new Set() };
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
  private cleared = false;
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
    this.chamberId = data.id ?? this.chamberId;
    this.pedestals = [];
    this.picked = false;
    this.cleared = false;
    this.crates = [];
    this.enemies = [];
    this.cellBodies = [];
    this.pressed = new Set();
    this.beams = { segments: [], lit: new Set(), cells: new Set() };
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
    // Worlds smaller than the screen are centred (most rooms, the Easys' height, W-M / L-M's width).
    const cam = centredBounds(width, height, this.scale.width, this.scale.height);
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
    for (const s of spawns) {
      const kind = s.kind === 'walker' ? WALKER_KIND : SHIELDBEARER_KIND;
      const enemy = new PatrolEnemy(this, s.cell[1] * TILE + TILE / 2, (s.cell[0] + 1) * TILE, kind, !room);
      this.enemies.push(enemy);
      this.physics.add.collider(enemy.rect, solids);
      for (const c of this.crates) this.physics.add.collider(enemy.rect, c.rect);
    }

    for (let i = 0; i < this.crates.length; i++) {
      for (let j = i + 1; j < this.crates.length; j++) this.physics.add.collider(this.crates[i]!.rect, this.crates[j]!.rect);
    }

    this.add
      .text(12, 10, `${room ? `${def.name} (${room.tier})` : `${def.id}  ${def.name}`}   |   hold R: reset   Esc: menu`, {
        fontFamily: 'monospace',
        fontSize: '13px',
        color: cssHex(PALETTE.text),
      })
      .setScrollFactor(0)
      .setDepth(100);
    this.resetRing = this.add.graphics().setScrollFactor(0).setDepth(101);
    this.input.keyboard?.on('keydown-ESC', () => this.scene.start('Menu'));

    this.info = this.add
      .text(this.scale.width / 2, 40, '', { fontFamily: 'monospace', fontSize: '15px', color: cssHex(PALETTE.text), align: 'center', backgroundColor: '#000000aa', padding: { x: 10, y: 6 } })
      .setOrigin(0.5, 0)
      .setScrollFactor(0)
      .setDepth(100)
      .setVisible(false);
    if (run) {
      this.hud = this.add
        .text(12, 30, '', { fontFamily: 'monospace', fontSize: '13px', color: cssHex(PALETTE.text) })
        .setScrollFactor(0)
        .setDepth(100);
      this.refreshHud();
    }
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
    this.player.step(dt, this.crates);
    const world = { isSolid: (r: number, c: number) => this.logic.isSolid(r, c) };
    for (const c of this.crates) c.stepFlight(dt, world.isSolid);
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
      this.tryPick(playerBox);
    }
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
    };
    this.beams = traceBeams(this.model, beamWorld);
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

    // Beams are a barrier for the player: a push back, never a heart (C27).
    const touch = beamContact(this.beams.segments, bodies[0]!, TILE);
    // Dashing makes the player immune to beams (C60): a Dash passes straight through a fence.
    if (touch && !this.player.invulnerable && this.player.knockback(touch.axis, touch.at)) this.cameras.main.shake(60, 0.002);
    this.logic.takeEvents(); // feedback hooks (sound/particles) arrive with the FX pass
    this.syncSolids();
    this.checkExit(bodies[0]!);
    this.updateReset(dt);
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
    if (room.lockUntilCleared) this.logic.holdClosed('exit', true);
    if (room.pedestals) {
      this.logic.holdClosed('exit', true);
      const offers = this.offers;
      room.pedestals.forEach(([row, col], i) => {
        const x = col * TILE + TILE / 2;
        const y = (row + 1) * TILE;
        const block = this.add.rectangle(x, y - 6, TILE - 6, 12, PALETTE.weight).setStrokeStyle(2, PALETTE.lightCore).setDepth(4);
        const label = this.add
          .text(x, y - 34, offers[i]?.name ?? '', { fontFamily: 'monospace', fontSize: '11px', color: cssHex(PALETTE.text), align: 'center' })
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
    Sfx.swap();
    this.pedestals.forEach((p, j) => {
      if (j === i) this.tweens.add({ targets: [p.block, p.label], y: '-=12', duration: 200 });
      else this.tweens.add({ targets: [p.block, p.label], alpha: 0, duration: 300 });
    });
    this.logic.holdClosed('exit', false);
    this.info.setText(`${choice.name}\n${choice.description}`).setVisible(true);
    this.game.events.emit(ROOM_EVENTS.reward, choice, this.play.run);
  }

  /** Hearts and run upgrades, under the title (expeditions only). */
  private refreshHud(): void {
    const run = this.play.run;
    if (!this.hud || !run) return;
    const hearts = '♥'.repeat(run.hearts.current) + '♡'.repeat(Math.max(0, run.hearts.max - run.hearts.current));
    const names = run.upgrades.filter((u) => u !== 'mend').map((u) => upgradeById(u).name);
    const e = this.play.expedition;
    // Remix runs show their clock (C71); normal runs don't put time pressure on puzzles.
    const clock = e?.remix ? ` · ${formatTime(run.timeMs)}` : '';
    const where = e ? `   ${e.remix ? 'Remix ' : ''}seed ${e.seed} · room ${e.step}/${e.total}${clock}` : '';
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
      this.info.setText(choice ? `${choice.name}\n${choice.description}\n(attack to take it)` : '').setVisible(Boolean(choice));
    }
    if (room.def.lockUntilCleared && !this.cleared && this.enemies.every((w) => w.gone)) {
      this.cleared = true;
      this.logic.holdClosed('exit', false);
      Sfx.swap();
      this.cameras.main.flash(120, 255, 255, 255, false);
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
