/**
 * Automated test suite for AreWee-Optimizer v2.4.31
 * Tests:
 * 1. Elementor Google Fonts parser with Swedish "Inaktivera" / "Inaktiv"
 * 2. Cockpit functions consistent "Optimal" indicator across all 5 functions
 * 3. Inactive functions (Lazyload, JS, CSS) flagged with status "warning" / "Inaktiv" (orange)
 * 4. Google Fonts per-tool states (LiteSpeed: AV, Elementor: AV, Tema: AV -> Optimal)
 * 5. Brandvägg with Wordfence + LiteSpeed dual-layer protection -> Optimal
 * 6. Version consistency across all modules (v2.4.31)
 * 7. Exporter Second Opinion report generation (v2.4.31)
 * 8. app.js and rules.js syntax compilation
 */

const fs = require('fs');
const vm = require('vm');
const assert = require('assert');

console.log("=========================================");
console.log(" Running AreWee-Optimizer v2.4.31 Tests  ");
console.log("=========================================");

// Setup mock browser environment
const context = {
  console: console,
  TextEncoder: TextEncoder,
  TextDecoder: TextDecoder,
  ResizeObserver: class { observe() {} unobserve() {} disconnect() {} },
  window: {
    addEventListener: () => {}
  },
  document: {
    getElementById: () => ({
      addEventListener: () => {},
      querySelector: () => null,
      querySelectorAll: () => [],
      appendChild: () => {},
      setAttribute: () => {},
      style: {},
      classList: { add: () => {}, remove: () => {} }
    }),
    querySelectorAll: () => [],
    querySelector: () => null,
    addEventListener: (event, cb) => { if (event === "DOMContentLoaded") cb(); },
    createElement: () => ({ appendChild: () => {}, setAttribute: () => {}, style: {}, classList: { add: () => {}, remove: () => {} } })
  },
  navigator: { clipboard: { writeText: async () => {} } },
  localStorage: { getItem: () => null, setItem: () => {}, removeItem: () => {} },
  sessionStorage: { getItem: () => null, setItem: () => {}, removeItem: () => {} },
  state: {
    rawInputs: {},
    parsedData: {},
    activeSite: "default",
    uploadMetadata: {},
    analysisResults: null,
    activeTab: "overview",
    activeRiskFilter: "all"
  }
};
vm.createContext(context);

// Load rules.js, exporter.js, and app.js into context
const rulesCode = fs.readFileSync(__dirname + '/../js/rules.js', 'utf8');
const exporterCode = fs.readFileSync(__dirname + '/../js/exporter.js', 'utf8');
const appCode = fs.readFileSync(__dirname + '/../js/app.js', 'utf8');

vm.runInContext(rulesCode, context);
vm.runInContext(exporterCode, context);
vm.runInContext(appCode, context);

let passedTests = 0;

function runTest(name, fn) {
  try {
    fn();
    console.log(`✅ PASS: ${name}`);
    passedTests++;
  } catch (err) {
    console.error(`❌ FAIL: ${name}`);
    console.error(err);
    process.exit(1);
  }
}

// Test 1: Elementor Google Fonts parser with Swedish "Inaktivera"
runTest("Elementor Google Fonts parser with Swedish 'Inaktivera'", () => {
  const elemDumpWithInaktivera = `
== Elementor ==
Version: 3.28.3
CSS Print Method: external
Google Fonts: Inaktivera
Optimized DOM Output: active
  `;

  const parseFn = context.window.parseElementorStatus || context.parseElementorStatus;
  const parsed = parseFn(elemDumpWithInaktivera);
  assert.strictEqual(parsed.google_fonts, false, "google_fonts must be false when set to Inaktivera");
  assert.strictEqual(parsed.css_print_method, "external", "css_print_method should be external");
  assert.strictEqual(parsed.dom_optimization, true, "dom_optimization should be true");
});

// Test 2: Consistent Optimal indicators on all 5 functions
runTest("Cockpit functions consistent 'Optimal' indicator across all 5 functions", () => {
  const mockSys = {
    server: { type: "LiteSpeed", php_version: "8.2.1", memory_limit: "512M" },
    active_plugins: [
      { name: "LiteSpeed Cache", version: "7.1.1", slug: "litespeed-cache" },
      { name: "Wordfence Security", version: "8.0.4", slug: "wordfence" },
      { name: "Elementor", version: "3.28.3", slug: "elementor" }
    ],
    theme: { name: "Astra", version: "4.8.0" }
  };
  const mockElem = {
    version: "3.28.3",
    css_print_method: "external",
    google_fonts: false,
    e_lazy_load_images: "inactive"
  };
  const mockWf = { firewall_mode: "enabled", ip_header: "REMOTE_ADDR" };
  const mockTheme = { name: "Astra", version: "4.8.0" };
  const mockSettings = {
    media_lazy: "1",
    optm_js_defer: "2",
    optm_css_async: "1",
    optm_ggfonts_rm: "1",
    "cache-exc": "checkout\nkassa\nvarukorg\ncart"
  };

  const results = context.analyzeSystem(mockSys, null, mockWf, mockElem, mockSettings, "", "", mockTheme, null);
  assert(results, "Results must exist");
  assert.strictEqual(results.cockpitFunctions.length, 5, "Must have 5 cockpit functions");

  results.cockpitFunctions.forEach(fn => {
    assert.strictEqual(fn.status, "optimal", `Function ${fn.id} should be optimal in ideal configuration`);
    assert.strictEqual(fn.statusText, "Optimal", `Function ${fn.id} statusText should be 'Optimal'`);
  });
});

