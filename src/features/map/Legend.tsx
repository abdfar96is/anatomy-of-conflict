// The lens card (#legend): title, mode/filter chips, key, caveat. It lives inside #stage, sits under any open
// view panel and talks to the rest of the app only through the store.

import * as d3 from 'd3';
import { useState, useSyncExternalStore, type CSSProperties, type ReactNode, type SyntheticEvent } from 'react';
import { atlas, useAtlas, type AtlasState } from '../../app/store';
import { useDb, useT } from '../../app/useT';
import { CHOKE_STATUS, LENSES, NUCLEAR_CIVIL, NUCLEAR_STATUS, NUCLEAR_UNIT, RESOURCE_CLASSES, SEVERITY } from '../../config';
import type { DB } from '../../data/types';
import { Icon } from '../../ui/Icon';
import { Picto } from '../../ui/Picto';
import { PICTO_GROUPS, SITE_PICTO } from '../../ui/pictograms';
import { catVar, edgeVar, pal, resClassVar, sevVar, traditionColor, type Palette } from '../../ui/palette';
import {
  BLOC_T, CHOKE_T, CONTINENTS, ETHNIC_CLASSES, GDP_RANGE, INCOME, POP_RANGE, RES_SHAPE,
  PIPE_DASH, PIPE_DOTS, PIPE_W, activeBloc, bi, borderFill, decadeWindow, ethnicClass, fuelVar, landTint, lngColor, nuclearCivilFill, nuclearFill, nuclearZoneFill, plantColor, seqFill,
  visibleConflicts, visibleFields, visibleLng, visiblePipes, windowEvents,
} from './engine/scene';
import { FUELS, FUEL_LABEL, PIPE_STATUS, STATUS_LABEL, capacityClass, isHalted, systemName } from '../../data/energy';
import { useEnergy } from '../pipelines/useEnergy';
import '../pipelines/strings';
import { getBorders, unitsAt } from '../../data/borders';
import { changeLine } from '../borders/changes';
import '../borders/strings';
import './strings';

// ---- small builders
const STATUS_ICON: Record<string, string> = { good: 'check', warn: 'alert', critical: 'alert' };

/** Marker glyph mirroring the canvas shapes (secondary encoding next to color). */
export function Glyph({ shape, color, size = 14 }: { shape: string; color: string; size?: number }) {
  const f: CSSProperties = { fill: color, stroke: 'none' }, s: CSSProperties = { fill: 'none', stroke: color };
  let body: ReactNode;
  switch (shape) {
    case 'pulse': body = <><circle r="3.4" style={f} /><circle r="6" style={{ ...s, strokeWidth: 1.2 }} /></>; break;
    case 'square': body = <rect x="-4.2" y="-4.2" width="8.4" height="8.4" style={f} />; break;
    case 'ring': body = <circle r="4.3" style={{ ...s, strokeWidth: 2.2 }} />; break;
    case 'diamond': body = <path d="M0-5.6L5.6 0 0 5.6-5.6 0z" style={f} />; break;
    case 'dashed': body = <circle r="4.6" style={{ ...s, strokeWidth: 1.6, strokeDasharray: '2.2 1.8' }} />; break;
    case 'dot': body = <circle r="2.6" style={f} />; break;
    case 'hollow': body = <circle r="4.3" style={{ ...s, strokeWidth: 1.3 }} />; break;
    case 'triangle': body = <path d="M0-5.4L5.2 4.2H-5.2z" style={f} />; break;
    case 'hex': body = <path d="M0-5.4L4.7-2.7V2.7L0 5.4-4.7 2.7V-2.7z" style={f} />; break;
    case 'pin': body = <circle r="3.8" style={f} />; break;
    case 'choke': body = <circle r="5" style={{ fill: `color-mix(in srgb, ${color} 22%, transparent)`, stroke: color, strokeWidth: 2 }} />; break;
    default: body = <circle r="4.6" style={f} />;
  }
  return <svg className="glyph" width={size} height={size} viewBox="-7 -7 14 14" aria-hidden="true">{body}</svg>;
}

function LineGlyph({ color, dash = '', width = 2, round = false }: { color: string; dash?: string; width?: number; round?: boolean }) {
  const style: CSSProperties = { stroke: color, strokeWidth: width };
  if (dash) style.strokeDasharray = dash;
  if (round) style.strokeLinecap = 'round';
  return <svg className="glyph line" width="26" height="10" viewBox="0 0 26 10" aria-hidden="true"><line x1="2" y1="5" x2="24" y2="5" style={style} /></svg>;
}

/** A field as the map draws it: a dot in its fuel colour, split in two for oil-and-gas fields. */
function FieldDot({ colors, r = 4 }: { colors: string[]; r?: number }) {
  return (
    <svg className="glyph" width={2 * r + 4} height={14} viewBox={`${-r - 2} -7 ${2 * r + 4} 14`} aria-hidden="true">
      <circle r={r + 0.9} style={{ fill: 'var(--label-halo)' }} />
      <circle r={r} style={{ fill: colors[0] }} />
      {colors[1] ? <path d={`M0 ${-r}A${r} ${r} 0 0 1 0 ${r}Z`} style={{ fill: colors[1] }} /> : null}
    </svg>
  );
}

