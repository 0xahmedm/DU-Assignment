# Implementation Plan (approved 2026-11-14)

> Source of truth for design: `docs/design-decision-log.md` (referred to below as "Part B"). Task tracking: `docs/tasks.md`. Keep all docs in sync (C86).

## Context
You are continuing a 7-working-day practical assignment (Mid-Level Game Developer & Game Designer): a browser-playable 2D action-platformer combining platforming, environmental puzzles, combat and upgrades, with **3 puzzle mechanics × 3 difficulties = 9 chambers** and a level select.
- **All 11 assignment points have been designed and approved** with the user (Part B is the authoritative decision log; IDs like C29 refer to it).
- **The clock is running: today is Day 2, with no code yet.** Day 1 was pre-production. The working directory `G:\Du` is empty.
- The evaluators weight puzzles 30%, difficulty/geometry 15%, game feel 15%, loop 10%, iteration 10%, tech/reuse 10%, upgrades/replay 5%, AI direction 5%. They value *a small number of well-designed systems producing many reliable challenges*.

## Your role and working agreement
- Act as senior game developer / technical designer **implementing an approved design.** Part B is the source of truth.
- **Do not change approved decisions.** If something is unbuildable, contradictory or clearly worse in practice, stop, explain the trade-off and ask. Record every agreed change in `docs/design-decision-log.md` (decision + why + consequences).
- The user must be able to **explain and debug every system** in a live follow-up call. Keep code readable, explain non-obvious AI-written code in short comments or commit messages, and keep commits small and reviewable.
- Distinguish verified facts from assumptions. Never claim something works without running it.
- **Never fabricate evidence** (screenshots, playtests, logs). The Day 1 screenshot shows design artefacts and is labelled as such.

## Step 0: Day 1 record-keeping (do this first)
- **Export this entire pre-production conversation** (the full Claude Code transcript, corrections and dead ends included) to `docs/ai-logs/day1-preproduction-claude.md`. It counts as Day 1 work.
- Store the ChatGPT handoff as `docs/ai-logs/day1-preproduction-chatgpt-handoff.md`.
  - **Note to user:** the handoff is a *summary*. The brief requires *full* conversation exports, so also export the complete ChatGPT conversation into `docs/ai-logs/`.
- Day 1 screenshot: `docs/screenshots/day1-design.png` showing the design artefacts (decision log / chamber grids), labelled honestly as pre-production.

## Step 1: produce the implementation plan first (for user approval)
1. Create the `docs/` set below and seed it:
   - `design-decision-log.md` = Part B.
   - `implementation-plan.md` = this Part A.
   - `tasks.md` from the schedule.
   - The `GDD.md` skeleton.
2. Return a concise plan containing:
   1. The repo structure.
   2. The chamber data schema.
   3. A task breakdown per day mapped to the schedule below, with exit criteria (mirrored into `tasks.md`).
   4. The test plan.
   5. Risks with mitigations.

**Implement only after the user approves it.** Then start Day 2 immediately.

## Living documentation (all in `docs/`; keep every one current)
| File | Purpose | Update rule |
|---|---|---|
| `implementation-plan.md` | This prompt + the approved implementation plan (structure, schema, test plan, risks) | When the approach changes |
| `tasks.md` | **Every task as a checkbox checkpoint, grouped by day, with exit criteria.** A **"Next task →"** line at the top always names the next unchecked task | Tick a box the moment a task is verified done; move the "Next task" pointer; add tasks when scope changes |
| `design-decision-log.md` | Part B: confirmed decisions, proposals, risks, change log | Every agreed design change: decision + why + consequences |
| `GDD.md` | The required 2–4 page design document (loop sentence at the top, 3 mechanics + E/M/H, solvability & difficulty scaling, combat, upgrades & replay, schedule-reordering rationale, playtest changes, one cut idea + why) | Kept in sync with the decision log as features land; trimmed to 2–4 pages on Day 7 |
| `devlog.md` | Daily 5-line entries + **AI bug log** | Daily |
| `ASSETS.md` | Every third-party / generated asset with source + licence | When an asset is added |
| `ai-logs/`, `screenshots/`, `playtests/` | Evidence folders | Daily / Day 6 |

**Rule:** if code and docs disagree, that's a bug. Any change to a decision updates the decision log, the GDD (if player-facing), `tasks.md` and, if the approach changed, `implementation-plan.md` in the same commit.

