import { act, fireEvent, render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, beforeAll, describe, expect, test, vi } from 'vitest';
import { atlas } from '../src/app/store';
import { DbContext } from '../src/app/useT';
import { build } from '../src/data/build';
import type { DB } from '../src/data/types';
import { Legend } from '../src/features/map/Legend';
import { MapControls } from '../src/features/map/MapControls';
import '../src/i18n/core';
import { readRaw } from './helpers/readRaw';

let db: DB;
beforeAll(() => { db = build(readRaw()); });
afterEach(() => { atlas.reset(); localStorage.clear(); });

const withDb = (ui: ReactNode) => render(<DbContext.Provider value={db}>{ui}</DbContext.Provider>);
const title = () => document.querySelector('#legend .lc-title')?.textContent;

describe('Legend', () => {
  test('on the religion lens, a mode chip sets filters.religionMode', () => {
    atlas.set({ lens: 'religion' });
    withDb(<Legend />);
    const share = screen.getByRole('button', { name: 'حصة ديانة' });
    expect(share).toHaveAttribute('aria-pressed', 'false');
    fireEvent.click(share);
    expect(atlas.get().filters.religionMode).toBe('share');
    expect(share).toHaveAttribute('aria-pressed', 'true');
    // share mode adds the tradition picker
    fireEvent.change(document.querySelector('select.lc-select')!, { target: { value: 'catholic' } });
    expect(atlas.get().filters.religionTradition).toBe('catholic');
  });

  test('the title follows the lens in Arabic and English', () => {
    atlas.set({ lens: 'religion' });
    withDb(<Legend />);
    expect(title()).toBe('التوزيع الديني');
    expect(document.getElementById('legend')).toHaveAttribute('data-lens', 'religion');
    act(() => { atlas.set({ lens: 'conflicts' }); });
    expect(title()).toBe('النزاعات ونقاط الاشتعال');
    act(() => { atlas.set({ lang: 'en' }); });
    expect(title()).toBe('Conflicts & flashpoints');
    act(() => { atlas.set({ lens: 'religion' }); });
    expect(title()).toBe('Religion');
    expect(document.getElementById('legend')).toHaveAttribute('aria-label', 'Map key: Religion');
  });

  test('the header collapses and expands the card body', () => {
    withDb(<Legend />);
    const head = document.querySelector<HTMLButtonElement>('#legend .lc-head')!;
    expect(head).toHaveAttribute('aria-expanded', 'true');
    fireEvent.click(head);
    expect(head).toHaveAttribute('aria-expanded', 'false');
    expect(document.getElementById('lc-body')).toHaveAttribute('hidden');
    expect(document.getElementById('legend')).toHaveClass('collapsed');
  });

  test('conflict severity chips toggle the severity filter', () => {
    atlas.set({ lens: 'conflicts' });
    withDb(<Legend />);
    fireEvent.click(screen.getByRole('button', { name: /حرب نشطة/ }));
    expect(atlas.get().filters.severity.has('war')).toBe(false);
  });

  test('a section label folds its section, and the choice outlives the card', () => {
    atlas.set({ lens: 'conflicts' });
    const { unmount } = withDb(<Legend />);
    const fold = () => document.querySelector<HTMLButtonElement>('#legend [data-fold="map.cf.sev"] [data-act="fold"]')!;
    const chips = () => document.querySelector('#legend [data-fold="map.cf.sev"] .lc-sec-b')!;
    expect(fold()).toHaveAttribute('aria-expanded', 'true');
    expect(chips()).not.toHaveAttribute('hidden');
    fireEvent.click(fold());
    expect(fold()).toHaveAttribute('aria-expanded', 'false');
    expect(chips()).toHaveAttribute('hidden');
    unmount();
    withDb(<Legend />);
    expect(fold()).toHaveAttribute('aria-expanded', 'false');
    fireEvent.click(fold());
    expect(chips()).not.toHaveAttribute('hidden');
  });

  test('source and coverage notes sit folded under "About the data", with a link to every source', () => {
    atlas.set({ lens: 'religion' });
    withDb(<Legend />);
    const about = document.querySelector<HTMLDetailsElement>('#legend details.lc-about')!;
    expect(about).not.toBeNull();
    expect(about.open).toBe(false);
    expect(about.querySelector('summary')).toHaveTextContent('عن البيانات');
    expect(about.querySelectorAll('.lc-note').length).toBeGreaterThan(0);
    // nothing about the data outside it
    expect(document.querySelectorAll('#legend .lc-key > .lc-note').length).toBe(0);
    fireEvent.click(about.querySelector('[data-act="sources"]')!);
    expect(atlas.get().view).toBe('sources');
  });

  test('on a narrow screen the card is a sheet: dragging the header settles it at full height, or closes it', () => {
    vi.stubGlobal('matchMedia', (q: string) => ({ matches: q.includes('max-width: 760px'), media: q, addEventListener() {}, removeEventListener() {} }));
    try {
      atlas.set({ lens: 'conflicts' });
      withDb(<Legend />);
      const card = document.getElementById('legend')!;
      const head = card.querySelector<HTMLButtonElement>('.lc-head')!;
      // narrow screens start closed; a tap opens it at half height
      expect(card).toHaveClass('collapsed');
      expect(card.querySelector('.lc-grip')).not.toBeNull();
      fireEvent.click(head);
      expect(card).toHaveClass('sheet-half');
      const dragBy = (dy: number) => {
        fireEvent.pointerDown(head, { clientY: 500, button: 0, pointerId: 1 });
        fireEvent.pointerMove(head, { clientY: 500 - dy / 2, pointerId: 1 });
        fireEvent.pointerMove(head, { clientY: 500 - dy, pointerId: 1 });
        fireEvent.pointerUp(head, { clientY: 500 - dy, pointerId: 1 });
        fireEvent.click(head);
      };
      // jsdom has no layout: the card measures 0 high, so a drag ends at whatever height it moved by
      Object.defineProperty(card, 'offsetParent', { configurable: true, get: () => ({ clientHeight: 600 }) });
      Object.defineProperty(head, 'offsetHeight', { configurable: true, get: () => 50 });
      card.getBoundingClientRect = () => ({ height: parseFloat(card.style.height) || 260 }) as DOMRect;
      dragBy(400);
      expect(card).toHaveClass('sheet-full');
      expect(card.style.height).toBe('');
      dragBy(-600);
      expect(card).toHaveClass('collapsed');
      expect(head).toHaveAttribute('aria-expanded', 'false');
    } finally {
      vi.unstubAllGlobals();
    }
  });
});

