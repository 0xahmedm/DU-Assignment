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
| **Weight** | *First Weight:* a crate keeps a door open; carrying lowers your jump | *Borrowed Weight:* trap an enemy on a plate so you can fetch the crate (grants **Throw**) | *Drop Delivery* (Weight × Phase): throw the crate in red, drop it onto its plate in blue |
| **Light** | *First Light:* flip mirrors to power doors; beams block paths | *Order of Light:* set the far mirror before the beam fills your path (grants **Bolt**) | *Chain Reaction* (Light × Weight): one Bolt triggers enemy → plate → mirror → exit |
| **Phase** | *First Phase:* swap colours from safe ground to cross | *Footing:* swap only from neutral footholds; the swap drops the enemy guarding the bridge (grants **Dash**) | *Eclipse* (final, all three): light needs blue, the bridge needs red. Dash home through the dilemma |

## How solvability is ensured
- **Fixed movement metrics:** every layout is drawn in tiles against them (jump 3, gap 4, carrying 2/3, Throw 5, Dash 4). No upgrade can change them.
- **Every chamber declares its moves** and enforces them, so later abilities can't bypass a puzzle.
- **Layouts were drawn, then attacked for bypasses** before approval. Several were changed to close them (see the decision log).
- **Automated checks:**
  - A load-time validator checks grid sanity and wiring.
  - A logic enumerator tries every mirror/phase/plate combination and confirms the intended configuration lights the exit.
  - Each chamber stores its intended solution.
- **Recovery:**
  - A free hold-R reset.
  - Pits are always escapable, in either colour. (P-E's pit got an extra crystal after a scripted playtest found a fall in Red had no way out.)
  - Crate dispensers recall stuck crates.
  - Doors never close on objects.
  - Defeat costs a heart and resets only the current room.

## How difficulty scales
- **Teach → deepen → combine:** Easy isolates one idea and fails safely; Medium adds steps, order or a trap; Hard combines two mechanics across several sections.
- A prerequisite graph unlocks chambers in that order.
- Difficulty comes from **reasoning, not dexterity:** no timers, mirrors have only two positions, and the colour state is one bit per chamber.

## Platforming & combat
- **Movement:** responsive, with fast acceleration, variable jump, apex hang, coyote time and jump buffering; no wall jump.
- **Melee** hits forward and up, with hit-stop, knockback and screen shake.
- **Hearts:** 3 per run; any hit or enemy contact costs a heart and resets the room; losing the last ends the run.
- **Enemies:**
  - The **Walker** patrols and turns at ledges (knock it off ledges, into beams, or drop it with a swap).
  - The **Shieldbearer** is immune from the front (jump over it and strike its back, or use the environment).
- **Combat rooms** reuse the puzzle systems (ledges over pits, phase arenas, beam arenas).
- **Dash** grants brief invulnerability.

## Upgrades & replayability
- **After each chamber, pick 1 of 3 run upgrades:**
  - Combat: Heavy Swing, Long Reach, Shockwave, Shield Breaker, Piercing Bolt.
  - Survival: Mend, Guard, Phantom Dash.
  - Puzzle help: Insight, Throw Sight.
- Ability-specific upgrades appear only once the ability is owned.
- Hearts come back only by choosing Mend, so survival competes with power.
- **Replay comes from:**
  - Seeded layouts (the seed is shown and replayable).
  - Different chambers dealt each run.
  - Encounters that scale with progress.
  - Upgrade combinations.
  - Remix expeditions after completion.

## Schedule & why it was reordered
- Hard chambers combine mechanics, and enemies are puzzle pieces, so all three mechanic systems and basic enemy movement are built across Days 2–3 instead of "one mechanic per day". Combat behaviour stays on Day 4.
- Day 1 was spent entirely on design (all layouts were drawn as text grids before coding).
- **TBD:** final account of actual vs planned.

## Day 4 brief change
**TBD:** the change, its impact and how it was handled.

## Playtesting & iteration
**TBD:** three players; top issues; at least one before/after with numbers from the built-in telemetry.

## One idea we cut, and why
**TBD (proposed):** the fully procedural Metroidvania world. With no artist and limited level-design capacity, it would have needed ~15–20 extra hand-built rooms for a 5% category. We kept a thin generator that only arranges authored rooms, so puzzle quality got the time instead.