/** A short pipe as the map draws it zoomed in: rim, body, light core (and a soft glow for the sourced lines). */
function TubeGlyph({ color, dash = '', glow = false }: { color: string; dash?: string; glow?: boolean }) {
  const line = (stroke: string, width: number, extra: CSSProperties = {}) =>
    <line x1="4" y1="5" x2="22" y2="5" style={{ stroke, strokeWidth: width, strokeLinecap: dash ? 'butt' : 'round', strokeDasharray: dash || undefined, ...extra }} />;
  return (
    <svg className="glyph line" width="26" height="10" viewBox="0 0 26 10" aria-hidden="true">
      {glow ? line('var(--sel)', 8, { opacity: 0.5 }) : null}
      {line(`color-mix(in srgb, ${color} 45%, black)`, 5.6)}{line(color, 4)}{line(`color-mix(in srgb, ${color} 40%, white)`, 1.2, { opacity: 0.9 })}
    </svg>
  );
}

const Sw = ({ bg, cls = '' }: { bg: string; cls?: string }) => <span className={`sw ${cls}`} style={{ background: bg }} aria-hidden="true" />;

interface ChipProps { act: string; k?: string; val?: string; pressed: boolean; label: string; n?: number; lead?: ReactNode; onClick: () => void }
function Chip({ act, k = '', val = '', pressed, label, n, lead, onClick }: ChipProps) {
  const { fmt } = useT();
  return (
    <button className="chip" type="button" aria-pressed={pressed} data-act={act} data-key={k} data-val={val} onClick={onClick}>
      {lead}<span>{label}</span>{n != null && <span className="n">{fmt.num(n)}</span>}
    </button>
  );
}

const Sec = ({ label, wrap, children }: { label?: string; wrap?: string; children: ReactNode }) => (
  <div className="lc-sec" data-wrap={wrap}>{label ? <p className="lc-label">{label}</p> : null}{children}</div>
);
const Chips = ({ label, children }: { label: string; children: ReactNode }) => <div className="chips" role="group" aria-label={label}>{children}</div>;
function KeyRow({ lead, label, n }: { lead: ReactNode; label: string; n?: number }) {
  const { fmt } = useT();
  return <li>{lead}<span className="k-l">{label}</span>{n != null && <span className="n">{fmt.num(n)}</span>}</li>;
}
const Keys = ({ children }: { children: ReactNode }) => <ul className="lc-keys">{children}</ul>;
const Note = ({ text }: { text: string }) => (text ? <p className="lc-note">{text}</p> : null);
const Caveat = ({ text }: { text: string }) => (text ? <p className="caveat lc-caveat"><Icon name="info" size={15} /><span>{text}</span></p> : null);

/** Sequential ramp, low → high along the reading direction. */
function Ramp({ lo, hi, label, P }: { lo: string; hi: string; label?: string; P: Palette }) {
  const { lang } = useT();
  const stops = [0, 0.25, 0.5, 0.75, 1].map((v) => `${seqFill(P, v)} ${v * 100}%`).join(', ');
  const side = lang === 'ar' ? 'to left' : 'to right';
  return (
    <div className="lc-ramp" role={label ? 'img' : undefined} aria-label={label ? `${label}: ${lo} – ${hi}` : undefined}>
      <span className="ramp" style={{ background: `linear-gradient(${side}, ${stops})` }} />
      <span className="ramp-ends"><span className="num">{lo}</span><span className="num">{hi}</span></span>
    </div>
  );
}

// ---- per-lens card bodies
type LegendState = Pick<AtlasState, 'filters' | 'selection' | 'year' | 'yearFilter'>;
interface Ctx { DB: DB; S: LegendState; P: Palette; T: ReturnType<typeof useT> }

const setOverviewMode = (v: AtlasState['filters']['overviewMode']) => atlas.setFilter('overviewMode', v);
const setReligionMode = (v: AtlasState['filters']['religionMode']) => atlas.setFilter('religionMode', v);
const setNuclearMode = (v: AtlasState['filters']['nuclearMode']) => atlas.setFilter('nuclearMode', v);

