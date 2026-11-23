# Tasks: checkpoint list

**Next task →** (user) the 5-minute voiceover video, then submit (the Pages link, the repo, `release/seal-chambers.zip`). Everything else on this list is done or a standing watch item

How to use this file:
- Tick a box only when the task is **verified** (run, tested or checked in the browser), not when the code is merely written.
- After ticking, move the "Next task" pointer to the next unticked box.
- If scope changes, add or strike tasks here **in the same commit** as the decision-log change (C86).
- `(user)` = a task only the user can do.

---

## Day 1: Pre-production (done)
- [x] Design all 11 assignment points with the user → `docs/design-decision-log.md` (C1–C86)
- [x] Export the full Claude Code pre-production conversation → `docs/ai-logs/day1-preproduction-claude-session.zip` + readable `day1-preproduction-claude.md`
- [x] Copy the ChatGPT handoff → `docs/ai-logs/day1-preproduction-chatgpt-handoff.md`
- [x] Seed `docs/` (implementation plan, tasks, decision log, GDD draft, devlog, asset list)
- [x] (user) ChatGPT conversation export added → `docs/ai-logs/day1-preproduction-chatgpt.md`
- [x] (user) Day 1 screenshot → `docs/screenshots/day1-projectFolder.png`

## Day 2: Foundations (today, extended)
- [x] (user) Approve the Step 1 implementation plan
- [x] `git init`, `.gitignore`
- [x] README skeleton
- [x] (user) Create the GitHub repo (github.com/0xahmedm/DU-Assignment); remote connected, its initial commit merged
- [x] Project moved into the user's chosen folder `G:\Du\DU Assignment` (the repo root); the clone's redundant `.git` backed up outside the project
- [x] First push approved; GitHub `main` = local `fb20c1b` (verified with `git ls-remote`)
- [x] Scaffold Vite 8 + TypeScript 6.0 (strict) + Phaser 3.90.0 + Vitest 5 + ESLint 10 (versions pinned)
- [x] Clean-architecture guard: ESLint `no-restricted-imports` for `src/core` + `tests/architecture.test.ts` (fails if core imports Phaser/DOM)
- [x] GitHub Pages deploy workflow written (`.github/workflows/pages.yml`)
- [x] Pages enabled; the Actions workflow (typecheck + lint + tests + build + deploy) passed on GitHub
- [x] Live Pages URL verified: https://0xahmedm.github.io/DU-Assignment/ (game loads; `?chamber=W-E` works; dev hook absent)
- [x] Single-file build target (`npm run build:single` → one 1.2 MB `dist-single/index.html`, no external references, dev hook stripped)
- [x] (user) Double-click `G:\Du\DU Assignment\dist-single\index.html` and confirm the game opens: confirmed on Day 5 after a rebuild (the Day 2 copy was stale and showed only the movement room; `dist-single/` is gitignored and must be rebuilt by hand)
- [x] `core/player/metrics.ts`: C29 metrics + derived physics constants (gravity, jump velocity, run speed)
- [x] Player controller: run, variable jump, apex hang, fall cap, coyote time, jump buffer (C58)
- [x] Movement test room with tile markers: **jump 3 / gap 4 verified**
- [x] Carry / put down + carry penalties: **jump 2 / gap 3 verified**
- [x] `core/chamber`: types, legend, stitching parser + tests
- [x] `core/chamber/validator` + tests (broken fixtures must fail)
- [x] Chamber scene renders a parsed chamber (tiles, plates, wires, doors, exit lamps, phase blocks with hatching/dots)
- [x] `core`: signal logic (OR/AND), plates, doors/trapdoors (never close on occupants), exit lamps + tests (`ChamberLogic`)
- [x] Crates: carry / put down, solid, weigh plates
- [x] Dispenser recall (hit the dispenser → fresh crate drops; works even on a carried crate). Verified in W-E with the dev hook (its dispenser is out of reach on foot) + unit tests
- [x] `core`: phase system + ghost rule + tests (rendering done; crystal hits arrive with melee on Day 3)
- [x] Level-select stub (3 × 3) + `?chamber=`, `?room=movement`, `?debug`
- [x] Day 2 gameplay screenshot → `docs/screenshots/day2-W-E-first-playable.png` (saved via the dev-only `/__screenshot` endpoint)
- [x] Day 2 routine: AI export (`docs/ai-logs/day2-*`, email redacted) · devlog · commit + tag `day2`
- [x] (user) Approved: Day 2 commit and `day2` tag pushed; Day 1 raw export replaced with an email-redacted copy (history left as is, user's choice)
- [ ] Playtest watch (L-M): M1 is hit only from the small step's right half or with a jump-attack; reach 1.3 tiles is just enough
- [x] Polish: receiver→door wires are thin cyan lines that can be mistaken for beams; give light wires their own look (e.g. dashed). Done before the playtests: every wire is dashed (beams stay solid and glowing), and a powered wire's dashes travel from source to target (C52's pulse); `game/render/dashes.ts` with tests; checked in L-M
- [x] Polish: centre chambers smaller than the screen (empty band below W-E / beside W-M). Done before the playtests: camera bounds widened to the view and centred on any world smaller than the screen, per axis (`game/render/camera.ts`, tests); applies to six chambers and every expedition room (the test room uses it too); larger worlds still scroll with the player. Checked in W-E, W-M, P-M and the Shaft

