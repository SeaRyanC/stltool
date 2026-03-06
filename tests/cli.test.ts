import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import { spawnSync } from 'child_process';
import { writeFileSync, unlinkSync, existsSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { meshToBuffer } from '../src/stl-writer.js';
import type { Mesh } from '../src/geometry.js';

const testMesh: Mesh = {
  triangles: [
    { normal: { x: 0, y: 0, z: 1 }, v1: { x: 0, y: 0, z: 0 }, v2: { x: 10, y: 0, z: 0 }, v3: { x: 0, y: 10, z: 0 } },
    { normal: { x: 0, y: 0, z: -1 }, v1: { x: 0, y: 0, z: 5 }, v2: { x: 10, y: 0, z: 5 }, v3: { x: 0, y: 10, z: 5 } },
  ],
};

const testFile = join(tmpdir(), 'cli-test.stl');
const outFile = join(tmpdir(), 'cli-test-out.stl');

beforeAll(() => {
  writeFileSync(testFile, meshToBuffer(testMesh));
  // Build is done before tests
});

afterAll(() => {
  if (existsSync(testFile)) unlinkSync(testFile);
  if (existsSync(outFile)) unlinkSync(outFile);
});

function runCli(args: string[]): { stdout: string; stderr: string; status: number | null } {
  const result = spawnSync('node', ['dist/index.js', ...args], {
    encoding: 'utf8',
    cwd: process.cwd(),
  });
  return { stdout: result.stdout ?? '', stderr: result.stderr ?? '', status: result.status };
}

describe('CLI', () => {
  it('runs --measure without error', () => {
    const result = runCli([testFile, '--measure']);
    expect(result.status).toBe(0);
    expect(result.stdout).toContain('Extents');
  });

  it('runs --floor and creates output', () => {
    const result = runCli([testFile, '--floor', '-o', outFile]);
    expect(result.status).toBe(0);
    expect(existsSync(outFile)).toBe(true);
  });

  it('runs --center and creates output', () => {
    const result = runCli([testFile, '--center', '-o', outFile]);
    expect(result.status).toBe(0);
    expect(existsSync(outFile)).toBe(true);
  });

  it('runs --validate', () => {
    const result = runCli([testFile, '--validate']);
    expect(result.status).toBe(0);
  });

  it('runs --scale 2 and creates output', () => {
    const result = runCli([testFile, '--scale', '2', '-o', outFile]);
    expect(result.status).toBe(0);
    expect(existsSync(outFile)).toBe(true);
  });
});
