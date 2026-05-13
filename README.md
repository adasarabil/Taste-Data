# TasteData

TasteData is a buildless web app that translates measured food data into structured, Suno-ready instrumental music prompts. It combines deterministic client-side mapping with a Claude serverless proxy, so the system stays explainable even when live AI generation is unavailable.

The current system deliberately preserves six inputs:

- Weight / Mass
- pH
- Temperature
- Salinity / TDS
- Dominant Color
- Place Where the Dish Is Eaten

The browser first derives a local sensory profile from those inputs, then resolves a cultural origin/fusion profile from dish name, cuisine, description, and notes. Origin/fusion is context only: it can enrich rhythm, instrumentation, and production language, but it does not become a seventh sensor and it cannot override the six measured mappings.

Claude receives the deterministic sensory profile and compact origin/fusion context, then returns JSON for the UI. If Claude is unavailable, if Wikidata cannot be reached, or if the AI response is incomplete, the local fallback and schema repair keep the output usable.

The app also renders origin/cuisine context in its own Origin tab. This tab shows the detected dish family, confidence, weighted cuisine or region influences, source status, risk flags, music bias, and any external Wikidata evidence returned during the lookup. The app treats this as cuisine and cultural-origin context, not as human ethnicity.

## Project Structure

```text
tasteData2/
|-- index.html
|-- assets/
|   |-- styles.css
|   |-- config.js
|   |-- taste-profile.js
|   |-- origin-fusion-data.js
|   |-- origin-fusion.js
|   |-- external-food-data.js
|   |-- schema.js
|   `-- app.js
|-- api/claude.js
|-- api/claude-config.cjs
|-- netlify/functions/claude.js
|-- tests/tastedata-core.test.js
|-- docs/
|-- presentation/
`-- netlify.toml
```

## Runtime Flow

1. `assets/app.js` collects form input and coordinates generation.
2. `assets/taste-profile.js` validates and maps the six inputs into bass, lead, tempo, hi-hat, pad, and spatial layers.
3. `assets/origin-fusion.js` uses `assets/origin-fusion-data.js` first, then `assets/external-food-data.js` can enrich uncertain cases with Wikidata evidence.
4. `assets/schema.js` builds the deterministic fallback and repairs Claude output to the expected seven-part JSON shape.
5. `assets/app.js` renders the origin/cuisine profile separately from the musical parameter map, so the provenance data remains visible even if Claude rewrites the prose.
6. `assets/config.js` chooses the serverless endpoint.
7. `api/claude.js` and `netlify/functions/claude.js` proxy Claude requests through the shared hardening rules in `api/claude-config.cjs`.

## Local Preview

The UI can be opened directly from `index.html`, but live Claude generation needs a serverless runtime and an Anthropic API key. Without the key, the deterministic local output still renders.

Static-only preview:

```bash
npx serve .
```

Netlify function preview:

```bash
netlify dev
```

Vercel function preview:

```bash
vercel dev
```

Required environment variable:

```text
ANTHROPIC_API_KEY=sk-ant-...
```

Optional production CORS setting:

```text
ALLOWED_ORIGIN=https://your-site.example
```

## Endpoint Selection

The frontend selects the Claude endpoint in this order:

1. `window.TASTEDATA_API_ENDPOINT`
2. query override: `?api=/api/claude`
3. Vercel host: `/api/claude`
4. default Netlify path: `/.netlify/functions/claude`

`window.TASTEDATA_API_ENDPOINT` is useful for embedded demos or custom hosting. The query override is useful for local previews and quick endpoint tests.

## Deploy To Netlify

1. Connect the repository in Netlify.
2. Keep `netlify.toml` as the build configuration.
3. Add `ANTHROPIC_API_KEY` in Site settings -> Environment variables.
4. Optionally set `ALLOWED_ORIGIN` to the production site URL.
5. Deploy.

## Deploy To Vercel

The Vercel handler is available at `api/claude.js`. On a `*.vercel.app` host, the frontend automatically uses `/api/claude`. Add the same `ANTHROPIC_API_KEY` environment variable in Vercel project settings.

## Tests

```bash
node tests/tastedata-core.test.js
node --check assets/app.js
node --check assets/config.js
node --check assets/taste-profile.js
node --check assets/origin-fusion-data.js
node --check assets/origin-fusion.js
node --check assets/external-food-data.js
node --check assets/schema.js
node --check api/claude-config.cjs
node --check netlify/functions/claude.js
node --check api/claude.js
```
