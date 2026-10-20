const fs = require("fs");
const path = require("path");
const assert = require("assert");
const vm = require("vm");

console.log("=== Testing AreWee-Optimizer v2.8.36 Fixes ===");

const baseDir = path.resolve(__dirname, "..");
const files = {
  index: path.join(baseDir, "index.html"),
  app: path.join(baseDir, "js", "app.js"),
  rules: path.join(baseDir, "js", "rules.js"),
  exporter: path.join(baseDir, "js", "exporter.js"),
  styles: path.join(baseDir, "css", "styles.css"),
  readme: path.join(baseDir, "README.md"),
  gemini: fs.existsSync(path.join(baseDir, "gemini.md")) ? path.join(baseDir, "gemini.md") : path.join(baseDir, "GEMINI.md")
};

// 1. Version Parity across all 7 files
console.log("1. Checking version parity across all 7 files...");
const appContent = fs.readFileSync(files.app, "utf8");
const appVersionMatch = appContent.match(/const APP_VERSION = "([^"]+)";/);
assert(appVersionMatch, "APP_VERSION must be defined in app.js");
const expectedVersion = appVersionMatch[1];
assert.strictEqual(expectedVersion, "2.8.37", "Version must be 2.8.37");

const rulesContent = fs.readFileSync(files.rules, "utf8");
assert(rulesContent.includes(`(v${expectedVersion})`), `rules.js header (v${expectedVersion})`);

const exporterContent = fs.readFileSync(files.exporter, "utf8");
assert(exporterContent.includes(`(v${expectedVersion})`), `exporter.js header (v${expectedVersion})`);
assert(exporterContent.includes(`* Version: ${expectedVersion}`), `exporter.js helper plugin version ${expectedVersion}`);

const indexContent = fs.readFileSync(files.index, "utf8");
assert(indexContent.includes(`(v${expectedVersion})`), `index.html title (v${expectedVersion})`);
assert(indexContent.includes(`v=${expectedVersion}`), `index.html script/css tags v=${expectedVersion}`);
assert(indexContent.includes(`class="logo-tag">v${expectedVersion}</span>`), `index.html logo-tag v${expectedVersion}`);

const stylesContent = fs.readFileSync(files.styles, "utf8");
assert(stylesContent.includes(`(v${expectedVersion})`), `styles.css header (v${expectedVersion})`);

const readmeContent = fs.readFileSync(files.readme, "utf8");
assert(readmeContent.includes(`(v${expectedVersion})`), `README.md header (v${expectedVersion})`);

const geminiContent = fs.readFileSync(files.gemini, "utf8");
assert(geminiContent.includes(`(v${expectedVersion})`), `gemini.md architecture header (v${expectedVersion})`);
assert(geminiContent.includes(`**v${expectedVersion}:**`), `gemini.md changelog entry **v${expectedVersion}:**`);
console.log("   ✓ All 7 files match v2.8.36 perfectly.");

// Load VM context for rules and app parsers
const sandbox = {
  window: {},
  document: {
    addEventListener: () => {},
    getElementById: () => null,
    querySelectorAll: () => []
  },
  console: console,
  setTimeout: setTimeout,
  clearTimeout: clearTimeout,
  parseInt: parseInt,
  parseFloat: parseFloat,
  isNaN: isNaN,
  Object: Object,
  Array: Array,
  String: String,
  Number: Number,
  Math: Math,
  Date: Date,
  RegExp: RegExp,
  JSON: JSON
};
vm.createContext(sandbox);
vm.runInContext(rulesContent, sandbox);

// Extract helper functions from app.js into sandbox
const extractFn = (fnName) => {
  const match = appContent.match(new RegExp(`function\\s+${fnName}\\s*\\([\\s\\S]*?\\n  \\}`));
  if (!match) throw new Error(`Function ${fnName} not found in app.js`);
  vm.runInContext(match[0], sandbox);
};

extractFn("parseSystemInfoText");
extractFn("parseWordfenceDiagnostic");

// 2. Wordfence Plugin Parsing & Site Health SSOT
console.log("2. Testing Wordfence diagnostic plugin section tracking & active status...");
const wfDiagSample = `
## WordPress Plugins ##
| WooCommerce (woocommerce) - Version 9.8.0 | Active |
| LiteSpeed Cache (litespeed-cache) - Version 7.1.1 | Active |
| Old Inactive Plugin (old-plugin) - Version 1.0.0 | Inactive |

## Must-Use WordPress Plugins ##
| ManageWP Worker Loader (managewp-worker) - Version 1.0.0 | Active |

## WordPress Themes ##
| Astra (astra) - Version 4.8.0 | Active |
| Twenty Twenty-Four (twentytwentyfour) - Version 1.2 | Inactive |
`;

const parsedWf = sandbox.parseWordfenceDiagnostic(wfDiagSample);
assert(parsedWf.plugins.woocommerce === "9.8.0", "Active plugin WooCommerce parsed");
assert(parsedWf.plugins["litespeed-cache"] === "7.1.1", "Active plugin LiteSpeed Cache parsed");
assert(!parsedWf.plugins["old-plugin"], "Inactive plugin must NOT be parsed into active plugins");
assert(!parsedWf.plugins["managewp-worker"], "Must-Use plugins must NOT be parsed as regular plugins");
assert(!parsedWf.plugins.astra, "Themes must NOT be parsed as plugins");
assert(!parsedWf.plugins.twentytwentyfour, "Inactive themes must NOT be parsed as plugins");
assert.strictEqual(Object.keys(parsedWf.plugins).length, 2, "Exactly 2 active plugins parsed from Wordfence");
console.log("   ✓ Wordfence parser strictly confines to Active plugins in WordPress Plugins section.");

