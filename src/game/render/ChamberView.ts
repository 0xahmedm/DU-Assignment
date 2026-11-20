import Phaser from 'phaser';
import type { ChamberLogic } from '../../core/chamber/logic';
import { symbolInfo } from '../../core/chamber/legend';
import type { ChamberModel, Device, Dir } from '../../core/chamber/types';
import { segmentLine, type BeamTrace } from '../../core/light/beams';
import { TILE } from '../../core/player/metrics';
import { dashSegments } from './dashes';
import { PALETTE } from './palette';

/** Signal wires: dash and gap lengths (px) and how fast a powered wire's dashes travel (px/s). */
const WIRE = { dash: 6, gap: 5, speed: 36 } as const;

const center = (d: Device) => {
  const xs = d.cells.map(([, c]) => c);
  const ys = d.cells.map(([r]) => r);
  return {
    x: ((Math.min(...xs) + Math.max(...xs) + 1) / 2) * TILE,
    y: ((Math.min(...ys) + Math.max(...ys) + 1) / 2) * TILE,
  };
};

/**
 * Draws a chamber in the C52 visual language. Static terrain is drawn once; devices, wires, phase
 * blocks and lamps are redrawn every frame from the logic state (chambers are small, so this is cheap).
 */
export class ChamberView {
  private readonly dynamic: Phaser.GameObjects.Graphics;
  /** Device id -> time (ms) its hit flash started. */
  private readonly flashes = new Map<string, number>();

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly model: ChamberModel,
    private readonly logic: ChamberLogic,
  ) {
    const g = scene.add.graphics().setDepth(0);
    model.grid.forEach((row, r) => {
      [...row].forEach((ch, c) => {
        if (symbolInfo(ch)?.tile !== 'solid' || ch === 'U') return;
        g.fillStyle(PALETTE.terrain, 1).fillRect(c * TILE, r * TILE, TILE, TILE);
        if (symbolInfo(model.grid[r - 1]?.[c] ?? '#')?.tile !== 'solid') {
          g.fillStyle(PALETTE.terrainEdge, 1).fillRect(c * TILE, r * TILE, TILE, 4);
        }
      });
    });
    this.dynamic = scene.add.graphics().setDepth(5);
  }

  /** Redraw everything that can change. */
  draw(pressedPlates: ReadonlySet<string>, beams?: BeamTrace): void {
    const g = this.dynamic.clear();
    this.drawWires(g);
    for (const d of this.model.devices) this.drawDevice(g, d, pressedPlates, beams);
    if (beams) this.drawBeams(g, beams);
    this.drawPhaseBlocks(g);
    this.drawExitLamps(g);
    this.drawFlashes(g);
  }

  /** Briefly highlight a device that was hit or changed. */
  flash(deviceId: string): void {
    this.flashes.set(deviceId, this.scene.time.now);
  }

  /** A small burst (a recalled crate vanishing, a Bolt hitting a wall). */
  puff(x: number, y: number, color: number = PALETTE.weight): void {
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      const bit = this.scene.add.rectangle(x, y, 6, 6, color).setDepth(12);
      this.scene.tweens.add({
        targets: bit,
        x: x + Math.cos(a) * 22,
        y: y + Math.sin(a) * 22,
        alpha: 0,
        duration: 260,
        onComplete: () => bit.destroy(),
      });
    }
  }

  private drawFlashes(g: Phaser.GameObjects.Graphics): void {
    const FLASH_MS = 180;
    for (const [id, t0] of this.flashes) {
      const t = (this.scene.time.now - t0) / FLASH_MS;
      const d = this.model.devices.find((x) => x.id === id);
      if (t >= 1 || !d) {
        this.flashes.delete(id);
        continue;
      }
      g.fillStyle(PALETTE.lightCore, 0.7 * (1 - t));
      for (const [r, c] of d.cells) g.fillRect(c * TILE, r * TILE, TILE, TILE);
    }
  }

  private drawWires(g: Phaser.GameObjects.Graphics): void {
    const byId = new Map(this.model.devices.map((d) => [d.id, d]));
    for (const l of this.model.links) {
      const to = byId.get(l.to);
      if (!to) continue;
      const b = center(to);
      for (const f of l.from) {
        const from = byId.get(f);
        if (!from) continue;
        const a = center(from);
        const ay = from.kind === 'plate' ? a.y + TILE / 2 - 3 : a.y; // plates: wire leaves from the floor
        const on = this.logic.isSourceOn(f);
        const color = from.kind === 'plate' ? PALETTE.weight : PALETTE.light;
        // Dashed, so a wire never reads as a beam (beams are solid and glow); when powered the
        // dashes travel from source to target (C52: wires pulse when powered).
        const offset = on ? (this.scene.time.now / 1000) * WIRE.speed : 0;
        g.lineStyle(2, color, on ? 0.95 : 0.3);
        const path = [{ x: a.x, y: ay }, { x: a.x, y: b.y }, { x: b.x, y: b.y }]; // L-shaped run
        for (const [p, q] of dashSegments(path, WIRE.dash, WIRE.gap, offset)) g.lineBetween(p.x, p.y, q.x, q.y);
      }
    }
  }

  /** Beams: a soft cyan glow with a white core (C52: Light = cyan / white). */
  private drawBeams(g: Phaser.GameObjects.Graphics, beams: BeamTrace): void {
    const pulse = 0.75 + 0.25 * Math.sin(this.scene.time.now / 90);
    for (const seg of beams.segments) {
      const l = segmentLine(seg, TILE);
      g.lineStyle(10, PALETTE.light, 0.22 * pulse).lineBetween(l.x1, l.y1, l.x2, l.y2);
      g.lineStyle(4, PALETTE.light, 0.85).lineBetween(l.x1, l.y1, l.x2, l.y2);
      g.lineStyle(1.5, PALETTE.lightCore, 0.95).lineBetween(l.x1, l.y1, l.x2, l.y2);
    }
  }

  private drawDevice(g: Phaser.GameObjects.Graphics, d: Device, pressed: ReadonlySet<string>, beams?: BeamTrace): void {
    switch (d.kind) {
      case 'plate':
        for (const [r, c] of d.cells) {
          const down = pressed.has(d.id);
          g.fillStyle(down ? PALETTE.weight : PALETTE.weightDark, 1);
          g.fillRect(c * TILE + 3, (r + 1) * TILE - (down ? 3 : 6), TILE - 6, down ? 3 : 6);
        }
        break;
      case 'door':
      case 'trapdoor':
      case 'exit': {
        const open = this.logic.isOpen(d.id);
        for (const [r, c] of d.cells) {
          const x = c * TILE;
          const y = r * TILE;
          if (open) {
            g.lineStyle(2, d.kind === 'exit' ? PALETTE.lightCore : PALETTE.dim, 0.5).strokeRect(x + 2, y + 2, TILE - 4, TILE - 4);
          } else {
            g.fillStyle(d.kind === 'exit' ? 0x9aa0ab : 0x5a5f6b, 1).fillRect(x, y, TILE, TILE);
            g.fillStyle(PALETTE.terrain, 1).fillRect(x + TILE / 2 - 2, y, 4, TILE);
          }
        }
        break;
      }
      case 'dispenser':
        for (const [r, c] of d.cells) {
          g.fillStyle(PALETTE.weightDark, 1).fillRect(c * TILE, r * TILE, TILE, TILE);
          g.fillStyle(PALETTE.weight, 1).fillRect(c * TILE + 6, r * TILE + TILE - 8, TILE - 12, 6);
        }
        break;
      case 'crystal': {
        // Split diamond (red | blue): "hitting this swaps the colours". Never colour alone: the
        // diamond shape is unique to crystals.
        const { x, y } = center(d);
        const h = 11;
        g.fillStyle(PALETTE.phaseRed, 1).fillTriangle(x, y - h, x, y + h, x - h, y);
        g.fillStyle(PALETTE.phaseBlue, 1).fillTriangle(x, y - h, x, y + h, x + h, y);
        g.lineStyle(2, PALETTE.lightCore, 0.9).strokePoints(
          [
            { x, y: y - h },
            { x: x + h, y },
            { x, y: y + h },
            { x: x - h, y },
          ],
          true,
        );
        break;
      }
      case 'emitter': {
        // A dark block with a cyan lens on the side it fires from.
        const [r, c] = d.cells[0]!;
        const x = c * TILE;
        const y = r * TILE;
        g.fillStyle(0x1d2a33, 1).fillRect(x + 2, y + 2, TILE - 4, TILE - 4);
        const lens: Record<Dir, [number, number, number, number]> = {
          right: [x + TILE - 8, y + 9, 6, TILE - 18],
          left: [x + 2, y + 9, 6, TILE - 18],
          up: [x + 9, y + 2, TILE - 18, 6],
          down: [x + 9, y + TILE - 8, TILE - 18, 6],
        };
        g.fillStyle(PALETTE.light, 1).fillRect(...lens[d.dir ?? 'right']);
        break;
      }
      case 'mirror': {
        // A framed tile with the reflecting diagonal. Locked (plate-wired, C42): amber frame.
        const [r, c] = d.cells[0]!;
        const x = c * TILE;
        const y = r * TILE;
        const locked = this.logic.isMirrorLocked(d.id);
        g.fillStyle(0x23262d, 1).fillRect(x, y, TILE, TILE);
        g.lineStyle(2, locked ? PALETTE.weight : PALETTE.dim, 1).strokeRect(x + 1, y + 1, TILE - 2, TILE - 2);
        const state = this.logic.mirrorState(d.id);
        g.lineStyle(4, PALETTE.lightCore, 1);
        if (state === '/') g.lineBetween(x + 5, y + TILE - 5, x + TILE - 5, y + 5);
        else g.lineBetween(x + 5, y + 5, x + TILE - 5, y + TILE - 5);
        break;
      }
      case 'receiver': {
        // A socket that glows when a beam reaches it.
        const { x, y } = center(d);
        const lit = beams?.lit.has(d.id) ?? false;
        g.fillStyle(0x1d2a33, 1).fillRect(x - TILE / 2 + 2, y - TILE / 2 + 2, TILE - 4, TILE - 4);
        g.lineStyle(3, lit ? PALETTE.light : PALETTE.dim, 1).strokeCircle(x, y, 9);
        if (lit) g.fillStyle(PALETTE.lightCore, 1).fillCircle(x, y, 6);
        break;
      }
      default:
        break;
    }
  }

  private drawPhaseBlocks(g: Phaser.GameObjects.Graphics): void {
    this.model.grid.forEach((row, r) => {
      [...row].forEach((ch, c) => {
        if (ch !== 'R' && ch !== 'B') return;
        const color = ch === 'R' ? PALETTE.phaseRed : PALETTE.phaseBlue;
        const x = c * TILE;
        const y = r * TILE;
        if (this.logic.isSolid(r, c)) {
          g.fillStyle(color, 0.9).fillRect(x, y, TILE, TILE);
          g.lineStyle(2, 0x000000, 0.25);
          if (ch === 'R') {
            // Diagonal hatching, clipped to the tile.
            for (let k = 8; k < 2 * TILE; k += 8) {
              g.lineBetween(x + Math.max(0, k - TILE), y + Math.min(k, TILE), x + Math.min(k, TILE), y + Math.max(0, k - TILE));
            }
          } else {
            g.fillStyle(0x000000, 0.25);
            for (let yy = 6; yy < TILE; yy += 10) for (let xx = 6; xx < TILE; xx += 10) g.fillCircle(x + xx, y + yy, 2); // dots
          }
        } else {
          g.lineStyle(2, color, this.logic.isGhosted(r, c) ? 0.8 : 0.45).strokeRect(x + 1, y + 1, TILE - 2, TILE - 2);
        }
      });
    });
  }

  private drawExitLamps(g: Phaser.GameObjects.Graphics): void {
    const exit = this.model.devices.find((d) => d.kind === 'exit');
    if (!exit) return;
    const top = Math.min(...exit.cells.map(([r]) => r));
    const xs = exit.cells.map(([, c]) => c);
    const cx = ((Math.min(...xs) + Math.max(...xs) + 1) / 2) * TILE;
    const lamps = this.logic.exitLamps();
    lamps.forEach((lamp, i) => {
      const x = cx + (i - (lamps.length - 1) / 2) * 12;
      const y = top * TILE - 8;
      g.fillStyle(lamp.on ? PALETTE.lightCore : 0x3a3d45, 1).fillCircle(x, y, 4);
      g.lineStyle(1, PALETTE.dim, 1).strokeCircle(x, y, 4);
    });
  }
}
