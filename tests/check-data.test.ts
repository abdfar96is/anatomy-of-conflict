import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterAll, beforeAll, describe, expect, test } from 'vitest';
import { checkData } from '../scripts/check-data';
import { formatJson } from '../scripts/format-json';
import { build } from '../src/data/build';
import { DATA_DIR, readRaw } from './helpers/readRaw';

describe('check-data', () => {
  test('the repository data is clean', () => expect(checkData(DATA_DIR)).toEqual([]));

  describe('a contributor typo', () => {
    let dir: string;
    let ci: number, cj: number, ek: number;
    beforeAll(() => {
      dir = fs.mkdtempSync(path.join(os.tmpdir(), 'atlas-check-'));
      fs.cpSync(DATA_DIR, dir, { recursive: true });
      const af = path.join(dir, 'curated/conflicts/africa.json');
      const africa = JSON.parse(fs.readFileSync(af, 'utf8'));
      ci = africa.conflicts.findIndex((c: { id: string }) => c.id === 'sudan');
      cj = africa.conflicts[ci].countries.push('SDX') - 1;
      fs.writeFileSync(af, formatJson(africa));
      const tf = path.join(dir, 'curated/timeline.json');
      const tl = JSON.parse(fs.readFileSync(tf, 'utf8'));
      ek = tl.events.findIndex((e: { id: string }) => e.id === 'halabja');
      tl.events[ek].conflictIds = ['nope'];
      fs.writeFileSync(tf, formatJson(tl));
    });
    afterAll(() => fs.rmSync(dir, { recursive: true, force: true }));

    test('is reported with file, path and value', () => {
      const lines = checkData(dir).map((p) => `${p.file} › ${p.path} › ${JSON.stringify(p.value)}`);
      expect(lines).toEqual([
        `conflicts/africa.json › conflicts[${ci}].countries[${cj}] › "SDX"`,
        `timeline.json › events[${ek}].conflictIds[0] › "nope"`,
      ]);
    });

    test('does not break the model build', () => expect(() => build(readRaw(dir))).not.toThrow());
  });

  test('a hand-edited file still gets its link errors reported', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'atlas-check-'));
    try {
      fs.cpSync(DATA_DIR, dir, { recursive: true });
      const tf = path.join(dir, 'curated/timeline.json');
      const tl = JSON.parse(fs.readFileSync(tf, 'utf8'));
      const k = tl.events.findIndex((e: { id: string }) => e.id === 'halabja');
      tl.events[k].countries = ['IRX'];
      fs.writeFileSync(tf, JSON.stringify(tl, null, 2));
      const lines = checkData(dir).map((p) => `${p.file} › ${p.path} › ${p.message}`);
      expect(lines).toContain('timeline.json ›  › not in the canonical layout; run npm run format-data');
      expect(lines).toContain(`timeline.json › events[${k}].countries[0] › unknown country code`);
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });
});
