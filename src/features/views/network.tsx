// Relations network: every country with a recorded tie, laid out once with d3-force and then held still.
// The graph is drawn by networkGraph.ts on refs; the filters, ties list and caption are React.

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { atlas, useAtlas } from '../../app/store';
import { useDb, useT } from '../../app/useT';
import type { Bi } from '../../i18n/format';
import { registerStrings } from '../../i18n/strings';
import { Pips } from '../../ui/charts';
import { esc, reducedMotion } from '../../ui/dom';
import { Icon } from '../../ui/Icon';
import { edgeVar } from '../../ui/palette';
import { createNetGraph, dashOf, netModel, type NetEdge, type NetGraph, type NetText } from './networkGraph';

registerStrings({
  ar: {
    'nw.chart': 'شبكة من {n} علاقة بين {m} دولة',
    'nw.types': 'نوع العلاقة',
    'nw.kinds': 'درجة التوثيق',
    'nw.blocs': 'أبرز تكتل',
    'nw.treaty': 'موثّقة بمعاهدة',
    'nw.assessed': 'تقدير تحليلي',
    'nw.contested': 'محلّ خلاف',
    'nw.width': 'السماكة = قوة الرابط من 2 إلى 5',
    'nw.size': 'حجم الدائرة = مجموع قوة روابط الدولة',
    'nw.strongest': 'أقوى الروابط',
    'nw.weight': 'القوة {n} من 5',
    'nw.ties': 'الروابط: {n}',
    'nw.weighted': 'مجموع القوة: {n}',
    'nw.empty': 'لا روابط تطابق الفلاتر الحالية.',
    'nw.members': '{name}: {n} من أعضائه الـ{of} ظاهرون في الشبكة.',
    'nw.noMembers': '{name}: لا يظهر أي من أعضائه في شبكة العلاقات المسجّلة.',
    'nw.notIn': '{name} ليست طرفاً في أي رابط مسجّل في هذه الشبكة.',
    'nw.compare': 'قارن بينهما',
    'nw.in': 'تكبير',
    'nw.out': 'تصغير',
    'nw.fit': 'إظهار الشبكة كاملة',
    'nw.hint': 'اسحب الدول لتحريكها، ومرّر للتكبير. الأسهم تنقلك بين الدول بالترتيب.',
  },
  en: {
    'nw.chart': 'Network of {n} ties between {m} states',
    'nw.types': 'Type of tie',
    'nw.kinds': 'Evidence',
    'nw.blocs': 'Outline a bloc',
    'nw.treaty': 'Treaty-documented',
    'nw.assessed': 'Analytical assessment',
    'nw.contested': 'Contested',
    'nw.width': 'Line width = strength of the tie, 2 to 5',
    'nw.size': 'Circle size = total strength of a state’s ties',
    'nw.strongest': 'Strongest ties',
    'nw.weight': 'Strength {n} of 5',
    'nw.ties': 'Ties: {n}',
    'nw.weighted': 'Total strength: {n}',
    'nw.empty': 'No ties match the current filters.',
    'nw.members': '{name}: {n} of its {of} members appear in the network.',
    'nw.noMembers': '{name}: none of its members appear in the recorded network.',
    'nw.notIn': '{name} is not a party to any recorded tie in this network.',
    'nw.compare': 'Compare the two',
    'nw.in': 'Zoom in',
    'nw.out': 'Zoom out',
    'nw.fit': 'Show the whole network',
    'nw.hint': 'Drag states to move them; scroll to zoom. Arrow keys step through the states in order.',
  },
});

type Named = Partial<Bi> | string | null | undefined;

/** Short line key that mirrors an edge: type color, solid/dashed/dotted. type=null draws it in ink. */
export function LineKey({ type, kind, contested = false, w = 22 }: { type: string | null; kind: string; contested?: boolean; w?: number }) {
  const dash = dashOf(kind, contested);
  return (
    <svg className="lk" width={w} height="10" viewBox={`0 0 ${w} 10`} aria-hidden="true">
      <line x1="2" y1="5" x2={w - 2} y2="5" style={{ stroke: type ? edgeVar(type) : 'var(--fg-2)' }} strokeWidth="2.4"
        strokeDasharray={dash ?? undefined} strokeLinecap={contested ? 'round' : undefined} />
    </svg>
  );
}

