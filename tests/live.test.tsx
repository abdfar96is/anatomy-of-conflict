// The weekly open-data refresh: parsing the World Bank API, assembling the file, merging it into the model,
// validating it, and showing each figure with its year and source.

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { act, render } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterAll, afterEach, beforeAll, describe, expect, test } from 'vitest';
import { checkData } from '../scripts/check-data';
import { assemble, INDICATORS, latestByCountry, LIVE_KEYS, parseCountryList, parseIndicatorPage, skeleton, type WbRow } from '../scripts/fetch-indicators';
import { formatJson } from '../scripts/format-json';
import { atlas } from '../src/app/store';
import { DbContext } from '../src/app/useT';
import { build } from '../src/data/build';
import type { DB, LiveFile, RawData } from '../src/data/types';
import { Dossier } from '../src/features/dossier';
import '../src/i18n/core';
import { translate } from '../src/i18n/strings';
import { DATA_DIR, readRaw } from './helpers/readRaw';

const en = (key: string, vars?: Record<string, string | number>) => translate('en', key, vars);

const page = (rows: object[], meta: object = { page: 1, pages: 1, per_page: 20000, total: rows.length, lastupdated: '2026-10-28' }) => [meta, rows];
const row = (iso: string, date: string, value: number | null) => ({ indicator: { id: 'SP.POP.TOTL', value: 'Population, total' }, country: { id: iso.slice(0, 2), value: iso }, countryiso3code: iso, date, value, unit: '', obs_status: '', decimal: 0 });

describe('World Bank API parsing', () => {
  test('keeps numeric rows, maps XKX to KOS and drops empty values', () => {
    const p = parseIndicatorPage(page([row('JOR', '2024', 11_500_000), row('JOR', '2025', null), row('XKX', '2024', 1_600_000), row('', '2024', 5)]));
    expect(p).toEqual({ pages: 1, lastUpdated: '2026-10-28', rows: [{ iso3: 'JOR', year: 2024, value: 11_500_000 }, { iso3: 'KOS', year: 2024, value: 1_600_000 }] });
  });
  test('an API error answered with HTTP 200 is an error', () => {
    expect(() => parseIndicatorPage([{ message: [{ id: '120', key: 'Invalid value', value: 'The provided parameter value is not valid' }] }])).toThrow(/API error/);
    expect(() => parseIndicatorPage({})).toThrow(/shape/);
  });
  test('the country list leaves out aggregates', () => {
    const list = parseCountryList([{ page: 1 }, [{ id: 'JOR', region: { value: 'Middle East & North Africa' } }, { id: 'ARB', region: { value: 'Aggregates' } }, { id: 'XKX', region: { value: 'Europe & Central Asia' } }]]);
    expect([...list]).toEqual(['JOR', 'KOS']);
  });
  test('latest value per country, within the window of the newest year', () => {
    const rows: WbRow[] = [
      { iso3: 'SDN', year: 2023, value: 1 }, { iso3: 'SDN', year: 2024, value: 2 },
      { iso3: 'COL', year: 2019, value: 3 }, { iso3: 'ARB', year: 2024, value: 9 },
    ];
    const keep = new Set(['SDN', 'COL']);
    expect(Object.fromEntries(latestByCountry(rows, keep, 0).values)).toEqual({ SDN: { iso3: 'SDN', year: 2024, value: 2 } });
    expect(latestByCountry(rows, keep, 10).values.get('COL')?.year).toBe(2019);
  });
});

