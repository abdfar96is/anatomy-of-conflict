// Timeline: the scrubber band under the map (initScrubber) and the full swimlane view (mount).
// Time always runs left → right (the plots carry dir="ltr"); the controls around them follow the page direction.

import * as store from '../store.js';
import { SEVERITY } from '../config.js';
import { t, L, Lk, registerStrings, fmtDate } from '../i18n.js';
import { esc, icon, showTip, hideTip, reducedMotion } from '../ui.js';
import { sevVar, isDark } from '../palette.js';

registerStrings({
  ar: {
    'sc.year': 'السنة',
    'sc.slider': 'سنة الخط الزمني',
    'sc.play': 'شغّل الخط الزمني حتى اليوم',
    'sc.pause': 'أوقف التشغيل',
    'sc.filter': 'فلترة الخريطة بالسنة',
    'sc.filtered': 'الخريطة مفلترة حتى هذه السنة',
    'sc.open': 'الخط الزمني الكامل',
    'sc.events': 'الأحداث: {n}',
    'sc.began': 'نزاعات بدأت: {n}',
    'sc.more': 'و{n} غيرها',
    'sc.pick': 'انقر للاختيار',
    'sc.pickNext': 'انقر مرّة أخرى لاختيار التالي',
    'tl.cats': 'فئات الأحداث',
    'tl.all': 'الكل',
    'tl.hint': 'مرّر العجلة فوق المسارات للتكبير، واسحب للتنقّل.',
    'tl.hintTouch': 'استخدم الأزرار للتكبير والتنقّل.',
    'tl.in': 'تكبير',
    'tl.out': 'تصغير',
    'tl.earlier': 'إلى الأقدم',
    'tl.later': 'إلى الأحدث',
    'tl.reset': 'العرض الكامل',
    'tl.chart': 'الأحداث التاريخية حسب الفئة من {a} إلى {b}، ومدد النزاعات الجارية',
    'tl.conflicts': 'النزاعات الجارية حسب مدّتها',
    'tl.severity': 'شدّة النزاع',
    'tl.inView': 'الأحداث في النطاق المعروض',
    'tl.noneInView': 'لا أحداث في هذا النطاق ضمن الفئات المختارة. صغّر العرض أو أضف فئات.',
    'tl.noCats': 'اختر فئة واحدة على الأقل لعرض الأحداث.',
    'tl.since': 'منذ {d}',
    'tl.borders': 'حدود اليوم فقط.',
    'tl.events': 'الأحداث',
    'tl.uvDot': 'لم تتحقّق منها هذه النسخة',
    'tl.satDot': 'الحدث نفسه في فئة إضافية',
    'vw.uv': 'لم تتحقّق منه هذه النسخة',
    'vw.uv.tip': 'الوضع وأحدث التطوّرات منقولة من الأطلس الأصلي (حتى {d})، ولم تُدقّقها هذه النسخة بصورة مستقلة.',
  },
  en: {
    'sc.year': 'Year',
    'sc.slider': 'Timeline year',
    'sc.play': 'Play the timeline to today',
    'sc.pause': 'Pause',
    'sc.filter': 'Filter map by year',
    'sc.filtered': 'map filtered to this year',
    'sc.open': 'Full timeline',
    'sc.events': 'Events: {n}',
    'sc.began': 'Conflicts begun: {n}',
    'sc.more': 'and {n} more',
    'sc.pick': 'Click to select',
    'sc.pickNext': 'Click again for the next one',
    'tl.cats': 'Event categories',
    'tl.all': 'All',
    'tl.hint': 'Scroll over the lanes to zoom, drag to pan.',
    'tl.hintTouch': 'Use the buttons to zoom and pan.',
    'tl.in': 'Zoom in',
    'tl.out': 'Zoom out',
    'tl.earlier': 'Earlier',
    'tl.later': 'Later',
    'tl.reset': 'Whole range',
    'tl.chart': 'Historical events by category from {a} to {b}, and the durations of running conflicts',
    'tl.conflicts': 'Running conflicts, by duration',
    'tl.severity': 'Severity',
    'tl.inView': 'Events in view',
    'tl.noneInView': 'No events in this range for the chosen categories. Zoom out or add categories.',
    'tl.noCats': 'Choose at least one category to show events.',
    'tl.since': 'since {d}',
    'tl.borders': 'Present-day borders only.',
    'tl.events': 'Events',
    'tl.uvDot': 'Not independently verified by this edition',
    'tl.satDot': 'Same event, additional category',
    'vw.uv': 'Not independently verified by this edition',
    'vw.uv.tip': 'Status and recent developments come from the original atlas (as of {d}); this edition has not independently checked them.',
  },
});

const SEV = Object.fromEntries(SEVERITY.map((s) => [s.id, s]));

/** Fractional year of a dated record ('1948-05-14' → 1948.37), so same-year events spread out. */
function datePos(rec) {
  const [y, m, d] = String(rec.date).split('-').map(Number);
  if (d) return y + (m - 1) / 12 + (d - 1) / 365;
  if (m) return y + (m - 0.5) / 12;
  return y + 0.5;
}

