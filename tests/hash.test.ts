import { afterEach, beforeAll, describe, expect, test } from 'vitest';
import { atlas, initialState, type AtlasState } from '../src/app/store';
import { hashToken, parseHash, startHashSync } from '../src/app/hash';
import { build } from '../src/data/build';
import type { DB, Kind } from '../src/data/types';
import { readRaw } from './helpers/readRaw';

let db: DB;
beforeAll(() => { db = build(readRaw()); });
afterEach(() => { atlas.reset(); history.replaceState(null, '', '#'); });

const state = (patch: Partial<AtlasState>): AtlasState => ({ ...initialState(), ...patch });

describe('share-link tokens round-trip', () => {
  test.each([
    ['country', 'SAU'], ['conflict', 'gulf-security'], ['group', 'kurds'], ['religion', 'sunni'], ['choke', 'hormuz'],
    ['disputed', '0'], ['event', 'halabja'], ['bloc', 'gcc'],
  ] as [Kind, string][])('%s-%s', (kind, id) => {
    const token = hashToken(state({ selection: { kind, id } }));
    expect(token).toBe(`${kind}-${id}`);
    expect(parseHash(token, db)?.patch).toEqual({ selection: { kind, id }, view: null });
  });
  test('site (first site id)', () => {
    const id = db.resources.sites[0]!.id;
    expect(parseHash(`site-${id}`, db)?.patch?.selection).toEqual({ kind: 'site', id });
  });
  test('lens', () => {
    expect(hashToken(state({ lens: 'religion' }))).toBe('lens-religion');
    expect(parseHash('lens-religion', db)?.patch).toEqual({ lens: 'religion', view: null, selection: null });
  });
  test('view', () => {
    expect(hashToken(state({ view: 'network' }))).toBe('view-network');
    expect(parseHash('view-network', db)?.patch).toEqual({ view: 'network' });
  });
  test('compare', () => {
    expect(hashToken(state({ view: 'compare', compare: ['SAU', 'IRN'] }))).toBe('compare-SAU-IRN');
    expect(parseHash('compare-SAU-IRN', db)?.patch).toEqual({ view: 'compare', compare: ['SAU', 'IRN'] });
  });
  test('tour', () => {
    expect(hashToken(state({ tour: { id: 'energy', step: 0 } }))).toBe('tour-energy');
    expect(parseHash('tour-energy', db)).toEqual({ tour: 'energy' });
  });
});

describe('bad links are ignored', () => {
  test.each(['country-', 'compare-USA', 'compare-USA-XXX', 'lens-nope', 'nothing', ''])('%s', (token) => {
    expect(parseHash(token, db)).toBeNull();
  });
  test('a malformed escape does not throw and leaves state alone', () => {
    history.replaceState(null, '', '#%E0%A4%A');
    const before = atlas.get();
    const stop = startHashSync(db);
    expect(atlas.get()).toEqual(before);
    stop();
  });
  test('a valid link at start selects the record and the hash follows state', () => {
    history.replaceState(null, '', '#country-SAU');
    const stop = startHashSync(db);
    expect(atlas.get().selection).toEqual({ kind: 'country', id: 'SAU' });
    atlas.set({ selection: { kind: 'conflict', id: 'sudan' } });
    expect(location.hash).toBe('#conflict-sudan');
    stop();
  });
});
