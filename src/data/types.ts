// Shapes of the data files (the fields the model reads) and of the linked model build() returns.
// Raw records keep every other field: features read them directly (e.g. conflict.history, choke.flow).

import type { Feature, FeatureCollection, Geometry } from 'geojson';
import type { Bi, Lang } from '../i18n/format';
import type { Kind, NUCLEAR_CIVIL, NUCLEAR_NPT, NUCLEAR_STATUS, NUCLEAR_UNIT } from '../config';
import type { CONFLICT_FILES } from './files';

export type { Kind };
type Extra = { [k: string]: unknown };

// ---- raw files

export interface CountryProps extends Extra {
  iso3: string; iso_a2_eh?: string; name_ar?: string; name_en?: string; name_long?: string;
  type?: string; sovereignt?: string; continent?: string; subregion?: string; region_wb?: string;
  pop_est?: number; pop_year?: number; gdp_md?: number; gdp_year?: number; income_grp?: string; economy?: string;
  label_x?: number; label_y?: number; wikidataid?: string;
}
export interface IndexRow extends Extra { iso3: string; name?: string; nameAr?: string; lon?: number; lat?: number }
export interface DisputedProps extends Extra {
  brk_name?: string; name_en?: string; name_ar?: string; admin?: string; sovereignt?: string;
  claimant?: string; note_brk?: string; subregion?: string; label_x?: number; label_y?: number;
}
export interface RawConflict extends Extra {
  id: string; name: Bi; countries: string[]; severity: string; started?: string;
  externalPowers?: { iso3: string; role?: Bi; [k: string]: unknown }[];
  sourceRefs?: string[]; unverified?: boolean;
}
export interface ConflictFile extends Extra { region: string; regionName: Bi; statusAsOf?: string; conflicts: RawConflict[] }
export interface Intel extends Extra { blocs?: string[]; disputes?: Bi[]; unverified?: boolean }
export interface CountryReligionRaw extends Extra { groups: Record<string, number>; source?: string; year?: number; note?: Bi }
export interface Tradition extends Extra { id: string; ar: string; en: string }
export interface EthnicProps extends Extra {
  groupId: string; nameAr: string; nameEn: string; family: string; langAr?: string; langEn?: string;
  regionAr?: string; regionEn?: string; countries?: string[]; noteAr?: string; noteEn?: string;
}
export interface ResourceType extends Extra { id: string; ar: string; en: string; color?: string }
export interface ResourceEntry extends Extra, Provenance { iso3: string; type: string; conflictIds?: string[] }
/** Where a record comes from: start of the relationship, last check against a source, and the source links. */
export interface Provenance { since?: string; verified?: string; sources?: string[] }
export interface Site extends Extra, Provenance { id: string; iso3: string; type: string; ar: string; en: string; coords?: [number, number] }
export interface EdgeType extends Extra { id: string }
export interface Bloc extends Extra, Provenance { id: string; ar: string; en: string; members: string[]; note?: Bi }
export interface RawEdge extends Extra, Provenance { a: string; b: string; type: string; kind: string }
export interface Chokepoint extends Extra {
  id: string; ar: string; en: string; borderStates?: string[]; conflictIds?: string[]; coords?: [number, number]; unverified?: boolean;
}
export interface TimelineCategory extends Extra { id: string }
export interface RawEvent extends Extra {
  id: string; date: string; ar: string; en: string; countries?: string[]; coords?: [number, number]; conflictIds?: string[]; unverified?: boolean;
}
export interface Dataset extends Extra { id: string; file?: string }
export interface Reference extends Extra { id: string }
export interface Correction { id: string; where: Bi; what: Bi }

