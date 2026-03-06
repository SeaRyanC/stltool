import { subVec3, addVec3, crossVec3, dotVec3, scaleVec3, computeNormal } from '../geometry.js';
function rodrigues(v, k, theta) {
    const cosT = Math.cos(theta);
    const sinT = Math.sin(theta);
    const kDotV = dotVec3(k, v);
    return addVec3(addVec3(scaleVec3(v, cosT), scaleVec3(crossVec3(k, v), sinT)), scaleVec3(k, kDotV * (1 - cosT)));
}
export function rotateMesh(mesh, axis, degrees, about = { x: 0, y: 0, z: 0 }) {
    const theta = (degrees * Math.PI) / 180;
    const k = axis === 'x' ? { x: 1, y: 0, z: 0 } : axis === 'y' ? { x: 0, y: 1, z: 0 } : { x: 0, y: 0, z: 1 };
    const rotVert = (v) => addVec3(about, rodrigues(subVec3(v, about), k, theta));
    return {
        triangles: mesh.triangles.map(t => {
            const v1 = rotVert(t.v1);
            const v2 = rotVert(t.v2);
            const v3 = rotVert(t.v3);
            return { normal: computeNormal(v1, v2, v3), v1, v2, v3 };
        }),
    };
}
