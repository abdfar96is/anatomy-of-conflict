// Guided tours: short stories stitched from entities that exist in the data.
// A step sets the lens, selects one entity (the map flies to it) and shows that entity's own text, trimmed.

import { state, on, set, select } from './store.js';
import { SEVERITY, CHOKE_STATUS } from './config.js';
import { t, L, Lk, registerStrings, fmtNum, fmtDate, isRTL } from './i18n.js';
import { esc, icon, reducedMotion } from './ui.js';
import { sevVar } from './palette.js';

registerStrings({
  ar: {
    'tr.tour': 'جولة',
    'tr.region': 'جولة: {title}',
    'tr.stepOf': 'المحطة {i} من {n}',
    'tr.prev': 'السابق',
    'tr.next': 'التالي',
    'tr.finish': 'إنهاء الجولة',
    'tr.exit': 'اخرج من الجولة',
    'tr.play': 'تشغيل تلقائي',
    'tr.playTip': 'ينتقل إلى المحطة التالية كل 9 ثوانٍ، ويتوقف ما دام المؤشر فوق البطاقة',
    'tr.playOff': 'التشغيل التلقائي متوقف لأن جهازك مضبوط على تقليل الحركة',
    'tr.more': 'اقرأ المزيد',
    'tr.less': 'اعرض أقل',
    'tr.since': 'منذ',
    'tr.unverified': 'من الأطلس الأصلي، بتاريخ {date} — لم تتحقّق منه هذه النسخة',
    'tr.mbd': 'مليون برميل يومياً',
    'kind.country': 'دولة',
    'kind.conflict': 'نزاع',
    'kind.group': 'مجموعة عرقية',
    'kind.religion': 'ديانة',
    'kind.choke': 'ممرّ',
    'kind.disputed': 'إقليم متنازع عليه',
    'kind.event': 'حدث',
    'kind.bloc': 'تكتّل',
    'kind.site': 'موقع مورد',
  },
  en: {
    'tr.tour': 'Tour',
    'tr.region': 'Tour: {title}',
    'tr.stepOf': 'Stop {i} of {n}',
    'tr.prev': 'Previous',
    'tr.next': 'Next',
    'tr.finish': 'Finish',
    'tr.exit': 'Exit the tour',
    'tr.play': 'Autoplay',
    'tr.playTip': 'Moves to the next stop every 9 seconds; pauses while the pointer is over the card',
    'tr.playOff': 'Autoplay is off because your device asks for reduced motion',
    'tr.more': 'Read more',
    'tr.less': 'Show less',
    'tr.since': 'since',
    'tr.unverified': 'From the original atlas, as of {date}; not independently verified by this edition',
    'tr.mbd': 'million barrels a day',
    'kind.country': 'Country',
    'kind.conflict': 'Conflict',
    'kind.group': 'Ethnic group',
    'kind.religion': 'Religion',
    'kind.choke': 'Chokepoint',
    'kind.disputed': 'Disputed territory',
    'kind.event': 'Event',
    'kind.bloc': 'Bloc',
    'kind.site': 'Resource site',
  },
});

