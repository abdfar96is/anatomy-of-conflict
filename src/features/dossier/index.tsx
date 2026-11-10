// Dossier: the reading panel for whatever is selected (state.selection {kind, id}). Owns #dossier only.
// Every kind shares one frame: a fixed header (eyebrow, name, plate, badges, actions), tabs, and a scrolling body.
// At ≤ 760px base.css makes #dossier a bottom sheet; useSheet adds the drag handle, half/full snap and swipe-down to close.

import {
  Fragment, useCallback, useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore,
  type KeyboardEvent, type MouseEvent, type ReactNode, type UIEvent,
} from 'react';
import { emit } from '../../app/events';
import { atlas, useAtlas } from '../../app/store';
import { useDb, useT } from '../../app/useT';
import type { LensId } from '../../config';
import type { Kind } from '../../data/types';
import { copyText, esc, reducedMotion, shareLink } from '../../ui/dom';
import { Icon } from '../../ui/Icon';
import { hideTip } from '../../ui/tooltip';
import { blocPanel } from './kinds/bloc';
import { chokePanel } from './kinds/choke';
import { conflictPanel } from './kinds/conflict';
import { countryPanel } from './kinds/country';
import { disputedPanel } from './kinds/disputed';
import { eventPanel } from './kinds/event';
import { groupPanel } from './kinds/group';
import { religionPanel } from './kinds/religion';
import { getBorders, subscribeBorders } from '../../data/borders';
import { borderPanel } from './kinds/border';
import { getEnergy, subscribeEnergy } from '../../data/energy';
import { fieldPanel } from './kinds/field';
import { lngPanel } from './kinds/lng';
import { pipelinePanel } from './kinds/pipeline';
import { plantPanel } from './kinds/plant';
import { sitePanel } from './kinds/site';
import type { Panel, Sel } from './model';
import { isEmpty, kit, type Kit } from './parts';
import './strings';
import { useSheet } from './useSheet';

const KIND_ICON: Record<Kind, string> = { country: 'globe', conflict: 'flame', group: 'people', religion: 'pie', choke: 'anchor', disputed: 'hatch', event: 'clock', bloc: 'network', site: 'gem', plant: 'atom', border: 'borders', pipeline: 'pipeline', lng: 'lng', field: 'derrick' };
// Lens a selection kind belongs to (SPEC); country keeps the current lens.
const LENS_OF: Partial<Record<Kind, LensId>> = { conflict: 'conflicts', group: 'ethnic', religion: 'religion', choke: 'chokepoints', disputed: 'disputed', event: 'history', bloc: 'powers', site: 'resources', plant: 'nuclear', border: 'borders', pipeline: 'pipelines', lng: 'pipelines', field: 'pipelines' };
const PANELS: Record<Kind, (id: string, k: Kit) => Panel | null> = {
  country: countryPanel, conflict: conflictPanel, group: groupPanel, religion: religionPanel, choke: chokePanel,
  disputed: disputedPanel, event: eventPanel, bloc: blocPanel, site: sitePanel, plant: plantPanel, border: borderPanel,
  pipeline: pipelinePanel, lng: lngPanel, field: fieldPanel,
};
const LEAVE_MS = 260;

const keyOf = (s: Sel | null) => (s ? `${s.kind}:${s.id}` : null);

// Badges and swatches read resolved colours from pal(), so the panel re-renders when <html data-theme> or the OS scheme
// changes (the store's theme key changes first and the attribute follows a moment later).
const darkQuery = () => (typeof matchMedia === 'function' ? matchMedia('(prefers-color-scheme: dark)') : null);
function subscribeTheme(cb: () => void) {
  const mo = new MutationObserver(cb);
  mo.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
  const mq = darkQuery();
  mq?.addEventListener?.('change', cb);
  return () => { mo.disconnect(); mq?.removeEventListener?.('change', cb); };
}
const themeSnapshot = () => `${document.documentElement.dataset.theme ?? 'system'}|${darkQuery()?.matches ? 'dark' : 'light'}`;

