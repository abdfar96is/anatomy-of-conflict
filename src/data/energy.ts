// Oil and gas pipelines, LNG terminals and oil and gas fields (Global Energy Monitor trackers): the pipeline segments
// that are operating or under construction, plus the halted ones (idle or mothballed) as an optional layer, each with a
// mapped route; the extraction tracker's producing, in-development and mothballed fields and projects. Loaded on
// demand the first time the Pipelines lens opens, like the borders.

import type { Position } from 'geojson';
import { fmtCompact, fmtNum, type Bi, type Lang } from '../i18n/format';
import { topoLines, type Topology } from './topo';

export const FUELS = ['gas', 'oil', 'ngl'] as const;
export type Fuel = (typeof FUELS)[number];
/** Active statuses (the status filter) and halted ones (their own layer): idle, or mothballed for the longer term. */
export const PIPE_STATUS = ['operating', 'construction'] as const;
export const HALTED_STATUS = ['idle', 'mothballed'] as const;
export type PipeStatus = (typeof PIPE_STATUS)[number] | (typeof HALTED_STATUS)[number];
export const isHalted = (p: { status: PipeStatus }) => p.status === 'idle' || p.status === 'mothballed';
export type RouteAccuracy = 'low' | 'medium' | 'high' | 'exact';

/** Compact properties as stored in energy/pipelines.topo.json (see public/data/README.md). */
interface RawPipe {
  id: string; n: string; sg?: string; f: Fuel; st: PipeStatus; boe?: number; bcm?: number; km?: number; c?: string;
  y?: number; z?: number; o?: string; w?: string; acc?: string; a?: string; b?: string; d?: string;
}
/** One segment (a GEM project row): a line, or one phase or branch of a larger system. */
export interface Pipeline {
  id: string;
  /** The system it belongs to (GEM PipelineName); segments of one system share it. */
  system: string;
  segment?: string;
  fuel: Fuel; status: PipeStatus;
  /** Capacity in barrels of oil equivalent a day (GEM's conversion), and in bcm a year for gas. */
  boe?: number; bcm?: number;
  km?: number; countries: string[]; year?: number;
  /** Year operations ended, for halted segments (GEM StopYear). */
  stopYear?: number;
  owner?: string; wiki?: string;
  accuracy: RouteAccuracy; from?: string; to?: string; diameter?: string;
  lines: Position[][];
}
export interface LngTerminal {
  id: string; name: string; type: 'import' | 'export'; status: (typeof PIPE_STATUS)[number]; iso3?: string; coords: [number, number];
  /** Capacity in million tonnes a year: in operation, and under construction. */
  mtpa: { operating: number; construction: number };
  units: number; year?: number; yearPlanned?: number; location?: string; owner?: string; wiki?: string; floating: boolean; approximate: boolean;
}
interface RawLng {
  id: string; n: string; t: 'import' | 'export'; st: (typeof PIPE_STATUS)[number]; iso?: string; lon: number; lat: number; op: number; con: number; units: number;
  y?: number; yc?: number; loc?: string; o?: string; w?: string; fl?: number; approx?: number;
}
/** A GEM extraction unit: an oil or gas field, or a project grouping several (Ghawar, North Field). */
export interface OilField {
  id: string; name: string; fuel: 'oil' | 'gas' | 'oilgas'; status: PipeStatus; coords: [number, number]; countries: string[];
  operator?: string; basin?: string; discovery?: number; fid?: number; start?: number; offshore?: boolean;
  approximate: boolean; unconventional: boolean;
  /** Latest production: liquids in million barrels a year, gas in million m³ a year, and both in million boe a year. */
  liquids?: number; gas?: number; boe?: number; year?: number;
  /** What it mostly produces (by boe), for its pictogram. */
  product: 'oil' | 'gas';
  reserves?: { fuel: string; cls: string; qty: number; unit: string; year?: number };
  /** The GEM.wiki page (null when GEM has none). */
  wiki: string | null;
  /** The atlas's Arabic name for a landmark field (energy/meta.json `landmarks`). */
  nameAr?: string;
  project: boolean; units: string[]; parent?: string;
}
interface RawField {
  id: string; n: string; f: 'o' | 'g' | 'og'; st: PipeStatus; lon: number; lat: number; c?: string; op?: string; b?: string;
  dy?: number; fy?: number; py?: number; sea?: number; approx?: number; unc?: number; boe?: number; lq?: number; gs?: number; y?: number;
  rs?: [string, string, number, string, number?]; w?: string; pj?: number; u?: string[]; p?: string;
}
/** Gas volumes to barrels of oil equivalent: 1 boe = 5.8 thousand cubic feet = 164.2 m³ (the SPE convention). */
export const M3_PER_BOE = 164.2;
export const FIELD_FUEL_LABEL: Record<OilField['fuel'], Bi> = {
  oil: { ar: 'نفط', en: 'Oil' }, gas: { ar: 'غاز', en: 'Gas' }, oilgas: { ar: 'نفط وغاز', en: 'Oil and gas' },
};
/** GEM's unit name split into the name and its place: "Bacalhau Oil and Gas Field (Rio Grande do Norte, Brazil)". */
export function splitFieldName(name: string): [string, string] {
  const m = name.match(/^(.*\S)\s*\(([^()]+)\)$/);
  return m ? [m[1]!, m[2]!] : [name, ''];
}
export const FIELD_STATUS_LABEL: Partial<Record<PipeStatus, Bi>> = {
  operating: { ar: 'منتج', en: 'Producing' }, construction: { ar: 'قيد التطوير', en: 'In development' }, mothballed: { ar: 'مجمّد', en: 'Mothballed' },
};

