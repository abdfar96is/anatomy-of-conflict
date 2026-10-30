// Map chrome: the lens card (#legend: title, mode/filter chips, key, caveat) and the map controls (#mapctl).
// Both live inside #stage, sit under any open view panel and talk to the rest of the app only through the store.

import * as store from './store.js';
import { state } from './store.js';
import { LENSES, SEVERITY, CHOKE_STATUS, RESOURCE_CLASSES } from './config.js';
import { t, L, Lk, registerStrings, fmtNum, fmtCompact, fmtDate, dir } from './i18n.js';
import { esc, icon } from './ui.js';
import { pal, sevVar, edgeVar, resClassVar, catVar, traditionColor } from './palette.js';
import {
  CONTINENTS, INCOME, POP_RANGE, GDP_RANGE, ETHNIC_CLASSES, RES_SHAPE,
  ethnicClass, visibleConflicts, windowEvents, decadeWindow, activeBloc, landTint, seqFill, BLOC_T, CHOKE_T,
} from './map-scene.js';

registerStrings({
  ar: {
    'map.ctl': 'أدوات الخريطة',
    'map.zoomIn': 'تكبير',
    'map.zoomOut': 'تصغير',
    'map.reset': 'إعادة ضبط العرض',
    'map.toFlat': 'التبديل إلى خريطة مسطّحة',
    'map.toGlobe': 'التبديل إلى الكرة الأرضية',
    'map.layers': 'الطبقات',
    'map.lyr.labels': 'أسماء الدول',
    'map.lyr.graticule': 'خطوط الطول والعرض',
    'map.lyr.boundaries': 'الحدود الدولية',
    'map.lyr.disputed': 'الأقاليم المتنازع عليها',
    'map.lc.key': 'مفتاح الخريطة',
    'map.lc.colorBy': 'تلوين الدول حسب',
    'map.ov.continent': 'القارة',
    'map.ov.income': 'فئة الدخل',
    'map.ov.population': 'السكان',
    'map.ov.gdp': 'نصيب الفرد من الناتج',
    'map.ov.noData': 'لا بيانات',
    'map.ov.profile': 'نقطة نحاسية: يتوفّر ملف تعريفي للدولة',
    'map.ov.note': 'الحدود والسكان والناتج من Natural Earth، وسنة التقدير تختلف من دولة إلى أخرى.',
    'map.cf.sev': 'درجة الحدّة',
    'map.cf.ramp': 'عدد النزاعات التي تكون الدولة طرفاً فيها',
    'map.cf.asOf': 'الوضع محدّث حتى {d}.',
    'map.cf.yearOn': 'تظهر النزاعات التي بدأت حتى {y} فقط.',
    'map.cf.powers': 'إطار متقطّع حول دولة: قوة خارجية. الخطوط متصلة للالتزام الموثّق ومتقطّعة للتقدير.',
    'map.rl.majority': 'الأغلبية',
    'map.rl.share': 'حصة ديانة',
    'map.rl.diversity': 'التنوّع',
    'map.rl.trad': 'الديانة',
    'map.rl.noData': 'لا تقدير في هذه النسخة — غياب البيانات لا غياب التنوّع',
    'map.rl.contested': 'تقديرات متنازع عليها',
    'map.rl.uniform': 'متجانس',
    'map.rl.diverse': 'متنوّع',
    'map.et.family': 'العائلة اللغوية',
    'map.all': 'الكل',
    'map.dp.area': 'إقليم متنازع عليه أو مُطالَب به',
    'map.dp.point': 'المساحات الصغيرة معلّمة بنقطة',
    'map.dp.note': '{n} منطقة من طبقة Natural Earth للأقاليم المتنازع عليها. الطبقة تسجّل المطالبات ولا تحكم فيها.',
    'map.pw.bloc': 'التكتل',
    'map.pw.types': 'نوع العلاقة',
    'map.pw.kinds': 'درجة التوثيق',
    'map.pw.treaty': 'موثّقة',
    'map.pw.assessed': 'تقدير',
    'map.pw.contested': 'خط منقّط: تقدير مختلف عليه',
    'map.pw.width': 'سُمك الخط يدلّ على قوة العلاقة',
    'map.pw.hint': 'اختر دولة لتظهر علاقاتها وحدها.',
    'map.pw.network': 'افتح شبكة العلاقات',
    'map.pw.member': 'دولة عضو',
    'map.rs.class': 'فئة المورد',
    'map.rs.ramp': 'أفضل مرتبة عالمية تحتلّها الدولة',
    'map.rs.first': 'الأولى',
    'map.rs.low': 'العاشرة أو بلا ترتيب',
    'map.ck.status': 'الحالة',
    'map.ck.size': 'حجم الدائرة: تدفّق النفط بملايين البراميل يومياً',
    'map.ck.na': 'دائرة صغيرة: لا رقم منشور',
    'map.ck.border': 'دولة مطلّة على مضيق',
    'map.hs.window': 'العقد المعروض: {a}–{b}',
    'map.hs.count': 'الأحداث فيه: {n}',
    'map.hs.ramp': 'عدد الأحداث في الدولة',
    'map.hs.hint': 'حرّك مؤشّر الخط الزمني لتغيير العقد.',
    'map.hs.event': 'حدث، في متوسّط مواقع الدول المعنية',
  },
  en: {
    'map.ctl': 'Map controls',
    'map.zoomIn': 'Zoom in',
    'map.zoomOut': 'Zoom out',
    'map.reset': 'Reset view',
    'map.toFlat': 'Switch to flat map',
    'map.toGlobe': 'Switch to globe',
    'map.layers': 'Layers',
    'map.lyr.labels': 'Country names',
    'map.lyr.graticule': 'Graticule',
    'map.lyr.boundaries': 'Borders',
    'map.lyr.disputed': 'Disputed areas',
    'map.lc.key': 'Map key',
    'map.lc.colorBy': 'Colour states by',
    'map.ov.continent': 'Continent',
    'map.ov.income': 'Income group',
    'map.ov.population': 'Population',
    'map.ov.gdp': 'GDP per person',
    'map.ov.noData': 'No data',
    'map.ov.profile': 'Brass dot: a country profile is available',
    'map.ov.note': 'Borders, population and GDP from Natural Earth; the estimate year varies by country.',
    'map.cf.sev': 'Severity',
    'map.cf.ramp': 'Conflicts a state is party to',
    'map.cf.asOf': 'Status as of {d}.',
    'map.cf.yearOn': 'Showing only conflicts that began by {y}.',
    'map.cf.powers': 'Dashed outline: an external power. Arcs are solid for documented commitments, dashed for assessments.',
    'map.rl.majority': 'Majority',
    'map.rl.share': 'Share of one tradition',
    'map.rl.diversity': 'Diversity',
    'map.rl.trad': 'Tradition',
    'map.rl.noData': 'No estimate in this edition — absence of data, not of diversity',
    'map.rl.contested': 'Contested estimate',
    'map.rl.uniform': 'Uniform',
    'map.rl.diverse': 'Diverse',
    'map.et.family': 'Language family',
    'map.all': 'All',
    'map.dp.area': 'Disputed or claimed territory',
    'map.dp.point': 'Small areas are marked with a point',
    'map.dp.note': '{n} areas from Natural Earth’s disputed-areas layer. It records claims; it does not judge them.',
    'map.pw.bloc': 'Bloc',
    'map.pw.types': 'Relation type',
    'map.pw.kinds': 'Evidence',
    'map.pw.treaty': 'Documented',
    'map.pw.assessed': 'Assessed',
    'map.pw.contested': 'Dotted line: contested assessment',
    'map.pw.width': 'Line weight shows strength',
    'map.pw.hint': 'Select a state to show only its relations.',
    'map.pw.network': 'Open relations network',
    'map.pw.member': 'Member state',
    'map.rs.class': 'Resource class',
    'map.rs.ramp': 'Best world rank a state holds',
    'map.rs.first': '1st',
    'map.rs.low': '10th or unranked',
    'map.ck.status': 'Status',
    'map.ck.size': 'Circle size: oil flow, million barrels a day',
    'map.ck.na': 'Small circle: no published figure',
    'map.ck.border': 'State bordering a chokepoint',
    'map.hs.window': 'Decade shown: {a}–{b}',
    'map.hs.count': 'Events in it: {n}',
    'map.hs.ramp': 'Events per state',
    'map.hs.hint': 'Move the timeline cursor to change the decade.',
    'map.hs.event': 'Event, placed at the middle of the states involved',
  },
});

