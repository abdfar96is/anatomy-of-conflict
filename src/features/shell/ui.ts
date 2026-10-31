// Shell overlay state and the focus plumbing the overlays share.
// The palette, help dialog, tours popover and phone menu open from the top bar but render at the page root,
// so their open flags live in one small store. Owns the Esc order: palette → help → popover/menu → tour → open view → selection.

import { useSyncExternalStore, type KeyboardEvent as ReactKeyboardEvent } from 'react';
import { create } from 'zustand';
import { atlas } from '../../app/store';
import type { Kind } from '../../data/types';

type Sel = { kind: Kind; id: string };

export interface ShellUi {
  palette: boolean;
  help: boolean;
  pop: boolean;
  sheet: boolean;
  /** Records selected this session, newest first (at most 6). */
  recent: Sel[];
}

const initial = (): ShellUi => ({ palette: false, help: false, pop: false, sheet: false, recent: [] });
export const useShellUi = create<ShellUi>()(initial);
const ui = () => useShellUi.getState();

// Where focus goes back to when each layer closes.
let palReturn: Element | null = null;
let helpReturn: Element | null = null;
let popReturn: Element | null = null;
let sheetReturn: Element | null = null;
export const paletteReturn = () => palReturn;
export const helpReturnTo = () => helpReturn;
export const sheetReturnTo = () => sheetReturn;

// ---------------------------------------------------------------- modal plumbing

const modal = new Set<string>();
export const isModal = () => modal.size > 0;

/** While a modal layer is open, the app behind it (and the tour card) is inert. */
function setModal(name: string, open: boolean): void {
  if (open) modal.add(name);
  else modal.delete(name);
  syncInert();
}
const syncInert = () => { for (const id of ['app', 'tour']) document.getElementById(id)?.toggleAttribute('inert', modal.size > 0); };

function focusables(root: Element): HTMLElement[] {
  return [...root.querySelectorAll<HTMLElement>('button:not([disabled]), [href], input:not([disabled]), select, textarea, [tabindex]:not([tabindex="-1"])')]
    .filter((n) => n.getClientRects().length);
}

/** Keep Tab inside a dialog. */
export function trapTab(root: Element | null, e: ReactKeyboardEvent): void {
  if (!root) return;
  const f = focusables(root);
  const first = f[0], last = f[f.length - 1];
  if (!first || !last) return;
  if (e.shiftKey && (document.activeElement === first || !root.contains(document.activeElement))) { e.preventDefault(); last.focus(); }
  else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
}

const attr = (v: string) => v.replace(/["\\]/g, '\\$&');

/** Focus `el` again; if it is gone, the control with the same data-k in the top bar or rail, else the search button. */
export function restoreFocus(el: Element | null): void {
  if (el instanceof HTMLElement && el.isConnected && !el.closest('[inert]')) { el.focus(); return; }
  const k = el instanceof HTMLElement ? el.dataset.k : undefined;
  const again = k ? document.querySelector<HTMLElement>(`#topbar [data-k="${attr(k)}"], #lensrail [data-k="${attr(k)}"]`) : null;
  (again ?? (el === document.body ? null : document.querySelector<HTMLElement>('#topbar [data-k="search"]')))?.focus();
}

// ---------------------------------------------------------------- open / close

export function openPalette(from?: Element | null): void {
  if (ui().palette) return;
  closePop({ restore: false });
  closeSheet({ restore: false });
  palReturn = from ?? document.activeElement;
  useShellUi.setState({ palette: true });
  setModal('palette', true);
}

export function closePalette({ restore = true } = {}): void {
  if (!ui().palette) return;
  useShellUi.setState({ palette: false });
  setModal('palette', false);
  if (restore) restoreFocus(palReturn);
}

export function openHelp(from?: Element | null): void {
  if (ui().help) return;
  closePop({ restore: false });
  closeSheet({ restore: false });
  helpReturn = from ?? document.activeElement;
  useShellUi.setState({ help: true });
  setModal('help', true);
}

export function closeHelp({ restore = true } = {}): void {
  if (!ui().help) return;
  useShellUi.setState({ help: false });
  setModal('help', false);
  if (restore) restoreFocus(helpReturn);
}

export function openPop(btn: Element): void {
  closeSheet({ restore: false });
  popReturn = btn;
  useShellUi.setState({ pop: true });
}

export function closePop({ restore = true } = {}): void {
  if (!ui().pop) return;
  useShellUi.setState({ pop: false });
  if (restore) restoreFocus(popReturn);
}

export function openSheet(btn: Element): void {
  if (ui().sheet) return;
  closePop({ restore: false });
  sheetReturn = btn;
  useShellUi.setState({ sheet: true });
  setModal('sheet', true);
}

export function closeSheet({ restore = true } = {}): void {
  if (!ui().sheet) return;
  useShellUi.setState({ sheet: false });
  setModal('sheet', false);
  if (restore) restoreFocus(sheetReturn);
}

/** Close the topmost layer. Returns true when something closed. */
export function escapeLayer(): boolean {
  const u = ui(), s = atlas.get();
  if (u.palette) closePalette();
  else if (u.help) closeHelp();
  else if (u.pop) closePop();
  else if (u.sheet) closeSheet();
  else if (s.ask) atlas.set({ ask: false });
  else if (s.tour) atlas.set({ tour: null });
  else if (s.view) atlas.closeView();
  else if (s.selection) atlas.select(null);
  else return false;
  return true;
}

// ---------------------------------------------------------------- recent records

export function remember(sel: Sel): void {
  const rest = ui().recent.filter((r) => r.kind !== sel.kind || r.id !== sel.id);
  useShellUi.setState({ recent: [{ kind: sel.kind, id: sel.id }, ...rest].slice(0, 6) });
}

/** Everything closed and forgotten (the shell unmounts, or a test ends). */
export function resetShellUi(): void {
  modal.clear();
  syncInert();
  palReturn = helpReturn = popReturn = sheetReturn = null;
  useShellUi.setState(initial(), true);
}

// ---------------------------------------------------------------- phone layout

export const PHONE_QUERY = '(max-width: 760px)';
const phoneMQ = () => (typeof matchMedia === 'function' ? matchMedia(PHONE_QUERY) : null);

export function onPhoneChange(fn: () => void): () => void {
  const mq = phoneMQ();
  mq?.addEventListener('change', fn);
  return () => mq?.removeEventListener('change', fn);
}

/** True at phone width (the same breakpoint as the CSS). */
export function usePhone(): boolean {
  return useSyncExternalStore(onPhoneChange, () => phoneMQ()?.matches ?? false, () => false);
}
