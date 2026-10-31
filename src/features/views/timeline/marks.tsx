// Severity shapes and the "not independently verified" mark, shared by the timeline and the compare view.

import { createElement } from 'react';
import type * as d3 from 'd3';
import { useDb, useT } from '../../../app/useT';
import { SEVERITY } from '../../../config';
import type { Kind } from '../../../data/types';
import { esc } from '../../../ui/dom';
import { Icon } from '../../../ui/Icon';
import { sevVar } from '../../../ui/palette';
import './strings';

export interface ShapePart { tag: 'circle' | 'rect' | 'path'; attrs: Record<string, string | number>; style: Record<string, string> }

const SHAPE: Record<string, string> = Object.fromEntries(SEVERITY.map((s) => [s.id, s.shape]));
export const sevShapeOf = (id: string): string | undefined => SHAPE[id];

/** Severity marker drawn around (0,0): color plus the config shape, so severity never rests on hue alone. */
export function sevShape(id: string): ShapePart[] {
  const c = sevVar(id);
  const fill = { fill: c }, open = { fill: 'var(--surface)', stroke: c };
  const square = { x: -3.2, y: -3.2, width: 6.4, height: 6.4, rx: 1 };
  switch (SHAPE[id]) {
    case 'pulse': return [
      { tag: 'circle', attrs: { r: 5, strokeWidth: 1.2 }, style: { fill: 'none', stroke: c } },
      { tag: 'circle', attrs: { r: 2.8 }, style: fill },
    ];
    case 'square': return [{ tag: 'rect', attrs: square, style: fill }];
    case 'ring': return [{ tag: 'circle', attrs: { r: 3.2, strokeWidth: 1.6 }, style: open }];
    case 'diamond': return [{ tag: 'path', attrs: { d: 'M0-4.2L4.2 0 0 4.2-4.2 0z' }, style: fill }];
    case 'dashed': return [{ tag: 'path', attrs: { d: 'M-5 0H5', strokeWidth: 2.6, strokeDasharray: '2.4 1.6' }, style: { stroke: c } }];
    case 'dot': return [{ tag: 'circle', attrs: { r: 2.2 }, style: fill }];
    case 'hollow': return [{ tag: 'rect', attrs: { ...square, strokeWidth: 1.6 }, style: open }];
    default: return [{ tag: 'circle', attrs: { r: 3.6 }, style: fill }];
  }
}

/** The same shape appended with d3 (the chart is drawn imperatively). */
export function appendSevShape(g: d3.Selection<SVGGElement, unknown, null, undefined>, id: string): void {
  for (const p of sevShape(id)) {
    const el = g.append(p.tag);
    for (const [k, v] of Object.entries(p.attrs)) el.attr(k.replace(/[A-Z]/g, (m) => '-' + m.toLowerCase()), v);
    for (const [k, v] of Object.entries(p.style)) el.style(k, v);
  }
}

export function SevShape({ id }: { id: string }) {
  return sevShape(id).map((p, i) => createElement(p.tag, { key: i, ...p.attrs, style: p.style }));
}

export function SevIcon({ id, size = 12 }: { id: string; size?: number }) {
  return <svg className="sev-ic" width={size} height={size} viewBox="-6 -6 12 12" aria-hidden="true"><SevShape id={id} /></svg>;
}

/** Quiet info mark for records the edition carries over without re-checking (same meaning as the dossier's pill). */
export function UvMark({ kind, id }: { kind: Kind; id: string }) {
  const db = useDb();
  const { t, fmt } = useT();
  if (!db.isUnverified(kind, id)) return null;
  return (
    <span className="vw-uv" tabIndex={0} data-tip={esc(t('vw.uv.tip', { d: fmt.date(db.conflictsAsOf) }))}>
      <Icon name="info" size={13} /><span className="vh">{t('vw.uv')}</span>
    </span>
  );
}
