/**
 * Exits and enemies (C109). A room's exit opens only when its puzzle is solved (a combat room has
 * none) and its enemies are defeated, except the ones the solution uses: a walker a puzzle needs
 * on a plate may stay. Engine-free.
 */

/** How many more enemies must be defeated before the exit may open. */
export function enemiesLeft(alive: number, used: number): number {
  return Math.max(0, alive - Math.max(0, used));
}

/**
 * Whether a room's defeated enemies come back. Combat rooms never respawn theirs (R1). A chamber
 * respawns them only when every one of them is used by the solution (so a walker killed by mistake
 * comes back to its job); if any must be defeated, defeated enemies stay down, or "defeat them all"
 * could never be done.
 */
export function enemiesRespawn(kind: 'chamber' | 'connector', enemies: number, used: number): boolean {
  return kind === 'chamber' && enemies > 0 && used >= enemies;
}
