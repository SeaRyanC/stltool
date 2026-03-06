import { describe, it, expect } from '@jest/globals';
import {
  addVec3, subVec3, scaleVec3, dotVec3, crossVec3, magnitudeVec3,
  normalizeVec3, computeNormal, triangleArea, meshBounds, meshCenter,
  computeMeshVolume, scaleVec3Components
} from '../src/geometry.js';
import type { Mesh, Triangle } from '../src/geometry.js';

const cube: Mesh = {
  triangles: [
    // Simple cube-like structure - a tetrahedron for volume test
    { normal: { x: 0, y: 0, z: 1 }, v1: { x: 0, y: 0, z: 0 }, v2: { x: 1, y: 0, z: 0 }, v3: { x: 0, y: 1, z: 0 } },
    { normal: { x: 0, y: 0, z: -1 }, v1: { x: 0, y: 0, z: 1 }, v2: { x: 0, y: 1, z: 1 }, v3: { x: 1, y: 0, z: 1 } },
    { normal: { x: 0, y: -1, z: 0 }, v1: { x: 0, y: 0, z: 0 }, v2: { x: 1, y: 0, z: 0 }, v3: { x: 1, y: 0, z: 1 } },
    { normal: { x: 0, y: -1, z: 0 }, v1: { x: 0, y: 0, z: 0 }, v2: { x: 1, y: 0, z: 1 }, v3: { x: 0, y: 0, z: 1 } },
  ],
};

describe('Vec3 operations', () => {
  it('addVec3', () => {
    expect(addVec3({ x: 1, y: 2, z: 3 }, { x: 4, y: 5, z: 6 })).toEqual({ x: 5, y: 7, z: 9 });
  });
  it('subVec3', () => {
    expect(subVec3({ x: 5, y: 7, z: 9 }, { x: 4, y: 5, z: 6 })).toEqual({ x: 1, y: 2, z: 3 });
  });
  it('scaleVec3', () => {
    expect(scaleVec3({ x: 1, y: 2, z: 3 }, 2)).toEqual({ x: 2, y: 4, z: 6 });
  });
  it('scaleVec3Components', () => {
    expect(scaleVec3Components({ x: 2, y: 3, z: 4 }, { x: 2, y: 3, z: 4 })).toEqual({ x: 4, y: 9, z: 16 });
  });
  it('dotVec3', () => {
    expect(dotVec3({ x: 1, y: 2, z: 3 }, { x: 4, y: 5, z: 6 })).toBe(32);
  });
  it('crossVec3', () => {
    expect(crossVec3({ x: 1, y: 0, z: 0 }, { x: 0, y: 1, z: 0 })).toEqual({ x: 0, y: 0, z: 1 });
  });
  it('magnitudeVec3', () => {
    expect(magnitudeVec3({ x: 3, y: 4, z: 0 })).toBeCloseTo(5);
  });
  it('normalizeVec3', () => {
    const n = normalizeVec3({ x: 3, y: 4, z: 0 });
    expect(magnitudeVec3(n)).toBeCloseTo(1);
    expect(n.x).toBeCloseTo(0.6);
  });
  it('computeNormal', () => {
    const n = computeNormal({ x: 0, y: 0, z: 0 }, { x: 1, y: 0, z: 0 }, { x: 0, y: 1, z: 0 });
    expect(n.z).toBeCloseTo(1);
  });
});

describe('Triangle operations', () => {
  it('triangleArea', () => {
    const t: Triangle = { normal: { x: 0, y: 0, z: 1 }, v1: { x: 0, y: 0, z: 0 }, v2: { x: 2, y: 0, z: 0 }, v3: { x: 0, y: 2, z: 0 } };
    expect(triangleArea(t)).toBeCloseTo(2);
  });
});

describe('Mesh operations', () => {
  it('meshBounds', () => {
    const bounds = meshBounds(cube);
    expect(bounds.min.x).toBe(0);
    expect(bounds.max.x).toBe(1);
  });
  it('meshCenter', () => {
    const center = meshCenter(cube);
    expect(center.x).toBeCloseTo(0.5);
    expect(center.z).toBeCloseTo(0.5);
  });
  it('computeMeshVolume positive', () => {
    const vol = computeMeshVolume(cube);
    expect(vol).toBeGreaterThan(0);
  });
});
