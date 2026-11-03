import fs from 'node:fs';
import path from 'node:path';
import { FILES } from '../../src/data/files';
import type { RawData } from '../../src/data/types';

export const DATA_DIR = path.resolve(__dirname, '../../public/data');

/**
 * Reads every data file from disk, the way loadAll() fetches them. The weekly open-data file (live/indicators.json)
 * changes every week, so it is left out unless asked for: tests then see the fixed Natural Earth baseline.
 */
export function readRaw(dir = DATA_DIR, { live = false } = {}): RawData {
  const out: Record<string, unknown> = {};
  for (const [k, f] of Object.entries(FILES)) out[k] = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'));
  if (!live) out.live = null;
  return out as unknown as RawData;
}
