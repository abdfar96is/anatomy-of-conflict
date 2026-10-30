// UI strings and formatting. Each module registers its own strings with registerStrings({ar:{…}, en:{…}}).

import { state } from './store.js';

const STR = { ar: {}, en: {} };

export function registerStrings(dict) {
  for (const l of ['ar', 'en']) Object.assign(STR[l], dict[l] || {});
}

/** t('key', {n: 3}) → string with {n} filled. Falls back to Arabic, then the key. */
export function t(key, vars) {
  const s = STR[state.lang][key] ?? STR.ar[key] ?? key;
  return vars ? s.replace(/\{(\w+)\}/g, (_, k) => (vars[k] ?? '')) : s;
}

/** Pick the current language from {ar, en} (strings or arrays). Strings pass through. */
export function L(obj) {
  if (obj == null) return '';
  if (typeof obj === 'string') return obj;
  return obj[state.lang] ?? obj.ar ?? obj.en ?? '';
}

/** Pick from flat bilingual fields: Lk(p, 'name') → p.nameAr | p.nameEn; Lk(ch, 'risk') → riskAr | riskEn. */
export function Lk(obj, base) {
  if (!obj) return '';
  return (state.lang === 'ar' ? obj[base + 'Ar'] : obj[base + 'En']) ?? obj[base + 'Ar'] ?? obj[base + 'En'] ?? '';
}

export const isRTL = () => state.lang === 'ar';
export const dir = () => (isRTL() ? 'rtl' : 'ltr');

// Western digits in both languages: the data is quantitative and reads more reliably that way.
const locale = () => (state.lang === 'ar' ? 'ar-SA-u-nu-latn' : 'en-GB');

export function fmtNum(n, digits = 0) {
  if (n == null || Number.isNaN(n)) return '—';
  return new Intl.NumberFormat(locale(), { maximumFractionDigits: digits, minimumFractionDigits: 0 }).format(n);
}

export function fmtPct(n, digits = 0) {
  if (n == null || Number.isNaN(n)) return '—';
  return state.lang === 'ar' ? `${fmtNum(n, digits)}٪` : `${fmtNum(n, digits)}%`;
}

/** 34268528 → "34.3 مليون" / "34.3 M" */
export function fmtCompact(n) {
  if (n == null || Number.isNaN(n)) return '—';
  const ar = state.lang === 'ar';
  const a = Math.abs(n);
  if (a >= 1e12) return `${fmtNum(n / 1e12, 1)} ${ar ? 'تريليون' : 'tn'}`;
  if (a >= 1e9) return `${fmtNum(n / 1e9, 1)} ${ar ? 'مليار' : 'bn'}`;
  if (a >= 1e6) return `${fmtNum(n / 1e6, 1)} ${ar ? 'مليون' : 'M'}`;
  if (a >= 1e4) return `${fmtNum(n / 1e3, 0)} ${ar ? 'ألف' : 'K'}`;
  return fmtNum(n);
}

/** GDP stored in million USD → "$793 مليار" / "$793 bn" */
export function fmtGdp(mdUsd) {
  if (mdUsd == null) return '—';
  return state.lang === 'ar' ? `${fmtCompact(mdUsd * 1e6)} دولار` : `$${fmtCompact(mdUsd * 1e6)}`;
}

const MONTHS = {
  ar: ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'],
  en: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
};

/** '2023-10-07' → '7 أكتوبر 2023'; '1912-10' → 'أكتوبر 1912'; '1948' → '1948'. */
export function fmtDate(str) {
  if (!str) return '—';
  const [y, m, d] = String(str).split('-');
  const mm = m ? MONTHS[state.lang][+m - 1] : '';
  if (d) return state.lang === 'ar' ? `${+d} ${mm} ${y}` : `${+d} ${mm} ${y}`;
  if (m) return `${mm} ${y}`;
  return y;
}

/** Search normalisation: strips Arabic diacritics/tatweel, unifies alef/ya/ta marbuta/hamza seats, lowercases Latin. */
export function normalize(s) {
  return String(s || '')
    .toLowerCase()
    .normalize('NFKD').replace(/[̀-ͯ]/g, '')
    .replace(/[ً-ٰٟۖ-ۭ]/g, '')
    .replace(/ـ/g, '')
    .replace(/[آأإا]/g, 'ا')
    .replace(/ى/g, 'ي')
    .replace(/ة/g, 'ه')
    .replace(/[ؤئ]/g, 'ء')
    .replace(/\s+/g, ' ')
    .trim();
}

// Core strings used by the foundation (boot, errors). Modules add their own.
registerStrings({
  ar: {
    appName: 'أطلس خطوط الصدع',
    appTag: 'الجغرافيا السياسية والعرقية والدينية للعالم',
    loading: 'جارٍ تحميل الأطلس…',
    loadingFile: 'تحميل {name}',
    loadFailed: 'تعذّر تحميل بيانات الأطلس. تحقّق من الاتصال ثم أعد المحاولة.',
    retry: 'أعد المحاولة',
    noData: 'لا تتوفّر بيانات',
    close: 'إغلاق',
  },
  en: {
    appName: 'Fault Lines Atlas',
    appTag: 'The political, ethnic and religious geography of the world',
    loading: 'Loading the atlas…',
    loadingFile: 'Loading {name}',
    loadFailed: 'The atlas data did not load. Check the connection and try again.',
    retry: 'Try again',
    noData: 'No data',
    close: 'Close',
  },
});
