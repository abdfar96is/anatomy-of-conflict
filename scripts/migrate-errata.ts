// One-time D4 migration: fold the legacy errata and unverified list into the curated JSON.
// It refuses to write unless the migrated data builds the same model as the old data plus errata.

import fs from 'node:fs';
import path from 'node:path';
import { build } from '../src/data/build';
import { CONFLICT_FILES, FILES, type FileKey } from '../src/data/files';
import type { DB, Kind, RawData } from '../src/data/types';
import { applyErrata, UNVERIFIED } from './legacy-errata';

const DIR = path.resolve(import.meta.dirname, '../public/data');
const read = (f: string) => JSON.parse(fs.readFileSync(path.join(DIR, f), 'utf8'));
const raw = Object.fromEntries(Object.entries(FILES).map(([k, f]) => [k, read(f)])) as unknown as RawData;
const clone = () => structuredClone(raw);

// Expected: the legacy way (errata at load time, unverified from a list).
const before = clone();
const results = applyErrata(before) as { id: string; where: unknown; what: unknown; applied: boolean }[];
const failed = results.filter((r) => !r.applied).map((r) => r.id);
if (failed.length) { console.error('errata not applied:', failed); process.exit(1); }
const expected = build(before);

// Migrated: errata written into the data, unverified as a field, corrections as a file.
const after = clone();
applyErrata(after);
const conflictsById = new Map(CONFLICT_FILES.flatMap((k) => after[k].conflicts.map((c) => [c.id, c] as const)));
const flag = (rec: { unverified?: boolean } | undefined, what: string) => {
  if (!rec) { console.error('unverified id not found:', what); process.exit(1); }
  rec.unverified = true;
};
for (const id of UNVERIFIED.conflict) flag(conflictsById.get(id), 'conflict:' + id);
for (const id of UNVERIFIED.choke) flag(after.choke.points.find((p) => p.id === id), 'choke:' + id);
for (const id of UNVERIFIED.event) flag(after.timeline.events.find((e) => e.id === id), 'event:' + id);
for (const id of UNVERIFIED.country) flag((after.intel.countries[id] ??= {}), 'country:' + id);
after.corrections = results.map(({ id, where, what }) => ({ id, where, what })) as RawData['corrections'];
const migrated = build(after);

// Compare everything except the members that are expected to differ.
const SKIP = new Set(['raw', 'corrections', 'unverified']);
const serialize = (db: DB) => JSON.stringify(db, (k, v) => {
  if (SKIP.has(k) || typeof v === 'function') return undefined;
  return v instanceof Map ? [...v.entries()] : v instanceof Set ? [...v] : v;
});
const a = serialize(expected), b = serialize(migrated);
if (a !== b) {
  let i = 0; while (a[i] === b[i]) i++;
  console.error('models differ near:', a.slice(Math.max(0, i - 120), i + 120), '\n---\n', b.slice(Math.max(0, i - 120), i + 120));
  process.exit(1);
}
const listed = new Set(Object.entries(UNVERIFIED).flatMap(([k, ids]) => (ids as string[]).map((id) => `${k}:${id}`)));
for (const key of listed) {
  const [kind, id] = key.split(':') as [Kind, string];
  if (!migrated.isUnverified(kind, id)) { console.error('flag lost:', key); process.exit(1); }
}

// Write only the files that changed, plus corrections.json.
const written: string[] = [];
for (const [k, f] of Object.entries(FILES) as [FileKey, string][]) {
  const next = JSON.stringify(after[k as keyof RawData], null, 2) + '\n';
  if (JSON.stringify(after[k as keyof RawData]) === JSON.stringify(raw[k as keyof RawData])) continue;
  fs.writeFileSync(path.join(DIR, f), next);
  written.push(f);
}
fs.writeFileSync(path.join(DIR, 'curated/corrections.json'), JSON.stringify(after.corrections, null, 2) + '\n');
written.push('curated/corrections.json');
console.log('models identical; unverified flags:', listed.size);
console.log('written:\n  ' + written.join('\n  '));
