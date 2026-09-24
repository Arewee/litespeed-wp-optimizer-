/**
 * Automated Verification Suite for AreWee-Optimizer v2.7.1.1
 * - img_optm_webp_attr / img_optm_sizes_skipped: NOT isTextarea; Policy / scoreImpact 0
 * - Health updates notice: no ℹ️ icon
 * - Version string 2.7.1.1
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

console.log('=== STARTING v2.7.1.1 BEHAVIOR + v2.7.1.2 VERSION VERIFICATION ===\n');

const indexHtml = fs.readFileSync(path.join(BASE_DIR, 'index.html'), 'utf8');
const appJs = fs.readFileSync(path.join(BASE_DIR, 'js/app.js'), 'utf8');
const rulesJs = fs.readFileSync(path.join(BASE_DIR, 'js/rules.js'), 'utf8');
const exporterJs = fs.readFileSync(path.join(BASE_DIR, 'js/exporter.js'), 'utf8');
const stylesCss = fs.readFileSync(path.join(BASE_DIR, 'css/styles.css'), 'utf8');
const readmeMd = fs.readFileSync(path.join(BASE_DIR, 'README.md'), 'utf8');
const geminiMd = fs.readFileSync(path.join(BASE_DIR, 'GEMINI.md'), 'utf8');

console.log('--- 1. Version Consistency (current = v2.7.1.2) ---');
assert(indexHtml.includes('(v2.7.1.2)'), 'index.html mentions v2.7.1.2');
assert(indexHtml.includes('?v=2.7.1.2'), 'index.html cache-bust ?v=2.7.1.2');
assert(appJs.includes('const APP_VERSION = "2.7.1.2"'), 'app.js APP_VERSION = 2.7.1.2');
assert(appJs.includes('targetVersion = "2.7.1.2"'), 'app.js targetVersion = 2.7.1.2');
assert(rulesJs.includes('Compatibility Engine (v2.7.1.2)'), 'rules.js header v2.7.1.2');
assert(exporterJs.includes('Exporter / Serializer (v2.7.1.2)'), 'exporter.js header v2.7.1.2');
assert(exporterJs.includes("'syncPluginVersion' => '2.7.1.2'"), 'exporter.js syncPluginVersion 2.7.1.2');
assert(stylesCss.includes('Stylesheet (v2.7.1.2)'), 'styles.css header v2.7.1.2');
assert(readmeMd.includes('Dashboard (v2.7.1.2)'), 'README.md header v2.7.1.2');
assert(readmeMd.includes('Release v2.7.1.1:'), 'README.md has v2.7.1.1 changelog');
assert(geminiMd.includes('Arkitektur (v2.7.1.2)'), 'GEMINI.md Arkitektur v2.7.1.2');

console.log('\n--- 2. isTextarea removals (static source) ---');
const isTaAssign = rulesJs.match(/const isTextarea = ([^;]+);/);
assert(!!isTaAssign, 'found isTextarea assignment');
assert(!isTaAssign[1].includes('img_optm_sizes_skipped') && !isTaAssign[1].includes('img_optm_webp_attr'),
  'rules.js isTextarea excludes img_optm_sizes_skipped & img_optm_webp_attr');
const makeOptTa = rulesJs.match(/isTextarea:\s*\(([^)]+)\)/);
assert(!!makeOptTa, 'found makeOpt isTextarea');
assert(!makeOptTa[1].includes('img_optm_sizes_skipped') && !makeOptTa[1].includes('img_optm_webp_attr'),
  'makeOpt isTextarea excludes img_optm_sizes_skipped & img_optm_webp_attr');

const fieldMatches = [...appJs.matchAll(/const isTextareaField = ([^;]+);/g)];
assert(fieldMatches.length >= 2, `app.js has isTextareaField defs (got ${fieldMatches.length})`);
fieldMatches.forEach((m, i) => {
  assert(!m[1].includes('img_optm_sizes_skipped') && !m[1].includes('img_optm_webp_attr'),
    `app.js isTextareaField[${i}] excludes img_optm policy lists`);
});

console.log('\n--- 3. Health updates notice without ℹ️ ---');
assert(appJs.includes('updatesEl.textContent = `${count} uppdatering'), 'app.js updatesEl has no ℹ️ prefix');
assert(!appJs.includes('updatesEl.textContent = `ℹ️ ${count}'), 'app.js updatesEl does not use ℹ️');
function formatUpdatesNotice(count) {
  return `${count} uppdatering${count > 1 ? "ar" : ""} tillgänglig${count > 1 ? "a" : ""}`;
}
assert(formatUpdatesNotice(1) === '1 uppdatering tillgänglig', 'Singular: 1 uppdatering tillgänglig');
assert(formatUpdatesNotice(2) === '2 uppdateringar tillgängliga', 'Plural: 2 uppdateringar tillgängliga');
assert(!formatUpdatesNotice(2).includes('ℹ️'), 'formatUpdatesNotice has no ℹ️');

console.log('\n--- 4. Impact Policy path in app.js ---');
assert(appJs.includes('Påverkan av Score: Policy / 0 p'), 'app.js has Policy / 0 p impact label');
const policyChecks = (appJs.match(/opt\.scoreImpact === 0 \|\| opt\.readOnly \|\| \(comp && comp\.isPolicyContext\)/g) || []).length;
assert(policyChecks >= 2, `scoreImpact/Policy checked before criticalLevel on both paths (got ${policyChecks})`);

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

console.log('\n--- 5. Structure: isTextarea !== true, scoreImpact 0 ---');
const tabs = context.buildCompleteLscwpSettings(
  { hasWooCommerce: true, hasElementor: true, isLiteSpeedServer: true },
  { media_lazy: '0', 'img_optm-webp': '1', 'img_optm-webp_attr': 'src\ndata-src', 'img_optm-sizes_skipped': '1536x1536' }
);
const imgTab = tabs.find(t => t.id === 'image_optimization');
assert(!!imgTab, 'image_optimization tab exists');
const webpAttr = imgTab.options.find(o => o.id === 'img_optm_webp_attr');
const sizesSkipped = imgTab.options.find(o => o.id === 'img_optm_sizes_skipped');
const webp = imgTab.options.find(o => o.id === 'img_optm_webp');
assert(!!webpAttr && !!sizesSkipped && !!webp, 'webp / webp_attr / sizes_skipped present');
assert(webpAttr.isTextarea !== true, 'structure: img_optm_webp_attr isTextarea !== true');
assert(sizesSkipped.isTextarea !== true, 'structure: img_optm_sizes_skipped isTextarea !== true');
assert(webpAttr.scoreImpact === 0, 'structure: img_optm_webp_attr scoreImpact === 0');
assert(sizesSkipped.scoreImpact === 0, 'structure: img_optm_sizes_skipped scoreImpact === 0');
assert(webp.scoreImpact === 0, 'structure: img_optm_webp scoreImpact === 0');

console.log('\n--- 6. Comparison: Policy soft + list display + options lookup ---');
const uploaded = {
  'img_optm-webp': 1,
  'img_optm-webp_attr': 'src\ndata-src\ndata-lazy-src',
  'img_optm-sizes_skipped': '1536x1536\n2048x2048'
};
const compAttr = context.getOptionComparison(webpAttr, uploaded, {});
const compSizes = context.getOptionComparison(sizesSkipped, uploaded, {});
const compWebpOpts = context.getOptionComparison(webp, { options: { 'img_optm-webp': 1 } }, {});
const compWebpTop = context.getOptionComparison(webp, { 'img_optm-webp': 1 }, {});

assert(compAttr.isTextarea !== true, 'comparison: webp_attr isTextarea !== true');
assert(compSizes.isTextarea !== true, 'comparison: sizes_skipped isTextarea !== true');
assert(compAttr.isMatches === true, 'comparison: webp_attr isMatches (policy)');
assert(compSizes.isMatches === true, 'comparison: sizes_skipped isMatches (policy)');
assert(compAttr.isPolicyContext === true, 'comparison: webp_attr isPolicyContext');
assert(compSizes.isPolicyContext === true, 'comparison: sizes_skipped isPolicyContext');
assert(String(compAttr.currentDisplay).includes('Lista') || String(compAttr.currentDisplay).includes('rader'),
  `comparison: webp_attr list display (got ${compAttr.currentDisplay})`);
assert(String(compSizes.currentDisplay).includes('Lista') || String(compSizes.currentDisplay).includes('rader'),
  `comparison: sizes_skipped list display (got ${compSizes.currentDisplay})`);
assert(compWebpTop.isMeasured === true, `img_optm_webp measured from top-level hyphen key (display=${compWebpTop.currentDisplay})`);
assert(compWebpOpts.isMeasured === true, `img_optm_webp measured from options.img_optm-webp (display=${compWebpOpts.currentDisplay})`);

console.log(`\n=== v2.7.1.1 VERIFICATION SUMMARY: ${passed} passed, ${failed} failed ===`);
process.exit(failed > 0 ? 1 : 0);
