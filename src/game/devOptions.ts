/**
 * Developer options (C114), for testers: off for players. When on, seeds are shown (the HUD, run
 * banners and summaries) and the Expedition screen offers Replay seed. Remembered on this browser.
 */
const KEY = 'seal-chambers.dev';

let on = (() => {
  try {
    return window.localStorage.getItem(KEY) === '1';
  } catch {
    return false;
  }
})();

export const DevOptions = {
  get on(): boolean {
    return on;
  },
  toggle(): boolean {
    on = !on;
    try {
      window.localStorage.setItem(KEY, on ? '1' : '0');
    } catch {
      // not remembered; on for this session
    }
    return on;
  },
};
