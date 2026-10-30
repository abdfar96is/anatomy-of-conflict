// App state + event bus + hash routing. Modules talk only through this file.
//
// Events:
//   'change'    {keys:[...]}                     after set()/setFilter()/setLayer()
//   'hover'     {kind,id,x,y} | null             pointer over a map feature (map emits)
//   'flyto'     {kind,id} | {lonlat:[lon,lat], k?} | {iso3:[...]}   map animates to it
//   'highlight' {iso3:[...], lonlat?:[lon,lat]} | null   transient emphasis from panels (row hover)
//   'toast'     string
//   'ready'     DB                                after boot

import { SEVERITY, KINDS, LENSES, VIEWS } from './config.js';

const listeners = new Map();
const ALL = (arr) => new Set(arr);

export const state = {
  lang: 'ar',              // 'ar' | 'en'
  theme: 'system',         // 'system' | 'dark' | 'light'
  lens: 'overview',        // LENSES[].id
  projection: 'globe',     // 'globe' | 'flat'
  selection: null,         // {kind, id} — kind ∈ KINDS
  view: null,              // VIEWS[].id | null
  compare: [null, null],   // [iso3, iso3]
  year: 2026,              // timeline cursor
  yearFilter: false,       // true → conflicts/events limited to <= year
  playing: false,
  tour: null,              // {id, step}
  ask: false,              // "Ask Claude" panel open
  askReady: false,         // the viewer's host serves the sample capability (set by ask.js)
  filters: {
    severity: ALL(SEVERITY.map((s) => s.id)),
    relTypes: ALL(['alliance', 'military', 'economic', 'influence', 'proxy', 'rivalry', 'territorial', 'diplomatic']),
    relKinds: ALL(['treaty', 'assessed']),
    bloc: null,                 // bloc id or null
    resourceClass: null,        // RESOURCE_CLASSES id or null (all)
    religionMode: 'majority',   // 'majority' | 'share' | 'diversity'
    religionTradition: 'sunni', // tradition id for 'share' mode
    overviewMode: 'continent',  // 'continent' | 'income' | 'population' | 'gdp'
    timelineCats: null,         // Set of category ids, null = all (filled at boot)
    ethnicFamily: null,         // family id or null
  },
  layers: { labels: true, graticule: true, boundaries: true, disputed: true, ethnic: false, conflicts: false, arcs: false },
};

export function on(evt, fn) {
  if (!listeners.has(evt)) listeners.set(evt, new Set());
  listeners.get(evt).add(fn);
  return () => listeners.get(evt).delete(fn);
}

export function emit(evt, payload) {
  for (const fn of listeners.get(evt) || []) {
    try { fn(payload); } catch (err) { console.error(`[atlas] listener for "${evt}" failed`, err); }
  }
}

export function set(patch) {
  const keys = [];
  for (const [k, v] of Object.entries(patch)) {
    if (!sameValue(state[k], v)) { state[k] = v; keys.push(k); }
  }
  if (!keys.length) return;
  if (keys.includes('lang') || keys.includes('theme') || keys.includes('projection')) savePrefs();
  emit('change', { keys });
  if (keys.some((k) => ['selection', 'view', 'lens', 'compare', 'tour'].includes(k))) writeHash();
}

export function setFilter(key, value) {
  state.filters = { ...state.filters, [key]: value };
  emit('change', { keys: ['filters'], filter: key });
}

export function toggleInSet(key, item) {
  const next = new Set(state.filters[key]);
  next.has(item) ? next.delete(item) : next.add(item);
  setFilter(key, next);
}

export function setLayer(key, on) {
  state.layers = { ...state.layers, [key]: on };
  emit('change', { keys: ['layers'], layer: key });
}

