import { describe, test, expect, beforeAll } from "@jest/globals";
import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import { parseStl, writeBinaryStl } from "../src/stl-io.js";
import type { Mesh, Vec3 } from "../src/types.js";
import {
  computeExtents,
  computeCenter,
  computeVolume,
  isManifold,
  parseAxes,
  parsePoint,
} from "../src/geometry.js";
import {
  centerMesh,
  floorMesh,
  scaleMesh,
  flipMesh,
  rotateMesh,
  splitMesh,
  measureMesh,
  formatMeasure,
  layFlat,
} from "../src/operations.js";
import { parseArgs } from "../src/cli.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const FIXTURES = path.join(__dirname, "fixtures");

function loadCube(): Mesh {
  return parseStl(fs.readFileSync(path.join(FIXTURES, "cube.stl")));
}

function loadTwoCubes(): Mesh {
  return parseStl(fs.readFileSync(path.join(FIXTURES, "two-cubes.stl")));
}

function approxVec3(v: Vec3, expected: Vec3, precision = 2) {
  expect(v.x).toBeCloseTo(expected.x, precision);
  expect(v.y).toBeCloseTo(expected.y, precision);
  expect(v.z).toBeCloseTo(expected.z, precision);
}

describe("STL I/O", () => {
  test("parses binary STL", () => {
    const mesh = loadCube();
    expect(mesh.triangles.length).toBe(12);
  });

  test("parses ASCII STL", () => {
    const buffer = fs.readFileSync(path.join(FIXTURES, "cube-ascii.stl"));
    const mesh = parseStl(buffer);
    expect(mesh.triangles.length).toBe(12);
    expect(mesh.name).toBe("cube");
  });

  test("binary round-trip preserves triangle count", () => {
    const mesh = loadCube();
    const buffer = writeBinaryStl(mesh);
    const mesh2 = parseStl(buffer);
    expect(mesh2.triangles.length).toBe(mesh.triangles.length);
  });

  test("binary round-trip preserves vertex positions", () => {
    const mesh = loadCube();
    const buffer = writeBinaryStl(mesh);
    const mesh2 = parseStl(buffer);
    for (let i = 0; i < mesh.triangles.length; i++) {
      approxVec3(mesh2.triangles[i]!.v1, mesh.triangles[i]!.v1, 4);
      approxVec3(mesh2.triangles[i]!.v2, mesh.triangles[i]!.v2, 4);
      approxVec3(mesh2.triangles[i]!.v3, mesh.triangles[i]!.v3, 4);
    }
  });
});

describe("Geometry", () => {
  test("computeExtents for unit cube at origin", () => {
    const mesh = loadCube();
    const ext = computeExtents(mesh);
    approxVec3(ext.min, { x: 0, y: 0, z: 0 });
    approxVec3(ext.max, { x: 1, y: 1, z: 1 });
  });

  test("computeCenter for unit cube", () => {
    const mesh = loadCube();
    const ext = computeExtents(mesh);
    const center = computeCenter(ext);
    approxVec3(center, { x: 0.5, y: 0.5, z: 0.5 });
  });

  test("computeVolume for unit cube", () => {
    const mesh = loadCube();
    const vol = computeVolume(mesh);
    expect(vol).toBeCloseTo(1.0, 2);
  });

  test("isManifold returns true for valid cube", () => {
    const mesh = loadCube();
    expect(isManifold(mesh)).toBe(true);
  });

  test("parseAxes", () => {
    expect(parseAxes("xy")).toEqual(new Set(["x", "y"]));
    expect(parseAxes("xyz")).toEqual(new Set(["x", "y", "z"]));
    expect(parseAxes("z")).toEqual(new Set(["z"]));
  });

  test("parsePoint", () => {
    expect(parsePoint("1,2,3")).toEqual({ x: 1, y: 2, z: 3 });
    expect(parsePoint("0.5,-1,3.14")).toEqual({ x: 0.5, y: -1, z: 3.14 });
    expect(parsePoint("abc")).toBeNull();
  });
});

