// Fetches population, GDP, refugees, internal displacement and battle deaths from the World Bank's open
// Indicators API (no key needed) and writes public/data/live/indicators.json. Run `npm run fetch-indicators`;
// the weekly GitHub workflow (.github/workflows/update-indicators.yml) runs it and commits the result.
//
// Each series keeps its original publisher: UN population estimates, World Bank/OECD national accounts,
// UNHCR and UNRWA refugee statistics, UNHCR/IDMC displacement figures and UCDP battle deaths. For every country
// the file keeps the latest year that has a value, next to the value, so the atlas can show the year and source.
//
// Population and GDP are required: if one of them fails, nothing is written. A humanitarian series that fails
// (the World Bank archives and renames series from time to time) keeps its values from the previous file and the
// run prints a warning, so one retired code never blanks the rest.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { LiveFile, LiveIndicator, LiveKey } from '../src/data/types';
import { formatJson } from './format-json';

const API = 'https://api.worldbank.org/v2/';
// The World Bank spells Kosovo XKX; Natural Earth and the atlas call it KOS.
const ISO_ALIAS: Record<string, string> = { XKX: 'KOS' };

interface Spec {
  /** World Bank series; several are summed per country and year (UNHCR + UNRWA refugees). The first names the link. */
  codes: string[];
  origin: { ar: string; en: string };
  /** How many years behind the series' newest year a country's value may be. */
  window: number;
  /** The fewest countries the series must cover, or the fetch is treated as broken. */
  min: number;
  /** Required series stop the whole refresh when they fail; the others keep their previous values. */
  required?: boolean;
}

// Series checked against the API on 2026-11-03: SM.POP.REFG(.OR) and VC.IDP.TOCV had moved to the WDI archive
// (source 57) and no longer serve data; SM.POP.RHCR.*, SM.POP.RRWA.* and SM.POP.IDPC replace them in WDI.
export const INDICATORS: Record<LiveKey, Spec> = {
  pop: { codes: ['SP.POP.TOTL'], origin: { ar: 'الأمم المتحدة (WPP)', en: 'UN WPP' }, window: 10, min: 180, required: true },
  gdp: { codes: ['NY.GDP.MKTP.CD'], origin: { ar: 'الحسابات القومية', en: 'national accounts' }, window: 10, min: 150, required: true },
  gdpPc: { codes: ['NY.GDP.PCAP.CD'], origin: { ar: 'الحسابات القومية', en: 'national accounts' }, window: 10, min: 150, required: true },
  refOrigin: { codes: ['SM.POP.RHCR.EO', 'SM.POP.RRWA.EO'], origin: { ar: 'المفوضية (UNHCR) والأونروا', en: 'UNHCR and UNRWA' }, window: 2, min: 100 },
  refAsylum: { codes: ['SM.POP.RHCR.EA', 'SM.POP.RRWA.EA'], origin: { ar: 'المفوضية (UNHCR) والأونروا', en: 'UNHCR and UNRWA' }, window: 2, min: 100 },
  idps: { codes: ['SM.POP.IDPC'], origin: { ar: 'المفوضية (UNHCR) ومركز رصد النزوح (IDMC)', en: 'UNHCR and IDMC' }, window: 2, min: 25 },
  // UCDP records no value when a country had no deaths in a conflict above its threshold, so an older value
  // would describe a war that has ended: only the series' newest year counts.
  battleDeaths: { codes: ['VC.BTL.DETH'], origin: { ar: 'برنامج أوبسالا (UCDP)', en: 'UCDP' }, window: 0, min: 10 },
};
export const LIVE_KEYS = Object.keys(INDICATORS) as LiveKey[];

export const indicatorUrl = (code: string) => `https://data.worldbank.org/indicator/${code}`;
const codeOf = (spec: Spec) => spec.codes.join(' + ');

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

/**
 * Sums several series per country and year. A country counts only the parts that report it recently (within
 * `window` years of the newest year), and only the years in which all those parts have a value.
 */
