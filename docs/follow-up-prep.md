# Follow-up call prep

Notes for the follow-up call (Point 10 of the plan, C82): how to run the project live, three rehearsed changes with what the tools will say, the intended feeling of each chamber, the AI bug stories, likely challenges, and the numbers.

## Before the call

```bash
npm install
npm run dev          # http://localhost:5173 (hot reload: saved edits appear in the game at once)
npm test             # 343 tests in 28 files, about 40 s
```

- Useful URLs:
  - `?chamber=G-E` opens a chamber directly.
  - `?room=arena&tier=T3` opens a combat room.
  - `?debug` shows the physics bodies.
  - `?expedition&seed=42` starts a run.
- Have open:
  - `src/data/chambers/G-E.ts` (a grid);
  - `src/core/player/movement.ts` (`DEFAULT_MOVEMENT`);
  - `src/core/chamber/validator.ts`;
  - `docs/design-decision-log.md`.
- Start from a clean tree (`git status`), so `git checkout -- <file>` undoes any live change.

## Three rehearsed live changes

Each one was rehearsed on 2026-11-23 on a clean tree and then reverted. The results are what the tools will show.

### 1. Edit a chamber grid: the parser and validator catch a broken layout
- **Do:** in `src/data/chambers/G-E.ts`, change `'D.........1...##...1.......E'` to `'D.........1...##...........E'`, which erases the top cell of the twin gate.
- **Result:** `npx vitest run tests/core/chambers.test.ts` fails `G-E "First Gate" parses and validates`. The parser says gate "1" must be drawn as two gates, each two cells tall. In the browser, the chamber refuses to load.
- **Point:** chambers are data. A grid edit is a text edit, and the safety net is immediate.
- **Positive variant:** move plate `a` two cells left (`'DS.a......1…'`). The game updates on save, the wire re-routes, and all tests stay green.

### 2. Tune the movement: the reachability checker names every chamber that breaks
- **Do:** in `src/core/player/movement.ts`, change `jumpVelocity: 846` to `760` (a weaker jump).
- **Result:** `npx vitest run tests/core/movement.test.ts tests/core/reach.test.ts` fails **13 tests**. Each one names a route that broke:
  - "reaches a ledge 3 tiles up";
  - W-H "the 3-high crate ledge";
  - P-M "tower: each stage reaches the next foothold" and "bridge";
  - L-E "section B: the floating platform";
  - L-M "the gallery";
  - L-H "the left shaft" and "the pen";
  - P-H "home in Blue needs jump + Dash" and others.
- **Point:** every layout is drawn against fixed metrics (jump 3, gap 4, carry 2/3, Throw 5, Dash 4). The checker runs the game's own movement code on every chamber, so a feel tweak can't silently break a puzzle. That's why the metrics are locked.
- **Watch out:** `METRICS` in `metrics.ts` holds the *promises* the tests check, not the physics. Changing `jumpTiles` alone fails only the test that checks the promise; the physics live in `DEFAULT_MOVEMENT`.

### 3. Add a device: a signal door and its plate
- **Do:** in `G-E.ts`:
  - change the two gate rows to `'D.........1...##...1.K.....E'` and `'DS.b.a....1...##...1.K.C...E'`;
  - add `names: { 'A:4,21': 'doorK' }`;
  - add the link `{ from: 'b', to: 'doorK' }`.
- **Result:**
  - The door and its dashed amber wire appear in the game on save.
  - `npx vitest run tests/core/enumerate.test.ts` fails only the report snapshot. Its diff shows the new plate `b` in the chamber's logic states.
  - The reach test still passes: the crate stays reachable, because a 2-high door can be jumped.
  - After reviewing the diff, accept it with `npx vitest run -u tests/core/enumerate.test.ts`.
- **Point:** new devices are data plus a link. The enumerator lists every logic state that opens the exit, so unintended solutions show up as a reviewed diff, not as a surprise in playtests.

**Quick extras if asked:**
- Rebind a key: one line in `src/game/input/keymap.ts`. The Controls screen and the in-game controls bar both follow it.
- Change a rule constant, for example `ENDLESS_LIMITS` in `src/core/run/endless.ts`.

## Intended feeling per chamber

| Chamber | Intended feeling |
|---|---|
| W-E First Weight | Calm discovery: "a plate opens a door, but only while something heavy stays on it", then "carrying makes me weaker". |
| W-M Borrowed Weight | "The enemy is my second weight": using the level's inhabitant as a puzzle piece. |
| W-H Drop Delivery | Planning a delivery: "throw in Red, drop in Blue", and "the ledge only exists via Blue". |
| L-E First Light | Wonder, then understanding: "light goes where I point it, and where light goes I cannot walk." |
| L-M Order of Light | "Set the far mirror before the light fills the path to it": planning the order, not the aim. |
| L-H Chain Reaction | A Rube Goldberg machine: "one shot, and everything I prepared falls into place." |
| P-E First Phase | Curiosity and a small "aha": "the outlines show what the other colour would give me", then "do not stand on the colour you are about to remove". |
| P-M Footing | "Where I stand when I swap matters", then "the swap reshapes the room for everyone in it". |
| P-H Eclipse | The finale's dilemma: "light needs Blue, the bridge needs Red", resolved by an ability you earned. |
| G-E First Gate | "That frame is a door through the wall": what goes in here comes out there, both ways. |
| G-M Gatekeeper | "I opened the door for the enemy, and now it holds my door open." |
| G-H Handover | "One beam can't do both jobs, so the crate takes one over." |

## AI bug stories (from the devlog's AI bug log, 35 entries)