/** Nuclear status (curated/nuclear.json). */
export type NuclearStatusId = keyof typeof NUCLEAR_STATUS;
export type NuclearCivilId = keyof typeof NUCLEAR_CIVIL;
export type NuclearNptId = keyof typeof NUCLEAR_NPT;
export interface NuclearRecord extends Provenance {
  weapons?: NuclearStatusId; host?: string; civil?: NuclearCivilId; npt?: NuclearNptId; note?: Bi;
}
export interface NuclearZone extends Bi { id: string; treaty: Bi; year: number; members: string[]; sources: string[] }
export type NuclearUnitStatus = keyof typeof NUCLEAR_UNIT;
export interface NuclearUnit {
  name: string; status: NuclearUnitStatus; type?: string; model?: string; mw?: number; from?: number; to?: number; iaea?: number;
  /** A status change since the base dataset, with the year and its sources. */
  changed?: { year?: number; sources: string[] };
}
export interface NuclearPlant extends Bi, Provenance {
  id: string; iso3: string; coords: [number, number]; units: NuclearUnit[]; note?: Bi; conflictIds?: string[];
  /** The plant's entries in GEM's power tracker (power/plants.json station ids). */
  gem?: string[];
}
/** A nuclear site other than a power plant (curated/nuclear.json `sites`). */
export interface NuclearSite extends Bi, Provenance {
  id: string; type: string; status: string; iso3: string; coords: [number, number]; from?: number; to?: number; note: Bi; conflictIds?: string[];
}
export interface NuclearPlantFile {
  source: { base: { name: string; version: string; date: string; url: string; license: string }; changes: Bi; limits: Bi };
  plants: NuclearPlant[];
}
/** A plant in the model: its record plus the status and capacity rolled up from its units. */
export interface Plant extends NuclearPlant {
  status: NuclearUnitStatus; count: Record<NuclearUnitStatus, number>; mw: Record<NuclearUnitStatus, number>;
}
export interface NuclearFile {
  note?: Bi; zonesNote?: Bi;
  fleet: { year: number; publisher: string; sources: string[]; verified?: string; note?: Bi; columns: string[]; values: Record<string, [number, number, number]> };
  warheads: { year: number; metric: Bi; publisher: string; sources: string[]; verified?: string; values: Record<string, number> };
  countries: Record<string, NuclearRecord>;
  zones: NuclearZone[];
  /** Nuclear sites other than power plants: fuel cycle, weapons and test sites. */
  sites?: NuclearSite[];
  /** Each state's status under the NPT, the CTBT (with whether it is an Annex 2 state) and the TPNW, with the year. */
  treaties?: {
    asOf: string; publisher: string; sources: string[]; note?: Bi;
    npt: Record<string, [string, number | null]>; ctbt: Record<string, [string, number | null, 0 | 1]>; tpnw: Record<string, [string, number | null]>;
  };
}
/** A country's nuclear profile in the model: its record, the NPT status filled in for states, warheads and zones. */
export interface CountryNuclear extends Omit<NuclearRecord, 'npt'> {
  npt?: NuclearNptId; warheads?: number; zones: string[];
  /** Reactors in service, net MWe and reactors under construction (Reactor Atlas), and the plants in this state. */
  fleet?: { reactors: number; mwe: number; building: number }; plants: string[];
}

/** A sourced caveat on one open-data figure for one country (curated/figure_notes.json). */
export interface FigureNote extends Bi { sources: string[]; verified: string }

/** Series the weekly open-data refresh fetches (public/data/live/indicators.json, scripts/fetch-indicators.ts). */
export type LiveKey = 'pop' | 'gdp' | 'gdpPc' | 'refOrigin' | 'refAsylum' | 'idps' | 'battleDeaths';
export interface LiveIndicator {
  code: string; name?: string; origin: Bi; url: string; sourceOrganization?: string; lastUpdated?: string;
  /** Newest year the series has for any country, and how many countries have a value. */
  latestYear?: number; countries?: number;
}
export interface LiveFile {
  source: string; api: string; retrieved: string | null;
  indicators: Record<LiveKey, LiveIndicator>;
  /** ISO3 → series → [value, year]. Money in current US dollars, people as head counts. */
  values: Record<string, Partial<Record<LiveKey, [number, number]>>>;
}

export type RawData = {
  countries: FeatureCollection<Geometry, CountryProps>;
  index: IndexRow[];
  boundaries: FeatureCollection;
  disputed: FeatureCollection<Geometry, DisputedProps>;
  choke: { points: Chokepoint[]; note?: Bi };
  intel: { countries: Record<string, Intel>; note?: Bi };
  ethnic: FeatureCollection<Geometry, EthnicProps> & { metadata?: unknown };
  relations: {
    edgeTypes: EdgeType[]; edgeKinds: unknown; blocs: Bloc[]; edges: RawEdge[]; bilateral: Record<string, unknown>;
  };
  religions: { traditions: Tradition[]; countries: Record<string, CountryReligionRaw>; coverageNote?: Bi; methodNote?: Bi };
  resources: { types: ResourceType[]; entries: ResourceEntry[]; sites: Site[]; note?: Bi; coverageNote?: Bi };
  sources: { datasets: Dataset[]; references: Reference[]; [k: string]: unknown };
  timeline: { range: unknown; categories: TimelineCategory[]; events: RawEvent[]; boundaryLimitation?: Bi };
  corrections?: Correction[];
  figureNotes?: { note?: Bi; countries: Record<string, Partial<Record<LiveKey, FigureNote>>> };
  nuclear: NuclearFile;
  nuclearPlants: NuclearPlantFile;
  live?: LiveFile | null;
} & { [K in (typeof CONFLICT_FILES)[number]]: ConflictFile };

// ---- linked model

