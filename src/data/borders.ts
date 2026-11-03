// Historical borders (CShapes 2.0, Gleditsch–Ward version): states and dependent territories, 1886–2019.
// Loaded on demand the first time the Historical borders lens opens; the map and panels read it from here.

import { geoContains } from 'd3';
import type { Feature, MultiPolygon, Polygon } from 'geojson';
import type { Bi, Lang } from '../i18n/format';
import { topoFeatures, type Topology } from './topo';
import type { DB } from './types';

export const BORDERS_FIRST = 1886, BORDERS_LAST = 2019;
export const BORDER_STATUS = ['independent', 'colony', 'protectorate', 'mandate', 'occupied'] as const;
export type BorderStatus = (typeof BORDER_STATUS)[number] | 'N/A';

interface RawProps {
  gwcode: number; country_name: string; start: string; end: string; status: BorderStatus; owner: string;
  capname: string; caplong: number; caplat: number; b_def: number; fid: number;
}
export interface BorderMeta {
  names: Record<string, string>;
  /** Names that change with the period: gwcode → [from (inclusive), ar, en][] */
  eras: Record<string, [string, string, string][]>;
  /** Colonial powers with a fixed colour: gwcode → [ar adjective, en adjective, hex] */
  rulers: Record<string, [string, string, string]>;
  source: { name: string; url: string; license: string; licenseUrl: string; citation: string; package: string; simplified: string };
}
/** One country-period: a unit whose borders and status stayed the same from `start` to `end`. */
export interface BorderUnit {
  id: string; gw: number; nameEn: string; start: string; end: string; status: BorderStatus;
  /** gwcode of the ruling state (the unit's own code when independent). */
  ruler: number; capital: string; capLL: [number, number]; defined: boolean;
  feature: Feature<Polygon | MultiPolygon>;
}
export type ChangeKind = 'new' | 'independence' | 'annexed' | 'status' | 'transfer' | 'border' | 'end';
export interface BorderChange { kind: ChangeKind; unit: BorderUnit; prev?: BorderUnit; date: string }
export interface Borders {
  units: BorderUnit[]; byId: Map<string, BorderUnit>; meta: BorderMeta;
  /** Border and status changes by year (capital-only changes left out). */
  changes: Map<number, BorderChange[]>;
}

const dayBefore = (iso: string) => {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
};

/** Build the model from the TopoJSON and its metadata (pure; exported for tests). */
export function buildBorders(topo: Topology, meta: BorderMeta): Borders {
  const units: BorderUnit[] = topoFeatures<RawProps>(topo, 'borders').map((f) => {
    const p = f.properties;
    const status = p.status;
    return {
      id: String(p.fid), gw: p.gwcode, nameEn: p.country_name, start: p.start, end: p.end, status,
      ruler: status === 'independent' || status === 'N/A' ? p.gwcode : Number(p.owner) || p.gwcode,
      capital: p.capname, capLL: [p.caplong, p.caplat], defined: p.b_def === 1,
      feature: { type: 'Feature', properties: { id: String(p.fid) }, geometry: f.geometry },
    };
  });
  const byId = new Map(units.map((u) => [u.id, u]));
  const byGw = new Map<number, BorderUnit[]>();
  for (const u of units) { const l = byGw.get(u.gw) ?? []; l.push(u); byGw.set(u.gw, l); }
  const changes = new Map<number, BorderChange[]>();
  const add = (c: BorderChange) => {
    const y = Number(c.date.slice(0, 4));
    const l = changes.get(y) ?? []; l.push(c); changes.set(y, l);
  };
  for (const u of units) {
    if (u.start > `${BORDERS_FIRST}-01-01`) {
      const prev = byGw.get(u.gw)?.find((o) => o.end === dayBefore(u.start));
      let kind: ChangeKind | null;
      if (!prev) kind = 'new';
      else if (prev.status !== u.status) kind = u.status === 'independent' ? 'independence' : prev.status === 'independent' ? 'annexed' : 'status';
      else if (prev.ruler !== u.ruler) kind = 'transfer';
      else if (JSON.stringify(prev.feature.geometry) !== JSON.stringify(u.feature.geometry)) kind = 'border';
      else kind = null; // only the capital or another attribute changed
      if (kind) add({ kind, unit: u, prev, date: u.start });
    }
    if (u.end < `${BORDERS_LAST}-12-31` && !byGw.get(u.gw)?.some((o) => o.start > u.end)) add({ kind: 'end', unit: u, date: u.end });
  }
  for (const l of changes.values()) l.sort((a, b) => a.date.localeCompare(b.date));
  return { units, byId, meta, changes };
}