export interface EnergySource { name: string; publisher: string; release: string; file: string; url: string; license: string; licenseUrl: string; citation: string }
export interface PipeNote { pipelines: string[]; chokepoints: string[]; conflicts: string[]; ar: string; en: string; sources: { title: string; url: string }[]; verified?: string }
export interface EnergyMeta {
  sources: { ggit: EnergySource; goit: EnergySource; lng: EnergySource; goget: EnergySource };
  wiki: string; simplified: string;
  /** Arabic names of prominent systems, by GEM PipelineName. */
  names: Record<string, string>;
  notes: PipeNote[];
  /** The atlas's short names of landmark fields, by GEM unit id: map labels, and the Arabic name. */
  landmarks?: Record<string, Bi>;
}
export interface Energy {
  pipes: Pipeline[]; byId: Map<string, Pipeline>;
  /** Segments of each system, by GEM PipelineName. */
  bySystem: Map<string, Pipeline[]>;
  lng: LngTerminal[]; lngById: Map<string, LngTerminal>;
  meta: EnergyMeta;
  /** Sourced note on a system, by GEM PipelineName. */
  noteOf: Map<string, PipeNote>;
  fields: OilField[]; fieldById: Map<string, OilField>;
}

/** Build the model from the four files (pure; exported for tests). */
export function buildEnergy(topo: Topology, lngRows: RawLng[], meta: EnergyMeta, fieldRows: RawField[] = []): Energy {
  const pipes: Pipeline[] = topoLines<RawPipe>(topo, 'pipelines').map(({ properties: p, geometry: g }) => ({
    id: p.id, system: p.n, segment: p.sg, fuel: p.f, status: p.st, boe: p.boe, bcm: p.bcm, km: p.km,
    countries: p.c ? p.c.split(',') : [], year: p.y, stopYear: p.z, owner: p.o, wiki: p.w,
    accuracy: (p.acc === 'exact' || p.acc === 'high' || p.acc === 'medium' ? p.acc : 'low'), from: p.a, to: p.b, diameter: p.d,
    lines: g.type === 'LineString' ? [g.coordinates] : g.coordinates,
  }));
  const bySystem = new Map<string, Pipeline[]>();
  for (const p of pipes) { const l = bySystem.get(p.system) ?? []; l.push(p); bySystem.set(p.system, l); }
  const lng: LngTerminal[] = lngRows.map((r) => ({
    id: r.id, name: r.n, type: r.t, status: r.st, iso3: r.iso, coords: [r.lon, r.lat], mtpa: { operating: r.op, construction: r.con },
    units: r.units, year: r.y, yearPlanned: r.yc, location: r.loc, owner: r.o, wiki: r.w, floating: !!r.fl, approximate: !!r.approx,
  }));
  const noteOf = new Map<string, PipeNote>();
  for (const n of meta.notes) for (const name of n.pipelines) noteOf.set(name, n);
  const fields: OilField[] = fieldRows.map((r) => {
    const fuel = r.f === 'o' ? 'oil' : r.f === 'g' ? 'gas' : 'oilgas';
    const gasBoe = (r.gs ?? 0) / M3_PER_BOE;
    const product = r.lq || r.gs ? ((r.lq ?? 0) >= gasBoe ? 'oil' : 'gas') : fuel === 'gas' ? 'gas' : 'oil';
    return {
      id: r.id, name: r.n, fuel, status: r.st, coords: [r.lon, r.lat], countries: r.c ? r.c.split(',') : [],
      operator: r.op, basin: r.b, discovery: r.dy, fid: r.fy, start: r.py, offshore: r.sea == null ? undefined : r.sea === 1,
      approximate: !!r.approx, unconventional: !!r.unc, liquids: r.lq, gas: r.gs, boe: r.boe, year: r.y, product,
      reserves: r.rs ? { fuel: r.rs[0], cls: r.rs[1], qty: r.rs[2], unit: r.rs[3], year: r.rs[4] } : undefined,
      // GEM.wiki pages are the unit's name with underscores, stored only where they differ ('' when there is none)
      wiki: r.w === '' ? null : r.w ?? r.n.replace(/ /g, '_'),
      nameAr: meta.landmarks?.[r.id]?.ar,
      project: !!r.pj, units: r.u ?? [], parent: r.p,
    };
  });
  return {
    pipes, byId: new Map(pipes.map((p) => [p.id, p])), bySystem, lng, lngById: new Map(lng.map((t) => [t.id, t])), meta, noteOf,
    fields, fieldById: new Map(fields.map((x) => [x.id, x])),
  };
}

