const fs = require("fs");
const path = require("path");
const assert = require("assert");

console.log("=== Testing AreWee-Optimizer v2.8.34 Fixes ===");

const baseDir = path.resolve(__dirname, "..");
const files = {
  index: path.join(baseDir, "index.html"),
  app: path.join(baseDir, "js", "app.js"),
  rules: path.join(baseDir, "js", "rules.js"),
  exporter: path.join(baseDir, "js", "exporter.js"),
  styles: path.join(baseDir, "css", "styles.css"),
  readme: path.join(baseDir, "README.md"),
  gemini: fs.existsSync(path.join(baseDir, "gemini.md")) ? path.join(baseDir, "gemini.md") : path.join(baseDir, "GEMINI.md")
};

// 1. Version Parity across all 7 files
console.log("1. Checking version parity across all 7 files...");
const appContent = fs.readFileSync(files.app, "utf8");
const appVersionMatch = appContent.match(/const APP_VERSION = "([^"]+)";/);
assert(appVersionMatch, "APP_VERSION must be defined in app.js");
const expectedVersion = appVersionMatch[1];
assert(expectedVersion.startsWith("2.8."), "Version should be 2.8.x");

const rulesContent = fs.readFileSync(files.rules, "utf8");
assert(rulesContent.includes(`(v${expectedVersion})`), `rules.js header (v${expectedVersion})`);

const exporterContent = fs.readFileSync(files.exporter, "utf8");
assert(exporterContent.includes(`(v${expectedVersion})`), `exporter.js header (v${expectedVersion})`);
assert(exporterContent.includes(`* Version: ${expectedVersion}`), `exporter.js helper plugin version ${expectedVersion}`);

const indexContent = fs.readFileSync(files.index, "utf8");
assert(indexContent.includes(`(v${expectedVersion})`), `index.html title (v${expectedVersion})`);
assert(indexContent.includes(`v=${expectedVersion}`), `index.html script/css tags v=${expectedVersion}`);
assert(indexContent.includes(`class="logo-tag">v${expectedVersion}</span>`), `index.html logo-tag v${expectedVersion}`);

const stylesContent = fs.readFileSync(files.styles, "utf8");
assert(stylesContent.includes(`(v${expectedVersion})`), `styles.css header (v${expectedVersion})`);

const readmeContent = fs.readFileSync(files.readme, "utf8");
assert(readmeContent.includes(`(v${expectedVersion})`), `README.md header (v${expectedVersion})`);

const geminiContent = fs.readFileSync(files.gemini, "utf8");
assert(geminiContent.includes(`(v${expectedVersion})`), `gemini.md header (v${expectedVersion})`);
assert(geminiContent.includes(`**v${expectedVersion}:**`), `gemini.md changelog **v${expectedVersion}:**`);

console.log("   ✓ All 7 files match v2.8.34 perfectly.");

// Load rules module
const { analyzeSystem, getOptionComparison } = require(files.rules);

function findOptionInTabs(tabs, optId) {
  for (const tab of tabs) {
    if (tab.options) {
      const opt = tab.options.find(o => o.id === optId);
      if (opt) return opt;
    }
  }
  return null;
}

// 2. Wordfence Live Traffic Toggle - No fake Wordfence creation
console.log("2. Testing Wordfence Live Traffic Toggle (No fake Wordfence on non-Wordfence sites)...");
const envNoWf = analyzeSystem(
  {
    "wp-core": { version: "6.8.0", site_url: "https://2you.se" },
    "wp-server": { httpd_software: "LiteSpeed" },
    "wp-plugins-active": {}
  },
  null, // wooInfo
  null, // wfInfo
  null, // elemInfo
  {},   // uploadedSettings
  null, // scmInfo
  null, // customCss
  null, // themeInfo
  { manualToggles: { wfLiveTraffic: true } } // serverConfigFiles (liveCtx)
);

assert.strictEqual(envNoWf.environment.hasWordfence, false, "Site without Wordfence must NOT have hasWordfence = true");
const wfOptNoWf = findOptionInTabs(envNoWf.recommendations, "wf_disable_live_traffic");
assert(wfOptNoWf, "wf_disable_live_traffic option template exists");
const wfCompNoWf = getOptionComparison(wfOptNoWf, {}, envNoWf.environment);
assert.strictEqual(wfCompNoWf.isMeasured, false, "wf_disable_live_traffic must NOT be measured when site lacks Wordfence");
console.log("   ✓ Sites without Wordfence are not given fake Wordfence data when toggle is set.");

// Test Wordfence site with missing live traffic + manual toggle
const envWfManual = analyzeSystem(
  {
    "wp-core": { version: "6.8.0" },
    "wp-server": { httpd_software: "LiteSpeed" },
    "wp-plugins-active": { "wordfence/wordfence.php": { version: "7.11.0" } }
  },
  null,
  { version: "7.11.0", ip_header: "REMOTE_ADDR" }, // wfInfo without live traffic
  null,
  {},
  null,
  null,
  null,
  { manualToggles: { wfLiveTraffic: true } } // serverConfigFiles (liveCtx)
);

