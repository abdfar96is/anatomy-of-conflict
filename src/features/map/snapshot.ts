// Saving the map as an image: the two map canvases as they stand, over a footer with the lens and the date, the key
// as the lens card shows it (read off the card, so it matches whatever the reader has filtered), the sources with
// their licences, and the link that reopens this view. The browser saves it as a PNG.

import type { Lang } from '../../i18n/format';

/** One entry of the key: a mark (pictures of the card's own glyphs, a swatch or a ramp) and its label. */
interface KeyItem {
  label: string;
  marks: (HTMLImageElement | { sw: string; hatch?: string; round: boolean })[];
  ramp?: string[];
}
export interface SnapshotText {
  lang: Lang;
  /** The app's name and the lens title, the lens subtitle, the date line. */
  app: string; title: string; sub: string; when: string;
  /** "Sources:" and the source lines (publisher and licence, one per dataset), and the link back. */
  sourcesLabel: string; sources: string[]; link: string;
}

const PAD = 16, KEY_H = 20, KEY_GAP = 14, MARK = 16;
const css = (name: string, el: Element = document.documentElement) => getComputedStyle(el).getPropertyValue(name).trim();
const clear = (c: string) => !c || c === 'transparent' || /rgba\([^)]*,\s*0\)$/.test(c);

// ---- reading the key off the lens card

/** The SVG with every computed paint written inline, so it draws the same as a standalone image. */
function svgImage(svg: SVGSVGElement): Promise<HTMLImageElement | null> {
  const clone = svg.cloneNode(true) as SVGSVGElement;
  const src = [svg, ...svg.querySelectorAll('*')], dst = [clone, ...clone.querySelectorAll('*')];
  src.forEach((el, i) => {
    const cs = getComputedStyle(el), d = dst[i] as SVGElement;
    for (const p of ['fill', 'stroke', 'stroke-width', 'stroke-dasharray', 'stroke-linecap', 'stroke-linejoin', 'opacity']) {
      const v = cs.getPropertyValue(p);
      if (v) d.style.setProperty(p, v);
    }
  });
  clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  const img = new Image(svg.width.baseVal.value || MARK, svg.height.baseVal.value || MARK);
  img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(new XMLSerializer().serializeToString(clone));
  return typeof img.decode === 'function' ? img.decode().then(() => img, () => null) : Promise.resolve(null);
}

async function marksOf(lead: Element | null): Promise<KeyItem['marks']> {
  if (!lead || lead.classList.contains('ic')) return [];
  if (lead instanceof SVGSVGElement) { const img = await svgImage(lead); return img ? [img] : []; }
  const svgs = [...lead.querySelectorAll('svg')];
  if (svgs.length) return (await Promise.all(svgs.map(svgImage))).filter((x): x is HTMLImageElement => !!x);
  const cs = getComputedStyle(lead);
  const bg = !clear(cs.backgroundColor) ? cs.backgroundColor : !clear(cs.borderTopColor) && parseFloat(cs.borderTopWidth) > 0 ? cs.borderTopColor : '';
  const hatch = lead.classList.contains('sw-hatch') || lead.classList.contains('sw-overhatch') ? css('--hatch', lead) : undefined;
  if (!bg && !hatch) return [];
  return [{ sw: bg, hatch, round: parseFloat(cs.borderTopLeftRadius) >= 6 || lead.classList.contains('sw-round') }];
}

/**
 * The key as the card shows it: the pressed chips (with a mark: the filters drawn; without: the modes, as
 * "section: value"), the key rows and the ramps, in card order. The In view list and the notes are not part of it.
 */
