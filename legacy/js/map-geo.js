// Geometry helpers for the map engine: level-of-detail copies, bounds, fit caps, label anchors.
// Pure functions over GeoJSON in lon/lat degrees; d3 is the page global.

const TAU = Math.PI * 2;

/** Douglas–Peucker on one closed ring (planar lon/lat). Keeps the closure point. */
function simplifyRing(ring, tol) {
  const n = ring.length;
  if (n <= 5) return ring;
  const keep = new Uint8Array(n);
  keep[0] = keep[n - 1] = 1;
  const t2 = tol * tol;
  const stack = [0, n - 1];
  while (stack.length) {
    const b = stack.pop(), a = stack.pop();
    const ax = ring[a][0], ay = ring[a][1], dx = ring[b][0] - ax, dy = ring[b][1] - ay, len2 = dx * dx + dy * dy;
    let maxD = -1, idx = -1;
    for (let i = a + 1; i < b; i++) {
      const px = ring[i][0] - ax, py = ring[i][1] - ay;
      let d;
      if (len2 === 0) d = px * px + py * py;
      else {
        const t = Math.max(0, Math.min(1, (px * dx + py * dy) / len2));
        const qx = t * dx - px, qy = t * dy - py;
        d = qx * qx + qy * qy;
      }
      if (d > maxD) { maxD = d; idx = i; }
    }
    if (maxD > t2) { keep[idx] = 1; stack.push(a, idx, idx, b); }
  }
  const out = [];
  for (let i = 0; i < n; i++) if (keep[i]) out.push(ring[i]);
  if (out.length >= 4) return out;
  // collapsed sliver or islet: keep a coarse quad so it does not vanish while moving
  const step = (n - 1) / 4;
  return [0, 1, 2, 3].map((i) => ring[Math.round(i * step)]).concat([ring[0]]);
}

function simplifyPolygon(poly, tol) {
  const out = poly.map((r) => simplifyRing(r, tol));
  // a ring that flipped orientation would fill the whole sphere — fall back to the original
  return d3.geoArea({ type: 'Polygon', coordinates: out }) > TAU ? poly : out;
}

/** Re-insert points so no segment is longer than `maxDeg`: simplified parallels (the 49th) stay curved on the globe. */
function densifyRing(ring, maxDeg) {
  const out = [ring[0]];
  for (let i = 1; i < ring.length; i++) {
    const [ax, ay] = ring[i - 1], [bx, by] = ring[i];
    const n = Math.ceil(Math.hypot(bx - ax, by - ay) / maxDeg);
    for (let j = 1; j < n; j++) out.push([ax + ((bx - ax) * j) / n, ay + ((by - ay) * j) / n]);
    out.push(ring[i]);
  }
  return out;
}

/** A copy of a feature with every ring simplified to `tol` degrees (then densified to `maxSeg` degrees). */
export function simplifyFeature(f, tol, maxSeg = 1.5) {
  const g = f.geometry;
  if (!g) return f;
  const poly = (p) => simplifyPolygon(p, tol).map((r) => densifyRing(r, maxSeg));
  let geometry;
  if (g.type === 'Polygon') geometry = { type: 'Polygon', coordinates: poly(g.coordinates) };
  else if (g.type === 'MultiPolygon') geometry = { type: 'MultiPolygon', coordinates: g.coordinates.map(poly) };
  else return f;
  return { type: 'Feature', properties: f.properties, geometry };
}

const RAD = Math.PI / 180;

/**
 * Rings packed for direct projection: unit vectors (globe) and unit Equal Earth coordinates (flat, from `flat0`).
 * Shapes that need no clipping skip d3's stream pipeline entirely; a frame is then a few multiplications per point.
 */
function packRing(ring, flat0) {
  const n = ring.length, xyz = new Float64Array(n * 3), uv = new Float64Array(n * 2);
  for (let i = 0; i < n; i++) {
    const l = ring[i][0] * RAD, p = ring[i][1] * RAD, cp = Math.cos(p);
    xyz[3 * i] = Math.cos(l) * cp; xyz[3 * i + 1] = Math.sin(l) * cp; xyz[3 * i + 2] = Math.sin(p);
    const u = flat0(ring[i]);
    uv[2 * i] = u[0]; uv[2 * i + 1] = u[1];
  }
  return { n, xyz, uv };
}

