// Mines and heavy industry for React: loads them when the Power & industry lens shows them (or one is selected), and
// switches the lens to its industry mode when a mine or plant is selected.

import { useEffect, useSyncExternalStore } from 'react';
import { emit } from '../../app/events';
import { atlas, useAtlas } from '../../app/store';
import { getIndustry, industryFailed, loadIndustry, subscribeIndustry, type Industry } from '../../data/industry';

export function useIndustry(): { X: Industry | null; failed: boolean } {
  const X = useSyncExternalStore(subscribeIndustry, getIndustry, getIndustry);
  const failed = useSyncExternalStore(subscribeIndustry, industryFailed, industryFailed);
  const mode = useAtlas((s) => s.filters.industryMode);
  const selKind = useAtlas((s) => s.selection?.kind);
  useEffect(() => {
    if (selKind === 'facility' && mode !== 'industry') atlas.setFilter('industryMode', 'industry');
  }, [selKind, mode]);
  useEffect(() => {
    if (X || (mode !== 'industry' && selKind !== 'facility')) return;
    loadIndustry().then(() => {
      // the map scene is rebuilt from the store: nudge it once the data is in
      atlas.setFilter('industryLayers', new Set(atlas.get().filters.industryLayers));
      const sel = atlas.get().selection;
      if (sel?.kind === 'facility' && atlas.get().lens === 'industry') emit('flyto', sel);
    }).catch(() => {});
  }, [X, mode, selKind]);
  return { X, failed };
}