/** A system's name: the atlas's Arabic name where it has one, else GEM's English name. */
export const systemName = (E: Energy, system: string, lang: Lang) => (lang === 'ar' ? E.meta.names[system] ?? system : system);
export const pipeName = (E: Energy, p: Pipeline, lang: Lang) => systemName(E, p.system, lang);
export const wikiUrl = (E: Energy, page?: string) => (page ? E.meta.wiki + page : null);

/** A point on the segment for anchoring (the middle vertex of its longest part). */
export function pipeAnchor(p: Pipeline): [number, number] | null {
  const line = p.lines.reduce<Position[] | null>((a, b) => (!a || b.length > a.length ? b : a), null);
  const pt = line?.[Math.floor(line.length / 2)];
  return pt ? [pt[0]!, pt[1]!] : null;
}

/** Capacity shown for a segment: bcm a year for gas, barrels (of oil equivalent) a day for oil and NGL. */
export function capacityOf(p: Pipeline): { v: number; unit: 'bcm' | 'bpd' } | null {
  if (p.fuel === 'gas' && p.bcm) return { v: p.bcm, unit: 'bcm' };
  if (p.fuel !== 'gas' && p.boe) return { v: p.boe, unit: 'bpd' };
  return null;
}

/** "13.8 bcm a year", "1.4 million barrels a day", in the reader's language; null when GEM has no figure. */
export function fmtCapacity(p: Pipeline, lang: Lang): string | null {
  const c = capacityOf(p);
  if (!c) return null;
  const ar = lang === 'ar';
  if (c.unit === 'bcm') return ar ? `${fmtNum(c.v, lang, 1)} مليار م³ سنوياً` : `${fmtNum(c.v, lang, 1)} bcm a year`;
  const v = fmtCompact(c.v, lang);
  if (p.fuel === 'ngl') return ar ? `${v} برميل مكافئ نفط يومياً` : `${v} barrels of oil equivalent a day`;
  return ar ? `${v} برميل يومياً` : `${v} barrels a day`;
}
export const fmtMtpa = (v: number, lang: Lang) => (lang === 'ar' ? `${fmtNum(v, lang, 1)} مليون طن سنوياً` : `${fmtNum(v, lang, 1)} Mt a year`);

/** Line weight from capacity (log scale on barrels of oil equivalent a day): 0 for unknown, 1 to 4 otherwise. */
export function capacityClass(boe?: number): number {
  if (!boe) return 0;
  if (boe < 1e5) return 1;
  if (boe < 4e5) return 2;
  if (boe < 1e6) return 3;
  return 4;
}

export const FUEL_LABEL: Record<Fuel, Bi> = {
  gas: { ar: 'غاز طبيعي', en: 'Natural gas' },
  oil: { ar: 'نفط خام', en: 'Crude oil' },
  ngl: { ar: 'سوائل الغاز الطبيعي', en: 'Natural gas liquids' },
};
export const STATUS_LABEL: Record<PipeStatus, Bi> = {
  operating: { ar: 'عامل', en: 'Operating' },
  construction: { ar: 'قيد الإنشاء', en: 'Under construction' },
  idle: { ar: 'متوقف', en: 'Idle' },
  mothballed: { ar: 'مجمّد', en: 'Mothballed' },
};
export const ACCURACY_LABEL: Record<RouteAccuracy, Bi> = {
  exact: { ar: 'مسار دقيق (بالأمتار)', en: 'Exact route (within metres)' },
  high: { ar: 'مسار مرسوم بدقة', en: 'Traced route' },
  medium: { ar: 'مسار تقريبي', en: 'Approximate route' },
  low: { ar: 'خط مستقيم بين الطرفين تقريباً', en: 'Roughly a straight line between the ends' },
};

// ---- on-demand loading, shared by the map, legend and dossier

let state: Energy | null = null;
let loading: Promise<Energy> | null = null;
let failed = false;
const listeners = new Set<() => void>();
const notify = () => { for (const l of listeners) l(); };

export const getEnergy = () => state;
export const energyFailed = () => failed;
export function subscribeEnergy(fn: () => void) { listeners.add(fn); return () => { listeners.delete(fn); }; }
/** For tests: install an already-built model. */
export function setEnergy(e: Energy | null) { state = e; failed = false; notify(); }

export function loadEnergy(base = import.meta.env.BASE_URL + 'data/'): Promise<Energy> {
  if (state) return Promise.resolve(state);
  if (!loading) {
    failed = false;
    const get = <T,>(f: string) => fetch(base + 'energy/' + f).then((r) => { if (!r.ok) throw new Error(`energy/${f}: HTTP ${r.status}`); return r.json() as Promise<T>; });
    loading = Promise.all([get<Topology>('pipelines.topo.json'), get<RawLng[]>('lng.json'), get<EnergyMeta>('meta.json'), get<RawField[]>('fields.json')])
      .then(([topo, lng, meta, fields]) => { state = buildEnergy(topo, lng, meta, fields); notify(); return state; })
      .catch((err) => { loading = null; failed = true; notify(); throw err; });
  }
  return loading;
}