/**
 * Packed polygons: `rings` for the whole shape, plus `parts` (one per polygon) with a bounding cap
 * (unit-vector centre + angular radius) so a shape crossing the horizon only sends the crossing parts to d3.
 */
export function packFeature(f, flat0) {
  const g = f.geometry;
  const polys = !g ? [] : g.type === 'Polygon' ? [g.coordinates] : g.type === 'MultiPolygon' ? g.coordinates : [];
  const rings = [], parts = [];
  for (const poly of polys) {
    const own = poly.map((r) => packRing(r, flat0));
    const outer = own[0];
    let cx = 0, cy = 0, cz = 0;
    for (let i = 0; i < outer.n; i++) { cx += outer.xyz[3 * i]; cy += outer.xyz[3 * i + 1]; cz += outer.xyz[3 * i + 2]; }
    const len = Math.hypot(cx, cy, cz) || 1;
    cx /= len; cy /= len; cz /= len;
    let r = 0;
    for (let i = 0; i < outer.n; i++) {
      const d = Math.acos(Math.max(-1, Math.min(1, cx * outer.xyz[3 * i] + cy * outer.xyz[3 * i + 1] + cz * outer.xyz[3 * i + 2])));
      if (d > r) r = d;
    }
    parts.push({ rings: own, cx, cy, cz, r: r + 0.01, coords: poly });
    rings.push(...own);
  }
  return { rings, parts };
}

/** Angular distance (radians) of a unit vector from the globe's view centre, for rotate([λ, φ, 0]). */
export function viewAngle(q, x0, y0, z0) {
  const x = x0 * q.cl - y0 * q.sl;
  return Math.acos(Math.max(-1, Math.min(1, x * q.cp - z0 * q.sp)));
}

/** Graticule (MultiLineString) packed like rings. */
export function packLines(mls, flat0) {
  return mls.coordinates.map((line) => packRing(line, flat0));
}

/** Graticule lines on the globe: drawn point to point on the near side, broken where they pass behind. */
export function traceLinesGlobe(t, lines, q) {
  for (const { n, xyz } of lines) {
    let on = false;
    for (let i = 0; i < n; i++) {
      const x0 = xyz[3 * i], y0 = xyz[3 * i + 1], z0 = xyz[3 * i + 2];
      const x = x0 * q.cl - y0 * q.sl, y = x0 * q.sl + y0 * q.cl;
      if (x * q.cp - z0 * q.sp <= 0) { on = false; continue; }
      const sx = q.tx + q.k * y, sy = q.ty - q.k * (z0 * q.cp + x * q.sp);
      if (on) t.lineTo(sx, sy); else { t.moveTo(sx, sy); on = true; }
    }
  }
}

export function traceLinesFlat(t, lines, q) {
  for (const { n, uv } of lines) {
    for (let i = 0; i < n; i++) {
      const sx = q.tx + q.k * uv[2 * i], sy = q.ty + q.k * uv[2 * i + 1];
      if (i) t.lineTo(sx, sy); else t.moveTo(sx, sy);
    }
  }
}

/** Orthographic projection of packed rings for d3 rotate([λ, φ, 0]) — valid only for shapes wholly on the near side. */
export function traceGlobe(t, rings, q) {
  for (const { n, xyz } of rings) {
    for (let i = 0; i < n; i++) {
      const x0 = xyz[3 * i], y0 = xyz[3 * i + 1], z0 = xyz[3 * i + 2];
      const x = x0 * q.cl - y0 * q.sl, y = x0 * q.sl + y0 * q.cl;
      const sx = q.tx + q.k * y, sy = q.ty - q.k * (z0 * q.cp + x * q.sp);
      if (i) t.lineTo(sx, sy); else t.moveTo(sx, sy);
    }
    t.closePath();
  }
}

/** Equal Earth projection of packed rings — valid for shapes that do not cross the antimeridian. */
export function traceFlat(t, rings, q) {
  for (const { n, uv } of rings) {
    for (let i = 0; i < n; i++) {
      const sx = q.tx + q.k * uv[2 * i], sy = q.ty + q.k * uv[2 * i + 1];
      if (i) t.lineTo(sx, sy); else t.moveTo(sx, sy);
    }
    t.closePath();
  }
}

