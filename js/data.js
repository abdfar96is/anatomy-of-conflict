// Loads the atlas datasets and builds one linked model (DB). Read DATA.md for every field.

import { normalize } from './i18n.js';
import { RELIGION_FAMILIES, RESOURCE_CLASSES, SEVERITY_RANK } from './config.js';
import { applyErrata, UNVERIFIED } from './errata.js';

const FILES = {
  countries:  'data/countries.json',
  index:      'data/country_index.json',
  boundaries: 'data/boundary_lines.json',
  disputed:   'data/disputed_areas.json',
  choke:      'data/thematic/chokepoints.json',
  intel:      'data/thematic/country_intel.json',
  ethnic:     'data/thematic/ethnic_groups.json',
  relations:  'data/thematic/relations.json',
  religions:  'data/thematic/religions.json',
  resources:  'data/thematic/resources.json',
  sources:    'data/thematic/sources.json',
  timeline:   'data/thematic/timeline.json',
  cAfrica:    'data/thematic/conflicts/africa.json',
  cAmericas:  'data/thematic/conflicts/americas.json',
  cAsia:      'data/thematic/conflicts/asia.json',
  cEurope:    'data/thematic/conflicts/europe.json',
  cMideast:   'data/thematic/conflicts/middle-east.json',
};

export async function loadAll(onProgress = () => {}) {
  const keys = Object.keys(FILES);
  let done = 0;
  const raw = {};
  await Promise.all(keys.map(async (k) => {
    const res = await fetch(FILES[k]);
    if (!res.ok) throw new Error(`${FILES[k]}: HTTP ${res.status}`);
    raw[k] = await res.json();
    onProgress(++done / keys.length, FILES[k]);
  }));
  return build(raw);
}

const EARTH_R = 6371;
// Thematic files use ISO codes that Natural Earth spells differently.
const ISO_ALIAS = { XKX: 'KOS' };
const fix = (iso) => ISO_ALIAS[iso] || iso;
// Natural Earth's Arabic name is wrong for a few disputed features (English brk_name is right).
const DISPUTED_AR_FIX = { 'Spratly Is.': 'جزر سبراتلي' };

/** Rewrite every ISO reference in the thematic files to Natural Earth's codes before linking. */
function normalizeIsos(R) {
  const arr = (a) => (Array.isArray(a) ? a.map(fix) : a);
  for (const k of ['cAfrica', 'cAmericas', 'cAsia', 'cEurope', 'cMideast']) {
    for (const c of R[k].conflicts) {
      c.countries = arr(c.countries);
      for (const e of c.externalPowers || []) e.iso3 = fix(e.iso3);
    }
  }
  for (const e of R.relations.edges) { e.a = fix(e.a); e.b = fix(e.b); }
  for (const b of R.relations.blocs) b.members = arr(b.members);
  R.relations.bilateral = Object.fromEntries(Object.entries(R.relations.bilateral).map(([k, v]) => [k.split('|').map(fix).join('|'), v]));
  for (const f of R.ethnic.features) f.properties.countries = arr(f.properties.countries);
  for (const p of R.choke.points) p.borderStates = arr(p.borderStates);
  for (const e of R.timeline.events) e.countries = arr(e.countries);
  for (const e of R.resources.entries) e.iso3 = fix(e.iso3);
  for (const s of R.resources.sites) s.iso3 = fix(s.iso3);
  R.intel.countries = Object.fromEntries(Object.entries(R.intel.countries).map(([k, v]) => [fix(k), v]));
  R.religions.countries = Object.fromEntries(Object.entries(R.religions.countries).map(([k, v]) => [fix(k), v]));
}

