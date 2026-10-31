import { render } from '@testing-library/react';
import { afterEach, beforeAll, expect, test, vi } from 'vitest';
import { atlas } from '../src/app/store';
import { DbContext } from '../src/app/useT';
import { build } from '../src/data/build';
import type { DB } from '../src/data/types';
import '../src/i18n/core';
import { readRaw } from './helpers/readRaw';

// A dossier that crashes while rendering, as a malformed record could.
vi.mock('../src/features/dossier', () => ({ Dossier: () => { throw new Error('bad record'); } }));
// jsdom has no canvas: keep the map out of this page-level test.
vi.mock('../src/features/map', () => ({ MapStage: () => <div id="map" /> }));

let db: DB;
beforeAll(() => { db = build(readRaw()); });
afterEach(() => { atlas.reset(); vi.restoreAllMocks(); });

test('one area crashing leaves the rest of the page on screen', async () => {
  vi.spyOn(console, 'error').mockImplementation(() => {});
  const { Layout } = await import('../src/features/layout/Layout');
  render(<DbContext.Provider value={db}><Layout /></DbContext.Provider>);
  expect(document.querySelector('#topbar [data-k="search"]')).not.toBeNull();
  expect(document.querySelectorAll('#lensrail button').length).toBeGreaterThan(0);
  expect(document.getElementById('dossier')).toHaveAttribute('hidden');
});
