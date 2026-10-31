// Theme-resolved data colours. HTML uses the CSS vars directly (var(--cat-3)); canvas needs hex, so it calls pal().
// pal() is cached and rebuilt when the theme changes. Categorical slots are fixed per entity (never by rank).

import * as d3 from 'd3';
import { EDGE_SLOT, RELIGION_FAMILIES, RESOURCE_CLASSES, SEVERITY } from '../config';
import { useAtlas } from '../app/store';
import { cssVar } from './dom';

export interface Palette {
  dark: boolean;
  ocean: string; land: string; landHover: string; landMuted: string;
  border: string; coast: string; graticule: string;
  fg: string; fg2: string; fg3: string; halo: string;
  accent: string; accent2: string; sel: string; hatch: string;
  cat: string[];
  sev: Record<string, string>;
  family: Record<string, string>;
  tradition: Record<string, string>;
  edge: Record<string, string>;
  resClass: Record<string, string>;
  seq: (t: number) => string;
  status: { good: string; warn: string; critical: string };
}

let cache: Palette | null = null;
useAtlas.subscribe((s, prev) => { if (s.theme !== prev.theme) cache = null; });
if (typeof matchMedia === 'function') matchMedia('(prefers-color-scheme: dark)').addEventListener?.('change', () => { cache = null; });

/** CSS var reference for a categorical slot (0 = neutral). */
export const catVar = (slot?: number) => (slot ? `var(--cat-${slot})` : 'var(--cat-0)');
export const sevVar = (id: string) => `var(--sev-${id})`;
export const edgeVar = (type: string) => catVar(EDGE_SLOT[type] ?? 0);
export const familyVar = (fid: string) => catVar(RELIGION_FAMILIES.find((f) => f.id === fid)?.slot ?? 0);
export const resClassVar = (cid: string) => catVar(RESOURCE_CLASSES.find((c) => c.id === cid)?.slot ?? 0);

/** Is the theme dark right now? (explicit choice or OS setting) */
export function isDark(): boolean {
  const theme = useAtlas.getState().theme;
  if (theme === 'dark') return true;
  if (theme === 'light') return false;
  return typeof matchMedia === 'function' && matchMedia('(prefers-color-scheme: dark)').matches;
}

/** Resolved colours for canvas drawing. */
export function pal(): Palette {
  if (cache) return cache;
  const v = cssVar;
  const cat = Array.from({ length: 9 }, (_, i) => v(`--cat-${i}`));
  const tradition: Record<string, string> = {};
  for (const f of RELIGION_FAMILIES) {
    const base = d3.lab(cat[f.slot] ?? '');
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
    family: Object.fromEntries(RELIGION_FAMILIES.map((f) => [f.id, cat[f.slot] ?? ''])),
    tradition,
    edge: Object.fromEntries(Object.entries(EDGE_SLOT).map(([k, s]) => [k, cat[s] ?? ''])),
    resClass: Object.fromEntries(RESOURCE_CLASSES.map((c) => [c.id, cat[c.slot] ?? ''])),
    seq: (t: number) => d3.interpolateLab(v('--seq-0'), v('--seq-1'))(Math.max(0, Math.min(1, t))),
    status: { good: v('--good'), warn: v('--warn'), critical: v('--critical') },
  };
  return cache;
}

/** Tradition colour as a CSS value usable in HTML (resolved hex, so it matches the map exactly). */
export const traditionColor = (tid: string) => pal().tradition[tid] || pal().cat[0] || '';
