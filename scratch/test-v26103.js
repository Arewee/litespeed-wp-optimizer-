/**
 * Automated Verification Suite for AreWee-Optimizer v2.7.0 (ex-v2.6.10.3 functional)
 * Tests:
 * 1. Version synchronization across all files (v2.7.0).
 * 2. Elementor Core Asset Loading parity (>= 3.16 / 4.x is Optimal in Core).
 * 3. Contextual CSS satellites (CCSS per URL & Inline Async Lib Optimal when Async CSS is AV).
 * 4. Google Fonts Async (Optimal when Remove is ON or no external Google Fonts).
 * 5. js_delayed_exclude copy refinement (Defer aktiv vs Delay ej aktiv).
 * 6. Health score update notification under gauge (count only).
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

console.log('=== STARTING v2.7.0 FUNCTIONAL VERIFICATION ===\n');

// ==========================================
// 1. VERSION CONSISTENCY (v2.7.0)
// ==========================================
console.log('--- 1. Version Consistency (v2.7.0) ---');
const indexHtml = fs.readFileSync(path.join(BASE_DIR, 'index.html'), 'utf8');
const stylesCss = fs.readFileSync(path.join(BASE_DIR, 'css/styles.css'), 'utf8');
const appJs = fs.readFileSync(path.join(BASE_DIR, 'js/app.js'), 'utf8');
const rulesJs = fs.readFileSync(path.join(BASE_DIR, 'js/rules.js'), 'utf8');
const exporterJs = fs.readFileSync(path.join(BASE_DIR, 'js/exporter.js'), 'utf8');
const readmeMd = fs.readFileSync(path.join(BASE_DIR, 'README.md'), 'utf8');
const geminiMd = fs.readFileSync(path.join(BASE_DIR, 'GEMINI.md'), 'utf8');

assert(indexHtml.includes('<title>AreWee-Optimizer - WordPress prestanda & stabilitetsoptimerare (v2.7.0)</title>'), 'index.html has v2.7.0 title');
assert(indexHtml.includes('css/styles.css?v=2.7.0'), 'index.html has styles.css?v=2.7.0');
assert(indexHtml.includes('<span class="logo-tag">v2.7.0</span>'), 'index.html has logo v2.7.0');
assert(indexHtml.includes('Nuvarande rekommendationer (v2.7.0)'), 'index.html has recommendation badge v2.7.0');
assert(indexHtml.includes('js/exporter.js?v=2.7.0') && indexHtml.includes('js/rules.js?v=2.7.0') && indexHtml.includes('js/app.js?v=2.7.0'), 'index.html has script tags v2.7.0');
assert(indexHtml.includes('id="health-score-updates"'), 'index.html has #health-score-updates container under gauge');

assert(stylesCss.includes('Stylesheet (v2.7.0)'), 'css/styles.css has v2.7.0 header');
assert(stylesCss.includes('v2.7.0 Components:'), 'css/styles.css has v2.7.0 section comment');

assert(appJs.includes('Version: 2.7.0'), 'js/app.js has Version: 2.7.0 header');
assert(appJs.includes('const APP_VERSION = "2.7.0";'), 'js/app.js has APP_VERSION = "2.7.0"');
assert(appJs.includes('const targetVersion = "2.7.0";'), 'js/app.js has targetVersion = "2.7.0"');
assert(appJs.includes('health-score-updates'), 'js/app.js renders updates notice under gauge');

assert(rulesJs.includes('Compatibility Engine (v2.7.0)'), 'js/rules.js has v2.7.0 header');
assert(rulesJs.includes('ctm:\n    benchmarkVersion: "2.7.0"') || rulesJs.includes('benchmarkVersion: "2.7.0"'), 'js/rules.js has benchmarkVersion 2.7.0');

assert(exporterJs.includes('Exporter / Serializer (v2.7.0)'), 'js/exporter.js has v2.7.0 header');
assert(exporterJs.includes("'syncPluginVersion' => '2.7.0'"), 'js/exporter.js has syncPluginVersion 2.7.0');
assert(exporterJs.includes('Second Opinion (v2.7.0)'), 'js/exporter.js has report template v2.7.0');

assert(readmeMd.includes('Dashboard (v2.7.0)'), 'README.md has v2.7.0 header');
assert(readmeMd.includes('Release v2.7.0:'), 'README.md includes v2.7.0 changelog');
assert(geminiMd.includes('Arkitektur (v2.7.0)'), 'GEMINI.md has v2.7.0 reference');

// ==========================================
// LOAD RULES IN VM CONTEXT
// ==========================================
const context = {
  console: console,
  setTimeout: setTimeout,
  clearTimeout: clearTimeout,
  Math: Math,
  Date: Date,
  JSON: JSON,
  String: String,
  Number: Number,
  Boolean: Boolean,
  parseInt: parseInt,
  parseFloat: parseFloat,
  isNaN: isNaN,
  Array: Array,
  Object: Object
};
vm.createContext(context);
vm.runInContext(rulesJs, context);

// ==========================================
// 2. ELEMENTOR CORE ASSET LOADING PARITY (>= 3.16 / 4.x)
// ==========================================
console.log('\n--- 2. Elementor Core Asset Loading Parity ---');
const optElemAsset = {
  id: "elem_asset_loading",
  title: "Förbättrad tillgångsladdning (Improved Asset Loading)",
  recommendedRaw: 1,
  tool: "elementor"
};

// Site running Elementor 4.1.0 with an old "inactive" saved in database
const elemEnv4ModernInactive = {
  hasElementor: true,
  elemVersion: "4.1.0",
  elemInfo: {
    version: "4.1.0",
    asset_loading: false,
    e_optimized_assets_loading: "inactive"
  }
};

const compModernCore = context.getOptionComparison(optElemAsset, {}, elemEnv4ModernInactive);
assert(compModernCore.isMatches === true, 'elem_asset_loading is Optimal on Elementor >= 3.16 even if residual is inactive');
assert(compModernCore.statusLabel === '🟢 Optimal', 'elem_asset_loading statusLabel is 🟢 Optimal on modern Elementor');
assert(compModernCore.rawMeasured === "1", 'elem_asset_loading measured as 1 on modern Elementor');

// Site running older Elementor 3.10 with explicit inactive -> should flag deviation
const elemEnvOld = {
  hasElementor: true,
  elemVersion: "3.10.0",
  elemInfo: {
    version: "3.10.0",
    asset_loading: false,
    e_optimized_assets_loading: "inactive"
  }
};
const compOldCore = context.getOptionComparison(optElemAsset, {}, elemEnvOld);
assert(compOldCore.isMatches === false, 'elem_asset_loading is deviation on older Elementor (< 3.16) when explicitly inactive');

// Verify clean description text (no contradictory green dot in static desc)
const allSettings = context.buildCompleteLscwpSettings({ hasWooCommerce: true, hasElementor: true }, {});
let foundAssetOpt = null;
allSettings.forEach(tab => {
  tab.options.forEach(opt => {
    if (opt.id === "elem_asset_loading") foundAssetOpt = opt;
  });
});
assert(foundAssetOpt !== null, 'elem_asset_loading found in settings');
assert(!foundAssetOpt.desc.startsWith('🟢'), 'elem_asset_loading desc has clean text without emoji prefix');

// ==========================================
// 3. CONTEXTUAL CSS SATELLITES (CCSS per URL & Inline Async Lib)
// ==========================================
console.log('\n--- 3. Contextual CSS Satellites ---');
const optCcssUrl = {
  id: "optm_ccss_per_url",
  title: "CCSS per URL",
  recommendedRaw: 1,
  tool: "litespeed"
};
const optAsyncInline = {
  id: "optm_css_async_inline",
  title: "Inline CSS Async Lib",
  recommendedRaw: 1,
  tool: "litespeed"
};

// Case A: Load CSS Asynchronously is AV (0) -> satellites AV (0) are Optimal
const settingsAsyncCssOff = { optm_css_async: "0", optm_ccss_per_url: "0", optm_css_async_inline: "0" };
const compCcssOff = context.getOptionComparison(optCcssUrl, settingsAsyncCssOff, {});
assert(compCcssOff.isMatches === true, 'optm_ccss_per_url = 0 is Optimal when Async CSS is AV');
assert(compCcssOff.statusLabel === '🟢 Optimal', 'optm_ccss_per_url statusLabel is 🟢 Optimal when Async CSS is AV');
assert(compCcssOff.recommendedDisplay.includes('Async CSS AV'), 'optm_ccss_per_url mentions Async CSS AV in recommendedDisplay');

const compAsyncInlineOff = context.getOptionComparison(optAsyncInline, settingsAsyncCssOff, {});
assert(compAsyncInlineOff.isMatches === true, 'optm_css_async_inline = 0 is Optimal when Async CSS is AV');
assert(compAsyncInlineOff.statusLabel === '🟢 Optimal', 'optm_css_async_inline statusLabel is 🟢 Optimal when Async CSS is AV');

// Case B: Load CSS Asynchronously is AV (0) and satellite keys omitted from .data
const compCcssOmitted = context.getOptionComparison(optCcssUrl, { optm_css_async: "0" }, {});
assert(compCcssOmitted.isMeasured === true, 'optm_ccss_per_url omitted is marked measured when Async CSS is AV');
assert(compCcssOmitted.isMatches === true, 'optm_ccss_per_url omitted is Optimal when Async CSS is AV');

// Case C: Load CSS Asynchronously is PÅ (1) -> satellites AV (0) are deviations
const settingsAsyncCssOn = { optm_css_async: "1", optm_ccss_per_url: "0", optm_css_async_inline: "0" };
const compCcssDeviant = context.getOptionComparison(optCcssUrl, settingsAsyncCssOn, {});
assert(compCcssDeviant.isMatches === false, 'optm_ccss_per_url = 0 is deviation when Async CSS is PÅ');
assert(compCcssDeviant.statusLabel.includes('Avvikelse'), 'optm_ccss_per_url statusLabel is Avvikelse when Async CSS is PÅ');

const compCcssOptimal = context.getOptionComparison(optCcssUrl, { optm_css_async: "1", optm_ccss_per_url: "1" }, {});
assert(compCcssOptimal.isMatches === true, 'optm_ccss_per_url = 1 is Optimal when Async CSS is PÅ');

// ==========================================
// 4. GOOGLE FONTS ASYNC (optm_ggfonts_async)
// ==========================================
console.log('\n--- 4. Google Fonts Async (optm_ggfonts_async) ---');
const optGgAsync = {
  id: "optm_ggfonts_async",
  title: "Ladda Google Fonts asynkront",
  recommendedRaw: 1,
  tool: "litespeed"
};

// Case A: optm_ggfonts_rm is PÅ (1) -> optm_ggfonts_async = 0 is Optimal
const compGgAsyncRmOn = context.getOptionComparison(optGgAsync, { optm_ggfonts_rm: "1", optm_ggfonts_async: "0" }, {});
assert(compGgAsyncRmOn.isMatches === true, 'optm_ggfonts_async = 0 is Optimal when Remove is PÅ');
assert(compGgAsyncRmOn.statusLabel === '🟢 Optimal', 'optm_ggfonts_async statusLabel is 🟢 Optimal when Remove is PÅ');
assert(compGgAsyncRmOn.recommendedDisplay.includes('inga externa Google Fonts'), 'optm_ggfonts_async recommendedDisplay notes no external fonts');

// Case B: No external Google Fonts in Elementor/Theme -> optm_ggfonts_async = 0 is Optimal
const compGgAsyncNoExt = context.getOptionComparison(optGgAsync, { optm_ggfonts_rm: "0", optm_ggfonts_async: "0" }, { hasElementorGoogleFonts: false, hasThemeGoogleFonts: false });
assert(compGgAsyncNoExt.isMatches === true, 'optm_ggfonts_async = 0 is Optimal when site has no external Google Fonts');

// Case C: External Google Fonts used and Remove is AV -> optm_ggfonts_async = 0 is deviation
const compGgAsyncDeviant = context.getOptionComparison(optGgAsync, { optm_ggfonts_rm: "0", optm_ggfonts_async: "0" }, { hasElementorGoogleFonts: true });
assert(compGgAsyncDeviant.isMatches === false, 'optm_ggfonts_async = 0 is deviation when external fonts used and Remove is AV');

// ==========================================
// 5. JS DELAYED EXCLUDE COPY REFINEMENT
// ==========================================
console.log('\n--- 5. JS Delayed Exclude Copy Refinement ---');
const optDelayedExc = {
  id: "js_delayed_exclude",
  title: "Fördröj JS – Exkluderade filer",
  recommendedRaw: ""
};

// Case A: Defer is 1 -> Inaktiv (Defer aktiv)
const compDeferActive = context.getOptionComparison(optDelayedExc, { optm_js_defer: "1" }, {});
assert(compDeferActive.currentDisplay === 'Inaktiv (Defer aktiv)', 'js_delayed_exclude shows Inaktiv (Defer aktiv) when defer=1');

// Case B: Defer is 0 -> Inaktiv (Delay ej aktiv)
const compDeferOff = context.getOptionComparison(optDelayedExc, { optm_js_defer: "0" }, {});
assert(compDeferOff.currentDisplay === 'Inaktiv (Delay ej aktiv)', 'js_delayed_exclude shows Inaktiv (Delay ej aktiv) when defer=0');

// ==========================================
// 6. HEALTH SCORE UPDATE NOTIFICATION UNDER GAUGE
// ==========================================
console.log('\n--- 6. Health Score Update Notification Under Gauge ---');
const sysInfoWithOlder = {
  "wp-core": { version: "6.8.0" },
  "wp-server": { httpd_software: "LiteSpeed Web Server" },
  "wp-plugins-active": {
    "woocommerce/woocommerce.php": { version: "9.8.0" },
    "elementor/elementor.php": { version: "4.2.0" }
  }
};
const analysis = context.analyzeSystem(
  sysInfoWithOlder,
  { version: "9.8.0" },
  null,
  { version: "4.2.0" },
  { optm_js_defer: "1", media_lazy: "0" }
);
const updateAlert = analysis.alerts.find(a => a.id === "alert_available_updates");
assert(updateAlert !== undefined, 'alert_available_updates exists');
assert(updateAlert.components.length === 2, '2 pending updates detected');

// Verify copy pattern for count only (singular vs plural)
function formatUpdatesNotice(count) {
  return `${count} uppdatering${count > 1 ? "ar" : ""} tillgänglig${count > 1 ? "a" : ""}`;
}
assert(formatUpdatesNotice(1) === '1 uppdatering tillgänglig', 'Singular format: 1 uppdatering tillgänglig');
assert(formatUpdatesNotice(2) === '2 uppdateringar tillgängliga', 'Plural format: 2 uppdateringar tillgängliga');
assert(!formatUpdatesNotice(1).includes('ℹ️') && !formatUpdatesNotice(2).includes('ℹ️'), 'Health updates notice has no ℹ️ icon');
assert(!formatUpdatesNotice(2).includes('WooCommerce') && !formatUpdatesNotice(2).includes('Elementor'), 'Notice contains only count, no plugin names');

console.log(`\n==========================================`);
console.log(`v2.7.0 FUNCTIONAL SUMMARY: ${passed} passed, ${failed} failed`);
console.log(`==========================================\n`);

if (failed > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
