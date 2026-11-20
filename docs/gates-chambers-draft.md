# Gates: the fourth mechanic

**Approved 2026-11-20 (C106 rules, C107 layouts).** Built, entered as data (`src/data/chambers/G-*.ts`) and solved end to end in the real game. Claude drafts, the user decides (C13). Decided first:
- **C104:** a fourth mechanic, Gates, with its own Easy, Medium and Hard: 12 chambers in total. This is our own addition, not the Day 4 brief change.
- **C105:** the Gates Hard restores a fourth seal and becomes one more prerequisite of Eclipse, which stays the final chamber (its tested layout is untouched). The Gates Medium grants no ability.

Below: the gate rules (C106) and the three layouts (C107), as approved. All three passed the parser, the validator, the logic enumerator and the reachability checker before approval.

## Gate rules (C106)
- **G1 Shape:** a gate is a frame one cell wide and two cells tall, drawn as the same digit in two stacked cells. The same digit drawn twice is a linked pair (`1` with `1`, `2` with `2`). Gates are never solid.
- **G2 Bodies:** when the centre of a body crosses a gate's centre line moving sideways, it comes out **beside the twin, on the side it was heading to**, at the same height and with the same speed. A body is the player (a carried crate goes along), a crate, a walker or a Shieldbearer.
  - So the side you walk in from decides the side you come out of.
  - Coming out over a drop means falling.
- **G3 Light:** a sideways beam entering a gate leaves the twin's matching cell, going the same way. Vertical beams pass gates as if they were air.
- **G4 Signals:** an unwired pair is always on. A wired pair is on only while powered (OR logic, like doors); when off, a gate is an empty frame that things pass straight through.
- **G5 Blocked exit:** a body needs both cells beside the twin clear on its exit side; otherwise the gate doesn't carry it and acts as an empty frame. A beam needs only its own row clear.
  - This allows a **light slot**: one open row next to a gate lets a beam through but no body.
- **G6 Kit:** all three Gates chambers use the base kit (move, jump, attack, carry). Throw, Bolt and Dash are refused inside them (C14), so no ability ever has to be defined through a gate.

**Feedback (C52):** each pair has its own colour and digit. Passing through makes a sound plus sparks at both gates. A wired pair's frame lights up while it is on, and dims to an outline while it is off.

## Progression (from C105)
| | Easy | Medium | Hard |
|---|---|---|---|
| **Gates** | **G-E First Gate** (no prerequisites) | **G-M Gatekeeper** (needs G-E; grants nothing) | **G-H Handover** (Gates × Light; needs G-M + L-E; **seal 3**) |

- Eclipse (P-H) becomes **seal 4** and needs P-M + W-H + L-H + **G-H**. The final chamber is still "the one with the last seal".
- Chamber select becomes a 4 × 3 grid (Gates as a fourth row). Expeditions still deal up to three chambers per run, so about five runs cover all twelve.
- The loop sentence's "three seals" becomes "four seals".

