// The Historical borders lens's own timeline, in place of the shared scrubber: 1886–2019, one bar per year
// with as many border and status changes as that year saw, play, and buttons to the previous and next change.

import * as d3 from 'd3';
import { useEffect, useMemo, useRef, useState, useSyncExternalStore, type KeyboardEvent, type PointerEvent } from 'react';
import { atlas, useAtlas } from '../../app/store';
import { useT } from '../../app/useT';
import { BORDERS_FIRST, BORDERS_LAST, bordersFailed, getBorders, loadBorders, subscribeBorders, type BorderChange, type Borders } from '../../data/borders';
import { esc } from '../../ui/dom';
import { Icon } from '../../ui/Icon';
import { hideTip, showTip } from '../../ui/tooltip';
import { changeLine } from './changes';
import './strings';

const Y0 = BORDERS_FIRST, Y1 = BORDERS_LAST;
const clampY = (y: number) => Math.max(Y0, Math.min(Y1, Math.round(y)));
const setYear = (y: number) => { if (y !== atlas.get().filters.bordersYear) atlas.setFilter('bordersYear', clampY(y)); };

/** The borders model, loading it on first use; re-renders when it arrives. */
export function useBorders(): Borders | null {
  const b = useSyncExternalStore(subscribeBorders, getBorders, getBorders);
  useEffect(() => {
    // the map scene is rebuilt from the store: nudge it once the data is in
    if (!b) loadBorders().then(() => atlas.setFilter('bordersYear', atlas.get().filters.bordersYear)).catch(() => {});
  }, [b]);
  return b;
}

export function changeYears(B: Borders): number[] { return [...B.changes.keys()].sort((a, b) => a - b); }

