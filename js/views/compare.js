// Compare two states side by side: figures on a shared scale per row, composition, memberships, conflicts, the direct tie.

import * as store from '../store.js';
import { t, L, registerStrings, fmtNum, fmtCompact, fmtGdp } from '../i18n.js';
import { esc, icon } from '../ui.js';
import { traditionColor, resClassVar } from '../palette.js';
import { stackBar, pips } from '../charts.js';
import { sevIcon, uvMark } from './timeline.js';
import { lineKey } from './network.js';

registerStrings({
  ar: {
    'cp.a': 'الدولة الأولى',
    'cp.b': 'الدولة الثانية',
    'cp.search': 'اكتب اسم دولة',
    'cp.swap': 'بدّل الدولتين',
    'cp.noMatch': 'لا دولة بهذا الاسم',
    'cp.same': 'اختر دولتين مختلفتين للمقارنة.',
    'cp.figures': 'أرقام أساسية',
    'cp.pop': 'السكان',
    'cp.gdp': 'الناتج المحلي الإجمالي',
    'cp.gdppc': 'نصيب الفرد من الناتج',
    'cp.area': 'المساحة',
    'cp.density': 'الكثافة السكانية',
    'cp.km2': 'كم²',
    'cp.perKm2': 'نسمة لكل كم²',
    'cp.usd': '{n} دولار',
    'cp.figNote': 'السكان والناتج تقديرات Natural Earth (سنة {y}). المساحة محسوبة من حدود الخريطة. كل صف بمقياسه الخاص.',
    'cp.profile': 'التصنيف',
    'cp.region': 'الإقليم',
    'cp.income': 'فئة الدخل',
    'cp.economy': 'الاقتصاد',
    'cp.status': 'الوضع',
    'cp.system': 'نظام الحكم',
    'cp.langs': 'اللغات',
    'cp.religion': 'التركيب الديني',
    'cp.diversity': 'التنوّع الديني',
    'cp.noReligion': 'لا تتوفّر بيانات دينية لهذه الدولة في الأطلس.',
    'cp.contested': 'التقديرات محلّ خلاف',
    'cp.ethnic': 'المجموعات العرقية',
    'cp.blocs': 'التكتلات',
    'cp.conflicts': 'النزاعات',
    'cp.external': 'طرف خارجي',
    'cp.choke': 'المضائق والممرات',
    'cp.resources': 'أنواع الموارد',
    'cp.only': '{name} وحدها',
    'cp.shared': 'مشتركة',
    'cp.relation': 'العلاقة المباشرة',
    'cp.noTie': 'لا توجد حافة مسجّلة بين هاتين الدولتين.',
    'cp.bilateral': 'ملاحظة ثنائية',
    'cp.treaty': 'موثّقة بمعاهدة',
    'cp.assessed': 'تقدير تحليلي',
    'cp.weight': 'القوة {n} من 5',
    'inc.1': 'دخل مرتفع (OECD)', 'inc.2': 'دخل مرتفع (خارج OECD)', 'inc.3': 'دخل متوسط أعلى', 'inc.4': 'دخل متوسط أدنى', 'inc.5': 'دخل منخفض',
    'eco.1': 'متقدّم — مجموعة السبع', 'eco.2': 'متقدّم', 'eco.3': 'ناشئ — بريك', 'eco.4': 'ناشئ — MIKT', 'eco.5': 'ناشئ — مجموعة العشرين', 'eco.6': 'نامٍ', 'eco.7': 'الأقل نموّاً',
    'typ.Sovereign country': 'دولة ذات سيادة', 'typ.Country': 'دولة', 'typ.Dependency': 'إقليم تابع', 'typ.Disputed': 'متنازع عليه', 'typ.Indeterminate': 'وضع غير محسوم', 'typ.Sovereignty': 'سيادة',
    'sub.Southern Asia': 'جنوب آسيا', 'sub.Southern Europe': 'جنوب أوروبا', 'sub.Northern Africa': 'شمال أفريقيا', 'sub.Polynesia': 'بولينيزيا',
    'sub.Middle Africa': 'وسط أفريقيا', 'sub.Caribbean': 'الكاريبي', 'sub.Antarctica': 'أنتاركتيكا', 'sub.South America': 'أمريكا الجنوبية',
    'sub.Western Asia': 'غرب آسيا', 'sub.Australia and New Zealand': 'أستراليا ونيوزيلندا', 'sub.Seven seas (open ocean)': 'المحيطات المفتوحة',
    'sub.Western Europe': 'غرب أوروبا', 'sub.Eastern Europe': 'شرق أوروبا', 'sub.Central America': 'أمريكا الوسطى', 'sub.Western Africa': 'غرب أفريقيا',
    'sub.Northern America': 'أمريكا الشمالية', 'sub.Southern Africa': 'جنوب أفريقيا', 'sub.South-Eastern Asia': 'جنوب شرق آسيا', 'sub.Eastern Africa': 'شرق أفريقيا',
    'sub.Northern Europe': 'شمال أوروبا', 'sub.Micronesia': 'ميكرونيزيا', 'sub.Melanesia': 'ميلانيزيا', 'sub.Eastern Asia': 'شرق آسيا', 'sub.Central Asia': 'آسيا الوسطى',
  },
  en: {
    'cp.a': 'First state',
    'cp.b': 'Second state',
    'cp.search': 'Type a state’s name',
    'cp.swap': 'Swap the two states',
    'cp.noMatch': 'No state by that name',
    'cp.same': 'Choose two different states to compare.',
    'cp.figures': 'Key figures',
    'cp.pop': 'Population',
    'cp.gdp': 'GDP',
    'cp.gdppc': 'GDP per person',
    'cp.area': 'Area',
    'cp.density': 'Population density',
    'cp.km2': 'km²',
    'cp.perKm2': 'per km²',
    'cp.usd': '${n}',
    'cp.figNote': 'Population and GDP are Natural Earth estimates ({y}). Area is computed from the map outline. Each row has its own scale.',
    'cp.profile': 'Classification',
    'cp.region': 'Region',
    'cp.income': 'Income group',
    'cp.economy': 'Economy',
    'cp.status': 'Status',
    'cp.system': 'Political system',
    'cp.langs': 'Languages',
    'cp.religion': 'Religious composition',
    'cp.diversity': 'Religious diversity',
    'cp.noReligion': 'The atlas has no religion data for this state.',
    'cp.contested': 'Estimates are contested',
    'cp.ethnic': 'Ethnic groups',
    'cp.blocs': 'Blocs',
    'cp.conflicts': 'Conflicts',
    'cp.external': 'external power',
    'cp.choke': 'Chokepoints',
    'cp.resources': 'Resource types',
    'cp.only': '{name} only',
    'cp.shared': 'Shared',
    'cp.relation': 'The direct relationship',
    'cp.noTie': 'No recorded tie between these two states.',
    'cp.bilateral': 'Bilateral note',
    'cp.treaty': 'Treaty-documented',
    'cp.assessed': 'Analytical assessment',
    'cp.weight': 'Strength {n} of 5',
    'inc.1': 'High income (OECD)', 'inc.2': 'High income (non-OECD)', 'inc.3': 'Upper middle income', 'inc.4': 'Lower middle income', 'inc.5': 'Low income',
    'eco.1': 'Developed — G7', 'eco.2': 'Developed', 'eco.3': 'Emerging — BRIC', 'eco.4': 'Emerging — MIKT', 'eco.5': 'Emerging — G20', 'eco.6': 'Developing', 'eco.7': 'Least developed',
    'typ.Sovereign country': 'Sovereign state', 'typ.Country': 'Country', 'typ.Dependency': 'Dependency', 'typ.Disputed': 'Disputed', 'typ.Indeterminate': 'Indeterminate', 'typ.Sovereignty': 'Sovereignty',
  },
});

