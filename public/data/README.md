# Data licences

| Folder | Content | Licence |
|---|---|---|
| `geo/` | Country, boundary and disputed-area shapes from [Natural Earth](https://www.naturalearthdata.com/) | Public domain |
| `live/` | Population, GDP, refugees, internal displacement and battle deaths from the [World Bank's open data](https://data.worldbank.org/), refreshed weekly | [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/) — World Bank; each series keeps its original publisher (UN, UNHCR, IDMC, UCDP) |
| `history/` | Historical borders of states and dependent territories, 1886–2019, from [CShapes 2.0](https://icr.ethz.ch/data/cshapes/) (ETH Zurich), simplified; Arabic names and ruler colours in `meta.json` | [CC BY-NC-SA 4.0](https://creativecommons.org/licenses/by-nc-sa/4.0/) — non-commercial, share-alike; cite Schvitz et al. (2022) |
| `curated/nuclear_plants.json` | Nuclear power plants and their units, derived from [GeoNuclearData](https://github.com/cristianst85/GeoNuclearData) with documented updates | [ODbL 1.0](https://opendatacommons.org/licenses/odbl/1-0/) — a derived database; contents under the [DbCL 1.0](https://opendatacommons.org/licenses/dbcl/1-0/) |
| `energy/` | Oil, gas and NGL pipelines and LNG terminals that are operating or under construction, from [Global Energy Monitor](https://globalenergymonitor.org/)'s gas and oil infrastructure trackers, simplified; Arabic names and sourced notes in `meta.json` | [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/) — Global Energy Monitor |
| `curated/` | The atlas content: conflicts, ethnic groups, religions, relations, resources, chokepoints, timeline, sources | [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/) — a compilation adapted from «الأطلس الجيوسياسي والعرقي الديني العالمي» |

Changes this project made to the compiled content are listed in `curated/corrections.json` and on the atlas's Sources page, as CC BY 4.0 asks. Each record names its own sources in `sources.json`; those sources keep their own terms.

When you reuse the curated data, credit "Anatomy of Conflict contributors" and the original compilation, link to the licence, and say what you changed.

## Record provenance

Relations (`relations.json` edges and blocs), resource records and resource sites (`resources.json`) can carry three optional fields:

| Field | Format | Meaning |
|---|---|---|
| `since` | `YYYY`, `YYYY-MM` or `YYYY-MM-DD` | When the agreement, arrangement or relationship the record describes began |
| `verified` | `YYYY-MM-DD` | When the record was last checked against its sources; never in the future |
| `sources` | list of `https://` links | Where the record's facts can be checked: official texts first, then reporting |

`npm run check-data` validates these fields and reports how many records carry sources; `npm run check-data -- --missing` lists the records that still have none. The dossier shows the dates and links under each record, and says plainly when a record has no documented source yet. Add a source and a `verified` date whenever you add or change a record.

## Open-data figures (`live/indicators.json`)

`scripts/fetch-indicators.ts` (`npm run fetch-indicators`) fetches seven World Bank series and writes `live/indicators.json`. The workflow `.github/workflows/update-indicators.yml` runs it every Monday and on demand, validates the result with `npm run check-data`, and commits the file to `main` when it changed.

| Key | Series | Original source | A country keeps its latest value within |
|---|---|---|---|
| `pop` | `SP.POP.TOTL` population | UN World Population Prospects | 10 years of the series' newest year |
| `gdp` | `NY.GDP.MKTP.CD` GDP, current US$ | World Bank and OECD national accounts | 10 years |
| `gdpPc` | `NY.GDP.PCAP.CD` GDP per person, current US$ | World Bank and OECD national accounts | 10 years |
| `refOrigin` | `SM.POP.RHCR.EO` + `SM.POP.RRWA.EO` refugees by country of origin | UNHCR (its mandate) + UNRWA (Palestine refugees) | 2 years |
| `refAsylum` | `SM.POP.RHCR.EA` + `SM.POP.RRWA.EA` refugees by country of asylum | UNHCR + UNRWA | 2 years |
| `idps` | `SM.POP.IDPC` internally displaced people | UNHCR and IDMC | 2 years |
| `battleDeaths` | `VC.BTL.DETH` battle-related deaths | UCDP | the newest year only (no value means no conflict reached UCDP's threshold that year) |

Where a key sums two series, a country counts only years in which both have a value. In October 2026 the World Bank moved `SM.POP.REFG`, `SM.POP.REFG.OR` and `VC.IDP.TOCV` to its archive (source 57, no longer served), so the keys above use their WDI replacements.

`values` maps each ISO3 code to `[value, year]` per series. The atlas shows every figure with its year and a link to the series. Where population or GDP has no value it falls back to Natural Earth's estimate and says so. Population and GDP are required: if one fails, covers too few countries or fails a sanity check (China and India above 1 billion people, US GDP above $10 trillion), the script writes nothing and the last good file stays in place. A humanitarian series that fails keeps its previous values, each with its own year, and the run shows a warning on its GitHub summary page. Before the first run the file lists the series with empty `values`.

## Notes on figures (`curated/figure_notes.json`)

Some open-data figures measure something narrower than they seem. For example, refugees "hosted" counts only people UNHCR recognises or UNRWA registers, so it says little about states that do not grant refugee status. `figure_notes.json` holds a short note per country and series (`countries.<ISO3>.<key>`, where the key is one of those in the table above), with `ar`, `en`, `sources` (https links) and a `verified` date. The dossier shows each note under the figures with its sources. `npm run check-data` checks the country codes and that no date lies in the future. Add a note only when its sources support it fully.

## Nuclear status (`curated/nuclear.json`)

The Nuclear lens reads this file. `countries.<ISO3>` holds:

| Field | Values | Meaning |
|---|---|---|
| `weapons` | `npt-nws`, `non-npt`, `undeclared`, `host`, `host-claimed`, `contested`, `relinquished` | Military status, one per state (see `NUCLEAR_STATUS` in `src/config.ts`) |
| `host` | ISO3 | Whose weapons a host state holds |
| `civil` | `operating`, `building`, `phased-out` | Power reactors |
| `npt` | `nws`, `non-party`, `withdrawn` | Only the exceptions; UN member states default to `party` |
| `note`, `sources`, `verified` | | As for other records |

`warheads` holds SIPRI's per-state estimates for one year, as total inventory. They must sum to SIPRI's world total for that year, and a test checks this. `zones` lists the nuclear-weapon-free zones with the states inside each treaty's scope. Membership of a zone does not mean a state has ratified the treaty. No military sites are recorded.

## Nuclear power plants (`curated/nuclear_plants.json`)

This file is derived from GeoNuclearData 0.17.17 (3 March 2024) and stays under that database's ODbL 1.0 licence. It holds one plant per site, and each plant lists its units with:

- `status`: `operating`, `suspended`, `building` or `shutdown`
- `type` and `model`
- `mw`: design net capacity
- `from` and `to`: years of service
- `iaea`: the PRIS id

Units whose status changed since March 2024 carry `changed` with the year and the sources. The yearly Reactor Atlas tables cover grid connections and shutdowns in 2024–2026; separate sources cover the Japanese restarts and the Zaporizhzhia cold shutdown. Units under construction missing from the base data were added from the Reactor Atlas plant pages (November 2026), so each state's count of units under construction matches the 2026 table. Each added unit carries its construction-start year and a link to its page. Russia's Baltic 1 is left out because it is no longer counted as under construction. Per-state totals come from the Reactor Atlas 2026 table (`fleet` in `nuclear.json`), and a test checks that each state's civil status agrees with both.

## Historical borders (`history/`)

The Historical borders lens loads these two files on demand:

- **`cshapes.topo.json`** is CShapes 2.0 (Gleditsch–Ward version), taken from the official `cshapes` 2.0 R package. Only that release carries the `status` and `owner` fields. The geometry is simplified to 4 % with mapshaper (`keep-shapes`, quantisation 1e5). Each geometry is one country-period with these fields:
  - `gwcode`, `country_name`
  - `start`, `end`
  - `status`: `independent`, `colony`, `protectorate`, `mandate`, `occupied` or `N/A`
  - `owner`: the ruling state's gwcode
  - `capname`, `caplong`, `caplat`
  - `b_def`: 1 if the borders are defined
  - `fid`
- **`meta.json`** holds:
  - Arabic names for every `country_name`
  - period names for a few states that changed name (Russian Empire, Soviet Union, Russia; Ottoman Empire, Turkey; Persia, Iran; German Empire, Germany; Qing China; Empire of Japan)
  - the colonial powers with fixed colours
  - the source, licence and citation

The data is under **CC BY-NC-SA 4.0**: attribution, non-commercial use, and share-alike. This folder is therefore licensed apart from the rest of the atlas, and the layer must not be used commercially.

Cite: Schvitz, Rüegger, Girardin, Cederman, Weidmann and Gleditsch (2022), *Mapping the International System, 1886–2019: The CShapes 2.0 Dataset*, Journal of Conflict Resolution 66(1): 144–61.

`npm run check-data` checks that every unit has the fields the lens reads, an Arabic name and a start that does not fall after its end.

## Pipelines and LNG terminals (`energy/`)

The Oil & gas pipelines lens loads these three files on demand. They come from the official downloads of Global Energy Monitor's trackers, which are under **CC BY 4.0** (stated on the Copyright sheet of each file):

- Gas pipelines: Global Gas Infrastructure Tracker, November 2025 release
- Oil and NGL pipelines: Global Oil Infrastructure Tracker, June 2026 release (the corrected file of 21 July 2026)
- LNG terminals: Global Gas Infrastructure Tracker, October 2026 release

- **`pipelines.topo.json`** (object `pipelines`) keeps only the segments that are operating or under construction and have a mapped route. Pieces that meet end to end are joined, stubs under 5 km are dropped, and the lines are simplified with mapshaper (`-simplify interval=2500`, no topology, quantisation 1e5); lines crossing the antimeridian are split. Each geometry is one GEM project row (a line, or one phase or branch of a larger system) with these fields:
  - `id`: GEM ProjectID
  - `n`: PipelineName (segments of one system share it); `sg`: SegmentName
  - `f`: `gas`, `oil` or `ngl`; `st`: `operating` or `construction`
  - `boe`: capacity in barrels of oil equivalent a day (GEM's conversion); `bcm`: capacity in bcm a year (gas)
  - `km`: length (GEM's published length, or its estimate from the route)
  - `c`: states on the route, in order, as ISO3 codes
  - `y`: start year (or expected start)
  - `o`: owner, with shares other than 100 %
  - `w`: GEM.wiki page
  - `acc`: route accuracy (`exact`, `high`, `medium`, `low`)
  - `a`, `b`: start and end locations; `d`: diameter
- **`lng.json`** has one entry per terminal and type (export or import), summing its operating and under-construction units: `id`, `n` (name), `t` (type), `st` (status), `iso`, `lon`, `lat`, `op` and `con` (capacity in million tonnes a year), `units`, `y` (first year in service), `yc` (planned start), `loc`, `o` (owner), `w` (GEM.wiki page), `fl` (floating), `approx` (approximate location).
- **`meta.json`** holds:
  - the three sources with their licence and citation
  - the atlas's Arabic names for prominent systems
  - sourced notes on nine strategic lines (East–West, Habshan–Fujairah, SUMED, Kirkuk–Ceyhan, Druzhba, TurkStream, Greater Nile, Arish–Ashkelon, the Myanmar–China lines), each linked to chokepoints and conflicts and checked against the sources on the date given

Idle, mothballed, proposed and cancelled lines (Nord Stream, Yamal–Europe, Kirkuk–Baniyas, for example) are not shown. GEM's status is as of each release; actual flows can differ, and the notes say so where they were checked. Some routes are only straight lines between the ends (`acc: low`), and the dossier says so.

Cite: Global Energy Monitor, Global Gas Infrastructure Tracker (November 2025 release for pipelines, October 2026 for LNG terminals); Global Oil Infrastructure Tracker - Oil/NGL Pipelines - June 2026 release.

`npm run check-data` checks that every segment is a line with a known fuel and status, a unique id and known states; that LNG terminals have a type, status and valid coordinates; and that every Arabic name and note points to a line in the data, with known chokepoints and conflicts and at least one https source.
