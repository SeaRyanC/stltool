function vertKey(v) {
    return `${v.x},${v.y},${v.z}`;
}
export function isManifold(mesh) {
    const edgeCount = new Map();
    for (const t of mesh.triangles) {
        const keys = [vertKey(t.v1), vertKey(t.v2), vertKey(t.v3)];
        const edges = [
            [keys[0], keys[1]],
            [keys[1], keys[2]],
            [keys[2], keys[0]],
        ];
        for (const [a, b] of edges) {
            const edgeKey = a < b ? `${a}|${b}` : `${b}|${a}`;
            edgeCount.set(edgeKey, (edgeCount.get(edgeKey) ?? 0) + 1);
        }
    }
    for (const count of edgeCount.values()) {
        if (count !== 2)
            return false;
    }
    return true;
}
