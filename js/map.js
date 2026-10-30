// The atlas map engine: a Canvas 2D globe (orthographic) or flat map (Equal Earth) with lenses, selection,
// flights, labels and hit-testing. Two stacked canvases: the base (ocean, land, borders, lens polygons, labels)
// is redrawn only when the view or the scene changes; the overlay (outlines, arcs, markers, hover) also redraws
// on hover and while a marker pulses. A rAF loop runs only while something moves.

import * as store from './store.js';
import { state, on } from './store.js';
import { pal } from './palette.js';
import { t, Lk, dir, registerStrings } from './i18n.js';
import { cssVar, showTip, hideTip, reducedMotion } from './ui.js';
import {
  simplifyFeature, packFeature, packLines, traceGlobe, traceFlat, traceLinesGlobe, traceLinesFlat, viewAngle,
  inBounds, focusGeometry, capOf, segDist,
} from './map-geo.js';
import { buildScene, tipFor, eventAnchor } from './map-scene.js';
import { mountLegend, mountControls } from './map-legend.js';

registerStrings({
  ar: { 'map.aria': 'خريطة تفاعلية. اسحب لتحريكها، والأسهم للتنقّل، و+ و− للتكبير والتصغير، و0 لإعادة الضبط.' },
  en: { 'map.aria': 'Interactive map. Drag to move it; arrow keys pan, + and − zoom, 0 resets the view.' },
});

const TAU = Math.PI * 2;
const DPR_CAP = 2;
const K_MIN = 0.8, K_MAX = 60, K_FIT_MAX = 28;
const HOME = [35, 25];
const TOL_COARSE = 0.12, TOL_FINE = 0.02;
const SCENE_KEYS = new Set(['lens', 'selection', 'filters', 'layers', 'year', 'yearFilter', 'theme', 'compare', 'view', 'lang']);
const LEGEND_KEYS = new Set(['lens', 'filters', 'lang', 'theme', 'selection', 'year', 'yearFilter']);
const POINT_KINDS = ['conflict', 'choke', 'site'];
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const clampK = (k) => clamp(k, K_MIN, K_MAX);

// ---- engine state (one map per page)
let DB, el, baseC, overC, bctx, octx, legend, controls;
let W = 0, H = 0, DPR = 1;
let mode = 'globe';
const V = { rot: [-HOME[0], -HOME[1]], gk: 1, cx: 0, cy: 0, fk: 1, off: [0, 0] };
let offTarget = 0;
let gBase = 1, s0 = 1;
const ortho = d3.geoOrthographic().clipAngle(90);
const flat = d3.geoEqualEarth();
// Direct-projection parameters for shapes that need no clipping (see traceShape): most of the world, most frames.
const fastQ = { cl: 1, sl: 0, cp: 1, sp: 0, k: 1, tx: 0, ty: 0 };
const P0 = d3.geoEqualEarth().scale(1).translate([0, 0]);
let sphereUnit = [[-3, -1.5], [3, 1.5]];
let proj = ortho;
const geoList = [];            // country geometry records, smallest first (picking order)
let labelOrder = [];           // largest first
const geoBy = new Map();
const paths = new Map();       // iso3 → Path2D for the current frame
let scene = null;
let hits = { markers: [], arcs: [] };
let hover = null, tipHtml = '';
let hl = null;
let interacting = false, endTimer = 0;
let motion = null;
let frame = 0, needBase = false, needOver = false, lastNow = 0;
let colors = null, hatch = null;
const dimCache = new Map();
const measure = new Map();
const labelRects = new Map();
const topLabels = [];
const geoMeta = new WeakMap(); // feature → {bbox, area}
let pendingVisible = false;
let offTimers = [];

const GRAT10 = d3.geoGraticule10();
const GRAT5 = d3.geoGraticule().step([5, 5])();

// ======================================================================= init
export function initMap(mount, db) {
  DB = db;
  el = mount;
  mode = state.projection === 'flat' ? 'flat' : 'globe';
  el.classList.add('map-root');
  el.tabIndex = 0;
  el.setAttribute('role', 'application');
  el.setAttribute('aria-label', t('map.aria'));
  baseC = makeCanvas('map-layer map-base');
  overC = makeCanvas('map-layer map-over');
  bctx = baseC.getContext('2d');
  octx = overC.getContext('2d');
  prepGeometry();

  const stage = el.parentElement || el;
  legend = mountLegend(stage, DB);
  controls = mountControls(stage, { zoom: zoomButton, reset: resetView });

  bindInput();
  bindStore();
  new ResizeObserver(resize).observe(el);
  resize();

  // canvas text needs the web fonts loaded before measuring; redraw once they arrive
  const X = xc();
  Promise.all([
    document.fonts?.load(`500 12px ${X.font}`, 'عربي Abc'),
    document.fonts?.load(`600 12px ${X.font}`, 'عربي Abc'),
  ]).then(() => { measure.clear(); request(true); }).catch(() => {});
  document.fonts?.addEventListener?.('loadingdone', () => { measure.clear(); request(true); });
}

function makeCanvas(cls) {
  const c = document.createElement('canvas');
  c.className = cls;
  c.dir = dir();
  c.setAttribute('aria-hidden', 'true');
  el.append(c);
  return c;
}

function prepGeometry() {
  const unit = d3.geoPath(P0);
  sphereUnit = unit.bounds({ type: 'Sphere' });
  // culling and picking prefilters are computed on the coarse copy and padded past its 0.12° error
  const pad = 0.2, padU = 0.004;
  for (const c of DB.countries.values()) {
    const f = c.feature;
    const coarse = simplifyFeature(f, TOL_COARSE);
    const cap = capOf([coarse.geometry]) || { center: [c.lon, c.lat], r: 0.1 };
    const [[w, s], [e, n]] = d3.geoBounds(coarse);
    const am = w > e || w < -179.9 || e > 179.9;
    const [[ux0, uy0], [ux1, uy1]] = unit.bounds(coarse);
    const g = {
      iso3: c.iso3, c, full: f, coarse, fine: null, focus: null,
      bbox: [[w - pad, Math.max(-90, s - pad)], [e + pad, Math.min(90, n + pad)]],
      cap: { center: cap.center, r: cap.r + 0.03 },
      ub: [[ux0 - padU, uy0 - padU], [ux1 + padU, uy1 + padU]],
      area: c.areaKm2 || 0, am,
    };
    geoList.push(g);
    geoBy.set(c.iso3, g);
  }
  geoList.sort((a, b) => a.area - b.area);
  labelOrder = [...geoList].reverse().filter((g) => g.c.lon != null && g.iso3 !== 'ATA');
  // the medium level of detail is built after first paint
  setTimeout(() => { for (const g of geoList) g.fine = simplifyFeature(g.full, TOL_FINE, 1); request(true); }, 300);
}

/** Main-body geometry of a country for fitting flights (built on first use). */
function focusOf(iso) {
  const g = geoBy.get(iso);
  if (!g) return null;
  return g.focus || (g.focus = focusGeometry(g.full));
}

/** Cached bounds, area and level-of-detail copies for a lens polygon (ethnic extents, disputed areas). */
function meta(f) {
  let m = geoMeta.get(f);
  if (!m) {
    const coarse = simplifyFeature(f, TOL_COARSE), b = d3.geoBounds(coarse), cap = capOf([coarse.geometry]);
    m = {
      bbox: d3.geoBounds(f), area: d3.geoArea(f), coarse, fine: simplifyFeature(f, TOL_FINE, 1), full: f,
      cap: cap && { center: cap.center, r: cap.r + 0.03 }, am: b[0][0] > b[1][0] || b[0][0] < -179.9 || b[1][0] > 179.9,
    };
    geoMeta.set(f, m);
  }
  return m;
}

/**
 * Trace a shape record ({full, coarse, fine, cap, am}) at a level of detail into a Path2D or context.
 * Shapes wholly on the near side of the globe (or clear of the antimeridian on the flat map) are projected
 * directly from packed arrays; only shapes that cross the horizon or the antimeridian go through d3's clipping.
 * Returns false when the shape is on the far side.
 */
