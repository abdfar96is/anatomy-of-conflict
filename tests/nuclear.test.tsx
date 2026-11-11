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
import { LENSES, NUCLEAR_SITE_STATUS, NUCLEAR_SITE_TYPE } from '../src/config';
import { build } from '../src/data/build';
import type { DB, NuclearFile } from '../src/data/types';
import { Dossier } from '../src/features/dossier';
import { WARHEAD_R, buildScene, tipFor, treatyFill, visibleNuclear } from '../src/features/map/engine/scene';
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
    // Israel outside the NPT, signed the CTBT without ratifying
    expect(sec.textContent).toContain('Non-Proliferation TreatyNever joined');
    expect(sec.textContent).toContain('Comprehensive Nuclear-Test-Ban TreatySigned, not ratified (1996)');
    // a state with no weapons and no reactors still has its treaty statuses, each with its source
    act(() => { atlas.select('country', 'SAU', { fly: false }); });
    const sau = document.getElementById('dz-a-nuclear')!;
    expect(sau.textContent).toContain('Party (1988)');
    expect(sau.textContent).toContain('Not signed');
    expect(sau.textContent).toContain('Not a party and not signed');
    expect([...sau.querySelectorAll('a')].map((a) => a.getAttribute('href'))).toContain('https://en.wikipedia.org/wiki/List_of_parties_to_the_Comprehensive_Nuclear-Test-Ban_Treaty');
  });

  test('treaties mode: states by their status under the chosen treaty; the CTBT hatches the Annex 2 holdouts', () => {
    const P = { land: '#2a3440', landMuted: '#20262e', accent2: '#40a0c0', fg3: '#999999', cat: Array(9).fill('#888888'), seq: () => '#555555', status: { good: '#00ff00', warn: '#ffaa00', critical: '#ff0000' } } as unknown as Palette;
    const s = initialState();
    const at = (tr: 'npt' | 'ctbt' | 'tpnw') => buildScene(db, { ...s, lens: 'nuclear', filters: { ...s.filters, nuclearMode: 'treaties', nuclearTreaty: tr } }, P);
    const npt = at('npt');
    expect(npt.fill.get('PRK')).toBe(treatyFill(P, 'npt', 'withdrawn'));
    expect(npt.fill.get('IND')).toBe(treatyFill(P, 'npt', 'non-party'));
    expect(npt.fill.get('FRA')).toBe(treatyFill(P, 'npt', 'nws'));
    expect(npt.hatch.has('TWN')).toBe(true);
    const ctbt = at('ctbt');
    expect(ctbt.fill.get('RUS')).toBe(treatyFill(P, 'ctbt', 'revoked'));
    // the Annex 2 states that have not ratified, the ones that keep the treaty out of force
    expect(['USA', 'CHN', 'IND', 'PAK', 'PRK', 'ISR', 'IRN', 'EGY', 'RUS'].every((iso) => ctbt.hatch.has(iso))).toBe(true);
    expect(ctbt.hatch.has('FRA')).toBe(false);
    const tpnw = at('tpnw');
    expect(tpnw.fill.has('USA')).toBe(false);
    expect(tpnw.fill.get('MEX')).toBe(treatyFill(P, 'tpnw', 'party'));
    expect(tipFor({ kind: 'country', id: 'RUS' }, db, { ...s, lang: 'en', lens: 'nuclear', filters: { ...s.filters, nuclearMode: 'treaties', nuclearTreaty: 'ctbt' } }))
      .toContain('CTBT: Withdrew its ratification (2023)');
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

  test('civil mode draws every plant as a point sized by capacity, with names; other modes only a selected plant', () => {
    const P = { land: '#2a3440', landMuted: '#20262e', accent2: '#40a0c0', fg3: '#999999', cat: Array(9).fill('#888888'), seq: () => '#555555', status: { good: '#00ff00', warn: '#ffaa00', critical: '#ff0000' } } as unknown as Palette;
    const s = initialState();
    const civil = buildScene(db, { ...s, lens: 'nuclear', filters: { ...s.filters, nuclearMode: 'civil' } }, P);
    const plants = civil.points.filter((m) => m.kind === 'plant');
    expect(plants.length).toBe(db.nuclear.plants.length);
    const pt = (id: string) => plants.find((m) => m.id === id)!;
    expect(pt('kashiwazaki-kariwa').r).toBeGreaterThan(pt('borssele').r);
    expect(pt('kashiwazaki-kariwa')).toMatchObject({ picto: 'atom', big: true });
    // idle: filled in the warning colour; under construction and shut: rings
    expect(pt('zaporizhzhia')).toMatchObject({ color: P.status.warn, hollow: undefined });
    expect(pt('el-dabaa').hollow).toBe(true);
    expect(pt('calder-hall')).toMatchObject({ hollow: true, color: P.fg3 });
    // names for the plants in service or being built, not the shut ones
    expect(civil.pins.map((x) => x.text)).toEqual(expect.arrayContaining(['زابوريجيا', 'الضبعة']));
    expect(civil.pins.some((x) => x.text === 'كالدر هول')).toBe(false);
    const military = buildScene(db, { ...s, lens: 'nuclear', selection: { kind: 'plant', id: 'bushehr' } }, P);
    expect(military.points.map((m) => m.id)).toEqual(['bushehr']);
    expect(military.points[0]!.keep).toBe(true);
    expect(military.focus).toEqual({ id: 'bushehr' });
  });

  test('military mode draws a circle per arsenal, its area by the warheads', () => {
    const P = { land: '#2a3440', landMuted: '#20262e', accent2: '#40a0c0', fg3: '#999999', cat: Array(9).fill('#888888'), seq: () => '#555555', status: { good: '#00ff00', warn: '#ffaa00', critical: '#ff0000' } } as unknown as Palette;
    const s = initialState();
    const sc = buildScene(db, { ...s, lens: 'nuclear', lang: 'en' }, P);
    const W = db.nuclear.warheads.values;
    expect(sc.bubbles.map((b) => b.iso3)).toEqual(Object.keys(W).sort((a, b) => W[b]! - W[a]!));
    const r = (iso: string) => sc.bubbles.find((b) => b.iso3 === iso)!.r;
    expect(r('RUS')).toBe(WARHEAD_R);
    expect((r('USA') / r('RUS')) ** 2).toBeCloseTo(W.USA! / W.RUS!, 5);
    expect(sc.bubbles.find((b) => b.iso3 === 'PRK')!.text).toBe(String(W.PRK));
    expect(buildScene(db, { ...s, lens: 'nuclear', filters: { ...s.filters, nuclearMode: 'civil' } }, P).bubbles).toEqual([]);
  });

  test('with the timeline on, civil mode shows the plants in service that year, sized by the units then running', () => {
    const P = { land: '#2a3440', landMuted: '#20262e', accent2: '#40a0c0', fg3: '#999999', cat: Array(9).fill('#888888'), seq: (t: number) => `seq${t}`, status: { good: '#00ff00', warn: '#ffaa00', critical: '#ff0000' } } as unknown as Palette;
    const s = initialState();
    const at = (year: number) => ({ ...s, lens: 'nuclear' as const, yearFilter: true, year, filters: { ...s.filters, nuclearMode: 'civil' as const } });
    const ids = (year: number) => visibleNuclear(db, at(year)).map((x) => x.p.id);
    expect(ids(1955)).toEqual(['obninsk']);
    expect(ids(1960)).toEqual(expect.arrayContaining(['obninsk', 'calder-hall', 'shippingport', 'marcoule']));
    expect(ids(1960)).not.toContain('barakah');
    expect(visibleNuclear(db, at(1960)).find((x) => x.p.id === 'calder-hall')!.mw).toBe(140);
    // shut in 2020: running in 2019, gone in 2020
    expect(ids(2019)).toContain('fessenheim');
    expect(ids(2020)).not.toContain('fessenheim');
    expect(ids(2005)).toContain('ignalina');
    expect(ids(2010)).not.toContain('ignalina');
    // units under construction never show on the timeline
    expect(ids(2026)).not.toContain('el-dabaa');
    // the states that ran reactors that year are coloured
    const sc = buildScene(db, at(1960), P);
    expect([...sc.fill.keys()].sort()).toEqual(['FRA', 'GBR', 'RUS', 'USA']);
    expect(sc.points.every((x) => !x.hollow)).toBe(true);
  });

  test('the card: the arsenals by size, and the plants with the timeline', () => {
    atlas.set({ lens: 'nuclear', lang: 'en' });
    render(<DbContext.Provider value={db}><Legend /></DbContext.Provider>);
    const legend = document.getElementById('legend')!;
    const heads = [...legend.querySelectorAll('[data-fold="map.nc.heads"] li')].map((li) => li.textContent);
    expect(heads[0]).toMatch(/^Russia/);
    expect(heads).toHaveLength(9);
    act(() => { atlas.setFilter('nuclearMode', 'civil'); });
    expect(legend.querySelector('.tl-play')).not.toBeNull();
    expect(legend.textContent).toContain('The atom when zoomed in');
    act(() => { atlas.set({ yearFilter: true, year: 1970 }); });
    expect(legend.textContent).toContain('Plants in service in 1970');
    expect(legend.textContent).toContain('idle spells are not recorded');
    act(() => { atlas.setFilter('nuclearMode', 'military'); });
    expect(legend.textContent).toContain('does not change with the timeline');
    // the conflicts layer, as in the infrastructure lenses
    fireEvent.click(legend.querySelector('[data-key="conflicts"]')!);
    expect(atlas.get().layers.conflicts).toBe(true);
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

describe('nuclear sites', () => {
  const P = { land: '#2a3440', landMuted: '#20262e', accent2: '#40a0c0', fg3: '#999999', cat: Array.from({ length: 9 }, (_, i) => `#7${i}7${i}7${i}`), seq: () => '#555555', status: { good: '#00ff00', warn: '#ffaa00', critical: '#ff0000' } } as unknown as Palette;
  const at = (over: Partial<AtlasState['filters']> = {}, rest: Partial<AtlasState> = {}): AtlasState => {
    const s = initialState();
    return { ...s, lens: 'nuclear', lang: 'en', ...rest, filters: { ...s.filters, ...over } };
  };

  test('every site has a known kind and state, a note in both languages and a source, and ties only to known conflicts', () => {
    const sites = file().sites!;
    expect(sites.length).toBeGreaterThanOrEqual(30);
    for (const x of sites) {
      expect(NUCLEAR_SITE_TYPE[x.type as keyof typeof NUCLEAR_SITE_TYPE], x.id).toBeTruthy();
      expect(NUCLEAR_SITE_STATUS[x.status as keyof typeof NUCLEAR_SITE_STATUS], x.id).toBeTruthy();
      expect(x.note.ar && x.note.en, x.id).toBeTruthy();
      expect(x.sources?.length, x.id).toBeGreaterThan(0);
      for (const c of x.conflictIds ?? []) expect(db.conflictById.has(c), `${x.id} ${c}`).toBe(true);
    }
    // the sites struck in the 2025 and 2026 wars belong to that conflict
    for (const id of ['natanz', 'fordow', 'isfahan', 'arak']) expect(db.nsiteById.get(id)).toMatchObject({ status: 'struck', iso3: 'IRN', conflictIds: ['iran-us-israel'] });
  });

  test('military and civil modes draw the sites, shaped by kind and coloured by state; the chip hides them', () => {
    const sc = buildScene(db, at(), P);
    const marks = sc.markers.filter((m) => m.kind === 'nsite');
    expect(marks.length).toBe(db.nuclear.sites!.length);
    const m = (id: string) => marks.find((x) => x.id === id)!;
    expect(m('natanz')).toMatchObject({ shape: 'diamond', color: P.status.critical });
    expect(m('dimona')).toMatchObject({ shape: 'hex', color: P.cat[7] });
    expect(m('semipalatinsk')).toMatchObject({ shape: 'ring', color: P.fg3 });
    expect(m('rokkasho')).toMatchObject({ shape: 'square', color: P.accent2 });
    expect(buildScene(db, at({ nuclearMode: 'civil' }), P).markers.some((x) => x.kind === 'nsite')).toBe(true);
    expect(buildScene(db, at({ nuclearSites: false }), P).markers.some((x) => x.kind === 'nsite')).toBe(false);
    // other modes draw only a selected site, with the selection ring on it
    const zones = buildScene(db, at({ nuclearMode: 'zones' }, { selection: { kind: 'nsite', id: 'osirak' } }), P);
    expect(zones.markers.filter((x) => x.kind === 'nsite').map((x) => x.id)).toEqual(['osirak']);
    expect(zones.selRing).toMatchObject({ kind: 'nsite', id: 'osirak' });
  });

  test('tooltip, search, the legend and the site dossier', () => {
    const tip = tipFor({ kind: 'nsite', id: 'semipalatinsk' }, db, at());
    expect(tip).toContain('Semipalatinsk');
    expect(tip).toContain('Nuclear test site');
    expect(tip).toContain('1949–1989');
    expect(db.search('نطنز').some((e) => e.kind === 'nsite' && e.id === 'natanz')).toBe(true);

    atlas.set({ lens: 'nuclear', lang: 'en' });
    const legend = render(<DbContext.Provider value={db}><Legend /></DbContext.Provider>).container;
    const sec = legend.querySelector('[data-fold="map.nc.sites"]')!;
    expect(sec.textContent).toContain('Uranium enrichment');
    expect(sec.textContent).toContain('Struck or destroyed');
    fireEvent.click(sec.querySelector('[data-key="nuclearSites"]')!);
    expect(atlas.get().filters.nuclearSites).toBe(false);
    expect(legend.querySelector('[data-fold="map.nc.sites"]')!.textContent).not.toContain('Uranium enrichment');

    render(<DbContext.Provider value={db}><Dossier /></DbContext.Provider>);
    act(() => { atlas.select('nsite', 'natanz', { fly: false }); });
    const panel = document.getElementById('dz-panel')!;
    expect(panel.textContent).toContain('Uranium enrichment');
    expect(panel.textContent).toContain('21 March 2026');
    expect(panel.querySelector('[data-sel-kind="conflict"][data-sel-id="iran-us-israel"]')).not.toBeNull();
    expect([...panel.querySelectorAll('.dz-pv a')].map((a) => a.getAttribute('href'))).toContain('https://en.wikipedia.org/wiki/Natanz_Nuclear_Facility');
  });

  test('the conflict and the country link back to their sites', () => {
    atlas.set({ lang: 'en' });
    render(<DbContext.Provider value={db}><Dossier /></DbContext.Provider>);
    act(() => { atlas.select('country', 'PAK', { fly: false }); });
    const sec = document.getElementById('dz-a-nuclear')!;
    for (const id of ['kahuta', 'khushab', 'ras-koh']) expect(sec.querySelector(`[data-sel-kind="nsite"][data-sel-id="${id}"]`), id).not.toBeNull();
    act(() => { atlas.select('conflict', 'iran-us-israel', { fly: false }); });
    fireEvent.click(screen.getByRole('tab', { name: /^Energy/ }));
    const chips = [...document.querySelectorAll('#dz-panel [data-sel-kind="nsite"]')].map((x) => x.getAttribute('data-sel-id'));
    expect(chips.sort()).toEqual(['arak', 'fordow', 'isfahan', 'natanz']);
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
    n.sites[0].iso3 = 'XYZ';
    n.sites[1].conflictIds = ['no-such-war'];
    fs.writeFileSync(f, formatJson(n));
    const pf = path.join(dir, 'curated/nuclear_plants.json');
    const pl = JSON.parse(fs.readFileSync(pf, 'utf8'));
    pl.plants[0].iso3 = 'QQQ';
    pl.plants[1].gem = ['L1'];
    fs.writeFileSync(pf, formatJson(pl));
  });
  afterAll(() => fs.rmSync(dir, { recursive: true, force: true }));

  test('reports unknown country codes and conflicts, and a link to no GEM nuclear plant', () => {
    expect(checkData(dir).map((p) => `${p.file} › ${p.path} › ${p.message}`)).toEqual([
      'nuclear.json › countries.BEL.host › unknown country code',
      expect.stringMatching(/^nuclear\.json › zones\[0\]\.members\[\d+\] › unknown country code$/),
      'nuclear.json › sites[0].iso3 › unknown country code',
      'nuclear.json › sites[1].conflictIds[0] › unknown conflict id',
      'nuclear_plants.json › plants[0].iso3 › unknown country code',
      'nuclear_plants.json › plants[1].gem[0] › not a nuclear plant in power/plants.json',
    ]);
  });
});
