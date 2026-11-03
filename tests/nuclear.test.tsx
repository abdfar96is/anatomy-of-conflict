// The nuclear lens: the curated file, the model, the map scene, the legend, the tooltip and the country dossier.

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { act, fireEvent, render, screen } from '@testing-library/react';
import * as d3 from 'd3';
import type { ReactNode } from 'react';
import { afterAll, afterEach, beforeAll, describe, expect, test } from 'vitest';
import { checkData } from '../scripts/check-data';
import { formatJson } from '../scripts/format-json';
import { atlas, initialState, type AtlasState } from '../src/app/store';
import { DbContext } from '../src/app/useT';
import { LENSES } from '../src/config';
import { build } from '../src/data/build';
import type { DB, NuclearFile } from '../src/data/types';
import { Dossier } from '../src/features/dossier';
import { buildScene, tipFor } from '../src/features/map/engine/scene';
import { Legend } from '../src/features/map/Legend';
import { useGlobalKeys } from '../src/features/shell/keyboard';
import '../src/i18n/core';
import { translate } from '../src/i18n/strings';
import type { Palette } from '../src/ui/palette';
import { DATA_DIR, readRaw } from './helpers/readRaw';

let db: DB;
beforeAll(() => { db = build(readRaw()); });
afterEach(() => { atlas.reset(); localStorage.clear(); });
const en = (key: string, vars?: Record<string, string | number>) => translate('en', key, vars);
const file = () => JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'curated/nuclear.json'), 'utf8')) as NuclearFile;

describe('the nuclear data', () => {
  test('SIPRI country estimates add up to its world total for the same year', () => {
    const w = file().warheads;
    expect(w.year).toBe(2026);
    expect(Object.values(w.values).reduce((a, b) => a + b, 0)).toBe(12187);
    expect(Object.keys(w.values).sort()).toEqual(['CHN', 'FRA', 'GBR', 'IND', 'ISR', 'PAK', 'PRK', 'RUS', 'USA']);
  });

  test('every state with a military status names its sources and a check date', () => {
    for (const [iso, r] of Object.entries(file().countries)) {
      if (r.weapons) {
        expect(r.sources?.length, iso).toBeGreaterThan(0);
        expect(r.verified, iso).toBeTruthy();
      }
    }
  });
});

describe('the model', () => {
  test('links status, warheads, NPT and zones to each country', () => {
    expect(db.countries.get('USA')!.nuclear).toMatchObject({ weapons: 'npt-nws', npt: 'nws', civil: 'operating', warheads: 5042, zones: [] });
    expect(db.countries.get('BEL')!.nuclear).toMatchObject({ weapons: 'host', host: 'USA', npt: 'party' });
    expect(db.countries.get('ISR')!.nuclear).toMatchObject({ weapons: 'undeclared', npt: 'non-party', warheads: 90 });
    expect(db.countries.get('PRK')!.nuclear.npt).toBe('withdrawn');
    expect(db.countries.get('BRA')!.nuclear.zones).toEqual(['tlatelolco']);
    expect(db.countries.get('KAZ')!.nuclear).toMatchObject({ weapons: 'relinquished', zones: ['central-asia'] });
  });
  test('NPT membership defaults to "party" only for UN member states', () => {
    expect(db.countries.get('SAU')!.nuclear.npt).toBe('party');
    expect(db.countries.get('TWN')!.nuclear.npt).toBeUndefined();
    expect(db.countries.get('SOL')!.nuclear.npt).toBeUndefined();
    expect(db.countries.get('GRL')!.nuclear.npt).toBeUndefined(); // Natural Earth calls it a "Country"; it is Denmark's
    expect(db.countries.get('HKG')!.nuclear.npt).toBeUndefined();
    expect(db.countries.get('FRA')!.nuclear.npt).toBe('nws');
    expect(db.countries.get('DNK')!.nuclear.npt).toBe('party');
  });
});

