import { afterEach, describe, expect, test, vi } from 'vitest';
import { loadPrefs, savePrefs } from '../src/app/prefs';

afterEach(() => { vi.restoreAllMocks(); localStorage.clear(); });

describe('preferences', () => {
  test('round-trip through the same key as v2', () => {
    savePrefs({ lang: 'en', theme: 'light', projection: 'flat' });
    expect(JSON.parse(localStorage.getItem('atlas-v2-prefs')!)).toEqual({ lang: 'en', theme: 'light', projection: 'flat' });
    expect(loadPrefs()).toEqual({ lang: 'en', theme: 'light', projection: 'flat' });
  });
  test('ignore unknown values', () => {
    localStorage.setItem('atlas-v2-prefs', JSON.stringify({ lang: 'fr', theme: 'pink', projection: 'globe' }));
    expect(loadPrefs()).toEqual({ projection: 'globe' });
  });
  test('blocked storage never throws', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('blocked'); });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('blocked'); });
    expect(loadPrefs()).toEqual({});
    expect(() => savePrefs({ lang: 'ar', theme: 'system', projection: 'globe' })).not.toThrow();
  });
});
