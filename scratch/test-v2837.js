const fs = require("fs");
const path = require("path");
const assert = require("assert");
const vm = require("vm");

console.log("=== Testing AreWee-Optimizer v2.8.37 Fixes ===");

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
console.log("   ✓ All 7 files match v2.8.37 perfectly.");

// Load VM context for rules and app helpers
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

// Extract getOptionSourceSlotBadge from app.js
const badgeFnMatch = appContent.match(/function\s+getOptionSourceSlotBadge\s*\([\s\S]*?\n\s{6}\}/);
assert(badgeFnMatch, "getOptionSourceSlotBadge must be in app.js");
vm.runInContext(`var getOptionSourceSlotBadge = ${badgeFnMatch[0]};`, sandbox);

// 2. Testing Source Badges: No "Slot" word and precise source mappings
console.log("2. Testing Source Badges (word 'Slot' removed and correct source mappings)...");
const testBadge = (opt) => sandbox.getOptionSourceSlotBadge(opt);

// Check that word "Slot" is completely gone
assert(!testBadge({ id: "purge-upgrade" }).includes("Slot"), "LiteSpeed badge has no 'Slot'");
assert(!testBadge({ id: "wp_post_revisions" }).includes("Slot"), "WP post revisions badge has no 'Slot'");
assert(!testBadge({ id: "theme_navigation_menus" }).includes("Slot"), "Theme synergy badge has no 'Slot'");
assert(!testBadge({ id: "elem_css_print_method" }).includes("Slot"), "Elementor badge has no 'Slot'");

// Check correct source names matching datakällor
assert(testBadge({ id: "purge-upgrade" }).includes("📂 9. LiteSpeed"), "Default badge is 📂 9. LiteSpeed");
assert(testBadge({ id: "wp_post_revisions" }).includes("📂 4. Wordfence / wp-config"), "Revisions is 📂 4. Wordfence / wp-config");
assert(testBadge({ id: "wf_noabort" }).includes("📂 8. .htaccess / 4. Wordfence"), "noabort is 📂 8. .htaccess / 4. Wordfence");
assert(testBadge({ id: "wp_autoload_size" }).includes("📂 2. Autoload Status"), "Autoload is 📂 2. Autoload Status");
assert(testBadge({ id: "theme_header_footer_builder" }).includes("📂 6. Elementor"), "Elementor header/footer builder is 📂 6. Elementor");
assert(testBadge({ id: "theme_navigation_menus" }).includes("📂 6. Elementor"), "Elementor nav menus is 📂 6. Elementor");
assert(testBadge({ id: "theme_inactive_cleanup" }).includes("📂 1. WP-system"), "Inactive themes cleanup is 📂 1. WP-system");
assert(testBadge({ id: "theme_outdated_template_overrides" }).includes("📂 3. WooCommerce"), "Woo overrides is 📂 3. WooCommerce");
assert(testBadge({ id: "theme_code_architecture" }).includes("📂 1. WP-system / 7. SCM"), "Code architecture is 📂 1. WP-system / 7. SCM");
assert(testBadge({ id: "theme_typography_fonts" }).includes("📂 6. Elementor / 5. Tema"), "Fonts synergy is 📂 6. Elementor / 5. Tema");
assert(testBadge({ id: "elem_dom_optimization" }).includes("📂 6. Elementor"), "Elementor setting is 📂 6. Elementor");
assert(testBadge({ id: "wc_cart_fragments", tool: "woocommerce" }).includes("📂 3. WooCommerce"), "WooCommerce setting is 📂 3. WooCommerce");
console.log("   ✓ All source badges match datakällor format perfectly without 'Slot'.");