/** Select a linked record, switching to the lens it belongs to. */
function go(kind: Kind, id: string) {
  const lens = LENS_OF[kind];
  if (lens && atlas.get().lens !== lens) atlas.set({ lens });
  atlas.select(kind, id);
}

/** The nearest [data-hl] element inside the panel. */
function hlNode(el: HTMLElement | null, n: EventTarget | null): HTMLElement | null {
  const x = n instanceof Element ? n.closest<HTMLElement>('[data-hl]') : null;
  return x && el?.contains(x) ? x : null;
}

/** Edge fades where tabs continue out of view (scrollLeft runs negative in RTL, hence abs). */
function fadeOf(list: HTMLElement): string {
  const x = Math.abs(list.scrollLeft), more = list.scrollWidth - list.clientWidth;
  return `${x > 1 ? ' fade-start' : ''}${x < more - 1 ? ' fade-end' : ''}`;
}

export function Dossier() {
  const db = useDb();
  const T = useT();
  const theme = useSyncExternalStore(subscribeTheme, themeSnapshot, () => 'system|light');
  const sel = useAtlas((s) => s.selection);
  // a historical unit's panel waits for the borders data, which loads on demand
  useSyncExternalStore(subscribeBorders, getBorders, getBorders);
  useSyncExternalStore(subscribeEnergy, getEnergy, getEnergy);
  const live = sel && db.exists(sel.kind, sel.id) ? sel : null;
  const liveKey = keyOf(live);

  const elRef = useRef<HTMLElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const tabsRef = useRef<HTMLDivElement>(null);
  const sheet = useSheet(elRef, !!live);

  // Open and close: a closed panel stays rendered while it animates out (dz-leave), and a panel opened from closed
  // starts from dz-enter. Reduced motion skips both.
  const [prev, setPrev] = useState<Sel | null>(null);
  const [leaving, setLeaving] = useState<Sel | null>(null);
  const [entering, setEntering] = useState(false);
  if (keyOf(prev) !== liveKey) {
    setPrev(live);
    if (live) {
      if (!prev && !leaving) {
        sheet.setSnap('half');
        if (!reducedMotion()) setEntering(true);
      }
      setLeaving(null);
    } else if (prev && !reducedMotion()) {
      setLeaving(prev);
    }
  }
  useEffect(() => {
    if (!leaving) return;
    const id = setTimeout(() => setLeaving(null), LEAVE_MS);
    return () => clearTimeout(id);
  }, [leaving]);
  useLayoutEffect(() => {
    if (!entering) return;
    void elRef.current?.offsetWidth; // paint the start state so the transition runs
    const id = requestAnimationFrame(() => setEntering(false));
    return () => cancelAnimationFrame(id);
  }, [entering]);

  const display = live ?? leaving;
  const displayKey = keyOf(display);

  // Tabs: each kind remembers its last tab; a tab switch scrolls the body to the top or to an anchor in it.
  const [tabMem, setTabMem] = useState<Partial<Record<Kind, string>>>({});
  const [jump, setJump] = useState<{ anchor: string | null } | null>(null);
  const [fade, setFade] = useState('');
  const [condensedFor, setCondensedFor] = useState<string | null>(null);

  let panel: Panel | null = null;
  try {
    panel = display ? PANELS[display.kind](display.id, kit({ ...T, db }, { goto: (tab, anchor) => selectTab(tab, anchor) })) : null;
  } catch (err) {
    console.error('[atlas] dossier failed', err);
  }
  const tabs = panel?.tabs ?? [];
  const mem = display ? tabMem[display.kind] : undefined;
  const active = tabs.find((tb) => tb.id === mem) ?? tabs[0];

  function selectTab(id: string, anchor: string | null = null) {
    if (!display || !tabs.some((tb) => tb.id === id)) return;
    setTabMem((m) => ({ ...m, [display.kind]: id }));
    setJump({ anchor });
  }

  useLayoutEffect(() => {
    const body = bodyRef.current;
    if (!jump || !body) return;
    body.scrollTop = 0;
    const a = jump.anchor ? body.querySelector<HTMLElement>(`#dz-a-${jump.anchor}`) : null;
    if (a) body.scrollTop = a.offsetTop - 6;
  }, [jump]);

  // Keep the active tab inside the horizontally scrolling strip (without scrollIntoView, which can move hidden-overflow ancestors).
  const activeId = active?.id;
  useLayoutEffect(() => {
    const list = tabsRef.current;
    const b = list?.querySelector<HTMLElement>('[aria-selected="true"]');
    if (!list || !b) return;
    const r = b.getBoundingClientRect(), lr = list.getBoundingClientRect();
    if (r.left < lr.left) list.scrollLeft += r.left - lr.left - 16;
    else if (r.right > lr.right) list.scrollLeft += r.right - lr.right + 16;
    setFade(fadeOf(list));
    // tab widths change when the web fonts arrive: measure again then, or a strip that fits keeps its fade
    let current = true;
    void document.fonts?.ready.then(() => { if (current && list.isConnected) setFade(fadeOf(list)); });
    return () => { current = false; };
  }, [displayKey, activeId, T.lang]);

  // Map emphasis from the panel: pointing at (or focusing) anything with data-hl highlights those countries.
  const hlKey = useRef<string | null>(null);
  const setHl = useCallback((key: string | null) => {
    if (key === hlKey.current) return;
    hlKey.current = key;
    emit('highlight', key ? { iso3: key.split(' ') } : null);
  }, []);
  const shown = useRef(false);
  useLayoutEffect(() => {
    if (!liveKey && !shown.current) return; // closed before and after: nothing to clear
    shown.current = !!liveKey;
    setHl(null);
    hideTip();
  }, [liveKey, T.lang, theme, setHl]);

  // Focus: a keyboard user who opens a record, or moves to another from inside the panel, lands on its name;
  // closing returns focus to whatever opened the panel (or the map).
  const kbd = useRef(false);
  const opener = useRef<HTMLElement | null>(null);
  const pre = useRef<{ wasClosed: boolean; focusInside: boolean; active: Element | null }>({ wasClosed: true, focusInside: false, active: null });
  const keptScroll = useRef<number | null>(null);
  useEffect(() => {
    const onKey = (e: globalThis.KeyboardEvent) => { if (!e.ctrlKey && !e.metaKey && !e.altKey) kbd.current = true; };
    const onPointer = () => { kbd.current = false; };
    addEventListener('keydown', onKey, true);
    addEventListener('pointerdown', onPointer, true);
    // Runs inside atlas.set, before React renders the change: record where focus was, and the reading position
    // that a language or theme switch keeps (v2 restored scrollTop; the browser's scroll anchoring would move it).
    const unsubscribe = useAtlas.subscribe((s, p) => {
      if (s.lang !== p.lang || s.theme !== p.theme) keptScroll.current = bodyRef.current?.scrollTop ?? null;
      if (s.selection === p.selection) return;
      const el = elRef.current;
      pre.current = {
        wasClosed: !el || el.hidden !== false || el.classList.contains('dz-leave'),
        focusInside: !!el?.contains(document.activeElement),
        active: document.activeElement,
      };
    });
    return () => {
      removeEventListener('keydown', onKey, true);
      removeEventListener('pointerdown', onPointer, true);
      unsubscribe();
    };
  }, []);
  const prevLive = useRef<string | null>(null);
  useLayoutEffect(() => {
    const was = prevLive.current;
    prevLive.current = liveKey;
    if (was === liveKey) return;
    const p = pre.current, el = elRef.current;
    if (liveKey) {
      if (!was) opener.current = p.active instanceof HTMLElement && p.active !== document.body && !el?.contains(p.active) ? p.active : null;
      if (kbd.current && (p.wasClosed || p.focusInside)) document.getElementById('dz-title')?.focus({ preventScroll: true });
    } else {
      if (p.focusInside) (opener.current?.isConnected ? opener.current : document.getElementById('map'))?.focus({ preventScroll: true });
      opener.current = null;
    }
  }, [liveKey]);

  useLayoutEffect(() => {
    const b = bodyRef.current, y = keptScroll.current;
    keptScroll.current = null;
    if (!b || y == null) return;
    b.scrollTop = y;
    // again once the "read more" controls have settled (they re-render after measuring), still before the paint
    const id = requestAnimationFrame(() => { b.scrollTop = y; });
    return () => cancelAnimationFrame(id);
  }, [T.lang, theme]);

  // A plain mouse wheel over the tab strip scrolls it sideways (the strip overflows in English). Needs a non-passive listener.
  useEffect(() => {
    const el = elRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      const list = e.target instanceof Element ? e.target.closest<HTMLElement>('.dz-tabs') : null;
      if (!list || list.scrollWidth <= list.clientWidth || Math.abs(e.deltaX) >= Math.abs(e.deltaY)) return;
      e.preventDefault();
      list.scrollLeft += (atlas.get().lang === 'ar' ? -1 : 1) * e.deltaY;
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, []);

  // ---- interaction
  const onClick = (e: MouseEvent<HTMLElement>) => {
    const target = e.target as Element;
    if (target.closest('[data-act], [role="tab"]')) return; // they handle their own clicks
    const s = target.closest<HTMLElement>('[data-sel-kind]');
    if (s && e.currentTarget.contains(s)) go(s.dataset.selKind as Kind, s.dataset.selId ?? '');
  };
  const onKeyDown = (e: KeyboardEvent<HTMLElement>) => {
    // bar-list rows are <li role="button">: give them button keys
    const rb = (e.target as Element).closest<HTMLElement>('[role="button"][data-sel-kind]');
    if (rb && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); go(rb.dataset.selKind as Kind, rb.dataset.selId ?? ''); }
  };
  const onTabKey = (e: KeyboardEvent<HTMLDivElement>) => {
    const els = [...e.currentTarget.querySelectorAll<HTMLElement>('[role="tab"]')];
    const n = els.length;
    let i = els.indexOf(e.target as HTMLElement);
    if (i < 0) return;
    const rtl = T.lang === 'ar';
    const fwd = rtl ? 'ArrowLeft' : 'ArrowRight', back = rtl ? 'ArrowRight' : 'ArrowLeft';
    if (e.key === fwd) i = (i + 1) % n;
    else if (e.key === back) i = (i - 1 + n) % n;
    else if (e.key === 'Home') i = 0;
    else if (e.key === 'End') i = n - 1;
    else return;
    e.preventDefault();
    const b = els[i]!;
    b.focus({ preventScroll: true });
    selectTab(b.dataset.tab ?? '');
  };
  const onBodyScroll = (e: UIEvent<HTMLDivElement>) => {
    const b = e.currentTarget, y = b.scrollTop;
    if (y > 48 && b.scrollHeight - b.clientHeight > 160) setCondensedFor(displayKey);
    else if (y < 8) setCondensedFor(null);
  };

  const fly = () => { if (live) emit('flyto', { kind: live.kind, id: live.id }); };
  const copy = () => { void copyText(shareLink()).then((ok) => emit('toast', T.t(ok ? 'dz.copied' : 'dz.copyFail'))); };
  const compare = () => { if (live?.kind === 'country') atlas.set({ compare: [live.id, null], view: 'compare' }); };
  const actionBtn = (act: string, ic: string, key: string, onPress: () => void) => (
    <button type="button" className="btn ghost icon dz-act" data-act={act} aria-label={T.t(key)} data-tip={esc(T.t(key))} onClick={onPress}>
      <Icon name={ic} size={17} />
    </button>
  );

  // ---- render
  let body: ReactNode = null;
  try {
    body = active?.render() ?? null;
  } catch (err) {
    console.error('[atlas] dossier tab failed', err);
  }
  const h = panel?.head;
  const multi = tabs.length > 1;
  const snapFull = sheet.snap === 'full';
  const plate = (h?.plate ?? []).filter((x) => !isEmpty(x));
  const badges = (h?.badges ?? []).filter((x) => !isEmpty(x));
  const cls = [
    entering && 'dz-enter', !live && leaving && 'dz-leave', displayKey && condensedFor === displayKey && 'is-condensed', sheet.dragging && 'is-dragging',
  ].filter(Boolean).join(' ');

  return (
    <aside id="dossier" ref={elRef} hidden={!panel} aria-labelledby="dz-title" className={cls || undefined}
      data-kind={display?.kind} data-snap={panel ? sheet.snap : undefined}
      onClick={onClick} onKeyDown={onKeyDown} {...sheet.handlers}
      onPointerOver={(e) => setHl(hlNode(elRef.current, e.target)?.dataset.hl ?? null)}
      onPointerLeave={() => setHl(null)}
      onFocus={(e) => { const n = hlNode(elRef.current, e.target); if (n) setHl(n.dataset.hl ?? null); }}
      onBlur={(e) => { if (!hlNode(elRef.current, e.relatedTarget)) setHl(null); }}>
      {display && h && active ? (
        <Fragment key={displayKey}>
          <div className="dz-grip">
            <button type="button" className="dz-handle" data-act="snap" aria-expanded={snapFull} aria-label={T.t(snapFull ? 'dz.shrink' : 'dz.expand')}
              onClick={() => sheet.setSnap(snapFull ? 'half' : 'full')}><i /></button>
          </div>
          <header className="dz-head">
            <div className="dz-top">
              <p className="eyebrow dz-eyebrow">
                <Icon name={KIND_ICON[display.kind]} size={14} /><span>{T.t('dz.kind.' + display.kind)}</span>
                {h.region ? <><span className="dz-dot" aria-hidden="true" /><span className="dz-region">{h.region}</span></> : null}
              </p>
              <div className="dz-actions">
                {actionBtn('fly', 'target', 'dz.fly', fly)}
                {actionBtn('copy', 'link', 'dz.copy', copy)}
                {display.kind === 'country' ? actionBtn('compare', 'compare', 'dz.compare', compare) : null}
                {actionBtn('close', 'close', 'dz.close', () => atlas.select(null))}
              </div>
            </div>
            <h2 className="dz-title" id="dz-title" tabIndex={-1}>{h.title}</h2>
            <div className="dz-meta"><div className="dz-meta-in">
              {plate.length ? <p className="dz-plate">{plate.map((x, i) => <Fragment key={i}>{i ? <span className="dz-dot" aria-hidden="true" /> : null}{x}</Fragment>)}</p> : null}
              {badges.length ? <div className="dz-badges">{badges.map((x, i) => <Fragment key={i}>{x}</Fragment>)}</div> : null}
              {h.extra}
            </div></div>
          </header>
          {multi ? (
            <div ref={tabsRef} className={`tabs dz-tabs${fade}`} role="tablist" aria-label={T.t('dz.sections')}
              onScroll={(e) => setFade(fadeOf(e.currentTarget))} onKeyDown={onTabKey}>
              {tabs.map((tb) => (
                <button key={tb.id} type="button" role="tab" id={`dz-tab-${tb.id}`} data-tab={tb.id} aria-controls="dz-panel"
                  aria-selected={tb.id === active.id} tabIndex={tb.id === active.id ? 0 : -1} className={tb.count === 0 ? 'is-empty' : undefined}
                  onClick={() => selectTab(tb.id)}>
                  {tb.label}{tb.count != null ? <span className="n">{T.fmt.num(tb.count)}</span> : null}
                </button>
              ))}
            </div>
          ) : null}
          <div ref={bodyRef} className="dz-body scroll" id="dz-panel" role={multi ? 'tabpanel' : undefined}
            aria-labelledby={multi ? `dz-tab-${active.id}` : undefined} tabIndex={0} onScroll={onBodyScroll}>
            {body}
          </div>
        </Fragment>
      ) : null}
    </aside>
  );
}
