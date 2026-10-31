// Guided tours: the top-bar button and its popover (desktop), plus the tour rows the phone menu reuses.
// Starting a tour only emits 'starttour'; the tour player runs it.

import { useLayoutEffect, useMemo, useRef, type FocusEvent, type KeyboardEvent } from 'react';
import { useAtlas } from '../../app/store';
import { useDb, useT } from '../../app/useT';
import { Icon } from '../../ui/Icon';
import { availableTours, stepsLabel } from '../tours/tours';
import { startTour } from './actions';
import { closePop, openPop, useShellUi } from './ui';

const TOURS_BTN = '#topbar [data-k="tours"]';

export function ToursButton() {
  const { t } = useT();
  const tour = useAtlas((s) => s.tour);
  const open = useShellUi((s) => s.pop);
  return (
    <button type="button" className={`btn ghost tb-tours${tour ? ' is-on' : ''}`} data-k="tours" aria-haspopup="dialog" aria-expanded={open} aria-label={t('sh.toursTitle')}
      onClick={(e) => (useShellUi.getState().pop ? closePop() : openPop(e.currentTarget))}>
      <Icon name="route" size={17} /><span className="lbl">{t('sh.tours')}</span>
    </button>
  );
}

/** One button per available tour; `prefix` keeps the popover's and the menu's data-k apart. */
export function TourRows({ prefix, onPick }: { prefix: 'pt-' | 'st-'; onPick: (id: string) => void }) {
  const db = useDb();
  const { t, pick: L, lang } = useT();
  const running = useAtlas((s) => s.tour?.id);
  const tours = useMemo(() => availableTours(db), [db]);
  return tours.map((tr) => {
    const on = running === tr.id;
    return (
      <button key={tr.id} type="button" className="tour-row" data-k={prefix + tr.id} aria-current={on ? 'true' : undefined} onClick={() => onPick(tr.id)}>
        <span className="tr-ic"><Icon name={tr.icon} size={16} /></span>
        <span className="tr-txt">
          <span className="tr-top">
            <span className="tr-title">{L(tr)}</span>{on && <span className="pill accent">{t('sh.running')}</span>}<span className="tr-n">{stepsLabel(tr.steps.length, lang)}</span>
          </span>
          <span className="tr-desc">{L(tr.desc)}</span>
        </span>
      </button>
    );
  });
}

/** Place the popover under the tours button, aligned to its inline end. */
function positionPop(el: HTMLElement, rtl: boolean): void {
  const b = document.querySelector(TOURS_BTN);
  if (!b) return;
  const r = b.getBoundingClientRect();
  const vw = document.documentElement.clientWidth;
  el.style.insetBlockStart = `${Math.round(r.bottom + 6)}px`;
  el.style.insetInlineEnd = `${Math.max(8, Math.round(rtl ? r.left : vw - r.right))}px`;
}

export function ToursPopover() {
  const { t, lang } = useT();
  const open = useShellUi((s) => s.pop);
  const ref = useRef<HTMLDivElement>(null);

  // On open: focus the running tour (or the first), and close on a pointer press outside.
  useLayoutEffect(() => {
    const el = ref.current;
    if (!open || !el) return;
    (el.querySelector<HTMLElement>('[aria-current="true"]') ?? el.querySelector<HTMLElement>('.tour-row'))?.focus();
    const outside = (e: PointerEvent) => {
      const target = e.target as Element | null;
      if (target && (el.contains(target) || target.closest?.(TOURS_BTN))) return;
      closePop({ restore: false });
    };
    document.addEventListener('pointerdown', outside, true);
    return () => document.removeEventListener('pointerdown', outside, true);
  }, [open]);

  // Follow the button when the window resizes or the layout mirrors.
  useLayoutEffect(() => {
    const el = ref.current;
    if (!open || !el) return;
    const place = () => positionPop(el, lang === 'ar');
    place();
    addEventListener('resize', place);
    return () => removeEventListener('resize', place);
  }, [open, lang]);

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); closePop(); return; }
    if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp' && e.key !== 'Home' && e.key !== 'End') return;
    const rows = [...e.currentTarget.querySelectorAll<HTMLElement>('.tour-row')];
    const i = rows.indexOf(document.activeElement as HTMLElement);
    e.preventDefault();
    const n = e.key === 'Home' ? 0 : e.key === 'End' ? rows.length - 1 : (i + (e.key === 'ArrowDown' ? 1 : -1) + rows.length) % rows.length;
    rows[n]?.focus();
  };

  // Tabbing out of the popover (anywhere but its own button) closes it.
  const onBlur = (e: FocusEvent<HTMLDivElement>) => {
    const to = e.relatedTarget as Element | null;
    if (to && !e.currentTarget.contains(to) && !to.closest(TOURS_BTN)) closePop({ restore: false });
  };

  return (
    <div ref={ref} id="sh-tours" className="sh-pop" hidden={!open} role={open ? 'dialog' : undefined} aria-labelledby={open ? 'pop-h' : undefined}
      onKeyDown={onKeyDown} onBlur={onBlur}>
      {open && (
        <>
          <div className="pop-head"><h2 className="eyebrow" id="pop-h">{t('sh.toursTitle')}</h2><p>{t('sh.toursHint')}</p></div>
          <div className="pop-list"><TourRows prefix="pt-" onPick={(id) => { closePop({ restore: false }); startTour(id); }} /></div>
        </>
      )}
    </div>
  );
}
