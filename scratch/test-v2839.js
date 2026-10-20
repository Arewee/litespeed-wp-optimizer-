const fs = require('fs');
const path = require('path');
const assert = require('assert');
const vm = require('vm');

console.log("=== AreWee-Optimizer v2.8.39 Verification Suite ===");

const rootDir = path.resolve(__dirname, '..');
const currentVer = "2.8.39";

// 1. Version Parity Check
console.log("1. Checking version parity across all 7 files...");
const indexHtml = fs.readFileSync(path.join(rootDir, 'index.html'), 'utf8');
const appJs = fs.readFileSync(path.join(rootDir, 'js/app.js'), 'utf8');
const rulesJs = fs.readFileSync(path.join(rootDir, 'js/rules.js'), 'utf8');
const exporterJs = fs.readFileSync(path.join(rootDir, 'js/exporter.js'), 'utf8');
const stylesCss = fs.readFileSync(path.join(rootDir, 'css/styles.css'), 'utf8');
const readmeMd = fs.readFileSync(path.join(rootDir, 'README.md'), 'utf8');
const geminiMd = fs.readFileSync(path.join(rootDir, 'gemini.md'), 'utf8');

assert(indexHtml.includes(`styles.css?v=${currentVer}`), `index.html styles.css?v=${currentVer}`);
assert(indexHtml.includes(`js/rules.js?v=${currentVer}`), `index.html rules.js?v=${currentVer}`);
assert(indexHtml.includes(`js/exporter.js?v=${currentVer}`), `index.html exporter.js?v=${currentVer}`);
assert(indexHtml.includes(`js/app.js?v=${currentVer}`), `index.html app.js?v=${currentVer}`);
assert(indexHtml.includes(`class="logo-tag">v${currentVer}</span>`), `index.html logo-tag v${currentVer}`);
assert(indexHtml.includes(`Nuvarande rekommendationer (v${currentVer})`), `index.html recommendations modal v${currentVer}`);

assert(appJs.includes(`Version: ${currentVer}`), `app.js header v${currentVer}`);
assert(appJs.includes(`const APP_VERSION = "${currentVer}";`), `app.js APP_VERSION ${currentVer}`);

assert(rulesJs.includes(`AreWee WP-Optimizer - Dynamic Rules & Compatibility Engine (v${currentVer})`), `rules.js header v${currentVer}`);

assert(exporterJs.includes(`AreWee WP-Optimizer - Exporter / Serializer (v${currentVer})`), `exporter.js header v${currentVer}`);
assert(exporterJs.includes(`'syncPluginVersion' => '${currentVer}'`), `exporter.js syncPluginVersion ${currentVer}`);

assert(stylesCss.includes(`AreWee WP-Optimizer - Stylesheet (v${currentVer})`), `styles.css header v${currentVer}`);
assert(readmeMd.includes(`# LiteSpeed Cache & WordPress Optimizer Dashboard (v${currentVer})`), `README.md header v${currentVer}`);
assert(geminiMd.includes(`Projektets Riktlinjer & Arkitektur (v${currentVer})`), `gemini.md header v${currentVer}`);

console.log(`   ✓ Version parity verified for v${currentVer} across all 7 files.`);

// 2. CSS & Layout Verification
console.log("2. Checking CSS span-2 and function-tools-grid...");
assert(stylesCss.includes(".risk-function-card.span-2"), "styles.css contains .risk-function-card.span-2");
assert(stylesCss.includes("grid-column: span 2;"), "styles.css has grid-column: span 2");
assert(stylesCss.includes(".function-tools-grid"), "styles.css contains .function-tools-grid");
assert(appJs.includes('span-2'), "app.js attaches span-2");
assert(appJs.includes('function-tools-grid'), "app.js uses function-tools-grid");
console.log("   ✓ CSS classes and app.js integration verified.");

// 3. VM Sandbox Logic Testing
console.log("3. Testing sanitizeDiskSizeString, hero_lcp, font card & layout in sandbox...");
const sandbox = {
  console,
  setTimeout: () => {},
  clearTimeout: () => {},
  document: {
    addEventListener: () => {},
    getElementById: () => null,
    createElement: () => ({ style: {}, classList: { add: () => {}, remove: () => {} } })
  },
  window: {}
};
vm.createContext(sandbox);
vm.runInContext(rulesJs, sandbox);