const wfOptManual = findOptionInTabs(envWfManual.recommendations, "wf_disable_live_traffic");
assert(wfOptManual, "wf_disable_live_traffic option template exists");
const wfCompManual = getOptionComparison(wfOptManual, {}, envWfManual.environment);
assert.strictEqual(wfCompManual.isMeasured, true, "Must be measured via manual toggle");
assert.strictEqual(wfCompManual.currentDisplay, "PÅ (Manuellt angivet)", "Display must clearly say 'PÅ (Manuellt angivet)'");
console.log("   ✓ Wordfence manual toggle displays 'PÅ (Manuellt angivet)'.");

// Test Wordfence site with explicit "All traffic" / enabled report - report must take precedence
const envWfExplicitReport = analyzeSystem(
  {
    "wp-core": { version: "6.8.0" },
    "wp-server": { httpd_software: "LiteSpeed" },
    "wp-plugins-active": { "wordfence/wordfence.php": { version: "7.11.0" } }
  },
  null,
  { version: "7.11.0", live_traffic: "enabled", liveTrafficEnabled: true, ip_header: "REMOTE_ADDR" },
  null,
  {},
  null,
  null,
  null,
  { manualToggles: { wfLiveTraffic: true } } // serverConfigFiles (liveCtx)
);

const wfOptExplicit = findOptionInTabs(envWfExplicitReport.recommendations, "wf_disable_live_traffic");
assert(wfOptExplicit, "wf_disable_live_traffic option template exists");
const wfCompExplicit = getOptionComparison(wfOptExplicit, {}, envWfExplicitReport.environment);
assert.strictEqual(wfCompExplicit.isMatches, false, "Diagnostic report 'enabled' must take precedence over manual toggle");
assert.strictEqual(wfCompExplicit.currentDisplay, "AV", "Explicit enabled live traffic must display 'AV'");
console.log("   ✓ Diagnostic report data takes precedence over manual checkbox.");

// 3. Complete vs Incomplete .htaccess for wf_noabort
console.log("3. Testing .htaccess completeness for wf_noabort...");

// Case A: Complete .htaccess without noabort
const envCompleteHt = analyzeSystem(
  {
    "wp-core": { version: "6.8.0" },
    "wp-server": { httpd_software: "LiteSpeed" },
    "wp-plugins-active": { "wordfence/wordfence.php": { version: "7.11.0" } }
  },
  null,
  { version: "7.11.0", noabort_active: false },
  null,
  {},
  null,
  null,
  null,
  {
    htaccessStatus: { isLoaded: true, isComplete: true, noabortValue: false, noabortSource: "none" }
  }
);
const noabortOptA = findOptionInTabs(envCompleteHt.recommendations, "wf_noabort");
assert(noabortOptA, "wf_noabort option template exists");
const noabortCompA = getOptionComparison(noabortOptA, {}, envCompleteHt.environment);
assert.strictEqual(noabortCompA.currentDisplay, "AV (Saknas i .htaccess)", "Complete .htaccess must say 'AV (Saknas i .htaccess)'");

// Case B: Incomplete .htaccess without noabort
const envIncompleteHt = analyzeSystem(
  {
    "wp-core": { version: "6.8.0" },
    "wp-server": { httpd_software: "LiteSpeed" },
    "wp-plugins-active": { "wordfence/wordfence.php": { version: "7.11.0" } }
  },
  null,
  { version: "7.11.0", noabort_active: false },
  null,
  {},
  null,
  null,
  null,
  {
    htaccessStatus: { isLoaded: true, isComplete: false, noabortValue: false, noabortSource: "wordfence" }
  }
);
const noabortOptB = findOptionInTabs(envIncompleteHt.recommendations, "wf_noabort");
assert(noabortOptB, "wf_noabort option template exists");
const noabortCompB = getOptionComparison(noabortOptB, {}, envIncompleteHt.environment);
assert.strictEqual(noabortCompB.currentDisplay, "AV (Enligt Wordfence · .htaccess ej komplett)", "Incomplete .htaccess must say 'AV (Enligt Wordfence · .htaccess ej komplett)'");
console.log("   ✓ Complete .htaccess correctly shows 'AV (Saknas i .htaccess)' and incomplete shows 'AV (Enligt Wordfence · .htaccess ej komplett)'.");

// 4. LiteSpeed Page Cache Default & woo_cart_fragments
console.log("4. Testing LiteSpeed Page Cache default & woo_cart_fragments...");

// Case A: Settings file without explicit cache_enable key on LiteSpeed server -> page cache is ON by default
const envLsDefaultCache = analyzeSystem(
  {
    "wp-core": { version: "6.8.0" },
    "wp-server": { httpd_software: "LiteSpeed" },
    "wp-plugins-active": { "woocommerce/woocommerce.php": { version: "9.8.0" } }
  },
  { version: "9.8.0" },
  null,
  null,
  { "purge-upgrade": "1" }, // uploadedSettings without "cache" or "cache-enable"
  { cart_fragments_dequeued: true }, // SCM dequeued
  null,
  null,
  { manualToggles: { elemMenuCart: true } } // serverConfigFiles (liveCtx)
);