1. **A design bug before any code (#1).** The AI proposed Throw "lands 3 tiles ahead". But a carrying jump already crosses 3, so Throw would have been useless. It was found while drawing the chambers against the metrics; Throw became 5. *Lesson:* check every number against the others.
2. **Layouts drawn for the wrong body (#18, #24).** The AI drew W-H's staircase and L-H's shaft as if the player were 1 tile tall (the body is 1.375). Both were unclimbable, which we only found by playing them. *Response:* the reachability checker (C51) now runs the real movement code on every grid. It caught similar errors in four chambers before they were built.
3. **The rule as written vs the game as played (#30).** The Bolt flew along the "upper-body row", as decision C50 said. That row is one tile above a walker on flat ground, so the Bolt could never hit a walker. The user decided the fix: the Bolt hits enemies in front of any part of the body (C103).
4. **A stale value through a new system (#34).** The gate code remembered each body's position from the last step it was checked. A crate carried across the room kept its old position. Putting it down looked like walking across a gate, so it teleported. Found by playing First Gate. *Fix:* forget carried crates, and never count a move over half a tile as a crossing.
5. **A bug only a playtester found (#35).** Standing on a crate stuttered. I measured 39 flips between standing and falling in 2 s. The movement code's small downward speed (to stick to the ground) is absorbed by tiles every step, but a crate let the player sink before pushing back. *Fix:* feet on a crate's top count as standing, measured again at 0. It's the before/after in the GDD.
6. **A process bug (#29).** The AI asked the user to double-click a single-file build made on Day 2 and never rebuilt. It showed only the movement room. *Lesson:* builds don't rebuild themselves, so `npm run build:single` is now in every delivery step.

## Likely challenges, and answers

- **Why roguelite runs in a puzzle game?** Solved chambers, abilities and seals are kept for good. A run rearranges the world around the next, harder puzzles, so no puzzle is ever solved twice for progress. Remix and Endless are optional replay after completion.
- **Why does any enemy contact cost a heart, and now beams too?** Combat stays readable, with no health bars. Beams costing a heart was the user's call after playing (C110). The push back stays, so a beam is still a barrier first. Chamber select gives 3 hearts per attempt.
- **Why do chambers enforce their kit?** A later ability must never bypass an earlier puzzle. Each chamber is solvable with exactly the kit it declares (C14).
- **Why no wall jump?** It would break the fixed metrics that every layout and the reachability checker rely on.
- **Why do exits wait for enemies?** The user's decision after playing (C109): a combat room means something, and a chamber's plate walker is exempt. Trade-off: P-M's guard must be defeated, and dropping it into the sealed chasm needs a reset. The game says "fell out of reach? hold R".
- **Isn't the fourth mechanic late and risky?** It went through the Day 1 pipeline: rules and grids drafted, checked by every tool, approved, then solved in the game. The core change is about 100 lines with 14 dedicated tests. Eclipse's tested layout was not touched.
- **How do you know the puzzles have no unintended solutions?** The logic enumerator tries every phase × mirror × plate combination, and its report is reviewed by hand (`docs/enumerator-report.md`). Physical reachability is the checker's job. Playtests cover what neither can.
- **Where's the Day 4 brief change?** No brief-change email was received, so the GDD has no section for it. The plan kept a half-day buffer for it.
- **How was AI used, and how did you trust it?**
  - Claude drafted and built, and the user decided (C13). Every decision is in the log with who decided.
  - Everything was checked by tests and by playing in the browser.
  - The bugs the AI introduced are logged with how they were found.
  - Every session is exported in `docs/ai-logs/`.
- **What would you do next?**
  - W-H's readability (11 minutes and two abandoned attempts in the playtest stats) and W-M's walker (7 defeats).
  - Measure time-to-pick with the new E prompt.
  - The cut Spitter enemy and ability-gated side rooms.
  - Gamepad support.

## Numbers

| | |
|---|---|
| Chambers | 12 (4 mechanics × Easy / Medium / Hard) |
| Combat rooms | 5, each with 3 encounter tiers; plus start, reward and exit rooms |
| Expedition | up to 18 rooms (4 chambers, 2 combat rooms before each); Remix and Endless after all four seals |
| Upgrades | 10 (Endless: at most 4 held) |
| Tests | 343 in 28 files; `npm run check` is the CI gate before every deploy |
| Decisions | 117 (C1–C117), each with who decided |
| AI bug log | 35 entries |
| Playtests | 3 remote testers; tester 1: 103 attempts, W-H 11:08 first solve; crate stutter 39 → 0 flips |
| Commits | 50+, tags `day2` … `day7` |

## The 5-minute video: an outline (the user's task)

Following the plan's outline (C82). With Developer options on, the seeds show for the two-seed comparison.

| Time | Show | Say |
|---|---|---|
| 0:00–0:30 | Title screen, How to play | The loop sentence: short expeditions, handcrafted chambers, progress you keep, four seals. |
| 0:30–1:15 | A combat room, then a reward room (E) | Movement feel (variable jump, coyote time), melee with hit-stop, hearts; exits wait for the enemies. |
| 1:15–2:30 | First Gate → Gatekeeper → Handover | Teach → deepen → combine, on one mechanic; Gates was added mid-project through the same pipeline. |
| 2:30–3:15 | Eclipse | The finale's dilemma (light needs Blue, the bridge needs Red), solved with Dash. |
| 3:15–4:00 | Two expeditions with different seeds | Different chambers and combat rooms each run; upgrades; Remix and Endless after completion. |
| 4:00–5:00 | A grid file, a test run with a weaker jump (13 failures), the decision log and AI bug log, the playtest before/after | How solvability is proven (validator, enumerator, reachability checker) and how AI was used and checked. |
