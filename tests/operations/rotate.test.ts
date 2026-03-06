import { describe, it, expect } from '@jest/globals';
import { rotateMesh } from '../../src/operations/rotate.js';
import { meshBounds } from '../../src/geometry.js';
import type { Mesh } from '../../src/geometry.js';

const mesh: Mesh = {
  triangles: [
    { normal: { x: 0, y: 0, z: 1 }, v1: { x: 0, y: 0, z: 0 }, v2: { x: 1, y: 0, z: 0 }, v3: { x: 0, y: 1, z: 0 } },
  ],
};

describe('rotateMesh', () => {
  it('rotates 90 degrees around z', () => {
    const result = rotateMesh(mesh, 'z', 90);
    // v2 (1,0,0) should become (0,1,0)
    expect(result.triangles[0].v2.x).toBeCloseTo(0);
    expect(result.triangles[0].v2.y).toBeCloseTo(1);
  });

  it('rotates 90 degrees around x', () => {
    const result = rotateMesh(mesh, 'x', 90);
    // v3 (0,1,0) should become (0,0,1)
    expect(result.triangles[0].v3.y).toBeCloseTo(0);
    expect(result.triangles[0].v3.z).toBeCloseTo(1);
  });

  it('360 degrees returns to original', () => {
    const result = rotateMesh(mesh, 'z', 360);
    expect(result.triangles[0].v2.x).toBeCloseTo(1);
    expect(result.triangles[0].v2.y).toBeCloseTo(0);
  });
});
