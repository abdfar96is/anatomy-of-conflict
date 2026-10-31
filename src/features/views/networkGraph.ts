// The relations graph on the network view's SVG: laid out once with d3-force and then held still.
// Imperative like v2's views/network.js; the React view owns the filters, ties list and caption and feeds this its state.

import * as d3 from 'd3';
import { atlas } from '../../app/store';
import type { DB, Edge } from '../../data/types';
import { reducedMotion } from '../../ui/dom';
import { edgeVar } from '../../ui/palette';
import { hideTip, showTip } from '../../ui/tooltip';

export interface NetEdge extends Edge { weight: number; contested?: boolean }
interface Point { x: number; y: number }
export interface NetNode { id: string; w: number; n: number; rank: number; p: Point; lw: number }
export interface NetModel {
  edges: NetEdge[]; edgeById: Map<string, NetEdge>; nodes: NetNode[]; byId: Map<string, NetNode>; rOf: (w: number) => number;
}

/** What the graph shows: the filtered ties and states, the outlined bloc, and the emphasis the list shares. */
export interface NetState {
  visE: Set<string>; visN: Set<string>; members: Set<string>; pinned: string | null; hoverEdge: string | null; selIso: string | null;
}
/** Text the graph needs, in the current language. Tips are HTML for the global tooltip (data escaped). */
export interface NetText {
  name: (iso: string) => string;
  nodeLabel: (n: NetNode) => string;
  nodeTip: (n: NetNode, visE: Set<string>) => string;
  edgeTip: (e: NetEdge) => string;
}
export interface NetHooks {
  pin: (id: string | null, fromChart: boolean) => void;
  hoverEdge: (id: string | null) => void;
}
export interface NetGraph {
  update(s: NetState): void;
  centerOn(iso: string, smooth: boolean): void;
  setFocus(id: string, move?: boolean): void;
  tool(z: 'in' | 'out' | 'fit'): void;
  destroy(): void;
}

export const dashOf = (kind: string, contested?: boolean) => (contested ? '0.5 4.5' : kind === 'assessed' ? '6 4' : null);

let layout: Map<string, Point> | null = null; // iso3 → {x, y}: settled once, then moved only by the reader's drags

type SimNode = d3.SimulationNodeDatum & { id: string; r: number };
type SimLink = d3.SimulationLinkDatum<SimNode> & { w: number };

function settle(nodes: NetNode[], edges: NetEdge[], rOf: (w: number) => number): Map<string, Point> {
  const sn: SimNode[] = nodes.map((n) => ({ id: n.id, r: rOf(n.w) }));
  const links: SimLink[] = edges.map((e) => ({ source: e.a, target: e.b, w: e.weight }));
  const sim = d3.forceSimulation(sn)
    // tuned offline: wide spacing so the ~30 always-on labels rarely collide once fitted to a typical panel
    .force('link', d3.forceLink<SimNode, SimLink>(links).id((d) => d.id).distance((l) => 180 - l.w * 12).strength(0.42))
    .force('charge', d3.forceManyBody<SimNode>().strength(-900).distanceMax(900))
    .force('collide', d3.forceCollide<SimNode>((d) => d.r + 44))
    .force('x', d3.forceX<SimNode>(0).strength(0.09))
    .force('y', d3.forceY<SimNode>(0).strength(0.2))
    .stop();
  for (let i = 0; i < 320; i++) sim.tick();
  return new Map(sn.map((d) => [d.id, { x: d.x ?? 0, y: d.y ?? 0 }]));
}

/** Every country with a recorded tie, by total strength; positions come from the one settled layout. */
export function netModel(db: DB): NetModel {
  const edges = db.relations.edges as NetEdge[];
  const byId = new Map<string, NetNode>();
  for (const e of edges) {
    for (const iso of [e.a, e.b]) {
      let n = byId.get(iso);
      if (!n) byId.set(iso, (n = { id: iso, w: 0, n: 0, rank: 0, p: { x: 0, y: 0 }, lw: 0 }));
      n.w += e.weight;
      n.n += 1;
    }
  }
  const nodes = [...byId.values()].sort((a, b) => b.w - a.w || a.id.localeCompare(b.id));
  nodes.forEach((n, i) => { n.rank = i; });
  const scale = d3.scaleSqrt([d3.min(nodes, (n) => n.w) ?? 0, d3.max(nodes, (n) => n.w) ?? 1], [4.5, 16]);
  const rOf = (w: number) => scale(w);
  layout ??= settle(nodes, edges, rOf);
  for (const n of nodes) {
    let p = layout.get(n.id);
    if (!p) layout.set(n.id, (p = { x: 0, y: 0 }));
    n.p = p;
  }
  return { edges, edgeById: new Map(edges.map((e) => [e.id, e])), nodes, byId, rOf };
}