## Fixed technical decisions
- **Phaser 3 (latest stable; confirm the version) + TypeScript (strict) + Vite + Vitest** (C73).
- Arcade physics with a custom velocity-based player controller (C76).
- Internal resolution 1024 × 576 = 32 × 18 tiles of 32 px, scaled to fit; the camera follows inside larger sections.
- **All art and audio generated in code:** geometric shapes; sfxr-style generated SFX; one OFL font (C74).
- localStorage save for permanent progress + a reset option. Keyboard first; gamepad is a stretch.
- **Delivery:** GitHub repo + GitHub Pages + a zip containing a **single self-contained HTML build** that opens by double-click (C75, C82).

## Architecture (clean architecture: required)
**Dependency rule (enforced, not just a convention):**
- `src/core` is pure domain logic. **No Phaser, DOM, `window` or `localStorage` imports.** Time, randomness and storage come in through small interfaces.
- `src/data` contains pure data + schemas and may import only `core` types.
- `src/game` is the Phaser adapter layer (rendering, input, physics, audio, FX, scenes) and depends on `core` + `data`.
- `src/app` (or `main.ts`) is the composition root that wires everything together.
- Enforce it with an ESLint `no-restricted-imports` rule **and** a Vitest test that fails if `src/core` imports `phaser`.

**Design principles:**
- Scenes only orchestrate; no puzzle rules live in scenes.
- One responsibility per module; systems talk through the signal bus/events and typed interfaces.
- Devices and enemies are configured by data, not subclass explosions.
- Every core system is unit-testable headless.

```
src/core/     engine-free TS, unit-tested: grid + tiles, signal bus (OR/AND), devices
              (plate, crate, dispenser+recall, door, trapdoor, crystal, phase blocks + ghost
              rule, emitter, 2-state mirror, plate-wired locked mirror, receiver, lamp),
              beam tracer (incl. phase shutters, crates/enemies block), chamber parser,
              validator, logic-state enumerator, progression graph, seeded RNG, run generator
src/game/     Phaser layer: boot/menu/level-select/chamber/expedition scenes, player controller,
              enemies, rendering of tiles/devices, FX (hit-stop, shake, particles), audio, HUD
src/data/     chambers/W-E.ts … P-H.ts, rooms/ (connectors, start, reward, exit),
              encounters/ (tiers), upgrades.ts
tests/        Vitest: core systems + validator + enumerator over all 9 chambers
docs/         implementation-plan.md, tasks.md, design-decision-log.md, GDD.md, devlog.md
              (incl. AI bug log), ASSETS.md, ai-logs/, screenshots/, playtests/
```

## Chamber data format (C53)
- One file per chamber containing:
  - **Text grids per section, copied exactly from Part B** (row widths validated).
  - The legend, initial phase, declared kit (C24), and links between sections.
  - Metadata: id, mechanic, difficulty, prerequisites, seal, an ordered solution step list, and an intended-feeling note.
- Grid symbols define tile/device types. Lowercase letters are plates; a letter repeated in a strip forms one OR-plate.
- A per-chamber `devices` table assigns ids and signal links by coordinate where a symbol isn't unique (e.g. several receivers or doors).
- The parser must reject unknown symbols; the validator runs in dev mode and in tests.

## Rules to implement (summary; details in Part B)
**Metrics (C29, corrected):**
- Jump 3 tiles high (tap ~1); running gap 4.
- Carrying: jump 2, gap 3, −20% speed.
- Throw lands exactly 5 ahead (fixed arc). Dash 4 horizontal.
- Bolt flies straight along the player's upper body row (C50).
- **No upgrade may change these (C65).** Build a movement test room with tile markers to verify them.

**Movement feel (C58):** fast accel/decel; variable jump + apex hang; faster fall + capped speed; ~0.1 s coyote time and jump buffer; full air control; squash/stretch + dust; **no wall jump/slide**.

**Base kit (C25, C35):** run, jump, melee (forward + up, reach ~1.3 tiles), carry/put down. No pogo. No Dash while carrying (C50).

**Abilities (C23):** W-M grants Throw, L-M grants Bolt, P-M grants Dash. Permanent and available immediately in later runs. **Chambers enforce their declared kit** (C24).