function traceShape(rec, level, cen, clipPath, target) {
  const key = rec[level] ? level : 'full';
  const store = rec.pk || (rec.pk = {});
  const pk = store[key] || (store[key] = packFeature(rec[key], P0));
  if (mode === 'flat') {
    if (rec.am) clipPath.context(target)(rec[key]);
    else traceFlat(target, pk.rings, fastQ);
    return true;
  }
  const half = Math.PI / 2;
  if (rec.cap) {
    const d = d3.geoDistance(cen, rec.cap.center);
    if (d - rec.cap.r > half + 0.04) return false;
    if (d + rec.cap.r < half - 0.01) { traceGlobe(target, pk.rings, fastQ); return true; }
  }
  // crossing the horizon: only the polygons that actually cross it go through d3's clipping
  let any = false;
  for (const part of pk.parts) {
    const d = viewAngle(fastQ, part.cx, part.cy, part.cz);
    if (d - part.r > half) continue;
    any = true;
    if (d + part.r < half - 0.005) traceGlobe(target, part.rings, fastQ);
    else clipPath.context(target)({ type: 'Polygon', coordinates: part.coords });
  }
  return any;
}

const gratPacks = new Map();
function drawGraticule(ctx) {
  const grat = (absScale() * Math.PI) / 180 > 40 ? GRAT5 : GRAT10;
  let lines = gratPacks.get(grat);
  if (!lines) gratPacks.set(grat, (lines = packLines(grat, P0)));
  ctx.beginPath();
  (mode === 'globe' ? traceLinesGlobe : traceLinesFlat)(ctx, lines, fastQ);
}

// ================================================================= projection
const baseScale = () => (mode === 'globe' ? gBase : s0);
const absScale = () => (mode === 'globe' ? gBase * V.gk : s0 * V.fk);
const gBaseFor = (w, h) => (Math.min(w, h) / 2) * 0.86;
const s0For = (w, h) => d3.geoEqualEarth().fitExtent([[14, 14], [Math.max(15, w - 14), Math.max(15, h - 14)]], { type: 'Sphere' }).scale();

function updateProjection() {
  const tx = W / 2 + V.off[0], ty = H / 2 + V.off[1];
  if (mode === 'globe') {
    proj = ortho.rotate([V.rot[0], V.rot[1], 0]).scale(gBase * V.gk).translate([tx, ty]);
  } else {
    const s = s0 * V.fk;
    proj = flat.scale(s).translate([tx - V.cx * s, ty - V.cy * s]);
  }
  proj.precision(interacting ? 1 : 0.5);
  const [tx2, ty2] = proj.translate();
  fastQ.k = proj.scale(); fastQ.tx = tx2; fastQ.ty = ty2;
  if (mode === 'globe') {
    const l = (V.rot[0] * Math.PI) / 180, p = (V.rot[1] * Math.PI) / 180;
    fastQ.cl = Math.cos(l); fastQ.sl = Math.sin(l); fastQ.cp = Math.cos(p); fastQ.sp = Math.sin(p);
  }
}

function centerLL() {
  if (mode === 'globe') return [-V.rot[0], -V.rot[1]];
  const ll = P0.invert([V.cx, V.cy]);
  return ll && Number.isFinite(ll[0]) ? ll : [0, 0];
}

function setView(c, s) {
  if (mode === 'globe') { V.rot = [-c[0], clamp(-c[1], -88, 88)]; V.gk = clampK(s / gBase); }
  else { const u = P0(c); V.cx = u[0]; V.cy = u[1]; V.fk = clampK(s / s0); }
}

function clampFlat() {
  const s = s0 * V.fk;
  const [[x0, y0], [x1, y1]] = sphereUnit;
  const hw = W / 2 / s, hh = H / 2 / s;
  const fit = (v, lo, hi, half) => {
    const a = lo + half * 0.94, b = hi - half * 0.94;
    return a > b ? (lo + hi) / 2 : clamp(v, a, b);
  };
  V.cx = fit(V.cx, x0, x1, hw);
  V.cy = fit(V.cy, y0, y1, hh);
}

function panBy(dx, dy) {
  if (mode === 'globe') {
    const s = 180 / (Math.PI * gBase * V.gk);
    V.rot[0] = ((V.rot[0] + dx * s + 540) % 360) - 180;
    V.rot[1] = clamp(V.rot[1] - dy * s, -88, 88);
  } else {
    const s = s0 * V.fk;
    V.cx -= dx / s;
    V.cy -= dy / s;
    clampFlat();
  }
}

function zoomAt(f, x = W / 2 + V.off[0], y = H / 2 + V.off[1]) {
  updateProjection();
  if (mode === 'globe') {
    const before = proj.invert([x, y]);
    V.gk = clampK(V.gk * f);
    if (before && Number.isFinite(before[0]) && d3.geoDistance(before, centerLL()) < 1.2) {
      updateProjection();
      const after = proj(before);
      if (after) panBy(clamp(x - after[0], -300, 300), clamp(y - after[1], -300, 300));
    }
  } else {
    const ox = W / 2 + V.off[0], oy = H / 2 + V.off[1];
    const s = s0 * V.fk, ux = V.cx + (x - ox) / s, uy = V.cy + (y - oy) / s;
    V.fk = clampK(V.fk * f);
    const s2 = s0 * V.fk;
    V.cx = ux - (x - ox) / s2;
    V.cy = uy - (y - oy) / s2;
    clampFlat();
  }
}

/** Screen point of [lon, lat] if it is on the visible side and near the frame; else null. */
function projectVisible(ll, cen, maxAng = 1.53) {
  if (!ll || !Number.isFinite(ll[0])) return null;
  if (mode === 'globe' && d3.geoDistance(ll, cen) > maxAng) return null;
  const p = proj(ll);
  if (!p || !Number.isFinite(p[0])) return null;
  if (p[0] < -60 || p[0] > W + 60 || p[1] < -60 || p[1] > H + 60) return null;
  return p;
}

function invert(x, y) {
  const ll = proj.invert([x, y]);
  if (!ll || !Number.isFinite(ll[0]) || !Number.isFinite(ll[1])) return null;
  if (mode === 'globe') return d3.geoDistance(ll, centerLL()) <= Math.PI / 2 ? ll : null;
  const back = proj(ll);
  return back && Math.hypot(back[0] - x, back[1] - y) < 1.5 ? ll : null;
}

function countryVisible(g, cen) {
  if (mode === 'globe') return d3.geoDistance(cen, g.cap.center) - g.cap.r < Math.PI / 2 + 0.04;
  const s = s0 * V.fk, [tx, ty] = proj.translate();
  return tx + g.ub[1][0] * s >= -2 && tx + g.ub[0][0] * s <= W + 2 && ty + g.ub[1][1] * s >= -2 && ty + g.ub[0][1] * s <= H + 2;
}

function lod() {
  const pxPerDeg = (absScale() * Math.PI) / 180;
  if (interacting) return pxPerDeg < 16 || !geoList[0]?.fine ? 'coarse' : 'fine';
  return pxPerDeg < 28 && geoList[0]?.fine ? 'fine' : 'full';
}

// ===================================================================== colors
function xc() {
  const P = pal();
  if (colors && colors.P === P) return colors;
  const dark = P.dark;
  const rgba = (c, a) => { const x = d3.color(c); if (!x) return c; x.opacity = a; return x.formatRgb(); };
  const surface = cssVar('--surface');
  dimCache.clear();
  colors = {
    P,
    bg: cssVar('--bg'),
    surface,
    ink: cssVar('--accent-ink'),
    font: cssVar('--font-ui') || 'sans-serif',
    fontData: cssVar('--font-data') || 'monospace',
    oceanHi: d3.interpolateLab(P.ocean, dark ? P.fg3 : surface)(dark ? 0.1 : 0.55),
    glow: rgba(P.fg3, dark ? 0.2 : 0.16),
    glow0: rgba(P.fg3, 0),
    limb0: rgba(dark ? cssVar('--bg') : P.fg3, 0),
    limb: rgba(dark ? cssVar('--bg') : P.fg3, dark ? 0.55 : 0.2),
    rim: rgba(P.coast, dark ? 0.9 : 0.7),
    dimTo: dark ? d3.interpolateLab(P.landMuted, P.ocean)(0.25) : P.landMuted,
    warn: P.status.warn,
  };
  return colors;
}

