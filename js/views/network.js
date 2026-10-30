// Relations network: every country with a recorded tie, laid out once with d3-force and then held still.

import * as store from '../store.js';
import { t, L, registerStrings, fmtNum } from '../i18n.js';
import { esc, icon, showTip, hideTip, reducedMotion } from '../ui.js';
import { edgeVar } from '../palette.js';
import { pips } from '../charts.js';

registerStrings({
  ar: {
    'nw.chart': 'شبكة من {n} علاقة بين {m} دولة',
    'nw.types': 'نوع العلاقة',
    'nw.kinds': 'درجة التوثيق',
    'nw.blocs': 'أبرز تكتل',
    'nw.treaty': 'موثّقة بمعاهدة',
    'nw.assessed': 'تقدير تحليلي',
    'nw.contested': 'محلّ خلاف',
    'nw.width': 'السماكة = قوة الرابط من 2 إلى 5',
    'nw.size': 'حجم الدائرة = مجموع قوة روابط الدولة',
    'nw.strongest': 'أقوى الروابط',
    'nw.weight': 'القوة {n} من 5',
    'nw.ties': 'الروابط: {n}',
    'nw.weighted': 'مجموع القوة: {n}',
    'nw.empty': 'لا روابط تطابق الفلاتر الحالية.',
    'nw.members': '{name}: {n} من أعضائه الـ{of} ظاهرون في الشبكة.',
    'nw.noMembers': '{name}: لا يظهر أي من أعضائه في شبكة العلاقات المسجّلة.',
    'nw.notIn': '{name} ليست طرفاً في أي رابط مسجّل في هذه الشبكة.',
    'nw.compare': 'قارن بينهما',
    'nw.in': 'تكبير',
    'nw.out': 'تصغير',
    'nw.fit': 'إظهار الشبكة كاملة',
    'nw.hint': 'اسحب الدول لتحريكها، ومرّر للتكبير. الأسهم تنقلك بين الدول بالترتيب.',
  },
  en: {
    'nw.chart': 'Network of {n} ties between {m} states',
    'nw.types': 'Type of tie',
    'nw.kinds': 'Evidence',
    'nw.blocs': 'Outline a bloc',
    'nw.treaty': 'Treaty-documented',
    'nw.assessed': 'Analytical assessment',
    'nw.contested': 'Contested',
    'nw.width': 'Line width = strength of the tie, 2 to 5',
    'nw.size': 'Circle size = total strength of a state’s ties',
    'nw.strongest': 'Strongest ties',
    'nw.weight': 'Strength {n} of 5',
    'nw.ties': 'Ties: {n}',
    'nw.weighted': 'Total strength: {n}',
    'nw.empty': 'No ties match the current filters.',
    'nw.members': '{name}: {n} of its {of} members appear in the network.',
    'nw.noMembers': '{name}: none of its members appear in the recorded network.',
    'nw.notIn': '{name} is not a party to any recorded tie in this network.',
    'nw.compare': 'Compare the two',
    'nw.in': 'Zoom in',
    'nw.out': 'Zoom out',
    'nw.fit': 'Show the whole network',
    'nw.hint': 'Drag states to move them; scroll to zoom. Arrow keys step through the states in order.',
  },
});

const dashOf = (kind, contested) => (contested ? '0.5 4.5' : kind === 'assessed' ? '6 4' : null);

/** Short line key that mirrors an edge: type color, solid/dashed/dotted. type=null draws it in ink. */
export function lineKey(type, kind, contested = false, w = 22) {
  const dash = dashOf(kind, contested);
  return `<svg class="lk" width="${w}" height="10" viewBox="0 0 ${w} 10" aria-hidden="true"><line x1="2" y1="5" x2="${w - 2}" y2="5" style="stroke:${type ? edgeVar(type) : 'var(--fg-2)'}" stroke-width="2.4"${dash ? ` stroke-dasharray="${dash}"` : ''}${contested ? ' stroke-linecap="round"' : ''}/></svg>`;
}

