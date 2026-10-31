import { afterEach, describe, expect, test } from 'vitest';
import { esc, icon } from '../src/ui/dom';
import { initTips } from '../src/ui/tooltip';
import { catVar, edgeVar, pal } from '../src/ui/palette';
import { onStateChange } from '../src/app/compat';
import { atlas } from '../src/app/store';

afterEach(() => { atlas.reset(); document.body.innerHTML = ''; });

describe('dom helpers', () => {
  test('esc escapes markup', () => expect(esc('<a href="x">')).toBe('&lt;a href=&quot;x&quot;&gt;'));
  test('icon renders an svg with the named path', () => {
    const s = icon('globe');
    expect(s).toContain('<svg class="ic"');
    expect(s).toContain('<circle cx="12" cy="12" r="9"/>');
  });
});

describe('palette', () => {
  test('categorical slots map to CSS variables', () => {
    expect(catVar(3)).toBe('var(--cat-3)');
    expect(edgeVar('alliance')).toBe('var(--cat-3)');
  });
  test('the canvas palette is rebuilt when the page theme changes', () => {
    const a = pal();
    expect(pal()).toBe(a);
    document.documentElement.dataset.theme = 'light';
    expect(pal()).not.toBe(a);
    delete document.documentElement.dataset.theme;
  });
  test('a palette read during the render before the page flips is not kept', () => {
    atlas.set({ theme: 'dark', lang: 'en' }); // store first; Boot mirrors data-theme after render
    const early = pal();
    document.documentElement.dataset.theme = 'dark';
    expect(pal()).not.toBe(early);
    delete document.documentElement.dataset.theme;
  });
});

describe('state-change bridge', () => {
  test('reports the top-level keys that changed', () => {
    const seen: string[][] = [];
    const off = onStateChange((keys) => seen.push(keys as string[]));
    atlas.set({ lens: 'religion' });
    atlas.toggleInSet('severity', 'war');
    off();
    expect(seen).toEqual([['lens'], ['filters']]);
  });
});

describe('tooltips', () => {
  test('an element with data-tip shows the global tooltip', () => {
    document.body.innerHTML = '<div id="tooltip" hidden></div><b data-tip="hi">x</b>';
    const stop = initTips();
    document.querySelector('b')!.dispatchEvent(new MouseEvent('pointerover', { bubbles: true, clientX: 5, clientY: 5 }));
    const tip = document.getElementById('tooltip')!;
    expect(tip.hidden).toBe(false);
    expect(tip.innerHTML).toBe('hi');
    stop();
  });
});
