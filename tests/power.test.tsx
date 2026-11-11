// The Power & industry lens: the GEM power plants model, the map scene and its filters, tooltip, lens card, plant
// dossier with its per-state detail file, search, share links and data checks.

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { act, fireEvent, render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterAll, afterEach, beforeAll, describe, expect, test } from 'vitest';
import { checkData } from '../scripts/check-data';
import { parseHash } from '../src/app/hash';
import { atlas, initialState } from '../src/app/store';
import { DbContext } from '../src/app/useT';
import { LENSES } from '../src/config';
import { build } from '../src/data/build';
import { POWER_SLOT, POWER_TYPES, buildPower, fmtMW, fuelText, inYear, plantId, powerClass, setPower, setPowerCountries, summaryRamp, summaryValue, techText, type Power, type PowerCountries, type PowerMeta } from '../src/data/power';
import type { DB } from '../src/data/types';
import { Dossier } from '../src/features/dossier';
import { activeConflicts, buildScene, tipFor } from '../src/features/map/engine/scene';
import { Legend } from '../src/features/map/Legend';
import { ShellOverlays } from '../src/features/shell';
import '../src/i18n/core';
import type { Palette } from '../src/ui/palette';
import { PICTO } from '../src/ui/pictograms';
import { DATA_DIR, readRaw } from './helpers/readRaw';

const read = (f: string) => JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'power', f), 'utf8'));
const THREE_GORGES = 'L100000601194', MOTUO = 'L100000601028', BARAKAH = 'L100000500011', HASSYAN = 'L100000103749', OROT_RABIN = 'L100000102838';
const MOTHBALLED = 'L100000100136', COTTAM = 'L100000103752';
let db: DB, W: Power;
beforeAll(() => {
  db = build(readRaw());
  W = buildPower(read('plants.json'), read('meta.json') as PowerMeta);
  setPower(W, { CHN: read('detail/CHN.json'), ARE: read('detail/ARE.json'), ISR: read('detail/ISR.json') });
  setPowerCountries(read('countries.json') as PowerCountries);
});
afterEach(() => { atlas.reset(); localStorage.clear(); });
afterAll(() => { setPower(null); setPowerCountries(null); });
const withDb = (ui: ReactNode) => render(<DbContext.Provider value={db}>{ui}</DbContext.Provider>);
const plant = (id: string) => W.byId.get(id)!;

describe('the GEM power model', () => {
  test('plants of eight types, operating, under construction or mothballed, each in a known state', () => {
    expect(W.plants.length).toBeGreaterThan(25000);
    expect(new Set(W.plants.map((p) => p.type))).toEqual(new Set(POWER_TYPES));
    expect(new Set(W.plants.map((p) => p.status))).toEqual(new Set(['operating', 'construction', 'mothballed', 'retired']));
    expect(new Set(W.plants.map((p) => p.id)).size).toBe(W.plants.length);
    for (const p of W.plants) {
      expect(p.id).toMatch(/^L\d{12}$/);
      if (p.iso3) expect(db.countries.has(p.iso3) || ['XKX'].includes(p.iso3)).toBe(true);
    }
    expect(plant(THREE_GORGES)).toMatchObject({ type: 'hydro', status: 'operating', mw: 22500, iso3: 'CHN' });
    expect(plant(BARAKAH)).toMatchObject({ type: 'nuclear', iso3: 'ARE' });
    expect(plant(MOTUO)).toMatchObject({ type: 'hydro', status: 'construction' });
  });

  test('ids, capacity and size classes', () => {
    expect(plantId(601194)).toBe(THREE_GORGES);
    expect(fmtMW(1200, 'en')).toBe('1,200 MW');
    expect(fmtMW(22500, 'en')).toBe('22.5 GW');
    expect(fmtMW(22500, 'ar')).toContain('غيغاواط');
    expect([50, 100, 600, 2000, 5000].map(powerClass)).toEqual([0, 1, 2, 3, 4]);
  });

  test('Arabic names only where GEM gives one in an Arab state', () => {
    expect(plant(HASSYAN).nameAr).toBe('محطة حصيان لإنتاج الطاقة');
    const named = W.plants.filter((p) => p.nameAr);
    expect(named.length).toBeGreaterThan(300);
    expect(named.every((p) => !/[پچژکگی]/.test(p.nameAr!))).toBe(true);
  });

  test('technologies and fuels in Arabic, the rest as GEM gives them', () => {
    expect(techText('run-of-river', 'ar')).toBe('جريان النهر');
    expect(techText('combined cycle', 'en')).toBe('combined cycle');
    expect(fuelText('fossil gas: natural gas [70%], other: hydrogen (unknown) [30%]', 'ar')).toBe('غاز طبيعي (70%)، هيدروجين (30%)');
  });
});