function build(R) {
  normalizeIsos(R);
  const DB = { raw: R };
  DB.errata = applyErrata(R); // [{id, where{ar,en}, what{ar,en}, applied}] — listed in the Sources view
  // Records with developments past this edition's own knowledge: show "not independently verified by this edition".
  DB.unverified = Object.fromEntries(Object.entries(UNVERIFIED).map(([k, ids]) => [k, new Set(ids)]));
  DB.isUnverified = (kind, id) => !!DB.unverified[kind]?.has(id);

  // ---- countries (Natural Earth admin-0 + index)
  const idx = new Map(R.index.map((r) => [r.iso3, r]));
  DB.features = R.countries.features;
  DB.countries = new Map();
  for (const f of DB.features) {
    const p = f.properties;
    const r = idx.get(p.iso3) || {};
    DB.countries.set(p.iso3, {
      iso3: p.iso3, iso2: p.iso_a2_eh, nameAr: p.name_ar || r.nameAr, nameEn: p.name_en || r.name, nameLong: p.name_long,
      type: p.type, sovereign: p.sovereignt, continent: p.continent, subregion: p.subregion, regionWb: p.region_wb,
      pop: p.pop_est, popYear: p.pop_year, gdp: p.gdp_md, gdpYear: p.gdp_year, income: p.income_grp, economy: p.economy,
      lon: r.lon ?? p.label_x, lat: r.lat ?? p.label_y, wikidata: p.wikidataid,
      areaKm2: d3.geoArea(f) * EARTH_R * EARTH_R,
      feature: f,
      intel: null, religion: null, resources: [], sites: [], conflicts: [], external: [], blocs: [], edges: [],
      events: [], groups: [], chokepoints: [], neighbors: [], disputed: [],
    });
  }
  for (const c of DB.countries.values()) {
    c.gdpPerCap = c.gdp && c.pop ? (c.gdp * 1e6) / c.pop : null;
    c.density = c.pop && c.areaKm2 > 1 ? c.pop / c.areaKm2 : null;
  }
  const C = (iso) => DB.countries.get(iso);

  DB.boundaries = R.boundaries.features;
  DB.disputed = R.disputed.features.map((f, i) => {
    const p = f.properties;
    const brk = String(p.brk_name || p.name_en || '').replace(/﻿/g, '').trim();
    const d = {
      id: String(i), nameAr: DISPUTED_AR_FIX[brk] || p.name_ar || brk, nameEn: brk, admin: p.admin, sovereign: p.sovereignt,
      claimant: p.claimant, note: p.note_brk, subregion: p.subregion, lon: p.label_x, lat: p.label_y, feature: f,
    };
    const adminC = [...DB.countries.values()].find((c) => c.nameEn === p.admin || c.sovereign === p.admin);
    if (adminC) adminC.disputed.push(d.id);
    return d;
  });
  DB.disputedById = new Map(DB.disputed.map((d) => [d.id, d]));

  // ---- conflicts (5 regional files)
  DB.conflicts = [];
  for (const k of ['cMideast', 'cEurope', 'cAsia', 'cAfrica', 'cAmericas']) {
    const file = R[k];
    for (const c of file.conflicts) {
      DB.conflicts.push({ ...c, region: file.region, regionName: file.regionName, startYear: parseInt(c.started, 10) || null, rank: SEVERITY_RANK[c.severity] || 0 });
    }
  }
  DB.conflicts.sort((a, b) => b.rank - a.rank);
  DB.conflictById = new Map(DB.conflicts.map((c) => [c.id, c]));
  DB.conflictsAsOf = R.cMideast.statusAsOf;
  for (const c of DB.conflicts) {
    for (const iso of c.countries || []) C(iso)?.conflicts.push(c.id);
    for (const e of c.externalPowers || []) C(e.iso3)?.external.push(c.id);
    c.events = [];
    c.chokepoints = [];
  }

  // ---- country intel
  for (const [iso, v] of Object.entries(R.intel.countries)) if (C(iso)) C(iso).intel = v;
  DB.intelNote = R.intel.note;

  // ---- religion
  const rel = R.religions;
  DB.religion = {
    traditions: rel.traditions,
    traditionById: new Map(rel.traditions.map((t) => [t.id, t])),
    families: RELIGION_FAMILIES,
    familyOf: Object.fromEntries(RELIGION_FAMILIES.flatMap((f) => f.members.map((m) => [m, f.id]))),
    coverageNote: rel.coverageNote, methodNote: rel.methodNote,
    countries: rel.countries,
  };
  for (const [iso, v] of Object.entries(rel.countries)) {
    const c = C(iso); if (!c) continue;
    const groups = Object.entries(v.groups).filter(([, p]) => p > 0).sort((a, b) => b[1] - a[1]);
    const fam = {};
    for (const [tid, p] of groups) { const f = DB.religion.familyOf[tid] || 'none'; fam[f] = (fam[f] || 0) + p; }
    const famSorted = Object.entries(fam).sort((a, b) => b[1] - a[1]);
    const diversity = 1 - groups.reduce((s, [, p]) => s + (p / 100) ** 2, 0); // Gini–Simpson over traditions
    c.religion = { ...v, sorted: groups, majority: groups[0]?.[0] || null, majorityShare: groups[0]?.[1] || 0,
      families: famSorted, majorityFamily: famSorted[0]?.[0] || null, diversity };
  }

  // ---- ethnic groups (approximate polygons)
  const eth = R.ethnic;
  DB.ethnic = { features: eth.features, meta: eth.metadata, groups: new Map() };
  for (const f of eth.features) {
    const p = f.properties;
    let g = DB.ethnic.groups.get(p.groupId);
    if (!g) {
      g = { id: p.groupId, nameAr: p.nameAr, nameEn: p.nameEn, family: p.family, langAr: p.langAr, langEn: p.langEn,
        regionAr: p.regionAr, regionEn: p.regionEn, countries: p.countries || [], noteAr: p.noteAr, noteEn: p.noteEn, features: [] };
      DB.ethnic.groups.set(p.groupId, g);
    }
    g.features.push(f);
  }
  for (const g of DB.ethnic.groups.values()) {
    const cent = d3.geoCentroid({ type: 'FeatureCollection', features: g.features });
    g.lon = cent[0]; g.lat = cent[1];
    for (const iso of g.countries) C(iso)?.groups.push(g.id);
  }
  DB.ethnic.families = [...new Set(eth.features.map((f) => f.properties.family))];

  // ---- resources
  const res = R.resources;
  DB.resources = {
    types: res.types, typeById: new Map(res.types.map((t) => [t.id, t])),
    classes: RESOURCE_CLASSES,
    classOf: Object.fromEntries(RESOURCE_CLASSES.flatMap((k) => k.members.map((m) => [m, k.id]))),
    entries: res.entries, sites: res.sites, note: res.note, coverageNote: res.coverageNote,
  };
  DB.siteById = new Map(res.sites.map((s) => [s.id, s]));
  for (const e of res.entries) C(e.iso3)?.resources.push(e);
  for (const s of res.sites) C(s.iso3)?.sites.push(s.id);

  // ---- relations: blocs + typed edges + bilateral notes
  const R2 = R.relations;
  DB.relations = {
    edgeTypes: R2.edgeTypes, edgeTypeById: new Map(R2.edgeTypes.map((e) => [e.id, e])), edgeKinds: R2.edgeKinds,
    blocs: R2.blocs, blocById: new Map(R2.blocs.map((b) => [b.id, b])),
    edges: R2.edges.map((e, i) => ({ ...e, id: 'e' + i })),
    bilateral: R2.bilateral,
  };
  DB.bilateralFor = (a, b) => R2.bilateral[`${fix(a)}|${fix(b)}`] || R2.bilateral[`${fix(b)}|${fix(a)}`] || null;
  DB.edgesBetween = (a, b) => DB.relations.edges.filter((e) => (e.a === a && e.b === b) || (e.a === b && e.b === a));
  for (const e of DB.relations.edges) { C(e.a)?.edges.push(e.id); C(e.b)?.edges.push(e.id); }
  DB.edgeById = new Map(DB.relations.edges.map((e) => [e.id, e]));
  for (const b of R2.blocs) for (const iso of b.members) if (C(iso) && !C(iso).blocs.includes(b.id)) C(iso).blocs.push(b.id);
  // relations.blocs member lists are canonical; intel bloc ids only add blocs that list doesn't define
  for (const c of DB.countries.values()) for (const b of c.intel?.blocs || []) if (!DB.relations.blocById.has(b) && !c.blocs.includes(b)) c.blocs.push(b);

  // ---- chokepoints
  DB.chokepoints = R.choke.points;
  DB.chokeNote = R.choke.note;
  DB.chokeById = new Map(DB.chokepoints.map((p) => [p.id, p]));
  for (const p of DB.chokepoints) {
    for (const iso of p.borderStates || []) C(iso)?.chokepoints.push(p.id);
    for (const cid of p.conflictIds || []) DB.conflictById.get(cid)?.chokepoints.push(p.id);
  }

  // ---- timeline
  const tl = R.timeline;
  DB.timeline = {
    range: tl.range, categories: tl.categories, catById: new Map(tl.categories.map((c) => [c.id, c])),
    boundaryLimitation: tl.boundaryLimitation,
    events: tl.events.map((e) => ({ ...e, year: parseInt(String(e.date).slice(0, 4), 10) })).sort((a, b) => String(a.date).localeCompare(String(b.date))),
  };
  DB.eventById = new Map(DB.timeline.events.map((e) => [e.id, e]));
  for (const e of DB.timeline.events) {
    for (const iso of e.countries || []) C(iso)?.events.push(e.id);
    for (const cid of e.conflictIds || []) DB.conflictById.get(cid)?.events.push(e.id);
  }

  // ---- sources
  DB.sources = R.sources;
  DB.datasetById = new Map(R.sources.datasets.map((d) => [d.id, d]));
  DB.referenceById = new Map(R.sources.references.map((r) => [r.id, r]));

  // ---- neighbours: nearest label points inside the same subregion (proximity, not an official border list)
  const all = [...DB.countries.values()].filter((c) => c.lon != null);
  for (const c of all) {
    const pool = all.filter((o) => o !== c && o.subregion === c.subregion);
    c.neighbors = pool
      .map((o) => [o.iso3, d3.geoDistance([c.lon, c.lat], [o.lon, o.lat])])
      .sort((a, b) => a[1] - b[1]).slice(0, 6).map(([iso]) => iso);
  }

  // ---- lookups
  DB.exists = (kind, id) => !!DB.get(kind, id);
  DB.get = (kind, id) => {
    switch (kind) {
      case 'country': return DB.countries.get(id);
      case 'conflict': return DB.conflictById.get(id);
      case 'group': return DB.ethnic.groups.get(id);
      case 'religion': return DB.religion.traditionById.get(id);
      case 'choke': return DB.chokeById.get(id);
      case 'disputed': return DB.disputedById.get(id);
      case 'event': return DB.eventById.get(id);
      case 'bloc': return DB.relations.blocById.get(id);
      case 'site': return DB.siteById.get(id);
      default: return null;
    }
  };
  /** Countries a selection touches (for map emphasis and fly-to bounds). */
  DB.countriesOf = (kind, id) => {
    const x = DB.get(kind, id);
    if (!x) return [];
    switch (kind) {
      case 'country': return [id];
      case 'conflict': return x.countries || [];
      case 'group': return x.countries;
      case 'religion': return Object.entries(DB.religion.countries).filter(([, v]) => (v.groups[id] || 0) >= 5).map(([iso]) => iso);
      case 'choke': return x.borderStates || [];
      case 'disputed': return [];
      case 'event': return x.countries || [];
      case 'bloc': return x.members;
      case 'site': return [x.iso3];
      default: return [];
    }
  };
  /** [lon, lat] anchor of a selection. */
  DB.anchorOf = (kind, id) => {
    const x = DB.get(kind, id);
    if (!x) return null;
    if (x.coords) return x.coords;
    if (x.lon != null) return [x.lon, x.lat];
    const isos = DB.countriesOf(kind, id).map(C).filter(Boolean);
    if (!isos.length) return null;
    return d3.geoCentroid({ type: 'FeatureCollection', features: isos.map((c) => c.feature) });
  };
  DB.nameOf = (kind, id, lang) => {
    const x = DB.get(kind, id);
    if (!x) return id;
    const ar = lang === 'ar';
    if (x.nameAr) return ar ? x.nameAr : x.nameEn;
    if (x.name && typeof x.name === 'object') return ar ? x.name.ar : x.name.en;
    return ar ? x.ar : x.en;
  };

  // ---- search index
  const S = [];
  const push = (kind, id, ar, en, subAr, subEn) => S.push({ kind, id, ar, en, subAr, subEn, n: normalize(`${ar} ${en} ${id}`) });
  for (const c of DB.countries.values()) push('country', c.iso3, c.nameAr, c.nameEn, c.subregion, c.subregion);
  for (const c of DB.conflicts) push('conflict', c.id, c.name.ar, c.name.en, c.regionName.ar, c.regionName.en);
  for (const g of DB.ethnic.groups.values()) push('group', g.id, g.nameAr, g.nameEn, g.regionAr, g.regionEn);
  for (const t of DB.religion.traditions) push('religion', t.id, t.ar, t.en, '', '');
  for (const p of DB.chokepoints) push('choke', p.id, p.ar, p.en, '', '');
  for (const d of DB.disputed) push('disputed', d.id, d.nameAr, d.nameEn, d.admin || '', d.admin || '');
  for (const e of DB.timeline.events) push('event', e.id, e.ar, e.en, e.date, e.date);
  for (const b of DB.relations.blocs) push('bloc', b.id, b.ar, b.en, '', '');
  for (const s of DB.resources.sites) push('site', s.id, s.ar, s.en, '', '');
  DB.searchIndex = S;
  DB.search = (q, limit = 30) => {
    const n = normalize(q);
    if (!n) return [];
    const out = [];
    for (const e of S) {
      const i = e.n.indexOf(n);
      if (i < 0) continue;
      const wordStart = i === 0 || e.n[i - 1] === ' ';
      out.push([e, (i === 0 ? 0 : wordStart ? 1 : 2) + (e.kind === 'country' ? 0 : 0.5)]);
    }
    return out.sort((a, b) => a[1] - b[1]).slice(0, limit).map(([e]) => e);
  };

  DB.stats = {
    countries: DB.countries.size,
    conflicts: DB.conflicts.length,
    groups: DB.ethnic.groups.size,
    religionCountries: Object.keys(rel.countries).length,
    edges: DB.relations.edges.length,
    blocs: DB.relations.blocs.length,
    events: DB.timeline.events.length,
    chokepoints: DB.chokepoints.length,
    sites: DB.resources.sites.length,
    disputed: DB.disputed.length,
  };
  return DB;
}