// ---- small HTML builders
const STATUS_ICON = { good: 'check', warn: 'alert', critical: 'alert' };

/** Marker glyph mirroring the canvas shapes (secondary encoding next to color). */
export function glyph(shape, color, size = 14) {
  const f = `fill:${color};stroke:none`, s = `fill:none;stroke:${color}`;
  const body = {
    pulse: `<circle r="3.4" style="${f}"/><circle r="6" style="${s};stroke-width:1.2"/>`,
    disc: `<circle r="4.6" style="${f}"/>`,
    square: `<rect x="-4.2" y="-4.2" width="8.4" height="8.4" style="${f}"/>`,
    ring: `<circle r="4.3" style="${s};stroke-width:2.2"/>`,
    diamond: `<path d="M0-5.6L5.6 0 0 5.6-5.6 0z" style="${f}"/>`,
    dashed: `<circle r="4.6" style="${s};stroke-width:1.6;stroke-dasharray:2.2 1.8"/>`,
    dot: `<circle r="2.6" style="${f}"/>`,
    hollow: `<circle r="4.3" style="${s};stroke-width:1.3"/>`,
    triangle: `<path d="M0-5.4L5.2 4.2H-5.2z" style="${f}"/>`,
    hex: `<path d="M0-5.4L4.7-2.7V2.7L0 5.4-4.7 2.7V-2.7z" style="${f}"/>`,
    pin: `<circle r="3.8" style="${f}"/>`,
    choke: `<circle r="5" style="fill:color-mix(in srgb, ${color} 22%, transparent);stroke:${color};stroke-width:2"/>`,
  }[shape] || `<circle r="4.6" style="${f}"/>`;
  return `<svg class="glyph" width="${size}" height="${size}" viewBox="-7 -7 14 14" aria-hidden="true">${body}</svg>`;
}

