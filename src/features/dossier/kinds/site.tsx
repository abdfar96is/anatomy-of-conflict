// Resource site dossier: resource type, state, note and the state's record for this resource.

import type { Panel, ResEntryX, Site } from '../model';
import type { Kit } from '../parts';

export function sitePanel(id: string, k: Kit): Panel | null {
  const s = k.db.siteById.get(id);
  if (!s) return null;
  return {
    head: { region: k.resTypeName(s.type), title: k.pick(s), plate: [k.altSpan(s), k.coord(s.coords)], badges: [] },
    tabs: [{ id: 'main', render: () => body(s, k) }],
  };
}

function body(s: Site, k: Kit) {
  const { t, pickKey: Lk, db } = k;
  const record = ((db.countries.get(s.iso3)?.resources ?? []) as ResEntryX[]).filter((e) => e.type === s.type);
  return <>
    {k.sec(null, k.facts([
      k.fact(t('dz.st.type'), <>{k.sw(k.resColor(s.type))}{k.resTypeName(s.type)}</>, { text: true }),
      k.fact(t('dz.st.country'), k.cchip(s.iso3), { text: true }),
    ]), { cls: 'first' })}
    {k.sec(t('dz.st.note'), k.prose(Lk(s, 'note'), { clamp: false }))}
    {record.length ? k.sec(t('dz.st.record'), k.rows(record.map((e, i) => k.resourceEntry(e, i)))) : null}
  </>;
}
