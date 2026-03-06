#!/usr/bin/env node
import { readStlFile } from './stl-reader.js';
import { writeMesh } from './stl-writer.js';
import { meshCenter } from './geometry.js';
import { centerMesh } from './operations/center.js';
import { floorMesh } from './operations/floor.js';
import { scaleMesh } from './operations/scale.js';
import { flipMesh } from './operations/flip.js';
import { rotateMesh } from './operations/rotate.js';
import { splitMesh } from './operations/split.js';
import { measureMesh, printMetrics } from './operations/measure.js';
import { isManifold } from './operations/validate.js';
import { layFlat } from './operations/lay-flat.js';
import type { Mesh, Vec3 } from './geometry.js';
import * as path from 'path';
import * as fs from 'fs';

function parseVec3(s: string): Vec3 {
  const parts = s.split(',').map(Number);
  return { x: parts[0] ?? 0, y: parts[1] ?? 0, z: parts[2] ?? 0 };
}

function isNumber(s: string): boolean {
  return !isNaN(parseFloat(s)) && s !== '';
}

function isAxes(s: string): boolean {
  return /^[xyz]+$/.test(s);
}

function isVec3String(s: string): boolean {
  return /^-?[\d.]+,-?[\d.]+,-?[\d.]+$/.test(s);
}

function isAbout(s: string): boolean {
  return s === 'origin' || s === 'center' || isVec3String(s);
}

function resolveAbout(s: string, mesh: Mesh): Vec3 {
  if (s === 'origin') return { x: 0, y: 0, z: 0 };
  if (s === 'center') return meshCenter(mesh);
  return parseVec3(s);
}

type Operation =
  | { type: 'center'; axes: string; about: string }
  | { type: 'floor'; axes: string }
  | { type: 'scale'; scale: Vec3 }
  | { type: 'flip'; axes: string; about: string }
  | { type: 'rotate'; axis: 'x' | 'y' | 'z'; degrees: number; about: string }
  | { type: 'split' }
  | { type: 'measure' }
  | { type: 'validate' }
  | { type: 'lay-flat'; axis: 'x' | 'y' | 'z'; verbose: boolean }
  | { type: 'fdm'; buildPlateSize?: string };

function parseArgs(argv: string[]): { file: string; ops: Operation[]; output?: string; outDir?: string; overwrite: boolean } {
  const args = argv.slice(2);
  let file = '';
  let output: string | undefined;
  let outDir: string | undefined;
  let overwrite = false;
  const ops: Operation[] = [];

  let i = 0;

  // Show help if requested
  if (args.includes('--help') || args.includes('-h')) {
    console.log('Usage: stltool <file> [operations...] [-o output] [--outDir dir] [--overwrite]');
    process.exit(0);
  }

  // First non-flag argument is the file
  while (i < args.length) {
    const arg = args[i];
    if (!arg.startsWith('-')) {
      file = arg;
      i++;
      break;
    }
    i++;
  }

  while (i < args.length) {
    const arg = args[i];
    if (arg === '-o' || arg === '--output') {
      output = args[++i];
    } else if (arg === '--outDir') {
      outDir = args[++i];
    } else if (arg === '--overwrite') {
      overwrite = true;
    } else if (arg === '--center') {
      let axes = 'xyz';
      let about = 'origin';
      if (i + 1 < args.length && isAxes(args[i + 1])) {
        axes = args[++i];
      }
      if (i + 1 < args.length && isAbout(args[i + 1])) {
        about = args[++i];
      }
      ops.push({ type: 'center', axes, about });
    } else if (arg === '--floor') {
      let axes = 'xyz';
      if (i + 1 < args.length && isAxes(args[i + 1])) {
        axes = args[++i];
      }
      ops.push({ type: 'floor', axes });
    } else if (arg === '--scale') {
      // --scale 2 → uniform
      // --scale 1,2,3 → Vec3
      // --scale x 2 → only x
      // --scale xy 2 → x and y
      i++;
      const next = args[i];
      let scale: Vec3 = { x: 1, y: 1, z: 1 };
      if (isVec3String(next)) {
        scale = parseVec3(next);
      } else if (isNumber(next)) {
        const s = parseFloat(next);
        scale = { x: s, y: s, z: s };
      } else if (isAxes(next)) {
        const axes = next;
        i++;
        const amount = parseFloat(args[i]);
        scale = {
          x: axes.includes('x') ? amount : 1,
          y: axes.includes('y') ? amount : 1,
          z: axes.includes('z') ? amount : 1,
        };
      }
      ops.push({ type: 'scale', scale });
    } else if (arg === '--flip') {
      i++;
      const axes = args[i];
      let about = 'origin';
      if (i + 1 < args.length && isAbout(args[i + 1])) {
        about = args[++i];
      }
      ops.push({ type: 'flip', axes, about });
    } else if (arg === '--rotate') {
      i++;
      const axis = args[i] as 'x' | 'y' | 'z';
      i++;
      const degrees = parseFloat(args[i]);
      let about = 'origin';
      if (i + 1 < args.length && isAbout(args[i + 1])) {
        about = args[++i];
      }
      ops.push({ type: 'rotate', axis, degrees, about });
    } else if (arg === '--split') {
      ops.push({ type: 'split' });
    } else if (arg === '--measure') {
      ops.push({ type: 'measure' });
    } else if (arg === '--validate') {
      ops.push({ type: 'validate' });
    } else if (arg === '--lay-flat') {
      let verbose = false;
      let axis: 'x' | 'y' | 'z' = 'z';
      if (i + 1 < args.length && args[i + 1] === 'verbose') {
        verbose = true;
        i++;
      }
      if (i + 1 < args.length && ['x', 'y', 'z'].includes(args[i + 1])) {
        axis = args[++i] as 'x' | 'y' | 'z';
      }
      ops.push({ type: 'lay-flat', axis, verbose });
    } else if (arg === '--fdm') {
      let buildPlateSize: string | undefined;
      if (i + 1 < args.length && !args[i + 1].startsWith('-')) {
        buildPlateSize = args[++i];
      }
      ops.push({ type: 'fdm', buildPlateSize });
    }
    i++;
  }

  return { file, ops, output, outDir, overwrite };
}

