/**
 * Automated test suite for AreWee-Optimizer v2.4.33
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

// Test 1: Version consistency across all files (v2.4.33)
runTest("Version consistency across all files (v2.4.33)", () => {
  const indexHtml = fs.readFileSync(path.join(__dirname, "../index.html"), "utf8");
  const appFile = fs.readFileSync(path.join(__dirname, "../js/app.js"), "utf8");
  const rulesFile = fs.readFileSync(path.join(__dirname, "../js/rules.js"), "utf8");
  const exporterFile = fs.readFileSync(path.join(__dirname, "../js/exporter.js"), "utf8");
  const readmeFile = fs.readFileSync(path.join(__dirname, "../README.md"), "utf8");
  const geminiFile = fs.readFileSync(path.join(__dirname, "../gemini.md"), "utf8");

  assert(indexHtml.includes("v2.4.33"), "index.html must contain v2.4.33");
  assert(indexHtml.includes("css/styles.css?v=2.4.33"), "index.html stylesheet cache-busting v2.4.33");
  assert(indexHtml.includes("js/app.js?v=2.4.33"), "index.html app.js cache-busting v2.4.33");
  assert(appFile.includes("v2.4.33") || appFile.includes("2.4.33"), "app.js must contain 2.4.33");
  assert(rulesFile.includes("v2.4.33") || rulesFile.includes("2.4.33"), "rules.js must contain 2.4.33");
  assert(exporterFile.includes("v2.4.33") || exporterFile.includes("2.4.33"), "exporter.js must contain 2.4.33");
  assert(readmeFile.includes("v2.4.33"), "README.md must contain v2.4.33");
  assert(geminiFile.includes("v2.4.33"), "gemini.md must contain v2.4.33");
});

// Test 2: Standalone LiteSpeed .data analysis
runTest("Standalone LiteSpeed .data analysis (no sysInfo)", () => {
  const sampleData = `a:12:{s:7:"version";s:5:"7.1.1";s:8:"site_url";s:17:"https://mytest.se";s:11:"cache_login";s:1:"1";s:12:"cache_object";s:1:"1";s:12:"cache_mobile";s:1:"1";s:8:"optm_css";s:1:"1";s:7:"optm_js";s:1:"1";s:10:"optm_js_defer";s:1:"1";s:8:"drop_uri";s:21:"/kassa/\n/varukorg/";s:10:"js_exclude";s:8:"ctm-init";s:10:"media_lazy";s:1:"1";s:14:"media_lazy_exc";s:15:"data:image/svg+xml";};`;
  
  const parsedSettings = parseSettingsFile(sampleData);
  assert(parsedSettings !== null, "parseSettingsFile must successfully parse serialized PHP .data");
  assert(parsedSettings.version === "7.1.1", "Version 7.1.1 parsed");
  assert(parsedSettings.site_url === "https://mytest.se", "Site URL parsed");
  assert(parsedSettings.cache_object === "1", "cache_object parsed");

  const results = analyzeSystem(null, null, null, null, parsedSettings, null, null, null);
  assert(results !== null, "analyzeSystem should return non-null result for standalone settings");
  assert(results.environment !== null, "environment should be generated");
  assert(results.environment.isLiteSpeedServer === true, "Should infer LiteSpeed server");
  assert(results.environment.hasRedis === true, "Should detect Redis from cache_object");
  assert(results.recommendations.length > 0, "Should generate recommendation tabs");
  assert(results.fileSummaries.sysInfo[0].text.includes("Standardreferensmiljö"), "Should explain default environment fallback in sysInfo summary");
  assert(results.fileSummaries.uploadedSettings[0].text.includes("Inläst LiteSpeed-profil"), "Should confirm uploaded settings in summary");
});

// Test 3: Multi-file analysis with sysInfo + uploadedSettings
runTest("Multi-file analysis with sysInfo + uploadedSettings", () => {
  const sampleSysInfo = {
    "wp-core": { version: "6.7.2" },
    "wp-server": { httpd_software: "LiteSpeed/1.7.19", php_version: "8.2.18", memory_limit: "512M" },
    "wp-constants": { WP_MEMORY_LIMIT: "256M", WP_MAX_MEMORY_LIMIT: "512M", WP_DEBUG: "false" },
    "wp-active-theme": { name: "Astra Child", parent_theme: "Astra" },
    "wp-plugins-active": {
      "litespeed-cache/litespeed-cache.php": { name: "LiteSpeed Cache", version: "6.5.4" },
      "woocommerce/woocommerce.php": { name: "WooCommerce", version: "9.3.3" }
    }
  };

  const sampleSettings = {
    drop_uri: "/kassa/\n/varukorg/\n/checkout/",
    cache_priv: "1",
    cache_object: "1",
    media_lazy: "1"
  };

  const results = analyzeSystem(sampleSysInfo, null, null, null, sampleSettings, null, null, null);
  assert(results.environment.wpVersion === "6.7.2", "WP version 6.7.2 matched");
  assert(results.environment.hasWooCommerce === true, "WooCommerce detected");
  assert(results.environment.lscwpVersion === "6.5.4", "LSCWP version 6.5.4 detected from sysInfo");
  assert(results.recommendations.length > 0, "Recommendations generated");
});

// Test 4: Exporter Second Opinion report in standalone mode
runTest("Exporter Second Opinion report in standalone mode", () => {
  const fakeState = {
    uploadedSettings: {
      site_url: "https://minbutik.se",
      version: "7.1.1",
      cache_object: "1",
      drop_uri: "/checkout/\n/cart/"
    },
    sysInfo: null,
    wooInfo: null,
    wfInfo: null,
    elemInfo: null,
    scmInfo: null,
    customCss: "",
    themeInfo: null,
    analysisResults: analyzeSystem(null, null, null, null, { site_url: "https://minbutik.se", version: "7.1.1", cache_object: "1", drop_uri: "/checkout/\n/cart/" }, null, null, null)
  };

  const mdReport = generateSecondOpinionMarkdown(fakeState);
  assert(mdReport.includes("v2.4.33"), "Report must include v2.4.33 header");
  assert(mdReport.includes("https://minbutik.se"), "Report must include site URL");
  assert(mdReport.includes("LiteSpeed"), "Report must include LiteSpeed sections");
});

console.log("\n==============================================");
console.log("🎉 ALL AREWEE-OPTIMIZER v2.4.33 TESTS PASSED!");
console.log("==============================================\n");
