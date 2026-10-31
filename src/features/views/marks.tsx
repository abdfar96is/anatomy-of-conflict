// Small marks the views share: the severity glyph and the "not independently verified" mark.
// v2 kept both in views/timeline.js; they live here so compare does not reach into the timeline's folder.

import { useDb, useT } from '../../app/useT';
import { SEVERITY } from '../../config';
import type { Kind } from '../../data/types';
import { registerStrings } from '../../i18n/strings';
import { esc } from '../../ui/dom';
import { Icon } from '../../ui/Icon';
import { sevVar } from '../../ui/palette';

// The same two keys v2 registers in views/timeline.js; repeated here (identical text) so compare does not depend on it.
registerStrings({
  ar: {
    'vw.uv': 'لم تتحقّق منه هذه النسخة',
    'vw.uv.tip': 'الوضع وأحدث التطوّرات منقولة من الأطلس الأصلي (حتى {d})، ولم تُدقّقها هذه النسخة بصورة مستقلة.',
  },
  en: {
    'vw.uv': 'Not independently verified by this edition',
    'vw.uv.tip': 'Status and recent developments come from the original atlas (as of {d}); this edition has not independently checked them.',
  },
});

const SHAPE: Record<string, string> = Object.fromEntries(SEVERITY.map((s) => [s.id, s.shape]));

/** Severity marker drawn around (0,0): color plus the config shape, so severity never rests on hue alone. */
function SevShape({ id }: { id: string }) {
  const c = sevVar(id);
  const fill = { fill: c }, open = { fill: 'var(--surface)', stroke: c };
  switch (SHAPE[id]) {
    case 'pulse': return <><circle r="5" style={{ fill: 'none', stroke: c }} strokeWidth="1.2" /><circle r="2.8" style={fill} /></>;
    case 'square': return <rect x="-3.2" y="-3.2" width="6.4" height="6.4" rx="1" style={fill} />;
    case 'ring': return <circle r="3.2" style={open} strokeWidth="1.6" />;
    case 'diamond': return <path d="M0-4.2L4.2 0 0 4.2-4.2 0z" style={fill} />;
    case 'dashed': return <path d="M-5 0H5" style={{ stroke: c }} strokeWidth="2.6" strokeDasharray="2.4 1.6" />;
    case 'dot': return <circle r="2.2" style={fill} />;
    case 'hollow': return <rect x="-3.2" y="-3.2" width="6.4" height="6.4" rx="1" style={open} strokeWidth="1.6" />;
    default: return <circle r="3.6" style={fill} />;
  }
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