/** Units in force at the end of `year` (the map shows each year as it stood on 31 December). */
export function unitsAt(B: Borders, year: number): BorderUnit[] {
  const d = yearEnd(year);
  return B.units.filter((u) => u.start <= d && u.end >= d);
}

/** A date inside the unit's period: `at` clamped to it (the unit's start when no date is given). */
export const within = (u: BorderUnit, at?: string) => (!at || at < u.start ? u.start : at > u.end ? u.end : at);
/** The map's date for a year: 31 December, inside the data's range. */
export const yearEnd = (year: number) => `${Math.min(BORDERS_LAST, Math.max(BORDERS_FIRST, year))}-12-31`;

/** The unit's name on a date of its period (names such as Russian Empire / Soviet Union follow the date). */
export function unitName(B: Borders, u: BorderUnit, lang: Lang, at?: string): string {
  const era = B.meta.eras[String(u.gw)];
  if (era) {
    const d = within(u, at);
    const row = [...era].reverse().find(([from]) => d >= from) ?? era[0]!;
    return lang === 'ar' ? row[1] : row[2];
  }
  return lang === 'ar' ? (B.meta.names[u.nameEn] ?? u.nameEn) : u.nameEn;
}

/** The ruling power's name on a date of the unit's period. */
export function rulerName(B: Borders, u: BorderUnit, lang: Lang, at?: string): string {
  const d = within(u, at);
  const r = B.units.find((o) => o.gw === u.ruler && o.start <= d && o.end >= d) ?? B.units.find((o) => o.gw === u.ruler);
  return r ? unitName(B, r, lang, d) : String(u.ruler);
}

/** Colonial power colour for a unit (its ruler's, or its own when it is one), or null for other states. */
export function rulerColor(B: Borders, u: BorderUnit): string | null {
  return B.meta.rulers[String(u.ruler)]?.[2] ?? null;
}

const successorMemo = new WeakMap<BorderUnit, string[]>();
/** Today's states whose label point lies inside the unit (approximate, for orientation). */
export function successors(u: BorderUnit, db: DB): string[] {
  let s = successorMemo.get(u);
  if (!s) {
    s = [...db.countries.values()].filter((c) => c.lon != null && c.lat != null && geoContains(u.feature, [c.lon, c.lat])).map((c) => c.iso3);
    successorMemo.set(u, s);
  }
  return s;
}

export const statusLabel = (s: BorderStatus): Bi => STATUS_LABEL[s] ?? STATUS_LABEL['N/A'];
const STATUS_LABEL: Record<BorderStatus, Bi> = {
  independent: { ar: 'دولة مستقلة', en: 'Independent state' },
  colony: { ar: 'مستعمرة', en: 'Colony' },
  protectorate: { ar: 'محمية', en: 'Protectorate' },
  mandate: { ar: 'انتداب', en: 'Mandate' },
  occupied: { ar: 'تحت الاحتلال', en: 'Occupied' },
  'N/A': { ar: 'وضع غير مصنّف', en: 'Status not classified' },
};

// ---- on-demand loading, shared by the map, legend, scrubber and dossier

let state: Borders | null = null;
let loading: Promise<Borders> | null = null;
let failed = false;
const listeners = new Set<() => void>();
const notify = () => { for (const l of listeners) l(); };

export const getBorders = () => state;
export const bordersFailed = () => failed;
export function subscribeBorders(fn: () => void) { listeners.add(fn); return () => { listeners.delete(fn); }; }
/** For tests and the build: install an already-built model. */
export function setBorders(b: Borders | null) { state = b; failed = false; notify(); }

export function loadBorders(base = import.meta.env.BASE_URL + 'data/'): Promise<Borders> {
  if (state) return Promise.resolve(state);
  if (!loading) {
    failed = false;
    loading = Promise.all([
      fetch(base + 'history/cshapes.topo.json').then((r) => { if (!r.ok) throw new Error(`borders: HTTP ${r.status}`); return r.json() as Promise<Topology>; }),
      fetch(base + 'history/meta.json').then((r) => { if (!r.ok) throw new Error(`borders meta: HTTP ${r.status}`); return r.json() as Promise<BorderMeta>; }),
    ]).then(([topo, meta]) => { state = buildBorders(topo, meta); notify(); return state; })
      .catch((err) => { loading = null; failed = true; notify(); throw err; });
  }
  return loading;
}
