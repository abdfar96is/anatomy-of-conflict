// Theme-resolved data colors. HTML uses the CSS vars directly (var(--cat-3)); canvas needs hex, so it calls pal().
// pal() is cached and rebuilt when the theme changes. Categorical slots are fixed per entity (never by rank).

import { on, state } from './store.js';
import { RELIGION_FAMILIES, EDGE_SLOT, RESOURCE_CLASSES, SEVERITY } from './config.js';
import { cssVar } from './ui.js';

let cache = null;
on('change', ({ keys }) => { if (keys.includes('theme')) cache = null; });
matchMedia('(prefers-color-scheme: dark)').addEventListener?.('change', () => { cache = null; });

/** CSS var reference for a categorical slot (0 = neutral). */
export const catVar = (slot) => (slot ? `var(--cat-${slot})` : 'var(--cat-0)');
export const sevVar = (id) => `var(--sev-${id})`;
export const edgeVar = (type) => catVar(EDGE_SLOT[type] || 0);
export const familyVar = (fid) => catVar(RELIGION_FAMILIES.find((f) => f.id === fid)?.slot ?? 0);
export const resClassVar = (cid) => catVar(RESOURCE_CLASSES.find((c) => c.id === cid)?.slot ?? 0);

/** Theme is dark right now? (explicit choice or OS setting) */
export function isDark() {
  if (state.theme === 'dark') return true;
  if (state.theme === 'light') return false;
  return matchMedia('(prefers-color-scheme: dark)').matches;
}

/** Resolved colors for canvas drawing. */
export function pal() {
  if (cache) return cache;
  const v = (n) => cssVar(n);
  const cat = Array.from({ length: 9 }, (_, i) => v(`--cat-${i}`));
  const tradition = {};
  for (const f of RELIGION_FAMILIES) {
    const base = d3.lab(cat[f.slot]);
    f.members.forEach((m, i) => {
      // first member = family base; later members step lighter/darker alternately so shades stay inside the family hue
      const step = i === 0 ? 0 : (i % 2 ? 1 : -1) * Math.ceil(i / 2) * 9;
      tradition[m] = d3.lab(base.l + step, base.a, base.b).formatHex();
    });
  }
  cache = {
    dark: isDark(),
    ocean: v('--ocean'), land: v('--land'), landHover: v('--land-2'), landMuted: v('--land-muted'),
    border: v('--geo-border'), coast: v('--geo-coast'), graticule: v('--graticule'),
    fg: v('--fg'), fg2: v('--fg-2'), fg3: v('--fg-3'), halo: v('--label-halo'),
    accent: v('--accent'), accent2: v('--accent-2'), sel: v('--sel'), hatch: v('--hatch'),
    cat,
    sev: Object.fromEntries(SEVERITY.map((s) => [s.id, v(`--sev-${s.id}`)])),
    family: Object.fromEntries(RELIGION_FAMILIES.map((f) => [f.id, cat[f.slot]])),
    tradition,
    edge: Object.fromEntries(Object.entries(EDGE_SLOT).map(([k, s]) => [k, cat[s]])),
    resClass: Object.fromEntries(RESOURCE_CLASSES.map((c) => [c.id, cat[c.slot]])),
    seq: (t) => d3.interpolateLab(v('--seq-0'), v('--seq-1'))(Math.max(0, Math.min(1, t))),
    status: { good: v('--good'), warn: v('--warn'), critical: v('--critical') },
  };
  return cache;
}

/** Tradition color as a CSS value usable in HTML (resolved hex, so it matches the map exactly). */
export const traditionColor = (tid) => pal().tradition[tid] || pal().cat[0];