describe("Center operation", () => {
  test("centers on all axes about origin", () => {
    const mesh = loadCube();
    const result = centerMesh(mesh, "xyz", { x: 0, y: 0, z: 0 });
    const ext = computeExtents(result);
    const center = computeCenter(ext);
    approxVec3(center, { x: 0, y: 0, z: 0 });
  });

  test("centers on xy only", () => {
    const mesh = loadCube();
    const result = centerMesh(mesh, "xy", { x: 0, y: 0, z: 0 });
    const ext = computeExtents(result);
    const center = computeCenter(ext);
    expect(center.x).toBeCloseTo(0, 2);
    expect(center.y).toBeCloseTo(0, 2);
    expect(center.z).toBeCloseTo(0.5, 2); // unchanged
  });

  test("centers about a specific point", () => {
    const mesh = loadCube();
    const result = centerMesh(mesh, "xyz", { x: 10, y: 20, z: 30 });
    const ext = computeExtents(result);
    const center = computeCenter(ext);
    approxVec3(center, { x: 10, y: 20, z: 30 });
  });
});

describe("Floor operation", () => {
  test("floors on all axes", () => {
    // Shift cube to negative space first
    const mesh = loadCube();
    const shifted = centerMesh(mesh, "xyz", { x: 0, y: 0, z: 0 });
    const result = floorMesh(shifted, "xyz");
    const ext = computeExtents(result);
    expect(ext.min.x).toBeCloseTo(0, 5);
    expect(ext.min.y).toBeCloseTo(0, 5);
    expect(ext.min.z).toBeCloseTo(0, 5);
  });

  test("floors on z only", () => {
    const mesh = loadCube();
    const shifted = centerMesh(mesh, "xyz", { x: 0, y: 0, z: 0 });
    const result = floorMesh(shifted, "z");
    const ext = computeExtents(result);
    expect(ext.min.z).toBeCloseTo(0, 5);
    // x and y should still be negative
    expect(ext.min.x).toBeLessThan(0);
    expect(ext.min.y).toBeLessThan(0);
  });
});

describe("Scale operation", () => {
  test("uniform scale", () => {
    const mesh = loadCube();
    const result = scaleMesh(mesh, { x: 2, y: 2, z: 2 }, { kind: "origin" });
    const ext = computeExtents(result);
    approxVec3(ext.min, { x: 0, y: 0, z: 0 });
    approxVec3(ext.max, { x: 2, y: 2, z: 2 });
  });

  test("scale about center", () => {
    const mesh = loadCube();
    const result = scaleMesh(mesh, { x: 2, y: 2, z: 2 }, { kind: "center" });
    const ext = computeExtents(result);
    // Center should be preserved at 0.5, 0.5, 0.5
    const center = computeCenter(ext);
    approxVec3(center, { x: 0.5, y: 0.5, z: 0.5 });
    // Size should be 2x2x2
    expect(ext.max.x - ext.min.x).toBeCloseTo(2, 2);
  });

  test("non-uniform scale", () => {
    const mesh = loadCube();
    const result = scaleMesh(mesh, { x: 1, y: 2, z: 3 }, { kind: "origin" });
    const ext = computeExtents(result);
    approxVec3(ext.max, { x: 1, y: 2, z: 3 });
  });

  test("scale preserves volume relationship", () => {
    const mesh = loadCube();
    const result = scaleMesh(mesh, { x: 2, y: 2, z: 2 }, { kind: "origin" });
    const vol = computeVolume(result);
    expect(vol).toBeCloseTo(8.0, 1); // 2^3
  });
});

describe("Flip operation", () => {
  test("flip x mirrors across yz plane", () => {
    const mesh = loadCube();
    const result = flipMesh(mesh, "x", { kind: "origin" });
    const ext = computeExtents(result);
    expect(ext.min.x).toBeCloseTo(-1, 2);
    expect(ext.max.x).toBeCloseTo(0, 2);
  });

  test("flip preserves manifoldness", () => {
    const mesh = loadCube();
    const result = flipMesh(mesh, "x", { kind: "origin" });
    expect(isManifold(result)).toBe(true);
  });

  test("double flip restores original", () => {
    const mesh = loadCube();
    const flipped1 = flipMesh(mesh, "x", { kind: "origin" });
    const flipped2 = flipMesh(flipped1, "x", { kind: "origin" });
    const ext = computeExtents(flipped2);
    approxVec3(ext.min, { x: 0, y: 0, z: 0 });
    approxVec3(ext.max, { x: 1, y: 1, z: 1 });
  });
});

