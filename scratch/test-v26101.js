/**
 * AreWee-Optimizer v2.6.10.1 verification suite
 * Run: node scratch/test-v26101.js
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

console.log('=== STARTING v2.6.10.1 VERIFICATION SUITE ===\n');

// Read files
const indexHtml = fs.readFileSync(path.join(BASE_DIR, 'index.html'), 'utf8');
const stylesCss = fs.readFileSync(path.join(BASE_DIR, 'css/styles.css'), 'utf8');
const appJs = fs.readFileSync(path.join(BASE_DIR, 'js/app.js'), 'utf8');
const rulesJs = fs.readFileSync(path.join(BASE_DIR, 'js/rules.js'), 'utf8');
const exporterJs = fs.readFileSync(path.join(BASE_DIR, 'js/exporter.js'), 'utf8');
const readmeMd = fs.readFileSync(path.join(BASE_DIR, 'README.md'), 'utf8');
const geminiMd = fs.readFileSync(path.join(BASE_DIR, 'GEMINI.md'), 'utf8');

// ==========================================
// 1. VERSION CONSISTENCY CHECKS
// ==========================================
console.log('--- 1. Version Consistency (v2.6.10.1) ---');
assert(indexHtml.includes('(v2.6.10.1)') && indexHtml.includes('css/styles.css?v=2.6.10.1') && indexHtml.includes('js/app.js?v=2.6.10.1') && indexHtml.includes('js/rules.js?v=2.6.10.1') && indexHtml.includes('js/exporter.js?v=2.6.10.1'), 'index.html has v2.6.10.1 title and cache-bust tags');
assert(stylesCss.includes('(v2.6.10.1)'), 'css/styles.css has v2.6.10.1 header');
assert(appJs.includes('Version: 2.6.10.1') && appJs.includes('targetVersion = "2.6.10.1"') && appJs.includes('APP_VERSION = "2.6.10.1"'), 'js/app.js has v2.6.10.1 header, targetVersion, APP_VERSION');
assert(rulesJs.includes('v2.6.10.1') && rulesJs.includes('benchmarkVersion: "2.6.10.1"'), 'js/rules.js has v2.6.10.1 header and benchmark versions');
assert(exporterJs.includes('(v2.6.10.1)') && exporterJs.includes("'syncPluginVersion' => '2.6.10.1'"), 'js/exporter.js has v2.6.10.1 header and sync plugin version');
assert(readmeMd.includes('(v2.6.10.1)'), 'README.md has v2.6.10.1 header');
assert(geminiMd.includes('(v2.6.10.1)'), 'GEMINI.md has v2.6.10.1 reference');
assert(appJs.includes('a.scoreImpact === 0'), 'js/app.js honors scoreImpact === 0 in health deduction');

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

assert(typeof ctx.getOptionComparison === 'function', 'getOptionComparison available in VM');
assert(typeof ctx.buildCompleteLscwpSettings === 'function', 'buildCompleteLscwpSettings available in VM');
assert(typeof ctx.analyzeSystem === 'function', 'analyzeSystem available in VM');

// ==========================================
// 2. JS DEFER VS DELAY EXCLUSIONS
// ==========================================
console.log('\n--- 2. JS Defer vs Delay Exclusions ---');
const dummyEnv = {
  hasWooCommerce: true,
  hasElementor: true,
  hasWordfence: true,
  hasSCM: true,
  hasCTM: true,
  isLiteSpeedServer: true,
  elemVersion: '4.1.0'
};

const optJsDelayed = {
  id: 'js_delayed_exclude',
  title: 'Fördröj JS - Exkluderade filer',
  desc: 'Exkluderade filer',
  tool: 'litespeed',
  isTextarea: true,
  recommendedRaw: 'jquery\nctm\ngtm'
};

// Case 2a: Defer is active (optm_js_defer = 1) -> js_delayed_exclude is Inactive (Defer active)
const settingsWithDefer = {
  optm_js_defer: '1',
  js_delayed_exclude: ''
};
const compDefer = ctx.getOptionComparison(optJsDelayed, settingsWithDefer, dummyEnv);
assert(compDefer.isMatches === true, 'compDefer is marked as matches (optimal) when Defer is active');
assert(compDefer.currentDisplay.includes('Inaktiv (Defer aktiv)'), 'compDefer shows Inaktiv (Defer aktiv)');
assert(compDefer.missing && compDefer.missing.length === 0, 'compDefer reports 0 missing items');

// Case 2b: Delay is active (optm_js_defer = 2) with empty exclusions -> Deviation!
const settingsWithDelay = {
  optm_js_defer: '2',
  js_delayed_exclude: 'custom-foo'
};
const compDelay = ctx.getOptionComparison(optJsDelayed, settingsWithDelay, dummyEnv);
assert(compDelay.isMatches === false, 'compDelay flags deviation when Delay is active without required exclusions');
assert(compDelay.missing && compDelay.missing.length > 0, 'compDelay reports missing items when Delay is active');

// ==========================================
// 3. MEDIA LAZY LOAD VS WP NATIVE LAZY
// ==========================================
console.log('\n--- 3. Media Lazy Load (WP Native vs LiteSpeed) ---');
const optMediaLazyExc = {
  id: 'media_lazy_exc',
  title: 'Exkludera logotyp & Hero-bild från Lazy Load',
  desc: 'Undanta ovanför mitten',
  tool: 'litespeed',
  isTextarea: true,
  recommendedRaw: 'logo\nhero'
};

// Case 3a: LiteSpeed Lazy is OFF (media_lazy = 0) -> media_lazy_exc is Soft N/A
const settingsLazyOff = {
  media_lazy: '0',
  media_lazy_exc: 'custom-logo'
};
const compLazyOff = ctx.getOptionComparison(optMediaLazyExc, settingsLazyOff, dummyEnv);
assert(compLazyOff.isMatches === true, 'compLazyOff is marked as matches when LiteSpeed media_lazy is 0');
assert(compLazyOff.currentDisplay.includes('Inaktiv (WP Native aktiv / LSCWP Lazy AV)'), 'compLazyOff shows Inaktiv message');
assert(compLazyOff.missing && compLazyOff.missing.length === 0, 'compLazyOff reports 0 missing items');

// Case 3b: LiteSpeed Lazy is ON (media_lazy = 1) with missing exclusions -> Deviation!
const settingsLazyOn = {
  media_lazy: '1',
  media_lazy_exc: 'other-image'
};
const compLazyOn = ctx.getOptionComparison(optMediaLazyExc, settingsLazyOn, dummyEnv);
assert(compLazyOn.isMatches === false, 'compLazyOn flags deviation when media_lazy is 1 without exclusions');
assert(compLazyOn.missing && compLazyOn.missing.length > 0, 'compLazyOn reports missing items when media_lazy is 1');

// ==========================================
// 4. ELEMENTOR CORE >= 3.16 / 4.X BASELINE
// ==========================================
console.log('\n--- 4. Elementor Core Modern Baseline ---');
const optElemAsset = {
  id: 'elem_asset_loading',
  title: 'Förbättrad tillgångsladdning (Improved Asset Loading)',
  recommendedRaw: '1',
  tool: 'elementor'
};
const optElemCss = {
  id: 'elem_css_loading',
  title: 'Förbättrad CSS-inläsning (Improved CSS Loading)',
  recommendedRaw: '1',
  tool: 'elementor'
};

// Modern Elementor 4.1.0 where experiments are no longer listed (missing / default)
const elemEnvModern = {
  hasElementor: true,
  elemVersion: '4.1.0',
  elemInfo: {
    version: '4.1.0',
    experiments: []
  }
};

const compElemAsset = ctx.getOptionComparison(optElemAsset, {}, elemEnvModern);
assert(compElemAsset.isMatches === true, 'elem_asset_loading is Optimal in Elementor 4.1.0');
assert(compElemAsset.statusLabel.includes('Optimal'), 'elem_asset_loading shows Optimal status');

const compElemCss = ctx.getOptionComparison(optElemCss, {}, elemEnvModern);
assert(compElemCss.isMatches === true, 'elem_css_loading is Optimal in Elementor 4.1.0');
assert(compElemCss.statusLabel.includes('Optimal'), 'elem_css_loading shows Optimal status');

// Explicitly off (boolean false) on modern core → NOT Optimal (deviation)
const elemEnvOff = {
  hasElementor: true,
  elemVersion: '4.1.0',
  elemInfo: {
    version: '4.1.0',
    asset_loading: false,
    css_loading: false,
    experiments: []
  }
};
const compElemAssetOff = ctx.getOptionComparison(optElemAsset, {}, elemEnvOff);
assert(compElemAssetOff.isMatches !== true, 'elem_asset_loading is NOT Optimal when asset_loading=false on ≥3.16');
assert(compElemAssetOff.isDeviant === true || String(compElemAssetOff.rawMeasured) === '0', 'elem_asset_loading measured as off when asset_loading=false');

const compElemCssOff = ctx.getOptionComparison(optElemCss, {}, elemEnvOff);
assert(compElemCssOff.isMatches !== true, 'elem_css_loading is NOT Optimal when css_loading=false on ≥3.16');

// null / absent on modern core → Optimal (unchanged)
const elemEnvNull = {
  hasElementor: true,
  elemVersion: '3.16.0',
  elemInfo: {
    version: '3.16.0',
    asset_loading: null,
    css_loading: null,
    experiments: []
  }
};
const compElemAssetNull = ctx.getOptionComparison(optElemAsset, {}, elemEnvNull);
assert(compElemAssetNull.isMatches === true, 'elem_asset_loading is Optimal when asset_loading=null on ≥3.16');
const compElemCssNull = ctx.getOptionComparison(optElemCss, {}, elemEnvNull);
assert(compElemCssNull.isMatches === true, 'elem_css_loading is Optimal when css_loading=null on ≥3.16');

// ==========================================
// 5. SCM RAW HTML/JS RECLASSIFICATION
// ==========================================
console.log('\n--- 5. SCM Raw HTML/JS Reclassification ---');
const rawHtmlSnippetCode = `
add_action('wp_head', function() {
  echo '<script>console.log("hello world");</script>';
  echo '<style>.test { color: red; }</style>';
});
`;

const scmMock = {
  snippets: [
    { title: 'My Inline Script', code: rawHtmlSnippetCode }
  ]
};

const analysisWithScm = ctx.analyzeSystem(
  {}, // sysInfo
  null, // wooInfo
  null, // wfInfo
  null, // elemInfo
  {}, // uploadedSettings
  scmMock, // scmInfo
  "", // customCss
  null, // themeInfo
  null // serverConfigFiles
);

const echoAlert = (analysisWithScm.customCodeAlerts || []).find(a => a.title.includes('Rå HTML/JS'));
assert(echoAlert !== undefined, 'SCM raw HTML/JS alert is generated');
assert(echoAlert && echoAlert.type === 'info', 'SCM raw HTML/JS alert is classified as info (advisory), not warning');
assert(echoAlert && echoAlert.title.includes('SCM Kodkvalitet'), 'SCM alert title highlights code quality');
assert(echoAlert && echoAlert.scoreImpact === 0, 'SCM raw HTML/JS alert has scoreImpact: 0');

// Simulate health deduction: scoreImpact 0 must add 0 (info alone would otherwise deduct 2)
function simulateAlertDeduction(a) {
  const isDanger = a.type === 'danger';
  const isWarning = a.type === 'warning';
  return (a.scoreImpact === 0) ? 0 : (isDanger ? 18 : (isWarning ? 7 : 2));
}
assert(simulateAlertDeduction(echoAlert) === 0, 'SCM echo alert contributes 0 points to health deduction');
assert(simulateAlertDeduction({ type: 'info' }) === 2, 'Default info alert without scoreImpact still deducts 2');

// ==========================================
// 6. NEW SETTINGS CARDS & 1:1 PARITY
// ==========================================
console.log('\n--- 6. Expanded LiteSpeed Settings Cards ---');
const recTabs = ctx.buildCompleteLscwpSettings(dummyEnv, {}, null, null, null);
const allRecOptions = [];
recTabs.forEach(t => t.options.forEach(o => allRecOptions.push(o)));

const findOpt = (id) => allRecOptions.find(o => o.id === id);

assert(findOpt('optm_ucss') !== undefined, 'optm_ucss card is registered');
assert(findOpt('optm_ucss').recommendedRaw === 0 || findOpt('optm_ucss').recommendedRaw === '0', 'optm_ucss recommendation is AV (0)');

assert(findOpt('optm_ucss_inline') !== undefined, 'optm_ucss_inline card is registered');
assert(findOpt('optm_ucss_inline').recommendedRaw === 0 || findOpt('optm_ucss_inline').recommendedRaw === '0', 'optm_ucss_inline recommendation is AV (0)');

assert(findOpt('optm_css_comb_ext_inl') !== undefined, 'optm_css_comb_ext_inl card is registered');
assert(findOpt('optm_css_comb_ext_inl').recommendedRaw === 0 || findOpt('optm_css_comb_ext_inl').recommendedRaw === '0', 'optm_css_comb_ext_inl recommendation is AV (0)');

assert(findOpt('optm_js_comb_ext_inl') !== undefined, 'optm_js_comb_ext_inl card is registered');
assert(findOpt('optm_js_comb_ext_inl').recommendedRaw === 0 || findOpt('optm_js_comb_ext_inl').recommendedRaw === '0', 'optm_js_comb_ext_inl recommendation is AV (0)');

assert(findOpt('optm_ccss_per_url') !== undefined, 'optm_ccss_per_url card is registered');
assert(findOpt('optm_ccss_per_url').recommendedRaw === 1 || findOpt('optm_ccss_per_url').recommendedRaw === '1', 'optm_ccss_per_url recommendation is PÅ (1)');

assert(findOpt('optm_css_async_inline') !== undefined, 'optm_css_async_inline card is registered');
assert(findOpt('optm_css_async_inline').recommendedRaw === 1 || findOpt('optm_css_async_inline').recommendedRaw === '1', 'optm_css_async_inline recommendation is PÅ (1)');

assert(findOpt('optm_ggfonts_async') !== undefined, 'optm_ggfonts_async card is registered');
assert(findOpt('optm_ggfonts_async').recommendedRaw === 1 || findOpt('optm_ggfonts_async').recommendedRaw === '1', 'optm_ggfonts_async recommendation is PÅ (1)');

assert(findOpt('optm_ggfonts_rm') !== undefined, 'optm_ggfonts_rm card is registered');
assert(findOpt('optm_ggfonts_rm').recommendedRaw === 0 || findOpt('optm_ggfonts_rm').recommendedRaw === '0', 'optm_ggfonts_rm recommendation is AV (0)');

assert(findOpt('media_vpi') !== undefined, 'media_vpi card is registered');
assert(findOpt('media_vpi').recommendedRaw === 1 || findOpt('media_vpi').recommendedRaw === '1', 'media_vpi recommendation is PÅ (1)');

assert(findOpt('optm_qs_rm') !== undefined, 'optm_qs_rm card is registered');
assert(findOpt('optm_qs_rm').recommendedRaw === 0 || findOpt('optm_qs_rm').recommendedRaw === '0', 'optm_qs_rm recommendation is AV (0)');

assert(findOpt('optm_dns_prefetch') !== undefined, 'optm_dns_prefetch card is registered');
assert(findOpt('optm_dns_prefetch').isTextarea === true, 'optm_dns_prefetch is configured as textarea');

// ==========================================
// 7. COCKPIT CSS STATUS LOGIC
// ==========================================
console.log('\n--- 7. Cockpit CSS Status Calculation ---');
// Case 7a: Combine is ON -> status in cockpitFunctions must be 'warning' (not optimal!)
const analysisComb = ctx.analyzeSystem({}, null, null, null, {
  optm_css_min: '1',
  optm_css_comb: '1'
});
const cssFuncComb = (analysisComb.cockpitFunctions || []).find(f => f.id === 'css_gen');
assert(cssFuncComb && cssFuncComb.status === 'warning', 'Cockpit CSS function flags combine as warning');
assert(cssFuncComb && cssFuncComb.statusText.includes('Kombinering aktiv'), 'Cockpit CSS statusText notes Kombinering aktiv');

// Case 7b: Minify is ON and Combine is OFF (Async AV) -> status is optimal
const analysisMin = ctx.analyzeSystem({}, null, null, null, {
  optm_css_min: '1',
  optm_css_comb: '0',
  optm_css_async: '0'
});
const cssFuncMin = (analysisMin.cockpitFunctions || []).find(f => f.id === 'css_gen');
assert(cssFuncMin && cssFuncMin.status === 'optimal', 'Cockpit CSS function is optimal when minified without combine');

// Case 7c: Async CSS ON + Combine AV + Minify ON -> warning (not optimal)
const analysisAsync = ctx.analyzeSystem({}, null, null, null, {
  optm_css_min: '1',
  optm_css_comb: '0',
  optm_css_async: '1'
});
const cssFuncAsync = (analysisAsync.cockpitFunctions || []).find(f => f.id === 'css_gen');
assert(cssFuncAsync && cssFuncAsync.status !== 'optimal', 'Cockpit CSS is NOT optimal when Async CSS is ON');
assert(cssFuncAsync && cssFuncAsync.status === 'warning', 'Cockpit CSS flags Async CSS as warning');
assert(cssFuncAsync && cssFuncAsync.statusText.includes('Async CSS aktiv'), 'Cockpit CSS statusText notes Async CSS aktiv (avråds)');

// ==========================================
// 8. SERIALIZER / EXPORTER ROUND-TRIP
// ==========================================
console.log('\n--- 8. Exporter & Serializer Round-trip ---');
const sampleSettingsToExport = {
  cache: '1',
  optm_ucss: '0',
  optm_css_comb_ext_inl: '0',
  optm_js_comb_ext_inl: '0',
  optm_dns_prefetch: '//fonts.googleapis.com\n//www.google-analytics.com'
};

const serializedData = ctx.php_serialize(sampleSettingsToExport);
assert(typeof serializedData === 'string' && serializedData.startsWith('a:'), 'php_serialize generates valid PHP serialized array');
const deserializedData = ctx.php_deserialize(serializedData);
assert(deserializedData.optm_ucss === '0' || deserializedData.optm_ucss === 0, 'Roundtrip deserialization restores optm_ucss');
assert(deserializedData.optm_css_comb_ext_inl === '0' || deserializedData.optm_css_comb_ext_inl === 0, 'Roundtrip deserialization restores optm_css_comb_ext_inl');
assert(deserializedData.optm_js_comb_ext_inl === '0' || deserializedData.optm_js_comb_ext_inl === 0, 'Roundtrip deserialization restores optm_js_comb_ext_inl');

// Check canonical export keys
const exportedCanonical = ctx.translateKeysToLscwp(sampleSettingsToExport);
assert(exportedCanonical.hasOwnProperty('optm-ucss') || exportedCanonical.hasOwnProperty('optm_ucss'), 'Canonical settings export contains UCSS key');
assert(exportedCanonical.hasOwnProperty('optm-css_comb_ext_inl') || exportedCanonical.hasOwnProperty('optm_css_comb_ext_inl'), 'Canonical settings export contains css_comb_ext_inl key');

// ==========================================
// 9. REAL FIXTURES INTEGRATION
// ==========================================
console.log('\n--- 9. Real Fixtures Verification ---');
const fixturePath = path.join(BASE_DIR, 'scratch/fixtures/maximeraprofil.se-wp-systemfil-260604.txt');
if (fs.existsSync(fixturePath)) {
  const fixtureContent = fs.readFileSync(fixturePath, 'utf8');
  assert(fixtureContent.length > 1000, 'maximeraprofil.se fixture read successfully');
  
  const sysInfoMock = {
    'wp-core': { version: '6.8' },
    'wp-server': { server_architecture: 'LiteSpeed/1.7.19', php_version: '8.3.14', php_memory_limit: '1024M' },
    'wp-constants': { WP_MEMORY_LIMIT: '512M', WP_MAX_MEMORY_LIMIT: '1024M' },
    'wp-plugins-active': {
      'litespeed-cache/litespeed-cache.php': { version: '7.9.1' },
      'woocommerce/woocommerce.php': { version: '9.8.0' },
      'elementor/elementor.php': { version: '4.1.0' }
    }
  };

  const elemInfoMock = {
    version: '4.1.0',
    css_print_method: 'external',
    experiments: []
  };

  const uploadedSettingsMock = {
    cache: '1',
    cache_priv: '1',
    media_lazy: '0',
    media_lazy_exc: '',
    optm_js_defer: '1',
    js_delayed_exclude: '',
    optm_css_min: '1',
    optm_css_comb: '0'
  };
  
  const analysis = ctx.analyzeSystem(
    sysInfoMock,
    { hpos_enabled: true },
    null,
    elemInfoMock,
    uploadedSettingsMock,
    null,
    "",
    { name: "Aktivt Tema", version: "1.0" },
    null
  );
  
  // Verify that media_lazy_exc does NOT create an alert or penalty
  const lazyAlert = (analysis.alerts || []).find(a => a.id === 'media_lazy_exc_missing');
  assert(!lazyAlert, 'No false media_lazy_exc alert when media_lazy is 0');
  
  // Verify that delayed exclude does NOT create an alert or penalty
  const delayAlert = (analysis.alerts || []).find(a => a.id === 'js_delayed_missing');
  assert(!delayAlert, 'No false js_delayed_missing alert when Defer is active');
  
  // Verify that Elementor core loading is optimal without alerts
  const elemAlert = (analysis.alerts || []).find(a => (a.id && a.id.includes('elem_asset_loading')) || (a.title && a.title.includes('Förbättrad tillgångsladdning')));
  assert(!elemAlert, 'No false Elementor asset loading alert on modern core');
} else {
  console.log('Skipping fixture test (file not found)');
}

console.log(`\n=== TEST RESULTS: ${passed} PASSED, ${failed} FAILED ===\n`);
if (failed > 0) {
  process.exit(1);
} else {
  console.log('All tests passed successfully! 🚀');
}
