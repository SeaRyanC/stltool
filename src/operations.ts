import type { Mesh, Vec3, Axis, AboutPoint, Triangle } from "./types.js";
import {
  computeExtents,
  computeCenter,
  computeVolume,
  translateMesh,
  parseAxes,
  resolveAboutPoint,
  vec3,
  computeTriangleNormal,
  triangleArea,
  computeTotalSurfaceArea,
  isManifold,
  dotVec3,
  negateVec3,
  normalizeVec3,
  lengthVec3,
  vertexKey,
} from "./geometry.js";

export function centerMesh(
  mesh: Mesh,
  axesStr: string,
  about: Vec3,
): Mesh {
  const axes = parseAxes(axesStr);
  const ext = computeExtents(mesh);
  const center = computeCenter(ext);
  const offset: Vec3 = {
    x: axes.has("x") ? about.x - center.x : 0,
    y: axes.has("y") ? about.y - center.y : 0,
    z: axes.has("z") ? about.z - center.z : 0,
  };
  return translateMesh(mesh, offset);
}

export function floorMesh(mesh: Mesh, axesStr: string): Mesh {
  const axes = parseAxes(axesStr);
  const ext = computeExtents(mesh);
  const offset: Vec3 = {
    x: axes.has("x") ? -ext.min.x : 0,
    y: axes.has("y") ? -ext.min.y : 0,
    z: axes.has("z") ? -ext.min.z : 0,
  };
  return translateMesh(mesh, offset);
}

export function scaleMesh(
  mesh: Mesh,
  scaleVec: Vec3,
  about: AboutPoint,
): Mesh {
  const aboutPt = resolveAboutPoint(about, mesh);
  return {
    name: mesh.name,
    triangles: mesh.triangles.map((tri) => {
      const v1 = scalePoint(tri.v1, scaleVec, aboutPt);
      const v2 = scalePoint(tri.v2, scaleVec, aboutPt);
      const v3 = scalePoint(tri.v3, scaleVec, aboutPt);
      const newTri: Triangle = { ...tri, v1, v2, v3 };
      // Check if we need to flip the winding order (odd number of negative scale factors)
      const negCount = [scaleVec.x, scaleVec.y, scaleVec.z].filter((s) => s < 0).length;
      if (negCount % 2 === 1) {
        newTri.v2 = v3;
        newTri.v3 = v2;
      }
      newTri.normal = computeTriangleNormal(newTri);
      return newTri;
    }),
  };
}

function scalePoint(v: Vec3, scale: Vec3, about: Vec3): Vec3 {
  return {
    x: (v.x - about.x) * scale.x + about.x,
    y: (v.y - about.y) * scale.y + about.y,
    z: (v.z - about.z) * scale.z + about.z,
  };
}

export function flipMesh(
  mesh: Mesh,
  axesStr: string,
  about: AboutPoint,
): Mesh {
  const axes = parseAxes(axesStr);
  const scaleVec: Vec3 = {
    x: axes.has("x") ? -1 : 1,
    y: axes.has("y") ? -1 : 1,
    z: axes.has("z") ? -1 : 1,
  };
  return scaleMesh(mesh, scaleVec, about);
}