## Day 3: Weight, Phase, Light (extended)
- [x] W-E data entered; **solved end to end in the real game** with scripted input (Day 2, ahead of plan); hold-R reset implemented
- [x] Walker (basic): patrol, turns at walls, ledges (literal rule, C91) and blocking bodies; no air control; gravity; weighs plates. Unit-tested + verified in the game
- [x] W-M entered and **solved end to end in the real game** (timed drop onto `t`, crate onto `x`). Holding `s` permanently makes the walker turn at the open trapdoor, as C91 says. "Grants Throw" is stored in the data; granting arrives with progression (Day 5)
- [x] Throw: fixed arc, **lands exactly 5 ahead** verified in the test room (from col 25 → col 30 across the 4-gap; from col 32 → col 37, into the 5-gap); ground only; kit-gated (refused in W-E)
- [x] W-H entered and **solved end to end in the real game**; Day 1 grid was unclimbable → widened diagonal staircase (C92); dispenser: hold-R fallback (C93)
- [x] Reachability checker (`core/player/reach.ts`): real movement model vs the grid; calibrated on all C29 metrics; W-E/W-H routes are tests
- [x] Reachability checker run on every chamber before entering it (P-M, L-E, L-M, L-H, P-H; Dash-aware for P-H); key routes are tests
- [x] P-E entered and **solved end to end in the real game**; red-phase pit dead end found and fixed with a pit crystal (C90), escape verified in both colours
- [x] Shieldbearer (basic movement: shared patrol, 1 x 1.5 tiles, front shield drawn) + P-M entered and **solved end to end in the real game**; checker found the bridge issues → C94 (accepted), C95 (chasm deepened). "Grants Dash" stored in data
- [x] Melee forward + up (basic hit detection on mirrors, crystals, dispensers): reach 1.3 tiles from the body edge, never through walls; crystal hits verified in the game (P-E), mirror hits unit-tested (no Light chamber yet)
- [x] Collision without seams: per-tile bodies, internal faces off (found while testing P-E's pit escape); W-E re-verified end to end
- [x] `core/light`: beam tracer (reflection table, blockers incl. phase colours, doors, crates, enemies; receivers; loop-safe) + tests
- [x] Emitters, mirrors (locked ones framed amber), receivers rendered; beams retraced every physics step; beam contact pushes the player back (C27)
- [x] L-E entered and **solved end to end in the real game** (overhead beam stops a jump; walkway beam is a barrier); a 19-wide row in the Day 1 grid fixed at data entry
- [x] L-M entered and **solved end to end in the real game**; checker found the exit unreachable → step moved (C96). "Grants Bolt" stored in data
- [x] Bolt: forward along the upper-body row, up-Bolt from the head; hits the first crystal / mirror / dispenser on its line, stopped by solids incl. the active phase colour; kit-gated; verified in the game (P-E crystal from 7 tiles, L-E mirrors). Enemies: Day 4
- [x] Dev-only `?kit=` override to try abilities in any chamber
- [x] Hold-R chamber reset (~1 s, fill ring)
- [x] Day 3 routine: AI export (`docs/ai-logs/day3-*`, email and username redacted) · devlog · commit + tag `day3`
- [x] (user) Approved: Day 3 commit and `day3` tag pushed

## Day 4: Finish chambers, combat, brief change
- [x] **L-H redesign approved:** walker caged on the trapdoor (C97); left shaft rebuilt as alternating 3-high steps (C98, the Day 1 shaft was unclimbable)
- [x] Plate-wired locked mirrors (amber frame, refuse hits) + L-H entered and **solved end to end in the real game** (crate on a → shaft → Bolt → trapdoor → walker on b → exit); beam chain, shaft, crate route and pen are regression tests
- [x] Dash: exactly 4 tiles (fixed-distance, gravity paused), once per airtime, never while carrying (C50); invulnerable to beams during the Dash + 0.06 s (C60; enemies with combat); jump + Dash clears 9 tiles (measured, pinned by a test). Verified in the test room and through L-E's beam fence
- [x] P-H entered and **solved end to end in the real game** (C56 + C99 walker pocket and mirror housing + C100 plate moved); three exit lamps; Bolt-only mirror proven by a melee-reach test. **All 9 chambers playable.**
- [x] Logic-state enumerator (`core/chamber/enumerate.ts`): every phase × free-mirror × plate combination; each chamber's intended end state opens its exit (test); every other opening configuration listed in `docs/enumerator-report.md` (a file snapshot) and reviewed by hand: no unintended solution (P-H and L-M are unique; the others' extras are physically gated)
- [x] Combat feel: melee reach 1.3, enemy knockback (~1 tile), 60 ms hit-stop, shake, flash, generated sounds (swing, hit, clang, kill, defeat, swap, mirror, Bolt, Dash)
- [x] Walker combat (2 hits, respawn after 1.5 s) · Shieldbearer (front immune to melee and Bolt with a clang that pushes you back; 3 hits from behind; notices you behind it, shows "!", turns after 0.6 s) · Bolt hits the first enemy on its line · beams kill enemies (core-tested). Verified in the game (W-M walker, P-M Shieldbearer)
- [x] Defeat on enemy contact (C55; not while dashing, C60): slow-motion flash, fade, chamber restarts at the entrance; hearts off in level select (C54). Hearts rules (3, lose one, run over at 0, Mend) in core and tested
- [x] Hearts in expeditions: a defeat with a run costs a heart (HUD ♥♥♡), the room restarts; at 0 the run is over (`run-over` event for the expedition controller; opened alone: message, Enter → menu). Verified in the Arena (3 → 2 → 1 → 0); level select unchanged
- [x] **Day 4 brief change:** no brief-change email was received; at the user's request (2026-11-23) the GDD's section for it was removed for the submission
- [x] Day 4 routine: AI export (`docs/ai-logs/day4-*`, redacted) · devlog · commit + tag `day4` (the brief change, when it arrives, is logged on top)
- [x] (user) Approved: Day 4 commit and `day4` tag pushed

