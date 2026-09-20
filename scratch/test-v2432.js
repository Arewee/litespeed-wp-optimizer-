/**
 * Automated test suite for AreWee-Optimizer v2.4.32
 * Tests:
 * 1. WordPress Core inclusion in Lazyload function card (3 tools)
 * 2. Lazyload Optimal state when plugins are AV and WP Core is PÅ
 * 3. Slim tool cards (8 on single row desktop grid)
 * 4. Light function cards (5 on single row desktop grid)
 * 5. Elementor Google Fonts parser with Swedish "Inaktivera"
 * 6. Version consistency across all modules (v2.4.32)
 * 7. Exporter Second Opinion report generation (v2.4.32)
 * 8. Full syntax and VM script execution
 */

const fs = require('fs');
const vm = require('vm');
const assert = require('assert');

console.log("=========================================");
console.log(" Running AreWee-Optimizer v2.4.32 Tests  ");
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

// Test 1: Lazyload includes 3 tools (LiteSpeed, Elementor, WordPress)
runTest("Lazyload includes 3 tools and flags Optimal via WordPress Core", () => {
  const mockSys = {
    "wp-server": { server_architecture: "LiteSpeed" },
    active_plugins: [
      { name: "LiteSpeed Cache", version: "7.1.1", slug: "litespeed-cache" }
    ]
  };
  const mockSettings = { media_lazy: "0" }; // LiteSpeed AV
  const mockElem = { e_lazy_load_images: "inactive" }; // Elementor AV

  const results = context.analyzeSystem(mockSys, null, null, mockElem, mockSettings, "", "", null, null);
  const lazyFn = results.cockpitFunctions.find(f => f.id === "lazyload");
  assert(lazyFn, "Lazyload function must exist");
  assert.strictEqual(lazyFn.tools.length, 3, "Lazyload must have 3 tools (LiteSpeed, Elementor, WordPress)");
  
  const lsTool = lazyFn.tools.find(t => t.name === "LiteSpeed");
  const elemTool = lazyFn.tools.find(t => t.name === "Elementor");
  const wpTool = lazyFn.tools.find(t => t.name === "WordPress");
  assert.strictEqual(lsTool.state, "AV", "LiteSpeed must be AV");
  assert.strictEqual(elemTool.state, "AV", "Elementor must be AV");
  assert.strictEqual(wpTool.state, "PÅ", "WordPress must be PÅ");
  assert.strictEqual(lazyFn.status, "optimal", "Lazyload status must be optimal via WordPress Core");
  assert.strictEqual(lazyFn.statusText, "Optimal", "Lazyload statusText must be Optimal");
});

// Test 2: Double activation remains danger
runTest("Lazyload double activation remains danger when both plugins are ON", () => {
  const mockSys = { "wp-server": { server_architecture: "LiteSpeed" } };
  const mockSettings = { media_lazy: "1" };
  const mockElem = { e_lazy_load_images: "active" };

  const results = context.analyzeSystem(mockSys, null, null, mockElem, mockSettings, "", "", null, null);
  const lazyFn = results.cockpitFunctions.find(f => f.id === "lazyload");
  assert.strictEqual(lazyFn.status, "danger", "Status must be danger");
  assert.strictEqual(lazyFn.statusText, "Dubbel aktivering", "Status text must be 'Dubbel aktivering'");
});

// Test 3: CSS single row responsive grid rules
runTest("CSS responsive grid definitions for tools and functions single-row desktop layout", () => {
  const cssContent = fs.readFileSync(__dirname + '/../css/styles.css', 'utf8');
  assert(cssContent.includes(".risk-status-grid"), "Must define .risk-status-grid");
  assert(cssContent.includes(".risk-functions-grid"), "Must define .risk-functions-grid");
  assert(cssContent.includes(".risk-function-card"), "Must define .risk-function-card");
  assert(cssContent.includes("repeat(8, 1fr)"), "Must define 8-column desktop grid for tools");
  assert(cssContent.includes("repeat(5, 1fr)"), "Must define 5-column desktop grid for functions");
});

// Test 4: Elementor Google Fonts parser with Swedish "Inaktivera"
runTest("Elementor Google Fonts parser handles 'Inaktivera'", () => {
  const elemDump = `
== Elementor ==
Version: 3.28.3
Google Fonts: Inaktivera
CSS Print Method: external
  `;
  const parseFn = context.window.parseElementorStatus || context.parseElementorStatus;
  const parsed = parseFn(elemDump);
  assert.strictEqual(parsed.google_fonts, false, "google_fonts must be false for Inaktivera");
});

// Test 5: Version consistency across all files (v2.4.32)
runTest("Version consistency across all files (v2.4.32)", () => {
  const indexHtml = fs.readFileSync(__dirname + '/../index.html', 'utf8');
  const appFile = fs.readFileSync(__dirname + '/../js/app.js', 'utf8');
  const rulesFile = fs.readFileSync(__dirname + '/../js/rules.js', 'utf8');
  const exporterFile = fs.readFileSync(__dirname + '/../js/exporter.js', 'utf8');
  const readmeFile = fs.readFileSync(__dirname + '/../README.md', 'utf8');
  const geminiFile = fs.readFileSync(__dirname + '/../gemini.md', 'utf8');

  assert(indexHtml.includes("v2.4.32"), "index.html must contain v2.4.32");
  assert(appFile.includes("v2.4.32") || appFile.includes("2.4.32"), "app.js must contain 2.4.32");
  assert(rulesFile.includes("v2.4.32") || rulesFile.includes("2.4.32"), "rules.js must contain 2.4.32");
  assert(exporterFile.includes("v2.4.32") || exporterFile.includes("2.4.32"), "exporter.js must contain 2.4.32");
  assert(readmeFile.includes("v2.4.32"), "README.md must contain v2.4.32");
  assert(geminiFile.includes("v2.4.32"), "gemini.md must contain v2.4.32");
});

// Test 6: Exporter Second Opinion report (v2.4.32)
runTest("Exporter Second Opinion markdown report (v2.4.32)", () => {
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
  assert(mdReport.includes("v2.4.32"), "Must contain v2.4.32 in header");
});

console.log("\n=========================================");
console.log(` ALL ${passedTests} TEST SUITES PASSED (0 ERRORS)     `);
console.log("=========================================");
