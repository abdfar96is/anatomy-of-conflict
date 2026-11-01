import * as d3 from 'd3';
import { beforeAll, describe, expect, test } from 'vitest';
import { initialState, type AtlasState } from '../src/app/store';
import { build } from '../src/data/build';
import type { DB } from '../src/data/types';
import { buildScene, eventAnchor, tipFor } from '../src/features/map/engine/scene';
import type { Palette } from '../src/ui/palette';
import { readRaw } from './helpers/readRaw';

let db: DB;
let base: AtlasState;
let P: Palette;

beforeAll(() => {
  db = build(readRaw());
  // the boot fills the timeline filter with every category, as legacy main.js did
  const s = initialState();
  base = { ...s, filters: { ...s.filters, timelineCats: new Set(db.timeline.categories.map((c) => c.id)) } };
  const hex = (i: number) => '#' + (0x102030 + i * 0x0b0b0b).toString(16).padStart(6, '0');
  const ids = (list: string[], from: number) => Object.fromEntries(list.map((s, i) => [s, hex(from + i)]));
  P = {
    dark: true, ocean: '#0b1a2a', land: '#2a3440', landHover: '#34404d', landMuted: '#20262e',
    border: '#556070', coast: '#6a7a8a', graticule: '#1a2a3a', fg: '#eeeeee', fg2: '#cccccc', fg3: '#999999', halo: '#000000',
    accent: '#c08040', accent2: '#40a0c0', sel: '#ffd040', hatch: '#888888',
    cat: Array.from({ length: 9 }, (_, i) => hex(i + 1)),
    sev: ids(['war', 'armed-conflict', 'state-collapse', 'high-tension', 'repression', 'frozen', 'post-conflict', 'political'], 20),
    family: {},
    tradition: Object.fromEntries(db.religion.traditions.map((t) => [t.id, '#aa5533'])),
    edge: ids(['alliance', 'military', 'economic', 'influence', 'proxy', 'rivalry', 'territorial', 'diplomatic'], 30),
    resClass: { energy: '#aa0000', critical: '#00aa00', precious: '#0000aa', food: '#aaaa00', tech: '#00aaaa' },
    seq: (t: number) => d3.interpolateLab('#102030', '#f0e0d0')(Math.max(0, Math.min(1, t))),
    status: { good: '#00ff00', warn: '#ffaa00', critical: '#ff0000' },
  };
});

const counts = (s: AtlasState) => {
  const sc = buildScene(db, s, P);
  return {
    fill: sc.fill.size, hatch: sc.hatch.size, markers: sc.markers.length, arcs: sc.arcs.length, labels: sc.labels.length,
    badges: sc.badges.length, outlines: sc.outlines.length, polys: sc.polys.length, under: sc.under.length, emph: sc.emph?.size ?? null,
  };
};

