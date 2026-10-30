// App chrome: top bar, lens rail, command palette, help dialog, tours popover, phone menu, toasts and the global keyboard map.
// Owns the Esc order: palette → help → popover/menu → tour → open view → selection.

import { state, on, emit, set, select, flyTo, toast, openView, closeView } from './store.js';
import { LENSES, VIEWS, SEVERITY, RELIGION_FAMILIES } from './config.js';
import { t, L, Lk, registerStrings, fmtCompact, fmtDate, normalize, isRTL } from './i18n.js';
import { esc, icon, $, $$, copyText, shareLink, hideTip, reducedMotion } from './ui.js';
import { availableTours, stepsLabel } from './tours.js';

registerStrings({
  ar: {
    'sh.searchPh': 'ابحث عن دولة أو نزاع أو جماعة أو ديانة…',
    'sh.searchLabel': 'ابحث في الأطلس',
    'sh.palTitle': 'البحث والأوامر',
    'sh.results': 'النتائج',
    'sh.noResults': 'لا شيء يطابق «{q}». جرّب جزءاً من الاسم، أو اكتبه بالإنجليزية.',
    'sh.hintMove': 'للتنقّل',
    'sh.hintOpen': 'للفتح',
    'sh.gRecent': 'فتحتها مؤخراً',
    'sh.gLenses': 'العدسات',
    'sh.gViews': 'العروض',
    'sh.gActions': 'أوامر',
    'sh.gTours': 'جولات موجّهة',
    'sh.current': 'المفتوحة',
    'sh.actTheme': 'بدّل المظهر إلى: {mode}',
    'sh.actLang': 'اعرض الأطلس بالإنجليزية',
    'sh.actFlat': 'اعرض الخريطة مسطّحة',
    'sh.actGlobe': 'اعرض الكرة الأرضية',
    'sh.actLink': 'انسخ رابط هذا العرض',
    'sh.actTour': 'ابدأ جولة: {title}',
    'sh.views': 'العروض',
    'sh.lenses': 'العدسات',
    'sh.key': 'المفتاح',
    'sh.tours': 'جولات',
    'sh.toursTitle': 'جولات موجّهة',
    'sh.toursHint': 'تنقلك كل جولة بين محطات مختارة على الخريطة، بنصوص من بيانات الأطلس.',
    'sh.running': 'جارية',
    'sh.copyLink': 'انسخ الرابط',
    'sh.copyLinkTip': 'انسخ رابطاً يفتح الأطلس على هذا العرض',
    'sh.linkCopied': 'تم نسخ الرابط',
    'sh.linkFailed': 'تعذّر النسخ. انسخ الرابط من شريط العنوان.',
    'sh.toLang': 'اعرض بالإنجليزية',
    'sh.language': 'اللغة',
    'sh.langOther': 'English',
    'sh.themeLbl': 'المظهر',
    'sh.theme.system': 'تلقائي حسب الجهاز',
    'sh.theme.dark': 'داكن',
    'sh.theme.light': 'فاتح',
    'sh.themeTip': 'المظهر: {mode}. اضغط للتبديل إلى: {next}',
    'sh.themeNow': 'المظهر: {mode}',
    'sh.projGlobe': 'عرض الكرة الأرضية',
    'sh.projFlat': 'عرض الخريطة المسطّحة',
    'sh.menu': 'القائمة',
    'sh.settings': 'الإعدادات',
    'sh.context': 'ما تعرضه الآن',
    'sh.clearSel': 'ألغِ التحديد',
    'sh.flyTip': 'اعرضه على الخريطة',
    'sh.pop': 'السكان',
    'kinds.country': 'الدول',
    'kinds.conflict': 'النزاعات',
    'kinds.group': 'المجموعات العرقية',
    'kinds.religion': 'الديانات',
    'kinds.choke': 'الممرّات والمضائق',
    'kinds.disputed': 'الأقاليم المتنازع عليها',
    'kinds.event': 'الأحداث',
    'kinds.bloc': 'التكتّلات',
    'kinds.site': 'مواقع الموارد',
    'sh.helpTitle': 'الاختصارات وعن الأطلس',
    'sh.helpKeys': 'لوحة المفاتيح',
    'sh.helpAbout': 'عن الأطلس',
    'sh.kPalette': 'افتح البحث والأوامر',
    'sh.kSearch': 'ابدأ البحث',
    'sh.kLens': 'انتقل إلى العدسة بترتيبها في الشريط',
    'sh.kProj': 'بدّل بين الكرة الأرضية والخريطة المسطّحة',
    'sh.kTheme': 'بدّل المظهر: تلقائي، داكن، فاتح',
    'sh.kLang': 'بدّل بين العربية والإنجليزية',
    'sh.kHelp': 'اعرض هذه النافذة',
    'sh.kEsc': 'أغلق الطبقة العليا: البحث، ثم هذه النافذة، ثم القوائم، ثم الجولة، ثم العرض المفتوح، ثم التحديد',
    'sh.kTour': 'المحطة السابقة أو التالية أثناء الجولة',
    'sh.kMap': 'حرّك الخريطة وقرّب أو بعّد حين تكون محدّدة',
    'sh.about': 'أطلس خطوط الصدع خريطة تفاعلية تقرأ العالم من زاوية ما يقسمه وما يجمعه: التركيب العرقي والديني للدول، والنزاعات القائمة، والأقاليم المتنازع عليها، والموارد والممرّات البحرية، وشبكة التحالفات، وأحداث القرن الماضي. اختر عدسة من الشريط الجانبي، أو ابحث عن أي اسم، أو ابدأ جولة موجّهة.',
    'sh.credit': 'جُمعت البيانات في الأطلس الأصلي {link} وتُنشر بترخيص CC-BY-4.0، والحدود من Natural Earth (ملكية عامة).',
    'sh.asOf': 'حالة النزاعات كما هي في {date}. تعيد هذه النسخة تصميم الواجهة ولا تتحقّق بشكل مستقل من حقول الوضع الحالي.',
    'sh.openSources': 'المصادر والمنهجية',
  },
  en: {
    'sh.searchPh': 'Search a country, conflict, group or religion…',
    'sh.searchLabel': 'Search the atlas',
    'sh.palTitle': 'Search and commands',
    'sh.results': 'Results',
    'sh.noResults': 'Nothing matches “{q}”. Try part of the name, or type it in Arabic.',
    'sh.hintMove': 'to move',
    'sh.hintOpen': 'to open',
    'sh.gRecent': 'Recently opened',
    'sh.gLenses': 'Lenses',
    'sh.gViews': 'Views',
    'sh.gActions': 'Actions',
    'sh.gTours': 'Guided tours',
    'sh.current': 'Open',
    'sh.actTheme': 'Switch theme to {mode}',
    'sh.actLang': 'Show the atlas in Arabic',
    'sh.actFlat': 'Show the flat map',
    'sh.actGlobe': 'Show the globe',
    'sh.actLink': 'Copy a link to this view',
    'sh.actTour': 'Start tour: {title}',
    'sh.views': 'Views',
    'sh.lenses': 'Lenses',
    'sh.key': 'Key',
    'sh.tours': 'Tours',
    'sh.toursTitle': 'Guided tours',
    'sh.toursHint': 'Each tour moves you through chosen stops on the map, with text from the atlas data.',
    'sh.running': 'Running',
    'sh.copyLink': 'Copy link',
    'sh.copyLinkTip': 'Copy a link that opens the atlas on this view',
    'sh.linkCopied': 'Link copied',
    'sh.linkFailed': 'Could not copy. Copy the link from the address bar.',
    'sh.toLang': 'Show in Arabic',
    'sh.language': 'Language',
    'sh.langOther': 'العربية',
    'sh.themeLbl': 'Theme',
    'sh.theme.system': 'Auto (device setting)',
    'sh.theme.dark': 'Dark',
    'sh.theme.light': 'Light',
    'sh.themeTip': 'Theme: {mode}. Click for {next}',
    'sh.themeNow': 'Theme: {mode}',
    'sh.projGlobe': 'Globe view',
    'sh.projFlat': 'Flat map view',
    'sh.menu': 'Menu',
    'sh.settings': 'Settings',
    'sh.context': 'What you are looking at',
    'sh.clearSel': 'Clear selection',
    'sh.flyTip': 'Show it on the map',
    'sh.pop': 'Population',
    'kinds.country': 'Countries',
    'kinds.conflict': 'Conflicts',
    'kinds.group': 'Ethnic groups',
    'kinds.religion': 'Religions',
    'kinds.choke': 'Chokepoints',
    'kinds.disputed': 'Disputed territories',
    'kinds.event': 'Events',
    'kinds.bloc': 'Blocs',
    'kinds.site': 'Resource sites',
    'sh.helpTitle': 'Shortcuts and about',
    'sh.helpKeys': 'Keyboard',
    'sh.helpAbout': 'About',
    'sh.kPalette': 'Open search and commands',
    'sh.kSearch': 'Start a search',
    'sh.kLens': 'Switch to the lens in that position on the rail',
    'sh.kProj': 'Switch between the globe and the flat map',
    'sh.kTheme': 'Cycle the theme: auto, dark, light',
    'sh.kLang': 'Switch between Arabic and English',
    'sh.kHelp': 'Show this window',
    'sh.kEsc': 'Close the top layer: search, this window, menus, the tour, the open view, then the selection',
    'sh.kTour': 'Previous or next stop during a tour',
    'sh.kMap': 'Pan the map and zoom in or out while it has focus',
    'sh.about': 'Fault Lines Atlas is an interactive map that reads the world through what divides and connects it: the ethnic and religious make-up of states, active conflicts, disputed territories, resources and sea lanes, the web of alliances, and the events of the past century. Pick a lens on the rail, search any name, or start a guided tour.',
    'sh.credit': 'Data compiled by the original atlas {link} under CC-BY-4.0; borders from Natural Earth (public domain).',
    'sh.asOf': 'Conflict status as of {date}. This edition redesigns the interface and does not independently verify the current-status fields.',
    'sh.openSources': 'Sources and method',
  },
});

