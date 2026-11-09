// Rewrites every curated (and live) JSON file, and the metadata beside the map files, in the canonical layout
// (see format-json.ts). Content never changes.

import fs from 'node:fs';
import path from 'node:path';
import { isDeepStrictEqual } from 'node:util';
import { formatJson } from './format-json';

const ROOT = path.resolve(import.meta.dirname, '../public/data');
const files = ['curated', 'live'].filter((d) => fs.existsSync(path.join(ROOT, d))).flatMap((d) =>
  fs.readdirSync(path.join(ROOT, d), { recursive: true, encoding: 'utf8' }).filter((f) => f.endsWith('.json')).map((f) => path.join(d, f)));
// the hand-edited companions of the generated map files (the TopoJSON stays minified)
for (const f of ['history/meta.json', 'energy/meta.json', 'energy/lng.json']) if (fs.existsSync(path.join(ROOT, f))) files.push(f);
let changed = 0;
for (const f of files) {
  const p = path.join(ROOT, f);
  const text = fs.readFileSync(p, 'utf8');
  const data = JSON.parse(text);
  const next = formatJson(data);
  if (!isDeepStrictEqual(JSON.parse(next), data)) throw new Error(`${f}: formatting changed the content`);
  if (next !== text.replace(/\r\n/g, '\n')) { fs.writeFileSync(p, next); changed++; console.log('formatted', f); }
}
console.log(`${changed} of ${files.length} files formatted`);