export function countPoints(f) {
  const g = f.geometry;
  if (!g) return 0;
  const polys = g.type === 'Polygon' ? [g.coordinates] : g.type === 'MultiPolygon' ? g.coordinates : [];
  let n = 0;
  for (const p of polys) for (const r of p) n += r.length;
  return n;
}

/** Is [lon, lat] inside a d3.geoBounds box (handles boxes that cross the antimeridian)? */
export function inBounds(b, lon, lat) {
  if (lat < b[0][1] - 0.01 || lat > b[1][1] + 0.01) return false;
  const w = b[0][0], e = b[1][0];
  return w <= e ? lon >= w - 0.01 && lon <= e + 0.01 : lon >= w || lon <= e;
}

/** The polygons that make up a country's main body (drops far-flung overseas parts for fitting). */
export function focusGeometry(f) {
  const g = f.geometry;
  if (!g || g.type !== 'MultiPolygon') return g;
  const parts = g.coordinates.map((c) => {
    const p = { type: 'Polygon', coordinates: c };
    return { c, area: d3.geoArea(p), cen: d3.geoCentroid(p) };
  });
  const main = parts.reduce((a, b) => (b.area > a.area ? b : a));
  const mainR = Math.sqrt(main.area / Math.PI);
  const keep = parts.filter((p) => p === main || p.area >= main.area * 0.25 || d3.geoDistance(p.cen, main.cen) < Math.max(mainR * 2.2, 0.06));
  return { type: 'MultiPolygon', coordinates: keep.map((p) => p.c) };
}

function eachPoint(geom, fn, stride = 1) {
  if (!geom) return;
  switch (geom.type) {
    case 'Point': fn(geom.coordinates); break;
    case 'MultiPoint': case 'LineString': geom.coordinates.forEach(fn); break;
    case 'Polygon': for (const r of geom.coordinates) for (let i = 0; i < r.length; i += stride) fn(r[i]); break;
    case 'MultiPolygon': for (const p of geom.coordinates) for (const r of p) for (let i = 0; i < r.length; i += stride) fn(r[i]); break;
    case 'GeometryCollection': for (const g of geom.geometries) eachPoint(g, fn, stride); break;
    default: break;
  }
}

/**
 * Spherical cap {center:[lon,lat], r:radians} that encloses some geometries and points.
 * Used to fit flights on both projections without antimeridian trouble.
 */
export function capOf(geoms, points = []) {
  const polys = geoms.filter(Boolean);
  let center;
  if (polys.length) center = d3.geoCentroid({ type: 'GeometryCollection', geometries: polys });
  if (!center || !Number.isFinite(center[0])) {
    if (!points.length) return null;
    center = d3.geoCentroid({ type: 'MultiPoint', coordinates: points });
  }
  if (polys.length && points.length) {
    // pull the centre toward the points (e.g. a conflict's coordinates) so they stay in frame
    center = d3.geoInterpolate(center, d3.geoCentroid({ type: 'MultiPoint', coordinates: points }))(0.35);
  }
  let r = 0;
  const visit = (p) => { const d = d3.geoDistance(center, p); if (d > r) r = d; };
  for (const g of polys) eachPoint(g, visit, 3);
  points.forEach(visit);
  return { center, r };
}

/** Spherical mean of label points (event pins, multi-country anchors). */
export function meanPoint(points) {
  if (!points.length) return null;
  if (points.length === 1) return points[0];
  const c = d3.geoCentroid({ type: 'MultiPoint', coordinates: points });
  return Number.isFinite(c[0]) ? c : points[0];
}

/** Distance from point (px, py) to segment (ax, ay)–(bx, by), in pixels. */
export function segDist(px, py, ax, ay, bx, by) {
  const dx = bx - ax, dy = by - ay, len2 = dx * dx + dy * dy;
  let t = len2 ? ((px - ax) * dx + (py - ay) * dy) / len2 : 0;
  t = Math.max(0, Math.min(1, t));
  const qx = ax + t * dx - px, qy = ay + t * dy - py;
  return Math.sqrt(qx * qx + qy * qy);
}
