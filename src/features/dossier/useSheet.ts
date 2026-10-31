// Phone bottom sheet (≤ 760px, base.css): drag the grip or header to resize, release to snap half/full, swipe down to close.
// The drag writes transform/height straight onto the element (60 fps, nothing React renders) and clears them on release.

import { useRef, useState, type MouseEvent, type PointerEvent, type RefObject } from 'react';
import { atlas } from '../../app/store';
import { cssVar } from '../../ui/dom';

export type Snap = 'half' | 'full';

export const isPhone = () => typeof matchMedia === 'function' && matchMedia('(max-width: 760px)').matches;
const halfH = () => innerHeight * 0.58;
const fullH = () => innerHeight - (parseFloat(cssVar('--top-h')) || 52);

interface Drag { y0: number; t0: number; h0: number; dy: number; moved: boolean; id: number }

export function useSheet(elRef: RefObject<HTMLElement | null>, open: boolean) {
  const [snap, setSnap] = useState<Snap>('half');
  const [dragging, setDragging] = useState(false);
  const drag = useRef<Drag | null>(null);
  const suppressClick = useRef(false);

  const onPointerDown = (e: PointerEvent<HTMLElement>) => {
    const el = elRef.current, target = e.target as Element;
    if (!el || !isPhone() || !open || (e.pointerType === 'mouse' && e.button !== 0)) return;
    if (!target.closest('.dz-grip, .dz-head')) return;
    const ctl = target.closest('button, a, input, [tabindex="0"]');
    if (ctl && !ctl.classList.contains('dz-handle')) return;
    drag.current = { y0: e.clientY, t0: performance.now(), h0: el.getBoundingClientRect().height, dy: 0, moved: false, id: e.pointerId };
  };

  const onPointerMove = (e: PointerEvent<HTMLElement>) => {
    const d = drag.current, el = elRef.current;
    if (!d || !el || e.pointerId !== d.id) return;
    const dy = e.clientY - d.y0;
    if (!d.moved) {
      if (Math.abs(dy) < 6) return;
      d.moved = true;
      setDragging(true);
      try { el.setPointerCapture(e.pointerId); } catch { /* pointer already released */ }
    }
    d.dy = dy;
    if (dy >= 0) { el.style.transform = `translateY(${dy}px)`; el.style.height = ''; }
    else { el.style.transform = ''; el.style.height = `${Math.min(fullH(), d.h0 - dy)}px`; }
  };

  const onPointerUp = (e: PointerEvent<HTMLElement>) => {
    const d = drag.current, el = elRef.current;
    if (!d || !el || e.pointerId !== d.id) return;
    drag.current = null;
    if (!d.moved) return;
    suppressClick.current = true;
    setTimeout(() => { suppressClick.current = false; }, 0);
    const v = d.dy / Math.max(1, performance.now() - d.t0); // px per ms, positive = downwards
    const finalH = d.h0 - d.dy;
    setDragging(false);
    el.style.height = '';
    el.style.transform = '';
    if (d.dy > 0 && (finalH < halfH() * 0.55 || (v > 0.7 && snap !== 'full'))) { atlas.select(null); return; }
    setSnap(v < -0.5 ? 'full' : v > 0.5 ? 'half' : Math.abs(finalH - fullH()) < Math.abs(finalH - halfH()) ? 'full' : 'half');
  };

  /** The click that ends a drag is not a tap on whatever sits under the finger. */
  const onClickCapture = (e: MouseEvent<HTMLElement>) => {
    if (!suppressClick.current) return;
    suppressClick.current = false;
    e.stopPropagation();
  };

  return {
    snap, setSnap, dragging,
    handlers: { onPointerDown, onPointerMove, onPointerUp, onPointerCancel: onPointerUp, onClickCapture },
  };
}