export function NetworkView() {
  const db = useDb();
  const T = useT();
  const { t, pick } = T;
  const L = pick as (o: Named) => string;
  const filters = useAtlas((s) => s.filters);
  const selection = useAtlas((s) => s.selection);
  const R = db.relations;
  const M = useMemo(() => netModel(db), [db]);
  const name = useCallback((iso: string) => db.nameOf('country', iso, T.lang), [db, T.lang]);
  const typeName = useCallback((id: string) => L(R.edgeTypeById.get(id) as Named), [L, R]);

  const [pinnedRaw, setPinned] = useState<string | null>(null);
  const [hoverEdge, setHoverEdge] = useState<string | null>(null);
  const scrollPin = useRef(false);
  const pin = useCallback((id: string | null, fromChart = false) => { scrollPin.current = fromChart; setPinned(id); }, []);

  const { visE, visN, members, bloc } = useMemo(() => {
    const visE = new Set(M.edges.filter((e) => filters.relTypes.has(e.type) && filters.relKinds.has(e.kind)).map((e) => e.id));
    const visN = new Set<string>();
    for (const e of M.edges) if (visE.has(e.id)) { visN.add(e.a); visN.add(e.b); }
    const bloc = filters.bloc ? R.blocById.get(filters.bloc) : undefined;
    const members = new Set(bloc ? bloc.members.filter((m) => M.byId.has(m)) : []);
    return { visE, visN, members, bloc };
  }, [M, R, filters]);
  // a pinned tie the filters hide is let go, as v2's applyFilters did
  if (pinnedRaw && !visE.has(pinnedRaw)) setPinned(null);
  const pinned = pinnedRaw && visE.has(pinnedRaw) ? pinnedRaw : null;
  const selIso = selection?.kind === 'country' && M.byId.has(selection.id) ? selection.id : null;

  const text = useMemo<NetText>(() => ({
    name,
    nodeLabel: (d) => `${name(d.id)} — ${t('nw.ties', { n: d.n })}`,
    edgeTip: (e) => `<b>${esc(name(e.a))} — ${esc(name(e.b))}</b><span class="tip-sub">${esc(typeName(e.type))} · ${esc(t('nw.' + e.kind))}${e.contested ? ` · ${esc(t('nw.contested'))}` : ''} · ${esc(t('nw.weight', { n: e.weight }))}</span><span class="tip-sub">${esc(L(e as Named))}</span>`,
    nodeTip: (n, vis) => {
      const mine = M.edges.filter((e) => vis.has(e.id) && (e.a === n.id || e.b === n.id)).sort((a, b) => b.weight - a.weight);
      const top = mine.slice(0, 4).map((e) => `<span class="tip-sub">${esc(name(e.a === n.id ? e.b : e.a))} · ${esc(typeName(e.type))}</span>`).join('');
      return `<b>${esc(name(n.id))}</b><span class="tip-sub">${esc(t('nw.ties', { n: n.n }))} · ${esc(t('nw.weighted', { n: T.fmt.num(n.w) }))}</span>${top}`;
    },
  }), [M, name, typeName, t, L, T.fmt]);

  // ---- graph: drawn once per mount on the refs, then fed the filters, emphasis and selection
  const svgRef = useRef<SVGSVGElement>(null);
  const chartRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLOListElement>(null);
  const graph = useRef<NetGraph | null>(null);
  const placedBy = useRef<NetGraph | null>(null);

  useEffect(() => {
    const svg = svgRef.current, chart = chartRef.current;
    if (!svg || !chart) return;
    const g = createNetGraph(svg, chart, M, text, { pin, hoverEdge: setHoverEdge });
    graph.current = g;
    return () => { g.destroy(); graph.current = null; };
  }, [M, text, pin]);

  useEffect(() => {
    graph.current?.update({ visE, visN, members, pinned, hoverEdge, selIso });
  }, [visE, visN, members, pinned, hoverEdge, selIso, M, text, pin]);

  // the first placement (per drawn graph) centres on the selected state at once; later selections glide to it
  useEffect(() => {
    const g = graph.current;
    if (!g) return;
    const first = placedBy.current !== g;
    placedBy.current = g;
    if (selIso) { g.centerOn(selIso, !first); g.setFocus(selIso); }
    else if (first && M.nodes[0]) g.setFocus(M.nodes[0].id);
  }, [selection, selIso, M, text, pin]);

  // a tie pinned from the chart scrolls its row into view
  useLayoutEffect(() => {
    if (!scrollPin.current || !pinned) return;
    scrollPin.current = false;
    listRef.current?.querySelector(`[data-edge="${pinned}"]`)?.scrollIntoView?.({ block: 'nearest', behavior: reducedMotion() ? 'auto' : 'smooth' });
  }, [pinned]);

  // ---- strongest ties list
  const rows = useMemo(() => M.edges.filter((e) => visE.has(e.id))
    .sort((a, b) => b.weight - a.weight || (a.kind === b.kind ? 0 : a.kind === 'treaty' ? -1 : 1) || M.byId.get(b.a)!.w - M.byId.get(a.a)!.w), [M, visE]);
  const hot = hoverEdge || pinned;

  const caption: string[] = [];
  if (bloc) caption.push(members.size ? t('nw.members', { name: L(bloc), n: members.size, of: bloc.members.length }) : t('nw.noMembers', { name: L(bloc) }));
  if (selection?.kind === 'country' && !M.byId.has(selection.id)) caption.push(t('nw.notIn', { name: name(selection.id) }));

  const count = (k: 'type' | 'kind', v: string) => M.edges.filter((e) => e[k] === v).length;
  const kinds = R.edgeKinds as Record<string, Named>;

  return (
    <div className="net">
      <div className="vw-filters">
        <div className="vw-fgroup">
          <span className="eyebrow" id="nw-gt">{t('nw.types')}</span>
          <div className="chips" role="group" aria-labelledby="nw-gt" data-g="type">
            {R.edgeTypes.map((ty) => (
              <button key={ty.id} className="chip" type="button" data-type={ty.id} aria-pressed={filters.relTypes.has(ty.id)}
                onClick={() => atlas.toggleInSet('relTypes', ty.id)}>
                <LineKey type={ty.id} kind="treaty" />{L(ty as Named)}<span className="n">{count('type', ty.id)}</span>
              </button>
            ))}
          </div>
        </div>
        <div className="vw-fgroup">
          <span className="eyebrow" id="nw-gk">{t('nw.kinds')}</span>
          <div className="chips" role="group" aria-labelledby="nw-gk" data-g="kind">
            {(['treaty', 'assessed'] as const).map((k) => (
              <button key={k} className="chip" type="button" data-kind={k} aria-pressed={filters.relKinds.has(k)} data-tip={esc(L(kinds[k]))}
                onClick={() => atlas.toggleInSet('relKinds', k)}>
                <LineKey type={null} kind={k} />{t('nw.' + k)}<span className="n">{count('kind', k)}</span>
              </button>
            ))}
          </div>
        </div>
        <div className="vw-fgroup">
          <span className="eyebrow" id="nw-gb">{t('nw.blocs')}</span>
          <div className="chips" role="group" aria-labelledby="nw-gb" data-g="bloc">
            {R.blocs.map((b) => (
              <button key={b.id} className="chip" type="button" data-bloc={b.id} aria-pressed={filters.bloc === b.id}
                data-tip={b.note ? esc(L(b.note)) : undefined}
                onClick={() => atlas.setFilter('bloc', atlas.get().filters.bloc === b.id ? null : b.id)}>
                {L(b)}
              </button>
            ))}
          </div>
        </div>
      </div>
      <div className="net-main">
        <div className="net-col">
          <div className="net-chart" ref={chartRef}>
            <svg ref={svgRef} className="net-svg" role="group" aria-label={t('nw.chart', { n: M.edges.length, m: M.nodes.length })}>
              <path className="net-hull" /><g className="net-edges" /><g className="net-ehits" /><g className="net-nodes" /><g className="net-labels" aria-hidden="true" />
            </svg>
            <div className="net-tools">
              {([['in', 'plus'], ['out', 'minus'], ['fit', 'home']] as const).map(([z, ic]) => (
                <button key={z} className="btn icon" type="button" data-z={z} aria-label={t('nw.' + z)} data-tip={esc(t('nw.' + z))}
                  onClick={() => graph.current?.tool(z)}>
                  <Icon name={ic} size={16} />
                </button>
              ))}
            </div>
          </div>
          <p className="net-caption" hidden={!caption.length}>{caption.join(' ')}</p>
          <ul className="vw-legend net-legend">
            <li><LineKey type={null} kind="treaty" />{t('nw.treaty')}</li>
            <li><LineKey type={null} kind="assessed" />{t('nw.assessed')}</li>
            <li><LineKey type={null} kind="assessed" contested />{t('nw.contested')}</li>
            <li>
              <svg className="lk" width="22" height="10" aria-hidden="true">
                <line x1="2" y1="3" x2="20" y2="3" style={{ stroke: 'var(--fg-2)' }} strokeWidth="1.5" />
                <line x1="2" y1="8" x2="20" y2="8" style={{ stroke: 'var(--fg-2)' }} strokeWidth="2.9" />
              </svg>
              {t('nw.width')}
            </li>
            <li>
              <svg className="lk" width="22" height="14" aria-hidden="true">
                <circle cx="5" cy="9" r="3" style={{ fill: 'var(--fg-3)' }} /><circle cx="15" cy="7" r="6" style={{ fill: 'var(--fg-3)' }} />
              </svg>
              {t('nw.size')}
            </li>
          </ul>
          <p className="vw-note">{t('nw.hint')}</p>
        </div>
        <section className="net-side" aria-labelledby="nw-list-h">
          <h3 className="vw-h3" id="nw-list-h">{t('nw.strongest')} <span className="n">{rows.length}</span></h3>
          <ol className="net-list scroll" ref={listRef}
            onPointerOver={(e) => {
              const id = (e.target as Element).closest?.('.net-li')?.getAttribute('data-edge') || null;
              if (id !== hoverEdge) setHoverEdge(id);
            }}
            onPointerLeave={() => setHoverEdge(null)}>
            {rows.length ? rows.map((e) => <TieRow key={e.id} e={e} open={e.id === pinned} hot={e.id === hot} name={name} typeName={typeName}
              onToggle={() => pin(pinned === e.id ? null : e.id)} />)
              : <li className="empty">{t('nw.empty')}</li>}
          </ol>
        </section>
      </div>
    </div>
  );
}