const lineGlyph = (color, { dash = '', width = 2, round = false } = {}) =>
  `<svg class="glyph line" width="26" height="10" viewBox="0 0 26 10" aria-hidden="true"><line x1="2" y1="5" x2="24" y2="5" style="stroke:${color};stroke-width:${width};${dash ? `stroke-dasharray:${dash};` : ''}${round ? 'stroke-linecap:round;' : ''}"/></svg>`;

const sw = (bg, cls = '') => `<span class="sw ${cls}" style="background:${bg}" aria-hidden="true"></span>`;
const chip = ({ act, key = '', val = '', pressed, label, n, lead = '' }) =>
  `<button class="chip" type="button" aria-pressed="${pressed ? 'true' : 'false'}" data-act="${act}" data-key="${esc(key)}" data-val="${esc(val)}">${lead}<span>${esc(label)}</span>${n != null ? `<span class="n">${esc(fmtNum(n))}</span>` : ''}</button>`;
const sec = (label, body, extra = '') => `<div class="lc-sec"${extra}>${label ? `<p class="lc-label">${esc(label)}</p>` : ''}${body}</div>`;
const chips = (label, items) => `<div class="chips" role="group" aria-label="${esc(label)}">${items.join('')}</div>`;
const keyRow = (lead, label, n) => `<li>${lead}<span class="k-l">${esc(label)}</span>${n != null ? `<span class="n">${esc(fmtNum(n))}</span>` : ''}</li>`;
const keys = (rows) => `<ul class="lc-keys">${rows.join('')}</ul>`;
const note = (text) => (text ? `<p class="lc-note">${esc(text)}</p>` : '');
const caveat = (text) => (text ? `<p class="caveat lc-caveat">${icon('info', 15)}<span>${esc(text)}</span></p>` : '');

/** Sequential ramp, low → high along the reading direction. */
function ramp(lo, hi, label) {
  const P = pal();
  const stops = [0, 0.25, 0.5, 0.75, 1].map((v) => `${seqFill(P, v)} ${v * 100}%`).join(', ');
  const side = dir() === 'rtl' ? 'to left' : 'to right';
  return `<div class="lc-ramp"${label ? ` role="img" aria-label="${esc(`${label}: ${lo} – ${hi}`)}"` : ''}>
    <span class="ramp" style="background:linear-gradient(${side}, ${stops})"></span>
    <span class="ramp-ends"><span class="num">${esc(lo)}</span><span class="num">${esc(hi)}</span></span></div>`;
}

