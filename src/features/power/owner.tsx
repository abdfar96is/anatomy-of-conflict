// The owner focus: every loaded site of one company (plants, mines and plants, fields, pipeline segments) lit while
// the rest of the map dims. A dossier button turns it on; the lens card shows it as a chip that turns it off.

import { atlas, useAtlas } from '../../app/store';
import { useT } from '../../app/useT';
import { getEnergy } from '../../data/energy';
import { getIndustry } from '../../data/industry';
import { ownerKey, ownerNorm } from '../../data/owner';
import { getPower } from '../../data/power';
import { esc } from '../../ui/dom';
import { Icon } from '../../ui/Icon';
import './strings';

/** How many loaded sites answer to this owner. */
export function ownerCount(owner: string): number {
  const key = ownerNorm(owner);
  const is = (name?: string) => ownerNorm(name) === key;
  let n = 0;
  for (const p of getPower()?.plants ?? []) if (p.status !== 'retired' && is(p.owner)) n++;
  for (const x of getIndustry()?.sites ?? []) if (is(ownerKey(x.par || x.o))) n++;
  const E = getEnergy();
  for (const x of E?.fields ?? []) if (is(ownerKey(x.operator))) n++;
  for (const p of E?.pipes ?? []) if (is(ownerKey(p.owner))) n++;
  return n;
}

/** The dossier's button: light up this owner's other sites (or turn the focus off). */
export function OwnerButton({ owner }: { owner?: string }) {
  const { t, fmt } = useT();
  const on = useAtlas((s) => s.filters.ownerFocus);
  if (!owner) return null;
  const n = ownerCount(owner);
  if (n < 2 && !(on && ownerNorm(on) === ownerNorm(owner))) return null;
  const active = !!on && ownerNorm(on) === ownerNorm(owner);
  return (
    <button type="button" className="btn dz-wide-btn" data-act="owner" aria-pressed={active}
      onClick={() => atlas.setFilter('ownerFocus', active ? null : owner)}>
      <Icon name={active ? 'close' : 'filter'} size={16} />
      <span>{active ? t('own.hide', { o: owner }) : t('own.show', { o: owner, n: fmt.num(n) })}</span>
    </button>
  );
}

/** The lens card's chip while an owner is in focus. */
export function OwnerChip() {
  const { t, fmt } = useT();
  const owner = useAtlas((s) => s.filters.ownerFocus);
  if (!owner) return null;
  return (
    <div className="chips own-chip">
      <button type="button" className="chip" aria-pressed="true" data-act="owner-off" data-tip={esc(t('own.clear'))}
        onClick={() => atlas.setFilter('ownerFocus', null)}>
        <Icon name="close" size={13} /><bdi>{owner}</bdi><span className="n">{fmt.num(ownerCount(owner))}</span>
      </button>
    </div>
  );
}
