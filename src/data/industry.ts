// Mines and heavy industry from Global Energy Monitor's trackers: coal mines, coal terminals, iron ore mines, iron and
// steel plants, cement plants and chemical plants that are operating, under construction or mothballed. The Power &
// industry lens loads industry/sites.json the first time its industry mode opens.

import { fmtNum, type Bi, type Lang } from '../i18n/format';

export const INDUSTRY_LAYERS = ['cm', 'io', 'st', 'ce', 'ch', 'ct'] as const;
export type IndustryLayer = (typeof INDUSTRY_LAYERS)[number];
export type IndustryStatus = 'operating' | 'construction' | 'mothballed';

/** Colour slot, pictogram and the capacity class edges of each layer (its own unit). */
export const LAYER: Record<IndustryLayer, { slot: number; picto: string; edges: [number, number, number, number] }> = {
  cm: { slot: 0, picto: 'coal', edges: [1, 5, 10, 30] },
  io: { slot: 2, picto: 'pickaxe', edges: [1000, 5000, 20000, 50000] },
  st: { slot: 1, picto: 'beam', edges: [1000, 3000, 6000, 10000] },
  ce: { slot: 4, picto: 'silo', edges: [1, 2, 4, 8] },
  ch: { slot: 5, picto: 'flask', edges: [300, 1000, 2000, 4000] },
  ct: { slot: 6, picto: 'ship', edges: [5, 20, 50, 100] },
};
export const LAYER_LABEL: Record<IndustryLayer, Bi> = {
  cm: { ar: 'مناجم الفحم', en: 'Coal mines' }, io: { ar: 'مناجم خام الحديد', en: 'Iron ore mines' }, st: { ar: 'مصانع الحديد والصلب', en: 'Iron and steel plants' },
  ce: { ar: 'مصانع الإسمنت', en: 'Cement plants' }, ch: { ar: 'مصانع الكيماويات', en: 'Chemical plants' }, ct: { ar: 'محطات تصدير الفحم واستيراده', en: 'Coal terminals' },
};
/** One of each, for headings. */
export const LAYER_ONE: Record<IndustryLayer, Bi> = {
  cm: { ar: 'منجم فحم', en: 'Coal mine' }, io: { ar: 'منجم خام حديد', en: 'Iron ore mine' }, st: { ar: 'مصنع حديد وصلب', en: 'Iron and steel plant' },
  ce: { ar: 'مصنع إسمنت', en: 'Cement plant' }, ch: { ar: 'مصنع كيماويات', en: 'Chemical plant' }, ct: { ar: 'محطة فحم بحرية', en: 'Coal terminal' },
};
export const INDUSTRY_STATUS_LABEL: Record<IndustryStatus, Bi> = {
  operating: { ar: 'عامل', en: 'Operating' }, construction: { ar: 'قيد الإنشاء', en: 'Under construction' }, mothballed: { ar: 'مجمّد', en: 'Mothballed' },
};

/** The trackers' common categories in Arabic (by value); anything else stays as GEM gives it. */
const TERM_AR: Record<string, string> = {
  Underground: 'تحت الأرض', Surface: 'سطحي (مكشوف)', 'Underground & Surface': 'تحت الأرض وسطحي',
  Bituminous: 'بيتوميني', Subbituminous: 'شبه بيتوميني', Anthracite: 'أنثراسيت', Lignite: 'ليغنيت',
  Imports: 'استيراد', Exports: 'تصدير', Domestic: 'محلي', Coal: 'فحم', 'All Cargo': 'كل البضائع', 'Dry Bulk': 'بضائع سائبة جافة',
  integrated: 'متكامل', grinding: 'طحن', 'clinker only': 'كلنكر فقط',
  'chemicals only': 'كيماويات فقط', 'integrated refinery and chemicals': 'مصفاة وكيماويات متكاملة', 'refinery only': 'مصفاة فقط',
  EAF: 'فرن القوس الكهربائي', BF: 'الفرن العالي', BOF: 'فرن الأكسجين القاعدي', DRI: 'الاختزال المباشر للحديد', IF: 'فرن الحث',
  'Steel other/unspecified': 'صلب (غير محدد)', 'Iron other/unspecified': 'حديد (غير محدد)',
  'finished rolled': 'مدرفلة نهائية', 'semi-finished': 'نصف مصنّعة', crude: 'صلب خام',
  ammonia: 'أمونيا', methanol: 'ميثانول', ethylene: 'إيثيلين', propylene: 'بروبيلين', benzene: 'بنزين عطري', xylene: 'زايلين',
  toluene: 'تولوين', butadiene: 'بيوتادايين', unspecified: 'غير محدد', 'aromatics (unknown type)': 'عطريات', 'olefins (unknown type)': 'أوليفينات',
  'natural gas': 'غاز طبيعي', coal: 'فحم', naphtha: 'نفثا', 'crude oil': 'نفط خام', ethane: 'إيثان', propane: 'بروبان', butane: 'بيوتان',
  'electrolytic hydrogen': 'هيدروجين بالتحليل الكهربائي', 'liquefied petroleum gas (LPG)': 'غاز البترول المسال', biomass: 'كتلة حيوية',
  'natural gas liquids (NGL)': 'سوائل الغاز الطبيعي', 'coke oven gas': 'غاز أفران الكوك', 'carbon dioxide': 'ثاني أكسيد الكربون', coke: 'فحم الكوك',
  'Coal Plant': 'محطة كهرباء بالفحم', 'Terminal (Export)': 'محطة تصدير', 'Export / Domestic': 'تصدير وسوق محلية', 'Steel Plant': 'مصنع صلب',
  'Other Industrial': 'صناعات أخرى', 'Chemical Plant': 'مصنع كيماويات', 'Chemical plant': 'مصنع كيماويات', 'Domestic Market': 'سوق محلية',
};
/** A tracker value, or a list of them ("BF; BOF"), in the reader's language. */
export function termText(v: string, lang: Lang): string {
  if (lang !== 'ar') return v;
  if (TERM_AR[v]) return TERM_AR[v]!;
  const sep = v.includes(';') ? ';' : v.includes(',') ? ',' : null;
  return sep ? v.split(sep).map((x) => TERM_AR[x.trim()] ?? x.trim()).join('، ') : v;
}

