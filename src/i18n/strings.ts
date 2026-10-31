// UI string tables. Each feature registers its own strings with registerStrings({ar:{…}, en:{…}}).

import type { Bi, Lang } from './format';

const STR: Record<Lang, Record<string, string>> = { ar: {}, en: {} };

export function registerStrings(dict: { ar: Record<string, string>; en?: Record<string, string> }): void {
  Object.assign(STR.ar, dict.ar);
  Object.assign(STR.en, dict.en ?? {});
}

/** translate('en', 'key', {n: 3}) → string with {n} filled. Falls back to Arabic, then the key. */
export function translate(lang: Lang, key: string, vars?: Record<string, string | number>): string {
  const s = STR[lang][key] ?? STR.ar[key] ?? key;
  return vars ? s.replace(/\{(\w+)\}/g, (_, k: string) => String(vars[k] ?? '')) : s;
}

/** Pick the language from {ar, en}. Plain strings pass through. */
export function pick(lang: Lang, obj: Partial<Bi> | string | null | undefined): string {
  if (obj == null) return '';
  if (typeof obj === 'string') return obj;
  return obj[lang] ?? obj.ar ?? obj.en ?? '';
}

/** Pick from flat bilingual fields: pickKey(lang, p, 'name') → p.nameAr | p.nameEn. */
export function pickKey(lang: Lang, obj: object | null | undefined, base: string): string {
  if (!obj) return '';
  const o = obj as Record<string, unknown>;
  const v = (lang === 'ar' ? o[base + 'Ar'] : o[base + 'En']) ?? o[base + 'Ar'] ?? o[base + 'En'];
  return typeof v === 'string' ? v : '';
}
