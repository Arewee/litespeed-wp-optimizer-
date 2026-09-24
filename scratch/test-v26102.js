/**
 * AreWee-Optimizer v2.6.10.2 verification suite
 * Run: node scratch/test-v26102.js
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

console.log('=== STARTING v2.6.10.2 VERIFICATION SUITE ===\n');

// Read files
const indexHtml = fs.readFileSync(path.join(BASE_DIR, 'index.html'), 'utf8');
const stylesCss = fs.readFileSync(path.join(BASE_DIR, 'css/styles.css'), 'utf8');
const appJs = fs.readFileSync(path.join(BASE_DIR, 'js/app.js'), 'utf8');
const rulesJs = fs.readFileSync(path.join(BASE_DIR, 'js/rules.js'), 'utf8');
const exporterJs = fs.readFileSync(path.join(BASE_DIR, 'js/exporter.js'), 'utf8');
const readmeMd = fs.readFileSync(path.join(BASE_DIR, 'README.md'), 'utf8');
const geminiMd = fs.readFileSync(path.join(BASE_DIR, 'GEMINI.md'), 'utf8');

// ==========================================
// 1. VERSION CONSISTENCY CHECKS (v2.6.10.2)
// ==========================================
console.log('--- 1. Version Consistency (v2.6.10.2) ---');
assert(indexHtml.includes('(v2.6.10.2)') && indexHtml.includes('css/styles.css?v=2.6.10.2') && indexHtml.includes('js/app.js?v=2.6.10.2') && indexHtml.includes('js/rules.js?v=2.6.10.2') && indexHtml.includes('js/exporter.js?v=2.6.10.2'), 'index.html has v2.6.10.2 title, tags and cache-bust tags');
assert(stylesCss.includes('(v2.6.10.2)'), 'css/styles.css has v2.6.10.2 header');
assert(appJs.includes('Version: 2.6.10.2') && appJs.includes('targetVersion = "2.6.10.2"') && appJs.includes('APP_VERSION = "2.6.10.2"'), 'js/app.js has v2.6.10.2 header, targetVersion, APP_VERSION');
assert(rulesJs.includes('v2.6.10.2') && rulesJs.includes('benchmarkVersion: "2.6.10.2"'), 'js/rules.js has v2.6.10.2 header and benchmark versions');
assert(exporterJs.includes('(v2.6.10.2)') && exporterJs.includes("'syncPluginVersion' => '2.6.10.2'"), 'js/exporter.js has v2.6.10.2 header and sync plugin version');
assert(readmeMd.includes('(v2.6.10.2)'), 'README.md has v2.6.10.2 header');
assert(geminiMd.includes('(v2.6.10.2)'), 'GEMINI.md has v2.6.10.2 reference');

// ==========================================
// 2. LOAD SCRIPT CONTEXT IN VM
// ==========================================
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
  TextDecoder: global.TextDecoder
};
domMock.window.document = domMock.document;
const context = vm.createContext(domMock);

vm.runInContext(rulesJs, context);
vm.runInContext(exporterJs, context);

// ==========================================
// 3. GOOGLE FONTS (optm_ggfonts_rm) AS POLICY/CONTEXT
// ==========================================
console.log('\n--- 2. Google Fonts Remove (optm_ggfonts_rm) Policy/Context ---');
const optGgFonts = {
  id: "optm_ggfonts_rm",
  title: "Ta bort Google Fonts",
  recommended: "AV (0)",
  recommendedRaw: 0,
  desc: "Ta bort Google Fonts helt..."
};

// Site has optm_ggfonts_rm = 1 (PÅ)
const compGgFontsOn = context.getOptionComparison(optGgFonts, { optm_ggfonts_rm: "1" }, {});
assert(compGgFontsOn.isPolicyContext === true, 'optm_ggfonts_rm = 1 sets isPolicyContext = true');
assert(compGgFontsOn.isMatches === true, 'optm_ggfonts_rm = 1 sets isMatches = true (0 deduction)');
assert(compGgFontsOn.statusLabel.includes('Policy/Context'), 'optm_ggfonts_rm = 1 statusLabel indicates Policy/Context');

// Site has optm_ggfonts_rm = 0 (AV)
const compGgFontsOff = context.getOptionComparison(optGgFonts, { optm_ggfonts_rm: "0" }, {});
assert(compGgFontsOff.isPolicyContext === true, 'optm_ggfonts_rm = 0 is marked as Policy/Context');
assert(compGgFontsOff.isMatches === true, 'optm_ggfonts_rm = 0 is optimal/matches (0 deduction)');
assert(compGgFontsOff.statusLabel.includes('Policy/Context'), 'optm_ggfonts_rm = 0 statusLabel indicates Policy/Context');

// Check consensus sources for optm_ggfonts_rm and media_vpi in buildCompleteLscwpSettings
const allSettings = context.buildCompleteLscwpSettings({ hasWooCommerce: true, hasElementor: true }, { media_lazy: "0" });
let foundGgFonts = null;
let foundVpi = null;
allSettings.forEach(tab => {
  tab.options.forEach(opt => {
    if (opt.id === "optm_ggfonts_rm") foundGgFonts = opt;
    if (opt.id === "media_vpi") foundVpi = opt;
  });
});
assert(foundGgFonts !== null, 'optm_ggfonts_rm option exists in buildCompleteLscwpSettings');
assert(foundGgFonts.sources && foundGgFonts.sources.lsAdv && foundGgFonts.sources.oom && foundGgFonts.sources.domain, 'optm_ggfonts_rm has 3 consensus sources');
assert(foundGgFonts.sources.lsAdv.status === 'neutral', 'optm_ggfonts_rm has neutral consensus source for lsAdv');
assert(foundGgFonts.sources.oom.status === 'green', 'optm_ggfonts_rm has green consensus source for oom');
assert(foundGgFonts.sources.domain.status === 'green', 'optm_ggfonts_rm has green consensus source for domain');

// ==========================================
// 4. MEDIA VPI CONTEXT VS MEDIA LAZY
// ==========================================
console.log('\n--- 3. Media VPI Context vs LiteSpeed Lazyload ---');
const optVpi = {
  id: "media_vpi",
  title: "Generera VPI (Viewport Images)",
  recommended: "AV (0)",
  recommendedRaw: 0,
  desc: "Genererar viewport-bilder via QUIC.cloud..."
};

// Case A: LiteSpeed media_lazy is "0" (AV) -> media_vpi = "0" is Optimal (Inaktiv vid WP Native Lazy)
const compVpiLazyOff = context.getOptionComparison(optVpi, { media_lazy: "0", media_vpi: "0" }, {});
assert(compVpiLazyOff.isMatches === true, 'media_vpi = 0 with media_lazy = 0 isMatches is true');
assert(compVpiLazyOff.statusLabel === '🟢 Optimal', 'media_vpi = 0 with media_lazy = 0 statusLabel is 🟢 Optimal');
assert(compVpiLazyOff.recommendedDisplay.includes('WP Native Lazy'), 'media_vpi = 0 with media_lazy = 0 mentions WP Native Lazy in recommendedDisplay');

// Case B: LiteSpeed media_lazy is "0" (AV) and media_vpi is missing from .data
const compVpiMissingLazyOff = context.getOptionComparison(optVpi, { media_lazy: "0" }, {});
assert(compVpiMissingLazyOff.isMeasured === true, 'media_vpi missing with media_lazy = 0 is marked measured');
assert(compVpiMissingLazyOff.isMatches === true, 'media_vpi missing with media_lazy = 0 isMatches is true');

// Case C: LiteSpeed media_lazy is "1" (PÅ) -> media_vpi = "1" is Optimal (PÅ)
const compVpiLazyOn = context.getOptionComparison(optVpi, { media_lazy: "1", media_vpi: "1" }, {});
assert(compVpiLazyOn.isMatches === true, 'media_vpi = 1 with media_lazy = 1 isMatches is true');
assert(compVpiLazyOn.statusLabel === '🟢 Optimal', 'media_vpi = 1 with media_lazy = 1 statusLabel is 🟢 Optimal');

// Case D: LiteSpeed media_lazy is "1" (PÅ) -> media_vpi = "0" is Deviation (🟡 Avvikelse)
const compVpiDeviant = context.getOptionComparison(optVpi, { media_lazy: "1", media_vpi: "0" }, {});
assert(compVpiDeviant.isMatches === false, 'media_vpi = 0 with media_lazy = 1 is deviation');
assert(compVpiDeviant.statusLabel.includes('Avvikelse'), 'media_vpi = 0 with media_lazy = 1 statusLabel is Avvikelse');

assert(foundVpi !== null, 'media_vpi option exists in buildCompleteLscwpSettings');
assert(foundVpi.sources && foundVpi.sources.lsAdv && foundVpi.sources.oom && foundVpi.sources.domain, 'media_vpi has 3 consensus sources');
assert(foundVpi.sources.lsAdv.status === 'neutral', 'media_vpi has neutral status for lsAdv when media_lazy is 0');

// ==========================================
// 5. JS DELAYED EXCLUDE UNDER DEFER
// ==========================================
console.log('\n--- 4. JS Delayed Exclude under Defer ---');
const optDelayedExc = {
  id: "js_delayed_exclude",
  title: "Fördröj JS – Exkluderade filer",
  recommended: "",
  recommendedRaw: ""
};

// Case A: Defer is "1", js_delayed_exclude omitted from .data
const compDelayedOmitted = context.getOptionComparison(optDelayedExc, { optm_js_defer: "1" }, {});
assert(compDelayedOmitted.isMeasured === true, 'js_delayed_exclude omitted under Defer is measured (isMeasured: true)');
assert(compDelayedOmitted.isMatches === true, 'js_delayed_exclude omitted under Defer isMatches is true');
assert(compDelayedOmitted.currentDisplay.includes('Inaktiv (Defer aktiv)'), 'js_delayed_exclude omitted under Defer display is Inaktiv (Defer aktiv)');

// Case B: Defer is "1", js_delayed_exclude is empty string
const compDelayedEmpty = context.getOptionComparison(optDelayedExc, { optm_js_defer: "1", js_delayed_exclude: "" }, {});
assert(compDelayedEmpty.isMeasured === true, 'js_delayed_exclude empty under Defer is measured');
assert(compDelayedEmpty.isMatches === true, 'js_delayed_exclude empty under Defer isMatches is true');
assert(compDelayedEmpty.currentDisplay.includes('Inaktiv (Defer aktiv)'), 'js_delayed_exclude empty under Defer display is Inaktiv');

// ==========================================
// 6. ECOSYSTEM UPDATES ADVISORY ALERT
// ==========================================
console.log('\n--- 5. Ecosystem Updates Advisory Alert (scoreImpact: 0) ---');

// Benchmark has woocommerce benchmark 9.8.0 vs latestRelease 9.8.2
// and elementor benchmark 4.2.0 vs latestRelease 4.2.1
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
assert(updateAlert !== undefined, 'Ecosystem updates alert exists when updates are available');
assert(updateAlert.type === 'info', 'Ecosystem updates alert has type: info');
assert(updateAlert.scoreImpact === 0, 'Ecosystem updates alert has scoreImpact: 0 (no penalty)');
assert(updateAlert.title.includes('uppdatering'), 'Ecosystem updates alert title describes available updates');
assert(updateAlert.desc.includes('WooCommerce') && updateAlert.desc.includes('9.8.2'), 'Ecosystem updates alert mentions WooCommerce 9.8.2');
assert(updateAlert.desc.includes('Elementor') && updateAlert.desc.includes('4.2.1'), 'Ecosystem updates alert mentions Elementor 4.2.1');

// Verify that an environment with up-to-date plugins does not trigger the alert
const sysInfoUpToDate = {
  "wp-core": { version: "6.8.1" },
  "wp-server": { httpd_software: "LiteSpeed Web Server" },
  "wp-plugins-active": {
    "woocommerce/woocommerce.php": { version: "9.8.2" },
    "elementor/elementor.php": { version: "4.2.1" }
  }
};

const analysisUpToDate = context.analyzeSystem(
  sysInfoUpToDate,
  { version: "9.8.2" },
  null,
  { version: "4.2.1" },
  { optm_js_defer: "1", media_lazy: "0" }
);
const noUpdateAlert = analysisUpToDate.alerts.find(a => a.id === "alert_available_updates");
assert(noUpdateAlert === undefined, 'No ecosystem update alert when all versions meet or exceed latest releases');

// ==========================================
// 7. REAL FIXTURES VERIFICATION
// ==========================================
console.log('\n--- 6. Real World Fixtures Verification ---');
const fixMaxi = fs.readFileSync(path.join(BASE_DIR, 'scratch/fixtures/maximeraprofil.se-wp-systemfil-260604.txt'), 'utf8');
const fix2you = fs.readFileSync(path.join(BASE_DIR, 'scratch/fixtures/2you.se-wp-systemfil-260604.txt'), 'utf8');

assert(fixMaxi.length > 1000 && fix2you.length > 1000, 'Fixtures read successfully');

console.log(`\n==========================================`);
console.log(`v2.6.10.2 VERIFICATION SUMMARY: ${passed} passed, ${failed} failed`);
console.log(`==========================================\n`);

if (failed > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
