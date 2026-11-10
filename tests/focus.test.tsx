// Focus on the map: a selection dims the other points (and lines), and an owner focus lights one company's sites
// across the infrastructure lenses, from a dossier button to a card chip.

import fs from 'node:fs';
import path from 'node:path';
import { act, fireEvent, render } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterAll, afterEach, beforeAll, describe, expect, test } from 'vitest';
import { atlas, initialState } from '../src/app/store';
import { DbContext } from '../src/app/useT';
import { build } from '../src/data/build';
import { buildEnergy, setEnergy, type EnergyMeta } from '../src/data/energy';
import { ownerKey, ownerNorm } from '../src/data/owner';
import { buildPower, setPower, type PowerMeta } from '../src/data/power';
import type { Topology } from '../src/data/topo';
import type { DB } from '../src/data/types';
import { Dossier } from '../src/features/dossier';
import { buildScene } from '../src/features/map/engine/scene';
import { Legend } from '../src/features/map/Legend';
import { ownerCount } from '../src/features/power/owner';
import '../src/i18n/core';
import type { Palette } from '../src/ui/palette';
import { DATA_DIR, readRaw } from './helpers/readRaw';

const read = (f: string) => JSON.parse(fs.readFileSync(path.join(DATA_DIR, f), 'utf8'));
const GHAZLAN = 'L100000405544', SEC = 'Saudi Electricity Co', GHAWAR = 'L100000314112';
const P = {
  land: '#2a3440', landMuted: '#20262e', fg: '#ffffff', fg2: '#cccccc', fg3: '#999999', sel: '#ffd040', halo: '#000000',
  cat: ['#000', '#3987e5', '#d95926', '#199e70', '#c98500', '#d55181', '#2f9e3a', '#9085e9', '#e66767'],
  seq: () => '#555555', status: { good: '#00ff00', warn: '#ffaa00', critical: '#ff0000' }, resClass: {},
} as unknown as Palette;
let db: DB;
beforeAll(() => {
  db = build(readRaw());
  setPower(buildPower(read('power/plants.json'), read('power/meta.json') as PowerMeta), { SAU: read('power/detail/SAU.json') });
  setEnergy(buildEnergy(read('energy/pipelines.topo.json') as Topology, read('energy/lng.json'), read('energy/meta.json') as EnergyMeta, read('energy/fields.json')));
});
afterEach(() => { atlas.reset(); });
afterAll(() => { setPower(null); setEnergy(null); });
const withDb = (ui: ReactNode) => render(<DbContext.Provider value={db}>{ui}</DbContext.Provider>);
const S = (lens: 'industry' | 'pipelines', filters: Partial<ReturnType<typeof initialState>['filters']> = {}, selection: ReturnType<typeof initialState>['selection'] = null) => {
  const s = initialState();
  return { ...s, lens, selection, filters: { ...s.filters, powerSummary: 'off' as const, ...filters } };
};

describe('owners', () => {
  test('one key per company: the first (largest) parent or operator, without its share', () => {
    expect(ownerKey('Saudi Electricity Co [100.0%]')).toBe(SEC);
    expect(ownerKey('Dubai Electricity and Water Authority PJSC [51.0%]; ACWA Power Co [27.0%]')).toBe('Dubai Electricity and Water Authority PJSC');
    expect(ownerKey('unknown [100%]')).toBeUndefined();
    expect(ownerKey(undefined)).toBeUndefined();
    expect(ownerKey('Saudi Aramco (50%), Kuwait Petroleum Corp (50%)')).toBe('Saudi Aramco (50%), Kuwait Petroleum Corp');
  });

  test('companies spelt differently across trackers compare as one', () => {
    expect(ownerNorm('Saudi Arabian Oil Co')).toBe(ownerNorm('Saudi Arabian Oil'));
    expect(ownerNorm('Saudi Aramco')).toBe(ownerNorm('Saudi Arabian Oil Co'));
    expect(ownerNorm('Gazprom PJSC')).toBe('gazprom');
    expect(ownerNorm('ENGIE SA')).toBe(ownerNorm('Engie'));
  });

  test('plants carry their owner; a company counts its sites across the loaded data', () => {
    expect(buildPower(read('power/plants.json'), read('power/meta.json') as PowerMeta).byId.get(GHAZLAN)!.owner).toBe(SEC);
    expect(ownerCount(SEC)).toBeGreaterThan(30);
    // Aramco: "Saudi Arabian Oil Co" (power), "Saudi Arabian Oil" (fields) and "Saudi Aramco" (pipelines) together
    expect(ownerCount('Saudi Arabian Oil Co')).toBeGreaterThan(ownerCount('Saudi Electricity Co') / 2);
  });
});

describe('focus', () => {
  test('a selected point dims the others; nothing selected, nothing dims', () => {
    expect(buildScene(db, S('industry'), P).focus).toBeUndefined();
    expect(buildScene(db, S('industry', {}, { kind: 'station', id: GHAZLAN }), P).focus).toEqual({ id: GHAZLAN, owner: undefined });
  });

  test('an owner focus marks its points, and dims the other pipeline segments', () => {
    const sc = buildScene(db, S('industry', { ownerFocus: SEC }), P);
    expect(sc.focus).toEqual({ owner: ownerNorm(SEC), id: undefined });
    expect(sc.points.filter((p) => p.own === ownerNorm(SEC)).length).toBeGreaterThan(30);
    const oil = buildScene(db, S('pipelines', { ownerFocus: 'Saudi Arabian Oil' }), P);
    expect(oil.points.find((p) => p.id === GHAWAR)!.own).toBe(ownerNorm('Saudi Aramco'));
    const alphas = new Set(oil.lines.map((l) => l.alpha < 0.5));
    expect(alphas).toEqual(new Set([true, false]));
  });

  test("the dossier lights up the owner's sites; the card chip turns it off", () => {
    atlas.set({ lang: 'en', lens: 'industry' });
    withDb(<><Legend /><Dossier /></>);
    act(() => { atlas.select('station', GHAZLAN, { fly: false }); });
    const btn = document.querySelector('#dz-panel [data-act="owner"]')!;
    expect(btn.textContent).toContain(SEC);
    fireEvent.click(btn);
    expect(atlas.get().filters.ownerFocus).toBe(SEC);
    const chip = document.querySelector('#legend [data-act="owner-off"]')!;
    expect(chip.textContent).toContain(SEC);
    fireEvent.click(chip);
    expect(atlas.get().filters.ownerFocus).toBeNull();
  });
});
