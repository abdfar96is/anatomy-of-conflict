// The lens card's "In view" list: what the map frame shows, by kind, the largest first. Each row selects its record and
// flies there; hovering one rings it on the map. A readable way in when the dots are small or crowded.

import { useState, useSyncExternalStore } from 'react';
import { emit } from '../../app/events';
import { atlas } from '../../app/store';
import { useDb, useT } from '../../app/useT';
import { splitFieldName } from '../../data/energy';
import type { Kind } from '../../data/types';
import { Icon } from '../../ui/Icon';
import { KIND_ICON } from '../shell/actions';
import { subOf } from '../shell/CommandPalette';
import { inView, inViewVersion, subscribeInView, type InViewItem } from './inview';

const FEW = 8, MANY = 30;

export function InViewList() {
  const db = useDb();
  const T = useT();
  const { t, fmt, lang } = T;
  useSyncExternalStore(subscribeInView, inViewVersion, inViewVersion);
  const [open, setOpen] = useState<Set<Kind>>(new Set());
  // one row per record (a pipeline system once, by its largest segment), grouped by kind in the order they come
  const groups = new Map<Kind, Map<string, InViewItem>>();
  for (const it of inView()) {
    if (!db.exists(it.kind, it.id)) continue;
    const key = it.kind === 'pipeline' ? db.nameOf(it.kind, it.id, lang) : it.id;
    let g = groups.get(it.kind);
    if (!g) groups.set(it.kind, (g = new Map()));
    const cur = g.get(key);
    if (!cur || it.r > cur.r || (it.r === cur.r && it.v > cur.v)) g.set(key, it);
  }
  if (!groups.size) return <p className="lc-note iv-empty">{t('map.iv.empty')}</p>;
  // a field's place in brackets repeats its state, which the second line gives
  const nameOf = (it: InViewItem) => (it.kind === 'field' ? splitFieldName(db.nameOf(it.kind, it.id, lang))[0] : db.nameOf(it.kind, it.id, lang));
  return (
    <div className="iv">
      {[...groups].map(([kind, g]) => {
        const rows = [...g.values()].sort((a, b) => b.r - a.r || b.v - a.v);
        const many = open.has(kind);
        const shown = rows.slice(0, many ? MANY : FEW);
        return (
          <section key={kind} className="lc-sec iv-group" data-kind={kind}>
            <p className="lc-label iv-h"><span>{t('kinds.' + kind)}</span><span className="n">{fmt.num(rows.length)}</span></p>
            <ul className="bd-changes iv-list">
              {shown.map((it) => {
                const sub = subOf(db, T, it.kind, it.id);
                return (
                  <li key={it.id}>
                    <button type="button" className="bd-change iv-row" data-sel-kind={it.kind} data-sel-id={it.id}
                      onClick={() => atlas.select(it.kind, it.id, { fly: true })}
                      onPointerEnter={() => { const a = db.anchorOf(it.kind, it.id); emit('highlight', { iso3: [], lonlat: a ?? undefined }); }}
                      onPointerLeave={() => emit('highlight', null)}
                      onFocus={() => { const a = db.anchorOf(it.kind, it.id); emit('highlight', { iso3: [], lonlat: a ?? undefined }); }}
                      onBlur={() => emit('highlight', null)}>
                      <Icon name={KIND_ICON[it.kind]} size={14} />
                      <span className="iv-txt"><bdi className="iv-name">{nameOf(it)}</bdi>{sub ? <span className="iv-sub">{sub}</span> : null}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
            {rows.length > FEW ? (
              <button type="button" className="iv-more" onClick={() => setOpen((s) => { const n = new Set(s); if (n.has(kind)) n.delete(kind); else n.add(kind); return n; })}>
                {many ? t('map.iv.less') : t('map.iv.more', { n: fmt.num(Math.min(rows.length, MANY) - FEW) })}
              </button>
            ) : null}
          </section>
        );
      })}
      <p className="lc-note">{t('map.iv.note')}</p>
    </div>
  );
}
