import type { Mesh, Vec3 } from '../geometry.js';
import { meshBounds, addVec3 } from '../geometry.js';

export function centerMesh(mesh: Mesh, axes: string = 'xyz', about: Vec3 = { x: 0, y: 0, z: 0 }): Mesh {
  const { min, max } = meshBounds(mesh);
  const center = {
    x: (min.x + max.x) / 2,
    y: (min.y + max.y) / 2,
    z: (min.z + max.z) / 2,
  };
  const translate = {
    x: axes.includes('x') ? about.x - center.x : 0,
    y: axes.includes('y') ? about.y - center.y : 0,
    z: axes.includes('z') ? about.z - center.z : 0,
  };
  return {
    triangles: mesh.triangles.map(t => ({
      normal: t.normal,
      v1: addVec3(t.v1, translate),
      v2: addVec3(t.v2, translate),
      v3: addVec3(t.v3, translate),
    })),
  };
}
