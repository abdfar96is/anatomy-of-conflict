// The guided-tour card (#tour). 'starttour' starts a tour (a plain id from the hash, or {id, focus} from the shell);
// each step sets the lens, selects one entity (the map flies to it) and shows that entity's own text, trimmed.
// The tour ends when state.tour goes null: the card's own buttons, or Esc through the shell's Esc order.

import { createElement, Fragment, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type FocusEvent, type ReactNode } from 'react';
import { on } from '../../app/events';
import { atlas, useAtlas, type AtlasState } from '../../app/store';
import { useDb, useT } from '../../app/useT';
import { CHOKE_STATUS, SEVERITY } from '../../config';
import type { Chokepoint, Conflict, DB, TimelineEvent } from '../../data/types';
import type { Bi } from '../../i18n/format';
import { esc, reducedMotion } from '../../ui/dom';
import { Icon } from '../../ui/Icon';
import { availableTours, sevMark, stepIndex, trimCaption, type Tour, type TourStep } from './tours';

const AUTO_MS = 9000;

type Tx = ReturnType<typeof useT>;
type ConflictX = Conflict & { status?: Bi; dimensionNote?: Bi };
type ChokeX = Chokepoint & { status?: string; oilFlowMbd?: number; flowYear?: number };
type EventX = TimelineEvent & { cat?: string[] };

function SevMark({ id }: { id: string }) {
  const m = sevMark(id);
  if (!m) return null;
  return (
    <svg className="sev-mk" width="12" height="12" viewBox="0 0 12 12" aria-hidden="true" style={{ color: m.color }}>
      {m.parts.map((p, i) => createElement(p.tag, { key: i, ...p.attrs }))}
    </svg>
  );
}

/** A translated string whose {slots} are React nodes (e.g. numbers set in <b class="num">). */
function tNodes(tx: Tx, key: string, nodes: Record<string, ReactNode>): ReactNode[] {
  const names = Object.keys(nodes);
  const vars = Object.fromEntries(names.map((k, j) => [k, `\u0000${j}\u0000`]));
  return tx.t(key, vars).split('\u0000').map((part, j) => (j % 2 ? <Fragment key={j}>{nodes[names[+part] ?? '']}</Fragment> : part));
}

function metaOf(db: DB, s: TourStep, tx: Tx): ReactNode[] {
  const { t, pick: L, fmt, lang } = tx;
  const parts: ReactNode[] = [<span className="tour-kind">{t('kind.' + s.kind)}</span>];
  if (s.kind === 'conflict') {
    const x = db.conflictById.get(s.id);
    const sev = SEVERITY.find((v) => v.id === x?.severity);
    if (x?.regionName) parts.push(<span>{L(x.regionName)}</span>);
    if (sev) parts.push(<span className="tour-sev"><SevMark id={sev.id} />{L(sev)}</span>);
    if (x?.startYear) parts.push(<span>{t('tr.since')} <span className="num">{x.startYear}</span></span>);
  } else if (s.kind === 'choke') {
    const x = db.chokeById.get(s.id) as ChokeX | undefined;
    const st = x?.status ? CHOKE_STATUS[x.status as keyof typeof CHOKE_STATUS] : undefined;
    if (st) parts.push(<span className={`pill ${st.tone}`}><Icon name={st.tone === 'good' ? 'check' : 'alert'} size={12} />{L(st)}</span>);
    if (x?.oilFlowMbd != null) {
      parts.push(<span><span className="num">{fmt.num(x.oilFlowMbd, 1)}</span> {t('tr.mbd')}{x.flowYear ? <> <span className="num">({x.flowYear})</span></> : null}</span>);
    }
  } else if (s.kind === 'event') {
    const x = db.eventById.get(s.id) as EventX | undefined;
    parts.push(<span className="num">{fmt.date(x?.date)}</span>);
    const cats = (x?.cat ?? []).map((c) => db.timeline.catById.get(c)).filter((c) => !!c).map((c) => L(c as Partial<Bi>));
    if (cats.length) parts.push(<span>{cats.join(lang === 'ar' ? '، ' : ', ')}</span>);
  }
  return parts.map((p, j) => <Fragment key={j}>{j > 0 && <span className="tour-dot" aria-hidden="true">·</span>}{p}</Fragment>);
}

