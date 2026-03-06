export function addVec3(a, b) {
    return { x: a.x + b.x, y: a.y + b.y, z: a.z + b.z };
}
export function subVec3(a, b) {
    return { x: a.x - b.x, y: a.y - b.y, z: a.z - b.z };
}
export function scaleVec3(v, s) {
    return { x: v.x * s, y: v.y * s, z: v.z * s };
}
export function scaleVec3Components(v, s) {
    return { x: v.x * s.x, y: v.y * s.y, z: v.z * s.z };
}
export function dotVec3(a, b) {
    return a.x * b.x + a.y * b.y + a.z * b.z;
}
export function crossVec3(a, b) {
    return {
        x: a.y * b.z - a.z * b.y,
        y: a.z * b.x - a.x * b.z,
        z: a.x * b.y - a.y * b.x,
    };
}
export function magnitudeVec3(v) {
    return Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z);
}
export function normalizeVec3(v) {
    const m = magnitudeVec3(v);
    if (m < 1e-10)
        return { x: 0, y: 0, z: 1 };
    return scaleVec3(v, 1 / m);
}
export function computeNormal(v1, v2, v3) {
    return normalizeVec3(crossVec3(subVec3(v2, v1), subVec3(v3, v1)));
}
export function triangleArea(t) {
    const e1 = subVec3(t.v2, t.v1);
    const e2 = subVec3(t.v3, t.v1);
    return magnitudeVec3(crossVec3(e1, e2)) / 2;
}
export function meshBounds(mesh) {
    if (mesh.triangles.length === 0) {
        return { min: { x: 0, y: 0, z: 0 }, max: { x: 0, y: 0, z: 0 } };
    }
    const verts = mesh.triangles.flatMap(t => [t.v1, t.v2, t.v3]);
    const xs = verts.map(v => v.x);
    const ys = verts.map(v => v.y);
    const zs = verts.map(v => v.z);
    return {
        min: { x: Math.min(...xs), y: Math.min(...ys), z: Math.min(...zs) },
        max: { x: Math.max(...xs), y: Math.max(...ys), z: Math.max(...zs) },
    };
}
export function meshCenter(mesh) {
    const { min, max } = meshBounds(mesh);
    return {
        x: (min.x + max.x) / 2,
        y: (min.y + max.y) / 2,
        z: (min.z + max.z) / 2,
    };
}
export function computeMeshVolume(mesh) {
    let vol = 0;
    for (const t of mesh.triangles) {
        vol += dotVec3(t.v1, crossVec3(t.v2, t.v3));
    }
    return Math.abs(vol / 6);
}
