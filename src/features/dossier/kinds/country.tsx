// Country dossier: summary, religion, peoples, conflicts, relations, resources and history tabs.

import { Fragment, type ReactNode } from 'react';
import { NUCLEAR_CIVIL, NUCLEAR_NPT, NUCLEAR_STATUS } from '../../../config';
import { BarList, Donut, Pips, StackBar } from '../../../ui/charts';
import { POWER_LABEL, POWER_TYPES, fmtMW, powerCountries } from '../../../data/power';
import { powerVar } from '../../map/engine/scene';
import '../../power/strings';
import { esc } from '../../../ui/dom';
import { Icon } from '../../../ui/Icon';
import { edgeVar, traditionColor } from '../../../ui/palette';
import type { Bi } from '../../../i18n/format';
import type { Country } from '../../../data/types';
import { extPowers, pickList, type ConflictX, type EdgeX, type EventX, type IntelX, type Panel, type ResEntryX } from '../model';
import type { Kit } from '../parts';

const byRank = (a: ConflictX, b: ConflictX) => b.rank - a.rank;

export function countryPanel(id: string, k: Kit): Panel | null {
  const c = k.db.countries.get(id);
  if (!c) return null;
  const { t, fmt } = k;
  const worst = c.conflicts.map((x) => k.db.conflictById.get(x) as ConflictX | undefined).filter((x) => !!x).sort(byRank)[0];
  const maj = c.religion?.majority;
  return {
    head: {
      region: k.ne(c.subregion),
      title: k.pickKey(c, 'name'),
      plate: [k.altSpan(c), <span className="data">{c.iso3}</span>, k.coord([c.lon, c.lat])],
      badges: [
        worst && <span className="pill dz-pill" data-tip={esc(t('dz.b.worstTip'))}>{k.sevGlyph(worst.severity, 12)}{t('dz.b.worst', { s: k.sevName(worst.severity) })}</span>,
        maj && <span className="pill dz-pill">{k.sw(traditionColor(maj))}{k.tradName(maj)}{' '}<span className="data">{fmt.pct(c.religion?.majorityShare)}</span></span>,
        c.type && c.type !== 'Sovereign country' && <span className="pill">{k.ne(c.type)}</span>,
        k.unverifiedPill('country', c.iso3),
      ],
    },
    tabs: [
      { id: 'summary', label: t('dz.t.summary'), render: () => summary(c, k) },
      { id: 'religion', label: t('dz.t.religion'), count: c.religion ? null : 0, render: () => religion(c, k) },
      { id: 'peoples', label: t('dz.t.peoples'), count: c.groups.length, render: () => peoples(c, k) },
      { id: 'conflicts', label: t('dz.t.conflicts'), count: new Set([...c.conflicts, ...c.external]).size, render: () => conflicts(c, k) },
      { id: 'relations', label: t('dz.t.relations'), count: c.edges.length, render: () => relations(c, k) },
      { id: 'resources', label: t('dz.t.resources'), count: c.resources.length + c.sites.length + c.chokepoints.length, render: () => resources(c, k) },
      { id: 'history', label: t('dz.t.history'), count: c.events.length, render: () => history(c, k) },
    ],
  };
}

