import { describe, expect, it } from 'vitest';
import { exposedFaces } from '../../src/core/chamber/collision';

const solidIn = (rows: string[]) => (r: number, c: number) => (rows[r]?.[c] ?? '#') === '#';

describe('exposedFaces (no seams inside walls)', () => {
  const rows = ['.....', '.##..', '.##..', '.....'];
  const isSolid = solidIn(rows);

  it('a wall tile only collides on sides that face air', () => {
    expect(exposedFaces(1, 1, isSolid)).toEqual({ up: true, down: false, left: true, right: false });
    expect(exposedFaces(2, 2, isSolid)).toEqual({ up: false, down: true, left: false, right: true });
  });

  it('the seam between two stacked tiles is internal on both sides', () => {
    expect(exposedFaces(1, 2, isSolid).down).toBe(false);
    expect(exposedFaces(2, 2, isSolid).up).toBe(false);
  });

  it('cells outside the grid count as solid', () => {
    expect(exposedFaces(0, 0, solidIn(['#']))).toEqual({ up: false, down: false, left: false, right: false });
  });

  it('follows the current state: a neighbour that stops being solid exposes the face', () => {
    let doorClosed = true;
    const isSolid2 = (r: number, c: number) => (r === 0 && c === 1 ? doorClosed : solidIn(['#.#'])(r, c));
    expect(exposedFaces(0, 0, isSolid2).right).toBe(false);
    doorClosed = false;
    expect(exposedFaces(0, 0, isSolid2).right).toBe(true);
  });
});
