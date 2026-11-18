# Game Design Document (working draft)

> Living draft (C86): kept in sync with `docs/design-decision-log.md` as features land, then trimmed to the required 2–4 pages on Day 7. Sections marked **TBD** depend on later work. "Seals" and all names are placeholders until a theme is chosen.

## Core loop
**On short, freshly assembled expeditions, fight, choose upgrades and solve handcrafted puzzle chambers to restore three seals, keeping every solved chamber and unlocked ability so each new run rearranges the world around harder puzzles that combine what you've mastered.**

A run is a short expedition (~10–15 min): start → combat room → puzzle chamber → upgrade pick, repeated for 2–3 chambers → exit.
- **Permanent progress:** solved chambers, abilities, seals.
- **Lost when the run ends:** upgrades, hearts.
- The game is complete when the three seals are restored.
- A level select opens any of the 9 chambers directly.

## Puzzle mechanics
Three mechanics share one **signal system**: inputs (plates, receivers, crystals) power outputs (doors, trapdoors, phase state, mirrors) through always-visible wires.

| Mechanic | Rule | What makes it interesting |
|---|---|---|
| **Weight** | A plate is active while something heavy (player, crate, enemy) rests on it | The player can't stand on a plate and walk through its door; carrying a crate lowers your jump |
| **Light** | Emitters fire straight beams; 2-position mirrors (flipped by attacking) redirect them; lit receivers power wires; beams block the player | Where the light goes is also where you can't walk |
| **Phase** | Red and blue blocks; only one colour is solid at a time; hitting a crystal swaps them | Where you stand when you swap matters, and the swap moves everything in the room |

The mechanics combine because each changes the others' rules:
- Crates and enemies block beams.
- Solid phase blocks block beams.
- A phase swap drops crates and enemies onto plates.
- Plates can flip mirrors.

### The nine chambers
| | Easy (teach) | Medium (deepen) | Hard (combine) |
|---|---|---|---|
| **Weight** | *First Weight:* a crate keeps a door open; carrying lowers your jump | *Borrowed Weight:* open a trapdoor as the walker crosses it; it drops onto the plate that opens the crate's door (grants **Throw**) | *Drop Delivery* (Weight × Phase): throw the crate in red, drop it onto its plate in blue |
| **Light** | *First Light:* flip mirrors to power doors; beams block paths | *Order of Light:* set the far mirror before the beam fills your path (grants **Bolt**) | *Chain Reaction* (Light × Weight): one Bolt opens a trapdoor; the caged walker drops onto a plate, a plate-locked mirror turns, and the beam reaches the exit |
| **Phase** | *First Phase:* swap colours from safe ground to cross | *Footing:* swap only from neutral footholds; your tower swaps have already dropped the bridge's guard into the chasm, so swap back to restore the bridge (grants **Dash**) | *Eclipse* (final, all three): light needs blue, the bridge needs red. Dash home through the dilemma |

## How solvability is ensured
- **Fixed movement metrics:** every layout is drawn in tiles against them (jump 3, gap 4, carrying 2/3, Throw 5, Dash 4). No upgrade can change them.
- **Every chamber declares its moves** and enforces them, so later abilities can't bypass a puzzle.
- **Layouts were drawn, then attacked for bypasses** before approval. Several were changed to close them (see the decision log).
- **Automated checks:**
  - A load-time validator checks grid sanity and wiring.
  - A logic enumerator tries every mirror/phase/plate combination and confirms the intended configuration lights the exit.
  - Each chamber stores its intended solution.
  - A reachability checker runs the real movement model against each grid ("can the player, carrying a crate or not, with or without Dash, get from here to there in this colour?"). It was added after the Day 1 drawings proved too optimistic about headroom; it caught unclimbable or dead-end layouts in W-H, L-M, L-H and P-H before they were built, and a melee-reach check proves the finale's high mirror can only be hit with Bolt.
  - The logic enumerator found no unintended solutions; the finale and L-M each have exactly one opening configuration (`docs/enumerator-report.md`).
