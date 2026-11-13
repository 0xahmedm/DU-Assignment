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

## Day 2: Foundations (in progress)
- Scaffolded the project: Vite 8, TypeScript 6.0.3 (TS 7 isn't supported by typescript-eslint yet), Phaser 3.90.0 (C87), Vitest, ESLint.
- Clean-architecture guard: ESLint rule + test. Proven by planting a violation, which both caught.
- Movement model lives in `src/core/player/movement.ts` as a pure function. `tests/core/movement.test.ts` proves the C29 metrics: full jump 3.57 tiles, tap 1.35, carry 2.69; gap 4 yes / 5 never (even with perfect coyote, robust to +5% speed); carry gap 3 yes / 4 never.
- Chamber pipeline: data grids → stitching parser → validator → engine-free `ChamberLogic` (signals, doors, exit lamps, phase + ghost rule, locked mirrors), all unit-tested (49 tests).
- **W-E is playable and was solved end to end in the real game** with scripted input following its stored solution.
- The Phaser player runs that same function once per fixed 60 Hz physics step. All metrics were re-verified in the real game with scripted key input in the movement test room (`?autotest`).

### AI bug log (Day 2)
| # | What the AI got wrong | How it was found | Fix |
|---|---|---|---|
| 10 | The gap-jump simulation pressed jump on the frame the coyote timer expired. The movement code counts the timer down *before* checking the jump, so the press was always one frame late and every coyote attempt "failed". The test "never clears 5 tiles even with coyote" therefore passed vacuously. | All tests passed on the first run, which was suspicious, so the actual numbers were printed: coyote "failed" even for a 3-tile gap, which is impossible | The sim now tries every press frame across the window and only counts jumps that happened; regression test "coyote never reduces reach" added |
| 11 | The first movement draft set vertical speed to exactly 0 while standing. In Arcade physics a body that doesn't press into the floor stops reporting contact, so "grounded" would flicker | Caught in review before running, from how Arcade reports `blocked.down` | A small constant "ground stick" speed while standing; the sims mirror floor contact the way physics does |
| 12 | Variable-jump cut multiplied the rise speed by 0.45 on *every* frame the button was up, instead of once | Code review right after writing it | The cut applies once per jump (`jumpCut` flag) |

Testing note (not a product bug): synthetic `KeyboardEvent`s ignore the `keyCode` init field in Chrome, and Phaser 3 reads `keyCode`. The in-browser harness defines it on the event explicitly. A hidden preview pane also stops requestAnimationFrame, hence the `?autotest` timer-driven loop.
