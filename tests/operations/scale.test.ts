import { describe, it, expect } from '@jest/globals';
import { scaleMesh } from '../../src/operations/scale.js';
import { meshBounds } from '../../src/geometry.js';
import type { Mesh } from '../../src/geometry.js';

const mesh: Mesh = {
  triangles: [
    { normal: { x: 0, y: 0, z: 1 }, v1: { x: 0, y: 0, z: 0 }, v2: { x: 1, y: 0, z: 0 }, v3: { x: 0, y: 1, z: 0 } },
    { normal: { x: 0, y: 0, z: -1 }, v1: { x: 0, y: 0, z: 1 }, v2: { x: 1, y: 0, z: 1 }, v3: { x: 0, y: 1, z: 1 } },
  ],
};

describe('scaleMesh', () => {
  it('scales uniformly', () => {
    const result = scaleMesh(mesh, { x: 2, y: 2, z: 2 });
    const bounds = meshBounds(result);
    expect(bounds.max.x).toBeCloseTo(2);
    expect(bounds.max.z).toBeCloseTo(2);
  });

  it('scales non-uniformly', () => {
    const result = scaleMesh(mesh, { x: 3, y: 1, z: 2 });
    const bounds = meshBounds(result);
    expect(bounds.max.x).toBeCloseTo(3);
    expect(bounds.max.y).toBeCloseTo(1);
    expect(bounds.max.z).toBeCloseTo(2);
  });

  it('scales about a point', () => {
    const result = scaleMesh(mesh, { x: 2, y: 2, z: 2 }, { x: 0.5, y: 0.5, z: 0.5 });
    const bounds = meshBounds(result);
    expect(bounds.min.x).toBeCloseTo(-0.5);
    expect(bounds.max.x).toBeCloseTo(1.5);
  });
});
