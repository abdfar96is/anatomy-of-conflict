// Pictograms for resource sites: one definition drawn on the map canvas (as Path2D) and in HTML (as SVG), so the key
// always matches the map. Each pictogram is a few layers of SVG path data in a 14 × 14 box centred on 0 (drawn at
// radius 6). Fills and strokes are literal colours or the tokens `base`, `dark` and `light`, which resolve against the
// marker's colour (its own shade, darker for outlines, lighter for highlights).

import type { Bi } from '../i18n/format';

export interface PictoLayer {
  d: string;
  fill?: string;
  stroke?: string;
  /** Stroke width in pictogram units. */
  width?: number;
  /** An SVG/DOMMatrix transform [a, b, c, d, e, f] applied to this layer. */
  t?: [number, number, number, number, number, number];
}

const DROP = 'M0-6.2C2.6-2.6 4.6-.4 4.6 1.9 4.6 4.5 2.5 6 0 6S-4.6 4.5-4.6 1.9C-4.6-.4-2.6-2.6 0-6.2Z';
const FLAME = 'M1-6.5C2.75-3.75 5-1.25 4.25 2 3.6 4.75 1.5 5.5 0 5.5-1.75 5.5-4.1 4.4-4.25 1.75-4.4-.25-3-1.75-2.25-3.5-1.75-1.75-1-1.25-.25-1.75.75-3 1.25-4.5 1-6.5Z';
const GEM = 'M-5.6-1.8L-3-5H3L5.6-1.8 0 6Z';
const bar = (cx: number, yb: number, yt: number) => `M${cx - 3} ${yb}L${cx - 2.2} ${yt}H${cx + 2.2}L${cx + 3} ${yb}Z`;
const ROT30: PictoLayer['t'] = [0.866, 0.5, -0.5, 0.866, 0, 0];
/** Rotation by `deg` about (px, py), as a PictoLayer transform. */
const rot = (deg: number, px = 0, py = 0): PictoLayer['t'] => {
  const c = Math.cos((deg * Math.PI) / 180), s = Math.sin((deg * Math.PI) / 180);
  return [+c.toFixed(4), +s.toFixed(4), +(-s).toFixed(4), +c.toFixed(4), +(px - c * px + s * py).toFixed(4), +(py - s * px - c * py).toFixed(4)];
};
/** Eight rays round a disc: thin triangles from radius 4 to 6.4. */
const SUN_RAYS = Array.from({ length: 8 }, (_, i) => {
  const a = (i * Math.PI) / 4, ca = Math.cos(a), sa = Math.sin(a), w = 0.95;
  const p = (r: number, o: number) => `${(ca * r - sa * o).toFixed(2)} ${(sa * r + ca * o).toFixed(2)}`;
  return `M${p(4, -w)}L${p(6.5, 0)}L${p(4, w)}Z`;
}).join('');
const BLADE = 'M0-1C1-2.6.8-4.8 0-6.6-.8-4.8-1-2.6 0-1Z';
const ORBIT = 'M-5.4 0a5.4 2 0 1 0 10.8 0a5.4 2 0 1 0-10.8 0Z';

