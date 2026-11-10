// Power plants from Global Energy Monitor's Global Integrated Power Tracker: one entry per plant or project (a GEM
// location) with its units that are operating, under construction or mothballed, for coal, oil and gas, nuclear,
// hydropower, solar, wind, bioenergy and geothermal power. Loaded on demand the first time the Power & industry lens
// opens: power/plants.json holds what the map, tooltip and search need, as columns; the rest of each plant is in one
// detail file per state, loaded when its dossier opens.

import { fmtNum, type Bi, type Lang } from '../i18n/format';

export const POWER_TYPES = ['hydro', 'gas', 'wind', 'solar', 'geo', 'bio', 'nuclear', 'coal'] as const;
export type PowerType = (typeof POWER_TYPES)[number];
export type PowerStatus = 'operating' | 'construction' | 'mothballed';
/** Categorical colour slot of each type: the palette's fixed order, validated for neighbours in both themes. */
export const POWER_SLOT: Record<PowerType, number> = { hydro: 1, gas: 2, wind: 3, solar: 4, geo: 5, bio: 6, nuclear: 7, coal: 8 };
/** The map pictogram of each type (ui/pictograms.ts). */
export const POWER_PICTO: Record<PowerType, string> = {
  hydro: 'hydro', gas: 'flame', wind: 'turbine', solar: 'sun', geo: 'geothermal', bio: 'leaf', nuclear: 'atom', coal: 'coal',
};
const CODE: Record<string, PowerType> = { c: 'coal', g: 'gas', n: 'nuclear', h: 'hydro', s: 'solar', w: 'wind', b: 'bio', e: 'geo' };
const STATUS: Record<string, PowerStatus> = { o: 'operating', c: 'construction', m: 'mothballed' };

export const POWER_LABEL: Record<PowerType, Bi> = {
  coal: { ar: 'فحم', en: 'Coal' }, gas: { ar: 'غاز ونفط', en: 'Oil and gas' }, nuclear: { ar: 'نووي', en: 'Nuclear' },
  hydro: { ar: 'كهرومائي', en: 'Hydropower' }, solar: { ar: 'شمسي', en: 'Solar' }, wind: { ar: 'رياح', en: 'Wind' },
  bio: { ar: 'طاقة حيوية', en: 'Bioenergy' }, geo: { ar: 'حراري جوفي', en: 'Geothermal' },
};
/** "a coal plant", for headings: the kind of plant each type makes. */
export const POWER_PLANT_LABEL: Record<PowerType, Bi> = {
  coal: { ar: 'محطة فحم', en: 'Coal plant' }, gas: { ar: 'محطة غاز أو نفط', en: 'Oil or gas plant' }, nuclear: { ar: 'محطة نووية', en: 'Nuclear plant' },
  hydro: { ar: 'محطة كهرومائية', en: 'Hydropower plant' }, solar: { ar: 'محطة شمسية', en: 'Solar plant' }, wind: { ar: 'مزرعة رياح', en: 'Wind farm' },
  bio: { ar: 'محطة طاقة حيوية', en: 'Bioenergy plant' }, geo: { ar: 'محطة حرارية جوفية', en: 'Geothermal plant' },
};
export const POWER_STATUS_LABEL: Record<PowerStatus, Bi> = {
  operating: { ar: 'عاملة', en: 'Operating' }, construction: { ar: 'قيد الإنشاء', en: 'Under construction' }, mothballed: { ar: 'مجمّدة', en: 'Mothballed' },
};