// Natural Earth codes: '3. Upper middle income' → 'inc.3'; English subregion names translate through 'sub.*' (English falls back to the raw name).
const coded = (prefix, v) => (v ? t(`${prefix}.${String(v).split('.')[0]}`) : '—');
const subName = (s) => (s ? (store.state.lang === 'ar' ? t(`sub.${s}`) : s) : '');
const typeName = (v) => (v ? t(`typ.${v}`) : '—');
// '34.3 مليون' → digits in the data face, the unit word in the UI face (Arabic set in a mono face reads cramped)
const numUnit = (s) => { const m = /^([-+$]?[\d.,]+)(.*)$/.exec(s); return m ? `<span class="num">${esc(m[1])}</span>${esc(m[2])}` : esc(s); };

const SWAP = '<svg class="ic" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 8h15l-3.5-3.5M20 16H5l3.5 3.5"/></svg>';

function defaultPair(DB) {
  const sel = store.state.selection;
  const c = sel?.kind === 'country' ? DB.countries.get(sel.id) : null;
  if (c) {
    const ties = c.edges.map((id) => DB.edgeById.get(id)).sort((a, b) => b.weight - a.weight);
    const e = ties.find((x) => x.type === 'rivalry' || x.type === 'territorial') || ties[0];
    const other = e ? (e.a === c.iso3 ? e.b : e.a) : c.neighbors[0];
    if (other) return [c.iso3, other];
  }
  return ['USA', 'CHN'];
}

