// Fetches population, GDP, refugees, internal displacement and battle deaths from the World Bank's open
// Indicators API (no key needed) and writes public/data/live/indicators.json. Run `npm run fetch-indicators`;
// the weekly GitHub workflow (.github/workflows/update-indicators.yml) runs it and commits the result.
//
// Each series keeps its original publisher: UN population estimates, World Bank/OECD national accounts,
// UNHCR refugee statistics, IDMC displacement figures and UCDP battle deaths. For every country the file keeps
// the latest year that has a value, next to the value, so the atlas can show the year and source of each figure.
// The script never writes a partial file: a failed request or a sanity check that does not pass stops it.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { LiveFile, LiveIndicator, LiveKey } from '../src/data/types';
import { formatJson } from './format-json';

const API = 'https://api.worldbank.org/v2/';
// The World Bank spells Kosovo XKX; Natural Earth and the atlas call it KOS.
const ISO_ALIAS: Record<string, string> = { XKX: 'KOS' };

interface Spec {
  code: string;
  origin: { ar: string; en: string };
  /** How many years behind the series' newest year a country's value may be. */
  window: number;
  /** The fewest countries the series must cover, or the fetch is treated as broken. */
  min: number;
}

export const INDICATORS: Record<LiveKey, Spec> = {
  pop: { code: 'SP.POP.TOTL', origin: { ar: 'الأمم المتحدة (WPP)', en: 'UN WPP' }, window: 10, min: 180 },
  gdp: { code: 'NY.GDP.MKTP.CD', origin: { ar: 'الحسابات القومية', en: 'national accounts' }, window: 10, min: 150 },
  gdpPc: { code: 'NY.GDP.PCAP.CD', origin: { ar: 'الحسابات القومية', en: 'national accounts' }, window: 10, min: 150 },
  refOrigin: { code: 'SM.POP.REFG.OR', origin: { ar: 'المفوضية (UNHCR)', en: 'UNHCR' }, window: 2, min: 100 },
  refAsylum: { code: 'SM.POP.REFG', origin: { ar: 'المفوضية (UNHCR)', en: 'UNHCR' }, window: 2, min: 100 },
  idps: { code: 'VC.IDP.TOCV', origin: { ar: 'مركز رصد النزوح (IDMC)', en: 'IDMC' }, window: 2, min: 25 },
  // UCDP records no value when a country had no conflict above its threshold, so an older value would
  // describe a war that has ended: only the series' newest year counts.
  battleDeaths: { code: 'VC.BTL.DETH', origin: { ar: 'برنامج أوبسالا (UCDP)', en: 'UCDP' }, window: 0, min: 10 },
};
export const LIVE_KEYS = Object.keys(INDICATORS) as LiveKey[];

export const indicatorUrl = (code: string) => `https://data.worldbank.org/indicator/${code}`;

// ---- parsing (pure, tested)

export interface WbRow { iso3: string; year: number; value: number }

/** One page of /country/all/indicator/{code}: [meta, rows]. The API answers errors with HTTP 200 and a message. */
export function parseIndicatorPage(json: unknown): { pages: number; lastUpdated?: string; rows: WbRow[] } {
  if (!Array.isArray(json) || !json[0] || typeof json[0] !== 'object') throw new Error('unexpected response shape');
  const meta = json[0] as { pages?: number; lastupdated?: string; message?: { value?: string }[] };
  if (meta.message) throw new Error(`API error: ${meta.message.map((m) => m.value).join('; ')}`);
  if (typeof meta.pages !== 'number') throw new Error('response has no page count');
  const rows: WbRow[] = [];
  for (const r of (Array.isArray(json[1]) ? json[1] : []) as { countryiso3code?: string; date?: string; value?: unknown }[]) {
    if (typeof r.value !== 'number' || !Number.isFinite(r.value)) continue;
    const iso = String(r.countryiso3code ?? '');
    const year = Number(r.date);
    if (!/^[A-Z]{3}$/.test(iso) || !Number.isInteger(year)) continue;
    rows.push({ iso3: ISO_ALIAS[iso] ?? iso, year, value: r.value });
  }
  return { pages: meta.pages, lastUpdated: meta.lastupdated, rows };
}

/** /country: the economies the World Bank lists, minus its regional and income aggregates. */
export function parseCountryList(json: unknown): Set<string> {
  if (!Array.isArray(json) || !Array.isArray(json[1])) throw new Error('unexpected country list');
  const out = new Set<string>();
  for (const c of json[1] as { id?: string; region?: { value?: string } }[]) {
    if (!c.id || String(c.region?.value ?? '').trim() === 'Aggregates') continue;
    out.add(ISO_ALIAS[c.id] ?? c.id);
  }
  return out;
}

/** The latest value per country, within `window` years of the newest year any kept country has. */
export function latestByCountry(rows: WbRow[], keep: Set<string>, window: number) {
  const best = new Map<string, WbRow>();
  for (const r of rows) {
    if (!keep.has(r.iso3) || r.value < 0) continue;
    const b = best.get(r.iso3);
    if (!b || r.year > b.year) best.set(r.iso3, r);
  }
  const newest = Math.max(0, ...[...best.values()].map((r) => r.year));
  for (const [iso, r] of best) if (r.year < newest - window) best.delete(iso);
  return { newest: newest || undefined, values: best };
}