const extractFn = (fnName) => {
  const match = appJs.match(new RegExp(`function\\s+${fnName}\\s*\\([\\s\\S]*?\\n  \\}`));
  if (!match) throw new Error(`Function ${fnName} not found in app.js`);
  vm.runInContext(match[0], sandbox);
};
extractFn("parseSystemInfoText");

// Test raw byte sanitization
assert.strictEqual(sandbox.sanitizeDiskSizeString("455,31 MB (477429760 bytes)"), "455,31 MB");
assert.strictEqual(sandbox.sanitizeDiskSizeString("15,10 MB (15835136 bytes)"), "15,10 MB");
assert.strictEqual(sandbox.sanitizeDiskSizeString("4,12 GB (4423876608 bytes)"), "4,12 GB");
assert.strictEqual(sandbox.sanitizeDiskSizeString("1,4 MB (1468006 bytes)"), "1,4 MB");
assert.strictEqual(sandbox.sanitizeDiskSizeString("512 MB"), "512 MB");
console.log("   ✓ sanitizeDiskSizeString cleans raw byte parentheses perfectly.");

// System Info fixture with raw byte parentheses
const siteHealthFixture = `
### wp-core ###
version: 6.8.0
site_url: https://sweetmini.se
home_url: https://sweetmini.se
permalink_structure: /%postname%/

### wp-database ###
database_name: sweetmini_wp5
server_version: 10.6.18-MariaDB-cll-lve
table_prefix: wp_
autoload_options_size: 1,4 MB (1468006 bytes)

### wp-server ###
server_architecture: Linux 5.14.0 x86_64
httpd_software: LiteSpeed
php_version: 8.3.12 (Supports 64bit values)
php_memory_limit: 512M
upload_max_filesize: 128M
post_max_size: 128M
max_execution_time: 300
max_input_vars: 10000
opcode_cache_hit_rate: 99.4%
opcode_cache_status: enabled

### wp-paths-sizes ###
wordpress_size: 60,00 MB (62914560 bytes)
uploads_size: 455,31 MB (477429760 bytes)
themes_size: 12,20 MB (12792832 bytes)
plugins_size: 120,40 MB (126248960 bytes)
database_size: 15,10 MB (15835136 bytes)
total_size: 647,91 MB (679383040 bytes)

### wp-plugins-active (1) ###
woocommerce: version: 9.8.0, author: Automattic
`;

const parsedSys = sandbox.parseSystemInfoText(siteHealthFixture);

const lscwpSettings = {
  media_lazy: "1",
  media_lazy_exc: "hero-banner\nfeatured-image",
  optm_font_display: "1"
};

const elemInfo = {
  primary_font: "Outfit"
};

const analysis = sandbox.analyzeSystem(parsedSys, { version: "9.8.0" }, null, elemInfo, lscwpSettings);

assert.strictEqual(analysis.environment.uploadsSize, "455,31 MB");
assert.strictEqual(analysis.environment.databaseSize, "15,10 MB");
assert.strictEqual(analysis.environment.pluginsSize, "120,40 MB");
assert.strictEqual(analysis.environment.themesSize, "12,20 MB");
assert.strictEqual(analysis.environment.totalSize, "647,91 MB");
assert.strictEqual(analysis.environment.wordpressSize, "60,00 MB");
const cards = analysis.cockpitFunctions;

assert(Array.isArray(cards), "cockpitFunctions is array");
assert.strictEqual(cards.length, 9, "Must have exactly 9 cockpit function cards when WooCommerce is active");

// Verify card order
const cardIds = cards.map(c => c.id);
assert.strictEqual(JSON.stringify(cardIds), JSON.stringify([
  "lazyload",
  "hero_lcp",
  "js_opt",
  "css_gen",
  "google_fonts",
  "firewall",
  "kassa_perf",
  "server_res",
  "database_res"
]), "Cards must match exact requested ordering: lazyload -> hero_lcp -> js_opt -> css_gen -> google_fonts -> firewall -> kassa_perf -> server_res -> database_res");
console.log("   ✓ Cockpit Rad 2 card ordering verified: 🛒 Checkout precedes 🖥️ Server and 🗄️ Databas.");

