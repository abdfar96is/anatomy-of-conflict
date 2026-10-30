// Shared small charts as HTML/SVG strings. Colors are CSS custom properties or values from palette.js.
// Every mark carries data-tip so the global tooltip explains it; text uses ink tokens, never series colors.

import { esc } from './ui.js';
import { fmtNum, fmtPct } from './i18n.js';

/**
 * Donut. parts: [{label, value, color}] (value in %, or any unit summing to `total`).
 * opts: {size=132, thickness=16, total=sum, center:'html', sub:'html'}
 */
export function donut(parts, opts = {}) {
  const size = opts.size ?? 132, th = opts.thickness ?? 16, r = size / 2 - 2, ir = r - th;
  const total = opts.total ?? parts.reduce((s, p) => s + p.value, 0);
  const arc = d3.arc().innerRadius(ir).outerRadius(r).padAngle(parts.length > 1 ? 0.018 : 0).cornerRadius(2);
  let a0 = 0;
  const paths = parts.filter((p) => p.value > 0).map((p) => {
    const a1 = a0 + (p.value / total) * Math.PI * 2;
    const d = arc({ startAngle: a0, endAngle: a1 });
    a0 = a1;
    return `<path d="${d}" fill="${p.color}" data-tip="${esc(`<b>${esc(p.label)}</b> ${fmtPct(p.value)}`)}" tabindex="-1"></path>`;
  });
  const rest = total - parts.reduce((s, p) => s + p.value, 0);
  if (rest > 0.5) {
    const d = arc({ startAngle: a0, endAngle: Math.PI * 2 });
    paths.push(`<path d="${d}" fill="var(--chart-rest)"></path>`);
  }
  return `<figure class="donut" style="--size:${size}px">
    <svg viewBox="${-size / 2} ${-size / 2} ${size} ${size}" width="${size}" height="${size}" role="img" aria-label="${esc(opts.label || '')}">${paths.join('')}</svg>
    ${opts.center ? `<figcaption class="donut-c"><b>${opts.center}</b>${opts.sub ? `<span>${opts.sub}</span>` : ''}</figcaption>` : ''}
  </figure>`;
}

/**
 * Horizontal bar list. rows: [{label, value, color?, valueLabel?, tip?, attrs?}]
 * opts: {max (default = largest value), unit:'%'|'' , swatch:true}
 */
export function barList(rows, opts = {}) {
  const max = opts.max ?? Math.max(1e-9, ...rows.map((r) => r.value));
  return `<ul class="barlist" role="list">${rows.map((r) => {
    const w = Math.max(0, Math.min(100, (r.value / max) * 100));
    const vl = r.valueLabel ?? (opts.unit === '%' ? fmtPct(r.value, r.value < 10 ? 1 : 0) : fmtNum(r.value));
    return `<li class="barlist-row" ${r.attrs || ''} ${r.tip ? `data-tip="${esc(r.tip)}"` : ''}>
      <span class="barlist-label">${opts.swatch !== false && r.color ? `<i class="sw" style="background:${r.color}"></i>` : ''}${esc(r.label)}</span>
      <span class="barlist-track"><span class="barlist-bar" style="width:${w}%;background:${r.color || 'var(--accent)'}"></span></span>
      <span class="barlist-val">${vl}</span>
    </li>`;
  }).join('')}</ul>`;
}

/** One 100% stacked bar with 2px surface gaps. parts: [{label, value, color}] */
export function stackBar(parts, opts = {}) {
  const total = (opts.total ?? parts.reduce((s, p) => s + p.value, 0)) || 1;
  return `<div class="stackbar" role="img" aria-label="${esc(opts.label || '')}" style="height:${opts.height ?? 10}px">${parts.filter((p) => p.value > 0).map((p) =>
    `<span style="flex:${p.value / total};background:${p.color}" data-tip="${esc(`<b>${esc(p.label)}</b> ${fmtPct(p.value)}`)}"></span>`).join('')}</div>`;
}

/**
 * Column histogram (e.g. events per decade). bins: [{x, value, label}]; opts: {w=280, h=56, highlight:x, color}
 */
export function histogram(bins, opts = {}) {
  const w = opts.w ?? 280, hgt = opts.h ?? 56, n = bins.length || 1;
  const max = Math.max(1, ...bins.map((b) => b.value));
  const bw = w / n;
  const bars = bins.map((b, i) => {
    const bh = Math.max(b.value ? 2 : 0, (b.value / max) * (hgt - 4));
    const on = opts.highlight != null && b.x === opts.highlight;
    return `<rect x="${(i * bw + 1).toFixed(1)}" y="${(hgt - bh).toFixed(1)}" width="${Math.max(1, bw - 2).toFixed(1)}" height="${bh.toFixed(1)}" rx="1.5"
      fill="${on ? 'var(--accent)' : opts.color || 'var(--chart-bar)'}" data-tip="${esc(b.label ?? `${b.x}: ${b.value}`)}"></rect>`;
  }).join('');
  return `<svg class="histo" viewBox="0 0 ${w} ${hgt}" width="100%" height="${hgt}" preserveAspectRatio="none" role="img" aria-label="${esc(opts.label || '')}">
    <line x1="0" x2="${w}" y1="${hgt - 0.5}" y2="${hgt - 0.5}" stroke="var(--chart-axis)" stroke-width="1"></line>${bars}</svg>`;
}

/** Severity meter: n filled pips of `of`, colored by the severity token. */
export function pips(n, of, color) {
  return `<span class="pips" aria-hidden="true">${Array.from({ length: of }, (_, i) =>
    `<i style="${i < n ? `background:${color}` : ''}"></i>`).join('')}</span>`;
}
