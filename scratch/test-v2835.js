const fs = require("fs");
const path = require("path");
const assert = require("assert");

console.log("=== Testing AreWee-Optimizer v2.8.35 Fixes ===");

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
assert.strictEqual(expectedVersion, "2.8.35", "Version must be 2.8.35");

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

console.log("   ✓ All 7 files match v2.8.35 perfectly.");

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

// 2. Test Wordfence unchecking & non-mutation of input object
console.log("2. Testing Wordfence unchecking & non-mutation of input object...");
// Verify app.js calls parseWordfenceDiagnostic on uncheck
assert(appContent.includes("state.wfInfo = parseWordfenceDiagnostic(state.rawUploadTexts.wordfence);"), "app.js must call parseWordfenceDiagnostic, not parseWordfenceText");

// Create original wfInfo object
const originalWfInfo = {
  version: "7.11.0",
  ip_header: "REMOTE_ADDR"
  // live_traffic is absent / unmeasured in diagnostic
};

// Run analyzeSystem with manual toggle checked
const analysisChecked = analyzeSystem(
  {
    "wp-core": { version: "6.8.0" },
    "wp-server": { httpd_software: "LiteSpeed" },
    "wp-plugins-active": { "wordfence/wordfence.php": { version: "7.11.0" } }
  },
  null,
  originalWfInfo,
  null,
  {},
  null,
  null,
  null,
  { manualToggles: { wfLiveTraffic: true } }
);

// Verify originalWfInfo was NOT mutated
assert.strictEqual(originalWfInfo.live_traffic_disabled, undefined, "analyzeSystem must NOT mutate original wfInfo object directly");

const optWfChecked = findOptionInTabs(analysisChecked.recommendations, "wf_disable_live_traffic");
const compWfChecked = getOptionComparison(optWfChecked, {}, analysisChecked.environment);
assert.strictEqual(compWfChecked.isMeasured, true);
assert.strictEqual(compWfChecked.currentDisplay, "PÅ (Manuellt angivet)");

// Now simulate unchecking: run analyzeSystem with manual toggle unchecked
const analysisUnchecked = analyzeSystem(
  {
    "wp-core": { version: "6.8.0" },
    "wp-server": { httpd_software: "LiteSpeed" },
    "wp-plugins-active": { "wordfence/wordfence.php": { version: "7.11.0" } }
  },
  null,
  originalWfInfo,
  null,
  {},
  null,
  null,
  null,
  { manualToggles: { wfLiveTraffic: false } }
);

const optWfUnchecked = findOptionInTabs(analysisUnchecked.recommendations, "wf_disable_live_traffic");
const compWfUnchecked = getOptionComparison(optWfUnchecked, {}, analysisUnchecked.environment);
assert.strictEqual(compWfUnchecked.isMeasured, false, "When unchecked and diagnostic has no live traffic data, it must return to unmeasured");
assert.strictEqual(compWfUnchecked.currentDisplay, "Ej inläst");
assert.strictEqual(compWfUnchecked.statusLabel, "⚪ Värde saknas (Slot 4 / 7)");
console.log("   ✓ Wordfence unchecking does not leave behind false PÅ and input object is immutable.");

// 3. Test SCM dequeue with manual mini-cart label
console.log("3. Testing SCM dequeue with manual mini-cart label...");

// Case A: Manual toggle + SCM dequeue + page cache active
const analysisManualDequeued = analyzeSystem(
  {
    "wp-core": { version: "6.8.0" },
    "wp-server": { httpd_software: "LiteSpeed" },
    "wp-plugins-active": { "woocommerce/woocommerce.php": { version: "9.8.0" } }
  },
  { version: "9.8.0" },
  null,
  null,
  { "purge-upgrade": "1" }, // LiteSpeed page cache on by default
  { cart_fragments_dequeued: true },
  null,
  null,
  { manualToggles: { elemMenuCart: true } }
);

const optCartFragA = findOptionInTabs(analysisManualDequeued.recommendations, "woo_cart_fragments");
const compCartFragA = getOptionComparison(optCartFragA, { "purge-upgrade": "1" }, analysisManualDequeued.environment);
assert.strictEqual(compCartFragA.isMatches, false);
assert.strictEqual(
  compCartFragA.currentDisplay,
  "AV (Avstängd via SCM · Risk för spökvarukorg vid sidcache · Manuellt angivet)",
  "Must include '· Manuellt angivet' when mini-cart is manually specified"
);

// Case B: Non-manual (organic report) + SCM dequeue + page cache active
const analysisOrganicDequeued = analyzeSystem(
  {
    "wp-core": { version: "6.8.0" },
    "wp-server": { httpd_software: "LiteSpeed" },
    "wp-plugins-active": { "woocommerce/woocommerce.php": { version: "9.8.0" } }
  },
  { version: "9.8.0" },
  null,
  { version: "3.28.0", hasMenuCart: true }, // Organic Elementor report with Menu Cart
  { "purge-upgrade": "1" },
  { cart_fragments_dequeued: true },
  null,
  null,
  { manualToggles: { elemMenuCart: false } }
);

const optCartFragB = findOptionInTabs(analysisOrganicDequeued.recommendations, "woo_cart_fragments");
const compCartFragB = getOptionComparison(optCartFragB, { "purge-upgrade": "1" }, analysisOrganicDequeued.environment);
assert.strictEqual(compCartFragB.isMatches, false);
assert.strictEqual(
  compCartFragB.currentDisplay,
  "AV (Avstängd via SCM · Risk för spökvarukorg vid sidcache)",
  "Organic report mini-cart must NOT say '· Manuellt angivet'"
);

// Case C: Manual toggle + SCM dequeue + page cache explicitly off (cache: "0")
const analysisManualDequeuedNoCache = analyzeSystem(
  {
    "wp-core": { version: "6.8.0" },
    "wp-server": { httpd_software: "LiteSpeed" },
    "wp-plugins-active": { "woocommerce/woocommerce.php": { version: "9.8.0" } }
  },
  { version: "9.8.0" },
  null,
  null,
  { "cache": "0" }, // page cache explicitly off
  { cart_fragments_dequeued: true },
  null,
  null,
  { manualToggles: { themeMiniCart: true } }
);

const optCartFragC = findOptionInTabs(analysisManualDequeuedNoCache.recommendations, "woo_cart_fragments");
const compCartFragC = getOptionComparison(optCartFragC, { "cache": "0" }, analysisManualDequeuedNoCache.environment);
assert.strictEqual(compCartFragC.isMatches, true);
assert.strictEqual(
  compCartFragC.currentDisplay,
  "AV (Avstängd via SCM · Minivarukorg finns, men sidcache ej aktiv · Manuellt angivet)",
  "Must include '· Manuellt angivet' when mini-cart is manually specified"
);

console.log("   ✓ SCM dequeue properly labels manual vs organic mini-cart.");

console.log("\n🎉 All v2.8.35 verification tests passed successfully!");
