# Playtest session script

How to run one playtest session (C81, decision-log Point 8). Three people who have never seen the game, one session each, about 20 minutes. Write the notes in a copy of [notes-template.md](notes-template.md) named `playtest-1.md`, `playtest-2.md`, `playtest-3.md` in this folder.

The goal is to watch, not to teach: every hint you give hides a problem we need to find.

---

## 1. Before the tester arrives (5 min)

- [ ] **Build:** open https://0xahmedm.github.io/DU-Assignment/ (or the single-file build). Write the date and the latest commit (from GitHub) in the notes.
- [ ] **Fresh start:** in the menu, press **Delete** twice (erases progress), then click **[clear]** twice next to "Playtest stats" (erases the previous tester's numbers). The menu should read `Seals ○○○ · Abilities: none · Solved 0/9` and `Playtest stats: 0 attempts`.
- [ ] **Recording:** start a screen + voice recording (Xbox Game Bar: **Win + Alt + R**; or OBS). Ask for consent first, and note it.
- [ ] **Controls card:** put the card below where the tester can see it. The game shows its menu keys and "hold R: reset / Esc: menu", but not the movement keys.
- [ ] **Rotation:** look up this tester's Medium and Hard in the table in section 3.

### Controls card (print or show on a second screen)

| Action | Keys |
|---|---|
| Move | ← → or A / D |
| Jump (hold = higher) | Space or Z |
| Aim up (up-attack / up-Bolt) | ↑ or W |
| Attack (also flips mirrors, hits crystals) | X or J |
| Pick up / put down crate | C or K |
| Throw (when the chamber allows it) | V or L |
| Bolt (when the chamber allows it) | F or I |
| Dash (when the chamber allows it) | Shift or O |
| Reset the chamber | hold R |
| Menu | Esc |

---

## 2. What to say (read it out)

> Thanks for helping. This is a prototype of a puzzle platformer, and I'm testing the game, not you: if something is confusing, that's the game's fault and exactly what I need to find.
>
> Please **think out loud**: say what you're looking at, what you think something does, what you're trying. I'll mostly stay quiet; if you ask me something I might answer "what do you think?". That's on purpose.
>
> You can reset a room any time by holding R. Each room has one way out. Ready?

---

## 3. The session

| # | What | How to open it | Time cap |
|---|---|---|---|
| 1 | **W-E** First Weight | Chamber select, top-left | 3 min |
| 2 | **L-E** First Light | Chamber select | 3 min |
| 3 | **P-E** First Phase | Chamber select | 3 min |
| 4 | **The tester's Medium** (table below) | Chamber select | 5 min |
| 5 | 30 s in the **Movement test room** to try the ability the Hard uses | Menu → Movement test room | 0.5 min |
| 6 | **The tester's Hard** | Chamber select | 7 min |
| 7 | **One expedition run**, seed **42** | Menu → Replay seed: type `42`, Enter | 8 min |
| 8 | Questions (section 6) and copy the stats | Esc → menu, press **C** | 3 min |

**Rotation**, so the three sessions cover all nine chambers between them:

| Tester | Medium | Ability to try in the test room | Hard |
|---|---|---|---|
| 1 | W-M Borrowed Weight | Throw (V) | W-H Drop Delivery |
| 2 | L-M Order of Light | Bolt (F; ↑ + F shoots up) | L-H Chain Reaction |
| 3 | P-M Footing | Bolt (F) and Dash (Shift) | P-H Eclipse |

**Timing:** aim for about 20 minutes (the plan said ~15; the expedition run takes longer now). If you pass 20 minutes, end the run after its first reward room. The expedition starts from a fresh save, so it deals W-E, L-E and P-E again: that's fine, it tests the combat rooms, the rewards, hearts and the flow, and it shows how much faster the Easys go the second time.

---

## 4. Rules while they play

- **Stuck** = no new idea or progress for **60 seconds**. Write down the time and what they were trying.
- **No hints for 2 minutes after they get stuck.** Then use the hint ladder, one step at a time, and note each step you used:
  1. Ask: "What do you think *that* does?" (point at nothing, just ask)
  2. Point at the element that matters (the plate, the mirror, the crystal).
  3. Say the next step.
- **Time cap reached:** say "Let's move on, that's really useful", mark the chamber "not solved", and open the next one.
- **Questions about the rules:** answer with a question ("What would you expect?"). Answer controls questions straight away (that's the card's job, not the puzzle's).
- **Write down quotes**, especially surprise, frustration and "oh!" moments, with the time.
- Don't help with combat either; enemy contact costs a heart in the run, and that's data.

---

## 5. What to watch for

Each chamber's intended feeling (from the chamber data) and its key moment. Note whether and when the tester gets there.

| Chamber | Intended feeling | Key moment to watch | Known risk to check |
|---|---|---|---|
| W-E | "A plate opens a door, but only while something heavy stays on it", then "carrying makes me weaker" | Fetching the crate after the door closes behind them; finding the walkway in B when the plateau is too high while carrying | — |
| L-E | "Light goes where I point it, and where light goes I cannot walk" | First up-attack on the mirror; understanding the beam barrier in B is solved by the mirror, not by force | Wires were made dashed before the playtests (they used to look like thin beams): does anyone still mistake a wire for a beam? |
| P-E | "The outlines show what the other colour would give me", then "don't stand on the colour you're about to remove" | Reading the outlined blocks before the first swap; recovering from the pit | — |
| W-M | "The enemy is my second weight" | Timing plate `s` so the walker drops onto `t` | — |
| L-M | "Set the far mirror before the light fills the path": planning the order, not the aim | Going for M3 first; noticing the walkway fill up when M1 is set early | M1 can only be hit from the small step's right half or with a jump-attack (reach 1.3 tiles is just enough) |
| P-M | "Where I stand when I swap matters", then "the swap reshapes the room for everyone in it" | Using the neutral nubs instead of the platform under the crystal; dropping the Shieldbearer into the chasm | — |
| W-H | "Throw in Red, drop in Blue" | Planning the delivery onto the red platform; the final swap dropping the crate onto `x` | — |
| L-H | "One shot, and everything I prepared falls into place" | Placing the crate on `a` *before* the Bolt; watching the chain run | Bolting first fences the `a` step (undo exists but is hard to see) |
| P-H | "Light needs Blue, the bridge needs Red", resolved by an earned ability | The up-Bolt in Red; the jump + Dash across the chasm at the end | — |

**In the expedition**, watch for:
- Do they understand hearts (any enemy touch costs one; beams only push)?
- Do they read the upgrade offers, and why do they pick what they pick?
- Do they notice the seed and room count in the HUD? Do they understand that solved chambers and abilities are kept?
- Red-floor arena, if it comes up: a walker on the neutral tile beside the right bumper survives the swap (known; does it matter?).

**Everywhere:** do they find hold-R reset when stuck? Do they get lost in the empty band below the smaller centre chambers? Anything that feels unfair, slow or unreadable.

---

## 6. After the session (3 min)

Ask, and write the answers down word for word where you can:

1. What was the most fun moment? The most frustrating one?
2. Which chamber made you think "oh, clever"? Which felt unfair?
3. Was there anything you didn't understand by the end?
4. How hard was it overall, from 1 (too easy) to 5 (too hard)? Each Easy, the Medium, the Hard?
5. Would you play another expedition? Why or why not?

Then press **Esc** to the menu and **C** to copy the playtest stats, and paste them into the notes under "Telemetry". Stop the recording and save it next to the notes (or link it).

---

## 7. After all three sessions

1. List every issue from the three notes in the triage table of `playtest-summary.md` (one row per issue: who hit it, how long it cost, severity).
2. Pick the **top 3** by how many testers hit it × how much it cost.
3. Fix them, and for at least one capture a **before/after**: a clip or screenshot plus a number from the telemetry (time, resets or hearts lost on that chamber).
4. Write what changed and why in the devlog and the GDD's playtest section.
