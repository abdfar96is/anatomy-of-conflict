// Disputed territory dossier: names, administering and claiming parties (read from the Natural Earth note), the note itself.

import { Fragment } from 'react';
import type { DB } from '../../../data/types';
import type { Disputed, Panel } from '../model';
import type { Kit } from '../parts';

// Abbreviations Natural Earth uses in its notes.
const NE_ALIAS: Record<string, string> = { uk: 'GBR', usa: 'USA', azer: 'AZE', uae: 'ARE' };
function matchCountry(db: DB, name: string): string | null {
  const n = String(name || '').trim().replace(/^the\s+/i, '').toLowerCase();
  if (!n) return null;
  const alias = NE_ALIAS[n.replace(/\./g, '')];
  if (alias && db.countries.has(alias)) return alias;
  for (const c of db.countries.values()) {
    if ([c.nameEn, c.nameLong, c.sovereign].some((x) => x && x.toLowerCase() === n)) return c.iso3;
  }
  return null;
}

/** Names listed after a phrase in a Natural Earth note: "Admin. by India; Claimed by Pakistan and China". */
function noteParties(noteText: string | undefined, re: RegExp): string[] {
  const m = String(noteText || '').match(re);
  return m?.[1] ? m[1].replace(/;\s*$/, '').split(/,|\band\b|\bfor\b/).map((s) => s.trim()).filter(Boolean) : [];
}

export function disputedPanel(id: string, k: Kit): Panel | null {
  const d = k.db.disputedById.get(id);
  if (!d) return null;
  return {
    head: { region: k.ne(d.subregion), title: k.pickKey(d, 'name'), plate: [k.altSpan(d), k.coord([d.lon, d.lat])], badges: [] },
    tabs: [{ id: 'main', render: () => body(d, k) }],
  };
}

function body(d: Disputed, k: Kit) {
  const { t, db } = k;
  // Natural Earth's `claimant` field repeats the de-facto sovereign (Gaza → Israel), so parties come from the note itself;
  // the admin field is the fallback when the note names no administrator.
  const claimants = noteParties(d.note, /claimed by ([^;]+)/i);
  const admins = noteParties(d.note, /admin\. by ([^;]+)/i);
  if (!admins.length && d.admin && d.admin !== d.nameEn) admins.push(d.admin);
  const party = (raw: string, i: number) => {
    if (/^multiple$/i.test(raw)) return <span key={i} className="chip dz-chip is-static">{t('dz.d.multiple')}</span>;
    const iso = matchCountry(db, raw);
    return iso ? <Fragment key={i}>{k.cchip(iso)}</Fragment> : <span key={i} className="chip dz-chip is-static">{raw}</span>;
  };
  return <>
    {k.sec(null, k.facts([
      k.fact(t('dz.d.names'), <><span lang="ar">{d.nameAr}</span>{' · '}<bdi lang="en">{d.nameEn}</bdi></>, { text: true, wide: true }),
      admins.length > 0 && k.fact(t('dz.d.admin'), <div className="chips dz-chips">{admins.map(party)}</div>, { text: true, wide: true }),
      claimants.length > 0 && k.fact(t('dz.d.claimant'), <div className="chips dz-chips">{claimants.map(party)}</div>, { text: true, wide: true, tipText: t('dz.d.claimTip') }),
    ]), { cls: 'first' })}
    {k.sec(t('dz.d.note'), d.note
      ? [<p className="dz-src-label">{t('dz.d.noteLabel')}</p>, <blockquote className="dz-quote" lang="en" dir="ltr">{d.note}</blockquote>]
      : k.empty(t('dz.d.noNote')))}
    {k.sec(null, k.caveat(t('dz.d.caveat')))}
  </>;
}
