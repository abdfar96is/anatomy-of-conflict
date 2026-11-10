// Oil and gas field dossier (Global Energy Monitor's extraction tracker): fuel, status, place, operator, latest
// production, reserves as GEM reports them, the key years; a project's units or a unit's project; and the tracker
// with its licence and citation.

import {
  FIELD_FUEL_LABEL, FIELD_STATUS_LABEL, M3_PER_BOE, getEnergy, splitFieldName, type Energy, type OilField,
} from '../../../data/energy';
import { Icon } from '../../../ui/Icon';
import { Picto } from '../../../ui/Picto';
import { fuelVar } from '../../map/engine/scene';
import { OwnerButton } from '../../power/owner';
import { ownerKey } from '../../../data/owner';
import type { Panel } from '../model';
import type { Kit } from '../parts';
import '../../pipelines/strings';

const RES_UNIT: Record<string, { ar: string; en: string }> = {
  'million bbl': { ar: 'مليون برميل', en: 'million barrels' },
  'million m³': { ar: 'مليون م³', en: 'million m³' },
  'million boe': { ar: 'مليون برميل مكافئ', en: 'million boe' },
};
const RES_FUEL: Record<string, string> = {
  gas: 'غاز', oil: 'نفط', hydrocarbons: 'هيدروكربونات', condensate: 'مكثّفات', NGL: 'سوائل الغاز', 'crude oil': 'نفط خام',
  'crude oil and condensate': 'نفط خام ومكثّفات', 'oil and condensate': 'نفط ومكثّفات', liquids: 'سوائل', 'associated gas': 'غاز مصاحب',
  'coal seam gas': 'غاز طبقات الفحم', 'coal bed methane': 'ميثان طبقات الفحم',
};
/** The commonest reserve classes in Arabic (by lower case); the rest stay as GEM gives them. */
const RES_CLASS: Record<string, string> = {
  reserves: 'احتياطي', 'remaining reserves': 'احتياطي متبقٍّ', '2p reserves': 'احتياطي مؤكد ومحتمل (2P)', '1p reserves': 'احتياطي مؤكد (1P)',
  '1p': 'احتياطي مؤكد (1P)', '3p reserves': 'احتياطي مؤكد ومحتمل وممكن (3P)', 'proved reserves': 'احتياطي مؤكد', 'proven reserves': 'احتياطي مؤكد',
  'remaining recoverable reserves': 'احتياطي متبقٍّ قابل للاستخراج', 'recoverable reserves': 'احتياطي قابل للاستخراج',
  'original oil in place': 'النفط الأصلي في المكمن', 'oil in place': 'النفط في المكمن', 'volume in place': 'الكمية في المكمن',
  'gas in place': 'الغاز في المكمن', 'original gas in place': 'الغاز الأصلي في المكمن', eur: 'الاستخلاص النهائي المقدّر (EUR)',
  'geological reserves': 'احتياطي جيولوجي', estimated: 'تقدير', 'estimated reserves': 'احتياطي مقدّر', resources: 'موارد',
  'recoverable resources': 'موارد قابلة للاستخراج', 'ultimate recoverable resources': 'الموارد القابلة للاستخراج في النهاية',
};

/** The unit's pictogram: a barrel or a flame by what it mostly produces, in its fuel colour. */
export const fieldGlyph = (x: OilField, size = 16) => (
  <Picto id={x.product === 'gas' ? 'flame' : 'barrel'} color={x.status === 'mothballed' ? 'var(--fg-3)' : fuelVar(x.product)} size={size} />
);

export function fieldPanel(id: string, k: Kit): Panel | null {
  const E = getEnergy();
  const x = E?.fieldById.get(id);
  if (!E || !x) return null;
  const { t, pick: L, lang } = k;
  const [en, place] = splitFieldName(x.name);
  const name = lang === 'ar' && x.nameAr ? x.nameAr : en;
  return {
    head: {
      region: [x.project ? t('pp.dz.fdProject') : '', x.countries.map(k.nameC).join(t('map.sep'))].filter(Boolean).join(' · '),
      title: name,
      plate: [name !== en ? <bdi key="n" className="dz-alt" lang="en">{en}</bdi> : null, place ? <bdi key="p" className="dz-alt" lang="en">{place}</bdi> : null, k.coord(x.coords)],
      badges: [<span key="s" className={`pill dz-pill pp-${x.status}`}>{L(FIELD_STATUS_LABEL[x.status])}</span>],
    },
    tabs: [{ id: 'main', render: () => body(E, x, k) }],
  };
}

