// Fetches every data file and builds the model. Progress is reported per file (0–1).

import { build } from './build';
import { FILES } from './files';
import type { DB, RawData } from './types';

export async function loadAll(onProgress: (p: number, file: string) => void = () => {}, base = import.meta.env.BASE_URL + 'data/'): Promise<DB> {
  const entries = Object.entries(FILES);
  const raw: Record<string, unknown> = {};
  let done = 0;
  await Promise.all(entries.map(async ([key, file]) => {
    const res = await fetch(base + file);
    if (!res.ok) throw new Error(`${file}: HTTP ${res.status}`);
    raw[key] = await res.json();
    onProgress(++done / entries.length, file);
  }));
  return build(raw as unknown as RawData);
}
