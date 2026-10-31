// Chokepoint dossier: one panel with oil flow, width, why it matters, bordering states, alternatives, risk and conflicts.

import type { ChokeX, ConflictX, Panel } from '../model';
import type { Kit } from '../parts';

export function chokePanel(id: string, k: Kit): Panel | null {
  const p = k.db.chokeById.get(id) as ChokeX | undefined;
  if (!p) return null;
  return {
    head: { region: '', title: k.pick(p), plate: [k.altSpan(p), k.coord(p.coords)], badges: [k.chokePill(p), k.unverifiedPill('choke', p.id)] },
    tabs: [{ id: 'main', render: () => body(p, k) }],
  };
}

function body(p: ChokeX, k: Kit) {
  const { t, pick: L, pickKey: Lk, fmt, db } = k;
  const flow = p.oilFlowMbd != null
    ? (
      <div className="dz-figure">
        <b className="data">{fmt.num(p.oilFlowMbd, 1)}</b><span>{t('dz.ch.mbd')}</span>
        {p.flowYear ? <span className="dz-yr dz-when">{t('dz.ch.year', { y: p.flowYear })}</span> : null}
      </div>
    )
    : k.empty(t('dz.ch.noFlow'));
  const conf = (p.conflictIds ?? []).map((cid) => db.conflictById.get(cid) as ConflictX | undefined).filter((c) => !!c);
  return <>
    {k.sec(t('dz.ch.flow'), [flow, k.note(L(db.chokeNote))], { cls: 'first' })}
    {k.sec(t('dz.ch.width'), k.prose(Lk(p, 'widthKm'), { clamp: false }))}
    {k.sec(t('dz.ch.share'), k.prose(Lk(p, 'shareNote')))}
    {k.sec(t('dz.ch.borders'), k.cchips(p.borderStates))}
    {k.sec(t('dz.ch.alts'), k.prose(Lk(p, 'alternatives')))}
    {k.sec(t('dz.ch.risk'), k.prose(Lk(p, 'risk')))}
    {k.sec(t('dz.ch.conflicts'), conf.length ? k.rows(conf.map((cf) => k.conflictRow(cf))) : k.empty(t('dz.ch.noConflicts')), { count: conf.length })}
  </>;
}
