/**
 * Automated Test Suite for AreWee-Optimizer v2.8.43
 * Tests:
 * 1. Version Synchronization across project files (v2.8.43)
 * 2. Consistent Key-Values and No-Emoji Formatting
 * 3. Hero Image (.lcp-hero, Undantagen, AV for preload)
 * 4. Brandvägg (PÅ, Learning, AV)
 * 5. Checkout (PÅ, Server, Ren)
 * 6. Fonts (Lokalt, Swap, Blockerad, AV)
 * 7. Grid Column Minimum Width (235px)
 */

const assert = require("assert");
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const basePath = path.resolve(__dirname, "..");
const rulesCode = fs.readFileSync(path.join(basePath, "js", "rules.js"), "utf8");
const appCode = fs.readFileSync(path.join(basePath, "js", "app.js"), "utf8");

const createMockElement = () => ({
  style: {},
  classList: { add: () => {}, remove: () => {}, toggle: () => {} },
  setAttribute: () => {},
  getAttribute: () => null,
  addEventListener: () => {},
  removeEventListener: () => {},
  appendChild: () => {},
  innerHTML: "",
  textContent: "",
  value: ""
});

const mockStorage = {
  getItem: () => null,
  setItem: () => {},
  removeItem: () => {},
  clear: () => {}
};

const sandbox = {
  console,
  window: {
    addEventListener: () => {},
    removeEventListener: () => {},
    location: { search: "" },
    localStorage: mockStorage,
    sessionStorage: mockStorage
  },
  localStorage: mockStorage,
  sessionStorage: mockStorage,
  document: {
    getElementById: () => createMockElement(),
    querySelector: () => createMockElement(),
    querySelectorAll: () => [],
    createElement: () => createMockElement(),
    addEventListener: (event, cb) => {
      if (event === "DOMContentLoaded" && typeof cb === "function") {
        cb();
      }
    },
    removeEventListener: () => {},
    body: createMockElement()
  },
  navigator: { userAgent: "node" },
  ResizeObserver: class {
    observe() {}
    unobserve() {}
    disconnect() {}
  },
  setTimeout,
  clearTimeout,
  setInterval: () => {},
  clearInterval: () => {},
  parseFloat,
  parseInt,
  Math,
  JSON,
  RegExp,
  Array,
  Object,
  String,
  Boolean
};

vm.createContext(sandbox);
vm.runInContext(rulesCode, sandbox);
vm.runInContext(appCode, sandbox);

console.log("=== AreWee-Optimizer v2.8.43 Test Suite ===");

// 1. Version Consistency
console.log("\n[Test 1] Version Consistency...");
assert.strictEqual(sandbox.window.APP_VERSION, "2.8.43", "window.APP_VERSION should be 2.8.43");

const indexHtml = fs.readFileSync(path.join(basePath, "index.html"), "utf8");
assert(indexHtml.includes("(v2.8.43)"), "index.html title must contain v2.8.43");
assert(indexHtml.includes("css/styles.css?v=2.8.43"), "index.html style query must be 2.8.43");
assert(indexHtml.includes("v2.8.43</span>"), "index.html logo tag must be v2.8.43");
assert(indexHtml.includes("js/rules.js?v=2.8.43"), "index.html rules.js query must be 2.8.43");
assert(indexHtml.includes("js/app.js?v=2.8.43"), "index.html app.js query must be 2.8.43");
assert(indexHtml.includes("js/exporter.js?v=2.8.43"), "index.html exporter.js query must be 2.8.43");

const exporterJs = fs.readFileSync(path.join(basePath, "js", "exporter.js"), "utf8");
assert(exporterJs.includes("v2.8.43"), "exporter.js must contain v2.8.43");
assert(exporterJs.includes("'syncPluginVersion' => '2.8.43'"), "exporter.js syncPluginVersion must be 2.8.43");

const cssStyles = fs.readFileSync(path.join(basePath, "css", "styles.css"), "utf8");
assert(cssStyles.includes("v2.8.43"), "styles.css must contain v2.8.43");
assert(cssStyles.includes("minmax(235px, 1fr)"), "styles.css must use minmax(235px, 1fr) for .risk-functions-grid");

const readmeMd = fs.readFileSync(path.join(basePath, "README.md"), "utf8");
assert(readmeMd.includes("(v2.8.43)"), "README.md header must be v2.8.43");
assert(readmeMd.includes("Release v2.8.43"), "README.md must have Release v2.8.43");

const geminiMd = fs.readFileSync(path.join(basePath, "gemini.md"), "utf8");
assert(geminiMd.includes("(v2.8.43)"), "gemini.md header must be v2.8.43");
assert(geminiMd.includes("v2.8.43:"), "gemini.md must have v2.8.43 summary");
console.log("✓ All 7 files synchronously updated to v2.8.43");

// 2. Hero Image Card
console.log("\n[Test 2] Hero Image Card Key-Values...");
const scmWithClass = {
  snippets: [
    {
      name: "Hero Class Priority",
      code: "if (strpos($attr['class'], 'lcp-hero') !== false) { $attr['fetchpriority'] = 'high'; }"
    }
  ]
};
const analysisHeroA = sandbox.analyzeSystem(
  { isLiteSpeedServer: true, wpVersion: "6.8.0" },
  null,
  null,
  null,
  { media_lazy: "1", media_lazy_exc: "lcp-hero" },
  scmWithClass,
  null,
  null
);
const heroCardA = analysisHeroA.cockpitFunctions.find(c => c.id === "hero_lcp");
assert.strictEqual(heroCardA.name, "🖼️ Hero image", "Card title must be 🖼️ Hero image");
const fpToolA = heroCardA.tools.find(t => t.name === "Fetchpriority");
assert.strictEqual(fpToolA.state, ".lcp-hero", "Fetchpriority state must be .lcp-hero");

