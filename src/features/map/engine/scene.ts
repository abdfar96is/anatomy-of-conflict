// Lens → scene model. buildScene() turns state + DB into what the engine draws (fills, hatches, polygons,
// arcs, markers, labels, badges); tipFor() writes the hover line for any hit. Rebuilt on state change only.

import * as d3 from 'd3';
import type { Feature, Position } from 'geojson';
import type { AtlasState } from '../../../app/store';
import { CHOKE_STATUS, NUCLEAR_CIVIL, NUCLEAR_STATUS, NUCLEAR_UNIT, SEVERITY, type LensId } from '../../../config';
import type { Bloc, Country, DB, Disputed, Kind, Plant, TimelineEvent } from '../../../data/types';
import { fmtCompact, fmtDate, fmtGdp, fmtNum, fmtPct, type Bi, type Lang } from '../../../i18n/format';
import { pick, pickKey, registerStrings, translate } from '../../../i18n/strings';
import { esc } from '../../../ui/dom';
import type { Palette } from '../../../ui/palette';
import { type LonLat } from './geo';
import { getBorders, rulerColor, rulerName, statusLabel, unitName, unitsAt, yearEnd, type BorderUnit, type Borders } from '../../../data/borders';
import {
  ACCURACY_LABEL, FUEL_LABEL, STATUS_LABEL, capacityClass, fmtCapacity, fmtMtpa, getEnergy, pipeName, type Energy, type Fuel, type LngTerminal, type Pipeline,
} from '../../../data/energy';

registerStrings({
  ar: {
    'map.tip.pop': 'السكان {v}',
    'map.tip.gdp': 'الناتج المحلي {v}',
    'map.tip.gdpPc': 'نصيب الفرد {v}',
    'map.tip.yr': '{v} ({y})',
    'map.tip.nuc.none': 'لا وضع نووياً عسكرياً مسجّلاً',
    'map.tip.nuc.warheads': 'نحو {n} رأس نووي (تقدير SIPRI، {y})',
    'map.tip.nuc.civil0': 'لا مفاعلات طاقة مسجّلة',
    'map.tip.nuc.zone0': 'خارج المناطق الخالية من السلاح النووي',
    'map.tip.plantMw': '{v} ميغاواط في الخدمة',
    'map.tip.bdRuled': '{s} · تحت حكم {r}', 'map.tip.bdPeriod': 'بهذه الحدود من {a} إلى {b}', 'map.tip.bdCap': 'العاصمة: {c}', 'map.tip.plantBuild': '{v} ميغاواط قيد الإنشاء',
    'map.tip.conflicts0': 'ليست طرفاً في أي ملف نزاع مرصود',
    'map.tip.conflicts': 'طرف في {n} من ملفات النزاع',
    'map.tip.conflict1': 'طرف في ملف نزاع واحد',
    'map.tip.since': 'منذ {y}',
    'map.tip.majority': 'الأغلبية: {name} {pct}',
    'map.tip.share': '{name}: {pct}',
    'map.tip.diversity': 'مؤشر التنوّع {v} من 1',
    'map.tip.noRel': 'لا تقدير في هذه النسخة',
    'map.tip.contested': 'تقديرات متنازع عليها',
    'map.tip.groups0': 'لا مجموعات مرصودة في هذه الطبقة',
    'map.tip.groups': 'مجموعات: {list}',
    'map.tip.disputed': 'أقاليم متنازع عليها: {n}',
    'map.tip.disputed0': 'لا أقاليم متنازع عليها مسجّلة باسمها',
    'map.tip.admin': 'تديره: {v}',
    'map.tip.blocs': 'تكتلات: {list}',
    'map.tip.blocs0': 'لا تكتلات مسجّلة',
    'map.tip.edges': '{n} علاقات مرصودة',
    'map.tip.res0': 'لا سجلّ موارد في هذه النسخة',
    'map.tip.rank': '{type} — المرتبة {n} عالمياً',
    'map.tip.resMore': 'و{n} موارد أخرى',
    'map.tip.choke0': 'لا تطلّ على مضيق مرصود',
    'map.tip.chokes': 'تطلّ على: {list}',
    'map.tip.flow': 'تدفّق النفط {v} مليون برميل يومياً ({y})',
    'map.tip.flowNa': 'لا رقم تدفّق نفطي منشور',
    'map.tip.events': '{n} أحداث بين {a} و{b}',
    'map.tip.events0': 'لا أحداث بين {a} و{b}',
    'map.tip.compareHint': 'انقر للمقارنة بين الدولتين',
    'map.tip.contestedEdge': 'تقدير مختلف عليه',
    'map.tip.profile': 'يتوفّر ملف تعريفي',
    'map.tip.inGroup': '{lang} — {family}',
    'map.tip.pp.segment': 'المقطع: {s}',
    'map.tip.pp.km': 'نحو {v} كم',
    'map.tip.pp.lng.import': 'محطة استيراد للغاز المسال', 'map.tip.pp.lng.export': 'محطة تصدير للغاز المسال',
    'map.tip.pp.lng.op': '{v} في الخدمة', 'map.tip.pp.lng.con': '{v} قيد الإنشاء',
    'map.tip.pp.note': 'يتوفّر ملف موثّق عن هذا الخط',
    'map.kind.treaty': 'موثّقة رسمياً',
    'map.kind.assessed': 'تقدير تحليلي',
    'map.sep': '، ',
  },
  en: {
    'map.tip.pop': 'Population {v}',
    'map.tip.gdp': 'GDP {v}',
    'map.tip.gdpPc': 'Per person {v}',
    'map.tip.yr': '{v} ({y})',
    'map.tip.nuc.none': 'No military nuclear status recorded',
    'map.tip.nuc.warheads': 'About {n} nuclear warheads (SIPRI estimate, {y})',
    'map.tip.nuc.civil0': 'No power reactors recorded',
    'map.tip.nuc.zone0': 'Outside the nuclear-weapon-free zones',
    'map.tip.plantMw': '{v} MWe in service',
    'map.tip.bdRuled': '{s} · ruled by {r}', 'map.tip.bdPeriod': 'With these borders from {a} to {b}', 'map.tip.bdCap': 'Capital: {c}', 'map.tip.plantBuild': '{v} MWe under construction',
    'map.tip.conflicts0': 'Not a party to any tracked conflict',
    'map.tip.conflicts': 'Party to {n} tracked conflicts',
    'map.tip.conflict1': 'Party to 1 tracked conflict',
    'map.tip.since': 'Since {y}',
    'map.tip.majority': 'Majority: {name} {pct}',
    'map.tip.share': '{name}: {pct}',
    'map.tip.diversity': 'Diversity index {v} of 1',
    'map.tip.noRel': 'No estimate in this edition',
    'map.tip.contested': 'Estimates are contested',
    'map.tip.groups0': 'No groups mapped in this layer',
    'map.tip.groups': 'Groups: {list}',
    'map.tip.disputed': 'Disputed areas: {n}',
    'map.tip.disputed0': 'No disputed areas recorded under it',
    'map.tip.admin': 'Administered by {v}',
    'map.tip.blocs': 'Blocs: {list}',
    'map.tip.blocs0': 'No recorded blocs',
    'map.tip.edges': '{n} tracked relations',
    'map.tip.res0': 'No resource record in this edition',
    'map.tip.rank': '{type} — world rank {n}',
    'map.tip.resMore': 'and {n} more',
    'map.tip.choke0': 'Borders no tracked chokepoint',
    'map.tip.chokes': 'Borders: {list}',
    'map.tip.flow': 'Oil flow {v} million barrels a day ({y})',
    'map.tip.flowNa': 'No published oil-flow figure',
    'map.tip.events': '{n} events, {a}–{b}',
    'map.tip.events0': 'No events, {a}–{b}',
    'map.tip.compareHint': 'Click to compare the two states',
    'map.tip.contestedEdge': 'Contested assessment',
    'map.tip.profile': 'Country profile available',
    'map.tip.inGroup': '{lang} — {family}',
    'map.tip.pp.segment': 'Segment: {s}',
    'map.tip.pp.km': 'About {v} km',
    'map.tip.pp.lng.import': 'LNG import terminal', 'map.tip.pp.lng.export': 'LNG export terminal',
    'map.tip.pp.lng.op': '{v} in service', 'map.tip.pp.lng.con': '{v} under construction',
    'map.tip.pp.note': 'A sourced note on this line is available',
    'map.kind.treaty': 'Formally documented',
    'map.kind.assessed': 'Analytical assessment',
    'map.sep': ', ',
  },
});

