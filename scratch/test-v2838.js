const fs = require("fs");
const path = require("path");
const assert = require("assert");
const vm = require("vm");

console.log("=== Testing AreWee-Optimizer v2.8.38 ===");

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
assert.strictEqual(expectedVersion, "2.8.38", "Version must be 2.8.38");

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
console.log("   ✓ All 7 files match v2.8.38 perfectly.");

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

// 2. Test Intelligent LiteSpeed Fallback for WP_POST_REVISIONS
console.log("2. Testing Intelligent LiteSpeed fallback for WP_POST_REVISIONS...");
const testBadge = (opt) => sandbox.getOptionSourceSlotBadge(opt);
assert(testBadge({ id: "wp_post_revisions" }).includes("📂 4. Wordfence / wp-config / 9. LiteSpeed"), "Revisions badge has 9. LiteSpeed");

// Test analysis when only LiteSpeed settings have db_optm-revisions_max: 5
const lscwpOnlySettings = {
  "db_optm-revisions_max": "5",
  "purge-upgrade": "1"
};
const analysisLsOnly = sandbox.analyzeSystem(null, null, null, null, lscwpOnlySettings);
assert.strictEqual(analysisLsOnly.environment.wpPostRevisions, "5", "wpPostRevisions extracted from LiteSpeed settings");

// Check option comparison
const compOpt = sandbox.getOptionComparison(
  { id: "wp_post_revisions", recommended: "5", recommendedRaw: "5", tool: "server" },
  lscwpOnlySettings,
  analysisLsOnly.environment
);
assert.strictEqual(compOpt.isMeasured, true, "wp_post_revisions is measured via LiteSpeed");
assert.strictEqual(compOpt.isMatches, true, "wp_post_revisions matches recommendation (5 <= 5)");
assert.strictEqual(compOpt.currentDisplay, "5", "currentDisplay is 5");
assert(!compOpt.statusLabel.includes("⚪ Värde saknas"), "Does not show 'Värde saknas'");
console.log("   ✓ LiteSpeed fallback for WP_POST_REVISIONS verified cleanly.");

// 3. Test Cockpit Rad 2 Cards: Kort 6 'Server', Kort 7 'Databas', Kort 8 'Checkout'
console.log("3. Testing Cockpit Rad 2 Cards (Server & Databas)...");

const siteHealthSample = `
### wp-core ###
version: 6.8.0

### wp-server ###
httpd_software: LiteSpeed
php_version: 8.1.28
time_limit: 300
memory_limit: 512M
upload_max_filesize: 128M
php_post_max_size: 128M
max_input_variables: 10000
opcode_cache_hit_rate: 99.2%

### wp-constants ###
WP_MEMORY_LIMIT: 512M
WP_MAX_MEMORY_LIMIT: 512M
WP_POST_REVISIONS: 5

### wp-database ###
database_name: sweetmini_wp5
server_version: 10.6.18-MariaDB
table_prefix: wp_
autoload_options_size: 1.4 MB

### wp-paths-sizes ###
uploads_size: 4,12 GB
plugins_size: 142,50 MB
themes_size: 15,20 MB
database_size: 38,40 MB
total_size: 4,33 GB
`;

const parsedSys = sandbox.parseSystemInfoText(siteHealthSample);
const analysisFull = sandbox.analyzeSystem(parsedSys, null, null, null, lscwpOnlySettings);

const cards = analysisFull.cockpitFunctions;
assert(cards && cards.length >= 7, "At least 7 function cards returned");

const cardServer = cards.find(c => c.id === "server_res");
assert(cardServer, "Kort 6 (server_res) exists");
assert.strictEqual(cardServer.name, "🖥️ Server", "Card 6 name must be 🖥️ Server");
assert(cardServer.tools.some(t => t.name === "PHP & Minne" && t.state.includes("512M")), "Card 6 includes PHP & Minne 512M");
assert(cardServer.tools.some(t => t.name === "Filuppladdning" && t.state.includes("128M")), "Card 6 includes Filuppladdning 128M");
assert(cardServer.tools.some(t => t.name === "Tidsgränser & Input" && t.state.includes("300s") && t.state.includes("10000")), "Card 6 includes Time 300s & Vars 10000");
assert(cardServer.tools.some(t => t.name === "OPcache Hit Rate" && t.state === "99%"), "Card 6 includes OPcache 99%");

