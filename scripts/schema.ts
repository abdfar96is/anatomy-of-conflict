// Shapes of the curated data files, for check-data. Lives in scripts/ so zod never ships to the browser.
// Only the fields the app relies on are checked; any other field is allowed.

import { z } from 'zod';
import { NUCLEAR_CIVIL, NUCLEAR_NPT, NUCLEAR_STATUS, SEVERITY } from '../src/config';

const bi = z.object({ ar: z.string(), en: z.string() });
const id = z.string().min(1);
const iso = z.string().regex(/^[A-Z]{3}$/, 'expected a three-letter ISO code');
const lonLat = z.tuple([z.number().min(-180).max(180), z.number().min(-90).max(90)]);
const date = z.string().regex(/^\d{4}(-\d{2}(-\d{2})?)?$/, 'expected YYYY, YYYY-MM or YYYY-MM-DD');
const day = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'expected YYYY-MM-DD');
const url = z.string().regex(/^https:\/\/[^\s]+$/, 'expected an https:// link');
/** Optional provenance on relations, blocs, resource records and sites. */
const provenance = { since: date.optional(), verified: day.optional(), sources: z.array(url).min(1).optional() };

export const conflictFile = z.looseObject({
  region: id,
  regionName: bi,
  conflicts: z.array(z.looseObject({
    id, name: bi, countries: z.array(iso), severity: z.enum(SEVERITY.map((s) => s.id) as [string, ...string[]]),
    externalPowers: z.array(z.looseObject({ iso3: iso })).optional(),
    sourceRefs: z.array(id).optional(),
    unverified: z.boolean().optional(),
  })),
});

const LIVE_KEYS = ['pop', 'gdp', 'gdpPc', 'refOrigin', 'refAsylum', 'idps', 'battleDeaths'] as const;
const liveKey = z.enum(LIVE_KEYS);
/** public/data/live/indicators.json, written by scripts/fetch-indicators.ts. Every series is described; values may be empty. */
export const liveFile = z.object({
  source: z.string(),
  api: url,
  retrieved: day.nullable(),
  indicators: z.object(Object.fromEntries(LIVE_KEYS.map((k) => [k, z.object({
    code: z.string().regex(/^[A-Z0-9.]+( \+ [A-Z0-9.]+)*$/, 'expected series codes joined by " + "'), name: z.string().optional(), origin: bi, url, sourceOrganization: z.string().optional(),
    lastUpdated: day.optional(), latestYear: z.number().int().optional(), countries: z.number().int().min(0).optional(),
  })])) as unknown as Record<(typeof LIVE_KEYS)[number], z.ZodType>),
  values: z.record(iso, z.partialRecord(liveKey, z.tuple([z.number().min(0), z.number().int().min(1960)]))),
});

export const SCHEMAS: Record<string, z.ZodType> = {
  'chokepoints.json': z.looseObject({
    points: z.array(z.looseObject({
      id, ar: z.string(), en: z.string(), borderStates: z.array(iso).optional(), conflictIds: z.array(id).optional(),
      unverified: z.boolean().optional(),
    })),
  }),
  'country_intel.json': z.looseObject({
    countries: z.record(iso, z.looseObject({ blocs: z.array(id).optional(), unverified: z.boolean().optional() })),
  }),
  'ethnic_groups.json': z.looseObject({
    type: z.literal('FeatureCollection'),
    features: z.array(z.looseObject({
      properties: z.looseObject({ groupId: id, nameAr: z.string(), nameEn: z.string(), family: id, countries: z.array(iso).optional() }),
    })),
  }),
  'relations.json': z.looseObject({
    edgeTypes: z.array(z.looseObject({ id })),
    blocs: z.array(z.looseObject({ id, ar: z.string(), en: z.string(), members: z.array(iso), ...provenance })),
    edges: z.array(z.looseObject({ a: iso, b: iso, type: id, kind: z.enum(['treaty', 'assessed']), ...provenance })),
    bilateral: z.record(z.string(), z.unknown()),
  }),
  'religions.json': z.looseObject({
    traditions: z.array(z.looseObject({ id, ar: z.string(), en: z.string() })),
    countries: z.record(iso, z.looseObject({ groups: z.record(id, z.number().min(0).max(100)) })),
  }),
  'resources.json': z.looseObject({
    types: z.array(z.looseObject({ id, ar: z.string(), en: z.string() })),
    entries: z.array(z.looseObject({ iso3: iso, type: id, conflictIds: z.array(id).optional(), ...provenance })),
    sites: z.array(z.looseObject({ id, iso3: iso, type: id, ar: z.string(), en: z.string(), ...provenance })),
  }),
  'sources.json': z.looseObject({
    datasets: z.array(z.looseObject({ id })),
    references: z.array(z.looseObject({ id })),
  }),
  'timeline.json': z.looseObject({
    categories: z.array(z.looseObject({ id })),
    events: z.array(z.looseObject({
      id, date, ar: z.string(), en: z.string(), countries: z.array(iso).optional(), coords: lonLat, conflictIds: z.array(id).optional(),
      unverified: z.boolean().optional(),
    })),
  }),
  'corrections.json': z.array(z.object({ id, where: bi, what: bi })),
  'nuclear.json': z.looseObject({
    note: bi.optional(), zonesNote: bi.optional(),
    warheads: z.looseObject({ year: z.number().int(), metric: bi, publisher: z.string(), sources: z.array(url).min(1), verified: day.optional(), values: z.record(iso, z.number().int().min(0)) }),
    countries: z.record(iso, z.looseObject({
      weapons: z.enum(Object.keys(NUCLEAR_STATUS) as [string, ...string[]]).optional(),
      host: iso.optional(),
      civil: z.enum(Object.keys(NUCLEAR_CIVIL) as [string, ...string[]]).optional(),
      npt: z.enum(Object.keys(NUCLEAR_NPT) as [string, ...string[]]).optional(),
      note: bi.optional(), ...provenance,
    })),
    zones: z.array(z.looseObject({ id, ar: z.string(), en: z.string(), treaty: bi, year: z.number().int(), members: z.array(iso).min(1), sources: z.array(url).min(1) })),
  }),
  'figure_notes.json': z.looseObject({
    note: bi.optional(),
    countries: z.record(iso, z.partialRecord(liveKey, z.object({ ar: z.string().min(1), en: z.string().min(1), sources: z.array(url).min(1), verified: day }))),
  }),
};
