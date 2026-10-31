import fs from 'node:fs';
import path from 'node:path';
import { FILES } from '../../src/data/files';
import type { RawData } from '../../src/data/types';

export const DATA_DIR = path.resolve(__dirname, '../../public/data');

/** Reads every data file from disk, the way loadAll() fetches them. */
export function readRaw(dir = DATA_DIR): RawData {
  const out: Record<string, unknown> = {};
  for (const [k, f] of Object.entries(FILES)) out[k] = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'));
  const corr = path.join(dir, 'curated/corrections.json');
  if (fs.existsSync(corr)) out.corrections = JSON.parse(fs.readFileSync(corr, 'utf8'));
  return out as unknown as RawData;
}
