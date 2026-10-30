# M1 Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A Vite + React + TypeScript app on `react-rewrite`. When it's done:
- it loads the atlas data into a typed model identical to today's
- it keeps the same state, share links and preferences
- it applies the D4 data migration
- it passes typecheck, lint, unit tests and `check-data` in CI

There is no map or panels yet; M2 and M3 add them.

**Architecture:**
- **Data:** a pure `build(raw) → DB` (a port of `js/data.js`) behind a thin `fetch` loader.
- **State:** a Zustand store holds today's `store.js` state, and a tiny typed event bus carries the transient events (hover, flyto, highlight, toast, starttour, ready).
- **Share links:** hash sync subscribes to the store.
- **The old app** moves to `legacy/` as read-only reference until M3 ends.

**Tech Stack:** Node 24, npm 11, Vite, React 19, TypeScript (strict), Zustand, d3-geo, Vitest + Testing Library (jsdom), ESLint (flat config), zod and tsx (scripts and tests only). Use the latest stable versions at install time (`npm view <pkg> version`); don't take version numbers from memory.

**Spec:** `docs/superpowers/specs/2026-10-31-react-open-source-design.md`. Read §2–§5 and D1–D12.

## Global Constraints

- **Unchanged from today:**
  - Hash tokens: `country|conflict|group|religion|choke|disputed|event|bloc|site-<id>`, `lens-<id>`, `view-<id>`, `compare-<A>-<B>`, `tour-<id>`.
  - Preferences key `atlas-v2-prefs`, holding `{lang, theme, projection}`.
- **Language and numbers:** Arabic is the default (`dir=rtl`), English is LTR. Use Western digits in both languages (locales `ar-SA-u-nu-latn` / `en-GB`).
- **Runtime dependencies are only** `react`, `react-dom`, `zustand`, `d3-geo`. Everything else is a devDependency. zod never ships to the browser.
- **Features never import each other.** They use `src/app/store.ts` and `src/app/events.ts`.
- **Errors are never silent:** no `catch {}` without a comment saying why.
- **Commits and pushes:** one commit per task, each ending with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. Never push.
- **Line endings:** `.gitattributes` sets `* text=auto eol=lf`.
- **Baseline model numbers** (legacy build, 2026-10-31):
  - stats: countries 242, conflicts 40, groups 41, religionCountries 75, edges 89, blocs 9, events 86, chokepoints 11, sites 24, disputed 99
  - Saudi Arabia (SAU): `conflicts ['yemen','gulf-security']`, `blocs ['gcc','brics','arab-league']`, 6 edges, religion majority `sunni` in family `islam`, neighbours `['BHR','QAT','KWT','YEM','ARE','IRQ']`, `round(areaKm2) = 1925857`

## Review Focus

1. **Storage blocked** (private window, sandbox): `localStorage` throws, and the prefs load and save must not. Tested in Task 5.
2. **Malformed or partial hash** (`#country-`, `#compare-USA`, `#%E0%A4%A`, `#lens-nope`): no crash, and the app ignores the hash. `decodeURIComponent` throws on bad escapes. Tested in Task 5.
3. **A data file 404s or has broken JSON:** the loader shows the error with a retry button, not a blank page. Tested in Task 6.
4. **A contributor typo in an ISO code or conflict id:** `build` must not throw, and `check-data` names the file, record and bad value. Tested in Task 7.
5. **A missing translation key in English:** fall back to Arabic, then to the key itself; `{var}` placeholders are filled. Tested in Task 2.

---

### Task 1: Scaffold, move the legacy app, MIT licence

**Files:**
- Move: `index.html js/ css/` → `legacy/` (`git mv`), and `data/` → `public/data/`. Curated files go in `public/data/curated/`: the `thematic/*` files plus `conflicts/`. Geo files go in `public/data/geo/`: countries, country_index, boundary_lines and disputed_areas.
- Create: `package.json`, `tsconfig.json` (strict, `noUncheckedIndexedAccess`), `vite.config.ts` (react plugin; vitest `environment: 'jsdom'`), `eslint.config.js`, `index.html` (new Vite entry), `src/main.tsx`, `src/App.tsx`, `.gitattributes`, `LICENSE` (MIT, `Copyright (c) 2026 muradalshorman987 and contributors`), `vercel.json` (`{"framework":"vite","buildCommand":"npm run build","outputDirectory":"dist"}`)
- Modify: `.gitignore` (add `node_modules`, `dist`, `coverage`)
- Test: `tests/app.smoke.test.tsx`

