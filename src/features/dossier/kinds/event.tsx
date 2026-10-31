// Timeline event dossier: category, summary, states, related conflicts, set-year and previous/next navigation.

import { Icon } from '../../../ui/Icon';
import type { CatX, ConflictX, EventX, Panel } from '../model';
import type { Kit } from '../parts';

export function eventPanel(id: string, k: Kit): Panel | null {
  const e = k.db.eventById.get(id) as EventX | undefined;
  if (!e) return null;
  const cat = e.cat?.[0] ? k.db.timeline.catById.get(e.cat[0]) as CatX | undefined : undefined;
  return {
    head: {
      region: cat ? k.pick(cat) : '', title: k.pick(e),
      plate: [k.altSpan(e), <bdi className="dz-when">{k.fmt.date(e.date)}</bdi>],
      badges: [k.unverifiedPill('event', e.id)],
    },
    tabs: [{ id: 'main', render: () => body(e, k) }],
  };
}

function body(e: EventX, k: Kit) {
  const { t, pick: L, pickKey: Lk, fmt, db } = k;
  const evs = db.timeline.events as EventX[];
  const i = evs.findIndex((x) => x.id === e.id);
  const prev = evs[i - 1], next = evs[i + 1];
  const conf = (e.conflictIds ?? []).map((cid) => db.conflictById.get(cid) as ConflictX | undefined).filter((c) => !!c);
  const nav = (x: EventX | undefined, dirKey: string, endKey: string, cls: string) => (x
    ? (
      <button type="button" className={`dz-pn-b ${cls}`} data-sel-kind="event" data-sel-id={x.id} data-hl={k.hl(x.countries)}>
        <span className="dz-pn-k"><Icon name="chevron" size={14} />{t(dirKey)}</span>
        <span className="dz-pn-t">{L(x)}</span><span className="dz-date">{fmt.date(x.date)}</span>
      </button>
    )
    : <p className={`dz-pn-b is-end ${cls}`}><span className="dz-pn-k">{t(endKey)}</span></p>);
  return <>
    {k.sec(t('dz.e.cats'), <div className="dz-cats lg">{(e.cat ?? []).map(k.catTag)}</div>, { cls: 'first' })}
    {k.sec(t('dz.e.summary'), k.prose(Lk(e, 'sum'), { clamp: false }))}
    {k.sec(t('dz.e.countries'), k.cchips(e.countries))}
    {conf.length ? k.sec(t('dz.e.conflicts'), k.rows(conf.map((cf) => k.conflictRow(cf))), { count: conf.length }) : null}
    {k.sec(null, [
      k.yearBtn(e.year),
      <nav className="dz-pn" aria-label={t('dz.kind.event')}>{nav(prev, 'dz.e.prev', 'dz.e.first', 'prev')}{nav(next, 'dz.e.next', 'dz.e.last', 'next')}</nav>,
    ])}
    {k.sec(null, k.caveat(L(db.timeline.boundaryLimitation)))}
  </>;
}