export const PICTO: Record<string, PictoLayer[]> = {
  // oil: a barrel with two hoops and its lid
  barrel: [
    { d: 'M-3.7-5.7Q-5.2 0-3.7 5.7H3.7Q5.2 0 3.7-5.7Z', fill: 'base', stroke: 'dark', width: 0.8 },
    { d: 'M-4.7-2.3H4.7M-4.7 2.3H4.7', stroke: 'dark', width: 1.1 },
    { d: 'M-3.7-5.7a3.7 1.2 0 1 0 7.4 0a3.7 1.2 0 1 0-7.4 0Z', fill: 'light', stroke: 'dark', width: 0.7 },
  ],
  // gas: a flame whose tip leans over, with a second tongue so it never reads as a drop; a hotter core inside
  flame: [
    { d: FLAME, fill: 'base', stroke: 'dark', width: 0.8 },
    { d: FLAME, fill: 'light', t: [0.5, 0, 0, 0.5, 0, 2.6] },
  ],
  // coal: a pile of lumps
  coal: [
    { d: 'M-6 5.4L-4.6.8-1 -.6 1.2 2.4.4 5.4ZM.4 5.4L1.4 1.2 4-.6 6.2 2.6 5.4 5.4ZM-2.8.2L-1.2-3.6 2-4.2 3.2-1.2 1.2.6Z', fill: 'base', stroke: 'light', width: 0.7 },
  ],
  // uranium: the radiation trefoil on yellow
  radiation: [
    { d: 'M-6 0a6 6 0 1 0 12 0a6 6 0 1 0-12 0Z', fill: '#f5c518', stroke: '#3a3000', width: 0.6 },
    { d: 'M-.95-1.65L-2.6-4.5A5.2 5.2 0 0 1 2.6-4.5L.95-1.65A1.9 1.9 0 0 0-.95-1.65ZM1.9 0L5.2 0A5.2 5.2 0 0 1 2.6 4.5L.95 1.65A1.9 1.9 0 0 0 1.9 0ZM-.95 1.65L-2.6 4.5A5.2 5.2 0 0 1-5.2 0L-1.9 0A1.9 1.9 0 0 0-.95 1.65Z', fill: '#1d1d1d' },
    { d: 'M-1.1 0a1.1 1.1 0 1 0 2.2 0a1.1 1.1 0 1 0-2.2 0Z', fill: '#1d1d1d' },
  ],
  // hydropower: a water drop with a lightning bolt
  hydro: [
    { d: DROP, fill: 'base', stroke: 'dark', width: 0.8 },
    { d: 'M.9-1.8L-1.8 2.2H.2L-.9 5 2 .8H0Z', fill: '#ffd23f', stroke: '#6b5200', width: 0.4 },
  ],
  // geothermal: a hot spring, steam rising from a basin
  geothermal: [
    { d: 'M-5.8 1.8Q0 7.4 5.8 1.8Z', fill: 'base', stroke: 'dark', width: 0.8 },
    { d: 'M-2.6.6c-1.3-1.5 1.1-2.6-.2-4.6M0 .6c-1.3-1.5 1.1-2.6-.2-4.6M2.6.6c-1.3-1.5 1.1-2.6-.2-4.6', stroke: 'base', width: 1.3 },
  ],
  // battery metals: a battery, charged
  battery: [
    { d: 'M-3.6-4.6H3.6V6H-3.6ZM-1.5-6.2H1.5V-4.6H-1.5Z', fill: '#e9eef1', stroke: '#33424d', width: 0.8 },
    { d: 'M-2.4-.6H2.4V4.8H-2.4Z', fill: 'base' },
    { d: 'M-2.4-3.4H2.4V-1.6H-2.4Z', fill: 'base', },
  ],
  // rare earths: a horseshoe magnet (most of them end up in permanent magnets)
  magnet: [
    { d: 'M-5.4-5.4H-2.2V.8A2.2 2.2 0 0 0 2.2.8V-5.4H5.4V.8A5.4 5.4 0 0 1-5.4.8Z', fill: 'base', stroke: 'dark', width: 0.7 },
    { d: 'M-5.4-5.4H-2.2V-2.8H-5.4ZM2.2-5.4H5.4V-2.8H2.2Z', fill: '#dfe6ea', stroke: 'dark', width: 0.7 },
  ],
  // base metals: an ingot seen from above the front
  ingot: [
    { d: 'M-6.2 4.6L-4.8-.2H4.8L6.2 4.6Z', fill: 'base', stroke: 'dark', width: 0.8 },
    { d: 'M-4.8-.2L-3.4-3.8H3.4L4.8-.2Z', fill: 'light', stroke: 'dark', width: 0.8 },
  ],
  // precious metals: stacked bars
  bars: [
    { d: `${bar(-3.1, 5.8, 2.8)}${bar(3.1, 5.8, 2.8)}${bar(0, 2.6, -0.4)}`, fill: 'base', stroke: 'dark', width: 0.7 },
    { d: 'M-4.6 3.6H-1.6M1.6 3.6H4.6M-1.5.4H1.5', stroke: 'light', width: 0.8 },
  ],
  // diamonds and other gems: a cut stone with its facets
  gem: [
    { d: GEM, fill: 'base', stroke: 'dark', width: 0.8 },
    { d: 'M-5.6-1.8H5.6M-3-5L-1.4-1.8 0 6M3-5L1.4-1.8 0 6M-1.4-1.8L0-5 1.4-1.8', stroke: 'dark', width: 0.6 },
    { d: 'M-3-5L-1.4-1.8H-5.6Z', fill: 'light' },
  ],
  // water: a drop with a highlight
  drop: [
    { d: DROP, fill: 'base', stroke: 'dark', width: 0.8 },
    { d: 'M-2.6 2.2C-2.6 3.6-1.6 4.4-.4 4.6', stroke: 'light', width: 1 },
  ],
  // coffee: a bean
  bean: [
    { d: 'M-4 0a4 5.6 0 1 0 8 0a4 5.6 0 1 0-8 0Z', fill: 'base', stroke: 'dark', width: 0.8, t: ROT30 },
    { d: 'M0-4.8C-1.7-2 1.7 2 0 4.8', stroke: 'dark', width: 1, t: ROT30 },
  ],
  // fertilisers: a tied sack
  sack: [
    { d: 'M-4.4-3.6Q-3.2-5.6 0-5.1 3.2-5.6 4.4-3.6L5.4 4.6Q0 6.8-5.4 4.6Z', fill: 'base', stroke: 'dark', width: 0.8 },
    { d: 'M-2.6-4.2H2.6', stroke: 'dark', width: 1.1 },
    { d: 'M-1.6 1.6a1.6 1.6 0 1 0 3.2 0a1.6 1.6 0 1 0-3.2 0Z', fill: 'light' },
  ],
  // solar power: the sun, a disc with eight rays
  sun: [
    { d: SUN_RAYS, fill: 'base', stroke: 'dark', width: 0.5 },
    { d: 'M-3.3 0a3.3 3.3 0 1 0 6.6 0a3.3 3.3 0 1 0-6.6 0Z', fill: 'base', stroke: 'dark', width: 0.8 },
    { d: 'M-1.6-.6a1.4 1.4 0 1 0 2 0', stroke: 'light', width: 0.8 },
  ],
  // wind power: a three-bladed turbine on its mast
  turbine: [
    { d: 'M-.75 6.4L-.35-.6H.35L.75 6.4Z', fill: 'light', stroke: 'dark', width: 0.6 },
    { d: BLADE, fill: 'base', stroke: 'dark', width: 0.6 },
    { d: BLADE, fill: 'base', stroke: 'dark', width: 0.6, t: rot(120, 0, -1) },
    { d: BLADE, fill: 'base', stroke: 'dark', width: 0.6, t: rot(240, 0, -1) },
    { d: 'M-.9-1a.9.9 0 1 0 1.8 0a.9.9 0 1 0-1.8 0Z', fill: 'light', stroke: 'dark', width: 0.5 },
  ],
  // bioenergy: a leaf with its midrib
  leaf: [
    { d: 'M-4.8 5.4C-5.8-1.4-1.4-5.8 5.6-5.8 5.8 1.2 1.6 5.6-4.8 5.4Z', fill: 'base', stroke: 'dark', width: 0.8 },
    { d: 'M-4.8 5.4L3-3M-1.6 2.2L-1.2-1.4M.8-.4L3.2-.2', stroke: 'dark', width: 0.8 },
  ],
  // nuclear power: an atom, three orbits round its nucleus on a dark disc
  atom: [
    { d: 'M-6.2 0a6.2 6.2 0 1 0 12.4 0a6.2 6.2 0 1 0-12.4 0Z', fill: 'dark' },
    { d: ORBIT, stroke: 'light', width: 0.9 },
    { d: ORBIT, stroke: 'light', width: 0.9, t: rot(60) },
    { d: ORBIT, stroke: 'light', width: 0.9, t: rot(-60) },
    { d: 'M-1.5 0a1.5 1.5 0 1 0 3 0a1.5 1.5 0 1 0-3 0Z', fill: 'base', stroke: 'light', width: 0.5 },
  ],
  // iron ore mining: a pickaxe
  pickaxe: [
    { d: 'M-.75-3.4H.75V6.4H-.75Z', fill: 'light', stroke: 'dark', width: 0.6, t: rot(-30, 0, 0) },
    { d: 'M-6.2-1.2Q-.2-7.6 6.2-1.2L5.4-.2Q-.2-4.6-5.4-.2Z', fill: 'base', stroke: 'dark', width: 0.7, t: rot(-30, 0, 0) },
  ],
  // iron and steel: an I-beam seen end on
  beam: [
    { d: 'M-5.4-5.6H5.4V-3.4H1.2V3.4H5.4V5.6H-5.4V3.4H-1.2V-3.4H-5.4Z', fill: 'base', stroke: 'dark', width: 0.8 },
    { d: 'M-4.6-4.5H4.6', stroke: 'light', width: 0.7 },
  ],
  // cement: two silos, the taller with its domed top
  silo: [
    { d: 'M-5.4 6.2V-1.4Q-3.6-3.4-1.8-1.4V6.2Z', fill: 'base', stroke: 'dark', width: 0.7 },
    { d: 'M-1.2 6.2V-3.8Q1.6-6.8 4.4-3.8V6.2Z', fill: 'base', stroke: 'dark', width: 0.7 },
    { d: 'M-1.2 0H4.4M-1.2 3H4.4M-5.4 2.4H-1.8', stroke: 'dark', width: 0.6 },
  ],
  // chemicals: a conical flask with its liquid
  flask: [
    { d: 'M-1.7-6.2H1.7V-2.4L5.2 4.4Q5.9 6.2 4 6.2H-4Q-5.9 6.2-5.2 4.4L-1.7-2.4Z', fill: 'light', stroke: 'dark', width: 0.8 },
    { d: 'M-3.5 1.6H3.5L4.6 4.4Q5 5.4 4 5.4H-4Q-5 5.4-4.6 4.4Z', fill: 'base' },
  ],
  // coal terminals: a bulk carrier with a heap of coal on deck
  ship: [
    { d: 'M-6.4 1.2L-4.8 5.6H4.6L6.4 1.2Z', fill: 'base', stroke: 'dark', width: 0.8 },
    { d: 'M-4.4 1.2L-2.8-2.4-.8-1.2 1.2-3.6 3.6 1.2Z', fill: '#3b3f44', stroke: '#1d1f22', width: 0.5 },
  ],
  // semiconductors: a chip with its pins
  chip: [
    { d: 'M-2.2-3.8V-6M0-3.8V-6M2.2-3.8V-6M-2.2 3.8V6M0 3.8V6M2.2 3.8V6M-3.8-2.2H-6M-3.8 0H-6M-3.8 2.2H-6M3.8-2.2H6M3.8 0H6M3.8 2.2H6', stroke: '#9fb0bc', width: 1 },
    { d: 'M-3.8-3.8H3.8V3.8H-3.8Z', fill: '#2f3b45', stroke: '#9fb0bc', width: 0.6 },
    { d: 'M-2-2H2V2H-2Z', fill: 'base' },
  ],
};