function dim(col, X) {
  let d = dimCache.get(col);
  if (!d) dimCache.set(col, (d = d3.interpolateLab(col, X.dimTo)(0.5)));
  return d;
}

function hatchPattern(ctx, P) {
  const key = P.hatch + '|' + DPR;
  if (hatch?.key === key) return hatch.pat;
  const px = Math.max(4, Math.round(6 * DPR));
  const c = document.createElement('canvas');
  c.width = c.height = px;
  const g = c.getContext('2d');
  g.strokeStyle = P.hatch;
  g.lineWidth = Math.max(1, 1.05 * DPR);
  g.beginPath();
  for (const o of [-px, 0, px]) { g.moveTo(o, px); g.lineTo(o + px, 0); }
  g.stroke();
  const pat = ctx.createPattern(c, 'repeat');
  try { pat.setTransform(new DOMMatrix([1 / DPR, 0, 0, 1 / DPR, 0, 0])); } catch { /* engines without pattern transforms draw device-scale tiles */ }
  hatch = { key, pat };
  return pat;
}

// ===================================================================== render
function request(base = true) {
  if (base) needBase = true;
  needOver = true;
  if (!frame) frame = requestAnimationFrame(loop);
}

function loop(now) {
  frame = 0;
  const dt = lastNow ? Math.min(64, now - lastNow) : 16;
  lastNow = now;
  let moving = false;
  if (motion) {
    needBase = true;
    if (motion.step(now)) { motion = null; endInteraction(0); } else moving = true;
  }
  if (V.off[1] !== offTarget) {
    const d = offTarget - V.off[1];
    V.off[1] = Math.abs(d) < 0.5 || reducedMotion() ? offTarget : V.off[1] + d * Math.min(1, dt / 110);
    needBase = true;
    if (V.off[1] !== offTarget) moving = true;
  }
  if (!W) return;
  if (!scene) {
    try { scene = buildScene(DB, state, pal()); } catch (err) { console.error('[atlas] map scene failed', err); scene = emptyScene(); }
  }
  if (needBase) renderBase();
  if (needBase || needOver) renderOverlay(now);
  needBase = needOver = false;
  if (moving) frame = requestAnimationFrame(loop);
  else if (pulsing()) { needOver = true; frame = requestAnimationFrame(loop); }
  else lastNow = 0;
}

function emptyScene() {
  return { fill: new Map(), hatch: new Set(), hatchAlpha: 0.5, emph: null, outlines: [], polys: [], under: [], selPolys: [], arcs: [], markers: [], labels: [], badges: [], selRing: null, pulse: false };
}

const pulsing = () => scene?.pulse && !reducedMotion() && !state.view && !document.hidden;

function renderNow() {
  if (frame) { cancelAnimationFrame(frame); frame = 0; }
  needBase = needOver = true;
  loop(performance.now());
}

function renderBase() {
  const P = pal(), X = xc(), ctx = bctx;
  updateProjection();
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  ctx.fillStyle = X.bg;
  ctx.fillRect(0, 0, W, H);
  const path = d3.geoPath(proj, ctx);
  const cen = centerLL();

  drawSphere(ctx, path, P, X);
  if (state.layers.graticule) {
    drawGraticule(ctx);
    ctx.strokeStyle = P.graticule;
    ctx.lineWidth = 0.6;
    ctx.stroke();
  }

  // project every visible country once into a Path2D; fills, strokes, outlines and hover reuse it
  paths.clear();
  const level = lod();
  const clipPath = d3.geoPath(proj);
  for (const g of geoList) {
    if (!countryVisible(g, cen)) continue;
    const p2 = new Path2D();
    if (traceShape(g, level, cen, clipPath, p2)) paths.set(g.iso3, p2);
  }
  drawLand(ctx, P, X);
  for (const p of scene.under) drawPoly(ctx, clipPath, cen, level, p, P);
  for (const p of scene.polys) drawPoly(ctx, clipPath, cen, level, p, P);
  if (mode === 'globe') drawLimb(ctx, X);
  drawLabels(ctx, P, X, cen);
}

function drawSphere(ctx, path, P, X) {
  if (mode === 'globe') {
    const [cx, cy] = proj.translate(), r = proj.scale();
    const glow = ctx.createRadialGradient(cx, cy, r * 0.98, cx, cy, r * 1.075);
    glow.addColorStop(0, X.glow);
    glow.addColorStop(1, X.glow0);
    ctx.fillStyle = glow;
    ctx.beginPath(); ctx.arc(cx, cy, r * 1.075, 0, TAU); ctx.fill();
    const sea = ctx.createRadialGradient(cx - r * 0.35, cy - r * 0.4, r * 0.05, cx, cy, r);
    sea.addColorStop(0, X.oceanHi);
    sea.addColorStop(1, P.ocean);
    ctx.fillStyle = sea;
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, TAU); ctx.fill();
  } else {
    ctx.beginPath(); path({ type: 'Sphere' });
    ctx.fillStyle = X.oceanHi;
    ctx.fill();
    ctx.strokeStyle = X.rim;
    ctx.lineWidth = 0.8;
    ctx.stroke();
  }
}

function drawLimb(ctx, X) {
  const [cx, cy] = proj.translate(), r = proj.scale();
  const g = ctx.createRadialGradient(cx, cy, r * 0.5, cx, cy, r);
  g.addColorStop(0, X.limb0);
  g.addColorStop(1, X.limb);
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.arc(cx, cy, r, 0, TAU); ctx.fill();
  ctx.strokeStyle = X.rim;
  ctx.lineWidth = 1;
  ctx.stroke();
}

function drawLand(ctx, P, X) {
  const sc = scene;
  const all = new Path2D();
  for (const p of paths.values()) all.addPath(p);
  ctx.lineJoin = 'round';
  // coast: a wide stroke whose inner half the fills cover, leaving a hairline outside the land
  ctx.strokeStyle = P.coast;
  ctx.lineWidth = 1.3;
  ctx.stroke(all);
  for (const [iso, p] of paths) {
    let col = sc.fill.get(iso) || P.land;
    if (sc.emph && !sc.emph.has(iso)) col = dim(col, X);
    ctx.fillStyle = col;
    ctx.fill(p);
  }
  if (sc.hatch.size) {
    ctx.globalAlpha = sc.hatchAlpha;
    ctx.fillStyle = hatchPattern(ctx, P);
    for (const iso of sc.hatch) { const p = paths.get(iso); if (p) ctx.fill(p); }
    ctx.globalAlpha = 1;
  }
  if (state.layers.boundaries) {
    ctx.strokeStyle = P.border;
    ctx.lineWidth = 0.6;
    ctx.stroke(all);
  }
}

function drawPoly(ctx, clipPath, cen, level, p, P) {
  ctx.beginPath();
  if (!traceShape(meta(p.feature), level, cen, clipPath, ctx)) return;
  if (p.hatch) { ctx.globalAlpha = p.hatchAlpha ?? 1; ctx.fillStyle = hatchPattern(ctx, P); ctx.fill(); }
  else if (p.fill) { ctx.globalAlpha = p.fillAlpha ?? 1; ctx.fillStyle = p.fill; ctx.fill(); }
  if (p.stroke) {
    ctx.globalAlpha = p.strokeAlpha ?? 1;
    ctx.strokeStyle = p.stroke;
    ctx.lineWidth = p.width || 1;
    ctx.setLineDash(p.dash || []);
    ctx.stroke();
    ctx.setLineDash([]);
  }
  ctx.globalAlpha = 1;
}

