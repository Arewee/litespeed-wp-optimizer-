/**
 * Verification test suite for AreWee-Optimizer v2.8.30
 * Verifies all 4 adjustments and 3 additions from Grok's deep audit.
 */

const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert');

console.log('=== AreWee-Optimizer v2.8.30 Verification Suite ===\n');

const ROOT = path.resolve(__dirname, '..');

// 1. Version Parity Checks
console.log('1. Checking version parity across all files...');

const indexHtml = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const appJs = fs.readFileSync(path.join(ROOT, 'js/app.js'), 'utf8');
const rulesJs = fs.readFileSync(path.join(ROOT, 'js/rules.js'), 'utf8');
const exporterJs = fs.readFileSync(path.join(ROOT, 'js/exporter.js'), 'utf8');
const stylesCss = fs.readFileSync(path.join(ROOT, 'css/styles.css'), 'utf8');
const readmeMd = fs.readFileSync(path.join(ROOT, 'README.md'), 'utf8');
const geminiPath = fs.existsSync(path.join(ROOT, 'gemini.md')) ? path.join(ROOT, 'gemini.md') : path.join(ROOT, 'GEMINI.md');
const geminiMd = fs.readFileSync(geminiPath, 'utf8');

const appVersionMatch = appJs.match(/const APP_VERSION = "([^"]+)";/);
assert(appVersionMatch, 'app.js defines APP_VERSION');
const currentVer = appVersionMatch[1];

assert(indexHtml.includes(`<title>AreWee-Optimizer - WordPress prestanda & stabilitetsoptimerare (v${currentVer})</title>`), `index.html title has v${currentVer}`);
assert(indexHtml.includes(`styles.css?v=${currentVer}`), `index.html styles.css?v=${currentVer}`);
assert(indexHtml.includes(`js/rules.js?v=${currentVer}`), `index.html rules.js?v=${currentVer}`);
assert(indexHtml.includes(`js/exporter.js?v=${currentVer}`), `index.html exporter.js?v=${currentVer}`);
assert(indexHtml.includes(`js/app.js?v=${currentVer}`), `index.html app.js?v=${currentVer}`);
assert(indexHtml.includes(`class="logo-tag">v${currentVer}</span>`), `index.html logo-tag v${currentVer}`);
assert(indexHtml.includes(`Nuvarande rekommendationer (v${currentVer})`), `index.html recommendations modal v${currentVer}`);

assert(rulesJs.includes(`Dynamic Rules & Compatibility Engine (v${currentVer})`), `rules.js header v${currentVer}`);
assert(exporterJs.includes(`Exporter / Serializer (v${currentVer})`), `exporter.js header v${currentVer}`);
assert(stylesCss.includes(`Stylesheet (v${currentVer})`), `styles.css header v${currentVer}`);
assert(readmeMd.includes(`Dashboard (v${currentVer})`), `README.md header v${currentVer}`);
assert(geminiMd.includes(`Projektets Riktlinjer & Arkitektur (v${currentVer})`), `GEMINI.md header v${currentVer}`);

console.log('   ✓ Version parity verified across all 7 project files');

// 2. Load context in VM
console.log('2. Loading rules.js & app.js functions in VM sandbox...');
const sandbox = {
  window: {},
  document: {
    addEventListener: () => {},
    querySelector: () => null,
    querySelectorAll: () => [],
    getElementById: () => null
  },
  console: console,
  setTimeout: setTimeout,
  clearTimeout: clearTimeout,
  fetch: () => Promise.resolve({ ok: true, json: () => Promise.resolve({}) })
};
sandbox.window = sandbox;

vm.createContext(sandbox);
vm.runInContext(rulesJs, sandbox);

const parseWfMatch = appJs.match(/function parseWordfenceDiagnostic\(text\) \{[\s\S]*?\n  \}/);
assert(parseWfMatch, 'parseWordfenceDiagnostic found in app.js');
vm.runInContext(`var parseWordfenceDiagnostic = ${parseWfMatch[0]};`, sandbox);

