// The Oil & gas pipelines lens: TopoJSON lines, the GEM model, the map scene and its filters, tooltip, lens card,
// pipeline, LNG terminal and field dossiers, share links and data checks.

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
import { M3_PER_BOE, buildEnergy, capacityClass, fmtCapacity, isHalted, setEnergy, splitFieldName, type Energy, type EnergyMeta } from '../src/data/energy';
import { topoLines, type Topology } from '../src/data/topo';
import type { DB } from '../src/data/types';
import { Dossier } from '../src/features/dossier';
import { buildScene, fieldClass, tipFor } from '../src/features/map/engine/scene';
import { Legend } from '../src/features/map/Legend';
import { PICTO, PICTO_GROUPS, SITE_PICTO } from '../src/ui/pictograms';
import { ShellOverlays } from '../src/features/shell';
import '../src/i18n/core';
import type { Palette } from '../src/ui/palette';
import { DATA_DIR, readRaw } from './helpers/readRaw';

const read = (f: string) => JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'energy', f), 'utf8'));
let db: DB, E: Energy;
beforeAll(() => {
  db = build(readRaw());
  E = buildEnergy(read('pipelines.topo.json') as Topology, read('lng.json'), read('meta.json') as EnergyMeta, read('fields.json'));
  setEnergy(E);
});
afterEach(() => { atlas.reset(); localStorage.clear(); });
afterAll(() => setEnergy(null));
const withDb = (ui: ReactNode) => render(<DbContext.Provider value={db}>{ui}</DbContext.Provider>);
const system = (name: string) => E.bySystem.get(name)!;
const GHAWAR = 'L100000314112', NORTH_FIELD = 'L100000312464', NF_ALPHA = 'L100000312476', RUMAILA = 'L100000312002', ANNERVEEN = 'L100000300889';
const field = (id: string) => E.fieldById.get(id)!;

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