describe('MapControls', () => {
  test('zoom and reset call the engine; the projection button switches projection', () => {
    const api = { zoom: vi.fn(), reset: vi.fn() };
    render(<MapControls api={api} />);
    fireEvent.click(screen.getByRole('button', { name: 'تكبير' }));
    fireEvent.click(screen.getByRole('button', { name: 'تصغير' }));
    fireEvent.click(screen.getByRole('button', { name: 'إعادة ضبط العرض' }));
    expect(api.zoom.mock.calls).toEqual([[1.6], [1 / 1.6]]);
    expect(api.reset).toHaveBeenCalledOnce();
    fireEvent.click(screen.getByRole('button', { name: 'التبديل إلى خريطة مسطّحة' }));
    expect(atlas.get().projection).toBe('flat');
    expect(screen.getByRole('button', { name: 'التبديل إلى الكرة الأرضية' })).toBeInTheDocument();
  });

  test('the layers popover toggles layers and closes on Escape', () => {
    render(<MapControls api={{ zoom: vi.fn(), reset: vi.fn() }} />);
    const btn = screen.getByRole('button', { name: 'الطبقات' });
    const pop = document.getElementById('mapctl-layers')!;
    expect(pop).toHaveAttribute('hidden');
    fireEvent.click(btn);
    expect(pop).not.toHaveAttribute('hidden');
    expect(btn).toHaveAttribute('aria-expanded', 'true');
    fireEvent.click(screen.getByRole('checkbox', { name: 'خطوط الطول والعرض' }));
    expect(atlas.get().layers.graticule).toBe(false);
    fireEvent.keyDown(pop, { key: 'Escape' });
    expect(pop).toHaveAttribute('hidden');
    expect(document.activeElement).toBe(btn);
  });
});
