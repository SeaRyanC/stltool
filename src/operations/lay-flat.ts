import type { Mesh, Vec3 } from '../geometry.js';
import {
  crossVec3, dotVec3, normalizeVec3, magnitudeVec3,
  scaleVec3, addVec3, subVec3, computeNormal, triangleArea, meshBounds
} from '../geometry.js';
import { floorMesh } from './floor.js';

function rodrigues(v: Vec3, k: Vec3, theta: number): Vec3 {
  const cosT = Math.cos(theta);
  const sinT = Math.sin(theta);
  const kDotV = dotVec3(k, v);
  return addVec3(
    addVec3(scaleVec3(v, cosT), scaleVec3(crossVec3(k, v), sinT)),
    scaleVec3(k, kDotV * (1 - cosT))
  );
}

function rotateMeshByAxisAngle(mesh: Mesh, k: Vec3, theta: number): Mesh {
  const rotVert = (v: Vec3): Vec3 => rodrigues(v, k, theta);
  return {
    triangles: mesh.triangles.map(t => {
      const v1 = rotVert(t.v1);
      const v2 = rotVert(t.v2);
      const v3 = rotVert(t.v3);
      return { normal: computeNormal(v1, v2, v3), v1, v2, v3 };
    }),
  };
}

export function layFlat(mesh: Mesh, axis: 'x' | 'y' | 'z' = 'z', verbose: boolean = false): Mesh {
  const axisVec: Vec3 = axis === 'x' ? { x: 1, y: 0, z: 0 } : axis === 'y' ? { x: 0, y: 1, z: 0 } : { x: 0, y: 0, z: 1 };
  const downTarget = scaleVec3(axisVec, -1); // we want the bottom face's outward normal to point "down" = -axis

  const totalArea = mesh.triangles.reduce((sum, t) => sum + triangleArea(t), 0);

  // Round normal to 2 decimal places for grouping
  function roundKey(n: Vec3): string {
    return `${n.x.toFixed(2)},${n.y.toFixed(2)},${n.z.toFixed(2)}`;
  }

  // Candidate directions: for each triangle, consider its outward normal negated as the "down" direction
  const candidateMap = new Map<string, Vec3>();
  for (const t of mesh.triangles) {
    const n = normalizeVec3(t.normal);
    const down = scaleVec3(n, -1);
    const key = roundKey(down);
    if (!candidateMap.has(key)) candidateMap.set(key, down);
  }

  let bestMesh: Mesh | null = null;
  let bestScore = Infinity;

  for (const [, downDir] of candidateMap) {
    // Find triangles at extreme extent in downDir direction
    // The "bottom" when downDir is "down" means the triangles at max extent in the downDir direction
    // (i.e., most negative in -downDir = axisVec direction)
    // Actually: if downDir points "down", then bottommost triangles are those most in the downDir direction
    // Project each triangle centroid onto downDir
    const projections = mesh.triangles.map(t => {
      const cx = (t.v1.x + t.v2.x + t.v3.x) / 3;
      const cy = (t.v1.y + t.v2.y + t.v3.y) / 3;
      const cz = (t.v1.z + t.v2.z + t.v3.z) / 3;
      return dotVec3({ x: cx, y: cy, z: cz }, downDir);
    });
    const maxProj = Math.max(...projections);
    const eps = 1e-4;
    const bottomTris = mesh.triangles.filter((_, i) => projections[i] >= maxProj - eps);

    // Check flat area
    const flatArea = bottomTris.reduce((sum, t) => sum + triangleArea(t), 0);
    const minFlatArea = Math.min(totalArea * 0.05, 10);
    if (flatArea < minFlatArea) continue;

    // Compute overhang: triangles where dot(normal, downDir) > cos(45°) = 0.707
    // (normal pointing mostly in the downDir direction = underside = overhang)
    // Exclude bottom triangles
    const bottomSet = new Set(bottomTris);
    const cos45 = Math.cos(Math.PI / 4);
    let overhangArea = 0;
    for (const t of mesh.triangles) {
      if (bottomSet.has(t)) continue;
      const n = normalizeVec3(t.normal);
      if (dotVec3(n, downDir) > cos45) {
        overhangArea += triangleArea(t);
      }
    }

    if (verbose) {
      console.log(`Candidate down=${roundKey(downDir)}: flatArea=${flatArea.toFixed(2)}, overhang=${overhangArea.toFixed(2)}`);
    }

    if (overhangArea < bestScore) {
      bestScore = overhangArea;
      // Compute rotation: rotate downDir to align with downTarget (-axisVec)
      const rotAxis = crossVec3(downDir, downTarget);
      const rotAxisMag = magnitudeVec3(rotAxis);
      let rotated: Mesh;
      if (rotAxisMag < 1e-10) {
        // Already aligned or anti-aligned
        const dp = dotVec3(downDir, downTarget);
        if (dp < 0) {
          // 180-degree rotation, pick any perpendicular axis
          const perp: Vec3 = Math.abs(downDir.x) < 0.9 ? { x: 1, y: 0, z: 0 } : { x: 0, y: 1, z: 0 };
          rotated = rotateMeshByAxisAngle(mesh, normalizeVec3(crossVec3(downDir, perp)), Math.PI);
        } else {
          rotated = { triangles: [...mesh.triangles] };
        }
      } else {
        const k = normalizeVec3(rotAxis);
        const angle = Math.acos(Math.max(-1, Math.min(1, dotVec3(normalizeVec3(downDir), normalizeVec3(downTarget)))));
        rotated = rotateMeshByAxisAngle(mesh, k, angle);
      }
      bestMesh = floorMesh(rotated, axis);
    }
  }

  if (!bestMesh) return floorMesh(mesh, axis);
  return bestMesh;
}
