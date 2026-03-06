import { describe, it, expect } from '@jest/globals';
import { floorMesh } from '../../src/operations/floor.js';
import { meshBounds } from '../../src/geometry.js';
import type { Mesh } from '../../src/geometry.js';

const mesh: Mesh = {
  triangles: [
    { normal: { x: 0, y: 0, z: 1 }, v1: { x: -1, y: -2, z: -3 }, v2: { x: 1, y: -2, z: -3 }, v3: { x: 0, y: 1, z: 2 } },
  ],
};

describe('floorMesh', () => {
  it('floors xyz', () => {
    const result = floorMesh(mesh);
    const bounds = meshBounds(result);
    expect(bounds.min.x).toBeCloseTo(0);
    expect(bounds.min.y).toBeCloseTo(0);
    expect(bounds.min.z).toBeCloseTo(0);
  });

  it('floors z only', () => {
    const result = floorMesh(mesh, 'z');
    const bounds = meshBounds(result);
    expect(bounds.min.z).toBeCloseTo(0);
    expect(bounds.min.x).toBeCloseTo(-1); // unchanged
  });
});