export interface CountryReligion extends CountryReligionRaw {
  sorted: [string, number][]; majority: string | null; majorityShare: number;
  families: [string, number][]; majorityFamily: string | null; diversity: number;
}
/** A figure with its year and origin: 'live' = the World Bank open-data refresh, 'ne' = the Natural Earth baseline. */
export interface Stat { v: number; y?: number; src: 'live' | 'ne' }
export interface Country {
  iso3: string; iso2?: string; nameAr?: string; nameEn?: string; nameLong?: string;
  type?: string; sovereign?: string; continent?: string; subregion?: string; regionWb?: string;
  pop?: number; popYear?: number; gdp?: number; gdpYear?: number; income?: string; economy?: string;
  lon?: number; lat?: number; wikidata?: string; areaKm2: number; feature: Feature<Geometry, CountryProps>;
  gdpPerCap: number | null; density: number | null;
  /** pop, gdp (US dollars) and gdpPc as shown, with year and source; humanitarian series only when the refresh has them. */
  stats: Partial<Record<LiveKey, Stat>>;
  /** Sourced caveats on some of those figures, where the figure measures something narrower than it seems. */
  figureNotes: Partial<Record<LiveKey, FigureNote>>;
  nuclear: CountryNuclear;
  intel: Intel | null; religion: CountryReligion | null; resources: ResourceEntry[];
  sites: string[]; conflicts: string[]; external: string[]; blocs: string[]; edges: string[];
  events: string[]; groups: string[]; chokepoints: string[]; neighbors: string[]; disputed: string[];
}
export interface Disputed {
  id: string; nameAr: string; nameEn: string; admin?: string; sovereign?: string; claimant?: string; note?: string;
  subregion?: string; lon?: number; lat?: number; feature: Feature<Geometry, DisputedProps>;
}
export interface Conflict extends RawConflict {
  region: string; regionName: Bi; startYear: number | null; rank: number; events: string[]; chokepoints: string[];
}
export interface Group {
  id: string; nameAr: string; nameEn: string; family: string; langAr?: string; langEn?: string;
  regionAr?: string; regionEn?: string; countries: string[]; noteAr?: string; noteEn?: string;
  features: Feature<Geometry, EthnicProps>[]; lon: number; lat: number;
}
export interface Edge extends RawEdge { id: string }
export interface TimelineEvent extends RawEvent { year: number }
export interface SearchEntry { kind: Kind; id: string; ar: string; en: string; subAr: string; subEn: string; n: string }

export interface DB {
  raw: RawData;
  corrections: Correction[];
  /** The open-data refresh, or null when the file is missing or has never been filled. */
  live: LiveFile | null;
  nuclear: NuclearFile & { zoneById: Map<string, NuclearZone>; plants: Plant[]; plantSource: NuclearPlantFile['source'] };
  plantById: Map<string, Plant>;
  nsiteById: Map<string, NuclearSite>;
  isUnverified(kind: Kind, id: string): boolean;
  features: Feature<Geometry, CountryProps>[];
  countries: Map<string, Country>;
  boundaries: Feature[];
  disputed: Disputed[];
  disputedById: Map<string, Disputed>;
  conflicts: Conflict[];
  conflictById: Map<string, Conflict>;
  conflictsAsOf?: string;
  intelNote?: Bi;
  religion: {
    traditions: Tradition[]; traditionById: Map<string, Tradition>; families: typeof import('../config').RELIGION_FAMILIES;
    familyOf: Record<string, string>; coverageNote?: Bi; methodNote?: Bi; countries: Record<string, CountryReligionRaw>;
  };
  ethnic: { features: Feature<Geometry, EthnicProps>[]; meta: unknown; groups: Map<string, Group>; families: string[] };
  resources: {
    types: ResourceType[]; typeById: Map<string, ResourceType>; classes: typeof import('../config').RESOURCE_CLASSES;
    classOf: Record<string, string>; entries: ResourceEntry[]; sites: Site[]; note?: Bi; coverageNote?: Bi;
  };
  siteById: Map<string, Site>;
  relations: {
    edgeTypes: EdgeType[]; edgeTypeById: Map<string, EdgeType>; edgeKinds: unknown;
    blocs: Bloc[]; blocById: Map<string, Bloc>; edges: Edge[]; bilateral: Record<string, unknown>;
  };
  bilateralFor(a: string, b: string): unknown;
  edgesBetween(a: string, b: string): Edge[];
  edgeById: Map<string, Edge>;
  chokepoints: Chokepoint[];
  chokeNote?: Bi;
  chokeById: Map<string, Chokepoint>;
  timeline: {
    range: unknown; categories: TimelineCategory[]; catById: Map<string, TimelineCategory>;
    boundaryLimitation?: Bi; events: TimelineEvent[];
  };
  eventById: Map<string, TimelineEvent>;
  sources: RawData['sources'];
  datasetById: Map<string, Dataset>;
  referenceById: Map<string, Reference>;
  get(kind: Kind, id: string): unknown;
  exists(kind: Kind, id: string): boolean;
  countriesOf(kind: Kind, id: string): string[];
  anchorOf(kind: Kind, id: string): [number, number] | null;
  nameOf(kind: Kind, id: string, lang: Lang): string;
  searchIndex: SearchEntry[];
  search(q: string, limit?: number): SearchEntry[];
  stats: Record<'countries' | 'conflicts' | 'groups' | 'religionCountries' | 'edges' | 'blocs' | 'events' | 'chokepoints' | 'sites' | 'disputed', number>;
}
