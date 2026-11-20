/**
 * Composition root (C85): the only place that knows about every layer. It reads URL options,
 * creates the Phaser game and registers scenes. Puzzle rules live in src/core, never here.
 */
import Phaser from 'phaser';
import type { Ability, ChamberId } from './core/chamber/types';
import { UPGRADES, type UpgradeId } from './core/run/upgrades';
import { Sfx } from './game/audio/Sfx';
import { cssHex, PALETTE } from './game/render/palette';
import { ChamberScene } from './game/scenes/ChamberScene';
import { MenuScene } from './game/scenes/MenuScene';
import { TestRoomScene } from './game/scenes/TestRoomScene';

const params = new URLSearchParams(window.location.search);
const debug = params.has('debug');
// ?autotest drives the game loop with timers instead of requestAnimationFrame, so automated
// in-browser checks keep running when the page isn't being painted (e.g. a hidden preview pane).
const autotest = params.has('autotest');
// Start route: ?chamber=W-E opens a chamber directly (for reviewers and tests); ?room=movement the test room.
// ?room=<id>&tier=T1|T2|T3 opens an expedition room on its own (C101).
const route = {
  chamber: (params.get('chamber') ?? undefined) as ChamberId | undefined,
  room: params.get('room') ?? undefined,
  tier: params.get('tier') ?? undefined,
  // ?expedition starts a run at once (with ?seed= for a given seed).
  expedition: params.has('expedition'),
};

// Dev only: ?kit=bolt,throw,dash replaces every chamber's declared kit (C24), to try abilities in
// chambers that don't grant them yet. Production builds ignore it.
const ABILITIES: readonly Ability[] = ['throw', 'bolt', 'dash'];
const kitOverride = import.meta.env.DEV && params.has('kit')
  ? (params.get('kit') ?? '').split(',').filter((a): a is Ability => (ABILITIES as readonly string[]).includes(a))
  : undefined;
// Dev only: ?upgrades=heavy-swing,guard gives an opened-alone expedition room those run upgrades.
const upgradeOverride = import.meta.env.DEV && params.has('upgrades')
  ? (params.get('upgrades') ?? '').split(',').filter((u): u is UpgradeId => UPGRADES.some((x) => x.id === u))
  : undefined;
// ?seed=123 fixes the run seed (upgrade offers; the expedition generator later).
const seed = params.has('seed') ? Number(params.get('seed')) >>> 0 : undefined;

const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  width: 1024,
  height: 576,
  backgroundColor: PALETTE.background,
  ...(autotest ? { fps: { forceSetTimeOut: true, target: 60 } } : {}),
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
  physics: {
    default: 'arcade',
    arcade: { gravity: { x: 0, y: 0 }, fps: 60, fixedStep: true, debug },
  },
  callbacks: {
    preBoot: (g) => {
      if (route.chamber || route.room || route.expedition) g.registry.set('route', route);
      if (kitOverride) g.registry.set('kitOverride', kitOverride);
      if (upgradeOverride) g.registry.set('upgradeOverride', upgradeOverride);
      if (seed !== undefined) g.registry.set('seed', seed);
    },
  },
  scene: [MenuScene, ChamberScene, TestRoomScene],
});

// M toggles all sound anywhere (remembered on this browser), with a short note in the corner.
window.addEventListener('keydown', (e) => {
  if (e.key !== 'm' && e.key !== 'M') return;
  const muted = Sfx.toggleMute();
  const scene = game.scene.getScenes(true)[0];
  if (!scene) return;
  const note = scene.add
    .text(scene.scale.width - 12, scene.scale.height - 10, muted ? 'sound off (M)' : 'sound on (M)', { fontFamily: 'monospace', fontSize: '13px', color: cssHex(PALETTE.text) })
    .setOrigin(1, 1)
    .setScrollFactor(0)
    .setDepth(300);
  scene.tweens.add({ targets: note, alpha: 0, delay: 900, duration: 400, onComplete: () => note.destroy() });
});

// Dev-only hook for automated in-browser checks (never included in production builds).
if (import.meta.env.DEV) Object.assign(window, { __game: game, __sfx: Sfx });
