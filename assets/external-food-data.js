var WIKIDATA_FOOD_CONFIG = {
  searchEndpoint: 'https://www.wikidata.org/w/api.php',
  entityEndpoint: 'https://www.wikidata.org/wiki/Special:EntityData/',
  sparqlEndpoint: 'https://query.wikidata.org/sparql',
  maxSearchResults: 3,
  properties: {
    countryOfOrigin: 'P495',
    cuisine: 'P2012',
    instanceOf: 'P31',
    subclassOf: 'P279',
    partOf: 'P361',
    hasPart: 'P527'
  }
};

function wikidataUrl(params) {
  var search = new URLSearchParams(Object.assign({ origin: '*', format: 'json' }, params));
  return WIKIDATA_FOOD_CONFIG.searchEndpoint + '?' + search.toString();
}

async function fetchWikidataJson(url) {
  var res = await fetch(url);
  if (!res.ok) throw new Error('Wikidata request failed: ' + res.status);
  return res.json();
}

async function searchWikidataDish(input) {
  var query = [input.dishName, input.cuisine].filter(Boolean).join(' ').trim() || input.dishName;
  if (!query) return [];
  var data = await fetchWikidataJson(wikidataUrl({
    action: 'wbsearchentities',
    language: 'en',
    type: 'item',
    limit: WIKIDATA_FOOD_CONFIG.maxSearchResults,
    search: query
  }));
  return (data.search || []).map(function(item) {
    return {
      id: item.id,
      label: item.label || item.id,
      description: item.description || '',
      concepturi: item.concepturi
    };
  });
}

async function fetchWikidataEntity(id) {
  var data = await fetchWikidataJson(WIKIDATA_FOOD_CONFIG.entityEndpoint + encodeURIComponent(id) + '.json?origin=*');
  return data.entities && data.entities[id] ? data.entities[id] : null;
}

function claimEntityIds(entity, property) {
  var claims = entity && entity.claims && entity.claims[property] ? entity.claims[property] : [];
  return claims.map(function(claim) {
    return claim.mainsnak &&
      claim.mainsnak.datavalue &&
      claim.mainsnak.datavalue.value &&
      claim.mainsnak.datavalue.value.id;
  }).filter(Boolean);
}

async function fetchWikidataLabels(ids) {
  var unique = Array.from(new Set(ids)).filter(Boolean);
  if (!unique.length) return {};
  var data = await fetchWikidataJson(wikidataUrl({
    action: 'wbgetentities',
    props: 'labels',
    languages: 'en',
    ids: unique.join('|')
  }));
  var labels = {};
  Object.keys(data.entities || {}).forEach(function(id) {
    var entity = data.entities[id];
    labels[id] = entity.labels && entity.labels.en ? entity.labels.en.value : id;
  });
  return labels;
}

function ownershipFromExternalLabels(labels, primaryWeight) {
  var entries = labels.map(function(label, index) {
    return {
      label: label,
      cuisine: label,
      ownership: index === 0 ? primaryWeight : Math.max(10, (100 - primaryWeight) / Math.max(labels.length - 1, 1))
    };
  });
  return roundOwnership(entries);
}

function dishFamilyFromExternalLabels(searchResult, typeLabels) {
  var text = normalizeOriginText([searchResult.label, searchResult.description].concat(typeLabels).join(' '));
  var family = findDishFamily(text);
  return family ? family.id : 'external-food-item';
}

function musicBiasFromOwnership(ownership) {
  var topCuisine = ownership[0] && ownership[0].cuisine;
  var bias = TASTEDATA_ORIGIN_FUSION_DATA.cuisineMusic[topCuisine] || null;
  if (bias) return bias;
  return {
    rhythm: 'dataset-informed contextual pulse',
    instrumentation: 'subtle regional timbre hints without stereotype',
    production: 'balanced modern production'
  };
}

async function resolveWikidataFood(input) {
  var results = await searchWikidataDish(input);
  if (!results.length) {
    return {
      status: 'unavailable',
      inferredFrom: 'wikidata-live-lookup',
      riskFlags: ['wikidata_no_match'],
      sourcePlan: ['curated-mvp', 'wikidata-live-lookup', 'future-ai-resolver']
    };
  }

  var result = results[0];
  var entity = await fetchWikidataEntity(result.id);
  if (!entity) {
    return {
      status: 'unavailable',
      inferredFrom: 'wikidata-live-lookup',
      riskFlags: ['wikidata_entity_missing'],
      sourcePlan: ['curated-mvp', 'wikidata-live-lookup', 'future-ai-resolver']
    };
  }

  var props = WIKIDATA_FOOD_CONFIG.properties;
  var cuisineIds = claimEntityIds(entity, props.cuisine);
  var originIds = claimEntityIds(entity, props.countryOfOrigin);
  var typeIds = claimEntityIds(entity, props.instanceOf).concat(claimEntityIds(entity, props.subclassOf));
  var labels = await fetchWikidataLabels(cuisineIds.concat(originIds).concat(typeIds));
  var cuisineLabels = cuisineIds.map(function(id) { return labels[id]; }).filter(Boolean);
  var originLabels = originIds.map(function(id) { return labels[id]; }).filter(Boolean);
  var typeLabels = typeIds.map(function(id) { return labels[id]; }).filter(Boolean);
  var ownershipLabels = cuisineLabels.length ? cuisineLabels : originLabels;
  var ownership = ownershipLabels.length ? ownershipFromExternalLabels(ownershipLabels, cuisineLabels.length ? 75 : 65) : [];

  return {
    status: ownership.length ? 'matched' : 'unknown',
    dishFamily: dishFamilyFromExternalLabels(result, typeLabels),
    inferredFrom: 'wikidata-live-lookup',
    originConfidence: cuisineLabels.length ? 'medium' : originLabels.length ? 'low' : 'unknown',
    ownership: ownership,
    fusionMode: ownership.length > 1 ? 'cross-regional' : 'none',
    musicBias: musicBiasFromOwnership(ownership),
    riskFlags: ownership.length ? ['external_dataset_inferred'] : ['wikidata_no_origin_claims'],
    sourcePlan: ['curated-mvp', 'wikidata-live-lookup', 'future-ai-resolver'],
    externalEvidence: {
      provider: 'Wikidata',
      itemId: result.id,
      label: result.label,
      description: result.description,
      cuisineLabels: cuisineLabels,
      originLabels: originLabels,
      typeLabels: typeLabels
    }
  };
}