// ===================================================================== labels
class Grid {
  constructor(w, h, cell = 8) { this.c = cell; this.cols = Math.ceil(w / cell) + 1; this.rows = Math.ceil(h / cell) + 1; this.a = new Uint8Array(this.cols * this.rows); }
  scan(r, set) {
    const c = this.c;
    const i0 = Math.max(0, Math.floor(r[0] / c)), i1 = Math.min(this.cols - 1, Math.floor(r[2] / c));
    const j0 = Math.max(0, Math.floor(r[1] / c)), j1 = Math.min(this.rows - 1, Math.floor(r[3] / c));
    for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) {
      const k = j * this.cols + i;
      if (set) this.a[k] = 1; else if (this.a[k]) return false;
    }
    return true;
  }
  free(r) { return r[0] >= 0 && r[1] >= 0 && r[2] <= W && r[3] <= H && this.scan(r, false); }
  mark(r) { this.scan(r, true); }
  cost(r) {
    const c = this.c;
    let n = r[0] < 0 || r[2] > W || r[1] < 0 || r[3] > H ? 1000 : 0;
    for (let j = Math.max(0, Math.floor(r[1] / c)); j <= Math.min(this.rows - 1, Math.floor(r[3] / c)); j++) {
      for (let i = Math.max(0, Math.floor(r[0] / c)); i <= Math.min(this.cols - 1, Math.floor(r[2] / c)); i++) n += this.a[j * this.cols + i];
    }
    return n;
  }
}

// Map labels use the short forms cartographers print; the dossier keeps the full names.
const SHORT_NAME = {
  en: { CHN: 'China', USA: 'United States', COD: 'DR Congo', COG: 'Congo', CAF: 'Central African Rep.', BIH: 'Bosnia & Herz.', ARE: 'UAE', CYN: 'N. Cyprus' },
  ar: { COD: 'الكونغو الديمقراطية', CAF: 'أفريقيا الوسطى', ARE: 'الإمارات' },
};
const mapName = (c) => SHORT_NAME[state.lang]?.[c.iso3] || Lk(c, 'name');

function textW(ctx, font, s) {
  const k = font + '|' + s;
  let w = measure.get(k);
  if (w == null) { ctx.font = font; w = ctx.measureText(s).width; measure.set(k, w); }
  return w;
}

function wrapLabel(ctx, font, text, max = 96) {
  const w = textW(ctx, font, text);
  if (w <= max || !text.includes(' ')) return { lines: [text], w };
  const mid = text.length / 2;
  let cut = -1;
  for (let i = 0; i < text.length; i++) if (text[i] === ' ' && (cut < 0 || Math.abs(i - mid) < Math.abs(cut - mid))) cut = i;
  const a = text.slice(0, cut), b = text.slice(cut + 1);
  return { lines: [a, b], w: Math.max(textW(ctx, font, a), textW(ctx, font, b)) };
}

function drawText(ctx, lines, x, y, size, font, fill, halo) {
  ctx.font = font;
  ctx.textAlign = 'center';
  const lh = size * 1.2;
  let yy = y - ((lines.length - 1) * lh) / 2;
  for (const ln of lines) {
    ctx.strokeStyle = halo;
    ctx.lineWidth = 3;
    ctx.strokeText(ln, x, yy);
    ctx.fillStyle = fill;
    ctx.fillText(ln, x, yy);
    yy += lh;
  }
}

function drawLabels(ctx, P, X, cen) {
  const sc = scene;
  labelRects.clear();
  topLabels.length = 0;
  const grid = new Grid(W, H);
  ctx.direction = dir();
  ctx.textBaseline = 'middle';
  ctx.lineJoin = 'round';
  const pxPerKm = absScale() / 6371;

  // markers keep their footprint clear of text
  const named = [];
  for (const m of sc.markers) {
    const p = projectVisible(m.lonlat, cen);
    if (!p) continue;
    const r = m.r + 2;
    grid.mark([p[0] - r, p[1] - r, p[0] + r, p[1] + r]);
    if (m.label) named.push([m, p]);
  }
  // marker names are always on: beside the marker, the other side, below, or forced beside it
  for (const [m, p] of named) {
    const size = 11.5, font = `600 ${size}px ${X.font}`;
    const w = textW(ctx, font, m.label), h = size + 4;
    const endSide = dir() === 'rtl' ? -1 : 1;
    const opts = [];
    for (const dy of [0, -h * 0.8, h * 0.8]) {
      for (const sd of [endSide, -endSide]) {
        const x0 = sd > 0 ? p[0] + m.r + 5 : p[0] - m.r - 5 - w;
        opts.push([x0 - 2, p[1] - h / 2 + dy, x0 + w + 2, p[1] + h / 2 + dy]);
      }
    }
    opts.push([p[0] - w / 2 - 2, p[1] + m.r + 3, p[0] + w / 2 + 2, p[1] + m.r + 3 + h]);
    opts.push([p[0] - w / 2 - 2, p[1] - m.r - 3 - h, p[0] + w / 2 + 2, p[1] - m.r - 3]);
    // first free slot; when all collide, the one overlapping the fewest cells (these names are always shown)
    const r = opts.find((o) => grid.free(o)) || opts.reduce((a, b) => (grid.cost(b) < grid.cost(a) ? b : a));
    grid.mark(r);
    drawText(ctx, [m.label], (r[0] + r[2]) / 2, (r[1] + r[3]) / 2, size, font, P.fg, P.halo);
  }

  // lens labels (ethnic group names) before country names
  for (const lb of [...sc.labels].sort((a, b) => b.pri - a.pri)) {
    const p = projectVisible(lb.lonlat, cen, 1.35);
    if (!p) continue;
    const size = 11.5, font = `italic 500 ${size}px ${X.font}`;
    const { lines, w } = wrapLabel(ctx, font, lb.text, 110);
    const diam = 2 * Math.sqrt(lb.areaKm2 / Math.PI) * pxPerKm;
    const isSel = state.selection?.kind === lb.kind && state.selection.id === lb.id;
    if (!isSel && diam < w * 0.7) continue;
    const h = lines.length * size * 1.2;
    const r = [p[0] - w / 2 - 3, p[1] - h / 2, p[0] + w / 2 + 3, p[1] + h / 2];
    if (!grid.free(r)) continue;
    grid.mark(r);
    drawText(ctx, lines, p[0], p[1], size, font, P.fg, P.halo);
  }

  // country names, largest first; the selection and compared states go first
  const sel = state.selection?.kind === 'country' ? state.selection.id : null;
  const cmp = state.view === 'compare' ? (state.compare || []).filter(Boolean) : [];
  const first = new Set([sel, ...cmp].filter(Boolean));
  const order = first.size ? [...[...first].map((iso) => geoBy.get(iso)).filter(Boolean), ...labelOrder.filter((g) => !first.has(g.iso3))] : labelOrder;
  const badgeOf = new Map(sc.badges.filter((b) => b.type !== 'cmp').map((b) => [b.iso3, b.type]));
  const rtl = dir() === 'rtl';
  if (state.layers.labels) {
    for (const g of order) {
      const c = g.c;
      const forced = first.has(g.iso3);
      const diam = 2 * Math.sqrt(g.area / Math.PI) * pxPerKm;
      if (!forced && diam < 16) continue;
      if (!paths.has(g.iso3)) continue;
      const p = projectVisible([c.lon, c.lat], cen, 1.32);
      if (!p) continue;
      const tier = g.area > 2.5e6 ? 0 : g.area > 6e5 ? 1 : 2;
      const size = [12.5, 12, 11][tier];
      const font = `${forced || tier === 0 ? 600 : 500} ${size}px ${X.font}`;
      const { lines, w } = wrapLabel(ctx, font, mapName(c));
      if (!forced && diam < w * 0.6) continue;
      const h = lines.length * size * 1.2;
      const r = [p[0] - w / 2 - 3, p[1] - h / 2 - 1, p[0] + w / 2 + 3, p[1] + h / 2 + 1];
      // room for the badge: profile dot before the name, "!" after it (reading direction)
      const bt = badgeOf.get(g.iso3);
      if (bt === 'intel') { if (rtl) r[2] += 7; else r[0] -= 7; }
      if (bt === 'contested') { if (rtl) r[0] -= 12; else r[2] += 12; }
      if (!grid.free(r) && !(forced && r[0] >= 0 && r[2] <= W)) continue;
      grid.mark(r);
      labelRects.set(g.iso3, r);
      // the selected / compared names are repeated on the overlay so arcs and markers never cover them
      if (forced) topLabels.push({ lines, x: p[0], y: p[1], size, font });
      // country names step back when the lens labels its own features (ethnic groups) or a selection dims the rest
      const muted = (sc.emph && !sc.emph.has(g.iso3)) || sc.labels.length > 0;
      drawText(ctx, lines, p[0], p[1], size, font, forced ? P.fg : muted ? P.fg3 : P.fg2, P.halo);
    }
  }
  drawBadges(ctx, P, X, cen, grid);
}

