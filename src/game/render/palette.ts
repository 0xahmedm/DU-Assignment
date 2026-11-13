/** Visual language (C52). Colour is never the only cue: phase blocks also get patterns. */
export const PALETTE = {
  background: 0x15161a,
  terrain: 0x2b2d33,
  terrainEdge: 0x3c3f47,
  player: 0xf2efe6,
  playerEye: 0x15161a,
  weight: 0xe0a030, // amber: plates, crates
  weightDark: 0x8a5e14,
  light: 0x5fe3ff, // cyan beams
  lightCore: 0xffffff,
  phaseRed: 0xe0484f, // hatched
  phaseBlue: 0x4f7be0, // dotted
  enemy: 0xb07ce8, // violet: no puzzle mechanic uses it
  text: 0xd8d8d8,
  dim: 0x6b6e78,
} as const;

export const cssHex = (c: number): string => `#${c.toString(16).padStart(6, '0')}`;