function summary(c: Country, k: Kit) {
  const { t, pick: L, fmt, db } = k;
  const intel = c.intel as IntelX | null;
  const money = (v: number) => k.numUnit(t('dz.u.usd', { v: fmt.num(v) }));
  const head = k.facts([
    k.stat(t('dz.f.pop'), 'pop', c, (v) => k.numUnit(fmt.compact(v))),
    k.stat(t('dz.f.gdp'), 'gdp', c, (v) => k.numUnit(fmt.gdp(v / 1e6))),
    k.stat(t('dz.f.gdppc'), 'gdpPc', c, money),
    k.fact(t('dz.f.area'), <><span className="data">{fmt.num(c.areaKm2)}</span>{' '}<span className="dz-unit">{t('dz.u.km2')}</span></>, { tipText: t('dz.f.areaTip') }),
    k.fact(t('dz.f.density'), c.density ? <><span className="data">{fmt.num(c.density, c.density < 10 ? 1 : 0)}</span>{' '}<span className="dz-unit">{t('dz.u.perKm2')}</span></> : '—'),
    k.fact(t('dz.f.income'), k.ne(c.income), { text: true }),
    k.fact(t('dz.f.economy'), k.ne(c.economy), { text: true }),
    k.fact(t('dz.f.type'), k.ne(c.type), { text: true }),
    k.fact(t('dz.f.region'), `${k.ne(c.continent)} · ${k.ne(c.subregion)}`, { text: true, wide: true }),
    intel?.system && k.fact(t('dz.f.system'), L(intel.system), { text: true, wide: true }),
    intel?.langs && k.fact(t('dz.f.langs'), k.listJoin(pickList(k, intel.langs)), { text: true, wide: true }),
  ]);

  const edges = c.edges.map((id) => db.edgeById.get(id)).filter((e) => !!e);
  const nAll = edges.filter((e) => e.type === 'alliance').length, nRiv = edges.filter((e) => e.type === 'rivalry').length;
  const blocs = c.blocs.filter((b) => db.relations.blocById.has(b));
  const cell = (ic: string, v: ReactNode, label: string, goto: string, anchor: string, zero: boolean) => (
    <button type="button" className={`dz-x${zero ? ' is-zero' : ''}`} data-act="goto" data-goto={goto} data-anchor={anchor || undefined} onClick={() => k.goto(goto, anchor || null)}>
      <span className="dz-x-v"><Icon name={ic} size={15} /><span className="data">{v}</span></span><span className="dz-x-l">{label}</span>
    </button>
  );
  const exposure = (
    <div className="dz-x-grid">
      {cell('flame', fmt.num(c.conflicts.length), t('dz.x.conflicts'), 'conflicts', '', !c.conflicts.length)}
      {cell('target', fmt.num(c.external.length), t('dz.x.external'), 'conflicts', 'external', !c.external.length)}
      {cell('network', <>{fmt.num(nAll)}<span className="dz-x-sep">·</span>{fmt.num(nRiv)}</>, t('dz.x.ties'), 'relations', '', !(nAll + nRiv))}
      {cell('layers', fmt.num(blocs.length), t('dz.x.blocs'), 'summary', 'blocs', !blocs.length)}
      {cell('anchor', fmt.num(c.chokepoints.length), t('dz.x.chokes'), 'resources', 'chokes', !c.chokepoints.length)}
      {cell('gem', fmt.num(c.resources.length), t('dz.x.res'), 'resources', 'entries', !c.resources.length)}
    </div>
  );

  const blocChips = blocs.length
    ? <div className="chips dz-chips">{blocs.map((id) => { const b = db.relations.blocById.get(id)!; return k.kchip('bloc', id, L(b), { isos: b.members }); })}</div>
    : k.empty(t('dz.s.noBlocs'));
  const neigh = c.neighbors.length ? [k.cchips(c.neighbors), k.note(t('dz.s.neighborsNote'))] : null;
  const disputedNE = c.disputed.map((id) => db.disputedById.get(id)).filter((d) => !!d);

  let intelPart;
  if (intel) {
    const seps = (intel.separatists ?? []).map(L), disp = (intel.disputes ?? []).map(L);
    intelPart = <>
      {k.sec(t('dz.s.separatists'), seps.length ? k.bullets(seps) : k.note(t('dz.s.noneRecorded')))}
      {k.sec(t('dz.s.disputes'), disp.length ? k.bullets(disp) : k.note(t('dz.s.noneRecorded')))}
    </>;
  } else {
    intelPart = k.sec(null, k.empty(t('dz.noIntel')));
  }

  return <>
    {k.sec(null, [head, k.note(db.live ? t('dz.f.note', { d: fmt.date(db.live.retrieved) }) : t('dz.f.noteBase'))], { cls: 'first' })}
    {humanitarian(c, k)}
    {nuclear(c, k)}
    {k.sec(t('dz.x.title'), exposure)}
    {k.sec(t('dz.s.blocs'), blocChips, { id: 'blocs', count: blocs.length })}
    {intelPart}
    {disputedNE.length ? k.sec(t('dz.s.neDisputed'), <div className="chips dz-chips">{disputedNE.map((d) => k.kchip('disputed', d.id, k.pickKey(d, 'name'), { lead: <Icon name="hatch" size={13} /> }))}</div>) : null}
    {k.sec(t('dz.s.neighbors'), neigh)}
  </>;
}

