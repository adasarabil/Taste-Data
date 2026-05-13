const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const {
  CLAUDE_ENDPOINT_CONFIG,
  validateClaudeRequest,
  buildSafeClaudePayload
} = require('../api/claude-config.cjs');

const root = path.resolve(__dirname, '..');
const scripts = [
  'assets/config.js',
  'assets/taste-profile.js',
  'assets/origin-fusion-data.js',
  'assets/origin-fusion.js',
  'assets/external-food-data.js',
  'assets/schema.js',
  'assets/app.js'
].map(file => fs.readFileSync(path.join(root, file), 'utf8')).join('\n');

const elements = new Map();
function element(id) {
  if (!elements.has(id)) {
    elements.set(id, {
      id,
      value: '',
      textContent: '',
      className: '',
      disabled: false,
      innerHTML: '',
      addEventListener() {},
      appendChild() {},
      classList: { add() {}, remove() {}, toggle() {} },
      scrollIntoView() {}
    });
  }
  return elements.get(id);
}

const sandbox = {
  console,
  URLSearchParams,
  fetch: async () => ({ ok: false, status: 503, json: async () => ({}) }),
  setInterval() { return 1; },
  clearInterval() {},
  setTimeout(fn) { if (typeof fn === 'function') fn(); },
  navigator: { clipboard: { writeText: async () => {} } },
  window: { location: { hostname: 'localhost' } },
  document: {
    getElementById: element,
    querySelectorAll: () => [],
    querySelector: () => ({ classList: { add() {}, remove() {} } }),
    createElement: () => element('created'),
    body: { appendChild() {}, removeChild() {} },
    execCommand: () => true
  }
};

vm.createContext(sandbox);
vm.runInContext(`${scripts}
globalThis.__TasteDataTest = { deriveTasteDataProfile, buildLocalOutput, validateOutput, validateOutputWithWarnings, getClaudeEndpoint, inferOriginFusion, resolveOriginFusion, originSummary, roundOwnership };`, sandbox);

const { deriveTasteDataProfile, buildLocalOutput, validateOutput, validateOutputWithWarnings, getClaudeEndpoint, inferOriginFusion, resolveOriginFusion, originSummary, roundOwnership } = sandbox.__TasteDataTest;

function profile(input) {
  return deriveTasteDataProfile({
    dishName: input.dishName || 'Test Dish',
    cuisine: input.cuisine || '',
    description: input.description || '',
    notes: input.notes || '',
    pickerColor: input.pickerColor || '#c4813a',
    ...input
  });
}

function rowText(p, parameter) {
  return p.rows.find(row => row.parameter === parameter).musicalTranslation;
}

const balancedSoup = profile({
  dishName: 'Mercimek Corbasi',
  weight: '350',
  ph: '6.2',
  temp: '72',
  tds: '850',
  color: '#C4813A',
  place: 'home'
});
assert.match(rowText(balancedSoup, 'Weight/Mass'), /balanced bass/);
assert.match(rowText(balancedSoup, 'Temperature'), /135-155 BPM/);
assert.match(rowText(balancedSoup, 'Salinity/TDS'), /granular glitchy/);
assert.match(rowText(balancedSoup, 'Place'), /lo-fi intimate/);

const coldSalad = profile({
  dishName: 'Cucumber Salad',
  weight: '120',
  ph: '5.0',
  temp: '8',
  tds: '250',
  color: '#7DBA5A',
  place: 'outdoor'
});
assert.match(rowText(coldSalad, 'Weight/Mass'), /airy light bass/);
assert.match(rowText(coldSalad, 'Temperature'), /60-75 BPM/);
assert.match(rowText(coldSalad, 'Color'), /green pad/);
assert.match(rowText(coldSalad, 'Place'), /open breezy outdoor/);

const alkaline = profile({
  dishName: 'Black Bean Stew',
  weight: '620',
  ph: '8.1',
  temp: '64',
  tds: '700',
  color: '#3A241A',
  place: 'traditional restaurant'
});
assert.match(rowText(alkaline, 'Weight/Mass'), /deep heavy bass/);
assert.match(rowText(alkaline, 'pH'), /alkaline/);
assert.match(rowText(alkaline, 'Temperature'), /115-135 BPM/);

const boundary = profile({
  dishName: 'Boundary Plate',
  weight: '150',
  ph: '4',
  temp: '15',
  tds: '300',
  color: '#E0B233',
  place: 'street'
});
assert.match(rowText(boundary, 'Weight/Mass'), /balanced bass/);
assert.match(rowText(boundary, 'pH'), /acidic/);
assert.match(rowText(boundary, 'Temperature'), /75-95 BPM/);
assert.match(rowText(boundary, 'Salinity/TDS'), /crisp balanced/);