export function rotateMesh(
  mesh: Mesh,
  axis: Axis,
  degrees: number,
  about: AboutPoint,
): Mesh {
  const aboutPt = resolveAboutPoint(about, mesh);
  const radians = (degrees * Math.PI) / 180;
  const cos = Math.cos(radians);
  const sin = Math.sin(radians);

  function rotatePoint(v: Vec3): Vec3 {
    const rel: Vec3 = {
      x: v.x - aboutPt.x,
      y: v.y - aboutPt.y,
      z: v.z - aboutPt.z,
    };
    let result: Vec3;
    switch (axis) {
      case "x":
        result = {
          x: rel.x,
          y: rel.y * cos - rel.z * sin,
          z: rel.y * sin + rel.z * cos,
        };
        break;
      case "y":
        result = {
          x: rel.x * cos + rel.z * sin,
          y: rel.y,
          z: -rel.x * sin + rel.z * cos,
        };
        break;
      case "z":
        result = {
          x: rel.x * cos - rel.y * sin,
          y: rel.x * sin + rel.y * cos,
          z: rel.z,
        };
        break;
    }
    return {
      x: result.x + aboutPt.x,
      y: result.y + aboutPt.y,
      z: result.z + aboutPt.z,
    };
  }

  return {
    name: mesh.name,
    triangles: mesh.triangles.map((tri) => {
      const v1 = rotatePoint(tri.v1);
      const v2 = rotatePoint(tri.v2);
      const v3 = rotatePoint(tri.v3);
      const newTri: Triangle = { ...tri, v1, v2, v3 };
      newTri.normal = computeTriangleNormal(newTri);
      return newTri;
    }),
  };
}

export function splitMesh(mesh: Mesh): Mesh[] {
  // Build adjacency graph based on shared vertices
  const vertexToTriangles = new Map<string, number[]>();

  for (let i = 0; i < mesh.triangles.length; i++) {
    const tri = mesh.triangles[i]!;
    for (const v of [tri.v1, tri.v2, tri.v3]) {
      const key = vertexKey(v);
      const list = vertexToTriangles.get(key);
      if (list) {
        list.push(i);
      } else {
        vertexToTriangles.set(key, [i]);
      }
    }
  }

  const visited = new Set<number>();
  const groups: number[][] = [];

  for (let i = 0; i < mesh.triangles.length; i++) {
    if (visited.has(i)) continue;
    const group: number[] = [];
    const queue = [i];
    visited.add(i);

    while (queue.length > 0) {
      const idx = queue.pop()!;
      group.push(idx);
      const tri = mesh.triangles[idx]!;
      for (const v of [tri.v1, tri.v2, tri.v3]) {
        const key = vertexKey(v);
        const neighbors = vertexToTriangles.get(key);
        if (neighbors) {
          for (const n of neighbors) {
            if (!visited.has(n)) {
              visited.add(n);
              queue.push(n);
            }
          }
        }
      }
    }

    groups.push(group);
  }

  if (groups.length <= 1) {
    return [mesh];
  }

  return groups.map((group, idx) => ({
    name: mesh.name ? `${mesh.name}_${idx + 1}` : `part_${idx + 1}`,
    triangles: group.map((i) => mesh.triangles[i]!),
  }));
}

export interface MeasureResult {
  extents: { min: Vec3; max: Vec3; size: Vec3 };
  volume: number;
  weight: number;
  volumeCount: number;
  isManifold: boolean;
}

export function measureMesh(mesh: Mesh): MeasureResult {
  const ext = computeExtents(mesh);
  const size: Vec3 = {
    x: ext.max.x - ext.min.x,
    y: ext.max.y - ext.min.y,
    z: ext.max.z - ext.min.z,
  };

  const manifold = isManifold(mesh);
  const parts = splitMesh(mesh);
  let totalVolume = 0;
  for (const part of parts) {
    totalVolume += computeVolume(part);
  }

  // Density of PLA: 1.14 g/cm³ = 1.14e-3 g/mm³
  const density = 1.14e-3;
  const weight = totalVolume * density;

  return {
    extents: { min: ext.min, max: ext.max, size },
    volume: totalVolume,
    weight,
    volumeCount: parts.length,
    isManifold: manifold,
  };
}

export function formatMeasure(result: MeasureResult): string {
  const lines: string[] = [];
  lines.push(
    `Extents: ${result.extents.size.x.toFixed(2)} x ${result.extents.size.y.toFixed(2)} x ${result.extents.size.z.toFixed(2)} mm`,
  );
  lines.push(
    `  Min: (${result.extents.min.x.toFixed(2)}, ${result.extents.min.y.toFixed(2)}, ${result.extents.min.z.toFixed(2)})`,
  );
  lines.push(
    `  Max: (${result.extents.max.x.toFixed(2)}, ${result.extents.max.y.toFixed(2)}, ${result.extents.max.z.toFixed(2)})`,
  );
  lines.push(`Volume: ${(result.volume / 1000).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} cm³`);
  lines.push(`Weight: ${result.weight.toFixed(2)} g`);
  if (result.volumeCount !== 1) {
    lines.push(`Volumes: ${result.volumeCount}`);
  }
  if (!result.isManifold) {
    lines.push(`Warning: Mesh is not manifold`);
  }
  return lines.join("\n");
}