// ---- per-lens card bodies
const BODY = {
  overview(DB) {
    const m = state.filters.overviewMode;
    const modes = ['continent', 'income', 'population', 'gdp'].map((id) => chip({ act: 'set', key: 'overviewMode', val: id, pressed: m === id, label: t('map.ov.' + id) }));
    let key = '';
    const P = pal();
    const all = [...DB.countries.values()];
    if (m === 'continent') {
      key = keys(CONTINENTS.map((c) => keyRow(sw(d3.interpolateLab(P.land, P.cat[c.slot])(0.3), 'sw-land'), L(c), all.filter((x) => x.continent === c.id).length)));
    } else if (m === 'income') {
      key = keys(INCOME.map((s) => keyRow(sw(seqFill(P, s.t), 'sw-land'), L(s), all.filter((x) => parseInt(x.income, 10) === s.n).length)));
    } else {
      const [a, b] = m === 'population' ? POP_RANGE : GDP_RANGE;
      const fmt = m === 'population' ? fmtCompact : (v) => `$${fmtCompact(v)}`;
      key = ramp(fmt(a), fmt(b), t('map.ov.' + m)) + keys([keyRow(sw(P.landMuted, 'sw-land'), t('map.ov.noData'))]);
    }
    return sec(t('map.lc.colorBy'), chips(t('map.lc.colorBy'), modes))
      + sec('', key + keys([keyRow('<span class="dot-accent" aria-hidden="true"></span>', t('map.ov.profile'))]))
      + note(t('map.ov.note'));
  },

  conflicts(DB) {
    const S = state;
    const pool = DB.conflicts.filter((c) => !(S.yearFilter && c.startYear && c.startYear > S.year));
    const items = SEVERITY.map((s) => chip({
      act: 'toggle', key: 'severity', val: s.id, pressed: S.filters.severity.has(s.id), label: L(s),
      n: pool.filter((c) => c.severity === s.id).length, lead: glyph(s.shape, sevVar(s.id)),
    }));
    const counts = new Map();
    for (const c of visibleConflicts(DB, S)) for (const iso of c.countries || []) counts.set(iso, (counts.get(iso) || 0) + 1);
    const max = Math.max(1, ...counts.values());
    const selC = S.selection?.kind === 'conflict' && DB.conflictById.has(S.selection.id);
    return sec(t('map.cf.sev'), chips(t('map.cf.sev'), items), ' data-wrap="2"')
      + sec(t('map.cf.ramp'), ramp('1', fmtNum(max), t('map.cf.ramp')))
      + (selC ? note(t('map.cf.powers')) : '')
      + note([t('map.cf.asOf', { d: fmtDate(DB.conflictsAsOf) }), S.yearFilter ? t('map.cf.yearOn', { y: S.year }) : ''].join(' ').trim());
  },

  religion(DB) {
    const f = state.filters;
    const modes = ['majority', 'share', 'diversity'].map((id) => chip({ act: 'set', key: 'religionMode', val: id, pressed: f.religionMode === id, label: t('map.rl.' + id) }));
    let key = '';
    if (f.religionMode === 'majority') {
      const n = new Map();
      for (const c of DB.countries.values()) if (c.religion?.majority) n.set(c.religion.majority, (n.get(c.religion.majority) || 0) + 1);
      key = keys(DB.religion.traditions.filter((tr) => n.has(tr.id)).sort((a, b) => n.get(b.id) - n.get(a.id))
        .map((tr) => keyRow(sw(landTint(pal(), traditionColor(tr.id)), 'sw-land'), L(tr), n.get(tr.id))));
    } else if (f.religionMode === 'share') {
      const opts = DB.religion.traditions.map((tr) => `<option value="${esc(tr.id)}"${tr.id === f.religionTradition ? ' selected' : ''}>${esc(L(tr))}</option>`).join('');
      key = `<label class="lc-field"><span class="lc-label">${esc(t('map.rl.trad'))}</span><select class="lc-select" data-act="trad">${opts}</select></label>`
        + ramp('0%', '100%', L(DB.religion.traditionById.get(f.religionTradition)));
    } else {
      key = ramp(t('map.rl.uniform'), t('map.rl.diverse'), t('map.rl.diversity'));
    }
    return sec(t('map.lc.colorBy'), chips(t('map.lc.colorBy'), modes))
      + sec('', key + keys([
        keyRow(sw('', 'sw-hatch sw-nodata'), t('map.rl.noData')),
        keyRow('<span class="bang" aria-hidden="true">!</span>', t('map.rl.contested')),
      ]))
      + note(L(DB.religion.coverageNote));
  },

  ethnic(DB) {
    const f = state.filters.ethnicFamily;
    const n = new Map();
    for (const g of DB.ethnic.groups.values()) { const k = ethnicClass(g.family); n.set(k, (n.get(k) || 0) + 1); }
    const items = [chip({ act: 'set', key: 'ethnicFamily', val: '', pressed: !f, label: t('map.all'), n: DB.ethnic.groups.size })]
      .concat(ETHNIC_CLASSES.filter((c) => n.has(c.id)).map((c) => chip({
        act: 'set', key: 'ethnicFamily', val: c.id, pressed: f === c.id || c.members.includes(f), label: L(c), n: n.get(c.id), lead: sw(catVar(c.slot)),
      })));
    const meta = DB.ethnic.meta || {};
    return sec(t('map.et.family'), chips(t('map.et.family'), items))
      + caveat(Lk(meta, 'warning'));
  },

  disputed(DB) {
    return sec('', keys([
      keyRow(sw('', 'sw-hatch'), t('map.dp.area')),
      keyRow(sw('', 'sw-hatch sw-round'), t('map.dp.point')),
    ])) + note(t('map.dp.note', { n: fmtNum(DB.disputed.length) }));
  },

  powers(DB) {
    const f = state.filters;
    const bloc = activeBloc(state);
    const blocs = DB.relations.blocs.map((b) => chip({ act: 'bloc', val: b.id, pressed: bloc === b.id, label: L(b), n: b.members.length }));
    const byType = new Map(), byKind = new Map();
    for (const e of DB.relations.edges) { byType.set(e.type, (byType.get(e.type) || 0) + 1); byKind.set(e.kind, (byKind.get(e.kind) || 0) + 1); }
    const types = DB.relations.edgeTypes.map((ty) => chip({
      act: 'toggle', key: 'relTypes', val: ty.id, pressed: f.relTypes.has(ty.id), label: L(ty), n: byType.get(ty.id) || 0, lead: lineGlyph(edgeVar(ty.id), { width: 2.4 }),
    }));
    const kinds = ['treaty', 'assessed'].map((k) => chip({
      act: 'toggle', key: 'relKinds', val: k, pressed: f.relKinds.has(k), label: t('map.pw.' + k), n: byKind.get(k) || 0,
      lead: lineGlyph('var(--fg-2)', { dash: k === 'assessed' ? '4 3' : '' }),
    }));
    const memberKey = bloc ? keys([keyRow(sw(seqFill(pal(), BLOC_T), 'sw-land'), t('map.pw.member'))]) : '';
    return sec(t('map.pw.bloc'), chips(t('map.pw.bloc'), blocs) + memberKey)
      + sec(t('map.pw.types'), chips(t('map.pw.types'), types))
      + sec(t('map.pw.kinds'), chips(t('map.pw.kinds'), kinds) + keys([
        keyRow(lineGlyph('var(--fg-2)', { dash: '1.2 3', width: 2, round: true }), t('map.pw.contested')),
        keyRow(`<span class="weights" aria-hidden="true">${lineGlyph('var(--fg-2)', { width: 0.9 })}${lineGlyph('var(--fg-2)', { width: 3 })}</span>`, t('map.pw.width')),
      ]))
      + note(t('map.pw.hint'))
      + `<div class="lc-actions"><button class="btn" type="button" data-act="network">${icon('network', 16)}<span>${esc(t('map.pw.network'))}</span></button></div>`;
  },

  resources(DB) {
    const cls = state.filters.resourceClass;
    const n = new Map();
    for (const s of DB.resources.sites) { const k = DB.resources.classOf[s.type]; n.set(k, (n.get(k) || 0) + 1); }
    const items = [chip({ act: 'set', key: 'resourceClass', val: '', pressed: !cls, label: t('map.all'), n: DB.resources.sites.length })]
      .concat(RESOURCE_CLASSES.map((c) => chip({ act: 'set', key: 'resourceClass', val: c.id, pressed: cls === c.id, label: L(c), n: n.get(c.id) || 0, lead: glyph(RES_SHAPE[c.id], resClassVar(c.id)) })));
    return sec(t('map.rs.class'), chips(t('map.rs.class'), items))
      + sec(t('map.rs.ramp'), ramp(t('map.rs.low'), t('map.rs.first'), t('map.rs.ramp')))
      + note(L(DB.resources.coverageNote));
  },

  chokepoints(DB) {
    const n = new Map();
    for (const p of DB.chokepoints) n.set(p.status, (n.get(p.status) || 0) + 1);
    const rows = Object.entries(CHOKE_STATUS).map(([id, s]) =>
      keyRow(`${glyph('choke', `var(--${s.tone})`)}<span class="st-ic tone-${s.tone}">${icon(STATUS_ICON[s.tone], 13)}</span>`, L(s), n.get(id) || 0));
    return sec(t('map.ck.status'), keys(rows))
      + sec('', keys([
        keyRow(`<span class="sizes" aria-hidden="true">${glyph('choke', 'var(--fg-3)', 10)}${glyph('choke', 'var(--fg-3)', 18)}</span>`, t('map.ck.size')),
        keyRow(glyph('choke', 'var(--fg-3)', 9), t('map.ck.na')),
        keyRow(sw(seqFill(pal(), CHOKE_T), 'sw-land'), t('map.ck.border')),
      ]))
      + note(L(DB.chokeNote));
  },

  history(DB) {
    const [a, b] = decadeWindow(state);
    const evs = windowEvents(DB, state);
    const per = new Map();
    for (const e of evs) for (const iso of e.countries || []) per.set(iso, (per.get(iso) || 0) + 1);
    const max = Math.max(1, ...per.values());
    return sec('', `<p class="lc-stat"><span>${esc(t('map.hs.window', { a, b }))}</span><span>${esc(t('map.hs.count', { n: fmtNum(evs.length) }))}</span></p>`)
      + sec(t('map.hs.ramp'), ramp('1', fmtNum(max), t('map.hs.ramp')) + keys([keyRow(glyph('pin', 'var(--fg-2)'), t('map.hs.event'))]))
      + note(t('map.hs.hint'))
      + note(L(DB.timeline.boundaryLimitation));
  },
};

