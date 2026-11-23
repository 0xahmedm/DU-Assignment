# Devlog

Daily entries (5 lines max) plus an **AI bug log**: what the AI got wrong, how it was found and how it was fixed. This is source material for the follow-up call ("walk through a bug AI introduced").

---

## Day 1: Pre-production
- Designed all 11 assignment points with Claude Code as design partner. Every decision is logged in `docs/design-decision-log.md` (C1–C86).
- Drew all 9 puzzle chambers as tile grids against fixed movement metrics, and checked each for bypasses and softlocks.
- Rescoped early: no artist + limited level-design capacity → lean expeditions instead of a hand-built Metroidvania world.
- Chose the stack (Phaser 3 + TypeScript + Vite) and a clean architecture with an engine-free, tested puzzle core.
- No gameplay yet; the Day 1 screenshot shows design artefacts.

### AI bug log (Day 1)
| # | What the AI got wrong | How it was found | Fix |
|---|---|---|---|
| 1 | Proposed Throw "lands 3 tiles ahead", but a carrying jump already crosses 3, so Throw would have been useless | Found by the AI while drawing W-H against the metrics | Throw lands 5 ahead (clears a 4-gap) |
| 2 | The objective wording ("one seal per mechanic opens the final chamber" + "the final chamber is one of the 9") implied a 10th puzzle, or a seal coming from the chamber it unlocks | Cross-checking decisions | Each Hard restores a seal; the first two open the final chamber |
| 3 | L-E Section B first draft: the mirror block stopped the player stepping off the ledge toward the exit | Tile-by-tile path check | Redrawn with a floating platform the player walks under |
| 4 | L-M as approved ("beam up the climbing shaft") required pixel-precise jumps around mirror blocks | Drawing it exactly | The same lesson moved to a gallery walkway |
| 5 | L-H grid written to the log had two rows one tile too long and misplaced a ledge, the crate and a wall tile | Self-check of row widths against the design | Rows corrected before user review; led to the plan for an automated grid validator |
| 6 | L-H allowed bypassing the crate by hitting the plate-wired mirror manually | Bypass analysis | Rule: plate-wired mirrors are locked |
| 7 | P-M "blue route to a second crystal" had three bypasses (foothold reachable from the bridge, jump to the exit, enemy jumpable) | Bypass analysis | Simplified to one crystal, two swaps, 2-tall tunnel |
| 8 | P-H first drafts: a crystal on the exit side made Dash unnecessary; a beam fence would hit the enemy; a shallow pen could be walked through | Bypass analysis | Single crystal on the right, 5-tile chasm, enemy in the chasm |
| 9 | After the user chose "any contact costs a heart", P-H as approved forced enemy contact twice | Re-checking all chambers against the new rule | The enemy moved into a raised, unreachable box |

---

## Day 2: Foundations, Weight and Phase (done; extended day)
**Summary (5 lines)**
1. Built the foundations: Vite/TS/Phaser scaffold, clean-architecture guard, Pages deploy, single-file build, a pure movement model proven against every C29 metric.
2. Built the chamber pipeline (grids → parser → validator → engine-free logic) and the systems for Weight and Phase: plates, doors, crates, dispensers, phase + ghost rule, melee, Throw, walker, Shieldbearer.
3. Six chambers playable from level select; W-E, W-M, W-H, P-E and P-M each solved end to end in the real game with scripted input.
4. Playing the Day 1 drawings exposed headroom and dead-end bugs (P-E, W-H, P-M, walker rule): each fix agreed with the user (C90–C95), and a headless reachability checker now tests layouts before they are built.
5. 106 automated tests; AI conversation exported (`docs/ai-logs/day2-*`, email redacted); screenshots in `docs/screenshots/day2-*`. Privacy fix: the Day 1 raw export contained the user's email (added by the app to the session context); replaced with a redacted copy (the user chose not to rewrite git history).