// ---- scene model
/** What a pointer can hit: a record kind, a relation edge, or an external power's arc. */
export type HitKind = Kind | 'edge' | 'power';
export interface Hit { kind: HitKind; id: string; conflict?: string }
export interface Marker { lonlat: LonLat | null; shape: string; r: number; color: string; kind: Kind; id: string; label?: string }
export interface Arc {
  from: LonLat; to: LonLat; color: string; width: number; dash: number[] | null; round?: boolean; alpha: number;
  kind: 'power' | 'edge'; id: string; conflict?: string;
}
export interface Label { lonlat: LonLat; text: string; style: string; pri: number; areaKm2: number; kind: Kind; id: string }
export interface Badge { iso3: string; type: 'intel' | 'contested' | 'cmp'; n?: number }
export interface Outline { iso3: string[]; color: string; width: number; dash?: number[]; sel?: boolean }
export interface Poly {
  feature: Feature; fill?: string | null; fillAlpha?: number; stroke?: string; width?: number; strokeAlpha?: number;
  dash?: number[]; hatch?: boolean; hatchAlpha?: number; kind?: Kind; id?: string;
}
/** Lines stroked in one style (pipelines). `casing` draws a wider halo under them; items are hit-tested by kind/id. */
export interface LineItem { kind: Kind; id: string; lines: Position[][] }
export interface LineSet { items: LineItem[]; color: string; width: number; dash?: number[]; alpha: number; casing?: string }
export interface Scene {
  fill: Map<string, string>; hatch: Set<string>; hatchAlpha: number; emph: Set<string> | null;
  outlines: Outline[]; polys: Poly[]; under: Poly[]; selPolys: Poly[]; arcs: Arc[]; markers: Marker[]; labels: Label[]; badges: Badge[];
  /** Base-layer lines, thinnest first, and the selection's lines drawn over everything. */
  lines: LineSet[]; selLines: LineSet[];
  selRing: { lonlat: LonLat; kind: Kind; id: string } | null; pulse: boolean;
  /** Today's country names would mislead on a historical map: the borders lens turns them off. */
  hideCountryLabels?: boolean;
}

export function emptyScene(): Scene {
  return { fill: new Map(), hatch: new Set(), hatchAlpha: 0.5, emph: null, outlines: [], polys: [], under: [], selPolys: [], arcs: [], markers: [], labels: [], badges: [], lines: [], selLines: [], selRing: null, pulse: false };
}

// ---- fixed lens vocabularies (slots are per entity, never by rank)
export const SEV_SHAPE: Record<string, string> = Object.fromEntries(SEVERITY.map((s) => [s.id, s.shape]));

export const CONTINENTS = [
  { id: 'Asia', ar: 'آسيا', en: 'Asia', slot: 1 },
  { id: 'Africa', ar: 'أفريقيا', en: 'Africa', slot: 2 },
  { id: 'Europe', ar: 'أوروبا', en: 'Europe', slot: 7 },
  { id: 'North America', ar: 'أمريكا الشمالية', en: 'North America', slot: 3 },
  { id: 'South America', ar: 'أمريكا الجنوبية', en: 'South America', slot: 8 },
  { id: 'Oceania', ar: 'أوقيانوسيا', en: 'Oceania', slot: 6 },
];
const CONTINENT_SLOT: Record<string, number> = Object.fromEntries(CONTINENTS.map((c) => [c.id, c.slot]));

export const INCOME = [
  { n: 1, ar: 'دخل مرتفع (دول OECD)', en: 'High income (OECD)', t: 1 },
  { n: 2, ar: 'دخل مرتفع (خارج OECD)', en: 'High income (non-OECD)', t: 0.78 },
  { n: 3, ar: 'دخل متوسط أعلى', en: 'Upper middle income', t: 0.56 },
  { n: 4, ar: 'دخل متوسط أدنى', en: 'Lower middle income', t: 0.34 },
  { n: 5, ar: 'دخل منخفض', en: 'Low income', t: 0.14 },
];

// Log ranges for the two continuous overview ramps (domain ends shown in the legend).
export const POP_RANGE: [number, number] = [1e5, 1.5e9];
export const GDP_RANGE: [number, number] = [500, 1e5];
export const DIVERSITY_MAX = 0.8;
export const logT = (v: number, [a, b]: [number, number]) => Math.max(0, Math.min(1, (Math.log10(v) - Math.log10(a)) / (Math.log10(b) - Math.log10(a))));