export function combine(parts: WbRow[][], window: number): WbRow[] {
  if (parts.length === 1) return parts[0]!;
  const newest = Math.max(0, ...parts.flat().map((r) => r.year));
  const maps = parts.map((rows) => {
    const m = new Map<string, Map<number, number>>();
    for (const r of rows) {
      let y = m.get(r.iso3);
      if (!y) m.set(r.iso3, (y = new Map()));
      y.set(r.year, r.value);
    }
    return m;
  });
  const out: WbRow[] = [];
  for (const iso of new Set(maps.flatMap((m) => [...m.keys()]))) {
    const present = maps.map((m) => m.get(iso)).filter((y): y is Map<number, number> => !!y && [...y.keys()].some((yr) => yr >= newest - window));
    if (!present.length) continue;
    for (const year of present[0]!.keys()) {
      if (present.every((p) => p.has(year))) out.push({ iso3: iso, year, value: present.reduce((s, p) => s + p.get(year)!, 0) });
    }
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

export type Fetched = { rows: WbRow[]; lastUpdated?: string; sourceOrganization?: string; name?: string } | { error: string };

/**
 * Assembles the file. A required series that failed or covers too few countries, or a well-known figure off by
 * orders of magnitude, throws. Any other failed series keeps its values from `prev` and adds a warning.
 */
export function assemble(series: Record<LiveKey, Fetched>, keep: Set<string>, retrieved: string, prev?: LiveFile | null): { file: LiveFile; warnings: string[] } {
  const indicators = {} as Record<LiveKey, LiveIndicator>;
  const values: LiveFile['values'] = {};
  const warnings: string[] = [];
  for (const key of LIVE_KEYS) {
    const spec = INDICATORS[key], s = series[key], code = codeOf(spec);
    let problem = 'error' in s ? s.error : '';
    let best: Map<string, WbRow> = new Map(), newest: number | undefined;
    if (!('error' in s)) {
      ({ newest, values: best } = latestByCountry(s.rows, keep, spec.window));
      if (best.size < spec.min) problem = `${best.size} countries, expected at least ${spec.min}`;
    }
    if (problem) {
      if (spec.required) throw new Error(`${code}: ${problem}`);
      const kept = prev?.indicators?.[key];
      const old = Object.entries(prev?.values ?? {}).filter(([, v]) => v[key]);
      warnings.push(`${code}: ${problem}; ${old.length ? `kept ${old.length} values from ${prev?.retrieved}` : 'no earlier values to keep'}`);
      indicators[key] = { ...(kept ?? {}), code, origin: spec.origin, url: indicatorUrl(spec.codes[0]!), countries: old.length };
      for (const [iso, v] of old) (values[iso] ??= {})[key] = v[key];
      continue;
    }
    const ok = s as Exclude<Fetched, { error: string }>;
    indicators[key] = {
      code, ...(ok.name ? { name: ok.name } : {}), origin: spec.origin, url: indicatorUrl(spec.codes[0]!),
      ...(ok.sourceOrganization ? { sourceOrganization: ok.sourceOrganization } : {}),
      ...(ok.lastUpdated ? { lastUpdated: ok.lastUpdated } : {}), latestYear: newest, countries: best.size,
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
  return { file: { source: 'World Bank Indicators API v2', api: API, retrieved, indicators, values: sorted }, warnings };
}

/** The file before the first fetch: the series are described, no values yet, so the atlas keeps Natural Earth's figures. */
export function skeleton(): LiveFile {
  const indicators = Object.fromEntries(LIVE_KEYS.map((k) => {
    const spec = INDICATORS[k];
    return [k, { code: codeOf(spec), origin: spec.origin, url: indicatorUrl(spec.codes[0]!) }];
  })) as Record<LiveKey, LiveIndicator>;
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

async function fetchCode(code: string, from: number, to: number) {
  const rows: WbRow[] = [];
  let lastUpdated: string | undefined;
  for (let page = 1, pages = 1; page <= pages; page++) {
    // an API error ("indicator was not found…") is an answer, not a network failure: no point retrying it
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

async function fetchSeries(spec: Spec, from: number, to: number): Promise<Fetched> {
  try {
    const parts = [];
    for (const code of spec.codes) {
      const p = await fetchCode(code, from, to);
      console.log(`  ${code}: ${p.rows.length} rows, updated ${p.lastUpdated ?? '?'}`);
      parts.push(p);
    }
    const uniq = (xs: (string | undefined)[]) => [...new Set(xs.filter(Boolean))].join('; ') || undefined;
    return {
      rows: combine(parts.map((p) => p.rows), spec.window),
      lastUpdated: parts.map((p) => p.lastUpdated).filter(Boolean).sort()[0],
      name: uniq(parts.map((p) => p.name)), sourceOrganization: uniq(parts.map((p) => p.sourceOrganization)),
    };
  } catch (err) {
    return { error: (err as Error).message };
  }
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
  const prev = fs.existsSync(out) ? JSON.parse(fs.readFileSync(out, 'utf8')) as LiveFile : null;
  const geo = JSON.parse(fs.readFileSync(path.join(dataDir, 'geo/countries.json'), 'utf8')) as { features: { properties: { iso3: string } }[] };
  const mapped = new Set(geo.features.map((f) => f.properties.iso3));
  let keep = mapped;
  try {
    const economies = parseCountryList(await getJson(`${API}country?format=json&per_page=400`));
    keep = new Set([...mapped].filter((iso) => economies.has(iso)));
  } catch (err) { console.warn(`country list unavailable, keeping every mapped code (${(err as Error).message})`); }

  const year = new Date().getUTCFullYear();
  const series = {} as Record<LiveKey, Fetched>;
  for (const key of LIVE_KEYS) series[key] = await fetchSeries(INDICATORS[key], year - 12, year);
  const { file, warnings } = assemble(series, keep, new Date().toISOString().slice(0, 10), prev);
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, formatJson(file));
  for (const k of LIVE_KEYS) console.log(`  ${k}: ${file.indicators[k].countries} countries, newest year ${file.indicators[k].latestYear ?? '—'}`);
  // GitHub shows ::warning:: lines on the run's summary page
  for (const w of warnings) console.log(`::warning title=Open-data series not refreshed::${w}`);
  console.log(`wrote ${path.relative(process.cwd(), out)}`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((err) => { console.error(`fetch-indicators failed: ${(err as Error).message}`); process.exit(1); });
}
