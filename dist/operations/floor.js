import { meshBounds, addVec3 } from '../geometry.js';
export function floorMesh(mesh, axes = 'xyz') {
    const { min } = meshBounds(mesh);
    const translate = {
        x: axes.includes('x') ? -min.x : 0,
        y: axes.includes('y') ? -min.y : 0,
        z: axes.includes('z') ? -min.z : 0,
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