export function layFlat(mesh: Mesh, axis: Axis, verbose: boolean): Mesh {
  const totalArea = computeTotalSurfaceArea(mesh);
  const minCandidateArea = Math.min(totalArea * 0.05, 10);

  // Collect candidate orientations from triangle normals
  // Only consider triangles at the maximal extent along their normal direction
  // and which constitute some threshold of surface area
  const candidates: { normal: Vec3; area: number }[] = [];

  // Group triangles by similar normals
  const normalGroups = new Map<string, { normal: Vec3; area: number; triangles: Triangle[] }>();

  for (const tri of mesh.triangles) {
    const n = computeTriangleNormal(tri);
    if (lengthVec3(n) < 0.001) continue;

    // Quantize normal for grouping (to ~1 degree precision)
    const qn = {
      x: Math.round(n.x * 100) / 100,
      y: Math.round(n.y * 100) / 100,
      z: Math.round(n.z * 100) / 100,
    };
    const key = `${qn.x},${qn.y},${qn.z}`;
    const existing = normalGroups.get(key);
    const area = triangleArea(tri);
    if (existing) {
      existing.area += area;
      existing.triangles.push(tri);
    } else {
      normalGroups.set(key, { normal: n, area, triangles: [tri] });
    }
  }

  // Filter candidates by area threshold
  for (const [, group] of normalGroups) {
    if (group.area >= minCandidateArea) {
      candidates.push({ normal: group.normal, area: group.area });
    }
  }

  if (candidates.length === 0) {
    return mesh;
  }

  // For each candidate: orient so that the candidate normal points down (-axis)
  // Then compute overhang area (surface area at > 45 degrees from vertical)
  let bestOrientation: { normal: Vec3; overhang: number } | null = null;

  const downVector: Vec3 = {
    x: axis === "x" ? -1 : 0,
    y: axis === "y" ? -1 : 0,
    z: axis === "z" ? -1 : 0,
  };
  const upVector = negateVec3(downVector);

  for (const candidate of candidates) {
    // Compute rotation to align candidate.normal with downVector
    const overhang = computeOverhangForOrientation(mesh, candidate.normal, downVector, upVector);

    if (verbose) {
      console.log(
        `Candidate normal (${candidate.normal.x.toFixed(3)}, ${candidate.normal.y.toFixed(3)}, ${candidate.normal.z.toFixed(3)}) ` +
          `area=${candidate.area.toFixed(2)} overhang=${overhang.toFixed(2)}`,
      );
    }

    if (bestOrientation === null || overhang < bestOrientation.overhang) {
      bestOrientation = { normal: candidate.normal, overhang };
    }
  }

  if (!bestOrientation) return mesh;

  if (verbose) {
    console.log(
      `Best orientation: normal (${bestOrientation.normal.x.toFixed(3)}, ${bestOrientation.normal.y.toFixed(3)}, ${bestOrientation.normal.z.toFixed(3)}) ` +
        `overhang=${bestOrientation.overhang.toFixed(2)}`,
    );
  }

  // Apply the rotation that aligns bestOrientation.normal with downVector
  let result = rotateToAlign(mesh, bestOrientation.normal, downVector);

  // Floor the result
  result = floorMesh(result, axis);

  return result;
}

