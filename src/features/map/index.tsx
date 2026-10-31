// Map feature entry: the canvas map (#map), the lens card (#legend) and the map controls (#mapctl), siblings
// inside #stage as in v2. The engine is imperative; it is created once per mount and destroyed on unmount.

import { useEffect, useMemo, useRef } from 'react';
import { useDb } from '../../app/useT';
import { createMap, type MapApi } from './engine/engine';
import { Legend } from './Legend';
import { MapControls } from './MapControls';

export function MapStage() {
  const db = useDb();
  const mount = useRef<HTMLDivElement>(null);
  const engine = useRef<MapApi | null>(null);

  useEffect(() => {
    const el = mount.current;
    if (!el) return;
    // a map that fails to mount must not take the rest of the app down
    try { engine.current = createMap(el, db); } catch (err) { console.error('[atlas] map failed to mount', err); }
    return () => { engine.current?.destroy(); engine.current = null; };
  }, [db]);

  const controls = useMemo(() => ({
    zoom: (f: number) => engine.current?.zoom(f),
    reset: () => engine.current?.reset(),
  }), []);

  return (
    <>
      <div id="map" ref={mount} />
      <Legend />
      <MapControls api={controls} />
    </>
  );
}