describe('assembling the file', () => {
  const codes = Array.from({ length: 200 }, (_, i) => `A${String.fromCharCode(65 + Math.floor(i / 26))}${String.fromCharCode(65 + (i % 26))}`);
  const keep = new Set([...codes, 'CHN', 'IND', 'USA']);
  const series = (over: Partial<Record<string, number>> = {}) => Object.fromEntries(LIVE_KEYS.map((k) => [k, {
    rows: [
      ...codes.map((iso) => ({ iso3: iso, year: 2024, value: 1000 })),
      { iso3: 'CHN', year: 2024, value: over[`CHN.${k}`] ?? 1.41e9 }, { iso3: 'IND', year: 2024, value: 1.45e9 },
      { iso3: 'USA', year: 2024, value: k === 'gdp' ? 2.9e13 : k === 'gdpPc' ? 85_000 : 3.4e8 },
    ],
    lastUpdated: '2026-10-28',
  }])) as Parameters<typeof assemble>[0];

  test('describes each series and keeps [value, year] per country, sorted', () => {
    const f = assemble(series(), keep, '2026-11-02');
    expect(f.retrieved).toBe('2026-11-02');
    expect(f.indicators.idps).toMatchObject({ code: 'VC.IDP.TOCV', url: 'https://data.worldbank.org/indicator/VC.IDP.TOCV', latestYear: 2024, countries: 203 });
    expect(f.values.USA?.gdp).toEqual([2.9e13, 2024]);
    expect(Object.keys(f.values)).toEqual([...Object.keys(f.values)].sort());
  });
  test('too few countries, or a figure off by orders of magnitude, writes nothing', () => {
    const thin = series();
    thin.pop.rows = thin.pop.rows.slice(150);
    expect(() => assemble(thin, keep, '2026-11-02')).toThrow(/SP.POP.TOTL: \d+ countries/);
    expect(() => assemble(series({ 'CHN.pop': 1.41e6 }), keep, '2026-11-02')).toThrow(/China/);
  });
  test('the committed file is the skeleton or a full refresh, in the canonical layout', () => {
    const text = fs.readFileSync(path.join(DATA_DIR, 'live/indicators.json'), 'utf8');
    const file = JSON.parse(text) as LiveFile;
    expect(text).toBe(formatJson(file));
    expect(Object.keys(file.indicators)).toEqual(LIVE_KEYS);
    for (const k of LIVE_KEYS) expect(file.indicators[k].code).toBe(INDICATORS[k].code);
    if (!file.retrieved) expect(file).toEqual(skeleton());
  });
});

const LIVE: LiveFile = {
  ...skeleton(),
  retrieved: '2026-11-02',
  indicators: Object.fromEntries(LIVE_KEYS.map((k) => [k, { ...skeleton().indicators[k], latestYear: k === 'pop' ? 2025 : 2024, countries: 2 }])) as LiveFile['indicators'],
  values: {
    SAU: { pop: [35_300_000, 2025], gdp: [1.24e12, 2024], refAsylum: [300, 2024] },
    SDN: { pop: [50_400_000, 2025], refOrigin: [2_100_000, 2024], idps: [9_000_000, 2024], battleDeaths: [5200, 2024] },
  },
};
const withLive = (live: LiveFile | null): RawData => ({ ...readRaw(), live });

describe('build() with the open-data file', () => {
  let db: DB;
  beforeAll(() => { db = build(withLive(LIVE)); });

  test('live figures replace Natural Earth, with their year and source', () => {
    const sau = db.countries.get('SAU')!;
    expect(sau.stats.pop).toEqual({ v: 35_300_000, y: 2025, src: 'live' });
    expect([sau.pop, sau.popYear, sau.gdp, sau.gdpYear]).toEqual([35_300_000, 2025, 1.24e6, 2024]);
    // no per-person series: derived from live GDP and population
    expect(sau.stats.gdpPc).toMatchObject({ y: 2024, src: 'live' });
    expect(sau.gdpPerCap).toBeCloseTo(1.24e12 / 35_300_000);
    expect(sau.density).toBeCloseTo(35_300_000 / sau.areaKm2);
  });
  test('a country without live values keeps Natural Earth, labelled as such', () => {
    const jor = db.countries.get('JOR')!;
    expect(jor.stats.pop?.src).toBe('ne');
    expect(jor.stats.gdpPc?.src).toBe('ne');
    expect(jor.stats.idps).toBeUndefined();
  });
  test('the dataset register shows when the figures were fetched', () => {
    expect(db.datasetById.get('wb-indicators')?.lastRetrieved).toBe('2026-11-02');
  });
  test('the skeleton (never fetched) or a missing file means no live layer', () => {
    expect(build(withLive(skeleton())).live).toBeNull();
    expect(build(withLive(null)).countries.get('SAU')!.stats.pop?.src).toBe('ne');
  });
});

