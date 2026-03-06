import type { Vec3, Extents, Mesh, Triangle, Axis, AboutPoint } from "./types.js";

export function vec3(x: number, y: number, z: number): Vec3 {
  return { x, y, z };
}

export function addVec3(a: Vec3, b: Vec3): Vec3 {
  return { x: a.x + b.x, y: a.y + b.y, z: a.z + b.z };
}

export function subVec3(a: Vec3, b: Vec3): Vec3 {
  return { x: a.x - b.x, y: a.y - b.y, z: a.z - b.z };
}

export function scaleVec3(v: Vec3, s: number): Vec3 {
  return { x: v.x * s, y: v.y * s, z: v.z * s };
}

export function dotVec3(a: Vec3, b: Vec3): number {
  return a.x * b.x + a.y * b.y + a.z * b.z;
}

export function crossVec3(a: Vec3, b: Vec3): Vec3 {
  return {
    x: a.y * b.z - a.z * b.y,
    y: a.z * b.x - a.x * b.z,
    z: a.x * b.y - a.y * b.x,
  };
}

export function lengthVec3(v: Vec3): number {
  return Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z);
}

export function normalizeVec3(v: Vec3): Vec3 {
  const len = lengthVec3(v);
  if (len === 0) return { x: 0, y: 0, z: 0 };
  return { x: v.x / len, y: v.y / len, z: v.z / len };
}

export function negateVec3(v: Vec3): Vec3 {
  return { x: -v.x, y: -v.y, z: -v.z };
}

export function computeExtents(mesh: Mesh): Extents {
  let minX = Infinity, minY = Infinity, minZ = Infinity;
  let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;
  for (const tri of mesh.triangles) {
    for (const v of [tri.v1, tri.v2, tri.v3]) {
      if (v.x < minX) minX = v.x;
      if (v.y < minY) minY = v.y;
      if (v.z < minZ) minZ = v.z;
      if (v.x > maxX) maxX = v.x;
      if (v.y > maxY) maxY = v.y;
      if (v.z > maxZ) maxZ = v.z;
    }
  }
  return {
    min: { x: minX, y: minY, z: minZ },
    max: { x: maxX, y: maxY, z: maxZ },
  };
}

export function computeCenter(ext: Extents): Vec3 {
  return {
    x: (ext.min.x + ext.max.x) / 2,
    y: (ext.min.y + ext.max.y) / 2,
    z: (ext.min.z + ext.max.z) / 2,
  };
}

export function triangleArea(tri: Triangle): number {
  const ab = subVec3(tri.v2, tri.v1);
  const ac = subVec3(tri.v3, tri.v1);
  return lengthVec3(crossVec3(ab, ac)) / 2;
}

export function computeTriangleNormal(tri: Triangle): Vec3 {
  const ab = subVec3(tri.v2, tri.v1);
  const ac = subVec3(tri.v3, tri.v1);
  return normalizeVec3(crossVec3(ab, ac));
}

/** Signed volume of tetrahedron formed by triangle and origin */
export function signedVolumeOfTriangle(tri: Triangle): number {
  const { v1, v2, v3 } = tri;
  return (
    (v1.x * (v2.y * v3.z - v3.y * v2.z) -
      v2.x * (v1.y * v3.z - v3.y * v1.z) +
      v3.x * (v1.y * v2.z - v2.y * v1.z)) /
    6.0
  );
}

export function computeVolume(mesh: Mesh): number {
  let vol = 0;
  for (const tri of mesh.triangles) {
    vol += signedVolumeOfTriangle(tri);
  }
  return Math.abs(vol);
}

export function computeTotalSurfaceArea(mesh: Mesh): number {
  let area = 0;
  for (const tri of mesh.triangles) {
    area += triangleArea(tri);
  }
  return area;
}

export function translateMesh(mesh: Mesh, offset: Vec3): Mesh {
  return {
    name: mesh.name,
    triangles: mesh.triangles.map((tri) => ({
      normal: tri.normal,
      v1: addVec3(tri.v1, offset),
      v2: addVec3(tri.v2, offset),
      v3: addVec3(tri.v3, offset),
      attribute: tri.attribute,
    })),
  };
}

export function parseAxes(s: string): Set<Axis> {
  const axes = new Set<Axis>();
  for (const ch of s.toLowerCase()) {
    if (ch === "x" || ch === "y" || ch === "z") {
      axes.add(ch);
    }
  }
  return axes;
}

export function parsePoint(s: string): Vec3 | null {
  const parts = s.split(",").map(Number);
  if (parts.length === 3 && parts.every((p) => !isNaN(p))) {
    return { x: parts[0]!, y: parts[1]!, z: parts[2]! };
  }
  return null;
}

export function resolveAboutPoint(about: AboutPoint, mesh: Mesh): Vec3 {
  switch (about.kind) {
    case "origin":
      return vec3(0, 0, 0);
    case "center":
      return computeCenter(computeExtents(mesh));
    case "point":
      return about.point ?? vec3(0, 0, 0);
  }
}

export function vertexKey(v: Vec3): string {
  return `${v.x.toFixed(8)},${v.y.toFixed(8)},${v.z.toFixed(8)}`;
}

export function edgeKey(a: Vec3, b: Vec3): string {
  return `${vertexKey(a)}->${vertexKey(b)}`;
}

export function isManifold(mesh: Mesh): boolean {
  const edgeCounts = new Map<string, number>();
  for (const tri of mesh.triangles) {
    const edges: [Vec3, Vec3][] = [
      [tri.v1, tri.v2],
      [tri.v2, tri.v3],
      [tri.v3, tri.v1],
    ];
    for (const [a, b] of edges) {
      const key = edgeKey(a, b);
      edgeCounts.set(key, (edgeCounts.get(key) ?? 0) + 1);
    }
  }
  // For a watertight mesh, every directed edge a->b must have exactly one reverse edge b->a
  for (const tri of mesh.triangles) {
    const edges: [Vec3, Vec3][] = [
      [tri.v1, tri.v2],
      [tri.v2, tri.v3],
      [tri.v3, tri.v1],
    ];
    for (const [a, b] of edges) {
      const reverseKey = edgeKey(b, a);
      const count = edgeCounts.get(reverseKey);
      if (count !== 1) return false;
    }
  }
  return true;
}
