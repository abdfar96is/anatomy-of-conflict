// The Historical borders lens: TopoJSON decoding, the CShapes model, the map scene, its timeline, legend,
// unit dossier, share links and data checks.

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { act, fireEvent, render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterAll, afterEach, beforeAll, describe, expect, test } from 'vitest';
import { checkData } from '../scripts/check-data';
import { formatJson } from '../scripts/format-json';
import { parseHash } from '../src/app/hash';
import { atlas, initialState } from '../src/app/store';
import { DbContext } from '../src/app/useT';
import { LENSES } from '../src/config';
import { buildBorders, setBorders, successors, unitName, unitsAt, type BorderMeta, type Borders } from '../src/data/borders';
import { build } from '../src/data/build';
import { topoFeatures, type Topology } from '../src/data/topo';
import type { DB } from '../src/data/types';
import { BordersScrubber } from '../src/features/borders/BordersScrubber';
import { changeLine } from '../src/features/borders/changes';
import { Dossier } from '../src/features/dossier';
import { buildScene, tipFor } from '../src/features/map/engine/scene';
import { Legend } from '../src/features/map/Legend';
import '../src/i18n/core';
import { translate } from '../src/i18n/strings';
import type { Palette } from '../src/ui/palette';
import { DATA_DIR, readRaw } from './helpers/readRaw';

const read = (f: string) => JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'history', f), 'utf8'));
const en = (key: string, vars?: Record<string, string | number>) => translate('en', key, vars);
let db: DB, B: Borders;
beforeAll(() => {
  db = build(readRaw());
  B = buildBorders(read('cshapes.topo.json') as Topology, read('meta.json') as BorderMeta);
  setBorders(B);
});
afterEach(() => { atlas.reset(); localStorage.clear(); });
afterAll(() => setBorders(null));
const withDb = (ui: ReactNode) => render(<DbContext.Provider value={db}>{ui}</DbContext.Provider>);
const at = (year: number, gw: number) => unitsAt(B, year).find((u) => u.gw === gw)!;

describe('TopoJSON decoding', () => {
  test('quantised, delta-encoded arcs become polygons, reversed arcs included', () => {
    const topo: Topology = {
      type: 'Topology', transform: { scale: [1, 1], translate: [0, 0] },
      arcs: [[[0, 0], [1, 0], [0, 1]], [[1, 1], [-1, 0], [0, -1]]],
      objects: { o: { type: 'GeometryCollection', geometries: [{ type: 'Polygon', arcs: [[0, 1]], properties: { a: 1 } }, { type: 'Polygon', arcs: [[~1, ~0]] }] } },
    };
    const [a, b] = topoFeatures(topo, 'o');
    expect(a!.geometry).toEqual({ type: 'Polygon', coordinates: [[[0, 0], [1, 0], [1, 1], [0, 1], [0, 0]]] });
    expect(a!.properties).toEqual({ a: 1 });
    expect(b!.geometry.coordinates).toEqual([[[0, 0], [0, 1], [1, 1], [1, 0], [0, 0]]]);
  });
});

describe('the CShapes model', () => {
  test('710 country-periods, the map of each year as it stood on 31 December', () => {
    expect(B.units).toHaveLength(710);
    expect(unitsAt(B, 1886).length).toBe(128);
    expect(unitsAt(B, 2019).length).toBe(181);
    const india = at(1914, 750);
    expect(india).toMatchObject({ status: 'colony', ruler: 200 });
    expect(at(1950, 750).status).toBe('independent');
  });

  test('names follow the date: Russian Empire, Soviet Union, Russia', () => {
    const name = (y: number) => unitName(B, at(y, 365), 'ar', `${y}-12-31`);
    expect([name(1914), name(1925), name(2000)]).toEqual(['الإمبراطورية الروسية', 'الاتحاد السوفيتي', 'روسيا']);
    expect(unitName(B, at(1900, 640), 'en', '1900-12-31')).toBe('Ottoman Empire');
  });

  test('changes are read from each unit\'s sequence of periods', () => {
    const lines = (y: number) => (B.changes.get(y) ?? []).map((c) => changeLine(B, c, 'en', en));
    expect(lines(1947)).toContain('Independence: India');
    expect(lines(1960)).toContain('Independence: Madagascar (Malagasy)');
    expect(lines(1991)).toContain('Emerged: Ukraine');
    // the first map (1 January 1886) is the starting point, not a change
    expect([...B.changes.values()].flat().some((c) => c.date === '1886-01-01' && c.kind !== 'end')).toBe(false);
  });

  test('today\'s states on a unit\'s territory', () => {
    expect(successors(at(1914, 750), db)).toEqual(expect.arrayContaining(['IND', 'PAK', 'BGD']));
  });
});

