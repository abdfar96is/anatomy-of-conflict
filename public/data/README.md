# Data licences

| Folder | Content | Licence |
|---|---|---|
| `geo/` | Country, boundary and disputed-area shapes from [Natural Earth](https://www.naturalearthdata.com/) | Public domain |
| `live/` | Population, GDP, refugees, internal displacement and battle deaths from the [World Bank's open data](https://data.worldbank.org/), refreshed weekly | [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/) — World Bank; each series keeps its original publisher (UN, UNHCR, IDMC, UCDP) |
| `curated/nuclear_plants.json` | Nuclear power plants and their units, derived from [GeoNuclearData](https://github.com/cristianst85/GeoNuclearData) with documented updates | [ODbL 1.0](https://opendatacommons.org/licenses/odbl/1-0/) — a derived database; contents under the [DbCL 1.0](https://opendatacommons.org/licenses/dbcl/1-0/) |
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

Units whose status changed since March 2024 carry `changed` with the year and the sources. The yearly Reactor Atlas tables cover grid connections and shutdowns in 2024–2026; separate sources cover the Japanese restarts and the Zaporizhzhia cold shutdown. Construction begun after March 2024 is not included. Per-state totals come from the Reactor Atlas 2026 table (`fleet` in `nuclear.json`), and a test checks that each state's civil status agrees with both.
