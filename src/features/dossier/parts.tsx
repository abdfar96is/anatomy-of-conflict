// Small builders shared by every kind (React port of the v2 dossier's HTML builders). Each returns an element, or null
// when it has nothing to show, so sec() can drop empty sections exactly as v2 dropped empty strings.

import { Fragment, useId, useLayoutEffect, useRef, useState, type HTMLAttributes, type ReactElement, type ReactNode } from 'react';
import { atlas, useAtlas } from '../../app/store';
import { CHOKE_STATUS, CONFIDENCE, SEVERITY } from '../../config';
import type { Bi } from '../../i18n/format';
import type { Country, Kind, LiveKey } from '../../data/types';
import { esc } from '../../ui/dom';
import { Icon } from '../../ui/Icon';
import { resClassVar, sevVar } from '../../ui/palette';
import { Picto } from '../../ui/Picto';
import { SITE_PICTO } from '../../ui/pictograms';
import type { CatX, ChokeX, ConflictX, Ctx, DatasetX, EventX, Group, Provenance, RefX, ResEntryX, Site } from './model';
import { FAMILY, NE } from './strings';

const SEV: Record<string, (typeof SEVERITY)[number]> = Object.fromEntries(SEVERITY.map((s) => [s.id, s]));
const CONF: Record<string, { ar: string; en: string; tone: string; note: Bi }> = CONFIDENCE;
const CHOKE: Record<string, { ar: string; en: string; tone: string }> = CHOKE_STATUS;

// Severity marker shapes (config SEVERITY[].shape), drawn in the severity token.
const SHAPES: Record<string, ReactNode> = {
  pulse: <><circle cx="7" cy="7" r="3.2" fill="currentColor" /><circle cx="7" cy="7" r="6" fill="none" stroke="currentColor" strokeWidth="1.2" opacity=".55" /></>,
  disc: <circle cx="7" cy="7" r="5" fill="currentColor" />,
  square: <rect x="2.5" y="2.5" width="9" height="9" rx="1" fill="currentColor" />,
  ring: <circle cx="7" cy="7" r="4.4" fill="none" stroke="currentColor" strokeWidth="2.2" />,
  diamond: <path d="M7 1.4L12.6 7 7 12.6 1.4 7z" fill="currentColor" />,
  dashed: <circle cx="7" cy="7" r="5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeDasharray="2.4 1.8" />,
  dot: <circle cx="7" cy="7" r="3" fill="currentColor" />,
  hollow: <circle cx="7" cy="7" r="4.6" fill="none" stroke="currentColor" strokeWidth="1.3" />,
};
// Edge kinds mirror the network drawing: treaty = solid line, assessed = dashed.
const Line = ({ dash }: { dash: boolean }) => (
  <svg className="dz-line" width="16" height="6" viewBox="0 0 16 6" aria-hidden="true">
    <path d="M1 3h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeDasharray={dash ? '2.5 3' : undefined} />
  </svg>
);

/** The site name of a source link, for a compact label (www. dropped). */
export const hostOf = (u: string): string => { try { return new URL(u).hostname.replace(/^www\./, ''); } catch { return u; } };

/** True for what renders nothing: null, false, '' and arrays of those. */
export const isEmpty = (n: ReactNode): boolean =>
  n == null || n === false || n === true || n === '' || (Array.isArray(n) && n.every(isEmpty));

const withKeys = (items: ReactNode[]) => items.filter((x) => !isEmpty(x)).map((x, i) => <Fragment key={i}>{x}</Fragment>);

/** Long prose shows four lines and a "read more" control, which drops itself when the preview already shows everything. */
function Clamp({ text, cls, lang, more, less }: { text: string; cls: string; lang?: string; more: string; less: string }) {
  const id = `dz-p${useId()}`;
  const ref = useRef<HTMLParagraphElement>(null);
  const [openFor, setOpenFor] = useState<string | null>(null);
  const [fitsFor, setFitsFor] = useState<string | null>(null);
  const open = openFor === text;
  useLayoutEffect(() => {
    const p = ref.current;
    if (p && !open && p.scrollHeight <= p.clientHeight + 2) setFitsFor(text);
  }, [text, open]);
  const la = lang ? { lang, dir: 'auto' } : {};
  if (fitsFor === text) return <p className={cls} {...la}>{text}</p>;
  return (
    <>
      <p ref={ref} className={`${cls} dz-clamp${open ? ' is-open' : ''}`} id={id} {...la}>{text}</p>
      <button type="button" className="dz-more" data-act="more" aria-controls={id} aria-expanded={open} onClick={() => setOpenFor(open ? null : text)}>
        <span>{open ? less : more}</span><Icon name="chevron" size={14} />
      </button>
    </>
  );
}