function captionOf(db: DB, s: TourStep, { pick: L, pickKey: Lk }: Tx): string {
  if (s.kind === 'conflict') { const x = db.conflictById.get(s.id) as ConflictX | undefined; return trimCaption(L(x?.status) || L(x?.dimensionNote)); }
  if (s.kind === 'choke') { const x = db.chokeById.get(s.id); return trimCaption([Lk(x, 'shareNote'), Lk(x, 'risk')].filter(Boolean).join(' ')); }
  if (s.kind === 'event') return trimCaption(Lk(db.eventById.get(s.id), 'sum'));
  return '';
}

const setTourH = (root: HTMLElement) =>
  document.documentElement.style.setProperty('--tour-h', root.hidden ? '0px' : `${Math.ceil(root.offsetHeight) + 10}px`);

interface Session {
  saved: { year: number; yearFilter: boolean } | null; // year + yearFilter before a tour that moves the timeline
  touchedYear: boolean;
  wantFocus: boolean;
  focusK: string | null; // the card control that had focus when a step changed
  hovered: boolean;
  focused: boolean;
  clock: { key: string; timer: number; tStart: number; remaining: number }; // autoplay
}
const left = (c: Session['clock']) => (c.timer ? c.remaining - (performance.now() - c.tStart) : c.remaining);

