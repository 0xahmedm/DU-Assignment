# Seal Chambers (working title)

A browser-playable 2D puzzle action-platformer prototype. It has **12 puzzle chambers** built on four interacting mechanics (**Weight**, **Light**, **Phase**, **Gates**), plus combat, run upgrades and seeded expeditions. Built for the Mid-Level Game Developer & Game Designer practical assignment.

> Design docs live in [`docs/`](docs/): [GDD](docs/GDD.md) · [decision log](docs/design-decision-log.md) · [implementation plan](docs/implementation-plan.md) · [tasks](docs/tasks.md) · [devlog + AI bug log](docs/devlog.md) · [assets](docs/ASSETS.md) · [playtest kit](docs/playtests/session-script.md) · [AI logs](docs/ai-logs/)

## Play
- **Online:** https://0xahmedm.github.io/DU-Assignment/ (add `?chamber=W-E` to open a chamber directly).
- **Offline:** unzip the release and double-click `index.html`. It is one self-contained file and needs no server or internet connection.
- **What's playable:**
  - The menu opens on a title screen (the four seals, chambers solved) with **Expedition**, **Chamber select**, **How to play**, **Controls** and **Options & tools** (sound, the movement test room, playtest stats, reset progress).
  - Every chamber shows its controls along the bottom of the screen.
  - An exit opens when the room's puzzle is solved and its enemies are defeated (a walker a puzzle needs on a plate may stay). Beams push you back and cost a heart.
  - **New expedition** deals up to four chambers based on your progress, with two combat rooms before each and a reward room after: up to 18 rooms. The HUD counts rooms cleared.
  - Runs are seeded. Testers can turn on **Developer options** (menu → Options & tools) to see the seed and replay it from the Expedition screen.
  - Solved chambers, abilities and seals are saved in this browser.
  - Once all four seals are restored, the Expedition screen offers timed **Remix** runs and **Endless** runs: rooms keep coming and the fighting gets harder; the score is rooms cleared, best kept on this browser.
  - **Chamber select** (4 × 3) opens any of the twelve chambers with its declared kit.
- **Sound** starts after your first key press (a browser rule). **M** turns it on or off.

## Controls
| Action | Keys |
|---|---|
| Move | ← → or A / D |
| Aim up (up-attack / up-Bolt) | ↑ or W |
| Jump (hold = higher) | Space or Z |
| Attack | X or J |
| Pick up / put down crate | C or K |
| Interact (take an upgrade on a pedestal) | E |
| Throw (ability) | V or L |
| Bolt (ability) | F or I |
| Dash (ability) | Shift or O |
| Reset chamber | hold R |
| Menu | Esc |
| Sound on / off | M |
| Menu: choose / open / back | arrows or mouse / Enter or click / Esc |
| Type a seed to replay (menu → Expedition) | digits, Backspace |
| Copy playtest stats (menu → Options & tools) | C |
| Reset progress (menu → Options & tools) | Delete, twice |

All bindings are in one file, `src/game/input/keymap.ts`.

## Run locally
Requires **Node 20.19+** and npm. It was developed and tested on Node 24, which is also what CI uses.

```bash
npm install
npm run dev          # http://localhost:5173 (hot reload)
```

## Test
```bash
npm test             # every unit test, once
npm run test:watch   # re-run on save
npx vitest run tests/core/enumerate.test.ts   # a single file
npm run check        # typecheck + lint + tests: the same gate CI runs before every deploy
```

What the tests cover (`tests/`):
- **Puzzle rules** (`src/core`):
  - The chamber parser and validator. Broken fixtures must fail.
  - Signals, plates, doors and trapdoors, phase swaps, the beam tracer, gates (pairs, wired gates, beams and bodies passing through) and dispensers.
- **Solvability:**
  - Each chamber stores its intended solution. The logic enumerator tries every mirror, phase and plate combination and checks that the intended end state opens the exit.
  - The reachability checker runs each chamber's key routes through the real movement model.
- **Movement metrics:** jump 3, gap 4, carrying 2 / 3, Throw lands 5 ahead, Dash covers 4. They are measured on the same code the game runs.
- **Combat, enemies and run systems:**
  - Melee reach, hits and enemy behaviour.
  - Upgrades, hearts, progression and save (including corrupted or blocked storage), the seeded generator, endless runs and their difficulty curve, telemetry, and Remix and Endless records.
- **Architecture guard** (`tests/architecture.test.ts`): `src/core` may not import Phaser or touch the DOM or browser storage. ESLint enforces the same rule.
- **Docs check** (`tests/docs.test.ts`):
  - Every decision id cited is recorded, and every link and screenshot exists.
  - Every chamber is in the GDD and every room id is in this README.
  - The AI bug log has no gaps.

Gameplay was also checked by playing: every chamber has been solved end to end in the real game, and the devlog records each check.

## Build and deploy
```bash
npm run build        # dist/: the GitHub Pages build
npm run preview      # serve dist/ locally
npm run build:single # dist-single/index.html: one self-contained file for the zip
```
- `dist-single/` is not committed and does not rebuild itself. Run `npm run build:single` before zipping.
- Every push to `main` runs [`.github/workflows/pages.yml`](.github/workflows/pages.yml), which does `npm ci`, `npm run check`, `npm run build` and then deploys to GitHub Pages.

### URL options
- `?chamber=<id>`: open a chamber directly (`W-E`, `W-M`, `W-H`, `L-E`, `L-M`, `L-H`, `P-E`, `P-M`, `P-H`, `G-E`, `G-M`, `G-H`).
- `?room=movement`: the movement test room, with tile markers for the metrics.
- `?room=<id>&tier=T1|T2|T3`: open an expedition room on its own. The ids are `start`, `reward`, `exit`, `gap-run`, `corridor`, `shaft`, `red-floor` and `arena`.
- `?expedition`: start an expedition at once.
- `?seed=<n>`: use seed `n`. It works together with `?expedition`, and it also fixes the reward offers of a room opened by URL.
- `?debug`: show physics bodies.
- `?autotest`: drive the game loop with timers instead of animation frames. Automated in-browser checks use it so they keep running in a hidden window.
- Dev builds only:
  - `?kit=bolt,throw,dash` replaces the chamber's declared kit, to try abilities anywhere.
  - `?upgrades=heavy-swing,guard` gives a room or chamber opened by URL those run upgrades. The ids are in `src/core/run/upgrades.ts`.
  - `?scale=1|2|3` forces the render scale (normally picked from the screen, C118).

## Architecture
Clean architecture with an enforced dependency rule:
- `src/core`: pure, engine-free, unit-tested logic. It covers the chamber parser and validator, signal logic, beams, the enumerator, the movement model and reachability, combat rules, upgrades, progression, the generator and telemetry. No Phaser and no browser globals: storage goes through a small key-value port.
- `src/data`: chambers (`src/data/chambers/`) and expedition rooms (`src/data/rooms/`) as text grids, exactly as designed.
- `src/game`: the Phaser 3 layer: scenes, rendering, physics, input, sound, feel.
- `src/main.ts`: the composition root (URL options, scene list).

Editing a chamber means editing its grid. The validator runs when the chamber loads, and the tests re-check its solution and routes.

## Tech
Phaser 3.90.0 · TypeScript 6.0 (strict) · Vite 8 · Vitest 5 · ESLint 10. All art and audio are generated in code, and the game ships no image, sound or font files (see [`docs/ASSETS.md`](docs/ASSETS.md)).