describe('the lens', () => {
  const P = {
    land: '#2a3440', landMuted: '#20262e', fg2: '#cccccc', fg3: '#999999', sel: '#ffd040', cat: Array(9).fill('#888888'),
    seq: () => '#555555', status: { good: '#00ff00', warn: '#ffaa00', critical: '#ff0000' },
  } as unknown as Palette;
  const S = (year: number) => { const s = initialState(); return { ...s, lens: 'borders' as const, filters: { ...s.filters, bordersYear: year } }; };

  test('is the last lens on the rail', () => {
    expect(LENSES[LENSES.length - 1]!.id).toBe('borders');
  });

  test('draws every unit of the year, coloured by its ruling power, with labels', () => {
    const sc = buildScene(db, S(1914), P);
    const polys = sc.polys.filter((p) => p.kind === 'border');
    expect(polys.length).toBe(unitsAt(B, 1914).length);
    const fill = (gw: number) => polys.find((p) => p.id === at(1914, gw).id)!.fill;
    expect(fill(750)).not.toBe(fill(220)); // British India and France
    expect(fill(200)).not.toBe(fill(750)); // the United Kingdom itself is stronger than its colony
    expect(sc.labels.some((l) => l.kind === 'border' && l.text === 'الإمبراطورية الروسية')).toBe(true);
    expect(sc.hideCountryLabels).toBe(true);
  });

  test('the tooltip names the status, the ruler and the period', () => {
    const india = at(1914, 750);
    const tip = tipFor({ kind: 'border', id: india.id }, db, { ...S(1914), lang: 'en' });
    expect(tip).toContain('India');
    expect(tip).toContain('Colony · ruled by United Kingdom');
  });

  test('the timeline steps to the previous and next change and shows the year', () => {
    atlas.set({ lens: 'borders', lang: 'en' });
    atlas.setFilter('bordersYear', 1914);
    withDb(<BordersScrubber />);
    fireEvent.click(screen.getByRole('button', { name: en('bd.next') }));
    const next = atlas.get().filters.bordersYear;
    expect(next).toBeGreaterThan(1914);
    expect(B.changes.has(next)).toBe(true);
    fireEvent.click(screen.getByRole('button', { name: en('bd.prev') }));
    expect(atlas.get().filters.bordersYear).toBeLessThan(next);
    expect(screen.getByRole('slider')).toHaveAttribute('aria-valuemin', '1886');
  });

  test('the legend lists the ruling powers present and the year\'s changes, each opening its unit', () => {
    atlas.set({ lens: 'borders', lang: 'en' });
    atlas.setFilter('bordersYear', 1960);
    withDb(<Legend />);
    const legend = document.getElementById('legend')!;
    expect(legend.textContent).toContain('British');
    expect(legend.textContent).toContain(en('bd.lg.changes', { y: 1960 }));
    fireEvent.click(screen.getByRole('button', { name: /Independence: Madagascar/ }));
    expect(atlas.get().selection?.kind).toBe('border');
  });

  test('the unit dossier: status, ruler, today\'s states, its periods and the licensed source', () => {
    atlas.set({ lang: 'en' });
    atlas.setFilter('bordersYear', 1914);
    withDb(<Dossier />);
    act(() => { atlas.select('border', at(1914, 750).id, { fly: false }); });
    const panel = document.getElementById('dz-panel')!;
    expect(panel.textContent).toContain('United Kingdom');
    expect(panel.querySelector('[data-sel-kind="country"][data-sel-id="IND"]')).not.toBeNull();
    expect([...panel.querySelectorAll('a')].map((a) => a.getAttribute('href'))).toContain('https://creativecommons.org/licenses/by-nc-sa/4.0/');
    const periods = panel.querySelectorAll('.dz-tl-item');
    expect(periods.length).toBeGreaterThan(1);
    fireEvent.click(periods[periods.length - 1]!);
    expect(atlas.get().filters.bordersYear).toBeGreaterThan(1940);
  });

  test('a share link opens the lens on that unit', () => {
    expect(parseHash('border-42', db)).toEqual({ patch: { lens: 'borders', selection: { kind: 'border', id: '42' }, view: null } });
    expect(parseHash('border-x', db)).toBeNull();
  });
});

describe('check-data on the borders files', () => {
  let dir: string;
  beforeAll(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 'atlas-borders-'));
    fs.cpSync(DATA_DIR, dir, { recursive: true });
    const f = path.join(dir, 'history/meta.json');
    const meta = JSON.parse(fs.readFileSync(f, 'utf8'));
    delete meta.names['Aden'];
    fs.writeFileSync(f, formatJson(meta));
  });
  afterAll(() => fs.rmSync(dir, { recursive: true, force: true }));

  test('reports a unit without an Arabic name', () => {
    expect(checkData(dir).map((p) => `${p.file} › ${p.path} › ${p.message}`)).toContain('history/meta.json › names["Aden"] › no Arabic name for this unit');
  });
});