const BODY: Record<(typeof LENSES)[number]['id'], (c: Ctx) => ReactNode> = {
  overview({ DB, S, P, T: { t, pick: L, fmt } }) {
    const m = S.filters.overviewMode;
    const modes = (['continent', 'income', 'population', 'gdp'] as const).map((id) => (
      <Chip key={id} act="set" k="overviewMode" val={id} pressed={m === id} label={t('map.ov.' + id)} onClick={() => setOverviewMode(id)} />
    ));
    let key: ReactNode;
    const all = [...DB.countries.values()];
    if (m === 'continent') {
      key = <Keys>{CONTINENTS.map((c) => <KeyRow key={c.id} lead={<Sw bg={d3.interpolateLab(P.land, P.cat[c.slot]!)(0.3)} cls="sw-land" />} label={L(c)} n={all.filter((x) => x.continent === c.id).length} />)}</Keys>;
    } else if (m === 'income') {
      key = <Keys>{INCOME.map((s) => <KeyRow key={s.n} lead={<Sw bg={seqFill(P, s.t)} cls="sw-land" />} label={L(s)} n={all.filter((x) => parseInt(x.income ?? '', 10) === s.n).length} />)}</Keys>;
    } else {
      const [a, b] = m === 'population' ? POP_RANGE : GDP_RANGE;
      const f = m === 'population' ? fmt.compact : (v: number) => `$${fmt.compact(v)}`;
      key = <><Ramp lo={f(a)} hi={f(b)} label={t('map.ov.' + m)} P={P} /><Keys><KeyRow lead={<Sw bg={P.landMuted} cls="sw-land" />} label={t('map.ov.noData')} /></Keys></>;
    }
    return (
      <>
        <Sec label={t('map.lc.colorBy')}><Chips label={t('map.lc.colorBy')}>{modes}</Chips></Sec>
        <Sec>{key}<Keys><KeyRow lead={<span className="dot-accent" aria-hidden="true" />} label={t('map.ov.profile')} /></Keys></Sec>
        <Note text={DB.live ? t('map.ov.noteLive', { d: fmt.date(DB.live.retrieved) }) : t('map.ov.note')} />
      </>
    );
  },

  conflicts({ DB, S, P, T: { t, pick: L, fmt } }) {
    const pool = DB.conflicts.filter((c) => !(S.yearFilter && c.startYear && c.startYear > S.year));
    const items = SEVERITY.map((s) => (
      <Chip key={s.id} act="toggle" k="severity" val={s.id} pressed={S.filters.severity.has(s.id)} label={L(s)}
        n={pool.filter((c) => c.severity === s.id).length} lead={<Glyph shape={s.shape} color={sevVar(s.id)} />}
        onClick={() => atlas.toggleInSet('severity', s.id)} />
    ));
    const counts = new Map<string, number>();
    for (const c of visibleConflicts(DB, S)) for (const iso of c.countries || []) counts.set(iso, (counts.get(iso) || 0) + 1);
    const max = Math.max(1, ...counts.values());
    const selC = S.selection?.kind === 'conflict' && DB.conflictById.has(S.selection.id);
    return (
      <>
        <Sec label={t('map.cf.sev')} wrap="2"><Chips label={t('map.cf.sev')}>{items}</Chips></Sec>
        <Sec label={t('map.cf.ramp')}><Ramp lo="1" hi={fmt.num(max)} label={t('map.cf.ramp')} P={P} /></Sec>
        {selC && <Note text={t('map.cf.powers')} />}
        <Note text={[t('map.cf.asOf', { d: fmt.date(DB.conflictsAsOf) }), S.yearFilter ? t('map.cf.yearOn', { y: S.year }) : ''].join(' ').trim()} />
      </>
    );
  },

  religion({ DB, S, P, T: { t, pick: L } }) {
    const f = S.filters;
    const modes = (['majority', 'share', 'diversity'] as const).map((id) => (
      <Chip key={id} act="set" k="religionMode" val={id} pressed={f.religionMode === id} label={t('map.rl.' + id)} onClick={() => setReligionMode(id)} />
    ));
    let key: ReactNode;
    if (f.religionMode === 'majority') {
      const n = new Map<string, number>();
      for (const c of DB.countries.values()) if (c.religion?.majority) n.set(c.religion.majority, (n.get(c.religion.majority) || 0) + 1);
      key = <Keys>{DB.religion.traditions.filter((tr) => n.has(tr.id)).sort((a, b) => n.get(b.id)! - n.get(a.id)!)
        .map((tr) => <KeyRow key={tr.id} lead={<Sw bg={landTint(P, traditionColor(tr.id))} cls="sw-land" />} label={L(tr)} n={n.get(tr.id)} />)}</Keys>;
    } else if (f.religionMode === 'share') {
      key = (
        <>
          <label className="lc-field">
            <span className="lc-label">{t('map.rl.trad')}</span>
            <select className="lc-select" data-act="trad" value={f.religionTradition} onChange={(e) => atlas.setFilter('religionTradition', e.target.value)}>
              {DB.religion.traditions.map((tr) => <option key={tr.id} value={tr.id}>{L(tr)}</option>)}
            </select>
          </label>
          <Ramp lo="0%" hi="100%" label={L(DB.religion.traditionById.get(f.religionTradition))} P={P} />
        </>
      );
    } else {
      key = <Ramp lo={t('map.rl.uniform')} hi={t('map.rl.diverse')} label={t('map.rl.diversity')} P={P} />;
    }
    return (
      <>
        <Sec label={t('map.lc.colorBy')}><Chips label={t('map.lc.colorBy')}>{modes}</Chips></Sec>
        <Sec>
          {key}
          <Keys>
            <KeyRow lead={<Sw bg="" cls="sw-hatch sw-nodata" />} label={t('map.rl.noData')} />
            <KeyRow lead={<span className="bang" aria-hidden="true">!</span>} label={t('map.rl.contested')} />
          </Keys>
        </Sec>
        <Note text={L(DB.religion.coverageNote)} />
      </>
    );
  },

  ethnic({ DB, S, T: { t, pick: L, pickKey: Lk } }) {
    const f = S.filters.ethnicFamily;
    const n = new Map<string, number>();
    for (const g of DB.ethnic.groups.values()) { const k = ethnicClass(g.family); n.set(k, (n.get(k) || 0) + 1); }
    const items = [<Chip key="" act="set" k="ethnicFamily" val="" pressed={!f} label={t('map.all')} n={DB.ethnic.groups.size} onClick={() => atlas.setFilter('ethnicFamily', null)} />]
      .concat(ETHNIC_CLASSES.filter((c) => n.has(c.id)).map((c) => (
        <Chip key={c.id} act="set" k="ethnicFamily" val={c.id} pressed={f === c.id || (!!f && c.members.includes(f))} label={L(c)} n={n.get(c.id)}
          lead={<Sw bg={catVar(c.slot)} />} onClick={() => atlas.setFilter('ethnicFamily', c.id)} />
      )));
    const meta = DB.ethnic.meta && typeof DB.ethnic.meta === 'object' ? DB.ethnic.meta : null;
    return (
      <>
        <Sec label={t('map.et.family')}><Chips label={t('map.et.family')}>{items}</Chips></Sec>
        <Caveat text={Lk(meta, 'warning')} />
      </>
    );
  },

  disputed({ DB, T: { t, fmt } }) {
    return (
      <>
        <Sec>
          <Keys>
            <KeyRow lead={<Sw bg="" cls="sw-hatch" />} label={t('map.dp.area')} />
            <KeyRow lead={<Sw bg="" cls="sw-hatch sw-round" />} label={t('map.dp.point')} />
          </Keys>
        </Sec>
        <Note text={t('map.dp.note', { n: fmt.num(DB.disputed.length) })} />
      </>
    );
  },

  nuclear({ DB, S, P, T: { t, pick: L, fmt } }) {
    const m = S.filters.nuclearMode;
    const modes = (['military', 'civil', 'zones'] as const).map((id) => (
      <Chip key={id} act="set" k="nuclearMode" val={id} pressed={m === id} label={t('map.nc.' + id)} onClick={() => setNuclearMode(id)} />
    ));
    const all = [...DB.countries.values()];
    let key: ReactNode, note: string;
    if (m === 'military') {
      key = <Keys>{(Object.keys(NUCLEAR_STATUS) as (keyof typeof NUCLEAR_STATUS)[]).map((id) => (
        <KeyRow key={id} lead={<Sw bg={nuclearFill(P, id)} cls={`sw-land${'unconfirmed' in NUCLEAR_STATUS[id] ? ' sw-overhatch' : ''}`} />} label={L(NUCLEAR_STATUS[id])}
          n={all.filter((c) => c.nuclear.weapons === id).length} />
      ))}</Keys>;
      const total = Object.values(DB.nuclear.warheads.values).reduce((a, b) => a + b, 0);
      note = [t('map.nc.warheads', { n: fmt.num(total), y: DB.nuclear.warheads.year }), t('map.nc.hatch'), L(DB.nuclear.note)].join(' ');
    } else if (m === 'civil') {
      key = <Keys>{(Object.keys(NUCLEAR_CIVIL) as (keyof typeof NUCLEAR_CIVIL)[]).map((id) => (
        <KeyRow key={id} lead={<Sw bg={nuclearCivilFill(P, id)} cls={`sw-land${id === 'phased-out' ? ' sw-overhatch' : ''}`} />} label={L(NUCLEAR_CIVIL[id])}
          n={all.filter((c) => c.nuclear.civil === id).length} />
      ))}</Keys>;
      const plants = DB.nuclear.plants;
      key = <>{key}<Keys>{(Object.keys(NUCLEAR_UNIT) as (keyof typeof NUCLEAR_UNIT)[]).map((id) => (
        <KeyRow key={id} lead={<Glyph shape={NUCLEAR_UNIT[id].shape} color={plantColor(P, id)} />} label={t('map.nc.plant', { s: L(NUCLEAR_UNIT[id]) })}
          n={plants.filter((p) => p.status === id).length} />
      ))}
        <KeyRow lead={<span className="sizes" aria-hidden="true"><Glyph shape="disc" color="var(--fg-3)" size={8} /><Glyph shape="disc" color="var(--fg-3)" size={18} /></span>} label={t('map.nc.size')} />
      </Keys></>;
      note = t('map.nc.civilNote', { d: fmt.date(DB.nuclear.plantSource.base.date) });
    } else {
      key = <Keys>{DB.nuclear.zones.map((z) => (
        <KeyRow key={z.id} lead={<Sw bg={nuclearZoneFill(P, z.id)} cls="sw-land" />} label={`${L(z)} · ${L(z.treaty)} (${z.year})`} n={z.members.length} />
      ))}</Keys>;
      note = L(DB.nuclear.zonesNote);
    }
    return (
      <>
        <Sec label={t('map.lc.colorBy')}><Chips label={t('map.lc.colorBy')}>{modes}</Chips></Sec>
        <Sec>{key}</Sec>
        <Note text={note} />
      </>
    );
  },

  borders({ S, P, T: { t, lang } }) {
    const B = getBorders();
    const y = S.filters.bordersYear;
    if (!B) return <Note text={t('bd.loading')} />;
    const units = unitsAt(B, y);
    // ruling powers present this year: their own territory first, then their dependencies
    const by = new Map<string, { n: number; sample: (typeof units)[number] }>();
    let other = 0, otherDep = 0, otherSample: (typeof units)[number] | undefined, otherDepSample: (typeof units)[number] | undefined;
    for (const u of units) {
      const key = String(u.ruler);
      if (B.meta.rulers[key]) {
        const e = by.get(key) ?? { n: 0, sample: u };
        e.n++;
        if (u.gw === u.ruler) e.sample = u;
        by.set(key, e);
      } else if (u.status === 'independent') { other++; otherSample ??= u; } else { otherDep++; otherDepSample ??= u; }
    }
    const rows = [...by].sort((a, b) => b[1].n - a[1].n).map(([key, e]) => {
      const home = units.find((u) => u.gw === Number(key) && u.status === 'independent') ?? e.sample;
      const [ar, en] = B.meta.rulers[key]!;
      return <KeyRow key={key} lead={<Sw bg={borderFill(P, B, home)} cls="sw-land" />} label={lang === 'ar' ? ar : en} n={e.n} />;
    });
    if (otherSample) rows.push(<KeyRow key="other" lead={<Sw bg={borderFill(P, B, otherSample)} cls="sw-land" />} label={t('bd.lg.other')} n={other} />);
    if (otherDepSample) rows.push(<KeyRow key="otherDep" lead={<Sw bg={borderFill(P, B, otherDepSample)} cls="sw-land" />} label={t('bd.lg.otherDep')} n={otherDep} />);
    const changes = B.changes.get(y) ?? [];
    return (
      <>
        <Sec label={t('bd.lg.year', { y })}><Keys>{rows}</Keys></Sec>
        <Note text={t('bd.lg.shade')} />
        <Sec label={t('bd.lg.changes', { y })}>
          {changes.length
            ? <ul className="bd-changes">{changes.slice(0, 12).map((c, i) => (
              <li key={`${c.unit.id}:${c.kind}:${i}`}><button type="button" className="bd-change" onClick={() => atlas.select('border', c.unit.id, { fly: true })}>
                <span className="bd-date num">{c.date.slice(5).split('-').reverse().join('/')}</span>{' '}{changeLine(B, c, lang, t)}
              </button></li>
            ))}{changes.length > 12 ? <li className="bd-more">{t('bd.more', { n: changes.length - 12 })}</li> : null}</ul>
            : <p className="lc-note">{t('bd.lg.none')}</p>}
        </Sec>
        <Note text={t('bd.lg.note')} />
      </>
    );
  },

  pipelines: (c) => <PipelinesCard {...c} />,

  powers({ DB, S, P, T: { t, pick: L } }) {
    const f = S.filters;
    const bloc = activeBloc(S);
    const onBloc = (val: string) => {
      const s = atlas.get();
      if (s.selection?.kind === 'bloc') atlas.select(s.selection.id === val ? null : 'bloc', val);
      else atlas.setFilter('bloc', s.filters.bloc === val ? null : val);
    };
    const blocs = DB.relations.blocs.map((b) => <Chip key={b.id} act="bloc" val={b.id} pressed={bloc === b.id} label={L(b)} n={b.members.length} onClick={() => onBloc(b.id)} />);
    const byType = new Map<string, number>(), byKind = new Map<string, number>();
    for (const e of DB.relations.edges) { byType.set(e.type, (byType.get(e.type) || 0) + 1); byKind.set(e.kind, (byKind.get(e.kind) || 0) + 1); }
    const types = DB.relations.edgeTypes.map((ty) => (
      <Chip key={ty.id} act="toggle" k="relTypes" val={ty.id} pressed={f.relTypes.has(ty.id)} label={L(bi(ty))} n={byType.get(ty.id) || 0}
        lead={<LineGlyph color={edgeVar(ty.id)} width={2.4} />} onClick={() => atlas.toggleInSet('relTypes', ty.id)} />
    ));
    const kinds = (['treaty', 'assessed'] as const).map((k) => (
      <Chip key={k} act="toggle" k="relKinds" val={k} pressed={f.relKinds.has(k)} label={t('map.pw.' + k)} n={byKind.get(k) || 0}
        lead={<LineGlyph color="var(--fg-2)" dash={k === 'assessed' ? '4 3' : ''} />} onClick={() => atlas.toggleInSet('relKinds', k)} />
    ));
    return (
      <>
        <Sec label={t('map.pw.bloc')}>
          <Chips label={t('map.pw.bloc')}>{blocs}</Chips>
          {bloc ? <Keys><KeyRow lead={<Sw bg={seqFill(P, BLOC_T)} cls="sw-land" />} label={t('map.pw.member')} /></Keys> : null}
        </Sec>
        <Sec label={t('map.pw.types')}><Chips label={t('map.pw.types')}>{types}</Chips></Sec>
        <Sec label={t('map.pw.kinds')}>
          <Chips label={t('map.pw.kinds')}>{kinds}</Chips>
          <Keys>
            <KeyRow lead={<LineGlyph color="var(--fg-2)" dash="1.2 3" width={2} round />} label={t('map.pw.contested')} />
            <KeyRow lead={<span className="weights" aria-hidden="true"><LineGlyph color="var(--fg-2)" width={0.9} /><LineGlyph color="var(--fg-2)" width={3} /></span>} label={t('map.pw.width')} />
          </Keys>
        </Sec>
        <Note text={t('map.pw.hint')} />
        <div className="lc-actions">
          <button className="btn" type="button" data-act="network" onClick={() => atlas.openView('network')}><Icon name="network" size={16} /><span>{t('map.pw.network')}</span></button>
        </div>
      </>
    );
  },

  resources({ DB, S, P, T: { t, pick: L } }) {
    const cls = S.filters.resourceClass;
    const n = new Map<string, number>();
    for (const s of DB.resources.sites) { const k = DB.resources.classOf[s.type] ?? ''; n.set(k, (n.get(k) || 0) + 1); }
    const items = [<Chip key="" act="set" k="resourceClass" val="" pressed={!cls} label={t('map.all')} n={DB.resources.sites.length} onClick={() => atlas.setFilter('resourceClass', null)} />]
      .concat(RESOURCE_CLASSES.map((c) => (
        <Chip key={c.id} act="set" k="resourceClass" val={c.id} pressed={cls === c.id} label={L(c)} n={n.get(c.id) || 0}
          lead={<Glyph shape={RES_SHAPE[c.id] ?? 'disc'} color={resClassVar(c.id)} />} onClick={() => atlas.setFilter('resourceClass', c.id)} />
      )));
    // one key row per pictogram group shown under the class filter, in a fixed order
    const counts = new Map<string, number>();
    for (const s of DB.resources.sites) {
      const sp = SITE_PICTO[s.type];
      if (sp && (!cls || DB.resources.classOf[s.type] === cls)) counts.set(sp.group, (counts.get(sp.group) || 0) + 1);
    }
    const rows = PICTO_GROUPS.filter((g) => counts.has(g.id)).map((g) => {
      const sp = Object.values(SITE_PICTO).find((x) => x.group === g.id)!;
      const color = sp.fuel === 'oil' ? 'var(--cat-4)' : sp.fuel === 'gas' ? 'var(--cat-1)' : sp.color!;
      return <KeyRow key={g.id} lead={<Picto id={sp.picto} color={color} size={17} />} label={L(g.label)} n={counts.get(g.id)} />;
    });
    const icons = rows.length ? <><ul className="lc-keys lc-picto">{rows}</ul><Note text={t('map.rs.groups')} /></> : null;
    return (
      <>
        <Sec label={t('map.rs.class')}><Chips label={t('map.rs.class')}>{items}</Chips></Sec>
        {icons ? <Sec>{icons}</Sec> : null}
        <Sec label={t('map.rs.ramp')}><Ramp lo={t('map.rs.low')} hi={t('map.rs.first')} label={t('map.rs.ramp')} P={P} /></Sec>
        <Note text={L(DB.resources.coverageNote)} />
      </>
    );
  },

  chokepoints({ DB, P, T: { t, pick: L } }) {
    const n = new Map<unknown, number>();
    for (const p of DB.chokepoints) n.set(p.status, (n.get(p.status) || 0) + 1);
    const rows = Object.entries(CHOKE_STATUS).map(([id, s]) => (
      <KeyRow key={id} lead={<><Glyph shape="choke" color={`var(--${s.tone})`} /><span className={`st-ic tone-${s.tone}`}><Icon name={STATUS_ICON[s.tone] ?? 'alert'} size={13} /></span></>}
        label={L(s)} n={n.get(id) || 0} />
    ));
    return (
      <>
        <Sec label={t('map.ck.status')}><Keys>{rows}</Keys></Sec>
        <Sec>
          <Keys>
            <KeyRow lead={<span className="sizes" aria-hidden="true"><Glyph shape="choke" color="var(--fg-3)" size={10} /><Glyph shape="choke" color="var(--fg-3)" size={18} /></span>} label={t('map.ck.size')} />
            <KeyRow lead={<Glyph shape="choke" color="var(--fg-3)" size={9} />} label={t('map.ck.na')} />
            <KeyRow lead={<Sw bg={seqFill(P, CHOKE_T)} cls="sw-land" />} label={t('map.ck.border')} />
          </Keys>
        </Sec>
        <Note text={L(DB.chokeNote)} />
      </>
    );
  },

  history({ DB, S, P, T: { t, pick: L, fmt } }) {
    const [a, b] = decadeWindow(S);
    const evs = windowEvents(DB, S);
    const per = new Map<string, number>();
    for (const e of evs) for (const iso of e.countries || []) per.set(iso, (per.get(iso) || 0) + 1);
    const max = Math.max(1, ...per.values());
    return (
      <>
        <Sec><p className="lc-stat"><span>{t('map.hs.window', { a, b })}</span><span>{t('map.hs.count', { n: fmt.num(evs.length) })}</span></p></Sec>
        <Sec label={t('map.hs.ramp')}>
          <Ramp lo="1" hi={fmt.num(max)} label={t('map.hs.ramp')} P={P} />
          <Keys><KeyRow lead={<Glyph shape="pin" color="var(--fg-2)" />} label={t('map.hs.event')} /></Keys>
        </Sec>
        <Note text={t('map.hs.hint')} />
        <Note text={L(DB.timeline.boundaryLimitation)} />
      </>
    );
  },
};

