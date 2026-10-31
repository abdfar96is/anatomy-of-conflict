import { act, cleanup, fireEvent, render, waitFor } from '@testing-library/react';
import { afterEach, beforeAll, describe, expect, test, vi } from 'vitest';
import { atlas } from '../src/app/store';
import { DbContext } from '../src/app/useT';
import { VIEWS, type ViewId } from '../src/config';
import { build } from '../src/data/build';
import type { DB } from '../src/data/types';
import { ViewPanel } from '../src/features/views';
import '../src/i18n/core';
import { readRaw } from './helpers/readRaw';

let db: DB;
beforeAll(() => { db = build(readRaw()); });
// Unmount first so resetting the store does not re-render a mounted panel outside act().
afterEach(() => { cleanup(); atlas.reset(); vi.unstubAllGlobals(); });

/** The panel inside #stage as Layout mounts it, with a focusable opener outside and the global tooltip. */
function renderPanel() {
  return render(
    <DbContext.Provider value={db}>
      <button id="opener" type="button">open</button>
      <main id="stage"><ViewPanel /></main>
      <div id="tooltip" role="tooltip" hidden />
    </DbContext.Provider>,
  );
}

const q = <T extends Element = HTMLElement>(sel: string) => document.querySelector<T>(sel);
const qa = (sel: string) => [...document.querySelectorAll<HTMLElement>(sel)];
const panel = () => q<HTMLElement>('#viewpanel')!;
const open = (id: ViewId) => act(() => { atlas.openView(id); });
const viewName = (id: ViewId, lang: 'ar' | 'en' = 'ar') => VIEWS.find((v) => v.id === id)![lang];
const country = (iso: string, lang: 'ar' | 'en' = 'ar') => db.nameOf('country', iso, lang);

/** Every media query matches: a phone with reduced motion. */
const phone = () => vi.stubGlobal('matchMedia', (media: string) => ({
  matches: true, media, onchange: null,
  addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {}, dispatchEvent: () => false,
}));

describe('view host', () => {
  test('is hidden until a view is set', () => {
    renderPanel();
    expect(panel()).toHaveAttribute('hidden');
    expect(q('#viewpanel .vp-card')).toHaveAttribute('role', 'dialog');
    expect(q('#viewpanel .vp-card')).toHaveAttribute('aria-labelledby', 'vp-title');
  });

  test.each(['network', 'compare', 'sources'] as const)('opening %s renders its title, subtitle and close button', (id) => {
    renderPanel();
    open(id);
    expect(panel()).not.toHaveAttribute('hidden');
    expect(panel()).toHaveAttribute('data-view', id);
    expect(panel()).toHaveClass('is-open');
    expect(q('#vp-title')).toHaveTextContent(viewName(id));
    expect(q('#vp-title')).toHaveAttribute('tabindex', '-1');
    expect(q('.vp-sub')?.textContent).toBeTruthy();
    expect(q('.vp-close')).toHaveAttribute('aria-label', 'إغلاق');
    expect(document.activeElement).toBe(q('#vp-title'));
  });

  test('the network subtitle counts the ties', () => {
    renderPanel();
    open('network');
    expect(q('.vp-sub')).toHaveTextContent(`— ${db.relations.edges.length} علاقة`);
  });

  test('the timeline view gets the host frame', () => {
    renderPanel();
    open('timeline');
    expect(panel()).toHaveAttribute('data-view', 'timeline');
    expect(q('#vp-title')).toHaveTextContent(viewName('timeline'));
  });

  test('switching language re-renders the open view in place', () => {
    renderPanel();
    open('sources');
    act(() => { atlas.set({ lang: 'en' }); });
    expect(q('#vp-title')).toHaveTextContent(viewName('sources', 'en'));
    expect(q('#src-ds-h')).toHaveTextContent('Datasets');
    expect(q('.vp-close')).toHaveAttribute('aria-label', 'Close');
  });

  test('closing returns focus to the element that opened it, then hides the panel', async () => {
    renderPanel();
    q('#opener')!.focus();
    open('network');
    expect(document.activeElement).toBe(q('#vp-title'));
    fireEvent.click(q('.vp-close')!);
    expect(atlas.get().view).toBe(null);
    expect(document.activeElement).toBe(q('#opener'));
    expect(panel()).not.toHaveClass('is-open');
    await waitFor(() => expect(panel()).toHaveAttribute('hidden'));
    expect(panel()).not.toHaveAttribute('data-view');
  });

  test('the scrim closes the view', () => {
    renderPanel();
    open('sources');
    fireEvent.click(q('.vp-scrim')!);
    expect(atlas.get().view).toBe(null);
  });

  test('on a phone, selecting a record while a view is open closes the view', async () => {
    phone();
    renderPanel();
    open('network');
    act(() => { atlas.select('country', 'SAU'); });
    expect(atlas.get().view).toBe(null);
    expect(atlas.get().selection).toEqual({ kind: 'country', id: 'SAU' });
    await waitFor(() => expect(panel()).toHaveAttribute('hidden'));
  });
});