/**
 * How each resource type is drawn: its pictogram and colour (a literal, or a pipeline fuel so oil and gas match the
 * pipelines lens), grouped for the key. Types not listed keep their class's plain marker.
 */
export interface SitePicto { picto: string; color?: string; fuel?: 'oil' | 'gas'; group: string }
export const SITE_PICTO: Record<string, SitePicto> = {
  oil: { picto: 'barrel', fuel: 'oil', group: 'oil' },
  'oil-shale': { picto: 'barrel', fuel: 'oil', group: 'oil' },
  gas: { picto: 'flame', fuel: 'gas', group: 'gas' },
  coal: { picto: 'coal', color: '#3d4247', group: 'coal' },
  uranium: { picto: 'radiation', color: '#f5c518', group: 'uranium' },
  hydropower: { picto: 'hydro', color: '#2f8fd8', group: 'hydro' },
  geothermal: { picto: 'geothermal', color: '#d0532f', group: 'geothermal' },
  lithium: { picto: 'battery', color: '#3fae5a', group: 'battery' },
  cobalt: { picto: 'battery', color: '#3fae5a', group: 'battery' },
  nickel: { picto: 'battery', color: '#3fae5a', group: 'battery' },
  graphite: { picto: 'battery', color: '#3fae5a', group: 'battery' },
  manganese: { picto: 'battery', color: '#3fae5a', group: 'battery' },
  'rare-earths': { picto: 'magnet', color: '#d64545', group: 'magnet' },
  copper: { picto: 'ingot', color: '#c46a2f', group: 'copper' },
  'iron-ore': { picto: 'ingot', color: '#8f4a39', group: 'iron' },
  bauxite: { picto: 'ingot', color: '#b9c3cb', group: 'bauxite' },
  chromium: { picto: 'ingot', color: '#7f8a94', group: 'alloy' },
  tungsten: { picto: 'ingot', color: '#7f8a94', group: 'alloy' },
  coltan: { picto: 'ingot', color: '#7f8a94', group: 'alloy' },
  gold: { picto: 'bars', color: '#e8b923', group: 'gold' },
  silver: { picto: 'bars', color: '#c9d1d9', group: 'silver' },
  platinum: { picto: 'bars', color: '#c9d1d9', group: 'silver' },
  diamonds: { picto: 'gem', color: '#bfe6fb', group: 'diamonds' },
  jade: { picto: 'gem', color: '#3aa76d', group: 'jade' },
  water: { picto: 'drop', color: '#3aa0e6', group: 'water' },
  coffee: { picto: 'bean', color: '#7a4a2a', group: 'coffee' },
  potash: { picto: 'sack', color: '#d8bd84', group: 'fertiliser' },
  phosphate: { picto: 'sack', color: '#d8bd84', group: 'fertiliser' },
  semiconductors: { picto: 'chip', color: '#57d1b6', group: 'chips' },
};

