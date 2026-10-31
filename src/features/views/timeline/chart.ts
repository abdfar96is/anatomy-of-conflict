// The full timeline's swimlane chart: event dots in category lanes, conflict durations underneath, d3-zoom on time.
// Imperative like v2 (it redraws on every zoom frame); TimelineView creates it in an effect on the <svg> and rebuilds
// it when the width, lanes, language or theme change. Time always runs left → right (the plot carries dir="ltr").

import * as d3 from 'd3';
import { emit } from '../../../app/events';
import { atlas } from '../../../app/store';
import type { Conflict, TimelineCategory, TimelineEvent } from '../../../data/types';
import type { Bi } from '../../../i18n/format';
import { reducedMotion } from '../../../ui/dom';
import { sevVar } from '../../../ui/palette';
import { hideTip, showTip } from '../../../ui/tooltip';
import { appendSevShape, sevShapeOf } from './marks';

export type Cat = TimelineCategory & Bi & { color: string };
export type Ev = TimelineEvent & { cat: string[]; sumAr?: string; sumEn?: string };
export interface EvRow { e: Ev; pos: number }
export interface VisRow extends EvRow { lane: number; cat: string; extra: string[] }
// pre: began before the chart's range (e.g. 1841): the bar is cut at the range start and capped with the true year
export interface ConfRow { c: Conflict & { startYear: number }; pos: number; pre: boolean }

export const AX = 28, GAP = 30, ROW = 7;

/** Vertical layout shared by the chart and the lane labels beside it. */
export function chartLayout(lane: number, nLanes: number, nConfs: number): { confTop: number; H: number } {
  const confTop = AX + (nLanes ? nLanes * lane : 52) + GAP;
  return { confTop, H: confTop + nConfs * ROW + 6 };
}

/** Fractional year of a dated record ('1948-05-14' → 1948.37), so same-year events spread out. */
export function datePos(date: string | null | undefined): number {
  const [y = 0, m, d] = String(date).split('-').map(Number);
  if (d) return y + ((m ?? 1) - 1) / 12 + (d - 1) / 365;
  if (m) return y + (m - 0.5) / 12;
  return y + 0.5;
}

/** Category colors come from the data; clamp their lightness so dark reds and pale golds stay visible on both themes. */
const catCache = new Map<string, string>();
export function catColor(cat: Cat | undefined, dark: boolean): string {
  if (!cat) return 'var(--cat-0)';
  const key = `${cat.id}|${dark}`;
  let v = catCache.get(key);
  if (!v) {
    const c = d3.lab(cat.color);
    c.l = dark ? Math.max(c.l, 50) : Math.min(c.l, 62);
    catCache.set(key, (v = c.formatHex()));
  }
  return v;
}

let keptT: d3.ZoomTransform | null = null; // the reader's zoom, kept across rebuilds and re-opens (language or theme switch)

export interface ChartOpts {
  W: number; lane: number; nLanes: number; laneOf: Map<string, number>; vis: VisRow[]; confs: ConfRow[];
  Y0: number; Y1: number; today: number;
  color(catId: string): string;
  isUv(eventId: string): boolean;
  noCats: string;
  evTip(e: Ev): string;
  confTip(c: Conflict): string;
  label(e: Ev): string;
  hoverId(): string | null;
  onHoverEvent(id: string | null): void;
  /** The visible time domain, at most once per frame (drives the range readout and the "events in view" list). */
  onView(d0: number, d1: number): void;
}

export type ZoomCmd = 'in' | 'out' | 'earlier' | 'later' | 'reset';

export interface Chart {
  moveCursor(): void;
  drawFocus(): void;
  reveal(): void;
  zoom(cmd: ZoomCmd): void;
  destroy(): void;
}

