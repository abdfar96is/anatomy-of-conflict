// LNG terminal dossier (Global Energy Monitor): import or export, status, capacity in service and under
// construction, units, years, owner and the tracker with its licence and citation.

import { STATUS_LABEL, fmtMtpa, getEnergy, wikiUrl, type Energy, type LngTerminal } from '../../../data/energy';
import { Icon } from '../../../ui/Icon';
import type { Panel } from '../model';
import type { Kit } from '../parts';
import '../../pipelines/strings';
import '../../map/engine/scene';

export function lngPanel(id: string, k: Kit): Panel | null {
  const E = getEnergy();
  const x = E?.lngById.get(id);
  if (!E || !x) return null;
  const { t, pick: L } = k;
  return {
    head: {
      region: t('pp.dz.lngRegion', { c: x.iso3 ? k.nameC(x.iso3) : '—' }),
      title: x.name,
      plate: [k.coord(x.coords)],
      badges: [<span key="s" className={`pill dz-pill pp-${x.status}`}>{L(STATUS_LABEL[x.status])}</span>],
    },
    tabs: [{ id: 'main', render: () => body(E, x, k) }],
  };
}

function body(E: Energy, x: LngTerminal, k: Kit) {
  const { t, pick: L, fmt, lang } = k;
  const src = E.meta.sources.lng;
  const facts = k.facts([
    x.iso3 ? k.fact(t('pp.dz.location'), <>{k.cchip(x.iso3)}{x.location ? <bdi className="dz-alt">{` ${x.location}`}</bdi> : null}</>, { text: true, wide: true }) : null,
    k.fact(t('pp.dz.lngType'), t('map.tip.pp.lng.' + x.type), { text: true }),
    k.fact(t('pp.dz.status'), L(STATUS_LABEL[x.status]), { text: true }),
    x.mtpa.operating ? k.fact(t('pp.dz.lngOp'), k.numUnit(fmtMtpa(x.mtpa.operating, lang))) : null,
    x.mtpa.construction ? k.fact(t('pp.dz.lngCon'), k.numUnit(fmtMtpa(x.mtpa.construction, lang))) : null,
    k.fact(t('pp.dz.units'), <span className="data">{fmt.num(x.units)}</span>),
    x.year ? k.fact(t('pp.dz.started'), <span className="data">{x.year}</span>) : null,
    x.yearPlanned ? k.fact(t('pp.dz.planned'), <span className="data">{x.yearPlanned}</span>) : null,
    x.floating ? k.fact(t('pp.dz.floating'), '✓', { text: true }) : null,
    x.owner ? k.fact(t('pp.dz.owner'), <bdi>{x.owner}</bdi>, { text: true, wide: true }) : null,
  ]);
  const wiki = wikiUrl(E, x.wiki);
  return <>
    {k.sec(null, [facts, x.approximate ? k.note(t('pp.dz.approx')) : null, k.note(t('pp.dz.lngNote'))], { cls: 'first' })}
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
