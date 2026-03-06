import { meshBounds, computeMeshVolume } from '../geometry.js';
import { splitMesh } from './split.js';
import { isManifold } from './validate.js';
export function measureMesh(mesh) {
    const { min, max } = meshBounds(mesh);
    const extents = { x: max.x - min.x, y: max.y - min.y, z: max.z - min.z };
    const volume = computeMeshVolume(mesh);
    const weight = (volume / 1000) * 1.14;
    const parts = splitMesh(mesh);
    const volumeCount = parts.length;
    const manifold = isManifold(mesh);
    return { extents, volume, weight, volumeCount, isManifold: manifold };
}
export function printMetrics(metrics, name) {
    console.log(`${name}:`);
    console.log(`  Extents: ${metrics.extents.x.toFixed(2)} x ${metrics.extents.y.toFixed(2)} x ${metrics.extents.z.toFixed(2)} mm`);
    console.log(`  Volume: ${metrics.volume.toFixed(2)} mm³`);
    console.log(`  Weight: ${metrics.weight.toFixed(2)} g`);
    if (metrics.volumeCount !== 1) {
        console.log(`  Volume count: ${metrics.volumeCount}`);
    }
    if (!metrics.isManifold) {
        console.log(`  Not manifold`);
    }
}