/** UCDP has no location for Palestine: battle deaths in Gaza are recorded under Israel (seen in the data). */
export const BATTLE_UNDER_ISRAEL = new Set(['ISR', 'PSE']);

/** Refugees, internal displacement and battle deaths from the open-data refresh, each with its year and source. */
function humanitarian(c: Country, k: Kit) {
  const { t, fmt, db } = k;
  if (!db.live) return k.sec(t('dz.hu.title'), k.note(t('dz.hu.pending')), { id: 'humanitarian' });
  const n = (v: number) => k.numUnit(fmt.compact(v));
  const none = (y: number | string) => t('dz.hu.noneTip', { y });
  const refTip = t('dz.hu.refTip');
  return k.sec(t('dz.hu.title'), [
    k.facts([
      k.stat(t('dz.hu.refOrigin'), 'refOrigin', c, n, { noneTip: none, tipText: refTip }),
      k.stat(t('dz.hu.refAsylum'), 'refAsylum', c, n, { noneTip: none, tipText: refTip }),
      k.stat(t('dz.hu.idps'), 'idps', c, n, { noneTip: none }),
      k.stat(t('dz.hu.battleDeaths'), 'battleDeaths', c, n, { noneTip: (y) => (c.iso3 === 'PSE' ? t('dz.hu.bdPse') : t('dz.hu.noneBattle', { y })) }),
    ]),
    k.figureNotes(c, { refOrigin: t('dz.hu.refOrigin'), refAsylum: t('dz.hu.refAsylum'), idps: t('dz.hu.idps'), battleDeaths: t('dz.hu.battleDeaths') }),
    BATTLE_UNDER_ISRAEL.has(c.iso3) ? k.caveat(t('dz.hu.bdPse')) : null,
    k.note(t('dz.hu.note')),
  ], { id: 'humanitarian' });
}

