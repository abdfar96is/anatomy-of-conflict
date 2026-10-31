// Number, date and search-text formatting. Pure functions: the language is always an argument.

export type Lang = 'ar' | 'en';
export type Bi = { ar: string; en: string };
type Num = number | null | undefined;

// Western digits in both languages: the data is quantitative and reads more reliably that way.
const locale = (lang: Lang) => (lang === 'ar' ? 'ar-SA-u-nu-latn' : 'en-GB');
const missing = (n: Num): n is null | undefined => n == null || Number.isNaN(n);

export function fmtNum(n: Num, lang: Lang, digits = 0): string {
  if (missing(n)) return '—';
  return new Intl.NumberFormat(locale(lang), { maximumFractionDigits: digits, minimumFractionDigits: 0 }).format(n);
}

export function fmtPct(n: Num, lang: Lang, digits = 0): string {
  if (missing(n)) return '—';
  return lang === 'ar' ? `${fmtNum(n, lang, digits)}٪` : `${fmtNum(n, lang, digits)}%`;
}

/** 34268528 → "34.3 مليون" / "34.3 M" */
export function fmtCompact(n: Num, lang: Lang): string {
  if (missing(n)) return '—';
  const ar = lang === 'ar';
  const a = Math.abs(n);
  if (a >= 1e12) return `${fmtNum(n / 1e12, lang, 1)} ${ar ? 'تريليون' : 'tn'}`;
  if (a >= 1e9) return `${fmtNum(n / 1e9, lang, 1)} ${ar ? 'مليار' : 'bn'}`;
  if (a >= 1e6) return `${fmtNum(n / 1e6, lang, 1)} ${ar ? 'مليون' : 'M'}`;
  if (a >= 1e4) return `${fmtNum(n / 1e3, lang, 0)} ${ar ? 'ألف' : 'K'}`;
  return fmtNum(n, lang);
}

/** GDP stored in million USD → "$793 bn" / "793 مليار دولار" */
export function fmtGdp(mdUsd: Num, lang: Lang): string {
  if (missing(mdUsd)) return '—';
  return lang === 'ar' ? `${fmtCompact(mdUsd * 1e6, lang)} دولار` : `$${fmtCompact(mdUsd * 1e6, lang)}`;
}

const MONTHS: Record<Lang, string[]> = {
  ar: ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'],
  en: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
};

/** '2023-10-07' → '7 أكتوبر 2023'; '1912-10' → 'Oct 1912'; '1948' → '1948'. */
export function fmtDate(str: string | null | undefined, lang: Lang): string {
  if (!str) return '—';
  const [y = '', m, d] = String(str).split('-');
  const mm = m ? (MONTHS[lang][+m - 1] ?? '') : '';
  if (d) return `${+d} ${mm} ${y}`;
  if (m) return `${mm} ${y}`;
  return y;
}

/** Search normalisation: strips Arabic diacritics/tatweel, unifies alef/ya/ta marbuta/hamza seats, lowercases Latin. */
export function normalize(s: unknown): string {
  return String(s ?? '')
    .toLowerCase()
    .normalize('NFKD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[\u064b-\u0670\u065f\u06d6-\u06ed]/g, '')
    .replace(/\u0640/g, '')
    .replace(/[آأإا]/g, 'ا')
    .replace(/ى/g, 'ي')
    .replace(/ة/g, 'ه')
    .replace(/[ؤئ]/g, 'ء')
    .replace(/\s+/g, ' ')
    .trim();
}
