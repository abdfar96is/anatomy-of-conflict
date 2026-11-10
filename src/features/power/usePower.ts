// The power plants model for React: loads it on first use and re-renders when it, or a plant's detail file, arrives.

import { useEffect, useSyncExternalStore } from 'react';
import { emit } from '../../app/events';
import { atlas } from '../../app/store';
import { getPower, loadPower, powerCountries, powerFailed, powerVersion, subscribePower, type Power } from '../../data/power';

export function usePower(): { W: Power | null; failed: boolean; version: number } {
  const W = useSyncExternalStore(subscribePower, getPower, getPower);
  const failed = useSyncExternalStore(subscribePower, powerFailed, powerFailed);
  const version = useSyncExternalStore(subscribePower, powerVersion, powerVersion);
  // the per-state totals for the country summary (small; the scene reads them once in)
  useEffect(() => { powerCountries(); }, []);
  useEffect(() => {
    // the map scene is rebuilt from the store: nudge it once the data is in
    if (!W) {
      loadPower().then(() => {
        atlas.setFilter('powerStatus', atlas.get().filters.powerStatus);
        // a share link selected a plant before its data arrived: show it now
        const sel = atlas.get().selection;
        if (sel?.kind === 'station' && atlas.get().lens === 'industry') emit('flyto', sel);
      }).catch(() => {});
    }
  }, [W]);
  return { W, failed, version };
}
