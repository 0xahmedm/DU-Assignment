import Phaser from 'phaser';
import { KEYMAP, type Action } from './keymap';

/**
 * Keyboard state with "pressed since last consumed" latches. Physics runs at a fixed 60 Hz,
 * which can be 0, 1 or 2 steps per rendered frame, so presses are latched on keydown and
 * consumed by the next physics step instead of relying on per-frame JustDown.
 */
export class Controls {
  private readonly keys = new Map<Action, Phaser.Input.Keyboard.Key[]>();
  private readonly latched = new Set<Action>();

  constructor(scene: Phaser.Scene) {
    const kb = scene.input.keyboard;
    if (!kb) throw new Error('Keyboard input unavailable');
    for (const action of Object.keys(KEYMAP) as Action[]) {
      const list = KEYMAP[action].map((code) => kb.addKey(code, true, false));
      for (const key of list) key.on('down', () => this.latched.add(action));
      this.keys.set(action, list);
    }
  }

  held(action: Action): boolean {
    return (this.keys.get(action) ?? []).some((k) => k.isDown);
  }

  /** True once per press; clears the latch. */
  consume(action: Action): boolean {
    const had = this.latched.has(action);
    this.latched.delete(action);
    return had;
  }

  horizontal(): -1 | 0 | 1 {
    const l = this.held('left');
    const r = this.held('right');
    return l === r ? 0 : l ? -1 : 1;
  }
}