describe("Rotate operation", () => {
  test("rotate 90 degrees around z", () => {
    const mesh = loadCube();
    const result = rotateMesh(mesh, "z", 90, { kind: "origin" });
    const ext = computeExtents(result);
    // After 90° rotation around z: x -> y, y -> -x
    expect(ext.min.x).toBeCloseTo(-1, 2);
    expect(ext.max.x).toBeCloseTo(0, 2);
    expect(ext.min.y).toBeCloseTo(0, 2);
    expect(ext.max.y).toBeCloseTo(1, 2);
  });

  test("rotate 360 degrees restores original", () => {
    const mesh = loadCube();
    const result = rotateMesh(mesh, "z", 360, { kind: "origin" });
    const ext = computeExtents(result);
    approxVec3(ext.min, { x: 0, y: 0, z: 0 }, 1);
    approxVec3(ext.max, { x: 1, y: 1, z: 1 }, 1);
  });

  test("rotate preserves manifoldness", () => {
    const mesh = loadCube();
    const result = rotateMesh(mesh, "x", 45, { kind: "origin" });
    expect(isManifold(result)).toBe(true);
  });

  test("rotate preserves volume", () => {
    const mesh = loadCube();
    const result = rotateMesh(mesh, "y", 30, { kind: "origin" });
    const vol = computeVolume(result);
    expect(vol).toBeCloseTo(1.0, 2);
  });
});

describe("Split operation", () => {
  test("does not split single mesh", () => {
    const mesh = loadCube();
    const parts = splitMesh(mesh);
    expect(parts.length).toBe(1);
  });

  test("splits two disconnected cubes", () => {
    const mesh = loadTwoCubes();
    const parts = splitMesh(mesh);
    expect(parts.length).toBe(2);
    expect(parts[0]!.triangles.length).toBe(12);
    expect(parts[1]!.triangles.length).toBe(12);
  });

  test("split parts are each manifold", () => {
    const mesh = loadTwoCubes();
    const parts = splitMesh(mesh);
    for (const part of parts) {
      expect(isManifold(part)).toBe(true);
    }
  });
});

describe("Measure operation", () => {
  test("measures unit cube correctly", () => {
    const mesh = loadCube();
    const result = measureMesh(mesh);
    expect(result.extents.size.x).toBeCloseTo(1, 2);
    expect(result.extents.size.y).toBeCloseTo(1, 2);
    expect(result.extents.size.z).toBeCloseTo(1, 2);
    expect(result.volume).toBeCloseTo(1.0, 2);
    expect(result.volumeCount).toBe(1);
    expect(result.isManifold).toBe(true);
  });

  test("measures weight based on PLA density", () => {
    const mesh = loadCube();
    const result = measureMesh(mesh);
    // Weight = volume * density = 1mm³ * 1.14e-3 g/mm³ = 0.00114g
    expect(result.weight).toBeCloseTo(0.00114, 5);
  });

  test("formats measure output", () => {
    const mesh = loadCube();
    const result = measureMesh(mesh);
    const output = formatMeasure(result);
    expect(output).toContain("Extents:");
    expect(output).toContain("Volume:");
    expect(output).toContain("Weight:");
  });

  test("shows volume count when > 1", () => {
    const mesh = loadTwoCubes();
    const result = measureMesh(mesh);
    expect(result.volumeCount).toBe(2);
    const output = formatMeasure(result);
    expect(output).toContain("Volumes: 2");
  });
});

describe("Validate operation", () => {
  test("manifold cube passes validation", () => {
    const mesh = loadCube();
    expect(isManifold(mesh)).toBe(true);
  });

  test("non-manifold mesh detected", () => {
    // Create a mesh with a missing face (remove last two triangles)
    const mesh = loadCube();
    const broken: Mesh = {
      name: "broken",
      triangles: mesh.triangles.slice(0, 10),
    };
    expect(isManifold(broken)).toBe(false);
  });
});

