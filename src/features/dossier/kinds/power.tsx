// Power plant dossier (Global Energy Monitor's integrated power tracker): type, status and capacity from the map file
// at once; capacity by status and type, technology, fuel, years, owner and the rest once the state's detail file is
// in; and the tracker with its licence and citation.

import { atlas } from '../../../app/store';
import { POWER_LABEL, POWER_PICTO, POWER_STATUS_LABEL, fmtMW, fuelText, getPower, plantDetail, techText, type Power, type PowerDetail, type PowerPlant } from '../../../data/power';
import { Icon } from '../../../ui/Icon';
import { Picto } from '../../../ui/Picto';
import { powerVar } from '../../map/engine/scene';
import { OwnerButton } from '../../power/owner';
import type { Panel } from '../model';
import type { Kit } from '../parts';
import '../../power/strings';

export function powerPanel(id: string, k: Kit): Panel | null {
  const W = getPower();
  const p = W?.byId.get(id);
  if (!W || !p) return null;
  const { pick: L, lang } = k;
  const title = lang === 'ar' && p.nameAr ? p.nameAr : p.name;
  return {
    head: {
      region: [L(POWER_LABEL[p.type]), p.iso3 ? k.nameC(p.iso3) : ''].filter(Boolean).join(' · '),
      title,
      plate: [title !== p.name ? <bdi key="n" className="dz-alt" lang="en">{p.name}</bdi> : null, k.coord(p.coords)],
      badges: [<span key="s" className={`pill dz-pill pp-${p.status}`}>{L(POWER_STATUS_LABEL[p.status])}</span>],
    },
    tabs: [{ id: 'main', render: () => body(W, p, plantDetail(p), k) }],
  };
}

function body(W: Power, p: PowerPlant, d: PowerDetail | null | undefined, k: Kit) {
  const { t, pick: L, fmt, lang } = k;
  const src = W.meta.source;
  const mw = (v: number) => k.numUnit(fmtMW(v, lang));
  const typeFact = k.fact(t('pw.dz.type'), <><Picto id={POWER_PICTO[p.type]} color={powerVar(p.type)} size={15} />{' '}{L(POWER_LABEL[p.type])}</>, { text: true });
  const statusFact = k.fact(t('pw.dz.status'), L(POWER_STATUS_LABEL[p.status]), { text: true });
  // a nuclear station: its file in the Nuclear lens (plants there list their GEM entries)
  const np = p.type === 'nuclear' ? k.db.nuclear.plants.find((x) => x.gem?.includes(p.id)) : undefined;
  const nuclear = np ? k.sec(t('pw.dz.nuclear'), (
    <button type="button" className="btn dz-wide-btn" data-act="nuclear" onClick={() => { atlas.set({ lens: 'nuclear' }); atlas.setFilter('nuclearMode', 'civil'); atlas.select('plant', np.id); }}>
      <Icon name="atom" size={16} /><span>{t('pw.dz.nuclearOpen', { n: L(np) })}</span>
    </button>
  )) : null;
  const source = k.sec(t('pw.dz.source'), [
    <p className="dz-pv" key="s"><span className="dz-pv-s">
      <a href={src.url} target="_blank" rel="noopener">{`${src.publisher} — ${src.name}`}<Icon name="external" size={11} /></a>{' · '}
      <a href={src.licenseUrl} target="_blank" rel="noopener">{src.license}<Icon name="external" size={11} /></a>
      {d && d.w !== '' ? <>{' · '}<a href={W.meta.wiki + (d.w ?? p.name.replace(/ /g, '_'))} target="_blank" rel="noopener">{t('pw.dz.wiki')}<Icon name="external" size={11} /></a></> : null}
    </span></p>,
    k.note(t('pw.dz.capNote')),
    k.note(`${t('pw.dz.cite')}: ${src.citation}`),
  ]);
  if (!d) {
    // the state's detail file is loading (or failed): what the map knows, meanwhile
    return <>
      {k.sec(null, [k.facts([typeFact, statusFact, k.fact(t('pw.dz.capacity'), mw(p.mw))]), k.note(t(d === null ? 'pw.dz.noDetail' : 'pw.dz.loading'))], { cls: 'first' })}
      {p.iso3 ? k.sec(t('pw.dz.location'), k.cchips([p.iso3])) : null}
      {nuclear}
      {source}
    </>;
  }
  const facts = k.facts([
    typeFact, statusFact,
    d.op ? k.fact(t('pw.dz.op'), mw(d.op)) : null,
    d.con ? k.fact(t('pw.dz.con'), mw(d.con)) : null,
    d.mb ? k.fact(t('pw.dz.mb'), mw(d.mb)) : null,
    d.ret ? k.fact(t('pw.dz.ret'), mw(d.ret)) : null,
    k.fact(t('pw.dz.units'), <span className="data">{fmt.num(d.u)}</span>),
    d.y ? k.fact(t('pw.dz.start'), <span className="data">{d.y}</span>) : null,
    d.yc ? k.fact(t('pw.dz.expected'), <span className="data">{d.yc}</span>) : null,
    d.ry ? k.fact(t(p.status === 'retired' ? 'pw.dz.retired' : 'pw.dz.retire'), <span className="data">{d.ry}</span>) : null,
    d.tech ? k.fact(t('pw.dz.tech'), <bdi>{techText(d.tech, lang)}</bdi>, { text: true }) : null,
    d.fuel ? k.fact(t('pw.dz.fuel'), <bdi>{fuelText(d.fuel, lang)}</bdi>, { text: true, wide: true }) : null,
    d.riv ? k.fact(t('pw.dz.river'), <bdi lang="en">{d.riv}</bdi>, { text: true }) : null,
    d.o ? k.fact(t('pw.dz.owner'), <bdi>{d.o}</bdi>, { text: true, wide: true }) : null,
    d.par ? k.fact(t('pw.dz.parent'), <bdi>{d.par}</bdi>, { text: true, wide: true }) : null,
  ]);
  const mix = d.mix ? k.facts(d.mix.map(([ty, v]) => k.fact(L(POWER_LABEL[ty]), mw(v)))) : null;
  return <>
    {k.sec(null, [
      facts,
      d.chp ? k.note(t('pw.dz.chp')) : null,
      d.ccs ? k.note(t('pw.dz.ccs')) : null,
      d.cap ? k.note(t('pw.dz.captive', { v: d.cap })) : null,
      d.approx ? k.note(t('pw.dz.approx')) : null,
    ], { cls: 'first' })}
    {p.owner ? k.sec(null, <OwnerButton owner={p.owner} />) : null}
    {mix ? k.sec(t('pw.dz.mix'), mix) : null}
    {p.iso3 ? k.sec(t('pw.dz.location'), [k.cchips(d.c ? d.c.split(',') : [p.iso3]), d.sub ? <p className="dz-note" key="sub"><bdi>{d.sub}</bdi></p> : null]) : null}
    {nuclear}
    {source}
  </>;
}
