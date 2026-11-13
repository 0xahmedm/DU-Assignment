/**
 * Composition root (C85): the only place that knows about every layer. It reads URL options,
 * creates the Phaser game and registers scenes. Puzzle rules live in src/core, never here.
 */
import Phaser from 'phaser';
import { PALETTE } from './game/render/palette';
import { TestRoomScene } from './game/scenes/TestRoomScene';

const params = new URLSearchParams(window.location.search);
const debug = params.has('debug');
// ?autotest drives the game loop with timers instead of requestAnimationFrame, so automated
// in-browser checks keep running when the page isn't being painted (e.g. a hidden preview pane).
const autotest = params.has('autotest');

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
  scene: [TestRoomScene],
});

// Dev-only hook for automated in-browser checks (never included in production builds).
if (import.meta.env.DEV) (window as unknown as { __game: Phaser.Game }).__game = game;
