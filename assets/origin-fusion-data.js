var TASTEDATA_ORIGIN_FUSION_DATA = {
  families: [
    {
      id: 'taco',
      match: ['taco', 'tacos', 'taqueria'],
      aliases: ['folded flatbread'],
      defaultOwnership: [{ label: 'Mexican taco', cuisine: 'Mexican', ownership: 100 }],
      variants: [
        { match: ['korean'], label: 'Korean-Mexican taco fusion', cuisine: 'Korean-Mexican', ownership: 40, pairsWith: 'Mexican taco' },
        { match: ['american', 'tex-mex', 'tex mex'], label: 'Tex-Mex taco', cuisine: 'Tex-Mex', ownership: 45, pairsWith: 'Mexican taco' },
        { match: ['mexican', 'mexico'], label: 'Mexican taco', cuisine: 'Mexican', ownership: 100 }
      ],
      musicBias: {
        rhythm: ['dry syncopated pulse', 'street-food percussion'],
        instrumentation: ['plucked string color', 'bright hand percussion', 'brass-like accents'],
        production: ['close, energetic, lightly saturated']
      }
    },
    {
      id: 'dumpling',
      match: ['dumpling', 'dumplings', 'jiaozi', 'gyoza', 'mandu', 'pelmeni', 'pierogi', 'manti', 'mantı', 'ravioli', 'tortellini', 'vareniki'],
      aliases: ['filled dough', 'filled pasta'],
      defaultOwnership: [
        { label: 'Far East filled-dough lineage', cuisine: 'Far East', ownership: 35 },
        { label: 'Turkic/Central Asian manti lineage', cuisine: 'Turkish/Central Asian', ownership: 25 },
        { label: 'Slavic pelmeni/pierogi lineage', cuisine: 'Slavic', ownership: 20 },
        { label: 'Italian filled pasta lineage', cuisine: 'Italian', ownership: 20 }
      ],
      variants: [
        { match: ['manti', 'mantı', 'turkish', 'turkey'], label: 'Turkish manti', cuisine: 'Turkish', ownership: 70, secondary: [{ label: 'Central Asian shared lineage', cuisine: 'Central Asian', ownership: 30 }] },
        { match: ['pelmeni', 'russian', 'russia'], label: 'Russian pelmeni', cuisine: 'Russian', ownership: 75, secondary: [{ label: 'Siberian/Central Asian shared lineage', cuisine: 'Siberian/Central Asian', ownership: 25 }] },
        { match: ['pierogi', 'polish', 'poland'], label: 'Polish pierogi', cuisine: 'Polish', ownership: 80, secondary: [{ label: 'Central/Eastern European filled dough', cuisine: 'Central/Eastern European', ownership: 20 }] },
        { match: ['jiaozi', 'chinese', 'china'], label: 'Chinese jiaozi', cuisine: 'Chinese', ownership: 80, secondary: [{ label: 'East Asian dumpling family', cuisine: 'East Asian', ownership: 20 }] },
        { match: ['gyoza', 'japanese', 'japan'], label: 'Japanese gyoza', cuisine: 'Japanese', ownership: 65, secondary: [{ label: 'Chinese jiaozi influence', cuisine: 'Chinese', ownership: 35 }] },
        { match: ['mandu', 'korean', 'korea'], label: 'Korean mandu', cuisine: 'Korean', ownership: 70, secondary: [{ label: 'East Asian dumpling family', cuisine: 'East Asian', ownership: 30 }] },
        { match: ['ravioli', 'italian', 'italy'], label: 'Italian ravioli', cuisine: 'Italian', ownership: 80, secondary: [{ label: 'Mediterranean filled pasta family', cuisine: 'Mediterranean', ownership: 20 }] },
        { match: ['tortellini'], label: 'Italian tortellini', cuisine: 'Italian', ownership: 85, secondary: [{ label: 'Northern Italian filled pasta', cuisine: 'Italian regional', ownership: 15 }] }
      ],
      musicBias: {
        rhythm: ['small repeated gestures', 'folded call-and-response phrasing'],
        instrumentation: ['plucked or bowed acoustic color', 'soft mallet detail', 'light hand percussion'],
        production: ['warm ensemble intimacy with regional ornamentation']
      }
    },
    {
      id: 'soup',
      match: ['soup', 'corbasi', 'çorbası', 'chorba', 'ramen', 'pho', 'borscht', 'minestrone'],
      defaultOwnership: [{ label: 'regional soup tradition', cuisine: 'contextual', ownership: 100 }],
      variants: [
        { match: ['ramen', 'japanese', 'japan'], label: 'Japanese ramen', cuisine: 'Japanese', ownership: 75, secondary: [{ label: 'Chinese noodle-soup influence', cuisine: 'Chinese', ownership: 25 }] },
        { match: ['pho', 'vietnamese', 'vietnam'], label: 'Vietnamese pho', cuisine: 'Vietnamese', ownership: 90, secondary: [{ label: 'regional noodle soup family', cuisine: 'Southeast Asian', ownership: 10 }] },
        { match: ['mercimek', 'turkish', 'turkey'], label: 'Turkish lentil soup', cuisine: 'Turkish', ownership: 85, secondary: [{ label: 'Middle Eastern lentil soup family', cuisine: 'Middle Eastern', ownership: 15 }] }
      ],
      musicBias: {
        rhythm: ['slow circular pulse', 'liquid phrase motion'],
        instrumentation: ['soft sustained pads', 'rounded bass resonance'],
        production: ['warm blended space']
      }
    }
  ],
  cuisineMusic: {
    Mexican: { rhythm: 'syncopated street pulse', instrumentation: 'bright hand percussion, plucked strings, brass-like accents', production: 'dry and energetic' },
    Korean: { rhythm: 'firm rhythmic cells with contemporary edge', instrumentation: 'percussive hits, bright plucks, restrained low drums', production: 'clean hybrid polish' },
    Turkish: { rhythm: 'ornamented asymmetric-feeling phrasing', instrumentation: 'plucked string color, frame-drum-like percussion, reed-like lead', production: 'intimate acoustic warmth' },
    Russian: { rhythm: 'restrained repeating pulse', instrumentation: 'bowed low textures, compact folk-like melodic turns', production: 'cool dense room' },
    Chinese: { rhythm: 'agile repeated figures', instrumentation: 'plucked articulation, mallet detail, light pentatonic contour', production: 'clear and balanced' },
    Italian: { rhythm: 'lyrical flowing phrasing', instrumentation: 'accordion-like pads, mandolin-like plucks, polished strings', production: 'warm elegant space' },
    Japanese: { rhythm: 'precise spacious patterning', instrumentation: 'clean plucks, woodblock-like percussion, airy pads', production: 'minimal and controlled' },
    Vietnamese: { rhythm: 'light flowing pulse', instrumentation: 'airy plucked colors, soft percussion', production: 'open aromatic space' }
  }
};
