# Seal Chambers (working title)

A browser-playable 2D puzzle action-platformer prototype: **9 puzzle chambers** across three interacting mechanics (**Weight**, **Light**, **Phase**), combat, upgrades and seeded expeditions. Built for the Mid-Level Game Developer & Game Designer practical assignment.

> Design docs live in [`docs/`](docs/): [GDD](docs/GDD.md) · [decision log](docs/design-decision-log.md) · [implementation plan](docs/implementation-plan.md) · [tasks](docs/tasks.md) · [devlog + AI bug log](docs/devlog.md) · [assets](docs/ASSETS.md)

## Play
- **Online:** https://0xahmedm.github.io/DU-Assignment/ (try `?chamber=W-E` to open a chamber directly).
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
- `?chamber=<id>` and `?seed=<n>`: coming with level select and expeditions.

## Architecture
Clean architecture with an enforced dependency rule (ESLint + `tests/architecture.test.ts`):
- `src/core`: pure, engine-free, unit-tested puzzle and movement logic (no Phaser, no browser globals).
- `src/data`: chambers, rooms and upgrades as data (text grids exactly as designed).
- `src/game`: the Phaser 3 layer (rendering, physics, input, feel).
- `src/main.ts`: the composition root.

## Tech
Phaser 3.90.0 · TypeScript 6.0 (strict) · Vite 8 · Vitest 5 · ESLint 10. All art and audio are generated in code (see `docs/ASSETS.md`).
