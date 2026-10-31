// The global key map. The palette, help and phone menu stop their own key events, so these fire only outside them.

import { useEffect } from 'react';
import { atlas } from '../../app/store';
import { LENSES } from '../../config';
import { cycleTheme, setLens, toggleLang, toggleProjection } from './actions';
import { closePalette, escapeLayer, isModal, openHelp, openPalette, useShellUi } from './ui';

const TYPING = /^(text|search|email|number|url|tel|password|date|datetime-local|month|time|week)$/;

/** True when keys typed at `el` are text, not shortcuts. */
export function isTyping(el: EventTarget | null): boolean {
  if (!(el instanceof HTMLElement) || el === document.body) return false;
  if (el.isContentEditable || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT') return true;
  return el instanceof HTMLInputElement && TYPING.test(el.type || 'text');
}

/** Key name independent of the keyboard layout for the letters and digits we bind (Arabic layouts report Arabic letters). */
export function keyOf(e: KeyboardEvent): string {
  if (e.key.length === 1 && /[a-z0-9/?]/i.test(e.key)) return e.key.toLowerCase();
  const c = e.code || '';
  if (/^Key[A-Z]$/.test(c)) return c.slice(3).toLowerCase();
  if (/^(Digit|Numpad)[0-9]$/.test(c)) return c.slice(-1);
  if (c === 'Slash') return e.shiftKey ? '?' : '/';
  return e.key;
}

function onKey(e: KeyboardEvent): void {
  // Browser autofill dispatches keydown events that carry no key.
  if (e.defaultPrevented || typeof e.key !== 'string') return;
  const mod = e.ctrlKey || e.metaKey;
  if (mod && !e.altKey && (e.code === 'KeyK' || e.key.toLowerCase() === 'k')) {
    e.preventDefault();
    if (useShellUi.getState().palette) closePalette();
    else openPalette();
    return;
  }
  const typing = isTyping(e.target);
  if (e.key === 'Escape') {
    if (!typing && escapeLayer()) e.preventDefault();
    return;
  }
  if (typing || mod || e.altKey || isModal()) return;
  const k = keyOf(e);
  const s = atlas.get();
  const lens = /^[1-9]$/.test(k) ? LENSES[+k - 1] : undefined;
  if (k === '/') { e.preventDefault(); openPalette(); }
  else if (k === '?') { e.preventDefault(); openHelp(); }
  else if (lens) setLens(lens.id);
  else if (k === 'g') toggleProjection();
  else if (k === 't') cycleTheme();
  else if (k === 'l') toggleLang();
  else if (k === 'a' && s.askReady) { e.preventDefault(); atlas.set({ ask: !s.ask }); }
}

/** Binds the global key map on document for as long as the shell is mounted. */
export function useGlobalKeys(): void {
  useEffect(() => {
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);
}