// Verify Card 2: Hero & LCP
const heroCard = cards.find(c => c.id === "hero_lcp");
assert(heroCard, "Hero & LCP card exists");
assert.strictEqual(heroCard.name, "🖼️ Hero & LCP");
assert.strictEqual(heroCard.status, "optimal");
assert(heroCard.tools.some(t => t.name === "Fetchpriority (High)" && t.state.includes("WP Core 6.3+")), "WP 6.8 has native fetchpriority");
assert(heroCard.tools.some(t => t.name === "Hero Lazyload" && t.state.includes("Undantagen ✓")), "Hero is excluded in media_lazy_exc");
console.log("   ✓ Card 2 🖼️ Hero & LCP verified with optimal fetchpriority and exclusion.");

// Verify Card 2 LCP-Risk when hero NOT excluded
const lscwpNoExc = { media_lazy: "1", media_lazy_exc: "" };
const analysisLcpRisk = sandbox.analyzeSystem(parsedSys, { version: "9.8.0" }, null, elemInfo, lscwpNoExc);
const heroRiskCard = analysisLcpRisk.cockpitFunctions.find(c => c.id === "hero_lcp");
assert.strictEqual(heroRiskCard.status, "warning", "Status is warning when hero is lazyloaded without exclusion");
assert.strictEqual(heroRiskCard.statusText, "LCP-risk 🟡", "Status text indicates LCP-risk");
console.log("   ✓ Card 2 🖼️ Hero & LCP correctly flags 'LCP-risk 🟡' when hero image is not excluded.");

// Verify Card 5: Typsnitt & Fonts
const fontCard = cards.find(c => c.id === "google_fonts");
assert(fontCard, "Font card exists");
assert.strictEqual(fontCard.name, "🔤 Typsnitt & Fonts");
assert(fontCard.tools.some(t => t.name === "Aktivt typsnitt" && t.state === "Outfit"), "Aktivt typsnitt detects Outfit from elemInfo");
assert(fontCard.tools.some(t => t.name === "Font Display" && t.state.includes("Swap")), "Font-display is Swap");
assert(fontCard.tools.some(t => t.name === "Lagring (GDPR)" && t.state.includes("Lokalt")), "Font storage is Lokalt (GDPR ✓)");
console.log("   ✓ Card 5 🔤 Typsnitt & Fonts verified with detected font, GDPR hosting & Swap.");

// Verify Card 8: Server (Span 2)
const serverCard = cards.find(c => c.id === "server_res");
assert(serverCard, "Server card exists");
assert.strictEqual(serverCard.name, "🖥️ Server");
assert.strictEqual(serverCard.colSpan, 2, "Server card has colSpan: 2");
console.log("   ✓ Card 8 🖥️ Server has colSpan: 2.");

// Verify Card 9: Databas (Span 2 & Sanitized sizes)
const dbCard = cards.find(c => c.id === "database_res");
assert(dbCard, "Databas card exists");
assert.strictEqual(dbCard.name, "🗄️ Databas");
assert.strictEqual(dbCard.colSpan, 2, "Databas card has colSpan: 2");

// Verify that NO raw bytes exist in the database card tools
dbCard.tools.forEach(t => {
  assert(!t.state.toLowerCase().includes("bytes"), `Tool ${t.name} state '${t.state}' must NOT contain 'bytes'`);
  assert(!/\(\d+\s*bytes?\)/i.test(t.state), `Tool ${t.name} state '${t.state}' must NOT contain raw byte parentheses`);
});
assert(dbCard.tools.some(t => t.name === "Databas & Motor" && t.state.includes("sweetmini_wp5")), "Includes sweetmini_wp5");
assert(dbCard.tools.some(t => t.name === "Databasstorlek" && t.state.includes("15,10 MB")), "Includes clean 15,10 MB");
assert(dbCard.tools.some(t => t.name === "Diskfördelning" && t.state.includes("455,31 MB") && t.state.includes("120,40 MB")), "Includes clean uploads and plugins size");
assert(dbCard.tools.some(t => t.name === "Total Webbplatsdisk" && t.state.includes("647,91 MB")), "Includes clean total size");
console.log("   ✓ Card 9 🗄️ Databas has colSpan: 2 and 100% clean sanitized disk sizes without raw bytes.");

console.log("\n======================================================");
console.log("ALL v2.8.39 VERIFICATION TESTS PASSED (100% SUCCESS)!");
console.log("======================================================");
