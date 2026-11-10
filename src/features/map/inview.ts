// What the map shows in its frame: the engine fills it a moment after the map settles (or its scene changes), and the
// lens card's "In view" list reads it. `r` is the drawn size (marker radius, point radius, line weight) and `v` the
// figure behind it (capacity, output), so the list can rank the largest first.

import type { Kind } from '../../data/types';

export interface InViewItem { kind: Kind; id: string; r: number; v: number }

let items: InViewItem[] = [];
let version = 0;
const listeners = new Set<() => void>();

export const inView = () => items;
export const inViewVersion = () => version;
export function subscribeInView(fn: () => void) { listeners.add(fn); return () => { listeners.delete(fn); }; }
export function setInView(next: InViewItem[]) {
  items = next;
  version++;
  for (const l of listeners) l();
}
