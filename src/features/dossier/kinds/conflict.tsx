// Conflict dossier: status, parties, roots, energy and related tabs.

import { Fragment, type ReactNode } from 'react';
import { atlas } from '../../../app/store';
import { DIMENSIONS } from '../../../config';
import { POWER_LABEL, POWER_PICTO, POWER_TYPES, powerCountries, type PowerType } from '../../../data/power';
import type { LiveKey } from '../../../data/types';
import { esc } from '../../../ui/dom';
import { Icon } from '../../../ui/Icon';
import { Picto } from '../../../ui/Picto';
import { powerVar } from '../../map/engine/scene';
import '../../power/strings';
import { extPowers, pickList, type ChokeX, type ConflictX, type EventX, type Panel, type ResEntryX } from '../model';
import type { Kit } from '../parts';
import { BATTLE_UNDER_ISRAEL } from './country';

const DIMS: Record<string, { ar: string; en: string }> = DIMENSIONS;

function relatedOf(cf: ConflictX, k: Kit) {
  const { db } = k;
  return {
    events: (cf.events ?? []).map((id) => db.eventById.get(id) as EventX | undefined).filter((e) => !!e),
    chokes: (cf.chokepoints ?? []).map((id) => db.chokeById.get(id) as ChokeX | undefined).filter((p) => !!p),
    res: (db.resources.entries as ResEntryX[]).filter((e) => (e.conflictIds ?? []).includes(cf.id)),
    refs: cf.sourceRefs ?? [],
  };
}
type Related = ReturnType<typeof relatedOf>;

export function conflictPanel(id: string, k: Kit): Panel | null {
  const cf = k.db.conflictById.get(id) as ConflictX | undefined;
  if (!cf) return null;
  const { t, pick: L, fmt, db } = k;
  const plate = [k.altSpan(cf)];
  if (cf.started) plate.push(<span>{t('dz.cf.started')}{' '}<bdi className="dz-when">{fmt.date(cf.started)}</bdi></span>);
  if (cf.currentPhaseStarted) plate.push(<span>{t('dz.cf.phase')}{' '}<bdi className="dz-when">{fmt.date(cf.currentPhaseStarted)}</bdi></span>);
  const rel = relatedOf(cf, k);
  return {
    head: {
      region: L(cf.regionName), title: L(cf.name), plate,
      badges: [k.sevPill(cf.severity), k.confPill(cf)],
      // The as-of stamp stays prominent: current-status fields are not independently verified by this edition.
      extra: (
        <div className="dz-asof-row">
          <p className="dz-asof"><Icon name="clock" size={14} /><span>{t('dz.cf.asOf', { d: fmt.date(cf.statusAsOf || db.conflictsAsOf) })}</span></p>
          {k.unverifiedPill('conflict', cf.id)}
        </div>
      ),
    },
    tabs: [
      { id: 'status', label: t('dz.cf.t.status'), render: () => status(cf, k) },
      { id: 'parties', label: t('dz.cf.t.parties'), count: pickList(k, cf.parties).length, render: () => parties(cf, k) },
      { id: 'roots', label: t('dz.cf.t.roots'), render: () => roots(cf, k) },
      { id: 'energy', label: t('dz.cf.t.energy'), render: () => energy(cf, k) },
      { id: 'related', label: t('dz.cf.t.related'), count: rel.events.length + rel.chokes.length + rel.res.length + rel.refs.length, render: () => related(rel, k) },
    ],
  };
}

function status(cf: ConflictX, k: Kit) {
  const { t, pick: L, fmt } = k;
  const recent = [...(cf.recent ?? [])].sort((a, b) => String(b.date).localeCompare(String(a.date)));
  const list = recent.length
    ? (
      <ol className="dz-tl dz-tl-static" role="list">
        {recent.map((r, i) => (
          <li key={`${r.date}:${i}`}><div className="dz-tl-item">
            <span className="dz-date">{fmt.date(r.date)}</span>
            <p className="dz-prose sm">{L(r)}</p>
            {r.source ? <span className="dz-src">{t('dz.sourceOf', { s: r.source })}</span> : null}
          </div></li>
        ))}
      </ol>
    )
    : k.empty(t('dz.cf.noRecent'));
  return <>
    {k.sec(t('dz.cf.now'), k.prose(L(cf.status)), { cls: 'first' })}
    {human(cf, k)}
    {k.sec(t('dz.cf.recent'), list, { count: recent.length || null })}
  </>;
}

const HUMAN_COLS: [LiveKey, string][] = [['refOrigin', 'dz.cf.hRef'], ['idps', 'dz.cf.hIdp'], ['battleDeaths', 'dz.cf.hBd']];