export function TourPlayer() {
  const db = useDb();
  const tx = useT();
  const { t, pick: L, lang } = tx;
  const tour = useAtlas((s) => s.tour);
  const byId = useMemo(() => new Map(availableTours(db).map((tr) => [tr.id, tr])), [db]);
  const rootRef = useRef<HTMLDivElement>(null);
  const ses = useRef<Session>({
    saved: null, touchedYear: false, wantFocus: false, focusK: null, hovered: false, focused: false,
    clock: { key: '', timer: 0, tStart: 0, remaining: AUTO_MS },
  });
  const [playing, setPlaying] = useState(false);
  const [held, setHeld] = useState(false);
  const [expandedKey, setExpandedKey] = useState<string | null>(null);
  const [fill, setFill] = useState({ key: '', ms: 0 }); // how far the step's progress bar had run when autoplay resumed

  const tr = tour ? byId.get(tour.id) ?? null : null;
  const i = tr && tour ? stepIndex(tr, tour.step) : 0;
  const key = tr ? `${tr.id}:${i}` : '';
  const rm = reducedMotion();

  const go = useCallback((t: Tour, j: number) => {
    const s = t.steps[j];
    if (!s) return;
    const x = ses.current, root = rootRef.current, a = document.activeElement;
    x.focusK = root && a && root.contains(a) ? a.closest<HTMLElement>('[data-k]')?.dataset.k ?? null : null;
    const patch: Partial<AtlasState> = { lens: s.lens, tour: { id: t.id, step: j } };
    if (s.year != null) { patch.year = s.year; patch.yearFilter = true; x.touchedYear = true; }
    atlas.set(patch);
    atlas.select(s.kind, s.id);
  }, []);

  const end = () => { atlas.set({ tour: null }); };

  // 'starttour' comes from the hash (a plain id) or from the shell ({id, focus}).
  useEffect(() => on('starttour', (p) => {
    const t = byId.get(typeof p === 'string' ? p : p.id);
    if (!t) return;
    const s = atlas.get(), x = ses.current;
    if (!s.tour) x.saved = { year: s.year, yearFilter: s.yearFilter };
    setPlaying(false);
    setExpandedKey(null);
    x.clock.key = ''; // the first stop always starts a fresh clock
    x.wantFocus = typeof p === 'object' && !!p.focus;
    if (s.view) atlas.set({ view: null });
    go(t, 0);
  }), [byId, go]);

  // The tour ended (exit, finish, Esc): hand focus back to the top bar, stop autoplay, give the timeline year back.
  useEffect(() => useAtlas.subscribe((s, prev) => {
    if (s.tour || !prev.tour) return;
    const x = ses.current;
    if (rootRef.current?.contains(document.activeElement)) {
      [...document.querySelectorAll<HTMLElement>('#topbar [data-k="tours"], #topbar [data-k="menu"]')].find((b) => b.getClientRects().length)?.focus();
    }
    x.hovered = x.focused = false;
    x.focusK = null;
    clearTimeout(x.clock.timer);
    x.clock.timer = 0;
    x.clock.key = '';
    setPlaying(false);
    setHeld(false);
    setExpandedKey(null);
    if (x.touchedYear && x.saved) atlas.set({ year: x.saved.year, yearFilter: x.saved.yearFilter });
    x.touchedYear = false;
    x.saved = null;
  }), []);

  // Autoplay clock: a new stop starts a full 9 s; holding (pointer over the card, focus inside it) keeps what is left.
  const tick = useCallback(() => {
    ses.current.clock.timer = 0;
    const s = atlas.get().tour, t = s ? byId.get(s.id) : undefined;
    if (!s || !t) return;
    const j = stepIndex(t, s.step);
    if (j < t.steps.length - 1) go(t, j + 1);
    else setPlaying(false);
  }, [byId, go]);

  const active = !!tr;
  useEffect(() => {
    const c = ses.current.clock;
    if (c.key !== key) { c.key = key; c.remaining = AUTO_MS; }
    if (!active || !playing || held || rm) return;
    c.tStart = performance.now();
    c.timer = window.setTimeout(tick, Math.max(0, c.remaining));
    return () => { c.remaining = left(c); clearTimeout(c.timer); c.timer = 0; };
  }, [key, active, playing, held, rm, tick]);

  // ←/→ step through the tour when nothing else owns the arrows (page focus or focus on the card).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const s = atlas.get();
      if (!s.tour || e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return;
      if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
      const a = document.activeElement;
      if (!(a == null || a === document.body || a === document.documentElement || rootRef.current?.contains(a))) return;
      if (document.querySelector('#palette:not([hidden]), #help:not([hidden])')) return;
      const t = byId.get(s.tour.id);
      if (!t) return;
      e.preventDefault();
      const j = stepIndex(t, s.tour.step);
      const forward = (e.key === 'ArrowRight') !== (s.lang === 'ar');
      if (forward && j < t.steps.length - 1) go(t, j + 1);
      else if (!forward && j > 0) go(t, j - 1);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [byId, go]);

  // Focus after a step change: into the card when the shell asked for it, else back onto the control that had it
  // (Previous turns disabled on the first stop, so focus moves to Next).
  useLayoutEffect(() => {
    const root = rootRef.current, x = ses.current;
    if (!root || root.hidden) return;
    const next = root.querySelector<HTMLElement>('[data-k="tour-next"]');
    if (x.wantFocus) { x.wantFocus = false; x.focusK = null; next?.focus(); return; }
    const k = x.focusK;
    if (!k) return;
    x.focusK = null;
    (root.querySelector<HTMLElement>(`[data-k="${k}"]:not([disabled])`) ?? next)?.focus();
  });

  // --tour-h lets the toasts sit above the card.
  useLayoutEffect(() => { if (rootRef.current) setTourH(rootRef.current); });
  useEffect(() => {
    const root = rootRef.current;
    const ro = root && typeof ResizeObserver === 'function' ? new ResizeObserver(() => setTourH(root)) : null;
    if (root) ro?.observe(root);
    return () => { ro?.disconnect(); document.documentElement.style.removeProperty('--tour-h'); };
  }, []);

  // Autoplay pauses while the pointer is over the card or focus is inside it (except on the play toggle itself).
  const syncHeld = () => setHeld(ses.current.hovered || ses.current.focused);
  const onFocusIn = (e: FocusEvent<HTMLDivElement>) => {
    ses.current.focused = !(e.target as Element).closest('[data-k="tour-play"]');
    syncHeld();
  };
  const onFocusOut = (e: FocusEvent<HTMLDivElement>) => {
    if (e.currentTarget.contains(e.relatedTarget as Node | null)) return;
    ses.current.focused = false;
    syncHeld();
  };

  const togglePlay = () => {
    if (rm) return;
    const x = ses.current;
    if (!playing) setFill({ key, ms: Math.round(AUTO_MS - left(x.clock)) });
    x.hovered = false;
    setPlaying(!playing);
    syncHeld();
  };

  let card: ReactNode = null, liveText = '';
  if (tr) {
    const n = tr.steps.length, s = tr.steps[i]!, last = i === n - 1;
    const name = db.nameOf(s.kind, s.id, lang);
    const expanded = expandedKey === key, on = playing && !rm;
    liveText = `${t('tr.stepOf', { i: i + 1, n })}: ${name}`;
    card = (
      <>
        <div className="tour-head">
          <span className="tour-ic"><Icon name={tr.icon} size={15} /></span>
          <span className="tour-title"><span className="eyebrow">{t('tr.tour')}</span><b>{L(tr)}</b></span>
          <span className="tour-count">{tNodes(tx, 'tr.stepOf', { i: <b className="num">{i + 1}</b>, n: <b className="num">{n}</b> })}</span>
          <button type="button" className="btn ghost icon tour-x" data-k="tour-exit" aria-label={t('tr.exit')} data-tip={esc(t('tr.exit'))} onClick={end}>
            <Icon name="close" size={16} />
          </button>
        </div>
        <div className="tour-segs" aria-hidden="true">
          {tr.steps.map((_, j) => (
            <span key={j} className={`seg${j < i ? ' done' : j === i ? ' cur' : ''}`}>
              {j === i && <i style={{ animationDelay: `-${fill.key === key ? fill.ms : 0}ms` }} />}
            </span>
          ))}
        </div>
        <h2 className="tour-name">{name}</h2>
        <p className="tour-meta">{metaOf(db, s, tx)}</p>
        <p className={`tour-cap${expanded ? ' open' : ''}`} id="tour-cap">{captionOf(db, s, tx)}</p>
        <button type="button" className="tour-more" data-k="tour-more" aria-expanded={expanded} aria-controls="tour-cap"
          onClick={() => setExpandedKey(expanded ? null : key)}>{t(expanded ? 'tr.less' : 'tr.more')}</button>
        {db.isUnverified(s.kind, s.id) && (
          <p className="tour-unv"><Icon name="info" size={13} /><span>{tNodes(tx, 'tr.unverified', { date: <span className="num">{tx.fmt.date(db.conflictsAsOf)}</span> })}</span></p>
        )}
        <div className="tour-ctrl">
          <button type="button" className="btn ghost tour-play" data-k="tour-play" aria-label={t('tr.play')} aria-pressed={on}
            aria-disabled={rm ? 'true' : undefined} data-tip={esc(t(rm ? 'tr.playOff' : 'tr.playTip'))} onClick={togglePlay}>
            <Icon name={on ? 'pause' : 'play'} size={15} /><span>{t('tr.play')}</span>
          </button>
          <span className="tour-sp" />
          <button type="button" className="btn tour-prev" data-k="tour-prev" aria-label={t('tr.prev')} disabled={i === 0} onClick={() => { if (i > 0) go(tr, i - 1); }}>
            <Icon name="chevron" size={16} /><span>{t('tr.prev')}</span>
          </button>
          <button type="button" className="btn primary tour-next" data-k="tour-next" onClick={() => { if (!last) go(tr, i + 1); else end(); }}>
            <span>{t(last ? 'tr.finish' : 'tr.next')}</span>{!last && <Icon name="chevron" size={16} />}
          </button>
        </div>
      </>
    );
  }

  return (
    <div id="tour" ref={rootRef} hidden={!tr} role={tr ? 'region' : undefined} aria-label={tr ? t('tr.region', { title: L(tr) }) : undefined}
      onPointerEnter={(e) => { if (e.pointerType === 'mouse') { ses.current.hovered = true; syncHeld(); } }}
      onPointerLeave={() => { if (ses.current.hovered) { ses.current.hovered = false; syncHeld(); } }}
      onFocus={onFocusIn} onBlur={onFocusOut}>
      <div className={`tour-card${tr && playing && !rm ? ' is-playing' : ''}${tr && held ? ' is-held' : ''}`}>{card}</div>
      <p className="vh tour-live" aria-live="polite">{liveText}</p>
    </div>
  );
}
