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
  });
  afterAll(() => fs.rmSync(dir, { recursive: true, force: true }));

  test('reports unknown country codes', () => {
    expect(checkData(dir).map((p) => `${p.file} › ${p.path} › ${p.message}`)).toEqual([
      'nuclear.json › countries.BEL.host › unknown country code',
      expect.stringMatching(/^nuclear\.json › zones\[0\]\.members\[\d+\] › unknown country code$/),
    ]);
  });
});