// Lens a selection kind belongs to (country keeps the current lens).
const KIND_LENS = { conflict: 'conflicts', group: 'ethnic', religion: 'religion', choke: 'chokepoints', disputed: 'disputed', event: 'history', bloc: 'powers', site: 'resources' };
const KIND_ICON = { country: 'globe', conflict: 'flame', group: 'people', religion: 'pie', choke: 'anchor', disputed: 'hatch', event: 'clock', bloc: 'network', site: 'gem' };
const THEMES = ['system', 'dark', 'light'];
const THEME_ICON = { system: 'auto', dark: 'moon', light: 'sun' };
const ORIGINAL = { url: 'https://claude.ai/artifact/7Y8KPakRKzrUtZYxjCwJai', ar: 'الأطلس الجيوسياسي والعرقي الديني العالمي' };
// Natural Earth subregions are English-only in the data; this is UI vocabulary for the Arabic interface.
const SUBREGION_AR = {
  'Eastern Africa': 'شرق أفريقيا', 'Western Asia': 'غرب آسيا', 'South-Eastern Asia': 'جنوب شرق آسيا', 'South America': 'أمريكا الجنوبية',
  'Southern Europe': 'جنوب أوروبا', 'Melanesia': 'ميلانيزيا', 'Central Asia': 'آسيا الوسطى', 'Micronesia': 'ميكرونيزيا', 'Caribbean': 'الكاريبي',
  'Polynesia': 'بولينيزيا', 'Northern America': 'أمريكا الشمالية', 'Seven seas (open ocean)': 'المحيطات المفتوحة', 'Western Africa': 'غرب أفريقيا',
  'Northern Europe': 'شمال أوروبا', 'Eastern Europe': 'شرق أوروبا', 'Northern Africa': 'شمال أفريقيا', 'Eastern Asia': 'شرق آسيا',
  'Western Europe': 'غرب أوروبا', 'Southern Africa': 'جنوب أفريقيا', 'Southern Asia': 'جنوب آسيا', 'Middle Africa': 'وسط أفريقيا',
  'Central America': 'أمريكا الوسطى', 'Australia and New Zealand': 'أستراليا ونيوزيلندا', 'Antarctica': 'القارة القطبية الجنوبية',
};

const MARK = `<svg class="tb-mark" width="28" height="28" viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linejoin="round" aria-hidden="true">
  <circle cx="16" cy="16" r="14.4"/><circle cx="16" cy="16" r="10.6" stroke-dasharray="1 2.1" opacity=".7"/>
  <path d="M16 .9v3M16 28.1v3M.9 16h3M28.1 16h3"/>
  <path d="M10.3 10.3 16 14.3 21.7 10.3 17.7 16 21.7 21.7 16 17.7 10.3 21.7 14.3 16Z" opacity=".75"/>
  <path class="occ" d="M16 4.6 18.3 13.7 27.4 16 18.3 18.3 16 27.4 13.7 18.3 4.6 16 13.7 13.7Z"/>
  <path d="M16 4.6 18.3 13.7 16 16ZM27.4 16 18.3 18.3 16 16ZM16 27.4 13.7 18.3 16 16ZM4.6 16 13.7 13.7 16 16Z" fill="currentColor" stroke="none"/>
</svg>`;
const HELP_IC = '<svg class="ic ic-help" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M9.6 9.4a2.5 2.5 0 0 1 4.85.85c0 1.7-2.45 2.2-2.45 3.85"/><path d="M12 17.2v.3"/></svg>';

// data-tip holds HTML; plain text is escaped twice (once for the attribute, once for the tooltip's innerHTML).
const tipText = (s) => esc(esc(s));
const tipHtml = (html) => esc(html);

let DB, topEl, railEl, palEl, helpEl, toastEl, popEl, sheetEl, phoneMQ, MOD = 'Ctrl';
let tours = [];
const recent = [];
const modal = new Set();