describe('the GEM fields', () => {
  test('producing, in-development and mothballed fields, with projects that group their units', () => {
    expect(E.fields.length).toBeGreaterThan(6000);
    expect(new Set(E.fields.map((x) => x.status))).toEqual(new Set(['operating', 'construction', 'mothballed']));
    expect(new Set(E.fields.map((x) => x.fuel))).toEqual(new Set(['oil', 'gas', 'oilgas']));
    const nf = field(NORTH_FIELD);
    expect(nf.project).toBe(true);
    expect(nf.countries).toEqual(['QAT']);
    expect(nf.units).toContain(NF_ALPHA);
    expect(field(NF_ALPHA).parent).toBe(NORTH_FIELD);
    // every unit of a project points back to it
    for (const p of E.fields.filter((x) => x.project)) for (const u of p.units) expect(field(u).parent).toBe(p.id);
    expect(field(GHAWAR).boe).toBeGreaterThan(1000);
  });

  test('production in boe sums liquids and gas at 164.2 m³ to the barrel; the pictogram follows the larger', () => {
    const both = E.fields.find((x) => x.liquids && x.gas && x.boe && x.boe > 10)!;
    expect(both.boe).toBeCloseTo(both.liquids! + both.gas! / M3_PER_BOE, 0);
    expect(field(RUMAILA).product).toBe('oil');
    expect(field('L100000312248').product).toBe('gas'); // South Pars phases 6-8
    expect(E.fields.filter((x) => x.liquids === 0 || x.gas === 0 || x.boe === 0)).toHaveLength(0);
  });

  test("names split into the field and its place; GEM.wiki pages follow the name", () => {
    expect(splitFieldName('Bacalhau Oil and Gas Field (Rio Grande do Norte, Brazil)')).toEqual(['Bacalhau Oil and Gas Field', 'Rio Grande do Norte, Brazil']);
    expect(splitFieldName('Rumaila')).toEqual(['Rumaila', '']);
    expect(field(RUMAILA).wiki).toBe('Rumaila_Oil_Field_(Iraq)');
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

  test('sits on the rail just before Power & industry', () => {
    expect(LENSES.map((l) => l.id).slice(-2)).toEqual(['pipelines', 'industry']);
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

  test('resource sites are pictograms: every type in the data has one; oil and gas take the pipelines\' fuel colours', () => {
    const s = initialState();
    const sc = buildScene(db, { ...s, lens: 'resources' }, P);
    const types = new Set(db.resources.sites.map((x) => x.type));
    for (const type of types) {
      const sp = SITE_PICTO[type];
      expect(sp, type).toBeDefined();
      expect(PICTO[sp!.picto], sp!.picto).toBeDefined();
      expect(PICTO_GROUPS.some((g) => g.id === sp!.group), sp!.group).toBe(true);
    }
    const shapeOf = (type: string) => new Set(sc.markers.filter((m) => m.kind === 'site' && db.siteById.get(m.id)!.type === type).map((m) => `${m.shape} ${m.color}`));
    expect(shapeOf('oil')).toEqual(new Set([`picto:barrel ${P.cat[4]}`]));
    expect(shapeOf('gas')).toEqual(new Set([`picto:flame ${P.cat[1]}`]));
    expect(shapeOf('gold')).toEqual(new Set([`picto:bars ${SITE_PICTO.gold!.color}`]));
    expect(shapeOf('uranium')).toEqual(new Set([`picto:radiation ${SITE_PICTO.uranium!.color}`]));
  });

  test('the resources card keys the pictograms of the class shown', () => {
    atlas.set({ lens: 'resources', lang: 'en' });
    withDb(<Legend />);
    const labels = () => [...document.querySelectorAll('#legend .lc-picto .k-l')].map((x) => x.textContent);
    expect(labels()).toEqual(expect.arrayContaining(['Oil', 'Natural gas', 'Gold', 'Copper', 'Uranium', 'Battery metals']));
    act(() => { atlas.setFilter('resourceClass', 'precious'); });
    expect(labels()).toEqual(['Gold', 'Silver, platinum', 'Diamonds', 'Jade']);
  });

  test('the pipelines lens draws the GEM fields as points, by fuel, sized by production, and can hide them', () => {
    const ids = (sc: ReturnType<typeof buildScene>) => sc.points.filter((x) => x.kind === 'field').map((x) => x.id);
    const sc = buildScene(db, S(), P);
    // no atlas resource sites in this lens: GEM's fields replace them
    expect(sc.markers.filter((m) => m.kind === 'site')).toHaveLength(0);
    expect(ids(sc)).toHaveLength(E.fields.filter((x) => x.status !== 'mothballed').length);
    const ghawar = sc.points.find((x) => x.id === GHAWAR)!;
    expect(ghawar).toMatchObject({ big: true, picto: 'barrel', color: P.cat[4], color2: P.cat[1] });
    expect(sc.points.find((x) => x.id === RUMAILA)).toMatchObject({ big: true, picto: 'barrel', color: P.cat[4], color2: undefined });
    expect(fieldClass(undefined)).toBe(0);
    // smallest first, so the large ones are drawn on top
    expect(sc.points.map((x) => x.r)).toEqual([...sc.points.map((x) => x.r)].sort((a, b) => a - b));
    // gas only: gas fields and oil-and-gas ones
    const gas = buildScene(db, S({ pipeFuels: new Set(['gas']) }), P);
    expect(ids(gas).every((id) => field(id).fuel !== 'oil')).toBe(true);
    expect(ids(gas)).toContain(NORTH_FIELD);
    // status chips filter the fields too; mothballed ones come with the halted layer, in steel
    expect(ids(buildScene(db, S({ pipeStatus: 'construction' }), P)).every((id) => field(id).status === 'construction')).toBe(true);
    expect(ids(sc)).not.toContain(ANNERVEEN);
    const halted = buildScene(db, S({ pipeHalted: true }), P);
    expect(halted.points.find((x) => x.id === ANNERVEEN)!.color2).toBeUndefined();
    expect(ids(buildScene(db, S({ pipeFields: false }), P))).toHaveLength(0);
    // a selected field stays on the map with the layer off
    expect(ids(buildScene(db, S({ pipeFields: false }, { kind: 'field', id: GHAWAR }), P))).toEqual([GHAWAR]);
  });

  test('the card toggles the fields and keys them', () => {
    atlas.set({ lens: 'pipelines', lang: 'en' });
    withDb(<Legend />);
    const legend = document.getElementById('legend')!;
    expect(legend.textContent).toContain('Oil field');
    expect(legend.textContent).toContain('Oil and gas field');
    expect(legend.textContent).toContain('Dot size: yearly production');
    expect(legend.textContent).toContain('Global Oil and Gas Extraction Tracker');
    fireEvent.click(legend.querySelector('[data-key="pipeFields"]')!);
    expect(atlas.get().filters.pipeFields).toBe(false);
    expect(legend.textContent).not.toContain('Dot size: yearly production');
  });

  test('a field tooltip gives its kind, status, production and year, state and operator', () => {
    atlas.set({ lang: 'en' });
    const tip = tipFor({ kind: 'field', id: RUMAILA }, db, { ...atlas.get(), lens: 'pipelines' });
    expect(tip).toContain('Rumaila Oil Field (Iraq)');
    expect(tip).toContain('Producing');
    expect(tip).toMatch(/million barrels of liquids a year \(\d{4}\)/);
    expect(tip).toContain('Iraq');
    expect(tipFor({ kind: 'field', id: NORTH_FIELD }, db, { ...atlas.get(), lens: 'pipelines' })).toContain('a project of 15 units');
  });

  test('with the timeline on, lines, fields and terminals show as of the year', () => {
    const at = (y: number) => ({ ...S(), year: y, yearFilter: true });
    const sc = buildScene(db, at(1990), P);
    const segs = items(sc);
    expect(segs.length).toBeGreaterThan(100);
    expect(segs.every((p) => p.year! <= 1990)).toBe(true);
    expect(items(buildScene(db, at(2020), P)).length).toBeGreaterThan(segs.length);
    expect(sc.points.filter((x) => x.kind === 'field').every((x) => field(x.id).start! <= 1990)).toBe(true);
    expect(sc.markers.filter((m) => m.kind === 'lng').every((m) => (E.lngById.get(m.id)!.year ?? 0) <= 1990)).toBe(true);
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

  test('the field dossier: facts, production, reserves, its project and the licensed source', () => {
    atlas.set({ lang: 'en', lens: 'pipelines' });
    withDb(<Dossier />);
    act(() => { atlas.select('field', NF_ALPHA, { fly: false }); });
    const head = document.getElementById('dossier')!.textContent!;
    expect(head).toContain('North Field Alpha Oil and Gas Field');
    expect(head).toContain('Oil or gas field');
    expect(head).toContain('Qatar');
    const panel = document.getElementById('dz-panel')!;
    expect(panel.textContent).toContain('Liquids production');
    expect(panel.textContent).toContain('million m³ a year');
    expect(panel.textContent).toContain('Part of a project');
    expect(panel.textContent).toContain('Global Energy Monitor — Global Oil and Gas Extraction Tracker');
    expect(panel.querySelector('a[href="https://www.gem.wiki/North_Field_Alpha_Oil_and_Gas_Field_(Qatar)"]')).not.toBeNull();
    // the project row opens the project, which lists its units, largest first, and warns of the overlap
    fireEvent.click(panel.querySelector(`[data-sel-kind="field"][data-sel-id="${NORTH_FIELD}"]`)!);
    expect(atlas.get().selection).toEqual({ kind: 'field', id: NORTH_FIELD });
    const p2 = document.getElementById('dz-panel')!;
    expect(p2.textContent).toContain('Units of this project');
    const units = [...p2.querySelectorAll('[data-sel-kind="field"]')].map((x) => (x as HTMLElement).dataset.selId!);
    expect(units).toHaveLength(15);
    expect(units.map((id) => field(id).boe ?? 0)).toEqual([...units.map((id) => field(id).boe ?? 0)].sort((a, b) => b - a));
    expect(p2.textContent).toContain('should not be added together');
    expect(document.getElementById('dossier')!.textContent).toContain('A project of several fields');
  });

  test('the field dossier in Arabic', () => {
    atlas.set({ lang: 'ar', lens: 'pipelines' });
    withDb(<Dossier />);
    act(() => { atlas.select('field', RUMAILA, { fly: false }); });
    expect(document.getElementById('dossier')!.textContent).toContain('حقل نفط أو غاز');
    expect(document.getElementById('dossier')!.textContent).toContain('العراق');
    expect(document.getElementById('dz-panel')!.textContent).toContain('مليون برميل سنوياً');
  });

  test('the search palette finds a field and opens it in the pipelines lens', () => {
    atlas.set({ lang: 'en' });
    withDb(<><div id="app" /><ShellOverlays /></>);
    fireEvent.keyDown(document.body, { key: '/', code: 'Slash' });
    fireEvent.change(document.getElementById('pal-in')!, { target: { value: 'Ghawar' } });
    const heads = [...document.querySelectorAll('.pal-gh')].map((h) => h.textContent);
    expect(heads).toContain('Oil and gas fields');
    const opt = [...document.querySelectorAll('[role="option"]')].find((o) => o.textContent!.includes('Ghawar Oil and Gas Project'))!;
    fireEvent.click(opt);
    expect(atlas.get().lens).toBe('pipelines');
    expect(atlas.get().selection).toEqual({ kind: 'field', id: GHAWAR });
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
    setEnergy(null);
    expect(parseHash(`field-${GHAWAR}`, db)).toEqual({ patch: { lens: 'pipelines', selection: { kind: 'field', id: GHAWAR }, view: null } });
    setEnergy(E);
    expect(parseHash(`field-${GHAWAR}`, db)?.fly).toEqual({ kind: 'field', id: GHAWAR });
    expect(parseHash('field-x', db)).toBeNull();
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
    // a field that names a missing project, and a project whose unit does not point back
    const ff = path.join(dir, 'energy/fields.json');
    const fields = JSON.parse(fs.readFileSync(ff, 'utf8'));
    fields.find((x: { id: string }) => x.id === RUMAILA).p = 'L1';
    fields.find((x: { id: string }) => x.id === NF_ALPHA).p = GHAWAR;
    fs.writeFileSync(ff, JSON.stringify(fields));
  });
  afterAll(() => fs.rmSync(dir, { recursive: true, force: true }));

  test('reports a note on an unknown line and an unknown chokepoint', () => {
    const lines = checkData(dir).map((p) => `${p.file} › ${p.path} › ${p.message}`);
    expect(lines).toContain('energy/meta.json › notes[0].pipelines[1] › no pipeline of this name');
    expect(lines).toContain('energy/meta.json › notes[0].chokepoints[2] › unknown chokepoint id');
  });

  test('reports a field in an unknown project and a project unit that does not point back', () => {
    const lines = checkData(dir).map((p) => `${p.file} › ${p.message} › ${JSON.stringify(p.value)}`);
    expect(lines).toContain('energy/fields.json › no project of this id › "L1"');
    expect(lines).toContain(`energy/fields.json › unit missing or not linked back to this project › "${NF_ALPHA}"`);
  });
});
