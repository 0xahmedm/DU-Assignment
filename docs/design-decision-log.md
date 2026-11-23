# Design Decision Log (authoritative)



> **Reading note:** sections below labelled "proposal" are the original discussion records, kept as written. Every one of them was decided: the outcome is in the *Confirmed decisions* table (C-numbers), and later revisions are in the *Change log* and in the revised grids marked "Revised" / "Superseded".

## Context

This is pre-production for the Mid-Level Game Developer & Game Designer practical assignment.
The user and Claude go through the 11 assignment sections one at a time and record a decision only
after the user explicitly approves it. **No code and no implementation prompt until all 11 points are
approved.** After that we write an implementation-planning prompt, and the user reviews it before any build starts.

- Authoritative source: `game_developer_designer_practical_assignment_v2.docx` (read in full 2026-11-12).
- Context source: `Claude_Code_Game_Assignment_Handoff.md` (earlier ChatGPT discussion).
- Working directory `G:\Du` is empty (greenfield).

### What the brief rewards (from the DOCX)
| Category | Weight |
|---|---|
| Puzzle creativity, readability, solvability | 30% |
| Difficulty progression & level geometry | 15% |
| Game feel (movement, combat, feedback) | 15% |
| Core loop & gameplay design | 10% |
| Iteration from playtesting + Day 4 change | 10% |
| Technical quality & code reusability | 10% |
| Upgrades & replayability | 5% |
| Directing & checking AI | 5% |

Grading thesis (closing line of the brief): show how *a small number of well-designed systems can produce
many interesting, reliable challenges.* The brief also says "not looking for the largest or most visually impressive game."

Details in the DOCX that the handoff left out:
- At the follow-up call the project must be **running locally so a live change can be made**, so puzzle and room configs should be data-driven and quick to edit.
- If the suggested schedule is reordered, **the design doc must explain why**.

### Production constraints (stated by user 2026-11-12)
- **No artist.** Art must be geometric/vector shapes or free assets (the brief explicitly allows this).
- **Limited level-design capacity.** The user can't produce complex level layouts alone. Scope must keep the hand-built room count small, and Claude drafts layouts for the user to review, adjust and own.

---

## Point status
| # | Section | Status |
|---|---|---|
| 1 | Core Gameplay Loop | **Approved 2026-11-12** |
| 2 | Puzzle & Level Design (main priority) | **Approved 2026-11-14** (C19–C57) |
| 3 | Platforming & Combat | **Approved 2026-11-14** (C58–C63) |
| 4 | Player Upgrades | **Approved 2026-11-14** (C64–C68) |
| 5 | Replayability | **Approved 2026-11-14** (C69–C72) |
| 6 | Development Guidelines (stack, art) | **Approved 2026-11-14** (C73–C76) |
| 7 | Schedule | **Approved 2026-11-14** (C77–C80; compressed) |
| 8 | Playtesting | **Approved 2026-11-14** (C81) |
| 9 | Deliverables | **Approved 2026-11-14** (C82) |
| 10 | Follow-up Call prep | **Approved 2026-11-14** (C83) |
| 11 | Evaluation Criteria alignment | **Approved 2026-11-14** (C83) |

---

## Core loop (design-doc headline, approved)
> On short, freshly assembled expeditions, fight, choose upgrades and solve handcrafted puzzle chambers to restore three seals, keeping every solved chamber and unlocked ability so each new run rearranges the world around harder puzzles that combine what you've mastered.

("Seals" is a placeholder until the theme is chosen.)

---

