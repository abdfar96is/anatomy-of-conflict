// The pipelines model for React: loads it on first use and re-renders when it arrives (or fails).

import { useEffect, useSyncExternalStore } from 'react';
import { emit } from '../../app/events';
import { atlas } from '../../app/store';
import { energyFailed, getEnergy, loadEnergy, subscribeEnergy, type Energy } from '../../data/energy';

export function useEnergy(): { E: Energy | null; failed: boolean } {
  const E = useSyncExternalStore(subscribeEnergy, getEnergy, getEnergy);
  const failed = useSyncExternalStore(subscribeEnergy, energyFailed, energyFailed);
  useEffect(() => {
    // the map scene is rebuilt from the store: nudge it once the data is in
    if (!E) {
      loadEnergy().then(() => {
        atlas.setFilter('pipeStatus', atlas.get().filters.pipeStatus);
        // a share link selected a line before its data arrived: show it now
        const sel = atlas.get().selection;
        if (sel && (sel.kind === 'pipeline' || sel.kind === 'lng') && atlas.get().lens === 'pipelines') emit('flyto', sel);
      }).catch(() => {});
    }
  }, [E]);
  return { E, failed };
}