- [ ] **Step 1:** Move the files with `git mv` and commit the move alone ("Move the vanilla app to legacy/ and data to public/data/"), so history follows the files.
- [ ] **Step 2:** Create the scaffold files. `package.json` scripts:
  - `dev`: `vite`
  - `build`: `tsc -b && vite build`
  - `preview`: `vite preview`
  - `typecheck`: `tsc -b --pretty`
  - `lint`: `eslint .`
  - `test`: `vitest run`
  - `check-data`: `tsx scripts/check-data.ts`
  - `migrate-errata`: `tsx scripts/migrate-errata.ts`

  `index.html` keeps today's pre-paint script (it reads `atlas-v2-prefs` and sets `lang`, `dir` and `data-theme`), the Google Fonts link and the `#loader` markup from `legacy/index.html`, then adds `<div id="root">` and `<script type="module" src="/src/main.tsx">`.
- [ ] **Step 3:** Write the smoke test `renders the app name` (`render(<App/>)`, then expect the text `أطلس خطوط الصدع`). Run `npm test` and expect it to fail, because App is empty.
- [ ] **Step 4:** Make `App` render `<h1>{appName}</h1>` (temporary; Task 6 replaces it). `npm test` passes, and `npm run build` writes `dist/index.html`.
- [ ] **Step 5:** Commit: "Scaffold Vite + React + TypeScript; MIT licence".

### Task 2: Config, formatting and strings

