import { beforeAll, describe, expect, test } from 'vitest';
import { build } from '../src/data/build';
import type { DB, RawData } from '../src/data/types';
import { readRaw } from './helpers/readRaw';

let raw: RawData;
let db: DB;
beforeAll(() => { raw = readRaw(); db = build(raw); });

describe('build() matches the legacy model', () => {
  test('stats', () => expect(db.stats).toEqual({
    countries: 242, conflicts: 40, groups: 41, religionCountries: 75, edges: 160,
    blocs: 11, events: 86, chokepoints: 11, sites: 24, disputed: 99,
  }));

  test('Saudi Arabia links', () => {
    const sau = db.countries.get('SAU')!;
    expect(sau.conflicts).toEqual(['yemen', 'gulf-security']);
    expect(sau.blocs).toEqual(['gcc', 'brics', 'arab-league', 'mecca', 'mnna']);
    expect(sau.edges).toHaveLength(7);
    expect(sau.religion?.majority).toBe('sunni');
    expect(sau.religion?.majorityFamily).toBe('islam');
    expect(sau.neighbors).toEqual(['BHR', 'QAT', 'KWT', 'YEM', 'ARE', 'IRQ']);
    expect(Math.round(sau.areaKm2)).toBe(1925857);
  });

  test('Arabic search finds Saudi Arabia first', () => {
    expect(db.search('السعوديه', 5)[0]).toMatchObject({ kind: 'country', id: 'SAU' });
  });

  test('Kosovo resolves through the XKX alias', () => expect(db.get('country', 'KOS')).toBeTruthy());

  test('the Spratlys get the corrected Arabic name', () => {
    const i = db.disputed.findIndex((d) => d.nameEn === 'Spratly Is.');
    expect(i).toBeGreaterThanOrEqual(0);
    expect(db.nameOf('disputed', String(i), 'ar')).toBe('جزر سبراتلي');
  });

  test('a conflict has a map anchor', () => expect(db.anchorOf('conflict', 'sudan')).toHaveLength(2));

  test('unknown ids are handled', () => {
    expect(db.exists('country', 'XXX')).toBe(false);
    expect(db.nameOf('country', 'XXX', 'en')).toBe('XXX');
    expect(db.countriesOf('bloc', 'nope')).toEqual([]);
  });

  test('build does not mutate its input', () => {
    const fresh = readRaw();
    build(fresh);
    expect(JSON.stringify(fresh.relations)).toBe(JSON.stringify(readRaw().relations));
  });
});