/** The pipelines card: a component of its own, since it loads the data on first use. */
function PipelinesCard({ S, P, T: { t, pick: L, fmt, lang } }: Ctx) {
  const { E, failed } = useEnergy();
  if (!E) return <Note text={failed ? t('pp.failed') : t('pp.loading')} />;
  const f = S.filters;
  const shown = visiblePipes(E, S), lng = visibleLng(E, S), fields = visibleFields(E, S);
  const allFields = visibleFields(E, { filters: { ...f, pipeFields: true } });
  const fieldsOf = (fuel: string) => fields.filter((x) => x.fuel === fuel).length;
  // counts under the other filter, so each chip says what turning it on would add
  const sourced = (p: (typeof E.pipes)[number]) => !f.pipeStrategic || E.noteOf.has(p.system);
  const byStatus = E.pipes.filter((p) => !isHalted(p) && f.pipeFuels.has(p.fuel) && sourced(p));
  const byFuel = E.pipes.filter((p) => (isHalted(p) ? f.pipeHalted : f.pipeStatus === 'all' || p.status === f.pipeStatus) && sourced(p));
  const halted = E.pipes.filter((p) => isHalted(p) && f.pipeFuels.has(p.fuel) && sourced(p));
  const fuels = FUELS.map((id) => (
    <Chip key={id} act="toggle" k="pipeFuels" val={id} pressed={f.pipeFuels.has(id)} label={L(FUEL_LABEL[id])} n={byFuel.filter((p) => p.fuel === id).length}
      lead={<TubeGlyph color={fuelVar(id)} />} onClick={() => atlas.toggleInSet('pipeFuels', id)} />
  ));
  const statuses = (['all', ...PIPE_STATUS] as const).map((id) => (
    <Chip key={id} act="set" k="pipeStatus" val={id} pressed={f.pipeStatus === id} label={id === 'all' ? t('pp.all') : L(STATUS_LABEL[id])}
      n={id === 'all' ? byStatus.length : byStatus.filter((p) => p.status === id).length}
      lead={id === 'all' ? undefined : <LineGlyph color="var(--fg-2)" width={2} dash={id === 'construction' ? PIPE_DASH.join(' ') : ''} />}
      onClick={() => atlas.setFilter('pipeStatus', id)} />
  ));
  const km = shown.reduce((a, p) => a + (p.km ?? 0), 0);
  const haltedVar = 'color-mix(in srgb, var(--cat-1) 35%, var(--fg-3))';
  const weights = [4, 3, 2, 1, 0].map((cls) => (
    <KeyRow key={cls} lead={<LineGlyph color="var(--fg-2)" width={PIPE_W[cls]! * 1.3} round />} label={t('pp.w' + cls)} n={shown.filter((p) => capacityClass(p.boe) === cls).length} />
  ));
  // one row per sourced system, opening its largest segment (a halted one turns its layer on)
  const notes = E.meta.notes.map((n) => {
    const segs = n.pipelines.flatMap((name) => E.bySystem.get(name) ?? []);
    const top = segs.reduce<(typeof segs)[number] | undefined>((a, b) => (!a || (b.km ?? 0) > (a.km ?? 0) ? b : a), undefined);
    if (!top) return null;
    return (
      <li key={n.pipelines[0]}><button type="button" className="bd-change pp-note" onClick={() => {
        atlas.set({ lens: 'pipelines' });
        if (isHalted(top) && !atlas.get().filters.pipeHalted) atlas.setFilter('pipeHalted', true);
        atlas.select('pipeline', top.id, { fly: true });
      }}>
        <svg className="glyph line" width="18" height="10" viewBox="0 0 18 10" aria-hidden="true">
          <line x1="2" y1="5" x2="16" y2="5" style={{ stroke: fuelVar(top.fuel), strokeWidth: 3, strokeLinecap: 'round', strokeDasharray: isHalted(top) ? '0.1 4.5' : undefined }} />
        </svg>
        <span>{systemName(E, top.system, lang)}</span>
      </button></li>
    );
  });
  return (
    <>
      <Sec label={t('pp.fuel')}><Chips label={t('pp.fuel')}>{fuels}</Chips></Sec>
      <Sec label={t('pp.status')}><Chips label={t('pp.status')}>{statuses}</Chips></Sec>
      <Sec label={t('pp.show')}>
        <Chips label={t('pp.show')}>
          <Chip act="layer" k="pipeLng" pressed={f.pipeLng} label={t('pp.lng')} n={lng.length || undefined} lead={<Glyph shape="triangle" color={lngColor(P)} size={12} />}
            onClick={() => atlas.setFilter('pipeLng', !f.pipeLng)} />
          <Chip act="layer" k="pipeFields" pressed={f.pipeFields} label={t('pp.fields')} n={allFields.length || undefined}
            lead={<Picto id="barrel" color="var(--cat-4)" size={14} />} onClick={() => atlas.setFilter('pipeFields', !f.pipeFields)} />
          <Chip act="layer" k="pipeHalted" pressed={f.pipeHalted} label={t('pp.halted')} n={halted.length}
            lead={<LineGlyph color={haltedVar} width={2.4} dash={PIPE_DOTS.join(' ')} round />} onClick={() => atlas.setFilter('pipeHalted', !f.pipeHalted)} />
          <Chip act="layer" k="pipeStrategic" pressed={f.pipeStrategic} label={t('pp.strategic')} n={E.meta.notes.length}
            onClick={() => atlas.setFilter('pipeStrategic', !f.pipeStrategic)} />
        </Chips>
      </Sec>
      <Sec label={t('pp.weight')}>
        <Keys>{weights}</Keys>
        <Keys>
          <KeyRow lead={<LineGlyph color="var(--fg-2)" width={2} dash={PIPE_DASH.join(' ')} />} label={t('pp.dashed')} />
          {f.pipeHalted ? <KeyRow lead={<LineGlyph color={haltedVar} width={2.4} dash={PIPE_DOTS.join(' ')} round />} label={t('pp.dotted')} n={shown.filter(isHalted).length} /> : null}
          <KeyRow lead={<TubeGlyph color="var(--cat-4)" glow />} label={t('pp.cased')} />
          <KeyRow lead={<TubeGlyph color="var(--cat-1)" />} label={t('pp.tube')} />
          {fields.length ? <>
            <KeyRow lead={<FieldDot colors={['var(--cat-4)']} />} label={t('pp.fieldOil')} n={fieldsOf('oil')} />
            <KeyRow lead={<FieldDot colors={['var(--cat-1)']} />} label={t('pp.fieldGas')} n={fieldsOf('gas')} />
            <KeyRow lead={<FieldDot colors={['var(--cat-4)', 'var(--cat-1)']} />} label={t('pp.fieldBoth')} n={fieldsOf('oilgas')} />
            <KeyRow lead={<span className="sizes" aria-hidden="true"><FieldDot colors={['var(--fg-3)']} r={2} /><FieldDot colors={['var(--fg-3)']} r={5} /></span>} label={t('pp.fieldSize')} />
            <KeyRow lead={<span className="sizes" aria-hidden="true"><Picto id="barrel" color="var(--cat-4)" size={15} /><Picto id="flame" color="var(--cat-1)" size={15} /></span>} label={t('pp.fieldPicto')} />
          </> : null}
          {f.pipeLng && f.pipeFuels.has('gas') ? <>
            <KeyRow lead={<Glyph shape="triangle" color={lngColor(P)} />} label={t('pp.lngExport')} n={lng.filter((x) => x.type === 'export' && x.status === 'operating').length} />
            <KeyRow lead={<Glyph shape="square" color={lngColor(P)} />} label={t('pp.lngImport')} n={lng.filter((x) => x.type === 'import' && x.status === 'operating').length} />
            <KeyRow lead={<Glyph shape="dashed" color={lngColor(P)} />} label={t('pp.lngBuilding')} n={lng.filter((x) => x.status === 'construction').length} />
          </> : null}
        </Keys>
        <p className="lc-note">{t('pp.total', { n: fmt.num(shown.length), km: fmt.num(Math.round(km / 1000) * 1000) })}</p>
      </Sec>
      <Sec label={t('pp.notes')}><ul className="bd-changes">{notes}</ul></Sec>
      {fields.length ? <Note text={t('pp.fieldsNote')} /> : null}
      {f.pipeHalted ? <Note text={t('pp.haltedNote')} /> : null}
      <Note text={t('pp.note')} />
    </>
  );
}

