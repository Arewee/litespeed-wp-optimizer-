/**
 * AreWee-Optimizer v2.6.9 verification suite
 * Run: node scratch/test-v269.js
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

console.log('=== STARTING v2.6.9 VERIFICATION SUITE ===\n');

const indexHtml = fs.readFileSync(path.join(BASE_DIR, 'index.html'), 'utf8');
const stylesCss = fs.readFileSync(path.join(BASE_DIR, 'css/styles.css'), 'utf8');
const appJs = fs.readFileSync(path.join(BASE_DIR, 'js/app.js'), 'utf8');
const rulesJs = fs.readFileSync(path.join(BASE_DIR, 'js/rules.js'), 'utf8');
const exporterJs = fs.readFileSync(path.join(BASE_DIR, 'js/exporter.js'), 'utf8');
const readmeMd = fs.readFileSync(path.join(BASE_DIR, 'README.md'), 'utf8');
const geminiMd = fs.readFileSync(path.join(BASE_DIR, 'gemini.md'), 'utf8');

// A6 / version consistency
assert(indexHtml.includes('(v2.6.9)') && indexHtml.includes('css/styles.css?v=2.6.9') && indexHtml.includes('js/app.js?v=2.6.9'), 'index.html has v2.6.9 title and cache-bust');
assert(stylesCss.includes('(v2.6.9)'), 'css/styles.css has v2.6.9 header');
assert(appJs.includes('Version: 2.6.9') && appJs.includes('targetVersion = "2.6.9"') && appJs.includes('APP_VERSION = "2.6.9"'), 'js/app.js has v2.6.9 header, targetVersion, APP_VERSION');
assert(rulesJs.includes('v2.6.9') && rulesJs.includes('benchmarkVersion: "2.6.9"'), 'js/rules.js has v2.6.9 header and benchmark versions');
assert(exporterJs.includes('(v2.6.9)') && exporterJs.includes("'syncPluginVersion' => '2.6.9'"), 'js/exporter.js has v2.6.9 header and sync plugin version');
assert(readmeMd.includes('(v2.6.9)'), 'README.md has v2.6.9 header');
assert(geminiMd.includes('(v2.6.9)'), 'gemini.md has v2.6.9 reference');
assert(!indexHtml.includes('4.1.1'), 'index.html has no hardcoded Elementor v4.1.1');
assert(appJs.includes('Never invent Optimal via recommendedRaw'), 'P0 seed bug fixed: no recommendedRaw seeding when unmeasured');
assert(rulesJs.includes('Do NOT invent measurements from LSCWP_NATIVE_DEFAULTS'), 'P0: native defaults no longer false-measure');
assert(rulesJs.includes('optm_html_min') && exporterJs.includes('optm_html_min'), 'optm_html_min present in rules + exporter');
assert(rulesJs.includes('Online Media Masters') && rulesJs.includes('policy/context'), 'cache_priv honest policy/context copy + OMM cite');
assert(rulesJs.includes('Inbyggd i Core'), 'Elementor modern baseline Inbyggd i Core');
assert(appJs.includes('appVersion: APP_VERSION') && appJs.includes('history-card-appver') && appJs.includes('AreWee-app version'), 'appVersion persisted + history badge + A-vs-B row');
assert(fs.existsSync(path.join(BASE_DIR, 'scratch/fixtures/2you.se-wp-systemfil-260604.txt')), 'fixtures moved to scratch/fixtures/');
assert(!fs.existsSync(path.join(BASE_DIR, '2you.se-wp-systemfil-260604.txt')), 'root sample txt removed');
assert(fs.readFileSync(path.join(BASE_DIR, '.gitignore'), 'utf8').includes('!scratch/fixtures/'), '.gitignore allows scratch/fixtures');

// Load rules + exporter in VM
const domMock = {
  window: {
    location: { href: 'http://localhost' },
    sessionStorage: { store: {}, getItem(k) { return this.store[k] || null; }, setItem(k, v) { this.store[k] = String(v); }, removeItem(k) { delete this.store[k]; } }
  },
  document: {
    getElementById: () => ({ textContent: '', innerHTML: '', value: '', classList: { add() {}, remove() {}, contains() { return false; } }, style: {}, addEventListener() {} }),
    querySelector: () => null,
    querySelectorAll: () => [],
    addEventListener() {}
  },
  console,
  TextEncoder: global.TextEncoder,
  atob: (s) => Buffer.from(s, 'base64').toString('binary'),
  btoa: (s) => Buffer.from(s, 'binary').toString('base64')
};
domMock.window.document = domMock.document;
const ctx = vm.createContext(domMock);
vm.runInContext(rulesJs, ctx);
vm.runInContext(exporterJs, ctx);

assert(typeof ctx.getOptionComparison === 'function', 'getOptionComparison available');
assert(typeof ctx.looksLikeLscwpJsonTuples === 'function', 'looksLikeLscwpJsonTuples available');
assert(typeof ctx.isValidLscwpSettingsObject === 'function', 'isValidLscwpSettingsObject available');
assert(typeof ctx.parseSettingsFile === 'function', 'parseSettingsFile available');
assert(typeof ctx.analyzeSystem === 'function', 'analyzeSystem available');

// --- A1: JSON tuple detect ---
const tupleSample = [
  '["_version","7.9.1"]',
  '["cache","1"]',
  '["cache-priv","1"]',
  '["media-lazy_exc",["logo","hero"]]',
  '["optm-css_min","1"]',
  '["optm-html_min","1"]'
].join('\n');

assert(ctx.looksLikeLscwpJsonTuples(tupleSample) === true, 'JSON tuple detect: line-delimited LSCWP 7.x tuples');
assert(ctx.looksLikeLscwpJsonTuples('hello world') === false, 'JSON tuple detect: rejects plain text');

const parsedTuples = ctx.parseSettingsFile(tupleSample);
assert(parsedTuples && (parsedTuples.cache === '1' || parsedTuples.cache === 1), 'parseSettingsFile parses JSON tuples (cache)');
assert(parsedTuples.optm_html_min === '1' || parsedTuples.optm_html_min === 1 || parsedTuples['optm-html_min'] === '1', 'parseSettingsFile maps optm-html_min');
assert(ctx.isValidLscwpSettingsObject(parsedTuples) === true, 'two-layer validation accepts parsed tuples');
assert(ctx.isValidLscwpSettingsObject({ foo: 'bar' }) === false, 'two-layer validation rejects unrelated object');

// Source-level: detectPastedFormat includes tuple hooks
assert(appJs.includes('looksLikeLscwpJsonTuples') || appJs.includes('["_version"'), 'detectPastedFormat wired for JSON tuples');
assert(appJs.includes('Layer 2: validate') || appJs.includes('isValidLscwpSettingsObject'), 'route/process has two-layer validation');

// Load detectPastedFormat via app.js in a fuller mock
const listeners = {};
const appCtx = {
  window: {
    location: { href: 'http://localhost' },
    sessionStorage: domMock.window.sessionStorage,
    localStorage: { store: {}, getItem(k) { return this.store[k] || null; }, setItem(k, v) { this.store[k] = String(v); }, removeItem(k) { delete this.store[k]; } },
    addEventListener(type, fn) { (listeners[type] = listeners[type] || []).push(fn); },
    APP_VERSION: undefined,
    detectPastedFormat: undefined,
    looksLikeLscwpJsonTuples: ctx.looksLikeLscwpJsonTuples,
    isValidLscwpSettingsObject: ctx.isValidLscwpSettingsObject,
    parseSettingsFile: ctx.parseSettingsFile,
    getOptionComparison: ctx.getOptionComparison,
    analyzeSystem: ctx.analyzeSystem,
    BENCHMARK_VERSIONS: ctx.BENCHMARK_VERSIONS
  },
  document: {
    readyState: 'complete',
    body: { appendChild() {}, removeChild() {} },
    createElement: () => ({
      style: {}, classList: { add() {}, remove() {}, contains() { return false; } },
      addEventListener() {}, appendChild() {}, setAttribute() {}, dataset: {},
      textContent: '', innerHTML: '', value: '', click() {}
    }),
    getElementById: (id) => ({
      id, textContent: '', innerHTML: '', value: '',
      classList: { add() {}, remove() {}, contains() { return false; } },
      style: { display: '' }, addEventListener() {}, appendChild() {},
      querySelector: () => null, querySelectorAll: () => [],
      dataset: {}
    }),
    querySelector: () => null,
    querySelectorAll: () => [],
    addEventListener(type, fn) {
      if (type === 'DOMContentLoaded') fn();
      (listeners[type] = listeners[type] || []).push(fn);
    }
  },
  console,
  alert() {},
  confirm() { return false; },
  prompt() { return null; },
  TextEncoder: global.TextEncoder,
  URL: global.URL,
  Blob: global.Blob,
  ResizeObserver: class { observe() {} disconnect() {} },
  atob: domMock.atob,
  btoa: domMock.btoa,
  setTimeout,
  clearTimeout,
  parseSettingsFile: ctx.parseSettingsFile,
  looksLikeLscwpJsonTuples: ctx.looksLikeLscwpJsonTuples,
  isValidLscwpSettingsObject: ctx.isValidLscwpSettingsObject,
  getOptionComparison: ctx.getOptionComparison,
  analyzeSystem: ctx.analyzeSystem,
  BENCHMARK_VERSIONS: ctx.BENCHMARK_VERSIONS,
  php_serialize: ctx.php_serialize,
  generateSecondOpinionMarkdown: ctx.generateSecondOpinionMarkdown,
  generateSyncPluginPhp: ctx.generateSyncPluginPhp
};
appCtx.window.document = appCtx.document;
appCtx.window.ResizeObserver = appCtx.ResizeObserver;
// Bare globals used by app.js
appCtx.sessionStorage = appCtx.window.sessionStorage;
appCtx.localStorage = appCtx.window.localStorage;
appCtx.HTMLElement = class {};
appCtx.Node = class {};
appCtx.Event = class {};
appCtx.CustomEvent = class { constructor(t) { this.type = t; } };
appCtx.FileReader = class { readAsText() {} };
appCtx.navigator = { userAgent: 'node' };
const appVm = vm.createContext(appCtx);
try {
  vm.runInContext(appJs, appVm);
} catch (e) {
  console.error('app.js VM load error (non-fatal for some tests):', e.message);
}

assert(typeof appCtx.window.detectPastedFormat === 'function', 'detectPastedFormat exported on window');
if (typeof appCtx.window.detectPastedFormat === 'function') {
  assert(appCtx.window.detectPastedFormat(tupleSample) === 'settings', 'detectPastedFormat returns settings for JSON tuples');
  assert(appCtx.window.detectPastedFormat('### wp-core ###\nversion: 6.8') === 'sysinfo', 'detectPastedFormat still routes sysinfo');
}

// --- B1: missing measurement ≠ Optimal ---
const unmeasured = ctx.getOptionComparison(
  { id: 'optm_css_min', title: 'CSS Min', recommendedRaw: 1, tool: 'litespeed' },
  null,
  {}
);
assert(unmeasured.isMeasured === false, 'unmeasured option: isMeasured false');
assert(unmeasured.status === 'unmeasured' || unmeasured.statusLabel.includes('Ej'), 'unmeasured option: not Optimal status');
assert(unmeasured.statusLabel !== '🟢 Optimal', 'unmeasured option: statusLabel is not Optimal');

const partialSettings = { cache: '1' }; // no optm_css_min key
const missingKey = ctx.getOptionComparison(
  { id: 'optm_css_min', title: 'CSS Min', recommendedRaw: 1, tool: 'litespeed' },
  partialSettings,
  {}
);
assert(missingKey.isMeasured === false, 'missing key in .data stays unmeasured (not native-default Optimal)');
assert(missingKey.statusLabel !== '🟢 Optimal', 'missing key ≠ Optimal label');

// Elementor must not be measured from LSCWP .data alone
const elemFromData = ctx.getOptionComparison(
  { id: 'elem_dom_optimization', title: 'DOM', recommendedRaw: 1, tool: 'elementor' },
  { cache: '1', optm_css_min: '1' },
  {}
);
assert(elemFromData.isMeasured === false, 'Elementor DOM not measured from LSCWP .data alone');

// --- B2: Elementor Active DOM ⇒ no false warning ---
const elemInfoActive = {
  version: '4.2.0',
  dom_optimization: true,
  e_dom_optimization: 'active',
  experiments: ['e_dom_optimization'],
  css_print_method: 'external',
  asset_loading: true,
  css_loading: true
};
const analysisDom = ctx.analyzeSystem(null, null, null, elemInfoActive, null, null, '', null);
const domWarn = (analysisDom.alerts || []).filter(a =>
  (a.title || '').toLowerCase().includes('optimized dom') ||
  (a.title || '').toLowerCase().includes('dom-utmatning') ||
  (a.title || '').toLowerCase().includes('dom output')
);
assert(domWarn.length === 0, 'Elementor Active DOM ⇒ no false Optimized DOM warning');

const domComp = ctx.getOptionComparison(
  { id: 'elem_dom_optimization', title: 'DOM', recommendedRaw: 1, tool: 'elementor' },
  { cache: '1' },
  analysisDom.environment
);
assert(domComp.isMeasured === true && (domComp.rawMeasured === '1' || domComp.rawMeasured === 1), 'DOM Active measured as ON from Slot 5 env');
assert(domComp.isMatches === true, 'DOM Active matches recommended');

// Modern baseline: css/asset loading Optimal/built-in for 4.x without experiment text
const elemMinimal = { version: '4.2.0', css_print_method: 'external', experiments: [] };
const envModern = ctx.analyzeSystem(null, null, null, elemMinimal, null, null, '', null).environment;
const cssLoad = ctx.getOptionComparison(
  { id: 'elem_css_loading', title: 'CSS Load', recommendedRaw: 1, tool: 'elementor' },
  null,
  envModern
);
const assetLoad = ctx.getOptionComparison(
  { id: 'elem_asset_loading', title: 'Asset Load', recommendedRaw: 1, tool: 'elementor' },
  null,
  envModern
);
assert(cssLoad.isMeasured && cssLoad.isMatches, 'elem_css_loading Optimal/built-in for Elementor 4.x');
assert(assetLoad.isMeasured && assetLoad.isMatches, 'elem_asset_loading Optimal/built-in for Elementor 4.x');

// --- B6: outdated templates without "out of date" ⇒ no false outdated ---
const wooCleanOverrides = {
  overrides: [
    'woocommerce/cart/cart.php',
    'woocommerce/checkout/form-checkout.php version 8.0'
  ],
  gateways: [],
  hpos: true
};
const analysisTpl = ctx.analyzeSystem(
  { 'wp-active-theme': { name: 'Astra' }, 'wp-plugins-active': {} },
  wooCleanOverrides,
  null,
  null, // no Elementor so template check runs
  null, null, '', null
);
const outdatedAlerts = (analysisTpl.alerts || []).filter(a =>
  a.id === 'alert_outdated_theme_templates' ||
  (a.title || '').toLowerCase().includes('föråldrade')
);
assert(outdatedAlerts.length === 0, 'overrides without "out of date" ⇒ no false outdated alert');

const outdatedComp = ctx.getOptionComparison(
  { id: 'theme_outdated_template_overrides', title: 'Outdated', recommendedRaw: 0, tool: 'theme' },
  null,
  analysisTpl.environment
);
assert(outdatedComp.isMeasured === true && String(outdatedComp.rawMeasured) === '0', 'theme_outdated count is 0 without outdated markers');
assert(outdatedComp.isMatches === true, 'theme_outdated matches recommended 0');

const wooOutdated = {
  overrides: ['woocommerce/cart/cart.php version 7.0 — out of date'],
  gateways: []
};
const analysisOut = ctx.analyzeSystem(
  { 'wp-active-theme': { name: 'Astra' }, 'wp-plugins-active': {} },
  wooOutdated, null, null, null, null, '', null
);
const realOutdated = (analysisOut.alerts || []).filter(a => a.id === 'alert_outdated_theme_templates');
assert(realOutdated.length === 1, 'explicit "out of date" still raises outdated alert');

// cache_priv policy when site type unknown
const privComp = ctx.getOptionComparison(
  { id: 'cache_priv', title: 'Priv', recommendedRaw: 1, tool: 'litespeed' },
  { cache_priv: '0' },
  {}
);
assert(privComp.isMeasured === true, 'cache_priv measured from settings');
assert(privComp.isMatches === true || privComp.isPolicyContext === true || (privComp.statusLabel || '').includes('Policy'), 'cache_priv OFF with unknown site type is policy/context not hard deviation');

// XSS helper exists
assert(appJs.includes('function escapeHtml'), 'escapeHtml helper present');
assert(appJs.includes('escapeHtml(env.theme)'), 'theme details use escapeHtml');

console.log(`\n=== TEST SUITE COMPLETED: ${passed} passed, ${failed} failed ===`);
if (failed > 0) process.exit(1);
process.exit(0);