/** The key's groups, in reading order, with their names. */
export const PICTO_GROUPS: { id: string; label: Bi }[] = [
  { id: 'oil', label: { ar: 'النفط', en: 'Oil' } },
  { id: 'gas', label: { ar: 'الغاز الطبيعي', en: 'Natural gas' } },
  { id: 'coal', label: { ar: 'الفحم', en: 'Coal' } },
  { id: 'uranium', label: { ar: 'اليورانيوم', en: 'Uranium' } },
  { id: 'hydro', label: { ar: 'طاقة مائية', en: 'Hydropower' } },
  { id: 'geothermal', label: { ar: 'حرارة جوفية', en: 'Geothermal' } },
  { id: 'battery', label: { ar: 'معادن البطاريات', en: 'Battery metals' } },
  { id: 'magnet', label: { ar: 'العناصر النادرة', en: 'Rare earths' } },
  { id: 'copper', label: { ar: 'النحاس', en: 'Copper' } },
  { id: 'iron', label: { ar: 'خام الحديد', en: 'Iron ore' } },
  { id: 'bauxite', label: { ar: 'البوكسيت', en: 'Bauxite' } },
  { id: 'alloy', label: { ar: 'معادن صناعية', en: 'Alloy metals' } },
  { id: 'gold', label: { ar: 'الذهب', en: 'Gold' } },
  { id: 'silver', label: { ar: 'الفضة والبلاتين', en: 'Silver, platinum' } },
  { id: 'diamonds', label: { ar: 'الألماس', en: 'Diamonds' } },
  { id: 'jade', label: { ar: 'اليشم', en: 'Jade' } },
  { id: 'water', label: { ar: 'المياه', en: 'Water' } },
  { id: 'coffee', label: { ar: 'البن', en: 'Coffee' } },
  { id: 'fertiliser', label: { ar: 'الأسمدة', en: 'Fertilisers' } },
  { id: 'chips', label: { ar: 'أشباه الموصلات', en: 'Semiconductors' } },
];

/** Resolve a layer colour token against the marker colour and its darker and lighter shades. */
export const pictoColor = (c: string, base: string, dark: string, light: string) => (c === 'base' ? base : c === 'dark' ? dark : c === 'light' ? light : c);
