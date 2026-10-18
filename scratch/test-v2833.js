/**
 * Verification test suite for AreWee-Optimizer v2.8.33
 * Tests:
 * 1. Version parity across all 7 project files
 * 2. Cumulative mini-cart toggle logic for woo_cart_fragments:
 *    - elemMenuCart: true with themeMiniCart: false -> isMeasured: true, isMatches: true (Optimal 🟢)
 *    - themeMiniCart: true with elemMenuCart: false -> isMeasured: true, isMatches: true (Optimal 🟢)
 *    - both false with no other signals -> isMeasured: false (⚪ Värde saknas)
 *    - elemMenuCart: true with SCM dequeue & page cache -> isMeasured: true, isMatches: false (Avvikelse 🟡)
 */

const fs = require("fs");
const path = require("path");
const vm = require("vm");
const assert = require("assert");

console.log("=== AreWee-Optimizer v2.8.33 Verification Suite ===\n");

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

// 1. Version Parity
console.log("1. Checking version parity across all files...");
const appContent = fs.readFileSync(files.app, "utf8");
const appVersionMatch = appContent.match(/const APP_VERSION = "([^"]+)";/);
assert(appVersionMatch, "APP_VERSION must be defined in app.js");
const expectedVersion = appVersionMatch[1];
assert(expectedVersion.startsWith("2.8."), "Version should be 2.8.x");

const indexContent = fs.readFileSync(files.index, "utf8");
assert(indexContent.includes(`(v${expectedVersion})`), "index.html has title/modal with (v2.8.33)");
assert(indexContent.includes(`v=${expectedVersion}`), "index.html has script/css tags with v=2.8.33");

const stylesContent = fs.readFileSync(files.styles, "utf8");
assert(stylesContent.includes(`(v${expectedVersion})`), "styles.css has header with (v2.8.33)");

const rulesContent = fs.readFileSync(files.rules, "utf8");
assert(rulesContent.includes(`(v${expectedVersion})`), "rules.js has header with (v2.8.33)");

const exporterContent = fs.readFileSync(files.exporter, "utf8");
assert(exporterContent.includes(`(v${expectedVersion})`), "exporter.js has header with (v2.8.33)");

const readmeContent = fs.readFileSync(files.readme, "utf8");
assert(readmeContent.includes(`(v${expectedVersion})`), "README.md has header with (v2.8.33)");

const geminiContent = fs.readFileSync(files.gemini, "utf8");
assert(geminiContent.includes(`(v${expectedVersion})`), "GEMINI.md has header with (v2.8.33)");
console.log("   ✓ Version parity verified across all 7 project files");

// 2. Load rules.js into sandbox
console.log("2. Loading rules.js into VM sandbox...");
const sandbox = {
  console: console,
  setTimeout: setTimeout,
  clearTimeout: clearTimeout,
  Math: Math,
  Object: Object,
  Array: Array,
  String: String,
  Number: Number,
  parseInt: parseInt,
  parseFloat: parseFloat,
  Date: Date,
  RegExp: RegExp,
  window: {}
};
vm.createContext(sandbox);
vm.runInContext(rulesContent, sandbox);
console.log("   ✓ rules.js loaded successfully");

// 3. Test woo_cart_fragments with manual toggles
console.log("3. Testing woo_cart_fragments cumulative manual toggles...");
const optCartFragments = {
  id: "woo_cart_fragments",
  title: "Cart Fragments",
  tool: "woocommerce",
  scoreImpact: 0,
  recommendedRaw: "1"
};

// Case A: elemMenuCart checked (true), themeMiniCart unchecked (false)
const envElemOnly = {
  hasWooCommerce: true,
  manualToggles: { elemMenuCart: true, themeMiniCart: false }
};
const compElemOnly = sandbox.getOptionComparison(optCartFragments, {}, envElemOnly);
assert.strictEqual(compElemOnly.isMeasured, true, "elemMenuCart=true must be measured");
assert.strictEqual(compElemOnly.isMatches, true, "elemMenuCart=true without dequeue must be optimal (PÅ)");
assert(compElemOnly.currentDisplay.includes("PÅ (Krävs för minivarukorg i header"), "displays optimal active header cart");
console.log("   ✓ elemMenuCart: true with themeMiniCart: false is OPTIMAL (🟢 PÅ) and leaves Värde saknas");