export async function readKey(card: Element | null): Promise<{ items: KeyItem[]; modes: string[] }> {
  const items: KeyItem[] = [], modes: string[] = [];
  if (!card) return { items, modes };
  for (const el of card.querySelectorAll('.chip[aria-pressed="true"], .lc-keys li, .lc-ramp')) {
    if (el.closest('.iv-tabs, .iv, .lc-about, .iv-empty')) continue;
    if (el.classList.contains('lc-ramp')) {
      const stops = (getComputedStyle(el.querySelector('.ramp') ?? el).backgroundImage.match(/(rgba?|color|oklab|oklch|lab|lch|hsla?)\([^)]*\)|#[0-9a-f]{3,8}\b/gi) ?? []);
      const ends = [...el.querySelectorAll('.ramp-ends .num')].map((x) => x.textContent ?? '');
      const label = el.getAttribute('aria-label') || ends.join(' – ');
      // the card runs low → high along the reading direction; the stops come in that order already
      if (stops.length > 1) items.push({ label, marks: [], ramp: stops });
      continue;
    }
    if (el.classList.contains('chip')) {
      const label = el.querySelector(':scope > span:not(.n):not(.sw)')?.textContent?.trim() ?? '';
      const lead = el.firstElementChild && !el.firstElementChild.matches('span:not(.sw):not(.sizes):not(.weights)') ? el.firstElementChild : null;
      const marks = await marksOf(lead);
      if (marks.length) items.push({ label, marks });
      else if (label) {
        const sec = el.closest('.lc-sec')?.querySelector('.lc-label')?.textContent?.trim();
        modes.push(sec ? `${sec}: ${label}` : label);
      }
      continue;
    }
    const label = el.querySelector('.k-l')?.textContent?.trim() ?? '';
    const marks = await marksOf(el.firstElementChild && !el.firstElementChild.classList.contains('k-l') ? el.firstElementChild : null);
    if (label) items.push({ label, marks });
  }
  return { items, modes };
}

// ---- drawing

/** Words that fit `width`, line by line (breaking at spaces; a single long word keeps its own line). */
function wrap(ctx: CanvasRenderingContext2D, text: string, width: number): string[] {
  const out: string[] = [];
  let line = '';
  for (const w of text.split(/\s+/).filter(Boolean)) {
    const next = line ? `${line} ${w}` : w;
    if (line && ctx.measureText(next).width > width) { out.push(line); line = w; } else line = next;
  }
  if (line) out.push(line);
  return out;
}

/**
 * The map with its footer, as a PNG. `canvases` are the map layers in drawing order (same size); the footer is laid
 * out in CSS pixels and drawn at the canvases' pixel ratio.
 */
export async function snapshot(canvases: HTMLCanvasElement[], cssWidth: number, text: SnapshotText, key: { items: KeyItem[]; modes: string[] }): Promise<Blob | null> {
  const base = canvases[0];
  if (!base) return null;
  const s = base.width / cssWidth, W = cssWidth, rtl = text.lang === 'ar';
  const fontUi = css('--font-ui') || 'sans-serif', fontDisplay = css('--font-display') || fontUi;
  const ink = css('--fg') || '#fff', ink2 = css('--fg-2') || ink, ink3 = css('--fg-3') || ink2;
  const surface = css('--surface') || '#000', line = css('--line') || ink3;

  // lay the footer out first (measuring), then draw it
  const probe = document.createElement('canvas').getContext('2d')!;
  probe.direction = rtl ? 'rtl' : 'ltr';
  type Op = (ctx: CanvasRenderingContext2D) => void;
  const ops: Op[] = [];
  const x = (lx: number, w: number) => (rtl ? W - lx - w : lx);
  let y = PAD;
  const textRow = (str: string, font: string, color: string, size: number, lh = size * 1.45) => {
    probe.font = font;
    for (const l of wrap(probe, str, W - 2 * PAD)) {
      const w = probe.measureText(l).width, yy = y + size;
      ops.push((ctx) => { ctx.font = font; ctx.fillStyle = color; ctx.fillText(l, x(PAD, w), yy); });
      y += lh;
    }
  };
  textRow(`${text.app} · ${text.title}`, `600 18px ${fontDisplay}`, ink, 18, 26);
  textRow([text.sub, text.when].filter(Boolean).join(' · '), `400 13px ${fontUi}`, ink2, 13);
  if (key.modes.length) textRow(key.modes.join(' · '), `400 12px ${fontUi}`, ink2, 12);
  if (key.items.length) {
    y += 6;
    const font = `400 12px ${fontUi}`;
    probe.font = font;
    let lx = PAD;
    for (const it of key.items) {
      const markW = it.ramp ? 72 : it.marks.reduce((a, m) => a + ('sw' in m ? 12 : m.width) + 2, 0);
      const labelW = probe.measureText(it.label).width;
      const w = markW + (markW ? 6 : 0) + labelW;
      if (lx > PAD && lx + w > W - PAD) { lx = PAD; y += KEY_H; }
      const top = y, start = lx;
      ops.push((ctx) => {
        let mx = start;
        const cy = top + KEY_H / 2;
        if (it.ramp) {
          const gx = x(mx, 72);
          const g = ctx.createLinearGradient(rtl ? gx + 72 : gx, 0, rtl ? gx : gx + 72, 0);
          it.ramp.forEach((c, i) => g.addColorStop(i / (it.ramp!.length - 1), c));
          ctx.fillStyle = g;
          ctx.beginPath(); ctx.roundRect(gx, cy - 4, 72, 8, 4); ctx.fill();
          mx += 72;
        }
        for (const m of it.marks) {
          if ('sw' in m) {
            const sx = x(mx, 12);
            ctx.beginPath();
            if (m.round) ctx.arc(sx + 6, cy, 6, 0, 2 * Math.PI); else ctx.roundRect(sx, cy - 6, 12, 12, 3);
            if (m.sw) { ctx.fillStyle = m.sw; ctx.fill(); }
            if (m.hatch) {
              ctx.save(); ctx.clip(); ctx.strokeStyle = m.hatch; ctx.lineWidth = 1.2;
              for (let d = -12; d < 24; d += 4) { ctx.beginPath(); ctx.moveTo(sx + d, cy + 6); ctx.lineTo(sx + d + 12, cy - 6); ctx.stroke(); }
              ctx.restore();
            }
            mx += 14;
          } else {
            ctx.drawImage(m, x(mx, m.width), cy - m.height / 2, m.width, m.height);
            mx += m.width + 2;
          }
        }
        ctx.font = font; ctx.fillStyle = ink2;
        ctx.fillText(it.label, x(start + markW + (markW ? 6 : 0), labelW), cy + 4);
      });
      lx += w + KEY_GAP;
    }
    y += KEY_H + 6;
  }
  y += 4;
  const sepY = y;
  y += 8;
  textRow(`${text.sourcesLabel} ${text.sources.join(' · ')}`, `400 11px ${fontUi}`, ink3, 11);
  textRow(text.link, `400 11px ${fontUi}`, ink3, 11);
  const footH = Math.ceil(y + PAD - 6);

  const mapH = base.height / s;
  const out = document.createElement('canvas');
  out.width = base.width;
  out.height = Math.round((mapH + footH) * s);
  const ctx = out.getContext('2d');
  if (!ctx) return null;
  for (const c of canvases) ctx.drawImage(c, 0, 0);
  ctx.setTransform(s, 0, 0, s, 0, mapH * s);
  ctx.direction = rtl ? 'rtl' : 'ltr';
  ctx.textAlign = 'left';
  ctx.fillStyle = surface;
  ctx.fillRect(0, 0, W, footH);
  ctx.fillStyle = line;
  ctx.fillRect(0, 0, W, 1);
  ctx.fillRect(PAD, sepY, W - 2 * PAD, 1);
  for (const op of ops) op(ctx);
  return new Promise((res) => out.toBlob(res, 'image/png'));
}

/** Hand the image to the browser as a download. */
export function download(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}