describe('the map', () => {
  const P = {
    land: '#2a3440', landMuted: '#20262e', accent2: '#40a0c0', hatch: '#888888',
    cat: Array.from({ length: 9 }, (_, i) => `#${(0x203040 + i * 0x101010).toString(16)}`),
    seq: (t: number) => d3.interpolateLab('#102030', '#f0e0d0')(t),
    status: { good: '#00ff00', warn: '#ffaa00', critical: '#ff0000' },
  } as unknown as Palette;
  const S = (nuclearMode: AtlasState['filters']['nuclearMode']): AtlasState => {
    const s = initialState();
    return { ...s, lens: 'nuclear', filters: { ...s.filters, nuclearMode } };
  };

  test('military mode colours the armed, hosting and contested states and hatches unconfirmed ones', () => {
    const sc = buildScene(db, S('military'), P);
    for (const iso of ['USA', 'RUS', 'ISR', 'BEL', 'BLR', 'IRN', 'ZAF']) expect(sc.fill.has(iso), iso).toBe(true);
    expect(sc.fill.has('SAU')).toBe(false);
    expect([...sc.hatch].filter((iso) => ['ISR', 'BLR', 'USA', 'BEL'].includes(iso)).sort()).toEqual(['BLR', 'ISR']);
    expect(sc.fill.get('IRN')).not.toBe(sc.fill.get('BEL'));
  });
  test('civil and zone modes', () => {
    const civil = buildScene(db, S('civil'), P);
    expect(civil.fill.has('JPN')).toBe(true);
    expect(civil.hatch.has('DEU')).toBe(true);
    const zones = buildScene(db, S('zones'), P);
    expect(zones.fill.has('BRA')).toBe(true);
    expect(zones.fill.has('USA')).toBe(false);
  });
  test('the tooltip follows the mode', () => {
    const tip = (iso: string, mode: AtlasState['filters']['nuclearMode']) => tipFor({ kind: 'country', id: iso }, db, { ...S(mode), lang: 'en' });
    expect(tip('USA', 'military')).toContain(en('map.tip.nuc.warheads', { n: '5,042', y: 2026 }));
    expect(tip('SAU', 'military')).toContain(en('map.tip.nuc.none'));
    expect(tip('BRA', 'zones')).toContain('Treaty of Tlatelolco (1967)');
    expect(tip('FRA', 'civil')).toContain('Runs power reactors');
  });
});

describe('the lens', () => {
  const withDb = (ui: ReactNode) => render(<DbContext.Provider value={db}>{ui}</DbContext.Provider>);

  test('is on the rail and reachable from the keyboard (7), with 0 for the tenth lens', () => {
    const Keys = () => { useGlobalKeys(); return null; };
    render(<Keys />);
    expect(LENSES.map((l) => l.id).indexOf('nuclear')).toBe(6);
    fireEvent.keyDown(document.body, { key: '7', code: 'Digit7' });
    expect(atlas.get().lens).toBe('nuclear');
    fireEvent.keyDown(document.body, { key: '0', code: 'Digit0' });
    expect(atlas.get().lens).toBe(LENSES[9].id);
  });

  test('legend: mode chips switch filters.nuclearMode and the keys count states', () => {
    atlas.set({ lens: 'nuclear', lang: 'en' });
    withDb(<Legend />);
    const row = (label: string) => [...document.querySelectorAll('#legend .lc-keys li')].find((li) => li.textContent?.includes(label));
    expect(row('NPT nuclear-weapon state')?.querySelector('.n')?.textContent).toBe('5');
    expect(row('Hosts US weapons (NATO)')?.querySelector('.n')?.textContent).toBe('5');
    fireEvent.click(screen.getByRole('button', { name: en('map.nc.zones') }));
    expect(atlas.get().filters.nuclearMode).toBe('zones');
    expect(row('Treaty of Pelindaba')?.querySelector('.n')?.textContent).toBe('54');
  });

  test('country dossier: a nuclear profile with the SIPRI estimate, its year and sources', () => {
    atlas.set({ lang: 'en' });
    withDb(<Dossier />);
    act(() => { atlas.select('country', 'ISR', { fly: false }); });
    const sec = document.getElementById('dz-a-nuclear')!;
    expect(sec.textContent).toContain('Undeclared arsenal');
    const w = [...sec.querySelectorAll('.dz-fact')].find((f) => f.querySelector('dt')?.textContent === en('dz.nc.warheads'))!;
    expect(w.querySelector('dd')!.textContent).toBe('902026 · SIPRI');
    expect(sec.querySelectorAll('.dz-pv a').length).toBeGreaterThan(0);
    act(() => { atlas.select('country', 'SAU', { fly: false }); });
    expect(document.getElementById('dz-a-nuclear')).toBeNull();
  });
});

