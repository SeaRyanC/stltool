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
  attribute: number;
}

export interface Mesh {
  name: string;
  triangles: Triangle[];
}

export interface Extents {
  min: Vec3;
  max: Vec3;
}

export type Axis = "x" | "y" | "z";
export type AxesString = string; // e.g. "xy", "xyz", "z"

export interface AboutPoint {
  kind: "origin" | "center" | "point";
  point?: Vec3;
}
