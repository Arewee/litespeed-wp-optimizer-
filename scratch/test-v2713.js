/**
 * Automated Verification Suite for AreWee-Optimizer v2.7.1.3
 * - media_webp measured via img_optm-webp when HTML key absent → Next-Gen text
 * - media_webp 1 + img_optm → PÅ HTML
 * - media_webp 0 only → AV
 * - neither key → unmeasured
 * - real Downloads .data file
 * - APP_VERSION 2.7.1.3
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
assert(rulesJs.includes('6c. media_webp'), 'rules.js has 6c media_webp Next-Gen fallback');
assert(exporterJs.includes('Exporter / Serializer (v2.7.1.3)'), 'exporter.js header v2.7.1.3');
assert(exporterJs.includes("'syncPluginVersion' => '2.7.1.3'"), 'exporter.js syncPluginVersion 2.7.1.3');
assert(stylesCss.includes('Stylesheet (v2.7.1.3)'), 'styles.css header v2.7.1.3');
assert(readmeMd.includes('Dashboard (v2.7.1.3)'), 'README.md header v2.7.1.3');
assert(readmeMd.includes('Release v2.7.1.3:'), 'README.md has v2.7.1.3 changelog');
assert(geminiMd.includes('Arkitektur (v2.7.1.3)'), 'GEMINI.md Arkitektur v2.7.1.3');

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
if (!context.parseSettingsFile && exported.parseSettingsFile) {
  context.parseSettingsFile = exported.parseSettingsFile;
}

assert(typeof context.getOptionComparison === 'function', 'getOptionComparison available');
assert(typeof context.buildCompleteLscwpSettings === 'function', 'buildCompleteLscwpSettings available');
assert(typeof context.parseSettingsFile === 'function', 'parseSettingsFile available');

const tabs = context.buildCompleteLscwpSettings(
  { hasWooCommerce: true, hasElementor: true, isLiteSpeedServer: true },
  {}
);
let mediaWebpOpt = null;
let imgWebpOpt = null;
for (const t of tabs) {
  if (!t.options) continue;
  for (const o of t.options) {
    if (o.id === 'media_webp') mediaWebpOpt = o;
    if (o.id === 'img_optm_webp') imgWebpOpt = o;
  }
}
assert(!!mediaWebpOpt, 'media_webp option present');
assert(!!imgWebpOpt, 'img_optm_webp option present');

console.log('\n--- 2. Only img_optm-webp:1 → media_webp measured + Next-Gen ---');
{
  const uploaded = { 'img_optm-webp': 1 };
  const comp = context.getOptionComparison(mediaWebpOpt, uploaded, {});
  assert(comp.isMeasured === true, `only next-gen: isMeasured true (got ${comp.isMeasured})`);
  assert(String(comp.currentDisplay).includes('Next-Gen'),
    `only next-gen: display includes Next-Gen got=${comp.currentDisplay}`);
  assert(comp.isMatches === true, 'only next-gen: soft isMatches true');
}

console.log('\n--- 3. Both media_webp 1 and img_optm → PÅ HTML ---');
{
  const uploaded = { media_webp: 1, 'img_optm-webp': 1 };
  const comp = context.getOptionComparison(mediaWebpOpt, uploaded, {});
  assert(comp.isMeasured === true, 'both keys: isMeasured');
  assert(String(comp.currentDisplay).includes('PÅ') && String(comp.currentDisplay).toLowerCase().includes('html'),
    `both keys: PÅ HTML got=${comp.currentDisplay}`);
}

console.log('\n--- 4. media_webp 0 only → measured AV ---');
{
  const uploaded = { media_webp: 0 };
  const comp = context.getOptionComparison(mediaWebpOpt, uploaded, {});
  assert(comp.isMeasured === true, 'media_webp 0 only: isMeasured');
  assert(String(comp.currentDisplay) === 'AV' || String(comp.currentDisplay).startsWith('AV'),
    `media_webp 0 only: AV got=${comp.currentDisplay}`);
  assert(!String(comp.currentDisplay).includes('Next-Gen'),
    `media_webp 0 only: no Next-Gen text got=${comp.currentDisplay}`);
}

console.log('\n--- 5. Neither key → unmeasured ---');
{
  const uploaded = { 'media-lazy': 1, 'cache-priv': 1 };
  const comp = context.getOptionComparison(mediaWebpOpt, uploaded, {});
  assert(comp.isMeasured === false, `neither key: unmeasured got isMeasured=${comp.isMeasured} display=${comp.currentDisplay}`);
}

console.log('\n--- 6. Nested options img_optm-webp only ---');
{
  const uploaded = { options: { 'img_optm-webp': 2 } };
  const comp = context.getOptionComparison(mediaWebpOpt, uploaded, {});
  assert(comp.isMeasured === true, 'options nested next-gen: isMeasured');
  assert(String(comp.currentDisplay).includes('Next-Gen'),
    `options nested: Next-Gen got=${comp.currentDisplay}`);
}

console.log('\n--- 7. Real Downloads .data file ---');
const realPath = '/Users/richardviitanen/Downloads/LSCWP_cfg-www.roligakalsonger.se_-20260924_083028.data';
assert(fs.existsSync(realPath), 'real .data file exists');
if (fs.existsSync(realPath)) {
  const raw = fs.readFileSync(realPath, 'utf8');
  const parsed = context.parseSettingsFile(raw);
  assert(parsed && typeof parsed === 'object', 'parseSettingsFile returns object');
  const hasImg = !!(parsed['img_optm-webp'] !== undefined || parsed.img_optm_webp !== undefined
    || (parsed.options && (parsed.options['img_optm-webp'] !== undefined || parsed.options.img_optm_webp !== undefined)));
  const hasMedia = !!(parsed.media_webp !== undefined || parsed['media-webp'] !== undefined
    || (parsed.options && (parsed.options.media_webp !== undefined || parsed.options['media-webp'] !== undefined)));
  assert(hasImg === true, `real file has img_optm-webp (val=${parsed['img_optm-webp'] ?? parsed.img_optm_webp})`);
  assert(hasMedia === false, 'real file has NO media_webp key');

  const mediaComp = context.getOptionComparison(mediaWebpOpt, parsed, {});
  assert(mediaComp.isMeasured === true, `real: media_webp isMeasured got=${mediaComp.isMeasured}`);
  assert(String(mediaComp.currentDisplay).includes('Next-Gen'),
    `real: media_webp Next-Gen text got=${mediaComp.currentDisplay}`);

  const imgComp = context.getOptionComparison(imgWebpOpt, parsed, {});
  assert(imgComp.isMeasured === true, `real: img_optm_webp isMeasured`);
  assert(String(imgComp.currentDisplay).includes('WebP'),
    `real: img_optm_webp WebP (1) got=${imgComp.currentDisplay}`);
}

console.log('\n--- 8. APP_VERSION runtime ---');
assert(/const APP_VERSION = "2\.7\.1\.3"/.test(appJs), 'APP_VERSION source 2.7.1.3');

console.log(`\n=== v2.7.1.3 VERIFICATION SUMMARY: ${passed} passed, ${failed} failed ===`);
process.exit(failed > 0 ? 1 : 0);
