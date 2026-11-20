# Seal Chambers (working title)

A browser-playable 2D puzzle action-platformer prototype: **9 puzzle chambers** across three interacting mechanics (**Weight**, **Light**, **Phase**), combat, upgrades and seeded expeditions. Built for the Mid-Level Game Developer & Game Designer practical assignment.

> Design docs live in [`docs/`](docs/): [GDD](docs/GDD.md) · [decision log](docs/design-decision-log.md) · [implementation plan](docs/implementation-plan.md) · [tasks](docs/tasks.md) · [devlog + AI bug log](docs/devlog.md) · [assets](docs/ASSETS.md) · [playtest kit](docs/playtests/session-script.md)

## Play
- **Online:** https://0xahmedm.github.io/DU-Assignment/ (try `?chamber=W-E` to open a chamber directly).
- **What's playable:** the full loop. **New expedition** deals up to three chambers from your progress between combat and reward rooms (seeded; the seed is in the HUD and can be replayed from the menu); solved chambers, abilities and seals are saved; once all three seals are restored, expeditions become Remix runs. The chamber select (3 × 3) opens all nine chambers with their declared kit.
- **Offline:** unzip the release and double-click `index.html` (a single self-contained file; no server needed).

## Controls
| Action | Keys |
|---|---|
| Move | ← → or A / D |
| Aim up (up-attack / up-Bolt) | ↑ or W |
| Jump (hold = higher) | Space or Z |
| Attack | X or J |
| Pick up / put down crate | C or K |
| Throw (ability) | V or L |
| Bolt (ability) | F or I |
| Dash (ability) | Shift or O |
| Reset chamber | hold R |
| Menu | Esc |
| Sound on / off | M |
| Reset progress (menu) | Delete, twice |
| Type a seed to replay (menu) | digits, Backspace |
| Copy playtest stats (menu) | C |

## Run locally
Requires Node 20.19+ (developed on Node 24).

```bash
npm install
npm run dev          # http://localhost:5173
npm test             # unit tests (core logic, movement metrics, architecture guard)
npm run check        # typecheck + lint + tests
npm run build        # dist/        (GitHub Pages build)
npm run build:single # dist-single/ (one self-contained index.html for the zip)
```

### URL options (development)
- `?debug`: show physics bodies.
- `?autotest`: drive the game loop with timers (used by automated in-browser checks).
- `?chamber=<id>`: open a chamber directly (e.g. `?chamber=L-M`); `?room=movement`: the movement test room.
- `?room=<id>&tier=T1|T2|T3`: open an expedition room on its own (`start`, `reward`, `exit`, `gap-run`, `corridor`, `shaft`, `red-floor`, `arena`).
- `?kit=bolt,throw,dash` (dev builds only): replace the chamber's declared kit, to try abilities anywhere.
- `?expedition`: start an expedition at once; with `?seed=<n>`, that seed (`?seed=` alone also fixes the reward offers of a room opened by URL).
- `?upgrades=heavy-swing,guard` (dev builds only): give a room or chamber opened by URL those run upgrades (ids in `src/core/run/upgrades.ts`).

## Architecture
Clean architecture with an enforced dependency rule (ESLint + `tests/architecture.test.ts`):
- `src/core`: pure, engine-free, unit-tested puzzle and movement logic (no Phaser, no browser globals).
- `src/data`: chambers and rooms as data (text grids exactly as designed); the upgrade pool lives in `src/core/run/upgrades.ts`.
- `src/game`: the Phaser 3 layer (rendering, physics, input, feel).
- `src/main.ts`: the composition root.

## Tech
Phaser 3.90.0 · TypeScript 6.0 (strict) · Vite 8 · Vitest 5 · ESLint 10. All art and audio are generated in code (see `docs/ASSETS.md`).