// Ethnic language families → eight broad classes on categorical slots.
export const ETHNIC_CLASSES = [
  { id: 'afroasiatic',  ar: 'الأفريقية الآسيوية', en: 'Afroasiatic',        slot: 3, members: ['semitic', 'cushitic', 'berber', 'chadic'] },
  { id: 'indoeuropean', ar: 'الهندية الأوروبية',  en: 'Indo-European',      slot: 1, members: ['iranian', 'indo-european', 'slavic', 'indo-aryan', 'romance', 'celtic'] },
  { id: 'turkic',       ar: 'التركية والمغولية',  en: 'Turkic & Mongolic',  slot: 2, members: ['turkic', 'mongolic'] },
  { id: 'caucasian',    ar: 'القوقازية',          en: 'Caucasian',          slot: 5, members: ['kartvelian', 'caucasian'] },
  { id: 'sino',         ar: 'الصينية التبتية',     en: 'Sino-Tibetan',       slot: 8, members: ['sino-tibetan'] },
  { id: 'nigercongo',   ar: 'النيجرية الكونغولية', en: 'Niger-Congo',        slot: 7, members: ['bantu', 'niger-congo'] },
  { id: 'dravidian',    ar: 'الدرافيدية',         en: 'Dravidian',          slot: 6, members: ['dravidian'] },
  { id: 'isolate',      ar: 'لغة معزولة',         en: 'Language isolate',   slot: 4, members: ['isolate'] },
];
export const ETHNIC_CLASS_OF: Record<string, string> = Object.fromEntries(ETHNIC_CLASSES.flatMap((c) => c.members.map((m) => [m, c.id])));
const ETHNIC_SLOT: Record<string, number> = Object.fromEntries(ETHNIC_CLASSES.map((c) => [c.id, c.slot]));
export const ethnicClass = (family: string) => ETHNIC_CLASS_OF[family] || 'isolate';
export const ethnicVisible = (family: string, f: string | null) => !f || f === family || f === ethnicClass(family);

// Resource class → marker shape (the secondary encoding beside color).
export const RES_SHAPE: Record<string, string> = { energy: 'disc', critical: 'diamond', precious: 'triangle', food: 'square', tech: 'hex' };

export const TINY_DISPUTED_KM2 = 2500;
const EARTH_R = 6371;

// ---- helpers
const mix = (a: string, b: string, k: number) => d3.interpolateLab(a, b)(k);
/** Categorical land fills sit a step back from full strength so borders and names stay legible. */
export const landTint = (P: Palette, color: string) => mix(P.land, color, 0.8);
/** Sequential land fill: the --seq ramp without its two extremes (keeps names legible on the darkest and lightest steps). */
export const seqFill = (P: Palette, v: number) => P.seq(0.06 + 0.68 * Math.max(0, Math.min(1, v)));
export const BLOC_T = 0.6, CHOKE_T = 0.42;
// Nuclear lens: military status → status colour at the status's strength; zones → categorical slots.
export const NUCLEAR_ZONE_SLOT: Record<string, number> = { tlatelolco: 1, pelindaba: 2, bangkok: 3, rarotonga: 4, 'central-asia': 7 };
export function nuclearFill(P: Palette, id: keyof typeof NUCLEAR_STATUS): string {
  const s = NUCLEAR_STATUS[id];
  const base = s.tone === 'accent' ? (P.cat[7] ?? P.accent2) : P.status[s.tone];
  return mix(P.land, base, s.strength);
}
export const nuclearCivilFill = (P: Palette, id: keyof typeof NUCLEAR_CIVIL) => (id === 'phased-out' ? P.landMuted : seqFill(P, NUCLEAR_CIVIL[id].t));
/** Plant markers: shape by status (NUCLEAR_UNIT), size by the capacity in service (or under construction). */
export const plantColor = (P: Palette, status: keyof typeof NUCLEAR_UNIT) =>
  status === 'operating' ? P.status.good : status === 'suspended' ? P.status.warn : status === 'building' ? P.accent2 : P.fg3;
export const plantRadius = (mw: number) => 3 + Math.sqrt(Math.max(0, mw)) / 9;

// ---- pipelines: hue by fuel, weight by capacity, dashes for lines under construction
const FUEL_SLOT: Record<Fuel, number> = { gas: 1, oil: 4, ngl: 7 };
export const pipeColor = (P: Palette, fuel: Fuel) => P.cat[FUEL_SLOT[fuel]]!;
export const fuelVar = (fuel: Fuel) => `var(--cat-${FUEL_SLOT[fuel]})`;
/** Stroke width by capacity class (0 = no published capacity). */
export const PIPE_W = [0.6, 0.9, 1.4, 2.1, 3];
export const PIPE_DASH = [5, 3];
export const lngColor = (P: Palette) => P.cat[3]!;
export const lngShape = (t: LngTerminal) => (t.status === 'construction' ? 'dashed' : t.type === 'export' ? 'triangle' : 'square');
export const lngRadius = (t: LngTerminal) => Math.min(7, 2.6 + Math.sqrt(t.mtpa.operating || t.mtpa.construction) * 0.65);

/** Segments the pipelines lens shows under the current filters. */
export function visiblePipes(E: Energy, S: Pick<AtlasState, 'filters'>): Pipeline[] {
  const f = S.filters;
  return E.pipes.filter((p) => f.pipeFuels.has(p.fuel) && (f.pipeStatus === 'all' || p.status === f.pipeStatus) && (!f.pipeStrategic || E.noteOf.has(p.system)));
}
export function visibleLng(E: Energy, S: Pick<AtlasState, 'filters'>): LngTerminal[] {
  const f = S.filters;
  return f.pipeLng && f.pipeFuels.has('gas') ? E.lng.filter((t) => f.pipeStatus === 'all' || t.status === f.pipeStatus) : [];
}
const mwShown = (p: Plant) => p.mw.operating + p.mw.suspended || p.mw.building;
/** Historical borders: a colonial power's colour, stronger for its home territory than for its dependencies. */
const BORDER_STRENGTH: Record<string, number> = { independent: 0.78, colony: 0.55, occupied: 0.55, protectorate: 0.4, mandate: 0.4, 'N/A': 0.3 };
export function borderFill(P: Palette, B: Borders, u: BorderUnit): string {
  const c = rulerColor(B, u);
  if (c) return mix(P.land, c, BORDER_STRENGTH[u.status] ?? 0.4);
  // other states: neutral; their few dependencies a little darker
  return u.status === 'independent' ? mix(P.land, P.fg3, 0.12) : mix(P.land, P.fg3, 0.32);
}
const unitGeo = new WeakMap<BorderUnit, { c: LonLat; km2: number }>();
const geoOfUnit = (u: BorderUnit) => {
  let g = unitGeo.get(u);
  if (!g) { g = { c: d3.geoCentroid(u.feature) as LonLat, km2: d3.geoArea(u.feature) * EARTH_R * EARTH_R }; unitGeo.set(u, g); }
  return g;
};
export const nuclearZoneFill = (P: Palette, id: string) => mix(P.land, P.cat[NUCLEAR_ZONE_SLOT[id] ?? 0] ?? P.land, 0.55);
const areaMemo = new WeakMap<Disputed, number>();
const anchorMemo = new WeakMap<TimelineEvent, LonLat | null>();
const cats = (e: TimelineEvent): string[] => [e.cat ?? []].flat().filter((c): c is string => typeof c === 'string');