- Scaffolded the project: Vite 8, TypeScript 6.0.3 (TS 7 isn't supported by typescript-eslint yet), Phaser 3.90.0 (C87), Vitest, ESLint.
- Clean-architecture guard: ESLint rule + test. Proven by planting a violation, which both caught.
- Movement model lives in `src/core/player/movement.ts` as a pure function. `tests/core/movement.test.ts` proves the C29 metrics: full jump 3.57 tiles, tap 1.35, carry 2.69; gap 4 yes / 5 never (even with perfect coyote, robust to +5% speed); carry gap 3 yes / 4 never.
- The Phaser player runs that same function once per fixed 60 Hz physics step. All metrics were re-verified in the real game with scripted key input in the movement test room (`?autotest`).
- Chamber pipeline: data grids → stitching parser → validator → engine-free `ChamberLogic` (signals, doors, exit lamps, phase + ghost rule, locked mirrors), all unit-tested (49 tests).
- **W-E is playable and was solved end to end in the real game** with scripted input following its stored solution.
- **Melee (forward + up) and P-E.** The swing's reach and "no hits through walls" live in `src/core/combat/melee.ts` (unit-tested). Crystal hits swap the phase; dispensers recall their crate. P-E was solved end to end in the game.
- **Walker and W-M.** The walker's patrol decision is a pure function (`src/core/enemies/walker.ts`, tested). W-M was solved end to end in the game, including the timed drop the literal walker rule (C91) requires.
- **Throw.** A scripted arc in `src/core/player/throw.ts` (tested): always lands on the tile 5 columns ahead. Verified across the test room's 4-gap (lands) and 5-gap (falls in), and refused in chambers whose kit lacks it.
- **W-H and a reachability checker.** W-H as drawn on Day 1 could not be climbed. A new headless checker runs the real movement model against a grid; it confirmed the bug, verified the fix (C92) and now guards the routes as tests. W-H was then solved end to end in the game.
- **Shieldbearer and P-M.** P-M was run through the reachability checker before building: the tower held up; the bridge had two issues, both settled with the user (C94, C95). Solved end to end in the game.

### AI bug log (Day 2)
| # | What the AI got wrong | How it was found | Fix |
|---|---|---|---|
| 10 | The gap-jump simulation pressed jump on the frame the coyote timer expired. The movement code counts the timer down *before* checking the jump, so the press was always one frame late and every coyote attempt "failed". The test "never clears 5 tiles even with coyote" therefore passed vacuously. | All tests passed on the first run, which was suspicious, so the actual numbers were printed: coyote "failed" even for a 3-tile gap, which is impossible | The sim now tries every press frame across the window and only counts jumps that happened; regression test "coyote never reduces reach" added |
| 11 | The first movement draft set vertical speed to exactly 0 while standing. In Arcade physics a body that doesn't press into the floor stops reporting contact, so "grounded" would flicker | Caught in review before running, from how Arcade reports `blocked.down` | A small constant "ground stick" speed while standing; the sims mirror floor contact the way physics does |
| 12 | Variable-jump cut multiplied the rise speed by 0.45 on *every* frame the button was up, instead of once | Code review right after writing it | The cut applies once per jump (`jumpCut` flag) |
| 13 | The validator rule "the exit must have inputs" (written earlier on Day 2) is wrong for P-E and P-M, whose exits are plain doorways in the approved design | Entering P-E: the validator rejected an approved chamber | An unwired exit is open, but must be declared (`exitAlwaysOpen`), so a forgotten link is still an error |
| 14 | Collision was built from one body per horizontal run of wall tiles. Arcade resolves the vertical axis first, so a player holding into a wall while jumping "landed" their head on the seam between two stacked runs and couldn't climb out of P-E's pit | Scripted playtest of P-E's fall-and-escape route: the jump stopped after 20 px with `blocked.up` set | One body per tile with the faces between solid tiles switched off (`core/chamber/collision.ts`, tested), recomputed from the logic every step; W-E re-verified end to end |
| 15 | P-E's approved layout (drawn by the AI on Day 1) assumed every fall happens in Blue. Walking off the neutral block in Red drops you into the pit in Red, where the escape step is under the red platform: a dead end | Scripted playtest, then every crystal and jump tried from the pit | User approved a pit crystal (C90); the escape now works in both colours |
| 16 | W-M and L-H (drawn by the AI on Day 1) both relied on the walker walking into an *opened* trapdoor, which contradicts the walker rule the AI wrote in the same session ("turns at walls and ledges") | Implementing the walker: checked every chamber that uses one against the rule before writing code | Raised with the user, who chose the literal rule (C91): W-M becomes a timing drop (~0.22 s window, measured); L-H needs a redesign before Day 4 |
| 17 | The movement test room kept its crate list across `scene.restart()`, so restarted runs held stale, destroyed crates (Day 2 code) | A scripted throw test watched `crates[0]` and saw a crate that never moved; the list had 4 entries for 1 crate | The list is reset in `create()` |
| 18 | W-H's blue staircase (drawn by the AI on Day 1) could not be climbed: the AI drew 2-high steps 2 rows apart as if the player were 1 tile tall, so each step hung over the take-off spot of the hop below (52 px of rise available, 64 needed) | Playing W-H in the game: the jump stopped with `blocked.up`; then the reachability checker showed nothing above the first step was reachable in Blue | Widened diagonal staircase (C92), verified by the checker and in the game |
| 19 | W-H's bottom step and the ledge above it formed a wall, so the exit floor was a dead end (in the Day 1 drawing and in the AI's first fix) | Walking to the exit in the game, then the checker | Staircase shifted with a 1-tile gap after the bottom step; regression test "exit floor is never a dead end" |
| 20 | The AI's first version of the reachability checker treated any run of floor tiles as walkable, even under a slab with 1 tile of headroom, so it missed bug 19 | Its answer contradicted what happened in the game | Floor counts as standable only with two clear rows above (room for the 44-px body) |
| 21 | P-M's bridge (drawn by the AI on Day 1) assumed the player arrives in Red with the enemy still on the bridge. With one phase per chamber (C28) and a tower that needs Blue, the enemy always falls during the tower. The chasm was also 3 deep on the exit side, so in Blue the exit could be reached through it | Reachability checker run before building P-M (exit side reachable from the chasm in Blue), then reading the phase sequence of the whole chamber | User accepted the first (C94); the chasm's right half is one tile deeper (C95); regression tests |

