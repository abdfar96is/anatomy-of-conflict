// The industry mode of the Power & industry lens: GEM's coal mines, coal terminals, iron ore mines, iron and steel,
// cement and chemical plants; the scene and its filters, tooltip, card, dossier, search, share links and data checks.

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { act, fireEvent, render } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterAll, afterEach, beforeAll, describe, expect, test } from 'vitest';
import { checkData } from '../scripts/check-data';
import { parseHash } from '../src/app/hash';
import { atlas, initialState } from '../src/app/store';
import { DbContext } from '../src/app/useT';
import { build } from '../src/data/build';
import { INDUSTRY_LAYERS, LAYER, buildIndustry, facilityClass, fmtTonnes, setIndustry, termText, type Facility, type Industry, type IndustryMeta } from '../src/data/industry';
import { buildPower, setPower, type PowerMeta } from '../src/data/power';
import type { DB } from '../src/data/types';
import { Dossier } from '../src/features/dossier';
import { buildScene, tipFor } from '../src/features/map/engine/scene';
import { Legend } from '../src/features/map/Legend';
import { ShellOverlays } from '../src/features/shell';
import '../src/i18n/core';
import type { Palette } from '../src/ui/palette';
import { PICTO } from '../src/ui/pictograms';
import { DATA_DIR, readRaw } from './helpers/readRaw';

const read = (f: string) => JSON.parse(fs.readFileSync(path.join(DATA_DIR, f), 'utf8'));
const KUSMUNDA = 'M0564', HELWAN = 'P100000126716', POSCO = 'P100000120699', BUSAN = 'T1299', SERRA_NORTE = 'P100000128206';
let db: DB, X: Industry;
beforeAll(() => {
  db = build(readRaw());
  X = buildIndustry(read('industry/sites.json') as Facility[], read('industry/meta.json') as IndustryMeta);
  setIndustry(X);
  setPower(buildPower(read('power/plants.json'), read('power/meta.json') as PowerMeta));
});
afterEach(() => { atlas.reset(); localStorage.clear(); });
afterAll(() => { setIndustry(null); setPower(null); });
const withDb = (ui: ReactNode) => render(<DbContext.Provider value={db}>{ui}</DbContext.Provider>);
const site = (id: string) => X.byId.get(id)!;

describe('the GEM industry model', () => {
  test('six layers of operating, under-construction and mothballed sites, each in a known state', () => {
    expect(X.sites.length).toBeGreaterThan(10000);
    expect(new Set(X.sites.map((x) => x.l))).toEqual(new Set(INDUSTRY_LAYERS));
    expect(new Set(X.sites.map((x) => x.st))).toEqual(new Set(['operating', 'construction', 'mothballed']));
    expect(new Set(X.sites.map((x) => x.id)).size).toBe(X.sites.length);
    for (const l of INDUSTRY_LAYERS) expect(X.meta.sources[l].license).toBe('CC BY 4.0');
    expect(site(KUSMUNDA)).toMatchObject({ l: 'cm', c: 'IND', st: 'operating', cap: 75 });
    expect(site(POSCO)).toMatchObject({ l: 'st', c: 'KOR' });
    expect(site(HELWAN)).toMatchObject({ l: 'ce', c: 'EGY', ar: 'مصنع حلوان للإسمنت' });
  });

  test('sizes by the layer\'s own scale, and units by layer', () => {
    expect(facilityClass(site(KUSMUNDA))).toBe(4);
    expect(facilityClass(site(SERRA_NORTE))).toBe(4);
    expect(fmtTonnes(site(KUSMUNDA), 75, 'en')).toBe('75 million tonnes a year');
    expect(fmtTonnes(site(POSCO), 1200, 'en')).toBe('1,200 thousand tonnes a year');
    for (const l of INDUSTRY_LAYERS) expect(PICTO[LAYER[l].picto]).toBeDefined();
  });

  test('common tracker values in Arabic, the rest as GEM gives them', () => {
    expect(termText('BF; BOF', 'ar')).toBe('الفرن العالي، فرن الأكسجين القاعدي');
    expect(termText('Lignite', 'ar')).toBe('ليغنيت');
    expect(termText('Lignite', 'en')).toBe('Lignite');
    expect(termText('something new', 'ar')).toBe('something new');
  });
});