/** Small marks tied to a country's name: profile dot, contested "!", compare numbers. */
function drawBadges(ctx, P, X, cen, grid) {
  const rtl = dir() === 'rtl';
  for (const b of scene.badges) {
    const g = geoBy.get(b.iso3);
    if (!g || !paths.has(b.iso3)) continue;
    const r = labelRects.get(b.iso3);
    let x, y;
    if (r) {
      // the label's reserved box already includes room for its badge on the matching side
      y = (r[1] + r[3]) / 2;
      if (b.type === 'intel') x = rtl ? r[2] - 3 : r[0] + 3;
      else if (b.type === 'contested') x = rtl ? r[0] + 6 : r[2] - 6;
      else { x = (r[0] + r[2]) / 2; y = r[1] - 9; }
    } else {
      const p = projectVisible([g.c.lon, g.c.lat], cen, 1.4);
      if (!p) continue;
      [x, y] = p;
      if (b.type === 'cmp') y -= 12;
      // a badge without its name only shows where it does not sit on another label
      const rad = b.type === 'intel' ? 3 : 6;
      const box = [x - rad, y - rad, x + rad, y + rad];
      if (b.type !== 'cmp') { if (!grid.free(box)) continue; grid.mark(box); }
    }
    if (b.type === 'intel') {
      ctx.beginPath(); ctx.arc(x, y, 2.3, 0, TAU);
      ctx.fillStyle = P.accent; ctx.fill();
      ctx.lineWidth = 1; ctx.strokeStyle = P.halo; ctx.stroke();
    } else if (b.type === 'contested') {
      ctx.beginPath(); ctx.arc(x, y, 5.5, 0, TAU);
      ctx.fillStyle = X.surface; ctx.fill();
      ctx.lineWidth = 1.2; ctx.strokeStyle = X.warn; ctx.stroke();
      ctx.font = `700 9px ${X.fontData}`; ctx.textAlign = 'center'; ctx.fillStyle = X.warn;
      ctx.fillText('!', x, y + 0.5);
    } else if (b.type === 'cmp') {
      ctx.beginPath(); ctx.arc(x, y, 7.5, 0, TAU);
      ctx.fillStyle = P.sel; ctx.fill();
      ctx.lineWidth = 1.5; ctx.strokeStyle = P.halo; ctx.stroke();
      ctx.font = `600 10px ${X.fontData}`; ctx.textAlign = 'center'; ctx.fillStyle = X.ink;
      ctx.fillText(String(b.n), x, y + 0.5);
    }
  }
}

// ===================================================================== overlay
function renderOverlay(now) {
  const P = pal(), X = xc(), ctx = octx;
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  ctx.clearRect(0, 0, W, H);
  const path = d3.geoPath(proj, ctx);
  const cen = centerLL();
  hits = { markers: [], arcs: [] };
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';

  for (const o of scene.outlines) {
    ctx.strokeStyle = o.color;
    ctx.lineWidth = o.width;
    ctx.setLineDash(o.dash || []);
    for (const iso of o.iso3) { const p = paths.get(iso); if (p) ctx.stroke(p); }
  }
  ctx.setLineDash([]);
  const clipPath = d3.geoPath(proj), level = lod();
  for (const p of scene.selPolys) drawPoly(ctx, clipPath, cen, level, p, P);

  if (hl) {
    ctx.strokeStyle = P.accent2;
    ctx.lineWidth = 1.6;
    ctx.setLineDash([4, 3]);
    for (const iso of hl.iso3 || []) { const p = paths.get(iso); if (p) ctx.stroke(p); }
    ctx.setLineDash([]);
    const p = hl.lonlat && projectVisible(hl.lonlat, cen);
    if (p) ring(ctx, p[0], p[1], 8, P.accent2, 2, P.halo);
  }

  if (hover?.kind === 'country') {
    const p = paths.get(hover.id);
    if (p) { ctx.globalAlpha = 0.8; ctx.strokeStyle = P.fg; ctx.lineWidth = 1.2; ctx.stroke(p); ctx.globalAlpha = 1; }
  } else if (hover && (hover.kind === 'group' || hover.kind === 'disputed')) {
    for (const p of scene.polys) if (p.kind === hover.kind && p.id === hover.id) drawPoly(ctx, clipPath, cen, level, { feature: p.feature, stroke: P.fg, width: 1.4, strokeAlpha: 0.85 }, P);
  }

  for (const a of scene.arcs) drawArc(ctx, path, a, cen);
  // arc ends: one quiet node per state so bundles read as starting somewhere
  const ends = new Map();
  for (const a of scene.arcs) for (const ll of [a.from, a.to]) ends.set(ll.join(','), ll);
  for (const ll of ends.values()) {
    const p = projectVisible(ll, cen);
    if (!p) continue;
    ctx.beginPath(); ctx.arc(p[0], p[1], 2.4, 0, TAU);
    ctx.fillStyle = P.fg2; ctx.fill();
    ctx.strokeStyle = P.halo; ctx.lineWidth = 1.2; ctx.stroke();
  }
  for (const m of scene.markers) drawMarker(ctx, m, cen, P, X, now);

  if (scene.selRing) {
    const p = projectVisible(scene.selRing.lonlat, cen);
    if (p) {
      const m = scene.markers.find((x) => x.kind === scene.selRing.kind && x.id === scene.selRing.id);
      ring(ctx, p[0], p[1], (m ? m.r : 4) + 5, P.sel, 2, P.halo);
    }
  }
  ctx.direction = dir();
  ctx.textBaseline = 'middle';
  for (const lb of topLabels) drawText(ctx, lb.lines, lb.x, lb.y, lb.size, lb.font, P.fg, P.halo);
}

function ring(ctx, x, y, r, color, w, halo) {
  ctx.beginPath(); ctx.arc(x, y, r, 0, TAU);
  ctx.strokeStyle = halo; ctx.lineWidth = w + 2.5; ctx.stroke();
  ctx.strokeStyle = color; ctx.lineWidth = w; ctx.stroke();
}

function drawArc(ctx, path, a, cen) {
  const on = hover && hover.kind === a.kind && hover.id === a.id;
  ctx.globalAlpha = on ? 1 : a.alpha ?? 1;
  ctx.strokeStyle = a.color;
  ctx.lineWidth = a.width + (on ? 1.2 : 0);
  ctx.setLineDash(a.dash || []);
  ctx.lineCap = a.round || !a.dash ? 'round' : 'butt';
  ctx.beginPath();
  path({ type: 'LineString', coordinates: [a.from, a.to] });
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.globalAlpha = 1;
  const ip = d3.geoInterpolate(a.from, a.to);
  const pts = [];
  for (let i = 0; i <= 24; i++) pts.push(projectVisible(ip(i / 24), cen));
  hits.arcs.push({ pts, kind: a.kind, id: a.id, conflict: a.conflict });
}

