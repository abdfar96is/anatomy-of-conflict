// For imperative code (the canvas map engine): the v2 "change {keys}" contract on top of the Zustand store.
// React components don't need this; they read state with useAtlas(selector).

import { useAtlas, type AtlasState } from './store';

/** Calls fn with the top-level state keys whose value changed (by reference) on every store update. */
export function onStateChange(fn: (keys: (keyof AtlasState)[], s: AtlasState) => void): () => void {
  return useAtlas.subscribe((s, prev) => {
    const keys = (Object.keys(s) as (keyof AtlasState)[]).filter((k) => s[k] !== prev[k]);
    if (!keys.length) return;
    // Zustand does not isolate listeners: one failing draw must not stop the hash writer or other features.
    try { fn(keys, s); } catch (err) { console.error('[atlas] state listener failed', err); }
  });
}