// Fields the data files carry beyond the typed model (read with narrowing).
const num = (v: unknown): number | undefined => (typeof v === 'number' ? v : undefined);
const lonlat = (v: unknown): LonLat | null => (Array.isArray(v) && typeof v[0] === 'number' && typeof v[1] === 'number' ? [v[0], v[1]] : null);
const llOf = (c: { lon?: number; lat?: number } | undefined): LonLat | null => (c && c.lon != null && c.lat != null ? [c.lon, c.lat] : null);
/** {ar, en} of a record whose type does not declare them (edge types, edges). */
export const bi = (o: unknown): Partial<Bi> | null => {
  if (!o || typeof o !== 'object') return null;
  const { ar, en } = o as Record<string, unknown>;
  return { ar: typeof ar === 'string' ? ar : undefined, en: typeof en === 'string' ? en : undefined };
};
const CHOKE_TONE: Record<string, string> = Object.fromEntries(Object.entries(CHOKE_STATUS).map(([k, v]) => [k, v.tone]));
const chokeStatus = (status: unknown) => (CHOKE_STATUS as Record<string, (typeof CHOKE_STATUS)['stable'] | undefined>)[String(status)];
const toneOf = (status: unknown): keyof Palette['status'] => {
  const tone = CHOKE_TONE[String(status)];
  return tone === 'good' || tone === 'critical' ? tone : 'warn';
};

/** Strings and formatters for one language (legacy read the language from the live state). */
function words(lang: Lang) {
  return {
    t: (key: string, vars?: Record<string, string | number>) => translate(lang, key, vars),
    L: (obj: Partial<Bi> | string | null | undefined) => pick(lang, obj),
    Lk: (obj: object | null | undefined, base: string) => pickKey(lang, obj, base),
    fmtNum: (n: number | null | undefined, digits?: number) => fmtNum(n, lang, digits),
    fmtPct: (n: number | null | undefined, digits?: number) => fmtPct(n, lang, digits),
    fmtCompact: (n: number | null | undefined) => fmtCompact(n, lang),
    fmtGdp: (n: number | null | undefined) => fmtGdp(n, lang),
    fmtDate: (s: string | null | undefined) => fmtDate(s, lang),
  };
}

export function disputedArea(d: Disputed): number {
  let a = areaMemo.get(d);
  if (a == null) areaMemo.set(d, (a = d3.geoArea(d.feature) * EARTH_R * EARTH_R));
  return a;
}

/**
 * Pin position of a timeline event: the place it happened (`coords`), else its primary (first) country's label point.
 * Never the mean of all its countries: for widely spread parties that lands in a bystander state or the sea
 * (7 October with Israel, Palestine, Lebanon, Iran and Yemen fell in the middle of Saudi Arabia).
 */
export function eventAnchor(DB: DB, e: TimelineEvent): LonLat | null {
  if (anchorMemo.has(e)) return anchorMemo.get(e) ?? null;
  const a = e.coords ?? (e.countries || []).map((iso) => llOf(DB.countries.get(iso))).find((p): p is LonLat => !!p) ?? null;
  anchorMemo.set(e, a);
  return a;
}

export function visibleConflicts(DB: DB, S: Pick<AtlasState, 'filters' | 'yearFilter' | 'year'>) {
  return DB.conflicts.filter((c) => S.filters.severity.has(c.severity) && !(S.yearFilter && c.startYear && c.startYear > S.year));
}

export function decadeWindow(S: Pick<AtlasState, 'year'>): [number, number] { return [S.year - 9, S.year]; }

export function windowEvents(DB: DB, S: Pick<AtlasState, 'filters' | 'year'>) {
  const [a, b] = decadeWindow(S);
  const set = S.filters.timelineCats;
  return DB.timeline.events.filter((e) => e.year >= a && e.year <= b && (!set || cats(e).some((c) => set.has(c))));
}

export function filteredEdges(DB: DB, S: Pick<AtlasState, 'filters'>) {
  return DB.relations.edges.filter((e) => S.filters.relTypes.has(e.type) && S.filters.relKinds.has(e.kind));
}

export const activeBloc = (S: Pick<AtlasState, 'selection' | 'filters'>) => (S.selection?.kind === 'bloc' ? S.selection.id : S.filters.bloc);

