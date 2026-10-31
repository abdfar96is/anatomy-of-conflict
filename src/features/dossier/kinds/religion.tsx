// Religious tradition dossier: where it is (shares by state) and the method notes.

import { RELIGION_FAMILIES } from '../../../config';
import { BarList } from '../../../ui/charts';
import { esc } from '../../../ui/dom';
import { traditionColor } from '../../../ui/palette';
import type { Panel, Tradition } from '../model';
import type { Kit } from '../parts';

function majorityCount(id: string, k: Kit) {
  let n = 0;
  for (const c of k.db.countries.values()) if (c.religion?.majority === id) n++;
  return n;
}
/** Covered states where the tradition is 1% or more: [iso, share, year], largest first. */
function sharesOf(id: string, k: Kit): [string, number, number | undefined][] {
  return Object.entries(k.db.religion.countries)
    .map(([iso, v]): [string, number, number | undefined] => [iso, v.groups?.[id] || 0, v.year])
    .filter(([, p]) => p >= 1)
    .sort((a, b) => b[1] - a[1]);
}
const familyOf = (id: string, k: Kit) => RELIGION_FAMILIES.find((f) => f.id === k.db.religion.familyOf[id]);

export function religionPanel(id: string, k: Kit): Panel | null {
  const tr = k.db.religion.traditionById.get(id);
  if (!tr) return null;
  const { t, pick: L, fmt } = k;
  const fam = familyOf(id, k);
  return {
    head: {
      region: fam ? L(fam) : '', title: L(tr), plate: [k.altSpan(tr)],
      badges: [<span className="pill dz-pill">{k.sw(traditionColor(id))}{t('dz.rl.majorityIn')}{' '}<span className="data">{fmt.num(majorityCount(id, k))}</span></span>],
    },
    tabs: [
      { id: 'spread', label: t('dz.rl.t.spread'), count: sharesOf(id, k).length, render: () => spread(tr, k) },
      { id: 'method', label: t('dz.rl.t.method'), render: () => method(k) },
    ],
  };
}

function spread(tr: Tradition, k: Kit) {
  const { t, pick: L, fmt } = k;
  const id = tr.id;
  const all = sharesOf(id, k);
  const top = all.slice(0, 25);
  const fam = familyOf(id, k);
  const head = k.facts([
    fam && k.fact(t('dz.rl.family'), L(fam), { text: true, wide: true }),
    k.fact(t('dz.rl.majorityIn'), k.numUnit(t('dz.rl.states', { n: fmt.num(majorityCount(id, k)) })), { tipText: t('dz.rl.majorityTip') }),
    k.fact(t('dz.rl.presentIn'), k.numUnit(t('dz.rl.states', { n: fmt.num(all.length) }))),
  ]);
  const color = traditionColor(id);
  const bars = top.length
    ? [
      <BarList unit="%" max={100} rows={top.map(([iso, p, yr]) => ({
        label: k.nameC(iso), value: p, color,
        tip: `<b>${esc(k.nameC(iso))}</b> ${esc(fmt.pct(p, p < 10 ? 1 : 0))}${yr ? ` <span class="tip-sub">${esc(yr)}</span>` : ''}`,
        rowProps: k.barRowProps(iso),
      }))} />,
      k.note(t('dz.rl.sharesNote')),
    ]
    : [k.empty(t('dz.rl.none'))];
  return <>
    {k.sec(null, head, { cls: 'first' })}
    {k.sec(t('dz.rl.shares'), <div className="dz-bars">{bars[0]}{bars[1]}</div>, { count: top.length || null })}
  </>;
}

function method(k: Kit) {
  const { t, pick: L, db } = k;
  return <>
    {k.sec(t('dz.rl.coverage'), k.prose(L(db.religion.coverageNote), { clamp: false }), { cls: 'first' })}
    {k.sec(t('dz.rl.method'), k.prose(L(db.religion.methodNote), { clamp: false }))}
  </>;
}
