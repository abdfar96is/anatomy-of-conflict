// Bloc dossier: basis, member count, links drawn between members, the member list and the network button.

import type { BlocX, Panel } from '../model';
import type { Kit } from '../parts';

const basisKey = (b: BlocX) => (b.kind === 'treaty' ? 'dz.b.treaty' : 'dz.b.assessed');

export function blocPanel(id: string, k: Kit): Panel | null {
  const b = k.db.relations.blocById.get(id) as BlocX | undefined;
  if (!b) return null;
  const { t, fmt } = k;
  return {
    head: {
      region: t(basisKey(b)), title: k.pick(b), plate: [k.altSpan(b)],
      badges: [<span className="pill">{t('dz.b.membersN', { n: fmt.num(b.members.length) })}</span>],
    },
    tabs: [{ id: 'main', render: () => body(b, k) }],
  };
}

function body(b: BlocX, k: Kit) {
  const { t, pick: L, fmt, db } = k;
  const set = new Set(b.members);
  const inner = db.relations.edges.filter((e) => set.has(e.a) && set.has(e.b)).length;
  return <>
    {k.sec(null, k.facts([
      k.fact(t('dz.b.kind'), t(basisKey(b)), { text: true, wide: true }),
      k.fact(t('dz.b.members'), <span className="data">{fmt.num(b.members.length)}</span>),
      k.fact(t('dz.b.edges'), <span className="data">{fmt.num(inner)}</span>, { tipText: t('dz.b.edgesTip') }),
    ]), { cls: 'first' })}
    {b.note ? k.sec(null, k.caveat(L(b.note))) : null}
    {k.sec(t('dz.b.members'), k.cchips(b.members, { sort: true }), { count: b.members.length })}
    {k.sec(null, k.networkBtn())}
  </>;
}
