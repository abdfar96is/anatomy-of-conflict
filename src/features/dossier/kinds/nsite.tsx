// Nuclear site dossier (fuel cycle, weapons and test sites; curated/nuclear.json `sites`): what it does, its state and
// years, what happened there, the conflicts it is tied to, and its sources.

import { NUCLEAR_SITE_STATUS, NUCLEAR_SITE_TYPE } from '../../../config';
import type { NuclearSite } from '../../../data/types';
import type { ConflictX, Panel } from '../model';
import type { Kit } from '../parts';

const typeOf = (s: NuclearSite) => NUCLEAR_SITE_TYPE[s.type as keyof typeof NUCLEAR_SITE_TYPE];
const statusOf = (s: NuclearSite) => NUCLEAR_SITE_STATUS[s.status as keyof typeof NUCLEAR_SITE_STATUS];

export function nsitePanel(id: string, k: Kit): Panel | null {
  const s = k.db.nsiteById.get(id);
  if (!s) return null;
  const { pick: L } = k;
  return {
    head: {
      region: [L(typeOf(s)), k.nameC(s.iso3)].filter(Boolean).join(' · '),
      title: L(s),
      plate: [k.altSpan(s), k.coord(s.coords)],
      badges: [<span key="s" className={`pill dz-pill ns-${s.status}`}>{L(statusOf(s))}</span>],
    },
    tabs: [{ id: 'main', render: () => body(s, k) }],
  };
}

function body(s: NuclearSite, k: Kit) {
  const { t, pick: L, db } = k;
  const years = s.from || s.to ? `${s.from ?? '…'}${s.to ? `–${s.to}` : ''}` : '';
  const conflicts = (s.conflictIds ?? []).map((id) => db.conflictById.get(id) as ConflictX | undefined).filter((c) => !!c);
  return <>
    {k.sec(null, k.facts([
      k.fact(t('dz.ns.type'), L(typeOf(s)), { text: true, wide: true }),
      k.fact(t('dz.ns.status'), L(statusOf(s)), { text: true }),
      years ? k.fact(t('dz.ns.years'), <span className="data">{years}</span>) : null,
      k.fact(t('dz.pl.country'), k.cchip(s.iso3), { text: true }),
    ]), { cls: 'first' })}
    {k.sec(t('dz.ns.about'), [k.prose(L(s.note), { clamp: false }), s.sources?.length ? k.provenance(s) : null])}
    {conflicts.length ? k.sec(t('dz.pl.conflicts'), <div className="chips dz-chips">{conflicts.map((c) => k.kchip('conflict', c.id, L(c.name), { lead: k.sevGlyph(c.severity, 11), isos: c.countries }))}</div>) : null}
  </>;
}
