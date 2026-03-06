import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import { readStlFile } from '../src/stl-reader.js';
import { meshToBuffer } from '../src/stl-writer.js';
import { writeFile, unlink } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import type { Mesh } from '../src/geometry.js';

const testMesh: Mesh = {
  triangles: [
    { normal: { x: 0, y: 0, z: 1 }, v1: { x: 0, y: 0, z: 0 }, v2: { x: 1, y: 0, z: 0 }, v3: { x: 0, y: 1, z: 0 } },
    { normal: { x: 0, y: -1, z: 0 }, v1: { x: 0, y: 0, z: 0 }, v2: { x: 1, y: 0, z: 0 }, v3: { x: 0.5, y: 0, z: 1 } },
  ],
};

const binaryPath = join(tmpdir(), 'test-binary.stl');
const asciiPath = join(tmpdir(), 'test-ascii.stl');

const asciiContent = `solid test
  facet normal 0 0 1
    outer loop
      vertex 0 0 0
      vertex 1 0 0
      vertex 0 1 0
    endloop
  endfacet
  facet normal 0 -1 0
    outer loop
      vertex 0 0 0
      vertex 1 0 0
      vertex 0.5 0 1
    endloop
  endfacet
endsolid test`;

beforeAll(async () => {
  await writeFile(binaryPath, meshToBuffer(testMesh));
  await writeFile(asciiPath, asciiContent);
});

afterAll(async () => {
  await unlink(binaryPath).catch(() => {});
  await unlink(asciiPath).catch(() => {});
});

describe('STL Reader - Binary', () => {
  it('reads correct triangle count', async () => {
    const mesh = await readStlFile(binaryPath);
    expect(mesh.triangles.length).toBe(2);
  });
  it('reads correct vertices', async () => {
    const mesh = await readStlFile(binaryPath);
    expect(mesh.triangles[0].v2.x).toBeCloseTo(1);
  });
});

describe('STL Reader - ASCII', () => {
  it('reads correct triangle count', async () => {
    const mesh = await readStlFile(asciiPath);
    expect(mesh.triangles.length).toBe(2);
  });
  it('reads normals', async () => {
    const mesh = await readStlFile(asciiPath);
    expect(mesh.triangles[0].normal.z).toBeCloseTo(1);
  });
  it('reads vertices correctly', async () => {
    const mesh = await readStlFile(asciiPath);
    expect(mesh.triangles[0].v2.x).toBeCloseTo(1);
  });
});