- **Recovery:**
  - A free hold-R reset.
  - Pits are always escapable, in either colour. (P-E's pit got an extra crystal after a scripted playtest found a fall in Red had no way out.)
  - Crate dispensers recall stuck crates.
  - Doors never close on objects.
  - In an expedition, defeat costs a heart and resets only the current room; in level select it simply restarts the chamber.

## How difficulty scales
- **Teach → deepen → combine:** Easy isolates one idea and fails safely; Medium adds steps, order or a trap; Hard combines two mechanics across several sections.
- A prerequisite graph unlocks chambers in that order.
- Difficulty comes from **reasoning, not dexterity:** no timers, mirrors have only two positions, and the colour state is one bit per chamber.

## Platforming & combat
- **Movement:** responsive, with fast acceleration, variable jump, apex hang, coyote time and jump buffering; no wall jump. The metrics are proven by tests on the same movement code the game runs.
- **Abilities** (one from each Medium): **Throw** lands a crate exactly 5 tiles ahead; **Bolt** flies straight (forward or up) and hits the first target (any enemy in front of you, puzzle targets at chest height); **Dash** covers exactly 4 tiles with brief invulnerability.
- **Melee** hits forward and up (reach beyond contact range), with a 60 ms hit-stop, knockback, screen shake, flashes and sounds generated in code.
- **Hearts:** 3 per expedition; any enemy contact costs a heart and resets the room (beams only push you back); losing the last ends the run. Off in level select.
- **Enemies:**
  - The **Walker** (2 hits) patrols and turns at walls and at any gap, even an open trapdoor; it only falls when the floor vanishes under it.
  - The **Shieldbearer** (3 hits) blocks melee and Bolt from the front with a clang; strike its back, and it turns to face you after a telegraphed pause.
  - Beams kill any enemy; puzzle-chamber enemies respawn at their spawner, connector enemies stay down.
- **Combat rooms** reuse the puzzle systems: Gap run (ledge patrols over pits), Corridor (a Shieldbearer to jump), Shaft (a vertical climb), Red-floor arena (swap to drop the enemies) and Arena (the exit opens when it is cleared), each with three encounter tiers.

## Upgrades & replayability
- **After each chamber, pick 1 of 3 run upgrades:**
  - Combat: Heavy Swing, Long Reach, Shockwave, Shield Breaker, Piercing Bolt.
  - Survival: Mend, Guard, Phantom Dash.
  - Puzzle help: Insight, Throw Sight.
- Ability-specific upgrades appear only once the ability is owned.
- Hearts come back only by choosing Mend, so survival competes with power.
- Only Mend can be taken twice. Long Reach lengthens the swing against enemies only, so every puzzle keeps the reach it was designed for.
- **Replay comes from:**
  - Seeded layouts (the seed is shown and replayable).
  - Different chambers dealt each run.
  - Encounters that scale with progress.
  - Upgrade combinations.
  - Remix expeditions after completion.

## Schedule & why it was reordered
- Hard chambers combine mechanics, and enemies are puzzle pieces, so all three mechanic systems and basic enemy movement are built across Days 2–3 instead of "one mechanic per day". Combat behaviour stays on Day 4.
- Day 1 was spent entirely on design (all layouts were drawn as text grids before coding).
- **Actual so far:** Day 2 built the foundations and all three Weight chambers plus P-E and P-M (ahead of plan); Day 3 the Light system, L-E, L-M and Bolt; Day 4 L-H, Dash, the finale P-H, combat and the logic enumerator; Day 5 the expedition rooms, the ten upgrades, permanent progress and save, the seeded run generator and expedition loop, and playtest telemetry. Playing each chamber as it was built exposed headroom and dead-end errors in the Day 1 drawings, so a reachability checker was added on Day 2 and every later chamber was checked before it was built. **TBD:** Days 6–7.

## Day 4 brief change
**TBD:** the change, its impact and how it was handled.

## Playtesting & iteration
**TBD:** three players; top issues; at least one before/after with numbers from the built-in telemetry.

## One idea we cut, and why
**TBD (proposed):** the fully procedural Metroidvania world. With no artist and limited level-design capacity, it would have needed ~15–20 extra hand-built rooms for a 5% category. We kept a thin generator that only arranges authored rooms, so puzzle quality got the time instead.
