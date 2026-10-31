// Share links: one plain token in the URL hash, e.g. #country-SAU, #conflict-sudan, #lens-religion,
// #view-network, #compare-SAU-IRN, #tour-energy. Same tokens as v2, so old links keep working.

import { KINDS, LENSES, VIEWS, type LensId, type ViewId } from '../config';
import type { DB, Kind } from '../data/types';
import { emit } from './events';
import { atlas, useAtlas, type AtlasState } from './store';

export type ParsedHash = { patch?: Partial<AtlasState>; fly?: { kind: Kind; id: string }; tour?: string };

export function hashToken(s: AtlasState): string {
  if (s.tour) return `tour-${s.tour.id}`;
  if (s.view === 'compare' && s.compare[0] && s.compare[1]) return `compare-${s.compare[0]}-${s.compare[1]}`;
  if (s.selection) return `${s.selection.kind}-${s.selection.id}`;
  if (s.view) return `view-${s.view}`;
  return `lens-${s.lens}`;
}

export function parseHash(token: string, db: DB): ParsedHash | null {
  const cut = token.indexOf('-');
  if (cut < 0) return null;
  const head = token.slice(0, cut), rest = token.slice(cut + 1);
  if (head === 'lens' && LENSES.some((l) => l.id === rest)) return { patch: { lens: rest as LensId, view: null, selection: null } };
  if (head === 'view' && VIEWS.some((v) => v.id === rest)) return { patch: { view: rest as ViewId } };
  if (head === 'compare') {
    const [a, b] = rest.split('-');
    if (a && b && db.countries.has(a) && db.countries.has(b)) return { patch: { view: 'compare', compare: [a, b] } };
    return null;
  }
  if (head === 'tour') return rest ? { tour: rest } : null;
  // A selection link shows that record on the map, so it closes any open view.
  if ((KINDS as readonly string[]).includes(head) && db.exists(head as Kind, rest)) {
    const sel = { kind: head as Kind, id: rest };
    return { patch: { selection: sel, view: null }, fly: sel };
  }
  return null;
}

function currentToken(): string {
  try {
    return decodeURIComponent(location.hash.slice(1));
  } catch {
    return ''; // a malformed escape (e.g. #%E0%A4%A) is treated as no link
  }
}

/** Apply the current hash. Returns false when there is no valid token. */
export function applyHash(db: DB): boolean {
  const parsed = parseHash(currentToken(), db);
  if (!parsed) return false;
  if (parsed.tour) { emit('starttour', parsed.tour); return true; }
  if (parsed.patch) atlas.set(parsed.patch);
  const fly = parsed.fly;
  if (fly) setTimeout(() => emit('flyto', fly), 50);
  return true;
}

/** Apply the hash now and on every hashchange; keep the hash in step with state. Returns a stop function. */
export function startHashSync(db: DB): () => void {
  let writing = false;
  applyHash(db);
  const onHash = () => { if (!writing) applyHash(db); };
  addEventListener('hashchange', onHash);
  const unsub = useAtlas.subscribe((s, prev) => {
    if (s.selection === prev.selection && s.view === prev.view && s.lens === prev.lens && s.compare === prev.compare && s.tour === prev.tour) return;
    const token = hashToken(s);
    if (currentToken() === token) return;
    writing = true;
    history.replaceState(null, '', '#' + token);
    setTimeout(() => { writing = false; }, 0);
  });
  return () => { removeEventListener('hashchange', onHash); unsub(); };
}
