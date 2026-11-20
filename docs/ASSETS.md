# Asset List

Every asset in the game, with its source and licence (deliverable, C82). Per C74, everything you see and hear is made in code, so the build contains **no image, audio or font files**. The only third-party code shipped is Phaser.

## In the game
| Asset | Type | Source | Licence |
|---|---|---|---|
| All graphics: tiles, player, enemies, crates, plates, doors, mirrors, emitters, beams, phase blocks (hatched red, dotted blue), gates (one colour + digit per pair), wires, UI | Drawn in code | Original. Phaser Graphics shapes in the C52 palette, in `src/game/render/` (`ChamberView.ts`, `palette.ts`, `dashes.ts`) and the player/enemy classes | Project's own |
| Particles: dust and sparks | Drawn in code | Original. Small tweened rectangles in `src/game/render/fx.ts` | Project's own |
| Sound effects (30): swing, hit, clang, kill, defeat, swap, bolt, dash, mirror, jump, land, pick up, put down, throw, crate land, refuse, plate down/up, door open/close, receiver on/off, gate pass, gate on/off, exit open, reward pick, menu move/select/back | Synthesised in code | Original. sfxr-style oscillator and noise bursts built at runtime with the Web Audio API in `src/game/audio/Sfx.ts`; no external generator or sample used | Project's own |
| Music | None | — | — |
| Font | System font | The browser's default `monospace` font. C74 allowed one OFL font, but none was needed, so no font is bundled or distributed | n/a |
| Chamber and room layouts | Data | Original. Text grids in `src/data/` (designed in the Day 1 pre-production sessions) | Project's own |
| Phaser 3.90.0 | Library | npm `phaser` | MIT |

## Development only (not shipped)
| Tool | Version | Licence |
|---|---|---|
| TypeScript | 6.0.3 | Apache-2.0 |
| Vite | 8.3.8 | MIT |
| vite-plugin-singlefile (single-file build) | 2.3.4 | MIT |
| Vitest | 5.1.0 | MIT |
| ESLint, @eslint/js, typescript-eslint, globals | 10.14.0, 10.0.1, 8.72.2, 17.14.0 | MIT |
| @types/node | 24.x | MIT |

## AI assistance
- **Code and docs:** written with Claude Code (Anthropic) under the user's direction. Claude drafts (chamber layouts as text grids, per C13) and implements; the user decides. Every session is exported to [`docs/ai-logs/`](ai-logs/), and the bugs the AI introduced are listed in the devlog's AI bug log.
- **Pre-production:** an early ChatGPT conversation and its handoff note are in [`docs/ai-logs/`](ai-logs/).
- **No AI-generated images, audio or other media** are used anywhere in the game.

## Screenshots
The images in [`docs/screenshots/`](screenshots/) are captures of the game itself (Day 1 shows the design files), saved through a dev-only endpoint. They are evidence only and are not part of the build.