describe('the lens', () => {
  const P = {
    land: '#2a3440', landMuted: '#20262e', fg: '#ffffff', fg2: '#cccccc', fg3: '#999999', sel: '#ffd040', halo: '#000000',
    cat: ['#000', '#3987e5', '#d95926', '#199e70', '#c98500', '#d55181', '#2f9e3a', '#9085e9', '#e66767'],
    seq: () => '#555555', status: { good: '#00ff00', warn: '#ffaa00', critical: '#ff0000' }, resClass: {},
  } as unknown as Palette;
  const S = (filters: Partial<ReturnType<typeof initialState>['filters']> = {}, selection: ReturnType<typeof initialState>['selection'] = null) => {
    const s = initialState();
    return { ...s, lens: 'industry' as const, selection, filters: { ...s.filters, ...filters } };
  };
  const ids = (sc: ReturnType<typeof buildScene>) => sc.points.filter((x) => x.kind === 'station').map((x) => x.id);

  test('is the last lens on the rail', () => {
    expect(LENSES[LENSES.length - 1]!.id).toBe('industry');
  });

  test('each type has its own colour slot, in the palette order, and a pictogram', () => {
    expect(new Set(Object.values(POWER_SLOT)).size).toBe(8);
    expect(POWER_TYPES.map((t) => POWER_SLOT[t])).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
    for (const id of ['sun', 'turbine', 'leaf', 'atom']) expect(PICTO[id]).toBeDefined();
  });

  test('draws the active plants by type and size, rings under construction; the largest as symbols', () => {
    const sc = buildScene(db, S(), P);
    expect(ids(sc)).toHaveLength(W.plants.filter((p) => p.status !== 'mothballed' && p.status !== 'retired').length);
    expect(ids(sc)).not.toContain(COTTAM);
    expect(sc.points.find((x) => x.id === THREE_GORGES)).toMatchObject({ color: P.cat[1], picto: 'hydro', big: true, hollow: undefined });
    expect(sc.points.find((x) => x.id === BARAKAH)).toMatchObject({ color: P.cat[7], picto: 'atom', big: true });
    expect(sc.points.find((x) => x.id === MOTUO)).toMatchObject({ hollow: true });
    // smallest first, so the large ones are drawn on top
    expect(sc.points.map((x) => x.r)).toEqual([...sc.points.map((x) => x.r)].sort((a, b) => a - b));
  });

  test('filters: types, status, and the mothballed layer in steel', () => {
    const nuc = buildScene(db, S({ powerTypes: new Set(['nuclear']) }), P);
    expect(ids(nuc).every((id) => plant(id).type === 'nuclear')).toBe(true);
    expect(ids(nuc)).toContain(BARAKAH);
    expect(ids(buildScene(db, S({ powerStatus: 'construction' }), P)).every((id) => plant(id).status === 'construction')).toBe(true);
    expect(ids(buildScene(db, S(), P))).not.toContain(MOTHBALLED);
    const halted = buildScene(db, S({ powerHalted: true }), P).points.find((x) => x.id === MOTHBALLED)!;
    expect(halted.color).not.toBe(P.cat[8]);
    // a selected plant stays on the map whatever the filters
    expect(ids(buildScene(db, S({ powerTypes: new Set() }, { kind: 'station', id: BARAKAH }), P))).toEqual([BARAKAH]);
  });

  test('a plant tooltip gives its name, type, status, capacity and state; the Arabic name in Arabic', () => {
    atlas.set({ lang: 'en' });
    const tip = tipFor({ kind: 'station', id: THREE_GORGES }, db, { ...atlas.get(), lens: 'industry' });
    expect(tip).toContain('Three Gorges Dam hydroelectric plant');
    expect(tip).toContain('Hydropower · Operating');
    expect(tip).toContain('22.5 GW');
    expect(tip).toContain('China');
    atlas.set({ lang: 'ar' });
    expect(tipFor({ kind: 'station', id: HASSYAN }, db, { ...atlas.get(), lens: 'industry' })).toContain('محطة حصيان لإنتاج الطاقة');
  });

  test('the card toggles types, status and the mothballed layer, and keys the sizes', () => {
    atlas.set({ lens: 'industry', lang: 'en' });
    withDb(<Legend />);
    const legend = document.getElementById('legend')!;
    expect(legend.textContent).toContain('Hydropower');
    expect(legend.textContent).toContain('3 GW or more');
    expect(legend.textContent).toMatch(/plants, about [\d,]+ GW in operation/);
    fireEvent.click(legend.querySelector('[data-key="powerTypes"][data-val="coal"]')!);
    expect(atlas.get().filters.powerTypes.has('coal')).toBe(false);
    fireEvent.click(legend.querySelector('[data-key="powerStatus"][data-val="construction"]')!);
    expect(atlas.get().filters.powerStatus).toBe('construction');
    fireEvent.click(legend.querySelector('[data-key="powerHalted"]')!);
    expect(atlas.get().filters.powerHalted).toBe(true);
  });

  test('the plant dossier: capacity, technology, owner, river and the licensed source', () => {
    atlas.set({ lang: 'en', lens: 'industry' });
    withDb(<Dossier />);
    act(() => { atlas.select('station', THREE_GORGES, { fly: false }); });
    expect(document.getElementById('dossier')!.textContent).toContain('Three Gorges Dam hydroelectric plant');
    const panel = document.getElementById('dz-panel')!;
    expect(panel.textContent).toContain('Capacity in operation');
    expect(panel.textContent).toContain('22.5 GW');
    expect(panel.textContent).toContain('River');
    expect(panel.textContent).toContain('Global Energy Monitor — Global Integrated Power Tracker');
    expect(panel.querySelector('a[href^="https://www.gem.wiki/"]')).not.toBeNull();
  });

  test('a plant that mixes types lists its capacity by type; Arabic labels in Arabic', () => {
    atlas.set({ lang: 'ar', lens: 'industry' });
    withDb(<Dossier />);
    act(() => { atlas.select('station', OROT_RABIN, { fly: false }); });
    const panel = document.getElementById('dz-panel')!;
    expect(panel.textContent).toContain('القدرة حسب النوع');
    expect(panel.textContent).toContain('فحم');
    expect(panel.textContent).toContain('غاز ونفط');
  });

  test('while its state file loads, the dossier shows what the map knows', () => {
    setPower(W, {});
    const saved = globalThis.fetch;
    globalThis.fetch = (() => new Promise(() => {})) as typeof fetch;
    try {
      atlas.set({ lang: 'en', lens: 'industry' });
      withDb(<Dossier />);
      act(() => { atlas.select('station', BARAKAH, { fly: false }); });
      expect(document.getElementById('dz-panel')!.textContent).toContain('Loading the plant details');
    } finally {
      globalThis.fetch = saved;
      setPower(W, { CHN: read('detail/CHN.json'), ARE: read('detail/ARE.json'), ISR: read('detail/ISR.json') });
    }
  });

  test('the search palette finds a plant by its English or Arabic name and opens it in the lens', () => {
    atlas.set({ lang: 'ar' });
    withDb(<><div id="app" /><ShellOverlays /></>);
    fireEvent.keyDown(document.body, { key: '/', code: 'Slash' });
    fireEvent.change(document.getElementById('pal-in')!, { target: { value: 'حصيان' } });
    expect([...document.querySelectorAll('.pal-gh')].map((h) => h.textContent)).toContain('محطات الكهرباء');
    const opt = [...document.querySelectorAll('[role="option"]')].find((o) => o.textContent!.includes('محطة حصيان'))!;
    fireEvent.click(opt);
    expect(atlas.get().lens).toBe('industry');
    expect(atlas.get().selection).toEqual({ kind: 'station', id: HASSYAN });
  });

  test('share links open the lens on a plant before the data loads, and fly there once it is in', () => {
    const sel = { kind: 'station', id: BARAKAH };
    setPower(null);
    expect(parseHash(`station-${BARAKAH}`, db)).toEqual({ patch: { lens: 'industry', selection: sel, view: null } });
    setPower(W, { ARE: read('detail/ARE.json') });
    expect(parseHash(`station-${BARAKAH}`, db)).toEqual({ patch: { lens: 'industry', selection: sel, view: null }, fly: sel });
    expect(parseHash('station-x', db)).toBeNull();
  });
});

