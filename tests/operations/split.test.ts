import { describe, it, expect } from '@jest/globals';
import { splitMesh } from '../../src/operations/split.js';
import type { Mesh } from '../../src/geometry.js';

// Two separate triangles (not connected)
const disconnectedMesh: Mesh = {
  triangles: [
    { normal: { x: 0, y: 0, z: 1 }, v1: { x: 0, y: 0, z: 0 }, v2: { x: 1, y: 0, z: 0 }, v3: { x: 0, y: 1, z: 0 } },
    { normal: { x: 0, y: 0, z: 1 }, v1: { x: 5, y: 5, z: 0 }, v2: { x: 6, y: 5, z: 0 }, v3: { x: 5, y: 6, z: 0 } },
  ],
};

// Two connected triangles
const connectedMesh: Mesh = {
  triangles: [
    { normal: { x: 0, y: 0, z: 1 }, v1: { x: 0, y: 0, z: 0 }, v2: { x: 1, y: 0, z: 0 }, v3: { x: 0, y: 1, z: 0 } },
    { normal: { x: 0, y: 0, z: 1 }, v1: { x: 1, y: 0, z: 0 }, v2: { x: 2, y: 0, z: 0 }, v3: { x: 1, y: 1, z: 0 } },
  ],
};

describe('splitMesh', () => {
  it('splits disconnected mesh into 2 parts', () => {
    const parts = splitMesh(disconnectedMesh);
    expect(parts.length).toBe(2);
    expect(parts[0].triangles.length).toBe(1);
  });

  it('keeps connected mesh as 1 part', () => {
    const parts = splitMesh(connectedMesh);
    expect(parts.length).toBe(1);
  });

  it('returns original mesh for single component', () => {
    const parts = splitMesh(connectedMesh);
    expect(parts[0]).toBe(connectedMesh);
  });
});