/** Nuclear profile (curated/nuclear.json): status, SIPRI warhead estimate, NPT, civil use, weapon-free zone, sources. */
function nuclear(c: Country, k: Kit) {
  const { t, pick: L, fmt, db } = k;
  const n = c.nuclear;
  const zones = n.zones.map((id) => db.nuclear.zoneById.get(id)).filter((z) => !!z);
  const plants = n.plants.map((id) => db.plantById.get(id)).filter((p) => !!p).sort((a, b) => (b.mw.operating + b.mw.suspended) - (a.mw.operating + a.mw.suspended));
  if (!n.weapons && !n.civil && !n.warheads && !zones.length && !n.plants.length && (!n.npt || n.npt === 'party')) return null;
  const w = db.nuclear.warheads, fl = db.nuclear.fleet;
  const host = n.host ? db.countries.get(n.host) : undefined;
  const facts = k.facts([
    k.fact(t('dz.nc.status'), n.weapons ? L(NUCLEAR_STATUS[n.weapons]) : t('dz.nc.noWeapons'), { text: true, wide: true }),
    n.warheads ? k.fact(t('dz.nc.warheads'), <span className="data">{fmt.num(n.warheads)}</span>, {
      year: w.year, tipText: L(w.metric), source: { label: w.publisher, url: w.sources[0], tip: L(w.metric) },
    }) : null,
    host ? k.fact(t('dz.nc.host'), k.cchip(host.iso3), { text: true }) : null,
    k.fact(t('dz.nc.npt'), n.npt ? L(NUCLEAR_NPT[n.npt]) : '—', { text: true }),
    k.fact(t('dz.nc.civil'), n.civil ? L(NUCLEAR_CIVIL[n.civil]) : t('dz.nc.noCivil'), { text: true }),
    ...(n.fleet && (n.fleet.reactors || n.fleet.building) ? [
      k.fact(t('dz.nc.fleet'), <span className="data">{fmt.num(n.fleet.reactors)}</span>, { year: fl.year, tipText: L(fl.note), source: { label: fl.publisher, url: fl.sources[0], tip: L(fl.note) } }),
      n.fleet.mwe ? k.fact(t('dz.nc.fleetMw'), <><span className="data">{fmt.num(n.fleet.mwe)}</span>{' '}<span className="dz-unit">{t('dz.pl.mw')}</span></>, { year: fl.year, source: { label: fl.publisher, url: fl.sources[0] } }) : null,
      k.fact(t('dz.nc.fleetBuilding'), <span className="data">{fmt.num(n.fleet.building)}</span>, { year: fl.year, source: { label: fl.publisher, url: fl.sources[0] } }),
    ] : []),
    zones.length ? k.fact(t('dz.nc.zone'), k.listJoin(zones.map((z) => `${L(z.treaty)} (${z.year})`)), { text: true, wide: true }) : null,
  ]);
  const record = db.raw.nuclear.countries[c.iso3];
  const zoneSources = [...new Set(zones.flatMap((z) => z.sources))];
  return k.sec(t('dz.nc.title'), [
    facts,
    n.note ? k.prose(L(n.note), { cls: 'sm', clamp: false }) : null,
    plants.length ? <div className="chips dz-chips" key="pl" aria-label={t('dz.nc.plants')}>{plants.map((p) => k.kchip('plant', p.id, L(p), { lead: <Icon name="atom" size={13} />, isos: [p.iso3] }))}</div> : null,
    record?.sources?.length ? k.provenance(record) : zoneSources.length ? k.provenance({ sources: zoneSources }) : null,
  ], { id: 'nuclear' });
}

function religion(c: Country, k: Kit) {
  const { t, pick: L, fmt, db } = k;
  const r = c.religion;
  if (!r) return <>{k.sec(null, k.empty(t('dz.rel.none')), { cls: 'first' })}{k.sec(t('dz.rel.method'), k.prose(L(db.religion.methodNote)))}</>;
  const parts = r.sorted.map(([tid, p]) => ({ label: k.tradName(tid), value: p, color: traditionColor(tid) }));
  const sum = parts.reduce((s, p) => s + p.value, 0);
  const side = k.facts([
    k.fact(t('dz.rel.majority'), <>{k.sw(traditionColor(r.majority ?? ''))}{k.tradName(r.majority)}</>, { text: true, wide: true }),
    k.fact(t('dz.rel.diversity'), <span className="data">{fmt.num(r.diversity, 2)}</span>, { tipText: t('dz.rel.diversityTip'), wide: true }),
    k.fact(t('dz.rel.source'), k.srcName(r.source ?? ''), { year: r.year, text: true, wide: true }),
  ]);
  const bars = parts.map((p) => ({ ...p, tip: `<b>${esc(p.label)}</b> ${esc(fmt.pct(p.value, p.value < 10 ? 1 : 0))}` }));
  return <>
    {k.sec(null, <div className="dz-donut">
      <Donut parts={parts} size={128} thickness={15} total={Math.max(100, sum)} label={t('dz.rel.title')} center={fmt.pct(r.majorityShare)} sub={k.tradName(r.majority)} />
      <div className="dz-donut-side">{side}</div>
    </div>, { cls: 'first' })}
    {r.contested ? k.sec(null, k.caveat(t('dz.rel.contested'))) : null}
    {k.sec(t('dz.rel.shares'), <BarList rows={bars} unit="%" max={100} />, { count: parts.length })}
    {r.note ? k.sec(t('dz.rel.note'), k.prose(L(r.note as Bi))) : null}
    {k.sec(t('dz.rel.method'), k.prose(L(db.religion.methodNote)))}
  </>;
}

