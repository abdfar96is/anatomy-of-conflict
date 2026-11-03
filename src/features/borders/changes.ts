// One readable line per border or status change ("Independence: India"), shared by the scrubber, legend and dossier.

import { rulerName, unitName, type BorderChange, type Borders } from '../../data/borders';
import type { Lang } from '../../i18n/format';

type T = (key: string, vars?: Record<string, string | number>) => string;

export function changeLine(B: Borders, c: BorderChange, lang: Lang, t: T): string {
  const name = unitName(B, c.unit, lang, c.date);
  if (c.kind === 'transfer') return t('bd.k.transfer', { n: name, r: rulerName(B, c.unit, lang, c.date) });
  if (c.kind === 'annexed' || (c.kind === 'status' && c.unit.status !== 'independent')) {
    return t(`bd.k.${c.kind}`, { n: name, r: rulerName(B, c.unit, lang, c.date), s: t(`bd.st.${c.unit.status}`) });
  }
  return t(`bd.k.${c.kind}`, { n: name });
}