// ---- lens card
const PREF = 'atlas-map-legend';
let collapsed = null;

export function mountLegend(stage, DB) {
  const card = document.createElement('section');
  card.id = 'legend';
  card.className = 'lcard';
  stage.append(card);
  if (collapsed == null) {
    try { const v = localStorage.getItem(PREF); if (v === '0' || v === '1') collapsed = v === '1'; } catch { /* storage unavailable */ }
    if (collapsed == null) collapsed = matchMedia('(max-width: 760px)').matches;
  }

  function render() {
    const lens = LENSES.find((l) => l.id === state.lens) || LENSES[0];
    const active = document.activeElement && card.contains(document.activeElement) ? document.activeElement : null;
    const focusKey = active ? ['act', 'key', 'val'].map((k) => active.dataset?.[k] ?? '').join('|') : null;
    let body = '';
    try { body = (BODY[lens.id] || BODY.overview)(DB); } catch (err) { console.error('[atlas] lens card failed', err); }
    card.dataset.lens = lens.id;
    card.classList.toggle('collapsed', collapsed);
    card.setAttribute('aria-label', `${t('map.lc.key')}: ${L(lens)}`);
    card.innerHTML = `
      <button class="lc-head" type="button" aria-expanded="${collapsed ? 'false' : 'true'}" aria-controls="lc-body">
        <span class="lc-ico">${icon(lens.icon, 18)}</span>
        <span class="lc-tt"><span class="lc-title">${esc(L(lens))}</span><span class="lc-sub">${esc(L(lens.sub))}</span></span>
        <span class="lc-chev">${icon('chevron', 16)}</span>
      </button>
      <div class="lc-body scroll" id="lc-body"${collapsed ? ' hidden' : ''}>${body}</div>`;
    if (focusKey) {
      const el = [...card.querySelectorAll('[data-act]')].find((b) => ['act', 'key', 'val'].map((k) => b.dataset[k] ?? '').join('|') === focusKey)
        || (active.classList.contains('lc-head') ? card.querySelector('.lc-head') : null);
      el?.focus({ preventScroll: true });
    }
  }

  card.addEventListener('click', (e) => {
    if (e.target.closest('.lc-head')) {
      collapsed = !collapsed;
      try { localStorage.setItem(PREF, collapsed ? '1' : '0'); } catch { /* ignore */ }
      render();
      card.querySelector('.lc-head').focus({ preventScroll: true });
      return;
    }
    const b = e.target.closest('button[data-act]');
    if (!b) return;
    const { act, key, val } = b.dataset;
    if (act === 'set') store.setFilter(key, val || null);
    else if (act === 'toggle') store.toggleInSet(key, val);
    else if (act === 'bloc') {
      if (state.selection?.kind === 'bloc') store.select(state.selection.id === val ? null : 'bloc', val);
      else store.setFilter('bloc', state.filters.bloc === val ? null : val);
    } else if (act === 'network') store.openView('network');
  });
  card.addEventListener('change', (e) => {
    if (e.target.matches('select[data-act="trad"]')) store.setFilter('religionTradition', e.target.value);
  });
  // keep wheel/drag on the card from reaching the map
  for (const ev of ['pointerdown', 'wheel', 'dblclick']) card.addEventListener(ev, (e) => e.stopPropagation(), { passive: true });

  render();
  return { render };
}

