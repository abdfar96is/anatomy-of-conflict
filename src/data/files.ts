// Data files the atlas loads, relative to public/data/. Kept apart from load.ts so Node scripts can import it.

export const FILES = {
  countries: 'geo/countries.json',
  index: 'geo/country_index.json',
  boundaries: 'geo/boundary_lines.json',
  disputed: 'geo/disputed_areas.json',
  choke: 'curated/chokepoints.json',
  intel: 'curated/country_intel.json',
  ethnic: 'curated/ethnic_groups.json',
  relations: 'curated/relations.json',
  religions: 'curated/religions.json',
  resources: 'curated/resources.json',
  sources: 'curated/sources.json',
  timeline: 'curated/timeline.json',
  cAfrica: 'curated/conflicts/africa.json',
  cAmericas: 'curated/conflicts/americas.json',
  cAsia: 'curated/conflicts/asia.json',
  cEurope: 'curated/conflicts/europe.json',
  cMideast: 'curated/conflicts/middle-east.json',
  corrections: 'curated/corrections.json',
  figureNotes: 'curated/figure_notes.json',
  live: 'live/indicators.json',
} as const;

export type FileKey = keyof typeof FILES;
/** Files the atlas can do without: a missing open-data refresh falls back to the Natural Earth figures. */
export const OPTIONAL_FILES: readonly FileKey[] = ['live'];
export const CONFLICT_FILES = ['cMideast', 'cEurope', 'cAsia', 'cAfrica', 'cAmericas'] as const;