Testing note (not a product bug): synthetic `KeyboardEvent`s ignore the `keyCode` init field in Chrome, and Phaser 3 reads `keyCode`. The in-browser harness defines it on the event explicitly. A hidden preview pane also stops requestAnimationFrame, hence the `?autotest` timer-driven loop.


---

## Day 3: Light (done)
**Summary (5 lines)**
1. Closed Day 2: AI conversations exported with the user's email redacted; the Day 1 raw export already on GitHub was found to contain it and was replaced with a redacted copy (history left as is, user's choice).
2. Built the Light system in the engine-free core: beam tracer (mirrors, receivers, walls, doors, crates/enemies, phase colours as shutters), beams drawn and pushing the player back.
3. L-E and L-M entered and each solved end to end in the real game; beams tested against each chamber's design, including L-M's wrong order.
4. Checking before building paid off again: a 19-wide row in L-E (parser) and an unreachable exit in L-M (reachability checker, fixed with the user, C96).
5. Bolt (forward along the upper body, up-Bolt) built and verified; 8 chambers playable; 136 tests; AI log `docs/ai-logs/day3-*`; screenshots `docs/screenshots/day3-*`.

- **Beam tracer** in the engine-free core (`src/core/light/beams.ts`, 14 tests): mirrors, receivers, walls, doors, crates/enemies, phase colours as shutters; geometry and contact helpers for drawing and knockback.
- **Light in the game:** emitters, mirrors (locked ones framed amber), receivers and pulsing cyan beams; beams are retraced every physics step and push the player back (never a heart, C27).
- **L-E solved end to end in the game:** the overhead beam stops a jump, the walkway beam holds the player back, both mirrors light their receivers.
- **Bolt:** forward along the upper body or straight up; hits the first crystal, mirror or dispenser on its line; tested in core and in the game (a P-E crystal from 7 tiles away, both L-E mirrors).
- **L-M:** beams checked against the design before building (start barrier, intended order, wrong order); the reachability checker found the exit unreachable, fixed with the user (C96). Solved end to end in the game.