describe('the country summary', () => {
  const P = {
    land: '#2a3440', landMuted: '#20262e', fg: '#ffffff', fg2: '#cccccc', fg3: '#999999', sel: '#ffd040', halo: '#000000',
    cat: ['#000', '#3987e5', '#d95926', '#199e70', '#c98500', '#d55181', '#2f9e3a', '#9085e9', '#e66767'],
    seq: (t: number) => `rgb(${Math.round(t * 255)}, 0, 0)`, status: { good: '#00ff00', warn: '#ffaa00', critical: '#ff0000' }, resClass: {},
  } as unknown as Palette;
  const S = (filters: Partial<ReturnType<typeof initialState>['filters']> = {}, selection: ReturnType<typeof initialState>['selection'] = null) => {
    const s = initialState();
    return { ...s, lens: 'industry' as const, selection, filters: { ...s.filters, ...filters } };
  };
  const C = () => read('countries.json') as PowerCountries;

  test('per-state totals: GW in operation, renewable and coal shares, GW under construction', () => {
    const sau = C().SAU!, chn = C().CHN!;
    expect(summaryValue(sau, 'total')).toBeGreaterThan(80);
    expect(summaryValue(sau, 'coal')).toBe(0);
    expect(summaryValue(chn, 'total')).toBeGreaterThan(summaryValue(C().USA, 'total')!);
    expect(summaryValue(chn, 'renew')).toBeGreaterThan(20);
    expect(summaryValue(chn, 'con')).toBeGreaterThan(50);
    expect(summaryValue(undefined, 'total')).toBeNull();
    expect(summaryRamp('renew', 50)).toBe(0.5);
    expect(summaryRamp('total', 3000)).toBeCloseTo(1);
    expect(summaryRamp('total', 0.01)).toBe(0);
  });

  test('zoomed out, the power mode colours the states by the chosen measure; off or in industry mode it does not', () => {
    const sc = buildScene(db, S(), P);
    expect(sc.far?.k).toBeGreaterThan(1);
    expect(sc.far!.fill.get('CHN')).not.toBe(P.landMuted);
    const renew = buildScene(db, S({ powerSummary: 'renew' }), P);
    expect(renew.far!.fill.get('SAU')).not.toBe(renew.far!.fill.get('NOR'));
    expect(buildScene(db, S({ powerSummary: 'off' }), P).far).toBeUndefined();
    expect(buildScene(db, S({ industryMode: 'industry' }), P).far).toBeUndefined();
    // the selected plant stays drawn in the far view
    expect(buildScene(db, S({}, { kind: 'station', id: HASSYAN }), P).points.find((x) => x.id === HASSYAN)!.keep).toBe(true);
  });

  test('a state tooltip in the lens gives its capacity, shares and capacity being built', () => {
    atlas.set({ lang: 'en' });
    const tip = tipFor({ kind: 'country', id: 'CHN' }, db, { ...atlas.get(), lens: 'industry' });
    expect(tip).toMatch(/[\d,]+ GW in operation/);
    expect(tip).toMatch(/Renewables \d+% · coal \d+%/);
    expect(tip).toMatch(/GW under construction/);
  });

  test('the card picks the measure and shows its ramp', () => {
    atlas.set({ lens: 'industry', lang: 'en' });
    withDb(<Legend />);
    const legend = document.getElementById('legend')!;
    expect(legend.textContent).toContain('States when zoomed out');
    fireEvent.click(legend.querySelector('[data-key="powerSummary"][data-val="coal"]')!);
    expect(atlas.get().filters.powerSummary).toBe('coal');
    expect(legend.textContent).toContain('Coal in the capacity in operation');
    fireEvent.click(legend.querySelector('[data-key="powerSummary"][data-val="off"]')!);
    expect(legend.querySelector('.lc-ramp')).toBeNull();
  });

  test('the country dossier lists its electricity capacity by type', () => {
    atlas.set({ lang: 'en', lens: 'industry' });
    withDb(<Dossier />);
    act(() => { atlas.select('country', 'SAU', { fly: false }); });
    fireEvent.click([...document.querySelectorAll('#dossier [role="tab"]')].find((x) => x.textContent!.includes('Resources'))!);
    const sec = document.getElementById('dz-a-electricity')!;
    expect(sec.textContent).toContain('Electricity: capacity in operation by type');
    expect(sec.textContent).toContain('Oil and gas');
    expect(sec.textContent).toMatch(/[\d.]+ GW in operation in all/);
  });
});