## Confirmed decisions
| ID | Decision | Source |
|---|---|---|
| C1 | Direction: hybrid of **Metroidvania-inspired exploration** and **puzzle-focused action-platformer**. | Handoff §3 |
| C2 | ~~Exploration and puzzle-solving are equally important (balanced).~~ **Changed 2026-11-12 → puzzle-first;** exploration is lighter (follows from C12). | Handoff §3; revised by user |
| C3 | Combat is **integrated**: enemies and combat abilities can sometimes be part of puzzle solutions. | Handoff §3 |
| C4 | World is **semi-procedural**: "a controlled feature rather than the foundation of every gameplay system." | Handoff §3 (user quote) |
| C5 | Vision: feels like a small, carefully crafted Metroidvania world every time, even though the layout changes between runs. **Reduced 2026-11-12:** the Metroidvania element is now ability-gated side branches plus permanent abilities; the generated part is the *context* around authored chambers. | Handoff §3; revised by user |
| C6 | **Abilities: available immediately in later runs, but few.** 2–3 permanent abilities total, designed as verbs that interact with puzzle mechanics. Every chamber is checked so the full ability set can't bypass it. | User, 2026-11-12 |
| C7 | **Death: new world, keep solved chambers.** The run ends and the next run gets a new layout. Abilities and solved chambers are permanent; run upgrades and resources are lost. | User, 2026-11-12 |
| C8 | **Run shape: short expeditions.** About 10–15 min and ~6–9 rooms (revised by C12). The generator deals 2–3 unsolved chambers from the unlocked frontier (Easy → Medium → Hard). About 4 runs cover all 9 chambers. | User, 2026-11-12 |
| C9 | **Objective: concrete goal + light flavor.** Restore one seal per puzzle mechanic to open the final chamber. Story stays environmental; theme is decided later. | User, 2026-11-12 |
| C10 | **Two progression layers** (follows from C7): permanent = abilities + solved chambers; run-scoped = upgrades, resources, temporary buffs. | Implied by C7 |
| C11 | **Progression graph** (follows from C8): chambers unlock by prerequisites, and the generator only deals from the unlocked frontier. | Implied by C8 |
| C12 | **Lean expeditions.** The connecting world is 5–6 trivial modular rooms (arena, shaft, gap run, ledge climb) chained linearly: connector → chamber → reward choice → connector → chamber → exit. Encounters come from a pool; ability gates are on optional side branches only. ~15 rooms to build in total. | User, 2026-11-12 |
| C13 | **Level-design workflow: Claude drafts, user decides.** For each chamber Claude drafts 1–2 layouts as text grids, with the teaching goal, intended solution and possible stuck states. The user picks, adjusts, playtests and owns the final call. | User, 2026-11-12 |
| C14 | **Chamber contract.** Each puzzle chamber is an atomic, self-contained, authored unit. It declares the ability kit it assumes and must be solvable with exactly that kit. Level select loads chamber + declared kit. | User, 2026-11-12 |
| C15 | **Generator scope.** It only chains hand-built rooms; ≤ ~1 day of work, built after the chambers exist. Fixed-layout fallback; seed shown on screen and replayable. | User, 2026-11-12 |
| C16 | **Dedicated combat encounters** (in connector rooms) exist alongside puzzle-integrated combat. | User, 2026-11-12 |
| C17 | **No 10th puzzle.** *(Revised 2026-11-20 by C104: 12 chambers; the final chamber is still one of them.)* The final chamber is one of the 9: the Hard chamber that combines mechanics, unlocked last. A combat finale would be an optional Point 3 extra. | User, 2026-11-12 |
| C18 | **Loop sentence:** Variant B (see headline above). | User, 2026-11-12 |
| C19 | *(Revised 2026-11-20 by C104: a fourth mechanic, Gates.)* **The three puzzle mechanics: Light (beams & mirrors), Weight (plates & crates), Phase (two-colour blocks, swapped by crystal/signal, never a timer).** Switches/wires are a shared *signal system* underneath, not a counted mechanic. The E/M/H sketches shown with the choice were illustrative only, not approved designs. | User, 2026-11-12 |
| C20 | *(Revised 2026-11-20 by C105: G-E in tier 1, G-M needs G-E, G-H needs G-M + L-E, and P-H also needs G-H.)* **Progression map.** Tier 1: W-E, L-E, P-E (no prerequisites). Tier 2: each Medium needs its own Easy. Tier 3: **W-H = Weight × Phase** (needs W-M + P-E), **L-H = Light × Weight** (needs L-M + W-E), **P-H = all three = final chamber** (needs P-M + W-H + L-H; adds Light × Phase). | User, 2026-11-12 |
| C21 | **Seals (clarifies C9 + C17).** *(Revised 2026-11-20 by C105: four seals; the first three open the final chamber.)* Each Hard restores its mechanic's seal. The first two seals open the final chamber; solving it restores the third and completes the game. An ending room or combat finale is an optional Point 3 extra. | User, 2026-11-12 |
| C22 | **Onboarding.** W-E is always the first chamber of the first run (it teaches plate → door, the signal idea). | User, 2026-11-12 |
| C23 | *(Revised 2026-11-20 by C105: the Gates Medium grants none.)* **Abilities come from Mediums.** Each mechanic's Medium grants one permanent ability (3 total). Hards and the final chamber may require abilities their prerequisites guarantee; Easy and Medium need only the base kit. No separate ability rooms. Candidate slots: W-M → Throw, L-M → Bolt, P-M → Dash (exact design in Point 3/4). | User, 2026-11-12 |
| C24 | **Chamber enforces its kit.** Inside a chamber you have exactly its declared kit; other owned abilities are shown greyed out at the door. Behaviour is identical in an expedition and in level select. | User, 2026-11-12 |
| C25 | **Base kit:** run, variable jump, melee attack (also rotates mirrors, hits phase crystals and switches), carry/put-down crate. Throw is not a base move. | User, 2026-11-12 |
| C26 | **Mirrors are 2-state (/ ↔ \)**, fixed in place, flipped by attack. | User, 2026-11-12 |
| C27 | *(Revised 2026-11-21 by C110: each beam hit also costs a heart.)* **Beam vs player = barrier:** ~~knockback + small damage~~ **knockback only, never costs a heart** (revised 2026-11-14 with the heart system). Enemies take heavy damage; Dash (when in the kit) crosses safely. | User, 2026-11-12; revised by user |
| C28 | **Phase: one red/blue state per chamber.** | User, 2026-11-12 |
| C29 | **Design metrics baseline:** 32 px tiles; jump 3 high, 4-tile running gap; carrying: 2 high, 3-tile gap; ~~Throw lands 3 ahead~~ **Throw lands 5 ahead (clears a 4-gap), fixed arc** (corrected 2026-11-12, see change log); Dash 4. Day 1 tuning must hit these. | User, 2026-11-12; corrected by user |
| C31 | **W-E "First Weight" approved** as drawn (see drafts section). | User, 2026-11-12 |
| C32 | **W-M "Borrowed Weight" approved** as drawn, incl. the walker dependency for Point 3. | User, 2026-11-12 |
| C33 | **W-H concept A "Drop Delivery" selected.** | User, 2026-11-12 |
| C34 | **W-H "Drop Delivery" approved** as drawn (full grid in drafts section). **Weight mechanic complete (W-E, W-M, W-H).** | User, 2026-11-12 |
| C35 | **Melee hits forward and up** (layout assumption; Point 3 implements it). | User, 2026-11-12 |
| C36 | **L-E "First Light" concept approved.** | User, 2026-11-12 |
| C37 | **L-M "Order of Light" concept approved.** (Grid moves the ordering lesson from a shaft to a gallery walkway; see drafts.) | User, 2026-11-12 |
| C38 | **L-H concept A "Chain Reaction" selected**, incl. the new device variant *mirror wired to a plate*. | User, 2026-11-12 |
| C39 | **L-E "First Light" layout approved** (Section B as redrawn with a floating platform). | User, 2026-11-12 |
| C40 | **L-M "Order of Light" layout approved**, incl. the shaft → gallery-walkway change. | User, 2026-11-12 |
| C42 | **L-H "Chain Reaction" layout approved**, incl. the rule *plate-wired mirrors are locked (attacks and Bolts don't flip them)*. **Light mechanic complete (L-E, L-M, L-H).** | User, 2026-11-13 |
| C43 | **P-E "First Phase" concept approved.** | User, 2026-11-13 |
| C44 | **P-M "Footing" concept approved** (grants Dash). | User, 2026-11-13 |
| C45 | **Final chamber = P-H "Eclipse"**, kit = base + Dash + Bolt (Throw excluded). Phase blocks act as shutters for light; the exit shows three lamps (beam, crate plate, walker plate). | User, 2026-11-13 |
| C46 | **P-E "First Phase" layout approved.** | User, 2026-11-13 |
| C47 | **P-M "Footing" layout approved**, incl. the simplified bridge (one crystal, two swaps, 2-tall tunnel). | User, 2026-11-13 |
| C48 | **Bridge enemy is front-armoured** (melee bounces off its front) and becomes our second distinct enemy type; full behaviour in Point 3. | User, 2026-11-13 |
| C49 | **Final chamber P-H "Eclipse" layout approved**, incl. its three bypass-closing changes. **All 9 chamber layouts are designed and approved.** | User, 2026-11-14 |
| C50 | **Rules added:** no Dash while carrying a crate; forward Bolt travels along the upper body row; hitting a crate dispenser recalls its crate. | User, 2026-11-14 |
| C51 | **Solvability assurance: layered checks.** Fixed metrics; authored solution per chamber; dev-mode load validator; logic-state enumerator (mirror × phase combinations → which receivers light); debug overlays; playtests. | User, 2026-11-14 |
| C52 | **Visual language approved.** Weight amber, Light cyan/white, Phase red/blue, terrain dark grey; red hatched / blue dotted / inactive = outline (never colour alone); wires pulse when powered; one door lamp per input; sound + particles + flash on every state change; armoured enemy shows a front shield. | User, 2026-11-14 |
| C53 | **Chamber data = text grids** (exactly as drafted) + device list, signal links, initial phase, kit and metadata, one file per chamber. Level select = 3 × 3 grid plus a URL parameter. | User, 2026-11-14 |
| C54 | *(Revised 2026-11-21 by C110: chamber select has 3 hearts per attempt for beam hits.)* **Heart system (user's idea; refines C7).** 3 hearts per run, **no health bar: any hit costs a heart.** Losing a heart resets the current room and respawns you at its entrance; hearts do **not** refill (3 → 2 → 1). Losing the last heart ends the run (abilities + solved chambers kept, per C7). Hold-R chamber reset is free. Hearts are off in level select. Regaining hearts → Point 4. | User, 2026-11-14 |
| C55 | **Any enemy contact costs a heart** (user's choice over "telegraphed attacks only"). Consequences: puzzle chambers must never force contact. Checked: only P-H forced it (fix proposed). In L-H, the kill-the-walker undo (C41) is now risky; hold-R reset is the safe undo. | User, 2026-11-14 |
| C56 | **P-H revision approved:** the walker moves into a raised, unreachable box on the right; the bridge and chasm are enemy-free (supersedes the C49 grid). | User, 2026-11-14 |
| C57 | **POINT 2 APPROVED** (mechanics, progression, kit, rulebook, metrics, 9 layouts, solvability, hearts/reset, visuals, data format, level select). | User, 2026-11-14 |
| C58 | **Movement feel package approved** (fast accel/decel, variable jump with apex hang, faster falls + capped speed, ~0.1 s coyote/buffer, full air control, carry −20% speed, squash/stretch + dust, **no wall jump/slide**). Numbers are tuned on Day 1 within C29. | User, 2026-11-14 |
| C59 | **Enemy roster: Walker + Shieldbearer core; Spitter turret optional stretch** (only if Days 4–5 allow). | User, 2026-11-14 |
| C60 | **Dash gives brief invulnerability to beams and enemy contact.** | User, 2026-11-14 |
| C61 | **Combat rooms reuse the puzzle systems** (ledge patrols over pits, Shieldbearer corridor, red-floor + crystal arena, beam arena); encounters are data picked from a pool. | User, 2026-11-14 |
| C62 | **Combat details approved.**<br>• Melee forward/up, reach ~1.3 tiles (beyond contact range), short recovery.<br>• Hits: ~1-tile knockback, ~60 ms hit-stop, small shake, flash, sound.<br>• No pogo.<br>• Walker: 2 hits.<br>• Shieldbearer: front immune (clang), 3 hits from behind or beams/falls, turns after a telegraphed pause, 1 × 1.5 tiles.<br>• Heart loss: slow-mo flash → fade → respawn at the room entrance with the room reset.<br>Timings tuned on Day 4. | User, 2026-11-14 |
| C63 | **POINT 3 APPROVED.** | User, 2026-11-14 |
| C64 | **Upgrades: pick 1 of 3 after each solved chamber** (seeded); run-scoped; no currency or shop. | User, 2026-11-14 |
| C65 | **No upgrade may change the movement metrics** (C29); movement upgrades are limited to things like Dash cooldown. | User, 2026-11-14 |
| C66 | **Hearts are regained only via the Mend upgrade** (restore 1, or +1 max if full). | User, 2026-11-14 |
| C67 | **Upgrade pool (10):** Heavy Swing, Long Reach, Shockwave, Shield Breaker, Piercing Bolt\*, Mend, Guard, Phantom Dash\*, Insight, Throw Sight\* (\* = offered only when that ability is owned). No upgrades in level select. | User, 2026-11-14 |
| C68 | **POINT 4 APPROVED.** | User, 2026-11-14 |
| C69 | **One optional ability-gated side room per run** (Throw/Bolt/Dash gate, once owned) holding an extra upgrade pick; needs ~3 small gate-room templates. | User, 2026-11-14 |
| C70 | **Encounters scale with progress** (walkers only at first; Shieldbearers after the first Medium; density rises with solved chambers); data tiers. | User, 2026-11-14 |
| C71 | **Post-game: Remix expeditions** (any chambers, hardest encounter tier, full upgrade pool, best-run timer). | User, 2026-11-14 |
| C72 | **POINT 5 APPROVED** (incl. seed in the HUD and a menu with New expedition / Replay seed / Chamber select; two seeds shown in the video). | User, 2026-11-14 |
| C73 | **Stack: Phaser 3 (latest stable, version confirmed Day 1) + TypeScript + Vite.** A framework-free logic core (signals, beams, phase, plates, parser/validator, enumerator) is unit-tested with Vitest; Phaser handles rendering, physics, input and feel. | User, 2026-11-14 |
| C74 | **All art and audio generated in code:** geometric shapes in the C52 palette and patterns, sfxr-style generated SFX, one OFL font. | User, 2026-11-14 |
| C75 | **Delivery: GitHub repo + GitHub Pages deploy + a locally runnable zip.** | User, 2026-11-14 |
| C76 | **POINT 6 APPROVED** (incl. Arcade physics + custom controller, 1024 × 576 / 32 × 18 tiles, localStorage save + reset, keyboard first, gamepad stretch). | User, 2026-11-14 |
| C77 | **Reordered 7-day schedule + daily routine approved** (see Point 7), then superseded by a compressed version because the clock is already running (see below). | User, 2026-11-14 |
| C78 | **Cut order (user's version), first → last:** Spitter → side rooms → Remix → upgrades trimmed to 6 → encounter tiers → generator (fixed-layout fallback). Never cut: 9 chambers, level select, reset, movement feel, playtesting. | User, 2026-11-14 |
| C79 | **The assignment clock is running: today is Day 2, with no code yet.** The user will work extended hours on Days 2–3. | User, 2026-11-14 |
| C80 | **Compressed schedule approved** (Day 1 = pre-production, honestly labelled; Spitter + side rooms pre-cut, back only if ahead). | User, 2026-11-14 |
| C81 | **POINT 8 APPROVED** (playtesting plan incl. built-in per-chamber stats). | User, 2026-11-14 |
| C82 | **POINT 9 APPROVED** (deliverables plan incl. single-file HTML zip). | User, 2026-11-14 |
| C83 | **POINTS 10 & 11 APPROVED. All 11 points complete.** Implementation-planning prompt drafted for review. | User, 2026-11-14 |
| C84 | **This whole pre-production chat is exported as Day 1 AI log** (`docs/ai-logs/day1-preproduction-claude.md`); the full ChatGPT conversation is exported too. | User, 2026-11-14 |
| C85 | **Clean architecture with an enforced dependency rule** (core has no Phaser/DOM; data → core types; game → core + data; composition root), checked by ESLint + a Vitest test. | User, 2026-11-14 |
| C86 | **Living docs in `docs/`:** `implementation-plan.md`, `tasks.md` (checkbox checkpoints + "Next task →" pointer), `design-decision-log.md`, `GDD.md` (the deliverable design doc), plus devlog / ASSETS / evidence folders. All are updated whenever anything changes. | User, 2026-11-14 |
| C87 | **Phaser 3.90.0** (final Phaser 3 release) chosen over Phaser 4.2.1: frozen, battle-tested, best known by AI tools; our code-drawn art gains nothing from v4's renderer. Step 1 implementation plan + `tasks.md` approved; Day 2 started. | User, 2026-11-14 |
| C88 | **Ask before every push** to GitHub (local commits are fine). | User, 2026-11-14 |
| C89 | **The GitHub repo may be public; deploy via GitHub Pages (Actions).** Repo: github.com/0xahmedm/DU-Assignment. | User, 2026-11-14 |
| C90 | **P-E revision: a crystal in section B's pit** (row 9, col 8). A scripted playtest found that walking off the neutral block's right edge while still Red drops you into the pit in Red, where the escape step has only 1 tile of headroom under the red platform (hold-R was the only way out). The pit crystal swaps to Blue so the existing escape works. It is reachable only from inside the pit, so it opens no bypass. | User, 2026-11-14 |
| C91 | **Walker ledge rule is literal:** a walker turns at any gap in the *current* floor, including an open trapdoor, and only falls when the floor disappears under it (trapdoor opening, phase swap). Chosen by the user over "open trapdoors count as floor for the patrol". **Consequences:** (1) W-M becomes a timing puzzle: step on `s` while the walker is over the trapdoor. Measured in the game: the walker is fully over it for ~0.22 s once per ~17 s patrol cycle, at the left end of the gallery (it turns at door K). (2) **L-H's chain needs a redesign before it is built** (Day 4): its walker patrols cols 15–18 with the trapdoor in the middle (col 16), so after the Bolt opens the trapdoor it would turn at the hole and usually never fall. | User, 2026-11-14 |
| C92 | **W-H revision: diagonal staircase, room widened 26 → 32 columns.** As drawn, W-H could not be climbed: the player is 1.375 tiles tall and each blue step hung over the take-off spot of the hop below it (in Blue nobody got past the first step, crate or not; confirmed in the game and by the reachability checker). A 2-high zigzag in the 5-wide strip cannot work in any arrangement. New climb: neutral step (row 17, cols 19–20) → neutral ledge (row 15, cols 22–23) → blue steps (rows 13 / 11 / 9) → L, which is extended to col 26. The 1-tile gap after the bottom step keeps the exit floor connected to the rest of the room (the Day 1 drawing, and the first version of this fix, made the exit floor a dead end). Everything left of col 19 is unchanged: walker box, red platform, pocket `x`, both crystals, the solution. Checker results: crate reaches L only in Blue; L unreachable in Red; from L in Red the crate cannot be carried across the 4-gap (Throw required); the exit floor connects both ways in both colours. | User, 2026-11-14 |
| C94 | **P-M: the Shieldbearer falls during the tower (accepted).** The phase is shared by the whole chamber (C28) and the tower needs Blue, so the bridge enemy always drops into the chasm at the first swap, before the player reaches the bridge (the Day 1 text assumed the player arrives in Red). The bridge step is "you arrive in Blue to a missing bridge with the enemy trapped below; swap to Red to restore it". No tower layout avoids this. | User, 2026-11-14 |
| C95 | **P-M: the right half of the chasm is one tile deeper** (exit-side wall 4 high). As drawn, the chasm was 3 deep on both sides, so in Blue the player could drop in, get past the enemy and climb out to the exit without the swap. Falls still escape to the entry ledge. Checker-verified. | User, 2026-11-14 |
| C96 | **L-M: the small step beside M1 moves one tile left** (row 12, cols 15–16). As drawn it ended right under M1, which hangs one tile above it, so the 1.375-tile body could not get down past M1 to the exit floor: the exit was unreachable (found by the reachability checker before building). M1 is still hit with a forward attack from the step's right half (or a jump-attack from the floor beside it). | User, 2026-11-17 |
| C97 | **L-H walker caged on the trapdoor** (consequence of C91). The walker starts in a 1-tile cage on top of the trapdoor (wall tiles at row 6, cols 15 and 17), so it paces in place; when the Bolted high mirror lights the receiver, the trapdoor opens under it and it drops onto `b`. No timing. The C41 undo is unchanged (kill it in the pen; Bolt the high mirror back first, or it respawns on the trapdoor and falls again). | User, 2026-11-17 |
| C98 | **L-H left shaft rebuilt: five alternating 3-high steps** (rows 16 L, 13 R, 10 L, 7 R, 4 L = the Bolt ledge). As drawn on Day 1 the shaft could not be climbed: the first and fourth hops had a step overhanging the take-off spot (same headroom error as W-H), so the Bolt ledge was unreachable. Checker: shaft reaches the Bolt ledge; crate reaches `a`; pen enterable and escapable; gallery unreachable; beam chain lights the exit. | User, 2026-11-17 |
| C99 | **P-H fix (Dash-aware checker, before building):** (1) the walker's box moves into a sealed pocket in the ground under the right floor (red roof over `qqq`, visible, unreachable by construction); the C56 raised box could be reached with jump + Dash, next to the walker. (2) Two housing blocks beside the high mirror's column (rows 3–4, cols 22–23): even without Dash a jump-attack from the tier reached the mirror, making the Bolt optional; now no swing reaches it in either colour. The up-Bolt from below works in Red and is shadowed in Blue (the C45 twist stands). | User, 2026-11-17 |
| C100 | **P-H plate `p` moves from col 18 to col 27.** Playtesting the build: beside the low tier (20 px of headroom), a crate on `p` could not be hopped on the way back, so the jump + Dash home was unreachable (also true of the approved C49/C56 layout). | User, 2026-11-17 |
| C101 | **Expedition rooms approved** (`docs/expedition-rooms-draft.md`): Start, Reward, Exit (Seal altar) and five connectors: Gap run, Corridor, Shaft, Red-floor arena, Arena, each with T1/T2/T3 enemy placements. All pass the validator and the reachability checker (base kit). The beam arena (a C61 example) is left out: every layout tried either killed the enemies at once or fenced the player's own path; C12's 5–6 connectors are met with five. | User, 2026-11-17 |
| C102 | *(R2 revised 2026-11-21 by C109: every connector opens once its enemies are defeated.)* **Expedition room rules:** R1 enemies in connectors do not respawn (respawning stays a puzzle-chamber rule). R2 connector exits are always open, except the Arena's, which opens when every enemy is defeated. R3 reward room: stand on a pedestal to see its upgrade, press attack to take it; the other two fade and the exit opens. R4 encounter tier: T1 until a Medium is solved, T2 after, T3 after a Hard or in Remix (C70, C71). | User, 2026-11-17 |
| C103 | **The Bolt hits walkers** (revises C50 for enemies only): a forward Bolt hits an enemy in front of any part of the player's body. Each body row is a lane, stopped by walls and never reaching past whatever stops the Bolt; the nearest enemy takes it, and the dart flies level along that enemy's row. Crystals, mirrors and dispensers are still hit only on the upper-body row, so no puzzle changes. Found while verifying Piercing Bolt: a standing Bolt flew one row above a walker on flat ground. | User, 2026-11-19 |
| C104 | **A fourth mechanic: Gates (12 chambers).** Gates, with its own Easy, Medium and Hard, brings the total to 12 chambers. Chosen over Wind and Conveyors as the cheapest to build and validate, with the strongest combinations: beams, crates and walkers all pass through gates. Our own addition with the extra time, not the Day 4 brief change. Revises C17 ("no 10th puzzle") and C19 (three mechanics); draft in `docs/gates-chambers-draft.md`. | User, 2026-11-20 |
| C105 | **Gates progression.** The Gates Hard restores a fourth seal and becomes one more prerequisite of Eclipse (P-H), which stays the final chamber with its tested layout untouched. The Gates Medium grants no ability; a fourth ability would take most of the day, so this is an exception to C23. The Gates Hard may require only abilities its prerequisites guarantee. Revises C20, C21 and C23. | User, 2026-11-20 |
| C106 | **Gate rules G1–G6 (approved with the layouts).** G1 a gate is a 1 × 2 frame, and the same digit twice is a linked pair, never solid. G2 a body (the player with or without a crate, a crate, a walker, a Shieldbearer) crossing a gate's centre line sideways comes out beside the twin on the side it was heading to, at the same height and speed; out over a drop, it falls. G3 sideways beams go through, keeping their row and direction; vertical beams pass as air. G4 unwired pairs are always on; wired pairs are on while powered (OR), and off = an empty frame. G5 a body needs both exit cells clear, a beam only its row (light slots). G6 the Gates chambers use the base kit. Feedback: a colour and digit per pair, sound and sparks at both gates, wired frames lit when on. | User, 2026-11-20 |
| C107 | **Gates chambers approved** (`docs/gates-chambers-draft.md`): G-E "First Gate", G-M "Gatekeeper" (the walker delivered by gate 2 holds gate 1 open) and G-H "Handover" (Gates × Light; the crate takes over receiver r1's job so the beam can light the exit). Base kit, no dispensers (nothing can be lost). | User, 2026-11-20 |
| C108 | **Menu rework: a title screen plus sub-screens.** The single crowded column becomes a title screen (name, the four seals, chambers solved) with three entries: **Expedition** (New/Remix, Replay seed, progress), **Chamber select** (4 × 3 tiles coloured by mechanic, with details of the selected chamber) and **Options & tools** (sound, the movement test room, playtest stats, reset progress). Chosen over two panels and a restyled column, to fix the crowding, the plain look and the dev items in the way. | User, 2026-11-20 |
| C109 | **Exits need the room's enemies defeated.** An exit opens when its puzzle is solved and its enemies are defeated. A combat room has no puzzle, so its enemies alone decide it; this revises R2 (C102), where only the Arena locked. A chamber may keep the enemies its solution uses (`enemiesUsed`: the walker on a plate in W-M, W-H, L-H, P-H and G-M), which is the user's "all enemies − 1". P-M's bridge guard is not one of them: it must be defeated (user's choice), so P-M's solution changes, and dropping it into the sealed chasm needs a reset. Defeated enemies stay down, except in chambers where every enemy is used (they respawn there, as before). | User, 2026-11-21 |
| C110 | **Beams cost a heart per hit** and still push back (revises C27). After a hit there is 1 s before the next one costs a heart; the push back never stops. Dash stays immune (C60), and the Guard upgrade absorbs the first beam hit as well (C67). Chamber select gets 3 hearts per attempt, lost only to beams; at 0 the chamber restarts (revises C54). In a run, the last heart ends it. | User, 2026-11-21 |
| C111 | **How to play and Controls.** The menu's title screen gets How to play (goal, rules, the four mechanics) and Controls (every key, built from the keymap). Every chamber and the test room show a controls line at the bottom: the base controls plus the abilities that room allows. The existing lines (title, hold R: reset, Esc: menu, M: sound) all stay. | User, 2026-11-21 |
| C112 | **Longer expeditions: Start → [combat → combat → chamber → reward] × 4 → Seal altar (18 rooms, about 20–25 min).** Revises the run shape of C8/C12 (11 rooms felt short in the user's play). Up to 4 chambers per run, still easiest first, and the final chamber still dealt alone. Two combat rooms before each chamber; with 5 connector templates they come in seeded cycles (all five before any repeat, never the same twice in a row). Remix deals any 4. Four winning runs now cover all twelve chambers. | User, 2026-11-21 |
| C113 | **Endless expeditions, alongside Remix, after all four seals.** Rooms keep coming in the same rhythm, with chambers from all twelve and combat rooms from every connector, in seeded cycles. Combat gets harder every loop of 4 rooms: T2, then T3, then tougher (+1 hit every 2 levels) and faster (+10% per level, at most +60%) enemies. Puzzle chambers never change. The run ends when the hearts run out; the score is rooms cleared, and the best is kept on this browser. | User, 2026-11-21 |
| C114 | **Players see rooms cleared, never how many are left; seeds are developer-only.** The HUD shows "rooms cleared N" with no total. Seeds (HUD, banners, summaries) and Replay seed on the Expedition screen appear only with **Developer options** on, a toggle in Options & tools remembered on this browser. Revises how C72 shows the seed. | User, 2026-11-21 |
| C115 | **Endless balance (remote playtest: "Endless gets easy once you have every upgrade", and its late reward rooms had nothing to offer).** In Endless you hold at most 4 upgrades. When you are full, each pedestal says which upgrade (your oldest) it would replace, so a reward room is always a real choice and never empty. Mend can't raise max hearts above 4, and it isn't offered when it couldn't help. Enemies in combat rooms gain +1 hit every level past the first (was every two). Normal and Remix runs are unchanged. | User, 2026-11-23 |
| C116 | **Playtest fixes (three remote testers).** (1) **Interact on E:** standing on a reward pedestal shows a yellow "E take …" key cap over the player, and E takes the upgrade (attacking no longer does; a tester could not find how to take one). The interact key is in the controls line in reward rooms, the Controls screen and How to play. (2) **Opaque HUD bars:** the title and hearts in a top bar, the controls in a bottom bar, with the world laid out in the band between them: centred when it is smaller, scrolling fully into view when it is larger. (The HUD text used to sit on top of the chamber.) (3) **No stutter on crates:** feet resting on a crate's top count as standing (AI bug #35). | User, 2026-11-23 |
| C117 | **Ability unlock card (the user's play: "the upgrade room offers an upgrade for an ability that is not unlocked yet", and "nothing indicates that he unlocked it").** Checked first: offers were already gated correctly. Solving a Medium in a run gives its ability at once, so the very next reward room may deal that ability's upgrade (Throw Sight right after Borrowed Weight). The only sign of the unlock was one line of a banner that faded after 3 s. Now the room after that Medium opens with an unlock card: the ability's name, its key and what it does, a flash and its own sound. Play waits until E or Enter. A pedestal's ability upgrade says "Upgrades your … ability", and a run's opening banner lists the abilities you own. The offer rule is unchanged and now pinned by a whole-campaign test. | User, 2026-11-23 |
| C118 | **Sharp rendering (the user: "all the UI feels blurry or pixelated").** The canvas was a fixed 1024 x 576 image that the browser stretched to fill the screen (about 1.9x on a 1080p display), so text and edges were blurred. Now the canvas has the screen's real pixels: 1024 x 576 times a render scale of 1, 2 or 3, picked from the screen size and Windows display scaling. Every layout stays in the same 1024 x 576 units. The cameras zoom by the render scale and text is drawn at it. Scrolling scenes get a second camera for the HUD, which also no longer shakes with the world. Nothing moved: 1x looks exactly as before. | User, 2026-11-23 |
| C119 | **No overlapping messages, and locked modes shown (the user's play).** (1) The unlock card covered the tops of the upgrade names on the reward room's pedestals; it now sits high in the band, clear of them. A banner still showing ("Seal 1 restored") now fades out as soon as a pedestal's description opens, so the two never overlap. (2) Before completion the Expedition screen showed only "New expedition", so new players couldn't tell Remix and Endless exist. Now both are shown under it, dimmed with a lock: "Remix · timed runs" and "Endless · score run", each "unlocks with all 4 seals". How to play says so too. | User, 2026-11-23 |
| C93 | **W-H dispenser stays out of melee reach; hold-R is the fallback** for the rare stuck crate (a throw in the wrong colour lands safely on the floor; crates left on blue steps fall when the colours swap). | User, 2026-11-14 |
| C41 | **L-H recovery: kill the walker to undo.** The walker lands in an open low-walled pen; killing it releases its plate and reverses the chain. Bolt the high mirror back first so the respawned walker doesn't fall again. | User, 2026-11-12 |
| C30 | **Rulebook defaults (accepted without objection, not explicitly approved):** wires always visible and lit when powered; all plates identical (player/crate/enemy); lost crates respawn at a dispenser; carrying lowers jump; beams stop at walls/crates/enemies/solid phase blocks; blocks that would turn solid on an occupant stay ghosted until vacated; phase swaps only by hit or signal, never a timer. | User (no objection), 2026-11-12 |

Working terminology (from the handoff, kept as is): **Player ability** (what the character can do: Dash),
**Puzzle mechanic** (rule of the environment: pressure plates), **Player upgrade** (improves an existing
capability: longer dash). The brief asks for 3 *puzzle mechanics*, not 3 abilities.

---

## Point 2: Puzzle & Level Design (in discussion)

### What the brief requires
- 3 distinct puzzle mechanics × Easy / Medium / Hard = 9 configurations; Hard may combine mechanics; depth over breadth.
- Readable, logically solvable, ≥1 valid solution, no trial-and-error, visual feedback.
- Softlock prevention + reliable reset.
- Multi-section geometry with real horizontal and vertical traversal.
- Difficulty from reasoning, not presentation or controls.
- Reusable configurable components; level select for all 9.

### Proposed selection criteria (decided, see Confirmed decisions)
- S1 Readable as plain shapes: state visible at a glance (R9).
- S2 Deterministic and grid-based: designable by recipe and checkable (R10).
- S3 Escalates across E/M/H without adding new rules.
- S4 Combines with the other two: the combination raises new questions, not just co-existence.
- S5 Hooks into combat (C3) and into platforming, both horizontal and vertical.
- S6 Buildable and designable inside the schedule.

### Candidate mechanics (proposal)
| Mechanic | Core rule | Readability | Combines | Combat hook | Main risk |
|---|---|---|---|---|---|
| **Weight**: plates & crates | Plate is active while weighed (player, crate, enemy) | High | High | Enemies weigh plates; knock enemy onto plate | Generic alone; crate lost in a pit → dispenser |
| **Light**: beams & mirrors | Emitters fire grid beams; hit a mirror to rotate 90°; lit receiver activates | High (visible line) | High: crates/enemies block beams, solid phase blocks block beams | Attack rotates mirrors; beams destroy enemies; enemies block beams | Beam as hazard must not feel cheap |
| **Phase**: two-colour blocks | Red/blue blocks, one colour solid at a time; swap by crystal hit or signal, **never a timer** | High | High: crates/enemies fall on swap; beams pass non-solid blocks | Hit crystal to swap; enemies drop when floor vanishes | Player overlapping a block that turns solid |
| Power: switches & wires | Switches toggle linked devices along visible wires | High | Medium (more glue than mechanic) | Attack/ranged hits switches | Many-to-many toggles drift into trial-and-error |
| Water level | Valves raise/lower water; crates float | Med-High | Medium | Non-swimming enemies | Float physics; heavier vertical design |
| Echo (record/replay ghost) | Record a few seconds; a ghost repeats it | Medium | High | Ghost distracts enemies | Unintended solutions, hard to validate, high design load |
| Gravity flip | Zones flip gravity | Medium | Low-Med | Enemies flip too | Control frustration, disorientation |

### Candidate trios
- **T1 Light + Weight + Phase (recommended).** Switches/wires become a shared *signal system* (the technical glue), not a counted mechanic.
- T2 Weight + Power + Phase: safest and very readable, but familiar, so less creativity credit.
- T3 Echo + Weight + Power: most original, highest design and validation load; conflicts with R10.

### Technical notes (proposal)
- One **signal system** shared by all mechanics. Inputs (plate, beam receiver, crystal/switch) → outputs (door, phase group, platform, emitter). Links are data-driven by ID, with optional AND logic for Medium/Hard.
- Beams = grid raycast with 90° mirrors, recomputed on state change (cheap, deterministic).
- Crates: simple box physics; dispensers respawn lost crates (softlock prevention).
- Phase blocks: a block that would turn solid on the player stays "ghosted" until vacated (avoids crush/stuck bugs).
- Possible Hard combinations (decided after the trio): Weight-H uses Phase, Light-H uses Weight, Phase-H = finale using all three (C17).

### Progression map: confirmed as C20–C22
Remaining progression proposals (low risk, to be tuned in playtests):
- **Dealing rule:** deal up to 3 frontier chambers per run, easiest tier first; the final chamber is always dealt alone.
- Level select ignores progression: all 9 open with their declared kit (C14).

### Abilities in chambers & base kit: confirmed as C23–C25
Outside chambers all owned abilities work: combat, connectors, ability-gated side branches (C12).

### Mechanic rulebook: confirmed as C26–C30 (original proposal text kept below for reference)
Additional low-risk rules proposed with the Weight drafts:
- Doors and trapdoors never close on an object; they stay open while blocked.
- Any slot or pit the player can enter must be **escapable with a normal jump (≤ 3 deep)** (revised from "1 deep" while drawing W-H; its enemy box is 3 deep). Slots too small for the player (1 tile tall) are fine as crate-only pockets.
- Inactive phase blocks are drawn as outlines so both states are always readable.
- **Proposed correction to C29:** Throw lands **5** tiles ahead (clears a 4-gap), not 3. Bug found while drawing W-H: landing 3 ahead clears only a 2-gap, which a carrying jump (3) already crosses, so Throw would be useless.
- Point 3 dependency: a **walker** enemy that patrols, turns at walls *and* ledges, can't jump, falls with gravity, counts as weight, and respawns at its spawner if killed.

### Weight chamber drafts (proposal, drawn against C29; decided, see Confirmed decisions)
Legend: `#` solid · `.` air · `S` start · `D` entry · `E` exit · `|` internal door · `K` door · `=` trapdoor · lowercase letter = plate (sits on the tile below) · `C` crate · `U` crate dispenser · `w` walker spawn.

**W-E "First Weight"**: teaches plate → door, weight must stay on the plate, crates are weight, carrying lowers your jump.
```
Section A                   Section B
####################        ####################
#..................#        #...U..............#
#..................#        #..................#
#..................#        #..................#
#..................#        #..................#
#..................#        #..................#
#..................#        #..................E
#...........C......#        #........###...p...E
#..........######..#        #............#######
D..................|  -->   |......##....#######
D.S.....p..........|  -->   |...C..##....#######
####################        ####################
```
- A: stand on `p` → `|` opens; step off → it closes (11 tiles away, can't make it). Fetch the crate from the 3-high ledge and put it on `p`.
- B: without a crate you can jump the 3-high plateau and find the plate, but with the crate you can't (carry = 2). Route: 2-high step → walkway → drop onto the plateau → crate on `p` → `E` opens.
- Stuck states: none (no pits; doors don't close on objects).

**W-M "Borrowed Weight"**: builds on W-E: three plates in a chain, and an enemy as weight. Base kit only. Grants Throw.
```
########################
#......................#
#......................#
#......................#
####...................#
#..K...................#
#C.K....w..............#
####=############......#
####t############......#
###################....#
#......................#
#......................#
#...................####
D......................E
D......s..........x....E
########################
```
- Wires: `s` → trapdoor `=` · `t` → door `K` · `x` → exit `E`.
- Chain: the crate is locked behind `K`, which needs weight on `t`, which sits in a slot under the trapdoor. Stand on `s` → trapdoor opens → the walker patrolling the gallery drops onto `t` → `K` opens. Step off `s` (the trapdoor seals the walker in). Climb the right shaft (+3, +3, +2), fetch the crate, drop down and put it on `x` → `E` opens.
- Why it's Medium: three steps and one key insight ("the enemy is my second weight"), with vertical traversal through the right shaft.
- Stuck states: the walker is killed → it respawns at `w`. The player can never be inside the slot (`s` and the trapdoor are on different floors). No pits.

**W-H "Drop Delivery": full grid (proposal; decided, see Confirmed decisions).** Kit: base + Throw. Starts in Red. Extra legend: `R` red block · `B` blue block · `1`/`2` phase crystals · `x`, `y` plates (exit needs x AND y) · `yyyyy` = one plate strip.
```
##########################
######...................#
######...................#
######...................#
######...................#
######...................#
######............2......#
######RRR....########....#
######x..................#
#######..............BB..#
#######......#..w..#.....#
#..U.........#RRRRR#..BB.#
#............#yyyyy#.....#
#............#######BB...#
#........................#
#.....................####
#........................#
D....................##..E
DS.C............1........E
##########################
```
- Top: L = solid ledge (cols 13–20) with crystal 2. R-plat = red cols 6–8 across a 4-gap. Crate-only pocket `x` under R-plat's left end.
- Middle: walker on a red roof over a 3-deep box whose floor is plate strip `y`; walls stick up one tile so the walker always turns on the roof. Blue steps on the right.
- Bottom: entry, dispenser `U`, crystal 1, exit `E`.
- **Solution:**
  1. Hit 1 → Blue: walker drops onto `y`, blue steps appear.
  2. Carry the crate up the 2-high steps to L.
  3. Hit 2 → Red: R-plat appears.
  4. Throw from L's edge → crate lands on R-plat.
  5. Jump the 4-gap without the crate, carry it 2 tiles left over `x`, put it down, jump back.
  6. Hit 2 → Blue: crate drops onto `x` → exit opens.
  7. Walk down the blue steps to the exit.
- **In-chamber teaching:** the walker falling onto `y` at step 1 shows the player that "a swap drops things onto plates" before they need it for the crate.
- **Checked:** L is unreachable in Red (the step chain breaks at 14 → 12). The crate can't be carried across the 4-gap. Throwing in Blue drops the crate safely to the bottom floor, so you just retry. The walker drops onto `y` no matter when you swap. The player can't fit into `x`, and the box is escapable (3 deep).
- Section count: 3 (bottom hub / middle step climb / top throw). Vertical traversal is 12 tiles; the horizontal throw is across a 4-gap.
- **Superseded by C92 (Day 2 build):** the blue steps above could not be climbed by the real 1.375-tile body. Final grid:
```
W-H (C92, final)
################################
######.........................#
######.........................#
######.........................#
######.........................#
######.........................#
######............2............#
######RRR....##############....#
######x........................#
#######.....................BB.#
#######......#..w..#...........#
#..U.........#RRRRR#......BB...#
#............#yyyyy#...........#
#............#######....BB.....#
#..............................#
#.....................##.......#
#..............................#
D..................##..........E
DS.C............1..............E
################################
```

**W-H concept recap** (A selected, C33): Weight × Phase + Throw, 3 sections.
- Exit needs `x` AND `y`, both in 1-deep slots under phase floors. The walker patrols a red platform above `y`'s funnel. The crate's slot `x` sits under a red block across a 4-gap, so it can't be carried there (carry gap 3) but can be thrown (3).
- Throw ledge L is reachable only by blue steps; crystal C1 is low, crystal C2 is on L.
- Solution: grab crate → C1 → Blue (walker drops onto `y`; blue steps appear) → carry crate up to L → C2 → Red (red block appears) → throw crate onto it → C2 → Blue (crate drops onto `x`) → walk down the blue steps → exit.
- Key insights: "throw in Red, drop in Blue" and "L only exists via Blue".
- Stuck states: crate thrown in the wrong phase → falls into the chasm → dispenser respawns it. Swapping while standing on a block of the colour that vanishes → you fall a level (lost position, not a softlock).
- Alternative concept B, "Descent Shaft": a stack of alternating red/blue layers where every swap drops every crate one layer; place two crates so each comes to rest on its plate. A purer sequencing puzzle and more elegant, but harder to read.

### Light chamber grids (proposal; decided, see Confirmed decisions)
Extra legend: `>` `<` `v` emitters (fire in that direction) · `o` receiver · `/` `\` mirrors (initial state; attack flips) · mirrors, emitters and receivers are solid blocks. Reflection: `/` turns →↑ ←↓ ↓← ↑→; `\` turns →↓ ←↑ ↓→ ↑←.

**L-E "First Light"**
```
Section A                   Section B
####################        ####################
#.........v........#        #.........o........#
#..................#        #..................#
#..................#        #..................#
#..................#        #..................#
#..................#        #..................#
#..................#        #........./.......<
#..................#        #..................#
o.........\........#        #......###.........#
D..................|  -->   |..................E
DS.................|  -->   |..................E
####################        ####################
```
- A: the beam falls onto the mirror and is reflected right into the wall. Stand under the mirror and **up-attack** → `/` → the beam goes left into receiver `o` → `|` opens. The beam runs just above head height (a jump into it gives a gentle knockback).
- B: the beam comes in from the right, and the mirror sends it **down across the walkway** (col 10, rows 7–10), so walking into it gives a gentle knockback. Climb the floating platform, **forward-attack** the mirror → `\` → the beam goes up into `o` → `E` opens and the walkway clears. Drop off the platform's left side and walk under it to `E`.
- Teaches: both attack directions, mirrors flip, receivers power wires, and *where the light goes is where you can't walk*.

**L-M "Order of Light"** (one screen, two levels; grants Bolt)
```
########################
##o................#####
##.................#####
##.................#####
##.................#####
##.................#####
##.................#####
##/.............../#####
##.######..#######.#####
#..................#####
#................./....<
D........##............E
DS.......##.....##.....E
########################
```
- Beam: emitter `<` → M1 (col 18, row 10) → M2 (col 18, row 7) → **along the gallery walkway (row 7)** → M3 (col 2, row 7) → up into `o` → exit `E`.
- All three mirrors start wrong. M1's wrong state drops a light barrier at col 18 **in front of the exit**, so the exit is visible but blocked by light from the start.
- Correct order:
  1. Step → jump through the gallery hole.
  2. Walk left, flip M3.
  3. Walk right, flip M2 (no beam yet).
  4. Drop down, climb the small step, flip M1. The full route lights `o`, and M1's barrier is gone, so walk to `E`.
- Wrong order: flipping M1 + M2 before M3 sends the beam down the gallery walkway (and drops a barrier at col 2), so M3 is unreachable. Flip M1 back from its step. Never a softlock.
- Lesson: *set the far mirror before the light fills the path to it.*
- Deviation from the approved concept (C37): the concept said "up the climbing shaft". Drawn exactly, the shaft forced precise jumps around mirror blocks, so the same lesson moved to the gallery walkway.
- **Revised in the Day 3 build (C96):** row 12 is now `DS.......##....##......E` (the small step moved one tile left, so the exit is reachable).

**L-H "Chain Reaction": full grid (proposal; decided, see Confirmed decisions).** Kit: base + Bolt. Extra legend: `a`/`b` plates (`bbb` = one strip) · `=` trapdoor · `U` dispenser · the mirror at col 19 row 14 is **Mb (wired to b)**, the one at col 19 row 16 is **Ma (wired to a)**.
```
##########################
#.........o.........######
E........./........\######
E.........#.........######
###.................######
#...................######
#..##..........w....######
#..............#=##.######
#...................######
###.................######
#...................######
#.............#bbb#.######
#....##############.######
#....#....U..............#
###..#.............\.....<
#....#...................#
#..##o.............\...a.#
D.....................####
DS........C...........####
##########################
```
- **New rule (needed to prevent a bypass):** mirrors wired to a plate are *locked* to it; attacks and Bolts don't flip them. They're drawn with a visible wire/lock.
- Beam start (route A): emitter `<` → Mb → up the light column (col 19) → corner mirror (row 2) → left along row 2 → high mirror (col 10, starts wrong, sends the beam into a stopper block).
- **Solution:**
  1. Fetch the crate from `U` and carry it right (under the mirrors) up the 2-high step; put it on `a` (Ma flips, no beam there yet).
  2. Climb the left shaft (4 steps) to the Bolt ledge.
  3. Bolt right along row 2 → the high mirror flips → beam into receiver `o` above it → trapdoor `=` opens → the walker drops into the pen onto `b` → Mb flips → beam reroutes down → Ma (crate) → left along row 16 → receiver `o` (col 5) → exit `E`, right beside the Bolt ledge, opens.
- **Wrong order** (Bolt before the crate): the reroute hits unweighted Ma → beam fences the `a` step. Undo: Bolt the high mirror back, jump into the pen and kill the walker (it respawns on the gallery, `b` releases, beam returns to route A), place the crate, Bolt again.
- **Checked:**
  - The high mirror is out of melee reach from every standing spot and jump arc; an upward Bolt from below hits the stopper.
  - The gallery is unreachable for the player.
  - Standing on `b` yourself opens `E` only while you stand there, and `E` is far away, so the walker is the required persistent weight.
  - Crate on `b` + player on `a` likewise only opens `E` while the player stands on `a`.
  - The pen walls are 1 high (walker trapped, player hops in and out).
- **Revised on Day 4 (C97 walker cage, C98 left shaft).** Final grid:
```
L-H (C97 + C98, final)
##########################
#.........o.........######
E........./........\######
E.........#.........######
###.................######
#...................######
#..............#w#..######
#..##..........#=##.######
#...................######
#...................######
###.................######
#.............#bbb#.######
#....##############.######
#..###....U..............#
#....#.............\.....<
#....#...................#
###..o.............\...a.#
D.....................####
DS........C...........####
##########################
```

**L-H "Chain Reaction": topology agreed (C38)**
- Chain: Bolt high mirror → receiver opens trapdoor → walker drops onto plate Pb → Pb flips wired mirror Mb upstream → beam reroutes toward wired mirror Ma (plate Pa) → crate on Pa → exit receiver lit.
- The catch: if the chain fires before the crate is on Pa, the rerouted beam fences off Pa's corner.
- **Open: recovery design.** Options:
  - (a) The walker lands in an *open pen* (low walls; the player can jump in). Killing it releases Pb and undoes the chain (combat as the undo button). If needed, Bolt the high mirror first so the respawned walker doesn't fall again.
  - (b) The chain is permanent; a wrong order needs the chamber reset.
  - (c) Remove the catch.

### Phase chamber grids (proposal; decided, see Confirmed decisions)
Extra legend: `R` red block · `B` blue block · `*` phase crystal (**non-solid**: you walk through it and hit it with an attack; this is how crystals were already drawn in W-H). One state per chamber; it carries across sections.

**P-E "First Phase"** (starts Red)
```
Section A                   Section B (entered in Blue)
####################        ########################
#..................#        #......................#
#..................#        #......................#
#..................#        #.........*............#
#..................|  -->   |...*..................E
#..................|  -->   |......................E
#..............#####        ####RRRRRR##BBBBBB######
#.........R........#        ####......##......######
#.........R........#        #####.............######
D.......*.R.BB.....#        #####.............######
DS........R.BB.....#        #####.............######
####################        ########################
```
- A: a 4-high red wall (can't be jumped). Hit the crystal → the wall becomes outline and the blue step becomes solid → step (+2) → ledge (+3) → doorway.
- B: you arrive in Blue (from A), with blue solid far away and red as outlines across a 6-gap.
  1. Hit the near crystal from the start pillar → Red.
  2. Walk the red platforms to the neutral block, up-attack its crystal → Blue.
  3. Walk the blue platforms to the exit.
  - Swapping while on red (facing back at the near crystal, or jump-attacking the far one) drops you into the shallow pit. The escape step leads back to the start pillar, where the near crystal resets you. The neutral block floats, so the pit floor is continuous and every fall leads to the same escape.
  - **Revised (C90, Day 2 build):** the escape step only works in Blue (in Red it sits under the red platform with 1 tile of headroom), and walking off the neutral block in Red is an easy mistake. Section B now has a **pit crystal** at row 9, col 8:
```
Section B (C90)
########################
#......................#
#......................#
#.........*............#
|...*..................E
|......................E
####RRRRRR##BBBBBB######
####......##......######
#####.............######
#####...*.........######
#####.............######
########################
```

**P-M "Footing"** (starts Red; grants Dash)
```
Section 1: Tower            Section 2: Bridge (2-tall tunnel)
################            ########################
#..............|  -->       ################.......#
#..............|            ################.......#
#..........#####            ################.......#
#..............#            ################.......#
#..............#            #......................#
#......BBBB....#            |.*.......w............E
#..............#            |...RRRRRRRRRRRR.......E
#..........*...#            ####............########
#...........#..#            ####............########
#..............#            ####............########
#.......RRRR...#            ########################
#..............#
#....*.........#
#.....#........#
#..............#
#.BBBB.........#
D........*.....#
DS.............#
################
```
- Tower route:
  1. Hit the floor crystal (safe: the floor is neutral) → Blue.
  2. Climb the blue platform. **Trap:** its crystal is right above your head, and up-attacking it from the blue platform removes your footing. Instead step onto the 1-tile neutral nub and hit the same crystal sideways → Red.
  3. Climb the red platform. **Same trap**, mirrored: use the next neutral nub → Blue.
  4. Climb the blue platform → exit ledge.
  - Every fall lands on the floor, and the floor crystal lets you restart. Checked: no nub is reachable from the floor or from the wrong colour, and no platform can be skipped.
- Bridge: an enemy patrols a red bridge inside a **2-tall tunnel** (it can't be jumped over). The ledges at both ends sit one tile lower, so it turns at the bridge ends.
  1. Hit the crystal on the entry ledge → Blue (the enemy falls into the sealed chasm).
  2. Hit it again → Red (the bridge returns, empty).
  3. Walk across.
  - Falling in while Blue: the chasm is 3 deep and escapable back to the entry ledge.
- **Deviation from the approved concept (C44):** the concept had "a blue route to a second crystal". Drawn exactly, that version had three bypasses: the safe nub was reachable from the bridge, a jump from the nub reached the exit, and the enemy could be jumped over. The simplified bridge keeps the lesson ("the swap reshapes the room for everyone in it") with no bypass. The tower carries the Medium's difficulty.
- **Point 3 dependency:** the bridge enemy must not be killable from the front (otherwise you just kill it and walk across). Proposed: a **front-armoured** enemy, which also becomes our second enemy type.
- **Revised in the Day 2 build (C94, C95):** the enemy is entered as `H` (Shieldbearer); it falls during the tower because the phase is shared; the chasm's right half is one tile deeper. Bridge section bottom rows now:
```
####............########
####............########
####............########
##########......########
########################
```

**P-H "Eclipse" revision for C55 (proposal; decided, see Confirmed decisions).** The walker moves off the bridge into a raised box on the right (red roof over plate strip `qqq`, W-H pattern). The bridge and chasm become enemy-free; the bumpers are removed. Everything else is unchanged.
```
################################
D.......................o......#
D......................./...R..<
###............................#
#.......................B......#
#.........................#.w.##
#...................*.....#RRR##
#.........................#qqq##
#U.................###....######
E..............................#
EC................p............#
###########RRRRR################
###########.....################
###########.....################
###########....#################
###########....#################
###########....#################
################################
```
- The box (cols 26–30, rows 5–8) is unreachable: its wall tops are 6 above the right ledge and 4 beyond the tier. The player walks under it.
- The walker drops onto `qqq` on the Blue swap. The beam row (row 2) passes above the box; the up-Bolt column (col 24) is clear.
- Solution: crate across the empty bridge → `p` · up-Bolt the mirror in Red · tier crystal → Blue (beam lit, walker drops, bridge vanishes, three lamps) · jump + Dash home. No step forces enemy contact; a failed Dash lands in an empty chasm.
- **Revised on Day 4 (C99, C100).** Final grid:
```
P-H (C56 + C99 + C100, final)
################################
D.......................o......#
DS....................../...R..<
###...................##.......#
#.....................##B......#
#..............................#
#...................*..........#
#..............................#
#U.................###.........#
E..............................#
EC.........................p...#
###########RRRRR################
###########.....#########.w.####
###########.....#########RRR####
###########....##########qqq####
###########....#################
###########....#################
################################
```

**P-H "Eclipse": final chamber, original approved grid (C49; superseded by the revision above if approved).** Kit: base + Dash + Bolt. Starts Red. Exit `E` has three lamps: beam receiver `o`, crate plate `p`, walker plate strip `qqqq`.
```
################################
D.......................o......#
D......................./...R..<
###............................#
#.......................B......#
#..............................#
#...................*..........#
#..............................#
#U.................###.........#
E..............................#
EC........#..w..#.p............#
###########RRRRR################
###########.....################
###########.....################
###########....#################
###########....#################
###########qqqq#################
################################
```
- Left: entry (top-left, one-way drop), exit with three lamps, crate dispenser `U`.
- Middle: a 5-tile red bridge over a deep chasm. The walker patrols the bridge between two 1-high bumpers. The chasm floor is plate strip `q`. The only escape step leads up to the **right** side.
- Right: plate `p`; the only crystal `*`, on a small upper tier.
- Beam machinery: emitter `<` → red shutter `R` (row 2) → high mirror `/` (Bolt-only) → starts pointing down into the blue block `B` (the "shadow"); flipped, it points up into receiver `o`.
- **Solution:**
  1. Carry the crate across the bridge in Red (hop the bumpers; jump over or deal with the walker) and set it on `p`.
  2. Up-Bolt the mirror from directly below **while Red** (in Blue the blue block shadows your shot as well as the beam).
  3. Climb the tier and hit the crystal → Blue: the shutter opens and the beam reaches `o`; the walker drops onto `q`; the bridge vanishes. All three lamps light and the exit (left) opens.
  4. **Jump + Dash** back across the 5-tile chasm (a running jump covers only 4).
- **Core insight:** light needs Blue, the bridge needs Red. Swapping back to Red to walk home closes the shutter and turns the beam lamp off, so you must Dash home.
- **Changes from the approved concept (C45), each to remove a bypass:**
  1. **Only one crystal, on the right.** A crystal on the left would let you make the final swap from the exit side and skip Dash.
  2. **The return is a 5-tile chasm, not a beam fence.** A vertical beam through the gap would have hit the walker below and released its plate.
  3. **The walker drops into the chasm** (its floor is the plate), not a separate pen. A shallow pen under the bridge could be walked through to the other side.
  - Bonus twist kept from the concept: the blue block shadows both the beam and the Bolt.
- **Checked:**
  - The mirror is out of melee reach from every spot, including standing on the crate.
  - The left-side long shot from the entry shelf travels along row 1 and hits the receiver, not the mirror.
  - The crate can't cross without the bridge (carry gap 3, no Dash while carrying), can't be carried out of the chasm (3-high step), and can be recalled from the dispenser.
  - The walker on the chasm floor always stands on `q` and can't climb out; if killed, it respawns on the bridge and falls back in Blue.
  - The chasm escape leads only to the right side.
- New low-risk rules this chamber relies on:
  - **No Dash while carrying.**
  - **Forward Bolt travels along the player's upper body row.**
  - **Hitting a crate dispenser recalls its crate** (destroys the old one, drops a fresh one), a general softlock fix.

### Phase chamber concepts (approved as C43–C45; original text)
Rules in play: C19, C28, C30. One red/blue state per chamber; swaps by crystal hit or signal only. Inactive colour is drawn as outlines. A block won't solidify on an occupant. Crates and enemies on a vanishing colour fall. Pits are shallow and escapable (falling costs position, never a death).

**P-E "First Phase"** (base kit, 2 sections). Teaches: a crystal swaps the colours; outlines preview the other state; only one colour is solid at a time; don't stand on the colour you're about to remove.
- A: a red wall blocks the way, and blue outlines show steps up to the exit ledge. Hit the crystal → red becomes outline, blue becomes solid steps → climb.
- B: a crossing over a shallow pit: red platforms for the first half, blue for the second, and a crystal on a neutral (normal) pillar in the middle. Walk red → stand on the pillar → swap → continue on blue. Swapping while still on red (a second crystal can be up-attacked from a red platform) drops you into the shallow pit, which has steps back to the start. A gentle preview of P-M's lesson.

**P-M "Footing"** (base kit, 2–3 sections, grants Dash). Builds on P-E: *where you stand when you swap* becomes the puzzle, and the swap becomes a weapon.
- Tower section: alternating red/blue platforms with few neutral footholds. Crystals are placed so the obvious hit drops you; the correct route swaps only from neutral footholds (often by up-attacking a crystal from below).
- Walker section: a walker patrols the red bridge you must cross. Swap to Blue → it drops into a sealed, escapable pit below, but the bridge is gone too. Take the blue route to a second crystal, swap back to Red, cross the now-empty bridge.
- Lesson: *the swap reshapes the room for everyone in it.*

**P-H final chamber: options (Phase × Light × Weight; needs P-M + W-H + L-H)**
- **A "Eclipse" (recommended).** Kit: base + Dash + Bolt (Throw deliberately excluded, see below).
  - New pair interaction: *phase blocks are shutters for light* (whichever colour is solid casts a shadow).
  - The exit door shows **three lamps (beam, crate plate, walker plate)**, echoing the three seals.
  - Intended chain:
    1. Swap to Blue to drop the walker patrolling the red bridge into its pen plate (Weight × Phase).
    2. Swap back to Red to restore the bridge and carry the crate across to its plate (Weight × Phase).
    3. Swap to Blue: the red shutter in the beam's path opens, but a blue block now shadows it further on (Light × Phase).
    4. Bolt a high mirror to route the beam around the blue block → beam lamp lit (Light + Bolt).
    5. Return across the 4-gap where the rerouted beam now stands as a vertical fence. Jumping hits it; **Dash** passes through (Phase-M reward).
  - Why exclude Throw: every extra verb in the kit multiplies the unintended solutions we must rule out; the finale should test combining *mechanics*, not using every *ability*.
- A+ "Eclipse, full kit": the same, plus Throw (a crate-delivery shortcut has to be designed in or blocked). Feels like a "mastery exam", but carries more validation risk.
- B "Relay": three sections each echoing one mechanic, chained by signals (a plate powers an emitter; a receiver swaps the phase; the phase drop lands the final crate). Readable and cheaper to build, but the mechanics hand off rather than overlap, so it's shallower as a finale.

### Light chamber concepts (approved as C36–C38; original text)
Assumption to confirm in Point 3: **melee hits forward and up**, so mirrors can sit at body height beside a ledge or directly above the player's head. Beams pass through each other without interacting.

**L-E "First Light"** (base kit, 2 sections). Teaches: beams are straight and always visible; a lit receiver powers its wire; attack flips a mirror; beams block you (knockback).
- A: one emitter, one mirror, one receiver on a door. The beam starts hitting a wall; one flip lights the receiver and the door opens.
- B: the beam initially crosses the walkway at body height (a safe knockback teaches "barrier"). One flip sends it up to the exit's receiver and clears the walkway at the same time. Lesson: *where the light goes is also where you can't walk.*

**L-M "Order of Light"** (base kit, 2–3 sections, grants Bolt). Builds on L-E with three mirrors (8 combinations), and the beam-as-barrier now creates an ordering problem.
- The correct final route runs up the only climbing shaft. Climb first and set the high mirror, then come down and set the low mirrors last.
- Doing it in the wrong order blocks the shaft; you flip the low mirror back (no softlock).
- Lesson: *set the far mirrors before the light blocks your way back.*

**L-H options (Light × Weight; kit = base + Bolt; no Throw since W-M isn't a prerequisite):**
- **A "Chain Reaction" (recommended).** New device variant: a **mirror wired to a plate** (weighted = flipped).
  1. Bolt a high, unreachable mirror so the beam lights receiver Rt → trapdoor opens → the walker drops onto plate Pb.
  2. Pb flips mirror Mb upstream, so the beam reroutes on its own (Rt goes dark, trapdoor seals the walker in).
  3. The new route is cut at mirror Ma, which is wired to plate Pa. Carry the crate to Pa → Ma flips → the beam reaches the exit receiver.
  - Catch: after step 2, the new beam crosses the crate's carry route, so the crate must be placed first (or the route reset). Light → Weight → Light in one chain; echoes W-M's walker + trapdoor vocabulary.
- **B "Shield & Shadow".** Crates block beams: place crates to cut specific beam segments (open barriers, starve wrong receivers) while Bolt flips distant mirrors. More freeform and emergent, but harder to rule out unintended solutions.

### Mechanic rulebook (original proposal text)
**Signals (shared glue):**
- Inputs: plate, beam receiver, crystal/switch. Outputs: door, phase state, moving platform, emitter on/off.
- Links are data by ID; optional AND (all inputs active).
- Wires are always visible and light up when carrying power.

**Weight:**
- A plate is active only while something is on it (player, crate, enemy). All plates are identical, with no "heavy plate" variants.
- Crates are 1×1 tile and can be carried and put down. A crate destroyed by a pit or hazard respawns at its dispenser.
- Carrying a crate lowers jump height, which is a deliberate source of puzzle constraints.

**Light:**
- Emitters fire straight beams along the grid. Mirrors are fixed in place and **2-state (/ ↔ \)**, toggled by attack.
- A beam stops at walls, crates, enemies and solid phase blocks. A lit receiver activates its signal.
- Beam vs player: proposed as a **barrier with knockback and small damage** (never instant death). Enemies take heavy damage. Dash (if owned and in the kit) crosses beams safely.

**Phase:**
- **One chamber-wide state** (red solid / blue solid). It swaps by hitting a crystal or by a signal; never on a timer.
- A block that would turn solid on the player, a crate or an enemy stays ghosted until vacated.
- Crates and enemies standing on a block that turns non-solid fall.

### Design metrics (proposal: the drafting baseline; Day 1 movement tuning must hit these)
| Metric | Value (tiles) |
|---|---|
| Tile size | 32 px; player ~1 × 1.5; crate 1 × 1 |
| Jump height (full hold / tap) | 3 / ~1 |
| Running jump gap | 4 |
| Jump height / gap while carrying | 2 / 3 |
| Throw (C23 candidate) | fixed arc, lands 3 ahead |
| Dash (C23 candidate) | 4 horizontal |
| Bolt (C23 candidate) | straight line until it hits something |

### Chamber template (proposal)
- 2–3 sections, each about one screen, connected both horizontally and vertically.
- Entry door, exit door; crate dispenser if the chamber has crates; reset (sub-topic 5).
- Each chamber states: its **goal** (teach / test / twist), intended solution steps, stuck states and recovery.

### Remaining Point 2 sub-topics (proposal; decided, see Confirmed decisions)
**Solvability assurance (recommended: layered, cheap):**
1. Every layout is drawn against the fixed design metrics (C29).
2. Each chamber's data carries its authored solution as a step list, shown in a debug overlay.
3. A **dev-mode validator** runs on load: row widths, known symbols only, every signal link targets an existing device, entry/exit present, every crate has a dispenser, enterable pits ≤ 3 deep, wired mirrors flagged locked.
4. A **logic-state enumerator**: brute-force every combination of mirror states × phase state (at most a few dozen per chamber) and report which combinations light each receiver. This proves the intended configuration works and flags unintended ones. Movement reachability stays manual.
5. Debug tools: beam/wire overlay, state toggles, teleport-to-section.
6. Playtests (Point 8).

**Reset & recovery (recommended):**
- **Hold R for ~1 s** to reset the whole chamber (devices, crates, enemies, phase, player at entry), with a fill ring to prevent accidents. No penalty.
- Whole-chamber reset only: the phase state is shared across sections, so partial resets would be fragile, and chambers are ≤ 3 screens.
- Built-in recoveries already designed: dispenser recall, escapable pits, enemy respawn, ghost rule, doors never close on objects.
- ~~Proposed refinement of C7: defeat inside a chamber resets it instead of ending the run.~~ **Replaced by the user's heart system (proposal, awaiting confirmation of details):**
  - 3 hearts (= lives) per run. Defeat anywhere costs 1 heart and respawns you at the current room's entrance with that room reset and health full. 0 hearts → run ends (C7 keeps abilities + solved chambers).
  - Voluntary chamber reset stays free; only combat defeat costs hearts.
  - Hearts are off in level select.
  - Hearts are lives, not health: each life has health pips (numbers in Point 3).
  - Heart restoration/upgrades are parked for Point 4.

**Visual language (recommended):**
- Mechanic colours: Weight = amber (plates, crates); Light = cyan beams, white receivers; Phase = red/blue. Neutral terrain = dark grey.
- **Never colour alone:** red blocks get diagonal hatching and blue blocks get dots; inactive colour = outline only. Red/blue is safe for the common red-green colour blindness, and the patterns cover the rest.
- Wires are dim when off and pulse when powered. Doors carry one lamp per required input.
- Every state change gets a sound + small particle burst + brief flash.
- Enemies: walker = plain square with an eye; armoured = the same with a front shield bar.

**Architecture & level select (recommended; framework-agnostic until Point 6):**
- **Chambers are data:** one file per chamber holding the ASCII section grids exactly as drafted, a legend, a device list with IDs and signal links, initial phase, declared kit, and metadata (mechanic, difficulty, prerequisites, solution steps). The drafts become the data with almost no translation. That makes live edits in the follow-up call easy and AI diffs readable.
- **Systems:**
  - Signal bus: event-driven, recomputes on change.
  - Beam system: grid raycast, recomputed when any mirror, phase or blocker changes.
  - Phase system: one state bit + ghost rule.
  - Weight system: plate occupancy.
  - Crate/dispenser, enemy AI, kit gating.
- **Level select:** a 3 × 3 grid (mechanic × difficulty) that loads chamber + kit, plus a URL parameter (e.g. `?chamber=W-H`) for reviewers and tests. The expedition mode sits beside it.

### Point 2 sub-topics still to cover (in order)
1. ~~Pick the three mechanics.~~ Done (C19).
2. Progression map: which Hard combines what; unlock prerequisites; finale.
3. Base player kit in chambers (move, jump, attack, carry?) and whether any chamber *requires* an unlockable ability.
4. E/M/H drafts per mechanic (Claude drafts as text grids, user decides; C13).
5. Solvability assurance, softlock prevention, reset/recovery.
6. Visual language (colour per mechanic, state feedback).
7. Reusable component architecture + level select.

---

## Point 3: Platforming & Combat (in discussion)

### What the brief requires
- Responsive movement and enjoyable combat that feel "satisfying, not just functional".
- At least two enemies with distinct behaviours.
- Encounters that interact naturally with level geometry.
- Weight: game feel is 15%.

### Already fixed by earlier decisions
- Metrics (C29): jump 3, gap 4, carry 2/3, Throw 5, Dash 4.
- Melee forward + up (C35).
- Base kit (C25); abilities Throw/Bolt/Dash (C23).
- Hearts with any hit or contact costing one (C54, C55); beams knockback only (C27).
- Walker spec (patrols, turns at walls and ledges, can't jump, counts as weight, respawns).
- Armoured bridge enemy (C48).
- Dedicated combat encounters live in the connector rooms (C12, C16).

### Proposals (decided, see Confirmed decisions)
**Movement feel package (numbers tuned on Day 1, constrained by C29):**
- Fast ground acceleration and deceleration.
- Variable jump: release early to cut the jump; reduced gravity near the apex for a little hang; higher fall gravity; capped fall speed.
- Coyote time ~0.1 s; jump buffer ~0.1 s.
- Full air control (slightly reduced while carrying).
- Carrying: −20% speed, jump 2.
- **No wall jump or wall slide** (they would break the metrics every layout relies on).
- Juice: squash/stretch on jump and land, landing dust, footstep and jump sounds.

**Combat core:**
- Melee: quick swing (forward or up), reach ~1.3 tiles, so the attack reaches before contact does (critical with C55). Short recovery.
- Hits knock enemies back about 1 tile and cause ~60 ms hit-stop, a small screen shake, a white flash and a sound.
- No down-attack/pogo: bouncing would add height and break the puzzle metrics.
- Heart loss: brief slow-motion flash → fade → respawn at the room entrance with the room reset.

**Enemy roster:**
- **Walker (core):** patrols, turns at walls and ledges, contact hurts, 2 hits to kill. It can be knocked off ledges, into beams, or dropped by phase swaps. Counts as weight.
- **Shieldbearer (core, C48):** slow patroller with a front shield; melee from the front bounces off (with a clang and pushback). Vulnerable from behind (jump over it, then strike, 3 hits) and to environment (beams, falls). It turns around after a short telegraphed pause when the player is behind it. Counts as weight. 1 × 1.5 tiles, so a 3-tile jump clears it.
- **Spitter (optional stretch, only if Days 4–5 allow):** a stationary turret firing slow, clearly telegraphed projectiles in a straight line. It adds a vertical/ranged threat; its projectiles could later hit crystals and mirrors.

**Dash vs enemies:** Dash gives brief invulnerability against beams *and* enemy contact. That makes it a defensive combat tool under C55. Only P-H has Dash in its kit, and its walker is unreachable, so no puzzle is affected.

**Combat rooms (connectors) reuse the puzzle systems:**
- Ledge patrols over pits (knock walkers off).
- A Shieldbearer in a corridor (jump over, strike its back).
- An arena with a red floor and a crystal (swap to drop enemies).
- An arena with an emitter (lure enemies into the beam).
- Encounters are data (enemy placements per connector template), chosen from a pool by the generator (C15).

## Point 4: Player Upgrades (in discussion)

### What the brief requires
A small upgrade system with meaningful choices. Upgrades affect movement, combat, puzzle-solving or strategy, and contribute to replayability. Weight: 5% (shared with replayability).

### Already fixed
- Permanent layer = abilities (Throw/Bolt/Dash from Mediums) + solved chambers.
- Run layer = upgrades/resources (C10), lost when the run ends (C7).
- A "reward choice" slot follows each chamber in an expedition (C12).
- Hearts don't refill; how to regain them was parked here (C54).

### Proposals (decided, see Confirmed decisions)
- **Structure:** after each solved chamber, a reward room offers **pick 1 of 3** from a pool (seeded). Run-scoped, no currency or shop (an economy adds UI and balancing for 5% of the grade).
- **Hard rule:** **no upgrade may change the movement metrics** (C29: jump, gaps, carry, Throw/Dash distance), because every layout depends on them. Movement upgrades are therefore limited to things like Dash cooldown.
- **Ability-gated upgrades** appear only once the ability is owned, so the pool grows as permanent progress grows. Combinations then differ across runs (feeds Point 5).
- **Proposed pool (10):**
  - Combat:
    1. **Heavy Swing:** +1 damage (Walker 1 hit, Shieldbearer 2).
    2. **Long Reach:** melee +0.5 tile.
    3. **Shockwave:** hits knock enemies back 2 tiles (more ledge and beam kills).
    4. **Shield Breaker:** a front hit staggers a Shieldbearer briefly.
    5. **Piercing Bolt\*:** Bolt passes through enemies (needs Bolt).
  - Survival:
    6. **Mend:** restore 1 heart, or +1 max heart if full.
    7. **Guard:** the first hit in each room is absorbed.
    8. **Phantom Dash\*:** Dash cooldown halved, and dashing through an enemy damages it (needs Dash).
  - Puzzle:
    9. **Insight:** shows the ghost path a mirror flip would produce and highlights each wire's targets.
    10. **Throw Sight\*:** previews Throw's landing tile (needs Throw).
  - \* = ability-gated.
- **Heart regain:** only via the Mend choice, so survival competes with power at every pick.
- Level select: no upgrades (reviewers play each chamber's base kit, consistent with C24).

## Point 5: Replayability (in discussion)

### What the brief requires
At least one replay incentive (different routes, changing configurations, upgrade combinations, or other); full procedural generation is not required.

### Already fixed
- Semi-procedural lean expeditions (C4, C8, C12, C15): seeded, replayable seed, fixed-layout fallback.
- 2–3 frontier chambers dealt per run (C11), W-E first on run 1 (C22), the final chamber dealt alone (C20 rule).
- Solved chambers and abilities persist (C7).
- Upgrade combinations, incl. ability-gated upgrades (C64–C67).

### Proposals (decided, see Confirmed decisions)
- **Run template:** Start → [connector (combat) → chamber → reward pick] × N → exit, where N = chambers dealt.
  - Connectors come from the 5–6 templates × encounter variants, with no repeats within a run.
  - **Plus one optional ability-gated side room per run** once you own an ability (Throw/Bolt/Dash gate) that holds an extra reward pick. This gives "different routes" and keeps the Metroidvania flavour (C5).
- **Encounter scaling by progress:** early runs have walkers only; Shieldbearers appear after the first Medium is solved; density rises with the number of solved chambers. All encounters are data tiers.
- **Post-game:** after the final chamber, **Remix expeditions** unlock. They deal any chambers with the hardest encounter tier, track best run time, and offer the full upgrade pool. This is cheap because the generator already exists.
- **Reviewer visibility (R5):**
  - The seed is shown in the HUD/pause menu, and the main menu has "New expedition" / "Replay seed" / "Chamber select".
  - The video shows two runs with different seeds side by side.

## Point 6: Development Guidelines (in discussion)

### What the brief requires
HTML5 with a suitable JS/TS framework; simple vector/geometric art or free/AI-generated assets; no purchases; prioritise feel, puzzle quality, reusability.

### Proposals (decided, see Confirmed decisions)
- **Stack:** **Phaser 3 (latest stable; confirm the exact version on Day 1) + TypeScript + Vite.**
  - Phaser is the most mature 2D web framework (tilemaps, Arcade physics, input, audio, cameras, particles) and the one AI tools know best, which matters when directing and checking AI.
  - TypeScript types catch AI mistakes and give the chamber data a schema.
  - Vite's hot reload makes live edits in the follow-up call fast.
- **Architecture split:**
  - A **framework-free logic core** in plain TS (signals, beam tracing, phase rules, plates, chamber parser + validator, logic-state enumerator), unit-tested with **Vitest**. It runs headless, so the enumerator and validator double as tests.
  - A thin Phaser layer handles rendering, physics, input and feel.
- **Physics:** Arcade physics with a custom velocity-based player controller, tuned to hit C29 exactly.
- **Resolution:** internal **1024 × 576 (32 × 18 tiles of 32 px)**, scaled to fit. The camera follows within taller or wider sections (e.g. the P-M tower).
- **Art & audio:** everything generated in code: geometric shapes with the C52 palette and patterns; SFX generated with a free sfxr-style tool; one OFL-licensed font. The asset list then becomes nearly empty, and every entry has a clear licence.
- **Save:** localStorage for permanent progress (abilities, solved chambers, seals), plus a "reset progress" option. Runs aren't saved mid-run.
- **Input:** keyboard first (move, jump, attack, carry/throw, dash, bolt, hold-R reset); gamepad as a stretch.
- **Deployment:** GitHub repo; static Vite build deployed to **GitHub Pages**, plus a **zip** of the build that runs locally (both deliverable options covered).

## Point 7: Schedule (in discussion)

### What the brief requires
- 7 consecutive working days, no check-ins.
- Full AI exports and at least one labelled gameplay screenshot per day.
- The suggested order may be changed if the design doc explains why.
- The Day 4 brief change arrives by email.

### Why the suggested order doesn't fit as-is
- Our Hards combine mechanics (W-H needs Phase, L-H needs Weight), so "one mechanic per day" can't finish its Hard on its own day.
- Enemies are puzzle pieces in W-M, W-H, L-H, P-M and P-H, so a *basic* walker and Shieldbearer (patrol, weight, falling) must exist before Day 4. Combat behaviour (attacks, damage, hearts) stays on Day 4.
- Because all 9 layouts are already designed as data, Days 2–3 are mostly systems + data entry, not level design.

### Proposed schedule (decided, see Confirmed decisions)
| Day | Build | Exit criteria |
|---|---|---|
| 1 | Repo + Vite/TS/Phaser + GitHub Pages pipeline; player controller + feel tuned to C29; chamber data format + parser + validator skeleton; test room; debug overlay; level-select stub | Movement hits the metrics in a test room; deploy works |
| 2 | Logic core: signals, plates, crates/dispensers (+recall), doors/trapdoors, phase system (+ghost rule); basic walker + basic Shieldbearer (patrol, weight, falling); Throw; ability grants. **Chambers: W-E, W-M, P-E, P-M, W-H** | 5 chambers playable from level select; logic tests green |
| 3 | Light system (emitters, 2-state mirrors, wired/locked mirrors, receivers, beam tracing incl. phase shutters); Bolt; Dash. **Chambers: L-E, L-M, L-H, P-H**; logic-state enumerator | All 9 chambers playable and validated |
| 4 | Combat: melee feel, hit-stop, contact = heart, hearts + room reset, Walker/Shieldbearer combat, connector templates + encounters. **Half-day buffer for the brief change.** Spitter only if ahead | Combat rooms playable; brief change handled |
| 5 | Reward rooms + upgrade pool; generator (frontier dealing, seeds, side rooms, encounter tiers); save; Remix. **Fallback: fixed expedition layout if the generator slips** | A full expedition loop is playable start → exit |
| 6 | Playtests with 3 fresh players (recordings or notes); fix the top issues; capture before/after | Playtest evidence + at least one before/after |
| 7 | Polish, balance, design doc, asset list, run/test instructions, 5-min video, collect AI exports, final deploy + zip | Everything in the deliverables list |

- **Daily routine:** at least one screenshot saved as `docs/screenshots/dayN-*.png`; export that day's AI conversation to `docs/ai-logs/`; commit + tag `dayN`; a 5-line devlog including an **"AI bug log"** (feeds the follow-up call's "walk through a bug AI introduced"). This pre-production conversation and the earlier ChatGPT export are included as pre-production logs.
- **Cut order if behind** (first to go → last):
  1. Spitter
  2. Remix
  3. Side rooms
  4. Encounter tiers
  5. Generator (fall back to a fixed layout)
  6. Upgrade pool trimmed to 6
  - **Never cut:** the 9 chambers, level select, reset, movement feel, playtests.

### Compressed schedule (proposal, clock already at Day 2; decided as C80)
| Day | Build |
|---|---|
| 1 (done) | Pre-production: design discussion + this decision log (no gameplay; Day 1 screenshot = design artefacts, labelled honestly) |
| 2 (today, extended) | Finish planning; repo + Vite/TS/Phaser + Pages; player controller tuned to C29; chamber format + parser + validator; puzzle core start (plates, crates, doors, phase) |
| 3 (extended) | W-E, W-M, P-E, P-M, W-H; Light system; L-E, L-M; Throw, Bolt; basic walker + Shieldbearer movement |
| 4 | L-H, P-H, Dash, enumerator (morning); combat + hearts + room reset; **brief-change buffer** (afternoon) |
| 5 | Connector rooms + encounters, upgrade picks, generator (fixed-layout fallback ready), save |
| 6 | Playtests ×3 + fixes + before/after |
| 7 | Polish, design doc, asset list, instructions, video, AI exports, final deploy + zip |

**Pre-applied cuts:** Spitter and side rooms are out of the plan (back only if ahead). Remix and encounter tiers are the next candidates.

## Point 8: Playtesting (proposal; decided, see Confirmed decisions)
- **Who/when:** ≥ 3 people who haven't seen the game; a quick early session on Day 5 evening if possible, main sessions on Day 6 morning.
- **Session (~15 min):** think-aloud; no hints for 2 minutes after getting stuck. Order:
  1. W-E, L-E, P-E (from level select).
  2. One Medium.
  3. One Hard.
  4. One expedition run.
- **Evidence:** screen + voice recording (Xbox Game Bar or OBS, both free) or detailed notes using a template (per chamber: time, resets, hearts lost, stuck points > 60 s, quotes).
- **Built-in telemetry:** per-chamber time / resets / hearts lost logged and exportable to the clipboard. This gives hard numbers for the before/after.
- **Iteration:** triage the top 3 issues, fix them, and capture at least one before/after (clip or screenshot + metric).

## Point 9: Deliverables (proposal; decided, see Confirmed decisions)
- **Build:**
  - GitHub Pages link.
  - A zip built as a **single self-contained HTML file** (via a single-file Vite plugin), so it opens by double-click without a local server.
- **Repo README:** `npm install`, `npm run dev`, `npm test`, `npm run build`, controls, the URL parameter `?chamber=`.
- **Design doc (2–4 pages):**
  - Loop sentence at the top.
  - The 3 mechanics + E/M/H table.
  - Solvability & difficulty scaling.
  - Combat.
  - Upgrades & replayability.
  - Schedule reordering rationale.
  - Playtest changes.
  - **One cut idea** (candidates: the full procedural Metroidvania world, the Echo mechanic, wall jump, P-M's blue-route bridge).
- **Video (5 min):** loop & menu → movement/combat → one E/M/H progression → the finale → an expedition with two seeds → tech (data grids, validator/enumerator) and AI process.
- **Folders:**
  - `docs/ai-logs/` (ChatGPT export, this planning session, daily sessions)
  - `docs/screenshots/dayN-*`
  - `docs/playtests/`
  - `docs/ASSETS.md` (font licence, generated SFX, everything else code)

## Point 10: Follow-up call prep (proposal; decided, see Confirmed decisions)
- Keep the project runnable locally. Rehearse three live changes: edit a chamber grid, tune a metric (show the validator flagging a broken layout), add a device.
- Prepare "intended feeling" notes per chamber (from each chamber's teach/test goal).
- **AI bug stories ready from pre-production already:**
  1. The Throw metric bug (3 tiles was useless versus carrying).
  2. The L-H grid row misalignment caught by self-check.
  3. The bypasses found when drawing L-M, P-M and P-H.
  - Plus the daily AI bug log.
- Likely challenges and answers:
  1. Why roguelite runs in a puzzle game (solved chambers persist).
  2. Why any contact costs a heart.
  3. Why chambers enforce their kit.
  4. Why no wall jump.
  5. Why the generator only chains rooms.

## Point 11: Evaluation alignment (proposal; decided, see Confirmed decisions)
| Criterion | Where we deliver it |
|---|---|
| Puzzles 30% | 3 interacting mechanics, 9 validated layouts, readability rules (C52) |
| Difficulty & geometry 15% | Teach → test → combine recipe; multi-section layouts with vertical traversal; progression graph |
| Game feel 15% | Movement package (C58), combat juice (C62) |
| Core loop 10% | Loop sentence, expeditions, hearts, seals |
| Iteration 10% | Playtest before/after; Day 4 change logged and explained |
| Tech & reuse 10% | Engine-free tested logic core, data-driven chambers, validator + enumerator |
| Upgrades & replay 5% | Pick 1 of 3, ability-gated pool, seeded runs, Remix |
| AI direction 5% | Full logs, this decision log, AI bug log |

## Parking lot (deferred to their own points; not to be decided early)
- Room transitions: discrete rooms with door transitions vs seamless scrolling map (Point 2 / 5).
- Puzzle failure vs death: proposed principle that puzzle failure never costs the run; every chamber has a reset (Point 2).
- Enemies used in puzzle solutions must be deterministic and respawn so they can't cause a softlock (Point 2 / 3).
- Which abilities and how many (Point 3 / 4).
- Run-upgrade design and choice moments, e.g. pick 1 of 3 after a chamber (Point 4).
- Optional ability-gated bonus caches inside solved chambers as a revisit incentive (Point 4 / 5).
- Theme, art direction, framework/stack (Point 6).
- Schedule order, e.g. when the generator is built and the Day 4 change buffer (Point 7).
- AI export + daily screenshot pipeline from Day 1 (Point 7 / 9).

## Risk register
| ID | Risk | Mitigation |
|---|---|---|
| R1 | Roguelite reset makes players re-solve known puzzles; combat deaths erase puzzle work. | C7 (solved chambers persist) |
| R2 | Permanent movement abilities let players skip authored puzzles. | C6 + C14 |
| R3 | Level select conflicts with an ability-gated world. | C14 |
| R4 | Generator eats time needed for the 9 chambers. | C15 |
| R5 | Reviewers play ~15–30 min, so replay value can go unseen. | Surface run-to-run change early; show it in the video |
| R6 | Enemy-dependent puzzles softlock if the enemy dies. | Parking lot item |
| R7 | Day 4 brief change is unknown. | Data-driven configs, modular systems |
| R8 | Live change requested in the follow-up call. | Data-driven chambers/rooms, fast edit-reload loop |
| R9 | No artist. | Geometric shapes + strict colour language (helps readability); optional CC0 pack; decide in Point 6 |
| R10 | Limited level-design capacity. | C12 (lean world), C13 (workflow), S2 (grid-friendly deterministic mechanics) |

## Change log
- 2026-11-12: Log created from the DOCX + handoff. Point 1 proposals drafted; Q1–Q4 asked.
- 2026-11-12: User accepted Q1–Q4 recommendations → C6–C9; C10–C11 follow. Added "no 10th puzzle" after spotting a scope trap in the objective wording.
- 2026-11-12: User raised constraints (no artist, limited level-design capacity). Rescoped to lean expeditions (C12), adopted the Claude-drafts / user-decides workflow (C13). **Consequences:** C2 changed (balanced → puzzle-first); C5 reduced; C8 room count revised; loop sentence reworded.
- 2026-11-12: **Point 1 approved** (C14–C18 incl. loop sentence Variant B). Point 2 opened: criteria, candidate mechanics and trios proposed.
- 2026-11-12: Mechanics chosen: Light + Weight + Phase (C19). Progression map, seal mapping, dealing rule and onboarding proposed.
- 2026-11-12: Progression map (C20), seal mapping (C21) and onboarding (C22) confirmed. Abilities-in-chambers + base kit proposed.
- 2026-11-12: Abilities from Mediums (C23), chamber-enforced kit (C24), base kit (C25) confirmed. Mechanic rulebook, design metrics and chamber template proposed.
- 2026-11-12: Mirrors 2-state (C26), beam = barrier (C27), one phase state (C28), metrics (C29) confirmed; low-risk rulebook defaults logged as accepted without objection (C30). Weight drafts W-E, W-M (grids) and W-H (concepts A/B) proposed.
- 2026-11-12: W-E (C31) and W-M (C32) approved; W-H concept A selected (C33). **Bug caught in C29:** Throw "3 ahead" was useless versus carrying (gap 3) → proposed fix: 5 ahead. Slot rule revised from "1 deep" to "escapable (≤3 deep)". W-H full grid drafted.
- 2026-11-12: User approved the Throw fix (C29 corrected) and W-H (C34). Weight complete. Light concepts L-E, L-M, L-H (A/B) proposed; melee-direction assumption flagged.
- 2026-11-12: L-E, L-M layouts approved (C39, C40); L-H recovery = kill walker (C41). L-H grid drawn; added the rule "plate-wired mirrors are locked" after finding that manually flipping Ma would bypass the crate. **Self-check caught a drawing error:** in the first written L-H grid, rows 13 and 15 were one tile too long, and rows 16–18 misplaced the S1 ledge, the crate and a stray wall tile. Corrected before review. (Lesson for implementation: a grid validator that checks row widths and basic reachability is worth building.)
- 2026-11-13: P-E (C46) and P-M (C47) layouts approved; front-armoured bridge enemy (C48). Final chamber "Eclipse" grid drawn, with three bypass-driven changes from the concept (single crystal on the right, 5-tile chasm instead of a beam fence, walker drops into the chasm). New low-risk rules: no Dash while carrying, Bolt along the upper body row, dispenser recall.
- 2026-11-13: Session interrupted; L-H approval re-asked and given (C42). P-E, P-M concepts approved (C43, C44); final = Eclipse with Dash + Bolt (C45). P-E and P-M grids drawn. P-M bridge simplified (the approved blue-route version had 3 bypasses) and flagged. New Point 3 dependency: front-armoured bridge enemy. Rule made explicit: crystals are non-solid.
- 2026-11-12: Melee forward + up (C35); L-E, L-M concepts approved (C36, C37); L-H concept A selected (C38). L-E and L-M grids drawn. L-E Section B redrawn while checking (the first version trapped the player beside the mirror block). L-M moved from shaft to gallery (precise-jump problem). L-H recovery design raised as an open question.
- 2026-11-14: Points 4–11 approved (C68–C83). Implementation-planning prompt approved, with the user's additions: the Day 1 chat export (C84), enforced clean architecture (C85), and living docs incl. `tasks.md` checkpoints (C86).
- 2026-11-14: Step 0 done: session exported (`docs/ai-logs/`), docs set seeded. **Version check found that Phaser 4 is now the stable line (4.2.1); Phaser 3's final release is 3.90.0.** C73 said "Phaser 3, latest stable": the choice of Phaser 3.90.0 vs Phaser 4.2.1 is raised with the user. TypeScript is pinned to 6.0.3 because typescript-eslint doesn't support TS 7 yet (technical detail, not a design change).
- 2026-11-14: GitHub repo connected (`origin`); the nested clone `DU Assignment/` was untracked and git-ignored, and its initial commit (`.gitattributes`) merged locally. Push policy C88, Pages C89.
- 2026-11-14: **Correction:** the user created the repo in `G:\Du\DU Assignment` on purpose: the project belongs inside it. The project (incl. its `.git`, which already contained the GitHub repo's initial commit) was moved into `DU Assignment`; the clone's own `.git` was backed up outside the project, and the ignore rule removed.
- 2026-11-14 (Day 2 build): Melee (forward + up) implemented; P-E entered and solved end to end in the real game. **P-E design bug found by a scripted playtest** (red-phase pit dead end) → pit crystal approved (C90). Implementation defaults, open to the user's objection: attacking is allowed while carrying; one swing swaps the phase at most once (two crystals in reach would otherwise cancel out); puzzle hits resolve on the frame the swing starts; an exit with no inputs is a plain doorway and must be declared (`exitAlwaysOpen`, P-E and P-M). **Open question, decide when W-H is built:** the dispensers in W-E (section B), W-H and L-H sit 6+ tiles above the floor, out of melee reach. W-E's crate can't be lost and L-H has up-Bolt, but in W-H recall is unreachable, so hold-R would be the only recovery for a stuck crate.
- 2026-11-14 (Day 2 build): Walker (basic) implemented: patrol, turns at walls/ledges/blocking bodies, no air control, gravity, weighs plates. **Design inconsistency found:** W-M and L-H (drawn on Day 1) relied on walkers walking into an opened trapdoor, which contradicts "turns at ledges". The user chose the literal rule (C91). W-M entered and solved end to end with the timed drop; L-H flagged for redesign.
- 2026-11-14 (Day 2 build): Throw implemented as a scripted arc (not a physics impulse): the crate lands centred on the tile exactly 5 columns ahead of the player's column, at the player's floor height; touching anything solid mid-flight drops it on the spot; no floor at the landing tile → it keeps falling. Verified in the movement test room: clears the 4-gap (lands on the first tile past it), falls into the 5-gap. Kit enforcement (C24) verified: no Throw in W-E. Implementation default, open to the user's objection: **Throw only from the ground** (in the air it is refused with a small shake), so "5 ahead" is always measured from the player's floor.
- 2026-11-14 (Day 2 build): W-H entered; the Day 1 grid was unclimbable (C92) and had an exit-floor dead end; both fixed with user approval, verified by a new **headless reachability checker** (`src/core/player/reach.ts`: runs the real movement model against the grid; calibrated against every C29 metric) and solved end to end in the game. Dispenser: hold-R fallback (C93). This extends C51's layered checks: movement reachability is no longer manual only.
- 2026-11-14 (Day 2 build): Shieldbearer (basic: patrol shared with the walker, 1 x 1.5 tiles, slower, front shield drawn; combat Day 4). P-M checked with the reachability checker before building: tower correct (each stage reaches exactly the next foothold in the right colour, no skips); bridge had two issues → C94 (accepted as is), C95 (chasm deepened). P-M solved end to end in the game.
- 2026-11-17 (Day 3): Light system implemented (`src/core/light/beams.ts`): reflection table per C26, beams stop at solids (incl. closed doors and the active phase colour), crates and enemies (C30), light receivers, pass through the player. Implementation defaults, open to the user's objection: the beam pushes the player away from the beam line (sideways from a vertical beam; up/down plus a little sideways from a horizontal one) for 0.18 s, never a heart (C27); beams update every physics step. L-E entered: its section B row 6 was drawn 19 tiles wide in the Day 1 grid; one `.` added so the emitter sits on the wall and the mirror at col 10 as the text says (drawing error, not a design change).
- 2026-11-17 (Day 3): L-M entered; the reachability checker showed the exit was unreachable (C96, fixed with user approval); beams verified against the design (start barrier, intended order lights the receiver, wrong order fills the gallery). Solved end to end in the game.
- 2026-11-17 (Day 3): Bolt implemented (`src/core/player/bolt.ts`): forward Bolt along the upper-body row (C50), up-Bolt straight up from the head; flies until it hits the first crystal, mirror or dispenser (locked mirrors refuse, C42) or is stopped by a solid, including the active phase colour (P-H's blue block shadows it). Implementation defaults, open to the user's objection: the Bolt stops at the first target (it does not pierce; "Piercing Bolt" is the upgrade), 0.45 s cooldown, usable while carrying, and the hit lands when the visible dart arrives. Dev-only `?kit=` URL override added for testing.
- 2026-11-17 (Day 4): L-H redesign proposed and approved before building: walker caged on the trapdoor (C97, follows from the literal walker rule C91) and the left shaft rebuilt (C98, the Day 1 shaft was unclimbable). Both verified with the beam tracer and the reachability checker.
- 2026-11-17 (Day 4): L-H built per C97/C98 and solved end to end in the game. Knockback default refined (my own default from Day 3, open to the user's objection): a horizontal beam **above the body centre** acts as a ceiling (bump down; sideways movement and steering carry on); vertical beams still push the player back sideways. Found on L-H: a full carry-jump onto the `a` step grazes the emitter's beam above it, and the old push threw the player off the step. Validator: an enemy may start on a (closed) trapdoor.
- 2026-11-17 (Day 4): Dash implemented in the pure movement model: exactly 4 tiles in a straight horizontal line with gravity paused (C29), never while carrying (C50), invulnerable to beams during the Dash (C60; enemy contact follows with combat). Implementation defaults, open to the user's objection: usable in the air once per airtime (P-H's "jump + Dash" needs an air Dash), 0.35 s cooldown, 0.06 s of invulnerability after it ends. Measured: a running jump plus one Dash clears up to 9 tiles; only P-H has Dash in its kit, and it will be checked against this before building.
- 2026-11-17 (Day 4): Reachability checker extended with Dash attempts and a per-frame hook (melee-reach checks). P-H checked before building → C99 (walker pocket, mirror housing); built; playtest found the crate on `p` blocked the way home → C100. P-H solved end to end in the game: **all nine chambers playable and solved end to end.**
- 2026-11-17 (Day 4): Combat implemented (C59–C62): walker 2 hits, Shieldbearer front immune to melee and Bolt (clang + push back) and 3 hits from behind, telegraphed turn (0.6 s, "!"), enemy knockback ~1 tile, 60 ms hit-stop, shake, flash, code-generated sounds (C74); killed enemies respawn at their spawner after 1.5 s; contact = defeat (C55) unless dashing (C60); defeat sequence = slow motion, flash, fade, chamber restart; hearts are off in level select (C54), so a defeat there costs nothing else (hearts in expeditions arrive with Day 5). Implementation defaults, open to the user's objection: the Bolt hits the first enemy on its line (1 damage); beams kill any enemy outright, shield or not; "falls" (C62) are read as *no fall damage* (no chamber has a lethal pit; enemies that fall stay where they land, which P-M and W-H rely on); the Shieldbearer notices a player behind it within 5 tiles at the same height.
- 2026-11-17 (Day 4): Logic-state enumerator (C51) built and run on all nine chambers; report in `docs/enumerator-report.md`, kept as a file snapshot so any logic change shows up as a diff to review. Review: every intended end state opens its exit; P-H (the "light needs Blue" dilemma) and L-M (the mirror order) have exactly one opening configuration; the other chambers' extra opening configurations are gated physically (e.g. W-E opens with only `q` weighed down, but reaching `q` needs the crate on `p`; L-H opens with the high mirror Bolted back, but the walker only reaches `b` after it was Bolted). No unintended solution found.
- 2026-11-17 (Day 5): Expedition room drafts approved (C101, rules C102). Grids entered as data (`src/data/rooms/expedition.ts`, types in `src/core/run/rooms.ts`) with regression tests (validator, reachability, every tier's enemies standing on solid ground, walkers only in T1).
- 2026-11-17 (Day 5): Expedition rooms playable in the chamber scene (rooms are converted to chamber definitions, so every system works on them unchanged). Room ids are `room:<id>`; an exit can be held shut by room rules (`ChamberLogic.holdClosed`). Run hand-off through game events (`room-done`, `reward-picked`, `run-complete`) for the expedition controller. Implementation default, open to the user's objection: after a pick the reward room keeps the chosen upgrade's name and effect on screen as a confirmation.
- 2026-11-18 (Day 5): Upgrade pool built (C64–C67): `src/core/run/upgrades.ts` (pool, seeded dealing by run seed + pick number, ability gating, run state, effects) and `src/core/light/insight.ts`, with tests; the reward pedestals deal real offers and taking one updates the run (Mend heals at once, C66). Implementation defaults, open to the user's objection: only Mend can be taken twice; **Long Reach works on enemies only**, so puzzle hits keep the 1.3-tile reach every chamber was proven with (P-H's Bolt-only mirror, C56/C99); Heavy Swing is melee only (Bolt stays 1 damage); **Shield Breaker** staggers the Shieldbearer for 0.8 s with its shield down (hits land from either side) and replaces the clang push back; Shockwave doubles the knockback (~2 tiles); Piercing Bolt hits every enemy on its line as it passes and goes on to its puzzle target; Guard absorbs one enemy contact per room attempt (push back + 1 s of safety; a defeat restarts the room with Guard ready again); Phantom Dash halves the Dash cooldown (0.35 → 0.175 s; distance and once-per-airtime unchanged, C65) and a Dash hits each enemy it passes through once, through the shield; Insight rings the nearest free mirror within 2.5 tiles and draws a dashed ghost of the beams if it were flipped, and outlines the targets of the nearest wired plate or receiver; Throw Sight draws the arc and landing tile while carrying (faint in the air, where Throw is refused). Upgrades never apply in level select (C67); a dev-only `?upgrades=` gives a URL-opened room or chamber a run to test them.
- 2026-11-19 (Day 5): C103 built: `boltEnemyLanes` / `enemiesOnLanes` in `src/core/player/bolt.ts` with tests (walker on the floor hit; a low wall shields a walker behind it; nothing hit past the mirror that stops the Bolt; nearest first). Verified in the game: a standing Bolt hits a floor walker (the dart flies along the walker's row), Piercing Bolt hits both Arena walkers, and a Bolt still flips L-M's mirror. Side effect, harmless: in L-H and P-H (the chambers with Bolt) a walker the player can line up with can now be Bolted; it respawns at its spawner (C41). Piercing Bolt's dart still flies along the upper-body row to reach its puzzle target; walkers it passes flash as they are hit.
- 2026-11-19 (Day 5): Hearts in expeditions and permanent progress built. A defeat during a run costs a heart and restarts the room; at zero the scene emits `run-over` (the expedition controller takes over; a room opened alone shows a message and returns to the menu). `src/core/run/progression.ts` holds the graph (C20), frontier (C11), abilities (C23), seals (C21) and the save (C76), with tests on the real chamber data. Implementation defaults, open to the user's objection: **only the solved chambers are saved** (abilities and seals follow from them, so a save can't contradict itself); the save is versioned JSON under `seal-chambers.progress`, and an unreadable save, another version or blocked storage count as fresh progress; **solving a chamber in level select does not earn progress** (level select is free play for every chamber, C53; progress comes from expeditions); reset progress asks for a second press within 3 s.
- 2026-11-19 (Day 5): Expedition loop playable. `src/core/run/generator.ts` (with `rng.ts`) builds Start → [connector → chamber → reward] × N → Seal exit from the seed and the saved progress (C8, C11, C12, C15, C22, C70); `src/game/expedition.ts` plays it; the menu has New expedition / Replay seed / Chamber select (C72). Implementation defaults, open to the user's objection: a run deals 3 chambers when the frontier has them, so a run is 11 rooms (C8 said ~6–9; connectors are short); the encounter tier is fixed at the start of the run from saved progress; each solve is saved the moment the chamber is left (C7: a lost run keeps it) and a newly granted ability works for the rest of the run outside chambers; Esc abandons the run; once every seal is restored, New expedition becomes a **Remix** run (any 3 chambers, T3, all abilities; the C71 best-run timer is not built yet); Replay seed remembers the last seed on this browser and digits typed in the menu edit it; `?expedition&seed=<n>` starts a run from the URL. No fixed-layout fallback was needed (C15).
- 2026-11-19 (Day 5): Telemetry built (C81): `src/core/run/telemetry.ts` + `src/game/telemetry.ts`, exported from the menu as a Markdown table (every attempt, then a per-chamber summary) for `docs/playtests/`. Implementation defaults, open to the user's objection: an attempt covers one visit to a chamber or combat room (defeats and resets continue it; solving, leaving or the run ending close it), so level-select play is recorded too (the Day 6 session starts there); start, reward and exit rooms are not recorded; time counts physics steps only (not paused, not the defeat sequence); defeats are counted everywhere, hearts lost only in expeditions; the log is kept in localStorage (newest 500 attempts) so a reload doesn't lose a session, and is cleared from the menu (twice); if the browser blocks the clipboard the report is printed to the console.
- 2026-11-19 (Day 6 prep): Playtest kit written (`docs/playtests/`: session script, notes template, summary with triage and before/after), following Point 8 / C81. Implementation defaults, open to the user's objection: each tester plays the three Easys plus one mechanic's Medium and Hard, rotating so the three sessions cover all nine chambers (W / L / P); 30 s in the movement test room before the Hard, because level select gives a chamber only its declared kit and the Hard is the tester's first contact with Throw / Bolt / Dash; the run uses seed 42 from a fresh save (it repeats the Easys, which also shows the second-time speed-up); time caps per chamber and about 20 minutes in total (the plan's ~15 predates the 11-room run; the run is cut after its first reward room past 20 minutes); triage score = testers who hit it × severity (1–3).
- 2026-11-20 (Day 6 prep): Two items done before the playtests. **Wires are dashed** (all of them, Weight amber and Light cyan), so a wire never reads as a beam (beams stay solid and glowing); a powered wire's dashes travel from source to target, which is C52's "wires pulse when powered" and shows the direction of the signal. **Remix best-run timer** (C71): a run's time is its active play time across all its rooms (physics steps only), shown as a clock in the Remix HUD and on the end screen with the best time; the best is kept on this browser and shown in the menu. Implementation defaults, open to the user's objection: normal runs show their time only at the end (no clock while solving puzzles); reset progress keeps the best Remix time (a personal record).
- 2026-11-20 (Day 6 prep): Worlds smaller than the 32 × 18-tile screen are centred (the Day 2 polish note): the camera's bounds are widened to the view and centred on the world, axis by axis, so a short chamber (the three Easys) sits in the middle vertically and still scrolls sideways, and a narrow one (W-M, L-M, L-H, most rooms) sits in the middle horizontally. The area around a small world shows the plain background.
- 2026-11-20 (Day 7 polish): C52's "sound + particles + flash on every state change" completed: logic events (doors, trapdoors, the exit, plate-wired mirrors), plates, receivers and crate landings each get a sound, sparks or dust and a device flash; C58's dust added to jumps and landings. Implementation defaults, open to the user's objection: no state-change feedback in the first ~1/3 s of a room (crates settling and doors that start powered aren't news); landings slower than 260 px/s (small hops) and crate settles under 120 px/s are silent; frequent sounds (jump, plates) are the quietest; a short "refused" sound joins the existing shake wherever the game says no; **M** toggles all sound, remembered on this browser, with a brief note in the corner.
- 2026-11-20 (Day 7 docs): `ASSETS.md`, the README instructions and the GDD reach their final shape. C74 allowed one OFL font; none was needed, since all text uses the browser's monospace font, so the build ships no font, image or audio file. The GDD's cut idea is the procedural Metroidvania world (C4, C5, reduced by C12), the one C82 candidate that a recorded decision actually cut. The GDD is checked at about 3¼ A4 pages; its Day 4 brief-change and playtest sections stay pending.
- 2026-11-20 (Day 7, Gates): Gates built (C104–C107). Implementation defaults, open to the user's objection:
  - A gate pass is checked once per physics step, from each body's centre on the previous step.
  - A jump of more than half a tile in one step (a put-down, a respawn, a reset) never counts as a crossing. This guard came from in-game testing, AI bug #34.
  - A crate beside the twin blocks the exit side like a wall. A crate in a Throw arc is not carried (no Gates chamber has Throw, G6).
  - Passing through plays its own sound with sparks at both gates in the pair's colour; wired pairs turning on or off play their own two-note sounds.
  - Pair colours: green, pink, pale yellow, light blue, always with the digit.
  - The 4 × 3 chamber select keeps every row on one screen by tightening the row spacing.
- 2026-11-20 (Day 7, Gates polish): C52/C58 applied to gates. Implementation defaults, open to the user's objection:
  - A pass shows an afterimage at both ends, a ring in the pair's colour and, for the player, a stretch. These are separate shapes, so no physics body is ever scaled.
  - A gate carrying light glows cyan.
  - A pass refused because the far side is blocked (G5) answers only the player: refuse sound, small shake, red outline on the blocked spot. Crates and enemies just pass the empty frame.
  - A crate parked beside a gate blocks only that exit side. Every gate in the three chambers can be entered from both sides, so this never traps the player.
- 2026-11-20 (Day 7, menu): C108 built. Implementation defaults, open to the user's objection:
  - The seals on the title use the colour of the mechanic whose Hard restores them: Weight amber, Light cyan, Gates green, Eclipse red | blue.
  - Shortcuts now live on their own screens: C (copy stats) and Delete (reset) on Options & tools, digits (seed) on Expedition.
  - Esc goes back one screen, and leaving for a chamber, a run or the test room returns to the screen it came from.
  - When more than three chambers are open, the Expedition screen lists all of them ("Deals three of: …"), because the seed picks which three.
  - Menu sounds: a soft tick on moving, a rise on opening, a fall on going back.
- 2026-11-21 (Day 7, rules from the user's play): C109–C111 built. Implementation defaults, open to the user's objection:
  - The exit gets a violet diamond lamp while enemies remain, and the corner says "N enemies left to defeat".
  - If an enemy that must be defeated falls 3+ tiles below its start in a chamber (P-M's guard in the chasm), the note adds "fell out of reach? hold R".
  - Clearing the last enemy plays the exit chord.
  - A beam hit plays a hurt sound with a red flash and a blink, then gives 1 s of grace for hearts only (the push back continues).
  - The Guard upgrade absorbs the first hit of either kind in a room.
  - The in-game controls line lists only the abilities the room's kit allows.
- 2026-11-21 (Day 7, runs): C112–C114 built. Implementation defaults, open to the user's objection:
  - "Rooms cleared" counts the rooms left behind, so the start room counts once you leave it, and the run summary counts the altar.
  - Endless levels are loops of 4 rooms (two combat rooms, a chamber, a reward). Only combat rooms get the tougher or faster enemies; a chamber is the same puzzle every time.
  - An endless run's best is recorded only when the hearts run out; leaving with Esc abandons it.
  - Endless starts with every ability, like Remix. Its seed is shown only with developer options.
  - The Expedition screen puts each mode's best on its button.
- 2026-11-23 (playtest fixes): C115 and C116 built. Implementation defaults, open to the user's objection:
  - The interact key is E only. Attacking no longer takes an upgrade, so a swing near a pedestal can't take one by accident.
  - The key cap shows only on a pedestal, the one interactable you stand on.
  - The HUD bars are 48 px on top and 26 px at the bottom. Chambers taller than the band between them (about 15.7 tiles) now scroll vertically.
  - The Endless swap always drops the oldest upgrade. The pedestal shows "− name" and the box above spells it out.
  - Offers are now seeded by a pick counter, so they keep changing after swaps.
  - Normal and Remix runs keep the old rules (no upgrade cap).
- 2026-11-23 (final delivery): no Day 4 brief-change email was received. At the user's request, the GDD's brief-change section was removed for the submission. The planned facilitated playtests became remote playtests (three testers, 2026-11-22).
- 2026-11-23 (ability unlock card): C117 built. Implementation defaults, open to the user's objection:
  - The card shows only on a first solve of a Medium (one per ability, ever). Its colour is that Medium's mechanic: amber Throw, cyan Bolt, red Dash.
  - It waits 0.7 s before E or Enter can close it, so a key still held from the chamber can't skip it. The key that closes it doesn't also act in the room.
  - The run's physics, its clock and the Remix timer are paused while it shows. Esc still opens the menu.
  - The new ability's upgrade can still be offered in that same reward room; the card has just announced the ability, and the pedestal says which ability it upgrades. **Confirmed by the user (2026-11-23): keep it.**
- 2026-11-23 (sharp rendering): C118 built. Implementation defaults, open to the user's objection:
  - The render scale is a whole number, so pixel edges stay even. It is the screen size times its pixel ratio over 1024 x 576, rounded up and capped at 3 (a 4K screen). It is picked once at start; a smaller window just shows the same canvas smaller.
  - The HUD (scrollFactor 0) has its own camera, so camera shakes, flashes and fades now touch only the world. The HUD stays steady and readable, even during the fade between rooms.
  - Dev builds take `?scale=1|2|3` to force a scale (a hidden test browser reports no screen size).
- 2026-11-23 (C119): implementation defaults, open to the user's objection:
  - The locked tiles can't be selected (arrows and the mouse skip them). They sit where the real Remix and Endless buttons appear after completion.
  - The card's top edge is 16 px under the HUD bar. In the reward room it ends about 87 px above the pedestal names.
- 2026-11-17 (Day 5): Docs refreshed and an automated docs check added (`tests/docs.test.ts`, C86). Historical sections that still said "awaiting user" now point to the confirmed decisions; a reading note at the top explains how proposals, decisions and revisions relate.
