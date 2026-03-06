import type { Mesh, Vec3 } from '../geometry.js';
import { subVec3, addVec3, scaleVec3Components, computeNormal } from '../geometry.js';

export function scaleMesh(mesh: Mesh, scale: Vec3, about: Vec3 = { x: 0, y: 0, z: 0 }): Mesh {
  const scaleVert = (v: Vec3): Vec3 => addVec3(about, scaleVec3Components(subVec3(v, about), scale));
  return {
    triangles: mesh.triangles.map(t => {
      const v1 = scaleVert(t.v1);
      const v2 = scaleVert(t.v2);
      const v3 = scaleVert(t.v3);
      return { normal: computeNormal(v1, v2, v3), v1, v2, v3 };
    }),
  };
}
