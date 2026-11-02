# Data licences

| Folder | Content | Licence |
|---|---|---|
| `geo/` | Country, boundary and disputed-area shapes from [Natural Earth](https://www.naturalearthdata.com/) | Public domain |
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