function TieRow({ e, open, hot, name, typeName, onToggle }: {
  e: NetEdge; open: boolean; hot: boolean; name: (iso: string) => string; typeName: (id: string) => string; onToggle: () => void;
}) {
  const { t, pick } = useT();
  const cls = `net-li${open ? ' is-open' : ''}${hot ? ' is-hot' : ''}`;
  return (
    <li className={cls} data-edge={e.id}>
      <button className="net-row" type="button" aria-expanded={open} aria-controls={`nw-${e.id}`} onClick={onToggle}>
        <LineKey type={e.type} kind={e.kind} contested={!!e.contested} />
        <span className="net-row-n">{name(e.a)}<span className="net-sep" aria-hidden="true"> — </span>{name(e.b)}</span>
        <span className="net-row-w"><Pips n={e.weight} of={5} color="var(--fg-2)" /><span className="vh">{t('nw.weight', { n: e.weight })}</span></span>
      </button>
      <div className="net-more" id={`nw-${e.id}`} hidden={!open}>
        <p className="net-more-k">{typeName(e.type)} · {t('nw.' + e.kind)}{e.contested ? ` · ${t('nw.contested')}` : ''}</p>
        <p>{pick(e as Named)}</p>
        <div className="net-more-a">
          <button className="btn" type="button" data-sel={e.a} onClick={() => atlas.select('country', e.a)}>{name(e.a)}</button>
          <button className="btn" type="button" data-sel={e.b} onClick={() => atlas.select('country', e.b)}>{name(e.b)}</button>
          <button className="btn ghost" type="button" data-cmp={`${e.a}|${e.b}`} onClick={() => atlas.set({ compare: [e.a, e.b], view: 'compare' })}>
            <Icon name="compare" size={15} />{t('nw.compare')}
          </button>
        </div>
      </div>
    </li>
  );
}
