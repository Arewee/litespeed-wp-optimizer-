/**
 * Automated Test Suite for AreWee-Optimizer v2.8.42
 * Tests:
 * 1. Version Synchronization across project files
 * 2. Multi-source Database Name Detection (sweetmini_wpX, eliminates dummy "Databas")
 * 3. Hero Image Cockpit Card (🖼️ Hero image, snippet fetchpriority with class, separate LS & Elementor lazyload, LCP Preload)
 * 4. Brandvägg Cockpit Card (Enabled and Protecting 🟢, Learning Mode 🟡, Disabled 🚨, LiteSpeed WAF 🟢)
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

console.log("=== AreWee-Optimizer v2.8.42 Test Suite ===");

// 1. Version Consistency
console.log("\n[Test 1] Version Consistency...");
assert.strictEqual(sandbox.window.APP_VERSION, "2.8.42", "window.APP_VERSION should be 2.8.42");

const indexHtml = fs.readFileSync(path.join(basePath, "index.html"), "utf8");
assert(indexHtml.includes("(v2.8.42)"), "index.html title must contain v2.8.42");
assert(indexHtml.includes("css/styles.css?v=2.8.42"), "index.html style query must be 2.8.42");
assert(indexHtml.includes("v2.8.42</span>"), "index.html logo tag must be v2.8.42");
assert(indexHtml.includes("js/rules.js?v=2.8.42"), "index.html rules.js query must be 2.8.42");
assert(indexHtml.includes("js/app.js?v=2.8.42"), "index.html app.js query must be 2.8.42");
assert(indexHtml.includes("js/exporter.js?v=2.8.42"), "index.html exporter.js query must be 2.8.42");

const exporterJs = fs.readFileSync(path.join(basePath, "js", "exporter.js"), "utf8");
assert(exporterJs.includes("v2.8.42"), "exporter.js must contain v2.8.42");
assert(exporterJs.includes("'syncPluginVersion' => '2.8.42'"), "exporter.js syncPluginVersion must be 2.8.42");

const cssStyles = fs.readFileSync(path.join(basePath, "css", "styles.css"), "utf8");
assert(cssStyles.includes("v2.8.42"), "styles.css must contain v2.8.42");

const readmeMd = fs.readFileSync(path.join(basePath, "README.md"), "utf8");
assert(readmeMd.includes("(v2.8.42)"), "README.md header must be v2.8.42");
assert(readmeMd.includes("Release v2.8.42"), "README.md must have Release v2.8.42");

const geminiMd = fs.readFileSync(path.join(basePath, "gemini.md"), "utf8");
assert(geminiMd.includes("(v2.8.42)"), "gemini.md header must be v2.8.42");
assert(geminiMd.includes("v2.8.42:"), "gemini.md must have v2.8.42 summary");
console.log("✓ All 7 files synchronously updated to v2.8.42");

// 2. Database Name Detection
console.log("\n[Test 2] Database Name Detection (sweetmini_wpX & No dummy 'Databas')...");

// Case 2a: Swedish Site Health text
const swedishSysInfoText = `
### wp-database ###
databasnamn: sweetmini_wp5
databasanvändare: sweetmini_u5
databashost: localhost
tabellprefix: wp_
`;
const parsedSwedish = sandbox.window.parseSystemInfoText(swedishSysInfoText);
assert.strictEqual(parsedSwedish["wp-database"].database_name, "sweetmini_wp5", "Should extract sweetmini_wp5 from Swedish sysinfo");

const analysisA = sandbox.analyzeSystem(parsedSwedish, {}, {}, null, null, null, null, null);
assert.strictEqual(analysisA.environment.databaseName, "sweetmini_wp5", "environment.databaseName should be sweetmini_wp5");

const dbCardA = analysisA.cockpitFunctions.find(c => c.id === "database_res");
assert.strictEqual(dbCardA.name, "🗄️ sweetmini_wp5", "Card 9 title should be 🗄️ sweetmini_wp5");
const dbNameToolA = dbCardA.tools.find(t => t.name === "DB_NAME");
assert.strictEqual(dbNameToolA.state, "sweetmini_wp5", "DB_NAME tool should be sweetmini_wp5");

// Case 2b: Wordfence Diagnostic text with MySQL table
const wfText = `
## MySQL ##
| Database | sweetmini_wp9 |
| Server | 10.5.25-MariaDB |
`;
const parsedWf = sandbox.window.parseWordfenceDiagnostic(wfText);
assert.strictEqual(parsedWf.database_name, "sweetmini_wp9", "Wordfence diagnostic should parse sweetmini_wp9");

const analysisB = sandbox.analyzeSystem({}, {}, parsedWf, null, null, null, null, null);
assert.strictEqual(analysisB.environment.databaseName, "sweetmini_wp9", "environment.databaseName should be sweetmini_wp9 from Wordfence");

// Case 2c: Empty / missing database name -> NEVER dummy "Databas"
const analysisC = sandbox.analyzeSystem({ hasSysInfo: true }, {}, {}, null, null, null, null, null);
const dbCardC = analysisC.cockpitFunctions.find(c => c.id === "database_res");
assert.strictEqual(dbCardC.name, "🗄️ Databas", "Missing DB name should show fallback title 🗄️ Databas");
const dbNameToolC = dbCardC.tools.find(t => t.name === "DB_NAME");
assert.strictEqual(dbNameToolC.state, "⚪ Ej detekterat", "Missing DB name should show ⚪ Ej detekterat, NEVER dummy 'Databas'");
console.log("✓ Database detection successfully extracts sweetmini_wpX and never shows dummy 'Databas'");

// 3. Hero image Cockpit Card
console.log("\n[Test 3] Hero Image Card (🖼️ Hero image, Fetchpriority class, LS/Elementor lazyload, LCP Preload)...");

// Case 3a: Snippet with class handling fetchpriority
const scmWithClass = {
  snippets: [
    {
      name: "Hero LCP Priority",
      code: "function add_fetchpriority($attr) { if (strpos($attr['class'], 'hero-banner') !== false) { $attr['fetchpriority'] = 'high'; } return $attr; }"
    }
  ]
};
const analysisHeroA = sandbox.analyzeSystem(
  { isLiteSpeedServer: true, wpVersion: "6.8.0" },
  null,
  null,
  null,
  { media_lazy: "1", media_lazy_exc: "hero-banner" },
  scmWithClass,
  null,
  null
);
const heroCardA = analysisHeroA.cockpitFunctions.find(c => c.id === "hero_lcp");
assert.strictEqual(heroCardA.name, "🖼️ Hero image", "Card title must be 🖼️ Hero image");
const fpToolA = heroCardA.tools.find(t => t.name === "Fetchpriority");
assert.strictEqual(fpToolA.state, "PÅ / Snippet (.hero-banner)", "Should detect specific snippet class .hero-banner");

const lsLazyToolA = heroCardA.tools.find(t => t.name === "LS Lazyload");
assert.strictEqual(lsLazyToolA.state, "PÅ / Undantagen ✓", "LS Lazyload should be PÅ / Undantagen ✓ when hero is in media_lazy_exc");

const elemLazyToolA = heroCardA.tools.find(t => t.name === "Elementor Lazyload");
assert.strictEqual(elemLazyToolA.state, "AV", "Elementor Lazyload should be AV when no elementor lazy");

const preloadToolA = heroCardA.tools.find(t => t.name === "LCP Preload");
assert.strictEqual(preloadToolA.state, "Inaktiv", "LCP Preload should be Inaktiv when no preload snippet");

// Case 3b: No snippet, but WP 6.8 -> Must NOT show "WP Core 6.3+", must show "Saknas"
const analysisHeroB = sandbox.analyzeSystem(
  { isLiteSpeedServer: true, wpVersion: "6.8.0" },
  null,
  null,
  null,
  { media_lazy: "0" },
  null,
  null,
  null
);
const heroCardB = analysisHeroB.cockpitFunctions.find(c => c.id === "hero_lcp");
const fpToolB = heroCardB.tools.find(t => t.name === "Fetchpriority");
assert.strictEqual(fpToolB.state, "Saknas", "Without snippet, fetchpriority must be Saknas (never WP Core 6.3+)");

const lsLazyToolB = heroCardB.tools.find(t => t.name === "LS Lazyload");
assert.strictEqual(lsLazyToolB.state, "AV", "LS Lazyload should be AV when media_lazy is 0");

// Case 3c: Snippet with preload
const scmWithPreload = {
  snippets: [
    {
      name: "Preload Hero",
      code: '<link rel="preload" as="image" href="/hero.webp">'
    }
  ]
};
const analysisHeroC = sandbox.analyzeSystem(
  { isLiteSpeedServer: true, wpVersion: "6.8.0" },
  null,
  null,
  null,
  { media_lazy: "1", media_lazy_exc: "" }, // No exclusion -> LCP-risk
  scmWithPreload,
  null,
  null
);
const heroCardC = analysisHeroC.cockpitFunctions.find(c => c.id === "hero_lcp");
assert.strictEqual(heroCardC.status, "warning", "Should warn for LCP-risk when LS Lazy is on without hero exclusion");
const lsLazyToolC = heroCardC.tools.find(t => t.name === "LS Lazyload");
assert.strictEqual(lsLazyToolC.state, "PÅ / LCP-risk 🟡", "Should be PÅ / LCP-risk 🟡");
const preloadToolC = heroCardC.tools.find(t => t.name === "LCP Preload");
assert.strictEqual(preloadToolC.state, 'PÅ / rel="preload"', 'Should be PÅ / rel="preload"');
console.log("✓ Hero image card correctly handles snippet class fetchpriority, separate lazyloads, and preload");

// 4. Brandvägg (Firewall)
console.log("\n[Test 4] Brandvägg Modes (Enabled and Protecting 🟢, Learning Mode 🟡, Disabled 🚨)...");

// Case 4a: Enabled and Protecting
const wfActive = { firewall_mode: "Enabled and Protecting" };
const analysisFwA = sandbox.analyzeSystem({ isLiteSpeedServer: true }, null, wfActive, null, null, null, null, null);
const fwCardA = analysisFwA.cockpitFunctions.find(c => c.id === "firewall");
assert.strictEqual(fwCardA.status, "optimal", "Status should be optimal");
assert.strictEqual(fwCardA.statusText, "Enabled and Protecting 🟢", "statusText should be Enabled and Protecting 🟢");
const wfToolA = fwCardA.tools.find(t => t.name === "Wordfence");
assert.strictEqual(wfToolA.state, "Enabled and Protecting 🟢", "Wordfence tool state should be Enabled and Protecting 🟢");

// Case 4b: Learning Mode
const wfLearning = { firewall_mode: "Learning Mode" };
const analysisFwB = sandbox.analyzeSystem({ isLiteSpeedServer: true }, null, wfLearning, null, null, null, null, null);
const fwCardB = analysisFwB.cockpitFunctions.find(c => c.id === "firewall");
assert.strictEqual(fwCardB.status, "warning", "Status should be warning");
assert.strictEqual(fwCardB.statusText, "Learning Mode 🟡", "statusText should be Learning Mode 🟡");
const wfToolB = fwCardB.tools.find(t => t.name === "Wordfence");
assert.strictEqual(wfToolB.state, "Learning Mode 🟡", "Wordfence tool state should be Learning Mode 🟡");

// Case 4c: Disabled
const wfDisabled = { firewall_mode: "Disabled" };
const analysisFwC = sandbox.analyzeSystem({ isLiteSpeedServer: true }, null, wfDisabled, null, null, null, null, null);
const fwCardC = analysisFwC.cockpitFunctions.find(c => c.id === "firewall");
assert.strictEqual(fwCardC.status, "danger", "Status should be danger");
assert.strictEqual(fwCardC.statusText, "Disabled 🚨", "statusText should be Disabled 🚨");
const wfToolC = fwCardC.tools.find(t => t.name === "Wordfence");
assert.strictEqual(wfToolC.state, "Disabled 🚨", "Wordfence tool state should be Disabled 🚨");

// Case 4d: No Wordfence, but LiteSpeed server
const analysisFwD = sandbox.analyzeSystem({ "wp-server": { httpd_software: "LiteSpeed" } }, null, null, null, null, null, null, null);
const fwCardD = analysisFwD.cockpitFunctions.find(c => c.id === "firewall");
assert.strictEqual(fwCardD.status, "optimal", "Status should be optimal");
assert.strictEqual(fwCardD.statusText, "LiteSpeed WAF 🟢", "statusText should be LiteSpeed WAF 🟢");
const wfToolD = fwCardD.tools.find(t => t.name === "Wordfence");
assert.strictEqual(wfToolD.state, "Inaktiv", "Wordfence tool state should be Inaktiv");
const lsWafToolD = fwCardD.tools.find(t => t.name === "LiteSpeed WAF");
assert.strictEqual(lsWafToolD.state, "Aktiv 🟢", "LiteSpeed WAF should be Aktiv 🟢");
console.log("✓ Brandvägg status and tools work flawlessly across all operational modes");

console.log("\n===========================================");
console.log("🎉 ALL v2.8.42 UNIT TESTS PASSED (100%)!");
console.log("===========================================\n");