export function initShell(db) {
  DB = db;
  tours = availableTours(DB);
  phoneMQ = matchMedia('(max-width: 760px)');
  MOD = /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent || '') ? '⌘' : 'Ctrl';
  topEl = $('#topbar'); railEl = $('#lensrail'); palEl = $('#palette'); helpEl = $('#help'); toastEl = $('#toasts');
  popEl = mount('sh-tours', 'sh-pop');
  sheetEl = mount('sh-sheet', 'sh-sheet');

  renderTop();
  renderRail();
  bindTop();
  bindRail();
  bindPalette();
  bindHelp();
  bindPop();
  bindSheet();
  bindKeys();
  trackStage();
  on('toast', showToast);
  on('change', onChange);
  phoneMQ.addEventListener?.('change', () => { closePop({ restore: false }); closeSheet({ restore: false }); renderTop(); renderRail(); });
  addEventListener('resize', () => { if (!popEl.hidden) positionPop(); });
}

function mount(id, cls) {
  const el = document.createElement('div');
  el.id = id; el.className = cls; el.hidden = true;
  document.body.append(el);
  return el;
}

function onChange({ keys }) {
  if (keys.includes('selection') && state.selection) remember(state.selection);
  if (keys.includes('lang')) {
    hideTip();
    renderTop(); renderRail();
    if (!helpEl.hidden) keepFocus(helpEl, () => { helpEl.innerHTML = helpHTML(); });
    if (!palEl.hidden) refreshPalette();
    if (!popEl.hidden) { keepFocus(popEl, () => { popEl.innerHTML = popHTML(); }); positionPop(); }
    if (!sheetEl.hidden) keepFocus(sheetEl, () => { sheetEl.innerHTML = sheetHTML(); });
    return;
  }
  if (keys.some((k) => ['theme', 'lens', 'selection', 'view', 'tour', 'ask', 'askReady'].includes(k))) renderTop();
  if (keys.includes('lens')) renderRail();
  if (keys.some((k) => ['tour', 'view', 'theme'].includes(k))) {
    if (!popEl.hidden) keepFocus(popEl, () => { popEl.innerHTML = popHTML(); });
    if (!sheetEl.hidden) keepFocus(sheetEl, () => { sheetEl.innerHTML = sheetHTML(); });
  }
}

/** Re-render `root` and put focus back on the control with the same data-k. */
function keepFocus(root, render, fallback) {
  const a = document.activeElement;
  const k = a && root.contains(a) ? a.closest('[data-k]')?.dataset.k : null;
  render();
  if (!k) return;
  const again = root.querySelector(`[data-k="${CSS.escape(k)}"]`);
  (again && !again.disabled ? again : fallback?.())?.focus();
}

// ---------------------------------------------------------------- top bar

const nextTheme = () => THEMES[(THEMES.indexOf(state.theme) + 1) % THEMES.length];

function renderTop() {
  keepFocus(topEl, () => { topEl.innerHTML = topHTML(); }, () => topEl.querySelector('[data-k="search"]'));
  if (!popEl.hidden) topEl.querySelector('[data-k="tours"]')?.setAttribute('aria-expanded', 'true');
  if (!sheetEl.hidden) topEl.querySelector('[data-k="menu"]')?.setAttribute('aria-expanded', 'true');
}

function topHTML() {
  const theme = state.theme;
  return `
    <div class="tb-brand">${MARK}<h1 class="tb-name">${esc(t('appName'))}</h1><p class="tb-tag">${esc(t('appTag'))}</p></div>
    <button type="button" class="tb-search" data-k="search" aria-haspopup="dialog" aria-label="${esc(t('sh.searchLabel'))}" aria-keyshortcuts="Control+K /">
      ${icon('search', 16)}<span class="tb-search-ph">${esc(t('sh.searchPh'))}</span>
      <span class="tb-keys" aria-hidden="true"><kbd class="kbd">${esc(MOD)} K</kbd><kbd class="kbd">/</kbd></span>
    </button>
    ${crumbHTML()}
    <div class="tb-views" role="group" aria-label="${esc(t('sh.views'))}">
      ${VIEWS.map((v) => `<button type="button" class="tb-view" data-k="view-${v.id}" aria-pressed="${state.view === v.id}" aria-label="${esc(L(v))}" data-tip="${tipText(L(v))}">${icon(v.icon, 16)}<span class="lbl">${esc(L(v))}</span></button>`).join('')}
    </div>
    <div class="tb-tools">
      ${state.askReady ? `<button type="button" class="btn ghost tb-ask${state.ask ? ' is-on' : ''}" data-k="ask" aria-pressed="${!!state.ask}" aria-keyshortcuts="A" data-tip="${tipText(t('sh.ask'))}">${icon('spark', 17)}<span class="lbl">${esc(t('sh.ask'))}</span></button>` : ''}
      <button type="button" class="btn ghost tb-tours${state.tour ? ' is-on' : ''}" data-k="tours" aria-haspopup="dialog" aria-expanded="false" aria-label="${esc(t('sh.toursTitle'))}">${icon('route', 17)}<span class="lbl">${esc(t('sh.tours'))}</span></button>
      <button type="button" class="btn ghost icon" data-k="link" aria-label="${esc(t('sh.copyLinkTip'))}" data-tip="${tipText(t('sh.copyLinkTip'))}">${icon('link', 17)}</button>
      <button type="button" class="btn ghost icon tb-lang" data-k="lang" aria-label="${esc(t('sh.toLang'))}" data-tip="${tipText(t('sh.toLang'))}"><span lang="${state.lang === 'ar' ? 'en' : 'ar'}">${state.lang === 'ar' ? 'EN' : 'ع'}</span></button>
      <button type="button" class="btn ghost icon" data-k="theme" aria-label="${esc(t('sh.themeTip', { mode: t('sh.theme.' + theme), next: t('sh.theme.' + nextTheme()) }))}" data-tip="${tipText(t('sh.themeTip', { mode: t('sh.theme.' + theme), next: t('sh.theme.' + nextTheme()) }))}">${icon(THEME_ICON[theme], 17)}</button>
      <button type="button" class="btn ghost icon" data-k="help" aria-haspopup="dialog" aria-label="${esc(t('sh.helpTitle'))}" aria-keyshortcuts="?" data-tip="${tipText(t('sh.helpTitle'))}">${HELP_IC}</button>
    </div>
    <button type="button" class="btn ghost icon tb-menu" data-k="menu" aria-haspopup="dialog" aria-expanded="false" aria-label="${esc(t('sh.menu'))}">${icon('menu', 19)}</button>`;
}

