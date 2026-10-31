// Small DOM helpers shared by the map engine and the chrome: escaping, icons as SVG strings, CSS variables.

import { ICONS } from '../config';

/** Escape text for innerHTML. Every data string that reaches innerHTML goes through this. */
export function esc(s: unknown): string {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
}

/** Inline SVG icon from config.ICONS, as an HTML string (React code uses <Icon/>). */
export function icon(name: string, size = 18, extra = ''): string {
  return `<svg class="ic" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" ${extra}>${ICONS[name] ?? ''}</svg>`;
}

/** Create an element from an HTML string (first element). */
export function h(html: string): HTMLElement {
  const t = document.createElement('template');
  t.innerHTML = html.trim();
  return t.content.firstElementChild as HTMLElement;
}

export const $ = <T extends Element = HTMLElement>(sel: string, root: ParentNode = document) => root.querySelector<T>(sel);
export const $$ = <T extends Element = HTMLElement>(sel: string, root: ParentNode = document) => [...root.querySelectorAll<T>(sel)];

/** Read a CSS custom property from :root (resolved for the current theme). */
export function cssVar(name: string): string {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

/** Copy text; falls back to selecting it in a hidden field. Resolves to success. */
export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const ta = h('<textarea style="position:fixed;opacity:0"></textarea>') as HTMLTextAreaElement;
    ta.value = text;
    document.body.append(ta);
    ta.select();
    let ok: boolean;
    try { ok = document.execCommand('copy'); } catch { ok = false; } // no clipboard at all: report failure
    ta.remove();
    return ok;
  }
}

/** The page's shareable link for the current hash. */
export const shareLink = () => location.href;

/** Reduced-motion preference. */
export const reducedMotion = () => typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
