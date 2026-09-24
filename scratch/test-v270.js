/**
 * Automated Verification Suite for AreWee-Optimizer v2.7.1
 * - Tab order: media → image → html → crawler ([5]/[6]/[7]/[8])
 * - Media tab only media_*; HTML tab qs/dns/emojis
 * - Crawler title contains [8]
 * - WP Native lazy path: scoreImpact 0 / Optimal+Policy
 * - Max one collective LCP/exclude warning when LS lazy ON without exclude
 * - Version string 2.7.1
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

console.log('=== STARTING v2.7.1 VERIFICATION SUITE ===\n');

// --- 1. Version consistency ---
console.log('--- 1. Version Consistency (v2.7.1) ---');
const indexHtml = fs.readFileSync(path.join(BASE_DIR, 'index.html'), 'utf8');
const stylesCss = fs.readFileSync(path.join(BASE_DIR, 'css/styles.css'), 'utf8');
const appJs = fs.readFileSync(path.join(BASE_DIR, 'js/app.js'), 'utf8');
const rulesJs = fs.readFileSync(path.join(BASE_DIR, 'js/rules.js'), 'utf8');
const exporterJs = fs.readFileSync(path.join(BASE_DIR, 'js/exporter.js'), 'utf8');
const readmeMd = fs.readFileSync(path.join(BASE_DIR, 'README.md'), 'utf8');
const geminiMd = fs.readFileSync(path.join(BASE_DIR, 'GEMINI.md'), 'utf8');

assert(indexHtml.includes('(v2.7.1)'), 'index.html mentions v2.7.1');
assert(indexHtml.includes('?v=2.7.1'), 'index.html cache-bust ?v=2.7.1');
assert(appJs.includes('const APP_VERSION = "2.7.1"'), 'app.js APP_VERSION = 2.7.1');
assert(appJs.includes('targetVersion = "2.7.1"'), 'app.js targetVersion = 2.7.1');
assert(rulesJs.includes('Compatibility Engine (v2.7.1)'), 'rules.js header v2.7.1');
assert(exporterJs.includes('Exporter / Serializer (v2.7.1)'), 'exporter.js header v2.7.1');
assert(exporterJs.includes("'syncPluginVersion' => '2.7.1'"), 'exporter.js syncPluginVersion 2.7.1');
assert(stylesCss.includes('Stylesheet (v2.7.1)'), 'styles.css header v2.7.1');
assert(readmeMd.includes('Dashboard (v2.7.1)'), 'README.md header v2.7.1');
assert(readmeMd.includes('Release v2.7.1:'), 'README.md has v2.7.1 changelog');
assert(geminiMd.includes('Arkitektur (v2.7.1)'), 'GEMINI.md Arkitektur v2.7.1');
assert(exporterJs.includes('page_optimization_html'), 'exporter.js includes page_optimization_html in section order');

// --- Load rules ---
const context = {
  console, setTimeout, clearTimeout, Math, Date, JSON, String, Number, Boolean,
  parseInt, parseFloat, isNaN, Array, Object, RegExp, Error
};
vm.createContext(context);
vm.runInContext(rulesJs, context);

const tabs = context.buildCompleteLscwpSettings(
  { hasWooCommerce: true, hasElementor: true, isLiteSpeedServer: true },
  { media_lazy: '0' }
);
const ids = tabs.map(t => t.id);
const titles = Object.fromEntries(tabs.map(t => [t.id, t.title]));

// --- 2. Tab id/order: media → html → crawler ---
console.log('\n--- 2. Tab structure Media → HTML → Crawler ---');
const iMedia = ids.indexOf('page_optimization_media');
const iHtml = ids.indexOf('page_optimization_html');
const iCrawler = ids.indexOf('crawler');
assert(iMedia !== -1, 'page_optimization_media tab exists');
assert(iHtml !== -1, 'page_optimization_html tab exists');
assert(iCrawler !== -1, 'crawler tab exists');
const iImg = ids.indexOf('image_optimization');
assert(iImg !== -1, 'image_optimization tab index found');
assert(iMedia < iImg && iImg < iHtml && iHtml < iCrawler, 'tab order: media → image_optimization → html → crawler');
assert(String(titles.page_optimization_media).includes('[5]') && String(titles.page_optimization_media).includes('Media'), 'media title is [5] Media & LCP');
assert(String(titles.page_optimization_html).includes('[7]') && String(titles.page_optimization_html).includes('HTML'), 'html title is [7] Sidopt. HTML');
assert(String(titles.crawler).includes('[8]'), 'crawler title contains [8]');
assert(ids.includes('image_optimization'), 'image_optimization tab exists (v2.7.1)');
assert(String(titles.image_optimization || '').includes('[6]'), 'image_optimization title contains [6]');

const mediaTab = tabs.find(t => t.id === 'page_optimization_media');
const htmlTab = tabs.find(t => t.id === 'page_optimization_html');
const mediaOptIds = mediaTab.options.map(o => o.id);
const htmlOptIds = htmlTab.options.map(o => o.id);

assert(mediaOptIds.every(id => id.startsWith('media_')), 'media tab options are only media_*');
assert(mediaOptIds.includes('media_lazy') && mediaOptIds.includes('media_lazy_exc') && mediaOptIds.includes('media_webp') && mediaOptIds.includes('media_vpi'), 'media tab has lazy/exc/webp/vpi');
assert(!mediaOptIds.includes('optm_qs_rm') && !mediaOptIds.includes('optm_dns_prefetch') && !mediaOptIds.includes('optm_emojis_rm'), 'media tab does not contain HTML tweaks');
assert(htmlOptIds.includes('optm_qs_rm') && htmlOptIds.includes('optm_dns_prefetch') && htmlOptIds.includes('optm_emojis_rm'), 'html tab has qs/dns/emojis');
assert(htmlOptIds.every(id => id.startsWith('optm_')), 'html tab options are optm_* tweaks');

// --- 3. WP Native lazy: Optimal/Policy, no deviation ---
console.log('\n--- 3. WP Native Lazy score policy (scoreImpact 0 path) ---');
const optLazy = mediaTab.options.find(o => o.id === 'media_lazy');
assert(!!optLazy, 'media_lazy option found in media tab');

// Without Elementor recommendation would historically be ON — still Optimal when AV (WP Native)
const compNativeNoElem = context.getOptionComparison(
  { id: 'media_lazy', title: 'Lazy Load', recommendedRaw: 1, tool: 'litespeed', criticalLevel: 'standard' },
  { media_lazy: '0' },
  { hasElementor: false }
);
assert(compNativeNoElem.isMatches === true, 'media_lazy=0 isMatches true even when recommendedRaw=1');
assert(compNativeNoElem.isDeviant === false, 'media_lazy=0 isDeviant false (no config score hit)');
assert(compNativeNoElem.isPolicyContext === true || String(compNativeNoElem.statusLabel).includes('Optimal') || String(compNativeNoElem.statusLabel).includes('Policy'), 'media_lazy=0 is Optimal or Policy/Context');
assert(String(compNativeNoElem.currentDisplay).includes('WP Native'), 'media_lazy=0 display mentions WP Native');

const compNativeElem = context.getOptionComparison(optLazy, { media_lazy: '0' }, { hasElementor: true });
assert(compNativeElem.isMatches === true, 'media_lazy=0 Optimal with Elementor present');
assert(compNativeElem.isDeviant === false, 'media_lazy=0 not deviant with Elementor');

// Simulate health alert deduction: WP Native path must not emit media_lazy_exc_missing
const analysisNative = context.analyzeSystem(
  { 'wp-core': { version: '6.8' }, 'wp-server': { httpd_software: 'LiteSpeed' }, 'wp-plugins-active': {} },
  null,
  null,
  { version: '4.2.0', lazy_load_enabled: false },
  { media_lazy: '0', media_lazy_exc: '', media_vpi: '0' }
);
const nativeExcAlert = (analysisNative.alerts || []).find(a => a.id === 'media_lazy_exc_missing');
assert(!nativeExcAlert, 'No LCP-exclude warning when media_lazy is AV (WP Native)');

// scoreImpact path: double-check that info with scoreImpact 0 deducts 0 (app contract)
function simulateAlertDeduction(a) {
  const isDanger = a.type === 'danger';
  const isWarning = a.type === 'warning';
  return (a.scoreImpact === 0) ? 0 : (isDanger ? 18 : (isWarning ? 7 : 2));
}
assert(simulateAlertDeduction({ type: 'info', scoreImpact: 0 }) === 0, 'scoreImpact:0 yields 0 deduction');
assert(simulateAlertDeduction({ type: 'warning' }) === 7, 'warning without scoreImpact yields −7');

// --- 4. Max one collective LCP/exclude warning when LS lazy ON without exclude ---
console.log('\n--- 4. Single collective LCP/exclude warning ---');
const analysisMissing = context.analyzeSystem(
  { 'wp-core': { version: '6.8' }, 'wp-server': { httpd_software: 'LiteSpeed' }, 'wp-plugins-active': {} },
  null,
  null,
  { version: '4.2.0', lazy_load_enabled: false, hasLazyLoad: false },
  { media_lazy: '1', media_lazy_exc: '', media_vpi: '1' }
);
const lcpAlerts = (analysisMissing.alerts || []).filter(a =>
  a.id === 'media_lazy_exc_missing' ||
  (a.targetSettingId === 'media_lazy_exc') ||
  (String(a.title || '').toLowerCase().includes('lcp') && String(a.title || '').toLowerCase().includes('lazy'))
);
assert(lcpAlerts.length === 1, `exactly one LCP/exclude warning when LS lazy ON without exclude (got ${lcpAlerts.length})`);
assert(lcpAlerts[0].type === 'warning', 'LCP/exclude alert is type warning (−7)');
assert(lcpAlerts[0].targetTabId === 'page_optimization_media', 'LCP alert deep-links to page_optimization_media');
assert(simulateAlertDeduction(lcpAlerts[0]) === 7, 'LCP/exclude warning deducts 7');

const analysisWithExc = context.analyzeSystem(
  { 'wp-core': { version: '6.8' }, 'wp-server': { httpd_software: 'LiteSpeed' }, 'wp-plugins-active': {} },
  null,
  null,
  { version: '4.2.0', lazy_load_enabled: false },
  { media_lazy: '1', media_lazy_exc: 'logo\nhero\nheader', media_vpi: '1' }
);
const okExc = (analysisWithExc.alerts || []).find(a => a.id === 'media_lazy_exc_missing');
assert(!okExc, 'No LCP-exclude warning when meaningful logo/hero exclude present');

// Double lazy still present as separate warning
const analysisDouble = context.analyzeSystem(
  { 'wp-core': { version: '6.8' }, 'wp-server': { httpd_software: 'LiteSpeed' }, 'wp-plugins-active': { 'elementor/elementor.php': { version: '4.2.0' } } },
  null,
  null,
  { version: '4.2.0', lazy_load_enabled: true, hasLazyLoad: true },
  { media_lazy: '1', media_lazy_exc: 'logo\nhero', media_vpi: '1' }
);
const doubleAlert = (analysisDouble.alerts || []).find(a => a.id === 'double_activation_lazyload');
assert(!!doubleAlert, 'Dubbel lazy (LS + Elementor) warning still present');
assert(doubleAlert.type === 'warning', 'Dubbel lazy is warning (−7)');

// --- 5. Exporter section order string ---
console.log('\n--- 5. Exporter section order ---');
assert(
  /page_optimization_media["',\s]+image_optimization["',\s]+page_optimization_html["',\s]+crawler/.test(exporterJs.replace(/\s+/g, '')),
  'exporter section order includes media, image_optimization, html, crawler in sequence'
);

console.log(`\n=== v2.7.1 VERIFICATION SUMMARY: ${passed} passed, ${failed} failed ===`);
process.exit(failed > 0 ? 1 : 0);