function shapePath(ctx, shape, r) {
  ctx.beginPath();
  switch (shape) {
    case 'square': ctx.rect(-r * 0.86, -r * 0.86, r * 1.72, r * 1.72); break;
    case 'diamond': ctx.moveTo(0, -r * 1.2); ctx.lineTo(r * 1.2, 0); ctx.lineTo(0, r * 1.2); ctx.lineTo(-r * 1.2, 0); ctx.closePath(); break;
    case 'triangle': ctx.moveTo(0, -r * 1.15); ctx.lineTo(r * 1.1, r * 0.85); ctx.lineTo(-r * 1.1, r * 0.85); ctx.closePath(); break;
    case 'hex': for (let i = 0; i < 6; i++) { const a = -Math.PI / 2 + (i * Math.PI) / 3; ctx[i ? 'lineTo' : 'moveTo'](Math.cos(a) * r * 1.1, Math.sin(a) * r * 1.1); } ctx.closePath(); break;
    default: ctx.arc(0, 0, r, 0, TAU);
  }
}

function drawMarker(ctx, m, cen, P, X, now) {
  const p = projectVisible(m.lonlat, cen);
  if (!p) return;
  const [x, y] = p;
  const on = hover && hover.kind === m.kind && hover.id === m.id;
  const r = m.r;
  hits.markers.push({ x, y, r: Math.max(r, 6), kind: m.kind, id: m.id });
  ctx.save();
  ctx.translate(x, y);
  const halo = (w) => { ctx.strokeStyle = P.halo; ctx.lineWidth = w; ctx.stroke(); };
  const fill = (col) => { ctx.fillStyle = col; ctx.fill(); };
  const line = (col, w, dash) => { ctx.setLineDash(dash || []); ctx.strokeStyle = col; ctx.lineWidth = w; ctx.stroke(); ctx.setLineDash([]); };
  switch (m.shape) {
    case 'pulse': {
      shapePath(ctx, 'disc', r * 0.85); halo(3); fill(m.color);
      if (reducedMotion() || state.view) {
        shapePath(ctx, 'disc', r + 3.5); line(m.color, 1.3);
        ctx.globalAlpha = 0.45; shapePath(ctx, 'disc', r + 7); line(m.color, 1); ctx.globalAlpha = 1;
      } else {
        for (const off of [0, 0.5]) {
          const ph = ((now / 1900) + off) % 1;
          ctx.globalAlpha = (1 - ph) * 0.75;
          shapePath(ctx, 'disc', r + 2 + ph * 13); line(m.color, 1.4);
        }
        ctx.globalAlpha = 1;
      }
      break;
    }
    case 'ring': shapePath(ctx, 'disc', r * 0.85); halo(5); line(m.color, 2.3); break;
    case 'dashed': shapePath(ctx, 'disc', r); halo(4); line(m.color, 1.7, [2.6, 2.2]); break;
    case 'hollow': shapePath(ctx, 'disc', r * 0.9); halo(3.5); line(m.color, 1.3); break;
    case 'dot': shapePath(ctx, 'disc', r * 0.55); halo(2.5); fill(m.color); break;
    case 'choke': {
      shapePath(ctx, 'disc', r);
      ctx.globalAlpha = 0.22; fill(m.color); ctx.globalAlpha = 1;
      halo(4.5); line(m.color, 2);
      shapePath(ctx, 'disc', 1.8); fill(P.fg);
      break;
    }
    case 'hatchdot': shapePath(ctx, 'disc', r); halo(3); fill(X.surface); fill(hatchPattern(ctx, P)); line(P.hatch, 1.1); break;
    case 'pin': {
      const isSel = state.selection?.kind === m.kind && state.selection.id === m.id;
      shapePath(ctx, 'disc', r); halo(3); fill(isSel ? P.accent : m.color);
      break;
    }
    default: shapePath(ctx, m.shape, r * 0.9); halo(3); fill(m.color);
  }
  if (on) { shapePath(ctx, 'disc', r + 4); line(P.fg, 1.3); }
  ctx.restore();
}

// ===================================================================== picking
function pick(x, y, touch = false, exact = false) {
  const slop = touch ? 10 : 3;
  for (let i = hits.markers.length - 1; i >= 0; i--) {
    const m = hits.markers[i];
    if (Math.hypot(m.x - x, m.y - y) <= m.r + slop) return { kind: m.kind, id: m.id };
  }
  let best = null, bd = touch ? 12 : 5;
  for (const a of hits.arcs) {
    for (let i = 1; i < a.pts.length; i++) {
      const p = a.pts[i - 1], q = a.pts[i];
      if (!p || !q || Math.abs(p[0] - q[0]) > W / 2) continue;
      const d = segDist(x, y, p[0], p[1], q[0], q[1]);
      if (d < bd) { bd = d; best = a; }
    }
  }
  if (best) return { kind: best.kind, id: best.id, conflict: best.conflict };
  const ll = invert(x, y);
  if (!ll) return null;
  let poly = null, pa = Infinity;
  for (const p of scene.polys) {
    if (!p.kind) continue;
    const m = meta(p.feature);
    if (m.area < pa && inBounds(m.bbox, ll[0], ll[1]) && d3.geoContains(p.feature, ll)) { pa = m.area; poly = p; }
  }
  if (poly) return { kind: poly.kind, id: poly.id };
  for (const g of geoList) {
    if (inBounds(g.bbox, ll[0], ll[1]) && d3.geoContains(exact ? g.full : g.fine || g.full, ll)) return { kind: 'country', id: g.iso3 };
  }
  return null;
}

let hoverReq = null, hoverRaf = 0;
function queueHover(x, y, cx, cy, touch) {
  hoverReq = [x, y, cx, cy, touch];
  if (!hoverRaf) hoverRaf = requestAnimationFrame(doHover);
}

function doHover() {
  hoverRaf = 0;
  if (!hoverReq || drag || !scene) return;
  const [x, y, cx, cy, touch] = hoverReq;
  const hit = pick(x, y, touch);
  setHover(hit, cx, cy);
  if (tipHtml) showTip(tipHtml, cx, cy);
}

function setHover(hit, cx, cy) {
  const key = hit ? `${hit.kind}:${hit.id}` : '';
  const prev = hover ? `${hover.kind}:${hover.id}` : '';
  if (key === prev) return;
  hover = hit;
  el.classList.toggle('hot', !!hit);
  tipHtml = hit ? tipFor(hit, DB, state) : '';
  if (!tipHtml) hideTip();
  store.hover(hit ? { kind: hit.kind === 'power' ? 'country' : hit.kind, id: hit.id, x: cx, y: cy } : null);
  request(false);
}

function clearHover() {
  hoverReq = null;
  if (hover) setHover(null);
  hideTip();
}

function click(x, y, touch) {
  const hit = pick(x, y, touch, true);
  if (!hit) { if (state.selection) store.select(null); return; }
  if (hit.kind === 'edge') {
    const e = DB.edgeById.get(hit.id);
    if (e) store.set({ view: 'compare', compare: [e.a, e.b] });
    return;
  }
  pendingVisible = true;
  store.select(hit.kind === 'power' ? 'country' : hit.kind, hit.id, { fly: false });
}

// ===================================================================== motion
function beginInteraction() { interacting = true; clearTimeout(endTimer); }
function endInteraction(delay = 160) {
  clearTimeout(endTimer);
  endTimer = setTimeout(() => {
    if (drag || motion) return;
    interacting = false;
    request(true);
  }, delay);
}
function stopMotion() { motion = null; }