describe('nuclear power plants', () => {
  const inService = (iso: string) => db.nuclear.plants.filter((p) => p.iso3 === iso).reduce((n, p) => n + p.count.operating + p.count.suspended, 0);

  test('units roll up into plants, with the 2024–2026 changes and their sources', () => {
    expect(db.nuclear.plants.length).toBeGreaterThan(200);
    const z = db.plantById.get('zaporizhzhia')!;
    expect(z).toMatchObject({ iso3: 'UKR', status: 'suspended', conflictIds: ['russia-ukraine'] });
    expect(z.count.suspended).toBe(6);
    const maanshan = db.plantById.get('maanshan')!;
    expect(maanshan.status).toBe('shutdown');
    expect(maanshan.units.find((u) => u.name === 'Maanshan-2')?.changed).toMatchObject({ year: 2025 });
    const barakah = db.plantById.get('barakah')!;
    expect(barakah.count.operating).toBe(4);
    expect(barakah.units.find((u) => u.name === 'Barakah-4')).toMatchObject({ mw: 1337, changed: { year: 2024 } });
    expect(db.countries.get('UKR')!.nuclear.plants).toContain('zaporizhzhia');
  });

  test('plant data agrees with the Reactor Atlas 2026 country table', () => {
    // known gaps: CEFR (an experimental fast reactor) in China, one long-idle unit in India, and North Korea's two small
    // Yongbyon-era units, which the plant data does not hold
    const GAP: Record<string, number> = { CHN: 1, IND: 1, PRK: -2 };
    for (const [iso, [reactors]] of Object.entries(db.nuclear.fleet.values)) expect(inService(iso) - reactors, iso).toBe(GAP[iso] ?? 0);
    // units under construction match exactly, the ones added from Reactor Atlas plant pages included
    const building = (iso: string) => db.nuclear.plants.filter((p) => p.iso3 === iso).reduce((n, p) => n + p.count.building, 0);
    for (const [iso, [, , uc]] of Object.entries(db.nuclear.fleet.values)) expect(building(iso), iso).toBe(uc);
    const lufeng = db.plantById.get('lufeng')!;
    expect(lufeng).toMatchObject({ iso3: 'CHN', status: 'building' });
    expect(lufeng.units.find((u) => u.name === 'Lufeng 1')?.changed).toEqual({ year: 2025, sources: ['https://reactoratlas.com/en/reactor/china-lufeng-nuclear-power-plant'] });
    expect(db.plantById.has('baltic')).toBe(false);
    atlas.set({ lang: 'en' });
    render(<DbContext.Provider value={db}><Dossier /></DbContext.Provider>);
    act(() => { atlas.select('plant', 'lufeng', { fly: false }); });
    const cap = [...document.querySelectorAll('#dz-panel .dz-fact')].find((f) => f.querySelector('dt')?.textContent === en('dz.pl.buildingMw'))!;
    expect(cap.querySelector('.dz-fsrc')!.textContent).toBe('Reactor Atlas');
    act(() => { atlas.reset(); });
  });

  test('every state\'s civil status agrees with the plants and the 2026 table, and is checked', () => {
    for (const c of db.countries.values()) {
      const n = c.nuclear, fl = n.fleet;
      if (c.iso3 === 'PRK') continue;
      if (n.civil === 'phased-out') {
        // no reactor in service, and any plant on record is shut (Italy's closed before the plant data starts)
        expect(fl?.reactors ?? 0, c.iso3).toBe(0);
        expect(n.plants.every((id) => db.plantById.get(id)!.status === 'shutdown'), c.iso3).toBe(true);
      } else {
        expect(n.civil, c.iso3).toBe(fl?.reactors ? 'operating' : fl?.building ? 'building' : undefined);
      }
      if (n.civil) expect(db.raw.nuclear.countries[c.iso3]?.verified, c.iso3).toBeTruthy();
    }
  });

  test('civil mode draws every plant, sized by capacity; other modes only a selected plant', () => {
    const P = { land: '#2a3440', landMuted: '#20262e', accent2: '#40a0c0', fg3: '#999999', cat: Array(9).fill('#888888'), seq: () => '#555555', status: { good: '#00ff00', warn: '#ffaa00', critical: '#ff0000' } } as unknown as Palette;
    const s = initialState();
    const civil = buildScene(db, { ...s, lens: 'nuclear', filters: { ...s.filters, nuclearMode: 'civil' } }, P);
    const plants = civil.markers.filter((m) => m.kind === 'plant');
    expect(plants.length).toBe(db.nuclear.plants.length);
    const r = (id: string) => plants.find((m) => m.id === id)!.r;
    expect(r('kashiwazaki-kariwa')).toBeGreaterThan(r('borssele'));
    expect(plants.find((m) => m.id === 'zaporizhzhia')!.shape).toBe('dashed');
    const military = buildScene(db, { ...s, lens: 'nuclear', selection: { kind: 'plant', id: 'bushehr' } }, P);
    expect(military.markers.filter((m) => m.kind === 'plant').map((m) => m.id)).toEqual(['bushehr']);
  });

  test('tooltip, search and the plant dossier', () => {
    const tip = tipFor({ kind: 'plant', id: 'zaporizhzhia' }, db, { ...initialState(), lang: 'en', lens: 'nuclear' });
    expect(tip).toContain('Zaporizhzhia');
    expect(tip).toContain('6 Idle');
    expect(db.search('زابوريجيا').some((e) => e.kind === 'plant' && e.id === 'zaporizhzhia')).toBe(true);

    atlas.set({ lang: 'en' });
    render(<DbContext.Provider value={db}><Dossier /></DbContext.Provider>);
    act(() => { atlas.select('plant', 'zaporizhzhia', { fly: false }); });
    const panel = document.getElementById('dz-panel')!;
    expect(panel.querySelectorAll('.dz-units tbody tr').length).toBe(6);
    expect(panel.querySelector('[data-sel-kind="conflict"][data-sel-id="russia-ukraine"]')).not.toBeNull();
    expect(panel.textContent).toContain('cold shutdown since April 2025');
    expect([...panel.querySelectorAll('.dz-pv a')].map((a) => a.getAttribute('href'))).toContain('https://github.com/cristianst85/GeoNuclearData');
  });

  test('the country profile adds the 2026 fleet with its source and links its plants', () => {
    atlas.set({ lang: 'en' });
    render(<DbContext.Provider value={db}><Dossier /></DbContext.Provider>);
    act(() => { atlas.select('country', 'UKR', { fly: false }); });
    const sec = document.getElementById('dz-a-nuclear')!;
    const fact = [...sec.querySelectorAll('.dz-fact')].find((f) => f.querySelector('dt')?.textContent === en('dz.nc.fleet'))!;
    expect(fact.querySelector('dd')!.textContent).toBe('152026 · Reactor Atlas');
    expect(sec.querySelector('[data-sel-kind="plant"][data-sel-id="zaporizhzhia"]')).not.toBeNull();
  });
});

describe('check-data on the nuclear file', () => {
  let dir: string;
  beforeAll(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 'atlas-nuclear-'));
    fs.cpSync(DATA_DIR, dir, { recursive: true });
    const f = path.join(dir, 'curated/nuclear.json');
    const n = JSON.parse(fs.readFileSync(f, 'utf8'));
    n.countries.BEL.host = 'USX';
    n.zones[0].members.push('ZZZ');
    fs.writeFileSync(f, formatJson(n));
    const pf = path.join(dir, 'curated/nuclear_plants.json');
    const pl = JSON.parse(fs.readFileSync(pf, 'utf8'));
    pl.plants[0].iso3 = 'QQQ';
    fs.writeFileSync(pf, formatJson(pl));
  });
  afterAll(() => fs.rmSync(dir, { recursive: true, force: true }));

  test('reports unknown country codes', () => {
    expect(checkData(dir).map((p) => `${p.file} › ${p.path} › ${p.message}`)).toEqual([
      'nuclear.json › countries.BEL.host › unknown country code',
      expect.stringMatching(/^nuclear\.json › zones\[0\]\.members\[\d+\] › unknown country code$/),
      'nuclear_plants.json › plants[0].iso3 › unknown country code',
    ]);
  });
});
