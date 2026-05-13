# Team Reports

Date: 2026-05-13

## Team 1: Sensory Science And Culinary Review

The current system uses six inputs: weight, pH, temperature, salinity/TDS, color, and place.

pH, temperature, and TDS are measurable food parameters. Weight is measurable but symbolic as a sensory signal. Color and place are contextual/sensory descriptors rather than chemistry sensors.

Recommended change: keep the six inputs, but compute deterministic interpretations before Claude writes the final prompt language.

## Team 2: Software Structure Review

The current project is best kept as a buildless static app plus serverless proxy.

The legacy project had valuable modular logic but was built for Python, Arduino, OSC, TouchDesigner, and CSV logging. Those runtime pieces do not fit the current deployment target.

Recommended change: adapt the legacy algorithmic ideas in plain JavaScript modules under `assets/`, then keep the app buildless and test the deterministic core with Node.

## Team 3: Implementation

Implemented:

- deterministic preprocessing in `assets/taste-profile.js`
- derived axes for energy, warmth, darkness, texture, richness, and temperature feel
- warnings for implausible numeric values
- local fallback output when Claude is unavailable
- schema repair for Claude responses
- safer serverless proxy request shaping
- extracted CSS and JavaScript into `assets/`
- endpoint selection for custom globals, Netlify, Vercel, and query overrides
- stricter schema repair with warnings
- curated-first origin/fusion inference with compact Wikidata enrichment
- shared Claude proxy configuration in `api/claude-config.cjs`

Write scope:

- `index.html`
- `assets/`
- `netlify/functions/claude.js`
- `api/claude.js`
- `tests/tastedata-core.test.js`
- `docs/`

## Team 4: Testing

Mock cases covered:

- balanced hot soup
- light cold salad
- heavy alkaline stew
- threshold boundary values
- implausible sensor values
- schema repair for incomplete AI output

The deterministic tests passed.

Key testing rule: local mapping must be monotonic. More temperature should not produce a lower tempo band. More TDS should not soften the hi-hat. More mass should not lighten bass.

## Future Origin/Fusion Layer

The cultural-origin system should not be added as a new sensor. It should be an optional context layer using dish name, cuisine/origin, description, and notes. It should enrich instrumentation, rhythm, ornamentation, and narrative while preserving the six measured mappings.

The detailed design and current hybrid MVP are in `docs/ORIGIN_FUSION_DESIGN.md`.
