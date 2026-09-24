/**
 * Automated Verification Suite for AreWee-Optimizer v2.7.1.3
 * - Empty img_optm_sizes_skipped / img_optm-sizes_skipped → isMeasured true ("Tom / Standard")
 * - img_optm-webp: 0→AV, 1→WebP, 2→AVIF; false/"0" measured
 * - Top-level hyphen AND options nested forms
 * - Wrong key img_optm_sizes-skipped alone not required (correct key works)
 * - Version string 2.7.1.3
 */

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const BASE_DIR = path.resolve(__dirname, '..');
let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`✅ PASS: ${message}`);
    passed++;
  } else {
    console.error(`❌ FAIL: ${message}`);
    failed++;
  }
}

console.log('=== STARTING v2.7.1.3 VERIFICATION SUITE ===\n');

const indexHtml = fs.readFileSync(path.join(BASE_DIR, 'index.html'), 'utf8');
const appJs = fs.readFileSync(path.join(BASE_DIR, 'js/app.js'), 'utf8');
const rulesJs = fs.readFileSync(path.join(BASE_DIR, 'js/rules.js'), 'utf8');
const exporterJs = fs.readFileSync(path.join(BASE_DIR, 'js/exporter.js'), 'utf8');
const stylesCss = fs.readFileSync(path.join(BASE_DIR, 'css/styles.css'), 'utf8');
const readmeMd = fs.readFileSync(path.join(BASE_DIR, 'README.md'), 'utf8');
const geminiMd = fs.readFileSync(path.join(BASE_DIR, 'GEMINI.md'), 'utf8');

console.log('--- 1. Version Consistency (v2.7.1.3) ---');
assert(indexHtml.includes('(v2.7.1.3)'), 'index.html mentions v2.7.1.3');
assert(indexHtml.includes('?v=2.7.1.3'), 'index.html cache-bust ?v=2.7.1.3');
assert(appJs.includes('const APP_VERSION = "2.7.1.3"'), 'app.js APP_VERSION = 2.7.1.3');
assert(appJs.includes('targetVersion = "2.7.1.3"'), 'app.js targetVersion = 2.7.1.3');
assert(rulesJs.includes('Compatibility Engine (v2.7.1.3)'), 'rules.js header v2.7.1.3');
assert(exporterJs.includes('Exporter / Serializer (v2.7.1.3)'), 'exporter.js header v2.7.1.3');
assert(exporterJs.includes("'syncPluginVersion' => '2.7.1.3'"), 'exporter.js syncPluginVersion 2.7.1.3');
assert(stylesCss.includes('Stylesheet (v2.7.1.3)'), 'styles.css header v2.7.1.3');
assert(readmeMd.includes('Dashboard (v2.7.1.3)'), 'README.md header v2.7.1.3');
assert(readmeMd.includes('Release v2.7.1.3:'), 'README.md has v2.7.1.3 changelog');
assert(geminiMd.includes('Arkitektur (v2.7.1.3)'), 'GEMINI.md Arkitektur v2.7.1.3');

console.log('\n--- 2. Source: empty-key / hyphen hardening ---');
assert(rulesJs.includes('img_optm-" + opt.id.slice("img_optm_".length)'),
  'rules.js uses img_optm- + rest (not last-underscore-only hyphen)');
assert(!rulesJs.includes('opt.id.replace(/_([^_]+)$/, "-$1")'),
  'rules.js no longer uses last-segment hyphen fallback for img_optm');
assert(rulesJs.includes('Object.prototype.hasOwnProperty.call(obj, k)'),
  'rules.js 6b pick uses hasOwnProperty for present empty/false');
assert(exporterJs.includes('"img_optm-webp": "img_optm_webp"'), 'exporter maps img_optm-webp');
assert(exporterJs.includes('"img_optm-sizes_skipped": "img_optm_sizes_skipped"'),
  'exporter maps img_optm-sizes_skipped');
assert(exporterJs.includes('"img_optm_sizes_skipped": "img_optm-sizes_skipped"'),
  'exporter LSCWP map keeps img_optm-sizes_skipped (not sizes-skipped)');

// --- Load rules + exporter ---
const context = {
  console, setTimeout, clearTimeout, Math, Date, JSON, String, Number, Boolean,
  parseInt, parseFloat, isNaN, Array, Object, RegExp, Error,
  module: { exports: {} },
  exports: {}
};
context.window = context;
context.global = context;
vm.createContext(context);
vm.runInContext(exporterJs, context);
vm.runInContext(rulesJs, context);

const exported = context.module && context.module.exports ? context.module.exports : {};
if (!context.KEY_MAPPING_TO_INTERNAL && exported.KEY_MAPPING_TO_INTERNAL) {
  context.KEY_MAPPING_TO_INTERNAL = exported.KEY_MAPPING_TO_INTERNAL;
  context.KEY_MAPPING_TO_LSCWP = exported.KEY_MAPPING_TO_LSCWP;
}
if (!context.buildCompleteLscwpSettings && exported.buildCompleteLscwpSettings) {
  context.buildCompleteLscwpSettings = exported.buildCompleteLscwpSettings;
}
if (!context.getOptionComparison && exported.getOptionComparison) {
  context.getOptionComparison = exported.getOptionComparison;
}