**Files:**
- Create: `src/config.ts` (a typed port of `legacy/js/config.js`; keep every constant and value), `src/i18n/format.ts`, `src/i18n/strings.ts`, `src/i18n/core.ts` (today's foundation strings)
- Test: `tests/i18n.test.ts`

**Interfaces (Produces):**
- `type Lang = 'ar' | 'en'`, `type Bi = { ar: string; en: string }`
- `format.ts`. These are pure, and `lang` is always an argument:
  - `fmtNum(n: number | null | undefined, lang: Lang, digits = 0): string`
  - `fmtPct(n, lang, digits = 0)`
  - `fmtCompact(n, lang)`
  - `fmtGdp(mdUsd, lang)`
  - `fmtDate(s: string | null | undefined, lang)`
  - `normalize(s: unknown): string`
- `strings.ts`:
  - `registerStrings(dict: { ar: Record<string,string>; en?: Record<string,string> }): void`
  - `translate(lang: Lang, key: string, vars?: Record<string, string | number>): string`
  - `pick(lang, obj: Bi | string | null | undefined): string` (today's `L`)
  - `pickKey(lang, obj, base: string): string` (today's `Lk`)

- [ ] **Step 1: Failing tests.** Copy the expected values from today's behaviour:
  - `normalize('السعوديّة')` returns `'السعوديه'`, and `normalize('  Kurd  ')` returns `'kurd'`.
  - `fmtCompact(34268528,'ar')` returns `'34.3 مليون'`, and `fmtCompact(34268528,'en')` returns `'34.3 M'`.
  - `fmtGdp(793000,'en')` returns `'$793 bn'`; `fmtPct(12,'ar')` returns `'12٪'`; `fmtNum(null,'en')` returns `'—'`.
  - `fmtDate('2023-10-07','ar')` returns `'7 أكتوبر 2023'`, `fmtDate('1912-10','en')` returns `'Oct 1912'`, and `fmtDate('1948','en')` returns `'1948'`.
  - `translate('en','onlyAr')` returns the Arabic string when only `ar` is registered. `translate('en','missing')` returns `'missing'`. `translate('ar','loadingFile',{name:'x'})` returns `'تحميل x'`.
- [ ] **Step 2:** Run `npm test`; expect FAIL (module not found).
- [ ] **Step 3:** Implement by porting `legacy/js/i18n.js` and `legacy/js/config.js`. Replace the global `state.lang` with the `lang` parameter.
- [ ] **Step 4:** Run `npm test`; expect PASS.
- [ ] **Step 5:** Commit: "Port config, formatting and string tables".

### Task 3: Data model: types, `build`, loader

**Files:**
- Create:
  - `src/data/types.ts`: raw file types for the fields `build` reads, plus `DB`, `Country`, `Conflict`, `Group`, `Kind`
  - `src/data/build.ts`: a pure port of `legacy/js/data.js` `build()` and `normalizeIsos()`, using `geoArea`, `geoCentroid` and `geoDistance` from `d3-geo` instead of the global `d3`
  - `src/data/load.ts`: `FILES` map pointing at the new `public/data/{geo,curated}` paths
  - `tests/helpers/readRaw.ts`: reads the files from disk in Node
- Test: `tests/build.test.ts`

**Interfaces (Produces):**
- `type Kind = 'country'|'conflict'|'group'|'religion'|'choke'|'disputed'|'event'|'bloc'|'site'`
- `type RawData = Record<keyof typeof FILES, unknown>` (typed per key in `types.ts`)
- `build(raw: RawData): DB`. It deep-clones `raw` first, so the caller's object is never mutated.
- `loadAll(onProgress?: (p: number, file: string) => void, base = import.meta.env.BASE_URL + 'data/'): Promise<DB>`
- `DB` keeps every member of today's model with the same names and shapes:
  - `countries`, `features`, `boundaries`, `disputed`, `disputedById`
  - `conflicts`, `conflictById`, `conflictsAsOf`
  - `religion`, `ethnic`, `resources`, `siteById`
  - `relations`, `edgeById`, `bilateralFor`, `edgesBetween`
  - `chokepoints`, `chokeById`, `chokeNote`, `timeline`, `eventById`
  - `sources`, `datasetById`, `referenceById`
  - `get`, `exists`, `countriesOf`, `anchorOf`, `nameOf`, `search`, `searchIndex`, `stats`
  - `corrections: { id: string; where: Bi; what: Bi }[]` replaces `errata` and is read from `curated/corrections.json` (Task 4)
  - `isUnverified(kind: Kind, id: string): boolean` reads `record.unverified === true`. For `country`, it reads `countries.get(id)?.intel?.unverified`.

- [ ] **Step 1: Failing tests** (run against today's unmigrated files):
  - `stats` equals the baseline in Global Constraints.
  - SAU matches the baseline.
  - `search('السعوديه',5)[0]` is `{kind:'country', id:'SAU'}`.
  - `get('country','KOS')` exists (the XKX alias).
  - `nameOf('disputed', <index of 'Spratly Is.'>, 'ar')` returns `'جزر سبراتلي'`.
  - `anchorOf('conflict','sudan')` has length 2.
  - `build` does not mutate its input.
  - In `build`, `corrections` and `isUnverified` default to `[]` and `false` when `corrections` is absent from `RawData`, so this task passes before Task 4.
- [ ] **Step 2:** Run `npm test -- build`; expect FAIL.
- [ ] **Step 3:** Implement. Copy the logic line by line from `legacy/js/data.js`; keep its comments where they explain a data quirk.
- [ ] **Step 4:** Run `npm test -- build`; expect PASS. Run `npm run typecheck`; expect no errors.
- [ ] **Step 5:** Commit: "Port the data model to typed build() + loader".

### Task 4: D4 migration: fold corrections into curated data

**Files:**
- Create: `scripts/legacy-errata.ts` (a port of `legacy/js/errata.js`: `ERRATA`, `UNVERIFIED`, `applyErrata`), `scripts/migrate-errata.ts`
- Modify (written by the script): `public/data/curated/**/*.json`, and the new `public/data/curated/corrections.json`
- Modify: `src/data/load.ts` (add `corrections` to `FILES`)
- Test: `tests/curated.test.ts`

**Script behaviour, `migrate-errata.ts`:**
1. Read the raw curated and geo files.
2. Build the expected model the legacy way: `applyErrata(clone)`, then `build`, with `UNVERIFIED` sets.
3. Apply the errata to a second clone.
4. Set `unverified: true`:
   - on each conflict, chokepoint and timeline event listed in `UNVERIFIED`
   - for countries, on `country_intel.json` → `countries[ISO].unverified`
5. Write `corrections.json` as `[{id, where, what}]` for the 19 entries where `applied` is true. Exit 1 if any entry is not applied.
6. Build the migrated model and compare it with the expected one:
   - Serialise both, with Maps turned into sorted arrays, and functions and the `raw`, `errata`, `corrections` and `unverified` members removed.
   - Also check `isUnverified` for every id in `UNVERIFIED`.
   - Any difference: print the first 20 differing paths and exit 1 **without writing**.
7. On success, write the changed files with `JSON.stringify(x, null, 2) + '\n'`, then print the files written and `models identical`.

- [ ] **Step 1: Failing tests** in `tests/curated.test.ts`, run on disk data:
  - `corrections.json` has 19 entries with unique ids.
  - `get('conflict','lebanon-israel').territorialClaims.en` contains `'has held the Shebaa Farms since 1967'`.
  - `relations.blocById.get('brics').members` includes `'IDN'`.
  - The Hpakant site has `type === 'jade'`.
  - `isUnverified` is true for `conflict:sudan`, `choke:hormuz`, `event:iran-war-2026` and `country:SYR`, and false for `conflict:northern-ireland`.
- [ ] **Step 2:** Run `npm test -- curated`; expect FAIL.
- [ ] **Step 3:** Write the two scripts. Run `npm run migrate-errata`; expect `models identical` and the list of written files.
- [ ] **Step 4:** Run `npm test`; expect all to PASS, including Task 3's tests on the migrated data.
- [ ] **Step 5:** Commit: "Fold the 19 corrections and the unverified flags into curated data (D4)". Paste the script's output into the commit body.

### Task 5: Store, event bus, hash sync, preferences

**Files:**
- Create: `src/app/store.ts`, `src/app/events.ts`, `src/app/hash.ts`, `src/app/prefs.ts`
- Test: `tests/store.test.ts`, `tests/hash.test.ts`, `tests/prefs.test.ts`

**Interfaces (Produces):**
- `store.ts`:
  - `AtlasState` has exactly the keys of `legacy/js/store.js` `state`, including `filters` and `layers` with the same defaults.
  - `useAtlas` is a Zustand hook.
  - `atlas` is an imperative facade:
    - `atlas.get(): AtlasState`
    - `atlas.set(patch: Partial<AtlasState>): string[]` returns the changed keys and uses the same `sameValue` rule as today
    - `atlas.setFilter(key, value)`, `atlas.toggleInSet(key, item)`, `atlas.setLayer(key, on)`
    - `atlas.select(kind: Kind | null, id?: string, opts?: { fly?: boolean })`: today's phone rule (≤ 760 px closes `view`) and the `flyto` emit
    - `atlas.openView(id)`, `atlas.closeView()`
  - Saving prefs on a `lang`, `theme` or `projection` change is a store subscription.
- `events.ts`: `on<E extends keyof Events>(e, fn): () => void`, `emit(e, payload)`. `Events` covers `hover`, `flyto`, `highlight`, `toast`, `starttour` and `ready`, with today's payload shapes. A failing listener is logged and does not stop the others.
- `hash.ts`:
  - `hashToken(s: AtlasState): string`
  - `parseHash(token: string, db: DB): { patch?: Partial<AtlasState>; fly?: { kind: Kind; id: string }; tour?: string } | null` keeps today's rules, including that a selection closes the view.
  - `startHashSync(db: DB): () => void` applies the hash at start and on `hashchange`, and writes it with `history.replaceState` when selection, view, lens, compare or tour changes.
- `prefs.ts`: `loadPrefs(): Partial<Pick<AtlasState,'lang'|'theme'|'projection'>>` and `savePrefs(s): void`. Neither throws.

- [ ] **Step 1: Failing tests:**
  - `hashToken` and `parseHash` round-trip each selection kind (SAU, sudan, kurds, sunni, hormuz, '0', halabja, gcc, plus the first site id), `lens-religion`, `view-network`, `compare-SAU-IRN` and `tour-energy`.
  - These return null: `country-`, `compare-USA`, `compare-USA-XXX`, `lens-nope`, `nothing`.
  - `startHashSync` with `location.hash = '#%E0%A4%A'` does not throw and leaves the state unchanged.
  - `atlas.set` returns `[]` for an equal object patch.
  - `select` with `matchMedia` mocked to match and `view:'network'` sets `view` to null.
  - With `localStorage.getItem` and `setItem` throwing, `loadPrefs()` returns `{}` and `savePrefs` does not throw.
  - `emit('toast','x')` reaches listener 2 when listener 1 throws.
- [ ] **Step 2:** Run `npm test`; expect FAIL.
- [ ] **Step 3:** Implement by porting `legacy/js/store.js`. Wrap `decodeURIComponent` in try/catch, treating a bad escape as no hash.
- [ ] **Step 4:** Run `npm test`; expect PASS.
- [ ] **Step 5:** Commit: "Port app state, event bus, hash links and preferences".

### Task 6: Boot: loader, language and theme, error retry

**Files:**
- Create: `src/app/useT.ts`, `src/features/boot/Boot.tsx`
- Modify: `src/App.tsx`, `src/main.tsx`
- Test: `tests/boot.test.tsx`

**Interfaces (Produces):**
- `useT()` returns `{ lang, t(key, vars?), pick(obj), pickKey(obj, base), fmt: { num, pct, compact, gdp, date } }` bound to the current `lang`.
- `DbContext` and `useDb(): DB` are available to M2 and M3 features.

**Behaviour:**
- Boot calls `loadAll` and drives today's `#loader` bar, `#loader-msg` and `#loader-title`.
- On success it provides `DbContext`, starts the hash sync, emits `ready`, and fades and removes `#loader` as today.
- On failure it shows `loadFailed` and a Retry button that calls `loadAll` again; it does not reload the page.
- An effect mirrors `lang` and `theme` onto `<html>` (`lang`, `dir`, `data-theme` removed for `system`) and onto `document.title`.

- [ ] **Step 1: Failing tests:**
  - With mocked `fetch`, Boot renders the children after load, and `document.documentElement.dir` is `'rtl'`.
  - `atlas.set({lang:'en'})` flips `dir` to `'ltr'` and the title to `'Fault Lines Atlas'`.
  - When `fetch` returns `{ok:false,status:404}` once, Boot shows the `loadFailed` text and a Retry button. Clicking it renders the children on the second, successful fetch.
- [ ] **Step 2:** Run `npm test -- boot`; expect FAIL.
- [ ] **Step 3:** Implement. `App` renders `<Boot><Stage/></Boot>`. `Stage` is a placeholder `<main id="stage">` showing the stats line, which M2 replaces.
- [ ] **Step 4:** Run `npm test`; expect PASS. Then, with `npm run dev` running in the background, load `http://localhost:5173/#country-SAU` headless (`cdp-shot.mjs` in the session scratchpad tools). Expect no console errors, `dir=rtl`, the stats line showing 242 countries, and the hash unchanged.
- [ ] **Step 5:** Commit: "Boot: typed data load, language/theme mirroring, retry".

### Task 7: check-data and CI

**Files:**
- Create: `src/data/schema.ts` (zod schemas for every curated file; each record's id, `{ar,en}` names and references, with other fields passed through), `scripts/check-data.ts`, `.github/workflows/ci.yml`
- Test: `tests/check-data.test.ts`, with fixtures in `tests/fixtures/broken/`

**Behaviour, `check-data`:**
- It validates each file in `public/data/curated`. It also checks cross-references:
  - every ISO3 exists in `geo/countries.json`, with the XKX→KOS alias
  - every `conflictIds` entry exists
  - every `sourceRefs` entry exists in sources
  - every bloc member exists
- It prints one line per problem: `<file> › <json path> › <message> (got <value>)`.
- Exit codes: 0 when clean, 1 when not.
- `checkData(dir: string): Problem[]` is exported for tests.

**CI** runs on `push` and `pull_request`, on ubuntu-latest with Node 24: `npm ci`, `npm run typecheck`, `npm run lint`, `npm test`, `npm run check-data`, `npm run build`.

- [ ] **Step 1: Failing tests:**
  - `checkData('public/data')` returns `[]`.
  - For the fixture copy where conflict `sudan` has country `SDX` and timeline event `halabja` has `conflictIds ['nope']`, it returns two problems naming `conflicts/africa.json › conflicts[<i>].countries[<j>]` with `SDX`, and `timeline.json › events[<k>].conflictIds[0]` with `nope`.
  - `build` on that fixture does not throw.
- [ ] **Step 2:** Run `npm test -- check-data`; expect FAIL.
- [ ] **Step 3:** Implement the schemas, the script and the workflow. Fixtures are built in the test from the real files with the two mutations, in a temp dir, not committed copies.
- [ ] **Step 4:** Run, in order:
  - `npm test`
  - `npm run check-data` (expect exit 0)
  - `npm run lint`
  - `npm run typecheck`
  - `npm run build`

  All must pass.
- [ ] **Step 5:** Commit: "check-data with readable errors; CI workflow".

### M1 close

- [ ] Write `docs/superpowers/plans/2026-10-31-m1-handoff.md` (10–20 lines: decided, rejected, risks, files, next = the M2 plan).
- [ ] Read `data.weeklyPercent` from the usage cache. If it's below 80 and `lastSuccessAt` is less than 2 hours old, continue to M2 planning; otherwise stop and report.
