# أطلس خطوط الصدع — Fault Lines Atlas

An open-source, bilingual (Arabic / English) interactive atlas that links geography to ethnicity, religion, conflicts, resources and alliances.
أطلس تفاعلي مفتوح المصدر يربط الجغرافيا بالعرق والدين والنزاعات والموارد والتحالفات، بالعربية والإنجليزية.

**Live:** https://fault-lines-atlas.vercel.app

## Run it locally / التشغيل على الجهاز

Requires Node 22 or newer.

```bash
npm ci
npm run dev        # http://localhost:5173
```

| Command | What it does |
|---|---|
| `npm run dev` | Development server |
| `npm run build` | Type-check and build to `dist/` |
| `npm test` | Unit tests (Vitest) |
| `npm run test:e2e` | Browser smoke tests (Playwright; uses your installed Edge locally) |
| `npm run lint` / `npm run typecheck` | ESLint / TypeScript |
| `npm run check-data` | Validates every curated data file: shapes, links between records, unique ids, layout |
| `npm run format-data` | Rewrites curated JSON in the one canonical layout |

## How it is built / البنية

React 19 + TypeScript + Vite. The map is a canvas engine on d3-geo (globe and flat projections); state lives in one Zustand store and the URL hash holds a share link such as `#country-SAU`, `#conflict-sudan` or `#compare-USA-CHN`.

```
src/app        state, share links, preferences, event bus
src/data       data types and the linked model built from the JSON files
src/features   map, shell (top bar, rail, search), dossier, views, timeline, tours
src/ui         shared helpers, icons, charts, colour palette
public/data    geo/ (Natural Earth) and curated/ (the atlas content)
scripts        data checks and formatting
docs           design and plans
```

## Fixing or adding data / تصحيح البيانات

The atlas content is plain JSON in `public/data/curated/`. Edit the file, then run `npm run format-data` and `npm run check-data`; CI runs the same check on every pull request. Every claim needs a source and a date, disputed things are described as disputed, and developments that this edition has not verified carry `"unverified": true`.

## Deploying / النشر

Vercel builds the `main` branch automatically (settings in `vercel.json`: Vite, `npm run build`, output `dist`). Other branches get preview links.

## Licence / الترخيص

- Code: MIT — see [LICENSE](LICENSE).
- Data: see [public/data/README.md](public/data/README.md). The curated content is a CC BY 4.0 compilation adapted from «الأطلس الجيوسياسي والعرقي الديني العالمي»; corrections made by this project are listed on the Sources page. Country shapes are from Natural Earth (public domain).
