# TasteData Manager Report

Date: 2026-05-13

## Scope

The active project in `tasteData2` was inspected and compared with the first-version project at `C:\Users\xxx\Desktop\tasteData`.

The current sensory input types were preserved:

- Weight / Mass
- pH
- Temperature
- Salinity / TDS
- Dominant Color
- Place Where the Dish Is Eaten

No legacy-only inputs were added.

## Current Project Structure

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
|-- netlify.toml
|-- README.md
|-- tests/tastedata-core.test.js
|-- presentation/
`-- docs/
```

The project is a static single-page app with serverless Claude proxy functions for Netlify and Vercel. Shared Claude request validation, payload shaping, model selection, and limits live in `api/claude-config.cjs`.

## What The System Does

The user enters dish data. The app maps the six food parameters into music-production concepts, sends the result to Claude, and renders Suno-ready outputs:

- dish interpretation
- origin/cuisine evidence tab
- complexity classification
- six parameter mapping rows
- six single-parameter stem prompts
- mix direction
- negative prompts

## Problems Found

- The old `tasteData2` mapping was mostly prompt-only, so output stability depended on Claude.
- There was no local deterministic algorithm for bins, complexity, or derived music axes.
- There was no schema repair if Claude returned incomplete JSON.
- There were no tests.
- The API proxy forwarded arbitrary browser-supplied Claude payload fields.
- Vercel support existed in `api/claude.js`, but the frontend uses the Netlify endpoint.
- Direct local file opening shows the UI, but generation still needs Netlify/Vercel function runtime or the deterministic fallback.

## Improvements Implemented

- Added deterministic client-side sensory mapping in `assets/taste-profile.js`.
- Added local normalization, clamping, range warnings, derived axes, complexity scoring, and local fallback output.
- Added schema repair for Claude JSON so the UI still receives six mapping rows and six stems.
- Added deterministic fallback when Claude/API is unavailable.
- Hardened Netlify and Vercel Claude proxy handlers by whitelisting request fields and fixing the model server-side.
- Added `tests/tastedata-core.test.js` for mock-data validation.
- Split inline HTML into `assets/styles.css`, `assets/config.js`, `assets/taste-profile.js`, `assets/schema.js`, and `assets/app.js`.
- Added endpoint selection for Netlify, Vercel, and query-string overrides.
- Added explicit `window.TASTEDATA_API_ENDPOINT` support for custom hosted endpoints.
- Added stricter schema repair with warnings.
- Added `docs/ORIGIN_FUSION_DESIGN.md` as a planning document for future cultural-origin logic.
- Added a curated-first hybrid origin/fusion resolver that infers dish family, rounded cuisine ownership percentages, fusion mode, and music bias without changing the six sensor mappings.
- Added Wikidata live lookup as the broad dataset path for dish/cuisine/origin evidence, with local caching and compact profile merging.
- Added a dedicated Origin tab so provenance, weighted cuisine/region context, risk flags, and Wikidata evidence are visible separately from Claude prose.
- Fixed curated fusion handling so named hybrids such as Korean taco keep their specific curated variant instead of being overwritten by the generic fusion heuristic.

## Better Parts Taken From Legacy Project

The first version had a stronger scientific architecture. The following concepts were adapted:

- deterministic normalization and clamping
- Stevens-style perceptual transformation pattern
- derived aesthetic axes such as energy, warmth, darkness, texture, and richness
- genre/profile scoring concept
- test-battery mindset with mock food cases

The following legacy parts were not copied:

- Arduino serial reader
- Python runtime structure
- OSC and TouchDesigner bridge
- CSV logger
- old sensor schema: Brix, SHU, CO2, IBU, salt g/L, glutamate
- EMA smoothing, because this app is one-shot form input rather than live streaming

## Sensory Algorithm In The Current Project

Weight maps to bass density.

pH maps to lead synth key, timbre, acidity, and darkness.

Temperature maps to BPM, rhythmic energy, and heat feel.

TDS maps to hi-hat texture and crystalline/mineral articulation.

Color maps to synth pad timbre, warmth, and darkness.

Place maps to acoustic space, genre/environment bias, warmth, and texture.

The app then derives:

- `energy`
- `warmth`
- `darkness`
- `texture`
- `richness`
- `tempFeel`

These axes shape the local fallback, mix direction, and compact context sent to Claude.

## Runtime Responsibilities

- `index.html` defines the form, output tabs, and script loading order.
- `assets/app.js` coordinates input collection, loader state, Claude calls, fallback handling, and rendering.
- `assets/taste-profile.js` owns numeric validation, color normalization, place interpretation, six-row mapping, warnings, and derived axes.
- `assets/origin-fusion.js` owns curated origin/fusion inference, fine-dining/fusion heuristics, profile merging, and local caching.
- `assets/external-food-data.js` queries Wikidata for dish, cuisine, country-of-origin, and class evidence when available.
- `assets/schema.js` builds deterministic output and repairs incomplete Claude JSON.
- `api/claude.js` and `netlify/functions/claude.js` expose the same hardened Claude proxy behavior through different serverless runtimes.

## Verification

Passed:

```text
node tests\tastedata-core.test.js
node --check assets\app.js
node --check assets\config.js
node --check assets\taste-profile.js
node --check assets\origin-fusion-data.js
node --check assets\origin-fusion.js
node --check assets\external-food-data.js
node --check assets\schema.js
node --check api\claude-config.cjs
node --check tests\tastedata-core.test.js
node --check netlify\functions\claude.js
node --check api\claude.js
```

Live Claude generation was not tested because no `ANTHROPIC_API_KEY` is configured here.

## Final Status

The project is now more explainable, testable, and resilient while keeping the current design and input types intact.