function getOutputPath(inputFile: string, output: string | undefined, outDir: string | undefined, overwrite: boolean): string {
  if (overwrite) return inputFile;
  if (output) {
    if (output.endsWith('/') || (fs.existsSync(output) && fs.statSync(output).isDirectory())) {
      return path.join(output, path.basename(inputFile).replace(/\.stl$/i, '-out.stl'));
    }
    return output;
  }
  if (outDir) {
    return path.join(outDir, path.basename(inputFile));
  }
  const dir = path.dirname(inputFile);
  const base = path.basename(inputFile, path.extname(inputFile));
  return path.join(dir, `${base}-out.stl`);
}

async function applyOp(mesh: Mesh, op: Operation): Promise<Mesh> {
  switch (op.type) {
    case 'center':
      return centerMesh(mesh, op.axes, resolveAbout(op.about, mesh));
    case 'floor':
      return floorMesh(mesh, op.axes);
    case 'scale':
      return scaleMesh(mesh, op.scale);
    case 'flip':
      return flipMesh(mesh, op.axes, resolveAbout(op.about, mesh));
    case 'rotate':
      return rotateMesh(mesh, op.axis, op.degrees, resolveAbout(op.about, mesh));
    case 'lay-flat':
      return layFlat(mesh, op.axis, op.verbose);
    case 'fdm': {
      const valid = isManifold(mesh);
      if (!valid) console.warn('Warning: mesh is not manifold');
      const parts = splitMesh(mesh);
      // apply lay-flat to each part - but we return the first part (single mesh)
      // For FDM we return the lay-flat result
      return layFlat(parts[0], 'z');
    }
    default:
      return mesh;
  }
}

async function main() {
  const { file, ops, output, outDir, overwrite } = parseArgs(process.argv);

  if (!file) {
    console.error('Usage: stltool <file> [operations...]');
    process.exit(1);
  }

  let mesh = await readStlFile(file);

  let splitActive = false;
  let meshes: Mesh[] = [mesh];
  const measureOnly = ops.length > 0 && ops.every(op => op.type === 'measure' || op.type === 'validate');

  for (const op of ops) {
    if (op.type === 'split') {
      splitActive = true;
      meshes = meshes.flatMap(m => splitMesh(m));
    } else if (op.type === 'measure') {
      for (const m of meshes) {
        const metrics = measureMesh(m);
        printMetrics(metrics, path.basename(file));
      }
    } else if (op.type === 'validate') {
      for (const m of meshes) {
        const valid = isManifold(m);
        console.log(`${path.basename(file)}: ${valid ? 'Manifold' : 'Not manifold'}`);
      }
    } else {
      meshes = await Promise.all(meshes.map(m => applyOp(m, op)));
    }
  }

  if (measureOnly) return;

  const outPath = getOutputPath(file, output, outDir, overwrite);

  if (splitActive && meshes.length > 1) {
    const ext = path.extname(outPath);
    const base = outPath.slice(0, -ext.length);
    for (let i = 0; i < meshes.length; i++) {
      await writeMesh(meshes[i], `${base}-${i + 1}${ext}`);
    }
  } else {
    await writeMesh(meshes[0], outPath);
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