// ---- lens builders: each fills the scene for its lens
type Builder = (sc: Scene, DB: DB, S: AtlasState, P: Palette) => void;
const BUILD: Record<LensId, Builder> = {
  overview(sc, DB, S, P) {
    const mode = S.filters.overviewMode;
    for (const c of DB.countries.values()) {
      let col: string | null = null;
      if (mode === 'continent') { const slot = CONTINENT_SLOT[c.continent ?? '']; if (slot) col = mix(P.land, P.cat[slot]!, 0.3); }
      else if (mode === 'income') { const s = INCOME[parseInt(c.income ?? '', 10) - 1]; col = s ? seqFill(P, s.t) : P.landMuted; }
      else if (mode === 'population') col = c.pop && c.pop > 0 ? seqFill(P, logT(c.pop, POP_RANGE)) : P.landMuted;
      else if (mode === 'gdp') col = c.gdpPerCap && c.gdpPerCap > 0 ? seqFill(P, logT(c.gdpPerCap, GDP_RANGE)) : P.landMuted;
      if (col) sc.fill.set(c.iso3, col);
      if (c.intel) sc.badges.push({ iso3: c.iso3, type: 'intel' });
    }
  },

  conflicts(sc, DB, S, P) {
    const vis = visibleConflicts(DB, S);
    const count = new Map<string, number>();
    for (const c of vis) for (const iso of c.countries || []) count.set(iso, (count.get(iso) || 0) + 1);
    const max = Math.max(1, ...count.values());
    for (const [iso, n] of count) sc.fill.set(iso, seqFill(P, max === 1 ? 0.5 : 0.25 + 0.75 * (n - 1) / (max - 1)));
    const sel = S.selection?.kind === 'conflict' ? DB.conflictById.get(S.selection.id) : undefined;
    const list = sel && !vis.includes(sel) ? [...vis, sel] : vis;
    for (const c of [...list].sort((a, b) => a.rank - b.rank)) {
      sc.markers.push({ lonlat: lonlat(c.coords), shape: SEV_SHAPE[c.severity] ?? 'disc', r: 5.5, color: P.sev[c.severity] ?? '', kind: 'conflict', id: c.id });
    }
    if (sel) {
      const col = P.sev[sel.severity] ?? '';
      const to = lonlat(sel.coords);
      for (const iso of sel.countries || []) sc.fill.set(iso, mix(P.land, col, 0.5));
      for (const e of sel.externalPowers || []) {
        const pc = DB.countries.get(e.iso3);
        if (!pc) continue;
        if (!(sel.countries || []).includes(e.iso3)) sc.outlines.push({ iso3: [e.iso3], color: col, width: 1.5, dash: [4, 3] });
        const from = llOf(pc);
        if (from && to) sc.arcs.push({ from, to, color: col, width: 1.4, dash: e.kind === 'assessed' ? [5, 4] : null, alpha: 0.95, kind: 'power', id: e.iso3, conflict: sel.id });
      }
    }
    sc.pulse = list.some((c) => SEV_SHAPE[c.severity] === 'pulse');
  },

  religion(sc, DB, S, P) {
    const mode = S.filters.religionMode, trad = S.filters.religionTradition;
    for (const c of DB.countries.values()) {
      const r = c.religion;
      if (!r) {
        if (c.iso3 !== 'ATA') { sc.fill.set(c.iso3, P.landMuted); sc.hatch.add(c.iso3); }
        continue;
      }
      let col;
      if (mode === 'share') col = seqFill(P, (r.groups[trad] || 0) / 100);
      else if (mode === 'diversity') col = seqFill(P, r.diversity / DIVERSITY_MAX);
      else col = landTint(P, P.tradition[r.majority ?? ''] || P.cat[0]!);
      sc.fill.set(c.iso3, col);
      if (r.contested) sc.badges.push({ iso3: c.iso3, type: 'contested' });
    }
    sc.hatchAlpha = 0.42;
  },

  ethnic(sc, DB, S, P) {
    const { Lk } = words(S.lang);
    const f = S.filters.ethnicFamily;
    const feats = DB.ethnic.features.filter((x) => ethnicVisible(x.properties.family, f));
    // larger extents first so smaller groups sit on top (and win the hit test)
    feats.sort((a, b) => d3.geoArea(b) - d3.geoArea(a));
    for (const x of feats) {
      const col = P.cat[ETHNIC_SLOT[ethnicClass(x.properties.family)] ?? 0] ?? '';
      sc.polys.push({ feature: x, fill: col, fillAlpha: 0.18, stroke: col, width: 1.5, strokeAlpha: 0.9, kind: 'group', id: x.properties.groupId });
    }
    const shown = new Set(feats.map((x) => x.properties.groupId));
    for (const g of DB.ethnic.groups.values()) {
      if (!shown.has(g.id)) continue;
      const area = g.features.reduce((s, x) => s + d3.geoArea(x), 0);
      sc.labels.push({ lonlat: [g.lon, g.lat], text: Lk(g, 'name'), style: 'group', pri: area, areaKm2: area * EARTH_R * EARTH_R, kind: 'group', id: g.id });
    }
  },

  disputed(sc, DB, _S, P) {
    for (const c of DB.countries.values()) sc.fill.set(c.iso3, P.landMuted);
    for (const d of DB.disputed) {
      sc.polys.push({ feature: d.feature, hatch: true, hatchAlpha: 1, stroke: P.hatch, width: 0.8, kind: 'disputed', id: d.id });
      const at = llOf(d);
      if (disputedArea(d) < TINY_DISPUTED_KM2 && at) {
        sc.markers.push({ lonlat: at, shape: 'hatchdot', r: 4.5, color: P.hatch, kind: 'disputed', id: d.id });
      }
    }
  },

  powers(sc, DB, S, P) {
    const bid = activeBloc(S);
    const b = bid ? DB.relations.blocById.get(bid) : undefined;
    if (b) for (const iso of b.members) sc.fill.set(iso, seqFill(P, BLOC_T));
    const selC = S.selection?.kind === 'country' ? S.selection.id : null;
    let edges = filteredEdges(DB, S);
    const mine = selC ? edges.filter((e) => e.a === selC || e.b === selC) : [];
    if (mine.length) edges = mine;
    for (const e of edges) {
      const A = llOf(DB.countries.get(e.a)), B = llOf(DB.countries.get(e.b));
      if (!A || !B) continue;
      sc.arcs.push({
        from: A, to: B, color: P.edge[e.type] ?? '', width: 0.8 + ((num(e.weight) ?? 1) - 1) * 0.55,
        dash: e.contested ? [1.2, 3.4] : e.kind === 'assessed' ? [6, 4] : null, round: !!e.contested,
        alpha: mine.length ? 1 : 0.42, kind: 'edge', id: e.id,
      });
    }
  },

  nuclear(sc, DB, S, P) {
    const mode = S.filters.nuclearMode;
    for (const c of DB.countries.values()) {
      const n = c.nuclear;
      if (mode === 'military' && n.weapons) {
        sc.fill.set(c.iso3, nuclearFill(P, n.weapons));
        if ('unconfirmed' in NUCLEAR_STATUS[n.weapons]) sc.hatch.add(c.iso3);
      } else if (mode === 'civil' && n.civil) {
        sc.fill.set(c.iso3, nuclearCivilFill(P, n.civil));
        if (n.civil === 'phased-out') sc.hatch.add(c.iso3);
      } else if (mode === 'zones' && n.zones[0]) {
        sc.fill.set(c.iso3, nuclearZoneFill(P, n.zones[0]));
      }
    }
    sc.hatchAlpha = 0.5;
    // plants: every plant in civil mode (largest first, so small ones sit on top); elsewhere only a selected one
    const selPlant = S.selection?.kind === 'plant' ? S.selection.id : null;
    const shown = mode === 'civil' ? DB.nuclear.plants : DB.nuclear.plants.filter((p) => p.id === selPlant);
    for (const p of [...shown].sort((a, b) => mwShown(b) - mwShown(a))) {
      sc.markers.push({ lonlat: p.coords, shape: NUCLEAR_UNIT[p.status].shape, r: plantRadius(mwShown(p)), color: plantColor(P, p.status), kind: 'plant', id: p.id });
    }
  },

  borders(sc, DB, S, P) {
    for (const c of DB.countries.values()) sc.fill.set(c.iso3, P.landMuted);
    const B = getBorders();
    if (!B) return;
    sc.hideCountryLabels = true;
    const { lang } = S, at = yearEnd(S.filters.bordersYear);
    for (const u of unitsAt(B, S.filters.bordersYear)) {
      sc.polys.push({
        feature: u.feature, fill: borderFill(P, B, u), fillAlpha: 0.9, stroke: P.fg2, width: 0.7, strokeAlpha: 0.55,
        dash: u.status === 'occupied' || !u.defined ? [3, 2] : undefined, kind: 'border', id: u.id,
      });
      const g = geoOfUnit(u);
      sc.labels.push({ lonlat: g.c, text: unitName(B, u, lang, at), style: 'group', pri: g.km2, areaKm2: g.km2, kind: 'border', id: u.id });
    }
    const sel = S.selection?.kind === 'border' ? B.byId.get(S.selection.id) : undefined;
    if (sel) sc.selPolys.push({ feature: sel.feature, stroke: P.sel, width: 2.2 });
  },

  pipelines(sc, DB, S, P) {
    for (const c of DB.countries.values()) sc.fill.set(c.iso3, P.landMuted);
    const E = getEnergy();
    if (!E) return;
    const groups = new Map<string, LineSet>();
    for (const p of visiblePipes(E, S)) {
      const cls = capacityClass(p.boe), strategic = E.noteOf.has(p.system);
      const key = `${p.fuel}|${p.status}|${cls}|${strategic ? 1 : 0}`;
      let g = groups.get(key);
      if (!g) {
        g = { items: [], color: pipeColor(P, p.fuel), width: PIPE_W[cls]!, dash: p.status === 'construction' ? PIPE_DASH : undefined, alpha: cls ? 0.95 : 0.7, casing: strategic ? P.halo : undefined };
        groups.set(key, g);
      }
      g.items.push({ kind: 'pipeline', id: p.id, lines: p.lines });
    }
    // thin lines first so trunk lines sit on top; the sourced strategic lines last of their weight
    sc.lines = [...groups.values()].sort((a, b) => a.width - b.width || Number(!!a.casing) - Number(!!b.casing));
    const sel = S.selection?.kind === 'pipeline' ? E.byId.get(S.selection.id) : undefined;
    if (sel) {
      const sys = E.bySystem.get(sel.system) ?? [sel];
      sc.selLines.push({ items: sys.map((p) => ({ kind: 'pipeline', id: p.id, lines: p.lines })), color: P.sel, width: 2.4, alpha: 0.75, casing: P.halo });
      sc.selLines.push({ items: [{ kind: 'pipeline', id: sel.id, lines: sel.lines }], color: P.sel, width: Math.max(3, PIPE_W[capacityClass(sel.boe)]! + 1.6), alpha: 1, casing: P.halo });
    }
    const lng = visibleLng(E, S);
    const selLng = S.selection?.kind === 'lng' ? E.lngById.get(S.selection.id) : undefined;
    if (selLng && !lng.includes(selLng)) lng.push(selLng);
    for (const t of [...lng].sort((a, b) => lngRadius(b) - lngRadius(a))) {
      sc.markers.push({ lonlat: t.coords, shape: lngShape(t), r: lngRadius(t), color: lngColor(P), kind: 'lng', id: t.id });
    }
  },

  resources(sc, DB, S, P) {
    const cls = S.filters.resourceClass;
    const best = new Map<string, number>();
    for (const e of DB.resources.entries) {
      if (cls && DB.resources.classOf[e.type] !== cls) continue;
      const rank = num(e.rank);
      const v = rank ? Math.max(0.3, 1 - (rank - 1) * 0.08) : 0.3;
      best.set(e.iso3, Math.max(best.get(e.iso3) || 0, v));
    }
    for (const [iso, v] of best) sc.fill.set(iso, seqFill(P, v));
    for (const s of DB.resources.sites) {
      const k = DB.resources.classOf[s.type] ?? '';
      if (cls && k !== cls) continue;
      sc.markers.push({ lonlat: s.coords ?? null, shape: RES_SHAPE[k] || 'disc', r: 5, color: P.resClass[k] || P.cat[0]!, kind: 'site', id: s.id });
    }
  },

  chokepoints(sc, DB, S, P) {
    const { L } = words(S.lang);
    for (const p of DB.chokepoints) for (const iso of p.borderStates || []) sc.fill.set(iso, seqFill(P, CHOKE_T));
    for (const p of [...DB.chokepoints].sort((a, b) => (num(b.oilFlowMbd) || 0) - (num(a.oilFlowMbd) || 0))) {
      const flow = num(p.oilFlowMbd);
      sc.markers.push({
        lonlat: p.coords ?? null, shape: 'choke', r: flow ? 3.5 + 2.6 * Math.sqrt(flow) : 4.5,
        color: P.status[toneOf(p.status)], kind: 'choke', id: p.id, label: L(p),
      });
    }
  },

  history(sc, DB, S, P) {
    const evs = windowEvents(DB, S);
    const count = new Map<string, number>();
    for (const e of evs) for (const iso of e.countries || []) count.set(iso, (count.get(iso) || 0) + 1);
    const max = Math.max(1, ...count.values());
    for (const [iso, n] of count) sc.fill.set(iso, seqFill(P, max === 1 ? 0.5 : 0.25 + 0.75 * (n - 1) / (max - 1)));
    const sel = S.selection?.kind === 'event' ? DB.eventById.get(S.selection.id) : undefined;
    const list = sel && !evs.includes(sel) ? [...evs, sel] : evs;
    for (const e of list) {
      const a = eventAnchor(DB, e);
      if (a) sc.markers.push({ lonlat: a, shape: 'pin', r: 4.5, color: P.fg2, kind: 'event', id: e.id });
    }
  },
};

