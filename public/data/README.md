# Data licences

| Folder | Content | Licence |
|---|---|---|
| `geo/` | Country, boundary and disputed-area shapes from [Natural Earth](https://www.naturalearthdata.com/) | Public domain |
| `live/` | Population, GDP, refugees, internal displacement and battle deaths from the [World Bank's open data](https://data.worldbank.org/), refreshed weekly | [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/) — World Bank; each series keeps its original publisher (UN, UNHCR, IDMC, UCDP) |
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
| `refOrigin` | `SM.POP.REFG.OR` refugees by country of origin | UNHCR | 2 years |
| `refAsylum` | `SM.POP.REFG` refugees by country of asylum | UNHCR | 2 years |
| `idps` | `VC.IDP.TOCV` internally displaced by conflict and violence | IDMC | 2 years |
| `battleDeaths` | `VC.BTL.DETH` battle-related deaths | UCDP | the newest year only (no value means no conflict reached UCDP's threshold that year) |

`values` maps each ISO3 code to `[value, year]` per series. The atlas shows every figure with its year and a link to the series. Where population or GDP has no value it falls back to Natural Earth's estimate and says so. The script writes nothing when a request fails, a series covers too few countries or a sanity check fails (China and India above 1 billion people, US GDP above $10 trillion), so the last good file stays in place. Before the first run the file lists the series with empty `values`.
