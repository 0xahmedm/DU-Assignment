# Playtest summary and triage

The three planned sessions became **remote playtests** (2026-11-22): three friends played the [playtest zip](HOW-TO-PLAYTEST.txt) on their own. Feedback per tester and the stats: [`remote-playtests-2026-11-22.md`](remote-playtests-2026-11-22.md); one tester's built-in stats: [`remote-tester-1-stats.md`](remote-tester-1-stats.md). The facilitated script ([session script](session-script.md)) and [notes template](notes-template.md) stay for any further session.

## Triage

**Score = testers who hit it × severity** (3 blocked or quit, 2 cost a minute or real frustration, 1 minor). Issues from the stats count the one tester who sent them.

| Issue | Where | Testers (of 3) | Severity | Score | Fix? | Decision / change |
|---|---|---|---|---|---|---|
| Couldn't find how to take an upgrade (attack on a pedestal) | Reward rooms | 1 | 3 | 3 | **Yes** | E to interact, with a yellow "E take …" key cap over the player; "interact E" in the controls bar (C116) |
| Standing on a crate stutters | Crates everywhere | 1 | 2 | 2 | **Yes** | Feet on a crate's top count as standing and snap onto it (C116, AI bug #35) |
| HUD text covers the game | Every room | 1 | 2 | 2 | **Yes** | Opaque top and bottom bars; the world is laid out between them (C116) |
| Endless gets easy (every upgrade owned), empty reward rooms repeat | Endless | 1 | 2 | 2 | **Yes** | At most 4 upgrades, swaps when full; Mend ceiling 4; +1 enemy hit per level (C115) |
| W-H Drop Delivery: 11:08 first solve, 2 abandoned attempts | W-H | 1 (stats) | 2 | 2 | Watch | Proposed as the next layout/readability review (needs the user's approval) |
| W-M Borrowed Weight: 7 defeats on the first solve | W-M | 1 (stats) | 2 | 2 | Watch | Same: the walker in the gallery catches players; review with W-H |
| W-E First Weight took 5:39 | W-E | 1 (stats) | 1 | 1 | Indirect | The controls bar (C111) and How to play were added the day before this build; recheck in the next session |

## Before / after

| Issue | Before (number, evidence) | Change | After (number, evidence) |
|---|---|---|---|
| Crate stutter | Standing still on a crate for 2 s (120 physics steps): **39** flips between standing and falling, a **2.4 px** bounce, a landing squash every ~6 steps (measured in W-E) | Feet within a few px of a resting crate's top count as standing and snap onto it | **0** flips, **0 px**, no squash (same measurement) |
| Endless too easy | Tester 1's Endless run: **~39 rooms**. At that depth enemies took **+4** hits; up to **9** upgrades held; after ~9 picks a reward room had nothing new | 4 upgrades at most (a fifth replaces the oldest, shown on the pedestal); Mend ceiling 4; +1 hit every level | Same depth: **+8** hits; **4** upgrades held at most; every reward room offers three real choices ([screenshot](../screenshots/playtest-after-endless-swap.png)) |
| HUD over the game | P-M: the title, hearts and enemies note sit on the bridge and the red blocks; the controls cover the floor ([before](../screenshots/playtest-before-hud-over-P-M.png)) | Opaque bars, world in the band between them | Nothing of the chamber under text ([after](../screenshots/playtest-after-hud-bars-P-M.png)) |
| Taking an upgrade | Only "(attack to take it)" in a box at the top; the player hides the pedestal's label ([before](../screenshots/playtest-before-reward-pick.png)) | E, with a key cap over the player and "interact E" in the controls bar | "E take Long Reach" right over the player ([after](../screenshots/playtest-after-reward-pick.png)); time-to-pick to be measured in the next session |
