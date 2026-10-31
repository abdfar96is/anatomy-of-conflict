// Rewrites every curated JSON file in the canonical layout (see format-json.ts). Content never changes.

import fs from 'node:fs';
import path from 'node:path';
import { isDeepStrictEqual } from 'node:util';
import { formatJson } from './format-json';

const DIR = path.resolve(import.meta.dirname, '../public/data/curated');
const files = fs.readdirSync(DIR, { recursive: true, encoding: 'utf8' }).filter((f) => f.endsWith('.json'));
let changed = 0;
for (const f of files) {
  const p = path.join(DIR, f);
  const text = fs.readFileSync(p, 'utf8');
  const data = JSON.parse(text);
  const next = formatJson(data);
  if (!isDeepStrictEqual(JSON.parse(next), data)) throw new Error(`${f}: formatting changed the content`);
  if (next !== text.replace(/\r\n/g, '\n')) { fs.writeFileSync(p, next); changed++; console.log('formatted', f); }
}
console.log(`${changed} of ${files.length} files formatted`);