describe('network', () => {
  test('lists every tie, strongest first, with filter chips for each type, kind and bloc', () => {
    renderPanel();
    open('network');
    const n = db.relations.edges.length;
    expect(qa('.net-li')).toHaveLength(n);
    expect(q('#nw-list-h .n')).toHaveTextContent(String(n));
    expect(qa('[data-g=type] .chip')).toHaveLength(db.relations.edgeTypes.length);
    expect(qa('[data-g=kind] .chip')).toHaveLength(2);
    expect(qa('[data-g=bloc] .chip')).toHaveLength(db.relations.blocs.length);
    const weights = qa('.net-li').map((li) => db.edgeById.get(li.dataset.edge!)!.weight as number);
    expect(weights).toEqual([...weights].sort((a, b) => b - a));
    expect(q('.net-svg')).toHaveAttribute('aria-label', expect.stringContaining(String(n)));
    expect(qa('.net-svg .net-n')).toHaveLength(new Set(db.relations.edges.flatMap((e) => [e.a, e.b])).size);
  });

  test('turning a type off drops its ties from the list and the graph', () => {
    renderPanel();
    open('network');
    const rivalry = db.relations.edges.filter((e) => e.type === 'rivalry').length;
    fireEvent.click(q('[data-g=type] [data-type="rivalry"]')!);
    expect(atlas.get().filters.relTypes.has('rivalry')).toBe(false);
    expect(q('[data-g=type] [data-type="rivalry"]')).toHaveAttribute('aria-pressed', 'false');
    expect(qa('.net-li')).toHaveLength(db.relations.edges.length - rivalry);
    expect(qa('.net-svg .net-e.is-off')).toHaveLength(rivalry);
  });

  test('no ties left shows the empty line', () => {
    renderPanel();
    open('network');
    fireEvent.click(q('[data-g=kind] [data-kind="treaty"]')!);
    fireEvent.click(q('[data-g=kind] [data-kind="assessed"]')!);
    expect(qa('.net-li')).toHaveLength(0);
    expect(q('.net-list .empty')).toHaveTextContent('لا روابط تطابق الفلاتر الحالية.');
  });

  test('a bloc chip outlines the bloc and the caption counts its members', () => {
    renderPanel();
    open('network');
    expect(q('.net-caption')).toHaveAttribute('hidden');
    fireEvent.click(q('[data-g=bloc] [data-bloc="nato"]')!);
    expect(atlas.get().filters.bloc).toBe('nato');
    expect(q('.net-caption')).not.toHaveAttribute('hidden');
    expect(q('.net-caption')).toHaveTextContent('حلف شمال الأطلسي');
    expect(qa('.net-svg .net-n.is-member').length).toBeGreaterThan(0);
    fireEvent.click(q('[data-g=bloc] [data-bloc="nato"]')!);
    expect(atlas.get().filters.bloc).toBe(null);
  });

  test('a row opens its details; their buttons select a state or compare the pair', () => {
    renderPanel();
    open('network');
    const li = qa('.net-li')[0]!;
    const e = db.edgeById.get(li.dataset.edge!)!;
    fireEvent.click(li.querySelector('.net-row')!);
    expect(li.querySelector('.net-row')).toHaveAttribute('aria-expanded', 'true');
    expect(li).toHaveClass('is-open');
    expect(li.querySelector('.net-more')).not.toHaveAttribute('hidden');
    fireEvent.click(li.querySelector(`[data-sel="${e.b}"]`)!);
    expect(atlas.get().selection).toEqual({ kind: 'country', id: e.b });
    fireEvent.click(li.querySelector('[data-cmp]')!);
    expect(atlas.get().view).toBe('compare');
    expect(atlas.get().compare).toEqual([e.a, e.b]);
  });

  test('a selected state outside the network is named in the caption', () => {
    renderPanel();
    open('network');
    const iso = [...db.countries.keys()].find((k) => !db.countries.get(k)!.edges.length)!;
    act(() => { atlas.select('country', iso, { fly: false }); });
    expect(q('.net-caption')).toHaveTextContent(country(iso));
  });
});