/** Refugees from, internally displaced and battle deaths for each state involved, from the open-data refresh. */
function human(cf: ConflictX, k: Kit) {
  const { t, pick: L, fmt, db } = k;
  const live = db.live;
  const isos = [...new Set(cf.countries)].filter((iso) => db.countries.has(iso));
  if (!live || !isos.length) return null;
  const cell = (iso: string, key: LiveKey) => {
    const s = db.countries.get(iso)!.stats[key];
    return (
      <td key={key}>
        <span className="dz-hum-v">{s ? k.numUnit(fmt.compact(s.v)) : <span className="dz-none">—</span>}</span>
        <span className="dz-hum-y data">{s?.y ?? live.indicators[key].latestYear ?? ''}</span>
      </td>
    );
  };
  const srcs = HUMAN_COLS.map(([key]) => live.indicators[key]);
  return k.sec(t('dz.cf.human'), [
    <div className="dz-hum-wrap" key="t">
      <table className="dz-hum">
        <thead><tr><th scope="col">{t('dz.cf.hCountry')}</th>{HUMAN_COLS.map(([key, label]) => <th key={key} scope="col">{t(label)}</th>)}</tr></thead>
        <tbody>{isos.map((iso) => <tr key={iso} data-hl={iso}><th scope="row">{k.cchip(iso)}</th>{HUMAN_COLS.map(([key]) => cell(iso, key))}</tr>)}</tbody>
      </table>
    </div>,
    <p className="dz-pv" key="s"><span className="dz-pv-s">{t('dz.pv.sources')}{' '}{srcs.map((ind, i) => (
      <Fragment key={ind.code}>{i ? ' · ' : ''}<a href={ind.url} target="_blank" rel="noopener" data-tip={esc(t('dz.src.liveTip', { code: ind.code, o: ind.sourceOrganization || L(ind.origin), d: fmt.date(live.retrieved) }))}>{t('dz.src.live', { o: L(ind.origin) })}<Icon name="external" size={11} /></a></Fragment>
    ))}</span></p>,
    isos.some((iso) => BATTLE_UNDER_ISRAEL.has(iso)) ? k.caveat(t('dz.hu.bdPse')) : null,
    k.note(t('dz.cf.humNote')),
  ], { id: 'human' });
}

function parties(cf: ConflictX, k: Kit) {
  const { t, pick: L } = k;
  const ps = pickList(k, cf.parties);
  const eps = extPowers(cf);
  const epRows = eps.map((e) => (
    <div key={e.iso3} className="dz-ep" data-hl={e.iso3}>
      <div className="dz-rel-h">{k.cchip(e.iso3)}{e.kind ? k.kindPill(e.kind) : null}</div>
      {k.prose(L(e.role), { clamp: false, cls: 'sm' })}
    </div>
  ));
  return <>
    {k.sec(t('dz.cf.parties'), ps.length ? <ol className="dz-parties" role="list">{ps.map((p, i) => <li key={i}>{p}</li>)}</ol> : k.empty(t('dz.none')), { count: ps.length, cls: 'first' })}
    {k.sec(t('dz.cf.externals'), eps.length ? k.rows(epRows) : k.empty(t('dz.cf.noExternals')), { count: eps.length })}
    {k.sec(t('dz.cf.countries'), k.cchips(cf.countries))}
  </>;
}

function roots(cf: ConflictX, k: Kit) {
  const { t, pick: L } = k;
  const dims = (cf.dimensions ?? []).map((d) => <span key={d} className="pill">{L(DIMS[d]) || d}</span>);
  const ethno = L(cf.ethnoReligious);
  return <>
    {k.sec(t('dz.cf.dims'), [dims.length ? <div className="chips dz-chips">{dims}</div> : null, k.prose(L(cf.dimensionNote))], { cls: 'first' })}
    {k.sec(t('dz.cf.ethno'), ethno ? k.prose(ethno) : k.empty(L(cf.ethnoReligiousNote) || t('dz.cf.noEthno')))}
    {k.sec(t('dz.cf.history'), k.prose(L(cf.history)))}
    {k.sec(t('dz.cf.causes'), k.prose(L(cf.politicalCauses)))}
    {k.sec(t('dz.cf.claims'), k.prose(L(cf.territorialClaims)))}
    {k.sec(t('dz.cf.interests'), k.prose(L(cf.strategicInterests)))}
  </>;
}

