// The global tooltip (#tooltip). The map calls showTip directly; any element with data-tip="…" (escaped HTML) gets one on hover/focus.

let tipEl: HTMLElement | null = null;
const tip = () => (tipEl?.isConnected ? tipEl : (tipEl = document.getElementById('tooltip')));

export function showTip(html: string, x: number, y: number): void {
  const el = tip();
  if (!el) return;
  el.innerHTML = html;
  el.hidden = false;
  const pad = 14, w = el.offsetWidth, hgt = el.offsetHeight;
  let left = x + pad, top = y + pad;
  if (left + w > innerWidth - 8) left = x - w - pad;
  if (top + hgt > innerHeight - 8) top = y - hgt - pad;
  el.style.transform = `translate(${Math.max(8, left)}px, ${Math.max(8, top)}px)`;
}

export function hideTip(): void {
  const el = tip();
  if (el) el.hidden = true;
}

const tipTarget = (e: Event) => (e.target as Element | null)?.closest?.('[data-tip]') ?? null;

/** Wire data-tip tooltips for the whole document. Returns a cleanup function. */
export function initTips(): () => void {
  const show = (el: Element, x: number, y: number) => showTip(el.getAttribute('data-tip') ?? '', x, y);
  const onOver = (e: Event) => { const el = tipTarget(e); if (el) show(el, (e as PointerEvent).clientX, (e as PointerEvent).clientY); };
  const onOut = (e: Event) => {
    const to = (e as PointerEvent).relatedTarget as Element | null;
    if (tipTarget(e) && !to?.closest?.('[data-tip]')) hideTip();
  };
  const onFocus = (e: Event) => { const el = tipTarget(e); if (el) { const r = el.getBoundingClientRect(); show(el, r.left, r.bottom); } };
  document.addEventListener('pointerover', onOver);
  document.addEventListener('pointermove', onOver);
  document.addEventListener('pointerout', onOut);
  document.addEventListener('focusin', onFocus);
  document.addEventListener('focusout', hideTip);
  return () => {
    document.removeEventListener('pointerover', onOver);
    document.removeEventListener('pointermove', onOver);
    document.removeEventListener('pointerout', onOut);
    document.removeEventListener('focusin', onFocus);
    document.removeEventListener('focusout', hideTip);
  };
}