// ---- theme as the page shows it
// The swatches read resolved colours from pal(), so the card re-renders when <html data-theme> or the OS scheme
// changes, not on the store's theme key: the store changes first and the attribute follows a moment later.
const darkQuery = () => (typeof matchMedia === 'function' ? matchMedia('(prefers-color-scheme: dark)') : null);
function subscribeTheme(cb: () => void) {
  const mo = new MutationObserver(cb);
  mo.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
  const mq = darkQuery();
  mq?.addEventListener?.('change', cb);
  return () => { mo.disconnect(); mq?.removeEventListener?.('change', cb); };
}
const themeSnapshot = () => `${document.documentElement.dataset.theme ?? 'system'}|${darkQuery()?.matches ? 'dark' : 'light'}`;

// ---- lens card
const PREF = 'atlas-map-legend';

function initialCollapsed(): boolean {
  try {
    const v = localStorage.getItem(PREF);
    if (v === '0' || v === '1') return v === '1';
  } catch {
    // storage unavailable: fall back to the screen-size default
  }
  return typeof matchMedia === 'function' && matchMedia('(max-width: 760px)').matches;
}

// keep wheel/drag on the card from reaching the map and the document-level listeners
const stop = (e: SyntheticEvent) => e.stopPropagation();

export function Legend() {
  const DB = useDb();
  const T = useT();
  const lensId = useAtlas((s) => s.lens);
  const filters = useAtlas((s) => s.filters);
  const selection = useAtlas((s) => s.selection);
  const year = useAtlas((s) => s.year);
  const yearFilter = useAtlas((s) => s.yearFilter);
  useSyncExternalStore(subscribeTheme, themeSnapshot, () => 'system|light');
  const [collapsed, setCollapsed] = useState(initialCollapsed);

  const lens = LENSES.find((l) => l.id === lensId) ?? LENSES[0];
  let body: ReactNode = null;
  try {
    body = BODY[lens.id]({ DB, S: { filters, selection, year, yearFilter }, P: pal(), T });
  } catch (err) {
    console.error('[atlas] lens card failed', err);
  }

  const toggle = () => {
    const v = !collapsed;
    try { localStorage.setItem(PREF, v ? '1' : '0'); } catch { /* storage unavailable: the choice lasts this visit */ }
    setCollapsed(v);
  };

  return (
    <section id="legend" className={collapsed ? 'lcard collapsed' : 'lcard'} data-lens={lens.id} aria-label={`${T.t('map.lc.key')}: ${T.pick(lens)}`}
      onPointerDown={stop} onWheel={stop} onDoubleClick={stop}>
      <button className="lc-head" type="button" aria-expanded={!collapsed} aria-controls="lc-body" onClick={toggle}>
        <span className="lc-ico"><Icon name={lens.icon} size={18} /></span>
        <span className="lc-tt"><span className="lc-title">{T.pick(lens)}</span><span className="lc-sub">{T.pick(lens.sub)}</span></span>
        <span className="lc-chev"><Icon name="chevron" size={16} /></span>
      </button>
      <div className="lc-body scroll" id="lc-body" hidden={collapsed}>{body}</div>
    </section>
  );
}
