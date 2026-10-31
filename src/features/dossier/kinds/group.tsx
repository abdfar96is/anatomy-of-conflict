// Ethnic group dossier: overview and the conflicts in the states where the group lives.

import type { ConflictX, Group, Panel } from '../model';
import type { Kit } from '../parts';

const conflictsIn = (isos: string[], k: Kit) => {
  const set = new Set(isos);
  return (k.db.conflicts as ConflictX[]).filter((c) => (c.countries ?? []).some((i) => set.has(i)));
};

export function groupPanel(id: string, k: Kit): Panel | null {
  const g = k.db.ethnic.groups.get(id);
  if (!g) return null;
  const { t, pickKey: Lk } = k;
  const conf = conflictsIn(g.countries, k);
  return {
    head: { region: Lk(g, 'region'), title: Lk(g, 'name'), plate: [k.altSpan(g), k.coord([g.lon, g.lat])], badges: [<span className="pill">{k.famName(g.family)}</span>] },
    tabs: [
      { id: 'overview', label: t('dz.g.t.overview'), render: () => overview(g, k) },
      { id: 'conflicts', label: t('dz.g.t.conflicts'), count: conf.length, render: () => conflicts(conf, k) },
    ],
  };
}

function overview(g: Group, k: Kit) {
  const { t, pickKey: Lk, db } = k;
  return <>
    {k.sec(null, k.facts([
      k.fact(t('dz.p.family'), k.famName(g.family), { text: true }),
      k.fact(t('dz.p.lang'), Lk(g, 'lang'), { text: true }),
      k.fact(t('dz.g.region'), Lk(g, 'region'), { text: true, wide: true }),
    ]), { cls: 'first' })}
    {k.sec(t('dz.g.note'), k.prose(Lk(g, 'note')))}
    {k.sec(t('dz.g.countries'), k.cchips(g.countries, { sort: true }), { count: g.countries.length })}
    {k.sec(null, k.caveat(Lk(db.ethnic.meta as object | null, 'warning')))}
  </>;
}

function conflicts(list: ConflictX[], k: Kit) {
  const { t } = k;
  if (!list.length) return k.sec(null, k.empty(t('dz.g.noConflicts')), { cls: 'first' });
  return k.sec(null, [k.note(t('dz.g.conflictsNote')), k.rows(list.map((cf) => k.conflictRow(cf)))], { cls: 'first' });
}