describe('check-data on the open-data file', () => {
  let dir: string;
  beforeAll(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 'atlas-live-'));
    fs.cpSync(DATA_DIR, dir, { recursive: true });
    const bad = { ...LIVE, values: { SAU: { pop: [1, 2999] }, SDX: { pop: [1, 2020] } } };
    fs.writeFileSync(path.join(dir, 'live/indicators.json'), formatJson(bad));
  });
  afterAll(() => fs.rmSync(dir, { recursive: true, force: true }));

  test('reports unknown countries and future years', () => {
    expect(checkData(dir).map((p) => `${p.file} › ${p.path} › ${p.message}`)).toEqual([
      'live/indicators.json › values.SAU.pop › year is in the future',
      'live/indicators.json › values.SDX › unknown country code',
    ]);
  });
});

describe('the dossier shows each figure with its year and source', () => {
  let live: DB, base: DB;
  beforeAll(() => { live = build(withLive(LIVE)); base = build(readRaw()); });
  afterEach(() => { atlas.reset(); localStorage.clear(); });
  const show = (db: DB, ui: ReactNode = <Dossier />) => render(<DbContext.Provider value={db}>{ui}</DbContext.Provider>);
  const panel = () => document.getElementById('dz-panel')!;
  const factOf = (label: string) => [...panel().querySelectorAll('.dz-fact')].find((f) => f.querySelector('dt')?.textContent === label)!;

  test('population and GDP name the World Bank series and year, linked to the data', () => {
    atlas.set({ lang: 'en' });
    show(live);
    act(() => { atlas.select('country', 'SAU', { fly: false }); });
    const pop = factOf(en('dz.f.pop'));
    expect(pop.querySelector('dd')!.textContent).toBe('35.3 M2025 · UN WPP via World Bank');
    expect(pop.querySelector('.dz-fsrc a')).toHaveAttribute('href', 'https://data.worldbank.org/indicator/SP.POP.TOTL?locations=SA');
    expect(factOf(en('dz.f.gdp')).querySelector('.dz-fsrc')!.textContent).toBe('2024 · national accounts via World Bank');
    expect(panel().textContent).toContain(en('dz.f.note', { d: '2 Nov 2026' }));
  });

  test('the humanitarian section gives each series its year and source, and says when a value is missing', () => {
    atlas.set({ lang: 'en' });
    show(live);
    act(() => { atlas.select('country', 'SDN', { fly: false }); });
    expect(factOf(en('dz.hu.idps')).querySelector('dd')!.textContent).toBe('9 M2024 · IDMC via World Bank');
    expect(factOf(en('dz.hu.battleDeaths')).querySelector('dd')!.textContent).toBe('5,2002024 · UCDP via World Bank');
    const hosted = factOf(en('dz.hu.refAsylum'));
    expect(hosted.querySelector('.dz-none')).toHaveAttribute('data-tip', en('dz.hu.noneTip', { y: 2024 }));
    expect(panel().textContent).toContain(en('dz.hu.note'));
  });

  test('the conflict dossier lists the toll for each state involved', () => {
    atlas.set({ lang: 'en' });
    show(live);
    act(() => { atlas.select('conflict', 'sudan', { fly: false }); });
    const table = panel().querySelector('.dz-hum')!;
    const sdn = table.querySelector('tr[data-hl="SDN"]')!;
    expect([...sdn.querySelectorAll('td')].map((td) => td.textContent)).toEqual(['2.1 M2024', '9 M2024', '5,2002024']);
    expect(panel().textContent).toContain(en('dz.cf.humNote'));
  });

  test('before the first fetch the figures say they are Natural Earth estimates', () => {
    atlas.set({ lang: 'en' });
    show(base);
    act(() => { atlas.select('country', 'SAU', { fly: false }); });
    expect(factOf(en('dz.f.pop')).querySelector('.dz-fsrc')!.textContent).toBe('2019 · Natural Earth');
    expect(panel().textContent).toContain(en('dz.f.noteBase'));
    expect(panel().textContent).toContain(en('dz.hu.pending'));
  });
});