/** The event's "set the timeline to {y}" button; it follows year/yearFilter on its own, as v2 synced it. */
function YearButton({ year, label }: { year: number; label: string }) {
  const pressed = useAtlas((s) => s.year === year && s.yearFilter);
  return (
    <button type="button" className="btn dz-wide-btn" data-act="year" aria-pressed={pressed} onClick={() => atlas.set({ year, yearFilter: true })}>
      <Icon name="clock" size={16} /><span>{label}</span>
    </button>
  );
}

export interface KitActions { goto: (tab: string, anchor: string | null) => void }

/** The builders bound to one render: language, formatters, the model and the frame's tab switch. */
export function kit(c: Ctx, actions: KitActions) {
  const { db, lang, t, pick: L, pickKey: Lk, fmt } = c;

  const hl = (isos?: string[] | null) => (isos?.length ? isos.join(' ') : undefined);
  const sw = (color: string) => <i className="sw" style={{ background: color }} />;
  const dataColor = (col?: string) => (/^#[0-9a-f]{3,8}$/i.test(String(col || '')) ? col! : 'var(--cat-0)');
  const listJoin = (arr: string[]) => arr.join(lang === 'ar' ? '، ' : ', ');
  const byName = (a: string, b: string) => a.localeCompare(b, lang);
  const nameC = (iso: string) => { const x = db.countries.get(iso); return x ? Lk(x, 'name') : iso; };
  const tradName = (tid: string | null) => (tid ? L(db.religion.traditionById.get(tid)) || tid : '');
  const resTypeName = (id: string) => L(db.resources.typeById.get(id)) || id;
  const resColor = (type: string) => resClassVar(db.resources.classOf[type] ?? '');
  const pickPair = (pair: [string, string] | undefined, raw: string) => (pair ? pair[lang === 'ar' ? 0 : 1] : raw);
  const ne = (v?: string) => (v ? pickPair(NE[v], String(v).replace(/^\d+\.\s*/, '')) : '—');
  const famName = (f?: string) => pickPair(f ? FAMILY[f] : undefined, f || '—');
  const sevName = (id: string) => L(SEV[id]);

  const sevGlyph = (id: string, size = 14) => (
    <svg className="dz-glyph" width={size} height={size} viewBox="0 0 14 14" aria-hidden="true" style={{ color: sevVar(id) }}>
      {SHAPES[SEV[id]?.shape ?? ''] ?? SHAPES.dot}
    </svg>
  );
  const sevPill = (id: string) => <span className="pill dz-pill">{sevGlyph(id, 12)}{sevName(id)}</span>;
  const confPill = (cf: ConflictX) => {
    const x = CONF[cf.confidence ?? ''];
    if (!x) return null;
    return (
      <span className={`pill ${x.tone}`} tabIndex={0} data-tip={esc(L(x.note))}>
        <Icon name={x.tone === 'good' ? 'check' : 'alert'} size={13} />{L(x)}<span className="vh">: {L(x.note)}</span>
      </span>
    );
  };
  /** Badge for items whose status/recent text comes from the original atlas and was not re-checked in this edition. */
  const unverifiedPill = (kind: Kind, id: string) => {
    if (!db.isUnverified(kind, id)) return null;
    const why = t('dz.uv.tip', { d: fmt.date(db.conflictsAsOf) });
    return (
      <span className="pill dz-pill dz-uv" tabIndex={0} data-tip={esc(why)}>
        <Icon name="info" size={13} />{t('dz.uv')}<span className="vh">: {why}</span>
      </span>
    );
  };
  const chokePill = (p: ChokeX) => {
    const s = CHOKE[p.status ?? ''];
    if (!s) return null;
    return <span className={`pill ${s.tone}`}><Icon name={s.tone === 'good' ? 'check' : 'alert'} size={13} />{L(s)}</span>;
  };
  const kindPill = (kind: string) => {
    const d = (db.relations.edgeKinds as Record<string, Bi> | undefined)?.[kind];
    return (
      <span className="pill dz-pill" data-tip={d ? esc(L(d)) : undefined}>
        <Line dash={kind !== 'treaty'} />{t(kind === 'treaty' ? 'dz.kindTreaty' : 'dz.kindAssessed')}
      </span>
    );
  };

  const coord = (ll: (number | null | undefined)[] | null | undefined) => {
    const lon = ll?.[0], lat = ll?.[1];
    if (lon == null || lat == null || Number.isNaN(+lon)) return null;
    return (
      <span className="dz-coord">
        <bdi className="data">{fmt.num(Math.abs(lat), 2)}°</bdi>{' '}{t(lat >= 0 ? 'dz.N' : 'dz.S')}{' '}
        <bdi className="data">{fmt.num(Math.abs(lon), 2)}°</bdi>{' '}{t(lon >= 0 ? 'dz.E' : 'dz.W')}
      </span>
    );
  };
  /** "34.3 مليون" → number in the data face, unit word in the UI face. */
  const numUnit = (str: string) => {
    const m = String(str).match(/^(\$?[−-]?[\d.,]+)\s*(.*)$/);
    if (!m) return str;
    return <><span className="data">{m[1]}</span>{m[2] ? <>{' '}<span className="dz-unit">{m[2]}</span></> : null}</>;
  };

  const cchip = (iso: string) => {
    const x = db.countries.get(iso);
    if (!x) return <span key={iso} className="chip dz-chip is-static">{iso}</span>;
    return <button key={iso} type="button" className="chip dz-chip" data-sel-kind="country" data-sel-id={iso} data-hl={iso}>{Lk(x, 'name')}</button>;
  };
  const cchips = (isos: string[] | null | undefined, { sort = false } = {}) => {
    let list = [...new Set(isos ?? [])];
    if (sort) list = list.sort((a, b) => byName(nameC(a), nameC(b)));
    return list.length ? <div className="chips dz-chips">{list.map(cchip)}</div> : null;
  };
  const kchip = (kind: Kind, id: string, label: string, { lead, isos }: { lead?: ReactNode; isos?: string[] } = {}) => (
    <button key={`${kind}:${id}`} type="button" className="chip dz-chip" data-sel-kind={kind} data-sel-id={id} data-hl={hl(isos)}>{lead}{label}</button>
  );

  const sec = (title: string | null, inner: ReactNode | ReactNode[], o: { count?: number | null; id?: string; cls?: string; lead?: ReactNode } = {}) => {
    if (isEmpty(inner)) return null;
    return (
      <section className={o.cls ? `dz-sec ${o.cls}` : 'dz-sec'} id={o.id ? `dz-a-${o.id}` : undefined}>
        {title ? <h3 className="dz-h">{o.lead}<span>{title}</span>{o.count != null ? <span className="n">{fmt.num(o.count)}</span> : null}</h3> : null}
        {Array.isArray(inner) ? withKeys(inner) : inner}
      </section>
    );
  };
  const prose = (text: unknown, { clamp = true, cls = '', lang: la }: { clamp?: boolean; cls?: string; lang?: string } = {}) => {
    const s = String(text ?? '').trim();
    if (!s) return null;
    const className = cls ? `dz-prose ${cls}` : 'dz-prose';
    if (!clamp || s.length < 170) return <p className={className} {...(la ? { lang: la, dir: 'auto' } : {})}>{s}</p>;
    return <Clamp text={s} cls={className} lang={la} more={t('dz.readMore')} less={t('dz.readLess')} />;
  };
  const empty = (msg: string) => <p className="dz-empty"><Icon name="info" size={16} /><span>{msg}</span></p>;
  const caveat = (msg: string | null | undefined) => (msg ? <p className="caveat dz-caveat"><Icon name="alert" size={16} /><span>{msg}</span></p> : null);
  const note = (msg: string | null | undefined) => (msg ? <p className="dz-note">{msg}</p> : null);
  const bullets = (items: string[]) => (items.length ? <ul className="dz-list">{items.map((s, i) => <li key={i}>{s}</li>)}</ul> : null);
  const rows = (items: ReactElement[]) =>
    (items.length ? <ul className="dz-rows" role="list">{items.map((el, i) => <li key={el.key ?? i}>{el}</li>)}</ul> : null);

  /** A figure; with `source`, its year and source sit on a line under it, the source linking to the data. */
  const fact = (label: string, value: ReactNode, { year, wide = false, text = false, tipText, source }: {
    year?: number | string | null; wide?: boolean; text?: boolean; tipText?: string; source?: FactSource;
  } = {}) => (
    <div key={label} className={`dz-fact${wide ? ' wide' : ''}${text ? ' text' : ''}`}>
      <dt data-tip={tipText ? esc(tipText) : undefined} tabIndex={tipText ? 0 : undefined}>{label}{tipText ? <Icon name="info" size={12} /> : null}</dt>
      <dd>{value}{year && !source ? <span className="dz-yr data">{year}</span> : null}{source ? factSource(source, year) : null}</dd>
    </div>
  );
  const factSource = (s: FactSource, year?: number | string | null) => (
    <span className="dz-fsrc">
      {year ? <><span className="data dz-yr">{year}</span>{' · '}</> : null}
      {s.url
        ? <a href={s.url} target="_blank" rel="noopener" data-tip={s.tip ? esc(s.tip) : undefined}>{s.label}<Icon name="external" size={11} /></a>
        : <span data-tip={s.tip ? esc(s.tip) : undefined}>{s.label}</span>}
    </span>
  );
  /** Where a country figure comes from: a World Bank open-data series (weekly refresh) or the Natural Earth baseline. */
  const statSource = (key: LiveKey, src: 'live' | 'ne', iso2?: string): FactSource | undefined => {
    if (src === 'ne') {
      const d = db.datasetById.get('ne-admin0') as DatasetX | undefined;
      return { label: 'Natural Earth', url: d?.url, tip: t('dz.src.neTip') };
    }
    const ind = db.live?.indicators[key];
    if (!ind) return undefined;
    const o = L(ind.origin);
    return {
      label: t('dz.src.live', { o }),
      url: ind.url + (iso2 && /^[A-Z]{2}$/.test(iso2) ? `?locations=${iso2}` : ''),
      tip: t('dz.src.liveTip', { code: ind.code, o: ind.sourceOrganization || o, d: fmt.date(db.live?.retrieved) }),
    };
  };
  /** A country figure with its year and source. Without a value, a live series still says which year it checked. */
  const stat = (label: string, key: LiveKey, x: Country, format: (v: number) => ReactNode, { noneTip, wide, tipText }: { noneTip?: (y: number | string) => string; wide?: boolean; tipText?: string } = {}) => {
    const s = x.stats[key];
    if (s) return fact(label, format(s.v), { year: s.y, source: statSource(key, s.src, x.iso2), wide, tipText });
    const ind = db.live?.indicators[key];
    const y = ind?.latestYear;
    const none = <span className="dz-none" data-tip={noneTip && y ? esc(noneTip(y)) : undefined}>—</span>;
    return fact(label, none, { year: y, source: ind ? statSource(key, 'live', x.iso2) : undefined, wide, tipText });
  };
  /** Sourced caveats on a country's figures (curated/figure_notes.json), each under the label of the figure it qualifies. */
  const figureNotes = (x: Country, labels: Partial<Record<LiveKey, string>>) => {
    const items = (Object.keys(labels) as LiveKey[]).filter((k) => x.figureNotes[k]).map((k) => {
      const n = x.figureNotes[k]!;
      return (
        <div key={k} className="dz-fnote" data-note={k}>
          <p className="caveat dz-caveat"><Icon name="alert" size={16} /><span><b>{t('dz.hu.fnote', { f: labels[k]! })}</b>{' '}{L(n)}</span></p>
          {provenance(n)}
        </div>
      );
    });
    return items.length ? <>{items}</> : null;
  };
  const facts = (items: (ReactElement | null | false | undefined | '')[]) => <dl className="dz-facts">{items.filter(Boolean)}</dl>;

  /** Generic clickable row: glyph | title | meta, then a sub line. */
  const rowBtn = ({ kind, id, isos, glyph, title, meta, sub, lines = 1 }: {
    kind: Kind; id: string; isos?: string[] | null; glyph?: ReactNode; title: ReactNode; meta?: ReactNode; sub?: ReactNode; lines?: 1 | 2;
  }) => (
    <button key={`${kind}:${id}`} type="button" className="dz-row" data-sel-kind={kind} data-sel-id={id} data-hl={hl(isos)}>
      <span className="dz-row-g">{glyph}</span>
      <span className="dz-row-t">{title}</span>
      {isEmpty(meta) ? null : <span className="dz-row-m">{meta}</span>}
      {isEmpty(sub) ? null : <span className={`dz-row-s${lines === 2 ? ' l2' : ''}`}>{sub}</span>}
    </button>
  );
  /** `meta`/`sub` left undefined take the defaults; null means "none" (v2's empty string). */
  const conflictRow = (cf: ConflictX, o: { sub?: ReactNode; meta?: ReactNode } = {}) => rowBtn({
    kind: 'conflict', id: cf.id, isos: cf.countries, glyph: sevGlyph(cf.severity),
    title: L(cf.name),
    meta: o.meta !== undefined ? o.meta : cf.startYear ? <span className="data">{cf.startYear}</span> : null,
    sub: o.sub !== undefined ? o.sub : <><span className="dz-sevlab">{sevName(cf.severity)}</span><span className="dz-one">{L(cf.status)}</span></>,
    lines: o.sub !== undefined ? 2 : 1,
  });
  const chokeRow = (p: ChokeX) => rowBtn({
    kind: 'choke', id: p.id, isos: p.borderStates, glyph: <Icon name="anchor" size={15} />, title: L(p), meta: chokePill(p),
    sub: <span className="dz-one">{Lk(p, 'risk')}</span>,
  });
  /** A site's pictogram where its type has one (the map's marker), else its class colour. */
  const sitePicto = (type: string) => {
    const sp = SITE_PICTO[type];
    if (!sp) return sw(resColor(type));
    return <Picto id={sp.picto} color={sp.fuel === 'oil' ? 'var(--cat-4)' : sp.fuel === 'gas' ? 'var(--cat-1)' : sp.color!} size={16} />;
  };
  const siteRow = (s: Site) => rowBtn({
    kind: 'site', id: s.id, isos: [s.iso3], glyph: sitePicto(s.type), title: L(s),
    meta: <span className="dz-meta-t">{resTypeName(s.type)}</span>, sub: <span className="dz-one">{Lk(s, 'note')}</span>,
  });
  const groupRow = (g: Group) => rowBtn({
    kind: 'group', id: g.id, isos: g.countries, glyph: <Icon name="people" size={15} />, title: Lk(g, 'name'),
    meta: <span className="dz-meta-t">{famName(g.family)}</span>,
    sub: <><span className="dz-sub-k">{Lk(g, 'lang')}</span>{' '}{Lk(g, 'note')}</>, lines: 2,
  });
  const catTag = (cid: string) => {
    const x = db.timeline.catById.get(cid) as CatX | undefined;
    return x ? <span key={cid} className="dz-cat">{sw(dataColor(x.color))}{L(x)}</span> : null;
  };
  const eventList = (events: EventX[], { cats = true } = {}) => {
    if (!events.length) return null;
    return (
      <ol className="dz-tl" role="list">
        {events.map((e) => (
          <li key={e.id}>
            <button type="button" className="dz-tl-item" data-sel-kind="event" data-sel-id={e.id} data-hl={hl(e.countries)}>
              <span className="dz-date">{fmt.date(e.date)}</span>
              <span className="dz-tl-t">{L(e)}</span>
              {cats && e.cat?.length ? <span className="dz-cats">{e.cat.map(catTag)}</span> : null}
            </button>
          </li>
        ))}
      </ol>
    );
  };

  const srcName = (id: string) => {
    const r = db.referenceById.get(id) as RefX | undefined;
    if (r) return L(r.name);
    const d = db.datasetById.get(id) as DatasetX | undefined;
    return d ? L(d.title) : id;
  };
  const refItem = (id: string) => {
    const r = db.referenceById.get(id) as RefX | undefined, d = r ? undefined : db.datasetById.get(id) as DatasetX | undefined;
    const name = srcName(id), url = (r ?? d)?.url;
    const role = r ? L(r.role) : d ? d.publisher : '';
    const link = url && /^https?:\/\//i.test(url)
      ? <a href={url} target="_blank" rel="noopener">{name}<Icon name="external" size={13} /></a>
      : <span>{name}</span>;
    return <li key={id}>{link}{role ? <span className="dz-ref-r">{role}</span> : null}</li>;
  };
  /** Provenance line under a record: since and last-checked dates, then source links, or a plain note when it has none. */
  const provenance = (p: Provenance) => {
    const meta = [p.since ? t('dz.pv.since', { d: fmt.date(p.since) }) : '', p.verified ? t('dz.pv.verified', { d: fmt.date(p.verified) }) : '']
      .filter(Boolean).join(' · ');
    const src = p.sources ?? [];
    return (
      <p className="dz-pv">
        {meta ? <span className="dz-pv-m">{meta}</span> : null}
        {src.length
          ? <span className="dz-pv-s">{t('dz.pv.sources')}{' '}{src.map((u, i) => (
            <Fragment key={u}>{i ? ' · ' : ''}<a href={u} target="_blank" rel="noopener">{hostOf(u)}<Icon name="external" size={11} /></a></Fragment>
          ))}</span>
          : <span className="dz-pv-none">{t('dz.pv.none')}</span>}
      </p>
    );
  };
  const resourceEntry = (e: ResEntryX, i: number, { country = false } = {}) => {
    const conf = (e.conflictIds ?? []).map((id) => db.conflictById.get(id) as ConflictX | undefined).filter((x) => !!x);
    return (
      <div key={`${e.iso3}:${e.type}:${i}`} className="dz-res" data-hl={hl([e.iso3])}>
        <div className="dz-res-h">{sw(resColor(e.type))}<b>{resTypeName(e.type)}</b>
          {country ? cchip(e.iso3) : null}
          {e.rank ? <span className="pill dz-pill">{t('dz.res.rank', { n: e.rank })}</span> : null}
          <span className="dz-res-m"><span className="data">{e.year ?? ''}</span>{e.source ? ` · ${srcName(e.source)}` : null}</span></div>
        {prose(L(e), { cls: 'sm' })}
        {provenance(e)}
        {conf.length ? <div className="chips dz-chips">{conf.map((x) => kchip('conflict', x.id, L(x.name), { lead: sevGlyph(x.severity, 11), isos: x.countries }))}</div> : null}
      </div>
    );
  };

  const altName = (x: Record<string, unknown>): string => {
    const ar = lang === 'ar';
    if (x.nameAr) return String((ar ? x.nameEn : x.nameAr) ?? '');
    const name = x.name as Partial<Bi> | undefined;
    if (name && typeof name === 'object') return (ar ? name.en : name.ar) ?? '';
    return String((ar ? x.en : x.ar) ?? '');
  };
  const altSpan = (x: object) => {
    const a = altName(x as Record<string, unknown>);
    return a ? <bdi className="dz-alt" lang={lang === 'ar' ? 'en' : 'ar'}>{a}</bdi> : null;
  };

  const wideBtn = (iconName: string, label: string, act: string, onClick: () => void) => (
    <button type="button" className="btn dz-wide-btn" data-act={act} onClick={onClick}><Icon name={iconName} size={16} /><span>{label}</span></button>
  );
  const networkBtn = () => wideBtn('network', t('dz.network'), 'network', () => atlas.openView('network'));
  const yearBtn = (year: number) => <YearButton year={year} label={t('dz.e.setYear', { y: year })} />;
  const barRowProps = (iso: string): HTMLAttributes<HTMLLIElement> =>
    ({ 'data-sel-kind': 'country', 'data-sel-id': iso, 'data-hl': iso, role: 'button', tabIndex: 0 }) as HTMLAttributes<HTMLLIElement>;

  return {
    ...c, ...actions, SEV, hl, sw, listJoin, nameC, tradName, resTypeName, resColor, ne, famName, sevName,
    sevGlyph, sevPill, confPill, unverifiedPill, chokePill, kindPill, coord, numUnit, cchip, cchips, kchip,
    sec, prose, empty, caveat, note, bullets, rows, rowBtn, fact, facts, factSource, statSource, stat, figureNotes, conflictRow, chokeRow, siteRow, groupRow,
    catTag, eventList, srcName, refItem, provenance, resourceEntry, altSpan, networkBtn, yearBtn, barRowProps,
  };
}

export type Kit = ReturnType<typeof kit>;
export interface FactSource { label: string; url?: string; tip?: string }
