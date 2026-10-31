// Shell feature entry: the top bar and lens rail fill Layout's #topbar and #lensrail; ShellOverlays renders the
// layers that sit above the app (palette, help, toasts, tours popover, phone menu) and binds the global keys.

import { useEffect } from 'react';
import { atlas, useAtlas } from '../../app/store';
import { hideTip } from '../../ui/tooltip';
import { CommandPalette } from './CommandPalette';
import { HelpDialog } from './HelpDialog';
import { useGlobalKeys } from './keyboard';
import { PhoneMenu } from './PhoneMenu';
import { Toasts } from './Toasts';
import { ToursPopover } from './ToursMenu';
import { closePop, closeSheet, onPhoneChange, remember, resetShellUi } from './ui';
import './strings';

export { LensRail } from './LensRail';
export { TopBar } from './TopBar';

/** Publishes #stage's box as CSS variables, so the toasts and the tour card can sit over the map. */
function trackStage(): () => void {
  const stage = document.getElementById('stage');
  if (!stage) return () => {};
  const update = () => {
    const r = stage.getBoundingClientRect();
    const vw = document.documentElement.clientWidth, vh = document.documentElement.clientHeight;
    const s = document.documentElement.style;
    s.setProperty('--stage-start', `${Math.round(atlas.get().lang === 'ar' ? vw - r.right : r.left)}px`);
    s.setProperty('--stage-w', `${Math.round(r.width)}px`);
    s.setProperty('--stage-bottom', `${Math.max(0, Math.round(vh - r.bottom))}px`);
  };
  const ro = typeof ResizeObserver === 'function' ? new ResizeObserver(update) : null;
  ro?.observe(stage);
  addEventListener('resize', update);
  let frame = 0;
  const offLang = useAtlas.subscribe((s, prev) => { if (s.lang !== prev.lang) frame = requestAnimationFrame(update); });
  update();
  return () => { ro?.disconnect(); removeEventListener('resize', update); offLang(); cancelAnimationFrame(frame); };
}

export function ShellOverlays() {
  useGlobalKeys();

  useEffect(() => {
    const offState = useAtlas.subscribe((s, prev) => {
      if (s.selection && s.selection !== prev.selection) remember(s.selection);
      if (s.lang !== prev.lang) hideTip();
    });
    // Crossing the phone breakpoint swaps the popover for the menu: close both.
    const offPhone = onPhoneChange(() => { closePop({ restore: false }); closeSheet({ restore: false }); });
    const offStage = trackStage();
    return () => { offState(); offPhone(); offStage(); resetShellUi(); };
  }, []);

  return (
    <>
      <CommandPalette />
      <HelpDialog />
      <Toasts />
      <ToursPopover />
      <PhoneMenu />
    </>
  );
}
