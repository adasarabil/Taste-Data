# Origin And Fusion Design

Date: 2026-05-13

## Decision

Do not treat food origin as a new sensor.

Origin should be a contextual interpretation layer that enriches style, instrumentation, rhythm, and narrative while the six measured inputs keep control of the core mapping:

- Weight / Mass
- pH
- Temperature
- Salinity / TDS
- Dominant Color
- Place Where the Dish Is Eaten

## Customer Need

The customer wants cuisine/origin to matter. A taco from Mexico should carry cultural context. Foods with shared or mixed families, such as dumplings, should support multiple regional variants:

- Chinese jiaozi
- Russian pelmeni
- Turkish manti
- Italian ravioli
- contemporary fusion variants

The system should show cultural references based on common regional ownership, older lineage where known, and fusion context. It should avoid pretending there is always one clean owner.

## Implemented Concepts

The current implementation already uses these concepts in compact JavaScript form:

- `claimedOrigin`: represented by the user's cuisine, description, notes, and dish name text.
- `dishFamily`: broad family such as taco, dumpling, filled pasta, or soup.
- `regionalVariant`: specific expression such as Turkish manti, Italian ravioli, Japanese ramen, or Vietnamese pho.
- `ownership`: weighted list of regions/cuisines, rounded to 100%.
- `fusionMode`: none, neighboring, diaspora, contemporary, ambiguous.
- `originConfidence`: high, medium, low, unknown.
- `riskFlags`: shared lineage, uncertain origin, external inference, failed lookup, or fine-dining interpretation.
- `musicBias`: bounded hints for rhythm, instrumentation, ornamentation, ensemble size, and production tone.

## Possible Future File Structure

```text
data/origin-fusion/
|-- origins.json
|-- dish-families.json
|-- fusion-rules.json
`-- music-culture-map.json

assets/
|-- origin-fusion.js
|-- prompt-context.js
`-- taste-profile.js
```

## Current Hybrid MVP

Implemented now:

```text
assets/origin-fusion-data.js
assets/origin-fusion.js
assets/external-food-data.js
```

The current resolver is curated-first. It recognizes a starter set of dish families and variants, including tacos, dumplings/filled dough, and soups. It produces rounded ownership percentages that always sum to 100.

When curated confidence is low or extra evidence is useful, the resolver can use Wikidata live lookup as a broad dataset path. The app queries Wikidata search/entity APIs, extracts cuisine, country-of-origin, and class claims, then merges that compact evidence into the origin/fusion profile. It does not send the full dataset to Claude.

The hybrid plan remains:

1. Curated MVP for high-quality common cases.
2. Wikidata live lookup for broader recognition.
3. Future AI resolver only when confidence is low or a dish is absent from the curated layer.

Oldest known lineage is used only internally as weighting logic. It is not displayed as a blunt ownership claim.

## Dataset Shape

Example record:

```json
{
  "dishFamily": "dumpling",
  "regionalVariants": [
    {
      "name": "manti",
      "regions": [{ "label": "Turkey", "weight": 0.7 }, { "label": "Central Asia", "weight": 0.3 }],
      "originConfidence": "medium",
      "musicBias": {
        "rhythm": ["ornamented phrasing", "small ensemble pulse"],
        "instrumentation": ["plucked string color", "frame-drum-like percussion"],
        "production": ["intimate acoustic warmth"]
      },
      "riskFlags": ["shared_lineage"]
    }
  ]
}
```

## Rules

- Origin may enrich prompts, but must not override measured mappings.
- Place eaten is separate from origin. A taco eaten in Istanbul should preserve Mexican origin context and Istanbul place context separately.
- Fusion should blend weighted influences instead of choosing a single winner.
- If origin is disputed or uncertain, the UI and prompt context should say so.
- Avoid stereotypes and caricature. Use musical structure terms: rhythm density, ornamentation, acoustic/electronic bias, ensemble size, space, repetition, syncopation.
- Do not add legacy-only sensors such as Brix, SHU, CO2, IBU, salt g/L, or glutamate.

## Open Questions

1. Should users manually select a dish family, or should the app infer it from dish name?
2. Should the existing small curated dataset become user-editable?
3. Should "oldest known lineage" be shown to users, or only used internally as a weighting factor?
4. How academic should references be: casual project notes, cited sources, or a bibliography per dish family?
5. Should fusion be explicitly selected by the user, or inferred from cuisine/origin plus notes?

## Recommended First Dataset

Start with a small curated set:

- taco
- dumpling / filled pasta
- soup
- stew
- rice dish
- grilled meat / kebab
- fermented / pickled dish

For each family, add 4-8 regional variants and keep the music bias bounded. This gives enough cultural expression without making the model unstable.
