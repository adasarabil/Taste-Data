function numberValue(value) {
  if (value === null || value === undefined || value === '') return null;
  var parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function bin(value, entries, fallback) {
  if (value === null) return fallback;
  return entries.find(function(entry) { return value < entry.lt; }) || entries[entries.length - 1];
}

function normalizeColor(input, pickerColor) {
  var raw = String(input || pickerColor || '#c4813a').trim();
  var hex = raw.match(/^#?([0-9a-f]{6})$/i);
  if (hex) return { value: '#' + hex[1].toUpperCase(), valid: true };

  var rgb = raw.match(/^rgb\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*\)$/i);
  if (rgb) {
    var values = rgb.slice(1).map(function(v) { return clamp(Number(v), 0, 255); });
    return {
      value: '#' + values.map(function(v) { return v.toString(16).padStart(2, '0'); }).join('').toUpperCase(),
      valid: true
    };
  }

  return { value: raw || '#C4813A', valid: false };
}

function colorFamily(hex) {
  if (!/^#[0-9A-F]{6}$/.test(hex)) {
    return {
      label: 'custom color',
      translation: 'custom pad timbre shaped by the provided color note',
      warmth: 0.45,
      darkness: 0.35
    };
  }

  var r = parseInt(hex.slice(1, 3), 16) / 255;
  var g = parseInt(hex.slice(3, 5), 16) / 255;
  var b = parseInt(hex.slice(5, 7), 16) / 255;
  var max = Math.max(r, g, b);
  var min = Math.min(r, g, b);
  var lightness = (max + min) / 2;
  var darkness = 1 - lightness;
  var hue = 0;

  if (max !== min) {
    var delta = max - min;
    if (max === r) hue = ((g - b) / delta + (g < b ? 6 : 0)) * 60;
    if (max === g) hue = ((b - r) / delta + 2) * 60;
    if (max === b) hue = ((r - g) / delta + 4) * 60;
  }

  if (darkness > 0.68) return { label: 'dark/purple', translation: 'deep mysterious cinematic pad', warmth: 0.35, darkness: darkness };
  if (lightness > 0.82) return { label: 'white/cream', translation: 'smooth clean minimal pad', warmth: 0.35, darkness: darkness };
  if (hue < 25 || hue >= 335) return { label: 'red/orange', translation: 'warm glowing pad', warmth: 0.9, darkness: darkness };
  if (hue < 65) return { label: 'yellow/gold', translation: 'bright sunny pad', warmth: 0.78, darkness: darkness };
  if (hue < 165) return { label: 'green', translation: 'green pad with fresh organic airy motion', warmth: 0.35, darkness: darkness };
  if (hue < 260) return { label: 'blue/purple', translation: 'cool deep cinematic pad', warmth: 0.2, darkness: darkness };
  return { label: 'brown/beige', translation: 'earthy roasted pad', warmth: 0.7, darkness: darkness };
}

function placeProfile(place) {
  var value = String(place || '').toLowerCase();
  if (/home|ev/.test(value)) return { label: 'home', translation: 'warm lo-fi intimate room space', warmth: 0.8, texture: 0.25 };
  if (/street|sokak/.test(value)) return { label: 'street', translation: 'urban percussive spatial texture', warmth: 0.45, texture: 0.8 };
  if (/traditional|restaurant|restoran|meyhane/.test(value)) return { label: 'traditional restaurant', translation: 'local cultural warmth in a shared dining space', warmth: 0.75, texture: 0.45 };
  if (/cafeteria|kafeterya/.test(value)) return { label: 'cafeteria', translation: 'playful casual room tone', warmth: 0.5, texture: 0.35 };
  if (/outdoor|seaside|sahil|garden|park/.test(value)) return { label: 'outdoor', translation: 'open breezy outdoor stereo field', warmth: 0.55, texture: 0.3 };
  if (/market|bazaar|pazar/.test(value)) return { label: 'market/bazaar', translation: 'layered dense percussion and crowd-like motion', warmth: 0.6, texture: 0.9 };
  if (/fine|chef|tasting/.test(value)) return { label: 'fine-dining', translation: 'elegant cinematic jazz space', warmth: 0.55, texture: 0.25 };
  return { label: place || 'unspecified place', translation: 'site-specific spatial ambience', warmth: 0.5, texture: 0.45 };
}

function deriveTasteDataProfile(input) {
  var weight = numberValue(input.weight);
  var ph = numberValue(input.ph);
  var temp = numberValue(input.temp);
  var tds = numberValue(input.tds);
  var warnings = [];

  if (weight !== null && weight <= 0) warnings.push('Weight should be greater than zero.');
  if (ph !== null && (ph < 0 || ph > 14)) warnings.push('pH should be between 0 and 14.');
  if (temp !== null && (temp < -20 || temp > 150)) warnings.push('Temperature is outside a plausible food-service range.');
  if (tds !== null && tds < 0) warnings.push('TDS should not be negative.');

  var safeWeight = weight === null ? null : Math.max(weight, 0);
  var safePh = ph === null ? null : clamp(ph, 0, 14);
  var safeTemp = temp === null ? null : clamp(temp, -20, 150);
  var safeTds = tds === null ? null : Math.max(tds, 0);
  var color = normalizeColor(input.color, input.pickerColor);
  if (!color.valid) warnings.push('Color should be a hex value or RGB triplet.');

  var weightBand = bin(safeWeight, [
    { lt: 150, label: 'light', translation: 'airy light bass', density: 0.2 },
    { lt: 400, label: 'medium', translation: 'warm balanced bass', density: 0.55 },
    { lt: Infinity, label: 'heavy', translation: 'deep heavy bass', density: 0.9 }
  ], { label: 'unknown', translation: 'balanced bass', density: 0.5 });

  var phBand = bin(safePh, [
    { lt: 4, label: 'very acidic', translation: 'bright metallic lead in C minor or D minor', darkness: 0.25 },
    { lt: 5.5, label: 'acidic', translation: 'acidic sparkling tense lead around E, F sharp minor, or A minor', darkness: 0.35 },
    { lt: 6.5, label: 'near-neutral', translation: 'near-neutral balanced clear lead in G, A, or D', darkness: 0.4 },
    { lt: 7.5, label: 'neutral', translation: 'smooth rounded neutral lead in C, F, or G', darkness: 0.45 },
    { lt: Infinity, label: 'alkaline', translation: 'alkaline dark earthy mellow lead', darkness: 0.75 }
  ], { label: 'unknown', translation: 'balanced clear lead', darkness: 0.45 });

  var tempBand = bin(safeTemp, [
    { lt: 15, label: 'cold', translation: '60-75 BPM slow ambient rhythm', energy: 0.15 },
    { lt: 30, label: 'cool', translation: '75-95 BPM relaxed rhythm', energy: 0.35 },
    { lt: 50, label: 'warm', translation: '95-115 BPM groovy rhythm', energy: 0.55 },
    { lt: 70, label: 'hot', translation: '115-135 BPM energetic rhythm', energy: 0.75 },
    { lt: Infinity, label: 'very hot', translation: '135-155 BPM intense fast rhythm', energy: 0.95 }
  ], { label: 'room temperature', translation: '95-115 BPM groovy rhythm', energy: 0.5 });

  var tdsBand = bin(safeTds, [
    { lt: 300, label: 'low', translation: 'soft gentle hi-hat texture', texture: 0.2 },
    { lt: 800, label: 'medium', translation: 'crisp balanced hi-hat texture', texture: 0.55 },
    { lt: Infinity, label: 'high', translation: 'sharp granular glitchy hi-hat texture', texture: 0.9 }
  ], { label: 'unknown', translation: 'crisp balanced hi-hat texture', texture: 0.5 });

  var colorBand = colorFamily(color.value);
  var placeBand = placeProfile(input.place);
  var richness = (weightBand.density + tdsBand.texture + tempBand.energy) / 3;
  var energy = tempBand.energy;
  var warmth = (colorBand.warmth + placeBand.warmth) / 2;
  var texture = (tdsBand.texture + placeBand.texture) / 2;
  var darkness = (phBand.darkness + colorBand.darkness) / 2;
  var distinctive = [weightBand.density, energy, texture, darkness, warmth]
    .filter(function(value) { return value < 0.28 || value > 0.72; }).length;
  var complexityLevel = distinctive >= 4 ? 'Complex' : distinctive <= 2 ? 'Simple' : 'Balanced';

  return {
    rows: [
      { parameter: 'Weight/Mass', value: safeWeight === null ? 'not provided' : safeWeight + ' g', controls: 'Bass layer depth', musicalTranslation: weightBand.translation },
      { parameter: 'pH', value: safePh === null ? 'not provided' : String(safePh), controls: 'Lead synth key and timbre', musicalTranslation: phBand.translation },
      { parameter: 'Temperature', value: safeTemp === null ? 'not provided' : safeTemp + ' C', controls: 'BPM and rhythmic energy', musicalTranslation: tempBand.translation },
      { parameter: 'Salinity/TDS', value: safeTds === null ? 'not provided' : safeTds + ' ppm', controls: 'Hi-hat texture', musicalTranslation: tdsBand.translation },
      { parameter: 'Color', value: color.value, controls: 'Synth pad timbre', musicalTranslation: colorBand.translation },
      { parameter: 'Place', value: input.place || 'not provided', controls: 'Spatial genre and ambience', musicalTranslation: placeBand.translation }
    ],
    warnings: warnings,
    complexityLevel: complexityLevel,
    complexityExplanation: complexityLevel + ' profile: ' + distinctive + ' distinctive readings shape the arrangement while preserving the six current TasteData inputs.',
    axes: { energy: energy, warmth: warmth, darkness: darkness, texture: texture, richness: richness, tempFeel: tempBand.label },
    bands: { weightBand: weightBand, phBand: phBand, tempBand: tempBand, tdsBand: tdsBand, colorBand: colorBand, placeBand: placeBand }
  };
}