function peoples(c: Country, k: Kit) {
  const { t, fmt, db } = k;
  const gs = c.groups.map((id) => db.ethnic.groups.get(id)).filter((g) => !!g);
  const warn = k.caveat(k.pickKey(db.ethnic.meta as object | null, 'warning'));
  if (!gs.length) return <>{k.sec(null, k.empty(t('dz.p.none', { n: fmt.num(db.stats.groups) })), { cls: 'first' })}{k.sec(null, warn)}</>;
  return <>{k.sec(t('dz.p.title'), k.rows(gs.map(k.groupRow)), { count: gs.length, cls: 'first' })}{k.sec(null, warn)}</>;
}

function conflicts(c: Country, k: Kit) {
  const { t, pick: L, fmt, db } = k;
  const get = (id: string) => db.conflictById.get(id) as ConflictX | undefined;
  const party = c.conflicts.map(get).filter((x) => !!x).sort(byRank);
  const ext = [...new Set(c.external)].map(get).filter((x) => !!x).sort(byRank);
  const extRows = ext.map((cf) => {
    const ep = extPowers(cf).find((e) => e.iso3 === c.iso3);
    return k.conflictRow(cf, {
      meta: ep?.kind ? k.kindPill(ep.kind) : null,
      sub: <><span className="dz-sevlab">{k.sevName(cf.severity)}</span>{ep ? L(ep.role) : ''}</>,
    });
  });
  return <>
    {k.sec(t('dz.c.party'), party.length ? k.rows(party.map((cf) => k.conflictRow(cf))) : k.empty(t('dz.c.noParty', { n: fmt.num(db.conflicts.length) })), { count: party.length, cls: 'first' })}
    {k.sec(t('dz.c.external'), ext.length ? k.rows(extRows) : k.empty(t('dz.c.noExternal')), { count: ext.length, id: 'external' })}
  </>;
}

function relations(c: Country, k: Kit) {
  const { t, pick: L, fmt, db } = k;
  const iso = c.iso3;
  const edges = c.edges.map((id) => db.edgeById.get(id) as EdgeX | undefined).filter((e) => !!e);
  if (!edges.length) return k.sec(null, [k.empty(t('dz.r.none', { n: fmt.num(db.relations.edges.length) })), k.networkBtn()], { cls: 'first' });
  const seen = new Set<string>();
  const groups = db.relations.edgeTypes.map((et) => {
    const list = edges.filter((e) => e.type === et.id).sort((a, b) => (b.weight || 0) - (a.weight || 0));
    if (!list.length) return null;
    const items = list.map((e) => {
      const partner = e.a === iso ? e.b : e.a;
      const bil = !seen.has(partner) ? db.bilateralFor(iso, partner) as Bi | null : null;
      seen.add(partner);
      const weight = t('dz.r.weight', { n: e.weight ?? 0 });
      return (
        <div key={e.id} className="dz-rel" data-hl={partner}>
          <div className="dz-rel-h">{k.cchip(partner)}{k.kindPill(e.kind)}
            {e.contested ? <span className="pill warn" data-tip={esc(t('dz.r.contestedTip'))}><Icon name="alert" size={12} />{t('dz.r.contested')}</span> : null}
            {e.weight ? <span className="dz-weight" data-tip={esc(weight)}><Pips n={e.weight} of={5} color={edgeVar(e.type)} /><span className="vh">{weight}</span></span> : null}
          </div>
          {k.prose(L(e), { clamp: false, cls: 'sm' })}
          {k.provenance(e)}
          {bil ? <div className="dz-bi"><p className="dz-bi-h">{t('dz.r.bilateral')}</p>{k.prose(L(bil), { cls: 'sm' })}</div> : null}
        </div>
      );
    });
    return <Fragment key={et.id}>{k.sec(L(et as Partial<Bi>), k.rows(items), { count: list.length, lead: k.sw(edgeVar(et.id)) })}</Fragment>;
  });
  return <>{k.sec(null, [k.note(t('dz.r.hint')), k.networkBtn()], { cls: 'first dz-tight' })}{groups}</>;
}

