import type { Mesh } from '../geometry.js';
export interface MeshMetrics {
    extents: {
        x: number;
        y: number;
        z: number;
    };
    volume: number;
    weight: number;
    volumeCount: number;
    isManifold: boolean;
}
export declare function measureMesh(mesh: Mesh): MeshMetrics;
export declare function printMetrics(metrics: MeshMetrics, name: string): void;
