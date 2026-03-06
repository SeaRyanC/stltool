import { describe, it, expect } from '@jest/globals';
import { centerMesh } from '../../src/operations/center.js';
import { meshBounds } from '../../src/geometry.js';
import type { Mesh } from '../../src/geometry.js';

const mesh: Mesh = {
  triangles: [
    { normal: { x: 0, y: 0, z: 1 }, v1: { x: 0, y: 0, z: 0 }, v2: { x: 2, y: 0, z: 0 }, v3: { x: 0, y: 2, z: 0 } },
    { normal: { x: 0, y: 0, z: -1 }, v1: { x: 0, y: 0, z: 2 }, v2: { x: 2, y: 0, z: 2 }, v3: { x: 0, y: 2, z: 2 } },
  ],
};

describe('centerMesh', () => {
  it('centers on xyz', () => {
    const result = centerMesh(mesh);
    const bounds = meshBounds(result);
    expect((bounds.min.x + bounds.max.x) / 2).toBeCloseTo(0);
    expect((bounds.min.y + bounds.max.y) / 2).toBeCloseTo(0);
    expect((bounds.min.z + bounds.max.z) / 2).toBeCloseTo(0);
  });

  it('centers on xy only', () => {
    const result = centerMesh(mesh, 'xy');
    const bounds = meshBounds(result);
    expect((bounds.min.x + bounds.max.x) / 2).toBeCloseTo(0);
    expect((bounds.min.z + bounds.max.z) / 2).toBeCloseTo(1); // unchanged
  });

  it('centers about a point', () => {
    const result = centerMesh(mesh, 'xyz', { x: 5, y: 5, z: 5 });
    const bounds = meshBounds(result);
    expect((bounds.min.x + bounds.max.x) / 2).toBeCloseTo(5);
  });
});
