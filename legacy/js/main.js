// Boot: load data, restore prefs + hash, mount every module, then hand over to the store.

import { loadAll } from './data.js';
import * as store from './store.js';
import { t, registerStrings } from './i18n.js';
import { initTips, esc } from './ui.js';
import { initShell } from './shell.js';
import { initMap } from './map.js';
import { initDossier } from './dossiers.js';
import { initViews } from './views/index.js';
import { initTours } from './tours.js';
import { initAsk } from './ask.js';

const $ = (id) => document.getElementById(id);

function applyLangTheme() {
  const root = document.documentElement;
  root.lang = store.state.lang;
  root.dir = store.state.lang === 'ar' ? 'rtl' : 'ltr';
  if (store.state.theme === 'system') delete root.dataset.theme; else root.dataset.theme = store.state.theme;
  document.title = t('appName');
}

async function boot() {
  store.loadPrefs();
  applyLangTheme();
  $('loader-title').textContent = t('appName');
  $('loader-msg').textContent = t('loading');
  let DB;
  try {
    DB = await loadAll((p) => { $('loader-bar').style.width = `${Math.round(p * 100)}%`; });
  } catch (err) {
    console.error('[atlas] data load failed', err);
    $('loader-msg').innerHTML = `${esc(t('loadFailed'))}<br><button class="btn primary" id="retry" type="button" style="margin-top:12px">${esc(t('retry'))}</button>`;
    $('retry').onclick = () => location.reload();
    return;
  }
  window.__atlasDB = DB; // handy for debugging in the console
  store.state.filters = { ...store.state.filters, timelineCats: new Set(DB.timeline.categories.map((c) => c.id)) };
  store.on('change', ({ keys }) => { if (keys.includes('lang') || keys.includes('theme')) applyLangTheme(); });

  try { await document.fonts?.ready; } catch { /* fonts are optional */ }
  initTips();
  // Each module is isolated: one failing to mount must not take the others down.
  for (const [name, fn] of [['map', () => initMap($('map'), DB)], ['shell', () => initShell(DB)], ['dossier', () => initDossier($('dossier'), DB)], ['views', () => initViews(DB)], ['tours', () => initTours(DB)], ['ask', () => initAsk($('ask'), DB)]]) {
    try { fn(); } catch (err) { console.error(`[atlas] ${name} failed to mount`, err); }
  }
  store.watchHash(DB);
  if (!store.applyHash(DB)) store.emit('change', { keys: ['lens'] });
  store.emit('ready', DB);
  $('loader').classList.add('done');
  setTimeout(() => $('loader').remove(), 600);
}

registerStrings({});
boot();
