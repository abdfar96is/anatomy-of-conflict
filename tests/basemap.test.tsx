// The Natural Earth base layers: the files, their checks, the loader and the layer switches.

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fireEvent, render, screen } from '@testing-library/react';
import { afterAll, afterEach, beforeAll, describe, expect, test, vi } from 'vitest';
import { checkData } from '../scripts/check-data';
import { atlas, initialState } from '../src/app/store';
import { buildCities, buildRivers, getCities, getRivers, setBasemap, subscribeBasemap } from '../src/data/basemap';
import { MapControls } from '../src/features/map/MapControls';
import '../src/i18n/core';
import { DATA_DIR } from './helpers/readRaw';

const read = (f: string) => JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'geo', f), 'utf8'));
afterEach(() => { atlas.reset(); setBasemap(null, null); vi.unstubAllGlobals(); });

describe('the files', () => {
  test('cities: the most populous first, every one with an Arabic name, capitals flagged', () => {
    const C = buildCities(read('cities.json'));
    expect(C.length).toBeGreaterThan(1000);
    expect(C[0]!.pop).toBe(Math.max(...C.map((c) => c.pop)));
    const cairo = C.find((c) => c.en === 'Cairo')!;
    expect(cairo).toMatchObject({ ar: 'القاهرة', capital: true });
    expect(C.find((c) => c.en === 'Aden')).toMatchObject({ ar: 'عدن', capital: false });
    expect(C.filter((c) => c.capital).length).toBeGreaterThan(190);
  });

  test('rivers: scale ranks 1 to 6, and the Nile among the largest', () => {
    const R = buildRivers(read('rivers.json'));
    expect(new Set(R.map((r) => r.rank))).toEqual(new Set([1, 2, 3, 4, 5, 6]));
    // a rank-1 line passes Cairo
    const nearCairo = R.some((r) => r.rank === 1 && r.lines.some((l) => l.some(([x, y]) => Math.abs(x! - 31.2) < 0.5 && Math.abs(y! - 30.0) < 0.5)));
    expect(nearCairo).toBe(true);
  });
});

describe('check-data on the base layers', () => {
  let dir: string;
  beforeAll(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 'atlas-geo-'));
    fs.cpSync(DATA_DIR, dir, { recursive: true });
    const rf = path.join(dir, 'geo/rivers.json'), cf = path.join(dir, 'geo/cities.json');
    const rivers = JSON.parse(fs.readFileSync(rf, 'utf8')), cities = JSON.parse(fs.readFileSync(cf, 'utf8'));
    rivers[0][0] = 9;
    cities[3][1] = '';
    cities[5][4] = 99_000_000;
    fs.writeFileSync(rf, JSON.stringify(rivers));
    fs.writeFileSync(cf, JSON.stringify(cities));
  });
  afterAll(() => fs.rmSync(dir, { recursive: true, force: true }));

  test('reports a bad rank, a missing Arabic name and a city out of order', () => {
    const lines = checkData(dir).map((p) => `${p.file} › ${p.path} › ${p.message}`);
    expect(lines).toContain('geo/rivers.json › [0][0] › scale rank outside 1–6');
    expect(lines).toContain('geo/cities.json › [3][1] › no Arabic name');
    expect(lines).toContain('geo/cities.json › [5][4] › not sorted by population, largest first');
  });

  test('passes on the real files', () => {
    expect(checkData(DATA_DIR).filter((p) => p.file.startsWith('geo/'))).toEqual([]);
  });
});

describe('the loader', () => {
  test('starts loading on first use, once, and tells the map when the file is in', async () => {
    const fetch = vi.fn((url: string) => Promise.resolve({ ok: true, json: () => Promise.resolve(read(path.basename(url))) }));
    vi.stubGlobal('fetch', fetch);
    setBasemap(null, null);
    const heard = vi.fn();
    const off = subscribeBasemap(heard);
    expect(getRivers()).toBeNull();
    expect(getRivers()).toBeNull();
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(fetch.mock.calls[0]![0]).toMatch(/data\/geo\/rivers\.json$/);
    await vi.waitFor(() => expect(heard).toHaveBeenCalled());
    expect(getRivers()!.length).toBeGreaterThan(400);
    expect(getCities()).toBeNull();
    expect(fetch).toHaveBeenCalledTimes(2);
    off();
  });
});

describe('the layers menu', () => {
  test('rivers and cities are off by default and switch on from the menu', () => {
    expect(initialState().layers).toMatchObject({ rivers: false, cities: false });
    render(<MapControls api={{ zoom() {}, reset() {} }} />);
    fireEvent.click(screen.getByRole('button', { name: 'الطبقات' }));
    fireEvent.click(screen.getByRole('checkbox', { name: 'الأنهار' }));
    fireEvent.click(screen.getByRole('checkbox', { name: 'المدن والعواصم' }));
    expect(atlas.get().layers).toMatchObject({ rivers: true, cities: true });
  });
});