describe("CLI argument parsing", () => {
  test("parses basic input", () => {
    const args = parseArgs(["node", "cli", "input.stl", "--measure"]);
    expect(args.inputFile).toBe("input.stl");
    expect(args.operations.length).toBe(1);
    expect(args.operations[0]!.kind).toBe("measure");
  });

  test("parses center with axes and point", () => {
    const args = parseArgs(["node", "cli", "input.stl", "--center", "xy", "200,200,0"]);
    expect(args.operations[0]).toEqual({
      kind: "center",
      axes: "xy",
      about: { x: 200, y: 200, z: 0 },
    });
  });

  test("parses center with point only", () => {
    const args = parseArgs(["node", "cli", "input.stl", "--center", "200,200,0"]);
    expect(args.operations[0]).toEqual({
      kind: "center",
      axes: "xyz",
      about: { x: 200, y: 200, z: 0 },
    });
  });

  test("parses center with axes only", () => {
    const args = parseArgs(["node", "cli", "input.stl", "--center", "xy"]);
    expect(args.operations[0]).toEqual({
      kind: "center",
      axes: "xy",
      about: { x: 0, y: 0, z: 0 },
    });
  });

  test("parses scale with uniform value", () => {
    const args = parseArgs(["node", "cli", "input.stl", "--scale", "4"]);
    expect(args.operations[0]).toEqual({
      kind: "scale",
      scale: { x: 4, y: 4, z: 4 },
      about: { kind: "origin" },
    });
  });

  test("parses scale with vector", () => {
    const args = parseArgs(["node", "cli", "input.stl", "--scale", "4,4,4"]);
    expect(args.operations[0]).toEqual({
      kind: "scale",
      scale: { x: 4, y: 4, z: 4 },
      about: { kind: "origin" },
    });
  });

  test("parses scale with axes and amount", () => {
    const args = parseArgs(["node", "cli", "input.stl", "--scale", "xy", "3"]);
    expect(args.operations[0]).toEqual({
      kind: "scale",
      scale: { x: 3, y: 3, z: 1 },
      about: { kind: "origin" },
    });
  });

  test("parses flip", () => {
    const args = parseArgs(["node", "cli", "input.stl", "--flip", "x"]);
    expect(args.operations[0]).toEqual({
      kind: "flip",
      axes: "x",
      about: { kind: "origin" },
    });
  });

  test("parses rotate", () => {
    const args = parseArgs(["node", "cli", "input.stl", "--rotate", "z", "90"]);
    expect(args.operations[0]).toEqual({
      kind: "rotate",
      axis: "z",
      degrees: 90,
      about: { kind: "origin" },
    });
  });

  test("parses output option", () => {
    const args = parseArgs(["node", "cli", "input.stl", "--scale", "2", "-o", "out.stl"]);
    expect(args.output).toBe("out.stl");
  });

  test("parses overwrite option", () => {
    const args = parseArgs(["node", "cli", "input.stl", "--scale", "2", "--ow"]);
    expect(args.overwrite).toBe(true);
  });

  test("parses fdm as alias for validate + split + lay-flat", () => {
    const args = parseArgs(["node", "cli", "input.stl", "--fdm"]);
    expect(args.operations.length).toBe(3);
    expect(args.operations[0]!.kind).toBe("validate");
    expect(args.operations[1]!.kind).toBe("split");
    expect(args.operations[2]!.kind).toBe("lay-flat");
  });

  test("parses multiple operations", () => {
    const args = parseArgs([
      "node", "cli", "input.stl",
      "--center", "xy",
      "--scale", "2",
      "--floor", "z",
      "--measure",
    ]);
    expect(args.operations.length).toBe(4);
    expect(args.operations[0]!.kind).toBe("center");
    expect(args.operations[1]!.kind).toBe("scale");
    expect(args.operations[2]!.kind).toBe("floor");
    expect(args.operations[3]!.kind).toBe("measure");
  });
});

describe("Lay flat operation", () => {
  test("lay flat does not crash on a cube", () => {
    const mesh = loadCube();
    const result = layFlat(mesh, "z", false);
    expect(result.triangles.length).toBe(12);
    const ext = computeExtents(result);
    expect(ext.min.z).toBeCloseTo(0, 2);
  });

  test("lay flat preserves volume", () => {
    const mesh = loadCube();
    const result = layFlat(mesh, "z", false);
    const vol = computeVolume(result);
    expect(vol).toBeCloseTo(1.0, 1);
  });
});

describe("End-to-end STL processing", () => {
  test("read, transform, write, re-read produces consistent results", () => {
    const mesh = loadCube();
    // Center, scale, floor
    let result = centerMesh(mesh, "xyz", { x: 0, y: 0, z: 0 });
    result = scaleMesh(result, { x: 10, y: 10, z: 10 }, { kind: "origin" });
    result = floorMesh(result, "xyz");

    // Write and re-read
    const buffer = writeBinaryStl(result);
    const reloaded = parseStl(buffer);

    const ext = computeExtents(reloaded);
    approxVec3(ext.min, { x: 0, y: 0, z: 0 }, 1);
    approxVec3(ext.max, { x: 10, y: 10, z: 10 }, 1);
  });
});
