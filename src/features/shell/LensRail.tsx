// The lens rail: a vertical toolbar on desktop, a scrolling chip row on phones. Roving tabindex with arrow keys.

import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { useAtlas } from '../../app/store';
import { useT } from '../../app/useT';
import { LENSES, type LensId } from '../../config';
import { esc, reducedMotion } from '../../ui/dom';
import { Icon } from '../../ui/Icon';
import { setLens } from './actions';
import './strings';
import { usePhone } from './ui';

/** Scroll the phone chip row (only the row) so the active lens is in view. */
function revealActiveLens(row: HTMLElement | null | undefined): void {
  const b = row?.querySelector('[aria-pressed="true"]');
  if (!row || !b) return;
  const r = b.getBoundingClientRect(), c = row.getBoundingClientRect();
  const dx = r.left < c.left ? r.left - c.left - 16 : r.right > c.right ? r.right - c.right + 16 : 0;
  if (dx) row.scrollBy({ left: dx, behavior: reducedMotion() ? 'auto' : 'smooth' });
}

export function LensRail() {
  const { t, pick: L, lang } = useT();
  const lens = useAtlas((s) => s.lens);
  const phone = usePhone();
  const railRef = useRef<HTMLDivElement>(null);
  // The lens that arrow keys moved focus to; it holds the tab stop until the lens changes.
  const [roving, setRoving] = useState<{ lens: LensId; i: number } | null>(null);
  const tabStop = roving?.lens === lens ? roving.i : LENSES.findIndex((l) => l.id === lens);

  // #lensrail is Layout's <nav>; it carries the same label as the toolbar.
  useEffect(() => { railRef.current?.parentElement?.setAttribute('aria-label', t('sh.lenses')); }, [t]);
  useEffect(() => { if (phone) revealActiveLens(railRef.current?.parentElement); }, [phone, lens, lang]);

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const btns = [...e.currentTarget.querySelectorAll<HTMLButtonElement>('.lens')];
    const i = btns.indexOf(document.activeElement as HTMLButtonElement);
    if (i < 0) return;
    let n: number;
    if (e.key === 'ArrowDown') n = i + 1;
    else if (e.key === 'ArrowUp') n = i - 1;
    else if (phone && (e.key === 'ArrowLeft' || e.key === 'ArrowRight')) n = i + ((e.key === 'ArrowRight') !== (lang === 'ar') ? 1 : -1);
    else if (e.key === 'Home') n = 0;
    else if (e.key === 'End') n = btns.length - 1;
    else return;
    e.preventDefault();
    n = (n + btns.length) % btns.length;
    setRoving({ lens, i: n });
    btns[n]?.focus();
  };

  return (
    <div ref={railRef} className="rail" role="toolbar" aria-orientation={phone ? 'horizontal' : 'vertical'} aria-label={t('sh.lenses')} onKeyDown={onKeyDown}>
      {LENSES.map((l, i) => {
        const on = lens === l.id;
        const tip = phone ? undefined : `<b>${esc(L(l))}</b><span class="tip-sub">${esc(L(l.sub))} · ${esc(t('sh.key'))} ${i + 1}</span>`;
        return (
          <button key={l.id} type="button" className="lens" data-k={`lens-${l.id}`} aria-pressed={on} tabIndex={tabStop === i ? 0 : -1}
            aria-keyshortcuts={String(i + 1)} data-tip={tip} onClick={() => setLens(l.id)}>
            <span className="lens-tile"><Icon name={l.icon} size={phone ? 16 : 20} /></span><span className="lens-lbl">{L(l)}</span>
          </button>
        );
      })}
    </div>
  );
}