### AI bug log (Day 3)
| # | What the AI got wrong | How it was found | Fix |
|---|---|---|---|
| 22 | L-E's section B row 6 was drawn 19 tiles wide on Day 1 (one `.` missing between the mirror and the emitter) | The parser's row-width check rejected the data on entry | One `.` added; the layout text fixes the intended positions |
| 23 | L-M's small step (drawn by the AI on Day 1) ended right under the M1 mirror block, one tile above it, so nobody could get down past M1 to the exit: the exit was unreachable | Reachability checker before building: the exit floor was not in the reachable set | Step moved one tile left (C96); regression test "exit floor reachable" |

---

## Day 4: Finish chambers, combat, brief change (build done; brief change pending)
**Summary (5 lines)**
1. All nine chambers are built and each was solved end to end in the real game: L-H (walker caged on the trapdoor, shaft rebuilt) and the finale P-H (walker pocket, mirror housing, plate moved), every change agreed with the user (C97–C100).
2. New abilities: Dash (exactly 4 tiles, once per airtime, beam- and enemy-proof) joins Throw and Bolt; jump + Dash reaches 9 tiles, pinned by a test.
3. Checking got stronger: the reachability checker learned to Dash and to test melee reach, and a logic-state enumerator proves every chamber's intended state opens its exit (no unintended solutions; report in `docs/enumerator-report.md`).
4. Combat: walker and Shieldbearer fights with hit-stop, shake, flashes and code-generated sounds; contact is a defeat that restarts the chamber.
5. 181 automated tests; AI log `docs/ai-logs/day4-*` (email and username redacted); screenshots `docs/screenshots/day4-*`. Still open: the Day 4 brief change (waiting for the email).

- **Logic-state enumerator:** every phase × mirror × plate combination of every chamber; the intended end states all open their exits, and every other opening configuration is listed in `docs/enumerator-report.md` and was reviewed: no unintended solution. The finale has exactly one.
- **Combat:** walker (2 hits) and Shieldbearer (front immune with a clang, 3 hits from behind, telegraphed turn) in the engine-free core with tests; hit-stop, shake, flash and code-generated sounds; enemy contact is a defeat (slow-motion flash, fade, chamber restart) unless you are dashing. Verified in the game on W-M and P-M.
- **P-H, the finale, solved end to end: all nine chambers now play.** The checker learned to Dash and to test melee reach; it found that the walker's box could be reached and the "Bolt-only" mirror could be hit by a jump-attack (C99). Playing the build found that the crate on `p` blocked the way home (C100).
- **Dash:** added to the pure movement model (exactly 4 tiles, gravity paused, once per airtime, never while carrying), tested like the other metrics; jump + Dash clears 9 tiles. In the game it passes straight through a beam fence that holds a walking player back.
- **L-H solved end to end in the game:** crate on `a`, climb the new shaft, one Bolt, and the chain runs by itself (trapdoor → caged walker onto `b` → locked mirror turns → exit). Beam knockback refined: an overhead beam now acts as a ceiling (found when a full jump onto the `a` step grazed the beam above it).
- **L-H redesign, before building:** the beam tracer confirmed the chain works; the reachability checker showed the left shaft could not be climbed (Bolt ledge unreachable). With C91's literal walker rule, the walker also needed a cage on the trapdoor. Both approved (C97, C98).

