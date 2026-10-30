// Small DOM helpers shared by every module: escaping, icons, the global tooltip, chips.

import { ICONS } from './config.js';

/** Escape text for innerHTML. Every data string goes through this. */
export function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

/** Inline SVG icon from config.ICONS. */
export function icon(name, size = 18, extra = '') {
  return `<svg class="ic" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" ${extra}>${ICONS[name] || ''}</svg>`;
}

/** Create an element from an HTML string (first element). */
export function h(html) {
  const t = document.createElement('template');
  t.innerHTML = html.trim();
  return t.content.firstElementChild;
}

export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

/** Read a CSS custom property from :root (resolved for the current theme). */
export function cssVar(name) {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

// ---- global tooltip (#tooltip). Map calls showTip directly; any element with data-tip="…" gets one on hover/focus.
let tipEl = null;
export function showTip(html, x, y) {
  tipEl ||= document.getElementById('tooltip');
  if (!tipEl) return;
  tipEl.innerHTML = html;
  tipEl.hidden = false;
  const pad = 14, w = tipEl.offsetWidth, hgt = tipEl.offsetHeight;
  let left = x + pad, top = y + pad;
  if (left + w > innerWidth - 8) left = x - w - pad;
  if (top + hgt > innerHeight - 8) top = y - hgt - pad;
  tipEl.style.transform = `translate(${Math.max(8, left)}px, ${Math.max(8, top)}px)`;
}
export function hideTip() { (tipEl ||= document.getElementById('tooltip')) && (tipEl.hidden = true); }

export function initTips() {
  const show = (el, x, y) => showTip(el.getAttribute('data-tip'), x, y);
  document.addEventListener('pointerover', (e) => {
    const el = e.target.closest?.('[data-tip]');
    if (el) show(el, e.clientX, e.clientY);
  });
  document.addEventListener('pointermove', (e) => {
    const el = e.target.closest?.('[data-tip]');
    if (el) show(el, e.clientX, e.clientY);
  });
  document.addEventListener('pointerout', (e) => {
    if (e.target.closest?.('[data-tip]') && !e.relatedTarget?.closest?.('[data-tip]')) hideTip();
  });
  document.addEventListener('focusin', (e) => {
    const el = e.target.closest?.('[data-tip]');
    if (el) { const r = el.getBoundingClientRect(); show(el, r.left, r.bottom); }
  });
  document.addEventListener('focusout', hideTip);
}

/** Copy text; falls back to selecting it in a hidden field. Returns a promise of success. */
export async function copyText(text) {
  try { await navigator.clipboard.writeText(text); return true; } catch {
    const ta = h('<textarea style="position:fixed;opacity:0"></textarea>');
    ta.value = text; document.body.append(ta); ta.select();
    let ok = false; try { ok = document.execCommand('copy'); } catch { /* ignore */ }
    ta.remove(); return ok;
  }
}

/** The page's shareable link for the current hash. */
export function shareLink() { return location.href; }

/** Reduced-motion preference. */
export const reducedMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