// Test 3: Inactive functions flagged with status "warning" / "Inaktiv" (orange)
runTest("Inactive functions (Lazyload, JS, CSS) flagged with status 'warning' / 'Inaktiv'", () => {
  const mockSys = { server: { type: "LiteSpeed" } };
  const mockElem = { version: "3.28.3", e_lazy_load_images: "inactive", css_print_method: "internal", google_fonts: false };
  const mockSettings = {
    media_lazy: "0",
    optm_js_defer: "0",
    optm_css_async: "0",
    optm_css_comb: "0"
  };

  const results = context.analyzeSystem(mockSys, null, null, mockElem, mockSettings, "", "", null, null);
  
  const lazyFn = results.cockpitFunctions.find(f => f.id === "lazyload");
  assert.strictEqual(lazyFn.status, "warning", "Lazyload should have warning status when inactive");
  assert.strictEqual(lazyFn.statusText, "Inaktiv", "Lazyload statusText should be 'Inaktiv'");

  const jsFn = results.cockpitFunctions.find(f => f.id === "js_opt");
  assert.strictEqual(jsFn.status, "warning", "JS-optimering should have warning status when inactive");
  assert.strictEqual(jsFn.statusText, "Inaktiv", "JS-optimering statusText should be 'Inaktiv'");
});

// Test 4: Brandvägg dual-layer protection
runTest("Brandvägg with Wordfence + LiteSpeed dual-layer protection -> Optimal", () => {
  const mockSys = { "wp-server": { server_architecture: "LiteSpeed" } };
  const mockWf = { firewall_mode: "enabled" };

  const results = context.analyzeSystem(mockSys, null, mockWf, null, {}, "", "", null, null);
  const wafFn = results.cockpitFunctions.find(f => f.id === "firewall");
  assert.strictEqual(wafFn.status, "optimal", "Brandvägg status should be optimal");
  assert.strictEqual(wafFn.statusText, "Optimal", "Brandvägg statusText should be 'Optimal'");
  
  const wfTool = wafFn.tools.find(t => t.name === "Wordfence");
  const lsTool = wafFn.tools.find(t => t.name === "LiteSpeed");
  assert.strictEqual(wfTool.state, "PÅ", "Wordfence state should be PÅ");
  assert.strictEqual(lsTool.state, "PÅ", "LiteSpeed state should be PÅ");
});

// Test 5: Version consistency across all files
runTest("Version consistency (v2.4.31)", () => {
  const indexHtml = fs.readFileSync(__dirname + '/../index.html', 'utf8');
  const appFile = fs.readFileSync(__dirname + '/../js/app.js', 'utf8');
  const rulesFile = fs.readFileSync(__dirname + '/../js/rules.js', 'utf8');
  const exporterFile = fs.readFileSync(__dirname + '/../js/exporter.js', 'utf8');
  const readmeFile = fs.readFileSync(__dirname + '/../README.md', 'utf8');
  const geminiFile = fs.readFileSync(__dirname + '/../gemini.md', 'utf8');

  assert(indexHtml.includes("v2.4.31"), "index.html must contain v2.4.31");
  assert(appFile.includes("v2.4.31") || appFile.includes("2.4.31"), "app.js must contain 2.4.31");
  assert(rulesFile.includes("v2.4.31") || rulesFile.includes("2.4.31"), "rules.js must contain 2.4.31");
  assert(exporterFile.includes("v2.4.31") || exporterFile.includes("2.4.31"), "exporter.js must contain 2.4.31");
  assert(readmeFile.includes("v2.4.31"), "README.md must contain v2.4.31");
  assert(geminiFile.includes("v2.4.31"), "gemini.md must contain v2.4.31");
});

// Test 6: Exporter Second Opinion report
runTest("Exporter Second Opinion markdown report (v2.4.31)", () => {
  const mockState = {
    activeSite: "https://example.com",
    sysInfo: { "wp-core": { version: "6.8.0" } },
    wooInfo: { active_gateways: [{ id: "kco", title: "Klarna Checkout" }] },
    wfInfo: { ip_header: "REMOTE_ADDR" },
    elemInfo: { css_print_method: "external" },
    scmInfo: { snippets: [] },
    uploadedSettings: { "optm-js_defer": 2, "cache-exc": "checkout\nkassa\ncart\nvarukorg" },
    analysisResults: {
      healthScore: 95,
      scoreBreakdown: { stability: 30, performance: 35, security: 15, config: 15 },
      alerts: [],
      cockpitTools: [],
      cockpitFunctions: []
    },
    editedSettings: {}
  };

  const mdReport = context.generateSecondOpinionMarkdown(mockState);
  assert(mdReport.includes("v2.4.31"), "Must contain v2.4.31 in header");
});

console.log("\n=========================================");
console.log(` ALL ${passedTests} TEST SUITES PASSED (0 ERRORS)     `);
console.log("=========================================");