function computeOverhangForOrientation(
  mesh: Mesh,
  candidateNormal: Vec3,
  downVector: Vec3,
  upVector: Vec3,
): number {
  // Conceptually rotate the mesh so candidateNormal aligns with downVector
  // Then count overhang area
  // Instead of rotating all vertices, we rotate the normals
  const { rotMatrix } = getAlignmentRotation(candidateNormal, downVector);

  let overhangArea = 0;
  const overhangThreshold = Math.cos((45 * Math.PI) / 180); // cos(45°)

  for (const tri of mesh.triangles) {
    const n = computeTriangleNormal(tri);
    const rotatedN = applyRotMatrix(n, rotMatrix);

    // A face is overhang if its normal points somewhat downward
    // (the dot product with up is negative or near zero)
    // More precisely, overhang if angle from up > 135° (i.e. pointing down with > 45° from vertical down)
    // Actually: overhang if the surface faces downward at > 45° from horizontal
    const dotUp = dotVec3(rotatedN, upVector);
    if (dotUp < -overhangThreshold) {
      // This face is pointing down at more than 45° from horizontal
      overhangArea += triangleArea(tri);
    }
  }

  return overhangArea;
}

function getAlignmentRotation(
  from: Vec3,
  to: Vec3,
): { rotMatrix: number[][] } {
  const f = normalizeVec3(from);
  const t = normalizeVec3(to);

  const dot = dotVec3(f, t);

  // If already aligned
  if (dot > 0.9999) {
    return {
      rotMatrix: [
        [1, 0, 0],
        [0, 1, 0],
        [0, 0, 1],
      ],
    };
  }

  // If opposite
  if (dot < -0.9999) {
    // 180 degree rotation around any perpendicular axis
    let perp: Vec3;
    if (Math.abs(f.x) < 0.9) {
      perp = normalizeVec3({ x: 1 - f.x * f.x, y: -f.x * f.y, z: -f.x * f.z });
    } else {
      perp = normalizeVec3({ x: -f.y * f.x, y: 1 - f.y * f.y, z: -f.y * f.z });
    }
    // Rodrigues' rotation formula for 180 degrees
    return {
      rotMatrix: [
        [2 * perp.x * perp.x - 1, 2 * perp.x * perp.y, 2 * perp.x * perp.z],
        [2 * perp.y * perp.x, 2 * perp.y * perp.y - 1, 2 * perp.y * perp.z],
        [2 * perp.z * perp.x, 2 * perp.z * perp.y, 2 * perp.z * perp.z - 1],
      ],
    };
  }

  // Rodrigues' rotation formula
  const { x: vx, y: vy, z: vz } = normalizeVec3({
    x: f.y * t.z - f.z * t.y,
    y: f.z * t.x - f.x * t.z,
    z: f.x * t.y - f.y * t.x,
  });
  const c = dot;
  const k = 1 / (1 + c);

  return {
    rotMatrix: [
      [vx * vx * k + c, vx * vy * k - vz, vx * vz * k + vy],
      [vy * vx * k + vz, vy * vy * k + c, vy * vz * k - vx],
      [vz * vx * k - vy, vz * vy * k + vx, vz * vz * k + c],
    ],
  };
}

function applyRotMatrix(v: Vec3, m: number[][]): Vec3 {
  return {
    x: m[0]![0]! * v.x + m[0]![1]! * v.y + m[0]![2]! * v.z,
    y: m[1]![0]! * v.x + m[1]![1]! * v.y + m[1]![2]! * v.z,
    z: m[2]![0]! * v.x + m[2]![1]! * v.y + m[2]![2]! * v.z,
  };
}

function rotateToAlign(mesh: Mesh, from: Vec3, to: Vec3): Mesh {
  const { rotMatrix } = getAlignmentRotation(from, to);
  return {
    name: mesh.name,
    triangles: mesh.triangles.map((tri) => {
      const v1 = applyRotMatrix(tri.v1, rotMatrix);
      const v2 = applyRotMatrix(tri.v2, rotMatrix);
      const v3 = applyRotMatrix(tri.v3, rotMatrix);
      const newTri: Triangle = { ...tri, v1, v2, v3 };
      newTri.normal = computeTriangleNormal(newTri);
      return newTri;
    }),
  };
}
