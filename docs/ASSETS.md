# Asset List

Every third-party or AI/tool-generated asset, with source and licence (deliverable, C82). Per C74, all graphics are drawn in code, so this list stays short.

| Asset | Type | Source | Licence | Notes |
|---|---|---|---|---|
| All graphics (tiles, player, enemies, devices, UI shapes) | Code-drawn | Original, drawn with Phaser Graphics in `src/game/render/` | Project's own | No image files |
| Sound effects | Generated in code | Original: sfxr-style oscillator and noise bursts synthesised at runtime with the Web Audio API in `src/game/audio/Sfx.ts` | Project's own | No audio files; no external generator used |
| Font | System font | The browser's default monospace font | n/a (not distributed) | No font file so far; if an OFL font is added, record its source here |
| Phaser 3 | Library | npm `phaser` 3.90.0 | MIT | Bundled into the build |
| Development tools | npm (dev only) | TypeScript, Vite, Vitest, ESLint, typescript-eslint, vite-plugin-singlefile | MIT / Apache-2.0 | Not shipped in the game |