/** Draws the graph into svgEl (which already holds .net-hull and the four layer groups) and keeps it fitted to chart. */
export function createNetGraph(svgEl: SVGSVGElement, chart: HTMLElement, M: NetModel, text: NetText, hooks: NetHooks): NetGraph {
  const { edges, nodes, byId, rOf } = M;
  let S: NetState = { visE: new Set(), visN: new Set(), members: new Set(), pinned: null, hoverEdge: null, selIso: null };
  let hoverNode: string | null = null, dragging = false, focusId: string | null = null;
  let wantLabel: (d: NetNode) => boolean = () => false, forceLabel: (d: NetNode) => boolean = () => false;
  let T = d3.zoomIdentity, W = 0, H = 0, fitted = true, rot = false, ax = 1, ay = 1;
  // the settled layout is wide; on a tall chart (phones) it is drawn turned a quarter so it fills the space
  // a force layout has no meaningful aspect, so the fit also stretches it (ax/ay, within limits) to the chart's shape
  const bx = (n: NetNode) => (rot ? n.p.y : n.p.x), by = (n: NetNode) => (rot ? n.p.x : n.p.y);
  const wx = (n: NetNode) => bx(n) * ax, wy = (n: NetNode) => by(n) * ay;
  const sx = (n: NetNode) => T.applyX(wx(n)), sy = (n: NetNode) => T.applyY(wy(n));

  const svg = d3.select(svgEl);
  const hullEl = svg.select<SVGPathElement>('.net-hull');
  const eSel = svg.select('.net-edges').selectAll<SVGLineElement, NetEdge>('line').data(edges, (d) => d.id).join('line')
    .attr('class', 'net-e').style('stroke', (d) => edgeVar(d.type)).attr('stroke-width', (d) => 0.6 + d.weight * 0.45)
    .attr('stroke-dasharray', (d) => dashOf(d.kind, d.contested)).attr('stroke-linecap', (d) => (d.contested ? 'round' : null));
  const hSel = svg.select('.net-ehits').selectAll<SVGLineElement, NetEdge>('line').data(edges, (d) => d.id).join('line').attr('class', 'net-ehit')
    .on('pointerenter', (ev: PointerEvent, d) => { if (dragging) return; hooks.hoverEdge(d.id); showTip(text.edgeTip(d), ev.clientX, ev.clientY); })
    .on('pointermove', (ev: PointerEvent, d) => { if (!dragging) showTip(text.edgeTip(d), ev.clientX, ev.clientY); })
    .on('pointerleave', () => { hooks.hoverEdge(null); hideTip(); })
    .on('click', (_ev: MouseEvent, d) => hooks.pin(S.pinned === d.id ? null : d.id, true));
  const nSel = svg.select('.net-nodes').selectAll<SVGGElement, NetNode>('g').data(nodes, (d) => d.id).join('g').attr('class', 'net-n')
    .attr('role', 'button').attr('tabindex', -1)
    .attr('aria-label', (d) => text.nodeLabel(d));
  nSel.append('circle').attr('class', 'net-ring').attr('r', (d) => rOf(d.w) + 4.5);
  nSel.append('circle').attr('class', 'net-dot').attr('r', (d) => rOf(d.w));
  const lSel = svg.select('.net-labels').selectAll<SVGTextElement, NetNode>('text').data(nodes, (d) => d.id).join('text')
    .attr('class', 'net-l').attr('text-anchor', 'middle').attr('dy', (d) => rOf(d.w) + 13).text((d) => text.name(d.id));
  // jsdom has no text metrics: fall back to the same character estimate v2 used when the length is 0
  lSel.each(function (d) { d.lw = (typeof this.getComputedTextLength === 'function' ? this.getComputedTextLength() : 0) || text.name(d.id).length * 6; });

  nSel
    .on('pointerenter', (ev: PointerEvent, d) => { if (dragging) return; hoverNode = d.id; emphasize(); showTip(text.nodeTip(d, S.visE), ev.clientX, ev.clientY); })
    .on('pointermove', (ev: PointerEvent, d) => { if (!dragging) showTip(text.nodeTip(d, S.visE), ev.clientX, ev.clientY); })
    .on('pointerleave', () => { if (dragging) return; hoverNode = null; emphasize(); hideTip(); })
    .on('click', (_ev: MouseEvent, d) => atlas.select('country', d.id))
    .on('focus', (ev: FocusEvent, d) => {
      hoverNode = d.id;
      emphasize();
      const r = (ev.currentTarget as Element).getBoundingClientRect();
      showTip(text.nodeTip(d, S.visE), r.right, r.bottom);
    })
    .on('blur', () => { hoverNode = null; emphasize(); hideTip(); })
    .on('keydown', onNodeKey)
    .call(d3.drag<SVGGElement, NetNode>().clickDistance(4)
      .subject((_ev, d) => ({ x: sx(d), y: sy(d) }))
      .on('start', () => { dragging = true; hideTip(); })
      .on('drag', (ev: d3.D3DragEvent<SVGGElement, NetNode, unknown>, d) => {
        const ix = T.invertX(ev.x) / ax, iy = T.invertY(ev.y) / ay;
        if (rot) { d.p.y = ix; d.p.x = iy; } else { d.p.x = ix; d.p.y = iy; }
        place();
      })
      .on('end', () => { dragging = false; }));

  const zoom = d3.zoom<SVGSVGElement, unknown>().scaleExtent([0.35, 6])
    .on('zoom', (ev: d3.D3ZoomEvent<SVGSVGElement, unknown>) => { T = ev.transform; if (ev.sourceEvent) fitted = false; place(); });
  svg.call(zoom).on('dblclick.zoom', null);
  svg.on('click', (ev: MouseEvent) => { if (ev.target === svgEl && S.pinned) hooks.pin(null, false); });

  // fill the chart: node centres inside a 24px margin plus room for the outer circles and the labels under them
  function fitT(): d3.ZoomTransform {
    const padX = 24 + 34, padT = 24 + 16, padB = 24 + 30;
    const iw = Math.max(40, W - padX * 2), ih = Math.max(40, H - padT - padB);
    const [x0 = 0, x1 = 0] = d3.extent(nodes, bx), [y0 = 0, y1 = 0] = d3.extent(nodes, by);
    const gw = x1 - x0 || 1, gh = y1 - y0 || 1;
    const s = Math.max(1 / 1.6, Math.min(1.6, iw / ih / (gw / gh)));
    ax = Math.sqrt(s); ay = 1 / ax;
    const k = Math.min(iw / (gw * ax), ih / (gh * ay), 3);
    return d3.zoomIdentity.translate(padX + (iw - k * gw * ax) / 2 - k * x0 * ax, padT + (ih - k * gh * ay) / 2 - k * y0 * ay).scale(k);
  }
  function resize() {
    const w0 = W, h0 = H;
    W = chart.clientWidth; H = chart.clientHeight;
    if (!W || !H) return;
    const turn = H > W; // the layout is about twice as wide as tall, so turning wins exactly when the chart is portrait
    if (turn !== rot) { rot = turn; fitted = true; }
    if (!fitted && w0 && h0) T = d3.zoomIdentity.translate(T.x + (W - w0) / 2, T.y + (H - h0) / 2).scale(T.k); // keep the reader's centre
    svg.attr('width', W).attr('height', H).attr('viewBox', `0 0 ${W} ${H}`);
    zoom.extent([[0, 0], [W, H]]);
    svg.call(zoom.transform, fitted ? fitT() : T);
  }
  const animated = (smooth: boolean) => smooth && !reducedMotion();
  function moveTo(t: d3.ZoomTransform, smooth: boolean) {
    if (animated(smooth)) svg.transition().duration(280).call(zoom.transform, t);
    else svg.call(zoom.transform, t);
  }

  function place() {
    const X = (iso: string) => sx(byId.get(iso)!), Y = (iso: string) => sy(byId.get(iso)!);
    for (const s of [eSel, hSel]) s.attr('x1', (d) => X(d.a)).attr('y1', (d) => Y(d.a)).attr('x2', (d) => X(d.b)).attr('y2', (d) => Y(d.b));
    nSel.attr('transform', (d) => `translate(${sx(d)},${sy(d)})`);
    lSel.attr('x', sx).attr('y', sy);
    drawHull();
    declutter();
  }

  // greedy label placement: hovered/selected first, then by total strength; a label that would overlap one already placed waits for hover
  function declutter() {
    const placed: (readonly [number, number, number, number])[] = [], on = new Set<string>();
    const order = nodes.filter(wantLabel).sort((a, b) => Number(forceLabel(b)) - Number(forceLabel(a)) || a.rank - b.rank);
    for (const d of order) {
      const hw = (d.lw * (forceLabel(d) ? 1.12 : 1)) / 2 + 2, cx = sx(d), cy = sy(d) + rOf(d.w) + 13;
      const b = [cx - hw, cy - 11, cx + hw, cy + 4] as const;
      if (!forceLabel(d) && placed.some((p) => b[0] < p[2] && p[0] < b[2] && b[1] < p[3] && p[1] < b[3])) continue;
      placed.push(b);
      on.add(d.id);
    }
    lSel.classed('is-on', (d) => on.has(d.id));
  }

  // soft outline behind the bloc's members: hull of a ring of points around each member
  function drawHull() {
    const pts: [number, number][] = [];
    for (const iso of S.members) {
      const n = byId.get(iso);
      if (!n) continue;
      const cx = sx(n), cy = sy(n), rr = rOf(n.w) + 16;
      for (let a = 0; a < 12; a++) pts.push([cx + rr * Math.cos((a * Math.PI) / 6), cy + rr * Math.sin((a * Math.PI) / 6)]);
    }
    const hull = pts.length >= 3 ? d3.polygonHull(pts) : null;
    hullEl.attr('d', hull ? d3.line().curve(d3.curveCatmullRomClosed)(hull) : null);
  }

  function applyFilters() {
    eSel.classed('is-off', (d) => !S.visE.has(d.id));
    hSel.classed('is-off', (d) => !S.visE.has(d.id));
    nSel.classed('is-faded', (d) => !S.visN.has(d.id)).classed('is-member', (d) => S.members.has(d.id));
  }

  /** The ties and states to keep lit: a hovered state's ties, else the hovered or pinned tie. */
  function kept(): { keepE: Set<string>; keepN: Set<string> } | null {
    if (hoverNode) {
      const h = hoverNode;
      const keepE = new Set(edges.filter((e) => S.visE.has(e.id) && (e.a === h || e.b === h)).map((e) => e.id));
      const keepN = new Set([h]);
      for (const id of keepE) { const e = M.edgeById.get(id)!; keepN.add(e.a); keepN.add(e.b); }
      return { keepE, keepN };
    }
    const fe = M.edgeById.get(S.hoverEdge || S.pinned || '');
    return fe ? { keepE: new Set([fe.id]), keepN: new Set([fe.a, fe.b]) } : null;
  }

  function emphasize() {
    const { selIso } = S;
    const k = kept();
    eSel.classed('is-dim', (d) => !!k && !k.keepE.has(d.id)).classed('is-hot', (d) => !!k && k.keepE.has(d.id));
    nSel.classed('is-dim', (d) => !!k && !k.keepN.has(d.id)).classed('is-sel', (d) => d.id === selIso).classed('is-hover', (d) => d.id === hoverNode);
    wantLabel = (d) => (k ? k.keepN.has(d.id) : (S.visN.has(d.id) && d.rank < 30) || S.members.has(d.id) || d.id === selIso);
    forceLabel = (d) => d.id === hoverNode || d.id === selIso;
    lSel.classed('is-focus', forceLabel);
    declutter();
  }

  // ---- keyboard: one node in the tab order; arrows step through states by total strength
  function setFocus(id: string, move = false) {
    focusId = id;
    nSel.attr('tabindex', (d) => (d.id === focusId ? 0 : -1));
    if (move) nSel.filter((d) => d.id === id).node()?.focus();
  }
  function onNodeKey(ev: KeyboardEvent, d: NetNode) {
    const i = nodes.indexOf(d);
    const steps: Record<string, number> = { ArrowRight: i + 1, ArrowDown: i + 1, ArrowLeft: i - 1, ArrowUp: i - 1, Home: 0, End: nodes.length - 1 };
    const j = steps[ev.key];
    if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); atlas.select('country', d.id); return; }
    if (j == null) return;
    ev.preventDefault();
    setFocus(nodes[(j + nodes.length) % nodes.length]!.id, true);
  }

  // jsdom has no ResizeObserver; the browser always does
  const ro = typeof ResizeObserver === 'function'
    ? new ResizeObserver(() => { if (chart.clientWidth !== W || chart.clientHeight !== H) resize(); })
    : null;
  resize();
  ro?.observe(chart);

  return {
    update(next) {
      S = next;
      applyFilters();
      emphasize();
      drawHull();
    },
    centerOn(iso, smooth) {
      const n = byId.get(iso);
      if (!n || !W) return;
      fitted = false;
      moveTo(d3.zoomIdentity.translate(W / 2 - T.k * wx(n), H / 2 - T.k * wy(n)).scale(T.k), smooth);
    },
    setFocus,
    tool(z) {
      fitted = z === 'fit';
      if (fitted) moveTo(fitT(), true);
      else if (animated(true)) svg.transition().duration(280).call(zoom.scaleBy, z === 'in' ? 1.6 : 1 / 1.6);
      else svg.call(zoom.scaleBy, z === 'in' ? 1.6 : 1 / 1.6);
    },
    destroy() {
      ro?.disconnect();
      svg.interrupt();
      hideTip();
      // leave the React-owned SVG as it was, so a remount (StrictMode, a language switch) draws on clean layers
      svg.on('.zoom', null).on('click', null);
      for (const g of ['.net-edges', '.net-ehits', '.net-nodes', '.net-labels']) svg.select(g).selectAll('*').remove();
      hullEl.attr('d', null);
    },
  };
}
