/**
 * Automated test suite for AreWee-Optimizer v2.4.34
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

// Test 1: Version consistency across all files (v2.4.34)
runTest("Version consistency across all files (v2.4.34)", () => {
  const indexHtml = fs.readFileSync(path.join(__dirname, "../index.html"), "utf8");
  const appFile = fs.readFileSync(path.join(__dirname, "../js/app.js"), "utf8");
  const rulesFile = fs.readFileSync(path.join(__dirname, "../js/rules.js"), "utf8");
  const exporterFile = fs.readFileSync(path.join(__dirname, "../js/exporter.js"), "utf8");
  const readmeFile = fs.readFileSync(path.join(__dirname, "../README.md"), "utf8");
  const geminiFile = fs.readFileSync(path.join(__dirname, "../gemini.md"), "utf8");

  assert(indexHtml.includes("v2.4.34"), "index.html must contain v2.4.34");
  assert(indexHtml.includes("css/styles.css?v=2.4.34"), "index.html stylesheet cache-busting v2.4.34");
  assert(indexHtml.includes("js/exporter.js?v=2.4.34"), "index.html exporter.js cache-busting v2.4.34");
  assert(indexHtml.includes("js/rules.js?v=2.4.34"), "index.html rules.js cache-busting v2.4.34");
  assert(indexHtml.includes("js/app.js?v=2.4.34"), "index.html app.js cache-busting v2.4.34");
  assert(appFile.includes("v2.4.34") || appFile.includes("2.4.34"), "app.js must contain 2.4.34");
  assert(rulesFile.includes("v2.4.34") || rulesFile.includes("2.4.34"), "rules.js must contain 2.4.34");
  assert(exporterFile.includes("v2.4.34") || exporterFile.includes("2.4.34"), "exporter.js must contain 2.4.34");
  assert(readmeFile.includes("v2.4.34"), "README.md must contain v2.4.34");
  assert(geminiFile.includes("v2.4.34"), "gemini.md must contain v2.4.34");
});

// Test 2: LiteSpeed Cache v7.9.1+ newline-delimited JSON tuples parsing
runTest("LiteSpeed v7.9.1+ JSON tuple format parsing", () => {
  const sampleV7Data = `
["_version","7.9.1"]
["hash","II5akBYtnNqV8UltngBA6lZLPduQXkj0"]
["auto_upgrade",false]
["cache",true]
["cache-browser",true]
["cache-exc",["^\\/checkout\\/","^\\/kassa\\/","^\\/varukorg\\/"]]
["optm-css_exc",["cookieconsent","ctm-public","kustom"]]
["optm-js_exc",["jquery.js","cookieconsent","ctm-init"]]
["optm-js_defer",1]
["object",true]
["object-host","127.0.0.1"]
["object-port",7364]
["media-lazy",false]
`;

  const parsed = parseSettingsFile(sampleV7Data);
  assert(parsed !== null, "parseSettingsFile must parse v7 JSON tuples");
  assert(parsed.optm_js_defer === 1, "optm_js_defer must be parsed as 1");
  assert(parsed.cache_browser === "1", "cache-browser boolean true must be converted to '1'");
  assert(parsed.cache_object === "1", "object boolean true mapped to cache_object '1'");
  assert(parsed.cache_object_port === 7364, "object-port mapped to cache_object_port 7364");
  
  // Exclusions unescaped and multiline
  assert(parsed.drop_uri.includes("^/checkout/"), "drop_uri must unescape slashes ^/checkout/");
  assert(parsed.drop_uri.includes("^/kassa/"), "drop_uri must unescape slashes ^/kassa/");
  assert(parsed.js_exclude.includes("ctm-init"), "js_exclude must contain ctm-init");
  assert(parsed.css_exclude.includes("cookieconsent"), "css_exclude must contain cookieconsent");

  // Rule evaluation for optm_js_defer
  const optJsDefer = { id: "optm_js_defer", title: "Skjut upp JS (JS Defer)", recommendedRaw: 1, criticalLevel: "high" };
  const diff = calculateOptionDiff(optJsDefer, parsed, {});
  assert(diff.currentDisplay === "PÅ (Deferred)", "currentDisplay must be 'PÅ (Deferred)'");
  assert(diff.isMatches === true, "isMatches must be true");
});

// Test 3: optm_js_defer = 2 (Delayed) preservation in JSON tuples
runTest("optm_js_defer = 2 (Delayed) preservation in JSON tuples", () => {
  const sampleV7Delayed = `
["_version","7.9.1"]
["optm-js_defer",2]
`;
  const parsed = parseSettingsFile(sampleV7Delayed);
  assert(parsed.optm_js_defer === 2, "optm_js_defer must be 2");

  const optJsDefer = { id: "optm_js_defer", title: "Skjut upp JS (JS Defer)", recommendedRaw: 1, criticalLevel: "high" };
  const diff = calculateOptionDiff(optJsDefer, parsed, {});
  assert(diff.currentDisplay === "PÅ (Delayed)", "currentDisplay must be 'PÅ (Delayed)'");
});

// Test 4: Backward compatibility with PHP serialized format
runTest("Backward compatibility with PHP serialized format", () => {
  const sampleData = `a:6:{s:7:"version";s:5:"7.1.1";s:13:"optm-js_defer";s:1:"1";s:12:"cache-object";s:1:"1";s:13:"cache-browser";s:1:"1";s:9:"cache-exc";s:16:"/kassa/\n/varukorg/";s:10:"optm-js_exc";s:8:"ctm-init";};`;
  const parsed = parseSettingsFile(sampleData);
  assert(parsed.optm_js_defer === "1", "optm-js_defer parsed from serialized PHP");
  assert(parsed.cache_object === "1", "cache_object parsed from serialized PHP");

  const optJsDefer = { id: "optm_js_defer", title: "Skjut upp JS (JS Defer)", recommendedRaw: 1, criticalLevel: "high" };
  const diff = calculateOptionDiff(optJsDefer, parsed, {});
  assert(diff.currentDisplay === "PÅ (Deferred)", "currentDisplay must be 'PÅ (Deferred)' for serialized PHP");
});

// Test 5: Markdown report generation in v2.4.34
runTest("Markdown report generation in v2.4.34", () => {
  const sampleV7Data = `
["_version","7.9.1"]
["site_url","https://butik.se"]
["optm-js_defer",1]
["cache-browser",true]
["object",true]
`;
  const parsed = parseSettingsFile(sampleV7Data);
  const analysis = analyzeSystem(null, null, null, null, parsed, null, null, null);
  const fakeState = {
    uploadedSettings: parsed,
    sysInfo: null,
    wooInfo: null,
    wfInfo: null,
    elemInfo: null,
    scmInfo: null,
    customCss: "",
    themeInfo: null,
    analysisResults: analysis
  };

  const mdReport = generateSecondOpinionMarkdown(fakeState);
  assert(mdReport.includes("v2.4.34"), "Report must include v2.4.34 header");
});

console.log("\n==============================================");
console.log("🎉 ALL AREWEE-OPTIMIZER v2.4.34 TESTS PASSED!");
console.log("==============================================\n");