// Expected numbers come from the legacy code: `git archive 87784ee js data` into a scratch folder, then legacy
// js/map-scene.js buildScene() run in Node on that data (d3 7.9.0 as a global, fetch read from disk), with legacy
// store.state defaults, timelineCats filled as main.js did, and a fixed-hex palette stub like the one above.
describe('buildScene matches the legacy scene', () => {
  test('overview', () => {
    expect(counts({ ...base, lens: 'overview' })).toEqual({ fill: 233, hatch: 0, markers: 0, arcs: 0, labels: 0, badges: 54, outlines: 0, polys: 0, under: 99, emph: null });
  });
  test('conflicts', () => {
    expect(counts({ ...base, lens: 'conflicts' })).toEqual({ fill: 80, hatch: 0, markers: 40, arcs: 0, labels: 0, badges: 0, outlines: 0, polys: 0, under: 99, emph: null });
    expect(buildScene(db, { ...base, lens: 'conflicts' }, P).pulse).toBe(true);
  });
  test('conflicts with a conflict selected draws its external powers', () => {
    const s = { ...base, lens: 'conflicts' as const, selection: { kind: 'conflict' as const, id: 'sudan' } };
    expect(counts(s)).toEqual({ fill: 80, hatch: 0, markers: 40, arcs: 5, labels: 0, badges: 0, outlines: 4, polys: 0, under: 99, emph: 5 });
  });
  test('religion', () => {
    expect(counts({ ...base, lens: 'religion' })).toEqual({ fill: 241, hatch: 166, markers: 0, arcs: 0, labels: 0, badges: 17, outlines: 0, polys: 0, under: 99, emph: null });
    const share = { ...base, lens: 'religion' as const, filters: { ...base.filters, religionMode: 'share' as const } };
    expect(counts(share)).toEqual({ fill: 241, hatch: 166, markers: 0, arcs: 0, labels: 0, badges: 17, outlines: 0, polys: 0, under: 99, emph: null });
  });
  test('powers', () => {
    expect(counts({ ...base, lens: 'powers' })).toEqual({ fill: 0, hatch: 0, markers: 0, arcs: 160, labels: 0, badges: 0, outlines: 0, polys: 0, under: 99, emph: null });
    const nato = { ...base, lens: 'powers' as const, filters: { ...base.filters, bloc: 'nato' } };
    expect(counts(nato)).toEqual({ fill: 32, hatch: 0, markers: 0, arcs: 160, labels: 0, badges: 0, outlines: 0, polys: 0, under: 99, emph: null });
    const tur = { ...base, lens: 'powers' as const, selection: { kind: 'country' as const, id: 'TUR' } };
    expect(counts(tur)).toEqual({ fill: 0, hatch: 0, markers: 0, arcs: 8, labels: 0, badges: 0, outlines: 1, polys: 0, under: 99, emph: 1 });
  });
  test('ethnic labels its groups', () => {
    expect(counts({ ...base, lens: 'ethnic' })).toEqual({ fill: 0, hatch: 0, markers: 0, arcs: 0, labels: 41, badges: 0, outlines: 0, polys: 44, under: 99, emph: null });
  });
});

describe('tipFor', () => {
  test('a country hit gives the same line as legacy', () => {
    expect(tipFor({ kind: 'country', id: 'SAU' }, db, { ...base, lens: 'overview' })).toBe(
      '<b>السعودية</b><span class="tip-sub">السكان 34.3 مليون · الناتج المحلي 793 مليار دولار</span><span class="tip-sub">آسيا</span><span class="tip-sub">يتوفّر ملف تعريفي</span>');
    expect(tipFor({ kind: 'country', id: 'CIV' }, db, { ...base, lang: 'en', lens: 'overview' })).toBe(
      '<b>Ivory Coast</b><span class="tip-sub">Population 25.7 M · GDP $58.5 bn</span><span class="tip-sub">Africa</span>');
  });
  test('a country hit escapes the country name', () => {
    const c = db.countries.get('SAU')!;
    const was = c.nameEn;
    c.nameEn = `<img src=x onerror="alert('x')">`;
    try {
      const html = tipFor({ kind: 'country', id: 'SAU' }, db, { ...base, lang: 'en', lens: 'religion' });
      expect(html.startsWith('<b>&lt;img src=x onerror=&quot;alert(&#39;x&#39;)&quot;&gt;</b>')).toBe(true);
      expect(html).not.toContain('<img');
    } finally {
      c.nameEn = was;
    }
  });
  test('an unknown hit gives no tooltip', () => {
    expect(tipFor({ kind: 'country', id: 'XXX' }, db, base)).toBe('');
  });
});

describe('eventAnchor', () => {
  test('pins every event inside one of its own countries', () => {
    const misplaced = db.timeline.events.filter((e) => {
      const a = eventAnchor(db, e);
      return !a || !(e.countries ?? []).some((iso) => { const c = db.countries.get(iso); return c && d3.geoContains(c.feature, a); });
    }).map((e) => e.id);
    expect(misplaced).toEqual([]);
  });
  test('the Gaza events sit in the Gaza Strip, not in Saudi Arabia', () => {
    for (const id of ['oct-7-gaza', 'gaza-ceasefire-2025', 'gaza-ceasefire-year']) {
      expect(d3.geoContains(db.countries.get('PSE')!.feature, eventAnchor(db, db.eventById.get(id)!)!), id).toBe(true);
    }
  });
});