/** Animated flight to {center:[lon,lat], scale: px per radian}. */
function flyTo(target, maxDur = 900) {
  stopMotion();
  const c1 = target.center, s1 = target.scale;
  if (!c1 || !Number.isFinite(c1[0]) || !Number.isFinite(s1)) return;
  if (reducedMotion()) {
    setView(c1, s1);
    if (mode === 'flat') clampFlat();
    request(true);
    return;
  }
  const t0 = performance.now();
  if (mode === 'globe') {
    const c0 = centerLL(), sA = absScale();
    const ip = d3.geoInterpolate(c0, c1), dist = d3.geoDistance(c0, c1);
    const l0 = Math.log(sA), l1 = Math.log(s1);
    // long hops between close-ups pull back toward the whole globe mid-flight
    const dip = Math.max(0, Math.min(l0, l1) - Math.log(gBase)) * Math.min(1, dist / 1.2) * 0.9;
    const dur = Math.min(maxDur, 420 + 480 * Math.min(1, dist / 1.6 + Math.abs(l1 - l0) / 4));
    motion = {
      step(now) {
        const u = Math.min(1, (now - t0) / dur), e = d3.easeCubicInOut(u);
        setView(ip(e), Math.exp(l0 + (l1 - l0) * e - dip * Math.sin(Math.PI * e)));
        return u >= 1;
      },
    };
  } else {
    const b = P0(c1);
    const vw = Math.max(1, W);
    const iz = d3.interpolateZoom([V.cx, V.cy, vw / absScale()], [b[0], b[1], vw / s1]);
    const dur = clamp(iz.duration * 0.55, 420, maxDur);
    motion = {
      step(now) {
        const u = Math.min(1, (now - t0) / dur), [x, y, w] = iz(d3.easeCubicInOut(u));
        V.cx = x; V.cy = y; V.fk = clampK(vw / w / s0);
        if (u >= 1) clampFlat();
        return u >= 1;
      },
    };
  }
  beginInteraction();
  request(true);
}

function startInertia(vx, vy) {
  let last = performance.now();
  motion = {
    step(now) {
      const dt = Math.min(48, now - last);
      last = now;
      panBy(vx * dt, vy * dt);
      const k = Math.pow(0.925, dt / 16);
      vx *= k; vy *= k;
      return Math.hypot(vx, vy) < 0.015;
    },
  };
  beginInteraction();
  request(true);
}

/** Fit target for some geometries (+ points) inside the unobscured part of the stage. */
function fitTarget(geoms, pts) {
  const cap = capOf(geoms, pts);
  return cap ? capTarget(cap.center, cap.r) : null;
}

/** Scale that shows a cap of angular radius r around `center` inside the unobscured part of the stage. */
function capTarget(center, r) {
  const rect = el.getBoundingClientRect(), sr = safeRect();
  // leave context around the target; small states never zoom past a ~7° wide window
  const R = 0.31 * Math.min(sr.w, sr.h);
  const rr = Math.max(r, 0.06);
  if (mode === 'globe') {
    const gb = gBaseFor(rect.width, rect.height);
    return { center, scale: clamp(R / Math.sin(Math.min(rr, 1.4)), gb * 0.95, gb * K_FIT_MAX) };
  }
  const fb = s0For(rect.width, rect.height);
  return { center, scale: clamp(R / (rr * 1.1), fb, fb * K_FIT_MAX) };
}

function selectionTarget(kind, id) {
  const x = DB.get(kind, id);
  if (!x) return null;
  let geoms;
  if (kind === 'group') geoms = x.features.map((f) => f.geometry);
  else if (kind === 'disputed') geoms = [x.feature.geometry];
  else geoms = DB.countriesOf(kind, id).map((iso) => focusOf(iso)).filter(Boolean);
  if (POINT_KINDS.includes(kind)) {
    // a place (conflict, strait, site) stays the centre; its states set the zoom, within a regional window
    // so a conflict involving Russia frames the front line, not Siberia
    const a = DB.anchorOf(kind, id);
    if (a) {
      const cap = capOf(geoms, [a]);
      const reach = cap ? d3.geoDistance(a, cap.center) + cap.r : 0;
      return capTarget(a, clamp(reach, 0.08, 0.38));
    }
  }
  const a = kind === 'event' ? eventAnchor(DB, x) : null;
  return fitTarget(geoms, a ? [a] : []);
}

function anchorFor(sel) {
  if (!sel) return null;
  if (sel.kind === 'country') { const c = DB.countries.get(sel.id); return c ? [c.lon, c.lat] : null; }
  if (sel.kind === 'event') { const e = DB.get('event', sel.id); return e ? eventAnchor(DB, e) : null; }
  return DB.anchorOf(sel.kind, sel.id);
}

/** After a map click opens the dossier, glide the selection back into the clear part of the stage if needed. */
function ensureVisible() {
  const a = anchorFor(state.selection);
  if (!a || motion) return;
  updateProjection();
  const p = projectVisible(a, centerLL());
  const sr = safeRect();
  const inside = p && p[0] > sr.w * 0.1 && p[0] < sr.w * 0.9 && p[1] > sr.h * 0.1 && p[1] < sr.h * 0.9;
  if (!inside) flyTo({ center: a, scale: absScale() }, 650);
}

function resetView() {
  if (mode === 'globe') flyTo({ center: HOME, scale: gBase });
  else flyTo({ center: [0, 0], scale: s0 });
}

function zoomButton(f) {
  if (reducedMotion()) { zoomAt(f); request(true); return; }
  flyTo({ center: centerLL(), scale: clamp(absScale() * f, baseScale() * K_MIN, baseScale() * K_MAX) }, 320);
}

// ===================================================================== projection switch
function applyProjection(to) {
  if (to === mode) return;
  const c = centerLL(), s = absScale(), k = s / baseScale();
  stopMotion();
  mode = to;
  if (k < 1.35) {
    if (to === 'flat') { V.cx = 0; V.cy = 0; V.fk = 1; }
    else { V.rot = [-HOME[0], -HOME[1]]; V.gk = 1; }
  } else {
    setView(c, s);
    if (to === 'flat') clampFlat();
  }
}

function switchProjection(to) {
  if (to === mode) return;
  if (reducedMotion() || !W) { applyProjection(to); request(true); return; }
  // cross-fade: the old frame scales out while the new projection settles in (≤ 650 ms)
  const ghost = document.createElement('canvas');
  ghost.className = 'map-ghost';
  ghost.width = baseC.width; ghost.height = baseC.height;
  ghost.style.width = W + 'px'; ghost.style.height = H + 'px';
  const g = ghost.getContext('2d');
  g.drawImage(baseC, 0, 0);
  g.drawImage(overC, 0, 0);
  el.append(ghost);
  el.classList.add('map-enter');
  applyProjection(to);
  renderNow();
  void el.offsetWidth;
  el.classList.remove('map-enter');
  ghost.classList.add('out');
  setTimeout(() => ghost.remove(), 700);
}

// ===================================================================== layout
function safeRect() {
  const r = el.getBoundingClientRect();
  let h = r.height;
  const dz = document.getElementById('dossier');
  if (dz && !dz.hidden) {
    const d = dz.getBoundingClientRect();
    const spans = d.width > 0 && d.left <= r.left + 8 && d.right >= r.right - 8;
    if (spans && d.top > r.top + 60 && d.top < r.bottom - 10) h = d.top - r.top;
  }
  // on narrow stages the lens card runs along the bottom: keep its header row clear (stable whether the card is open or not)
  const lg = document.getElementById('legend');
  const head = lg?.querySelector('.lc-head');
  if (head) {
    const c = lg.getBoundingClientRect();
    if (c.width > r.width * 0.6) h = Math.min(h, c.bottom - head.offsetHeight - r.top - 6);
  }
  return { w: r.width, h: Math.max(h, r.height * 0.3) };
}

function computeOffset(snap) {
  const sr = safeRect();
  offTarget = Math.round((sr.h - H) / 2);
  if (snap) V.off[1] = offTarget;
  if (V.off[1] !== offTarget) request(true);
}

function scheduleOffset() {
  offTimers.forEach(clearTimeout);
  offTimers = [
    setTimeout(() => computeOffset(false), 60),
    setTimeout(() => {
      computeOffset(false);
      if (pendingVisible) { pendingVisible = false; setTimeout(ensureVisible, 240); }
    }, 460),
  ];
}

function resize() {
  const r = el.getBoundingClientRect();
  const w = Math.max(1, Math.round(r.width)), h = Math.max(1, Math.round(r.height));
  const dpr = Math.min(DPR_CAP, window.devicePixelRatio || 1);
  if (w === W && h === H && dpr === DPR) return;
  const first = !W, both = w !== W && h !== H;
  const absG = gBase * V.gk, absF = s0 * V.fk;
  W = w; H = h;
  if (dpr !== DPR) { DPR = dpr; hatch = null; }
  for (const c of [baseC, overC]) {
    c.width = Math.round(w * dpr);
    c.height = Math.round(h * dpr);
    c.style.width = w + 'px';
    c.style.height = h + 'px';
  }
  gBase = gBaseFor(w, h);
  s0 = s0For(w, h);
  if (!first && !both) {
    // one side changed (a panel opened or closed): keep the map still, only the frame moves
    V.gk = clampK(absG / gBase);
    V.fk = clampK(absF / s0);
  }
  if (mode === 'flat') clampFlat();
  computeOffset(true);
  if (!first) beginInteraction();
  renderNow();
  if (!first) endInteraction(200);
}

