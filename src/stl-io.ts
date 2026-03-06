import type { Mesh, Triangle, Vec3 } from "./types.js";

export function parseStl(buffer: Buffer): Mesh {
  // Check if it's ASCII STL
  const header = buffer.subarray(0, Math.min(80, buffer.length)).toString("ascii");
  if (header.trimStart().startsWith("solid") && isLikelyAscii(buffer)) {
    return parseAsciiStl(buffer.toString("utf-8"));
  }
  return parseBinaryStl(buffer);
}

function isLikelyAscii(buffer: Buffer): boolean {
  // Binary STL has a triangle count at offset 80
  // If the file is long enough for a binary STL, check if the triangle count matches
  if (buffer.length < 84) return true;
  const triCount = buffer.readUInt32LE(80);
  const expectedBinarySize = 84 + triCount * 50;
  if (expectedBinarySize === buffer.length) {
    // Could be binary - check if content looks ASCII
    const text = buffer.toString("utf-8");
    return text.includes("facet") && text.includes("endsolid");
  }
  return true;
}

function parseAsciiStl(text: string): Mesh {
  const triangles: Triangle[] = [];
  let name = "";

  const solidMatch = text.match(/solid\s+(.*)/);
  if (solidMatch?.[1]) {
    name = solidMatch[1].trim();
  }

  const facetRegex =
    /facet\s+normal\s+([-\d.eE+]+)\s+([-\d.eE+]+)\s+([-\d.eE+]+)\s+outer\s+loop\s+vertex\s+([-\d.eE+]+)\s+([-\d.eE+]+)\s+([-\d.eE+]+)\s+vertex\s+([-\d.eE+]+)\s+([-\d.eE+]+)\s+([-\d.eE+]+)\s+vertex\s+([-\d.eE+]+)\s+([-\d.eE+]+)\s+([-\d.eE+]+)\s+endloop\s+endfacet/g;

  let match;
  while ((match = facetRegex.exec(text)) !== null) {
    const normal: Vec3 = {
      x: parseFloat(match[1]!),
      y: parseFloat(match[2]!),
      z: parseFloat(match[3]!),
    };
    const v1: Vec3 = {
      x: parseFloat(match[4]!),
      y: parseFloat(match[5]!),
      z: parseFloat(match[6]!),
    };
    const v2: Vec3 = {
      x: parseFloat(match[7]!),
      y: parseFloat(match[8]!),
      z: parseFloat(match[9]!),
    };
    const v3: Vec3 = {
      x: parseFloat(match[10]!),
      y: parseFloat(match[11]!),
      z: parseFloat(match[12]!),
    };
    triangles.push({ normal, v1, v2, v3, attribute: 0 });
  }

  return { name, triangles };
}

function parseBinaryStl(buffer: Buffer): Mesh {
  const name = buffer.subarray(0, 80).toString("ascii").replace(/\0/g, "").trim();
  const triCount = buffer.readUInt32LE(80);
  const triangles: Triangle[] = [];

  for (let i = 0; i < triCount; i++) {
    const offset = 84 + i * 50;
    const normal: Vec3 = {
      x: buffer.readFloatLE(offset),
      y: buffer.readFloatLE(offset + 4),
      z: buffer.readFloatLE(offset + 8),
    };
    const v1: Vec3 = {
      x: buffer.readFloatLE(offset + 12),
      y: buffer.readFloatLE(offset + 16),
      z: buffer.readFloatLE(offset + 20),
    };
    const v2: Vec3 = {
      x: buffer.readFloatLE(offset + 24),
      y: buffer.readFloatLE(offset + 28),
      z: buffer.readFloatLE(offset + 32),
    };
    const v3: Vec3 = {
      x: buffer.readFloatLE(offset + 36),
      y: buffer.readFloatLE(offset + 40),
      z: buffer.readFloatLE(offset + 44),
    };
    const attribute = buffer.readUInt16LE(offset + 48);
    triangles.push({ normal, v1, v2, v3, attribute });
  }

  return { name, triangles };
}

export function writeBinaryStl(mesh: Mesh): Buffer {
  const headerSize = 80;
  const triCountSize = 4;
  const triSize = 50;
  const bufferSize = headerSize + triCountSize + mesh.triangles.length * triSize;
  const buffer = Buffer.alloc(bufferSize);

  // Write header (80 bytes, padded with nulls)
  const headerStr = mesh.name.substring(0, 80);
  buffer.write(headerStr, 0, "ascii");

  // Write triangle count
  buffer.writeUInt32LE(mesh.triangles.length, 80);

  for (let i = 0; i < mesh.triangles.length; i++) {
    const tri = mesh.triangles[i]!;
    const offset = 84 + i * 50;

    buffer.writeFloatLE(tri.normal.x, offset);
    buffer.writeFloatLE(tri.normal.y, offset + 4);
    buffer.writeFloatLE(tri.normal.z, offset + 8);

    buffer.writeFloatLE(tri.v1.x, offset + 12);
    buffer.writeFloatLE(tri.v1.y, offset + 16);
    buffer.writeFloatLE(tri.v1.z, offset + 20);

    buffer.writeFloatLE(tri.v2.x, offset + 24);
    buffer.writeFloatLE(tri.v2.y, offset + 28);
    buffer.writeFloatLE(tri.v2.z, offset + 32);

    buffer.writeFloatLE(tri.v3.x, offset + 36);
    buffer.writeFloatLE(tri.v3.y, offset + 40);
    buffer.writeFloatLE(tri.v3.z, offset + 44);

    buffer.writeUInt16LE(tri.attribute, offset + 48);
  }

  return buffer;
}
