# Data licences

| Folder | Content | Licence |
|---|---|---|
| `geo/` | Country, boundary and disputed-area shapes, rivers and cities from [Natural Earth](https://www.naturalearthdata.com/) | Public domain |
| `live/` | Population, GDP, refugees, internal displacement and battle deaths from the [World Bank's open data](https://data.worldbank.org/), refreshed weekly | [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/) — World Bank; each series keeps its original publisher (UN, UNHCR, IDMC, UCDP) |
| `history/` | Historical borders of states and dependent territories, 1886–2019, from [CShapes 2.0](https://icr.ethz.ch/data/cshapes/) (ETH Zurich), simplified; Arabic names and ruler colours in `meta.json` | [CC BY-NC-SA 4.0](https://creativecommons.org/licenses/by-nc-sa/4.0/) — non-commercial, share-alike; cite Schvitz et al. (2022) |
| `curated/nuclear_plants.json` | Nuclear power plants and their units, derived from [GeoNuclearData](https://github.com/cristianst85/GeoNuclearData) with documented updates | [ODbL 1.0](https://opendatacommons.org/licenses/odbl/1-0/) — a derived database; contents under the [DbCL 1.0](https://opendatacommons.org/licenses/dbcl/1-0/) |
| `energy/` | Oil, gas and NGL pipelines (operating, under construction, and halted as an optional layer), LNG terminals, and oil and gas fields, from [Global Energy Monitor](https://globalenergymonitor.org/)'s gas and oil infrastructure trackers and its oil and gas extraction tracker, simplified; Arabic names and sourced notes in `meta.json` | [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/) — Global Energy Monitor |
| `power/` | Power plants of eight types (operating, under construction, and mothballed as an optional layer), from [Global Energy Monitor](https://globalenergymonitor.org/)'s Global Integrated Power Tracker; a map file and one detail file per state | [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/) — Global Energy Monitor |
| `industry/` | Coal and iron ore mines, coal terminals, and iron and steel, cement and chemical plants, from six [Global Energy Monitor](https://globalenergymonitor.org/) trackers | [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/) — Global Energy Monitor |
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

The file holds every unit of the base data that is operating, idle, under construction or permanently shut, so the timeline can show the fleet as it stood in any year. Three shut units have no start year (Lucens, Saxton and Shoreham), and the timeline leaves them out.

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

## Pipelines, LNG terminals and fields (`energy/`)

The Oil & gas pipelines lens loads these four files on demand. They come from the official downloads of Global Energy Monitor's trackers, which are under **CC BY 4.0** (stated on the Copyright sheet of each file):

- Gas pipelines: Global Gas Infrastructure Tracker, November 2025 release
- Oil and NGL pipelines: Global Oil Infrastructure Tracker, June 2026 release (the corrected file of 21 July 2026)
- LNG terminals: Global Gas Infrastructure Tracker, October 2026 release
- Oil and gas fields: Global Oil and Gas Extraction Tracker, March 2026 release

- **`pipelines.topo.json`** (object `pipelines`) keeps the segments that are operating, under construction, idle or mothballed and have a mapped route. Pieces that meet end to end are joined, stubs under 5 km are dropped, and the lines are simplified with mapshaper (`-simplify interval=2500`, no topology, quantisation 1e5); lines crossing the antimeridian are split. Each geometry is one GEM project row (a line, or one phase or branch of a larger system) with these fields:
  - `id`: GEM ProjectID
  - `n`: PipelineName (segments of one system share it); `sg`: SegmentName
  - `f`: `gas`, `oil` or `ngl`; `st`: `operating`, `construction`, `idle` or `mothballed` (the last two form the optional halted layer)
  - `boe`: capacity in barrels of oil equivalent a day (GEM's conversion); `bcm`: capacity in bcm a year (gas)
  - `km`: length (GEM's published length, or its estimate from the route)
  - `c`: states on the route, in order, as ISO3 codes
  - `y`: start year (or expected start); `z`: year operations stopped (halted lines, where GEM gives it)
  - `o`: owner, with shares other than 100 %
  - `w`: GEM.wiki page
  - `acc`: route accuracy (`exact`, `high`, `medium`, `low`)
  - `a`, `b`: start and end locations; `d`: diameter
- **`lng.json`** has one entry per terminal and type (export or import), summing its operating and under-construction units: `id`, `n` (name), `t` (type), `st` (status), `iso`, `lon`, `lat`, `op` and `con` (capacity in million tonnes a year), `units`, `y` (first year in service), `yc` (planned start), `loc`, `o` (owner), `w` (GEM.wiki page), `fl` (floating), `approx` (approximate location).
- **`fields.json`** (minified) has one entry per extraction unit that is producing (`operating`), in development (`construction`) or mothballed and has coordinates, from the main, production and reserves sheets. GEM tracks fields, and also projects that group several fields under one development (Ghawar, North Field, South Pars); a project is an entry of its own (`pj: 1`) with its fields in `u`, and each such field points back to it in `p`. GEM reports some production only for the project, so both are kept, and a project's figures overlap its fields'. Fields:
  - `id`: GEM Unit ID or Project ID; `n`: name as GEM gives it, with the place in brackets
  - `f`: `o`, `g` or `og` (oil, gas, both); `st`: status
  - `lon`, `lat`; `approx`: the location is approximate; `c`: ISO3 code of the state
  - `op`: operator; `b`: basin; `sea`: 1 offshore, 0 onshore; `unc`: unconventional
  - `dy`, `fy`, `py`: years of discovery, final investment decision and production start (or expected start)
  - `lq`: liquids in million barrels a year; `gs`: gas in million m³ a year; `y`: the year of both (the latest GEM publishes; projects give none). Where GEM splits the output (crude, condensate, NGL; associated and non-associated gas), liquids are summed and gas takes the most general row. A recorded zero is dropped, leaving `y`.
  - `boe`: the atlas's sum of both in million barrels of oil equivalent a year, at 164.2 m³ of gas to the barrel (5.8 thousand cubic feet, the SPE convention), used only to size the dot
  - `rs`: the latest reserves figure as `[fuel, class, quantity, unit, year]`, verbatim; classes vary from source to source (2P, remaining, in place, Russian A+B+C1...) and do not compare directly
  - `w`: GEM.wiki page, stored only when it is not the name with underscores; `''` when GEM gives none
- **`meta.json`** holds:
  - the four sources with their licence and citation
  - `landmarks`: the atlas's short Arabic and English names of 57 prominent fields and projects (Ghawar, North Field, Rumaila, Kirkuk …), by GEM unit id: labels on the map from mid zoom, and the field's Arabic name in its dossier, tooltip and search
  - the atlas's Arabic names for prominent systems
  - sourced notes on fourteen strategic lines, each linked to chokepoints and conflicts and checked against the sources on the date given: nine active (East–West, Habshan–Fujairah, SUMED, Kirkuk–Ceyhan, Druzhba, TurkStream, Greater Nile, Arish–Ashkelon, the Myanmar–China lines) and five halted (Nord Stream 1 and 2, Yamal–Europe, IPSA, Kirkuk–Baniyas, Masila–al-Shihr)

Idle and mothballed lines (Nord Stream, Yamal–Europe, Kirkuk–Baniyas, for example) are a layer of their own, off by default and drawn dotted; proposed, shelved, cancelled and retired lines are not included. GEM's status is as of each release; actual flows can differ, and the notes say so where they were checked. Some routes are only straight lines between the ends (`acc: low`), and the dossier says so.

Cite: Global Energy Monitor, Global Gas Infrastructure Tracker (November 2025 release for pipelines, October 2026 for LNG terminals); Global Oil Infrastructure Tracker - Oil/NGL Pipelines - June 2026 release; Global Oil and Gas Extraction Tracker, 2026 release (March 2026).

Fields follow GEM's coverage: units producing 1 million boe a year or more, or holding 25 million boe of reserves. Discovered but undeveloped fields, abandoned ones and the 465 fields without coordinates are left out. Mothballed fields go with the halted layer. Names stay in English as GEM gives them.

`npm run check-data` checks that every segment is a line with a known fuel and status, a unique id and known states, and a stop year only if it is halted; that LNG terminals have a type, status and valid coordinates; that every Arabic name and note points to a line in the data, with known chokepoints and conflicts and at least one https source; and that fields have a unique id, a known kind, status and state, valid coordinates and positive production, and that projects and their fields point to each other.

## Power plants (`power/`)

The Power & industry lens loads these files on demand. They come from the official download of Global Energy Monitor's **Global Integrated Power Tracker** (September 2026 V2 release, **CC BY 4.0**), which brings together GEM's eight power trackers: coal, oil and gas, nuclear, hydropower, utility-scale solar, wind, bioenergy and geothermal.

There is one entry per GEM location (a plant, or a project of several phases). Its units that are operating, under construction or mothballed are summed. A location whose units are all retired is kept as a retired plant when GEM gives its start and retirement years, for the timeline only (GEM tracks coal retirements since 2000, others in part). The plant takes the type with the most capacity, and the location of its largest unit. Proposed, cancelled, shelved and retired units are left out. Solar, wind and bioenergy plants under 50 MW and other plants under 20 MW are dropped; every nuclear and geothermal plant is kept. GEM's own thresholds come first (coal from 30 MW; oil and gas from 50 MW, or 20 MW in the EU and UK; wind from 10 MW; hydropower from 30 MW; bioenergy from 20 MW). Units with a TransitionZero id (`TZ:`) are left out: GEM sourced them partly from TransitionZero's Solar Asset Mapper, which is under CC BY-NC 4.0.

- **`plants.json`** (minified) holds what the map, tooltip and search need, as parallel columns:
  - `id`: GEM location id less 10¹¹ (`L100000601194` is 601194)
  - `n`: name as GEM gives it
  - `t`: one letter per plant: `c` coal, `g` oil and gas, `n` nuclear, `h` hydropower, `s` solar, `w` wind, `b` bioenergy, `e` geothermal
  - `s`: one letter per plant: `o` operating, `c` under construction, `m` mothballed, `r` retired (shown only with the timeline)
  - `mw`: capacity of those units in MW
  - `x`, `y`: longitude and latitude × 1,000
  - `c`: index into `iso` (the ISO3 codes), or −1
  - `y0`: first year in service of its operating or mothballed units (for a plant under construction, its expected year), 0 when unknown; `y1`: the year a retired plant closed, 0 otherwise. With the map's year filter on, a plant shows from `y0` until `y1`.
  - `pa`: index into `parents`, the company each plant answers to (its first, largest parent, else its first owner, without the share), or −1; it lights up a company's sites across the infrastructure lenses
  - `ar`: `[position, Arabic name]` for plants in Arab League states whose GEM local name is in Arabic (not Persian or Urdu)
- **`detail/<ISO3>.json`** (minified, `_` for the one plant without a state) maps each plant id to the rest:
  - `op`, `con`, `mb`, `ret`: MW operating, under construction, mothballed and retired
  - `mix`: `[type, MW]` for the 200 plants that mix types
  - `approx`, `c`, `sub`: approximate location, states (two for binational dams) and province
  - `y`, `yc`, `ry`: first year in service, expected year of the first unit under construction, and earliest planned retirement
  - `tech`, `fuel`: technology and fuel as GEM gives them (the dossier translates the common ones)
  - `u`: number of units
  - `o`, `par`: owner and, where different, parent
  - `riv`: river (hydropower)
  - `chp`, `ccs`, `cap`: combined heat and power, carbon capture, and the industry a captive plant serves
  - `w`: GEM.wiki page, stored only when it is not the name with underscores; `''` when GEM gives none
- **`countries.json`** (minified) holds each state's capacity by type in MW, `op` in operation and `con` under construction, summed over every unit GEM lists however small (TransitionZero-sourced units still left out; binational dams split by each state's share). It feeds the country summary the lens shows when zoomed out (capacity in operation, renewable share, coal share, capacity under construction) and the electricity section of the country dossier. Rooftop (distributed) solar is not in the tracker's units, so solar's share is below the real one in some states.
- **`meta.json`** holds the source with its licence and citation, and `landmarks`: the atlas's short Arabic and English names of 54 prominent plants (dams, nuclear and solar plants, the region's largest stations), by location id. They label the map from mid zoom, and give a plant its Arabic name where GEM gives none.

Cite: Global Energy Monitor, Global Integrated Power Tracker, September 2026 release.

`npm run check-data` checks that the columns line up, that type and status codes and states are known and coordinates valid, that every plant is in the detail file of its state, and only there, and that the state totals have known states and types and positive capacities.

## Mines and heavy industry (`industry/`)

The industry mode of the Power & industry lens loads these files the first time it opens. They come from the official downloads of six Global Energy Monitor trackers, each under **CC BY 4.0** (stated on its About sheet):

- Coal mines (`cm`): Global Coal Mine Tracker, August 2026 release (non-closed mines)
- Coal terminals (`ct`): Global Coal Terminals Tracker, December 2024 release
- Iron ore mines (`io`): Global Iron Ore Mines Tracker, September 2026 (V1) release
- Iron and steel plants (`st`): Global Iron and Steel Tracker, September 2026 (V1) release (plant data, capacities and production)
- Cement plants (`ce`): Global Cement and Concrete Tracker, July 2026 (V1) release
- Chemical plants (`ch`): Global Chemicals Tracker, November 2026 (V1) release (ammonia, methanol, olefins and aromatics)

Sites that are operating, under construction or mothballed and have coordinates are kept. A coal mine counts as under construction when GEM lists it as proposed with the detail "Construction". A mine's expansions (rows under the same mine id) and a terminal's units are grouped, taking the status of the most advanced. A steel plant's status and capacity come from the capacities sheet ("operating pre-retirement" counts as operating), and its output is the latest year of crude steel on the production sheet. A chemical plant's capacity is the sum of its operating products.

- **`sites.json`** (minified) has one entry per site:
  - `id`: GEM id (`M…` mine, `T…` terminal, `P…` plant or asset), unique across layers; `l`: layer
  - `n`: name; `ar`: GEM's local name when it is Arabic (not Persian or Urdu)
  - `st`: `operating`, `construction` or `mothballed`
  - `lon`, `lat`, `approx`; `c`: ISO3 code of the state (French overseas regions under FRA); `sub`: province
  - `cap`: capacity in operation; `capc`: capacity under construction (expansions, units, plants); `prod`, `py`: output and its year. Units are million tonnes a year for coal mines, terminals and cement, and thousand tonnes a year for iron ore, steel and chemicals.
  - `o`, `par`: owner and parent; `y`: first year in operation; `ccs`: carbon capture or use; `w`: GEM.wiki page when it is not the name with underscores, `''` when GEM gives none
  - Coal mines: `mt` mine type, `ct` coal type, `res` proven and probable reserves (Mt), `ch4` GEM's methane emissions estimate (million tonnes a year), `wf` workforce, `cf` coalfield, `dest` main consumer
  - Coal terminals: `port`, `tt` terminal type, `pt` cargo, `src` coal source
  - Iron ore mines: `res` reserves (thousand tonnes)
  - Steel: `iron` iron capacity, `eq` production equipment, `prd` products, `wf` workforce
  - Cement: `clk` clinker capacity, `pt` plant type, `kil` kilns
  - Chemicals: `pc` capacity by product, `prd` products, `fs` feedstock, `pt` plant type
- **`meta.json`** holds the six sources with their licence and citation.

Cite each tracker as its About sheet recommends, for example: Global Energy Monitor, Global Coal Mine Tracker, August 2026 release.

`npm run check-data` checks that every site has a unique id, a known layer with a source, a known status and state, valid coordinates and positive capacities.

## Rivers, cities and water names (`geo/rivers.json`, `geo/cities.json`, `geo/water.json`)

Two optional base layers from Natural Earth 1:50m, version 5.2.0-pre of the `natural-earth-vector` repository. They are public domain. Each file loads the first time its layer is turned on in the map's layers menu.

- `rivers.json` holds rivers and lake centrelines, one row per Natural Earth feature: `[scalerank, lines]`.
  - `scalerank` runs from 1 (the largest) to 6. The map shows ranks 1–2 in the world view and more as it zooms in.
  - `lines` is a list of `[lon, lat]` lines, simplified with a 0.02° tolerance and rounded to 2 decimals.
  - The 1:50m file has no Arabic names. The names of the major rivers are in `water.json`.
- `cities.json` holds populated places, the most populous first, without scientific stations and historic places: `[name, name_ar, lon, lat, pop_max, scalerank, capital]`.
  - `capital` is 1 for national capitals (`Admin-0 capital` and `Admin-0 capital alt`).
  - The map places cities after every other name: a dot and its name where both fit, larger ranks as it zooms in, capitals from the regional view.
  - Populations (`POP_MAX`) are Natural Earth's approximate estimates and are only used for ranking.
- `water.json` holds the names the map sets on the water, in two lists:
  - `seas`: `[name_ar, name, featurecla, scalerank, lon, lat]` for 116 oceans, seas, gulfs, bays, straits and channels, with Natural Earth's own Arabic names. Each sits at the point inside its water farthest from the coasts. The points for the Persian Gulf, the Red Sea, the Mediterranean and the Gulf of Aden were set by hand, because the computed ones fall among other names. The layer "Sea and ocean names" is on by default.
  - `rivers`: `[name_ar, name, scalerank, places]` for 59 major rivers. Natural Earth has no Arabic river names at this scale, so these names are the atlas's own. `places` lists up to three places along the river's longest line (half way, then a third and two thirds of the way). Each place is `[lon, lat, lon2, lat2]`, the place and a point further on that gives the line's direction. The map uses the first place where the name fits, and shows river names with the rivers layer.
