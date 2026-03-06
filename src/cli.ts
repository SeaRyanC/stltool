#!/usr/bin/env node

import * as fs from "node:fs";
import * as path from "node:path";
import { parseStl, writeBinaryStl } from "./stl-io.js";
import type { Mesh, Vec3, Axis, AboutPoint } from "./types.js";
import { parsePoint, parseAxes, isManifold } from "./geometry.js";
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
} from "./operations.js";

interface ParsedArgs {
  inputFile: string;
  operations: Operation[];
  output?: string | undefined;
  outDir?: string | undefined;
  overwrite: boolean;
}

export const helpText = `stltool - A commandline STL file manipulation tool

Usage: stltool <input.stl> [operations...] [-o output.stl]

Operations:
  --center [axes] [about]      Center mesh on given axes (default: xyz about origin)
  --floor [axes]               Move mesh minimum to 0 on given axes (default: xyz)
  --scale <amount> [about]     Scale uniformly (e.g. --scale 2)
  --scale <axes> <amount>      Scale on specific axes (e.g. --scale xy 3)
  --scale <x,y,z> [about]      Scale non-uniformly (e.g. --scale 2,1,3)
  --flip <axes> [about]        Mirror across plane (e.g. --flip x)
  --rotate <axis> <deg> [about] Rotate around axis (e.g. --rotate z 90)
  --split                      Separate disconnected meshes into files
  --measure                    Print dimensions, volume, and weight
  --validate                   Check if mesh is manifold
  --lay-flat [verbose] [axis]  Orient for minimal overhang (default axis: z)
  --fdm [buildPlateSize]       Shortcut for validate + split + lay-flat

Output options:
  -o, --output <path>          Output file or directory
  --outDir <path>              Output directory
  --ow, --overwrite            Overwrite input file

Other:
  -h, --help                   Show this help message

The 'about' parameter can be 'origin', 'center', or a point like 100,200,0.
`;

type Operation =
  | { kind: "center"; axes: string; about: Vec3 }
  | { kind: "floor"; axes: string }
  | { kind: "scale"; scale: Vec3; about: AboutPoint }
  | { kind: "flip"; axes: string; about: AboutPoint }
  | { kind: "rotate"; axis: Axis; degrees: number; about: AboutPoint }
  | { kind: "split" }
  | { kind: "measure" }
  | { kind: "validate" }
  | { kind: "lay-flat"; verbose: boolean; axis: Axis }
  | { kind: "fdm"; buildPlateSize?: Vec3 };

function isAxesString(s: string): boolean {
  return /^[xyz]{1,3}$/.test(s);
}

function isAxisString(s: string): s is Axis {
  return s === "x" || s === "y" || s === "z";
}

function isPointString(s: string): boolean {
  return parsePoint(s) !== null;
}

function isNumberString(s: string): boolean {
  return !isNaN(Number(s)) && s.trim() !== "";
}

function parseAboutArg(s: string): AboutPoint {
  if (s === "origin") return { kind: "origin" };
  if (s === "center") return { kind: "center" };
  const pt = parsePoint(s);
  if (pt) return { kind: "point", point: pt };
  throw new Error(`Invalid 'about' argument: ${s}`);
}

