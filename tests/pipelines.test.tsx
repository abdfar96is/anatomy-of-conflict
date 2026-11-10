// The Oil & gas pipelines lens: TopoJSON lines, the GEM model, the map scene and its filters, tooltip, lens card,
// pipeline and LNG dossiers, share links and data checks.

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
import { build } from '../src/data/build';
import { buildEnergy, capacityClass, fmtCapacity, isHalted, setEnergy, type Energy, type EnergyMeta } from '../src/data/energy';
import { topoLines, type Topology } from '../src/data/topo';
import type { DB } from '../src/data/types';
import { Dossier } from '../src/features/dossier';
import { buildScene, tipFor } from '../src/features/map/engine/scene';
import { Legend } from '../src/features/map/Legend';
import { ShellOverlays } from '../src/features/shell';
import '../src/i18n/core';
import type { Palette } from '../src/ui/palette';
import { DATA_DIR, readRaw } from './helpers/readRaw';

const read = (f: string) => JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'energy', f), 'utf8'));
let db: DB, E: Energy;
beforeAll(() => {
  db = build(readRaw());
  E = buildEnergy(read('pipelines.topo.json') as Topology, read('lng.json'), read('meta.json') as EnergyMeta);
  setEnergy(E);
});
afterEach(() => { atlas.reset(); localStorage.clear(); });
afterAll(() => setEnergy(null));
const withDb = (ui: ReactNode) => render(<DbContext.Provider value={db}>{ui}</DbContext.Provider>);
const system = (name: string) => E.bySystem.get(name)!;

describe('TopoJSON lines', () => {
  test('LineString and MultiLineString geometries decode, polygons are left to topoFeatures', () => {
    const topo: Topology = {
      type: 'Topology', transform: { scale: [1, 1], translate: [0, 0] },
      arcs: [[[0, 0], [2, 0], [0, 1]], [[5, 5], [1, 1]]],
      objects: { o: { type: 'GeometryCollection', geometries: [
        { type: 'LineString', arcs: [0], properties: { id: 'a' } },
        { type: 'MultiLineString', arcs: [[0], [~1]], properties: { id: 'b' } },
        { type: 'Polygon', arcs: [[0]] },
      ] } },
    };
    const [a, b, ...rest] = topoLines(topo, 'o');
    expect(rest).toHaveLength(0);
    expect(a!.geometry).toEqual({ type: 'LineString', coordinates: [[0, 0], [2, 0], [2, 1]] });
    expect(b!.geometry).toEqual({ type: 'MultiLineString', coordinates: [[[0, 0], [2, 0], [2, 1]], [[6, 6], [5, 5]]] });
  });
});

