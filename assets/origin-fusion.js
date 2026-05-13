function normalizeOriginText(value) {
  return String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/ı/g, 'i')
    .replace(/[^a-z0-9\s-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function hasAnyToken(text, tokens) {
  return tokens.some(function(token) {
    return text.indexOf(normalizeOriginText(token)) !== -1;
  });
}

function roundOwnership(items) {
  var total = items.reduce(function(sum, item) { return sum + item.ownership; }, 0) || 1;
  var rounded = items.map(function(item) {
    return {
      label: item.label,
      cuisine: item.cuisine,
      ownership: Math.round(item.ownership / total * 100)
    };
  });
  var diff = 100 - rounded.reduce(function(sum, item) { return sum + item.ownership; }, 0);
  if (rounded.length) rounded[0].ownership += diff;
  return rounded;
}

function findDishFamily(query) {
  return TASTEDATA_ORIGIN_FUSION_DATA.families.find(function(family) {
    return hasAnyToken(query, family.match.concat(family.aliases || []));
  }) || null;
}

function variantOwnership(family, query) {
  var variant = family.variants && family.variants.find(function(item) {
    return hasAnyToken(query, item.match || []);
  });
  if (!variant) return roundOwnership(family.defaultOwnership || []);

  var items = [{ label: variant.label, cuisine: variant.cuisine, ownership: variant.ownership || 100 }];
  (variant.secondary || []).forEach(function(item) { items.push(item); });

  if (variant.pairsWith) {
    items.push({ label: variant.pairsWith, cuisine: variant.pairsWith.replace(/\s.+$/, ''), ownership: Math.max(100 - (variant.ownership || 50), 10) });
  }

  return roundOwnership(items);
}

function mergeMusicBias(ownership, family) {
  var topCuisine = ownership[0] && ownership[0].cuisine;
  var cuisineBias = TASTEDATA_ORIGIN_FUSION_DATA.cuisineMusic[topCuisine] || {};
  return {
    rhythm: cuisineBias.rhythm || (family.musicBias && family.musicBias.rhythm || ['contextual regional pulse']).join(', '),
    instrumentation: cuisineBias.instrumentation || (family.musicBias && family.musicBias.instrumentation || ['bounded regional timbre hints']).join(', '),
    production: cuisineBias.production || (family.musicBias && family.musicBias.production || ['respectful hybrid production']).join(', ')
  };
}

function inferFusionMode(ownership, query) {
  if (/fusion|hybrid|diaspora|modern|contemporary/.test(query)) return 'contemporary-fusion';
  if (ownership.length > 2) return 'shared-lineage';
  if (ownership.length === 2 && ownership[0].ownership < 90) return 'cross-regional';
  return 'none';
}

function cuisineTokensFromInput(input) {
  var text = normalizeOriginText([input.cuisine, input.description, input.notes, input.dishName].join(' '));
  var cuisines = Object.keys(TASTEDATA_ORIGIN_FUSION_DATA.cuisineMusic || {});
  return cuisines.filter(function(cuisine) {
    return text.indexOf(normalizeOriginText(cuisine)) !== -1;
  });
}

function inferFineDiningFusion(input, baseProfile) {
  var text = normalizeOriginText([input.place, input.description, input.notes, input.cuisine].join(' '));
  var fineDining = /fine|tasting|chef|michelin|degustation|course|omakase/.test(text);
  var explicitFusion = /fusion|hybrid|diaspora|modern|contemporary|inspired/.test(text);
  var tokens = cuisineTokensFromInput(input);

  if (!fineDining && !explicitFusion && tokens.length < 2) return baseProfile;
  if (explicitFusion && !fineDining && baseProfile.status === 'matched' && baseProfile.ownership && baseProfile.ownership.length) {
    return {
      status: baseProfile.status,
      dishFamily: baseProfile.dishFamily,
      inferredFrom: baseProfile.inferredFrom + '+fusion-context',
      originConfidence: baseProfile.originConfidence,
      ownership: baseProfile.ownership,
      fusionMode: 'contemporary-fusion',
      musicBias: baseProfile.musicBias,
      riskFlags: Array.from(new Set((baseProfile.riskFlags || []).concat(['fusion_claim']))),
      sourcePlan: baseProfile.sourcePlan
    };
  }
  if (tokens.length < 2 && baseProfile.ownership && baseProfile.ownership.length) {
    tokens = baseProfile.ownership.slice(0, 2).map(function(item) { return item.cuisine; }).filter(Boolean);
  }

  var ownership = tokens.length >= 2
    ? roundOwnership(tokens.slice(0, 4).map(function(cuisine) {
        return { label: cuisine + ' fine-dining influence', cuisine: cuisine, ownership: 100 / Math.min(tokens.length, 4) };
      }))
    : baseProfile.ownership;

  return {
    status: baseProfile.status,
    dishFamily: baseProfile.dishFamily,
    inferredFrom: baseProfile.inferredFrom + '+fine-dining-fusion-heuristic',
    originConfidence: baseProfile.originConfidence === 'low' ? 'medium' : baseProfile.originConfidence,
    ownership: ownership,
    fusionMode: explicitFusion || ownership.length > 1 ? 'contemporary-fusion' : 'fine-dining-interpretation',
    musicBias: baseProfile.musicBias,
    riskFlags: Array.from(new Set((baseProfile.riskFlags || []).concat(['fine_dining_interpretation']))),
    sourcePlan: baseProfile.sourcePlan
  };
}

function inferOriginFusion(input) {
  var query = normalizeOriginText([
    input.dishName,
    input.cuisine,
    input.description,
    input.notes
  ].join(' '));
  var family = findDishFamily(query);

  if (!family) {
    return inferFineDiningFusion(input, {
      status: 'unknown',
      dishFamily: 'unknown',
      inferredFrom: 'no curated family match',
      originConfidence: 'low',
      ownership: [],
      fusionMode: 'unknown',
      musicBias: {
        rhythm: 'neutral contextual pulse',
        instrumentation: 'no specific cultural instrumentation inferred',
        production: 'keep cultural references minimal'
      },
      riskFlags: ['unknown_origin'],
      sourcePlan: ['curated-mvp', 'wikidata-live-lookup', 'future-ai-resolver']
    });
  }

  var ownership = variantOwnership(family, query);
  var top = ownership[0];
  return inferFineDiningFusion(input, {
    status: 'matched',
    dishFamily: family.id,
    inferredFrom: 'curated-mvp',
    originConfidence: top && top.ownership >= 75 ? 'high' : 'medium',
    ownership: ownership,
    fusionMode: inferFusionMode(ownership, query),
    musicBias: mergeMusicBias(ownership, family),
    riskFlags: ownership.length > 1 ? ['shared_lineage'] : [],
    sourcePlan: ['curated-mvp', 'wikidata-live-lookup', 'future-ai-resolver']
  });
}

var TASTEDATA_ORIGIN_CACHE = {};

function mergeOriginProfiles(primary, secondary) {
  if (!secondary || secondary.status === 'unavailable') return primary;
  if (!primary || primary.status === 'unknown') return secondary;
  if (primary.status === 'matched') {
    return {
      status: primary.status,
      dishFamily: primary.dishFamily,
      inferredFrom: primary.inferredFrom + '+' + secondary.inferredFrom,
      originConfidence: primary.originConfidence,
      ownership: primary.ownership && primary.ownership.length ? primary.ownership : secondary.ownership,
      fusionMode: primary.fusionMode !== 'none' ? primary.fusionMode : secondary.fusionMode,
      musicBias: primary.musicBias,
      riskFlags: Array.from(new Set((primary.riskFlags || []).concat(secondary.riskFlags || []))),
      sourcePlan: Array.from(new Set((primary.sourcePlan || []).concat(secondary.sourcePlan || []))),
      externalEvidence: secondary.externalEvidence || null
    };
  }
  return secondary;
}

async function resolveOriginFusion(input) {
  var cacheKey = normalizeOriginText([input.dishName, input.cuisine, input.description, input.notes, input.place].join('|'));
  if (TASTEDATA_ORIGIN_CACHE[cacheKey]) return TASTEDATA_ORIGIN_CACHE[cacheKey];

  var curated = inferOriginFusion(input);
  if (typeof resolveWikidataFood !== 'function') return curated;

  try {
    var external = await resolveWikidataFood(input);
    var merged = mergeOriginProfiles(curated, external);
    TASTEDATA_ORIGIN_CACHE[cacheKey] = merged;
    return merged;
  } catch (err) {
    curated.riskFlags = Array.from(new Set((curated.riskFlags || []).concat(['external_lookup_failed'])));
    TASTEDATA_ORIGIN_CACHE[cacheKey] = curated;
    return curated;
  }
}

function originSummary(originProfile) {
  if (!originProfile || originProfile.status !== 'matched') {
    return 'No confident origin family match; use neutral cultural references.';
  }
  return originProfile.ownership.map(function(item) {
    return item.label + ' ' + item.ownership + '%';
  }).join(', ');
}