/** Category colors come from the data; clamp their lightness so dark reds and pale golds stay visible on both themes. */
const catCache = new Map();
function catColor(cat) {
  if (!cat) return 'var(--cat-0)';
  const dark = isDark(), key = `${cat.id}|${dark}`;
  if (!catCache.has(key)) {
    const c = d3.lab(cat.color);
    c.l = dark ? Math.max(c.l, 50) : Math.min(c.l, 62);
    catCache.set(key, c.formatHex());
  }
  return catCache.get(key);
}

/** Severity marker drawn around (0,0): color plus the config shape, so severity never rests on hue alone. */
export function sevShape(id) {
  const c = esc(sevVar(id));
  const fill = `style="fill:${c}"`, open = `style="fill:var(--surface);stroke:${c}" stroke-width="1.6"`;
  switch (SEV[id]?.shape) {
    case 'pulse': return `<circle r="5" style="fill:none;stroke:${c}" stroke-width="1.2"/><circle r="2.8" ${fill}/>`;
    case 'square': return `<rect x="-3.2" y="-3.2" width="6.4" height="6.4" rx="1" ${fill}/>`;
    case 'ring': return `<circle r="3.2" ${open}/>`;
    case 'diamond': return `<path d="M0-4.2L4.2 0 0 4.2-4.2 0z" ${fill}/>`;
    case 'dashed': return `<path d="M-5 0H5" style="stroke:${c}" stroke-width="2.6" stroke-dasharray="2.4 1.6"/>`;
    case 'dot': return `<circle r="2.2" ${fill}/>`;
    case 'hollow': return `<rect x="-3.2" y="-3.2" width="6.4" height="6.4" rx="1" ${open}/>`;
    default: return `<circle r="3.6" ${fill}/>`;
  }
}
/** Quiet info mark for records the edition carries over without re-checking (same meaning as the dossier's pill). */
export function uvMark(DB, kind, id) {
  if (!DB.isUnverified?.(kind, id)) return '';
  return `<span class="vw-uv" tabindex="0" data-tip="${esc(esc(t('vw.uv.tip', { d: fmtDate(DB.conflictsAsOf) })))}">${icon('info', 13)}<span class="vh">${esc(t('vw.uv'))}</span></span>`;
}
const uvLine = (DB, kind, id) => (DB.isUnverified?.(kind, id) ? `<span class="tip-sub">${esc(t('vw.uv'))}</span>` : '');

export const sevIcon = (id, size = 12) =>
  `<svg class="sev-ic" width="${size}" height="${size}" viewBox="-6 -6 12 12" aria-hidden="true">${sevShape(id)}</svg>`;

// ---------------------------------------------------------------- scrubber band

