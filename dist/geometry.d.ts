export interface Vec3 {
    x: number;
    y: number;
    z: number;
}
export interface Triangle {
    normal: Vec3;
    v1: Vec3;
    v2: Vec3;
    v3: Vec3;
}
export interface Mesh {
    triangles: Triangle[];
}
export declare function addVec3(a: Vec3, b: Vec3): Vec3;
export declare function subVec3(a: Vec3, b: Vec3): Vec3;
export declare function scaleVec3(v: Vec3, s: number): Vec3;
export declare function scaleVec3Components(v: Vec3, s: Vec3): Vec3;
export declare function dotVec3(a: Vec3, b: Vec3): number;
export declare function crossVec3(a: Vec3, b: Vec3): Vec3;
export declare function magnitudeVec3(v: Vec3): number;
export declare function normalizeVec3(v: Vec3): Vec3;
export declare function computeNormal(v1: Vec3, v2: Vec3, v3: Vec3): Vec3;
export declare function triangleArea(t: Triangle): number;
export declare function meshBounds(mesh: Mesh): {
    min: Vec3;
    max: Vec3;
};
export declare function meshCenter(mesh: Mesh): Vec3;
export declare function computeMeshVolume(mesh: Mesh): number;
