import { describe, it, expect } from '@jest/globals';
import { layFlat } from '../../src/operations/lay-flat.js';
import { meshBounds } from '../../src/geometry.js';
import type { Mesh } from '../../src/geometry.js';

// A simple mesh that is not flat on z - tilted box-like structure
function makeTiltedMesh(): Mesh {
  // Create a flat triangle lying on an angle
  return {
    triangles: [
      // Bottom face (facing down, large area)
      { normal: { x: 0, y: -1, z: 0 }, v1: { x: 0, y: 0, z: 0 }, v2: { x: 10, y: 0, z: 0 }, v3: { x: 5, y: 0, z: 10 } },
      { normal: { x: 0, y: -1, z: 0 }, v1: { x: 0, y: 0, z: 0 }, v2: { x: 5, y: 0, z: 10 }, v3: { x: 10, y: 0, z: 10 } },
      // Top face
      { normal: { x: 0, y: 1, z: 0 }, v1: { x: 0, y: 5, z: 0 }, v2: { x: 5, y: 5, z: 10 }, v3: { x: 10, y: 5, z: 0 } },
      { normal: { x: 0, y: 1, z: 0 }, v1: { x: 0, y: 5, z: 0 }, v2: { x: 10, y: 5, z: 10 }, v3: { x: 5, y: 5, z: 10 } },
      // Side faces
      { normal: { x: -1, y: 0, z: 0 }, v1: { x: 0, y: 0, z: 0 }, v2: { x: 0, y: 5, z: 0 }, v3: { x: 0, y: 0, z: 10 } },
      { normal: { x: 1, y: 0, z: 0 }, v1: { x: 10, y: 0, z: 0 }, v2: { x: 10, y: 0, z: 10 }, v3: { x: 10, y: 5, z: 0 } },
    ],
  };
}

describe('layFlat', () => {
  it('floors the mesh on z after lay flat', () => {
    const mesh = makeTiltedMesh();
    const result = layFlat(mesh, 'z');
    const bounds = meshBounds(result);
    expect(bounds.min.z).toBeCloseTo(0, 1);
  });

  it('returns a mesh with same triangle count', () => {
    const mesh = makeTiltedMesh();
    const result = layFlat(mesh, 'z');
    expect(result.triangles.length).toBe(mesh.triangles.length);
  });
});
