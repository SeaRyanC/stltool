import { promises as fs } from 'fs';
import type { Mesh, Triangle, Vec3 } from './geometry.js';

function readVec3(buf: Buffer, offset: number): Vec3 {
  return {
    x: buf.readFloatLE(offset),
    y: buf.readFloatLE(offset + 4),
    z: buf.readFloatLE(offset + 8),
  };
}

function parseBinaryStl(buf: Buffer): Mesh {
  const count = buf.readUInt32LE(80);
  const triangles: Triangle[] = [];
  let offset = 84;
  for (let i = 0; i < count; i++) {
    const normal = readVec3(buf, offset); offset += 12;
    const v1 = readVec3(buf, offset); offset += 12;
    const v2 = readVec3(buf, offset); offset += 12;
    const v3 = readVec3(buf, offset); offset += 12;
    offset += 2; // attribute
    triangles.push({ normal, v1, v2, v3 });
  }
  return { triangles };
}

function parseAsciiStl(content: string): Mesh {
  const triangles: Triangle[] = [];
  const lines = content.split('\n').map(l => l.trim());
  let i = 0;
  while (i < lines.length) {
    if (lines[i].startsWith('facet normal')) {
      const parts = lines[i].split(/\s+/);
      const normal: Vec3 = { x: parseFloat(parts[2]), y: parseFloat(parts[3]), z: parseFloat(parts[4]) };
      i++; // outer loop
      i++;
      const verts: Vec3[] = [];
      for (let j = 0; j < 3; j++, i++) {
        const vp = lines[i].split(/\s+/);
        verts.push({ x: parseFloat(vp[1]), y: parseFloat(vp[2]), z: parseFloat(vp[3]) });
      }
      triangles.push({ normal, v1: verts[0], v2: verts[1], v3: verts[2] });
      // endloop, endfacet
      i += 2;
    } else {
      i++;
    }
  }
  return { triangles };
}

export async function readStlFile(filePath: string): Promise<Mesh> {
  const buf = await fs.readFile(filePath);
  const header = buf.slice(0, 80).toString('ascii');
  const startsWithSolid = header.trimStart().startsWith('solid');
  if (startsWithSolid) {
    const count = buf.readUInt32LE(80);
    const expectedSize = 80 + 4 + count * 50;
    if (expectedSize !== buf.length) {
      // ASCII
      return parseAsciiStl(buf.toString('utf8'));
    }
  }
  return parseBinaryStl(buf);
}