let layout = null; // iso3 → {x, y}: settled once, then moved only by the reader's drags

function settle(nodes, edges, rOf) {
  const sn = nodes.map((n) => ({ id: n.id, r: rOf(n.w) }));
  const links = edges.map((e) => ({ source: e.a, target: e.b, w: e.weight }));
  const sim = d3.forceSimulation(sn)
    // tuned offline: wide spacing so the ~30 always-on labels rarely collide once fitted to a typical panel
    .force('link', d3.forceLink(links).id((d) => d.id).distance((l) => 180 - l.w * 12).strength(0.42))
    .force('charge', d3.forceManyBody().strength(-900).distanceMax(900))
    .force('collide', d3.forceCollide((d) => d.r + 44))
    .force('x', d3.forceX(0).strength(0.09))
    .force('y', d3.forceY(0).strength(0.2))
    .stop();
  for (let i = 0; i < 320; i++) sim.tick();
  return new Map(sn.map((d) => [d.id, { x: d.x, y: d.y }]));
}

export function mount(el, DB) {
  const R = DB.relations, edges = R.edges;
  const byId = new Map();
  for (const e of edges) {
    for (const iso of [e.a, e.b]) {
      if (!byId.has(iso)) byId.set(iso, { id: iso, w: 0, n: 0 });
      byId.get(iso).w += e.weight;
      byId.get(iso).n += 1;
    }
  }
  const nodes = [...byId.values()].sort((a, b) => b.w - a.w || a.id.localeCompare(b.id));
  nodes.forEach((n, i) => { n.rank = i; });
  const rOf = d3.scaleSqrt([d3.min(nodes, (n) => n.w), d3.max(nodes, (n) => n.w)], [4.5, 16]);
  if (!layout) layout = settle(nodes, edges, rOf);
  for (const n of nodes) n.p = layout.get(n.id);
  const name = (iso) => DB.nameOf('country', iso, store.state.lang);
  const typeName = (id) => L(R.edgeTypeById.get(id));

  let visE = new Set(), visN = new Set(), members = new Set();
  let hoverNode = null, hoverEdge = null, pinned = null, dragging = false, focusId = null;
  let wantLabel = () => false, forceLabel = () => false;
  let T = d3.zoomIdentity, W = 0, H = 0, fitted = true, rot = false, ax = 1, ay = 1;
  // the settled layout is wide; on a tall chart (phones) it is drawn turned a quarter so it fills the space
  // a force layout has no meaningful aspect, so the fit also stretches it (ax/ay, within limits) to the chart's shape
  const bx = (n) => (rot ? n.p.y : n.p.x), by = (n) => (rot ? n.p.x : n.p.y);
  const wx = (n) => bx(n) * ax, wy = (n) => by(n) * ay;
  const sx = (n) => T.applyX(wx(n)), sy = (n) => T.applyY(wy(n));

  el.innerHTML = `<div class="net">
    <div class="vw-filters">
      <div class="vw-fgroup"><span class="eyebrow" id="nw-gt">${esc(t('nw.types'))}</span><div class="chips" role="group" aria-labelledby="nw-gt" data-g="type"></div></div>
      <div class="vw-fgroup"><span class="eyebrow" id="nw-gk">${esc(t('nw.kinds'))}</span><div class="chips" role="group" aria-labelledby="nw-gk" data-g="kind"></div></div>
      <div class="vw-fgroup"><span class="eyebrow" id="nw-gb">${esc(t('nw.blocs'))}</span><div class="chips" role="group" aria-labelledby="nw-gb" data-g="bloc"></div></div>
    </div>
    <div class="net-main">
      <div class="net-col">
        <div class="net-chart">
          <svg class="net-svg" role="group" aria-label="${esc(t('nw.chart', { n: edges.length, m: nodes.length }))}">
            <path class="net-hull"></path><g class="net-edges"></g><g class="net-ehits"></g><g class="net-nodes"></g><g class="net-labels" aria-hidden="true"></g>
          </svg>
          <div class="net-tools">
            <button class="btn icon" type="button" data-z="in" aria-label="${esc(t('nw.in'))}" data-tip="${esc(t('nw.in'))}">${icon('plus', 16)}</button>
            <button class="btn icon" type="button" data-z="out" aria-label="${esc(t('nw.out'))}" data-tip="${esc(t('nw.out'))}">${icon('minus', 16)}</button>
            <button class="btn icon" type="button" data-z="fit" aria-label="${esc(t('nw.fit'))}" data-tip="${esc(t('nw.fit'))}">${icon('home', 16)}</button>
          </div>
        </div>
        <p class="net-caption" hidden></p>
        <ul class="vw-legend net-legend">
          <li>${lineKey(null, 'treaty')}${esc(t('nw.treaty'))}</li>
          <li>${lineKey(null, 'assessed')}${esc(t('nw.assessed'))}</li>
          <li>${lineKey(null, 'assessed', true)}${esc(t('nw.contested'))}</li>
          <li><svg class="lk" width="22" height="10" aria-hidden="true"><line x1="2" y1="3" x2="20" y2="3" style="stroke:var(--fg-2)" stroke-width="1.5"/><line x1="2" y1="8" x2="20" y2="8" style="stroke:var(--fg-2)" stroke-width="2.9"/></svg>${esc(t('nw.width'))}</li>
          <li><svg class="lk" width="22" height="14" aria-hidden="true"><circle cx="5" cy="9" r="3" style="fill:var(--fg-3)"/><circle cx="15" cy="7" r="6" style="fill:var(--fg-3)"/></svg>${esc(t('nw.size'))}</li>
        </ul>
        <p class="vw-note">${esc(t('nw.hint'))}</p>
      </div>
      <section class="net-side" aria-labelledby="nw-list-h">
        <h3 class="vw-h3" id="nw-list-h">${esc(t('nw.strongest'))} <span class="n"></span></h3>
        <ol class="net-list scroll"></ol>
      </section>
    </div>
  </div>`;
  const q = (s) => el.querySelector(s);
  const chart = q('.net-chart'), listEl = q('.net-list'), countEl = q('.net-side .n'), captionEl = q('.net-caption');

  // ---- filter chips: type + evidence (shared sets), bloc outline (single choice, shared with the powers lens)
  function renderChips() {
    const f = store.state.filters;
    const n = (k, v) => edges.filter((e) => e[k] === v).length;
    q('[data-g=type]').innerHTML = R.edgeTypes.map((ty) => `<button class="chip" type="button" data-type="${esc(ty.id)}" aria-pressed="${f.relTypes.has(ty.id)}">${lineKey(ty.id, 'treaty')}${esc(L(ty))}<span class="n">${n('type', ty.id)}</span></button>`).join('');
    q('[data-g=kind]').innerHTML = ['treaty', 'assessed'].map((k) => `<button class="chip" type="button" data-kind="${k}" aria-pressed="${f.relKinds.has(k)}" data-tip="${esc(esc(L(R.edgeKinds[k])))}">${lineKey(null, k)}${esc(t('nw.' + k))}<span class="n">${n('kind', k)}</span></button>`).join('');
    q('[data-g=bloc]').innerHTML = R.blocs.map((b) => `<button class="chip" type="button" data-bloc="${esc(b.id)}" aria-pressed="${f.bloc === b.id}"${b.note ? ` data-tip="${esc(esc(L(b.note)))}"` : ''}>${esc(L(b))}</button>`).join('');
  }
  q('.vw-filters').addEventListener('click', (e) => {
    const b = e.target.closest('button');
    if (!b) return;
    if (b.dataset.type) store.toggleInSet('relTypes', b.dataset.type);
    else if (b.dataset.kind) store.toggleInSet('relKinds', b.dataset.kind);
    else if (b.dataset.bloc) store.setFilter('bloc', store.state.filters.bloc === b.dataset.bloc ? null : b.dataset.bloc);
  });

  // ---- graph
  const svg = d3.select(q('.net-svg'));
  const hullEl = svg.select('.net-hull');
  const eSel = svg.select('.net-edges').selectAll('line').data(edges, (d) => d.id).join('line')
    .attr('class', 'net-e').style('stroke', (d) => edgeVar(d.type)).attr('stroke-width', (d) => 0.6 + d.weight * 0.45)
    .attr('stroke-dasharray', (d) => dashOf(d.kind, d.contested)).attr('stroke-linecap', (d) => (d.contested ? 'round' : null));
  const hSel = svg.select('.net-ehits').selectAll('line').data(edges, (d) => d.id).join('line').attr('class', 'net-ehit')
    .on('pointerenter', (ev, d) => { if (dragging) return; hoverEdge = d.id; emphasize(); showTip(edgeTip(d), ev.clientX, ev.clientY); })
    .on('pointermove', (ev, d) => { if (!dragging) showTip(edgeTip(d), ev.clientX, ev.clientY); })
    .on('pointerleave', () => { hoverEdge = null; emphasize(); hideTip(); })
    .on('click', (ev, d) => pin(pinned === d.id ? null : d.id, true));
  const nSel = svg.select('.net-nodes').selectAll('g').data(nodes, (d) => d.id).join('g').attr('class', 'net-n')
    .attr('role', 'button').attr('tabindex', -1)
    .attr('aria-label', (d) => `${name(d.id)} — ${t('nw.ties', { n: d.n })}`);
  nSel.append('circle').attr('class', 'net-ring').attr('r', (d) => rOf(d.w) + 4.5);
  nSel.append('circle').attr('class', 'net-dot').attr('r', (d) => rOf(d.w));
  const lSel = svg.select('.net-labels').selectAll('text').data(nodes, (d) => d.id).join('text')
    .attr('class', 'net-l').attr('text-anchor', 'middle').attr('dy', (d) => rOf(d.w) + 13).text((d) => name(d.id));
  lSel.each(function (d) { d.lw = this.getComputedTextLength() || name(d.id).length * 6; });

  nSel
    .on('pointerenter', (ev, d) => { if (dragging) return; hoverNode = d.id; emphasize(); showTip(nodeTip(d), ev.clientX, ev.clientY); })
    .on('pointermove', (ev, d) => { if (!dragging) showTip(nodeTip(d), ev.clientX, ev.clientY); })
    .on('pointerleave', () => { if (dragging) return; hoverNode = null; emphasize(); hideTip(); })
    .on('click', (ev, d) => store.select('country', d.id))
    .on('focus', (ev, d) => { hoverNode = d.id; emphasize(); const r = ev.currentTarget.getBoundingClientRect(); showTip(nodeTip(d), r.right, r.bottom); })
    .on('blur', () => { hoverNode = null; emphasize(); hideTip(); })
    .on('keydown', onNodeKey)
    .call(d3.drag().clickDistance(4)
      .subject((ev, d) => ({ x: sx(d), y: sy(d) }))
      .on('start', () => { dragging = true; hideTip(); })
      .on('drag', (ev, d) => {
        const ix = T.invertX(ev.x) / ax, iy = T.invertY(ev.y) / ay;
        if (rot) { d.p.y = ix; d.p.x = iy; } else { d.p.x = ix; d.p.y = iy; }
        place();
      })
      .on('end', () => { dragging = false; }));

  const zoom = d3.zoom().scaleExtent([0.35, 6])
    .on('zoom', (ev) => { T = ev.transform; if (ev.sourceEvent) fitted = false; place(); });
  svg.call(zoom).on('dblclick.zoom', null);
  svg.on('click', (ev) => { if (ev.target === svg.node() && pinned) pin(null); });

  // fill the chart: node centres inside a 24px margin plus room for the outer circles and the labels under them
  function fitT() {
    const padX = 24 + 34, padT = 24 + 16, padB = 24 + 30;
    const iw = Math.max(40, W - padX * 2), ih = Math.max(40, H - padT - padB);
    const [x0, x1] = d3.extent(nodes, bx), [y0, y1] = d3.extent(nodes, by);
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
  const animate = () => (reducedMotion() ? svg : svg.transition().duration(280));
  function centerOn(iso, smooth) {
    const n = byId.get(iso);
    if (!n || !W) return;
    fitted = false;
    (smooth ? animate() : svg).call(zoom.transform, d3.zoomIdentity.translate(W / 2 - T.k * wx(n), H / 2 - T.k * wy(n)).scale(T.k));
  }
  q('.net-tools').addEventListener('click', (e) => {
    const b = e.target.closest('button');
    if (!b) return;
    fitted = b.dataset.z === 'fit';
    if (fitted) animate().call(zoom.transform, fitT());
    else animate().call(zoom.scaleBy, b.dataset.z === 'in' ? 1.6 : 1 / 1.6);
  });

  function place() {
    const X = (iso) => sx(byId.get(iso)), Y = (iso) => sy(byId.get(iso));
    for (const s of [eSel, hSel]) s.attr('x1', (d) => X(d.a)).attr('y1', (d) => Y(d.a)).attr('x2', (d) => X(d.b)).attr('y2', (d) => Y(d.b));
    nSel.attr('transform', (d) => `translate(${sx(d)},${sy(d)})`);
    lSel.attr('x', sx).attr('y', sy);
    drawHull();
    declutter();
  }

  // greedy label placement: hovered/selected first, then by total strength; a label that would overlap one already placed waits for hover
  function declutter() {
    const placed = [], on = new Set();
    const order = nodes.filter(wantLabel).sort((a, b) => forceLabel(b) - forceLabel(a) || a.rank - b.rank);
    for (const d of order) {
      const hw = (d.lw * (forceLabel(d) ? 1.12 : 1)) / 2 + 2, cx = sx(d), cy = sy(d) + rOf(d.w) + 13;
      const b = [cx - hw, cy - 11, cx + hw, cy + 4];
      if (!forceLabel(d) && placed.some((p) => b[0] < p[2] && p[0] < b[2] && b[1] < p[3] && p[1] < b[3])) continue;
      placed.push(b);
      on.add(d.id);
    }
    lSel.classed('is-on', (d) => on.has(d.id));
  }

  // soft outline behind the bloc's members: hull of a ring of points around each member
  function drawHull() {
    const pts = [];
    for (const iso of members) {
      const n = byId.get(iso), cx = sx(n), cy = sy(n), rr = rOf(n.w) + 16;
      for (let a = 0; a < 12; a++) pts.push([cx + rr * Math.cos((a * Math.PI) / 6), cy + rr * Math.sin((a * Math.PI) / 6)]);
    }
    const hull = pts.length >= 3 ? d3.polygonHull(pts) : null;
    hullEl.attr('d', hull ? d3.line().curve(d3.curveCatmullRomClosed)(hull) : null);
  }

  function applyFilters() {
    const f = store.state.filters;
    visE = new Set(edges.filter((e) => f.relTypes.has(e.type) && f.relKinds.has(e.kind)).map((e) => e.id));
    visN = new Set();
    for (const e of edges) if (visE.has(e.id)) { visN.add(e.a); visN.add(e.b); }
    const bloc = f.bloc && R.blocById.get(f.bloc);
    members = new Set(bloc ? bloc.members.filter((m) => byId.has(m)) : []);
    if (pinned && !visE.has(pinned)) pinned = null;
    eSel.classed('is-off', (d) => !visE.has(d.id));
    hSel.classed('is-off', (d) => !visE.has(d.id));
    nSel.classed('is-faded', (d) => !visN.has(d.id)).classed('is-member', (d) => members.has(d.id));
    renderChips();
    renderList();
    caption();
    emphasize();
    drawHull();
  }

  function emphasize() {
    const sel = store.state.selection;
    const selIso = sel?.kind === 'country' && byId.has(sel.id) ? sel.id : null;
    const fe = DB.edgeById.get(hoverEdge || pinned);
    let keepN = null, keepE = null;
    if (hoverNode) {
      keepE = new Set(edges.filter((e) => visE.has(e.id) && (e.a === hoverNode || e.b === hoverNode)).map((e) => e.id));
      keepN = new Set([hoverNode]);
      for (const id of keepE) { const e = DB.edgeById.get(id); keepN.add(e.a); keepN.add(e.b); }
    } else if (fe) {
      keepE = new Set([fe.id]);
      keepN = new Set([fe.a, fe.b]);
    }
    eSel.classed('is-dim', (d) => !!keepE && !keepE.has(d.id)).classed('is-hot', (d) => !!keepE && keepE.has(d.id));
    nSel.classed('is-dim', (d) => !!keepN && !keepN.has(d.id)).classed('is-sel', (d) => d.id === selIso).classed('is-hover', (d) => d.id === hoverNode);
    wantLabel = (d) => (keepN ? keepN.has(d.id) : (visN.has(d.id) && d.rank < 30) || members.has(d.id) || d.id === selIso);
    forceLabel = (d) => d.id === hoverNode || d.id === selIso;
    lSel.classed('is-focus', forceLabel);
    declutter();
    for (const li of listEl.querySelectorAll('.net-li')) li.classList.toggle('is-hot', li.dataset.edge === (hoverEdge || pinned));
  }

  const edgeTip = (e) => `<b>${esc(name(e.a))} — ${esc(name(e.b))}</b><span class="tip-sub">${esc(typeName(e.type))} · ${esc(t('nw.' + e.kind))}${e.contested ? ` · ${esc(t('nw.contested'))}` : ''} · ${esc(t('nw.weight', { n: e.weight }))}</span><span class="tip-sub">${esc(L(e))}</span>`;
  function nodeTip(n) {
    const mine = edges.filter((e) => visE.has(e.id) && (e.a === n.id || e.b === n.id)).sort((a, b) => b.weight - a.weight);
    const top = mine.slice(0, 4).map((e) => `<span class="tip-sub">${esc(name(e.a === n.id ? e.b : e.a))} · ${esc(typeName(e.type))}</span>`).join('');
    return `<b>${esc(name(n.id))}</b><span class="tip-sub">${esc(t('nw.ties', { n: n.n }))} · ${esc(t('nw.weighted', { n: fmtNum(n.w) }))}</span>${top}`;
  }

  // ---- keyboard: one node in the tab order; arrows step through states by total strength
  function setFocus(id, move) {
    focusId = id;
    nSel.attr('tabindex', (d) => (d.id === focusId ? 0 : -1));
    if (move) nSel.filter((d) => d.id === id).node()?.focus();
  }
  function onNodeKey(ev, d) {
    const i = nodes.indexOf(d);
    const j = { ArrowRight: i + 1, ArrowDown: i + 1, ArrowLeft: i - 1, ArrowUp: i - 1, Home: 0, End: nodes.length - 1 }[ev.key];
    if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); store.select('country', d.id); return; }
    if (j == null) return;
    ev.preventDefault();
    setFocus(nodes[(j + nodes.length) % nodes.length].id, true);
  }

  // ---- strongest ties list
  function renderList() {
    const rows = edges.filter((e) => visE.has(e.id))
      .sort((a, b) => b.weight - a.weight || (a.kind === b.kind ? 0 : a.kind === 'treaty' ? -1 : 1) || byId.get(b.a).w - byId.get(a.a).w);
    countEl.textContent = rows.length;
    listEl.innerHTML = rows.length ? rows.map((e) => {
      const open = e.id === pinned;
      return `<li class="net-li${open ? ' is-open' : ''}" data-edge="${e.id}">
        <button class="net-row" type="button" aria-expanded="${open}" aria-controls="nw-${e.id}">
          ${lineKey(e.type, e.kind, e.contested)}
          <span class="net-row-n">${esc(name(e.a))}<span class="net-sep" aria-hidden="true"> — </span>${esc(name(e.b))}</span>
          <span class="net-row-w">${pips(e.weight, 5, 'var(--fg-2)')}<span class="vh">${esc(t('nw.weight', { n: e.weight }))}</span></span>
        </button>
        <div class="net-more" id="nw-${e.id}"${open ? '' : ' hidden'}>
          <p class="net-more-k">${esc(typeName(e.type))} · ${esc(t('nw.' + e.kind))}${e.contested ? ` · ${esc(t('nw.contested'))}` : ''}</p>
          <p>${esc(L(e))}</p>
          <div class="net-more-a">
            <button class="btn" type="button" data-sel="${esc(e.a)}">${esc(name(e.a))}</button>
            <button class="btn" type="button" data-sel="${esc(e.b)}">${esc(name(e.b))}</button>
            <button class="btn ghost" type="button" data-cmp="${esc(e.a)}|${esc(e.b)}">${icon('compare', 15)}${esc(t('nw.compare'))}</button>
          </div>
        </div></li>`;
    }).join('') : `<li class="empty">${esc(t('nw.empty'))}</li>`;
  }
  function pin(id, fromChart) {
    pinned = id;
    for (const li of listEl.querySelectorAll('.net-li')) {
      const open = li.dataset.edge === pinned;
      li.classList.toggle('is-open', open);
      li.querySelector('.net-row').setAttribute('aria-expanded', String(open));
      li.querySelector('.net-more').hidden = !open;
      if (open && fromChart) li.scrollIntoView({ block: 'nearest', behavior: reducedMotion() ? 'auto' : 'smooth' });
    }
    emphasize();
  }
  listEl.addEventListener('click', (e) => {
    const b = e.target.closest('button');
    if (!b) return;
    if (b.dataset.sel) store.select('country', b.dataset.sel);
    else if (b.dataset.cmp) store.set({ compare: b.dataset.cmp.split('|'), view: 'compare' });
    else { const id = b.closest('.net-li').dataset.edge; pin(pinned === id ? null : id); }
  });
  listEl.addEventListener('pointerover', (e) => {
    const id = e.target.closest?.('.net-li')?.dataset.edge || null;
    if (id !== hoverEdge) { hoverEdge = id; emphasize(); }
  });
  listEl.addEventListener('pointerleave', () => { hoverEdge = null; emphasize(); });

  function caption() {
    const f = store.state.filters, sel = store.state.selection, parts = [];
    const b = f.bloc && R.blocById.get(f.bloc);
    if (b) parts.push(members.size ? t('nw.members', { name: L(b), n: members.size, of: b.members.length }) : t('nw.noMembers', { name: L(b) }));
    if (sel?.kind === 'country' && !byId.has(sel.id)) parts.push(t('nw.notIn', { name: name(sel.id) }));
    captionEl.textContent = parts.join(' ');
    captionEl.hidden = !parts.length;
  }

  const ro = new ResizeObserver(() => { if (chart.clientWidth !== W || chart.clientHeight !== H) resize(); });
  applyFilters();
  resize();
  ro.observe(chart);
  const sel0 = store.state.selection;
  if (sel0?.kind === 'country' && byId.has(sel0.id)) { centerOn(sel0.id, false); setFocus(sel0.id); } else setFocus(nodes[0].id);

  return {
    update(keys) {
      if (keys.includes('filters')) applyFilters();
      if (keys.includes('selection')) {
        const sel = store.state.selection;
        emphasize();
        caption();
        if (sel?.kind === 'country' && byId.has(sel.id)) { centerOn(sel.id, true); setFocus(sel.id); }
      }
    },
    destroy() {
      ro.disconnect();
      svg.interrupt();
      hideTip();
    },
  };
}