// 3. Testing unmeasuredLabel in rules.js (No "Slot" word)
console.log("3. Testing unmeasuredLabel in rules.js...");
const compFn = sandbox.getOptionComparison;
const unmeasuredElem = compFn({ id: "elem_css_print_method", tool: "elementor" }, {}, {});
assert.strictEqual(unmeasuredElem.isMeasured, false, "elem_css_print_method is unmeasured");
assert(unmeasuredElem.statusLabel.includes("6. Elementor"), "Unmeasured elementor references 6. Elementor");
assert(!unmeasuredElem.statusLabel.includes("Slot"), "Unmeasured elementor has no 'Slot'");

const unmeasuredThemeHf = compFn({ id: "theme_header_footer_builder", tool: "theme" }, {}, {});
assert(unmeasuredThemeHf.statusLabel.includes("6. Elementor"), "Unmeasured header/footer builder references 6. Elementor");
assert(!unmeasuredThemeHf.statusLabel.includes("Slot 5"), "Unmeasured header/footer builder does not say Slot 5");

const unmeasuredDefault = compFn({ id: "purge-upgrade" }, {}, {});
assert(unmeasuredDefault.statusLabel.includes("9. LiteSpeed"), "Default unmeasured references 9. LiteSpeed");
assert(!unmeasuredDefault.statusLabel.includes("Slot"), "Default unmeasured has no 'Slot'");
console.log("   ✓ unmeasuredLabel updated cleanly across all tools.");

// 4. Testing Inactive Plugins & Themes Alerts (Warning type & 0p impact)
console.log("4. Testing Inactive Plugins alert classification in analyzeSystem...");
const siteHealthSample = `
### wp-core ###
version: 6.8.0

### wp-plugins-active (17) ###
WooCommerce: version: 9.8.0, author: Automattic
LiteSpeed Cache: version: 7.1.1, author: LiteSpeed Technologies

### wp-plugins-inactive (3) ###
Old Plugin: version: 1.0.0

### wp-themes-inactive (2) ###
Twenty Twenty-Four: version: 1.2
Twenty Twenty-Three: version: 1.1
`;
const parsedSys = sandbox.parseSystemInfoText(siteHealthSample);
const analysis = sandbox.analyzeSystem(parsedSys, null, null, null, { "purge-upgrade": "1" });

const alertPlugins = analysis.alerts.find(a => a.id === "alert_inactive_plugins");
assert(alertPlugins, "alert_inactive_plugins emitted");
assert.strictEqual(alertPlugins.type, "warning", "Inactive plugins alert must be type: warning");
assert.strictEqual(alertPlugins.component, "plugins", "Inactive plugins alert component must be plugins");
assert.strictEqual(alertPlugins.scoreImpact, 0, "Inactive plugins alert scoreImpact must be 0");

const alertThemes = analysis.alerts.find(a => a.id === "alert_excessive_inactive_themes");
assert(alertThemes, "alert_excessive_inactive_themes emitted");
assert.strictEqual(alertThemes.type, "warning", "Excessive themes alert must be type: warning");
assert.strictEqual(alertThemes.scoreImpact, 0, "Excessive themes alert scoreImpact must be 0");
console.log("   ✓ Inactive plugins & themes alerts correctly emitted as type 'warning' with 0p impact.");

// 5. Testing Quick Filter Bar in index.html
console.log("5. Testing Quick Filter Bar in index.html...");
assert(indexContent.includes('data-filter="all"'), "index.html has data-filter='all'");
assert(indexContent.includes('Alla inställningar (Hela sajten)'), "index.html has 'Alla inställningar (Hela sajten)'");
assert(indexContent.includes('data-filter="tab"'), "index.html has data-filter='tab'");
assert(indexContent.includes('Vald flik'), "index.html has 'Vald flik'");
assert(indexContent.includes('data-filter="all_deviations"'), "index.html has 'all_deviations'");
assert(indexContent.includes('Åtgärdslista'), "index.html has 'Åtgärdslista'");
console.log("   ✓ Filter bar contains global all and tab-scoped options.");

console.log("\n🎉 All v2.8.37 verification tests passed 100% successfully!");