**Weight:**
- Plates are active while weighted (player, crate or enemy).
- Crates are carryable and solid. Dispensers respawn crates; **hitting a dispenser recalls its crate** (C50).
- Doors and trapdoors never close on objects.

**Light:**
- Emitters fire straight grid beams. Mirrors are solid and **2-state (/ ↔ \)**, flipped by melee or Bolt.
- **Plate-wired mirrors are locked to their plate** (C42).
- Beams stop at walls, crates, enemies, closed doors and solid phase blocks. Receivers activate signals.
- **Beams knock the player back but never cost a heart** (C27). Beams kill enemies.

**Phase:**
- One red/blue state per chamber (C28). Crystals are non-solid and hit by melee or Bolt. Never on a timer.
- A block that would solidify on an occupant stays ghosted until vacated. Crates and enemies on a vanishing colour fall.
- Inactive colour is drawn as outlines.

**Signals:** wires are always visible and pulse when powered; one lamp per required exit input.

**Hearts (C54, C55):**
- 3 per run, no health bar: **any hit or enemy contact costs a heart.**
- Losing a heart resets the room and respawns you at its entrance; hearts don't refill.
- 0 hearts ends the run (abilities and solved chambers kept, C7).
- Hold R ~1 s for a free chamber reset. Hearts are off in level select.

**Enemies (C59–C62):**
- **Walker:** patrols, turns at walls and ledges (incl. 1-tile drops), can't jump, falls, counts as weight, 2 hits, respawns at its spawner.
- **Shieldbearer:** front-immune (clang), 3 hits from behind or beams/falls, telegraphed turn, 1 × 1.5 tiles, weight.
- Spitter is pre-cut (C80).
- **Dash grants brief invulnerability to beams and enemies** (C60).

**Visuals (C52):** Weight amber, Light cyan/white, Phase red (hatched) / blue (dotted), terrain dark grey; never colour alone. Every state change gets sound + particles + flash. Combat hits: ~60 ms hit-stop, small shake, flash, sound.

## The 9 chambers (layouts in Part B; build exactly as drawn)
| Id | Name | Kit | Prereqs | Notes |
|---|---|---|---|---|
| W-E | First Weight | base | none | Always the first chamber of run 1 (C22) |
| W-M | Borrowed Weight | base | W-E | Walker as weight via trapdoor; grants Throw |
| W-H | Drop Delivery | base + Throw | W-M, P-E | Seal 1 |
| L-E | First Light | base | none | Teaches up/forward attack, beam barrier |
| L-M | Order of Light | base | L-E | Gallery ordering; grants Bolt |
| L-H | Chain Reaction | base + Bolt | L-M, W-E | Wired mirrors; seal 2 |
| P-E | First Phase | base | none | |
| P-M | Footing | base | P-E | Tower traps + Shieldbearer tunnel; grants Dash |
| P-H | Eclipse (final) | base + Dash + Bolt | P-M, W-H, L-H | **Use the C56 revision**; three lamps; seal 3 |

## Expeditions, upgrades, replay
- **Run (C12, C69, C80):** Start → [connector → chamber → reward pick] × N → exit.
  - Deal up to 3 frontier chambers, easiest first; the final chamber always alone.
  - Seeded RNG; the seed is shown in the HUD; Replay seed option.
  - **Fixed-layout fallback** if the generator slips. Side rooms are pre-cut.
- **Connectors (C61):** 5–6 templates reusing the systems (ledge-over-pits, Shieldbearer corridor, vertical shaft, red-floor + crystal arena, beam arena, flat arena) plus start, reward and exit rooms. **Draft them as text grids for user approval first** (C13). Encounters come in data tiers scaling with progress (C70).
- **Upgrades (C64–C67):** pick 1 of 3 after each chamber.
  - Pool: Heavy Swing, Long Reach, Shockwave, Shield Breaker, Piercing Bolt\*, Mend, Guard, Phantom Dash\*, Insight, Throw Sight\* (\* = needs the ability).
  - Hearts are regained only via Mend. No upgrades in level select.
- **Post-game:** Remix expeditions (C71), cut-able.
- **Menu:** New expedition / Replay seed / Chamber select (3 × 3). URL params: `?chamber=<id>`, `?seed=<n>`, `?debug=1`.
- **Telemetry (C81):** per-chamber time, resets and hearts lost, exportable to the clipboard.

