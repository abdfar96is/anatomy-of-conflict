// Validates the curated data: file shapes, links between records, unique ids and the canonical layout.
// Run `npm run check-data`. Each problem prints as: <file> › <json path> › <message> (got <value>)

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { geoContains } from 'd3';
import type { Feature } from 'geojson';
import { formatJson } from './format-json';
import { conflictFile, liveFile, SCHEMAS } from './schema';

export interface Problem { file: string; path: string; message: string; value?: unknown }

// Thematic files may use XKX for Kosovo; Natural Earth (and the app) call it KOS.
const ISO_ALIAS: Record<string, string> = { XKX: 'KOS' };

const pathOf = (parts: readonly PropertyKey[]) =>
  parts.reduce<string>((s, p) => (typeof p === 'number' ? `${s}[${p}]` : s ? `${s}.${String(p)}` : String(p)), '');

const at = (obj: unknown, parts: readonly PropertyKey[]): unknown =>
  parts.reduce<unknown>((o, p) => (o && typeof o === 'object' ? (o as Record<PropertyKey, unknown>)[p] : undefined), obj);

export function checkData(dataDir: string): Problem[] {
  const curated = path.join(dataDir, 'curated');
  const problems: Problem[] = [];
  const layout: Problem[] = []; // reported, but never hides the other checks (web-editor edits rarely match the layout)
  const files: Record<string, unknown> = {};

  // 1. Each file parses, is in the canonical layout, and has the expected shape.
  const names = fs.readdirSync(curated, { recursive: true, encoding: 'utf8' }).filter((f) => f.endsWith('.json')).map((f) => f.replace(/\\/g, '/')).sort();
  for (const file of names) {
    const text = fs.readFileSync(path.join(curated, file), 'utf8').replace(/\r\n/g, '\n');
    let data: unknown;
    try { data = JSON.parse(text); } catch (err) { problems.push({ file, path: '', message: `not valid JSON: ${(err as Error).message}` }); continue; }
    files[file] = data;
    if (text !== formatJson(data)) layout.push({ file, path: '', message: 'not in the canonical layout; run npm run format-data' });
    const schema = file.startsWith('conflicts/') ? conflictFile : SCHEMAS[file];
    if (!schema) { problems.push({ file, path: '', message: 'unknown file; add a schema in scripts/schema.ts' }); continue; }
    const res = schema.safeParse(data);
    if (!res.success) for (const issue of res.error.issues) problems.push({ file, path: pathOf(issue.path), message: issue.message, value: at(data, issue.path) });
  }
  if (problems.length) return [...layout, ...problems]; // links are only meaningful once the shapes are right

  // 2. Links between records.
  type Rec = Record<string, unknown>;
  const geo = JSON.parse(fs.readFileSync(path.join(dataDir, 'geo/countries.json'), 'utf8')) as { features: (Feature & { properties: { iso3: string } })[] };
  const isos = new Set(geo.features.map((f) => f.properties.iso3));
  const featureOf = new Map(geo.features.map((f) => [f.properties.iso3, f]));
  const conflictFiles = names.filter((f) => f.startsWith('conflicts/'));
  const conflictIds = new Set(conflictFiles.flatMap((f) => (files[f] as { conflicts: Rec[] }).conflicts.map((c) => c.id as string)));
  const sources = files['sources.json'] as { datasets: Rec[]; references: Rec[] };
  const sourceIds = new Set([...sources.datasets, ...sources.references].map((s) => s.id as string));
  const resources = files['resources.json'] as { types: Rec[]; entries: Rec[]; sites: Rec[] };
  const resourceTypes = new Set(resources.types.map((t) => t.id as string));

  const known = (set: Set<string>, what: string) => (file: string, p: string, v: unknown) => {
    const key = typeof v === 'string' ? (set === isos ? ISO_ALIAS[v] ?? v : v) : v;
    if (!set.has(key as string)) problems.push({ file, path: p, message: `unknown ${what}`, value: v });
  };
  const country = known(isos, 'country code');
  const conflict = known(conflictIds, 'conflict id');
  const source = known(sourceIds, 'source id');
  const resType = known(resourceTypes, 'resource type');
  const each = (file: string, list: unknown, base: string, check: (f: string, p: string, v: unknown) => void) =>
    (Array.isArray(list) ? list : []).forEach((v, i) => check(file, `${base}[${i}]`, v));

  for (const file of conflictFiles) {
    (files[file] as { conflicts: Rec[] }).conflicts.forEach((c, i) => {
      each(file, c.countries, `conflicts[${i}].countries`, country);
      ((c.externalPowers as Rec[] | undefined) ?? []).forEach((e, k) => country(file, `conflicts[${i}].externalPowers[${k}].iso3`, e.iso3));
      each(file, c.sourceRefs, `conflicts[${i}].sourceRefs`, source);
    });
  }
  const rel = files['relations.json'] as { blocs: Rec[]; edges: Rec[]; bilateral: Rec };
  rel.blocs.forEach((b, i) => each('relations.json', b.members, `blocs[${i}].members`, country));
  rel.edges.forEach((e, i) => { country('relations.json', `edges[${i}].a`, e.a); country('relations.json', `edges[${i}].b`, e.b); });
  for (const key of Object.keys(rel.bilateral)) key.split('|').forEach((iso) => country('relations.json', `bilateral["${key}"]`, iso));
  (files['ethnic_groups.json'] as { features: { properties: Rec }[] }).features
    .forEach((f, i) => each('ethnic_groups.json', f.properties.countries, `features[${i}].properties.countries`, country));
  (files['chokepoints.json'] as { points: Rec[] }).points.forEach((p, i) => {
    each('chokepoints.json', p.borderStates, `points[${i}].borderStates`, country);
    each('chokepoints.json', p.conflictIds, `points[${i}].conflictIds`, conflict);
  });
  (files['timeline.json'] as { events: Rec[] }).events.forEach((e, i) => {
    each('timeline.json', e.countries, `events[${i}].countries`, country);
    each('timeline.json', e.conflictIds, `events[${i}].conflictIds`, conflict);
    // the pin must sit on land inside one of the event's own countries, not in a bystander state or the sea
    const inside = ((e.countries as string[] | undefined) ?? []).some((iso) => {
      const f = featureOf.get(ISO_ALIAS[iso] ?? iso);
      return !!f && geoContains(f, e.coords as [number, number]);
    });
    if (!inside) problems.push({ file: 'timeline.json', path: `events[${i}].coords`, message: 'not inside any of the event\'s countries', value: e.coords });
  });
  resources.entries.forEach((e, i) => {
    country('resources.json', `entries[${i}].iso3`, e.iso3);
    resType('resources.json', `entries[${i}].type`, e.type);
    each('resources.json', e.conflictIds, `entries[${i}].conflictIds`, conflict);
  });
  resources.sites.forEach((s, i) => { country('resources.json', `sites[${i}].iso3`, s.iso3); resType('resources.json', `sites[${i}].type`, s.type); });
  for (const iso of Object.keys((files['country_intel.json'] as { countries: Rec }).countries)) country('country_intel.json', `countries.${iso}`, iso);
  for (const iso of Object.keys((files['religions.json'] as { countries: Rec }).countries)) country('religions.json', `countries.${iso}`, iso);
  const nuclear = files['nuclear.json'] as { warheads: { values: Rec }; countries: Record<string, Rec>; zones: Rec[] };
  for (const [iso, r] of Object.entries(nuclear.countries)) {
    country('nuclear.json', `countries.${iso}`, iso);
    if (r.host) country('nuclear.json', `countries.${iso}.host`, r.host);
  }
  for (const iso of Object.keys(nuclear.warheads.values)) country('nuclear.json', `warheads.values.${iso}`, iso);
  nuclear.zones.forEach((zn, i) => each('nuclear.json', zn.members, `zones[${i}].members`, country));
  // the treaties' parties lists: known states only
  const treaties = (nuclear as { treaties?: Record<'npt' | 'ctbt' | 'tpnw', Record<string, unknown>> }).treaties;
  if (treaties) for (const tr of ['npt', 'ctbt', 'tpnw'] as const) for (const iso of Object.keys(treaties[tr] ?? {})) country('nuclear.json', `treaties.${tr}.${iso}`, iso);
  for (const iso of Object.keys((nuclear as unknown as { fleet: { values: Rec } }).fleet.values)) country('nuclear.json', `fleet.values.${iso}`, iso);
  const plants = (files['nuclear_plants.json'] as { plants: Rec[] }).plants;
  plants.forEach((p, i) => { country('nuclear_plants.json', `plants[${i}].iso3`, p.iso3); each('nuclear_plants.json', p.conflictIds, `plants[${i}].conflictIds`, conflict); });
  const figureNotes = (files['figure_notes.json'] as { countries: Record<string, Record<string, Rec>> } | undefined)?.countries ?? {};
  for (const [iso, notes] of Object.entries(figureNotes)) {
    country('figure_notes.json', `countries.${iso}`, iso);
    for (const [k, n] of Object.entries(notes)) {
      if (typeof n.verified === 'string' && n.verified > new Date().toISOString().slice(0, 10)) problems.push({ file: 'figure_notes.json', path: `countries.${iso}.${k}.verified`, message: 'date is in the future', value: n.verified });
    }
  }

  // 2b. A last-checked date cannot lie in the future.
  const today = new Date().toISOString().slice(0, 10);
  const notFuture = (file: string, list: Rec[], base: string) => list.forEach((r, i) => {
    if (typeof r.verified === 'string' && r.verified > today) problems.push({ file, path: `${base}[${i}].verified`, message: 'date is in the future', value: r.verified });
  });
  notFuture('relations.json', rel.edges, 'edges');
  notFuture('relations.json', rel.blocs, 'blocs');
  notFuture('resources.json', resources.entries, 'entries');
  notFuture('resources.json', resources.sites, 'sites');

  // 3. Ids that must be unique.
  const dupes = (file: string, list: Rec[], base: string) => {
    const seen = new Set<string>();
    list.forEach((r, i) => { const v = r.id as string; if (seen.has(v)) problems.push({ file, path: `${base}[${i}].id`, message: 'duplicate id', value: v }); seen.add(v); });
  };
  const allConflicts = new Set<string>();
  for (const file of conflictFiles) (files[file] as { conflicts: Rec[] }).conflicts.forEach((c, i) => {
    if (allConflicts.has(c.id as string)) problems.push({ file, path: `conflicts[${i}].id`, message: 'duplicate conflict id (ids are unique across all regions)', value: c.id });
    allConflicts.add(c.id as string);
  });
  dupes('timeline.json', (files['timeline.json'] as { events: Rec[] }).events, 'events');
  dupes('chokepoints.json', (files['chokepoints.json'] as { points: Rec[] }).points, 'points');
  dupes('relations.json', rel.blocs, 'blocs');
  dupes('resources.json', resources.sites, 'sites');
  dupes('nuclear.json', nuclear.zones, 'zones');
  dupes('nuclear_plants.json', plants, 'plants');
  for (const [iso, r] of Object.entries(nuclear.countries)) {
    if (typeof r.verified === 'string' && r.verified > today) problems.push({ file: 'nuclear.json', path: `countries.${iso}.verified`, message: 'date is in the future', value: r.verified });
  }

  // 4. The open-data refresh (live/indicators.json), when present: shape, layout, known countries, no future years.
  const liveName = 'live/indicators.json', livePath = path.join(dataDir, liveName);
  if (fs.existsSync(livePath)) {
    const text = fs.readFileSync(livePath, 'utf8').replace(/\r\n/g, '\n');
    let data: unknown;
    try { data = JSON.parse(text); } catch (err) { problems.push({ file: liveName, path: '', message: `not valid JSON: ${(err as Error).message}` }); }
    if (data !== undefined) {
      if (text !== formatJson(data)) layout.push({ file: liveName, path: '', message: 'not in the canonical layout; run npm run format-data' });
      const res = liveFile.safeParse(data);
      if (!res.success) for (const issue of res.error.issues) problems.push({ file: liveName, path: pathOf(issue.path), message: issue.message, value: at(data, issue.path) });
      else {
        const year = new Date().getUTCFullYear();
        if (res.data.retrieved && res.data.retrieved > today) problems.push({ file: liveName, path: 'retrieved', message: 'date is in the future', value: res.data.retrieved });
        for (const [iso, row] of Object.entries(res.data.values)) {
          country(liveName, `values.${iso}`, iso);
          for (const [k, v] of Object.entries(row)) if (v && v[1] > year) problems.push({ file: liveName, path: `values.${iso}.${k}`, message: 'year is in the future', value: v });
        }
      }
    }
  }
  // 5. Historical borders (history/): every unit has the fields the lens reads and an Arabic name.
  const histDir = path.join(dataDir, 'history');
  if (fs.existsSync(path.join(histDir, 'cshapes.topo.json'))) {
    const topo = JSON.parse(fs.readFileSync(path.join(histDir, 'cshapes.topo.json'), 'utf8')) as { objects: Record<string, { geometries: { properties?: Rec }[] }> };
    const metaText = fs.readFileSync(path.join(histDir, 'meta.json'), 'utf8').replace(/\r\n/g, '\n');
    const meta = JSON.parse(metaText) as { names: Record<string, string>; rulers: Record<string, unknown> };
    if (metaText !== formatJson(meta)) layout.push({ file: 'history/meta.json', path: '', message: 'not in the canonical layout; run npm run format-data' });
    const geoms = topo.objects.borders?.geometries ?? [];
    if (!geoms.length) problems.push({ file: 'history/cshapes.topo.json', path: 'objects.borders', message: 'no geometries' });
    geoms.forEach((g, i) => {
      const p = g.properties ?? {};
      for (const k of ['gwcode', 'country_name', 'start', 'end', 'status', 'owner', 'fid']) {
        if (p[k] == null) problems.push({ file: 'history/cshapes.topo.json', path: `objects.borders.geometries[${i}].properties.${k}`, message: 'missing' });
      }
      if (typeof p.country_name === 'string' && !meta.names[p.country_name]) problems.push({ file: 'history/meta.json', path: `names["${p.country_name}"]`, message: 'no Arabic name for this unit' });
      if (typeof p.start === 'string' && typeof p.end === 'string' && p.start > p.end) problems.push({ file: 'history/cshapes.topo.json', path: `objects.borders.geometries[${i}]`, message: 'starts after it ends', value: [p.start, p.end] });
    });
  }
  // 6. Pipelines, LNG terminals and fields (energy/): fields the lens reads, known states, and the curated notes' links.
  const energyDir = path.join(dataDir, 'energy');
  if (fs.existsSync(path.join(energyDir, 'pipelines.topo.json'))) {
    const topo = JSON.parse(fs.readFileSync(path.join(energyDir, 'pipelines.topo.json'), 'utf8')) as { objects: Record<string, { geometries: { type: string | null; properties?: Rec }[] }> };
    const canon = (f: string) => {
      const text = fs.readFileSync(path.join(energyDir, f), 'utf8').replace(/\r\n/g, '\n');
      const data = JSON.parse(text) as unknown;
      if (text !== formatJson(data)) layout.push({ file: `energy/${f}`, path: '', message: 'not in the canonical layout; run npm run format-data' });
      return data;
    };
    const meta = canon('meta.json') as { names: Record<string, string>; notes: { pipelines: string[]; chokepoints: string[]; conflicts: string[]; ar: string; en: string; sources: { title: string; url: string }[] }[] };
    const lng = canon('lng.json') as Rec[];
    const file = 'energy/pipelines.topo.json';
    const geoms = topo.objects.pipelines?.geometries ?? [];
    if (!geoms.length) problems.push({ file, path: 'objects.pipelines', message: 'no geometries' });
    const ids = new Set<string>(), systems = new Set<string>();
    geoms.forEach((g, i) => {
      const p = g.properties ?? {}, at = `objects.pipelines.geometries[${i}]`;
      if (g.type !== 'LineString' && g.type !== 'MultiLineString') problems.push({ file, path: at, message: 'not a line', value: g.type });
      for (const k of ['id', 'n', 'f', 'st']) if (p[k] == null) problems.push({ file, path: `${at}.properties.${k}`, message: 'missing' });
      if (!['gas', 'oil', 'ngl'].includes(p.f as string)) problems.push({ file, path: `${at}.properties.f`, message: 'unknown fuel', value: p.f });
      if (!['operating', 'construction', 'idle', 'mothballed'].includes(p.st as string)) problems.push({ file, path: `${at}.properties.st`, message: 'status outside operating / construction / idle / mothballed', value: p.st });
      if (p.z != null && p.st !== 'idle' && p.st !== 'mothballed') problems.push({ file, path: `${at}.properties.z`, message: 'a stop year on a line that is not halted', value: p.z });
      if (ids.has(p.id as string)) problems.push({ file, path: `${at}.properties.id`, message: 'duplicate id', value: p.id });
      ids.add(p.id as string); systems.add(p.n as string);
      if (typeof p.c === 'string') p.c.split(',').forEach((iso) => country(file, `${at}.properties.c`, iso));
    });
    lng.forEach((t, i) => {
      const at = `[${i}]`;
      for (const k of ['id', 'n', 't', 'st', 'lon', 'lat']) if (t[k] == null) problems.push({ file: 'energy/lng.json', path: `${at}.${k}`, message: 'missing' });
      if (!['import', 'export'].includes(t.t as string)) problems.push({ file: 'energy/lng.json', path: `${at}.t`, message: 'type outside import / export', value: t.t });
      if (!['operating', 'construction'].includes(t.st as string)) problems.push({ file: 'energy/lng.json', path: `${at}.st`, message: 'status outside operating / construction', value: t.st });
      if (Math.abs(Number(t.lon)) > 180 || Math.abs(Number(t.lat)) > 90) problems.push({ file: 'energy/lng.json', path: at, message: 'coordinates out of range', value: [t.lon, t.lat] });
      if (t.iso != null) country('energy/lng.json', `${at}.iso`, t.iso);
    });
    // oil and gas fields (minified, so not held to the canonical layout): kinds, statuses, places and project links
    const fieldsFile = path.join(energyDir, 'fields.json');
    if (fs.existsSync(fieldsFile)) {
      const ff = 'energy/fields.json';
      const fields = JSON.parse(fs.readFileSync(fieldsFile, 'utf8')) as Rec[];
      const fieldIds = new Set<string>();
      fields.forEach((x, i) => {
        const at = `[${i}]`;
        for (const k of ['id', 'n', 'f', 'st', 'lon', 'lat']) if (x[k] == null) problems.push({ file: ff, path: `${at}.${k}`, message: 'missing' });
        if (fieldIds.has(x.id as string)) problems.push({ file: ff, path: `${at}.id`, message: 'duplicate id', value: x.id });
        fieldIds.add(x.id as string);
        if (!['o', 'g', 'og'].includes(x.f as string)) problems.push({ file: ff, path: `${at}.f`, message: 'fuel outside o / g / og', value: x.f });
        if (!['operating', 'construction', 'mothballed'].includes(x.st as string)) problems.push({ file: ff, path: `${at}.st`, message: 'status outside operating / construction / mothballed', value: x.st });
        if (Math.abs(Number(x.lon)) > 180 || Math.abs(Number(x.lat)) > 90) problems.push({ file: ff, path: at, message: 'coordinates out of range', value: [x.lon, x.lat] });
        if (typeof x.c === 'string') x.c.split(',').forEach((iso) => country(ff, `${at}.c`, iso));
        for (const k of ['boe', 'lq', 'gs']) if (x[k] != null && !(Number(x[k]) > 0)) problems.push({ file: ff, path: `${at}.${k}`, message: 'not a positive number', value: x[k] });
        if (x.p != null && x.pj) problems.push({ file: ff, path: `${at}.p`, message: 'a project inside a project', value: x.p });
        if (x.u != null && !x.pj) problems.push({ file: ff, path: `${at}.u`, message: 'units on a unit that is not a project' });
      });
      const byId = new Map(fields.map((x) => [x.id as string, x]));
      // the atlas's landmark names: each a field in the data, with an Arabic and an English name
      const lm = (JSON.parse(fs.readFileSync(path.join(energyDir, 'meta.json'), 'utf8')) as { landmarks?: Record<string, { ar?: string; en?: string }> }).landmarks ?? {};
      for (const [id, n] of Object.entries(lm)) {
        if (!byId.has(id)) problems.push({ file: 'energy/meta.json', path: `landmarks.${id}`, message: 'no field of this id' });
        if (!n.ar?.trim() || !n.en?.trim()) problems.push({ file: 'energy/meta.json', path: `landmarks.${id}`, message: 'a landmark needs an Arabic and an English name' });
      }
      fields.forEach((x, i) => {
        if (x.p != null && !byId.get(x.p as string)?.pj) problems.push({ file: ff, path: `[${i}].p`, message: 'no project of this id', value: x.p });
        ((x.u as string[] | undefined) ?? []).forEach((id, j) => { if (byId.get(id)?.p !== x.id) problems.push({ file: ff, path: `[${i}].u[${j}]`, message: 'unit missing or not linked back to this project', value: id }); });
      });
    }
    const chokeIds = new Set((files['chokepoints.json'] as { points: Rec[] }).points.map((p) => p.id as string));
    for (const name of Object.keys(meta.names)) if (!systems.has(name)) problems.push({ file: 'energy/meta.json', path: `names["${name}"]`, message: 'no pipeline of this name' });
    meta.notes.forEach((n, i) => {
      const at = `notes[${i}]`;
      n.pipelines.forEach((name, j) => { if (!systems.has(name)) problems.push({ file: 'energy/meta.json', path: `${at}.pipelines[${j}]`, message: 'no pipeline of this name', value: name }); });
      n.chokepoints.forEach((id, j) => { if (!chokeIds.has(id)) problems.push({ file: 'energy/meta.json', path: `${at}.chokepoints[${j}]`, message: 'unknown chokepoint id', value: id }); });
      n.conflicts.forEach((id, j) => conflict('energy/meta.json', `${at}.conflicts[${j}]`, id));
      if (!n.ar?.trim() || !n.en?.trim()) problems.push({ file: 'energy/meta.json', path: at, message: 'note needs Arabic and English text' });
      if (!n.sources.length) problems.push({ file: 'energy/meta.json', path: `${at}.sources`, message: 'a note needs at least one source' });
      n.sources.forEach((s, j) => { if (!/^https:\/\//.test(s.url)) problems.push({ file: 'energy/meta.json', path: `${at}.sources[${j}].url`, message: 'not an https link', value: s.url }); });
    });
  }
  // 7. Power plants (power/): the columns line up, codes and states are known, and every plant has its detail entry.
  const powerDir = path.join(dataDir, 'power');
  if (fs.existsSync(path.join(powerDir, 'plants.json'))) {
    const pf = 'power/plants.json';
    const metaText = fs.readFileSync(path.join(powerDir, 'meta.json'), 'utf8').replace(/\r\n/g, '\n');
    if (metaText !== formatJson(JSON.parse(metaText))) layout.push({ file: 'power/meta.json', path: '', message: 'not in the canonical layout; run npm run format-data' });
    const W = JSON.parse(fs.readFileSync(path.join(powerDir, 'plants.json'), 'utf8')) as {
      iso: string[]; id: number[]; n: string[]; t: string; s: string; mw: number[]; x: number[]; y: number[]; c: number[]; y0: number[]; y1: number[]; ar: [number, string][]; pa: number[]; parents: string[];
    };
    const n = W.id.length;
    for (const [k, v] of Object.entries({ n: W.n, t: W.t, s: W.s, mw: W.mw, x: W.x, y: W.y, c: W.c, y0: W.y0, y1: W.y1, pa: W.pa })) {
      if (v.length !== n) problems.push({ file: pf, path: k, message: `${v.length} values for ${n} plants` });
    }
    W.iso.forEach((iso, i) => country(pf, `iso[${i}]`, iso));
    // the nuclear plants' links to their GEM entries: each a nuclear station of this file, claimed by one plant only
    const nuclearIds = new Set(W.id.filter((_, i) => W.t[i] === 'n').map((v) => `L${100000000000 + v}`)), claimed = new Set<string>();
    plants.forEach((p, i) => (p.gem as string[] | undefined)?.forEach((g, j) => {
      if (!nuclearIds.has(g)) problems.push({ file: 'nuclear_plants.json', path: `plants[${i}].gem[${j}]`, message: 'not a nuclear plant in power/plants.json', value: g });
      if (claimed.has(g)) problems.push({ file: 'nuclear_plants.json', path: `plants[${i}].gem[${j}]`, message: 'linked from two plants', value: g });
      claimed.add(g);
    }));
    const ids = new Set<number>();
    const expected = new Map<string, Set<string>>();
    for (let i = 0; i < n; i++) {
      const at = `[${i}]`, id = W.id[i]!;
      if (ids.has(id)) problems.push({ file: pf, path: `id${at}`, message: 'duplicate id', value: id });
      ids.add(id);
      if (!W.n[i]?.trim()) problems.push({ file: pf, path: `n${at}`, message: 'missing name' });
      if (!'cgnhswbe'.includes(W.t[i]!)) problems.push({ file: pf, path: `t${at}`, message: 'unknown type code', value: W.t[i] });
      if (!'ocmr'.includes(W.s[i]!)) problems.push({ file: pf, path: `s${at}`, message: 'unknown status code', value: W.s[i] });
      const y0 = W.y0[i]!, y1 = W.y1[i]!;
      if (y0 && !(y0 > 1850 && y0 < 2100)) problems.push({ file: pf, path: `y0${at}`, message: 'not a year', value: y0 });
      if ((W.s[i] === 'r') !== !!y1) problems.push({ file: pf, path: `y1${at}`, message: 'a retirement year for retired plants, and only for them', value: y1 });
      if (y1 && !(y1 >= y0)) problems.push({ file: pf, path: `y1${at}`, message: 'retired before it started', value: [y0, y1] });
      if (!(W.mw[i]! >= 0)) problems.push({ file: pf, path: `mw${at}`, message: 'not a capacity', value: W.mw[i] });
      if (Math.abs(W.x[i]!) > 180000 || Math.abs(W.y[i]!) > 90000) problems.push({ file: pf, path: at, message: 'coordinates out of range', value: [W.x[i], W.y[i]] });
      if (W.pa[i]! < -1 || W.pa[i]! >= W.parents.length) problems.push({ file: pf, path: `pa${at}`, message: 'no such owner', value: W.pa[i] });
      const c = W.c[i]!;
      if (c < -1 || c >= W.iso.length) problems.push({ file: pf, path: `c${at}`, message: 'no such state', value: c });
      const shard = c >= 0 ? W.iso[c]! : '_';
      if (!expected.has(shard)) expected.set(shard, new Set());
      expected.get(shard)!.add(`L${100000000000 + id}`);
    }
    W.ar.forEach(([i, name], j) => { if (!(i >= 0 && i < n) || !name.trim()) problems.push({ file: pf, path: `ar[${j}]`, message: 'not a plant and a name', value: [i, name] }); });
    const detailDir = path.join(powerDir, 'detail');
    const shards = fs.existsSync(detailDir) ? fs.readdirSync(detailDir).filter((f) => f.endsWith('.json')) : [];
    for (const f of shards) {
      const key = f.replace(/\.json$/, ''), file = `power/detail/${f}`;
      const want = expected.get(key);
      if (!want) { problems.push({ file, path: '', message: 'no plant of this state in plants.json' }); continue; }
      const d = JSON.parse(fs.readFileSync(path.join(detailDir, f), 'utf8')) as Record<string, Rec>;
      for (const [id, x] of Object.entries(d)) {
        if (!want.delete(id)) problems.push({ file, path: id, message: 'not a plant of this state in plants.json' });
        if (!(Number(x.u) >= 1)) problems.push({ file, path: `${id}.u`, message: 'no units' });
        if (typeof x.c === 'string') x.c.split(',').forEach((iso) => country(file, `${id}.c`, iso));
      }
    }
    for (const [key, left] of expected) for (const id of left) problems.push({ file: `power/detail/${key}.json`, path: id, message: 'plant missing from its detail file' });
    const plantIds = new Set(W.id.map((n) => `L${100000000000 + n}`));
    const plm = (JSON.parse(metaText) as { landmarks?: Record<string, { ar?: string; en?: string }> }).landmarks ?? {};
    for (const [id, n] of Object.entries(plm)) {
      if (!plantIds.has(id)) problems.push({ file: 'power/meta.json', path: `landmarks.${id}`, message: 'no plant of this id' });
      if (!n.ar?.trim() || !n.en?.trim()) problems.push({ file: 'power/meta.json', path: `landmarks.${id}`, message: 'a landmark needs an Arabic and an English name' });
    }
    // per-state totals for the country summary
    const cf = path.join(powerDir, 'countries.json');
    if (fs.existsSync(cf)) {
      const C = JSON.parse(fs.readFileSync(cf, 'utf8')) as Record<string, Record<string, Record<string, number>>>;
      for (const [iso, d] of Object.entries(C)) {
        country('power/countries.json', iso, iso);
        for (const [k, m] of Object.entries(d)) {
          if (k !== 'op' && k !== 'con') { problems.push({ file: 'power/countries.json', path: `${iso}.${k}`, message: 'not op or con' }); continue; }
          for (const [ty, mw] of Object.entries(m)) {
            if (!['coal', 'gas', 'nuclear', 'hydro', 'solar', 'wind', 'bio', 'geo'].includes(ty)) problems.push({ file: 'power/countries.json', path: `${iso}.${k}.${ty}`, message: 'unknown type' });
            if (!(mw > 0)) problems.push({ file: 'power/countries.json', path: `${iso}.${k}.${ty}`, message: 'not a positive capacity', value: mw });
          }
        }
      }
    }
  }
  // 8. Mines and heavy industry (industry/): layers, statuses, places and capacities.
  const sitesFile = path.join(dataDir, 'industry', 'sites.json');
  if (fs.existsSync(sitesFile)) {
    const sf = 'industry/sites.json';
    const metaText = fs.readFileSync(path.join(dataDir, 'industry', 'meta.json'), 'utf8').replace(/\r\n/g, '\n');
    const meta = JSON.parse(metaText) as { sources: Record<string, unknown> };
    if (metaText !== formatJson(meta)) layout.push({ file: 'industry/meta.json', path: '', message: 'not in the canonical layout; run npm run format-data' });
    const sites = JSON.parse(fs.readFileSync(sitesFile, 'utf8')) as Rec[];
    const seen = new Set<string>();
    sites.forEach((x, i) => {
      const at = `[${i}]`;
      for (const k of ['id', 'l', 'n', 'st', 'lon', 'lat']) if (x[k] == null || x[k] === '') problems.push({ file: sf, path: `${at}.${k}`, message: 'missing' });
      if (seen.has(x.id as string)) problems.push({ file: sf, path: `${at}.id`, message: 'duplicate id', value: x.id });
      seen.add(x.id as string);
      if (!['cm', 'ct', 'io', 'st', 'ce', 'ch'].includes(x.l as string)) problems.push({ file: sf, path: `${at}.l`, message: 'unknown layer', value: x.l });
      else if (!meta.sources[x.l as string]) problems.push({ file: 'industry/meta.json', path: `sources.${x.l}`, message: 'no source for this layer' });
      if (!['operating', 'construction', 'mothballed'].includes(x.st as string)) problems.push({ file: sf, path: `${at}.st`, message: 'status outside operating / construction / mothballed', value: x.st });
      if (Math.abs(Number(x.lon)) > 180 || Math.abs(Number(x.lat)) > 90) problems.push({ file: sf, path: at, message: 'coordinates out of range', value: [x.lon, x.lat] });
      if (x.c != null) country(sf, `${at}.c`, x.c);
      for (const k of ['cap', 'capc', 'prod']) if (x[k] != null && !(Number(x[k]) > 0)) problems.push({ file: sf, path: `${at}.${k}`, message: 'not a positive number', value: x[k] });
    });
  }

  // 9. Natural Earth base layers (geo/rivers.json, geo/cities.json, geo/water.json): the columns the map reads, in range.
  const inRange = (lon: unknown, lat: unknown) => Number.isFinite(lon) && Number.isFinite(lat) && Math.abs(lon as number) <= 180 && Math.abs(lat as number) <= 90;
  const riversFile = path.join(dataDir, 'geo', 'rivers.json');
  if (fs.existsSync(riversFile)) {
    const rf = 'geo/rivers.json';
    (JSON.parse(fs.readFileSync(riversFile, 'utf8')) as unknown[][]).forEach(([rank, lines], i) => {
      if (!Number.isInteger(rank) || (rank as number) < 1 || (rank as number) > 6) problems.push({ file: rf, path: `[${i}][0]`, message: 'scale rank outside 1–6', value: rank });
      if (!Array.isArray(lines) || !lines.length) { problems.push({ file: rf, path: `[${i}][1]`, message: 'no lines' }); return; }
      (lines as number[][][]).forEach((l, j) => {
        if (!Array.isArray(l) || l.length < 2) problems.push({ file: rf, path: `[${i}][1][${j}]`, message: 'a line needs two points' });
        else if (!l.every((pt) => inRange(pt[0], pt[1]))) problems.push({ file: rf, path: `[${i}][1][${j}]`, message: 'coordinates out of range' });
      });
    });
  }
  const citiesFile = path.join(dataDir, 'geo', 'cities.json');
  if (fs.existsSync(citiesFile)) {
    const cf = 'geo/cities.json';
    let prev = Infinity;
    (JSON.parse(fs.readFileSync(citiesFile, 'utf8')) as unknown[][]).forEach(([en, ar, lon, lat, pop, rank, cap], i) => {
      const at = `[${i}]`;
      if (typeof en !== 'string' || !en) problems.push({ file: cf, path: `${at}[0]`, message: 'no name' });
      if (typeof ar !== 'string' || !/[\u0600-\u06ff]/.test(ar)) problems.push({ file: cf, path: `${at}[1]`, message: 'no Arabic name', value: ar });
      if (!inRange(lon, lat)) problems.push({ file: cf, path: at, message: 'coordinates out of range', value: [lon, lat] });
      if (!Number.isInteger(pop) || (pop as number) < 0) problems.push({ file: cf, path: `${at}[4]`, message: 'population not a whole number', value: pop });
      else if ((pop as number) > prev) problems.push({ file: cf, path: `${at}[4]`, message: 'not sorted by population, largest first', value: pop });
      else prev = pop as number;
      if (!Number.isInteger(rank) || (rank as number) < 0 || (rank as number) > 10) problems.push({ file: cf, path: `${at}[5]`, message: 'scale rank outside 0–10', value: rank });
      if (cap !== 0 && cap !== 1) problems.push({ file: cf, path: `${at}[6]`, message: 'capital flag not 0 or 1', value: cap });
    });
  }
  const waterFile = path.join(dataDir, 'geo', 'water.json');
  if (fs.existsSync(waterFile)) {
    const wf = 'geo/water.json';
    const W = JSON.parse(fs.readFileSync(waterFile, 'utf8')) as { seas: unknown[][]; rivers: unknown[][] };
    const named = (at: string, ar: unknown, en: unknown) => {
      if (typeof ar !== 'string' || !/[\u0600-\u06ff]/.test(ar)) problems.push({ file: wf, path: `${at}[0]`, message: 'no Arabic name', value: ar });
      if (typeof en !== 'string' || !en) problems.push({ file: wf, path: `${at}[1]`, message: 'no name' });
    };
    W.seas.forEach(([ar, en, cla, rank, lon, lat], i) => {
      const at = `seas[${i}]`;
      named(at, ar, en);
      if (!['ocean', 'sea', 'gulf', 'bay', 'strait', 'channel', 'sound', 'river'].includes(cla as string)) problems.push({ file: wf, path: `${at}[2]`, message: 'unknown kind of water', value: cla });
      if (!Number.isInteger(rank) || (rank as number) < 0 || (rank as number) > 6) problems.push({ file: wf, path: `${at}[3]`, message: 'scale rank outside 0–6', value: rank });
      if (!inRange(lon, lat)) problems.push({ file: wf, path: at, message: 'coordinates out of range', value: [lon, lat] });
    });
    W.rivers.forEach(([ar, en, rank, places], i) => {
      const at = `rivers[${i}]`;
      named(at, ar, en);
      if (!Number.isInteger(rank) || (rank as number) < 1 || (rank as number) > 6) problems.push({ file: wf, path: `${at}[2]`, message: 'scale rank outside 1–6', value: rank });
      if (!Array.isArray(places) || !places.length) problems.push({ file: wf, path: `${at}[3]`, message: 'no place for the name' });
      else (places as number[][]).forEach((pl, j) => {
        if (pl.length !== 4 || !inRange(pl[0], pl[1]) || !inRange(pl[2], pl[3])) problems.push({ file: wf, path: `${at}[3][${j}]`, message: 'a place is [lon, lat, lon2, lat2] in range', value: pl });
      });
    });
  }
  return [...layout, ...problems];
}

/** How many relations, blocs, resource records and sites carry source links, and which do not. */
export function provenanceCoverage(dataDir: string) {
  const read = (f: string) => JSON.parse(fs.readFileSync(path.join(dataDir, 'curated', f), 'utf8'));
  const rel = read('relations.json'), res = read('resources.json');
  type R = { sources?: string[]; verified?: string; [k: string]: unknown };
  const sets: [string, R[], (r: R) => string][] = [
    ['relations', rel.edges, (r) => `${r.a}–${r.b}`],
    ['blocs', rel.blocs, (r) => String(r.id)],
    ['resources', res.entries, (r) => `${r.iso3}:${r.type}`],
    ['sites', res.sites, (r) => String(r.id)],
  ];
  return sets.map(([name, list, key]) => ({
    name, total: list.length,
    sourced: list.filter((r) => r.sources?.length).length,
    verified: list.filter((r) => r.verified).length,
    missing: list.filter((r) => !r.sources?.length).map(key),
  }));
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const dir = path.resolve(import.meta.dirname, '../public/data');
  const problems = checkData(dir);
  for (const p of problems) console.log(`${p.file} › ${p.path || '(file)'} › ${p.message}${p.value !== undefined ? ` (got ${JSON.stringify(p.value)})` : ''}`);
  console.log(problems.length ? `\n${problems.length} problem(s) in public/data` : 'public/data: all checks passed');
  // Source coverage is reported, not enforced: older records predate the provenance fields.
  for (const c of provenanceCoverage(dir)) {
    console.log(`  sources: ${c.name} ${c.sourced}/${c.total}, last-checked ${c.verified}/${c.total}`);
    if (process.argv.includes('--missing')) for (const m of c.missing) console.log(`    no source: ${m}`);
  }
  process.exit(problems.length ? 1 : 0);
}