export function initScrubber(el, DB) {
  if (!el) return;
  const [Y0, Y1] = DB.timeline.range;
  const RATE = (Y1 - Y0) / 12000; // the whole range plays in about 12 s
  const clampY = (y) => Math.max(Y0, Math.min(Y1, Math.round(y)));
  const evByYear = d3.group(DB.timeline.events, (e) => e.year);
  const maxN = d3.max([...evByYear.values()], (v) => v.length) || 1;
  const cfByYear = d3.group(DB.conflicts.filter((c) => c.startYear), (c) => clampY(c.startYear));

  let track, svgEl, readout, playBtn, filterBtn;
  let x = null, W = 0, H = 0, B = 0, hover = null, drag = null, shownPlaying = null;
  let raf = 0, timer = 0, yf = 0, last = 0;
  const ro = new ResizeObserver(() => draw());

  el.classList.add('sc');

  function build() {
    el.innerHTML = `
      <button class="btn icon sc-play" type="button"></button>
      <div class="sc-year"><span class="sc-year-l">${esc(t('sc.year'))}</span><output class="sc-year-v"></output></div>
      <div class="sc-track" role="slider" tabindex="0" dir="ltr" aria-valuemin="${Y0}" aria-valuemax="${Y1}" aria-label="${esc(t('sc.slider'))}">
        <svg class="sc-svg" aria-hidden="true"></svg>
      </div>
      <button class="chip sc-filter" type="button" aria-label="${esc(t('sc.filter'))}" data-tip="${esc(t('sc.filter'))}">${icon('filter', 15)}<span class="sc-lbl">${esc(t('sc.filter'))}</span></button>
      <button class="btn ghost sc-open" type="button" aria-label="${esc(t('sc.open'))}" data-tip="${esc(t('sc.open'))}">${icon('clock', 17)}<span class="sc-lbl">${esc(t('sc.open'))}</span></button>`;
    track = el.querySelector('.sc-track');
    svgEl = el.querySelector('.sc-svg');
    readout = el.querySelector('.sc-year-v');
    playBtn = el.querySelector('.sc-play');
    filterBtn = el.querySelector('.sc-filter');
    shownPlaying = null;
    playBtn.addEventListener('click', () => store.set({ playing: !store.state.playing }));
    filterBtn.addEventListener('click', () => store.set({ yearFilter: !store.state.yearFilter }));
    el.querySelector('.sc-open').addEventListener('click', () => store.openView('timeline'));
    bindTrack();
    ro.disconnect();
    ro.observe(track);
    draw();
  }

  function draw() {
    W = track.clientWidth; H = track.clientHeight;
    if (!W || !H) return;
    B = Math.round(H - 25);
    x = d3.scaleLinear([Y0, Y1 + 1], [7, W - 7]);
    const step = x(Y0 + 1) - x(Y0);
    const bw = Math.max(1, step - Math.min(2, step * 0.45));
    const histH = Math.max(8, B - 3);
    const every = step * 10 >= 40 ? 10 : step * 10 >= 20 ? 20 : 50;
    const out = [`<line class="sc-base" x1="${x(Y0)}" x2="${x(Y1 + 1)}" y1="${B + 0.5}" y2="${B + 0.5}"/>`];
    for (let d = Y0; d <= Y1; d += 10) {
      out.push(`<line class="sc-tick" x1="${x(d)}" x2="${x(d)}" y1="${B}" y2="${B + 3}"/>`);
      if ((d - Y0) % every === 0) out.push(`<text class="sc-lab" x="${x(d)}" y="${H - 1}" text-anchor="${d === Y0 ? 'start' : 'middle'}">${d}</text>`);
    }
    for (const [y, list] of evByYear) {
      const bh = Math.max(2, (list.length / maxN) * histH);
      out.push(`<rect class="sc-bar" data-y="${y}" x="${(x(y) + (step - bw) / 2).toFixed(2)}" y="${(B - bh).toFixed(2)}" width="${bw.toFixed(2)}" height="${bh.toFixed(2)}" rx="${Math.min(1.5, bw / 2).toFixed(2)}"/>`);
    }
    for (const [y, list] of cfByYear) {
      list.forEach((c, i) => {
        const cx = x(y + 0.5) + (i - (list.length - 1) / 2) * 3;
        out.push(`<rect class="sc-cf" data-y="${y}" data-id="${esc(c.id)}" x="${(cx - 1).toFixed(2)}" y="${B + 4}" width="2" height="6" style="fill:${esc(sevVar(c.severity))}"/>`);
      });
    }
    out.push(`<g class="sc-handle"><line class="sc-hline" y1="0" y2="${B + 13}"/><circle class="sc-knob" cy="${B}" r="5.5"/></g>`);
    svgEl.setAttribute('viewBox', `0 0 ${W} ${H}`);
    svgEl.innerHTML = out.join('');
    update();
  }

  function update() {
    if (!track) return;
    const { year, yearFilter: f, playing, selection: sel } = store.state;
    readout.textContent = year;
    track.setAttribute('aria-valuenow', year);
    track.setAttribute('aria-valuetext', f ? `${year} — ${t('sc.filtered')}` : String(year));
    filterBtn.setAttribute('aria-pressed', String(!!f));
    if (shownPlaying !== playing) {
      shownPlaying = playing;
      const label = t(playing ? 'sc.pause' : 'sc.play');
      playBtn.innerHTML = icon(playing ? 'pause' : 'play', 18);
      playBtn.setAttribute('aria-label', label);
      playBtn.dataset.tip = esc(label);
      playBtn.classList.toggle('is-playing', !!playing);
    }
    if (!x) return;
    svgEl.querySelector('.sc-handle')?.setAttribute('transform', `translate(${x(year + 0.5).toFixed(2)},0)`);
    const selYear = sel?.kind === 'event' ? DB.get('event', sel.id)?.year : null;
    for (const r of svgEl.querySelectorAll('.sc-bar')) {
      const y = +r.dataset.y;
      r.classList.toggle('is-future', !!f && y > year);
      r.classList.toggle('is-sel', y === selYear);
      r.classList.toggle('is-hover', hover?.kind === 'ev' && hover.year === y);
    }
    for (const r of svgEl.querySelectorAll('.sc-cf')) {
      const y = +r.dataset.y, on = (sel?.kind === 'conflict' && sel.id === r.dataset.id) || (hover?.kind === 'cf' && hover.year === y);
      r.classList.toggle('is-future', !!f && y > year);
      r.setAttribute('y', on ? B + 3 : B + 4);
      r.setAttribute('height', on ? 9 : 6);
    }
  }

  // nearest mark under the pointer; the knob itself always drags
  function hitTest(px, py) {
    if (!x) return null;
    if (Math.hypot(px - x(store.state.year + 0.5), py - B) <= 9) return null;
    const kind = py < B ? 'ev' : py <= B + 12 ? 'cf' : null;
    if (!kind) return null;
    const tol = Math.max(7, (x(Y0 + 1) - x(Y0)) * 0.75);
    let best = null, bd = Infinity;
    for (const y of (kind === 'ev' ? evByYear : cfByYear).keys()) {
      const dist = Math.abs(x(y + 0.5) - px);
      if (dist < bd) { bd = dist; best = y; }
    }
    return bd <= tol ? { kind, year: best } : null;
  }

  const listOf = (h) => (h.kind === 'ev' ? evByYear.get(h.year) : cfByYear.get(h.year));

  function tipFor(h) {
    const ev = h.kind === 'ev', list = listOf(h);
    const rows = list.slice(0, 6).map((o) => (ev
      ? `<span class="tip-sub">${esc(L(o))}</span>`
      : `<span class="tip-sub">${esc(L(o.name))} · ${esc(L(SEV[o.severity]))}${o.startYear < Y0 ? ` · ${o.startYear}` : ''}</span>`)).join('');
    const more = list.length > 6 ? `<span class="tip-sub">${esc(t('sc.more', { n: list.length - 6 }))}</span>` : '';
    const sel = store.state.selection, kind = ev ? 'event' : 'conflict';
    const again = list.length > 1 && sel?.kind === kind && list.some((o) => o.id === sel.id);
    return `<b>${h.year}</b> · ${esc(t(ev ? 'sc.events' : 'sc.began', { n: list.length }))}${rows}${more}<span class="tip-sub">${esc(t(again ? 'sc.pickNext' : 'sc.pick'))}</span>`;
  }

  /** Select the first record of that year; clicking the same year again walks through the rest. */
  function activate(h) {
    const list = listOf(h), kind = h.kind === 'ev' ? 'event' : 'conflict', sel = store.state.selection;
    const j = sel?.kind === kind ? list.findIndex((o) => o.id === sel.id) : -1;
    store.select(kind, list[(j + 1) % list.length].id);
  }

  function setHover(h, e) {
    const same = h && hover && h.kind === hover.kind && h.year === hover.year;
    if (!same && (h || hover)) {
      hover = h;
      track.classList.toggle('is-mark', !!h);
      update();
      store.highlight(h ? { iso3: [...new Set(listOf(h).flatMap((o) => o.countries || []))] } : null);
    }
    if (h) showTip(tipFor(h), e.clientX, e.clientY);
    else if (!same) hideTip();
  }

  function setYearAt(px) {
    const y = clampY(Math.floor(x.invert(px)));
    if (y !== store.state.year) store.set({ year: y });
  }
  const stopPlay = () => { if (store.state.playing) store.set({ playing: false }); };

  function bindTrack() {
    const local = (e) => { const r = track.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; };
    track.addEventListener('pointerdown', (e) => {
      if (e.button !== 0 || !x) return;
      const [px, py] = local(e), mark = hitTest(px, py);
      drag = { x0: e.clientX, mark, moving: !mark };
      track.setPointerCapture?.(e.pointerId);
      if (!mark) { stopPlay(); hideTip(); setYearAt(px); }
    });
    track.addEventListener('pointermove', (e) => {
      const [px, py] = local(e);
      if (drag) {
        if (!drag.moving && Math.abs(e.clientX - drag.x0) > 4) { drag.moving = true; drag.mark = null; setHover(null, e); stopPlay(); }
        if (drag.moving) setYearAt(px);
        return;
      }
      setHover(hitTest(px, py), e);
    });
    track.addEventListener('pointerup', () => {
      if (drag?.mark && !drag.moving) activate(drag.mark);
      drag = null;
    });
    track.addEventListener('pointercancel', () => { drag = null; });
    track.addEventListener('pointerleave', (e) => { if (!drag) setHover(null, e); });
    track.addEventListener('keydown', (e) => {
      const y = store.state.year;
      const next = { ArrowRight: y + 1, ArrowUp: y + 1, ArrowLeft: y - 1, ArrowDown: y - 1, PageUp: y + 10, PageDown: y - 10, Home: Y0, End: Y1 }[e.key];
      if (next == null) return;
      e.preventDefault();
      stopPlay();
      store.set({ year: clampY(next) });
    });
  }

  // ---- play: smooth frames, or a decade every 800 ms when the reader prefers reduced motion
  function stopLoop() { cancelAnimationFrame(raf); clearInterval(timer); raf = 0; timer = 0; }
  function startLoop() {
    stopLoop();
    if (store.state.year >= Y1) store.set({ year: Y0 });
    if (reducedMotion()) {
      timer = setInterval(() => {
        const next = Math.min(Y1, Math.floor(store.state.year / 10) * 10 + 10);
        store.set(next >= Y1 ? { year: Y1, playing: false } : { year: next });
      }, 800);
      return;
    }
    yf = store.state.year; last = performance.now();
    const tick = (now) => {
      if (Math.floor(yf) !== store.state.year) yf = store.state.year; // someone else moved the cursor
      yf += (now - last) * RATE; last = now;
      if (yf >= Y1) { store.set({ year: Y1, playing: false }); return; }
      const y = Math.floor(yf);
      if (y !== store.state.year) store.set({ year: y });
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
  }

  store.on('change', ({ keys }) => {
    if (keys.includes('lang')) build();
    if (keys.includes('playing')) (store.state.playing ? startLoop() : stopLoop());
    if (keys.some((k) => k === 'year' || k === 'yearFilter' || k === 'playing' || k === 'selection')) update();
  });
  build();
  if (store.state.playing) startLoop();
}

// ---------------------------------------------------------------- full timeline view

let keptT = null; // the reader's zoom, kept across re-mounts (language or theme switch)

export function mount(el, DB) {
  const [Y0, Y1] = DB.timeline.range;
  const cats = DB.timeline.categories, catById = DB.timeline.catById;
  const today = datePos({ date: DB.conflictsAsOf });
  const evs = DB.timeline.events.map((e) => ({ e, pos: datePos(e), dy: 0 }));
  // pre: began before the chart's range (e.g. 1841) — the bar is cut at the range start and capped with the true year
  const confs = DB.conflicts.filter((c) => c.startYear).map((c) => ({ c, pos: datePos({ date: c.started }), pre: c.startYear < Y0 }))
    .sort((a, b) => a.pos - b.pos || b.c.rank - a.c.rank);
  const coarse = matchMedia('(pointer: coarse)').matches;
  const AX = 28, GAP = 30, ROW = 7;
  let LANE = 30, W = 0, H = 0, confTop = 0, x0 = null, x = null, zoom = null;
  let vis = [], laneOf = new Map(), hoverId = null, hoverConf = null, listKey = '', raf = 0;
  let svg, gAxis, gGrid, gLinks, gFocus, gCursor, dots, hits, sats, confG;
  const laneY = (i) => AX + i * LANE + LANE / 2;
  const ms = () => (reducedMotion() ? 0 : 250);

  el.innerHTML = `<div class="tl">
    <div class="vw-filters"><div class="vw-fgroup"><span class="eyebrow" id="tl-cats-l">${esc(t('tl.cats'))}</span><div class="chips tl-cats" role="group" aria-labelledby="tl-cats-l"></div></div></div>
    <div class="tl-tools">
      <p class="tl-hint">${esc(t(coarse ? 'tl.hintTouch' : 'tl.hint'))}</p>
      <span class="tl-range num"></span>
      <div class="tl-zoom" dir="ltr">
        <button class="btn icon" type="button" data-z="earlier" aria-label="${esc(t('tl.earlier'))}" data-tip="${esc(t('tl.earlier'))}">${icon('chevron', 16, 'style="transform:scaleX(-1)"')}</button>
        <button class="btn icon" type="button" data-z="later" aria-label="${esc(t('tl.later'))}" data-tip="${esc(t('tl.later'))}">${icon('chevron', 16)}</button>
        <button class="btn icon" type="button" data-z="out" aria-label="${esc(t('tl.out'))}" data-tip="${esc(t('tl.out'))}">${icon('minus', 16)}</button>
        <button class="btn icon" type="button" data-z="in" aria-label="${esc(t('tl.in'))}" data-tip="${esc(t('tl.in'))}">${icon('plus', 16)}</button>
        <button class="btn" type="button" data-z="reset">${icon('home', 15)}<span>${esc(t('tl.reset'))}</span></button>
      </div>
    </div>
    <div class="tl-chart">
      <div class="tl-labels" aria-hidden="true"></div>
      <div class="tl-plot" dir="ltr"><svg class="tl-svg" role="img" aria-label="${esc(t('tl.chart', { a: Y0, b: Y1 }))}"></svg></div>
    </div>
    <div class="tl-foot">
      <div class="tl-foot-g"><span class="eyebrow">${esc(t('tl.events'))}</span>
        <ul class="vw-legend">
          <li><svg class="sev-ic" width="14" height="14" viewBox="-7 -7 14 14" aria-hidden="true"><circle r="5" class="tl-key-uv"/></svg>${esc(t('tl.uvDot'))}</li>
          <li><svg class="sev-ic" width="14" height="14" viewBox="-7 -7 14 14" aria-hidden="true"><circle r="2.6" class="tl-key-sat"/></svg>${esc(t('tl.satDot'))}</li>
        </ul></div>
      <div class="tl-foot-g"><span class="eyebrow">${esc(t('tl.severity'))}</span>
        <ul class="vw-legend">${SEVERITY.filter((s) => confs.some((d) => d.c.severity === s.id)).map((s) => `<li>${sevIcon(s.id)}${esc(L(s))}</li>`).join('')}</ul></div>
    </div>
    <div class="caveat">${icon('info', 16)}<p><b>${esc(t('tl.borders'))}</b> ${esc(L(DB.timeline.boundaryLimitation))}</p></div>
    <section class="tl-list" aria-labelledby="tl-list-h">
      <h3 class="vw-h3" id="tl-list-h">${esc(t('tl.inView'))} <span class="n"></span></h3>
      <ol class="tl-rows"></ol>
    </section>
  </div>`;
  const chipsEl = el.querySelector('.tl-cats'), labelsEl = el.querySelector('.tl-labels'), plot = el.querySelector('.tl-plot');
  const rangeEl = el.querySelector('.tl-range'), rowsEl = el.querySelector('.tl-rows'), countEl = el.querySelector('.tl-list .n');
  svg = d3.select(el.querySelector('.tl-svg'));

  // ---- category chips (filters.timelineCats, shared with the map's history lens)
  const allOn = () => { const on = store.state.filters.timelineCats; return !on || cats.every((c) => on.has(c.id)); };
  function renderChips() {
    const on = store.state.filters.timelineCats;
    const n = (id) => evs.filter((d) => d.e.cat.includes(id)).length;
    chipsEl.innerHTML = `<button class="chip" type="button" data-all aria-pressed="${allOn()}">${esc(t('tl.all'))}</button>`
      + cats.map((c) => `<button class="chip" type="button" data-cat="${esc(c.id)}" aria-pressed="${!on || on.has(c.id)}"><i class="sw" style="background:${catColor(c)}"></i>${esc(L(c))}<span class="n">${n(c.id)}</span></button>`).join('');
  }
  chipsEl.addEventListener('click', (e) => {
    const b = e.target.closest('button');
    if (!b) return;
    if (b.hasAttribute('data-all')) store.setFilter('timelineCats', new Set(allOn() ? [] : cats.map((c) => c.id)));
    else store.toggleInSet('timelineCats', b.dataset.cat);
  });

  // ---- chart
  function build() {
    W = plot.clientWidth;
    if (!W) return;
    LANE = matchMedia('(max-width: 760px)').matches ? 26 : 30;
    const on = store.state.filters.timelineCats;
    const lanes = cats.filter((c) => !on || on.has(c.id));
    laneOf = new Map(lanes.map((c, i) => [c.id, i]));
    vis = evs.filter((d) => d.e.cat.some((c) => laneOf.has(c))).map((d) => {
      const act = d.e.cat.filter((c) => laneOf.has(c));
      return Object.assign(d, { lane: laneOf.get(act[0]), cat: act[0], extra: act.slice(1) });
    });
    const lanesH = lanes.length ? lanes.length * LANE : 52;
    confTop = AX + lanesH + GAP;
    H = confTop + confs.length * ROW + 6;
    x0 = d3.scaleLinear([Y0, Y1 + 1], [12, W - 12]);

    labelsEl.style.blockSize = `${H}px`;
    labelsEl.innerHTML = lanes.map((c, i) => `<div class="tl-lane-l" style="inset-block-start:${AX + i * LANE}px;block-size:${LANE}px"><i class="sw" style="background:${catColor(c)}"></i><span>${esc(L(c))}</span></div>`).join('')
      + `<div class="tl-conf-l" style="inset-block-start:${confTop - 4}px">${esc(t('tl.conflicts'))}</div>`;

    svg.attr('width', W).attr('height', H).attr('viewBox', `0 0 ${W} ${H}`);
    svg.selectAll('*').remove();
    svg.append('rect').attr('class', 'tl-bg').attr('width', W).attr('height', confTop - GAP / 2);
    gGrid = svg.append('g').attr('class', 'tl-grid');
    svg.append('g').attr('class', 'tl-seps').selectAll('line').data(d3.range(lanes.length + 1)).join('line')
      .attr('x1', 0).attr('x2', W).attr('y1', (i) => AX + i * LANE + 0.5).attr('y2', (i) => AX + i * LANE + 0.5);
    if (!lanes.length) svg.append('text').attr('class', 'tl-empty').attr('x', W / 2).attr('y', AX + 31).attr('text-anchor', 'middle').text(t('tl.noCats'));
    gAxis = svg.append('g').attr('class', 'tl-axis').attr('transform', `translate(0,${AX - 6})`);

    // conflict durations: one thin bar per conflict from its start to the data's as-of date
    const cg = svg.append('g').attr('class', 'tl-confs');
    cg.html(`<rect class="tl-cbg" y="${confTop - GAP / 2}" width="${W}" height="${H - confTop + GAP / 2}"/>` + confs.map((d, i) => `<g class="tl-c" transform="translate(0,${confTop + i * ROW + ROW / 2})">
      <line class="tl-cbar" style="stroke:${esc(sevVar(d.c.severity))}"${SEV[d.c.severity]?.shape === 'dashed' ? ' stroke-dasharray="4 2.5"' : ''}/>
      ${d.pre
    ? `<g class="tl-cpre"><path d="M0 0L5.5-3.6V3.6z" style="fill:${esc(sevVar(d.c.severity))}"/><text x="8.5" y="3.6">${esc(String(d.c.startYear))}</text></g>`
    : `<g class="tl-cmk"><g transform="scale(.8)">${sevShape(d.c.severity)}</g></g>`}
      <rect class="tl-chit" y="${-ROW / 2}" height="${ROW}"/></g>`).join(''));
    confG = cg.selectAll('g.tl-c').data(confs);
    confG.select('rect.tl-chit')
      .on('pointerenter pointermove', (ev, d) => { setHoverConf(d.c); showTip(confTip(d.c), ev.clientX, ev.clientY); })
      .on('pointerleave', () => { setHoverConf(null); hideTip(); })
      .on('click', (ev, d) => store.select('conflict', d.c.id));

    sats = svg.append('g').attr('class', 'tl-sats').selectAll('circle')
      .data(vis.flatMap((d) => d.extra.map((c) => ({ d, lane: laneOf.get(c), c }))))
      .join('circle').attr('r', 2.6).style('fill', (s) => catColor(catById.get(s.c)));
    gLinks = svg.append('g').attr('class', 'tl-links');
    dots = svg.append('g').attr('class', 'tl-dots').selectAll('circle').data(vis, (d) => d.e.id).join('circle')
      .attr('r', 5).style('fill', (d) => catColor(catById.get(d.cat)))
      .classed('is-uv', (d) => !!DB.isUnverified?.('event', d.e.id)); // dashed outline: carried over, not re-checked
    gCursor = svg.append('g').attr('class', 'tl-cursor');
    gCursor.append('line').attr('y1', AX - 2).attr('y2', H);
    gCursor.append('rect').attr('x', -19).attr('y', 1).attr('width', 38).attr('height', 17).attr('rx', 3);
    gCursor.append('text').attr('y', 13.5).attr('text-anchor', 'middle');
    gFocus = svg.append('g').attr('class', 'tl-focus');
    hits = svg.append('g').attr('class', 'tl-hits').selectAll('circle').data(vis, (d) => d.e.id).join('circle').attr('r', 11)
      .on('pointerenter', (ev, d) => { setHoverEvent(d.e.id); showTip(evTip(d.e), ev.clientX, ev.clientY); })
      .on('pointermove', (ev, d) => showTip(evTip(d.e), ev.clientX, ev.clientY))
      .on('pointerleave', () => { setHoverEvent(null); hideTip(); })
      .on('click', (ev, d) => store.select('event', d.e.id));

    zoom = d3.zoom().scaleExtent([1, 40]).extent([[0, 0], [W, H]]).translateExtent([[0, 0], [W, H]])
      .filter((ev) => {
        if (ev.type === 'wheel') return !ev.target.closest?.('.tl-confs'); // wheel over the conflict track scrolls the panel
        if (ev.type === 'touchstart') return false; // one finger scrolls the panel; the buttons zoom and pan
        return !ev.button && !ev.ctrlKey;
      })
      .on('zoom', (ev) => { keptT = ev.transform; position(); });
    svg.call(zoom);
    svg.call(zoom.transform, keptT ? d3.zoomIdentity.translate(keptT.x, 0).scale(keptT.k) : d3.zoomIdentity);
  }

  // x-dependent geometry: runs on every zoom frame
  function position() {
    if (!x0) return;
    x = (keptT || d3.zoomIdentity).rescaleX(x0);
    const ticks = x.ticks(Math.max(3, Math.floor(W / 90))).filter(Number.isInteger);
    gAxis.call(d3.axisTop(x).tickValues(ticks).tickFormat(d3.format('d')).tickSize(4).tickPadding(4)).select('.domain').remove();
    gGrid.selectAll('line').data(ticks).join('line').attr('x1', x).attr('x2', x).attr('y1', AX - 2).attr('y2', H);
    dodge();
    dots.attr('cx', (d) => x(d.pos)).attr('cy', (d) => laneY(d.lane) + d.dy);
    hits.attr('cx', (d) => x(d.pos)).attr('cy', (d) => laneY(d.lane) + d.dy);
    sats.attr('cx', (s) => x(s.d.pos)).attr('cy', (s) => laneY(s.lane));
    const xt = x(today);
    const xs = (d) => x(d.pre ? Y0 : d.pos);
    confG.select('.tl-cbar').attr('x1', xs).attr('x2', xt);
    confG.select('.tl-cmk').attr('transform', (d) => `translate(${x(d.pos)},0)`);
    confG.select('.tl-cpre').attr('transform', (d) => `translate(${x(Y0)},0)`);
    confG.select('.tl-chit').attr('x', (d) => xs(d) - 6).attr('width', (d) => Math.max(12, xt - xs(d) + 8));
    const [d0, d1] = x.domain();
    rangeEl.textContent = `${Math.max(Y0, Math.floor(d0))}–${Math.min(Y1, Math.floor(d1 - 1e-6))}`;
    moveCursor();
    drawFocus();
    if (!raf) raf = requestAnimationFrame(renderList);
  }

  // same-lane dots closer than 11px step up or down so each one stays visible and hoverable
  function dodge() {
    const levels = [0, -8, 8].map((v) => v * (LANE / 30));
    for (const list of d3.group(vis, (d) => d.lane).values()) {
      list.sort((a, b) => a.pos - b.pos);
      const lastX = levels.map(() => -Infinity);
      for (const d of list) {
        const px = x(d.pos);
        let k = lastX.findIndex((lx) => px - lx >= 11);
        if (k < 0) k = lastX.indexOf(Math.min(...lastX));
        lastX[k] = px; d.dy = levels[k];
      }
    }
  }

  function moveCursor() {
    if (!x) return;
    const y = store.state.year;
    gCursor.attr('transform', `translate(${x(y + 0.5)},0)`).style('display', y + 0.5 < x.domain()[0] || y + 0.5 > x.domain()[1] ? 'none' : null);
    gCursor.select('text').text(y);
  }

  function drawFocus() {
    if (!x) return;
    const sel = store.state.selection;
    const selId = sel?.kind === 'event' ? sel.id : null;
    const focus = [...new Set([selId, hoverId])].map((id) => vis.find((d) => d.e.id === id)).filter(Boolean);
    dots.classed('is-on', (d) => d.e.id === selId || d.e.id === hoverId).attr('r', (d) => (d.e.id === selId || d.e.id === hoverId ? 6.5 : 5));
    gLinks.selectAll('line').data(focus.flatMap((d) => d.extra.map((c) => ({ d, lane: laneOf.get(c) })))).join('line')
      .attr('x1', (s) => x(s.d.pos)).attr('x2', (s) => x(s.d.pos)).attr('y1', (s) => laneY(s.d.lane) + s.d.dy).attr('y2', (s) => laneY(s.lane));
    gFocus.selectAll('circle').data(focus.filter((d) => d.e.id === selId)).join('circle').attr('class', 'tl-ring').attr('r', 9.5)
      .attr('cx', (d) => x(d.pos)).attr('cy', (d) => laneY(d.lane) + d.dy);
    const right = (d) => x(d.pos) > W - 180;
    gFocus.selectAll('text').data(focus, (d) => d.e.id).join('text').attr('class', 'tl-lbl')
      .attr('x', (d) => x(d.pos) + (right(d) ? -12 : 12)).attr('y', (d) => laneY(d.lane) + d.dy + 4)
      .attr('text-anchor', (d) => (right(d) ? 'end' : 'start')).text((d) => L(d.e));
    confG.classed('is-on', (d) => (sel?.kind === 'conflict' && sel.id === d.c.id) || d.c.id === hoverConf);
    markRows();
  }

  function setHoverEvent(id) {
    if (id === hoverId) return;
    hoverId = id;
    drawFocus();
    store.highlight(id ? { iso3: DB.get('event', id)?.countries || [] } : null);
  }
  function setHoverConf(c) {
    const id = c?.id || null;
    if (id === hoverConf) return;
    hoverConf = id;
    confG.classed('is-on', (d) => (store.state.selection?.kind === 'conflict' && store.state.selection.id === d.c.id) || d.c.id === hoverConf);
    store.highlight(c ? { iso3: c.countries || [] } : null);
  }

  const evTip = (e) => `<b>${esc(L(e))}</b><span class="tip-sub">${esc(fmtDate(e.date))} · ${esc(e.cat.map((c) => L(catById.get(c))).join('، '))}</span><span class="tip-sub">${esc(Lk(e, 'sum'))}</span>${uvLine(DB, 'event', e.id)}`;
  const confTip = (c) => `<b>${esc(L(c.name))}</b><span class="tip-sub">${esc(L(SEV[c.severity]))} · ${esc(t('tl.since', { d: fmtDate(c.started) }))}</span>${uvLine(DB, 'conflict', c.id)}`;

  // ---- events in view (keyboard and screen-reader route to every dot)
  function renderList() {
    raf = 0;
    if (!x) return;
    const [d0, d1] = x.domain();
    const rows = vis.filter((d) => d.pos >= d0 && d.pos < d1).sort((a, b) => a.pos - b.pos);
    countEl.textContent = rows.length;
    const key = rows.map((d) => d.e.id).join('|') || (vis.length ? 'none' : 'nocats');
    if (key === listKey) return;
    listKey = key;
    rowsEl.innerHTML = rows.length ? rows.map((d) => `<li><button class="tl-row" type="button" data-id="${esc(d.e.id)}">
        <span class="tl-row-d">${esc(fmtDate(d.e.date))}</span>
        <span class="tl-row-n">${esc(L(d.e))}</span>
        <span class="tl-row-c">${d.e.cat.map((c) => `<i class="sw" style="background:${catColor(catById.get(c))}" data-tip="${esc(esc(L(catById.get(c))))}"></i>`).join('')}<span class="vh">${esc(d.e.cat.map((c) => L(catById.get(c))).join('، '))}</span></span>
      </button>${uvMark(DB, 'event', d.e.id)}</li>`).join('')
      : `<li class="empty">${esc(t(vis.length ? 'tl.noneInView' : 'tl.noCats'))}</li>`;
    markRows();
  }
  function markRows() {
    const sel = store.state.selection;
    for (const b of rowsEl.querySelectorAll('.tl-row')) {
      b.classList.toggle('is-hover', b.dataset.id === hoverId);
      if (sel?.kind === 'event' && sel.id === b.dataset.id) b.setAttribute('aria-current', 'true'); else b.removeAttribute('aria-current');
    }
  }
  rowsEl.addEventListener('click', (e) => { const b = e.target.closest('.tl-row'); if (b) store.select('event', b.dataset.id); });
  const rowHover = (e) => { const b = e.target.closest?.('.tl-row'); setHoverEvent(b ? b.dataset.id : null); };
  rowsEl.addEventListener('pointerover', rowHover);
  rowsEl.addEventListener('focusin', rowHover);
  rowsEl.addEventListener('pointerleave', () => setHoverEvent(null));
  rowsEl.addEventListener('focusout', (e) => { if (!rowsEl.contains(e.relatedTarget)) setHoverEvent(null); });

  // ---- zoom buttons
  el.querySelector('.tl-zoom').addEventListener('click', (e) => {
    const b = e.target.closest('button');
    if (!b || !zoom) return;
    const tr = ms() ? svg.transition().duration(ms()) : svg;
    const k = (keptT || d3.zoomIdentity).k;
    switch (b.dataset.z) {
      case 'in': tr.call(zoom.scaleBy, 1.8); break;
      case 'out': tr.call(zoom.scaleBy, 1 / 1.8); break;
      case 'earlier': tr.call(zoom.translateBy, (W * 0.35) / k, 0); break;
      case 'later': tr.call(zoom.translateBy, (-W * 0.35) / k, 0); break;
      default: tr.call(zoom.transform, d3.zoomIdentity);
    }
  });

  /** Bring a newly selected event into view without changing the zoom level. */
  function reveal() {
    const sel = store.state.selection;
    if (sel?.kind !== 'event' || !x || !zoom) return;
    const d = vis.find((v) => v.e.id === sel.id);
    if (!d) return;
    const [d0, d1] = x.domain();
    if (d.pos < d0 || d.pos > d1) (ms() ? svg.transition().duration(ms()) : svg).call(zoom.translateTo, x0(d.pos), H / 2);
  }

  let lastW = 0;
  const ro = new ResizeObserver(() => { if (plot.clientWidth && plot.clientWidth !== lastW) { lastW = plot.clientWidth; build(); } });
  renderChips();
  build();
  lastW = W;
  ro.observe(plot);
  reveal();

  return {
    update(keys) {
      if (keys.includes('filters')) { renderChips(); listKey = ''; build(); }
      if (keys.includes('selection')) { drawFocus(); reveal(); }
      if (keys.includes('year')) moveCursor();
    },
    destroy() {
      ro.disconnect();
      cancelAnimationFrame(raf);
      svg.interrupt();
      hideTip();
      if (hoverId || hoverConf) store.highlight(null);
    },
  };
}
