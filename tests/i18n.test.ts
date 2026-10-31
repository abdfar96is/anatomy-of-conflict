import { describe, expect, test } from 'vitest';
import { fmtCompact, fmtDate, fmtGdp, fmtNum, fmtPct, normalize } from '../src/i18n/format';
import { pick, pickKey, registerStrings, translate } from '../src/i18n/strings';
import '../src/i18n/core';

describe('normalize', () => {
  test('strips Arabic diacritics and unifies ta marbuta', () => expect(normalize('السعوديّة')).toBe('السعوديه'));
  test('lowercases and trims Latin', () => expect(normalize('  Kurd  ')).toBe('kurd'));
  test('unifies alef forms and alef maqsura', () => expect(normalize('إأآى')).toBe('اااي'));
});

describe('number and date formats', () => {
  test('compact in Arabic', () => expect(fmtCompact(34268528, 'ar')).toBe('34.3 مليون'));
  test('compact in English', () => expect(fmtCompact(34268528, 'en')).toBe('34.3 M'));
  test('GDP in English, million USD input', () => expect(fmtGdp(793000, 'en')).toBe('$793 bn'));
  test('percent in Arabic uses the Arabic percent sign', () => expect(fmtPct(12, 'ar')).toBe('12٪'));
  test('missing number shows a dash', () => expect(fmtNum(null, 'en')).toBe('—'));
  test('Arabic numbers keep Western digits', () => expect(fmtNum(1234567, 'ar')).toMatch(/^1.234.567$/));
  test('full date in Arabic', () => expect(fmtDate('2023-10-07', 'ar')).toBe('7 أكتوبر 2023'));
  test('month and year in English', () => expect(fmtDate('1912-10', 'en')).toBe('Oct 1912'));
  test('year only', () => expect(fmtDate('1948', 'en')).toBe('1948'));
});

describe('strings', () => {
  test('falls back to Arabic when English is missing', () => {
    registerStrings({ ar: { onlyAr: 'عربي فقط' } });
    expect(translate('en', 'onlyAr')).toBe('عربي فقط');
  });
  test('falls back to the key when no language has it', () => expect(translate('en', 'missing')).toBe('missing'));
  test('fills placeholders', () => expect(translate('ar', 'loadingFile', { name: 'x' })).toBe('تحميل x'));
  test('core strings exist in both languages', () => expect(translate('en', 'appName')).toBe('Fault Lines Atlas'));
  test('pick chooses the language and passes strings through', () => {
    expect(pick('en', { ar: 'أ', en: 'a' })).toBe('a');
    expect(pick('ar', 'plain')).toBe('plain');
    expect(pick('ar', null)).toBe('');
  });
  test('pickKey reads flat bilingual fields', () => {
    expect(pickKey('ar', { nameAr: 'كرد', nameEn: 'Kurds' }, 'name')).toBe('كرد');
    expect(pickKey('en', { nameAr: 'كرد' }, 'name')).toBe('كرد');
  });
});