## Legend additions
`1`–`9` gate (two stacked cells; the same digit twice = a linked pair). Everything else is the existing legend: `#` solid, `.` air, `S` start, `D` entry door, `E` exit, lowercase = plate (on the tile below), `C` crate, `w` walker, `v` emitter firing down, `\` mirror, `o` receiver.

## G-E "First Gate" (Easy: teach)
**Teaches:** what goes into one gate comes out of the other, both ways, carrying a crate too.

```
############################
#.............##...........#
#.............##...........#
#.............##...........#
D.........1...##...1.......E
DS...a....1...##...1...C...E
############################
```
28 × 7. Wire: `a → exit`.

**Solution:**
1. The exit is behind a wall that reaches the ceiling, and the only crate is on that side too.
2. Walk into gate 1; you come out of its twin, beside the crate.
3. Pick up the crate and walk back into the twin; you come out of the first gate.
4. Put the crate on `a`. The exit (on the far side) opens. Walk through the gate once more and out.

**Fails safely:** no pits, so the crate can't be lost. Standing on `a` lights the exit lamp, which hints that the plate is the key, but the exit is on the other side of the wall.

**Checked:**
- The far side is reachable only through gate 1, also while carrying.
- The exit opens only with `a` pressed.

## G-M "Gatekeeper" (Medium: deepen)
**Teaches:** gates carry enemies too, and a plate can turn a gate pair on. The walker becomes the weight that keeps your gate open.

```
##############################
##############################
###....2.###.2.###############
###.w..2.###.2.###############
############a#a###############
##############################
#.................##.........#
#.................##.........#
#.................##.........#
D..............1..##.1.......E
DS.C...c.......1..##.1.x.....E
##############################
```
30 × 12. Wires: `c → gate 2`, `a → gate 1`, `x → exit`.

**What you see:**
- The walker paces a sealed pen in the ceiling, past gate 2.
- Gate 2's twin stands on a pillar between two slots, and both slots hold plate `a`. So whichever way the walker walks in, it drops onto `a`.

**Solution:**
1. Stand on `c` (or put the crate on it). Gate pair 2 turns on, and the next time the walker paces through gate 2 it drops onto `a`.
2. Plate `a` turns gate pair 1 on for good, since the walker can't leave its slot.
3. Carry the crate through gate 1 into the sealed room.
4. Put the crate on `x`; the exit opens.

**Order:** the walker must be delivered before the crate can cross. Putting the crate on `c` and then walking through gate 1 empty-handed only shows you that you need the crate. Gate 1 stays on, so you can always go back for it.

**Fails safely:** the player can never enter the pen or the drop box (checked), and nothing can be lost.

**Checked:**
- The sealed room is reachable only through gate 1, also while carrying.
- The player's reachable floor never includes the pen or the slots.
- The exit opens only with `x` pressed.

## G-H "Handover" (Hard: Gates × Light)
**Teaches:** light goes through gates as well, so one beam can't power two things at once. A crate takes over the receiver's job.

```
########v#######################
#..............######..........#
#..............######..........#
#..............######..........#
#..............######..........#
#..............######..........#
#..............######..........#
#..............######..........#
#..............######..........#
o.......\.......1##1...........o
D...........2..#1##1#..2.......E
DS..p.......2..######..2...C...E
################################
```
32 × 13. Names: `Ma` = the mirror at row 9, col 8; `r1` = the receiver on the left wall; `r2` = the receiver on the right wall. Wires: `r1 OR p → gate 2`, `r2 → exit`.

**What you see:**
- The emitter in the ceiling fires down onto mirror Ma, which you can hit with an up-attack from the floor.
- Ma `/` sends the beam left into `r1`, which powers gate 2.
- Ma `\` sends it right, through a light slot into gate 1. It leaves the twin in the sealed room and lights `r2`, which opens the exit.
- Gate 1 has only light slots beside it, so it carries light but never you (G5).
- At the start Ma is `\`: the exit is open but out of reach, and gate 2 is off.

**Solution:**
1. Hit Ma: the beam turns into `r1` and gate 2 turns on.
2. Walk through gate 2 into the sealed room and carry the crate back through it.
3. Put the crate on `p`. Gate 2 now has a second power source.
4. Hit Ma again: the beam goes through gate 1 and lights `r2`, so the exit opens, and the crate keeps gate 2 on.
5. Walk through gate 2 and out.

**The dilemma:** one beam can power either the gate or the exit, never both. The crate is the only other thing that can power gate 2, and it starts on the wrong side.

**Fails safely:** mirrors toggle, so every state can be undone, and nothing can be lost.

**Checked:**
- The sealed room is reachable only through gate 2, also while carrying. Gate 1 never carries the player.
- The up-attack from the floor reaches Ma.
- The exit opens only with Ma at `\` (the enumerator lists both plate states). Being inside with the exit open requires the crate on `p`.

## Built (2026-11-20)
- **Game layer:** gates drawn with a pair colour and digit, a rising shimmer while on and a dim outline while off. Bodies and beams pass through them.
  - A pass plays a sound, with sparks at both gates, afterimages at both ends, a ring and a stretch on the player.
  - Gates carrying light glow cyan.
  - A refused pass answers with the refuse sound and marks what blocks it.
- **Data and regression tests:** routes and the up-swing to Ma are pinned in `tests/core/reach.test.ts`, and the intended states are in the enumerator test.
- **Progression:** seal 4, and Eclipse needs G-H. Chamber select is now 4 × 3; about five winning runs cover all twelve chambers.
- **Solved end to end in the real game** with scripted input:
  - G-E: the crate is fetched through gate 1 and back.
  - G-M: the walker is delivered onto `a` about 1 s after `c` is pressed, and stays there.
  - G-H: the beam goes through gate 1 to `r2` while the crate on `p` holds gate 2 on.
