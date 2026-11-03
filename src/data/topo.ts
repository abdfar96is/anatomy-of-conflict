// Minimal TopoJSON decoder: quantised, delta-encoded arcs → GeoJSON features (Polygon / MultiPolygon only).

import type { Feature, MultiPolygon, Polygon, Position } from 'geojson';

export interface Topology {
  type: 'Topology';
  transform?: { scale: [number, number]; translate: [number, number] };
  arcs: number[][][];
  objects: Record<string, { type: 'GeometryCollection'; geometries: TopoGeometry[] }>;
}
export interface TopoGeometry {
  type: 'Polygon' | 'MultiPolygon' | null;
  arcs?: number[][] | number[][][];
  properties?: Record<string, unknown>;
}

/** Decode every geometry of one object into GeoJSON features (null geometries are skipped). */
export function topoFeatures<P = Record<string, unknown>>(topo: Topology, object: string): Feature<Polygon | MultiPolygon, P>[] {
  const t = topo.transform;
  // absolute positions per arc, decoded once
  const arcs = topo.arcs.map((arc) => {
    let x = 0, y = 0;
    return arc.map(([dx, dy]) => {
      if (!t) return [dx!, dy!] as Position;
      x += dx!; y += dy!;
      return [x * t.scale[0] + t.translate[0], y * t.scale[1] + t.translate[1]] as Position;
    });
  });
  const ring = (ids: number[]): Position[] => {
    const out: Position[] = [];
    for (const id of ids) {
      const a = id < 0 ? [...arcs[~id]!].reverse() : arcs[id]!;
      // consecutive arcs share their end point
      out.push(...(out.length ? a.slice(1) : a));
    }
    return out;
  };
  const geoms = topo.objects[object]?.geometries ?? [];
  const features: Feature<Polygon | MultiPolygon, P>[] = [];
  for (const g of geoms) {
    if (g.type === 'Polygon') {
      features.push({ type: 'Feature', properties: (g.properties ?? {}) as P, geometry: { type: 'Polygon', coordinates: (g.arcs as number[][]).map(ring) } });
    } else if (g.type === 'MultiPolygon') {
      features.push({ type: 'Feature', properties: (g.properties ?? {}) as P, geometry: { type: 'MultiPolygon', coordinates: (g.arcs as number[][][]).map((p) => p.map(ring)) } });
    }
  }
  return features;
}