// ---- map controls
export function mountControls(stage, api) {
  const box = document.createElement('div');
  box.id = 'mapctl';
  stage.append(box);
  let open = false;

  const btn = (ctl, ic, label, extra = '') =>
    `<button class="btn icon ctl" type="button" data-ctl="${ctl}" aria-label="${esc(label)}" data-tip="${esc(esc(label))}" ${extra}>${icon(ic, 18)}</button>`;

  function render() {
    const globe = state.projection === 'globe';
    const L_ = state.layers;
    const check = (k) => `<label class="ctl-check"><input type="checkbox" data-layer="${k}"${L_[k] ? ' checked' : ''}><span>${esc(t('map.lyr.' + k))}</span></label>`;
    box.setAttribute('role', 'group');
    box.setAttribute('aria-label', t('map.ctl'));
    box.innerHTML = `
      <div class="ctl-stack">
        ${btn('zin', 'plus', t('map.zoomIn'))}
        ${btn('zout', 'minus', t('map.zoomOut'))}
        ${btn('reset', 'home', t('map.reset'))}
      </div>
      <div class="ctl-stack">
        ${btn('proj', globe ? 'flat' : 'globe', globe ? t('map.toFlat') : t('map.toGlobe'))}
        ${btn('layers', 'layers', t('map.layers'), `aria-expanded="${open}" aria-pressed="${open}" aria-controls="mapctl-layers"`)}
      </div>
      <div class="ctl-pop" id="mapctl-layers" role="group" aria-label="${esc(t('map.layers'))}"${open ? '' : ' hidden'}>
        <p class="lc-label">${esc(t('map.layers'))}</p>
        ${['labels', 'graticule', 'boundaries', 'disputed'].map(check).join('')}
      </div>`;
  }

  function setOpen(v, focusBtn) {
    open = v;
    box.querySelector('#mapctl-layers').hidden = !v;
    const b = box.querySelector('[data-ctl="layers"]');
    b.setAttribute('aria-expanded', String(v));
    b.setAttribute('aria-pressed', String(v));
    if (v) box.querySelector('#mapctl-layers input')?.focus({ preventScroll: true });
    else if (focusBtn) b.focus({ preventScroll: true });
  }

  box.addEventListener('click', (e) => {
    const b = e.target.closest('button[data-ctl]');
    if (!b) return;
    const c = b.dataset.ctl;
    if (c === 'zin') api.zoom(1.6);
    else if (c === 'zout') api.zoom(1 / 1.6);
    else if (c === 'reset') api.reset();
    else if (c === 'proj') store.set({ projection: state.projection === 'globe' ? 'flat' : 'globe' });
    else if (c === 'layers') setOpen(!open);
  });
  box.addEventListener('change', (e) => {
    const k = e.target.dataset?.layer;
    if (k) store.setLayer(k, e.target.checked);
  });
  box.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && open) { e.stopPropagation(); setOpen(false, true); }
  });
  document.addEventListener('pointerdown', (e) => { if (open && !box.contains(e.target)) setOpen(false); });
  for (const ev of ['pointerdown', 'wheel', 'dblclick']) box.addEventListener(ev, (e) => e.stopPropagation(), { passive: true });

  render();
  return {
    render() {
      const had = box.contains(document.activeElement) ? document.activeElement.dataset.ctl || document.activeElement.dataset.layer : null;
      render();
      if (had) box.querySelector(`[data-ctl="${had}"], [data-layer="${had}"]`)?.focus({ preventScroll: true });
    },
  };
}