/** Selection, compare and overlay emphasis that applies in every lens. */
function emphasis(sc: Scene, DB: DB, S: AtlasState, P: Palette) {
  const sel = S.selection;
  if (sel && DB.exists(sel.kind, sel.id)) {
    const isos = DB.countriesOf(sel.kind, sel.id).filter((iso) => DB.countries.has(iso));
    if (isos.length) sc.emph = new Set(isos);
    if (sel.kind === 'country') sc.outlines.push({ iso3: [sel.id], color: P.sel, width: 2, sel: true });
    else if (isos.length) sc.outlines.push({ iso3: isos, color: P.sel, width: 1.25, sel: true });
    if (sel.kind === 'group') {
      for (const f of DB.ethnic.groups.get(sel.id)?.features ?? []) sc.selPolys.push({ feature: f, stroke: P.sel, width: 2, fill: S.lens === 'ethnic' ? null : P.sel, fillAlpha: 0.12 });
    }
    if (sel.kind === 'disputed') { const d = DB.disputedById.get(sel.id); if (d) sc.selPolys.push({ feature: d.feature, stroke: P.sel, width: 2 }); }
    let anchor: LonLat | null = null;
    if (sel.kind === 'event') { const e = DB.eventById.get(sel.id); anchor = e ? eventAnchor(DB, e) : null; }
    else if (['conflict', 'choke', 'site', 'disputed', 'plant', 'border', 'lng'].includes(sel.kind)) anchor = DB.anchorOf(sel.kind, sel.id);
    if (anchor) sc.selRing = { lonlat: anchor, kind: sel.kind, id: sel.id };
  }
  if (S.view === 'compare') {
    const [a, b] = S.compare;
    if (a && DB.countries.has(a)) { sc.outlines.push({ iso3: [a], color: P.sel, width: 2 }); sc.badges.push({ iso3: a, type: 'cmp', n: 1 }); }
    if (b && DB.countries.has(b)) { sc.outlines.push({ iso3: [b], color: P.sel, width: 2, dash: [5, 3] }); sc.badges.push({ iso3: b, type: 'cmp', n: 2 }); }
  }
  // the disputed overlay layer: quiet hatching in every other lens (not interactive there)
  if (S.layers.disputed && S.lens !== 'disputed') {
    for (const d of DB.disputed) sc.under.push({ feature: d.feature, hatch: true, hatchAlpha: 0.5 });
  }
}

