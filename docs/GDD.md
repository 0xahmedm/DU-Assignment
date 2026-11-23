# Game Design Document: Seal Chambers

> Final (submitted). Decision ids (C…) point to the reasoning in [`design-decision-log.md`](design-decision-log.md). All names are placeholders.

## Core loop
**On short, freshly assembled expeditions, fight, choose upgrades and solve handcrafted puzzle chambers to restore four seals, keeping every solved chamber and unlocked ability so each new run rearranges the world around harder puzzles that combine what you've mastered.**

- **A run** takes about 20–25 minutes over up to 18 rooms: Start → [two combat rooms → puzzle chamber → pick 1 of 3 upgrades] × up to 4 → Seal exit (C112). The HUD counts rooms cleared, never the rooms left. Runs are seeded; testers can see and replay a seed (C114).
- **Kept between runs:** solved chambers, abilities, seals. **Lost when a run ends:** hearts and upgrades.
- **Completion:** the game is complete when all four seals are restored. After that come timed **Remix** runs (any four chambers, hardest encounters, best time kept) and **Endless** runs: rooms keep coming, the fighting gets harder every loop, and the score is rooms cleared before the hearts run out (C113).
- **Chamber select** opens any of the twelve chambers directly.

## Puzzle mechanics
Four mechanics share one **signal system**. Inputs (plates, receivers, crystals) power outputs (doors, trapdoors, phase state, mirrors, gates) through always-visible dashed wires. While a wire is powered, its dashes travel toward the target, so a wire never looks like a beam.

| Mechanic | Rule | What makes it interesting |
|---|---|---|
| **Weight** | A plate is active while something heavy (player, crate, enemy) rests on it | You can't stand on a plate and walk through its door; carrying a crate lowers your jump |
| **Light** | Emitters fire straight beams; 2-position mirrors (flipped by attacking) redirect them; lit receivers power wires; beams block the player | Where the light goes is also where you can't walk |
| **Phase** | Red and blue blocks; only one colour is solid at a time; hitting a crystal swaps them | Where you stand when you swap matters, and the swap moves everything in the room |
| **Gates** (added Day 7, C104) | Two linked frames: whatever walks or shines into one (you, a crate, an enemy, a beam) comes out of the other, the same way; wired pairs work only while powered | Gates join sealed spaces, and the side you walk in from decides the side you come out of |

They combine because each one changes the others' rules: crates, enemies and solid phase blocks stop beams, a phase swap drops crates and enemies onto plates, plates turn mirrors and gates, and beams, crates and enemies all travel through gates.

| | Easy (teach) | Medium (deepen) | Hard (combine) |
|---|---|---|---|
| **Weight** | *First Weight:* a crate keeps a door open; carrying lowers your jump | *Borrowed Weight:* open a trapdoor as the walker crosses it, and it drops onto the plate for the crate's door (grants **Throw**) | *Drop Delivery* (Weight × Phase): throw the crate in red, drop it onto its plate in blue |
| **Light** | *First Light:* flip mirrors to power doors; beams block paths and hurt | *Order of Light:* set the far mirror before the beam fills your path (grants **Bolt**) | *Chain Reaction* (Light × Weight): one Bolt opens a trapdoor, the caged walker drops onto a plate, a plate-locked mirror turns and the beam reaches the exit |
| **Phase** | *First Phase:* swap colours from safe ground to cross | *Footing:* swap only from neutral footholds, then defeat the bridge's Shieldbearer from behind; swapping the bridge away drops it out of reach (grants **Dash**) | *Eclipse* (the final chamber, all three): the light needs blue and the bridge needs red, so Dash home through the dilemma |
| **Gates** | *First Gate:* fetch a crate from behind a wall through a gate, both ways | *Gatekeeper:* open a gate for the walker; it drops onto the plate that keeps your own gate open | *Handover* (Gates × Light): one beam can power your gate or the exit, never both, so a crate takes over the gate's job |

## How solvability is ensured
- **Fixed movement metrics:** every layout is drawn against jump 3, gap 4, carrying 2 / 3, Throw 5 and Dash 4. No upgrade changes them, and tests measure them on the game's own movement code.
- **Each chamber enforces its declared kit**, so a later ability can't bypass an earlier puzzle. Every layout was drawn as a text grid and searched for bypasses before approval.
- **Automated checks:**
  - A load-time **validator** checks grid sanity and wiring.
  - A **logic enumerator** tries every mirror × phase × plate combination: each chamber's intended end state opens its exit, and no unintended solution exists.
  - A **reachability checker** runs the real movement model on each grid (carrying or not, with or without Dash, in each colour). Added when the Day 1 drawings proved too optimistic about headroom, it caught unclimbable or dead-end layouts in four chambers before they were built.
- **Recovery:** a free hold-R reset; every pit can be escaped in either colour; dispensers recall stuck crates; doors never close on anything.