export function BordersScrubber() {
  const { t, lang } = useT();
  const B = useBorders();
  const failed = useSyncExternalStore(subscribeBorders, bordersFailed, bordersFailed);
  const year = useAtlas((s) => s.filters.bordersYear);
  const [playing, setPlaying] = useState(false);
  const trackRef = useRef<HTMLDivElement>(null);
  const [w, setW] = useState(0);
  useEffect(() => {
    const el = trackRef.current;
    if (!el) return;
    const measure = () => setW(el.clientWidth);
    measure();
    if (typeof ResizeObserver !== 'function') return;
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const years = useMemo(() => (B ? changeYears(B) : []), [B]);
  const maxN = useMemo(() => (B ? Math.max(1, ...[...B.changes.values()].map((l) => l.length)) : 1), [B]);
  const H = 40, BASE = H - 13;
  const x = useMemo(() => d3.scaleLinear([Y0, Y1 + 1], [7, Math.max(8, w - 7)]), [w]);

  // play: one year every 140 ms (about 19 s for the whole period), or a decade every 800 ms with reduced motion
  useEffect(() => {
    if (!playing) return;
    if (atlas.get().filters.bordersYear >= Y1) setYear(Y0);
    const reduced = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
    const timer = setInterval(() => {
      const y = atlas.get().filters.bordersYear;
      const next = reduced ? Math.floor(y / 10) * 10 + 10 : y + 1;
      if (next >= Y1) { setYear(Y1); setPlaying(false); } else setYear(next);
    }, reduced ? 800 : 140);
    return () => clearInterval(timer);
  }, [playing]);

  const prev = [...years].reverse().find((y) => y < year), next = years.find((y) => y > year);
  const tipOf = (y: number) => {
    const list: BorderChange[] = B?.changes.get(y) ?? [];
    const rows = list.slice(0, 6).map((c) => `<span class="tip-sub">${esc(changeLine(B!, c, lang, t))}</span>`).join('');
    const more = list.length > 6 ? `<span class="tip-sub">${esc(t('bd.more', { n: list.length - 6 }))}</span>` : '';
    return `<b>${y}</b> · ${esc(t('bd.changes', { n: list.length }))}${rows}${more}`;
  };
  const yearAt = (px: number) => clampY(Math.floor(x.invert(px)));
  const local = (e: PointerEvent<HTMLDivElement>) => e.clientX - e.currentTarget.getBoundingClientRect().left;
  const drag = useRef(false);
  function onPointerDown(e: PointerEvent<HTMLDivElement>) {
    if (e.button !== 0) return;
    drag.current = true;
    e.currentTarget.setPointerCapture?.(e.pointerId);
    setPlaying(false); hideTip(); setYear(yearAt(local(e)));
  }
  function onPointerMove(e: PointerEvent<HTMLDivElement>) {
    const y = yearAt(local(e));
    if (drag.current) { setYear(y); return; }
    if (B?.changes.has(y)) showTip(tipOf(y), e.clientX, e.clientY); else hideTip();
  }
  function onKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    const map: Record<string, number | undefined> = { ArrowRight: year + 1, ArrowUp: year + 1, ArrowLeft: year - 1, ArrowDown: year - 1, PageUp: year + 10, PageDown: year - 10, Home: Y0, End: Y1 };
    const n = map[e.key];
    if (n == null) return;
    e.preventDefault(); setPlaying(false); setYear(n);
  }

  const playLabel = t(playing ? 'bd.pause' : 'bd.play');
  const status = failed ? t('bd.failed') : !B ? t('bd.loading') : '';
  const flip = (b: HTMLButtonElement | null) => { b?.querySelector('svg')?.style.setProperty('transform', 'scaleX(-1)'); };
  const sample = B && year ? [...(B.changes.get(year) ?? [])].slice(0, 1)[0] : undefined;
  return (
    <footer id="scrubber" className="sc sc-borders">
      <button className={`btn icon sc-play${playing ? ' is-playing' : ''}`} type="button" aria-label={playLabel} data-tip={esc(playLabel)} disabled={!B}
        onClick={() => setPlaying((p) => !p)}>
        <Icon name={playing ? 'pause' : 'play'} size={18} />
      </button>
      <div className="sc-year"><span className="sc-year-l">{t('bd.yearLabel')}</span><output className="sc-year-v">{year}</output></div>
      <div className="bd-steps" dir="ltr">
        <button ref={flip} className="btn icon" type="button" aria-label={t('bd.prev')} data-tip={esc(prev ? `${t('bd.prev')} · ${prev}` : t('bd.prev'))} disabled={!prev}
          onClick={() => { setPlaying(false); if (prev) setYear(prev); }}><Icon name="chevron" size={16} /></button>
        <button className="btn icon" type="button" aria-label={t('bd.next')} data-tip={esc(next ? `${t('bd.next')} · ${next}` : t('bd.next'))} disabled={!next}
          onClick={() => { setPlaying(false); if (next) setYear(next); }}><Icon name="chevron" size={16} /></button>
      </div>
      <div ref={trackRef} className="sc-track" role="slider" tabIndex={0} dir="ltr" aria-valuemin={Y0} aria-valuemax={Y1} aria-valuenow={year}
        aria-label={t('bd.slider')} aria-valuetext={sample ? `${year} — ${changeLine(B!, sample, lang, t)}` : String(year)}
        onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={() => { drag.current = false; }}
        onPointerCancel={() => { drag.current = false; }} onPointerLeave={() => { if (!drag.current) hideTip(); }} onKeyDown={onKeyDown}>
        {w > 0 && (
          <svg className="sc-svg" aria-hidden="true" viewBox={`0 0 ${w} ${H}`}>
            <line className="sc-base" x1={x(Y0)} x2={x(Y1 + 1)} y1={BASE + 0.5} y2={BASE + 0.5} />
            {d3.range(1890, Y1 + 1, 10).map((d) => (
              <g key={d}>
                <line className="sc-tick" x1={x(d)} x2={x(d)} y1={BASE} y2={BASE + 3} />
                {(d - 1890) % (w > 700 ? 10 : 20) === 0 ? <text className="sc-lab" x={x(d)} y={H - 1} textAnchor="middle">{d}</text> : null}
              </g>
            ))}
            {years.map((y) => {
              const n = B!.changes.get(y)!.length, bh = Math.max(2, (n / maxN) * (BASE - 3));
              const step = x(Y0 + 1) - x(Y0), bw = Math.max(1, step - Math.min(2, step * 0.45));
              return <rect key={y} className={`sc-bar${y === year ? ' is-sel' : ''}`} data-y={y} x={x(y) + (step - bw) / 2} y={BASE - bh} width={bw} height={bh} rx={Math.min(1.5, bw / 2)} />;
            })}
            <g className="sc-handle" transform={`translate(${x(year + 0.5).toFixed(2)},0)`}>
              <line className="sc-hline" y1="0" y2={BASE + 13} /><circle className="sc-knob" cy={BASE} r="5.5" />
            </g>
          </svg>
        )}
      </div>
      <span className="bd-status" role="status">{status || (B ? t('bd.units', { n: B.units.filter((u) => u.start <= `${year}-12-31` && u.end >= `${year}-12-31`).length }) : '')}</span>
    </footer>
  );
}
