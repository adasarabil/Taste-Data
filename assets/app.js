var TASTEDATA_SYSTEM_PROMPT = `You are the AI prompt-generation engine for TasteData: Algorithmic Translation of Food Chemistry into Audiovisual Compositions.

Transform measurable food data into musically coherent prompts for Suno AI. The music must feel data-driven, not like a generic food song.

Use the deterministic sensory profile as the source of truth for the six measured inputs. Use the origin/fusion profile only as cultural context for style vocabulary, instrumentation hints, rhythmic grammar, and narrative framing. Do not add origin as a seventh sensor, and do not let origin override the six measured mappings.

You MUST respond with ONLY a raw JSON object using this exact structure:
{"dishInterpretation":"string","complexityLevel":"string","complexityExplanation":"string","mappingRows":[{"parameter":"string","value":"string","controls":"string","musicalTranslation":"string"}],"stems":[{"title":"string","param":"string","prompt":"string"}],"mixDirection":"string","negativePrompts":["string"]}

Rules:
- mappingRows must have exactly 6 items: Weight/Mass, pH, Temperature, Salinity/TDS, Color, Place
- stems must have exactly 6 items
- Each stem prompt must be English, instrumental, and focused on one parameter only
- Origin/fusion may enrich musical references but must not introduce new sensor categories
- No newlines inside string values`;

var loaderMsgs = [
  'Analysing dish parameters...',
  'Inferring dish family and origin context...',
  'Mapping pH to lead synth key...',
  'Calculating BPM from temperature...',
  'Translating TDS to hi-hat texture...',
  'Interpreting color as synth pad...',
  'Generating 6 stem prompts...',
  'Building mix direction...'
];

var loaderInterval;

function collectInput() {
  return {
    dishName: document.getElementById('dishName').value.trim(),
    cuisine: document.getElementById('cuisine').value.trim(),
    description: document.getElementById('description').value.trim(),
    weight: document.getElementById('weight').value.trim(),
    ph: document.getElementById('ph').value.trim(),
    temp: document.getElementById('temp').value.trim(),
    tds: document.getElementById('tds').value.trim(),
    color: document.getElementById('colorHex').value.trim() || document.getElementById('colorPicker').value,
    pickerColor: document.getElementById('colorPicker').value,
    place: document.getElementById('place').value.trim(),
    notes: document.getElementById('notes').value.trim()
  };
}

function esc(str) {
  if (!str) return '';
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function parseClaudeJson(data) {
  var raw = Array.isArray(data.content) ? data.content.map(function(c) { return c.text || ''; }).join('') : '';
  var clean = raw.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/i, '').trim();
  var first = clean.indexOf('{');
  var last = clean.lastIndexOf('}');
  if (first === -1 || last === -1) throw new Error('No JSON found in response.');
  return JSON.parse(clean.slice(first, last + 1));
}

async function postClaude(payload) {
  var res = await fetch(getClaudeEndpoint(), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  var data = await res.json();
  if (!res.ok) throw new Error((data && (data.error && data.error.message || data.error)) || 'API error ' + res.status);
  return data;
}

async function generate() {
  var btn = document.getElementById('generateBtn');
  document.getElementById('errorBox').className = 'error-box';
  document.getElementById('outputSection').className = 'output-section';

  var input = collectInput();
  if (!input.dishName) { showError('Please enter a dish name.'); return; }
  if (!input.place) { showError('Please enter where the dish is eaten.'); return; }

  var sensoryProfile = deriveTasteDataProfile(input);
  var originProfile = await resolveOriginFusion(input);
  var fallback = buildLocalOutput(input, sensoryProfile, originProfile);
  var userMsg = JSON.stringify({
    dish: {
      name: input.dishName,
      cuisine: input.cuisine || 'not provided',
      description: input.description || 'not provided',
      place: input.place,
      notes: input.notes || 'none'
    },
    measuredInputs: {
      weight: input.weight || 'not provided',
      ph: input.ph || 'not provided',
      temperature: input.temp || 'not provided',
      tds: input.tds || 'not provided',
      color: input.color || 'not provided',
      place: input.place
    },
    deterministicSensoryProfile: sensoryProfile,
    originFusionProfile: originProfile
  }, null, 2);

  btn.disabled = true;
  document.getElementById('loader').className = 'loader visible';
  var msgIdx = 0;
  document.getElementById('loaderMsg').textContent = loaderMsgs[0];
  loaderInterval = setInterval(function() {
    msgIdx = (msgIdx + 1) % loaderMsgs.length;
    document.getElementById('loaderMsg').textContent = loaderMsgs[msgIdx];
  }, 2000);

  try {
    var data = await postClaude({
      max_tokens: 4000,
      system: TASTEDATA_SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userMsg }]
    });
    var validation = validateOutputWithWarnings(parseClaudeJson(data), fallback);
    renderOutput(validation.output, input.dishName);
    if (validation.warnings.length) {
      showError('Claude output was repaired to match the TasteData schema: ' + validation.warnings.join('; '));
    }
  } catch (e) {
    renderOutput(fallback, input.dishName);
    showError('Claude unavailable; showing deterministic local output. ' + e.message);
  } finally {
    clearInterval(loaderInterval);
    document.getElementById('loader').className = 'loader';
    btn.disabled = false;
  }
}

