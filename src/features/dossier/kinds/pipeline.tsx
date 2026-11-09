// Pipeline segment dossier (Global Energy Monitor): fuel, status, capacity, length, route and owner; the states on
// the route; a sourced note with its chokepoints and conflicts for the strategic lines; the other segments of the
// same line; and the tracker with its licence and citation.

import {
  ACCURACY_LABEL, FUEL_LABEL, STATUS_LABEL, fmtCapacity, getEnergy, pipeName, wikiUrl, type Energy, type Pipeline,
} from '../../../data/energy';
import { Icon } from '../../../ui/Icon';
import { fuelVar } from '../../map/engine/scene';
import type { ChokeX, ConflictX, Panel } from '../model';
import type { Kit } from '../parts';
import '../../pipelines/strings';

export function pipelinePanel(id: string, k: Kit): Panel | null {
  const E = getEnergy();
  const p = E?.byId.get(id);
  if (!E || !p) return null;
  const { t, pick: L, lang } = k;
  const other = lang === 'ar' ? 'en' : 'ar';
  const alt = pipeName(E, p, other);
  const title = pipeName(E, p, lang);
  return {
    head: {
      region: t('pp.dz.region', { f: L(FUEL_LABEL[p.fuel]) }),
      title,
      plate: [alt !== title ? <bdi key="o" className="dz-alt" lang={other}>{alt}</bdi> : null, p.segment ? <bdi key="s" className="dz-alt">{p.segment}</bdi> : null],
      badges: [<span key="s" className={`pill dz-pill pp-${p.status}`}>{L(STATUS_LABEL[p.status])}</span>],
    },
    tabs: [{ id: 'main', render: () => body(E, p, k) }],
  };
}

function body(E: Energy, p: Pipeline, k: Kit) {
  const { t, pick: L, fmt, lang, db } = k;
  const src = p.fuel === 'gas' ? E.meta.sources.ggit : E.meta.sources.goit;
  const cap = fmtCapacity(p, lang);
  const route = p.from && p.to ? t('pp.dz.ends', { a: p.from, b: p.to }) : p.from ? t('pp.dz.from', { a: p.from }) : p.to ? t('pp.dz.to', { b: p.to }) : '';
  const facts = k.facts([
    k.fact(t('pp.dz.fuel'), <>{k.sw(fuelVar(p.fuel))}{L(FUEL_LABEL[p.fuel])}</>, { text: true }),
    k.fact(t('pp.dz.status'), L(STATUS_LABEL[p.status]), { text: true }),
    cap ? k.fact(t('pp.dz.capacity'), k.numUnit(cap), { tipText: t('pp.dz.capTip') }) : null,
    p.km ? k.fact(t('pp.dz.length'), k.numUnit(`${fmt.num(p.km)} ${t('pp.dz.km')}`)) : null,
    p.year ? k.fact(t(p.status === 'operating' ? 'pp.dz.start' : 'pp.dz.expected'), <span className="data">{p.year}</span>) : null,
    p.diameter ? k.fact(t('pp.dz.diameter'), <bdi>{lang === 'ar' ? p.diameter.replace(/ in$/, ' بوصة').replace(/ mm$/, ' ملم').replace(/, /g, '، ') : p.diameter}</bdi>, { text: true }) : null,
    p.owner ? k.fact(t('pp.dz.owner'), <bdi>{p.owner}</bdi>, { text: true, wide: true }) : null,
    route ? k.fact(t('pp.dz.route'), <bdi>{route}</bdi>, { text: true, wide: true }) : null,
    k.fact(t('pp.dz.accuracy'), L(ACCURACY_LABEL[p.accuracy]), { text: true, wide: true }),
  ]);
  const note = E.noteOf.get(p.system);
  const chokes = (note?.chokepoints ?? []).map((id) => db.chokeById.get(id) as ChokeX | undefined).filter((x) => !!x);
  const conflicts = (note?.conflicts ?? []).map((id) => db.conflictById.get(id) as ConflictX | undefined).filter((x) => !!x);
  const segs = (E.bySystem.get(p.system) ?? []).slice().sort((a, b) => (b.km ?? 0) - (a.km ?? 0));
  const wiki = wikiUrl(E, p.wiki);
  return <>
    {k.sec(null, facts, { cls: 'first' })}
    {p.countries.length ? k.sec(t('pp.dz.countries'), k.cchips(p.countries), { count: p.countries.length }) : null}
    {note ? k.sec(t('pp.dz.about'), [
      k.prose(L(note), { clamp: false }),
      <p className="dz-pv" key="pv">
        {note.verified ? <span className="dz-pv-m">{t('pp.dz.verified', { d: fmt.date(note.verified) })}</span> : null}
        <span className="dz-pv-s">{t('dz.pv.sources')}{' '}{note.sources.map((s, i) => (
          <span key={s.url}>{i ? ' · ' : ''}<a href={s.url} target="_blank" rel="noopener">{s.title}<Icon name="external" size={11} /></a></span>
        ))}</span>
      </p>,
    ]) : null}
    {chokes.length ? k.sec(t('pp.dz.chokes'), k.rows(chokes.map(k.chokeRow))) : null}
    {conflicts.length ? k.sec(t('pp.dz.conflicts'), <div className="chips dz-chips">{conflicts.map((c) => k.kchip('conflict', c.id, L(c.name), { lead: k.sevGlyph(c.severity, 11), isos: c.countries }))}</div>) : null}
    {segs.length > 1 ? k.sec(t('pp.dz.system'), (
      <ol className="dz-tl" role="list">
        {segs.map((o) => (
          <li key={o.id}>
            <button type="button" className={`dz-tl-item${o.id === p.id ? ' is-sel' : ''}`} aria-current={o.id === p.id ? 'true' : undefined} data-sel-kind="pipeline" data-sel-id={o.id}>
              <span className="dz-date">{o.km ? `${fmt.num(o.km)} ${t('pp.dz.km')}` : '—'}</span>
              <span className="dz-tl-t"><bdi>{o.segment || pipeName(E, o, lang)}</bdi>{` · ${L(STATUS_LABEL[o.status])}`}{fmtCapacity(o, lang) ? ` · ${fmtCapacity(o, lang)}` : ''}</span>
            </button>
          </li>
        ))}
      </ol>
    ), { count: segs.length }) : null}
    {k.sec(t('pp.dz.source'), [
      <p className="dz-pv" key="s"><span className="dz-pv-s">
        <a href={src.url} target="_blank" rel="noopener">{`${src.publisher} — ${src.name}`}<Icon name="external" size={11} /></a>{' · '}
        <a href={src.licenseUrl} target="_blank" rel="noopener">{src.license}<Icon name="external" size={11} /></a>
        {wiki ? <>{' · '}<a href={wiki} target="_blank" rel="noopener">{t('pp.dz.wiki')}<Icon name="external" size={11} /></a></> : null}
      </span></p>,
      k.note(`${t('pp.dz.cite')}: ${src.citation}`),
    ])}
  </>;
}