/** GEM's technologies in Arabic; any other stays as GEM gives it. */
const TECH_AR: Record<string, string> = {
  Onshore: 'رياح برية', 'Offshore hard mount': 'رياح بحرية مثبّتة', 'Offshore floating': 'رياح بحرية عائمة', 'Offshore mount unknown': 'رياح بحرية',
  PV: 'خلايا كهروضوئية', 'Assumed PV': 'خلايا كهروضوئية (مفترضة)', 'Solar Thermal': 'حرارية شمسية',
  'conventional storage': 'سد وخزان', 'run-of-river': 'جريان النهر', 'pumped storage': 'تخزين بالضخ',
  'conventional and run-of-river': 'سد وخزان وجريان النهر', 'conventional and pumped storage': 'سد وخزان وتخزين بالضخ',
  'combined cycle': 'دورة مركّبة', 'gas turbine': 'توربين غازي', 'steam turbine': 'توربين بخاري', 'internal combustion': 'احتراق داخلي',
  ICCC: 'دورة مركّبة مع احتراق داخلي (ICCC)', ISCC: 'دورة مركّبة مدمجة بالطاقة الشمسية (ISCC)',
  subcritical: 'دون الحرجة', supercritical: 'فوق الحرجة', 'ultra-supercritical': 'فائقة فوق الحرجة', IGCC: 'تغويز متكامل بدورة مركّبة (IGCC)',
  'subcritical/CCS': 'دون الحرجة مع احتجاز الكربون', 'supercritical/CCS': 'فوق الحرجة مع احتجاز الكربون', 'ultra-supercritical/CCS': 'فائقة فوق الحرجة مع احتجاز الكربون',
  'pressurized water reactor': 'مفاعل الماء المضغوط', 'boiling water reactor': 'مفاعل الماء المغلي', 'pressurized heavy water reactor': 'مفاعل الماء الثقيل المضغوط',
  'gas-cooled reactor': 'مفاعل مبرّد بالغاز', 'fast breeder reactor': 'مفاعل مولّد سريع', 'small modular reactor': 'مفاعل وحدات صغيرة',
  'light water graphite reactor': 'مفاعل الماء الخفيف والغرافيت', 'liquid-metal-cooled fast reactor': 'مفاعل سريع مبرّد بالمعدن السائل',
  'binary cycle': 'دورة ثنائية', 'dry steam': 'بخار جاف', 'flash steam - single': 'بخار وميضي أحادي', 'flash steam - double': 'بخار وميضي مزدوج',
  'flash steam - triple': 'بخار وميضي ثلاثي', 'flash steam - unknown': 'بخار وميضي', 'enhanced geothermal systems (EGS)': 'أنظمة حرارية جوفية معزّزة (EGS)',
};
/** GEM's fuels ("category: fuel") in Arabic; any other stays as GEM gives it. */
const FUEL_AR: Record<string, string> = {
  'fossil gas: natural gas': 'غاز طبيعي', 'fossil gas: LNG': 'غاز طبيعي مسال', 'fossil gas: unknown': 'غاز', 'fossil gas: coalbed methane': 'ميثان طبقات الفحم',
  'fossil gas: waste heat from natural gas': 'حرارة مهدرة من الغاز', 'fossil gas: gaseous propane': 'بروبان',
  'coal: unknown': 'فحم', 'coal: bituminous': 'فحم بيتوميني', 'coal: subbituminous': 'فحم شبه بيتوميني', 'coal: lignite': 'ليغنيت', 'coal: anthracite': 'أنثراسيت',
  'coal: waste coal': 'نفايات الفحم', 'coal: bituminous with CCS': 'فحم بيتوميني مع احتجاز الكربون', 'coal: unknown with CCS': 'فحم مع احتجاز الكربون',
  'fossil liquids: fuel oil': 'زيت الوقود', 'fossil liquids: diesel': 'ديزل', 'fossil liquids: heavy fuel oil': 'زيت الوقود الثقيل', 'fossil liquids: light fuel oil': 'زيت الوقود الخفيف',
  'fossil liquids: crude oil': 'نفط خام', 'fossil liquids: kerosene': 'كيروسين', 'fossil liquids: naphtha': 'نفثا', 'fossil liquids: petroleum coke': 'فحم الكوك البترولي',
  'fossil liquids: liquefied petroleum gas': 'غاز البترول المسال', 'fossil liquids: jet fuel': 'وقود الطائرات', 'fossil liquids: unknown': 'وقود سائل',
  'fossil liquids: waste/other oil': 'زيوت مستعملة وغيرها',
  'bioenergy: wood & other biomass (solids)': 'خشب وكتلة حيوية صلبة', 'bioenergy: agricultural waste (solids)': 'مخلفات زراعية',
  'bioenergy: refuse (municipal and industrial wastes)': 'نفايات بلدية وصناعية', 'bioenergy: paper mill wastes': 'مخلفات مصانع الورق',
  'bioenergy: unknown': 'طاقة حيوية', 'bioenergy: refuse (landfill gas)': 'غاز المكبّات', 'bioenergy: wastewater and sewage sludge (solids or biogas)': 'حمأة الصرف الصحي',
  'bioenergy: agricultural waste (biogas)': 'غاز حيوي من مخلفات زراعية', 'bioenergy: biodiesel': 'ديزل حيوي',
  'industrial by-product: blast furnace gas': 'غاز الأفران العالية', 'industrial by-product: coke oven gas': 'غاز أفران الكوك',
  'other: hydrogen (unknown)': 'هيدروجين', 'other: other': 'أخرى',
};
export const techText = (tech: string, lang: Lang) => (lang === 'ar' ? TECH_AR[tech] ?? tech : tech);
/** "fossil gas: natural gas [70%], other: hydrogen (unknown) [30%]" in the reader's language. */
export function fuelText(fuel: string, lang: Lang): string {
  if (lang !== 'ar') return fuel;
  return fuel.split(', ').map((tok) => {
    const m = tok.match(/^(.*?)(\s*\[\d+%\])?$/)!;
    const ar = FUEL_AR[m[1]!];
    return ar ? ar + (m[2] ? ` ${m[2].trim().replace('[', '(').replace(']', ')')}` : '') : tok;
  }).join('، ');
}