const implausible = profile({
  dishName: 'Broken Sensor Plate',
  weight: '-1',
  ph: '-1',
  temp: '300',
  tds: '-20',
  color: 'not-a-color',
  place: 'lab'
});
assert.ok(implausible.warnings.length >= 4);

const localOutput = buildLocalOutput({ dishName: 'Mock Dish' }, balancedSoup);
assert.equal(localOutput.mappingRows.length, 6);
assert.equal(localOutput.stems.length, 6);
const repaired = validateOutput({ mappingRows: [], stems: [], negativePrompts: [] }, localOutput);
assert.equal(repaired.mappingRows.length, 6);
assert.equal(repaired.stems.length, 6);
assert.ok(repaired.negativePrompts.length > 0);

const repairedWithWarnings = validateOutputWithWarnings({ mappingRows: [{ parameter: 'Wrong' }], stems: [] }, localOutput);
assert.equal(repairedWithWarnings.output.mappingRows[0].parameter, 'Weight/Mass');
assert.ok(repairedWithWarnings.warnings.length > 0);

sandbox.window.location = { hostname: 'example.netlify.app', search: '' };
assert.equal(getClaudeEndpoint(), '/.netlify/functions/claude');
sandbox.window.location = { hostname: 'taste-data.vercel.app', search: '' };
assert.equal(getClaudeEndpoint(), '/api/claude');
sandbox.window.location = { hostname: 'localhost', search: '?api=/custom/claude' };
assert.equal(getClaudeEndpoint(), '/custom/claude');
sandbox.window.TASTEDATA_API_ENDPOINT = '/configured/claude';
sandbox.window.location = { hostname: 'taste-data.vercel.app', search: '?api=/custom/claude' };
assert.equal(getClaudeEndpoint(), '/configured/claude');
delete sandbox.window.TASTEDATA_API_ENDPOINT;

const mantiOrigin = inferOriginFusion({
  dishName: 'Mantı',
  cuisine: 'Turkish',
  description: 'small dumplings with yogurt',
  notes: ''
});
assert.equal(mantiOrigin.dishFamily, 'dumpling');
assert.equal(mantiOrigin.ownership[0].label, 'Turkish manti');
assert.equal(mantiOrigin.ownership.reduce((sum, item) => sum + item.ownership, 0), 100);

const sharedDumpling = inferOriginFusion({
  dishName: 'Dumplings',
  cuisine: '',
  description: 'filled dough',
  notes: ''
});
assert.equal(sharedDumpling.fusionMode, 'shared-lineage');
assert.equal(sharedDumpling.ownership.reduce((sum, item) => sum + item.ownership, 0), 100);
assert.match(originSummary(sharedDumpling), /Far East/);

const tacoFusion = inferOriginFusion({
  dishName: 'Korean taco',
  cuisine: 'Korean Mexican fusion',
  description: '',
  notes: 'contemporary hybrid'
});
assert.equal(tacoFusion.dishFamily, 'taco');
assert.equal(tacoFusion.fusionMode, 'contemporary-fusion');
assert.equal(tacoFusion.ownership.reduce((sum, item) => sum + item.ownership, 0), 100);

const outputWithOrigin = buildLocalOutput({ dishName: 'Mantı' }, balancedSoup, mantiOrigin);
assert.equal(outputWithOrigin.mappingRows.length, 6);
assert.equal(outputWithOrigin.originProfile.dishFamily, 'dumpling');
assert.match(outputWithOrigin.dishInterpretation, /Origin\/fusion context/);
const repairedOrigin = validateOutputWithWarnings({ mappingRows: [], stems: [] }, outputWithOrigin);
assert.equal(repairedOrigin.output.originProfile.dishFamily, 'dumpling');

const fineDiningFusion = inferOriginFusion({
  dishName: 'Chef tasting dumpling',
  cuisine: 'Turkish Japanese',
  description: 'fine dining tasting menu, modern fusion',
  notes: 'foam and plated course',
  place: 'fine dining'
});
assert.equal(fineDiningFusion.fusionMode, 'contemporary-fusion');
assert.ok(fineDiningFusion.riskFlags.includes('fine_dining_interpretation'));
assert.equal(fineDiningFusion.ownership.reduce((sum, item) => sum + item.ownership, 0), 100);

const rounded = roundOwnership([
  { label: 'A', cuisine: 'A', ownership: 1 },
  { label: 'B', cuisine: 'B', ownership: 1 },
  { label: 'C', cuisine: 'C', ownership: 1 }
]);
assert.equal(rounded.reduce((sum, item) => sum + item.ownership, 0), 100);

resolveOriginFusion({
  dishName: 'Unknown network dish',
  cuisine: '',
  description: '',
  notes: ''
}).then((resolved) => {
  assert.ok(['unknown', 'unavailable', 'matched'].includes(resolved.status));
  console.log('TasteData deterministic mapping tests passed.');
}).catch((err) => {
  console.error(err);
  process.exit(1);
});
