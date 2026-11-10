// Industrial site dossier (Global Energy Monitor's mine and heavy industry trackers): layer, status, capacity and
// output in the layer's unit, owner and parent, years, and what each tracker adds (coal type and methane for coal
// mines, port and cargo for terminals, equipment for steel, kilns for cement, products for chemicals); and the tracker
// with its licence and citation.

import { INDUSTRY_STATUS_LABEL, LAYER, LAYER_ONE, fmtTonnes, getIndustry, termText, type Facility, type Industry } from '../../../data/industry';
import { Icon } from '../../../ui/Icon';
import { Picto } from '../../../ui/Picto';
import { layerVar } from '../../map/engine/scene';
import type { Panel } from '../model';
import type { Kit } from '../parts';
import '../../power/strings';

export function facilityPanel(id: string, k: Kit): Panel | null {
  const X = getIndustry();
  const x = X?.byId.get(id);
  if (!X || !x) return null;
  const { pick: L, lang } = k;
  const title = lang === 'ar' && x.ar ? x.ar : x.n;
  return {
    head: {
      region: [L(LAYER_ONE[x.l]), x.c ? k.nameC(x.c) : ''].filter(Boolean).join(' · '),
      title,
      plate: [title !== x.n ? <bdi key="n" className="dz-alt" lang="en">{x.n}</bdi> : null, k.coord([x.lon, x.lat])],
      badges: [<span key="s" className={`pill dz-pill pp-${x.st}`}>{L(INDUSTRY_STATUS_LABEL[x.st])}</span>],
    },
    tabs: [{ id: 'main', render: () => body(X, x, k) }],
  };
}

function body(X: Industry, x: Facility, k: Kit) {
  const { t, pick: L, fmt, lang } = k;
  const src = X.meta.sources[x.l];
  const tonnes = (v: number) => k.numUnit(fmtTonnes(x, v, lang));
  const stock = (v: number, unit: 'mt' | 'kt') => k.numUnit(t('in.dz.' + unit, { v: fmt.num(v, v < 10 ? 2 : v < 100 ? 1 : 0) }));
  const txt = (label: string, v: string | undefined, wide = false) => (v ? k.fact(t(label), <bdi>{v}</bdi>, { text: true, wide }) : null);
  const term = (label: string, v: string | undefined, wide = false) => txt(label, v ? termText(v, lang) : v, wide);
  const layer = k.fact(t('in.dz.layer'), <><Picto id={LAYER[x.l].picto} color={layerVar(x.l)} size={15} />{' '}{L(LAYER_ONE[x.l])}</>, { text: true });
  const per: (ReturnType<typeof k.fact> | null)[] = [];
  if (x.l === 'cm') per.push(
    term('in.dz.mineType', x.mt), term('in.dz.coalType', x.ct),
    x.res ? k.fact(t('in.dz.reserves'), stock(x.res, 'mt')) : null,
    x.ch4 ? k.fact(t('in.dz.methane'), k.numUnit(t('in.dz.ch4', { v: fmt.num(x.ch4, x.ch4 < 0.1 ? 3 : 2) }))) : null,
    x.wf ? k.fact(t('in.dz.workforce'), <span className="data">{fmt.num(x.wf)}</span>) : null,
    txt('in.dz.coalfield', x.cf), term('in.dz.dest', x.dest),
  );
  if (x.l === 'ct') per.push(txt('in.dz.port', x.port, true), term('in.dz.termType', x.tt), term('in.dz.product', x.pt), txt('in.dz.source', x.src, true));
  if (x.l === 'io') per.push(x.res ? k.fact(t('in.dz.reserves'), stock(x.res, 'kt')) : null);
  if (x.l === 'st') per.push(
    x.iron ? k.fact(t('in.dz.iron'), tonnes(x.iron)) : null, term('in.dz.equipment', x.eq), term('in.dz.products', x.prd, true),
    x.wf ? k.fact(t('in.dz.workforce'), <span className="data">{fmt.num(x.wf)}</span>) : null,
  );
  if (x.l === 'ce') per.push(
    x.clk ? k.fact(t('in.dz.clinker'), tonnes(x.clk)) : null, term('in.dz.plantType', x.pt),
    x.kil != null ? k.fact(t('in.dz.kilns'), <span className="data">{fmt.num(x.kil)}</span>) : null,
  );
  if (x.l === 'ch') per.push(term('in.dz.products', x.prd, true), term('in.dz.feedstock', x.fs, true), term('in.dz.plantType', x.pt));
  const facts = k.facts([
    layer,
    k.fact(t('in.dz.status'), L(INDUSTRY_STATUS_LABEL[x.st]), { text: true }),
    x.cap ? k.fact(t('in.dz.cap'), tonnes(x.cap)) : null,
    x.capc ? k.fact(t('in.dz.capc'), tonnes(x.capc)) : null,
    x.prod ? k.fact(t('in.dz.prod'), tonnes(x.prod), { year: x.py }) : null,
    x.y ? k.fact(t('in.dz.start'), <span className="data">{x.y}</span>) : null,
    ...per,
    txt('in.dz.owner', x.o, true), x.par && x.par !== x.o ? txt('in.dz.parent', x.par, true) : null,
  ]);
  const wiki = x.w === '' ? null : X.meta.wiki + (x.w ?? x.n.replace(/ /g, '_'));
  return <>
    {k.sec(null, [facts, x.ccs ? k.note(t('in.dz.ccs')) : null, x.approx ? k.note(t('in.dz.approx')) : null], { cls: 'first' })}
    {x.pc && x.pc.length > 1 ? k.sec(t('in.dz.byProduct'), k.facts(x.pc.map(([p, v]) => k.fact(termText(p, lang), tonnes(v))))) : null}
    {x.c ? k.sec(t('in.dz.location'), [k.cchips([x.c]), x.sub ? <p className="dz-note" key="sub"><bdi>{x.sub}</bdi></p> : null]) : null}
    {k.sec(t('in.dz.src'), [
      <p className="dz-pv" key="s"><span className="dz-pv-s">
        <a href={src.url} target="_blank" rel="noopener">{`${src.publisher} — ${src.name}`}<Icon name="external" size={11} /></a>{' · '}
        <a href={src.licenseUrl} target="_blank" rel="noopener">{src.license}<Icon name="external" size={11} /></a>
        {wiki ? <>{' · '}<a href={wiki} target="_blank" rel="noopener">{t('in.dz.wiki')}<Icon name="external" size={11} /></a></> : null}
      </span></p>,
      k.note(t('in.dz.unitNote')),
      k.note(`${t('in.dz.cite')}: ${src.citation}`),
    ])}
  </>;
}
