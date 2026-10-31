// Strings and formatters bound to the current language.

import { createContext, useContext, useMemo } from 'react';
import type { DB } from '../data/types';
import { fmtCompact, fmtDate, fmtGdp, fmtNum, fmtPct, type Bi } from '../i18n/format';
import { pick, pickKey, translate } from '../i18n/strings';
import { useAtlas } from './store';

type Num = number | null | undefined;

export function useT() {
  const lang = useAtlas((s) => s.lang);
  return useMemo(() => ({
    lang,
    t: (key: string, vars?: Record<string, string | number>) => translate(lang, key, vars),
    pick: (obj: Partial<Bi> | string | null | undefined) => pick(lang, obj),
    pickKey: (obj: object | null | undefined, base: string) => pickKey(lang, obj, base),
    fmt: {
      num: (n: Num, digits?: number) => fmtNum(n, lang, digits),
      pct: (n: Num, digits?: number) => fmtPct(n, lang, digits),
      compact: (n: Num) => fmtCompact(n, lang),
      gdp: (mdUsd: Num) => fmtGdp(mdUsd, lang),
      date: (s: string | null | undefined) => fmtDate(s, lang),
    },
  }), [lang]);
}

export const DbContext = createContext<DB | null>(null);

/** The loaded atlas model. Only valid inside <Boot>. */
export function useDb(): DB {
  const db = useContext(DbContext);
  if (!db) throw new Error('useDb() used outside <Boot>');
  return db;
}
