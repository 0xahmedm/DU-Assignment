import Phaser from 'phaser';
import { renderScaleFor } from './camera';

/**
 * Sharp rendering (C118). The canvas is the logical view times RENDER_SCALE, so it has as many
 * pixels as the screen shows; scenes keep laying out in logical units and the cameras zoom by
 * RENDER_SCALE. Shapes are vectors and come out sharp by themselves; text is drawn to a texture,
 * so it is rendered at RENDER_SCALE too (crispText).
 */
export const RENDER_SCALE = devScale() ?? renderScaleFor(window.devicePixelRatio, Math.max(window.screen.width, window.innerWidth), Math.max(window.screen.height, window.innerHeight));

/** Dev only: ?scale=1|2|3 forces the render scale (a hidden test browser reports no screen at all). */
function devScale(): number | undefined {
  if (!import.meta.env.DEV) return undefined;
  const n = Number(new URLSearchParams(window.location.search).get('scale'));
  return n >= 1 && n <= 3 ? Math.round(n) : undefined;
}

/** Every `scene.add.text` renders at RENDER_SCALE unless its style says otherwise. Call once, before the game starts. */
export function crispText(): void {
  const proto = Phaser.GameObjects.GameObjectFactory.prototype;
  const add = proto.text;
  proto.text = function (this: Phaser.GameObjects.GameObjectFactory, x: number, y: number, text: string | string[], style?: Phaser.Types.GameObjects.Text.TextStyle) {
    return add.call(this, x, y, text, { resolution: RENDER_SCALE, ...style });
  };
}

/** A scene without scrolling (the menu): one camera, zoomed from the top-left corner. */
export function zoomFlat(scene: Phaser.Scene): void {
  scene.cameras.main.setOrigin(0, 0).setZoom(RENDER_SCALE);
}

const isHud = (o: Phaser.GameObjects.GameObject): boolean => (o as unknown as { scrollFactorX?: number }).scrollFactorX === 0;

/**
 * A scene with a scrolling world and a fixed HUD (chambers, rooms, the test room). A zoomed camera
 * can't draw scrollFactor-0 objects in place (it scales them about the screen centre), so there
 * are two cameras: the main one follows the world, and a HUD camera draws the scrollFactor-0
 * objects from the top-left corner and never scrolls or shakes. Each object is drawn by exactly
 * one of them; objects added later are sorted before the next frame. Call first in create().
 */
export function splitCameras(scene: Phaser.Scene): Phaser.Cameras.Scene2D.Camera {
  const main = scene.cameras.main.setZoom(RENDER_SCALE);
  const hud = scene.cameras.add(0, 0, scene.scale.width, scene.scale.height).setOrigin(0, 0).setZoom(RENDER_SCALE);
  const pending = new Set<Phaser.GameObjects.GameObject>();
  const onAdd = (o: Phaser.GameObjects.GameObject) => pending.add(o);
  const sort = () => {
    for (const o of pending) (isHud(o) ? main : hud).ignore(o);
    pending.clear();
  };
  scene.events.on(Phaser.Scenes.Events.ADDED_TO_SCENE, onAdd);
  scene.events.on(Phaser.Scenes.Events.PRE_RENDER, sort);
  scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
    scene.events.off(Phaser.Scenes.Events.ADDED_TO_SCENE, onAdd);
    scene.events.off(Phaser.Scenes.Events.PRE_RENDER, sort);
    pending.clear();
  });
  return hud;
}