## How difficulty scales
- **Teach → deepen → combine:** Easy isolates one idea and fails safely; Medium adds steps, order or a trap; Hard combines two mechanics across several sections.
- A **prerequisite graph** unlocks chambers in that order, and each run deals the easiest unlocked chambers first.
- Difficulty comes from **reasoning, not dexterity:** there are no timers, mirrors have two positions and the colour is one bit per chamber.
- Combat rises separately: encounters have three tiers that follow your progress.

## Platforming & combat
- **Movement** has fast acceleration, a variable jump with apex hang, coyote time and jump buffering, and no wall jump (it would break the metrics).
- **Abilities** (from the Weight, Light and Phase Mediums, each announced by an unlock card with its key, C117): **Throw** lands a crate exactly 5 tiles ahead; **Bolt** flies straight and hits the first target (any enemy in front of you, or a puzzle target at chest height); **Dash** covers exactly 4 tiles with brief invulnerability.
- **Melee** hits forward and up, with a 60 ms hit-stop, knockback, shake and flash. Every puzzle state change and every action has its own generated sound and particles, so a chain reaction can be followed by ear.
- **Exits** open when the room's puzzle is solved and its enemies are defeated; a walker the puzzle needs on a plate may stay (C109).
- **Hearts:** 3 per expedition. Enemy contact costs one and restarts the room; a beam hit costs one and pushes you back (C110). Losing the last ends the run. Chamber select gives 3 per attempt for beam hits.
- **Enemies:** the **Walker** (2 hits) turns at walls and gaps, even an open trapdoor, and falls only when the floor vanishes under it. The **Shieldbearer** (3 hits) blocks melee and Bolt from the front; strike its back, and it turns after a telegraphed pause. Beams kill any enemy.
- **Combat rooms** reuse the puzzle systems: Gap run, Corridor, Shaft, Red-floor arena (swap to drop the enemies) and Arena; each opens once its enemies are defeated.

## Upgrades & replayability
- **After each chamber, pick 1 of 3 run upgrades:** combat (Heavy Swing, Long Reach, Shockwave, Shield Breaker, Piercing Bolt), survival (Mend, Guard, Phantom Dash) or puzzle help (Insight shows where a mirror flip would send the beam; Throw Sight). Ability upgrades appear only once you own the ability.
- Hearts return only through Mend, so survival competes with power. Upgrades never touch the puzzle metrics: Long Reach, for example, lengthens the swing against enemies only.
- **Replay comes from** seeded runs, different chambers dealt each run, encounters that scale, upgrade combinations, timed Remix runs and the Endless best.

## Schedule & why it was reordered
- **Day 1 was design only.** All 9 chambers were drawn as text grids before any code.
- **No "one mechanic per day".** Hard chambers combine mechanics and enemies are puzzle pieces, so all three mechanic systems and basic enemy movement were built first (Days 2–3). Combat behaviour came on Day 4, once every chamber that uses enemies existed.
- **Actual schedule:**
  - Day 2: foundations, the Weight chambers, First Phase and Footing.
  - Day 3: the Light system, First Light, Order of Light, Bolt.
  - Day 4: Chain Reaction, Dash, the finale, combat, the enumerator.
  - Day 5: rooms, upgrades, save, the generator, the expedition loop, telemetry.
  - Day 6: the playtest kit, clarity fixes (dashed wires, centred small chambers), the Remix timer.
  - Day 7: the feedback and sound polish pass, these documents and, with the time left, a fourth mechanic: Gates and its three chambers, built on the same pipeline (drafted as grids, checked by every tool, approved, then solved in the game).
- **The payoff:** all nine chambers were playable by Day 4, so the expedition loop on Day 5 only had to arrange finished pieces. Playing each chamber as it was built exposed the Day 1 headroom errors early, and that is why the reachability checker exists.

## Playtesting & iteration
Three new players tested a zip of the game remotely ([summary](playtests/playtest-summary.md)). The built-in stats came from one of them: 103 attempts, with W-H as the slowest puzzle (11:08 first solve, after two abandoned attempts).
- **Top issues, all fixed:**
  - One tester couldn't see how to take an upgrade, so taking one moved to **E**, with a key cap over the player.
  - Standing on a crate stuttered: **39** standing/falling flips in 2 s, now **0**.
  - HUD text covered the game, so the HUD moved into opaque bars.
  - Endless got easy once every upgrade was owned (one run went about 39 rooms). Now you hold at most 4 upgrades and swap the oldest, and enemies gain a hit every level (**+4** hits at that depth before, **+8** now; C115, C116).
- **Watched next:** W-H's readability and W-M's walker (7 defeats).

## One idea we cut, and why
**The fully procedural Metroidvania world.** The original vision generated an explorable, ability-gated world around the chambers each run (C4, C5). On 2026-11-12, with no artist and limited level-design capacity, it was reduced to lean expeditions (C12). The full version needed about 15–20 more hand-built rooms for a 5% category, and that time would have come out of puzzle quality. What survived is a thin seeded generator that arranges authored rooms, plus permanent abilities that open harder chambers. Two later cuts followed the agreed cut order (C78): the Spitter enemy and ability-gated side rooms.
