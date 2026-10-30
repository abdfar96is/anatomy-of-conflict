# Fault Lines Atlas v3: open source, React, open data — design

Date: 2026-10-31 · Branch: `react-rewrite` · Status: draft for approval

## 1. Intent

Fault Lines Atlas (أطلس خطوط الصدع) is a bilingual (Arabic-first, English) interactive atlas that links geography to ethnicity, religion, conflicts, resources and alliances. Today it is a static vanilla-JS site (ES modules + d3 canvas map + hand-compiled JSON), live at https://fault-lines-atlas.vercel.app from https://github.com/muradalshorman987/fault-lines-atlas (`main`).

The owner wants it to become a real open-source project:
- rebuilt in React with a structure other developers can understand and extend
- fed by open data APIs, so the numbers stay current without hand edits
- open to outside contributions

**Who it is for** (owner's answer): students, journalists and curious readers, in Arabic and English. A secondary audience is contributors who fix data or add records through GitHub.

**Success means:**
- The React site does everything today's site does, in both languages and both themes, on phone and desktop.
- Every week, an automatic pull request refreshes population, GDP, conflict deaths, refugees, minerals and energy, with source and year shown in the UI.
- A newcomer can clone the repo, run it, fix a data error and open a pull request by following the docs alone.

## 2. Goals, non-goals, anti-goals

**Goals**
1. Feature parity with the current site:
   - globe and flat map, lenses, layers and the time scrubber
   - dossiers for every record kind
   - the index, network, timeline, compare and sources views
   - guided tours, the search palette, help, toasts, tooltips
   - dark and light themes, Arabic RTL and English LTR, keyboard shortcuts
   - share links: the URL hash tokens stay exactly as today (`#country-SAU`, `#conflict-sudan`, `#compare-USA-CHN`, `#tour-energy`, `#lens-religion`, `#view-network`), so existing links keep working
2. A clean React + TypeScript codebase with tests, CI and contributor docs.
3. A weekly data pipeline (GitHub Action) that pulls open data, validates it, and opens a pull request for the owner to review and merge.
4. An "Ask Claude" panel where visitors use their own Anthropic API key. It costs the owner nothing and needs no server.
5. An optional "detailed map" mode, with street-level zoom from open vector tiles, beside today's globe and flat views.

**Non-goals (this round)**
- no backend, database, user accounts or analytics
- no languages beyond Arabic and English
- no automatic rewriting of written content. Descriptions, analysis, ethnic and religious shares, alliance lists and timelines stay hand-written (owner's answer: the pipeline updates numbers only).
- no live API calls from the browser, except basemap tiles (detailed mode) and the visitor's own Anthropic call

**Anti-goals (failure even if it "works")**
- losing a current feature, or the quality of the Arabic layout
- an API key in the repo or in the browser bundle
- data under a licence that forbids publishing it in a public repo, such as ACLED, Pew, EPR, Correlates of War or REST Countries (see §6)
- generated numbers silently replacing or contradicting curated text without the source and year being shown
- the site breaking because an API is down. The pipeline keeps the last good data.
- the bot pushing to `main`. Data updates arrive only as pull requests.

## 3. Constraints

- **Owner's working rules:**
  - Nothing is pushed or merged without the owner saying so.
  - One commit per step.
  - Code changes start only after the owner approves this design and the plan.
- **Usage budget:** the owner asked to stop when the weekly Claude usage reaches 80%. At the end of every milestone, read `data.weeklyPercent` from `C:\Users\admin\.claude\plugins\oh-my-claudecode\.usage-cache-anthropic.json`. That is the all-models number; the owner chose it on 2026-10-31, and the Fable-only bucket is ignored. At ≥ 80%, stop and write a handoff note (what is done, the next step). If `lastSuccessAt` is more than 2 hours old, treat the number as unknown and stop at the next milestone boundary. Work is split into milestones so it can resume in a later session.
- **Hosting:** Vercel static hosting, the same project and link. The current site stays on `main` until the owner merges `react-rewrite`. Vercel builds preview links for the branch once it is pushed.
- **Machine:** Windows 11, Node 24.22, npm 11.19. The network used to break TLS with a corporate certificate. If npm or fetch fails that way, use `NODE_EXTRA_CA_CERTS` or Node's `--use-system-ca`; never disable TLS checks.
- **Licences:** data from the original atlas is a CC BY 4.0 compilation, so the Sources page must stay reachable and credit it. Natural Earth is public domain.

## 4. Decisions

**The owner's** (answered 2026-10-31 by accepting my proposals):
- Audience: students, journalists and curious readers, in Arabic and English.
- The pipeline updates numbers only. Written content stays hand-made.
- Ask Claude: visitors bring their own API key.
- Map: keep today's look; add the detailed map as an option.
- Contributions welcome: contributor docs plus automatic data checks.
- Same repo and link, built on a new branch so the live site keeps working until the owner switches.

**Mine** (the owner can overrule any of these):
- **D1. Stack:** Vite + React 19 + TypeScript (strict). Zustand for app state, because it fits today's single-store-plus-events design. d3 from npm (`d3-geo`, `d3-zoom`, `d3-force`, …) instead of the CDN.
- **D2. The map engine stays canvas + d3-geo.** It is ported to TypeScript classes and driven from a React component. React does not render map features, which keeps today's performance.
- **D3. Styling:** the existing token CSS (`base.css`, both themes) and the per-feature CSS carry over as plain CSS files imported by their feature folders. No CSS framework, and no visual redesign in this round.
- **D4. Curated data becomes the editable source of truth.** A one-time migration applies today's `errata.js` corrections into the curated JSON. The correction list moves to `corrections.json`, and the Sources page still shows it. The "unverified" list becomes an `unverified: true` field on each record. A test proves the migrated data builds the same model as the old data plus errata. Reason: contributors should edit one file, not learn an errata layer.
- **D5. Generated data lives apart from curated data.** It is never merged into curated files; the app joins the two at load time.
- **D6. Ask Claude calls the Anthropic Messages API directly from the browser**, using the visitor's key and the `anthropic-dangerous-direct-browser-access` header:
  - The key is held in memory, or in localStorage only if the visitor ticks "remember on this device".
  - The tools keep today's behaviour: `search_atlas`, `get_record`, `list_records`, `show_on_map`.
  - Read the `claude-api` skill before writing this code, and choose the model there. The default should be a model that keeps the visitor's cost low, and visitors can switch.
- **D7. Detailed map:** MapLibre GL JS with OpenFreeMap tiles (no key, OSM attribution shown). Our Natural Earth countries sit on top, coloured by the current lens. The scope is lens colours, selection and click-to-select; markers and arcs come later. It loads as a lazy chunk.
- **D8. Licence:** MIT for code, copyright "muradalshorman987 and contributors". CC BY 4.0 for curated data. Each generated file keeps its source's licence, listed in `data/README.md`.
- **D9. The claude.ai artifact (HDauVJCwxi48BnzMQzP3fY) stays as it is**, as the vanilla version. This project does not update it, and the React build does not need to run inside claude.ai. Ask Claude in the React app uses the visitor's key only; there is no `window.claude` path.
- **D10. Generated figures replace Natural Earth's population and GDP everywhere:** map colours (overview lens), tooltip, compare view and dossiers.
  - Each figure carries a source-and-year chip.
  - Natural Earth's `pop_est`/`gdp_md` are used only when no generated value exists.
  - The overview lens recomputes its colour breaks from the new values.
  - The M3 parity check expects these numbers to differ from the live site. That difference is intended.
- **D11. The data workflow checks itself.** `data-update.yml` runs check-data, typecheck and the unit tests before it opens the pull request, so it works with GitHub's default token, which cannot trigger `ci.yml`. An optional fine-grained token secret (`DATA_PR_TOKEN`) also lets the normal CI run on data PRs. At M5 the owner is told to enable the repo setting "Allow GitHub Actions to create and approve pull requests".
- **D12. Generated file shape:** see §6. One file holds several indicators per key, and an optional yearly series per indicator. Minerals and energy cover only the resource types already in `resources.json`, not every USGS commodity.

## 5. Structure

```
fault-lines-atlas/
  index.html                 Vite entry. Keeps today's pre-paint lang/theme script and the fonts.
  vercel.json                framework vite, build "npm run build", output "dist", security headers incl. CSP
  public/data/
    geo/                     countries.json, boundary_lines.json, disputed_areas.json, country_index.json (Natural Earth based)
    curated/                 today's thematic/*.json after the D4 migration + corrections.json
    generated/               pipeline output (one file per source) + _status.json (last run per source)
  src/
    main.tsx, App.tsx
    app/                     store.ts (Zustand; same state keys as today's store.js), hash.ts, prefs.ts, events.ts (hover/flyto/highlight/toast bus)
    data/                    types.ts, schema.ts (zod), load.ts (builds the DB model; port of data.js), join.ts (curated + generated)
    i18n/                    ar.ts, en.ts, useT.ts, format.ts (Intl number/date helpers)
    ui/                      Icon, Button, Chip, Tabs, Tooltip, Dialog, charts (Donut, BarList, StackBar, Histogram, Pips)
    features/
      map/                   AtlasMap.tsx, Legend.tsx, engine/ (geo.ts, scene.ts, render.ts, pick.ts, palette.ts)
      detailed-map/          DetailedMap.tsx (lazy)
      shell/                 TopBar, LensRail, Scrubber, Palette, Help, Toasts, MobileSheet
      dossier/               Dossier.tsx + one panel per record kind
      views/                 IndexView, NetworkView, TimelineView, CompareView, SourcesView (each lazy)
      tours/                 tours.ts (content) + TourPlayer.tsx
      ask/                   AskPanel.tsx, anthropic.ts (fetch + stream + tool loop), tools.ts, KeyDialog.tsx
    styles/                  tokens.css, base.css (today's base.css split)
  scripts/
    migrate-errata.ts        one-time D4 migration (kept for the record)
    data/                    update.ts (runs all fetchers), fetchers/{worldbank,ucdp,unhcr,usgs,eia,wikidata}.ts, report.ts
    check-data.ts            validates every data file against the zod schemas (used by CI and contributors)
  tests/                     unit (vitest) + e2e (Playwright)
  .github/
    workflows/ci.yml         install, typecheck, lint, unit tests, check-data, build, Playwright smoke
    workflows/data-update.yml  weekly cron + manual run: update, check, open a PR (never push to main)
    ISSUE_TEMPLATE/          data correction, new record, bug
    pull_request_template.md
  docs/                      ARCHITECTURE.md, DATA.md (every source, licence, fields, refresh), superpowers/specs, plans
  README.md (EN) + README.ar.md, CONTRIBUTING.md (EN + AR), CODE_OF_CONDUCT.md, SECURITY.md, LICENSE, data/README.md (data licences)
```

**Module rule (carried over):** features don't import each other. They talk through the store and the small event bus, as today.

## 6. Open data sources

These were checked against the official sites on 30–31 Oct 2026. The pipeline uses only sources that allow publishing derived data in a public repo.

| Source | Feeds | Licence | Key |
|---|---|---|---|
| World Bank Indicators API v2 | population, GDP, GDP per capita (dossier, compare, overview lens) | CC BY 4.0 | none |
| UCDP bulk downloads (GED yearly + candidate events monthly). Not the API, which needs a token | conflict deaths per year for mapped conflicts | CC BY 4.0 | none |
| UNHCR Refugee Statistics API | refugees, asylum seekers and IDPs, by origin and host country | CC BY 4.0 | none |
| USGS Mineral Commodity Summaries data release (yearly) | mine production and reserves by country | CC0 | none |
| EIA API v2 `/international` | oil, gas and coal production and reserves | public domain | free key, stored as the `EIA_API_KEY` GitHub secret. Skipped cleanly if missing |
| Wikidata SPARQL | **drift report only:** bloc memberships (P463 with dates) compared with the curated blocs, written into the pull request text, never applied automatically | CC0 | none (User-Agent required) |
| Natural Earth | map geometry (static, no weekly fetch) | public domain | none |
| OpenFreeMap | detailed-map tiles (browser) | OSM ODbL, attribution shown | none |

**Excluded because of licences:**
- ACLED, including HDX HAPI conflict events
- Pew religion data (excerpts only)
- EPR / GeoEPR (non-commercial)
- Correlates of War (no redistribution)
- REST Countries (key required, no storage)
- geoBoundaries gbAuthoritative

**Excluded because they're gone or unreliable:** GDELT GEO returns 404. The CIA World Factbook ended in Feb 2026; its final snapshot can be a reference for contributors, but it is not in the pipeline.

**Pipeline rules:**
- Each fetcher writes `public/data/generated/<source>.json`. The shape is `{ source, licence, url, fetchedAt, indicators: { <indicatorId>: { label: {ar,en}, unit } }, records: { <key>: { <indicatorId>: { value, year, series?: [{ year, value }] } } } }`. Examples of indicator ids: `population`, `gdp`, `gdpPerCapita`, `refugeesFrom`, `refugeesIn`, `idps`, `deaths`, `prod:<resourceType>`, `reserves:<resourceType>`.
- Countries are keyed by ISO3, with today's `XKX→KOS` alias. Conflicts are keyed by atlas conflict id.
- A fetcher that fails, or whose output fails the schema, keeps the previous file and records the error in `_status.json`. The run still succeeds for the other sources.
- **UCDP mapping:** curated conflicts get an optional `ucdp: [conflict_id…]` field, filled by hand. The builder seeds the obvious matches, and unmapped conflicts simply show no UCDP figures.
- **The pull request text** is generated by `report.ts`. It lists, per source, how many values changed, the biggest changes, failures, and the Wikidata bloc drift.

**In the UI:**
- Generated figures appear in a "Latest figures" block in country dossiers, and as a deaths-per-year bar chart in conflict dossiers (from the `deaths` series).
- Population and GDP also replace the Natural Earth values everywhere (D10).
- Every figure carries a source-and-year chip.
- The curated or Natural Earth figure is a fallback, used only when no generated value exists.
- The Sources view lists each generated source with its licence and last fetch date.

## 7. Ask Claude (visitor's own key)

- **Before a key is set:** the button is always visible and opens a short explanation plus a key field. The text says where to get a key, that each question costs the visitor a small amount, and that the key goes only from their browser to Anthropic.
- **The chat itself** keeps today's behaviour:
  - answers grounded in atlas data, with an as-of date, neutral, in the UI language, about 220 words or fewer
  - `[[kind:id]]` references turned into clickable record links
  - streaming text and Stop
  - error handling per HTTP status (401 bad key, 429 rate limit, 529 overloaded)
- **Safety:**
  - Answers render through React (never as raw HTML) with a small markdown subset.
  - A strict CSP in `vercel.json` allows `connect-src` only to self, `api.anthropic.com` and the tile hosts.
  - The key is never logged or put in the URL.
- **Tool loop:** it runs in the browser with the same four tools as today, with a maximum number of tool rounds per question.

## 8. Milestones

Each milestone ends with commits on `react-rewrite`, a short handoff note in `docs/superpowers/plans/`, and a usage check (§3).

| # | Milestone | Done means |
|---|---|---|
| M1 | **Foundation:** scaffold, lint, tests, CI, LICENSE; data types, schemas and loader; D4 migration; store, hash and prefs; i18n | unit tests pass, including the "migrated data = old data + errata" model test and hash round-trips for every token kind; `npm run build` works |
| M2 | **Map + shell:** canvas map engine in React, legend, top bar, lens rail, scrubber, palette, help, toasts, tooltip, mobile sheet | every lens and layer renders in AR/EN and dark/light; no console errors; no sideways scroll at 390 px |
| M3 | **Dossiers, views, tours = parity** | parity checklist (§9) passes; Playwright smoke passes; a Vercel preview link works once the owner allows a push. **At this point the owner can switch production.** |
| M4 | **Open-source package:** README EN and AR, CONTRIBUTING EN and AR, data licences, DATA.md, ARCHITECTURE.md, templates, code of conduct, security policy | a fresh clone runs by following the README alone; `npm run check-data` gives readable errors for a broken record |
| M5 | **Data pipeline** + "Latest figures" UI + weekly workflow | a local `npm run data:update` produces all files (EIA skipped without a key); a forced failure keeps the old file; the workflow file is valid and opens a PR in a test run once pushed |
| M6 | **Ask Claude**, visitor's key | works with a real key: streaming, tool calls, record links; a bad key shows the right message; CSP in place |
| M7 | **Detailed map** option | toggles from the projection control; lens colours and selection work; Arabic labels shape correctly (MapLibre RTL text plugin); lazy-loaded |

## 9. Parity checklist (M3)

Every item is checked in AR and EN, dark and light, desktop and 390 px phone, against the live site:
- **Lenses and the map:** each lens; globe and flat views; drag and zoom; hover tooltip; click to select.
- **Dossiers and links:** every dossier kind (country, conflict, group, religion, choke, disputed, event, bloc, site); every hash token from a cold load.
- **Views:** compare from a link; network graph auto-fit; timeline play and scrub.
- **Tours and search:** each tour; search palette (`/` and Ctrl+K); help (`?`).
- **Keyboard and phone:** Esc closes layers in order; the phone dossier and view do not overlap.
- **Data labels:** unverified badges and the corrections list on Sources.

## 10. Risks

- **Usage budget:** about 12% of weekly headroom remains today. A full rewrite will likely take several sessions, so the milestone handoffs are what make it resumable.
- **Port size:** today's code is about 600 KB of JS, and the dossiers (79 KB) and shell (49 KB) modules are the largest. Port them view by view against the parity checklist; don't rewrite from memory.
- **Data sources:** UCDP mapping is manual and partial. Wikidata's query backend migrates in 2026–27, so use plain SPARQL 1.1.
- **MapLibre:** Arabic labels need the RTL text plugin. OpenFreeMap is donation-funded, and the detailed mode must fail gracefully back to the canvas map.
- **Bring-your-own key:** any XSS would expose visitor keys, so React escaping, the CSP, and no `dangerouslySetInnerHTML` for answers are mandatory.

## 11. Left to the builder

Component boundaries inside each feature, exact npm package versions, ESLint rules, the full unit test list, the Ask Claude model list, the OpenFreeMap style (one dark and one light), the chart implementation details, and how much of today's CSS gets split versus moved as is.