describe('the timeline', () => {
  const P = {
    land: '#2a3440', landMuted: '#20262e', fg: '#ffffff', fg2: '#cccccc', fg3: '#999999', sel: '#ffd040', halo: '#000000',
    cat: ['#000', '#3987e5', '#d95926', '#199e70', '#c98500', '#d55181', '#2f9e3a', '#9085e9', '#e66767'],
    seq: (t: number) => `rgb(${Math.round(t * 255)}, 0, 0)`, status: { good: '#00ff00', warn: '#ffaa00', critical: '#ff0000' }, resClass: {},
  } as unknown as Palette;
  const S = (year: number | null, filters: Partial<ReturnType<typeof initialState>['filters']> = {}) => {
    const s = initialState();
    return { ...s, lens: 'industry' as const, year: year ?? 2026, yearFilter: year != null, filters: { ...s.filters, powerSummary: 'off' as const, ...filters } };
  };
  const ids = (sc: ReturnType<typeof buildScene>) => sc.points.filter((x) => x.kind === 'station').map((x) => x.id);

  test('a dated item stands from its first year until it retired; undated ones only without the timeline', () => {
    expect(inYear({ yearFilter: false, year: 1990 }, 2000)).toBe(true);
    expect(inYear({ yearFilter: false, year: 1990 }, 1960, 2019)).toBe(false);
    expect(inYear({ yearFilter: true, year: 1990 }, 1960, 2019)).toBe(true);
    expect(inYear({ yearFilter: true, year: 2019 }, 1960, 2019)).toBe(false);
    expect(inYear({ yearFilter: true, year: 1990 }, 2000)).toBe(false);
    expect(inYear({ yearFilter: true, year: 1990 }, undefined)).toBe(false);
  });

  test('retired plants are kept with their years and show only in the years they ran', () => {
    expect(plant(COTTAM)).toMatchObject({ status: 'retired', type: 'coal', start: 1969, end: 2019, iso3: 'GBR' });
    expect(ids(buildScene(db, S(2000), P))).toContain(COTTAM);
    expect(ids(buildScene(db, S(2020), P))).not.toContain(COTTAM);
    // in 1980 there is no utility solar or wind on the map, and nothing that started later
    const y1980 = ids(buildScene(db, S(1980), P)).map(plant);
    expect(y1980.length).toBeGreaterThan(2000);
    expect(y1980.every((p) => p.start! <= 1980)).toBe(true);
    expect(y1980.filter((p) => p.type === 'solar')).toHaveLength(0);
    expect(ids(buildScene(db, S(1980), P)).length).toBeLessThan(ids(buildScene(db, S(2020), P)).length);
  });

  test('the far summary sums the plants standing that year', () => {
    const sc = buildScene(db, S(1980, { powerSummary: 'renew' }), P);
    const now = buildScene(db, S(null, { powerSummary: 'renew' }), P);
    expect(sc.far!.fill.get('DEU')).not.toBe(now.far!.fill.get('DEU'));
  });

  test('the card offers to play the build-out, and says what the year shows and leaves out', () => {
    atlas.set({ lens: 'industry', lang: 'en' });
    withDb(<Legend />);
    const legend = document.getElementById('legend')!;
    fireEvent.click(legend.querySelector('.tl-play')!);
    expect(atlas.get()).toMatchObject({ yearFilter: true, year: 1950, playing: true });
    act(() => { atlas.set({ playing: false, year: 1990 }); });
    expect(legend.textContent).toContain('The map as of 1990');
    expect(legend.textContent).toMatch(/[\d,]+ items with no known start year are left out/);
    expect(legend.textContent).toContain('GEM tracks coal retirements only since 2000');
  });
});