/** Electricity: the state's capacity in operation by type (GEM's integrated power tracker, loaded on first use). */
function electricity(c: Country, k: Kit) {
  const { t, pick: L, fmt } = k;
  const pc = powerCountries()?.[c.iso3];
  const op = pc?.op ?? {};
  const total = POWER_TYPES.reduce((a, ty) => a + (op[ty] ?? 0), 0);
  if (!total) return null;
  const con = POWER_TYPES.reduce((a, ty) => a + (pc?.con?.[ty] ?? 0), 0);
  const gw = (mw: number) => fmt.num(mw / 1000, mw < 10000 ? 1 : 0);
  // the share sits in the label (the text face), the GW in the value column (numbers only, for the number face)
  const rows = POWER_TYPES.filter((ty) => op[ty]).sort((a, b) => op[b]! - op[a]!).map((ty) => {
    const share = (100 * op[ty]!) / total;
    return {
      name: L(POWER_LABEL[ty]), value: share, color: powerVar(ty),
      label: <>{L(POWER_LABEL[ty])}{' '}<span className="dz-alt">{fmt.pct(share, share < 1 ? 1 : 0)}</span></>,
      valueLabel: fmt.num(op[ty]! / 1000, op[ty]! < 10000 ? 1 : 0),
      tip: `<b>${esc(L(POWER_LABEL[ty]))}</b> ${esc(fmtMW(op[ty]!, k.lang))}`,
    };
  });
  return k.sec(t('pw.dz.mixTitle'), [
    <StackBar key="s" parts={rows.map((r) => ({ label: r.name, value: r.value, color: r.color }))} total={100} label={t('pw.dz.mixTitle')} />,
    <BarList key="b" rows={rows} max={100} unit="%" />,
    k.note(`${t('pw.dz.mixUnit')} ${con ? t('pw.dz.mixTotal', { v: gw(total), c: gw(con) }) : t('pw.dz.mixTotal0', { v: gw(total) })}`),
    k.note(t('pw.dz.mixNote')),
  ], { id: 'electricity' });
}

function resources(c: Country, k: Kit) {
  const { t, pick: L, db } = k;
  const entries = [...c.resources as ResEntryX[]].sort((a, b) => (a.rank || 99) - (b.rank || 99));
  const sites = c.sites.map((id) => db.siteById.get(id)).filter((s) => !!s);
  const chokes = c.chokepoints.map((id) => db.chokeById.get(id)).filter((p) => !!p);
  const power = electricity(c, k);
  if (!entries.length && !sites.length && !chokes.length) return power ? <>{k.sec(null, k.empty(t('dz.res.none')), { cls: 'first' })}{power}</> : k.sec(null, k.empty(t('dz.res.none')), { cls: 'first' });
  return <>
    {k.sec(t('dz.res.entries'), entries.length ? k.rows(entries.map((e, i) => k.resourceEntry(e, i))) : k.empty(t('dz.res.none')), { id: 'entries', count: entries.length, cls: 'first' })}
    {sites.length ? k.sec(t('dz.res.sites'), k.rows(sites.map(k.siteRow)), { count: sites.length }) : null}
    {chokes.length ? k.sec(t('dz.res.chokes'), k.rows(chokes.map(k.chokeRow)), { id: 'chokes', count: chokes.length }) : null}
    {power}
    {entries.length ? k.sec(null, k.note(L(db.resources.note))) : null}
  </>;
}

function history(c: Country, k: Kit) {
  const { t, fmt, db } = k;
  const evs = c.events.map((id) => db.eventById.get(id) as EventX | undefined).filter((e) => !!e);
  if (!evs.length) {
    const [from, to] = db.timeline.range as [number, number];
    return k.sec(null, k.empty(t('dz.h.none', { n: fmt.num(db.timeline.events.length), from, to })), { cls: 'first' });
  }
  return k.sec(t('dz.h.title'), k.eventList(evs), { count: evs.length, cls: 'first' });
}
