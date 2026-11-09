// Minimal TopoJSON decoder: quantised, delta-encoded arcs → GeoJSON features (polygons and lines).

import type { Feature, LineString, MultiLineString, MultiPolygon, Polygon, Position } from 'geojson';

export interface Topology {
  type: 'Topology';
  transform?: { scale: [number, number]; translate: [number, number] };
  arcs: number[][][];
  objects: Record<string, { type: 'GeometryCollection'; geometries: TopoGeometry[] }>;
}
export interface TopoGeometry {
  type: 'Polygon' | 'MultiPolygon' | 'LineString' | 'MultiLineString' | null;
  arcs?: number[] | number[][] | number[][][];
  properties?: Record<string, unknown>;
}

type TopoShape = Polygon | MultiPolygon | LineString | MultiLineString;

/** Decode the polygons of one object into GeoJSON features (null geometries and lines are skipped). */
export function topoFeatures<P = Record<string, unknown>>(topo: Topology, object: string): Feature<Polygon | MultiPolygon, P>[] {
  return decode<P>(topo, object).filter((f): f is Feature<Polygon | MultiPolygon, P> => f.geometry.type === 'Polygon' || f.geometry.type === 'MultiPolygon');
}

/** Decode the lines of one object into GeoJSON features (null geometries and polygons are skipped). */
export function topoLines<P = Record<string, unknown>>(topo: Topology, object: string): Feature<LineString | MultiLineString, P>[] {
  return decode<P>(topo, object).filter((f): f is Feature<LineString | MultiLineString, P> => f.geometry.type === 'LineString' || f.geometry.type === 'MultiLineString');
}

function decode<P>(topo: Topology, object: string): Feature<TopoShape, P>[] {
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
  const features: Feature<TopoShape, P>[] = [];
  for (const g of geoms) {
    const properties = (g.properties ?? {}) as P;
    if (g.type === 'LineString') {
      features.push({ type: 'Feature', properties, geometry: { type: 'LineString', coordinates: ring(g.arcs as number[]) } });
    } else if (g.type === 'MultiLineString') {
      features.push({ type: 'Feature', properties, geometry: { type: 'MultiLineString', coordinates: (g.arcs as number[][]).map(ring) } });
    } else if (g.type === 'Polygon') {
      features.push({ type: 'Feature', properties, geometry: { type: 'Polygon', coordinates: (g.arcs as number[][]).map(ring) } });
    } else if (g.type === 'MultiPolygon') {
      features.push({ type: 'Feature', properties, geometry: { type: 'MultiPolygon', coordinates: (g.arcs as number[][][]).map((p) => p.map(ring)) } });
    }
  }
  return features;
}
