# Tasks: checkpoint list

**Next task →** Day 2 · melee attack (forward + up) so crystals, mirrors and dispensers can be hit, then W-M (walker as weight)

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
- [ ] (user) Delete the redundant local clone folder `G:\Du\DU Assignment` (now git-ignored)
- [ ] (user) Approve the first push to GitHub (C88: ask before every push)
- [x] Scaffold Vite 8 + TypeScript 6.0 (strict) + Phaser 3.90.0 + Vitest 5 + ESLint 10 (versions pinned)
- [x] Clean-architecture guard: ESLint `no-restricted-imports` for `src/core` + `tests/architecture.test.ts` (fails if core imports Phaser/DOM)
- [x] GitHub Pages deploy workflow written (`.github/workflows/pages.yml`)
- [ ] (user) Enable Pages: repo Settings → Pages → Source: GitHub Actions (after the first push)
- [ ] Live Pages URL verified
- [x] Single-file build target (`npm run build:single` → one 1.2 MB `dist-single/index.html`, no external references, dev hook stripped)
- [ ] (user) Double-click `dist-single/index.html` and confirm the game opens (the browser pane can't open file:// pages)
- [x] `core/player/metrics.ts`: C29 metrics + derived physics constants (gravity, jump velocity, run speed)
- [x] Player controller: run, variable jump, apex hang, fall cap, coyote time, jump buffer (C58)
- [x] Movement test room with tile markers: **jump 3 / gap 4 verified**
- [x] Carry / put down + carry penalties: **jump 2 / gap 3 verified**
- [x] `core/chamber`: types, legend, stitching parser + tests
- [x] `core/chamber/validator` + tests (broken fixtures must fail)
- [x] Chamber scene renders a parsed chamber (tiles, plates, wires, doors, exit lamps, phase blocks with hatching/dots)
- [x] `core`: signal logic (OR/AND), plates, doors/trapdoors (never close on occupants), exit lamps + tests (`ChamberLogic`)
- [x] Crates: carry / put down, solid, weigh plates
- [ ] Dispenser recall (hit the dispenser → fresh crate); needs melee (Day 3)
- [x] `core`: phase system + ghost rule + tests (rendering done; crystal hits arrive with melee on Day 3)
- [x] Level-select stub (3 × 3) + `?chamber=`, `?room=movement`, `?debug`
- [x] Day 2 gameplay screenshot → `docs/screenshots/day2-W-E-first-playable.png` (saved via the dev-only `/__screenshot` endpoint)
- [ ] Day 2 routine: AI export · devlog · commit + tag `day2` · (user) approve push
- [ ] Polish: centre chambers shorter than the screen (empty band below W-E)

## Day 3: Weight, Phase, Light (extended)
- [x] W-E data entered; **solved end to end in the real game** with scripted input (Day 2, ahead of plan); hold-R reset implemented
- [ ] Walker (basic): patrol, turns at walls and ledges, gravity, counts as weight
- [ ] W-M (trapdoor, walker as weight); grants Throw
- [ ] Throw: fixed arc, **lands exactly 5 ahead** verified
- [ ] W-H
- [ ] P-E
- [ ] Shieldbearer (basic movement) + P-M (2-tall tunnel); grants Dash
- [ ] Melee forward + up (basic hit detection on mirrors, crystals, dispensers)
- [ ] `core/light`: beam tracer (reflection table, blockers incl. phase colours, receivers) + tests
- [ ] Emitters, mirrors, receivers rendered; beams update on state change
- [ ] L-E
- [ ] L-M; grants Bolt
- [ ] Bolt: upper-body row; hits mirrors, crystals, enemies
- [x] Hold-R chamber reset (~1 s, fill ring)
- [ ] Day 3 routine

## Day 4: Finish chambers, combat, brief change
- [ ] Plate-wired locked mirrors + L-H
- [ ] Dash: 4 tiles; invulnerable to beams and enemies; not while carrying
- [ ] P-H (C56 revision; three exit lamps)
- [ ] Logic-state enumerator + test: every chamber's intended configuration lights its exit
- [ ] Combat feel: melee reach ~1.3, knockback, hit-stop, shake, flash, sound
- [ ] Walker combat (2 hits, respawn) · Shieldbearer full behaviour (front immunity, telegraphed turn)
- [ ] Hearts: any hit or contact costs a heart; room reset; heart-loss sequence; off in level select
- [ ] **Day 4 brief change:** save the email → impact analysis vs the decision log → plan agreed with user → implement → document (devlog + GDD + decision log)
- [ ] Day 4 routine

## Day 5: Expedition loop
- [ ] Draft connector / start / reward / exit room grids → (user) approval
- [ ] Connector rooms + encounter tiers (data)
- [ ] Reward room: pick 1 of 3; upgrade pool (10) with ability gating; Mend restores hearts
- [ ] Progression graph, seals, save (localStorage) + reset progress
- [ ] Run generator (seeded; frontier dealing; W-E first; final chamber alone), **or** fixed-layout fallback
- [ ] Menu: New expedition / Replay seed / Chamber select (3 × 3); seed in the HUD
- [ ] Telemetry: per-chamber time / resets / hearts lost + clipboard export
- [ ] Remix expeditions (only if time, C78)
- [ ] Day 5 routine

## Day 6: Playtesting
- [ ] Notes template + session script (three Easys, a Medium, a Hard, one run)
- [ ] (user) Playtest 1 → `docs/playtests/`
- [ ] (user) Playtest 2 → `docs/playtests/`
- [ ] (user) Playtest 3 → `docs/playtests/`
- [ ] Triage the top 3 issues; fix; capture at least one before/after
- [ ] Day 6 routine

## Day 7: Polish and delivery
- [ ] Polish and balance pass (feel, SFX, juice)
- [ ] `GDD.md` final, 2–4 pages (cut idea, playtest changes, Day 4 change, schedule rationale)
- [ ] `ASSETS.md` final; README run/test instructions
- [ ] (user) 5-minute voiceover video
- [ ] All AI exports collected; one screenshot per day present
- [ ] Final Pages deploy + single-file zip
- [ ] Follow-up call prep: rehearse 3 live changes, AI bug stories, answers to likely challenges

## Stretch (only if ahead; C78/C80)
- [ ] Spitter enemy
- [ ] Ability-gated side rooms
- [ ] Gamepad support
