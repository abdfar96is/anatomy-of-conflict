// View host: one full panel over the stage (network, timeline, compare, sources) and the year scrubber under the map.
// Esc is the shell's job; this file owns opening, closing, focus and re-rendering on state changes.

import { VIEWS } from '../config.js';
import * as store from '../store.js';
import { t, L, registerStrings } from '../i18n.js';
import { esc, icon, hideTip, reducedMotion } from '../ui.js';
import * as network from './network.js';
import * as timeline from './timeline.js';
import * as compare from './compare.js';
import * as sources from './sources.js';

registerStrings({
  ar: {
    'vw.sub.network': 'من يتحالف مع من، ومن ينافس من — {n} علاقة موثّقة أو مقدّرة',
    'vw.sub.timeline': 'كل حدث في مسار فئته، والنزاعات الجارية بمددها، من 1900 إلى اليوم',
    'vw.sub.compare': 'الأرقام والتركيب والعضويات والعلاقة المباشرة جنباً إلى جنب',
    'vw.sub.sources': 'مصدر كل مجموعة بيانات وترخيصها وطريقة جمعها وحدودها',
  },
  en: {
    'vw.sub.network': 'Who is allied with whom, and who competes — {n} documented or assessed ties',
    'vw.sub.timeline': 'Each event in its category lane, and running conflicts by duration, 1900 to today',
    'vw.sub.compare': 'Figures, composition, memberships and the direct relationship side by side',
    'vw.sub.sources': 'Where each dataset comes from, its licence, how it was made and its limits',
  },
});

const MODULES = { network, timeline, compare, sources };
const KEYS = ['view', 'lang', 'theme', 'selection', 'filters', 'compare', 'year'];
const ANIM = 220;

export function initViews(DB) {
  try { timeline.initScrubber(document.getElementById('scrubber'), DB); } catch (err) { console.error('[atlas] scrubber failed to mount', err); }

  const host = document.getElementById('viewpanel');
  if (!host) return;
  host.innerHTML = `<div class="vp-scrim"></div>
    <div class="vp-card" role="dialog" aria-labelledby="vp-title">
      <header class="vp-head"></header>
      <div class="vp-body scroll"></div>
    </div>`;
  const head = host.querySelector('.vp-head'), body = host.querySelector('.vp-body');
  host.querySelector('.vp-scrim').addEventListener('click', () => store.closeView());
  let cur = null, closing = 0, opener = null;

  function header(id) {
    const v = VIEWS.find((x) => x.id === id);
    head.innerHTML = `<span class="vp-icon">${icon(v.icon, 20)}</span>
      <div class="vp-titles">
        <h2 class="vp-title" id="vp-title" tabindex="-1">${esc(L(v))}</h2>
        <p class="vp-sub">${esc(t(`vw.sub.${id}`, { n: DB.relations.edges.length }))}</p>
      </div>
      <button class="btn icon ghost vp-close" type="button" aria-label="${esc(t('close'))}" data-tip="${esc(t('close'))}">${icon('close', 18)}</button>`;
    head.querySelector('.vp-close').addEventListener('click', () => store.closeView());
  }

  function mountBody(id) {
    unmount();
    body.scrollTop = 0;
    cur = { id, inst: null };
    try {
      cur.inst = MODULES[id].mount(body, DB);
    } catch (err) {
      console.error(`[atlas] view "${id}" failed to mount`, err);
      body.innerHTML = `<p class="empty">${esc(t('noData'))}</p>`;
    }
  }
  function unmount() {
    try { cur?.inst?.destroy?.(); } catch (err) { console.error('[atlas] view teardown failed', err); }
    cur = null;
    body.innerHTML = '';
  }

  function open(id) {
    clearTimeout(closing);
    const fresh = host.hidden;
    if (fresh) opener = document.activeElement;
    host.hidden = false;
    host.dataset.view = id;
    header(id);
    mountBody(id);
    if (fresh && !reducedMotion()) {
      host.classList.remove('is-open');
      void host.offsetWidth; // start the transition from the closed state
    }
    host.classList.add('is-open');
    head.querySelector('.vp-title').focus({ preventScroll: true });
  }

  function close() {
    if (host.hidden) return;
    hideTip();
    host.classList.remove('is-open');
    const hadFocus = host.contains(document.activeElement);
    clearTimeout(closing);
    closing = setTimeout(() => { host.hidden = true; delete host.dataset.view; unmount(); }, reducedMotion() ? 0 : ANIM);
    if (hadFocus && opener?.isConnected) opener.focus({ preventScroll: true });
    opener = null;
  }

  store.on('change', ({ keys }) => {
    if (!keys.some((k) => KEYS.includes(k))) return;
    if (keys.includes('view')) {
      const id = store.state.view;
      if (id && MODULES[id]) open(id); else close();
      return;
    }
    if (!cur?.inst || host.hidden) return;
    if (keys.includes('lang') || keys.includes('theme')) { header(cur.id); mountBody(cur.id); return; }
    try { cur.inst.update?.(keys); } catch (err) { console.error(`[atlas] view "${cur.id}" update failed`, err); }
  });

  if (store.state.view && MODULES[store.state.view]) open(store.state.view);
}
