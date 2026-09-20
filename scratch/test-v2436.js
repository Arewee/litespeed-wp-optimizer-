/**
 * Automated test suite for AreWee-Optimizer v2.4.36
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

// Test 1: Version consistency across all files (v2.4.36)
runTest("Version consistency across all files (v2.4.36)", () => {
  const indexHtml = fs.readFileSync(path.join(__dirname, "../index.html"), "utf8");
  const appFile = fs.readFileSync(path.join(__dirname, "../js/app.js"), "utf8");
  const rulesFile = fs.readFileSync(path.join(__dirname, "../js/rules.js"), "utf8");
  const exporterFile = fs.readFileSync(path.join(__dirname, "../js/exporter.js"), "utf8");
  const readmeFile = fs.readFileSync(path.join(__dirname, "../README.md"), "utf8");
  const geminiFile = fs.readFileSync(path.join(__dirname, "../gemini.md"), "utf8");

  assert(indexHtml.includes("v2.4.36"), "index.html must contain v2.4.36");
  assert(indexHtml.includes("css/styles.css?v=2.4.36"), "index.html stylesheet cache-busting v2.4.36");
  assert(indexHtml.includes("js/exporter.js?v=2.4.36"), "index.html exporter.js cache-busting v2.4.36");
  assert(indexHtml.includes("js/rules.js?v=2.4.36"), "index.html rules.js cache-busting v2.4.36");
  assert(indexHtml.includes("js/app.js?v=2.4.36"), "index.html app.js cache-busting v2.4.36");
  assert(appFile.includes("v2.4.36") || appFile.includes("2.4.36"), "app.js must contain 2.4.36");
  assert(rulesFile.includes("v2.4.36") || rulesFile.includes("2.4.36"), "rules.js must contain 2.4.36");
  assert(exporterFile.includes("v2.4.36") || exporterFile.includes("2.4.36"), "exporter.js must contain 2.4.36");
  assert(readmeFile.includes("v2.4.36"), "README.md must contain v2.4.36");
  assert(geminiFile.includes("v2.4.36"), "gemini.md must contain v2.4.36");
});

// Test 2: CSS Exclusions calculation for WooCommerce + Elementor + CTM
runTest("CSS Exclusions calculation for WooCommerce + Elementor + CTM", () => {
  const userSettings = {
    css_exclude: "cookieconsent\nctm-public\nklarna\nkustom\npaypal\nswish\nwp-content/uploads/elementor/css/*"
  };

  const results = analyzeSystem(null, null, null, null, userSettings, null, null, null);
  const cssTab = results.recommendations.find(t => t.id === "page_optimization_css");
  assert(cssTab !== undefined, "page_optimization_css tab must exist");

  const optCssExclude = cssTab.options.find(o => o.id === "css_exclude");
  assert(optCssExclude !== undefined, "css_exclude option must exist");
  assert(optCssExclude.recommendedRaw.includes("cookieconsent"), "css_exclude must recommend cookieconsent");
  assert(optCssExclude.recommendedRaw.includes("ctm-public"), "css_exclude must recommend ctm-public");
});

// Test 3: JS Exclusions with both JS Exclude and Delayed Exclude guidance
runTest("JS Exclusions with both JS Exclude and Delayed Exclude guidance", () => {
  const userSettings = {
    js_exclude: "jquery.js\njquery.min.js\ncookieconsent\nctm-init\nklarna\nkustom\npaypal\nswish\ndataLayer\nwoocommerce\nwc-checkout\nelementorFrontend",
    optm_js_defer: "1"
  };

  const results = analyzeSystem(null, null, null, null, userSettings, null, null, null);
  const jsTab = results.recommendations.find(t => t.id === "page_optimization_js");
  const optJsExclude = jsTab.options.find(o => o.id === "js_exclude");
  const comp = getOptionComparison(optJsExclude, userSettings, results.environment);
  assert(comp.isMatches === true, "isMatches should be true when all key exclusions are present");
});

console.log("\n==============================================");
console.log("🎉 ALL AREWEE-OPTIMIZER v2.4.36 TESTS PASSED!");
console.log("==============================================\n");