function body(E: Energy, x: OilField, k: Kit) {
  const { t, pick: L, fmt, lang } = k;
  const src = E.meta.sources.goget;
  const n = (v: number) => fmt.num(v, v < 10 ? 2 : v < 100 ? 1 : 0);
  const swatches = x.fuel === 'oilgas' ? <>{k.sw(fuelVar('oil'))}{k.sw(fuelVar('gas'))}</> : k.sw(fuelVar(x.fuel));
  const r = x.reserves;
  const resUnit = r ? RES_UNIT[r.unit] : undefined;
  const resFuel = r ? (lang === 'ar' ? RES_FUEL[r.fuel] ?? r.fuel : r.fuel) : '';
  const facts = k.facts([
    k.fact(t('pp.dz.fuel'), <>{swatches}{L(FIELD_FUEL_LABEL[x.fuel])}</>, { text: true }),
    k.fact(t('pp.dz.status'), L(FIELD_STATUS_LABEL[x.status]), { text: true }),
    x.liquids ? k.fact(t('pp.dz.fdLiq'), k.numUnit(t('pp.dz.fdLiqV', { v: n(x.liquids) })), { year: x.year }) : null,
    x.gas ? k.fact(t('pp.dz.fdGas'), k.numUnit(t('pp.dz.fdGasV', { v: n(x.gas) })), { year: x.year }) : null,
    x.boe && x.liquids && x.gas ? k.fact(t('pp.dz.fdBoe'), k.numUnit(t('pp.dz.fdBoeV', { v: n(x.boe) })), { year: x.year, tipText: t('pp.dz.fdBoeTip', { m: fmt.num(M3_PER_BOE, 1) }) }) : null,
    r ? k.fact(t('pp.dz.fdReserves'), <>
      {k.numUnit(`${n(r.qty)} ${resUnit ? L(resUnit) : r.unit}`)}
      <bdi className="dz-alt" lang={lang === 'ar' && RES_FUEL[r.fuel] ? 'ar' : 'en'}>{` ${resFuel}`}</bdi>
      {' · '}{lang === 'ar' && RES_CLASS[r.cls.toLowerCase()] ? <span className="dz-alt">{RES_CLASS[r.cls.toLowerCase()]}</span> : <bdi className="dz-alt" lang="en">{r.cls}</bdi>}
    </>, { year: r.year, tipText: t('pp.dz.fdResTip'), wide: true }) : null,
    x.discovery ? k.fact(t('pp.dz.fdDisc'), <span className="data">{x.discovery}</span>) : null,
    x.fid ? k.fact(t('pp.dz.fdFid'), <span className="data">{x.fid}</span>) : null,
    x.start ? k.fact(t(x.status === 'construction' ? 'pp.dz.fdStartPlan' : 'pp.dz.fdStart'), <span className="data">{x.start}</span>) : null,
    x.offshore != null ? k.fact(t('pp.dz.fdShore'), t(x.offshore ? 'pp.dz.offshore' : 'pp.dz.onshore'), { text: true }) : null,
    x.basin ? k.fact(t('pp.dz.fdBasin'), <bdi>{x.basin}</bdi>, { text: true }) : null,
    x.operator ? k.fact(t('pp.dz.fdOp'), <bdi>{x.operator}</bdi>, { text: true, wide: true }) : null,
  ]);
  const notes = [
    !x.liquids && !x.gas ? k.note(x.year ? t('pp.dz.fdZero', { y: x.year }) : t('pp.dz.fdNoProd')) : null,
    x.unconventional ? k.note(t('pp.dz.fdUnc')) : null,
    x.approximate ? k.note(t('pp.dz.approx')) : null,
    x.project ? k.note(t('pp.dz.fdProjNote')) : null,
  ];
  const row = (o: OilField) => k.rowBtn({
    kind: 'field', id: o.id, isos: o.countries, glyph: fieldGlyph(o, 15), title: <bdi lang="en">{splitFieldName(o.name)[0]}</bdi>,
    sub: <span className="dz-one">{L(FIELD_STATUS_LABEL[o.status])}{o.boe ? <>{' · '}{k.numUnit(t('pp.dz.fdBoeV', { v: n(o.boe) }))}</> : null}</span>,
  });
  const units = x.units.map((id) => E.fieldById.get(id)).filter((o): o is OilField => !!o).sort((a, b) => (b.boe ?? 0) - (a.boe ?? 0));
  const parent = x.parent ? E.fieldById.get(x.parent) : undefined;
  const wiki = x.wiki ? E.meta.wiki + x.wiki : null;
  return <>
    {k.sec(null, [facts, ...notes], { cls: 'first' })}
    {k.sec(null, <OwnerButton owner={ownerKey(x.operator)} />)}
    {x.countries.length ? k.sec(t('pp.dz.location'), k.cchips(x.countries)) : null}
    {parent ? k.sec(t('pp.dz.fdParent'), k.rows([row(parent)])) : null}
    {units.length ? k.sec(t('pp.dz.fdUnits'), k.rows(units.map(row)), { count: units.length }) : null}
    {k.sec(t('pp.dz.source'), [
      <p className="dz-pv" key="s"><span className="dz-pv-s">
        <a href={src.url} target="_blank" rel="noopener">{`${src.publisher} — ${src.name}`}<Icon name="external" size={11} /></a>{' · '}
        <a href={src.licenseUrl} target="_blank" rel="noopener">{src.license}<Icon name="external" size={11} /></a>
        {wiki ? <>{' · '}<a href={wiki} target="_blank" rel="noopener">{t('pp.dz.fdWiki')}<Icon name="external" size={11} /></a></> : null}
      </span></p>,
      k.note(t('pp.dz.fdSrcNote')),
      k.note(`${t('pp.dz.cite')}: ${src.citation}`),
    ])}
  </>;
}
