const fs = require('fs');
const path = require('path');
const assert = require('assert');

// Load exporter and rules
const exporterCode = fs.readFileSync(path.join(__dirname, '../js/exporter.js'), 'utf8');
const rulesCode = fs.readFileSync(path.join(__dirname, '../js/rules.js'), 'utf8');

// Create mock environment
const context = {
  window: {},
  console: console,
  TextEncoder: global.TextEncoder,
  atob: (str) => Buffer.from(str, 'base64').toString('binary')
};

const runInContext = (code) => {
  const fn = new Function('window', 'console', 'TextEncoder', 'atob', code);
  fn(context.window, context.console, context.TextEncoder, context.atob);
};

runInContext(exporterCode);
runInContext(rulesCode);

console.log("=========================================");
console.log("RUNNING AUTOMATED UNIT TESTS FOR v2.4.10");
console.log("=========================================");

const { 
  parseSettingsFile, 
  translateKeysToInternal, 
  translateKeysToLscwp, 
  php_serialize, 
  php_deserialize, 
  generateSyncPluginPhp, 
  KEY_MAPPING_TO_INTERNAL, 
  KEY_MAPPING_TO_LSCWP 
} = context.window;

const { 
  analyzeSystem, 
  getOptionComparison, 
  buildCompleteLscwpSettings 
} = context.window;

// Test 1: Mappings for delayed exclude
assert(KEY_MAPPING_TO_INTERNAL["optm-js_delayed_exc"] === "js_delayed_exclude", "Mapping optm-js_delayed_exc failed");
assert(KEY_MAPPING_TO_LSCWP["js_delayed_exclude"] === "optm-js_delayed_exc", "Mapping js_delayed_exclude failed");
console.log("✓ Test 1: Key mappings for js_delayed_exclude passed.");

// Test 2: Array unwrap for delayed excludes (avoid [object Object])
const rawWithArray = {
  "optm-js_delayed_exc": ["google-analytics.com", "gtm.js", "cookieconsent.js"]
};
const internalWithArray = translateKeysToInternal(rawWithArray);
assert(typeof internalWithArray.js_delayed_exclude === "string", "js_delayed_exclude should be string");
assert(internalWithArray.js_delayed_exclude.includes("google-analytics.com\ngtm.js"), "js_delayed_exclude should join with newlines");
console.log("✓ Test 2: Array-to-string normalization passed.");

// Test 3: Preserve non-boolean values in translateKeysToLscwp
const complexSettings = {
  "domain_key": "my_secret_key_12345",
  "server_ip": "192.168.1.100",
  "optm_js_defer": "2",
  "optm_font_display": "swap",
  "cache_browser_ttl": 2592000,
  "cache": 1,
  "cache_priv": 1,
  "js_delayed_exclude": "gtm.js\nanalytics.js"
};
const lscwpExport = translateKeysToLscwp(complexSettings);
assert(lscwpExport["hash"] === "my_secret_key_12345", "hash domain_key should be preserved");
assert(lscwpExport["server_ip"] === "192.168.1.100", "server_ip should be preserved");
assert(lscwpExport["optm-js_defer"] === "2", "optm-js_defer: 2 should be preserved");
assert(lscwpExport["optm-font_display"] === "swap", "optm-font_display: swap should be preserved");
assert(lscwpExport["cache-browser_ttl"] === 2592000, "cache-browser_ttl should be preserved");
assert(typeof lscwpExport["optm-js_delayed_exc"] === "object", "optm-js_delayed_exc should be serialized to array-like object");
assert(lscwpExport["optm-js_delayed_exc"][0] === "gtm.js", "optm-js_delayed_exc index 0 should match");
console.log("✓ Test 3: translateKeysToLscwp preservation of strings and non-booleans passed.");

// Test 4: Redis Object Cache & Browser Cache detection in getOptionComparison
const dummyEnv = {
  hasRedis: true,
  isRedisConnected: true,
  hasBrowserCache: true,
  hasHtaccessRules: true
};
const optCacheObj = { id: "cache_object", title: "Objektcachning", recommendedRaw: 1 };
const optCacheBrowser = { id: "cache_browser", title: "Webbläsarcachning", recommendedRaw: 1 };

const compObj = getOptionComparison(optCacheObj, { "cache-object": "0" }, dummyEnv);
assert(compObj.currentDisplay === "PÅ", "Redis should evaluate to PÅ even if .data had 0");
assert(compObj.isMatches === true, "Redis should be optimal");

const compBrowser = getOptionComparison(optCacheBrowser, { "cache-browser_ttl": "2592000" }, dummyEnv);
assert(compBrowser.currentDisplay === "PÅ", "Browser cache TTL > 0 should evaluate to PÅ");
assert(compBrowser.isMatches === true, "Browser cache should be optimal");
console.log("✓ Test 4: Redis & Browser Cache priority resolution passed.");

// Test 5: Sync plugin PHP code verification
const syncPhp = generateSyncPluginPhp();
assert(syncPhp.includes("Version: 2.4.10"), "Sync plugin version should be 2.4.10");
assert(syncPhp.includes("X-Optimizer-Token") && syncPhp.includes("X-WP-Optimizer-Token"), "Sync plugin should accept both headers");
console.log("✓ Test 5: Sync plugin PHP headers and version passed.");

console.log("=========================================");
console.log("ALL 5 TEST SUITES PASSED (100% SUCCESS)");
console.log("=========================================");