/** Assembles the file. Throws when a series covers too few countries or a well-known figure is off by orders of magnitude. */
export function assemble(series: Record<LiveKey, { rows: WbRow[]; lastUpdated?: string; sourceOrganization?: string; name?: string }>, keep: Set<string>, retrieved: string): LiveFile {
  const indicators = {} as Record<LiveKey, LiveIndicator>;
  const values: LiveFile['values'] = {};
  for (const key of LIVE_KEYS) {
    const spec = INDICATORS[key], s = series[key];
    const { newest, values: best } = latestByCountry(s.rows, keep, spec.window);
    if (best.size < spec.min) throw new Error(`${spec.code}: ${best.size} countries, expected at least ${spec.min}`);
    indicators[key] = {
      code: spec.code, ...(s.name ? { name: s.name } : {}), origin: spec.origin, url: indicatorUrl(spec.code),
      ...(s.sourceOrganization ? { sourceOrganization: s.sourceOrganization } : {}),
      ...(s.lastUpdated ? { lastUpdated: s.lastUpdated } : {}), latestYear: newest, countries: best.size,
    };
    for (const [iso, r] of best) (values[iso] ??= {})[key] = [Math.round(r.value * 100) / 100, r.year];
  }
  const v = (iso: string, k: LiveKey) => values[iso]?.[k]?.[0] ?? 0;
  const checks: [string, boolean][] = [
    ['population of China above 1 billion', v('CHN', 'pop') > 1e9],
    ['population of India above 1 billion', v('IND', 'pop') > 1e9],
    ['GDP of the United States above 10 trillion USD', v('USA', 'gdp') > 1e13],
    ['GDP per person of the United States between 30k and 300k USD', v('USA', 'gdpPc') > 3e4 && v('USA', 'gdpPc') < 3e5],
  ];
  for (const [what, ok] of checks) if (!ok) throw new Error(`sanity check failed: ${what}`);
  const sorted = Object.fromEntries(Object.keys(values).sort().map((iso) => [iso, values[iso]!]));
  return { source: 'World Bank Indicators API v2', api: API, retrieved, indicators, values: sorted };
}

/** The file before the first fetch: the series are described, no values yet, so the atlas keeps Natural Earth's figures. */
export function skeleton(): LiveFile {
  const indicators = Object.fromEntries(LIVE_KEYS.map((k) => [k, { code: INDICATORS[k].code, origin: INDICATORS[k].origin, url: indicatorUrl(INDICATORS[k].code) }])) as Record<LiveKey, LiveIndicator>;
  return { source: 'World Bank Indicators API v2', api: API, retrieved: null, indicators, values: {} };
}

// ---- network

async function getJson(url: string, tries = 3): Promise<unknown> {
  let last: unknown;
  for (let i = 0; i < tries; i++) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(60_000), headers: { accept: 'application/json', 'user-agent': 'anatomy-of-conflict-atlas data refresh' } });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch (err) {
      last = err;
      if (i < tries - 1) await new Promise((r) => setTimeout(r, 2000 * 2 ** i));
    }
  }
  throw new Error(`${url}: ${(last as Error)?.message ?? last}`);
}

async function fetchSeries(code: string, from: number, to: number) {
  const rows: WbRow[] = [];
  let lastUpdated: string | undefined;
  for (let page = 1, pages = 1; page <= pages; page++) {
    const p = parseIndicatorPage(await getJson(`${API}country/all/indicator/${code}?format=json&per_page=20000&date=${from}:${to}&page=${page}`));
    pages = p.pages; lastUpdated ??= p.lastUpdated; rows.push(...p.rows);
  }
  let name: string | undefined, sourceOrganization: string | undefined;
  try { // the series' own description of where its numbers come from; informative, so a failure here is not fatal
    const meta = await getJson(`${API}indicator/${code}?format=json`) as [unknown, { name?: string; sourceOrganization?: string }[]];
    name = meta?.[1]?.[0]?.name?.trim() || undefined;
    sourceOrganization = meta?.[1]?.[0]?.sourceOrganization?.replace(/\s+/g, ' ').trim() || undefined;
  } catch (err) { console.warn(`  ${code}: no metadata (${(err as Error).message})`); }
  return { rows, lastUpdated, name, sourceOrganization };
}

async function main() {
  const dataDir = path.resolve(import.meta.dirname, '../public/data');
  const out = path.join(dataDir, 'live/indicators.json');
  if (process.argv.includes('--skeleton')) {
    fs.mkdirSync(path.dirname(out), { recursive: true });
    fs.writeFileSync(out, formatJson(skeleton()));
    console.log(`wrote ${path.relative(process.cwd(), out)} (no values)`);
    return;
  }
  const geo = JSON.parse(fs.readFileSync(path.join(dataDir, 'geo/countries.json'), 'utf8')) as { features: { properties: { iso3: string } }[] };
  const mapped = new Set(geo.features.map((f) => f.properties.iso3));
  let keep = mapped;
  try {
    const economies = parseCountryList(await getJson(`${API}country?format=json&per_page=400`));
    keep = new Set([...mapped].filter((iso) => economies.has(iso)));
  } catch (err) { console.warn(`country list unavailable, keeping every mapped code (${(err as Error).message})`); }

  const year = new Date().getUTCFullYear();
  const series = {} as Parameters<typeof assemble>[0];
  for (const key of LIVE_KEYS) {
    const { code } = INDICATORS[key];
    series[key] = await fetchSeries(code, year - 12, year);
    console.log(`  ${code}: ${series[key].rows.length} rows, updated ${series[key].lastUpdated ?? '?'}`);
  }
  const file = assemble(series, keep, new Date().toISOString().slice(0, 10));
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, formatJson(file));
  for (const k of LIVE_KEYS) console.log(`  ${k}: ${file.indicators[k].countries} countries, newest year ${file.indicators[k].latestYear}`);
  console.log(`wrote ${path.relative(process.cwd(), out)}`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((err) => { console.error(`fetch-indicators failed: ${(err as Error).message}`); process.exit(1); });
}