## Day 5: Expedition loop
- [x] Draft connector / start / reward / exit room grids → **approved** (C101, rules C102); entered as data with regression tests
- [x] Connector rooms + encounter tiers in the game: the chamber scene plays rooms (`?room=<id>&tier=`), enemies from the tier and never respawning (R1), the Arena's exit opens when cleared (R2), reward pedestals (R3, placeholder offers until the pool), the Seal altar ends the run. All 15 room × tier combinations load with their enemies grounded; Arena lock, reward pick and altar verified in the game
- [x] Docs refreshed (GDD combat/rooms/schedule, README, ASSETS, implementation plan as built, decision-log labels) + automated docs check `tests/docs.test.ts` (decision ids, links, screenshots, Next-task pointer, chambers/rooms documented, AI bug numbering)
- [ ] Playtest watch (red-floor arena): a walker standing on the one neutral tile beside the right bumper survives the swap and meets you at the far end
- [x] Reward room: pick 1 of 3; upgrade pool (10) with ability gating; Mend restores hearts. Pool, seeded dealing, gating and effects in core with tests (`core/run/upgrades.ts`, `core/light/insight.ts`); all ten verified in the game (dev-only `?upgrades=`, `?seed=`); run state (hearts + upgrades) shown in the HUD
- [x] A standing forward Bolt passed over walkers (it flies on the upper-body row). User decided: the Bolt hits walkers (C103): enemies are hit in front of any part of the body, puzzle targets still only on the upper-body row. Core tests + verified in the game
- [x] Progression graph, seals, save (localStorage) + reset progress: `core/run/progression.ts` (unlocks from prerequisites, frontier easiest first, abilities from Mediums, seals from Hards, final chamber, versioned save that tolerates garbage and blocked storage) with tests on the real chamber data; menu shows seals / abilities / solved ✓ and resets (Delete or click, twice). Verified in the game with a written save. Solves are recorded by the expedition controller
- [x] Run generator (seeded; frontier dealing; W-E first; final chamber alone): `core/run/generator.ts` (+ `rng.ts`), Start → [connector → chamber → reward] × N → exit, connectors never repeated, tier from progress, with tests (determinism, frontier/easiest-first, W-E first, P-H alone, 4 runs cover all 9). No fixed-layout fallback needed
- [x] Expedition controller (`game/expedition.ts`): plays the steps, carries hearts and upgrades, saves each solve at once, grants a new ability for the rest of the run, banner after a solve, summary at the Seal altar; Esc / run over / run complete return to the menu
- [x] Menu: New expedition / Replay seed (last seed remembered, digits edit it) / Chamber select (3 × 3); seed and room n/11 in the HUD; `?expedition&seed=` route. Verified in the game: a full seed-42 run (11 rooms, 3 solves saved, end summary), a second run dealing the Mediums (Dash granted mid-run), a run lost to hearts (progress kept), a Remix run
- [x] Telemetry (C81): `core/run/telemetry.ts` (one record per attempt at a chamber or combat room: active time, hold-R resets, defeats, hearts lost, solved / left / run over; log kept in localStorage, newest 500; Markdown report) with tests; recorder in `game/telemetry.ts`; menu: "Playtest stats: N attempts [copy] [clear]", C copies. Verified in the game: a W-M attempt across a reset and a defeat, an expedition (seed, solved, left), an Arena heart lost, the copied report
- [x] Remix expeditions (only if time, C78): dealing (any 3 chambers), T3 and all abilities come with the generator; best-run timer: run time = active play across the run's rooms, a clock in the Remix HUD, best kept on this browser (`core/run/records.ts`, tests), shown at the end ("new best!") and in the menu. Verified with two Remix runs
- [x] Day 5 routine: screenshot `docs/screenshots/day5-expedition-reward-room-seed-42.png`; AI export `docs/ai-logs/day5-claude-part1*` (the Day 4 session's last part: rooms and docs check) and `day5-claude-part2*` (this session), emails redacted; devlog summary + AI bug log 29–32; commit + tag `day5`
- [x] (user) Asked to commit to GitHub: Day 5 commits and the `day5` tag pushed
- [x] (user) Asked: the Day 3 and Day 4 raw exports re-redacted (they still held the git author email); every AI log now scans clean. Earlier copies remain in git history

## Day 6: Playtesting
- [x] Playtest zip for remote testers (2026-11-21): `release/seal-chambers-playtest.zip` (not committed) = the single-file build + [`HOW-TO-PLAYTEST.txt`](playtests/HOW-TO-PLAYTEST.txt) (self-guided order: four Easys, one Medium, an expedition; copy stats + six questions). Checked: opens from disk in headless Edge, plays from the menu with no console errors, no dev hooks
- [x] Notes template + session script (three Easys, a Medium, a Hard, one run): [`session-script.md`](playtests/session-script.md) (setup, words to say, order + time caps, rotation covering all nine chambers, stuck/hint rules, what to watch per chamber, questions), [`notes-template.md`](playtests/notes-template.md), [`playtest-summary.md`](playtests/playtest-summary.md) (triage + before/after). Menu: the first digit typed now replaces the remembered seed (it used to append, and a 6-digit seed blocked typing)
- (user, 2026-11-20) Playtests deferred for now; the kit is ready, and triage, the before/after and the GDD's playtest section wait for them
- [x] (user) Playtest 1 → `docs/playtests/`: remote (2026-11-22), feedback relayed + built-in stats ([`remote-tester-1-stats.md`](playtests/remote-tester-1-stats.md))
- [x] (user) Playtest 2 → `docs/playtests/`: remote (2026-11-22), feedback relayed ([`remote-playtests-2026-11-22.md`](playtests/remote-playtests-2026-11-22.md))
- [x] (user) Playtest 3 → `docs/playtests/`: remote (2026-11-22), feedback relayed
- [x] Triage the top 3 issues; fix; capture at least one before/after: [`playtest-summary.md`](playtests/playtest-summary.md); four fixed (E interact, crate stutter 39 → 0 flips, HUD bars, Endless cap + swaps, C115/C116) with numbers and screenshots; W-H and W-M on watch
- [x] Day 6 routine: playtest evidence in `docs/playtests/` (remote sessions, stats, triage, before/after screenshots), AI log exported with the Day 7 one (`docs/ai-logs/day6-7-claude*`, emails redacted), devlog

## Gates: the fourth mechanic (C104, C105; added 2026-11-20 with the extra time)
- [x] (user) Decided: a fourth mechanic (12 chambers), Gates chosen over Wind and Conveyors; four seals, Eclipse stays final, the Gates Medium grants no ability
- [x] Core: gates in the legend (digits), parser (pairs), validator (walled-in gates), signal logic (wired pairs), beam tracer (sideways beams through gates), body pass-through, reachability checker (walking through floor gates); `tests/core/gates.test.ts`
- [x] Draft rules G1–G6 and three layouts (First Gate, Gatekeeper, Handover), each checked by the parser, validator, enumerator and reachability checker → [`gates-chambers-draft.md`](gates-chambers-draft.md)
- [x] (user) Approved the rules (C106) and the three layouts (C107)
- [x] Game layer: gates drawn (pair colour + digit, shimmer while on), bodies (player with a carried crate, crates, walkers, Shieldbearers) and beams through gates, a pass sound + sparks, gate on/off sounds. Found and fixed in the game: a crate put down after being carried jumped through a gate (stale position, AI bug #34)
- [x] G-E, G-M, G-H entered as data and **solved end to end in the real game** (scripted input; G-M's walker delivered about 1 s after `c`); enumerator intended states (report reviewed: G-M's extra openings need `x` pressed, which needs gate 1, which needs the walker on `a`; G-H's need Ma `\`, and the room is reachable then only with the crate on `p`), routes and the up-swing to Ma as regression tests; screenshot `docs/screenshots/day7-G-H-beam-through-gate-crate-holds-gate-2.png`
- [x] Progression: seals W-H 1, L-H 2, G-H 3, Eclipse 4 (still final), Eclipse needs G-H, 4 × 3 chamber select, four seals in the menu and the run summary, generator and progression tests (five winning runs cover all twelve)
- [x] Docs: GDD (four mechanics, still about 3¼ A4 pages, checked by printing), README, ASSETS, implementation plan, devlog, decision log, enumerator report
- [x] Gates polish to the polish-pass bar: pass afterimages + ring + player stretch; gates glow while carrying light; refused pass (far side blocked) answers with the refuse sound, a shake and a red outline; new sound levels measured against the existing ones (offline render). Verified in G-E (pass frame, refused pass, other side still works) and G-H (glow, full solve)

## Day 7: Polish and delivery
- [x] (user, after playing) Runs: up to 18 rooms (4 chambers × [2 combat, chamber, reward]) (C112); Endless mode beside Remix with a rooms-cleared best (C113); HUD shows rooms cleared only, seeds and Replay seed behind Developer options (C114). Tests (run shape, connector cycles, endless rhythm and curve, records); verified in the game
- [x] (user, after playing) Exits need the room's enemies defeated, except a walker the puzzle uses (C109; P-M's guard must be defeated); beams cost a heart per hit, knockback kept, 3 hearts per attempt in chamber select (C110); controls written in game + How to play and Controls in the menu (C111). Verified in the game (Corridor, P-M, L-E, a run with Guard); tests for the rules, the census of used enemies and the controls text
- [x] (user) Menu rework (C108): title screen + Expedition / Chamber select / Options & tools screens, drawn in the game's visual language with menu sounds and fades; screens remembered when returning from a chamber, a run or the test room; the test room got its missing Esc. Verified with keyboard and mouse, fresh and with saved progress; playtest script, README and ASSETS updated
- [x] Polish pass (feel, SFX, juice): every state change answers (C52): plates click, receivers chime, doors / trapdoors / the exit sound and spark, plate-wired mirrors turn audibly, crates thud with dust; movement (C58): jump and landing sounds, landing dust scaled by the fall; pick-up / put-down / throw sounds and a "refused" sound where the game says no; reward pick chord; **M** mutes (remembered). A quiet ~1/3 s at room start. Found and fixed: a quick pick-up + put-down in place was refused (AI bug #33). Verified in W-E, L-H and W-H by logging every sound by name
- [x] Balance pass (from the playtest numbers): Endless cap and steeper curve (C115); beam hits cost hearts (C110) and exits wait for enemies (C109) were the user's own balance calls; W-H and W-M left on watch by the user
- [x] `GDD.md` final, 2–4 pages: cut idea, playtest changes (remote playtests, numbers), schedule rationale; the brief-change section removed (none received); about 3½ A4 pages, checked by printing to PDF
- [x] `ASSETS.md` final (every asset and tool with source and licence, versions from `node_modules`, AI assistance, no media files); README run/test instructions (requirements, dev, tests and what they cover, a single test file, `check` = the CI gate, build / preview / single-file, deploy, URL options)
- [ ] (user) 5-minute voiceover video
- [x] All AI exports collected (`docs/ai-logs/`: Day 1 Claude + ChatGPT, Days 2–5, Days 6–7; emails redacted); one screenshot per day present (Day 1 design files, Days 2–7 gameplay)
- [x] Final Pages deploy + single-file zip: the live site serves the latest build (checked 2026-11-23: E interact, Endless, Developer options in the bundle; no dev hooks); submission zip `release/seal-chambers.zip` = index.html + README.txt ([`SUBMISSION-README.txt`](SUBMISSION-README.txt)) + GDD.pdf
- [x] Ability unlock card (C117, from the user's play): offers were already correct (a Medium's ability counts at once); the unlock is now a card with the key, pedestals name the ability, the opening banner lists abilities; whole-campaign offer test
- [x] Follow-up call prep: [`follow-up-prep.md`](follow-up-prep.md): three live changes rehearsed on a clean tree with the tools' real output (grid edit, weaker jump: 13 route tests fail, a door + plate), intended feelings, six AI bug stories, likely challenges, numbers

## Stretch (only if ahead; C78/C80)
- [ ] Spitter enemy
- [ ] Ability-gated side rooms
- [ ] Gamepad support
