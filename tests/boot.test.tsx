import fs from 'node:fs';
import path from 'node:path';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, test, vi } from 'vitest';
import { Boot } from '../src/features/boot/Boot';
import { atlas } from '../src/app/store';
import { DATA_DIR } from './helpers/readRaw';

const fromDisk = async (url: string) => ({
  ok: true, status: 200,
  json: async () => JSON.parse(fs.readFileSync(path.join(DATA_DIR, url.replace(/^.*?data\//, '')), 'utf8')),
});

afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks(); atlas.reset(); history.replaceState(null, '', '#'); });

describe('Boot', () => {
  test('shows the app once the data is loaded, in Arabic RTL', async () => {
    vi.stubGlobal('fetch', vi.fn(fromDisk));
    render(<Boot><p>atlas ready</p></Boot>);
    expect(await screen.findByText('atlas ready')).toBeInTheDocument();
    expect(document.documentElement.dir).toBe('rtl');
    expect(document.documentElement.lang).toBe('ar');
  });

  test('fills the timeline category filter with every category once loaded', async () => {
    vi.stubGlobal('fetch', vi.fn(fromDisk));
    render(<Boot><p>atlas ready</p></Boot>);
    await screen.findByText('atlas ready');
    const cats = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'curated/timeline.json'), 'utf8')).categories.map((c: { id: string }) => c.id);
    // Boot fills the filter in an effect, which React may run just after the children appear
    await waitFor(() => expect([...(atlas.get().filters.timelineCats ?? [])]).toEqual(cats));
  });

  test('switching to English flips direction and title', async () => {
    vi.stubGlobal('fetch', vi.fn(fromDisk));
    render(<Boot><p>atlas ready</p></Boot>);
    await screen.findByText('atlas ready');
    act(() => { atlas.set({ lang: 'en' }); });
    expect(document.documentElement.dir).toBe('ltr');
    expect(document.title).toBe('Anatomy of Conflict');
  });

  test('a failed file shows the error and Retry loads again without a page reload', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    let first = true;
    vi.stubGlobal('fetch', vi.fn(async (url: string) => {
      if (first && url.endsWith('timeline.json')) { first = false; return { ok: false, status: 404, json: async () => ({}) }; }
      return fromDisk(url);
    }));
    render(<Boot><p>atlas ready</p></Boot>);
    expect(await screen.findByText(/تعذّر تحميل بيانات الأطلس/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'أعد المحاولة' }));
    await waitFor(() => expect(screen.getByText('atlas ready')).toBeInTheDocument());
  });
});