const cartFragOptA = findOptionInTabs(envLsDefaultCache.recommendations, "woo_cart_fragments");
assert(cartFragOptA, "woo_cart_fragments option template exists");
const cartFragCompA = getOptionComparison(cartFragOptA, { "purge-upgrade": "1" }, envLsDefaultCache.environment);
assert.strictEqual(cartFragCompA.isMatches, false, "When mini-cart exists and page cache is on by default, dequeued must alert risk of ghost cart");
assert(cartFragCompA.currentDisplay.startsWith("AV (Avstängd via SCM · Risk för spökvarukorg vid sidcache"));

// Case B: Settings file with explicit cache: "0" -> page cache is explicitly OFF
const envLsExplicitOffCache = analyzeSystem(
  {
    "wp-core": { version: "6.8.0" },
    "wp-server": { httpd_software: "LiteSpeed" },
    "wp-plugins-active": { "woocommerce/woocommerce.php": { version: "9.8.0" } }
  },
  { version: "9.8.0" },
  null,
  null,
  { "cache": "0" }, // Page cache explicitly off
  { cart_fragments_dequeued: true },
  null,
  null,
  { manualToggles: { elemMenuCart: true } } // serverConfigFiles (liveCtx)
);

const cartFragOptB = findOptionInTabs(envLsExplicitOffCache.recommendations, "woo_cart_fragments");
assert(cartFragOptB, "woo_cart_fragments option template exists");
const cartFragCompB = getOptionComparison(cartFragOptB, { "cache": "0" }, envLsExplicitOffCache.environment);
assert.strictEqual(cartFragCompB.isMatches, true, "When page cache is explicitly off, dequeued mini-cart is safe and green");
assert(cartFragCompB.currentDisplay.startsWith("AV (Avstängd via SCM · Minivarukorg finns, men sidcache ej aktiv"));
console.log("   ✓ LiteSpeed page cache is properly ON by default unless explicitly disabled with cache: '0'.");

// 5. wooInfo.cart_fragments alone does NOT trigger mini-cart
console.log("5. Testing wooInfo.cart_fragments isolation...");
const envWooOnly = analyzeSystem(
  {
    "wp-core": { version: "6.8.0" },
    "wp-server": { httpd_software: "LiteSpeed" },
    "wp-plugins-active": { "woocommerce/woocommerce.php": { version: "9.8.0" } }
  },
  { version: "9.8.0", cart_fragments: true }, // Presence of script in WC status, NOT header mini-cart!
  null,
  null,
  {},
  null,
  null,
  null,
  {}
);
const cartFragOptC = findOptionInTabs(envWooOnly.recommendations, "woo_cart_fragments");
assert(cartFragOptC, "woo_cart_fragments option template exists");
const cartFragCompC = getOptionComparison(cartFragOptC, {}, envWooOnly.environment);
assert.strictEqual(cartFragCompC.isMeasured, false, "wooInfo.cart_fragments alone must NOT trigger mini-cart (must be unmeasured/white)");
assert(cartFragCompC.statusLabel.includes("Värde saknas"), "Must show '⚪ Värde saknas'");
console.log("   ✓ wooInfo.cart_fragments alone does not trigger false mini-cart signal.");

// Test manual toggle label for woo_cart_fragments
const envMiniCartManual = analyzeSystem(
  {
    "wp-core": { version: "6.8.0" },
    "wp-server": { httpd_software: "LiteSpeed" },
    "wp-plugins-active": { "woocommerce/woocommerce.php": { version: "9.8.0" } }
  },
  { version: "9.8.0" },
  null,
  null,
  {},
  null,
  null,
  null,
  { manualToggles: { elemMenuCart: true } }
);
const cartFragOptD = findOptionInTabs(envMiniCartManual.recommendations, "woo_cart_fragments");
assert(cartFragOptD, "woo_cart_fragments option template exists");
const cartFragCompD = getOptionComparison(cartFragOptD, {}, envMiniCartManual.environment);
assert.strictEqual(cartFragCompD.currentDisplay, "PÅ (Krävs för minivarukorg i header · Manuellt angivet)");
console.log("   ✓ Mini-cart manual toggle displays 'PÅ (Krävs för minivarukorg i header · Manuellt angivet)'.");

// 6. Text cleanup in app.js
console.log("6. Verifying empty view text in app.js...");
assert(!appContent.includes("Policy/Context räknas inte som avvikelse"), "Legacy text must be removed from app.js");
assert(appContent.includes("Alla inställningar är uppmätta och matchar våra optimala rekommendationer (100% optimalt)."), "app.js empty notice updated to (100% optimalt)");
console.log("   ✓ app.js empty view text verified.");

console.log("🎉 All v2.8.34 test cases passed successfully!");
