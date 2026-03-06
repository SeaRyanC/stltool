import { describe, it, expect } from '@jest/globals';
import { meshToBuffer } from '../src/stl-writer.js';
import type { Mesh } from '../src/geometry.js';

const testMesh: Mesh = {
  triangles: [
    { normal: { x: 0, y: 0, z: 1 }, v1: { x: 0, y: 0, z: 0 }, v2: { x: 1, y: 0, z: 0 }, v3: { x: 0, y: 1, z: 0 } },
  ],
};

describe('STL Writer', () => {
  it('produces correct buffer size', () => {
    const buf = meshToBuffer(testMesh);
    expect(buf.length).toBe(84 + 1 * 50);
  });

  it('writes triangle count', () => {
    const buf = meshToBuffer(testMesh);
    expect(buf.readUInt32LE(80)).toBe(1);
  });

  it('writes normal correctly', () => {
    const buf = meshToBuffer(testMesh);
    expect(buf.readFloatLE(84 + 8)).toBeCloseTo(1); // z of normal
  });

  it('writes vertex data', () => {
    const buf = meshToBuffer(testMesh);
    // v1 starts at offset 84 + 12 = 96
    expect(buf.readFloatLE(96)).toBeCloseTo(0); // v1.x
    // v2 starts at 108
    expect(buf.readFloatLE(108)).toBeCloseTo(1); // v2.x
  });

  it('two triangles size', () => {
    const mesh: Mesh = { triangles: [...testMesh.triangles, ...testMesh.triangles] };
    expect(meshToBuffer(mesh).length).toBe(84 + 2 * 50);
  });
});
