// The lens card's "In view" list: what the engine reports in the map frame, grouped by kind, the largest first, each
// row opening its record; and the card's Key / In view switch.

import fs from 'node:fs';
import path from 'node:path';
import { act, fireEvent, render } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterAll, afterEach, beforeAll, describe, expect, test } from 'vitest';
import { on } from '../src/app/events';
import { atlas } from '../src/app/store';
import { DbContext } from '../src/app/useT';
import { build } from '../src/data/build';
import { buildEnergy, setEnergy, type EnergyMeta } from '../src/data/energy';
import { buildPower, setPower, type PowerMeta } from '../src/data/power';
import type { Topology } from '../src/data/topo';
import type { DB } from '../src/data/types';
import { InViewList } from '../src/features/map/InView';
import { setInView } from '../src/features/map/inview';
import { Legend } from '../src/features/map/Legend';
import '../src/i18n/core';
import { DATA_DIR, readRaw } from './helpers/readRaw';

const read = (f: string) => JSON.parse(fs.readFileSync(path.join(DATA_DIR, f), 'utf8'));
const BARAKAH = 'L100000500011', HASSYAN = 'L100000103749', GHAWAR = 'L100000314112';
let db: DB;
beforeAll(() => {
  db = build(readRaw());
  setPower(buildPower(read('power/plants.json'), read('power/meta.json') as PowerMeta));
  setEnergy(buildEnergy(read('energy/pipelines.topo.json') as Topology, read('energy/lng.json'), read('energy/meta.json') as EnergyMeta, read('energy/fields.json')));
});
afterEach(() => { atlas.reset(); setInView([]); });
afterAll(() => { setPower(null); setEnergy(null); });
const withDb = (ui: ReactNode) => render(<DbContext.Provider value={db}>{ui}</DbContext.Provider>);
const names = () => [...document.querySelectorAll('.iv-name')].map((x) => x.textContent);

describe('the In view list', () => {
  test('groups the frame by kind, the largest first, and opens a row', () => {
    atlas.set({ lang: 'en', lens: 'industry' });
    withDb(<InViewList />);
    expect(document.querySelector('.iv-empty')).not.toBeNull();
    act(() => setInView([
      { kind: 'station', id: HASSYAN, r: 3.3, v: 2400 },
      { kind: 'station', id: BARAKAH, r: 4.3, v: 5668 },
      { kind: 'field', id: GHAWAR, r: 5.4, v: 1109 },
    ]));
    expect([...document.querySelectorAll('.iv-h')].map((h) => h.textContent)).toEqual(['Power plants2', 'Oil and gas fields1']);
    expect(names()).toEqual(['Barakah nuclear power plant', 'Hassyan Clean-Coal Power Project', 'Ghawar Oil and Gas Project']);
    expect(document.querySelector('.iv-sub')!.textContent).toContain('United Arab Emirates');
    fireEvent.click(document.querySelector(`[data-sel-id="${BARAKAH}"]`)!);
    expect(atlas.get().selection).toEqual({ kind: 'station', id: BARAKAH });
  });

  test('hovering a row rings it on the map; a pipeline system is listed once', () => {
    atlas.set({ lang: 'en', lens: 'pipelines' });
    const rings: unknown[] = [];
    const off = on('highlight', (h) => rings.push(h));
    withDb(<InViewList />);
    const druzhba = read('energy/pipelines.topo.json').objects.pipelines.geometries
      .filter((g: { properties: { n: string } }) => g.properties.n === 'Druzhba Oil Pipeline').map((g: { properties: { id: string } }) => g.properties.id);
    act(() => setInView(druzhba.map((id: string, i: number) => ({ kind: 'pipeline', id, r: 2 + i * 0.01, v: 0 }))));
    expect(names()).toEqual(['Druzhba Oil Pipeline']);
    fireEvent.pointerEnter(document.querySelector('.iv-row')!);
    expect(rings.at(-1)).toMatchObject({ iso3: [] });
    expect((rings.at(-1) as { lonlat?: number[] }).lonlat).toHaveLength(2);
    fireEvent.pointerLeave(document.querySelector('.iv-row')!);
    expect(rings.at(-1)).toBeNull();
    off();
  });

  test('shows eight rows a kind, then more on demand', () => {
    atlas.set({ lang: 'en', lens: 'industry' });
    withDb(<InViewList />);
    const W = buildPower(read('power/plants.json'), read('power/meta.json') as PowerMeta);
    act(() => setInView(W.plants.filter((p) => p.iso3 === 'DEU' && p.status === 'operating').slice(0, 40).map((p) => ({ kind: 'station', id: p.id, r: 3, v: p.mw }))));
    expect(names()).toHaveLength(8);
    fireEvent.click(document.querySelector('.iv-more')!);
    expect(names()).toHaveLength(30);
  });
});

describe('the card switch', () => {
  test('lenses with records on the map offer Key and In view; the key stays mounted', () => {
    atlas.set({ lang: 'en', lens: 'industry' });
    withDb(<Legend />);
    const legend = document.getElementById('legend')!;
    fireEvent.click(legend.querySelector('[data-act="iv"][data-val="list"]')!);
    expect(legend.querySelector('.iv-empty, .iv')).not.toBeNull();
    // the key is hidden, not unmounted (its hooks load the lens data)
    expect(legend.querySelector('[data-key="powerTypes"]')).not.toBeNull();
    fireEvent.click(legend.querySelector('[data-act="iv"][data-val="key"]')!);
    expect(legend.querySelector('.iv')).toBeNull();
  });

  test('the overview lens has no In view list', () => {
    atlas.set({ lang: 'en', lens: 'overview' });
    withDb(<Legend />);
    expect(document.querySelector('#legend [data-act="iv"]')).toBeNull();
  });
});
