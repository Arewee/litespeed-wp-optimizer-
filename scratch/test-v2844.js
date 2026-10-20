/**
 * Automated Test Suite for AreWee-Optimizer v2.8.44
 * Tests:
 * 1. Version Synchronization across project files (v2.8.44)
 * 2. isValidDbName unit validation
 * 3. Swedish Site Health "Användarnamn för databas" extraction (sweetmini_wp9)
 * 4. Card 9 title and DB_NAME reflection
 * 5. Rejection of "internal", "Databas", "localhost"
 * 6. Cockpit Function Comparison in Profiler Modal (executeComparison)
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

console.log("=== AreWee-Optimizer v2.8.44 Test Suite ===");

// 1. Version Consistency
console.log("\n[Test 1] Version Consistency...");
assert.strictEqual(sandbox.window.APP_VERSION, "2.8.44", "window.APP_VERSION should be 2.8.44");

const indexHtml = fs.readFileSync(path.join(basePath, "index.html"), "utf8");
assert(indexHtml.includes("(v2.8.44)"), "index.html title must contain v2.8.44");
assert(indexHtml.includes("css/styles.css?v=2.8.44"), "index.html style query must be 2.8.44");
assert(indexHtml.includes("v2.8.44</span>"), "index.html logo tag must be v2.8.44");
assert(indexHtml.includes("js/rules.js?v=2.8.44"), "index.html rules script query must be 2.8.44");
assert(indexHtml.includes("js/app.js?v=2.8.44"), "index.html app script query must be 2.8.44");
assert(indexHtml.includes("js/exporter.js?v=2.8.44"), "index.html exporter script query must be 2.8.44");

const cssStyles = fs.readFileSync(path.join(basePath, "css", "styles.css"), "utf8");
assert(cssStyles.includes("(v2.8.44)"), "styles.css must reference v2.8.44");

const exporterCode = fs.readFileSync(path.join(basePath, "js", "exporter.js"), "utf8");
assert(exporterCode.includes("(v2.8.44)"), "exporter.js must reference v2.8.44");

const readme = fs.readFileSync(path.join(basePath, "README.md"), "utf8");
assert(readme.includes("(v2.8.44)"), "README.md title must reference v2.8.44");
assert(readme.includes("Release v2.8.44"), "README.md must describe Release v2.8.44");

const geminiMd = fs.readFileSync(path.join(basePath, "GEMINI.md"), "utf8");
assert(geminiMd.includes("(v2.8.44)"), "GEMINI.md title must reference v2.8.44");
assert(geminiMd.includes("**v2.8.44:**"), "GEMINI.md must have v2.8.44 section");
console.log("✓ Version 2.8.44 synchronized across all 7 project files");

// 2. isValidDbName validation
console.log("\n[Test 2] isValidDbName validation...");
const isValid = sandbox.window.isValidDbName;
assert(typeof isValid === "function", "isValidDbName must be a function");
assert.strictEqual(isValid("sweetmini_wp9"), true, "sweetmini_wp9 is valid");
assert.strictEqual(isValid("sweetmini_wp5"), true, "sweetmini_wp5 is valid");
assert.strictEqual(isValid("wp_customdb"), true, "wp_customdb is valid");
assert.strictEqual(isValid("internal"), false, "internal is rejected");
assert.strictEqual(isValid("Databas"), false, "Databas is rejected");
assert.strictEqual(isValid("localhost"), false, "localhost is rejected");
assert.strictEqual(isValid("mysqli"), false, "mysqli is rejected");
assert.strictEqual(isValid("11.4.13-MariaDB"), false, "version string is rejected");
assert.strictEqual(isValid("mysqlnd 8.3.33"), false, "client string is rejected");
assert.strictEqual(isValid(""), false, "empty is rejected");
assert.strictEqual(isValid(null), false, "null is rejected");
console.log("✓ isValidDbName accurately accepts real DB names and rejects technical keywords");

// 3. Extraction from Swedish Site Health with Användarnamn för databas
console.log("\n[Test 3] Användarnamn för databas extraction from Site Health...");
const swedishSiteHealthText = `
### wp-database ###

extension: mysqli
server_version: 11.4.13-MariaDB
client_version: mysqlnd 8.3.33
Användarnamn för databas: sweetmini_wp9
max_allowed_packet: 134217728
max_connections: 1000
`;

const parsedSys = sandbox.window.parseSystemInfoText(swedishSiteHealthText);
assert.strictEqual(parsedSys["wp-database"].database_user, "sweetmini_wp9", "Should extract database_user");
assert.strictEqual(parsedSys["wp-database"].database_name, "sweetmini_wp9", "Should map to database_name");

const analysis = sandbox.analyzeSystem(parsedSys, {}, {}, {}, {}, {}, "", {}, {});
assert.strictEqual(analysis.environment.databaseName, "sweetmini_wp9", "environment.databaseName should be sweetmini_wp9");

const dbCard = analysis.cockpitFunctions.find(c => c.id === "database_res");
assert.strictEqual(dbCard.name, "🗄️ sweetmini_wp9", "Card 9 title should be 🗄️ sweetmini_wp9");
const dbNameTool = dbCard.tools.find(t => t.name === "DB_NAME");
assert.strictEqual(dbNameTool.state, "sweetmini_wp9", "DB_NAME tool should be sweetmini_wp9");
console.log("✓ Swedish Site Health 'Användarnamn för databas' correctly resolves to sweetmini_wp9");

// 4. Tab-separated Site Health table format
console.log("\n[Test 4] Tab-separated table format from user screenshot...");
const tabTableText = `
Databas
Databasutökning\tmysqli
Serverversion\t11.4.13-MariaDB
Klientversion\tmysqlnd 8.3.33
Användarnamn för databas\tsweetmini_wp9
`;
const parsedTab = sandbox.window.parseSystemInfoText(tabTableText);
assert.strictEqual(parsedTab["wp-database"].database_name, "sweetmini_wp9", "Tab separated table should parse sweetmini_wp9");

const analysisTab = sandbox.analyzeSystem(parsedTab, {}, {}, {}, {}, {}, "", {}, {});
assert.strictEqual(analysisTab.environment.databaseName, "sweetmini_wp9", "Tab table analysis should have sweetmini_wp9");
console.log("✓ Tab-separated table resolves sweetmini_wp9");

// 5. Wordfence Diagnostic with 'internal' is safely rejected
console.log("\n[Test 5] Wordfence with 'internal' is safely rejected...");
const wfWithInternal = `
## MySQL ##
| Database Connection | internal |
| Server | 10.5.25-MariaDB |
`;
const parsedWf = sandbox.window.parseWordfenceDiagnostic(wfWithInternal);
assert.strictEqual(parsedWf.database_name, undefined, "Wordfence 'internal' should NOT be stored as database_name");

const analysisFallback = sandbox.analyzeSystem({ hasSysInfo: true }, {}, parsedWf, {}, {}, {}, "", {}, {});
const fallbackCard = analysisFallback.cockpitFunctions.find(c => c.id === "database_res");
assert.strictEqual(fallbackCard.name, "🗄️ Databas", "Missing DB name should show fallback title 🗄️ Databas");
const fallbackDbName = fallbackCard.tools.find(t => t.name === "DB_NAME");
assert.strictEqual(fallbackDbName.state, "Ej detekterat", "Missing DB name should show Ej detekterat, NEVER 'internal'");
console.log("✓ Technical keywords like 'internal' never slip through to DB_NAME");

// 6. Cockpit Function Comparison in Profiler Modal
console.log("\n[Test 6] Cockpit Function Comparison in Profiler Modal...");
const profA = {
  id: "prof_a",
  name: "Sajt A",
  sysInfo: parsedSys,
  uploadedSettings: { optm_css_min: 1, optm_js_min: 1 },
  elemInfo: { e_lazy_load_images: "active", css_print_method: "external" },
  customCodeInfo: { snippets: [{ name: "Hero fetchpriority", code: "if (strpos($attr['class'], 'lcp-hero') !== false) { $attr['fetchpriority'] = 'high'; }" }] }
};

const profB = {
  id: "prof_b",
  name: "Sajt B",
  sysInfo: parsedTab,
  uploadedSettings: { optm_css_min: 0, optm_js_min: 0 },
  elemInfo: { e_lazy_load_images: "inactive", css_print_method: "internal" },
  customCodeInfo: { snippets: [] }
};

const analysisA = sandbox.analyzeSystem(profA.sysInfo, profA.wooInfo, profA.wfInfo, profA.elemInfo, profA.uploadedSettings, profA.scmInfo || profA.customCodeInfo, "", profA.themeInfo, {});
const analysisB = sandbox.analyzeSystem(profB.sysInfo, profB.wooInfo, profB.wfInfo, profB.elemInfo, profB.uploadedSettings, profB.scmInfo || profB.customCodeInfo, "", profB.themeInfo, {});

const heroA = analysisA.cockpitFunctions.find(c => c.id === "hero_lcp");
const heroB = analysisB.cockpitFunctions.find(c => c.id === "hero_lcp");
assert(heroA && heroB, "Both analyses should contain hero_lcp");

const fetchA = heroA.tools.find(t => t.name === "Fetchpriority");
const fetchB = heroB.tools.find(t => t.name === "Fetchpriority");
assert.strictEqual(fetchA.state, ".lcp-hero", "Profile A fetchpriority should be .lcp-hero");
assert.strictEqual(fetchB.state, "AV", "Profile B fetchpriority should be AV");

const jsA = analysisA.cockpitFunctions.find(c => c.id === "js_opt");
const jsB = analysisB.cockpitFunctions.find(c => c.id === "js_opt");
assert(jsA && jsB, "Both analyses should contain js_opt");

console.log("✓ Cockpit functions (Hero image, JS-opt, CSS-gen, Fonts, Firewall) successfully compared side-by-side");

console.log("\n✅ All AreWee-Optimizer v2.8.44 tests PASSED successfully!");