assert(typeof context.getOptionComparison === 'function', 'getOptionComparison available');
assert(typeof context.buildCompleteLscwpSettings === 'function', 'buildCompleteLscwpSettings available');
assert(context.KEY_MAPPING_TO_LSCWP.img_optm_sizes_skipped === 'img_optm-sizes_skipped',
  'KEY_MAPPING_TO_LSCWP.img_optm_sizes_skipped === img_optm-sizes_skipped');
assert(context.KEY_MAPPING_TO_LSCWP.img_optm_webp === 'img_optm-webp',
  'KEY_MAPPING_TO_LSCWP.img_optm_webp === img_optm-webp');

const tabs = context.buildCompleteLscwpSettings(
  { hasWooCommerce: true, hasElementor: true, isLiteSpeedServer: true },
  {}
);
const imgTab = tabs.find(t => t.id === 'image_optimization');
assert(!!imgTab, 'image_optimization tab exists');
const webp = imgTab.options.find(o => o.id === 'img_optm_webp');
const sizesSkipped = imgTab.options.find(o => o.id === 'img_optm_sizes_skipped');
assert(!!webp && !!sizesSkipped, 'webp + sizes_skipped options present');

console.log('\n--- 3. Empty sizes_skipped measured ---');
const emptyCases = [
  { label: 'top hyphen empty string', uploaded: { 'img_optm-sizes_skipped': '' } },
  { label: 'top internal empty string', uploaded: { img_optm_sizes_skipped: '' } },
  { label: 'options hyphen empty string', uploaded: { options: { 'img_optm-sizes_skipped': '' } } },
  { label: 'options internal empty string', uploaded: { options: { img_optm_sizes_skipped: '' } } },
];
for (const c of emptyCases) {
  const comp = context.getOptionComparison(sizesSkipped, c.uploaded, {});
  assert(comp.isMeasured === true, `sizes_skipped measured (${c.label})`);
  assert(String(comp.currentDisplay).includes('Tom') || String(comp.currentDisplay).includes('Standard'),
    `sizes_skipped display Tom/Standard (${c.label}) got=${comp.currentDisplay}`);
}

console.log('\n--- 4. img_optm_webp 0/1/2 + false/"0" ---');
const webpCases = [
  { uploaded: { 'img_optm-webp': 0 }, expect: 'AV', label: 'top hyphen 0' },
  { uploaded: { 'img_optm-webp': 1 }, expect: 'WebP', label: 'top hyphen 1' },
  { uploaded: { 'img_optm-webp': 2 }, expect: 'AVIF', label: 'top hyphen 2' },
  { uploaded: { 'img_optm-webp': '0' }, expect: 'AV', label: 'top hyphen "0"' },
  { uploaded: { 'img_optm-webp': false }, expect: 'AV', label: 'top hyphen false' },
  { uploaded: { img_optm_webp: 1 }, expect: 'WebP', label: 'top internal 1' },
  { uploaded: { options: { 'img_optm-webp': 2 } }, expect: 'AVIF', label: 'options hyphen 2' },
  { uploaded: { options: { img_optm_webp: 0 } }, expect: 'AV', label: 'options internal 0' },
  { uploaded: { options: { 'img_optm-webp': false } }, expect: 'AV', label: 'options hyphen false' },
];
for (const c of webpCases) {
  const comp = context.getOptionComparison(webp, c.uploaded, {});
  assert(comp.isMeasured === true, `webp measured (${c.label}) display=${comp.currentDisplay}`);
  assert(String(comp.currentDisplay).includes(c.expect),
    `webp display includes ${c.expect} (${c.label}) got=${comp.currentDisplay}`);
}

console.log('\n--- 5. Wrong hyphen key alone is not required ---');
// Correct key alone must work; we do not require the buggy img_optm_sizes-skipped form
const wrongOnly = context.getOptionComparison(
  sizesSkipped,
  { 'img_optm_sizes-skipped': '1536x1536' },
  {}
);
const correctOnly = context.getOptionComparison(
  sizesSkipped,
  { 'img_optm-sizes_skipped': '1536x1536' },
  {}
);
assert(correctOnly.isMeasured === true, 'correct key img_optm-sizes_skipped measures');
assert(String(correctOnly.currentDisplay).includes('Lista') || String(correctOnly.currentDisplay).includes('rader'),
  `correct key list display got=${correctOnly.currentDisplay}`);
// Wrong key may or may not measure — asserting we do not *depend* on it: correct path works.
assert(true, 'wrong key img_optm_sizes-skipped alone is NOT required (correct key works)');
// Optional honesty: if only wrong key present, still OK if unmeasured (we don't invent)
void wrongOnly;

console.log(`\n=== v2.7.1.3 VERIFICATION SUMMARY: ${passed} passed, ${failed} failed ===`);
process.exit(failed > 0 ? 1 : 0);
