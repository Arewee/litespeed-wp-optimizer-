/**
 * Automated test suite for AreWee-Optimizer v2.4.35
 */

const fs = require("fs");
const path = require("path");

function assert(condition, message) {
  if (!condition) {
    console.error(`❌ FAILED: ${message}`);
    process.exit(1);
  }
  console.log(`✓ PASSED: ${message}`);
}

function runTest(name, fn) {
  console.log(`\n--- TEST: ${name} ---`);
  try {
    fn();
  } catch (err) {
    console.error(`❌ EXCEPTION in test "${name}":`, err);
    process.exit(1);
  }
}

// Load JavaScript files in simulated browser environment
const exporterCode = fs.readFileSync(path.join(__dirname, "../js/exporter.js"), "utf8");
const rulesCode = fs.readFileSync(path.join(__dirname, "../js/rules.js"), "utf8");

// Set up minimal global environment
const window = {
  location: { href: "http://localhost/" },
  crypto: { getRandomValues: (buf) => buf }
};
global.window = window;

// Evaluate exporter and rules
eval(exporterCode);
eval(rulesCode);

// Test 1: Version consistency across all files (v2.4.35)
runTest("Version consistency across all files (v2.4.35)", () => {
  const indexHtml = fs.readFileSync(path.join(__dirname, "../index.html"), "utf8");
  const appFile = fs.readFileSync(path.join(__dirname, "../js/app.js"), "utf8");
  const rulesFile = fs.readFileSync(path.join(__dirname, "../js/rules.js"), "utf8");
  const exporterFile = fs.readFileSync(path.join(__dirname, "../js/exporter.js"), "utf8");
  const readmeFile = fs.readFileSync(path.join(__dirname, "../README.md"), "utf8");
  const geminiFile = fs.readFileSync(path.join(__dirname, "../gemini.md"), "utf8");

  assert(indexHtml.includes("v2.4.35"), "index.html must contain v2.4.35");
  assert(indexHtml.includes("css/styles.css?v=2.4.35"), "index.html stylesheet cache-busting v2.4.35");
  assert(indexHtml.includes("js/exporter.js?v=2.4.35"), "index.html exporter.js cache-busting v2.4.35");
  assert(indexHtml.includes("js/rules.js?v=2.4.35"), "index.html rules.js cache-busting v2.4.35");
  assert(indexHtml.includes("js/app.js?v=2.4.35"), "index.html app.js cache-busting v2.4.35");
  assert(appFile.includes("v2.4.35") || appFile.includes("2.4.35"), "app.js must contain 2.4.35");
  assert(rulesFile.includes("v2.4.35") || rulesFile.includes("2.4.35"), "rules.js must contain 2.4.35");
  assert(exporterFile.includes("v2.4.35") || exporterFile.includes("2.4.35"), "exporter.js must contain 2.4.35");
  assert(readmeFile.includes("v2.4.35"), "README.md must contain v2.4.35");
  assert(geminiFile.includes("v2.4.35"), "gemini.md must contain v2.4.35");
});

// Test 2: Textarea missing & fulfilled patterns tracking
runTest("Textarea missing & fulfilled patterns tracking", () => {
  const userSettings = {
    js_exclude: "jquery.js\njquery.min.js\ncookieconsent\nctm-init\nklarna\nkustom\npaypal\nswish"
  };

  const optJsExclude = {
    id: "js_exclude",
    title: "Undantagna JS-filer (JS Exclude)",
    recommendedRaw: "ctm\nctm-init.js\ncookieconsent\ndataLayer\njquery.js\njquery.min.js\nwoocommerce\nwc-checkout\nwc-cart",
    criticalLevel: "critical"
  };

  const diff = calculateOptionDiff(optJsExclude, userSettings, { hasWooCommerce: true });
  assert(diff.isMatches === false, "isMatches should be false since dataLayer, woocommerce, etc. are missing");
  assert(diff.missing.length > 0, "diff.missing must contain missing patterns");
  assert(diff.missing.includes("dataLayer"), "dataLayer must be in missing array");
  assert(diff.missing.includes("woocommerce"), "woocommerce must be in missing array");
  assert(diff.fulfilled.length > 0, "diff.fulfilled must contain fulfilled patterns");
  assert(diff.fulfilled.includes("jquery.js"), "jquery.js must be in fulfilled array");
  assert(diff.fulfilled.includes("cookieconsent"), "cookieconsent must be in fulfilled array");
});

// Test 3: Drop URI exclusion tracking for WooCommerce
runTest("Drop URI exclusion tracking for WooCommerce", () => {
  const userSettings = {
    drop_uri: "^/checkout/\n^/kassa/\n^/varukorg/"
  };

  const optDropUri = {
    id: "drop_uri",
    title: "Exkluderade URL-sökvägar (drop_uri)",
    recommendedRaw: "/cart/\n/checkout/\n/kassa/\n/varukorg/\n/my-account/\n/mitt-konto/\nwc-api=",
    criticalLevel: "critical"
  };

  const diff = calculateOptionDiff(optDropUri, userSettings, { hasWooCommerce: true });
  assert(diff.isMatches === true, "isMatches should be true since both checkout and cart are excluded");
  assert(diff.fulfilled.length > 0, "fulfilled array should contain matched URI slugs");
});

console.log("\n==============================================");
console.log("🎉 ALL AREWEE-OPTIMIZER v2.4.35 TESTS PASSED!");
console.log("==============================================\n");
