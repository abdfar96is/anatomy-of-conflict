// The map controls (#mapctl): zoom, reset, projection and the layers popover. They sit inside #stage at the
// inline-end bottom corner; zoom and reset go to the engine, projection and layers go through the store.

import { useEffect, useRef, useState, type SyntheticEvent } from 'react';
import { atlas, useAtlas } from '../../app/store';
import { useT } from '../../app/useT';
import { esc } from '../../ui/dom';
import { Icon } from '../../ui/Icon';
import './strings';

/** What the controls need from the map engine. */
export interface MapControlsApi { zoom(f: number): void; reset(): void }

const LAYERS = ['labels', 'graticule', 'boundaries', 'disputed'] as const;
const stop = (e: SyntheticEvent) => e.stopPropagation();
/** Natural Earth base layers, listed after the others. */
const BASE_LAYERS = ['rivers', 'cities'] as const;

export function MapControls({ api }: { api: MapControlsApi }) {
  const { t } = useT();
  const globe = useAtlas((s) => s.projection) === 'globe';
  const layers = useAtlas((s) => s.layers);
  const [open, setOpenState] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  const layersBtn = useRef<HTMLButtonElement>(null);
  // where focus goes once the popover has opened or closed
  const focusNext = useRef<'pop' | 'btn' | null>(null);

  const setOpen = (v: boolean, focusBtn = false) => {
    focusNext.current = v ? 'pop' : focusBtn ? 'btn' : null;
    setOpenState(v);
  };

  useEffect(() => {
    const want = focusNext.current;
    focusNext.current = null;
    if (want === 'pop') box.current?.querySelector<HTMLInputElement>('#mapctl-layers input')?.focus({ preventScroll: true });
    else if (want === 'btn') layersBtn.current?.focus({ preventScroll: true });
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (!(e.target instanceof Node && box.current?.contains(e.target))) { focusNext.current = null; setOpenState(false); }
    };
    document.addEventListener('pointerdown', onDown);
    return () => document.removeEventListener('pointerdown', onDown);
  }, [open]);

  const btn = (ctl: string, ic: string, label: string, onClick: () => void) => (
    <button className="btn icon ctl" type="button" data-ctl={ctl} aria-label={label} data-tip={esc(label)} onClick={onClick}><Icon name={ic} size={18} /></button>
  );

  return (
    <div id="mapctl" ref={box} role="group" aria-label={t('map.ctl')}
      onKeyDown={(e) => { if (e.key === 'Escape' && open) { e.stopPropagation(); setOpen(false, true); } }}
      onPointerDown={stop} onWheel={stop} onDoubleClick={stop}>
      <div className="ctl-stack">
        {btn('zin', 'plus', t('map.zoomIn'), () => api.zoom(1.6))}
        {btn('zout', 'minus', t('map.zoomOut'), () => api.zoom(1 / 1.6))}
        {btn('reset', 'home', t('map.reset'), () => api.reset())}
      </div>
      <div className="ctl-stack">
        {btn('proj', globe ? 'flat' : 'globe', globe ? t('map.toFlat') : t('map.toGlobe'), () => atlas.set({ projection: globe ? 'flat' : 'globe' }))}
        <button ref={layersBtn} className="btn icon ctl" type="button" data-ctl="layers" aria-label={t('map.layers')} data-tip={esc(t('map.layers'))}
          aria-expanded={open} aria-pressed={open} aria-controls="mapctl-layers" onClick={() => setOpen(!open)}>
          <Icon name="layers" size={18} />
        </button>
      </div>
      <div className="ctl-pop" id="mapctl-layers" role="group" aria-label={t('map.layers')} hidden={!open}>
        <p className="lc-label">{t('map.layers')}</p>
        {[...LAYERS, ...BASE_LAYERS].map((k) => (
          <label className="ctl-check" key={k}>
            <input type="checkbox" data-layer={k} checked={layers[k]} onChange={(e) => atlas.setLayer(k, e.target.checked)} />
            <span>{t('map.lyr.' + k)}</span>
          </label>
        ))}
      </div>
    </div>
  );
}