describe('nuclear plants across the two lenses', () => {
  test('a nuclear station opens its file in the Nuclear lens, and the file opens the station', () => {
    atlas.set({ lang: 'en', lens: 'industry', selection: { kind: 'station', id: BARAKAH } });
    withDb(<Dossier />);
    const toNuclear = document.querySelector<HTMLButtonElement>('#dossier [data-act="nuclear"]')!;
    expect(toNuclear).toHaveTextContent('Nuclear file: Barakah');
    fireEvent.click(toNuclear);
    expect(atlas.get()).toMatchObject({ lens: 'nuclear', selection: { kind: 'plant', id: 'barakah' } });
    expect(atlas.get().filters.nuclearMode).toBe('civil');
    const toStation = document.querySelector<HTMLButtonElement>(`#dossier [data-act="gem"][data-id="${BARAKAH}"]`)!;
    expect(toStation).toHaveTextContent('Barakah');
    expect(document.getElementById('dz-panel')!.textContent).toContain('capacity, unit counts and how sites are split can differ');
    fireEvent.click(toStation);
    expect(atlas.get()).toMatchObject({ lens: 'industry', selection: { kind: 'station', id: BARAKAH } });
    // a station of another type has no nuclear file
    act(() => { atlas.select('station', HASSYAN, { fly: false }); });
    expect(document.querySelector('#dossier [data-act="nuclear"]')).toBeNull();
  });

  test("a conflict's Energy tab lists the nuclear plants tied to it", () => {
    atlas.set({ lang: 'en', selection: { kind: 'conflict', id: 'russia-ukraine' } });
    withDb(<Dossier />);
    fireEvent.click(screen.getByRole('tab', { name: /^Energy/ }));
    const chips = [...document.querySelectorAll('#dossier [data-sel-kind="plant"]')].map((x) => x.getAttribute('data-sel-id'));
    expect(chips).toEqual(expect.arrayContaining(['zaporizhzhia', 'kursk', 'chernobyl', 'khmelnytskyi', 'rivne', 'south-ukraine']));
    expect(chips).not.toContain('bushehr');
  });
});