export function parseArgs(argv: string[]): ParsedArgs {
  const args = argv.slice(2); // skip node and script
  if (args.length === 0 || args.includes("--help") || args.includes("-h")) {
    console.log(helpText);
    process.exit(args.length === 0 ? 1 : 0);
  }

  const inputFile = args[0]!;
  const operations: Operation[] = [];
  let output: string | undefined;
  let outDir: string | undefined;
  let overwrite = false;

  let i = 1;
  while (i < args.length) {
    const arg = args[i]!;

    switch (arg) {
      case "--center": {
        let axes = "xyz";
        let about: Vec3 = { x: 0, y: 0, z: 0 };
        // peek at next args
        if (i + 1 < args.length && isAxesString(args[i + 1]!)) {
          i++;
          axes = args[i]!;
          if (i + 1 < args.length && isPointString(args[i + 1]!)) {
            i++;
            about = parsePoint(args[i]!)!;
          }
        } else if (i + 1 < args.length && isPointString(args[i + 1]!)) {
          i++;
          about = parsePoint(args[i]!)!;
        }
        operations.push({ kind: "center", axes, about });
        break;
      }

      case "--floor": {
        let axes = "xyz";
        if (i + 1 < args.length && isAxesString(args[i + 1]!)) {
          i++;
          axes = args[i]!;
        }
        operations.push({ kind: "floor", axes });
        break;
      }

      case "--scale": {
        let scale: Vec3;
        let about: AboutPoint = { kind: "origin" };

        // Next arg could be: axes string, number, or point
        i++;
        if (i >= args.length) throw new Error("--scale requires arguments");
        const nextArg = args[i]!;

        if (isAxesString(nextArg) && !isNumberString(nextArg)) {
          // --scale xy 3 [about]
          const scaleAxes = parseAxes(nextArg);
          i++;
          if (i >= args.length) throw new Error("--scale with axes requires an amount");
          const amount = Number(args[i]!);
          scale = {
            x: scaleAxes.has("x") ? amount : 1,
            y: scaleAxes.has("y") ? amount : 1,
            z: scaleAxes.has("z") ? amount : 1,
          };
        } else if (isPointString(nextArg)) {
          // --scale 4,4,4 [about]
          scale = parsePoint(nextArg)!;
        } else if (isNumberString(nextArg)) {
          // --scale 4 [about] => uniform
          const amount = Number(nextArg);
          scale = { x: amount, y: amount, z: amount };
        } else {
          throw new Error(`Invalid scale argument: ${nextArg}`);
        }

        // Check for about
        if (i + 1 < args.length) {
          const maybeAbout = args[i + 1]!;
          if (maybeAbout === "origin" || maybeAbout === "center" || isPointString(maybeAbout)) {
            i++;
            about = parseAboutArg(maybeAbout);
          }
        }

        operations.push({ kind: "scale", scale, about });
        break;
      }

      case "--flip": {
        i++;
        if (i >= args.length) throw new Error("--flip requires axes");
        const flipAxes = args[i]!;
        let about: AboutPoint = { kind: "origin" };
        if (i + 1 < args.length) {
          const maybeAbout = args[i + 1]!;
          if (maybeAbout === "origin" || maybeAbout === "center" || isPointString(maybeAbout)) {
            i++;
            about = parseAboutArg(maybeAbout);
          }
        }
        operations.push({ kind: "flip", axes: flipAxes, about });
        break;
      }

      case "--rotate": {
        i++;
        if (i >= args.length) throw new Error("--rotate requires an axis");
        const rotAxis = args[i]!;
        if (!isAxisString(rotAxis)) throw new Error(`Invalid rotation axis: ${rotAxis}`);
        i++;
        if (i >= args.length) throw new Error("--rotate requires degrees");
        const degrees = Number(args[i]!);
        if (isNaN(degrees)) throw new Error(`Invalid rotation degrees: ${args[i]}`);
        let about: AboutPoint = { kind: "origin" };
        if (i + 1 < args.length) {
          const maybeAbout = args[i + 1]!;
          if (maybeAbout === "origin" || maybeAbout === "center" || isPointString(maybeAbout)) {
            i++;
            about = parseAboutArg(maybeAbout);
          }
        }
        operations.push({ kind: "rotate", axis: rotAxis, degrees, about });
        break;
      }

      case "--split":
        operations.push({ kind: "split" });
        break;

      case "--measure":
        operations.push({ kind: "measure" });
        break;

      case "--validate":
        operations.push({ kind: "validate" });
        break;

      case "--lay-flat": {
        let verbose = false;
        let axis: Axis = "z";
        // peek at next args
        while (i + 1 < args.length) {
          const next = args[i + 1]!;
          if (next === "verbose") {
            verbose = true;
            i++;
          } else if (isAxisString(next)) {
            axis = next;
            i++;
          } else {
            break;
          }
        }
        operations.push({ kind: "lay-flat", verbose, axis });
        break;
      }

      case "--fdm": {
        let buildPlateSize: Vec3 | undefined;
        if (i + 1 < args.length && isPointString(args[i + 1]!)) {
          i++;
          buildPlateSize = parsePoint(args[i]!)!;
        }
        // fdm is an alias for validate, split, lay-flat
        operations.push({ kind: "validate" });
        operations.push({ kind: "split" });
        operations.push({ kind: "lay-flat", verbose: false, axis: "z" });
        break;
      }

      case "--output":
      case "-o":
        i++;
        if (i >= args.length) throw new Error("--output requires a path");
        output = args[i]!;
        break;

      case "--outDir":
      case "--outdir":
        i++;
        if (i >= args.length) throw new Error("--outDir requires a path");
        outDir = args[i]!;
        break;

      case "--overwrite":
      case "--ow":
        overwrite = true;
        break;

      default:
        throw new Error(`Unknown argument: ${arg}`);
    }

    i++;
  }

  return { inputFile, operations, output, outDir, overwrite };
}