/** What the map knows of a plant (power/plants.json). */
export interface PowerPlant {
  id: string; name: string; nameAr?: string; type: PowerType; status: PowerStatus;
  /** Capacity of its units that are operating, under construction or mothballed, in MW. */
  mw: number;
  coords: [number, number]; iso3?: string;
}
/** The rest, from power/detail/<ISO3>.json. */
export interface PowerDetail {
  /** MW operating, under construction and mothballed. */
  op?: number; con?: number; mb?: number;
  /** Capacity by type, for the few plants that mix them (largest first). */
  mix?: [PowerType, number][];
  approx?: number; c?: string; sub?: string;
  /** First year in service, expected year of the first unit under construction, earliest planned retirement. */
  y?: number; yc?: number; ry?: number;
  tech?: string; fuel?: string; u: number; o?: string; par?: string; riv?: string; chp?: number; ccs?: number;
  /** Captive plant: the industry it serves. */
  cap?: string;
  /** GEM.wiki page when it is not the name with underscores; '' when GEM has none. */
  w?: string;
}
interface RawIndex { iso: string[]; id: number[]; n: string[]; t: string; s: string; mw: number[]; x: number[]; y: number[]; c: number[]; ar: [number, string][] }
export interface PowerMeta {
  source: { name: string; publisher: string; release: string; file: string; url: string; license: string; licenseUrl: string; citation: string };
  wiki: string;
}
export interface Power { plants: PowerPlant[]; byId: Map<string, PowerPlant>; meta: PowerMeta }

/** GEM location ids are "L" and twelve digits; the file stores them less 10¹¹. */
export const plantId = (n: number) => `L${100000000000 + n}`;

/** Decode the columns (pure; exported for tests). */
export function buildPower(raw: RawIndex, meta: PowerMeta): Power {
  const ar = new Map(raw.ar);
  const plants: PowerPlant[] = raw.id.map((n, i) => ({
    id: plantId(n), name: raw.n[i]!, nameAr: ar.get(i), type: CODE[raw.t[i]!]!, status: STATUS[raw.s[i]!]!, mw: raw.mw[i]!,
    coords: [raw.x[i]! / 1000, raw.y[i]! / 1000], iso3: raw.c[i]! >= 0 ? raw.iso[raw.c[i]!] : undefined,
  }));
  return { plants, byId: new Map(plants.map((p) => [p.id, p])), meta };
}

/** "1,200 MW", "3.4 GW" from 10 GW up. */
export function fmtMW(mw: number, lang: Lang): string {
  const ar = lang === 'ar';
  if (mw >= 10000) return `${fmtNum(mw / 1000, lang, 1)} ${ar ? 'غيغاواط' : 'GW'}`;
  return `${fmtNum(mw, lang, mw < 10 ? 1 : 0)} ${ar ? 'ميغاواط' : 'MW'}`;
}
/** Size class by capacity: under 100 MW, 500, 1,000, 3,000, and 3,000 or more. */
export const powerClass = (mw: number) => (mw < 100 ? 0 : mw < 500 ? 1 : mw < 1000 ? 2 : mw < 3000 ? 3 : 4);

// ---- on-demand loading, shared by the map, legend and dossier

let state: Power | null = null;
let loading: Promise<Power> | null = null;
let failed = false;
const details = new Map<string, Record<string, PowerDetail> | 'loading' | 'failed'>();
const listeners = new Set<() => void>();
/** Bumped on every change (the model, a detail file), so React re-renders when a detail file arrives. */
let version = 0;
const notify = () => { version++; for (const l of listeners) l(); };
const base = () => import.meta.env.BASE_URL + 'data/power/';

export const getPower = () => state;
export const powerVersion = () => version;
export const powerFailed = () => failed;
export function subscribePower(fn: () => void) { listeners.add(fn); return () => { listeners.delete(fn); }; }
/** For tests: install an already-built model, and detail files by state. */
export function setPower(p: Power | null, detail?: Record<string, Record<string, PowerDetail>>) {
  state = p; failed = false; details.clear();
  for (const [k, v] of Object.entries(detail ?? {})) details.set(k, v);
  notify();
}

export function loadPower(): Promise<Power> {
  if (state) return Promise.resolve(state);
  if (!loading) {
    failed = false;
    const get = <T,>(f: string) => fetch(base() + f).then((r) => { if (!r.ok) throw new Error(`power/${f}: HTTP ${r.status}`); return r.json() as Promise<T>; });
    loading = Promise.all([get<RawIndex>('plants.json'), get<PowerMeta>('meta.json')])
      .then(([raw, meta]) => { state = buildPower(raw, meta); notify(); return state; })
      .catch((err) => { loading = null; failed = true; notify(); throw err; });
  }
  return loading;
}

/** A plant's detail: undefined while its state's file loads (it starts loading here), null if it failed. */
export function plantDetail(p: PowerPlant): PowerDetail | null | undefined {
  const key = p.iso3 ?? '_';
  const d = details.get(key);
  if (d === 'failed') return null;
  if (d && d !== 'loading') return d[p.id] ?? null;
  if (!d) {
    details.set(key, 'loading');
    fetch(base() + `detail/${key}.json`).then((r) => { if (!r.ok) throw new Error(`power/detail/${key}.json: HTTP ${r.status}`); return r.json(); })
      .then((v: Record<string, PowerDetail>) => { details.set(key, v); notify(); })
      .catch(() => { details.set(key, 'failed'); notify(); });
  }
  return undefined;
}