// Case B: themeMiniCart checked (true), elemMenuCart unchecked (false)
const envThemeOnly = {
  hasWooCommerce: true,
  manualToggles: { elemMenuCart: false, themeMiniCart: true }
};
const compThemeOnly = sandbox.getOptionComparison(optCartFragments, {}, envThemeOnly);
assert.strictEqual(compThemeOnly.isMeasured, true, "themeMiniCart=true must be measured");
assert.strictEqual(compThemeOnly.isMatches, true, "themeMiniCart=true without dequeue must be optimal (PÅ)");
assert(compThemeOnly.currentDisplay.includes("PÅ (Krävs för minivarukorg i header"), "displays optimal active header cart");
console.log("   ✓ themeMiniCart: true with elemMenuCart: false is OPTIMAL (🟢 PÅ) and leaves Värde saknas");

// Case C: Both unchecked (false), no file signals -> unmeasured
const envBothFalse = {
  hasWooCommerce: true,
  manualToggles: { elemMenuCart: false, themeMiniCart: false }
};
const compBothFalse = sandbox.getOptionComparison(optCartFragments, {}, envBothFalse);
assert.strictEqual(compBothFalse.isMeasured, false, "both unchecked with no signals is unmeasured");
assert.strictEqual(compBothFalse.statusLabel, "⚪ Värde saknas (Slot 6 / 7 / 9)", "shows Värde saknas");
console.log("   ✓ Both unchecked without signal is honestly UNMEASURED (⚪ Värde saknas)");

// Case D: elemMenuCart checked (true) + SCM dequeue + LiteSpeed page cache active -> Avvikelse (Risk för spökvarukorg)
const envDequeuedWithCache = {
  hasWooCommerce: true,
  cart_fragments_dequeued: true,
  isLiteSpeedServer: true,
  manualToggles: { elemMenuCart: true, themeMiniCart: false }
};
const compDequeued = sandbox.getOptionComparison(optCartFragments, {}, envDequeuedWithCache);
assert.strictEqual(compDequeued.isMeasured, true, "measured when dequeued with header cart");
assert.strictEqual(compDequeued.isMatches, false, "not optimal when dequeued with active page cache");
assert(compDequeued.currentDisplay.includes("Risk för spökvarukorg"), "warns about ghost cart");
console.log("   ✓ elemMenuCart: true with SCM dequeue & page cache triggers deviation (🟡 Risk för spökvarukorg)");

// 4. Test analyzeSystem end-to-end with live context manual toggles
console.log("4. Testing analyzeSystem end-to-end...");
const analysis = sandbox.analyzeSystem(
  {}, // sysInfo
  { active: true }, // wooInfo
  null, // wfInfo
  null, // elemInfo
  null, // uploadedSettings
  null, // customCodeInfo
  "", // customCss
  null, // themeInfo
  { manualToggles: { elemMenuCart: true, themeMiniCart: false } }
);

const wooTab = analysis.recommendations.find(t => t.id === "woocommerce");
assert(wooTab, "WooCommerce recommendations tab exists");
const cartOption = wooTab.options.find(o => o.id === "woo_cart_fragments");
assert(cartOption, "woo_cart_fragments option exists");
const compAnalyze = sandbox.getOptionComparison(cartOption, null, analysis.environment);
assert.strictEqual(compAnalyze.isMeasured, true, "analyzeSystem environment measures cartOption");
assert.strictEqual(compAnalyze.isMatches, true, "analyzeSystem environment matches optimal for cartOption");
console.log("   ✓ analyzeSystem end-to-end verified with manualToggles context");

console.log("\n======================================================");
console.log("ALL v2.8.33 VERIFICATION TESTS PASSED (100% SUCCESS)");
console.log("======================================================\n");
