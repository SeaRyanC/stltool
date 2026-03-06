import { describe, it, expect } from '@jest/globals';
import { isManifold } from '../../src/operations/validate.js';
import type { Mesh } from '../../src/geometry.js';

// A simple tetrahedron (manifold)
const tetrahedron: Mesh = {
  triangles: [
    { normal: { x: 0, y: 0, z: -1 }, v1: { x: 0, y: 0, z: 0 }, v2: { x: 1, y: 0, z: 0 }, v3: { x: 0, y: 1, z: 0 } },
    { normal: { x: 0, y: -1, z: 0 }, v1: { x: 0, y: 0, z: 0 }, v2: { x: 1, y: 0, z: 0 }, v3: { x: 0.5, y: 0, z: 1 } },
    { normal: { x: -1, y: 0, z: 0 }, v1: { x: 0, y: 0, z: 0 }, v2: { x: 0, y: 1, z: 0 }, v3: { x: 0, y: 0.5, z: 1 } },
    { normal: { x: 1, y: 1, z: 0 }, v1: { x: 1, y: 0, z: 0 }, v2: { x: 0, y: 1, z: 0 }, v3: { x: 0.5, y: 0.5, z: 1 } },
  ],
};

// Non-manifold: open mesh (just one triangle)
const openMesh: Mesh = {
  triangles: [
    { normal: { x: 0, y: 0, z: 1 }, v1: { x: 0, y: 0, z: 0 }, v2: { x: 1, y: 0, z: 0 }, v3: { x: 0, y: 1, z: 0 } },
  ],
};

describe('isManifold', () => {
  it('detects non-manifold open mesh', () => {
    expect(isManifold(openMesh)).toBe(false);
  });

  it('handles empty mesh', () => {
    expect(isManifold({ triangles: [] })).toBe(true);
  });
});
