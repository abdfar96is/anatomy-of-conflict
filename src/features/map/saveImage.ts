// "Save the map as an image": what goes in the footer (lens, date, key, sources and licences, the link back) and the
// download. The drawing is in snapshot.ts.

import { emit } from '../../app/events';
import { atlas, type AtlasState } from '../../app/store';
import { LENSES, type LensId } from '../../config';
import type { DB } from '../../data/types';
import { fmtDate } from '../../i18n/format';
import { pick, translate } from '../../i18n/strings';
import { download, readKey, snapshot } from './snapshot';
import './strings';

/** The datasets each lens draws (the curated sources list); every map also stands on Natural Earth's countries. */
export const LENS_SOURCES: Record<LensId, string[]> = {
  overview: ['wb-indicators'],
  conflicts: ['atlas-conflicts'],
  religion: ['atlas-religion'],
  ethnic: ['atlas-ethnic'],
  disputed: ['ne-disputed'],
  powers: ['atlas-relations'],
  nuclear: ['atlas-nuclear', 'atlas-nuclear-plants'],
  resources: ['atlas-resources'],
  chokepoints: ['atlas-chokepoints'],
  history: ['atlas-timeline'],
  borders: ['cshapes'],
  pipelines: ['gem-pipelines', 'gem-lng', 'gem-goget'],
  industry: ['gem-gipt', 'gem-industry'],
};

/** "Publisher (licence)" for each dataset behind the map as it stands, without repeats. */
export function sourcesFor(db: DB, S: Pick<AtlasState, 'lens' | 'lang' | 'layers'>): string[] {
  const ids = ['ne-admin0', ...LENS_SOURCES[S.lens]];
  if (S.layers.disputed && S.lens !== 'disputed') ids.push('ne-disputed');
  if (S.layers.conflicts && S.lens !== 'conflicts') ids.push('atlas-conflicts');
  const out: string[] = [];
  for (const id of ids) {
    const d = db.datasetById.get(id) as { publisher?: string | { ar?: string; en?: string }; license?: string } | undefined;
    if (!d) continue;
    const line = `${pick(S.lang, d.publisher) || id}${d.license ? ` (${d.license})` : ''}`;
    if (!out.includes(line)) out.push(line);
  }
  return out;
}

const today = () => new Date().toISOString().slice(0, 10);

/** Save the map as it stands as a PNG; a toast says how it went. */
export async function saveMapImage(db: DB | null): Promise<boolean> {
  const S = atlas.get(), lang = S.lang, t = (k: string, v?: Record<string, string | number>) => translate(lang, k, v);
  const canvases = [...document.querySelectorAll<HTMLCanvasElement>('#map canvas.map-layer')];
  const map = document.getElementById('map');
  const lens = LENSES.find((l) => l.id === S.lens) ?? LENSES[0];
  try {
    if (!canvases.length || !map) throw new Error('no map');
    const key = await readKey(document.querySelector('#legend .lc-body'));
    const blob = await snapshot(canvases, map.getBoundingClientRect().width, {
      lang, app: t('appName'), title: pick(lang, lens), sub: pick(lang, lens.sub),
      when: S.yearFilter ? t('map.img.year', { y: S.year }) : t('map.img.on', { d: fmtDate(today(), lang) }),
      sourcesLabel: t('map.img.sources'), sources: db ? sourcesFor(db, S) : [], link: location.href,
    }, key);
    if (!blob) throw new Error('no image');
    download(blob, `atlas-${S.lens}-${S.yearFilter ? S.year : today()}.png`);
    emit('toast', t('map.img.saved'));
    return true;
  } catch (err) {
    console.error('[atlas] map image failed', err);
    emit('toast', t('map.img.failed'));
    return false;
  }
}
