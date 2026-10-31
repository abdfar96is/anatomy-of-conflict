import { beforeAll, describe, expect, test } from 'vitest';
import { build } from '../src/data/build';
import type { Conflict, DB, Site } from '../src/data/types';
import { readRaw } from './helpers/readRaw';

let db: DB;
beforeAll(() => { db = build(readRaw()); });

describe('curated data carries the corrections (D4)', () => {
  test('19 corrections with unique ids', () => {
    expect(db.corrections).toHaveLength(19);
    expect(new Set(db.corrections.map((c) => c.id)).size).toBe(19);
  });
  test('Shebaa Farms wording', () => {
    const c = db.get('conflict', 'lebanon-israel') as Conflict & { territorialClaims: { en: string } };
    expect(c.territorialClaims.en).toContain('has held the Shebaa Farms since 1967');
  });
  test('Indonesia is in BRICS', () => expect(db.relations.blocById.get('brics')?.members).toContain('IDN'));
  test('Hpakant is a jade site', () => {
    const s = db.resources.sites.find((x: Site) => /Hpakant/.test(x.en));
    expect(s?.type).toBe('jade');
  });
});

describe('unverified flags live on the records', () => {
  test.each([['conflict', 'sudan'], ['choke', 'hormuz'], ['event', 'iran-war-2026'], ['country', 'SYR']] as const)('%s %s is unverified', (kind, id) => {
    expect(db.isUnverified(kind, id)).toBe(true);
  });
  test('a settled record is not flagged', () => expect(db.isUnverified('conflict', 'northern-ireland')).toBe(false));
});
