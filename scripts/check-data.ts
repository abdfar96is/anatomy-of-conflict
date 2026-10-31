// Validates the curated data: file shapes, links between records, unique ids and the canonical layout.
// Run `npm run check-data`. Each problem prints as: <file> › <json path> › <message> (got <value>)

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { formatJson } from './format-json';
import { conflictFile, SCHEMAS } from './schema';

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
  const files: Record<string, unknown> = {};

  // 1. Each file parses, is in the canonical layout, and has the expected shape.
  const names = fs.readdirSync(curated, { recursive: true, encoding: 'utf8' }).filter((f) => f.endsWith('.json')).map((f) => f.replace(/\\/g, '/')).sort();
  for (const file of names) {
    const text = fs.readFileSync(path.join(curated, file), 'utf8').replace(/\r\n/g, '\n');
    let data: unknown;
    try { data = JSON.parse(text); } catch (err) { problems.push({ file, path: '', message: `not valid JSON: ${(err as Error).message}` }); continue; }
    files[file] = data;
    if (text !== formatJson(data)) problems.push({ file, path: '', message: 'not in the canonical layout; run npm run format-data' });
    const schema = file.startsWith('conflicts/') ? conflictFile : SCHEMAS[file];
    if (!schema) { problems.push({ file, path: '', message: 'unknown file; add a schema in scripts/schema.ts' }); continue; }
    const res = schema.safeParse(data);
    if (!res.success) for (const issue of res.error.issues) problems.push({ file, path: pathOf(issue.path), message: issue.message, value: at(data, issue.path) });
  }
  if (problems.length) return problems; // links are only meaningful once the shapes are right

  // 2. Links between records.
  type Rec = Record<string, unknown>;
  const geo = JSON.parse(fs.readFileSync(path.join(dataDir, 'geo/countries.json'), 'utf8')) as { features: { properties: { iso3: string } }[] };
  const isos = new Set(geo.features.map((f) => f.properties.iso3));
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
  });
  resources.entries.forEach((e, i) => {
    country('resources.json', `entries[${i}].iso3`, e.iso3);
    resType('resources.json', `entries[${i}].type`, e.type);
    each('resources.json', e.conflictIds, `entries[${i}].conflictIds`, conflict);
  });
  resources.sites.forEach((s, i) => { country('resources.json', `sites[${i}].iso3`, s.iso3); resType('resources.json', `sites[${i}].type`, s.type); });
  for (const iso of Object.keys((files['country_intel.json'] as { countries: Rec }).countries)) country('country_intel.json', `countries.${iso}`, iso);
  for (const iso of Object.keys((files['religions.json'] as { countries: Rec }).countries)) country('religions.json', `countries.${iso}`, iso);

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
  return problems;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const dir = path.resolve(import.meta.dirname, '../public/data');
  const problems = checkData(dir);
  for (const p of problems) console.log(`${p.file} › ${p.path || '(file)'} › ${p.message}${p.value !== undefined ? ` (got ${JSON.stringify(p.value)})` : ''}`);
  console.log(problems.length ? `\n${problems.length} problem(s) in public/data/curated` : 'public/data/curated: all checks passed');
  process.exit(problems.length ? 1 : 0);
}