export function mount(el, DB) {
  const [a0, b0] = store.state.compare;
  if (!DB.countries.has(a0) || !DB.countries.has(b0)) store.set({ compare: defaultPair(DB) });
  const name = (iso) => DB.nameOf('country', iso, store.state.lang);
  const bigFirst = [...DB.countries.values()].filter((c) => c.pop).sort((a, b) => b.pop - a.pop).map((c) => c.iso3);

  const picker = (i) => `<div class="cmp-pick">
      <label class="eyebrow" for="cmp-in-${i}">${esc(t(i ? 'cp.b' : 'cp.a'))}</label>
      <div class="cmp-combo">
        <i class="sw cmp-sw-${i}" aria-hidden="true"></i>
        <input id="cmp-in-${i}" class="cmp-in" type="text" role="combobox" aria-autocomplete="list" aria-expanded="false" aria-controls="cmp-lb-${i}" autocomplete="off" spellcheck="false" placeholder="${esc(t('cp.search'))}">
        ${icon('search', 16)}
        <ul class="cmp-lb" id="cmp-lb-${i}" role="listbox" aria-label="${esc(t(i ? 'cp.b' : 'cp.a'))}" hidden></ul>
      </div>
    </div>`;
  el.innerHTML = `<div class="cmp">
    <div class="cmp-pickers">${picker(0)}<button class="btn icon cmp-swap" type="button" aria-label="${esc(t('cp.swap'))}" data-tip="${esc(t('cp.swap'))}">${SWAP}</button>${picker(1)}</div>
    <div class="cmp-body"></div>
  </div>`;
  const body = el.querySelector('.cmp-body');
  const combos = [0, 1].map(combo);
  el.querySelector('.cmp-swap').addEventListener('click', () => {
    const [a, b] = store.state.compare;
    store.set({ compare: [b, a] });
  });
  body.addEventListener('click', (e) => {
    const b = e.target.closest('[data-k]');
    if (b) store.select(b.dataset.k, b.dataset.id);
  });

  // ---- searchable combobox (ARIA 1.2 pattern: focus stays in the input, options via aria-activedescendant)
  function combo(i) {
    const input = el.querySelector(`#cmp-in-${i}`), lb = el.querySelector(`#cmp-lb-${i}`);
    let opts = [], active = -1;
    const reset = () => { const iso = store.state.compare[i]; input.value = iso ? name(iso) : ''; };
    function suggestions() {
      const other = store.state.compare[1 - i], c = DB.countries.get(other);
      const partners = c ? c.edges.map((id) => DB.edgeById.get(id)).sort((a, b) => b.weight - a.weight).map((e) => (e.a === other ? e.b : e.a)) : [];
      return [...new Set([...partners, ...bigFirst])].filter((iso) => iso !== other).slice(0, 8);
    }
    function results() {
      const q = input.value.trim(), cur = store.state.compare[i];
      if (!q || (cur && q === name(cur))) return suggestions();
      return DB.search(q, 400).filter((r) => r.kind === 'country').slice(0, 8).map((r) => r.id);
    }
    function mark() {
      [...lb.querySelectorAll('[role=option]')].forEach((li, k) => li.setAttribute('aria-selected', String(k === active)));
      if (active >= 0) {
        input.setAttribute('aria-activedescendant', `cmp-o-${i}-${active}`);
        lb.querySelector(`#cmp-o-${i}-${active}`)?.scrollIntoView({ block: 'nearest' });
      } else input.removeAttribute('aria-activedescendant');
    }
    function open(list) {
      opts = list; active = list.length ? 0 : -1;
      lb.innerHTML = list.length
        ? list.map((iso, k) => `<li id="cmp-o-${i}-${k}" role="option" aria-selected="false" data-iso="${esc(iso)}"><span>${esc(name(iso))}</span><span class="cmp-o-sub">${esc(subName(DB.countries.get(iso)?.subregion))}</span></li>`).join('')
        : `<li class="cmp-o-none">${esc(t('cp.noMatch'))}</li>`;
      lb.hidden = false;
      input.setAttribute('aria-expanded', 'true');
      mark();
    }
    function close() {
      lb.hidden = true; opts = []; active = -1;
      input.setAttribute('aria-expanded', 'false');
      input.removeAttribute('aria-activedescendant');
    }
    function choose(iso) {
      const next = [...store.state.compare];
      next[i] = iso;
      close();
      store.set({ compare: next });
      reset();
    }
    input.addEventListener('input', () => open(results()));
    input.addEventListener('focus', () => input.select());
    input.addEventListener('click', () => { if (lb.hidden) open(results()); });
    input.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        if (lb.hidden) { open(results()); return; }
        active = Math.max(0, Math.min(opts.length - 1, active + (e.key === 'ArrowDown' ? 1 : -1)));
        mark();
      } else if (e.key === 'Enter') {
        if (!lb.hidden && opts[active]) { e.preventDefault(); choose(opts[active]); }
      } else if (e.key === 'Escape') {
        // close only the list; the shell's Esc (close the view) should not also fire
        if (!lb.hidden) { e.preventDefault(); e.stopPropagation(); close(); reset(); }
      } else if (e.key === 'Tab') close();
    });
    input.addEventListener('blur', () => { close(); reset(); });
    lb.addEventListener('mousedown', (e) => e.preventDefault()); // keep focus in the input while choosing
    lb.addEventListener('click', (e) => { const li = e.target.closest('[data-iso]'); if (li) choose(li.dataset.iso); });
    reset();
    return { reset };
  }

  // ---- sections
  const section = (title, html, extra = '') => `<section class="cmp-sec${extra}"><h3 class="vw-h3">${esc(title)}</h3>${html}</section>`;
  const selBtn = (kind, id, label, pre = '', post = '') => `<li><button class="cmp-item" type="button" data-k="${kind}" data-id="${esc(id)}">${pre}<span>${esc(label)}</span>${post}</button></li>`;

  function head(A, B) {
    const card = (c, i) => `<button class="cmp-name" type="button" data-k="country" data-id="${esc(c.iso3)}">
        <span class="cmp-name-t"><i class="sw cmp-sw-${i}" aria-hidden="true"></i>${esc(name(c.iso3))}</span>
        <span class="cmp-name-s">${esc([subName(c.subregion), typeName(c.type)].filter(Boolean).join(' · '))}</span></button>`;
    return `<div class="cmp-head">${card(A, 0)}${card(B, 1)}</div>`;
  }

  function figures(A, B) {
    const usd = (v) => t('cp.usd', { n: fmtNum(v) });
    const rows = [
      [t('cp.pop'), (c) => c.pop, fmtCompact],
      [t('cp.gdp'), (c) => c.gdp, fmtGdp],
      [t('cp.gdppc'), (c) => c.gdpPerCap, usd],
      [t('cp.area'), (c) => c.areaKm2, (v) => `${v >= 1e4 ? fmtCompact(v) : fmtNum(v)} ${t('cp.km2')}`],
      [t('cp.density'), (c) => c.density, (v) => `${fmtNum(v, v < 10 ? 1 : 0)} ${t('cp.perKm2')}`],
    ];
    const bar = (v, max, fmt, c, i) => {
      const txt = v == null || Number.isNaN(v) ? '—' : fmt(v);
      const w = v ? Math.max(0.6, (v / max) * 100) : 0;
      return `<div class="cmp-bar" data-tip="${esc(`<b>${esc(txt)}</b> <span class="tip-sub">${esc(name(c.iso3))}</span>`)}">
        <span class="cmp-track"><span class="cmp-fill cmp-fill-${i}" style="inline-size:${w.toFixed(2)}%"></span></span>
        <span class="cmp-val">${numUnit(txt)}</span></div>`;
    };
    const html = rows.map(([label, get, fmt]) => {
      const va = get(A), vb = get(B), max = Math.max(va || 0, vb || 0) || 1;
      return `<div class="cmp-fig"><div class="cmp-fig-l">${esc(label)}</div><div class="cmp-fig-b">${bar(va, max, fmt, A, 0)}${bar(vb, max, fmt, B, 1)}</div></div>`;
    }).join('');
    const years = [...new Set([A.popYear, B.popYear, A.gdpYear, B.gdpYear].filter(Boolean))].sort().join('–');
    return section(t('cp.figures'), `<div class="cmp-figs">${html}</div><p class="vw-note">${esc(t('cp.figNote', { y: years || '—' }))}</p>`);
  }

  function profile(A, B) {
    const rows = [
      [t('cp.region'), (c) => subName(c.subregion) || '—'],
      [t('cp.income'), (c) => coded('inc', c.income)],
      [t('cp.economy'), (c) => coded('eco', c.economy)],
      [t('cp.status'), (c) => typeName(c.type)],
      [t('cp.system'), (c) => L(c.intel?.system) || '—'],
      [t('cp.langs'), (c) => { const l = L(c.intel?.langs); return Array.isArray(l) && l.length ? l.join('، ') : '—'; }],
    ];
    return section(t('cp.profile'), `<dl class="cmp-dl">${rows.map(([k, get]) => `<div class="cmp-dl-r"><dt>${esc(k)}</dt><dd>${esc(get(A))}</dd><dd>${esc(get(B))}</dd></div>`).join('')}</dl>`);
  }

  function religion(A, B) {
    const one = (c, i) => {
      const r = c.religion;
      const h = `<div class="cmp-rel-h"><span class="cmp-rel-n"><i class="sw cmp-sw-${i}" aria-hidden="true"></i>${esc(name(c.iso3))}</span>${r ? `<span class="cmp-rel-d">${esc(t('cp.diversity'))} <b class="num">${fmtNum(r.diversity, 2)}</b></span>` : ''}</div>`;
      if (!r) return `<div class="cmp-rel">${h}<p class="vw-muted">${esc(t('cp.noReligion'))}</p></div>`;
      const parts = r.sorted.map(([tid, p]) => ({ label: L(DB.religion.traditionById.get(tid)), value: p, color: traditionColor(tid) }));
      const note = [r.contested ? t('cp.contested') : '', L(r.note)].filter(Boolean).join(' — ');
      return `<div class="cmp-rel">${h}${stackBar(parts, { label: `${t('cp.religion')}: ${name(c.iso3)}`, height: 12 })}${note ? `<p class="vw-note">${esc(note)}</p>` : ''}</div>`;
    };
    const share = new Map();
    for (const c of [A, B]) for (const [tid, p] of c.religion?.sorted || []) share.set(tid, Math.max(share.get(tid) || 0, p));
    const legend = [...share].sort((x, y) => y[1] - x[1]).map(([tid]) => `<li><i class="sw" style="background:${traditionColor(tid)}"></i>${esc(L(DB.religion.traditionById.get(tid)))}</li>`).join('');
    return section(t('cp.religion'), `<div class="cmp-rels">${one(A, 0)}${one(B, 1)}</div>${legend ? `<ul class="vw-legend">${legend}</ul>` : ''}`);
  }

  /** Three columns: only A · shared · only B. items: [{key, html}] per side (html = a ready <li>). */
  function threeWay(title, aItems, bItems, A, B) {
    const bKeys = new Set(bItems.map((x) => x.key)), aKeys = new Set(aItems.map((x) => x.key));
    const col = (label, list, cls, sw) => `<div class="cmp-col ${cls}"><h4 class="cmp-col-h">${sw}${esc(label)} <span class="n">${list.length}</span></h4>${list.length ? `<ul class="cmp-items">${list.map((x) => x.html).join('')}</ul>` : '<p class="vw-muted">—</p>'}</div>`;
    return section(title, `<div class="cmp-3">
      ${col(t('cp.only', { name: name(A.iso3) }), aItems.filter((x) => !bKeys.has(x.key)), 'is-a', '<i class="sw cmp-sw-0" aria-hidden="true"></i>')}
      ${col(t('cp.shared'), aItems.filter((x) => bKeys.has(x.key)), 'is-both', '')}
      ${col(t('cp.only', { name: name(B.iso3) }), bItems.filter((x) => !aKeys.has(x.key)), 'is-b', '<i class="sw cmp-sw-1" aria-hidden="true"></i>')}
    </div>`);
  }

  const groupItems = (c) => c.groups.map((id) => ({ key: id, html: selBtn('group', id, DB.nameOf('group', id, store.state.lang)) }));
  const blocItems = (c) => c.blocs.map((id) => ({ key: id, html: selBtn('bloc', id, DB.nameOf('bloc', id, store.state.lang)) }));
  const conflictItems = (c) => [...new Set([...c.conflicts, ...c.external])].map((id) => {
    const k = DB.conflictById.get(id);
    const ext = !c.conflicts.includes(id); // involved only as an outside power
    return { key: id, html: selBtn('conflict', id, L(k.name), sevIcon(k.severity), ext ? `<span class="cmp-x">${esc(t('cp.external'))}</span>` : '').replace('</li>', `${uvMark(DB, 'conflict', id)}</li>`) };
  });
  const chokeItems = (c) => c.chokepoints.map((id) => ({ key: id, html: selBtn('choke', id, DB.nameOf('choke', id, store.state.lang)) }));
  const resourceItems = (c) => [...new Set(c.resources.map((e) => e.type))].map((ty) => ({
    key: ty,
    html: `<li><span class="cmp-item is-static"><i class="sw" style="background:${resClassVar(DB.resources.classOf[ty])}"></i><span>${esc(L(DB.resources.typeById.get(ty)) || ty)}</span></span></li>`,
  }));

  function relation(A, B) {
    const es = DB.edgesBetween(A.iso3, B.iso3), note = DB.bilateralFor(A.iso3, B.iso3);
    if (!es.length && !note) return section(t('cp.relation'), `<p class="empty">${esc(t('cp.noTie'))}</p>`);
    const rows = es.map((e) => `<li class="cmp-edge">${lineKey(e.type, e.kind, e.contested, 28)}<div>
        <p class="cmp-edge-h"><b>${esc(L(DB.relations.edgeTypeById.get(e.type)))}</b><span class="pill">${esc(t('cp.' + e.kind))}</span>${e.contested ? `<span class="pill">${esc(t('nw.contested'))}</span>` : ''}${pips(e.weight, 5, 'var(--fg-2)')}<span class="vh">${esc(t('cp.weight', { n: e.weight }))}</span></p>
        <p class="cmp-edge-t">${esc(L(e))}</p></div></li>`).join('');
    return section(t('cp.relation'), `${rows ? `<ul class="cmp-edges">${rows}</ul>` : ''}${note ? `<div class="cmp-bi"><span class="eyebrow">${esc(t('cp.bilateral'))}</span><p>${esc(L(note))}</p></div>` : ''}`);
  }

  function render() {
    const [a, b] = store.state.compare;
    const A = DB.countries.get(a), B = DB.countries.get(b);
    if (!A || !B || a === b) { body.innerHTML = `<p class="empty">${esc(t('cp.same'))}</p>`; return; }
    // a recorded tie is the headline of the pair; without one, the honest empty note sits with the other links
    const tied = DB.edgesBetween(a, b).length || DB.bilateralFor(a, b);
    body.innerHTML = [
      head(A, B),
      tied ? relation(A, B) : '',
      figures(A, B),
      profile(A, B),
      religion(A, B),
      threeWay(t('cp.ethnic'), groupItems(A), groupItems(B), A, B),
      threeWay(t('cp.blocs'), blocItems(A), blocItems(B), A, B),
      threeWay(t('cp.conflicts'), conflictItems(A), conflictItems(B), A, B),
      tied ? '' : relation(A, B),
      threeWay(t('cp.choke'), chokeItems(A), chokeItems(B), A, B),
      threeWay(t('cp.resources'), resourceItems(A), resourceItems(B), A, B),
    ].join('');
  }

  render();
  return {
    update(keys) {
      if (keys.includes('compare')) { combos.forEach((c) => c.reset()); render(); }
    },
    destroy() {},
  };
}
