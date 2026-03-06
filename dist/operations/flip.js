import { computeNormal } from '../geometry.js';
export function flipMesh(mesh, axes, about = { x: 0, y: 0, z: 0 }) {
    const flipCount = ['x', 'y', 'z'].filter(a => axes.includes(a)).length;
    const flipVert = (v) => ({
        x: axes.includes('x') ? 2 * about.x - v.x : v.x,
        y: axes.includes('y') ? 2 * about.y - v.y : v.y,
        z: axes.includes('z') ? 2 * about.z - v.z : v.z,
    });
    return {
        triangles: mesh.triangles.map(t => {
            const v1 = flipVert(t.v1);
            const v2 = flipVert(t.v2);
            const v3 = flipVert(t.v3);
            // Odd number of axis flips reverses winding
            if (flipCount % 2 === 1) {
                return { normal: computeNormal(v1, v3, v2), v1, v2: v3, v3: v2 };
            }
            return { normal: computeNormal(v1, v2, v3), v1, v2, v3 };
        }),
    };
}