const parseCcMatch = appJs.match(/function parseCustomCodeText\(text\) \{[\s\S]*?\n  \}/);
assert(parseCcMatch, 'parseCustomCodeText found in app.js');
vm.runInContext(`var parseCustomCodeText = ${parseCcMatch[0]};`, sandbox);

const parseElemMatch = appJs.match(/function parseElementorStatus\(text\) \{[\s\S]*?\n  \}/);
assert(parseElemMatch, 'parseElementorStatus found in app.js');
vm.runInContext(`var parseElementorStatus = ${parseElemMatch[0]};`, sandbox);

console.log('   ✓ rules.js and parsers loaded successfully');

// 3. General deviation rule (Item 1)
console.log('3. Testing general rule for 0p deviations in deviationCount & Åtgärdslista...');
const cartOpt = {
  id: "woo_cart_fragments",
  title: "Cart Fragments",
  tool: "woocommerce",
  category: "config",
  recommendedRaw: 1,
  scoreImpact: 0
};
const compDequeuedWithCart = sandbox.getOptionComparison(cartOpt, { cache_enable: "1" }, {
  cart_fragments_dequeued: true,
  isLiteSpeedServer: true,
  hasLiteSpeedPlugin: true,
  hasWooCommerce: true,
  hasMenuCart: true
});
assert.strictEqual(compDequeuedWithCart.isMatches, false, "isMatches is false for conflict");
assert.strictEqual(compDequeuedWithCart.isDeviant, true, "isDeviant is generally true for !isMatches even when scoreImpact: 0");
assert.strictEqual(compDequeuedWithCart.status, "deviation", "status is deviation");
assert.strictEqual(compDequeuedWithCart.statusLabel, "🟡 Avvikelse (0p)", "statusLabel is 🟡 Avvikelse (0p)");
assert.strictEqual(compDequeuedWithCart.scoreImpact, 0, "scoreImpact is strictly 0");
console.log('   ✓ General deviation rule verified (0p deviations included without special-cases)');

// 4. .htaccess Complete vs Partial (Item 2)
console.log('4. Testing .htaccess complete vs partial fragment detection...');
// A: Complete .htaccess without noabort rule
const completeHtaccessWithoutNoabort = `
# BEGIN WordPress
<IfModule mod_rewrite.c>
RewriteEngine On
RewriteRule .* - [E=HTTP_AUTHORIZATION:%{HTTP:Authorization}]
RewriteBase /
RewriteRule ^index\\.php$ - [L]
RewriteCond %{REQUEST_FILENAME} !-f
RewriteCond %{REQUEST_FILENAME} !-d
RewriteRule . /index.php [L]
</IfModule>
# END WordPress
`;
const parsedComplete = sandbox.parseCustomCodeText(completeHtaccessWithoutNoabort);
assert.strictEqual(parsedComplete.hasNoabort, false, "Complete .htaccess without rule strictly yields hasNoabort: false");

// B: Partial fragment (e.g. Wordfence block only) without noabort rule
const partialFragmentWithoutNoabort = `
# BEGIN Wordfence
<Files ".user.ini">
<IfModule mod_authz_core.c>
Require all denied
</IfModule>
</Files>
# END Wordfence
`;
const parsedPartial = sandbox.parseCustomCodeText(partialFragmentWithoutNoabort);
assert.strictEqual(parsedPartial.hasNoabort, null, "Partial fragment without rule yields hasNoabort: null (not false)");

// C: Partial fragment WITH noabort rule
const partialWithNoabort = `
RewriteRule .* - [E=noabort:1]
`;
const parsedPartialWithRule = sandbox.parseCustomCodeText(partialWithNoabort);
assert.strictEqual(parsedPartialWithRule.hasNoabort, true, "Fragment WITH rule yields hasNoabort: true");
console.log('   ✓ Complete vs Partial .htaccess handling verified');

// 5. Transients & Cart Fragments Slot References (Item 3)
console.log('5. Testing Slot references for Transients and Cart Fragments...');
const transientsOpt = { id: "woo_transients_cleanup", title: "Transients", tool: "woocommerce", recommendedRaw: 1 };
const compTransientsUnmeasured = sandbox.getOptionComparison(transientsOpt, {}, {});
assert.strictEqual(compTransientsUnmeasured.statusLabel, "⚪ Värde saknas (3. WooCommerce / 7. SCM / 9. LiteSpeed)", "woo_transients_cleanup unmeasuredLabel shows 3. WooCommerce / 7. SCM / 9. LiteSpeed");