describe('compare', () => {
  test('SAU and IRN: both names head the comparison', () => {
    renderPanel();
    act(() => { atlas.set({ view: 'compare', compare: ['SAU', 'IRN'] }); });
    const names = qa('.cmp-name-t').map((n) => n.textContent);
    expect(names).toEqual([country('SAU'), country('IRN')]);
    expect(q<HTMLInputElement>('#cmp-in-0')!.value).toBe(country('SAU'));
    expect(q<HTMLInputElement>('#cmp-in-1')!.value).toBe(country('IRN'));
    expect(qa('.cmp-fig')).toHaveLength(5);
    expect(qa('.cmp-sec h3').map((h) => h.textContent)).toContain('العلاقة المباشرة');
  });

  test('opening without a valid pair picks the default pair', () => {
    renderPanel();
    open('compare');
    expect(atlas.get().compare).toEqual(['USA', 'CHN']);
    expect(qa('.cmp-name-t').map((n) => n.textContent)).toEqual([country('USA'), country('CHN')]);
  });

  test('the swap button swaps the two states', () => {
    renderPanel();
    act(() => { atlas.set({ view: 'compare', compare: ['SAU', 'IRN'] }); });
    fireEvent.click(q('.cmp-swap')!);
    expect(atlas.get().compare).toEqual(['IRN', 'SAU']);
    expect(q<HTMLInputElement>('#cmp-in-0')!.value).toBe(country('IRN'));
  });

  test('the picker searches states and Enter chooses the active option', () => {
    renderPanel();
    act(() => { atlas.set({ view: 'compare', compare: ['SAU', 'IRN'], lang: 'en' }); });
    const input = q<HTMLInputElement>('#cmp-in-1')!;
    fireEvent.change(input, { target: { value: 'Turk' } });
    expect(input).toHaveAttribute('aria-expanded', 'true');
    expect(q('#cmp-lb-1')).not.toHaveAttribute('hidden');
    expect(input).toHaveAttribute('aria-activedescendant', 'cmp-o-1-0');
    expect(q('#cmp-o-1-0')).toHaveAttribute('aria-selected', 'true');
    const first = q('#cmp-o-1-0')!.dataset.iso!;
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(atlas.get().compare).toEqual(['SAU', first]);
    expect(input).toHaveAttribute('aria-expanded', 'false');
    expect(input.value).toBe(country(first, 'en'));
  });

  test('a name with no match says so; Escape closes the list and restores the name', () => {
    renderPanel();
    act(() => { atlas.set({ view: 'compare', compare: ['SAU', 'IRN'] }); });
    const input = q<HTMLInputElement>('#cmp-in-0')!;
    fireEvent.change(input, { target: { value: 'zzzz' } });
    expect(q('#cmp-lb-0 .cmp-o-none')).toHaveTextContent('لا دولة بهذا الاسم');
    fireEvent.keyDown(input, { key: 'Escape' });
    expect(q('#cmp-lb-0')).toHaveAttribute('hidden');
    expect(input.value).toBe(country('SAU'));
  });

  test('a record button in the body selects it', () => {
    renderPanel();
    act(() => { atlas.set({ view: 'compare', compare: ['SAU', 'IRN'] }); });
    fireEvent.click(q('.cmp-name[data-id="IRN"]')!);
    expect(atlas.get().selection).toEqual({ kind: 'country', id: 'IRN' });
  });
});

describe('sources', () => {
  test('lists 19 corrections, all applied', () => {
    renderPanel();
    open('sources');
    expect(q('#src-er-h .n')).toHaveTextContent('19');
    const items = qa('#src-er-h ~ .src-derived > div');
    expect(items).toHaveLength(19);
    expect(items[0]?.querySelector('dt')).toHaveTextContent(db.corrections[0]!.where.ar);
    expect(items[0]?.querySelector('dd')).toHaveTextContent(db.corrections[0]!.what.ar);
  });

  test('datasets, references, credit link and the unverified counts', () => {
    renderPanel();
    open('sources');
    expect(qa('.src-card')).toHaveLength(db.sources.datasets.length);
    expect(qa('.src-refs > li')).toHaveLength(db.sources.references.length);
    expect(q('.src-credit a')).toHaveAttribute('href', 'https://claude.ai/artifact/7Y8KPakRKzrUtZYxjCwJai');
    expect(q('.src-uv p')).toHaveTextContent('نزاعات 23، أحداث 13، مضائق وممرات 3، دول 5');
  });
});
