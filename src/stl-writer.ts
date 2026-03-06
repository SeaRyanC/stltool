import { promises as fs } from 'fs';
import type { Mesh } from './geometry.js';

export function meshToBuffer(mesh: Mesh): Buffer {
  const count = mesh.triangles.length;
  const buf = Buffer.alloc(84 + count * 50);
  buf.writeUInt32LE(count, 80);
  let offset = 84;
  for (const t of mesh.triangles) {
    for (const v of [t.normal, t.v1, t.v2, t.v3]) {
      buf.writeFloatLE(v.x, offset); offset += 4;
      buf.writeFloatLE(v.y, offset); offset += 4;
      buf.writeFloatLE(v.z, offset); offset += 4;
    }
    offset += 2; // attribute bytes (zeros)
  }
  return buf;
}

export async function writeMesh(mesh: Mesh, filePath: string): Promise<void> {
  await fs.writeFile(filePath, meshToBuffer(mesh));
}
