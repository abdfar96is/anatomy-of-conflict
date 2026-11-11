// Saving the map as an image: the sources line for each lens, the key read off the lens card, and the control.

import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeAll, describe, expect, test, vi } from 'vitest';
import { on } from '../src/app/events';
import { atlas, initialState } from '../src/app/store';
import { DbContext } from '../src/app/useT';
import { LENSES } from '../src/config';
import { build } from '../src/data/build';
import type { DB } from '../src/data/types';
import { Legend } from '../src/features/map/Legend';
import { MapControls } from '../src/features/map/MapControls';
import { LENS_SOURCES, sourcesFor } from '../src/features/map/saveImage';
import { readKey } from '../src/features/map/snapshot';
import '../src/i18n/core';
import { readRaw } from './helpers/readRaw';

let db: DB;
beforeAll(() => { db = build(readRaw()); });
afterEach(() => { atlas.reset(); localStorage.clear(); document.body.innerHTML = ''; });

describe('the sources under a saved map', () => {
  test('every lens names datasets that the sources list has', () => {
    for (const l of LENSES) {
      expect(LENS_SOURCES[l.id], l.id).toBeDefined();
      for (const id of LENS_SOURCES[l.id]) expect(db.datasetById.has(id), `${l.id}: ${id}`).toBe(true);
    }
  });

  test('publisher and licence for the lens, Natural Earth once, and the conflicts layer when it is on', () => {
    const s = initialState();
    const pw = sourcesFor(db, { ...s, lens: 'industry', lang: 'en' });
    expect(pw[0]).toBe('Natural Earth (Public domain)');
    expect(pw.filter((x) => x.startsWith('Natural Earth'))).toHaveLength(1);
    expect(pw.some((x) => x.includes('Global Energy Monitor') && x.endsWith('(CC BY 4.0)'))).toBe(true);
    expect(pw.some((x) => x.includes('Editorial compilation'))).toBe(false);
    const withWars = sourcesFor(db, { ...s, lens: 'industry', lang: 'en', layers: { ...s.layers, conflicts: true } });
    expect(withWars.length).toBe(pw.length + 1);
    expect(sourcesFor(db, { ...s, lens: 'borders', lang: 'en' }).join(' ')).toContain('CC BY-NC-SA 4.0');
  });
});

describe('the key in a saved map', () => {
  test('is read off the lens card: its swatches with their labels, and the mode chosen', async () => {
    atlas.set({ lens: 'overview', lang: 'en' });
    render(<DbContext.Provider value={db}><Legend /></DbContext.Provider>);
    const key = await readKey(document.querySelector('#legend .lc-body'));
    expect(key.modes).toEqual(['Colour states by: Continent']);
    const asia = key.items.find((x) => x.label === 'Asia')!;
    expect(asia.marks).toHaveLength(1);
    expect(asia.marks[0]).toMatchObject({ round: false });
    expect(key.items.map((x) => x.label)).toContain('Europe');
  });

  test('a ramp comes with its stops and its label', async () => {
    atlas.set({ lens: 'overview', lang: 'en' });
    atlas.setFilter('overviewMode', 'population');
    render(<DbContext.Provider value={db}><Legend /></DbContext.Provider>);
    const ramp = (await readKey(document.querySelector('#legend .lc-body'))).items.find((x) => x.ramp)!;
    expect(ramp.ramp!.length).toBe(5);
    expect(ramp.label).toMatch(/^Population: /);
  });
});

describe('the map control', () => {
  test('offers to save the map as an image, and says so when there is no map to save', async () => {
    const toasts: string[] = [];
    const off = on('toast', (m) => { toasts.push(m); });
    render(<DbContext.Provider value={db}><MapControls api={{ zoom() {}, reset() {} }} /></DbContext.Provider>);
    const err = vi.spyOn(console, 'error').mockImplementation(() => {});
    const btn = screen.getByRole('button', { name: 'حفظ الخريطة صورةً' });
    fireEvent.click(btn);
    expect(btn).toBeDisabled();
    await vi.waitFor(() => expect(toasts).toEqual(['تعذّر حفظ صورة الخريطة']));
    await vi.waitFor(() => expect(btn).not.toBeDisabled());
    expect(err).toHaveBeenCalled();
    err.mockRestore();
    off();
  });
});
