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

## Day 4: Finish chambers, combat, brief change (in progress)
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
