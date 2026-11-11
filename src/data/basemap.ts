// Natural Earth rivers and cities for the optional base layers (geo/rivers.json, geo/cities.json; see
// public/data/README.md for the layout). Each file loads the first time its layer is drawn.

import type { Position } from 'geojson';

/** A river or lake centreline: its Natural Earth scale rank (1 the largest) and its parts. */
export interface River { rank: number; lines: Position[][] }
/** A city, the most populous first in the file. */
export interface City { en: string; ar: string; lon: number; lat: number; pop: number; rank: number; capital: boolean }

type RawRiver = [number, Position[][]];
type RawCity = [string, string, number, number, number, number, 0 | 1];

const base = () => import.meta.env.BASE_URL + 'data/geo/';
let rivers: River[] | null = null, cities: City[] | null = null;
const loading = new Set<string>();
const listeners = new Set<() => void>();
const notify = () => { for (const l of listeners) l(); };

export function subscribeBasemap(fn: () => void) { listeners.add(fn); return () => { listeners.delete(fn); }; }

function load<T>(file: string, done: (raw: T) => void) {
  if (loading.has(file)) return;
  loading.add(file);
  fetch(base() + file)
    .then((r) => { if (!r.ok) throw new Error(`geo/${file}: HTTP ${r.status}`); return r.json() as Promise<T>; })
    .then((raw) => { done(raw); notify(); })
    .catch((err) => { console.warn('[atlas]', err); loading.delete(file); });
}

export const buildRivers = (raw: RawRiver[]): River[] => raw.map(([rank, lines]) => ({ rank, lines }));
export const buildCities = (raw: RawCity[]): City[] => raw.map(([en, ar, lon, lat, pop, rank, cap]) => ({ en, ar, lon, lat, pop, rank, capital: cap === 1 }));

/** The rivers if loaded (the first call starts loading them). */
export function getRivers(): River[] | null {
  if (!rivers) load<RawRiver[]>('rivers.json', (raw) => { rivers = buildRivers(raw); });
  return rivers;
}
/** The cities if loaded (the first call starts loading them). */
export function getCities(): City[] | null {
  if (!cities) load<RawCity[]>('cities.json', (raw) => { cities = buildCities(raw); });
  return cities;
}
/** For tests: install the layers (null clears). */
export function setBasemap(r: River[] | null, c: City[] | null) { rivers = r; cities = c; loading.clear(); if (r) loading.add('rivers.json'); if (c) loading.add('cities.json'); notify(); }
