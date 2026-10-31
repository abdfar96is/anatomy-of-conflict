import type { ReactNode } from 'react';
import { normalize } from '../../i18n/format';

/** [start, end) of the part of `text` that matches `q`, comparing normalised forms; null when nothing matches. */
export function matchRange(text: string, q: string): [number, number] | null {
  const nq = normalize(q);
  if (!nq) return null;
  let norm = '';
  const at: number[] = [];
  for (let i = 0; i < text.length;) {
    const ch = String.fromCodePoint(text.codePointAt(i)!);
    const n = /\s/.test(ch) ? ' ' : normalize(ch);
    for (let j = 0; j < n.length; j++) { norm += n[j]; at.push(i); }
    i += ch.length;
  }
  const hit = norm.indexOf(nq);
  if (hit < 0) return null;
  const a = at[hit]!;
  let b = at[hit + nq.length - 1]!;
  b += String.fromCodePoint(text.codePointAt(b)!).length;
  while (b < text.length && normalize(text[b]) === '' && !/\s/.test(text[b]!)) b++; // carry trailing diacritics
  return [a, b];
}

/** Wrap the part of `text` that matches the query in <mark>, comparing normalised forms. React escapes the text. */
export function markMatch(text: unknown, q: string): ReactNode {
  const s = String(text ?? '');
  const r = matchRange(s, q);
  if (!r) return s;
  return <>{s.slice(0, r[0])}<mark>{s.slice(r[0], r[1])}</mark>{s.slice(r[1])}</>;
}