## Schedule (C80) and cut order (C78)
| Day | Build | Exit criteria |
|---|---|---|
| 2 (today, extended) | Repo + Vite/TS/Phaser + Pages pipeline; player controller + movement test room; chamber parser + validator; core start (signals, plates, crates, doors, phase) | Metrics verified in the test room; deploy works; first core tests green; Day 2 gameplay screenshot |
| 3 (extended) | W-E, W-M, P-E, P-M, W-H; Light system; L-E, L-M; Throw, Bolt; basic walker + Shieldbearer movement | 7 chambers playable from level select |
| 4 | L-H, P-H, Dash, enumerator (AM); combat, hearts, room reset (PM); **handle the brief change** | All 9 chambers validated; combat + hearts working |
| 5 | Connectors + encounters, reward picks, generator (or fixed fallback), save | A full expedition plays start → exit |
| 6 | 3 playtests, fixes, before/after | Playtest evidence in `docs/playtests/` |
| 7 | Polish, design doc, ASSETS.md, README, 5-min video, AI exports, final deploy + zip | All deliverables complete |
- **Cut order if behind:** Spitter → side rooms → Remix → upgrades trimmed to 6 → encounter tiers → generator (fixed layout).
- **Never cut:** 9 chambers, level select, reset, movement feel, playtesting.
- **Day 4 brief change protocol:**
  1. Save the email in `docs/`.
  2. Analyse its impact against Part B.
  3. Propose a plan to the user.
  4. Implement.
  5. Log it in the devlog and the design doc (it's 10% of the grade).

## Daily routine
- At least one gameplay screenshot `docs/screenshots/dayN-*.png`.
- Export the day's AI conversation to `docs/ai-logs/`.
- Tick the finished boxes in `tasks.md` and move "Next task".
- Sync the decision log and GDD if anything changed.
- Commit + tag `dayN`.
- 5-line devlog entry with an **AI bug log**: what the AI got wrong, how it was found and fixed.

## Out of scope / do not
No wall jump; no metric-changing upgrades; no full procedural world; no paid assets or services; no new mechanics or enemies without approval; no layout changes without approval (bugs found in layouts → propose a fix like the ones in Part B).

## Verification (end to end)
1. `npm test`: core unit tests pass; the validator passes all 9 chambers; the enumerator confirms each chamber's intended configuration lights its exit.
2. `npm run dev`, then `?chamber=<id>` for each chamber:
   - Follow the stored solution; the exit opens.
   - Try the documented wrong orders; each is recoverable.
   - Hold R resets.
3. Movement test room: jump 3 / gap 4 / carry 2 & 3 / Throw 5 / Dash 4 against tile markers.
4. Expedition:
   - Run 1 starts with W-E; chambers are dealt from the frontier; reward picks appear.
   - Hearts behave per C54/C55; the run ends at 0 hearts.
   - Progress survives a reload.
5. `npm run build`: the Pages deploy works; the single-file zip opens by double-click.


---

## Step 1 plan (awaiting user approval, 2026-11-14)

### Verified environment (2026-11-14)
- Node 24.19.0, npm 10.7.0, git 2.45.1. **GitHub CLI not installed**, so the user creates the GitHub repo on the website and the remote is connected manually.
- npm versions:
  - Phaser: **3.90.0 is the final Phaser 3 release**; 4.2.1 is the current stable Phaser 4.
  - vite 8.3.8, vitest 5.1.0, vite-plugin-singlefile 2.3.4.
  - typescript-eslint 8.72.2 supports TypeScript **< 6.1**, so TypeScript is pinned to **6.0.3** (TS 7.0 is not yet supported by the linter).
- Exact versions are pinned in `package.json`.

### Repo structure
```
G:\Du
├─ index.html · package.json · tsconfig.json · vite.config.ts · vitest.config.ts · eslint.config.js · README.md · .gitignore
├─ .github/workflows/pages.yml             build + test + deploy to GitHub Pages
├─ src/
│  ├─ main.ts                              composition root (wires core + data + game)
│  ├─ core/                                NO phaser / DOM / window / localStorage
│  │  ├─ ports.ts                          Clock, Rng, Storage interfaces
│  │  ├─ grid/                             Grid, Tile, coords, solidity queries
│  │  ├─ signals/                          SignalBus (OR/AND), links
│  │  ├─ devices/                          plate, door, trapdoor, crate, dispenser, crystal, emitter, mirror, receiver, lamp
│  │  ├─ phase/                            PhaseSystem + ghost rule
│  │  ├─ light/                            BeamTracer
│  │  ├─ chamber/                          types, legend, parser, ChamberState, validator, enumerator
│  │  ├─ player/                           metrics.ts (C29) + derived physics constants, kit
│  │  └─ run/                              progression graph, seals, hearts, upgrades, rng, generator
│  ├─ data/                                chambers/*.ts · rooms/*.ts · encounters/*.ts · upgrades.ts
│  └─ game/                                scenes/ · player/ · enemies/ · render/ · fx/ · audio/ · ui/ · adapters/
└─ tests/                                  core/*.test.ts · chambers.test.ts · architecture.test.ts
```

### Chamber data schema (core types; data files only import these)
```ts
type ChamberId = 'W-E'|'W-M'|'W-H'|'L-E'|'L-M'|'L-H'|'P-E'|'P-M'|'P-H';
type Ability = 'throw'|'bolt'|'dash';
interface ChamberDef {
  id: ChamberId; name: string;
  mechanic: 'weight'|'light'|'phase'; difficulty: 'easy'|'medium'|'hard';
  prerequisites: ChamberId[]; kit: Ability[]; grants?: Ability; seal?: 1|2|3;
  initialPhase: 'red'|'blue';
  sections: { id: string; grid: string[]; exits: SectionExit[] }[];  // grids copied verbatim from Part B
  devices?: DeviceOverride[];   // id / params / wiring by (section,row,col) where a symbol isn't unique
  links: { from: string; to: string; logic?: 'OR'|'AND' }[];
  solution: string[];           // ordered steps (shown in the debug overlay; used by playtest checklist)
  intendedFeeling: string;      // for the GDD and the follow-up call
}
```
- **Legend (shared):**
  - Terrain and doors: `#` solid · `.` air · `S` start · `D` entry · `E` exit · `|`/`K` door · `=` trapdoor
  - Weight: `C` crate · `U` dispenser
  - Phase: `R`/`B` phase blocks · `*` crystal
  - Light: `>` `<` `^` `v` emitters · `/` `\` mirrors · `o` receiver
  - Enemies: `w` walker · `H` Shieldbearer
  - Plates: **lowercase letters other than `o`, `v`, `w`**; a repeated letter = one OR-plate strip
- **Data note:** P-M's bridge enemy is drawn as `w` in Part B. It is entered as `H` (Shieldbearer, C48). This is a symbol correction, not a design change.

### Test plan
- **Unit (Vitest, core only):**
  - Signal propagation (OR/AND); plates (occupancy); doors never close on occupants.
  - Phase swap + ghost rule + objects falling.
  - Beam tracer reflection table, blockers incl. phase colours and enemies, receivers.
  - Wired mirrors locked; dispenser recall.
  - Parser (widths, unknown symbols); validator (broken fixtures fail).
  - Progression frontier (W-E first, final chamber alone, prerequisites).
  - Seeded RNG determinism; generator (no repeated connectors); hearts state machine; upgrade gating.
- **Chamber tests:**
  - All 9 chambers parse and validate.
  - The **enumerator** confirms the intended configuration lights each exit and lists any other configurations that also do (reviewed by hand).
- **Architecture test:** `src/core` imports nothing from `phaser` or the DOM (plus the ESLint rule).
- **Manual (each build):**
  - Movement test room metrics.
  - Per chamber: the stored solution, the documented wrong orders, hold-R reset.
  - A full expedition.
  - Pages deploy + single-file zip.

### Risks and mitigations
| Risk | Mitigation |
|---|---|
| Days 2–3 workload (8 chambers + 3 systems) | Layouts already exist as data; core tested headless; cut order C78 |
| Arcade physics vs exact metrics | Derive gravity, jump velocity and run speed analytically from C29; tile-marker test room; constants in one file |
| Throw/Dash imprecision | Throw is a scripted arc landing exactly 5 tiles ahead; Dash is a fixed-distance move, not physics impulses |
| Phase ghost rule vs physics overlap | Solidity is a per-tile query in core; Phaser colliders consult it each frame |
| AI writes Phaser code the user can't explain | Small commits; a short "how it works" note per system in the devlog |
| Day 4 brief change unknown | Half-day buffer; data-driven chambers and systems |