describe('the industry mode', () => {
  const P = {
    land: '#2a3440', landMuted: '#20262e', fg: '#ffffff', fg2: '#cccccc', fg3: '#999999', sel: '#ffd040', halo: '#000000',
    cat: ['#6b7c89', '#3987e5', '#d95926', '#199e70', '#c98500', '#d55181', '#2f9e3a', '#9085e9', '#e66767'],
    seq: () => '#555555', status: { good: '#00ff00', warn: '#ffaa00', critical: '#ff0000' }, resClass: {},
  } as unknown as Palette;
  const S = (filters: Partial<ReturnType<typeof initialState>['filters']> = {}, selection: ReturnType<typeof initialState>['selection'] = null) => {
    const s = initialState();
    return { ...s, lens: 'industry' as const, selection, filters: { ...s.filters, ...filters } };
  };
  const ids = (sc: ReturnType<typeof buildScene>, kind = 'facility') => sc.points.filter((x) => x.kind === kind).map((x) => x.id);

  test('one mode at a time: power plants by default, mines and industry when chosen', () => {
    const power = buildScene(db, S(), P);
    expect(ids(power)).toHaveLength(0);
    expect(ids(power, 'station').length).toBeGreaterThan(25000);
    const ind = buildScene(db, S({ industryMode: 'industry' }), P);
    expect(ids(ind, 'station')).toHaveLength(0);
    expect(ids(ind)).toHaveLength(X.sites.filter((x) => x.st !== 'mothballed').length);
    expect(ind.points.find((x) => x.id === KUSMUNDA)).toMatchObject({ color: P.cat[0], picto: 'coal', big: true });
    expect(ind.points.find((x) => x.id === HELWAN)).toMatchObject({ color: P.cat[4], picto: 'silo' });
  });

  test('filters: layers, status, the mothballed layer; a selected site stays drawn', () => {
    const steel = buildScene(db, S({ industryMode: 'industry', industryLayers: new Set(['st']) }), P);
    expect(ids(steel).every((id) => site(id).l === 'st')).toBe(true);
    expect(ids(buildScene(db, S({ industryMode: 'industry', powerStatus: 'construction' }), P)).every((id) => site(id).st === 'construction')).toBe(true);
    const mb = X.sites.find((x) => x.st === 'mothballed')!;
    expect(ids(buildScene(db, S({ industryMode: 'industry' }), P))).not.toContain(mb.id);
    expect(ids(buildScene(db, S({ industryMode: 'industry', powerHalted: true }), P))).toContain(mb.id);
    expect(ids(buildScene(db, S({ industryLayers: new Set() }, { kind: 'facility', id: HELWAN }), P))).toEqual([HELWAN]);
  });

  test('a site tooltip gives its name, layer, status, capacity and state; the Arabic name in Arabic', () => {
    atlas.set({ lang: 'en' });
    const tip = tipFor({ kind: 'facility', id: KUSMUNDA }, db, { ...atlas.get(), lens: 'industry' });
    expect(tip).toContain('Kusmunda Coal Mine');
    expect(tip).toContain('Coal mine · Operating');
    expect(tip).toContain('Capacity 75 million tonnes a year');
    expect(tip).toContain('India');
    atlas.set({ lang: 'ar' });
    expect(tipFor({ kind: 'facility', id: HELWAN }, db, { ...atlas.get(), lens: 'industry' })).toContain('مصنع حلوان للإسمنت');
  });

  test('the card switches modes and toggles the layers', () => {
    atlas.set({ lens: 'industry', lang: 'en' });
    withDb(<Legend />);
    const legend = document.getElementById('legend')!;
    expect(legend.textContent).toContain('Hydropower');
    fireEvent.click(legend.querySelector('[data-key="industryMode"][data-val="industry"]')!);
    expect(atlas.get().filters.industryMode).toBe('industry');
    expect(legend.textContent).toContain('Cement plants');
    expect(legend.textContent).toMatch(/[\d,]+ sites shown/);
    fireEvent.click(legend.querySelector('[data-key="industryLayers"][data-val="ce"]')!);
    expect(atlas.get().filters.industryLayers.has('ce')).toBe(false);
  });

  test('the site dossier: capacity, output, coal type, methane, owner and the licensed source', () => {
    atlas.set({ lang: 'en', lens: 'industry' });
    withDb(<Dossier />);
    act(() => { atlas.select('facility', KUSMUNDA, { fly: false }); });
    expect(document.getElementById('dossier')!.textContent).toContain('Kusmunda Coal Mine');
    const panel = document.getElementById('dz-panel')!;
    expect(panel.textContent).toContain('Capacity in operation');
    expect(panel.textContent).toContain('Coal type');
    expect(panel.textContent).toContain('Methane emissions (GEM estimate)');
    expect(panel.textContent).toContain('Global Energy Monitor — Global Coal Mine Tracker');
    expect(panel.querySelector('a[href^="https://www.gem.wiki/"]')).not.toBeNull();
  });

  test('selecting a site switches the lens to its industry mode', () => {
    atlas.set({ lang: 'ar', lens: 'industry' });
    withDb(<><Legend /><Dossier /></>);
    act(() => { atlas.select('facility', HELWAN, { fly: false }); });
    expect(atlas.get().filters.industryMode).toBe('industry');
    expect(document.getElementById('dossier')!.textContent).toContain('مصنع حلوان للإسمنت');
    expect(document.getElementById('dz-panel')!.textContent).toContain('مليون طن سنوياً');
  });

  test('the search palette finds a site by name or owner and opens it', () => {
    atlas.set({ lang: 'en' });
    withDb(<><div id="app" /><ShellOverlays /></>);
    fireEvent.keyDown(document.body, { key: '/', code: 'Slash' });
    fireEvent.change(document.getElementById('pal-in')!, { target: { value: 'Busan Port Coal' } });
    expect([...document.querySelectorAll('.pal-gh')].map((h) => h.textContent)).toContain('Mines and plants');
    const opt = [...document.querySelectorAll('[role="option"]')].find((o) => o.textContent!.includes('Busan Port Coal Terminal'))!;
    fireEvent.click(opt);
    expect(atlas.get().lens).toBe('industry');
    expect(atlas.get().selection).toEqual({ kind: 'facility', id: BUSAN });
  });

  test('share links open the lens on a site before the data loads, and fly there once it is in', () => {
    setIndustry(null);
    expect(parseHash(`facility-${KUSMUNDA}`, db)).toEqual({ patch: { lens: 'industry', selection: { kind: 'facility', id: KUSMUNDA }, view: null } });
    setIndustry(X);
    expect(parseHash(`facility-${HELWAN}`, db)?.fly).toEqual({ kind: 'facility', id: HELWAN });
    expect(parseHash(`facility-${BUSAN}`, db)?.patch?.selection).toEqual({ kind: 'facility', id: BUSAN });
    expect(parseHash('facility-x', db)).toBeNull();
  });
});

describe('check-data on the industry files', () => {
  let dir: string;
  beforeAll(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 'atlas-industry-'));
    fs.cpSync(DATA_DIR, dir, { recursive: true });
    const f = path.join(dir, 'industry/sites.json');
    const sites = JSON.parse(fs.readFileSync(f, 'utf8'));
    sites[0].l = 'xx';
    sites[1].id = sites[2].id;
    fs.writeFileSync(f, JSON.stringify(sites));
  });
  afterAll(() => fs.rmSync(dir, { recursive: true, force: true }));

  test('reports an unknown layer and a duplicate id', () => {
    const lines = checkData(dir).map((p) => `${p.file} › ${p.path} › ${p.message}`);
    expect(lines).toContain('industry/sites.json › [0].l › unknown layer');
    expect(lines).toContain('industry/sites.json › [2].id › duplicate id');
  });
});
