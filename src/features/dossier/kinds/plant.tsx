// Nuclear power plant dossier: status, capacity, units with their type, net capacity and years, then sources.

import { NUCLEAR_UNIT } from '../../../config';
import type { NuclearUnitStatus, Plant } from '../../../data/types';
import { Icon } from '../../../ui/Icon';
import type { ConflictX, Panel } from '../model';
import { hostOf, type Kit } from '../parts';

const ORDER = Object.keys(NUCLEAR_UNIT) as NuclearUnitStatus[];

export function plantPanel(id: string, k: Kit): Panel | null {
  const p = k.db.plantById.get(id);
  if (!p) return null;
  const { t, pick: L } = k;
  return {
    head: {
      region: t('dz.pl.region', { c: k.nameC(p.iso3) }),
      title: L(p),
      plate: [k.altSpan(p), k.coord(p.coords)],
      badges: [<span key="s" className={`pill dz-pill pl-${p.status}`}>{L(NUCLEAR_UNIT[p.status])}</span>],
    },
    tabs: [{ id: 'main', render: () => body(p, k) }],
  };
}

const mwOf = (k: Kit, v: number) => <><span className="data">{k.fmt.num(v)}</span>{' '}<span className="dz-unit">{k.t('dz.pl.mw')}</span></>;

function body(p: Plant, k: Kit) {
  const { t, pick: L, fmt, db } = k;
  const src = db.nuclear.plantSource;
  const base = { label: `${src.base.name} ${src.base.version}`, url: src.base.url, tip: t('dz.pl.baseTip', { d: fmt.date(src.base.date) }) };
  const inService = p.mw.operating + p.mw.suspended;
  // units added from Reactor Atlas plant pages carry no PRIS id; their figures are credited to that page
  const sourceOf = (statuses: NuclearUnitStatus[]) => {
    const us = p.units.filter((u) => statuses.includes(u.status));
    const added = us.length > 0 && us.every((u) => !u.iaea && u.changed?.sources[0]);
    return added ? { label: 'Reactor Atlas', url: us[0]!.changed!.sources[0] } : base;
  };
  const facts = k.facts([
    k.fact(t('dz.pl.country'), k.cchip(p.iso3), { text: true }),
    k.fact(t('dz.pl.status'), L(NUCLEAR_UNIT[p.status]), { text: true }),
    inService ? k.fact(t('dz.pl.capacity'), mwOf(k, inService), { tipText: t('dz.pl.capacityTip'), source: sourceOf(['operating', 'suspended']) }) : null,
    p.count.building ? k.fact(t('dz.pl.buildingMw'), mwOf(k, p.mw.building), { source: sourceOf(['building']) }) : null,
    k.fact(t('dz.pl.units'), k.listJoin(ORDER.filter((s) => p.count[s]).map((s) => `${fmt.num(p.count[s])} ${L(NUCLEAR_UNIT[s])}`)), { text: true, wide: true }),
  ]);
  const rows = p.units.map((u) => (
    <tr key={u.name} className={`pl-${u.status}`}>
      <th scope="row"><bdi>{u.name}</bdi></th>
      <td>{L(NUCLEAR_UNIT[u.status])}{u.changed?.year ? <span className="dz-hum-y data">{u.changed.year}</span> : null}</td>
      <td><bdi>{[u.type, u.model].filter(Boolean).join(' · ')}</bdi></td>
      <td className="data">{u.mw ? fmt.num(u.mw) : '—'}</td>
      <td className="data">{u.from ?? ''}{u.to ? `–${u.to}` : ''}</td>
    </tr>
  ));
  const changed = [...new Set(p.units.flatMap((u) => u.changed?.sources ?? []))];
  const conflicts = (p.conflictIds ?? []).map((id) => db.conflictById.get(id) as ConflictX | undefined).filter((c) => !!c);
  return <>
    {k.sec(null, facts, { cls: 'first' })}
    {p.note ? k.sec(t('dz.pl.note'), [k.prose(L(p.note), { clamp: false }), p.sources?.length ? k.provenance(p) : null]) : null}
    {conflicts.length ? k.sec(t('dz.pl.conflicts'), <div className="chips dz-chips">{conflicts.map((c) => k.kchip('conflict', c.id, L(c.name), { lead: k.sevGlyph(c.severity, 11), isos: c.countries }))}</div>) : null}
    {k.sec(t('dz.pl.unitsTitle'), [
      <div className="dz-hum-wrap" key="t">
        <table className="dz-hum dz-units">
          <thead><tr><th scope="col">{t('dz.pl.unit')}</th><th scope="col">{t('dz.pl.status')}</th><th scope="col">{t('dz.pl.type')}</th><th scope="col">{t('dz.pl.mw')}</th><th scope="col">{t('dz.pl.years')}</th></tr></thead>
          <tbody>{rows}</tbody>
        </table>
      </div>,
      <p className="dz-pv" key="s">
        <span className="dz-pv-s">{t('dz.pv.sources')}{' '}
          <a href={src.base.url} target="_blank" rel="noopener">{`${src.base.name} ${src.base.version} (${src.base.license})`}<Icon name="external" size={11} /></a>
          {changed.map((u) => <span key={u}>{' · '}<a href={u} target="_blank" rel="noopener">{hostOf(u)}<Icon name="external" size={11} /></a></span>)}
        </span>
      </p>,
      k.note(t('dz.pl.unitsNote', { d: fmt.date(src.base.date) })),
    ], { count: p.units.length })}
  </>;
}