// Each tour lists ids of one kind; ids missing from the data are skipped at runtime.
export const TOURS = [
  {
    id: 'energy', kind: 'choke', lens: 'chokepoints', icon: 'anchor',
    ar: 'شرايين الطاقة', en: 'Energy arteries',
    desc: { ar: 'سبعة ممرّات بحرية يعبرها معظم نفط العالم وتجارته، ومدى هشاشتها اليوم.', en: 'Seven sea lanes that carry most of the world’s oil and trade, and how exposed they are today.' },
    ids: ['hormuz', 'bab-al-mandab', 'suez', 'malacca', 'bosphorus', 'panama', 'cape-of-good-hope'],
  },
  {
    id: 'mideast', kind: 'conflict', lens: 'conflicts', icon: 'flame',
    ar: 'صدوع الشرق الأوسط', en: 'Middle East fault lines',
    desc: { ar: 'سبعة ملفّات مترابطة من غزة إلى الخليج: من يواجه من، وأين يقف كل ملف الآن.', en: 'Seven linked files from Gaza to the Gulf: who faces whom, and where each one stands now.' },
    ids: ['israel-palestine', 'lebanon-israel', 'syria-transition', 'iraq-kurdistan', 'iran-us-israel', 'yemen', 'gulf-security'],
  },
  {
    id: 'europe', kind: 'conflict', lens: 'conflicts', icon: 'flame',
    ar: 'حروب أوروبا الساخنة والمجمّدة', en: 'Europe’s hot and frozen wars',
    desc: { ar: 'من أوكرانيا إلى البلقان: حرب مفتوحة ونزاعات لم تُحسم منذ تفكّك الاتحاد السوفييتي ويوغوسلافيا.', en: 'From Ukraine to the Balkans: an open war and disputes left unsettled by the breakup of the USSR and Yugoslavia.' },
    ids: ['russia-ukraine', 'georgia-breakaway', 'transnistria', 'armenia-azerbaijan', 'kosovo-serbia', 'bosnia'],
  },
  {
    id: 'asia', kind: 'conflict', lens: 'conflicts', icon: 'flame',
    ar: 'نقاط الاشتعال في آسيا', en: 'Asia’s flashpoints',
    desc: { ar: 'مضائق وحدود وأقاليم تتقاطع فيها مصالح القوى الكبرى، من تايوان إلى كشمير.', en: 'Straits, borders and regions where great-power interests meet, from Taiwan to Kashmir.' },
    ids: ['taiwan-strait', 'south-china-sea', 'korean-peninsula', 'kashmir', 'myanmar', 'xinjiang'],
  },
  {
    id: 'africa', kind: 'conflict', lens: 'conflicts', icon: 'flame',
    ar: 'أفريقيا: الحروب المنسيّة', en: 'Africa: the forgotten wars',
    desc: { ar: 'ستّ حروب بعيدة عن العناوين رغم حجم ضحاياها ونازحيها.', en: 'Six wars far from the headlines despite their toll in lives and displacement.' },
    ids: ['sudan', 'sahel', 'drc-east', 'ethiopia', 'somalia', 'south-sudan'],
  },
  {
    id: 'century', kind: 'event', lens: 'history', icon: 'clock', years: true,
    ar: 'قرن في عشر محطات', en: 'A century in ten stops',
    desc: { ar: 'من الحرب العالمية الأولى إلى اليوم: عشرة أحداث رسمت خريطة نزاعات الحاضر.', en: 'From the First World War to today: ten events that drew the map of present-day conflicts.' },
    ids: ['wwi', 'sykes-picot', 'wwii', 'india-partition', 'israel-1948', 'africa-year', 'iran-revolution', 'soviet-collapse', 'arab-spring', 'ukraine-invasion'],
  },
];

const warned = new Set();

/** Tours with their steps resolved against DB; ids that do not exist are dropped (and reported once). */
export function availableTours(DB) {
  return TOURS.map((tr) => {
    const steps = [];
    for (const id of tr.ids) {
      if (!DB.exists(tr.kind, id)) {
        if (!warned.has(tr.id + id)) { warned.add(tr.id + id); console.warn(`[atlas] tour "${tr.id}": no ${tr.kind} "${id}" in the data, step skipped`); }
        continue;
      }
      steps.push({ kind: tr.kind, id, lens: tr.lens, year: tr.years ? DB.get(tr.kind, id).year ?? null : null });
    }
    return { ...tr, steps };
  }).filter((tr) => tr.steps.length >= 2);
}

/** "7 محطات" / "7 stops" with Arabic number agreement. */
export function stepsLabel(n) {
  if (state.lang !== 'ar') return n === 1 ? '1 stop' : `${n} stops`;
  if (n === 1) return 'محطة واحدة';
  if (n === 2) return 'محطتان';
  return n >= 3 && n <= 10 ? `${n} محطات` : `${n} محطة`;
}

/** Trim to about `max` characters: a whole sentence when one ends late enough, else a word boundary + ellipsis. */
export function trimCaption(text, max = 280) {
  const s = String(text || '').replace(/\s+/g, ' ').trim();
  if (s.length <= max) return s;
  const head = s.slice(0, max + 1);
  let end = -1;
  for (const m of head.matchAll(/[.!?؟؛](?=\s|$)/g)) if (m.index + 1 <= max && m.index + 1 >= max * 0.55) end = m.index + 1;
  if (end > 0) return s.slice(0, end);
  const cut = head.lastIndexOf(' ', max);
  return s.slice(0, cut > max * 0.5 ? cut : max).replace(/[\s,،;؛:–—-]+$/, '') + '…';
}

