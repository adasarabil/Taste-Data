var TASTEDATA_OUTPUT_SCHEMA = {
  required: [
    'dishInterpretation',
    'complexityLevel',
    'complexityExplanation',
    'mappingRows',
    'stems',
    'mixDirection',
    'negativePrompts'
  ],
  mappingRows: ['parameter', 'value', 'controls', 'musicalTranslation'],
  stems: ['title', 'param', 'prompt'],
  rowCount: 6,
  stemCount: 6
};

function buildLocalOutput(input, profile, originProfile) {
  var dishName = input.dishName || 'This dish';
  var rows = profile.rows;
  var originLine = originProfile ? originSummary(originProfile) : 'No origin context inferred.';
  var musicBias = originProfile && originProfile.musicBias ? originProfile.musicBias : {
    rhythm: 'neutral contextual pulse',
    instrumentation: 'no specific cultural instrumentation inferred',
    production: 'keep cultural references minimal'
  };
  return {
    originProfile: originProfile || null,
    dishInterpretation: dishName + ' becomes an instrumental composition where mass shapes bass, pH shapes lead color, temperature shapes tempo, TDS shapes percussion, color shapes pads, and place shapes space. Origin/fusion context: ' + originLine + '.',
    complexityLevel: profile.complexityLevel,
    complexityExplanation: profile.complexityExplanation + ' Cultural context is used as style enrichment only, not as an extra sensor.',
    mappingRows: rows,
    stems: rows.map(function(row) {
      return {
        title: row.parameter + ' Stem',
        param: row.parameter,
        prompt: 'Instrumental stem focused only on ' + row.parameter + '. Translate ' + row.value + ' into ' + row.musicalTranslation + '. Cultural enrichment may use ' + musicBias.instrumentation + ' as subtle color, but do not override this parameter. Keep the arrangement restrained and data-driven, with no vocals, no literal food lyrics, and no extra sensor concepts beyond this one parameter.'
      };
    }),
    mixDirection: 'Mix around ' + profile.axes.tempFeel + ' energy, ' + profile.axes.texture.toFixed(2) + ' texture, ' + profile.axes.warmth.toFixed(2) + ' warmth, and ' + profile.axes.darkness.toFixed(2) + ' darkness. Origin/fusion bias: rhythm=' + musicBias.rhythm + '; instrumentation=' + musicBias.instrumentation + '; production=' + musicBias.production + '. Keep each of the six parameter layers audible.',
    negativePrompts: ['vocals', 'lyrics about food', 'generic cooking song', 'cultural stereotypes', 'claiming one owner for shared-lineage foods', 'unrelated instruments overpowering the data layers']
  };
}

function validateOutput(output, fallback) {
  return validateOutputWithWarnings(output, fallback).output;
}

function validateOutputWithWarnings(output, fallback) {
  var warnings = [];
  var repaired = output && typeof output === 'object' ? Object.assign({}, output) : {};

  TASTEDATA_OUTPUT_SCHEMA.required.forEach(function(key) {
    if (repaired[key] === undefined || repaired[key] === null || repaired[key] === '') {
      repaired[key] = fallback[key];
      warnings.push('Repaired missing ' + key + '.');
    }
  });

  if (!repaired.originProfile && fallback.originProfile) {
    repaired.originProfile = fallback.originProfile;
  }

  if (!Array.isArray(repaired.mappingRows) || repaired.mappingRows.length !== TASTEDATA_OUTPUT_SCHEMA.rowCount) {
    repaired.mappingRows = fallback.mappingRows;
    warnings.push('Repaired mappingRows count.');
  }

  if (!Array.isArray(repaired.stems) || repaired.stems.length !== TASTEDATA_OUTPUT_SCHEMA.stemCount) {
    repaired.stems = fallback.stems;
    warnings.push('Repaired stems count.');
  }

  if (!Array.isArray(repaired.negativePrompts) || repaired.negativePrompts.length === 0) {
    repaired.negativePrompts = fallback.negativePrompts;
    warnings.push('Repaired negativePrompts.');
  }

  repaired.mappingRows = repaired.mappingRows.map(function(row, index) {
    var merged = Object.assign({}, fallback.mappingRows[index], row);
    TASTEDATA_OUTPUT_SCHEMA.mappingRows.forEach(function(key) {
      if (!merged[key]) {
        merged[key] = fallback.mappingRows[index][key];
        warnings.push('Repaired mappingRows[' + index + '].' + key + '.');
      }
    });
    if (merged.parameter !== fallback.mappingRows[index].parameter) {
      merged = Object.assign({}, fallback.mappingRows[index]);
      warnings.push('Repaired mappingRows[' + index + '] parameter order.');
    }
    return merged;
  });

  repaired.stems = repaired.stems.map(function(stem, index) {
    var merged = Object.assign({}, fallback.stems[index], stem);
    TASTEDATA_OUTPUT_SCHEMA.stems.forEach(function(key) {
      if (!merged[key]) {
        merged[key] = fallback.stems[index][key];
        warnings.push('Repaired stems[' + index + '].' + key + '.');
      }
    });
    return merged;
  });

  return { output: repaired, warnings: warnings };
}