/** One mine, terminal or plant (industry/sites.json; see public/data/README.md for the keys). */
export interface Facility {
  id: string; l: IndustryLayer; n: string; ar?: string; st: IndustryStatus; lon: number; lat: number; c?: string;
  /** Capacity in the layer's unit (Mt a year for coal and cement, thousand t a year for iron ore, steel and chemicals). */
  cap?: number; capc?: number; prod?: number; py?: number;
  o?: string; par?: string; sub?: string; y?: number; approx?: number; w?: string; ccs?: number;
  // per layer
  mt?: string; ct?: string; wf?: number; res?: number; ch4?: number; cf?: string; dest?: string;
  port?: string; tt?: string; pt?: string; src?: string;
  iron?: number; eq?: string; prd?: string;
  clk?: number; kil?: number;
  pc?: [string, number][]; fs?: string;
}
export interface IndustrySource { name: string; publisher: string; release: string; file: string; url: string; license: string; licenseUrl: string; citation: string }
export interface IndustryMeta { sources: Record<IndustryLayer, IndustrySource>; wiki: string }
export interface Industry { sites: Facility[]; byId: Map<string, Facility>; meta: IndustryMeta }

export const buildIndustry = (sites: Facility[], meta: IndustryMeta): Industry => ({ sites, byId: new Map(sites.map((x) => [x.id, x])), meta });

/** The figure that sizes a site: its capacity in operation, else under construction, else its output. */
export const sizeOf = (x: Facility) => x.cap || x.capc || x.prod || 0;
/** Size class 0–4 by the layer's own edges. */
export function facilityClass(x: Facility): number {
  const v = sizeOf(x), e = LAYER[x.l].edges;
  return !v ? 0 : v < e[0] ? 0 : v < e[1] ? 1 : v < e[2] ? 2 : v < e[3] ? 3 : 4;
}
/** "3.5 million tonnes a year", "1,200 thousand tonnes a year" by layer. */
export function fmtTonnes(x: Facility, v: number, lang: Lang): string {
  const ar = lang === 'ar';
  const mt = x.l === 'cm' || x.l === 'ce' || x.l === 'ct';
  const n = fmtNum(v, lang, v < 10 ? 2 : v < 100 ? 1 : 0);
  if (mt) return ar ? `${n} مليون طن سنوياً` : `${n} million tonnes a year`;
  return ar ? `${n} ألف طن سنوياً` : `${n} thousand tonnes a year`;
}

// ---- on-demand loading

let state: Industry | null = null;
let loading: Promise<Industry> | null = null;
let failed = false;
const listeners = new Set<() => void>();
const notify = () => { for (const l of listeners) l(); };

export const getIndustry = () => state;
export const industryFailed = () => failed;
export function subscribeIndustry(fn: () => void) { listeners.add(fn); return () => { listeners.delete(fn); }; }
/** For tests: install an already-built model. */
export function setIndustry(x: Industry | null) { state = x; failed = false; notify(); }

export function loadIndustry(base = import.meta.env.BASE_URL + 'data/industry/'): Promise<Industry> {
  if (state) return Promise.resolve(state);
  if (!loading) {
    failed = false;
    const get = <T,>(f: string) => fetch(base + f).then((r) => { if (!r.ok) throw new Error(`industry/${f}: HTTP ${r.status}`); return r.json() as Promise<T>; });
    loading = Promise.all([get<Facility[]>('sites.json'), get<IndustryMeta>('meta.json')])
      .then(([sites, meta]) => { state = buildIndustry(sites, meta); notify(); return state; })
      .catch((err) => { loading = null; failed = true; notify(); throw err; });
  }
  return loading;
}