/** Severity marker: the map's shape encoding, in the severity color. */
export function sevMark(sevId) {
  const shape = SEVERITY.find((s) => s.id === sevId)?.shape;
  const g = {
    pulse: '<circle cx="6" cy="6" r="2.4" fill="currentColor"/><circle cx="6" cy="6" r="5" fill="none" stroke="currentColor" stroke-width="1.2"/>',
    disc: '<circle cx="6" cy="6" r="4.2" fill="currentColor"/>',
    square: '<rect x="2" y="2" width="8" height="8" rx="1" fill="currentColor"/>',
    ring: '<circle cx="6" cy="6" r="3.8" fill="none" stroke="currentColor" stroke-width="2"/>',
    diamond: '<path d="M6 1.2 10.8 6 6 10.8 1.2 6z" fill="currentColor"/>',
    dashed: '<circle cx="6" cy="6" r="4" fill="none" stroke="currentColor" stroke-width="1.6" stroke-dasharray="2 1.6"/>',
    dot: '<circle cx="6" cy="6" r="2.4" fill="currentColor"/>',
    hollow: '<circle cx="6" cy="6" r="4" fill="none" stroke="currentColor" stroke-width="1.2"/>',
  }[shape];
  return g ? `<svg class="sev-mk" width="12" height="12" viewBox="0 0 12 12" aria-hidden="true" style="color:${sevVar(sevId)}">${g}</svg>` : '';
}

const AUTO_MS = 9000;
const DOT = '<span class="tour-dot" aria-hidden="true">·</span>';