const compCartUnmeasured = sandbox.getOptionComparison(cartOpt, {}, {});
assert.strictEqual(compCartUnmeasured.statusLabel, "⚪ Värde saknas (6. Elementor / 7. SCM / 9. LiteSpeed)", "woo_cart_fragments unmeasuredLabel shows 6. Elementor / 7. SCM / 9. LiteSpeed");
console.log('   ✓ Slot references verified: transients (3 / 7 / 9) and cart fragments (6 / 7 / 9)');

// 6. Cart fragments without LiteSpeed page cache & sharpened mini-cart detection (Item 7)
console.log('6. Testing Cart fragments without LiteSpeed and negative signal filtering...');
// A: Negative signal ("mini-cart: disabled") must NOT be treated as active mini-cart
const elemDisabledText = `
== Active Widgets ==
heading
mini-cart: disabled
button
`;
const parsedNegativeElem = sandbox.parseElementorStatus(elemDisabledText);
assert.notStrictEqual(parsedNegativeElem.hasMenuCart, true, "mini-cart: disabled is NOT treated as active menu cart");

// B: Dequeued WITH mini-cart, but WITHOUT LiteSpeed page cache
const compNoCacheWithCart = sandbox.getOptionComparison(cartOpt, { cache_enable: "0" }, {
  cart_fragments_dequeued: true,
  isLiteSpeedServer: false,
  hasLiteSpeedPlugin: false,
  hasWooCommerce: true,
  hasMenuCart: true
});
assert.strictEqual(compNoCacheWithCart.isMatches, true, "isMatches is true when sidcache is inactive");
assert(compNoCacheWithCart.currentDisplay.includes("Minivarukorg finns, men sidcache ej aktiv"), "currentDisplay accurately notes mini-cart exists but sidecache is inactive");
assert(!compNoCacheWithCart.currentDisplay.includes("Ingen minivarukorg"), "does NOT claim no mini-cart exists");

// C: Dequeued and confirmed NO mini-cart
const compNoCacheNoCart = sandbox.getOptionComparison(cartOpt, { cache_enable: "1" }, {
  cart_fragments_dequeued: true,
  isLiteSpeedServer: true,
  hasWooCommerce: true,
  hasMenuCart: false,
  hasThemeSource: true,
  hasSpecificTheme: true
});
assert.strictEqual(compNoCacheNoCart.isMatches, true, "isMatches is true when confirmed no mini-cart");
assert(compNoCacheNoCart.currentDisplay.includes("Ingen minivarukorg i header"), "currentDisplay confirms optimal when no mini-cart");
console.log('   ✓ Cart fragments non-cached state and negative signal filtering verified');

// 7. Profile hygiene & Auto-migration (Items 4, 5, 6, 8)
console.log('7. Testing Profile hygiene, SCM leak protection and auto-migration...');
assert(!appJs.includes("state.customCodeInfo.hasNoabort = parsed.hasNoabort"), "app.js no longer mutates customCodeInfo from .htaccess upload");
assert(!appJs.includes("state.scmInfo.hasNoabort = parsed.hasNoabort"), "app.js no longer mutates scmInfo from .htaccess upload");
assert(appJs.includes("isHtCode"), "loadProfile includes auto-migration check for htaccess in customcode");
assert(appJs.includes("htaccessSummary.textContent = `✓ .htaccess"), "loadProfile updates htaccessSummary");
assert(appJs.includes("!profVer || profVer !== APP_VERSION"), "loadProfile warns when profVer is missing or mismatched");
console.log('   ✓ Profile hygiene, SCM leak protection, htaccessSummary sync and version notice verified');

console.log('\n======================================================');
console.log('ALL v2.8.30 VERIFICATION TESTS PASSED (100% SUCCESS)');
console.log('======================================================');
