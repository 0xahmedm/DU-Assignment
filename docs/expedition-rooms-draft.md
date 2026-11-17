# Expedition rooms (Day 5)

**Approved 2026-11-17 (C101, C102).** Claude drafted, the user decided (C13). The grids are in `src/data/rooms/expedition.ts`, with tests in `tests/core/rooms.test.ts`.

**Run (C12, C80):** Start → [connector → chamber → reward pick] × N → Exit.

## Shared rules

**Already approved, applied as written:**
- Base kit only for traversal; owned abilities may help.
- Contact with an enemy costs a heart (C55).
- Walkers only at first; Shieldbearers after the first Medium (C70).

**New rules, for approval:**
- **R1:** enemies in connectors **do not respawn.** Respawning stays a puzzle-chamber rule (W-M, L-H).
- **R2:** connector exits are **always open**. Enemies are obstacles: you can fight them or avoid them. The exception is the **Arena**, whose exit opens when every enemy is defeated.
- **R3 (reward room):** three pedestals each show an upgrade.
  - Taking one: stand on a pedestal (its name and effect appear) and press attack.
  - Afterwards the other two fade and the exit opens.
- **R4 (encounter tiers):** each connector stores its enemy placements per tier (T1/T2/T3), and the run picks the tier.
  - **T1:** no chamber solved yet, or only Easys.
  - **T2:** at least one Medium solved.
  - **T3:** a Hard solved, or the run is a Remix (C71).
  - The grids below show T2.

All grids are checked:
- **Parser and validator:** clean.
- **Reachability checker (base kit):** every room can be crossed from entry to exit, and every pit can be climbed out of.

---

## Start (24×12)
A calm room: the seed is shown in the HUD (C72).

```
########################
#......................#
#......................#
#......................#
#......................#
#......................#
#......................#
#......................#
#......................#
#......................E
#S.....................E
########################
```

## Reward (20×12)
Pedestals `1`, `2` and `3` (R3).

```
####################
#..................#
#..................#
#..................#
#..................#
#..................#
#..................#
#..................#
#..................#
D..................E
DS....1...2...3....E
####################
```

## Exit (16×12)
Altar `X`: reaching it ends the run (summary: chambers, time, hearts, seed).

```
################
#..............#
#..............#
#..............#
#..............#
#..............#
#..............#
#..............#
#..............#
D..............#
DS.....X.......#
################
```

---

## Connector 1: Gap run (32×15)
Ledge patrols over pits (C61):
- **Pits:** four, each 3 wide and 3 deep (a fall is escapable).
- **Ledges:** walkers patrol the ledges between pits and turn at each ledge.
- **Ways through:** time your jumps, or knock a walker into a pit (a hit pushes it about a tile).

```
################################
#..............................#
#..............................#
#..............................#
#..............................#
#..............................#
#..............................#
#..............................#
#..............................#
D..............................E
DS......w......w......w........E
####...####...####...#####...###
####...####...####...#####...###
####...####...####...#####...###
################################
```

| Tier | Enemies |
|---|---|
| T1 | 2 walkers (first two ledges) |
| T2 | 3 walkers (shown) |
| T3 | 2 walkers + a Shieldbearer on the third ledge |

## Connector 2: Corridor (32×8)
A Shieldbearer in a corridor (C61):
- **Height:** the corridor is 5 tiles high, just enough to jump over a Shieldbearer.
- **Ways through:** jump it and run, or strike its back. It turns after a telegraphed pause.

```
################################
################################
#..............................#
#..............................#
#..............................#
D..............................E
DS...........H.................E
################################
```

| Tier | Enemies |
|---|---|
| T1 | 1 walker in its place |
| T2 | 1 Shieldbearer (shown) |
| T3 | 1 Shieldbearer + 1 walker |

## Connector 3: Shaft (10×20)
A vertical climb, using the alternating 3-high steps proven on L-H (C98):
- **Steps:** the climb goes up from the bottom-left entry.
- **Top:** the last hop goes through the gap in the top floor to the exit.

```
##########
#........#
#........E
#........E
#..#######
#........#
#........#
###......#
#........#
#........#
#....##..#
#........#
#........#
###......#
#........#
#........#
#....##..#
D........#
DS.......#
##########
```

| Tier | Enemies |
|---|---|
| T1 | none (traversal) |
| T2 | 1 walker pacing a 2-wide step: time the hop, or strike it from below |
| T3 | walkers on two steps |

## Connector 4: Red-floor arena (32×15)
Red floor and a crystal (C61):
- **Layout:** walkers patrol a long red floor between low bumpers.
- **The swap:** hit the crystal (by the entrance) to swap to blue, and they drop into a 2-deep pit. Swap back to red to walk across.
- **Riskier route:** in blue you can also drop into the pit yourself and climb out the far side, past the fallen walkers. The checker confirms both routes. I'm keeping it as a combat option.
- **Pit exit side:** a fall into the pit in blue climbs out on the exit side only (the left bumper sits right on the pit's edge). It's never a dead end; it just doesn't lead back to the crystal.

```
################################
#..............................#
#..............................#
#..............................#
#..............................#
#..............................#
#..............................#
#..............................#
#..............................#
D....*.........................E
DS..#....w.......w.......w..#..E
#####RRRRRRRRRRRRRRRRRRRRRR#####
#####......................#####
#####......................#####
################################
```

| Tier | Enemies |
|---|---|
| T1 | 2 walkers |
| T2 | 3 walkers (shown) |
| T3 | 2 walkers + a Shieldbearer |

## Connector 5: Arena (32×12)
A flat arena with two 3-high refuge platforms. The exit opens when every enemy is defeated (R2).

```
################################
#..............................#
#..............................#
#..............................#
#..............................#
#..............................#
#..............................#
#..............................#
#..........##......##..........#
D..............................E
DS........w.......w.......H....E
################################
```

| Tier | Enemies |
|---|---|
| T1 | 2 walkers |
| T2 | 2 walkers + a Shieldbearer (shown) |
| T3 | 3 walkers + a Shieldbearer |

---

## Not in this batch
- **Beam arena (C61 example).** Every layout I tried either kills the enemies at the start or puts the beam across the player's own path. I'd leave it out: C12 asks for 5–6 connectors, and 5 are here. I can revisit it if there's time.
- **Side rooms (C69):** pre-cut (C80).