export function createChart(svgEl: SVGSVGElement, o: ChartOpts): Chart {
  const { W, lane: LANE, laneOf, vis, confs, Y0, Y1, today } = o;
  const { confTop, H } = chartLayout(LANE, o.nLanes, confs.length);
  const laneY = (i: number) => AX + i * LANE + LANE / 2;
  const ms = () => (reducedMotion() ? 0 : 250);
  const x0 = d3.scaleLinear([Y0, Y1 + 1], [12, W - 12]);
  let x = x0;
  let hoverConf: string | null = null, raf = 0;
  const dy = new Map<VisRow, number>();
  const yOf = (d: VisRow) => laneY(d.lane) + (dy.get(d) ?? 0);
  const byLane = [...d3.group(vis, (d) => d.lane).values()].map((list) => [...list].sort((a, b) => a.pos - b.pos));

  const svg = d3.select(svgEl);
  svg.attr('width', W).attr('height', H).attr('viewBox', `0 0 ${W} ${H}`);
  svg.selectAll('*').remove();
  svg.append('rect').attr('class', 'tl-bg').attr('width', W).attr('height', confTop - GAP / 2);
  const gGrid = svg.append('g').attr('class', 'tl-grid');
  svg.append('g').attr('class', 'tl-seps').selectAll('line').data(d3.range(o.nLanes + 1)).join('line')
    .attr('x1', 0).attr('x2', W).attr('y1', (i) => AX + i * LANE + 0.5).attr('y2', (i) => AX + i * LANE + 0.5);
  if (!o.nLanes) svg.append('text').attr('class', 'tl-empty').attr('x', W / 2).attr('y', AX + 31).attr('text-anchor', 'middle').text(o.noCats);
  const gAxis = svg.append('g').attr('class', 'tl-axis').attr('transform', `translate(0,${AX - 6})`);

  // conflict durations: one thin bar per conflict from its start to the data's as-of date
  const cg = svg.append('g').attr('class', 'tl-confs');
  cg.append('rect').attr('class', 'tl-cbg').attr('y', confTop - GAP / 2).attr('width', W).attr('height', H - confTop + GAP / 2);
  const confG = cg.selectAll<SVGGElement, ConfRow>('g.tl-c').data(confs).join('g').attr('class', 'tl-c')
    .attr('transform', (_d, i) => `translate(0,${confTop + i * ROW + ROW / 2})`);
  confG.each(function (d) {
    const g = d3.select(this), c = sevVar(d.c.severity);
    g.append('line').attr('class', 'tl-cbar').style('stroke', c).attr('stroke-dasharray', sevShapeOf(d.c.severity) === 'dashed' ? '4 2.5' : null);
    if (d.pre) {
      const p = g.append('g').attr('class', 'tl-cpre');
      p.append('path').attr('d', 'M0 0L5.5-3.6V3.6z').style('fill', c);
      p.append('text').attr('x', 8.5).attr('y', 3.6).text(String(d.c.startYear));
    } else {
      appendSevShape(g.append('g').attr('class', 'tl-cmk').append('g').attr('transform', 'scale(.8)'), d.c.severity);
    }
    g.append('rect').attr('class', 'tl-chit').attr('y', -ROW / 2).attr('height', ROW);
  });
  confG.select<SVGRectElement>('rect.tl-chit')
    .on('pointerenter pointermove', (ev: PointerEvent, d) => { setHoverConf(d.c); showTip(o.confTip(d.c), ev.clientX, ev.clientY); })
    .on('pointerleave', () => { setHoverConf(null); hideTip(); })
    .on('click', (_ev, d) => atlas.select('conflict', d.c.id));

  const sats = svg.append('g').attr('class', 'tl-sats').selectAll('circle')
    .data(vis.flatMap((d) => d.extra.map((c) => ({ d, lane: laneOf.get(c) ?? 0, c }))))
    .join('circle').attr('r', 2.6).style('fill', (s) => o.color(s.c));
  const gLinks = svg.append('g').attr('class', 'tl-links');
  const dots = svg.append('g').attr('class', 'tl-dots').selectAll<SVGCircleElement, VisRow>('circle').data(vis, (d) => d.e.id).join('circle')
    .attr('r', 5).style('fill', (d) => o.color(d.cat))
    .classed('is-uv', (d) => o.isUv(d.e.id)); // dashed outline: carried over, not re-checked
  const gCursor = svg.append('g').attr('class', 'tl-cursor');
  gCursor.append('line').attr('y1', AX - 2).attr('y2', H);
  gCursor.append('rect').attr('x', -19).attr('y', 1).attr('width', 38).attr('height', 17).attr('rx', 3);
  gCursor.append('text').attr('y', 13.5).attr('text-anchor', 'middle');
  const gFocus = svg.append('g').attr('class', 'tl-focus');
  const hits = svg.append('g').attr('class', 'tl-hits').selectAll<SVGCircleElement, VisRow>('circle').data(vis, (d) => d.e.id).join('circle').attr('r', 11)
    .on('pointerenter', (ev: PointerEvent, d) => { o.onHoverEvent(d.e.id); showTip(o.evTip(d.e), ev.clientX, ev.clientY); })
    .on('pointermove', (ev: PointerEvent, d) => showTip(o.evTip(d.e), ev.clientX, ev.clientY))
    .on('pointerleave', () => { o.onHoverEvent(null); hideTip(); })
    .on('click', (_ev, d) => atlas.select('event', d.e.id));

  const zoom = d3.zoom<SVGSVGElement, unknown>().scaleExtent([1, 40]).extent([[0, 0], [W, H]]).translateExtent([[0, 0], [W, H]])
    .filter((ev: Event) => {
      if (ev.type === 'wheel') return !(ev.target as Element | null)?.closest?.('.tl-confs'); // wheel over the conflict track scrolls the panel
      if (ev.type === 'touchstart') return false; // one finger scrolls the panel; the buttons zoom and pan
      const m = ev as MouseEvent;
      return !m.button && !m.ctrlKey;
    })
    .on('zoom', (ev: d3.D3ZoomEvent<SVGSVGElement, unknown>) => { keptT = ev.transform; position(); });
  const target = () => { const m = ms(); return m ? svg.transition().duration(m) : svg; };

  // x-dependent geometry: runs on every zoom frame
  function position() {
    x = (keptT ?? d3.zoomIdentity).rescaleX(x0);
    const ticks = x.ticks(Math.max(3, Math.floor(W / 90))).filter(Number.isInteger);
    gAxis.call(d3.axisTop(x).tickValues(ticks).tickFormat(d3.format('d')).tickSize(4).tickPadding(4)).select('.domain').remove();
    gGrid.selectAll('line').data(ticks).join('line').attr('x1', (d) => x(d)).attr('x2', (d) => x(d)).attr('y1', AX - 2).attr('y2', H);
    dodge();
    dots.attr('cx', (d) => x(d.pos)).attr('cy', yOf);
    hits.attr('cx', (d) => x(d.pos)).attr('cy', yOf);
    sats.attr('cx', (s) => x(s.d.pos)).attr('cy', (s) => laneY(s.lane));
    const xt = x(today);
    const xs = (d: ConfRow) => x(d.pre ? Y0 : d.pos);
    confG.select('.tl-cbar').attr('x1', xs).attr('x2', xt);
    confG.select('.tl-cmk').attr('transform', (d) => `translate(${x(d.pos)},0)`);
    confG.select('.tl-cpre').attr('transform', `translate(${x(Y0)},0)`);
    confG.select('.tl-chit').attr('x', (d) => xs(d) - 6).attr('width', (d) => Math.max(12, xt - xs(d) + 8));
    moveCursor();
    drawFocus();
    if (!raf) raf = requestAnimationFrame(() => { raf = 0; const [d0 = Y0, d1 = Y1 + 1] = x.domain(); o.onView(d0, d1); });
  }

  // same-lane dots closer than 11px step up or down so each one stays visible and hoverable
  function dodge() {
    const levels = [0, -8, 8].map((v) => v * (LANE / 30));
    for (const list of byLane) {
      const lastX = levels.map(() => -Infinity);
      for (const d of list) {
        const px = x(d.pos);
        let k = lastX.findIndex((lx) => px - lx >= 11);
        if (k < 0) k = lastX.indexOf(Math.min(...lastX));
        lastX[k] = px;
        dy.set(d, levels[k] ?? 0);
      }
    }
  }

  function moveCursor() {
    const y = atlas.get().year;
    const [d0 = Y0, d1 = Y1 + 1] = x.domain();
    gCursor.attr('transform', `translate(${x(y + 0.5)},0)`).style('display', () => (y + 0.5 < d0 || y + 0.5 > d1 ? 'none' : null));
    gCursor.select('text').text(String(y));
  }

  const markConfs = () => {
    const sel = atlas.get().selection;
    confG.classed('is-on', (d) => (sel?.kind === 'conflict' && sel.id === d.c.id) || d.c.id === hoverConf);
  };

  function drawFocus() {
    const sel = atlas.get().selection, hoverId = o.hoverId();
    const selId = sel?.kind === 'event' ? sel.id : null;
    const focus = [...new Set([selId, hoverId])].map((id) => vis.find((d) => d.e.id === id)).filter((d): d is VisRow => !!d);
    const on = (d: VisRow) => d.e.id === selId || d.e.id === hoverId;
    dots.classed('is-on', on).attr('r', (d) => (on(d) ? 6.5 : 5));
    gLinks.selectAll('line').data(focus.flatMap((d) => d.extra.map((c) => ({ d, lane: laneOf.get(c) ?? 0 })))).join('line')
      .attr('x1', (s) => x(s.d.pos)).attr('x2', (s) => x(s.d.pos)).attr('y1', (s) => yOf(s.d)).attr('y2', (s) => laneY(s.lane));
    gFocus.selectAll('circle').data(focus.filter((d) => d.e.id === selId)).join('circle').attr('class', 'tl-ring').attr('r', 9.5)
      .attr('cx', (d) => x(d.pos)).attr('cy', yOf);
    const right = (d: VisRow) => x(d.pos) > W - 180;
    gFocus.selectAll<SVGTextElement, VisRow>('text').data(focus, (d) => d.e.id).join('text').attr('class', 'tl-lbl')
      .attr('x', (d) => x(d.pos) + (right(d) ? -12 : 12)).attr('y', (d) => yOf(d) + 4)
      .attr('text-anchor', (d) => (right(d) ? 'end' : 'start')).text((d) => o.label(d.e));
    markConfs();
  }

  function setHoverConf(c: Conflict | null) {
    const id = c?.id ?? null;
    if (id === hoverConf) return;
    hoverConf = id;
    markConfs();
    emit('highlight', c ? { iso3: c.countries ?? [] } : null);
  }

  /** Bring a newly selected event into view without changing the zoom level. */
  function reveal() {
    const sel = atlas.get().selection;
    if (sel?.kind !== 'event') return;
    const d = vis.find((v) => v.e.id === sel.id);
    if (!d) return;
    const [d0 = Y0, d1 = Y1 + 1] = x.domain();
    if (d.pos < d0 || d.pos > d1) zoom.translateTo(target(), x0(d.pos), H / 2);
  }

  svg.call(zoom);
  svg.call(zoom.transform, keptT ? d3.zoomIdentity.translate(keptT.x, 0).scale(keptT.k) : d3.zoomIdentity);

  return {
    moveCursor,
    drawFocus,
    reveal,
    zoom(cmd) {
      const tr = target(), k = (keptT ?? d3.zoomIdentity).k;
      switch (cmd) {
        case 'in': zoom.scaleBy(tr, 1.8); break;
        case 'out': zoom.scaleBy(tr, 1 / 1.8); break;
        case 'earlier': zoom.translateBy(tr, (W * 0.35) / k, 0); break;
        case 'later': zoom.translateBy(tr, (-W * 0.35) / k, 0); break;
        default: zoom.transform(tr, d3.zoomIdentity);
      }
    },
    destroy() {
      cancelAnimationFrame(raf);
      raf = 0;
      svg.interrupt();
      svg.on('.zoom', null);
      if (hoverConf) { hoverConf = null; emit('highlight', null); }
    },
  };
}
