/**
 * Automated Verification Suite for AreWee-Optimizer v2.8.31
 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert');

console.log('=== AreWee-Optimizer v2.8.31 Verification Suite ===\n');

const ROOT = path.resolve(__dirname, '..');

// 1. Version Parity Checks
console.log('1. Checking version parity across all files...');
const indexHtml = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const appJs = fs.readFileSync(path.join(ROOT, 'js/app.js'), 'utf8');
const rulesJs = fs.readFileSync(path.join(ROOT, 'js/rules.js'), 'utf8');
const exporterJs = fs.readFileSync(path.join(ROOT, 'js/exporter.js'), 'utf8');
const stylesCss = fs.readFileSync(path.join(ROOT, 'css/styles.css'), 'utf8');
const readmeMd = fs.readFileSync(path.join(ROOT, 'README.md'), 'utf8');
const geminiMd = fs.readFileSync(path.join(ROOT, 'gemini.md'), 'utf8');

const currentVerMatch = appJs.match(/const APP_VERSION = "([^"]+)";/);
const currentVer = currentVerMatch ? currentVerMatch[1] : "2.8.32";
assert(indexHtml.includes(`v${currentVer}`), `index.html contains v${currentVer}`);
assert(appJs.includes(`const APP_VERSION = "${currentVer}";`), `app.js defines APP_VERSION ${currentVer}`);
assert(rulesJs.includes(`Dynamic Rules & Compatibility Engine (v${currentVer})`), `rules.js header v${currentVer}`);
assert(exporterJs.includes(`Exporter / Serializer (v${currentVer})`), `exporter.js header v${currentVer}`);
assert(stylesCss.includes(`Stylesheet (v${currentVer})`), `styles.css header v${currentVer}`);
assert(readmeMd.includes(`Dashboard (v${currentVer})`), `README.md header v${currentVer}`);
assert(geminiMd.includes(`Projektets Riktlinjer & Arkitektur (v${currentVer})`), `gemini.md header v${currentVer}`);
console.log('   ✓ Version parity verified across all 7 project files');

// 2. Load rules.js and app.js parsers into sandbox
console.log('2. Loading rules.js & app.js into sandbox...');
const sandbox = {
  console: console,
  setTimeout: setTimeout,
  clearTimeout: clearTimeout,
  Math: Math,
  Object: Object,
  Array: Array,
  String: String,
  Number: Number,
  parseInt: parseInt,
  parseFloat: parseFloat,
  isNaN: isNaN,
  Date: Date,
  RegExp: RegExp,
  window: {}
};
vm.createContext(sandbox);
vm.runInContext(rulesJs, sandbox);

// Extract helper functions from app.js into sandbox
const extractFn = (name) => {
  const m = appJs.match(new RegExp(`function\\s+${name}\\s*\\([^)]*\\)\\s*\\{[\\s\\S]*?\\n  \\}`, 'm'));
  if (m) {
    vm.runInContext(m[0], sandbox);
    return true;
  }
  return false;
};
assert(extractFn("isBinaryContent"), "Extracted isBinaryContent");
assert(extractFn("parseCustomCodeText"), "Extracted parseCustomCodeText");
assert(extractFn("parseWordfenceDiagnostic"), "Extracted parseWordfenceDiagnostic");
assert(extractFn("parseElementorStatus"), "Extracted parseElementorStatus");
assert(extractFn("detectPastedFormat"), "Extracted detectPastedFormat");

console.log('   ✓ rules.js and app.js functions loaded successfully');

// 3. Test slot toggle checkboxes in HTML markup
console.log('3. Checking slot quick toggle markup in index.html...');
assert(indexHtml.includes('id="toggle-wf-live-traffic"'), "index.html has toggle-wf-live-traffic");
assert(indexHtml.includes('id="toggle-theme-mini-cart"'), "index.html has toggle-theme-mini-cart");
assert(indexHtml.includes('id="toggle-elem-menu-cart"'), "index.html has toggle-elem-menu-cart");
assert(indexHtml.includes('Live Traffic: Security Only'), "index.html has label Live Traffic: Security Only");
assert(indexHtml.includes('Temats minivarukorg i header'), "index.html has label Temats minivarukorg i header");
assert(indexHtml.includes('Elementor Menu Cart i header'), "index.html has label Elementor Menu Cart i header");
console.log('   ✓ Slot quick toggle checkboxes verified in index.html');

// 4. Test detectPastedFormat on "Traffic logging mode: Security Only"
console.log('4. Testing detectPastedFormat for Wordfence single lines...');
const singleLineWf = "Traffic logging mode: Security Only";
const formatWf = sandbox.detectPastedFormat(singleLineWf, null);
assert.strictEqual(formatWf, "wordfence", "detectPastedFormat recognizes 'Traffic logging mode: Security Only' as wordfence");

const swedishLineWf = "Trafikloggning: Endast säkerhet";
const formatSwedishWf = sandbox.detectPastedFormat(swedishLineWf, null);
assert.strictEqual(formatSwedishWf, "wordfence", "detectPastedFormat recognizes 'Trafikloggning: Endast säkerhet' as wordfence");

const parsedWf = sandbox.parseWordfenceDiagnostic(singleLineWf);
assert.strictEqual(parsedWf.live_traffic_disabled, true, "parseWordfenceDiagnostic parses live_traffic_disabled as true");
console.log('   ✓ Direct paste of Traffic logging mode verified without error');

// 5. Test Manual Toggles in analyzeSystem & getOptionComparison
console.log('5. Testing manual toggles in rules engine...');
// 5a. Wordfence manual toggle
const compWfToggle = sandbox.getOptionComparison(
  { id: "wf_disable_live_traffic", title: "Live Traffic", tool: "wordfence", recommendedRaw: "1", scoreImpact: 10 },
  {},
  { hasWordfence: true, manualToggles: { wfLiveTraffic: true } }
);
assert.strictEqual(compWfToggle.isMeasured, true, "wf_disable_live_traffic is measured via manual toggle");
assert.strictEqual(compWfToggle.isMatches, true, "wf_disable_live_traffic is optimal via manual toggle");

// 5b. Cart fragments without signal: must NOT assume false negative
const compCartNoSignal = sandbox.getOptionComparison(
  { id: "woo_cart_fragments", title: "Cart Fragments", tool: "woocommerce", recommendedRaw: "1", scoreImpact: 0 },
  { "cache": "1" },
  { hasWooCommerce: true, elemInfo: { experiments: ["e_dom_optimization"] }, scmInfo: { cart_fragments_dequeued: true } }
);
assert.strictEqual(compCartNoSignal.isMeasured, false, "woo_cart_fragments without mini-cart signal stays UNMEASURED (never false green)");
assert.strictEqual(compCartNoSignal.statusLabel, "⚪ Värde saknas (6. Elementor / 7. SCM / 9. LiteSpeed)", "woo_cart_fragments statusLabel indicates 6. Elementor / 7. SCM / 9. LiteSpeed");

// 5c. Cart fragments with Elementor Menu Cart manual toggle = true
const compCartElemToggle = sandbox.getOptionComparison(
  { id: "woo_cart_fragments", title: "Cart Fragments", tool: "woocommerce", recommendedRaw: "1", scoreImpact: 0 },
  { "cache": "1" },
  { hasWooCommerce: true, isLiteSpeedServer: true, manualToggles: { elemMenuCart: true }, scmInfo: { cart_fragments_dequeued: true } }
);
assert.strictEqual(compCartElemToggle.isMeasured, true, "woo_cart_fragments is measured with elemMenuCart manual toggle");
assert.strictEqual(compCartElemToggle.isMatches, false, "woo_cart_fragments flags ghost cart risk when dequeued on cached site with active mini-cart");
assert(compCartElemToggle.currentDisplay.includes("Risk för spökvarukorg"), "Displays ghost cart warning");

// 5d. Cart fragments with confirmed no mini-cart
const compCartNoMiniCartToggle = sandbox.getOptionComparison(
  { id: "woo_cart_fragments", title: "Cart Fragments", tool: "woocommerce", recommendedRaw: "1", scoreImpact: 0 },
  { "cache": "1" },
  { hasWooCommerce: true, isLiteSpeedServer: true, hasMenuCart: false, hasHeaderMiniCart: false, scmInfo: { cart_fragments_dequeued: true } }
);
assert.strictEqual(compCartNoMiniCartToggle.isMeasured, true, "woo_cart_fragments is measured when mini-cart is confirmed absent");
assert.strictEqual(compCartNoMiniCartToggle.isMatches, true, "woo_cart_fragments is optimal when dequeued without mini-cart");

// 5e. Theme mini-cart manual toggle = true
const compCartThemeToggle = sandbox.getOptionComparison(
  { id: "woo_cart_fragments", title: "Cart Fragments", tool: "woocommerce", recommendedRaw: "1", scoreImpact: 0 },
  { "cache": "1" },
  { hasWooCommerce: true, isLiteSpeedServer: true, manualToggles: { themeMiniCart: true }, scmInfo: { cart_fragments_dequeued: true } }
);
assert.strictEqual(compCartThemeToggle.isMeasured, true, "woo_cart_fragments is measured with theme mini-cart toggle");
assert.strictEqual(compCartThemeToggle.isMatches, false, "Flags deviation with theme mini-cart toggle when dequeued under cache");
console.log('   ✓ Manual toggles for Wordfence, Elementor and Theme verified');

// 6. Test Grok Punkt 1: 0p deviation badge harmonization
console.log('6. Checking 0p deviation card badge harmonization...');
assert(appJs.includes('🟡 Avvikelse (0p)</span>`'), "app.js renders 🟡 Avvikelse (0p) on option cards for zero-score deviations");
assert(!appJs.includes('🔵 Policy / 0p</span>`'), "app.js no longer renders blue Policy badge for deviating zero-score options");
console.log('   ✓ 0p deviation card badge harmonized with rules engine');

// 7. Test Grok Punkt 3: .htaccess fragment display
console.log('7. Testing .htaccess partial fragment vs complete file...');
const compHtPartial = sandbox.getOptionComparison(
  { id: "wf_noabort", title: "LiteSpeed noabort", tool: "wordfence", recommendedRaw: "1", scoreImpact: 0 },
  {},
  { isLiteSpeedServer: true, hasWordfence: true, hasHtaccessFile: true, isCompleteHtaccess: false, noabortActive: false }
);
assert(compHtPartial.currentDisplay.includes("ej komplett"), "Partial htaccess displays 'ej komplett' instead of claiming missing in htaccess");
console.log('   ✓ Partial .htaccess display verified');

// 8. Test Grok Punkt 5: LiteSpeed settings file cache presence
console.log('8. Testing LiteSpeed cache presence in woo_cart_fragments...');
// In LiteSpeed, page cache is ON by default:
const compNoCacheKey = sandbox.getOptionComparison(
  { id: "woo_cart_fragments", title: "Cart Fragments", tool: "woocommerce", recommendedRaw: "1", scoreImpact: 0 },
  { "optm-css_min": "1" }, // uploadedSettings without cache key!
  { hasWooCommerce: true, isLiteSpeedServer: true, manualToggles: { elemMenuCart: true }, scmInfo: { cart_fragments_dequeued: true } }
);
assert.strictEqual(compNoCacheKey.isMatches, false, "On LiteSpeed, page cache is ON by default unless explicitly disabled");
assert(compNoCacheKey.currentDisplay.includes("Risk för spökvarukorg vid sidcache"), "Warns of ghost cart when page cache is on by default");

// Explicitly disabled cache (cache: "0"):
const compExplicitOff = sandbox.getOptionComparison(
  { id: "woo_cart_fragments", title: "Cart Fragments", tool: "woocommerce", recommendedRaw: "1", scoreImpact: 0 },
  { "cache": "0" },
  { hasWooCommerce: true, isLiteSpeedServer: true, manualToggles: { elemMenuCart: true }, scmInfo: { cart_fragments_dequeued: true } }
);
assert.strictEqual(compExplicitOff.isMatches, true, "When explicitly disabled via cache: 0, dequeued cart is safe");
assert(compExplicitOff.currentDisplay.includes("sidcache ej aktiv"), "Displays 'sidcache ej aktiv'");
console.log('   ✓ LiteSpeed settings cache presence verified');

// 9. Test Grok Punkt 6: Exporter terminology
console.log('9. Checking exporter terminology...');
assert(!exporterJs.includes('"Ej uppmätt"'), "exporter.js no longer contains 'Ej uppmätt'");
assert(exporterJs.includes('⚪ Värde saknas'), "exporter.js uses '⚪ Värde saknas'");
console.log('   ✓ Exporter terminology standardized to ⚪ Värde saknas');

console.log('\n======================================================');
console.log('ALL v2.8.31 VERIFICATION TESTS PASSED (100% SUCCESS)');
console.log('======================================================\n');