export function buildScene(DB: DB, S: AtlasState, P: Palette): Scene {
  const sc = emptyScene();
  (BUILD[S.lens] ?? BUILD.overview)(sc, DB, S, P);
  emphasis(sc, DB, S, P);
  return sc;
}

// ---- hover text
const tip = (title: string, ...lines: (string | null | undefined)[]) =>
  `<b>${esc(title)}</b>${lines.filter(Boolean).map((l) => `<span class="tip-sub">${esc(l)}</span>`).join('')}`;
const nameOf = (DB: DB, iso: string, lang: Lang) => { const c = DB.countries.get(iso); return c ? pickKey(lang, c, 'name') : iso; };

function countryLine(c: Country, DB: DB, S: AtlasState): string[] {
  const { t, L, Lk, fmtNum, fmtPct, fmtCompact, fmtGdp } = words(S.lang);
  const list3 = (arr: string[]) => (arr.length > 3 ? `${arr.slice(0, 3).join(t('map.sep'))} …` : arr.join(t('map.sep')));
  const f = S.filters;
  switch (S.lens) {
    case 'overview': {
      // each figure carries its year; the legend note names the sources
      const yr = (v: string, y?: number) => (y && v !== '—' ? t('map.tip.yr', { v, y }) : v);
      const base = [t('map.tip.pop', { v: yr(fmtCompact(c.pop), c.popYear) }), t('map.tip.gdp', { v: yr(fmtGdp(c.gdp), c.gdpYear) })].join(' · ');
      const extra = f.overviewMode === 'continent' ? L(CONTINENTS.find((x) => x.id === c.continent))
        : f.overviewMode === 'income' ? L(INCOME[parseInt(c.income ?? '', 10) - 1])
          : f.overviewMode === 'gdp' && c.gdpPerCap ? t('map.tip.gdpPc', { v: yr(fmtGdp(c.gdpPerCap / 1e6), c.stats.gdpPc?.y) }) : '';
      return [base, extra, c.intel ? t('map.tip.profile') : ''];
    }
    case 'conflicts': {
      const vis = new Set(visibleConflicts(DB, S).map((x) => x.id));
      const mine = c.conflicts.filter((id) => vis.has(id));
      if (!mine.length) return [t('map.tip.conflicts0')];
      return [mine.length === 1 ? t('map.tip.conflict1') : t('map.tip.conflicts', { n: fmtNum(mine.length) }), list3(mine.map((id) => L(DB.conflictById.get(id)?.name)))];
    }
    case 'religion': {
      const r = c.religion;
      if (!r) return [t('map.tip.noRel')];
      const tr = (id: string | null) => L(id ? DB.religion.traditionById.get(id) : undefined) || (id ?? '');
      const line = f.religionMode === 'share' ? t('map.tip.share', { name: tr(f.religionTradition), pct: fmtPct(r.groups[f.religionTradition] || 0) })
        : f.religionMode === 'diversity' ? t('map.tip.diversity', { v: fmtNum(r.diversity, 2) })
          : t('map.tip.majority', { name: tr(r.majority), pct: fmtPct(r.majorityShare) });
      return [line, r.contested ? t('map.tip.contested') : ''];
    }
    case 'ethnic':
      return [c.groups.length ? t('map.tip.groups', { list: list3(c.groups.map((id) => Lk(DB.ethnic.groups.get(id), 'name'))) }) : t('map.tip.groups0')];
    case 'disputed':
      return [c.disputed.length ? t('map.tip.disputed', { n: fmtNum(c.disputed.length) }) : t('map.tip.disputed0')];
    case 'powers': {
      const bl = c.blocs.map((id) => DB.relations.blocById.get(id)).filter((b): b is Bloc => !!b).map((b) => L(b));
      return [bl.length ? t('map.tip.blocs', { list: list3(bl) }) : t('map.tip.blocs0'), c.edges.length ? t('map.tip.edges', { n: fmtNum(c.edges.length) }) : ''];
    }
    case 'resources': {
      const cls = f.resourceClass;
      const rows = c.resources.filter((e) => !cls || DB.resources.classOf[e.type] === cls).sort((a, b) => (num(a.rank) || 99) - (num(b.rank) || 99));
      const top = rows[0];
      if (!top) return [t('map.tip.res0')];
      const ty = L(DB.resources.typeById.get(top.type)) || top.type, rank = num(top.rank);
      return [rank ? t('map.tip.rank', { type: ty, n: fmtNum(rank) }) : ty, rows.length > 1 ? t('map.tip.resMore', { n: fmtNum(rows.length - 1) }) : ''];
    }
    case 'nuclear': {
      const n = c.nuclear;
      if (f.nuclearMode === 'civil') return [n.civil ? L(NUCLEAR_CIVIL[n.civil]) : t('map.tip.nuc.civil0')];
      if (f.nuclearMode === 'zones') {
        const z = n.zones.map((id) => DB.nuclear.zoneById.get(id)).filter((x) => !!x);
        return [z.length ? z.map((x) => `${L(x.treaty)} (${x.year})`).join(t('map.sep')) : t('map.tip.nuc.zone0')];
      }
      if (!n.weapons) return [t('map.tip.nuc.none')];
      return [L(NUCLEAR_STATUS[n.weapons]), n.warheads ? t('map.tip.nuc.warheads', { n: fmtNum(n.warheads), y: DB.nuclear.warheads.year }) : ''];
    }
    case 'chokepoints':
      return [c.chokepoints.length ? t('map.tip.chokes', { list: list3(c.chokepoints.map((id) => L(DB.chokeById.get(id)))) }) : t('map.tip.choke0')];
    case 'history': {
      const [a, b] = decadeWindow(S);
      const evs = new Set(windowEvents(DB, S).map((e) => e.id));
      const n = c.events.filter((id) => evs.has(id)).length;
      return [n ? t('map.tip.events', { n: fmtNum(n), a, b }) : t('map.tip.events0', { a, b })];
    }
    default: return [];
  }
}