function crumbHTML() {
  const lens = LENSES.find((l) => l.id === state.lens) || LENSES[0];
  const sel = state.selection && DB.exists(state.selection.kind, state.selection.id) ? state.selection : null;
  const selPart = sel ? `
      <span class="cr-sep" aria-hidden="true">${icon('chevron', 14)}</span>
      <button type="button" class="cr-sel" data-k="crumb-fly" data-tip="${tipText(t('sh.flyTip'))}">
        <span class="cr-kind">${esc(t('kind.' + sel.kind))}</span><span class="cr-name">${esc(DB.nameOf(sel.kind, sel.id, state.lang))}</span>
      </button>
      <button type="button" class="cr-x" data-k="crumb-clear" aria-label="${esc(t('sh.clearSel'))}" data-tip="${tipText(t('sh.clearSel'))}">${icon('close', 14)}</button>` : '';
  return `<div class="tb-crumb${sel ? ' has-sel' : ''}" role="group" aria-label="${esc(t('sh.context'))}">
      <span class="cr-lens">${icon(lens.icon, 15)}<span class="cr-lens-name">${esc(L(lens))}</span></span>${selPart}
    </div>`;
}

function bindTop() {
  topEl.addEventListener('click', (e) => {
    const b = e.target.closest('button[data-k]');
    if (!b) return;
    const k = b.dataset.k;
    if (k === 'search') openPalette(b);
    else if (k.startsWith('view-')) toggleView(k.slice(5));
    else if (k === 'tours') (popEl.hidden ? openPop(b) : closePop());
    else if (k === 'ask') set({ ask: !state.ask });
    else if (k === 'link') copyLink();
    else if (k === 'lang') toggleLang();
    else if (k === 'theme') cycleTheme();
    else if (k === 'help') openHelp(b);
    else if (k === 'menu') openSheet(b);
    else if (k === 'crumb-fly' && state.selection) flyTo({ kind: state.selection.kind, id: state.selection.id });
    else if (k === 'crumb-clear') select(null);
  });
}

const toggleView = (id) => (state.view === id ? closeView() : openView(id));
const toggleLang = () => set({ lang: state.lang === 'ar' ? 'en' : 'ar' });
const startTour = (id) => emit('starttour', { id, focus: true });

function cycleTheme() {
  const next = nextTheme();
  set({ theme: next });
  toast(t('sh.themeNow', { mode: t('sh.theme.' + next) }));
}

function toggleProjection() {
  const next = state.projection === 'globe' ? 'flat' : 'globe';
  set({ projection: next });
  toast(t(next === 'globe' ? 'sh.projGlobe' : 'sh.projFlat'));
}

async function copyLink() {
  const ok = await copyText(shareLink());
  toast(t(ok ? 'sh.linkCopied' : 'sh.linkFailed'));
}

// ---------------------------------------------------------------- lens rail

function renderRail() {
  const phone = phoneMQ.matches;
  keepFocus(railEl, () => {
    railEl.setAttribute('aria-label', t('sh.lenses'));
    railEl.innerHTML = `<div class="rail" role="toolbar" aria-orientation="${phone ? 'horizontal' : 'vertical'}" aria-label="${esc(t('sh.lenses'))}">
      ${LENSES.map((l, i) => {
        const on = state.lens === l.id;
        const tip = phone ? '' : ` data-tip="${tipHtml(`<b>${esc(L(l))}</b><span class="tip-sub">${esc(L(l.sub))} · ${esc(t('sh.key'))} ${i + 1}</span>`)}"`;
        return `<button type="button" class="lens" data-k="lens-${l.id}" aria-pressed="${on}" tabindex="${on ? 0 : -1}" aria-keyshortcuts="${i + 1}"${tip}>
          <span class="lens-tile">${icon(l.icon, phone ? 16 : 20)}</span><span class="lens-lbl">${esc(L(l))}</span></button>`;
      }).join('')}
    </div>`;
  });
  if (phone) revealActiveLens();
}

/** Scroll the phone chip row (only the row) so the active lens is in view. */
function revealActiveLens() {
  const b = railEl.querySelector('[aria-pressed="true"]');
  if (!b) return;
  const r = b.getBoundingClientRect(), c = railEl.getBoundingClientRect();
  const dx = r.left < c.left ? r.left - c.left - 16 : r.right > c.right ? r.right - c.right + 16 : 0;
  if (dx) railEl.scrollBy({ left: dx, behavior: reducedMotion() ? 'auto' : 'smooth' });
}

function bindRail() {
  railEl.addEventListener('click', (e) => {
    const b = e.target.closest('button[data-k^="lens-"]');
    if (b) set({ lens: b.dataset.k.slice(5), view: null });
  });
  railEl.addEventListener('keydown', (e) => {
    const btns = $$('.lens', railEl);
    const i = btns.indexOf(document.activeElement);
    if (i < 0) return;
    let n = -1;
    if (e.key === 'ArrowDown') n = i + 1;
    else if (e.key === 'ArrowUp') n = i - 1;
    else if (phoneMQ.matches && (e.key === 'ArrowLeft' || e.key === 'ArrowRight')) n = i + ((e.key === 'ArrowRight') !== isRTL() ? 1 : -1);
    else if (e.key === 'Home') n = 0;
    else if (e.key === 'End') n = btns.length - 1;
    else return;
    e.preventDefault();
    n = (n + btns.length) % btns.length;
    btns.forEach((b, j) => { b.tabIndex = j === n ? 0 : -1; });
    btns[n].focus();
  });
}

// ---------------------------------------------------------------- modal plumbing

function setModal(name, open) {
  open ? modal.add(name) : modal.delete(name);
  for (const id of ['app', 'tour']) { const n = document.getElementById(id); if (n) n.inert = modal.size > 0; }
}

function focusables(root) {
  return $$('button:not([disabled]), [href], input:not([disabled]), select, textarea, [tabindex]:not([tabindex="-1"])', root)
    .filter((n) => n.getClientRects().length);
}

function trapTab(root, e) {
  const f = focusables(root);
  if (!f.length) return;
  const first = f[0], last = f[f.length - 1];
  if (e.shiftKey && (document.activeElement === first || !root.contains(document.activeElement))) { e.preventDefault(); last.focus(); }
  else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
}

function restoreFocus(el) {
  if (el?.isConnected && !el.closest('[inert]')) { el.focus(); return; }
  const k = el?.dataset?.k;
  const again = k && document.querySelector(`#topbar [data-k="${CSS.escape(k)}"], #lensrail [data-k="${CSS.escape(k)}"]`);
  (again || (el === document.body ? null : topEl.querySelector('[data-k="search"]')))?.focus();
}

// ---------------------------------------------------------------- command palette

let palReturn = null, palItems = [], palActive = 0;

function openPalette(from) {
  if (!palEl.hidden) return;
  closePop({ restore: false });
  closeSheet({ restore: false });
  palReturn = from || document.activeElement;
  palEl.innerHTML = `
    <div class="dlg-scrim" data-close></div>
    <div class="pal-box" role="dialog" aria-modal="true" aria-labelledby="pal-h">
      <h2 id="pal-h" class="vh">${esc(t('sh.palTitle'))}</h2>
      <div class="pal-field">
        ${icon('search', 18)}
        <input id="pal-in" type="text" role="combobox" aria-expanded="true" aria-controls="pal-list" aria-autocomplete="list"
          autocomplete="off" autocapitalize="off" spellcheck="false" enterkeyhint="go">
        <button type="button" class="pal-close" data-close><kbd class="kbd">Esc</kbd>${icon('close', 18)}</button>
      </div>
      <div id="pal-list" class="pal-list scroll" role="listbox"></div>
      <div class="pal-foot">
        <span class="hint"><kbd class="kbd">↑</kbd><kbd class="kbd">↓</kbd> <span data-s="hintMove"></span></span>
        <span class="hint"><kbd class="kbd">Enter</kbd> <span data-s="hintOpen"></span></span>
        <span class="pal-count num" id="pal-count" aria-live="polite"></span>
      </div>
    </div>`;
  palEl.hidden = false;
  setModal('palette', true);
  $('#pal-in', palEl).focus();
  refreshPalette();
}