describe('conflicts over the infrastructure', () => {
  const P = {
    land: '#2a3440', landMuted: '#20262e', fg: '#ffffff', fg2: '#cccccc', fg3: '#999999', sel: '#ffd040', halo: '#000000',
    cat: ['#000', '#3987e5', '#d95926', '#199e70', '#c98500', '#d55181', '#2f9e3a', '#9085e9', '#e66767'],
    seq: (t: number) => `rgb(${Math.round(t * 255)}, 0, 0)`, status: { good: '#00ff00', warn: '#ffaa00', critical: '#ff0000' }, resClass: {},
    sev: { war: '#ff0000', 'armed-conflict': '#ff8800', 'state-collapse': '#ff00aa', 'high-tension': '#ffff00' },
  } as unknown as Palette;
  const S = (on: boolean, extra: Partial<ReturnType<typeof initialState>> = {}) => {
    const s = initialState();
    return { ...s, lens: 'industry' as const, layers: { ...s.layers, conflicts: on }, ...extra };
  };
  const conflictMarkers = (sc: ReturnType<typeof buildScene>) => sc.markers.filter((m) => m.kind === 'conflict');

  test('the conflicts layer draws active fighting over the lens, and a selected conflict whatever its severity', () => {
    expect(conflictMarkers(buildScene(db, S(false), P))).toHaveLength(0);
    const sc = buildScene(db, S(true), P);
    const ids = conflictMarkers(sc).map((m) => m.id);
    expect(ids).toEqual(expect.arrayContaining(['russia-ukraine', 'sudan', 'yemen', 'haiti']));
    expect(ids).not.toContain('taiwan-strait');
    expect(ids).toHaveLength(activeConflicts(db, initialState()).length);
    expect(sc.pulse).toBe(true);
    const sel = buildScene(db, S(true, { selection: { kind: 'conflict', id: 'taiwan-strait' } }), P);
    expect(conflictMarkers(sel).map((m) => m.id)).toContain('taiwan-strait');
    // the conflicts lens draws its own markers, once
    const own = buildScene(db, { ...S(true), lens: 'conflicts' }, P);
    expect(new Set(conflictMarkers(own).map((m) => m.id)).size).toBe(conflictMarkers(own).length);
  });

  test('the infrastructure card turns the layer on and keys it', () => {
    atlas.set({ lens: 'industry', lang: 'en' });
    withDb(<Legend />);
    const legend = document.getElementById('legend')!;
    const chip = legend.querySelector('[data-key="conflicts"]')!;
    expect(chip).toHaveAttribute('aria-pressed', 'false');
    expect(legend.textContent).not.toContain('click one for the power capacity');
    fireEvent.click(chip);
    expect(atlas.get().layers.conflicts).toBe(true);
    expect(legend.textContent).toContain('Active war');
    expect(legend.textContent).toContain('click one for the power capacity');
  });

  test('a conflict dossier gives the power capacity of each state involved and opens the lenses with the layer on', () => {
    atlas.set({ lang: 'en', selection: { kind: 'conflict', id: 'russia-ukraine' } });
    withDb(<Dossier />);
    fireEvent.click(screen.getByRole('tab', { name: /^Energy/ }));
    const rows = [...document.querySelectorAll('#dossier .dz-pwr tbody tr')];
    expect(rows.map((r) => r.getAttribute('data-hl'))).toEqual(['RUS', 'UKR']);
    const [op, con, top] = [...rows[1]!.querySelectorAll('td')].map((td) => td.textContent);
    // Ukraine: about 31 GW in operation, none under construction, nuclear the largest
    expect([op, con, top]).toEqual(['31', '—', 'Nuclear']);
    expect(document.getElementById('dz-panel')!.textContent).toContain('does not say which plants lie where the fighting is');
    fireEvent.click(document.querySelector('#dossier [data-act="cf-industry"]')!);
    expect(atlas.get()).toMatchObject({ lens: 'industry', selection: { kind: 'conflict', id: 'russia-ukraine' } });
    expect(atlas.get().layers.conflicts).toBe(true);
    expect(atlas.get().filters.industryMode).toBe('power');
    fireEvent.click(document.querySelector('#dossier [data-act="cf-pipelines"]')!);
    expect(atlas.get().lens).toBe('pipelines');
  });
});

describe('check-data on the power files', () => {
  let dir: string;
  beforeAll(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 'atlas-power-'));
    fs.cpSync(DATA_DIR, dir, { recursive: true });
    const pf = path.join(dir, 'power/plants.json');
    const raw = JSON.parse(fs.readFileSync(pf, 'utf8'));
    raw.t = 'x' + raw.t.slice(1);
    fs.writeFileSync(pf, JSON.stringify(raw));
    const df = path.join(dir, 'power/detail/ARE.json');
    const d = JSON.parse(fs.readFileSync(df, 'utf8'));
    delete d[BARAKAH];
    fs.writeFileSync(df, JSON.stringify(d));
  });
  afterAll(() => fs.rmSync(dir, { recursive: true, force: true }));

  test('reports an unknown type code and a plant missing from its detail file', () => {
    const lines = checkData(dir).map((p) => `${p.file} › ${p.path} › ${p.message}`);
    expect(lines).toContain('power/plants.json › t[0] › unknown type code');
    expect(lines).toContain(`power/detail/ARE.json › ${BARAKAH} › plant missing from its detail file`);
  });
});