function hasModifyingOperations(operations: Operation[]): boolean {
  return operations.some(
    (op) =>
      op.kind !== "measure" &&
      op.kind !== "validate",
  );
}

function getOutputPaths(
  inputFile: string,
  meshCount: number,
  options: { output?: string | undefined; outDir?: string | undefined; overwrite: boolean },
): string[] {
  const parsed = path.parse(inputFile);

  if (options.overwrite && meshCount === 1) {
    return [inputFile];
  }

  let baseName: string;
  let dir: string;

  if (options.output) {
    const outPath = options.output;
    // Check if it's a directory
    if (outPath.endsWith("/") || outPath.endsWith("\\") || (fs.existsSync(outPath) && fs.statSync(outPath).isDirectory())) {
      dir = outPath;
      baseName = options.outDir ? parsed.name : `${parsed.name}-out`;
    } else {
      const outParsed = path.parse(outPath);
      dir = outParsed.dir || ".";
      baseName = outParsed.name;
    }
  } else if (options.outDir) {
    dir = options.outDir;
    baseName = parsed.name;
  } else {
    dir = parsed.dir || ".";
    baseName = `${parsed.name}-out`;
  }

  if (meshCount === 1) {
    return [path.join(dir, `${baseName}.stl`)];
  }

  return Array.from({ length: meshCount }, (_, i) =>
    path.join(dir, `${baseName}-${i + 1}.stl`),
  );
}

export function run(argv: string[]): void {
  const parsed = parseArgs(argv);
  const { inputFile, operations } = parsed;

  // Read input file
  if (!fs.existsSync(inputFile)) {
    console.error(`Error: Input file not found: ${inputFile}`);
    process.exit(1);
  }

  const buffer = fs.readFileSync(inputFile);
  const mesh = parseStl(buffer);

  // Process operations
  let meshes: Mesh[] = [mesh];
  let didSplit = false;

  for (const op of operations) {
    switch (op.kind) {
      case "center":
        meshes = meshes.map((m) => centerMesh(m, op.axes, op.about));
        break;

      case "floor":
        meshes = meshes.map((m) => floorMesh(m, op.axes));
        break;

      case "scale":
        meshes = meshes.map((m) => scaleMesh(m, op.scale, op.about));
        break;

      case "flip":
        meshes = meshes.map((m) => flipMesh(m, op.axes, op.about));
        break;

      case "rotate":
        meshes = meshes.map((m) => rotateMesh(m, op.axis, op.degrees, op.about));
        break;

      case "split": {
        const newMeshes: Mesh[] = [];
        for (const m of meshes) {
          const parts = splitMesh(m);
          newMeshes.push(...parts);
        }
        if (newMeshes.length > meshes.length) {
          didSplit = true;
        }
        meshes = newMeshes;
        break;
      }

      case "measure":
        for (const m of meshes) {
          const result = measureMesh(m);
          if (meshes.length > 1) {
            console.log(`--- ${m.name || "mesh"} ---`);
          }
          console.log(formatMeasure(result));
        }
        break;

      case "validate":
        for (const m of meshes) {
          if (!isManifold(m)) {
            console.error("Error: Mesh is not manifold. Aborting.");
            process.exit(1);
          }
        }
        break;

      case "lay-flat":
        meshes = meshes.map((m) => layFlat(m, op.axis, op.verbose));
        break;
    }
  }

  // Write output
  if (!hasModifyingOperations(operations)) {
    return;
  }

  const outputPaths = getOutputPaths(inputFile, meshes.length, {
    output: parsed.output,
    outDir: parsed.outDir,
    overwrite: parsed.overwrite,
  });

  for (let i = 0; i < meshes.length; i++) {
    const outputPath = outputPaths[i]!;
    const dir = path.dirname(outputPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    const outputBuffer = writeBinaryStl(meshes[i]!);
    fs.writeFileSync(outputPath, outputBuffer);
    console.log(`Written: ${outputPath}`);
  }
}

const isMainModule =
  typeof process !== "undefined" &&
  process.argv[1] !== undefined &&
  (process.argv[1].endsWith("/cli.js") || process.argv[1].endsWith("/cli.ts"));

if (isMainModule) {
  run(process.argv);
}
