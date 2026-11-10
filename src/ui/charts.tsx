// Shared small charts (React port of v2 charts.js). Colours are CSS custom properties or values from palette.ts.
// Every mark carries data-tip (HTML for the global tooltip, data escaped); text uses ink tokens, never series colours.

import * as d3 from 'd3';
import type { HTMLAttributes, ReactNode } from 'react';
import { useT } from '../app/useT';
import { esc } from './dom';

export interface Part { label: string; value: number; color: string }

/** Donut. Values in %, or any unit summing to `total`. */
export function Donut({ parts, size = 132, thickness = 16, total, center, sub, label = '' }: {
  parts: Part[]; size?: number; thickness?: number; total?: number; center?: ReactNode; sub?: ReactNode; label?: string;
}) {
  const { fmt } = useT();
  const r = size / 2 - 2, ir = r - thickness;
  const sum = parts.reduce((s, p) => s + p.value, 0);
  const whole = total ?? sum;
  const arc = d3.arc<{ startAngle: number; endAngle: number }>().innerRadius(ir).outerRadius(r).padAngle(parts.length > 1 ? 0.018 : 0).cornerRadius(2);
  const shown = parts.filter((p) => p.value > 0);
  const ends = shown.reduce<number[]>((acc, p) => [...acc, (acc.at(-1) ?? 0) + (p.value / whole) * Math.PI * 2], []);
  const arcs = shown.map((p, i) => ({ p, d: arc({ startAngle: ends[i - 1] ?? 0, endAngle: ends[i] ?? 0 }) ?? '' }));
  const rest = whole - sum > 0.5 ? arc({ startAngle: ends.at(-1) ?? 0, endAngle: Math.PI * 2 }) ?? '' : null;
  return (
    <figure className="donut" style={{ '--size': `${size}px` } as React.CSSProperties}>
      <svg viewBox={`${-size / 2} ${-size / 2} ${size} ${size}`} width={size} height={size} role="img" aria-label={label}>
        {arcs.map(({ p, d }, i) => (
          <path key={i} d={d} fill={p.color} data-tip={`<b>${esc(p.label)}</b> ${fmt.pct(p.value)}`} tabIndex={-1} />
        ))}
        {rest !== null && <path d={rest} fill="var(--chart-rest)" />}
      </svg>
      {center != null && <figcaption className="donut-c"><b>{center}</b>{sub != null && <span>{sub}</span>}</figcaption>}
    </figure>
  );
}

export interface BarRow {
  label: ReactNode; value: number; color?: string; valueLabel?: ReactNode; tip?: string; rowProps?: HTMLAttributes<HTMLLIElement>;
}

/** Horizontal bar list. `max` defaults to the largest value; `tip` is tooltip HTML (escape data in it). */
export function BarList({ rows, max, unit = '', swatch = true }: { rows: BarRow[]; max?: number; unit?: '%' | ''; swatch?: boolean }) {
  const { fmt } = useT();
  const top = max ?? Math.max(1e-9, ...rows.map((r) => r.value));
  return (
    <ul className="barlist" role="list">
      {rows.map((r, i) => {
        const w = Math.max(0, Math.min(100, (r.value / top) * 100));
        const vl = r.valueLabel ?? (unit === '%' ? fmt.pct(r.value, r.value < 10 ? 1 : 0) : fmt.num(r.value));
        return (
          <li key={i} className="barlist-row" data-tip={r.tip} {...r.rowProps}>
            <span className="barlist-label">{swatch && r.color && <i className="sw" style={{ background: r.color }} />}{r.label}</span>
            <span className="barlist-track"><span className="barlist-bar" style={{ width: `${w}%`, background: r.color || 'var(--accent)' }} /></span>
            <span className="barlist-val">{vl}</span>
          </li>
        );
      })}
    </ul>
  );
}

/** One 100% stacked bar with 2px surface gaps. */
export function StackBar({ parts, total, height = 10, label = '' }: { parts: Part[]; total?: number; height?: number; label?: string }) {
  const { fmt } = useT();
  const whole = (total ?? parts.reduce((s, p) => s + p.value, 0)) || 1;
  return (
    <div className="stackbar" role="img" aria-label={label} style={{ height }}>
      {parts.filter((p) => p.value > 0).map((p, i) => (
        <span key={i} style={{ flex: p.value / whole, background: p.color }} data-tip={`<b>${esc(p.label)}</b> ${fmt.pct(p.value)}`} />
      ))}
    </div>
  );
}

/** Column histogram (e.g. events per decade). `label` on a bin is tooltip HTML; the default is "x: value". */
export function Histogram({ bins, w = 280, h = 56, highlight, color, label = '' }: {
  bins: { x: number | string; value: number; label?: string }[]; w?: number; h?: number; highlight?: number | string; color?: string; label?: string;
}) {
  const n = bins.length || 1;
  const max = Math.max(1, ...bins.map((b) => b.value));
  const bw = w / n;
  return (
    <svg className="histo" viewBox={`0 0 ${w} ${h}`} width="100%" height={h} preserveAspectRatio="none" role="img" aria-label={label}>
      <line x1="0" x2={w} y1={h - 0.5} y2={h - 0.5} stroke="var(--chart-axis)" strokeWidth="1" />
      {bins.map((b, i) => {
        const bh = Math.max(b.value ? 2 : 0, (b.value / max) * (h - 4));
        const on = highlight != null && b.x === highlight;
        return (
          <rect key={i} x={(i * bw + 1).toFixed(1)} y={(h - bh).toFixed(1)} width={Math.max(1, bw - 2).toFixed(1)} height={bh.toFixed(1)} rx="1.5"
            fill={on ? 'var(--accent)' : color || 'var(--chart-bar)'} data-tip={b.label ?? esc(`${b.x}: ${b.value}`)} />
        );
      })}
    </svg>
  );
}

/** Severity meter: n filled pips of `of`, coloured by the severity token. */
export function Pips({ n, of, color }: { n: number; of: number; color: string }) {
  return (
    <span className="pips" aria-hidden="true">
      {Array.from({ length: of }, (_, i) => <i key={i} style={i < n ? { background: color } : undefined} />)}
    </span>
  );
}