function switchTab(name) {
  document.querySelectorAll('.tab-btn').forEach(function(b) { b.classList.remove('active'); });
  document.querySelectorAll('.tab-panel').forEach(function(p) { p.classList.remove('active'); });
  document.querySelector('[onclick="switchTab(\'' + name + '\')"]').classList.add('active');
  document.getElementById('tab-' + name).classList.add('active');
}

function toggleStem(card) {
  card.classList.toggle('open');
}

function copyPrompt(text, btn) {
  navigator.clipboard.writeText(text).then(function() {
    btn.textContent = 'Copied!';
    btn.classList.add('copied');
    setTimeout(function() { btn.textContent = 'Copy Prompt'; btn.classList.remove('copied'); }, 2000);
  }).catch(function() {
    var ta = document.createElement('textarea');
    ta.value = text;
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);
    btn.textContent = 'Copied!';
    btn.classList.add('copied');
    setTimeout(function() { btn.textContent = 'Copy Prompt'; btn.classList.remove('copied'); }, 2000);
  });
}

function showError(msg) {
  var el = document.getElementById('errorBox');
  el.textContent = msg;
  el.className = 'error-box visible';
}

function renderOutput(d, dishName) {
  document.getElementById('outputDishName').textContent = dishName;
  document.getElementById('complexityBadge').textContent = d.complexityLevel || '';
  document.getElementById('interpretationText').textContent = d.dishInterpretation || '';
  document.getElementById('complexityExpl').textContent = d.complexityExplanation || '';

  var tbody = document.getElementById('mappingBody');
  tbody.innerHTML = '';
  (d.mappingRows || []).forEach(function(row) {
    var tr = document.createElement('tr');
    tr.innerHTML = '<td>' + esc(row.parameter) + '</td><td>' + esc(row.value) + '</td><td>' + esc(row.controls) + '</td><td>' + esc(row.musicalTranslation) + '</td>';
    tbody.appendChild(tr);
  });

  var container = document.getElementById('stemsContainer');
  container.innerHTML = '';
  (d.stems || []).forEach(function(stem, i) {
    var card = document.createElement('div');
    card.className = 'stem-card' + (i === 0 ? ' open' : '');
    var promptText = stem.prompt || '';
    card.innerHTML = '<div class="stem-header" onclick="toggleStem(this.parentElement)">' +
      '<div class="stem-left">' +
      '<span class="stem-number">0' + (i + 1) + '</span>' +
      '<span class="stem-title">' + esc(stem.title) + '</span>' +
      '<span class="stem-param-tag">' + esc(stem.param) + '</span>' +
      '</div><span class="stem-chevron">v</span></div>' +
      '<div class="stem-body"><p class="stem-prompt-text">' + esc(promptText) + '</p>' +
      '<button class="copy-btn" onclick="copyPrompt(' + JSON.stringify(promptText) + ', this)">Copy Prompt</button></div>';
    container.appendChild(card);
  });

  document.getElementById('mixText').textContent = d.mixDirection || '';
  var negItems = document.getElementById('negativeItems');
  negItems.innerHTML = '';
  (d.negativePrompts || []).forEach(function(item) {
    var div = document.createElement('div');
    div.className = 'negative-item';
    div.textContent = item;
    negItems.appendChild(div);
  });

  document.getElementById('outputSection').className = 'output-section visible';
  switchTab('stems');
  setTimeout(function() {
    document.getElementById('outputSection').scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, 100);
}

function bindUi() {
  var picker = document.getElementById('colorPicker');
  var colorHex = document.getElementById('colorHex');
  if (!picker || !colorHex) return;
  picker.addEventListener('input', function() {
    colorHex.value = this.value.toUpperCase();
  });
  colorHex.addEventListener('input', function() {
    var v = this.value.trim();
    if (/^#[0-9A-Fa-f]{6}$/.test(v)) picker.value = v;
  });
}

window.generate = generate;
window.switchTab = switchTab;
window.toggleStem = toggleStem;
window.copyPrompt = copyPrompt;

if (window.document) bindUi();
