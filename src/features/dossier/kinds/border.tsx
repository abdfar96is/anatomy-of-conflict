// Historical unit dossier (CShapes 2.0): status and ruler, capital, period, today's states on its territory,
// the unit's other periods (each sets the borders timeline to its start) and the source with its licence.

import { atlas as store } from '../../../app/store';
import { getBorders, rulerColor, rulerName, statusLabel, successors, unitName, within, yearEnd, type BorderUnit, type Borders } from '../../../data/borders';
import { Icon } from '../../../ui/Icon';
import type { Panel } from '../model';
import type { Kit } from '../parts';
import '../../borders/strings';

export function borderPanel(id: string, k: Kit): Panel | null {
  const B = getBorders();
  const u = B?.byId.get(id);
  if (!B || !u) return null;
  const { pick: L, lang } = k;
  const other = lang === 'ar' ? 'en' : 'ar';
  // names follow the year the timeline shows, kept inside the unit's own period
  const at = within(u, yearEnd(store.get().filters.bordersYear));
  const status = u.status === 'independent' ? L(statusLabel(u.status)) : `${L(statusLabel(u.status))} · ${rulerName(B, u, lang, at)}`;
  return {
    head: {
      region: status,
      title: unitName(B, u, lang, at),
      plate: [<bdi key="o" className="dz-alt" lang={other}>{unitName(B, u, other, at)}</bdi>, k.coord(u.capLL)],
      badges: [],
    },
    tabs: [{ id: 'main', render: () => body(B, u, k, at) }],
  };
}

function body(B: Borders, u: BorderUnit, k: Kit, at: string) {
  const { t, pick: L, fmt, lang, db } = k;
  const color = rulerColor(B, u);
  const facts = k.facts([
    k.fact(t('bd.dz.status'), L(statusLabel(u.status)), { text: true }),
    u.status !== 'independent' ? k.fact(t('bd.dz.ruler'), <>{color ? k.sw(color) : null}{rulerName(B, u, lang, at)}</>, { text: true }) : null,
    u.capital ? k.fact(t('bd.dz.capital'), u.capital, { text: true }) : null,
    k.fact(t('bd.dz.period'), `${fmt.date(u.start)} – ${fmt.date(u.end)}`, { text: true, wide: true }),
  ]);
  const periods = B.units.filter((o) => o.gw === u.gw).sort((a, b) => a.start.localeCompare(b.start));
  const today = successors(u, db);
  return <>
    {k.sec(null, [facts, u.defined ? null : k.note(t('bd.dz.undefined'))], { cls: 'first' })}
    {today.length ? k.sec(t('bd.dz.today'), [k.cchips(today, { sort: true }), k.note(t('bd.dz.todayNote'))], { count: today.length }) : null}
    {periods.length > 1 ? k.sec(t('bd.dz.periods'), (
      <ol className="dz-tl" role="list">
        {periods.map((o) => (
          <li key={o.id}>
            <button type="button" className={`dz-tl-item${o.id === u.id ? ' is-sel' : ''}`} aria-current={o.id === u.id ? 'true' : undefined}
              onClick={() => { store.setFilter('bordersYear', Number(o.start.slice(0, 4))); store.select('border', o.id, { fly: false }); }}>
              <span className="dz-date">{`${o.start.slice(0, 4)}–${o.end.slice(0, 4)}`}</span>
              <span className="dz-tl-t">{o.status === 'independent' ? L(statusLabel(o.status)) : `${L(statusLabel(o.status))} · ${rulerName(B, o, lang)}`}{o.gw === u.gw && unitName(B, o, lang) !== unitName(B, u, lang, at) ? ` · ${unitName(B, o, lang)}` : ''}</span>
            </button>
          </li>
        ))}
      </ol>
    ), { count: periods.length }) : null}
    {k.sec(t('bd.dz.source'), [
      <p className="dz-pv" key="s"><span className="dz-pv-s">
        <a href={B.meta.source.url} target="_blank" rel="noopener">{B.meta.source.name}<Icon name="external" size={11} /></a>{' · '}
        <a href={B.meta.source.licenseUrl} target="_blank" rel="noopener">{B.meta.source.license}<Icon name="external" size={11} /></a>
      </span></p>,
      k.note(`${t('bd.dz.cite')}: ${B.meta.source.citation}`),
    ])}
  </>;
}