// Site Health Header count
const siteHealthSample = `
### wp-core ###
version: 6.8.0

### wp-plugins-active (17) ###
WooCommerce: version: 9.8.0, author: Automattic
LiteSpeed Cache: version: 7.1.1, author: LiteSpeed Technologies

### wp-plugins-inactive (2) ###
Old Inactive Plugin: version: 1.0.0

### wp-themes-inactive (1) ###
Twenty Twenty-Four: version: 1.2
`;

const parsedSys = sandbox.parseSystemInfoText(siteHealthSample);
assert.strictEqual(parsedSys["wp-plugins-active-count"], 17, "Extracted active plugins count 17 from header");
assert.strictEqual(parsedSys["wp-plugins-inactive-count"], 2, "Extracted inactive plugins count 2 from header");
assert.strictEqual(parsedSys["wp-themes-inactive-count"], 1, "Extracted inactive themes count 1 from header");
console.log("   ✓ Site Health parser extracts exact official counts from section headers.");

// 3. Testing Inactive Plugins & Inactive Themes Alerts in analyzeSystem
console.log("3. Testing Inactive Plugins and Themes Hygiene in analyzeSystem...");
const analysisHealthy = sandbox.analyzeSystem(
  parsedSys,
  null,
  parsedWf,
  null,
  { "purge-upgrade": "1" }
);

const alertInactivePlugins = analysisHealthy.alerts.find(a => a.id === "alert_inactive_plugins");
assert(alertInactivePlugins, "alert_inactive_plugins must be emitted when inactive plugins exist");
assert.strictEqual(alertInactivePlugins.scoreImpact, 0, "Inactive plugins alert must have scoreImpact: 0");
assert.strictEqual(alertInactivePlugins.type, "warning", "Inactive plugins alert must be warning");

const alertExcessThemes = analysisHealthy.alerts.find(a => a.id === "alert_excessive_inactive_themes");
assert(!alertExcessThemes, "With exactly 1 inactive theme, excessive themes alert must NOT be emitted");

const alertNoFallback = analysisHealthy.alerts.find(a => a.id === "alert_no_fallback_theme");
assert(!alertNoFallback, "With exactly 1 inactive theme, no fallback theme alert must NOT be emitted");

// Test excessive themes (>1)
const parsedSysExcessThemes = JSON.parse(JSON.stringify(parsedSys));
parsedSysExcessThemes["wp-themes-inactive-count"] = 3;
const analysisExcessThemes = sandbox.analyzeSystem(parsedSysExcessThemes, null, parsedWf, null, { "purge-upgrade": "1" });
const alertExcessThemes2 = analysisExcessThemes.alerts.find(a => a.id === "alert_excessive_inactive_themes");
assert(alertExcessThemes2, "alert_excessive_inactive_themes emitted when >1 inactive themes");
assert.strictEqual(alertExcessThemes2.scoreImpact, 0, "Excessive themes alert must have scoreImpact: 0");

// Test 0 inactive themes
const parsedSysNoThemes = JSON.parse(JSON.stringify(parsedSys));
parsedSysNoThemes["wp-themes-inactive-count"] = 0;
const analysisNoThemes = sandbox.analyzeSystem(parsedSysNoThemes, null, parsedWf, null, { "purge-upgrade": "1" });
const alertNoFallback2 = analysisNoThemes.alerts.find(a => a.id === "alert_no_fallback_theme");
assert(alertNoFallback2, "alert_no_fallback_theme emitted when 0 inactive themes");
assert.strictEqual(alertNoFallback2.scoreImpact, 0, "No fallback theme alert must have scoreImpact: 0");
console.log("   ✓ Inactive plugins and themes hygiene alerts correctly evaluated (0p impact).");

// 4. Testing "Att åtgärda" overview row and spelling in rules.js
console.log("4. Testing Att åtgärda in index.html & spelling in rules.js...");
assert(indexContent.includes('Att åtgärda'), "index.html has Att åtgärda metric row");
assert(!indexContent.includes('Avvikelser mot rek.'), "index.html does not have old Avvikelser mot rek.");
assert(rulesContent.includes('Begränsa inläggsrevisioner (WP_POST_REVISIONS)'), "rules.js has correct spelling Begränsa inläggsrevisioner");
assert(!rulesContent.includes('Begränsa inläggsreversioner'), "rules.js does not have typo inläggsreversioner");
console.log("   ✓ 'Att åtgärda' row and 'inläggsrevisioner' spelling verified.");

// 5. Testing Slot Badges in app.js
console.log("5. Testing Source Slot Badges in app.js...");
assert(appContent.includes("function getOptionSourceSlotBadge(o)"), "getOptionSourceSlotBadge helper defined in app.js");
assert(appContent.includes("📂 9. LiteSpeed"), "Default 9. LiteSpeed badge defined");
assert(appContent.includes("📂 4. Wordfence / wp-config"), "Wordfence / wp-config badge defined for revisions");
assert(appContent.includes("${categoryBadge}${sourceSlotBadge}${matchBadge}"), "sourceSlotBadge rendered in standard cards");
console.log("   ✓ Data source slot badges verified across all cards.");

console.log("\n🎉 All v2.8.36 verification tests passed successfully!");