describe('the GEM model', () => {
  test('operating, under-construction and halted segments of gas, oil and NGL, and LNG terminals', () => {
    expect(E.pipes.length).toBe(4121);
    expect(E.pipes.filter((p) => !isHalted(p)).length).toBe(4076);
    expect(new Set(E.pipes.map((p) => p.status))).toEqual(new Set(['operating', 'construction', 'idle', 'mothballed']));
    // a stop year only on halted lines; Nord Stream is mothballed since 2022, Kirkuk–Baniyas since 2003
    expect(E.pipes.every((p) => p.stopYear == null || isHalted(p))).toBe(true);
    expect(system('Nord Stream Gas Pipeline')[0]).toMatchObject({ status: 'mothballed', stopYear: 2022 });
    expect(system('Kirkuk-Baniyas Oil Pipelines')[0]).toMatchObject({ status: 'mothballed', stopYear: 2003 });
    expect(new Set(E.pipes.map((p) => p.fuel))).toEqual(new Set(['gas', 'oil', 'ngl']));
    expect(E.lng.length).toBe(327);
    expect(E.pipes.every((p) => p.lines.length > 0 && p.lines.every((l) => l.length >= 2))).toBe(true);
    expect(E.pipes.every((p) => p.countries.every((iso) => db.countries.has(iso)))).toBe(true);
  });

  test('segments group into systems; Druzhba runs through Russia, Belarus, Ukraine and Central Europe', () => {
    const states = new Set(system('Druzhba Oil Pipeline').flatMap((p) => p.countries));
    for (const iso of ['RUS', 'BLR', 'UKR', 'POL', 'DEU', 'SVK', 'HUN', 'CZE']) expect(states.has(iso)).toBe(true);
  });

  test('capacity: bcm a year for gas, barrels a day for oil, in both languages', () => {
    const ceyhan = system('Kirkuk-Ceyhan Oil Pipeline')[0]!;
    expect(fmtCapacity(ceyhan, 'en')).toBe('1.4 M barrels a day');
    expect(fmtCapacity(ceyhan, 'ar')).toBe('1.4 مليون برميل يومياً');
    const turk = system('TurkStream Gas Pipeline')[0]!;
    expect(fmtCapacity(turk, 'en')).toBe('15.8 bcm a year');
    expect([capacityClass(undefined), capacityClass(5e4), capacityClass(2e5), capacityClass(5e5), capacityClass(2e6)]).toEqual([0, 1, 2, 3, 4]);
  });

  test('fourteen sourced strategic lines, five of them halted, each with sources and a check date', () => {
    expect(E.meta.notes).toHaveLength(14);
    expect(E.meta.notes.filter((n) => n.pipelines.every((name) => system(name).every(isHalted)))).toHaveLength(5);
    for (const n of E.meta.notes) {
      expect(n.sources.length).toBeGreaterThan(0);
      expect(n.verified).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      for (const name of n.pipelines) expect(E.noteOf.get(name)).toBe(n);
    }
  });
});