function closePalette({ restore = true } = {}) {
  if (palEl.hidden) return;
  palEl.hidden = true;
  palEl.innerHTML = '';
  palItems = [];
  setModal('palette', false);
  if (restore) restoreFocus(palReturn);
}

/** Text that depends on the language, then the results. */
function refreshPalette() {
  const input = $('#pal-in', palEl);
  input.placeholder = t('sh.searchPh');
  input.setAttribute('aria-label', t('sh.searchLabel'));
  $('#pal-list', palEl).setAttribute('aria-label', t('sh.results'));
  $('.pal-close', palEl).setAttribute('aria-label', t('close'));
  for (const s of $$('[data-s]', palEl)) s.textContent = t('sh.' + s.dataset.s);
  renderResults();
}

function renderResults() {
  const input = $('#pal-in', palEl);
  const q = input.value.trim();
  const groups = [];
  if (q) {
    const byKind = new Map();
    for (const e of DB.search(q, 120)) {
      if (!byKind.has(e.kind)) byKind.set(e.kind, []);
      const g = byKind.get(e.kind);
      if (g.length < 6) g.push(e);
    }
    for (const [kind, list] of byKind) groups.push({ label: t('kinds.' + kind), items: list.map((e) => dataItem(e.kind, e.id, q)) });
    const nq = normalize(q);
    const cmds = commands().filter((c) => normalize(c.label).includes(nq));
    if (cmds.length) groups.push({ label: t('sh.gActions'), items: cmds.slice(0, 8).map((c) => cmdItem(c, q)) });
  } else {
    const rec = recent.filter((r) => DB.exists(r.kind, r.id)).slice(0, 5);
    if (rec.length) groups.push({ label: t('sh.gRecent'), items: rec.map((r) => dataItem(r.kind, r.id, '')) });
    const all = commands();
    for (const [g, label] of [['lens', 'sh.gLenses'], ['view', 'sh.gViews'], ['action', 'sh.gActions'], ['tour', 'sh.gTours']]) {
      groups.push({ label: t(label), items: all.filter((c) => c.group === g).map((c) => cmdItem(c, '')) });
    }
  }

  palItems = [];
  let idx = 0;
  const html = groups.map((g, gi) => `<div role="group" aria-labelledby="pal-g${gi}">
      <div class="pal-gh eyebrow" id="pal-g${gi}">${esc(g.label)}</div>
      ${g.items.map((it) => { palItems.push(it); const i = idx++; return `<div class="pal-opt" role="option" id="pal-o${i}" data-i="${i}" aria-selected="false">${it.html}</div>`; }).join('')}
    </div>`).join('');
  const list = $('#pal-list', palEl);
  list.innerHTML = html || `<p class="empty pal-empty">${esc(t('sh.noResults', { q }))}</p>`;
  list.scrollTop = 0;
  $('#pal-count', palEl).textContent = q ? countLabel(palItems.length) : '';
  setActive(0);
}

function countLabel(n) {
  if (state.lang !== 'ar') return n === 0 ? 'No results' : n === 1 ? '1 result' : `${n} results`;
  if (n === 0) return 'لا نتائج';
  if (n === 1) return 'نتيجة واحدة';
  if (n === 2) return 'نتيجتان';
  return n <= 10 ? `${n} نتائج` : `${n} نتيجة`;
}

function setActive(i, scroll = true) {
  const input = $('#pal-in', palEl);
  const prev = $('.pal-opt[aria-selected="true"]', palEl);
  prev?.setAttribute('aria-selected', 'false');
  if (!palItems.length) { palActive = 0; input?.removeAttribute('aria-activedescendant'); return; }
  palActive = i;
  const opt = $(`#pal-o${i}`, palEl);
  opt?.setAttribute('aria-selected', 'true');
  input?.setAttribute('aria-activedescendant', `pal-o${i}`);
  if (scroll) opt?.scrollIntoView({ block: 'nearest' });
}

function choose(i) {
  const it = palItems[i];
  if (!it) return;
  const ret = palReturn;
  closePalette({ restore: !it.ownsFocus });
  it.run(ret);
}

function pick(kind, id) {
  const lens = KIND_LENS[kind];
  if (lens && lens !== state.lens) set({ lens });
  select(kind, id);
}

function remember(sel) {
  const i = recent.findIndex((r) => r.kind === sel.kind && r.id === sel.id);
  if (i >= 0) recent.splice(i, 1);
  recent.unshift({ kind: sel.kind, id: sel.id });
  recent.length = Math.min(recent.length, 6);
}

/** Wrap the part of `text` that matches the query in <mark>, comparing normalised forms. */
export function markMatch(text, q) {
  const s = String(text ?? '');
  const nq = normalize(q);
  if (!nq) return esc(s);
  let norm = '';
  const at = [];
  for (let i = 0; i < s.length;) {
    const cp = s.codePointAt(i), ch = String.fromCodePoint(cp);
    const n = /\s/.test(ch) ? ' ' : normalize(ch);
    for (let j = 0; j < n.length; j++) { norm += n[j]; at.push(i); }
    i += ch.length;
  }
  const hit = norm.indexOf(nq);
  if (hit < 0) return esc(s);
  const a = at[hit];
  let b = at[hit + nq.length - 1];
  b += String.fromCodePoint(s.codePointAt(b)).length;
  while (b < s.length && normalize(s[b]) === '' && !/\s/.test(s[b])) b++; // carry trailing diacritics
  return `${esc(s.slice(0, a))}<mark>${esc(s.slice(a, b))}</mark>${esc(s.slice(b))}`;
}

const matches = (text, q) => !!q && normalize(text).includes(normalize(q));

function dataItem(kind, id, q) {
  const name = DB.nameOf(kind, id, state.lang);
  const other = DB.nameOf(kind, id, state.lang === 'ar' ? 'en' : 'ar');
  let sub = esc(subOf(kind, id));
  if (q && !matches(name, q) && other && matches(other, q)) sub = `<bdi>${markMatch(other, q)}</bdi>${sub ? ' · ' + sub : ''}`;
  return {
    label: name,
    run: () => pick(kind, id),
    html: `<span class="pal-ic">${icon(KIND_ICON[kind], 16)}</span>
      <span class="pal-txt"><span class="pal-name">${markMatch(name, q)}</span>${sub ? `<span class="pal-sub">${sub}</span>` : ''}</span>
      ${metaOf(kind, id)}`,
  };
}