export function initTours(DB) {
  const root = document.getElementById('tour');
  if (!root) return;
  const tours = availableTours(DB);
  const byId = new Map(tours.map((tr) => [tr.id, tr]));

  root.innerHTML = '<div class="tour-card"></div><p class="vh tour-live" aria-live="polite"></p>';
  const card = root.firstElementChild;
  const live = root.lastElementChild;

  let saved = null;          // year + yearFilter before a tour that moves the timeline
  let touchedYear = false;
  let active = false;
  let wantFocus = false;
  let expanded = false;
  let lastKey = '';
  // autoplay clock
  let playing = false, hovered = false, focused = false, timer = 0, tStart = 0, remaining = AUTO_MS;
  const held = () => hovered || focused;
  const left = () => (timer ? remaining - (performance.now() - tStart) : remaining);
  const stopClock = () => { clearTimeout(timer); timer = 0; };

  function arm() {
    remaining = left();
    stopClock();
    card.classList.toggle('is-held', held());
    if (playing && !held() && state.tour && !reducedMotion()) {
      tStart = performance.now();
      timer = setTimeout(tick, Math.max(0, remaining));
    }
  }

  function tick() {
    timer = 0;
    const tr = current();
    if (!tr) return;
    const i = stepIndex(tr);
    if (i < tr.steps.length - 1) go(tr, i + 1);
    else { playing = false; render(); }
  }

  const current = () => (state.tour ? byId.get(state.tour.id) : null);
  const stepIndex = (tr) => Math.max(0, Math.min(tr.steps.length - 1, state.tour.step | 0));

  function go(tr, i) {
    const s = tr.steps[i];
    const patch = { lens: s.lens, tour: { id: tr.id, step: i } };
    if (s.year != null) { patch.year = s.year; patch.yearFilter = true; touchedYear = true; }
    set(patch);
    select(s.kind, s.id);
  }

  function start(id, focus) {
    const tr = byId.get(id);
    if (!tr) return;
    if (!state.tour) saved = { year: state.year, yearFilter: state.yearFilter };
    playing = false; expanded = false; lastKey = ''; wantFocus = !!focus;
    if (state.view) set({ view: null });
    go(tr, 0);
  }

  function end() { set({ tour: null }); }

  function cleanup() {
    playing = false; hovered = false; focused = false; expanded = false; lastKey = '';
    stopClock();
    if (touchedYear && saved) set({ year: saved.year, yearFilter: saved.yearFilter });
    touchedYear = false; saved = null;
  }

  function metaOf(s, x) {
    const parts = [`<span class="tour-kind">${esc(t('kind.' + s.kind))}</span>`];
    if (s.kind === 'conflict') {
      const sev = SEVERITY.find((v) => v.id === x.severity);
      if (x.regionName) parts.push(`<span>${esc(L(x.regionName))}</span>`);
      if (sev) parts.push(`<span class="tour-sev">${sevMark(sev.id)}${esc(L(sev))}</span>`);
      if (x.startYear) parts.push(`<span>${esc(t('tr.since'))} <span class="num">${esc(x.startYear)}</span></span>`);
    } else if (s.kind === 'choke') {
      const st = CHOKE_STATUS[x.status];
      if (st) parts.push(`<span class="pill ${st.tone}">${icon(st.tone === 'good' ? 'check' : 'alert', 12)}${esc(L(st))}</span>`);
      if (x.oilFlowMbd != null) parts.push(`<span><span class="num">${esc(fmtNum(x.oilFlowMbd, 1))}</span> ${esc(t('tr.mbd'))}${x.flowYear ? ` <span class="num">(${esc(x.flowYear)})</span>` : ''}</span>`);
    } else if (s.kind === 'event') {
      parts.push(`<span class="num">${esc(fmtDate(x.date))}</span>`);
      const cats = (x.cat || []).map((c) => DB.timeline.catById.get(c)).filter(Boolean).map((c) => L(c));
      if (cats.length) parts.push(`<span>${esc(cats.join(state.lang === 'ar' ? '، ' : ', '))}</span>`);
    }
    return parts.join(DOT);
  }

  function captionOf(s, x) {
    if (s.kind === 'conflict') return trimCaption(L(x.status) || L(x.dimensionNote));
    if (s.kind === 'choke') return trimCaption([Lk(x, 'shareNote'), Lk(x, 'risk')].filter(Boolean).join(' '));
    if (s.kind === 'event') return trimCaption(Lk(x, 'sum'));
    return '';
  }

  function setTourH() {
    document.documentElement.style.setProperty('--tour-h', root.hidden ? '0px' : `${Math.ceil(root.offsetHeight) + 10}px`);
  }

  function render() {
    const tr = current();
    if (!tr) {
      const hadFocus = root.contains(document.activeElement);
      root.hidden = true; card.innerHTML = ''; stopClock(); setTourH();
      if (hadFocus) {
        const back = [...document.querySelectorAll('#topbar [data-k="tours"], #topbar [data-k="menu"]')].find((b) => b.getClientRects().length);
        back?.focus();
      }
      return;
    }
    const n = tr.steps.length, i = stepIndex(tr), s = tr.steps[i], x = DB.get(s.kind, s.id);
    const name = DB.nameOf(s.kind, s.id, state.lang);
    const key = `${tr.id}:${i}`;
    if (key !== lastKey) { remaining = AUTO_MS; expanded = false; } else remaining = left();
    stopClock();
    const rm = reducedMotion();
    const last = i === n - 1;
    const focusK = root.contains(document.activeElement) ? document.activeElement.closest('[data-k]')?.dataset.k : null;

    root.hidden = false;
    root.setAttribute('role', 'region');
    root.setAttribute('aria-label', t('tr.region', { title: L(tr) }));
    card.classList.toggle('is-playing', playing && !rm);
    card.innerHTML = `
      <div class="tour-head">
        <span class="tour-ic">${icon(tr.icon, 15)}</span>
        <span class="tour-title"><span class="eyebrow">${esc(t('tr.tour'))}</span><b>${esc(L(tr))}</b></span>
        <span class="tour-count">${esc(t('tr.stepOf', { i: '\u0001', n: '\u0002' })).replace('\u0001', `<b class="num">${i + 1}</b>`).replace('\u0002', `<b class="num">${n}</b>`)}</span>
        <button type="button" class="btn ghost icon tour-x" data-k="tour-exit" aria-label="${esc(t('tr.exit'))}" data-tip="${esc(esc(t('tr.exit')))}">${icon('close', 16)}</button>
      </div>
      <div class="tour-segs" aria-hidden="true">${tr.steps.map((_, j) => `<span class="seg${j < i ? ' done' : j === i ? ' cur' : ''}">${j === i ? `<i style="animation-delay:-${Math.round(AUTO_MS - remaining)}ms"></i>` : ''}</span>`).join('')}</div>
      <h2 class="tour-name">${esc(name)}</h2>
      <p class="tour-meta">${metaOf(s, x)}</p>
      <p class="tour-cap${expanded ? ' open' : ''}" id="tour-cap">${esc(captionOf(s, x))}</p>
      <button type="button" class="tour-more" data-k="tour-more" aria-expanded="${expanded}" aria-controls="tour-cap">${esc(t(expanded ? 'tr.less' : 'tr.more'))}</button>
      ${DB.isUnverified?.(s.kind, s.id) ? `<p class="tour-unv">${icon('info', 13)}<span>${esc(t('tr.unverified', { date: '\u0001' })).replace('\u0001', `<span class="num">${esc(fmtDate(DB.conflictsAsOf))}</span>`)}</span></p>` : ''}
      <div class="tour-ctrl">
        <button type="button" class="btn ghost tour-play" data-k="tour-play" aria-label="${esc(t('tr.play'))}" aria-pressed="${playing && !rm}"${rm ? ' aria-disabled="true"' : ''} data-tip="${esc(esc(t(rm ? 'tr.playOff' : 'tr.playTip')))}">${icon(playing && !rm ? 'pause' : 'play', 15)}<span>${esc(t('tr.play'))}</span></button>
        <span class="tour-sp"></span>
        <button type="button" class="btn tour-prev" data-k="tour-prev" aria-label="${esc(t('tr.prev'))}"${i === 0 ? ' disabled' : ''}>${icon('chevron', 16)}<span>${esc(t('tr.prev'))}</span></button>
        <button type="button" class="btn primary tour-next" data-k="tour-next"><span>${esc(t(last ? 'tr.finish' : 'tr.next'))}</span>${last ? '' : icon('chevron', 16)}</button>
      </div>`;

    if (key !== lastKey) live.textContent = `${t('tr.stepOf', { i: i + 1, n })}: ${name}`;
    lastKey = key;
    if (wantFocus) { wantFocus = false; card.querySelector('[data-k="tour-next"]')?.focus(); }
    else if (focusK) (card.querySelector(`[data-k="${focusK}"]:not([disabled])`) || card.querySelector('[data-k="tour-next"]'))?.focus();
    arm();
    setTourH();
  }

  card.addEventListener('click', (e) => {
    const b = e.target.closest('button[data-k]');
    const tr = current();
    if (!b || !tr) return;
    const i = stepIndex(tr);
    switch (b.dataset.k) {
      case 'tour-exit': end(); break;
      case 'tour-prev': if (i > 0) go(tr, i - 1); break;
      case 'tour-next': if (i < tr.steps.length - 1) go(tr, i + 1); else end(); break;
      case 'tour-play':
        if (b.getAttribute('aria-disabled') === 'true') break;
        playing = !playing; hovered = false; render(); break;
      case 'tour-more': expanded = !expanded; render(); break;
    }
  });

  // Autoplay pauses while the pointer is over the card or focus is inside it (except on the play toggle itself).
  root.addEventListener('pointerenter', (e) => { if (e.pointerType === 'mouse') { hovered = true; arm(); } });
  root.addEventListener('pointerleave', () => { if (hovered) { hovered = false; arm(); } });
  root.addEventListener('focusin', (e) => { focused = !e.target.closest('[data-k="tour-play"]'); arm(); });
  root.addEventListener('focusout', (e) => { if (!root.contains(e.relatedTarget)) { focused = false; arm(); } });

  // ←/→ step through the tour when nothing else owns the arrows (page focus or focus on the card).
  document.addEventListener('keydown', (e) => {
    if (!state.tour || e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return;
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
    const a = document.activeElement;
    if (!(a == null || a === document.body || a === document.documentElement || root.contains(a))) return;
    if (document.querySelector('#palette:not([hidden]), #help:not([hidden])')) return;
    const tr = current();
    if (!tr) return;
    e.preventDefault();
    const i = stepIndex(tr);
    const forward = (e.key === 'ArrowRight') !== isRTL();
    if (forward && i < tr.steps.length - 1) go(tr, i + 1);
    else if (!forward && i > 0) go(tr, i - 1);
  });

  // 'starttour' comes from the hash (a plain id) or from the shell ({id, focus}).
  on('starttour', (p) => start(typeof p === 'string' ? p : p?.id, typeof p === 'object' && !!p?.focus));

  on('change', ({ keys }) => {
    if (keys.includes('tour')) {
      if (!state.tour && active) cleanup();
      active = !!state.tour;
      render();
    } else if (keys.includes('lang') && state.tour) render();
  });

  if ('ResizeObserver' in window) new ResizeObserver(setTourH).observe(root);
  render();
}