const cardDatabase = cards.find(c => c.id === "database_res");
assert(cardDatabase, "Kort 7 (database_res) exists");
assert.strictEqual(cardDatabase.name, "🗄️ Databas", "Card 7 name must be 🗄️ Databas");
assert(cardDatabase.tools.some(t => t.name === "Databas & Motor" && t.state.includes("sweetmini_wp5") && t.state.includes("10.6.18")), "Card 7 includes sweetmini_wp5 (10.6.18)");
assert(cardDatabase.tools.some(t => t.name === "Databasstorlek" && t.state.includes("38,40 MB") && t.state.includes("wp_")), "Card 7 includes 38,40 MB & prefix wp_");
assert(cardDatabase.tools.some(t => t.name === "Autoload-data" && t.state.includes("1.4 MB")), "Card 7 includes Autoload-data 1.4 MB");
assert(cardDatabase.tools.some(t => t.name === "Diskfördelning" && t.state.includes("4,12 GB") && t.state.includes("142,50 MB")), "Card 7 includes Uploads 4,12 GB & Tillägg");
assert(cardDatabase.tools.some(t => t.name === "Total Webbplatsdisk" && t.state.includes("4,33 GB")), "Card 7 includes Total 4,33 GB");

console.log("   ✓ Cockpit cards 🖥️ Server and 🗄️ Databas verified with 100% correct telemetry.");

// 4. Test Thresholds, Warnings and Health Scores Intact
console.log("4. Verifying thresholds, warnings and Health Scores remain completely intact...");

// Autoload 1.4 MB (> 800 KB, < 1.5 MB) should trigger alert_autoload_warning and set Card 7 status to warning
const hasAutoloadWarn = analysisFull.alerts.some(a => a.id === "alert_autoload_warning");
assert(hasAutoloadWarn, "alert_autoload_warning triggered for 1.4 MB autoload (>800 KB)");
assert.strictEqual(cardDatabase.status, "warning", "Card 7 status reflects warning when autoload is > 800 KB");
assert.strictEqual(cardDatabase.statusText, "Autoload Varning 🟡", "Card 7 statusText reflects warning");

// Test critical autoload > 1.5 MB (e.g. 1.8 MB)
const critSysSample = siteHealthSample.replace("autoload_options_size: 1.4 MB", "autoload_options_size: 1.8 MB");
const parsedCritSys = sandbox.parseSystemInfoText(critSysSample);
const analysisCrit = sandbox.analyzeSystem(parsedCritSys, null, null, null, lscwpOnlySettings);
const cardCritDb = analysisCrit.cockpitFunctions.find(c => c.id === "database_res");
assert(analysisCrit.alerts.some(a => a.id === "alert_autoload_critical"), "alert_autoload_critical triggered for 1.8 MB autoload (>1.5 MB)");
assert.strictEqual(cardCritDb.status, "danger", "Card 7 status reflects danger for 1.8 MB autoload");
assert.strictEqual(cardCritDb.statusText, "Autoload Kritisk 🚨", "Card 7 statusText reflects critical");

// Test optimal autoload < 800 KB (e.g. 250 KB)
const optSysSample = siteHealthSample.replace("autoload_options_size: 1.4 MB", "autoload_options_size: 250 KB");
const parsedOptSys = sandbox.parseSystemInfoText(optSysSample);
const analysisOpt = sandbox.analyzeSystem(parsedOptSys, null, null, null, lscwpOnlySettings);
const cardOptDb = analysisOpt.cockpitFunctions.find(c => c.id === "database_res");
assert.strictEqual(cardOptDb.status, "optimal", "Card 7 status is optimal for 250 KB autoload");
assert.strictEqual(cardOptDb.statusText, "Optimal 🟢", "Card 7 statusText is Optimal 🟢");

// Server with optimal memory/exec time and 99% opcache should be optimal
assert.strictEqual(cardServer.status, "optimal", "Card 6 status is optimal when no server alerts");
assert.strictEqual(cardServer.statusText, "Optimal 🟢", "Card 6 statusText is Optimal 🟢");

console.log("   ✓ Existing rules, thresholds and alerts verified 100% intact.");

console.log("\n🎉 All v2.8.38 automated verification tests passed 100% successfully!");
