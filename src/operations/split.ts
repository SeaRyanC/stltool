import type { Mesh, Triangle } from '../geometry.js';

function vertKey(v: { x: number; y: number; z: number }): string {
  return `${v.x},${v.y},${v.z}`;
}

export function splitMesh(mesh: Mesh): Mesh[] {
  const tris = mesh.triangles;
  if (tris.length === 0) return [mesh];

  // Build vertex -> triangle index map
  const vertToTris = new Map<string, Set<number>>();
  for (let i = 0; i < tris.length; i++) {
    for (const v of [tris[i].v1, tris[i].v2, tris[i].v3]) {
      const k = vertKey(v);
      if (!vertToTris.has(k)) vertToTris.set(k, new Set());
      vertToTris.get(k)!.add(i);
    }
  }

  const visited = new Array(tris.length).fill(false);
  const components: Triangle[][] = [];

  for (let start = 0; start < tris.length; start++) {
    if (visited[start]) continue;
    const component: Triangle[] = [];
    const queue = [start];
    visited[start] = true;
    while (queue.length > 0) {
      const idx = queue.shift()!;
      component.push(tris[idx]);
      for (const v of [tris[idx].v1, tris[idx].v2, tris[idx].v3]) {
        const neighbors = vertToTris.get(vertKey(v)) ?? new Set();
        for (const ni of neighbors) {
          if (!visited[ni]) {
            visited[ni] = true;
            queue.push(ni);
          }
        }
      }
    }
    components.push(component);
  }

  if (components.length === 1) return [mesh];
  return components.map(triangles => ({ triangles }));
}