/** Select something; kind=null clears. Flies the map unless {fly:false}. */
export function select(kind, id, { fly = true } = {}) {
  // On phones the dossier sheet and a view panel cannot share the screen: picking a record leaves the view.
  const phone = typeof matchMedia === 'function' && matchMedia('(max-width: 760px)').matches;
  set(kind && phone && state.view ? { selection: { kind, id }, view: null } : { selection: kind ? { kind, id } : null });
  if (kind && fly) emit('flyto', { kind, id });
}

export function hover(h) { emit('hover', h); }
export function highlight(h) { emit('highlight', h); }
export function flyTo(target) { emit('flyto', target); }
export function toast(msg) { emit('toast', msg); }
export function openView(id) { set({ view: id }); }
export function closeView() { set({ view: null }); }

function sameValue(a, b) {
  if (a === b) return true;
  if (a && b && typeof a === 'object' && typeof b === 'object') return JSON.stringify(a) === JSON.stringify(b);
  return false;
}

// ---- hash routing: one plain token, e.g. #country-SAU, #conflict-sudan, #lens-religion, #view-network, #compare-SAU-IRN, #tour-energy
let writingHash = false;

export function hashToken() {
  if (state.tour) return `tour-${state.tour.id}`;
  if (state.view === 'compare' && state.compare[0] && state.compare[1]) return `compare-${state.compare[0]}-${state.compare[1]}`;
  if (state.selection) return `${state.selection.kind}-${state.selection.id}`;
  if (state.view) return `view-${state.view}`;
  return `lens-${state.lens}`;
}

function writeHash() {
  const token = hashToken();
  if (location.hash.slice(1) === token) return;
  writingHash = true;
  try { history.replaceState(null, '', '#' + token); } catch { location.hash = token; }
  setTimeout(() => { writingHash = false; }, 0);
}

/** Parse a hash token into a state patch. Returns null for unknown tokens. */
export function parseHash(token, DB) {
  if (!token) return null;
  const cut = token.indexOf('-');
  if (cut < 0) return null;
  const head = token.slice(0, cut), rest = token.slice(cut + 1);
  if (head === 'lens' && LENSES.some((l) => l.id === rest)) return { patch: { lens: rest, view: null, selection: null } };
  if (head === 'view' && VIEWS.some((v) => v.id === rest)) return { patch: { view: rest } };
  if (head === 'compare') {
    const [a, b] = rest.split('-');
    if (DB.countries.has(a) && DB.countries.has(b)) return { patch: { view: 'compare', compare: [a, b] } };
    return null;
  }
  if (head === 'tour') return { tour: rest };
  // A selection link shows that record on the map, so it closes any open view.
  if (KINDS.includes(head) && DB.exists(head, rest)) return { patch: { selection: { kind: head, id: rest }, view: null }, fly: { kind: head, id: rest } };
  return null;
}

export function applyHash(DB) {
  const parsed = parseHash(decodeURIComponent(location.hash.slice(1)), DB);
  if (!parsed) return false;
  if (parsed.tour) { emit('starttour', parsed.tour); return true; }
  set(parsed.patch);
  if (parsed.fly) setTimeout(() => emit('flyto', parsed.fly), 50);
  return true;
}

export function watchHash(DB) {
  addEventListener('hashchange', () => { if (!writingHash) applyHash(DB); });
}

// ---- per-viewer preferences (best effort; the page works without storage)
const PREF_KEY = 'atlas-v2-prefs';
export function loadPrefs() {
  try {
    const p = JSON.parse(localStorage.getItem(PREF_KEY) || '{}');
    if (p.lang === 'ar' || p.lang === 'en') state.lang = p.lang;
    if (['system', 'dark', 'light'].includes(p.theme)) state.theme = p.theme;
    if (p.projection === 'globe' || p.projection === 'flat') state.projection = p.projection;
  } catch { /* storage unavailable */ }
}
function savePrefs() {
  try { localStorage.setItem(PREF_KEY, JSON.stringify({ lang: state.lang, theme: state.theme, projection: state.projection })); } catch { /* ignore */ }
}