### AI bug log (Day 4)
| # | What the AI got wrong | How it was found | Fix |
|---|---|---|---|
| 24 | L-H's left shaft (drawn by the AI on Day 1) could not be climbed: the first and fourth hops had a step overhanging the take-off spot (the third chamber with this headroom error). The AI's first fix lowered the bottom step, which walled the start off from the crate floor | Reachability checker before building; then the checker on the first fix (floor split in two) | Alternating 3-high steps with no overhangs (C98), verified by the checker |
| 25 | P-H (drawn by the AI on Day 1, revised on Day 2): the "unreachable" walker box could be reached with jump + Dash, and the "Bolt-only" high mirror could be hit by a plain jump-attack from the tier. The Day 1 check only considered standing spots | Reachability checker extended with Dash and a melee-reach hook, run before building | Walker in a sealed pocket underground; housing blocks beside the mirror's column (C99); melee-reach regression test |
| 26 | P-H's plate `p` sat beside the low tier, so with the crate on it the player could not get back to the chasm (in the approved layout too) | Playing the build to the end: the player was stuck between the crate and the tier | `p` moved to col 27 (C100) |
| 27 | The AI's first data entry of C100 put `p` at col 26, not the approved 27 (one `.` short) | Playing it: the crate landed next to the plate, and the plate's lamp went out when the player walked away | Corrected to col 27; the row is now built by code with an asserted column |
| 28 | The chamber's shutdown handler read `physics.world` after Phaser had already cleared it on restart (a defeat restarts the chamber), throwing on every restart | The browser console during the combat test | Guarded lookup (`physics.world?.off`) |

---

## Day 5: Expedition loop (loop done; Remix timer and the Day 4 brief change open)
**Summary (5 lines)**
1. The expedition loop is playable: a seeded generator deals up to three frontier chambers between combat and reward rooms (W-E first, P-H alone, no repeated rooms); a controller carries hearts and upgrades and saves every solve; the menu has New expedition / Replay seed, and Remix after the third seal.
2. Upgrades: all ten from C67 in the reward rooms, seeded and gated by owned abilities; Mend heals; hearts run out in expeditions. The user decided the Bolt should hit walkers (C103).
3. Permanent progress (unlocks, abilities, seals) lives in a tested core module with a forgiving localStorage save and a reset; built-in playtest telemetry copies a Markdown report.
4. The expedition rooms were approved (C101, C102) and made playable, and an automated docs check now keeps the docs in step with the code.
5. 281 automated tests; AI logs `docs/ai-logs/day5-*` (emails redacted); screenshots `docs/screenshots/day5-*`. Still open: the Day 4 brief change (waiting for the email) and the Remix best-run timer.

- **Playtest telemetry:** every attempt at a chamber or combat room records time, resets, defeats and hearts lost; the menu copies a Markdown report for the playtest notes.
- **Expedition loop playable:** a seeded generator deals chambers from the progression frontier between connector and reward rooms; the controller carries hearts and upgrades through the run, saves every solve and ends at the Seal altar. The menu starts new runs or replays a seed, and turns into Remix once all seals are restored.
- **Hearts and progress:** defeats in an expedition now cost hearts and end the run at zero. Permanent progress (unlocks, abilities, seals) lives in a tested core module with a forgiving save; the menu shows it and can reset it.
- **Upgrade pool:** the reward pedestals now deal 3 of the 10 upgrades (seeded, gated by owned abilities); all ten work in the game and Mend heals. Hearts and upgrades show in the HUD. Testing found that a standing Bolt flew over walkers; the user decided it should hit them (C103: enemies are hit in front of any part of the body, puzzles unchanged) and that Piercing Bolt hits first landed only when the dart reached the wall (fixed: each enemy is hit as the dart passes).
- **Docs check:** every living doc was brought up to date, and a test now fails if code and docs drift (unknown decision ids, broken links or screenshots, a missing Next-task pointer, undocumented chambers or rooms, gaps in the AI bug log). It immediately found a stale Day 1 screenshot name in the plan.
- **Rooms in the game:** the chamber scene now plays expedition rooms (tier enemies that never respawn, the Arena lock, reward pedestals, the Seal altar), reachable on their own with `?room=<id>&tier=`. Every room × tier loads correctly; the Arena lock, the reward pick and the altar were checked in the game.
- **Expedition rooms approved** (C101, C102): Start, Reward, Seal exit and five connectors (Gap run, Corridor, Shaft, Red-floor arena, Arena) with three encounter tiers each. Drafted as grids, checked with the validator and the reachability checker before review, now data with regression tests.

