import { describe, it, expect } from '@jest/globals';
import { measureMesh } from '../../src/operations/measure.js';
import type { Mesh } from '../../src/geometry.js';

const mesh: Mesh = {
  triangles: [
    { normal: { x: 0, y: 0, z: 1 }, v1: { x: 0, y: 0, z: 0 }, v2: { x: 10, y: 0, z: 0 }, v3: { x: 0, y: 10, z: 0 } },
    { normal: { x: 0, y: 0, z: -1 }, v1: { x: 0, y: 0, z: 10 }, v2: { x: 10, y: 0, z: 10 }, v3: { x: 0, y: 10, z: 10 } },
  ],
};

describe('measureMesh', () => {
  it('computes extents', () => {
    const metrics = measureMesh(mesh);
    expect(metrics.extents.x).toBeCloseTo(10);
    expect(metrics.extents.y).toBeCloseTo(10);
    expect(metrics.extents.z).toBeCloseTo(10);
  });

  it('volume is positive', () => {
    const metrics = measureMesh(mesh);
    expect(metrics.volume).toBeGreaterThan(0);
  });

  it('weight is positive', () => {
    const metrics = measureMesh(mesh);
    expect(metrics.weight).toBeGreaterThan(0);
  });
});
