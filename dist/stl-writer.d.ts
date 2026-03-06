import type { Mesh } from './geometry.js';
export declare function meshToBuffer(mesh: Mesh): Buffer;
export declare function writeMesh(mesh: Mesh, filePath: string): Promise<void>;