### AI bug log (Day 5)
| # | What the AI got wrong | How it was found | Fix |
|---|---|---|---|
| 29 | The AI asked the user to double-click a single-file build made at the start of Day 2 and never rebuilt it, so it showed only the movement test room | The user tried it | Rebuilt; the task notes that `dist-single/` is gitignored and must be rebuilt by hand, and the Day 7 zip step says to rebuild first |
| 30 | The forward Bolt (built on Day 3 to C50's "upper-body row") flew one row above a walker on flat ground, so it could never hit one; Day 4 had checked Bolt hits only on the taller Shieldbearer | Verifying Piercing Bolt in the Arena | User decision C103: enemies are hit in front of any part of the body (one lane per body row), puzzle targets unchanged; core tests |
| 31 | Piercing Bolt's first version hit the enemies it passed only when the dart reached the far wall | Timing the hits in the game | Each enemy is hit as the dart passes it |
| 32 | While testing, the AI read the result before the Bolt's 1.2 s flight had ended and briefly concluded Piercing Bolt was broken | Instrumenting `fireBolt`: the Bolt had fired; the hits landed after the check | Waited for the flight; the timing fix in #31 came out of the same look |

---

## Day 6: Playtest prep, polish and final docs (playtests deferred by the user)
- **Polish pass:** every puzzle state change now has a sound, sparks or dust and a flash (plates, receivers, doors, trapdoors, the exit, plate-wired mirrors, crate landings), and movement answers too (jump, landing scaled by the fall, carry, throw, a "refused" sound). M mutes. L-H's chain reaction can now be heard step by step.
- **Readability before the playtests:** signal wires are dashed and their dashes travel toward the target while powered, so they never look like beams; worlds smaller than the screen are centred.
- **Remix best-run timer** (C71): a clock in Remix runs and a best time kept on this browser.
- **Playtest kit:** session script, notes template and a summary with triage (`docs/playtests/`); the playtests themselves are deferred.
- **Final docs:** `ASSETS.md` lists every asset and tool with its licence (nothing but Phaser is third-party, and no image, sound or font files ship). The README has full run / test / build instructions. The GDD is in its final shape: about 3¼ A4 pages, with the last ¾ page left for the Day 4 brief change and the playtest results.

### AI bug log (Day 6)
| # | What the AI got wrong | How it was found | Fix |
|---|---|---|---|
| 33 | Putting a crate down right after picking it up (the AI's Day 2 carry code) was refused: the space check still found the crate's own, just-disabled body | Testing the new put-down sound: a "refused" sound where the floor was clear | The check ignores the carried crate and any disabled body; a real wall still refuses |

## Day 7: Gates, the fourth mechanic (12 chambers)
- **The change (our own, with the extra time; not the Day 4 brief change):** a fourth mechanic with its own Easy, Medium and Hard (C104). Gates were chosen over Wind and Conveyors because they cost the least to build and validate and combine the most: beams, crates and walkers all pass through. Four seals; Eclipse stays the final chamber; the Gates Medium grants no ability (C105).
- **Same pipeline as Day 1:**
  - The rules (G1–G6, C106) and three layouts were drafted as text grids and checked by the parser, validator, enumerator and reachability checker (all taught about gates first), then approved by the user (C107).
  - Then came the game layer and data entry; each chamber was then solved end to end in the real game.
  - The three chambers: **First Gate** (fetch a crate through a gate), **Gatekeeper** (open a gate for the walker; it drops onto the plate that holds your gate open), **Handover** (Gates × Light: one beam powers your gate or the exit, so a crate takes over).
- **Progression:** Eclipse now also needs the Gates Hard; the chamber select is 4 × 3; five winning runs cover all twelve chambers. The GDD still fits about 3¼ A4 pages.
- **Gates polish, to the bar of the Day 7 polish pass (C52, C58):**
  - A pass leaves an afterimage shrinking into the gate it entered and another popping out of the twin, plus a ring in the pair's colour. The player stretches in the direction of travel, so a jump across the room reads as one movement.
  - A gate carrying light washes cyan, brightest on the beam's row, with cyan posts, at both gates of the pair.
  - Walking into a gate whose far side is blocked now says no (refuse sound, a small shake, a red outline on the blocked spot). It used to be silent.
  - The new sounds were rendered offline and measured over their loudest 100 ms. The pass (−37 dB) sits between the receiver and door sounds (−38) and the phase swap (−35); gate on (−41) and off (−45) match the existing on/off pairs.
- Screenshot: [`day7-G-H-beam-through-gate-crate-holds-gate-2.png`](screenshots/day7-G-H-beam-through-gate-crate-holds-gate-2.png): the beam lights gate 1 while a pass through gate 2 pops.
- **Menu rework (C108):** the single crowded column became a title screen with three sub-screens.
  - **Title:** the name over a pulsing beam, the four seals in their mechanics' colours, chambers solved.
  - **Expedition:** New or Remix, Replay seed, and a progress panel with seals, abilities and chambers.
  - **Chamber select:** 4 × 3 tiles striped by mechanic, ✓ when solved, seal numbers on the Hards, and a details panel with kit, grants and the intended feeling.
  - **Options & tools:** sound, the movement test room, playtest stats, reset progress.
  - Every screen has menu sounds and a short fade, and Esc goes back. A chamber, run or test room returns to the screen it came from, on the same tile.
  - Found on the way: the movement test room had no way back to the menu (Esc now works).
  - Checked with keyboard and mouse, with and without saved progress. Screenshots: [`day7-menu-title.png`](screenshots/day7-menu-title.png), [`day7-menu-chamber-select.png`](screenshots/day7-menu-chamber-select.png).
- **Rules from the user's own play (C109–C111):**
  - **Exits:** an exit now waits for the room's enemies as well as its puzzle. Combat rooms open once cleared. Chambers keep the walker their puzzle needs on a plate ("all enemies − 1").
  - **P-M:** by the user's choice, P-M's bridge guard must now be defeated. Dropping it into the chasm needs a reset, and the game says so.
  - **Beams:** they still push back, and each hit now costs a heart, with 1 s of grace. Chamber select got 3 hearts per attempt for beam hits.
  - **Controls:** written along the bottom of every chamber and the test room (only the abilities the room allows), and the existing top line stays. The menu got How to play and Controls screens.
  - **Checked in the game:**
    - The Corridor is locked until its walker falls.
    - P-M's guard doesn't respawn, and its defeat opens the exit.
    - Three beam hits in L-E restart it.
    - With a run, Guard absorbs a hit, and the last heart ends the run.
  - Screenshot: [`day7-menu-how-to-play.png`](screenshots/day7-menu-how-to-play.png).
- **Runs (C112–C114), from the user's play:**
  - **Length:** expeditions are now up to 18 rooms (4 chambers, two combat rooms before each). The five combat rooms come in cycles, never one twice in a row.
  - **HUD:** it counts rooms cleared and never shows a total.
  - **Seeds:** they show only with the new Developer options toggle (Options & tools), which also brings back Replay seed.
  - **Endless:** after all four seals, it sits beside Remix. Rooms keep coming, enemies get tougher and faster every loop, and the score is rooms cleared (best kept).
  - **Checked in the game:**
    - A seed-42 run is 18 rooms with no combat room repeated back to back, and the summary says "18 rooms cleared".
    - An Endless run escalated from T2 to T3, enemy speed went 48 → 53 → 58, and an extra hit appeared at room 13. Its run-over summary saved a new best.
    - The Replay seed row disappears with Developer options off.
- **Remote playtests (3 friends, 2026-11-22)** ([summary](playtests/playtest-summary.md)). One tester's built-in stats came back: 103 attempts, with W-H the slowest puzzle at 11:08 after 2 abandoned attempts.
  - **The four reported issues are fixed:**
    - Taking an upgrade is now **E**, with a key cap over the player.
    - The crate stutter went from 39 flips in 2 s to 0.
    - The HUD sits in opaque bars.
    - Endless holds 4 upgrades at most, with swaps, and enemies get +1 hit per level.
  - Before/after screenshots: [`playtest-before-reward-pick.png`](screenshots/playtest-before-reward-pick.png) → [`playtest-after-reward-pick.png`](screenshots/playtest-after-reward-pick.png), [`playtest-before-hud-over-P-M.png`](screenshots/playtest-before-hud-over-P-M.png) → [`playtest-after-hud-bars-P-M.png`](screenshots/playtest-after-hud-bars-P-M.png), [`playtest-after-endless-swap.png`](screenshots/playtest-after-endless-swap.png).
- **Final delivery:**
  - **GDD:** final and within 4 pages. The brief-change section was removed at the user's request, since no brief-change email came.
  - **AI log:** this session exported, emails redacted: [`day6-7-claude.md`](ai-logs/day6-7-claude.md) and its raw zip.
  - **Builds:** the submission zip is the single-file build plus a README. The GitHub Pages build deploys from `main`.
- **Ability unlock card (C117), from the user's play.** The report was "an upgrade for an ability that is not unlocked yet" and "nothing says I unlocked it".
  - **Checked in the game first:** the offers were right. After a seeded run solved Borrowed Weight, the run held `abilities: ["throw"]` in the next reward room, so Throw Sight could be dealt there. The only sign was a banner line that faded in 3 s.
  - **Fix:** the room after the Medium opens with a card: the ability, its key, what it does, a flash and a new sound. Play waits for E or Enter. Pedestals name the ability an upgrade belongs to, and the opening banner lists your abilities.
  - **Checked:** the card shows, E closes it, and physics resumes with no key left over (no accidental pick). A new test plays 60 whole campaigns and checks every reward room offers ability upgrades only for abilities the save owns. It also confirms the just-unlocked case happens.
  - Screenshot: [`day7-ability-unlock-card.png`](screenshots/day7-ability-unlock-card.png).

### AI bug log (Day 7)
| # | What the AI got wrong | How it was found | Fix |
|---|---|---|---|
| 34 | The new gate code remembered each body's position from the last step it was checked. A crate carried away kept its old position, so putting it down far from where it was picked up looked like walking across a gate, and it jumped to the twin | Solving First Gate in the game: the crate put down beside plate `a` appeared in the far room | Carried and flying crates are forgotten; a move of more than half a tile in one step is never a crossing |
| 35 | Standing on a crate stuttered: the AI's movement code keeps a small downward speed to stick to the ground, which tiles absorb every step, but a crate (a moving physics body) let the player sink a few px before pushing back, so the player counted as falling every few steps | A remote playtester; then measured in the game: 39 flips between standing and falling in 2 s | Feet on a resting crate's top count as standing and snap onto it; measured again: 0 flips |