// ===================================================================== input
let drag = null;
const ptrs = new Map();

function local(e) {
  const r = el.getBoundingClientRect();
  return [e.clientX - r.left, e.clientY - r.top];
}

function pinchState() {
  const [a, b] = [...ptrs.values()];
  return { d: Math.hypot(a.x - b.x, a.y - b.y), mx: (a.x + b.x) / 2, my: (a.y + b.y) / 2 };
}

function bindInput() {
  el.addEventListener('pointerdown', (e) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    if (e.target !== el && !e.target.classList?.contains('map-layer')) return;
    stopMotion();
    const [x, y] = local(e);
    ptrs.set(e.pointerId, { x, y });
    try { el.setPointerCapture(e.pointerId); } catch { /* pointer already released */ }
    const now = performance.now();
    if (ptrs.size === 1) drag = { sx: x, sy: y, lx: x, ly: y, t0: now, moved: false, pinched: false, samples: [[now, x, y]], touch: e.pointerType === 'touch' };
    else if (ptrs.size === 2 && drag) { drag.moved = true; drag.pinched = true; drag.pinch = pinchState(); clearHover(); }
  });

  el.addEventListener('pointermove', (e) => {
    const [x, y] = local(e);
    const p = ptrs.get(e.pointerId);
    if (!p) { if (e.pointerType !== 'touch') queueHover(x, y, e.clientX, e.clientY, false); return; }
    p.x = x; p.y = y;
    if (!drag) return;
    if (ptrs.size >= 2) {
      const ps = pinchState(), pv = drag.pinch;
      if (pv && pv.d > 0) { zoomAt(ps.d / pv.d, ps.mx, ps.my); panBy(ps.mx - pv.mx, ps.my - pv.my); }
      drag.pinch = ps;
      beginInteraction();
      request(true);
      return;
    }
    if (!drag.moved && Math.hypot(x - drag.sx, y - drag.sy) < (drag.touch ? 8 : 4)) return;
    if (!drag.moved) { drag.moved = true; clearHover(); el.classList.add('dragging'); }
    panBy(x - drag.lx, y - drag.ly);
    drag.lx = x; drag.ly = y;
    const now = performance.now();
    drag.samples.push([now, x, y]);
    if (drag.samples.length > 8) drag.samples.shift();
    beginInteraction();
    request(true);
  });

  const up = (e) => {
    if (!ptrs.has(e.pointerId)) return;
    ptrs.delete(e.pointerId);
    if (!drag) return;
    if (ptrs.size === 1) {
      // pinch → pan: continue from the remaining finger without a jump
      const [p] = ptrs.values();
      drag.lx = p.x; drag.ly = p.y; drag.pinch = null; drag.samples = [];
      return;
    }
    if (ptrs.size) return;
    const d = drag;
    drag = null;
    el.classList.remove('dragging');
    const [x, y] = local(e);
    if (!d.moved) {
      if (e.type === 'pointerup' && performance.now() - d.t0 < 700) click(x, y, d.touch);
      return;
    }
    const now = performance.now(), s = d.samples;
    const last = s[s.length - 1], firstS = s.find((v) => now - v[0] < 100);
    if (!d.pinched && !reducedMotion() && last && firstS && last !== firstS && now - last[0] < 60) {
      const dt = last[0] - firstS[0];
      if (dt > 0) { startInertia((last[1] - firstS[1]) / dt, (last[2] - firstS[2]) / dt); return; }
    }
    endInteraction();
  };
  el.addEventListener('pointerup', up);
  el.addEventListener('pointercancel', up);
  el.addEventListener('pointerleave', (e) => { if (!ptrs.has(e.pointerId)) clearHover(); });

  el.addEventListener('wheel', (e) => {
    e.preventDefault();
    stopMotion();
    const [x, y] = local(e);
    const dy = e.deltaMode === 1 ? e.deltaY * 16 : e.deltaMode === 2 ? e.deltaY * H : e.deltaY;
    zoomAt(Math.exp(-clamp(dy, -240, 240) * (e.ctrlKey ? 0.01 : 0.0022)), x, y);
    clearHover();
    beginInteraction();
    request(true);
    endInteraction(180);
  }, { passive: false });

  el.addEventListener('dblclick', (e) => {
    const [x, y] = local(e);
    updateProjection();
    const ll = invert(x, y);
    if (ll) flyTo({ center: ll, scale: Math.min(absScale() * 2, baseScale() * K_MAX) }, 520);
  });

  el.addEventListener('keydown', (e) => {
    if (e.target !== el || e.altKey || e.metaKey || e.ctrlKey) return;
    const step = 70;
    switch (e.key) {
      case 'ArrowLeft': panBy(step, 0); break;
      case 'ArrowRight': panBy(-step, 0); break;
      case 'ArrowUp': panBy(0, step); break;
      case 'ArrowDown': panBy(0, -step); break;
      case '+': case '=': zoomButton(1.5); e.preventDefault(); return;
      case '-': case '_': zoomButton(1 / 1.5); e.preventDefault(); return;
      case '0': resetView(); e.preventDefault(); return;
      default: return;
    }
    e.preventDefault();
    stopMotion();
    beginInteraction();
    request(true);
    endInteraction(250);
  });
}

// ===================================================================== store
function bindStore() {
  on('change', ({ keys: all }) => {
    // the year only matters to the timeline lens and to the conflicts filter; playback must not repaint every lens
    const yearMatters = state.lens === 'history' || state.yearFilter;
    const keys = all.filter((k) => (k === 'year' ? yearMatters : SCENE_KEYS.has(k) || k === 'projection' || k === 'theme'));
    if (!keys.length) return;
    if (keys.includes('projection')) { switchProjection(state.projection === 'flat' ? 'flat' : 'globe'); controls.render(); }
    if (keys.includes('theme')) { hatch = null; colors = null; }
    if (keys.includes('lang')) {
      baseC.dir = overC.dir = dir();
      el.setAttribute('aria-label', t('map.aria'));
      controls.render();
    }
    if (keys.includes('layers')) controls.render();
    if (keys.some((k) => SCENE_KEYS.has(k))) scene = null;
    if (keys.some((k) => LEGEND_KEYS.has(k))) legend.render();
    if (keys.includes('selection') || keys.includes('view')) scheduleOffset();
    if (hover) { tipHtml = ''; hover = null; hideTip(); el.classList.remove('hot'); }
    request(true);
  });

  on('flyto', (tg) => {
    if (!tg || !W) return;
    let target = null;
    if (tg.lonlat) target = { center: tg.lonlat, scale: baseScale() * (tg.k ?? 4) };
    else if (tg.iso3) target = fitTarget(tg.iso3.map((iso) => focusOf(iso)).filter(Boolean), []);
    else if (tg.kind) target = selectionTarget(tg.kind, tg.id);
    if (target) { pendingVisible = false; flyTo(target); }
  });

  on('highlight', (h) => {
    hl = h && ((h.iso3 && h.iso3.length) || h.lonlat) ? h : null;
    request(false);
  });

  // "system" theme follows the OS; palette.js drops its cache, the map repaints
  matchMedia('(prefers-color-scheme: dark)').addEventListener?.('change', () => {
    if (state.theme !== 'system') return;
    hatch = null; colors = null; scene = null;
    legend.render();
    request(true);
  });
  matchMedia('(prefers-reduced-motion: reduce)').addEventListener?.('change', () => request(false));
  document.addEventListener('visibilitychange', () => { if (!document.hidden) request(false); });
}