/** Tooltip HTML for a map hit ({kind, id}); every data string is escaped by tip(). */
export function tipFor(hit: Hit, DB: DB, S: AtlasState): string {
  const { t, L, Lk, fmtNum, fmtDate } = words(S.lang);
  switch (hit.kind) {
    case 'country': {
      const x = DB.countries.get(hit.id);
      return x ? tip(Lk(x, 'name'), ...countryLine(x, DB, S)) : '';
    }
    case 'conflict': {
      const x = DB.conflictById.get(hit.id);
      if (!x) return '';
      const sev = SEVERITY.find((s) => s.id === x.severity);
      return tip(L(x.name), L(sev), x.started ? t('map.tip.since', { y: x.started }) : '');
    }
    case 'choke': {
      const x = DB.chokeById.get(hit.id);
      if (!x) return '';
      const flow = num(x.oilFlowMbd), year = x.flowYear;
      return tip(L(x), L(chokeStatus(x.status)), flow ? t('map.tip.flow', { v: fmtNum(flow, 1), y: typeof year === 'number' || typeof year === 'string' ? year : '' }) : t('map.tip.flowNa'));
    }
    case 'border': {
      const B = getBorders(), u = B?.byId.get(hit.id);
      if (!B || !u) return '';
      const st = L(statusLabel(u.status)), at = yearEnd(S.filters.bordersYear);
      const status = u.status === 'independent' ? st : t('map.tip.bdRuled', { s: st, r: rulerName(B, u, S.lang, at) });
      return tip(unitName(B, u, S.lang, at), status, t('map.tip.bdPeriod', { a: fmtDate(u.start), b: fmtDate(u.end) }), u.capital ? t('map.tip.bdCap', { c: u.capital }) : '');
    }
    case 'plant': {
      const x = DB.plantById.get(hit.id);
      if (!x) return '';
      const mw = x.mw.operating + x.mw.suspended;
      const units = (Object.keys(NUCLEAR_UNIT) as (keyof typeof NUCLEAR_UNIT)[]).filter((s) => x.count[s]).map((s) => `${fmtNum(x.count[s])} ${L(NUCLEAR_UNIT[s])}`).join(t('map.sep'));
      return tip(L(x), nameOf(DB, x.iso3, S.lang), units, mw ? t('map.tip.plantMw', { v: fmtNum(mw) }) : x.mw.building ? t('map.tip.plantBuild', { v: fmtNum(x.mw.building) }) : '');
    }
    case 'pipeline': {
      const E = getEnergy(), x = E?.byId.get(hit.id);
      if (!E || !x) return '';
      const cap = fmtCapacity(x, S.lang);
      const places = x.countries.map((iso) => nameOf(DB, iso, S.lang)).join(t('map.sep'));
      return tip(pipeName(E, x, S.lang), x.segment ? t('map.tip.pp.segment', { s: x.segment }) : '', `${L(FUEL_LABEL[x.fuel])} · ${L(STATUS_LABEL[x.status])}`,
        [cap, x.km ? t('map.tip.pp.km', { v: fmtNum(x.km) }) : ''].filter(Boolean).join(' · '), places,
        x.accuracy === 'low' ? L(ACCURACY_LABEL.low) : '', E.noteOf.has(x.system) ? t('map.tip.pp.note') : '');
    }
    case 'lng': {
      const x = getEnergy()?.lngById.get(hit.id);
      if (!x) return '';
      return tip(x.name, `${t('map.tip.pp.lng.' + x.type)} · ${L(STATUS_LABEL[x.status])}`,
        x.mtpa.operating ? t('map.tip.pp.lng.op', { v: fmtMtpa(x.mtpa.operating, S.lang) }) : '', x.mtpa.construction ? t('map.tip.pp.lng.con', { v: fmtMtpa(x.mtpa.construction, S.lang) }) : '',
        x.iso3 ? nameOf(DB, x.iso3, S.lang) : '');
    }
    case 'site': {
      const x = DB.siteById.get(hit.id);
      return x ? tip(L(x), L(DB.resources.typeById.get(x.type)), nameOf(DB, x.iso3, S.lang)) : '';
    }
    case 'event': {
      const x = DB.eventById.get(hit.id);
      return x ? tip(L(x), fmtDate(x.date)) : '';
    }
    case 'group': {
      const x = DB.ethnic.groups.get(hit.id);
      if (!x) return '';
      const cls = ETHNIC_CLASSES.find((c) => c.id === ethnicClass(x.family));
      return tip(Lk(x, 'name'), t('map.tip.inGroup', { lang: Lk(x, 'lang'), family: L(cls) }), Lk(x, 'region'));
    }
    case 'disputed': {
      const x = DB.disputedById.get(hit.id);
      if (!x) return '';
      const adm = [...DB.countries.values()].find((c) => c.nameEn === x.admin || c.sovereign === x.admin);
      // NE's `claimant` repeats the de-facto sovereign, so it is never shown; `note` is NE's English source note
      const admin = adm ? Lk(adm, 'name') : x.admin;
      return tip(Lk(x, 'name'), admin ? t('map.tip.admin', { v: admin }) : '', S.lang === 'en' ? x.note : '');
    }
    case 'edge': {
      const x = DB.edgeById.get(hit.id);
      if (!x) return '';
      const ty = DB.relations.edgeTypeById.get(x.type);
      return tip(`${nameOf(DB, x.a, S.lang)} — ${nameOf(DB, x.b, S.lang)}`, `${L(bi(ty))} · ${t('map.kind.' + x.kind)}`, L(bi(x)), x.contested ? t('map.tip.contestedEdge') : '', t('map.tip.compareHint'));
    }
    case 'power': {
      const x = DB.countries.get(hit.id);
      if (!x) return '';
      const c = hit.conflict ? DB.conflictById.get(hit.conflict) : undefined;
      const e = (c?.externalPowers || []).find((p) => p.iso3 === hit.id);
      return tip(Lk(x, 'name'), e ? L(e.role) : '', e ? t('map.kind.' + String(e.kind)) : '');
    }
    default: return '';
  }
}
