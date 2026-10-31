import { render } from '@testing-library/react';
import { afterEach, describe, expect, test } from 'vitest';
import { atlas } from '../src/app/store';
import { BarList, Donut, Histogram, Pips, StackBar } from '../src/ui/charts';

afterEach(() => atlas.reset());
const tips = (root: Element) => [...root.querySelectorAll('[data-tip]')].map((e) => e.getAttribute('data-tip'));

describe('charts (same marks and tooltips as v2 charts.js)', () => {
  test('donut: one arc per part plus a neutral rest, tooltips with escaped labels', () => {
    atlas.set({ lang: 'en' });
    const { container } = render(<Donut parts={[{ label: 'A<b>', value: 60, color: 'red' }, { label: 'B', value: 30, color: 'blue' }]} total={100} center="90%" sub="two" label="mix" />);
    expect(container.querySelectorAll('svg path')).toHaveLength(3);
    expect(tips(container)).toEqual(['<b>A&lt;b&gt;</b> 60%', '<b>B</b> 30%']);
    expect(container.querySelector('svg')?.getAttribute('aria-label')).toBe('mix');
    expect(container.querySelector('.donut-c')?.textContent).toBe('90%two');
  });
  test('donut: no rest arc when the parts fill the total', () => {
    const { container } = render(<Donut parts={[{ label: 'A', value: 100, color: 'red' }]} />);
    expect(container.querySelectorAll('svg path')).toHaveLength(1);
  });
  test('bar list: widths relative to the largest value, percent labels', () => {
    atlas.set({ lang: 'en' });
    const { container } = render(<BarList unit="%" rows={[{ label: 'x', value: 50, color: 'red' }, { label: 'y', value: 5 }]} />);
    const bars = [...container.querySelectorAll<HTMLElement>('.barlist-bar')];
    expect(bars.map((b) => b.style.width)).toEqual(['100%', '10%']);
    expect([...container.querySelectorAll('.barlist-val')].map((v) => v.textContent)).toEqual(['50%', '5%']);
    expect(container.querySelectorAll('.sw')).toHaveLength(1);
  });
  test('stack bar: one segment per non-zero part', () => {
    const { container } = render(<StackBar parts={[{ label: 'a', value: 70, color: 'red' }, { label: 'b', value: 0, color: 'x' }, { label: 'c', value: 30, color: 'blue' }]} />);
    expect(container.querySelectorAll('.stackbar span')).toHaveLength(2);
  });
  test('histogram: one column per bin, the highlighted one in the accent colour', () => {
    const { container } = render(<Histogram bins={[{ x: 1990, value: 2 }, { x: 2000, value: 4 }, { x: 2010, value: 0 }]} highlight={2000} />);
    const rects = [...container.querySelectorAll('rect')];
    expect(rects).toHaveLength(3);
    expect(rects[1]?.getAttribute('fill')).toBe('var(--accent)');
    expect(rects[2]?.getAttribute('height')).toBe('0.0');
    expect(tips(container)).toEqual(['1990: 2', '2000: 4', '2010: 0']);
  });
  test('pips: n of m filled', () => {
    const { container } = render(<Pips n={2} of={5} color="red" />);
    const pips = [...container.querySelectorAll<HTMLElement>('.pips i')];
    expect(pips).toHaveLength(5);
    expect(pips.filter((p) => p.style.background === 'red')).toHaveLength(2);
  });
});