describe('the lens', () => {
  const P = {
    land: '#2a3440', landMuted: '#20262e', fg: '#ffffff', fg2: '#cccccc', fg3: '#999999', sel: '#ffd040', halo: '#000000',
    cat: ['#000', '#3987e5', '#d95926', '#199e70', '#c98500', '#d55181', '#2f9e3a', '#9085e9', '#e66767'],
    seq: () => '#555555', status: { good: '#00ff00', warn: '#ffaa00', critical: '#ff0000' }, resClass: {},
  } as unknown as Palette;
  const S = (filters: Partial<ReturnType<typeof initialState>['filters']> = {}, selection: ReturnType<typeof initialState>['selection'] = null) => {
    const s = initialState();
    return { ...s, lens: 'pipelines' as const, selection, filters: { ...s.filters, ...filters } };
  };
  const items = (sc: ReturnType<typeof buildScene>) => sc.lines.flatMap((l) => l.items.map((it) => E.byId.get(it.id)!));

  test('is the last lens on the rail', () => {
    expect(LENSES[LENSES.length - 1]!.id).toBe('pipelines');
  });

  test('draws every active segment, coloured by fuel, dashed under construction, LNG terminals as markers', () => {
    const sc = buildScene(db, S(), P);
    expect(items(sc)).toHaveLength(E.pipes.filter((p) => !isHalted(p)).length);
    const gas = sc.lines.find((l) => l.items.some((it) => E.byId.get(it.id)!.fuel === 'gas'))!;
    const oil = sc.lines.find((l) => l.items.some((it) => E.byId.get(it.id)!.fuel === 'oil'))!;
    expect(gas.color).not.toBe(oil.color);
    for (const l of sc.lines) {
      const st = new Set(l.items.map((it) => E.byId.get(it.id)!.status));
      expect(st.size).toBe(1);
      expect(!!l.dash).toBe(st.has('construction'));
    }
    expect(sc.markers.filter((m) => m.kind === 'lng')).toHaveLength(E.lng.length);
    // the sourced lines, and only they, carry a glow in the selection colour
    const glowing = sc.lines.filter((l) => l.glow).flatMap((l) => l.items).map((it) => E.byId.get(it.id)!);
    expect(glowing.length).toBeGreaterThan(0);
    expect(glowing.every((p) => E.noteOf.has(p.system))).toBe(true);
    expect(sc.lines.filter((l) => !l.glow).flatMap((l) => l.items).some((it) => E.noteOf.has(E.byId.get(it.id)!.system))).toBe(false);
    expect(new Set(sc.lines.filter((l) => l.glow).map((l) => l.glow))).toEqual(new Set([P.sel]));
    expect(sc.lines.some((l) => l.casing)).toBe(false);
    // every set can be drawn as a pipe once zoomed in: whole lengths, or sections for lines under construction
    for (const l of sc.lines) {
      const st = E.byId.get(l.items[0]!.id)!.status;
      expect(l.tube).toBe(st === 'construction' ? 'sections' : 'solid');
    }
  });

  test('filters: fuel, status, sourced lines only, LNG terminals off', () => {
    expect(items(buildScene(db, S({ pipeFuels: new Set(['oil']) }), P)).every((p) => p.fuel === 'oil')).toBe(true);
    const building = items(buildScene(db, S({ pipeStatus: 'construction' }), P));
    expect(building.length).toBeGreaterThan(0);
    expect(building.every((p) => p.status === 'construction')).toBe(true);
    const sourced = items(buildScene(db, S({ pipeStrategic: true, pipeHalted: true }), P));
    expect(new Set(sourced.map((p) => p.system))).toEqual(new Set(E.meta.notes.flatMap((n) => n.pipelines)));
    expect(buildScene(db, S({ pipeLng: false }), P).markers.filter((m) => m.kind === 'lng')).toHaveLength(0);
  });

  test('halted lines are their own layer, off by default, drawn dotted with round caps', () => {
    expect(items(buildScene(db, S(), P)).some(isHalted)).toBe(false);
    const sc = buildScene(db, S({ pipeHalted: true }), P);
    const halted = sc.lines.filter((l) => l.items.some((it) => isHalted(E.byId.get(it.id)!)));
    expect(halted.flatMap((l) => l.items)).toHaveLength(E.pipes.filter(isHalted).length);
    for (const l of halted) {
      expect(l.cap).toBe('round');
      // grey steel, not the fuel colour
      expect(Object.values(P.cat)).not.toContain(l.color);
      expect(l.items.every((it) => isHalted(E.byId.get(it.id)!))).toBe(true);
    }
    // the status filter applies to active lines only
    const built = items(buildScene(db, S({ pipeHalted: true, pipeStatus: 'construction' }), P));
    expect(new Set(built.map((p) => p.status))).toEqual(new Set(['construction', 'idle', 'mothballed']));
  });

  test('a halted line: tooltip and dossier give its stop year; the card toggles the layer and opens a sourced halted line', () => {
    const ns = system('Nord Stream Gas Pipeline')[0]!;
    expect(tipFor({ kind: 'pipeline', id: ns.id }, db, { ...S(), lang: 'en' })).toContain('Natural gas · Mothballed · Stopped since 2022');
    atlas.set({ lens: 'pipelines', lang: 'en' });
    withDb(<><Legend /><Dossier /></>);
    const legend = document.getElementById('legend')!;
    fireEvent.click(legend.querySelector('[data-key="pipeHalted"]')!);
    expect(atlas.get().filters.pipeHalted).toBe(true);
    fireEvent.click(legend.querySelector('[data-key="pipeHalted"]')!);
    expect(atlas.get().filters.pipeHalted).toBe(false);
    fireEvent.click(screen.getByRole('button', { name: /Nord Stream/ }));
    expect(atlas.get().filters.pipeHalted).toBe(true);
    expect(E.byId.get(atlas.get().selection!.id)!.system).toMatch(/^Nord Stream/);
    expect(document.getElementById('dz-panel')!.textContent).toContain('gross sabotage');
    act(() => { atlas.select('pipeline', ns.id, { fly: false }); });
    expect(document.getElementById('dz-panel')!.textContent).toContain('Stopped2022');
  });

  test('oil and gas sites in the resources lens are drawn as a barrel and a flame, in the pipelines\' fuel colours', () => {
    const s = initialState();
    const sc = buildScene(db, { ...s, lens: 'resources' }, P);
    const shapeOf = (type: string) => new Set(sc.markers.filter((m) => m.kind === 'site' && db.siteById.get(m.id)!.type === type).map((m) => `${m.shape} ${m.color}`));
    expect(shapeOf('oil')).toEqual(new Set([`barrel ${P.cat[4]}`]));
    expect(shapeOf('gas')).toEqual(new Set([`flame ${P.cat[1]}`]));
    expect([...shapeOf('copper')].some((x) => x.startsWith('barrel') || x.startsWith('flame'))).toBe(false);
  });

  test('a selected segment highlights its whole system', () => {
    const seg = system('Druzhba Oil Pipeline')[0]!;
    const sc = buildScene(db, S({}, { kind: 'pipeline', id: seg.id }), P);
    expect(sc.selLines[0]!.items.map((it) => it.id).sort()).toEqual(system('Druzhba Oil Pipeline').map((p) => p.id).sort());
  });

  test('tooltips name the line, fuel, status, capacity and states', () => {
    const ceyhan = system('Kirkuk-Ceyhan Oil Pipeline')[0]!;
    const tip = tipFor({ kind: 'pipeline', id: ceyhan.id }, db, { ...S(), lang: 'en' });
    expect(tip).toContain('Kirkuk-Ceyhan Oil Pipeline');
    expect(tip).toContain('Crude oil · Operating');
    expect(tip).toContain('1.4 M barrels a day');
    expect(tip).toContain('Iraq');
    const ar = tipFor({ kind: 'pipeline', id: ceyhan.id }, db, { ...S(), lang: 'ar' });
    expect(ar).toContain('خط كركوك–جيهان للنفط');
    const t = E.lng.find((x) => x.type === 'export' && x.status === 'operating')!;
    expect(tipFor({ kind: 'lng', id: t.id }, db, { ...S(), lang: 'en' })).toContain('LNG export terminal · Operating');
  });

  test('the card toggles fuels and opens a sourced line', () => {
    atlas.set({ lens: 'pipelines', lang: 'en' });
    withDb(<Legend />);
    const legend = document.getElementById('legend')!;
    expect(legend.textContent).toContain('Natural gas');
    expect(legend.textContent).toContain('Sourced strategic lines');
    fireEvent.click(legend.querySelector('[data-key="pipeFuels"][data-val="ngl"]')!);
    expect(atlas.get().filters.pipeFuels.has('ngl')).toBe(false);
    fireEvent.click(screen.getByRole('button', { name: /Kirkuk-Ceyhan/ }));
    expect(atlas.get().selection?.kind).toBe('pipeline');
    expect(E.byId.get(atlas.get().selection!.id)!.system).toBe('Kirkuk-Ceyhan Oil Pipeline');
  });

  test('the pipeline dossier: facts, the sourced note with its chokepoint and conflict, segments and the licensed source', () => {
    atlas.set({ lang: 'en', lens: 'pipelines' });
    withDb(<Dossier />);
    act(() => { atlas.select('pipeline', system('Kirkuk-Ceyhan Oil Pipeline')[0]!.id, { fly: false }); });
    const panel = document.getElementById('dz-panel')!;
    expect(panel.textContent).toContain('1.4 M barrels a day');
    expect(panel.textContent).toContain('BOTAS');
    expect(panel.querySelector('[data-sel-kind="choke"][data-sel-id="hormuz"]')).not.toBeNull();
    expect(panel.querySelector('[data-sel-kind="conflict"][data-sel-id="iraq-kurdistan"]')).not.toBeNull();
    expect(panel.querySelector('[data-sel-kind="country"][data-sel-id="TUR"]')).not.toBeNull();
    const links = [...panel.querySelectorAll('a')].map((a) => a.getAttribute('href'));
    expect(links).toContain('https://creativecommons.org/licenses/by/4.0/');
    expect(links).toContain('https://hydrocarbonprocessing.com/news/2026/07/turkey-says-iraq-seeks-750-000-bpd-capacity-on-kirkuk-ceyhan-oil-pipeline/');
  });

  test('a system with several segments lists them, each opening its own segment', () => {
    atlas.set({ lang: 'en', lens: 'pipelines' });
    withDb(<Dossier />);
    const segs = system('Druzhba Oil Pipeline');
    act(() => { atlas.select('pipeline', segs[0]!.id, { fly: false }); });
    const rows = document.querySelectorAll('#dz-panel [data-sel-kind="pipeline"]');
    expect(rows.length).toBe(segs.length);
  });

  test('the LNG terminal dossier', () => {
    atlas.set({ lang: 'en', lens: 'pipelines' });
    withDb(<Dossier />);
    const t = E.lng.find((x) => x.type === 'export' && x.status === 'operating' && x.mtpa.operating > 5)!;
    act(() => { atlas.select('lng', t.id, { fly: false }); });
    expect(document.getElementById('dossier')!.textContent).toContain(t.name);
    expect(document.getElementById('dz-panel')!.textContent).toContain('Mt a year');
  });

  test('the search palette finds a line by its Arabic name and opens it in the pipelines lens', () => {
    withDb(<><div id="app" /><ShellOverlays /></>);
    fireEvent.keyDown(document.body, { key: '/', code: 'Slash' });
    fireEvent.change(document.getElementById('pal-in')!, { target: { value: 'دروجبا' } });
    const heads = [...document.querySelectorAll('.pal-gh')].map((h) => h.textContent);
    expect(heads).toContain('خطوط الأنابيب');
    fireEvent.click(document.querySelector('#pal-o0')!);
    expect(atlas.get().lens).toBe('pipelines');
    expect(E.byId.get(atlas.get().selection!.id)!.system).toBe('Druzhba Oil Pipeline');
  });

  test('share links open the lens on a line or a terminal before the data loads, and fly there once it is in', () => {
    const sel = { kind: 'pipeline', id: 'P0547' };
    setEnergy(null);
    expect(parseHash('pipeline-P0547', db)).toEqual({ patch: { lens: 'pipelines', selection: sel, view: null } });
    setEnergy(E);
    expect(parseHash('pipeline-P0547', db)).toEqual({ patch: { lens: 'pipelines', selection: sel, view: null }, fly: sel });
    expect(parseHash('lng-T100000130208-e', db)?.patch?.selection).toEqual({ kind: 'lng', id: 'T100000130208-e' });
    expect(parseHash('pipeline-x', db)).toBeNull();
  });
});

describe('check-data on the energy files', () => {
  let dir: string;
  beforeAll(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 'atlas-energy-'));
    fs.cpSync(DATA_DIR, dir, { recursive: true });
    const f = path.join(dir, 'energy/meta.json');
    const meta = JSON.parse(fs.readFileSync(f, 'utf8'));
    meta.notes[0].pipelines.push('No Such Pipeline');
    meta.notes[0].chokepoints.push('nowhere');
    fs.writeFileSync(f, formatJson(meta));
  });
  afterAll(() => fs.rmSync(dir, { recursive: true, force: true }));

  test('reports a note on an unknown line and an unknown chokepoint', () => {
    const lines = checkData(dir).map((p) => `${p.file} › ${p.path} › ${p.message}`);
    expect(lines).toContain('energy/meta.json › notes[0].pipelines[1] › no pipeline of this name');
    expect(lines).toContain('energy/meta.json › notes[0].chokepoints[2] › unknown chokepoint id');
  });
});