function related(rel: Related, k: Kit) {
  const { t } = k;
  if (!rel.events.length && !rel.chokes.length && !rel.res.length && !rel.refs.length) return k.sec(null, k.empty(t('dz.cf.noRelated')), { cls: 'first' });
  return <>
    {k.sec(t('dz.cf.events'), k.eventList(rel.events), { count: rel.events.length, cls: 'first' })}
    {k.sec(t('dz.cf.chokes'), k.rows(rel.chokes.map(k.chokeRow)), { count: rel.chokes.length })}
    {k.sec(t('dz.cf.resources'), k.rows(rel.res.map((e, i) => k.resourceEntry(e, i, { country: true }))), { count: rel.res.length })}
    {k.sec(t('dz.cf.sources'), rel.refs.length ? <ul className="dz-refs" role="list">{rel.refs.map(k.refItem)}</ul> : null, { count: rel.refs.length })}
  </>;
}

/** Show the conflict among a lens's infrastructure: the conflicts layer on, the conflict selected, the map on it. */
function showWith(cf: ConflictX, lens: 'industry' | 'pipelines') {
  atlas.set({ lens, layers: { ...atlas.get().layers, conflicts: true } });
  if (lens === 'industry') atlas.setFilter('industryMode', 'power');
  else atlas.setFilter('pipeFields', true);
  atlas.select('conflict', cf.id);
}

/**
 * Energy: the power capacity of each state involved (GEM's per-state totals, loaded on first use), and the way onto
 * the infrastructure lenses with the conflicts drawn over them.
 */
function energy(cf: ConflictX, k: Kit) {
  const { t, pick: L, fmt, db } = k;
  const pc = powerCountries();
  // nuclear plants the curated file ties to this conflict (in the line of fire, struck, occupied)
  const nuclear = db.nuclear.plants.filter((p) => p.conflictIds?.includes(cf.id));
  const isos = [...new Set(cf.countries)].filter((iso) => db.countries.has(iso));
  const gw = (mw: number) => (mw ? fmt.num(mw / 1000, mw < 10000 ? 1 : 0) : '—');
  const sum = (o: Partial<Record<PowerType, number>>) => POWER_TYPES.reduce((a, ty) => a + (o[ty] ?? 0), 0);
  let table: ReactNode;
  if (!pc) table = k.note(t('pw.cf.loading'));
  else {
    const rows = isos.map((iso) => {
      const op = pc[iso]?.op ?? {}, con = pc[iso]?.con ?? {};
      const top = POWER_TYPES.filter((ty) => op[ty]).sort((a, b) => op[b]! - op[a]!)[0];
      return { iso, op: sum(op), con: sum(con), top };
    });
    table = !rows.some((r) => r.op || r.con) ? k.empty(t('pw.cf.none')) : (
      <div className="dz-hum-wrap">
        <table className="dz-hum dz-pwr">
          <thead><tr>
            <th scope="col">{t('pw.cf.state')}</th><th scope="col">{t('pw.cf.op')}</th><th scope="col">{t('pw.cf.con')}</th><th scope="col">{t('pw.cf.main')}</th>
          </tr></thead>
          <tbody>{rows.map((r) => (
            <tr key={r.iso} data-hl={r.iso}>
              <th scope="row">{k.cchip(r.iso)}</th>
              <td><span className="dz-hum-v data">{gw(r.op)}</span></td>
              <td><span className="dz-hum-v data">{gw(r.con)}</span></td>
              <td>{r.top ? <span className="dz-pwr-top"><Picto id={POWER_PICTO[r.top]} color={powerVar(r.top)} size={14} />{L(POWER_LABEL[r.top])}</span> : <span className="dz-none">—</span>}</td>
            </tr>
          ))}</tbody>
        </table>
      </div>
    );
  }
  const btn = (lens: 'industry' | 'pipelines', icon: string, label: string) => (
    <button key={lens} type="button" className="btn dz-wide-btn" data-act={`cf-${lens}`} onClick={() => showWith(cf, lens)}><Icon name={icon} size={16} /><span>{label}</span></button>
  );
  return <>
    {k.sec(t('pw.cf.title'), [table, pc ? k.note(`${t('pw.cf.unit')} ${t('pw.cf.note')}`) : null], { id: 'power', cls: 'first' })}
    {nuclear.length ? k.sec(t('pw.cf.nuclear'), <div className="chips dz-chips">{nuclear.map((p) => k.kchip('plant', p.id, L(p), { isos: [p.iso3] }))}</div>, { count: nuclear.length }) : null}
    {k.sec(t('pw.cf.map'), [btn('industry', 'bolt', t('pw.cf.plants')), btn('pipelines', 'derrick', t('pw.cf.pipes'))])}
  </>;
}