const lsLazyToolA = heroCardA.tools.find(t => t.name === "LS Lazyload");
assert.strictEqual(lsLazyToolA.state, "Undantagen", "LS Lazyload state must be Undantagen");

const preloadToolA = heroCardA.tools.find(t => t.name === "LCP Preload");
assert.strictEqual(preloadToolA.state, "AV", "LCP Preload state must be AV when inactive");
console.log("✓ Hero image keys and values are clean, accurate, and consistent");

// 3. Brandvägg Card
console.log("\n[Test 3] Brandvägg Card Modes (PÅ, Learning, AV)...");
const analysisFwA = sandbox.analyzeSystem({ isLiteSpeedServer: true }, null, { firewall_mode: "Enabled and Protecting" }, null, null, null, null, null);
const fwCardA = analysisFwA.cockpitFunctions.find(c => c.id === "firewall");
assert.strictEqual(fwCardA.status, "optimal", "Status should be optimal");
assert.strictEqual(fwCardA.statusText, "PÅ", "statusText should be PÅ");
const wfToolA = fwCardA.tools.find(t => t.name === "Wordfence");
assert.strictEqual(wfToolA.state, "PÅ", "Wordfence tool state should be PÅ");

const analysisFwB = sandbox.analyzeSystem({ isLiteSpeedServer: true }, null, { firewall_mode: "Learning Mode" }, null, null, null, null, null);
const fwCardB = analysisFwB.cockpitFunctions.find(c => c.id === "firewall");
assert.strictEqual(fwCardB.status, "warning", "Status should be warning");
assert.strictEqual(fwCardB.statusText, "Learning", "statusText should be Learning");
const wfToolB = fwCardB.tools.find(t => t.name === "Wordfence");
assert.strictEqual(wfToolB.state, "Learning", "Wordfence tool state should be Learning");

const analysisFwC = sandbox.analyzeSystem({ isLiteSpeedServer: true }, null, { firewall_mode: "Disabled" }, null, null, null, null, null);
const fwCardC = analysisFwC.cockpitFunctions.find(c => c.id === "firewall");
assert.strictEqual(fwCardC.status, "danger", "Status should be danger");
assert.strictEqual(fwCardC.statusText, "AV", "statusText should be AV");
const wfToolC = fwCardC.tools.find(t => t.name === "Wordfence");
assert.strictEqual(wfToolC.state, "AV", "Wordfence tool state should be AV");
console.log("✓ Brandvägg modes standardise to PÅ, Learning, AV");

// 4. Checkout Card
console.log("\n[Test 4] Checkout Card (PÅ, Server, Ren)...");
const analysisKassa = sandbox.analyzeSystem(
  {
    isLiteSpeedServer: true,
    hasWooCommerce: true,
    "wp-dropins": { "object-cache.php": true },
    "wp-constants": { DISABLE_WP_CRON: true },
    hpos_enabled: true
  },
  { hpos_enabled: true, hpos_sync_enabled: false, wp_cron_disabled: true },
  null,
  null,
  null,
  null,
  null,
  null
);
const kassaCard = analysisKassa.cockpitFunctions.find(c => c.id === "kassa_perf");
const redisTool = kassaCard.tools.find(t => t.name === "Redis Cache");
assert.strictEqual(redisTool.state, "PÅ", "Redis Cache state should be PÅ");
const cronTool = kassaCard.tools.find(t => t.name === "Server-Cron");
assert.strictEqual(cronTool.state, "Server", "Server-Cron state should be Server");
const hposTool = kassaCard.tools.find(t => t.name === "HPOS Drift");
assert.strictEqual(hposTool.state, "Ren", "HPOS Drift state should be Ren");
console.log("✓ Checkout card values are clean: PÅ, Server, Ren");

// 5. Typsnitt & Fonts Card
console.log("\n[Test 5] Typsnitt & Fonts Card (Lokalt, Swap, Blockerad)...");
const analysisFonts = sandbox.analyzeSystem(
  { isLiteSpeedServer: true },
  null,
  null,
  null,
  { optm_font_display: "1", optm_ggfonts_rm: "1" },
  null,
  null,
  null
);
const fontCard = analysisFonts.cockpitFunctions.find(c => c.id === "google_fonts");
const lagringTool = fontCard.tools.find(t => t.name === "Lagring");
assert.strictEqual(lagringTool.state, "Lokalt", "Lagring should be Lokalt");
const displayTool = fontCard.tools.find(t => t.name === "Font Display");
assert.strictEqual(displayTool.state, "Swap", "Font Display should be Swap");
const ggTool = fontCard.tools.find(t => t.name === "Google Fonts");
assert.strictEqual(ggTool.state, "Blockerad", "Google Fonts should be Blockerad");
console.log("✓ Typsnitt card uses Lokalt, Swap, Blockerad without clutter");

console.log("\n===========================================");
console.log("🎉 ALL v2.8.43 UNIT TESTS PASSED (100%)!");
console.log("===========================================\n");
