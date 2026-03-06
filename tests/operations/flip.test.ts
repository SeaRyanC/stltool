import { describe, it, expect } from '@jest/globals';
import { flipMesh } from '../../src/operations/flip.js';
import { meshBounds } from '../../src/geometry.js';
import type { Mesh } from '../../src/geometry.js';

const mesh: Mesh = {
  triangles: [
    { normal: { x: 0, y: 0, z: 1 }, v1: { x: 0, y: 0, z: 0 }, v2: { x: 1, y: 0, z: 0 }, v3: { x: 0, y: 1, z: 0 } },
    { normal: { x: 0, y: 0, z: -1 }, v1: { x: 0, y: 0, z: 1 }, v2: { x: 0, y: 1, z: 1 }, v3: { x: 1, y: 0, z: 1 } },
  ],
};

describe('flipMesh', () => {
  it('flips x axis', () => {
    const result = flipMesh(mesh, 'x');
    const origBounds = meshBounds(mesh);
    const newBounds = meshBounds(result);
    expect(newBounds.min.x).toBeCloseTo(-origBounds.max.x);
    expect(newBounds.max.x).toBeCloseTo(-origBounds.min.x);
  });

  it('flips z axis', () => {
    const result = flipMesh(mesh, 'z');
    const bounds = meshBounds(result);
    expect(bounds.min.z).toBeCloseTo(-1);
    expect(bounds.max.z).toBeCloseTo(0);
  });

  it('reverses normals on odd flip', () => {
    const result = flipMesh(mesh, 'z');
    // Original top face had normal.z = 1, after z flip it should be negative
    expect(result.triangles[0].normal.z).toBeCloseTo(-1);
  });
});