function subOf(kind, id) {
  const x = DB.get(kind, id);
  if (!x) return '';
  const ar = state.lang === 'ar';
  const countryName = (iso) => DB.nameOf('country', iso, state.lang);
  switch (kind) {
    case 'country': return ar ? SUBREGION_AR[x.subregion] || x.subregion || '' : x.subregion || '';
    case 'conflict': return [L(x.regionName), L(SEVERITY.find((s) => s.id === x.severity))].filter(Boolean).join(' · ');
    case 'group': return Lk(x, 'region');
    case 'religion': return L(RELIGION_FAMILIES.find((f) => f.id === DB.religion.familyOf[id]));
    case 'choke': return (x.borderStates || []).filter((iso) => DB.countries.has(iso)).slice(0, 3).map(countryName).join(ar ? '، ' : ', ');
    case 'disputed': {
      const c = [...DB.countries.values()].find((o) => o.nameEn === x.admin || o.sovereign === x.admin);
      return c ? Lk(c, 'name') : x.admin || '';
    }
    case 'event': return fmtDate(x.date);
    case 'bloc': return membersLabel((x.members || []).length);
    case 'site': return [x.iso3 && DB.countries.has(x.iso3) ? countryName(x.iso3) : '', L(DB.resources.typeById.get(x.type))].filter(Boolean).join(' · ');
    default: return '';
  }
}

function membersLabel(n) {
  if (state.lang !== 'ar') return n === 1 ? '1 member' : `${n} members`;
  if (n === 1) return 'عضو واحد';
  if (n === 2) return 'عضوان';
  return n <= 10 ? `${n} أعضاء` : `${n} عضواً`;
}

function metaOf(kind, id) {
  if (kind !== 'country') return '';
  const c = DB.countries.get(id);
  if (!c?.pop) return '';
  return `<span class="pal-meta" data-tip="${tipText(t('sh.pop'))}">${icon('people', 13)}<span class="num">${esc(fmtCompact(c.pop))}</span></span>`;
}

function commands() {
  const out = [];
  LENSES.forEach((l, i) => out.push({ group: 'lens', label: L(l), sub: L(l.sub), ic: l.icon, key: String(i + 1), on: state.lens === l.id, run: () => set({ lens: l.id, view: null }) }));
  VIEWS.forEach((v) => out.push({ group: 'view', label: L(v), ic: v.icon, on: state.view === v.id, run: () => openView(v.id) }));
  out.push({ group: 'action', label: t('sh.actTheme', { mode: t('sh.theme.' + nextTheme()) }), ic: THEME_ICON[nextTheme()], key: 'T', run: cycleTheme });
  out.push({ group: 'action', label: t('sh.actLang'), ic: 'lang', key: 'L', run: toggleLang });
  out.push({ group: 'action', label: t(state.projection === 'globe' ? 'sh.actFlat' : 'sh.actGlobe'), ic: state.projection === 'globe' ? 'flat' : 'globe', key: 'G', run: toggleProjection });
  out.push({ group: 'action', label: t('sh.actLink'), ic: 'link', run: copyLink });
  out.push({ group: 'action', label: t('sh.helpTitle'), ic: 'keys', key: '?', ownsFocus: true, run: (ret) => openHelp(ret) });
  tours.forEach((tr) => out.push({ group: 'tour', label: t('sh.actTour', { title: L(tr) }), sub: `${stepsLabel(tr.steps.length)} · ${L(tr.desc)}`, ic: 'route', on: state.tour?.id === tr.id, run: () => startTour(tr.id) }));
  return out;
}

function cmdItem(c, q) {
  const meta = [c.on ? `<span class="pal-on">${esc(t('sh.current'))}</span>` : '', c.key ? `<kbd class="kbd">${esc(c.key)}</kbd>` : ''].join('');
  return {
    ...c,
    html: `<span class="pal-ic">${icon(c.ic, 16)}</span>
      <span class="pal-txt"><span class="pal-name">${markMatch(c.label, q)}</span>${c.sub ? `<span class="pal-sub">${esc(c.sub)}</span>` : ''}</span>
      ${meta ? `<span class="pal-meta">${meta}</span>` : ''}`,
  };
}

function bindPalette() {
  palEl.addEventListener('input', (e) => { if (e.target.id === 'pal-in') renderResults(); });
  palEl.addEventListener('click', (e) => {
    if (e.target.closest('[data-close]')) { closePalette(); return; }
    const o = e.target.closest('.pal-opt');
    if (o) choose(+o.dataset.i);
  });
  palEl.addEventListener('mousedown', (e) => { if (e.target.closest('.pal-opt')) e.preventDefault(); }); // keep focus in the field
  palEl.addEventListener('pointermove', (e) => {
    const o = e.target.closest('.pal-opt');
    if (o && +o.dataset.i !== palActive) setActive(+o.dataset.i, false);
  });
  palEl.addEventListener('keydown', (e) => {
    e.stopPropagation(); // the palette is modal: no global shortcut fires while it is open
    if (e.key === 'Escape' || ((e.ctrlKey || e.metaKey) && (e.code === 'KeyK' || e.key.toLowerCase() === 'k'))) { e.preventDefault(); closePalette(); return; }
    if (e.key === 'Tab') { trapTab($('.pal-box', palEl), e); return; }
    if (e.target.id !== 'pal-in' || e.isComposing) return;
    const n = palItems.length;
    if (!n) return;
    if (e.key === 'ArrowDown') { e.preventDefault(); setActive((palActive + 1) % n); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive((palActive - 1 + n) % n); }
    else if (e.key === 'PageDown') { e.preventDefault(); setActive(Math.min(n - 1, palActive + 6)); }
    else if (e.key === 'PageUp') { e.preventDefault(); setActive(Math.max(0, palActive - 6)); }
    else if (e.key === 'Enter') { e.preventDefault(); choose(palActive); }
  });
}

// ---------------------------------------------------------------- help dialog

let helpReturn = null;

function openHelp(from) {
  if (!helpEl.hidden) return;
  closePop({ restore: false });
  closeSheet({ restore: false });
  helpReturn = from || document.activeElement;
  helpEl.innerHTML = helpHTML();
  helpEl.hidden = false;
  setModal('help', true);
  $('.help-head [data-close]', helpEl)?.focus();
}

function closeHelp({ restore = true } = {}) {
  if (helpEl.hidden) return;
  helpEl.hidden = true;
  helpEl.innerHTML = '';
  setModal('help', false);
  if (restore) restoreFocus(helpReturn);
}

