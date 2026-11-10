// The company a site answers to: the first (largest) of GEM's "Parent [x%]; Other [y%]" or operator lists, without its
// share (ownerKey, the name shown), and a looser key to compare it across trackers that spell companies differently
// (ownerNorm: no legal suffix, no case or punctuation, a few known aliases). Used to light up every site of one owner.

export function ownerKey(s?: string | null): string | undefined {
  if (!s) return undefined;
  const first = s.split(/;\s*/)[0]!.replace(/\s*[[(][^\])]*%[^\])]*[\])]\s*$/, '').trim();
  return first && !/^(unknown|not found|n\/a)$/i.test(first) ? first : undefined;
}

const SUFFIX = /\s+(co|corp|corporation|company|pjsc|ojsc|jsc|pjs|sa|sae|spa|ltd|limited|inc|llc|plc|ag|nv|bv|asa|ab|oyj|se|group|holdings?)$/;
/** The same company under the names the trackers use (keys as ownerNorm leaves them). */
const ALIAS: Record<string, string> = {
  'saudi aramco': 'saudi arabian oil', aramco: 'saudi arabian oil',
  adnoc: 'abu dhabi national oil', nioc: 'national iranian oil', 'qatar petroleum': 'qatarenergy', 'kuwait oil': 'kuwait petroleum',
};
export function ownerNorm(name?: string | null): string | undefined {
  if (!name) return undefined;
  let s = name.toLowerCase().replace(/[.,'’()]/g, ' ').replace(/\s+/g, ' ').trim();
  for (let i = 0; i < 3; i++) { const t = s.replace(SUFFIX, ''); if (t === s) break; s = t; }
  return ALIAS[s] ?? s;
}