function helpHTML() {
  const k = (...keys) => `<span class="keyset" dir="ltr">${keys.map((x) => (x === '–' ? '<span class="to">–</span>' : `<kbd class="kbd">${esc(x)}</kbd>`)).join('')}</span>`;
  const rows = [
    [k(MOD, 'K'), 'sh.kPalette'], [k('/'), 'sh.kSearch'], [k('1', '–', '9'), 'sh.kLens'], [k('G'), 'sh.kProj'], [k('T'), 'sh.kTheme'],
    [k('L'), 'sh.kLang'], [k('?'), 'sh.kHelp'], [k('Esc'), 'sh.kEsc'], [k('←', '→'), 'sh.kTour'], [`${k('←', '↑', '↓', '→')} ${k('+', '−')}`, 'sh.kMap'],
  ];
  const ar = state.lang === 'ar';
  const link = `<a href="${ORIGINAL.url}" target="_blank" rel="noopener"><bdi lang="ar">«${esc(ORIGINAL.ar)}»</bdi></a>${ar ? '' : ' (Global Geopolitical, Ethnic and Religious Atlas)'}`;
  return `
    <div class="dlg-scrim" data-close></div>
    <div class="help-box" role="dialog" aria-modal="true" aria-labelledby="help-h">
      <header class="help-head">
        <span class="help-mark">${MARK}</span>
        <h2 id="help-h">${esc(t('sh.helpTitle'))}</h2>
        <button type="button" class="btn ghost icon" data-close data-k="help-close" aria-label="${esc(t('close'))}">${icon('close', 18)}</button>
      </header>
      <div class="help-body scroll">
        <section class="help-sec" aria-labelledby="help-k">
          <h3 class="eyebrow" id="help-k">${esc(t('sh.helpKeys'))}</h3>
          <table class="keys"><tbody>${rows.map(([keys, s]) => `<tr><th scope="row">${keys}</th><td>${esc(t(s))}</td></tr>`).join('')}</tbody></table>
        </section>
        <section class="help-sec" aria-labelledby="help-a">
          <h3 class="eyebrow" id="help-a">${esc(t('sh.helpAbout'))}</h3>
          <p class="help-about">${esc(t('sh.about'))}</p>
          <p class="help-credit">${esc(t('sh.credit')).replace('{link}', link)}</p>
          <p class="caveat">${icon('info', 16)}<span>${esc(t('sh.asOf')).replace('{date}', `<span class="num">${esc(fmtDate(DB.conflictsAsOf))}</span>`)}</span></p>
          <button type="button" class="btn" data-k="help-sources">${icon('book', 16)}<span>${esc(t('sh.openSources'))}</span></button>
        </section>
      </div>
    </div>`;
}

function bindHelp() {
  helpEl.addEventListener('click', (e) => {
    if (e.target.closest('[data-close]')) closeHelp();
    else if (e.target.closest('[data-k="help-sources"]')) { closeHelp({ restore: false }); openView('sources'); restoreFocus(helpReturn); }
  });
  helpEl.addEventListener('keydown', (e) => {
    e.stopPropagation();
    if (e.key === 'Escape' || keyOf(e) === '?') { e.preventDefault(); closeHelp(); }
    else if (e.key === 'Tab') trapTab($('.help-box', helpEl), e);
  });
}

// ---------------------------------------------------------------- tours popover (desktop) and menu sheet (phone)

let popReturn = null, sheetReturn = null;

function tourRows(kPrefix) {
  return tours.map((tr) => {
    const on = state.tour?.id === tr.id;
    return `<button type="button" class="tour-row" data-k="${kPrefix}${tr.id}"${on ? ' aria-current="true"' : ''}>
      <span class="tr-ic">${icon(tr.icon, 16)}</span>
      <span class="tr-txt">
        <span class="tr-top"><span class="tr-title">${esc(L(tr))}</span>${on ? `<span class="pill accent">${esc(t('sh.running'))}</span>` : ''}<span class="tr-n">${esc(stepsLabel(tr.steps.length))}</span></span>
        <span class="tr-desc">${esc(L(tr.desc))}</span>
      </span>
    </button>`;
  }).join('');
}

function popHTML() {
  return `<div class="pop-head"><h2 class="eyebrow" id="pop-h">${esc(t('sh.toursTitle'))}</h2><p>${esc(t('sh.toursHint'))}</p></div>
    <div class="pop-list">${tourRows('pt-')}</div>`;
}

function openPop(btn) {
  closeSheet({ restore: false });
  popReturn = btn;
  popEl.setAttribute('role', 'dialog');
  popEl.setAttribute('aria-labelledby', 'pop-h');
  popEl.innerHTML = popHTML();
  popEl.hidden = false;
  positionPop();
  btn.setAttribute('aria-expanded', 'true');
  ($('[aria-current="true"]', popEl) || $('.tour-row', popEl))?.focus();
  document.addEventListener('pointerdown', popOutside, true);
}

function closePop({ restore = true } = {}) {
  if (popEl.hidden) return;
  popEl.hidden = true;
  popEl.innerHTML = '';
  document.removeEventListener('pointerdown', popOutside, true);
  topEl.querySelector('[data-k="tours"]')?.setAttribute('aria-expanded', 'false');
  if (restore) restoreFocus(popReturn);
}

function popOutside(e) {
  if (popEl.contains(e.target) || e.target.closest?.('#topbar [data-k="tours"]')) return;
  closePop({ restore: false });
}

function positionPop() {
  const b = topEl.querySelector('[data-k="tours"]');
  if (!b) return;
  const r = b.getBoundingClientRect();
  const vw = document.documentElement.clientWidth;
  popEl.style.insetBlockStart = `${Math.round(r.bottom + 6)}px`;
  popEl.style.insetInlineEnd = `${Math.max(8, Math.round(isRTL() ? r.left : vw - r.right))}px`;
}

function bindPop() {
  popEl.addEventListener('click', (e) => {
    const b = e.target.closest('[data-k^="pt-"]');
    if (!b) return;
    closePop({ restore: false });
    startTour(b.dataset.k.slice(3));
  });
  popEl.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); closePop(); return; }
    if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp' && e.key !== 'Home' && e.key !== 'End') return;
    const rows = $$('.tour-row', popEl);
    const i = rows.indexOf(document.activeElement);
    e.preventDefault();
    const n = e.key === 'Home' ? 0 : e.key === 'End' ? rows.length - 1 : (i + (e.key === 'ArrowDown' ? 1 : -1) + rows.length) % rows.length;
    rows[n]?.focus();
  });
  popEl.addEventListener('focusout', (e) => {
    if (e.relatedTarget && !popEl.contains(e.relatedTarget) && !e.relatedTarget.closest('#topbar [data-k="tours"]')) closePop({ restore: false });
  });
}

function sheetRow({ k, ic, label, value = '', pressed, current }) {
  return `<button type="button" class="sheet-row" data-k="${k}"${pressed != null ? ` aria-pressed="${pressed}"` : ''}${current ? ' aria-current="true"' : ''}>
    <span class="sr-ic">${ic.startsWith('<') ? ic : icon(ic, 17)}</span><span class="sr-label">${esc(label)}</span>${value ? `<span class="sr-val">${value}</span>` : ''}
  </button>`;
}

function sheetHTML() {
  return `
    <div class="dlg-scrim" data-close></div>
    <div class="sheet" role="dialog" aria-modal="true" aria-labelledby="sheet-h">
      <div class="sheet-head">${MARK}<h2 id="sheet-h">${esc(t('appName'))}</h2>
        <button type="button" class="btn ghost icon" data-close data-k="sheet-close" aria-label="${esc(t('close'))}">${icon('close', 19)}</button></div>
      ${state.askReady ? `<section class="sheet-sec">${sheetRow({ k: 'ask', ic: 'spark', label: t('sh.ask') })}</section>` : ''}
      <section class="sheet-sec"><h3 class="eyebrow">${esc(t('sh.views'))}</h3>
        ${VIEWS.map((v) => sheetRow({ k: 'view-' + v.id, ic: v.icon, label: L(v), pressed: state.view === v.id })).join('')}</section>
      <section class="sheet-sec"><h3 class="eyebrow">${esc(t('sh.toursTitle'))}</h3>${tourRows('st-')}</section>
      <section class="sheet-sec"><h3 class="eyebrow">${esc(t('sh.settings'))}</h3>
        ${sheetRow({ k: 'lang', ic: 'lang', label: t('sh.language'), value: `<span lang="${state.lang === 'ar' ? 'en' : 'ar'}">${esc(t('sh.langOther'))}</span>` })}
        ${sheetRow({ k: 'theme', ic: THEME_ICON[state.theme], label: t('sh.themeLbl'), value: esc(t('sh.theme.' + state.theme)) })}
        ${sheetRow({ k: 'link', ic: 'link', label: t('sh.actLink') })}
        ${sheetRow({ k: 'help', ic: HELP_IC, label: t('sh.helpTitle') })}
      </section>
    </div>`;
}

function openSheet(btn) {
  if (!sheetEl.hidden) return;
  closePop({ restore: false });
  sheetReturn = btn;
  sheetEl.innerHTML = sheetHTML();
  sheetEl.hidden = false;
  setModal('sheet', true);
  btn.setAttribute('aria-expanded', 'true');
  $('[data-k="sheet-close"]', sheetEl)?.focus();
}

function closeSheet({ restore = true } = {}) {
  if (sheetEl.hidden) return;
  sheetEl.hidden = true;
  sheetEl.innerHTML = '';
  setModal('sheet', false);
  topEl.querySelector('[data-k="menu"]')?.setAttribute('aria-expanded', 'false');
  if (restore) restoreFocus(sheetReturn);
}

function bindSheet() {
  sheetEl.addEventListener('click', (e) => {
    if (e.target.closest('[data-close]')) { closeSheet(); return; }
    const b = e.target.closest('button[data-k]');
    if (!b) return;
    const k = b.dataset.k;
    if (k.startsWith('view-')) { toggleView(k.slice(5)); closeSheet(); }
    else if (k.startsWith('st-')) { closeSheet({ restore: false }); startTour(k.slice(3)); }
    else if (k === 'ask') { closeSheet({ restore: false }); set({ ask: true }); }
    else if (k === 'lang') toggleLang();
    else if (k === 'theme') cycleTheme();
    else if (k === 'link') { copyLink(); closeSheet(); }
    else if (k === 'help') { closeSheet({ restore: false }); openHelp(sheetReturn); }
  });
  sheetEl.addEventListener('keydown', (e) => {
    e.stopPropagation();
    if (e.key === 'Escape') { e.preventDefault(); closeSheet(); }
    else if (e.key === 'Tab') trapTab($('.sheet', sheetEl), e);
  });
}

// ---------------------------------------------------------------- toasts

function showToast(msg) {
  if (!msg) return;
  const n = document.createElement('div');
  n.className = 'toast';
  n.textContent = String(msg);
  toastEl.append(n);
  while (toastEl.children.length > 3) toastEl.firstElementChild.remove();
  setTimeout(() => { n.classList.add('out'); setTimeout(() => n.remove(), 240); }, 2600);
}

// ---------------------------------------------------------------- stage geometry for floating layers (toasts, tour card)

function trackStage() {
  const stage = $('#stage');
  if (!stage) return;
  const update = () => {
    const r = stage.getBoundingClientRect();
    const vw = document.documentElement.clientWidth, vh = document.documentElement.clientHeight;
    const s = document.documentElement.style;
    s.setProperty('--stage-start', `${Math.round(isRTL() ? vw - r.right : r.left)}px`);
    s.setProperty('--stage-w', `${Math.round(r.width)}px`);
    s.setProperty('--stage-bottom', `${Math.max(0, Math.round(vh - r.bottom))}px`);
  };
  if ('ResizeObserver' in window) new ResizeObserver(update).observe(stage);
  addEventListener('resize', update);
  on('change', ({ keys }) => { if (keys.includes('lang')) requestAnimationFrame(update); });
  update();
}

// ---------------------------------------------------------------- global keys

const TYPING = /^(text|search|email|number|url|tel|password|date|datetime-local|month|time|week)$/;
function isTyping(el) {
  if (!el || el === document.body) return false;
  if (el.isContentEditable || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT') return true;
  return el.tagName === 'INPUT' && TYPING.test(el.type || 'text');
}

/** Key name independent of the keyboard layout for the letters and digits we bind (Arabic layouts report Arabic letters). */
function keyOf(e) {
  if (e.key.length === 1 && /[a-z0-9/?]/i.test(e.key)) return e.key.toLowerCase();
  const c = e.code || '';
  if (/^Key[A-Z]$/.test(c)) return c.slice(3).toLowerCase();
  if (/^(Digit|Numpad)[0-9]$/.test(c)) return c.slice(-1);
  if (c === 'Slash') return e.shiftKey ? '?' : '/';
  return e.key;
}

/** Close the topmost layer. Returns true when something closed. */
function escapeLayer() {
  if (!palEl.hidden) closePalette();
  else if (!helpEl.hidden) closeHelp();
  else if (!popEl.hidden) closePop();
  else if (!sheetEl.hidden) closeSheet();
  else if (state.ask) set({ ask: false });
  else if (state.tour) set({ tour: null });
  else if (state.view) closeView();
  else if (state.selection) select(null);
  else return false;
  return true;
}

function bindKeys() {
  document.addEventListener('keydown', (e) => {
    if (e.defaultPrevented) return;
    const mod = e.ctrlKey || e.metaKey;
    if (mod && !e.altKey && (e.code === 'KeyK' || e.key.toLowerCase() === 'k')) {
      e.preventDefault();
      palEl.hidden ? openPalette() : closePalette();
      return;
    }
    const typing = isTyping(e.target);
    if (e.key === 'Escape') {
      if (!typing && escapeLayer()) e.preventDefault();
      return;
    }
    if (typing || mod || e.altKey || modal.size) return;
    const k = keyOf(e);
    if (k === '/') { e.preventDefault(); openPalette(); }
    else if (k === '?') { e.preventDefault(); openHelp(); }
    else if (/^[1-9]$/.test(k) && LENSES[+k - 1]) set({ lens: LENSES[+k - 1].id, view: null });
    else if (k === 'g') toggleProjection();
    else if (k === 't') cycleTheme();
    else if (k === 'l') toggleLang();
    else if (k === 'a' && state.askReady) { e.preventDefault(); set({ ask: !state.ask }); }
  });
}
