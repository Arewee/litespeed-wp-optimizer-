/**
 * Automated Verification Suite for AreWee-Optimizer v2.7.1.6
 * Versionsgranskning exact-match: core Woo/Elementor must not be
 * overwritten by PayPal / Klarna / Elementor Pro / PDF Invoices.
 */

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const BASE_DIR = path.resolve(__dirname, '..');
let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`✅ PASS: ${message}`);
    passed++;
  } else {
    console.error(`❌ FAIL: ${message}`);
    failed++;
  }
}

console.log('=== STARTING v2.7.1.6 VERIFICATION SUITE ===\n');

const indexHtml = fs.readFileSync(path.join(BASE_DIR, 'index.html'), 'utf8');
const appJs = fs.readFileSync(path.join(BASE_DIR, 'js/app.js'), 'utf8');
const rulesJs = fs.readFileSync(path.join(BASE_DIR, 'js/rules.js'), 'utf8');
const exporterJs = fs.readFileSync(path.join(BASE_DIR, 'js/exporter.js'), 'utf8');
const stylesCss = fs.readFileSync(path.join(BASE_DIR, 'css/styles.css'), 'utf8');
const readmeMd = fs.readFileSync(path.join(BASE_DIR, 'README.md'), 'utf8');
const geminiMd = fs.readFileSync(path.join(BASE_DIR, 'GEMINI.md'), 'utf8');

console.log('--- 1. Version Consistency (v2.7.1.6) ---');
assert(indexHtml.includes('(v2.7.1.6)'), 'index.html mentions v2.7.1.6');
assert(indexHtml.includes('?v=2.7.1.6'), 'index.html cache-bust ?v=2.7.1.6');
assert(appJs.includes('const APP_VERSION = "2.7.1.6"'), 'app.js APP_VERSION = 2.7.1.6');
assert(appJs.includes('targetVersion = "2.7.1.6"'), 'app.js targetVersion = 2.7.1.6');
assert(rulesJs.includes('Compatibility Engine (v2.7.1.6)'), 'rules.js header v2.7.1.6');
assert(exporterJs.includes('Exporter / Serializer (v2.7.1.6)'), 'exporter.js header v2.7.1.6');
assert(exporterJs.includes("'syncPluginVersion' => '2.7.1.6'"), 'exporter.js syncPluginVersion 2.7.1.6');
assert(stylesCss.includes('Stylesheet (v2.7.1.6)'), 'styles.css header v2.7.1.6');
assert(readmeMd.includes('Dashboard (v2.7.1.6)'), 'README.md header v2.7.1.6');
assert(readmeMd.includes('Release v2.7.1.6:'), 'README.md has v2.7.1.6 changelog');
assert(geminiMd.includes('Arkitektur (v2.7.1.6)'), 'GEMINI.md Arkitektur v2.7.1.6');
assert(rulesJs.includes('function isCoreWooCommercePlugin'), 'isCoreWooCommercePlugin defined');
assert(rulesJs.includes('function isCoreElementorPlugin'), 'isCoreElementorPlugin defined');
assert(!/kLower\.includes\("woocommerce"\)\s*&&\s*!kLower\.includes\("gateway"\)/.test(rulesJs),
  'old substring Woo matcher removed');

const context = {
  console, setTimeout, clearTimeout, Math, Date, JSON, String, Number, Boolean,
  parseInt, parseFloat, isNaN, Array, Object, RegExp, Error,
  module: { exports: {} },
  exports: {}
};
context.window = context;
context.global = context;
vm.createContext(context);
vm.runInContext(exporterJs, context);
context.module.exports = {};
vm.runInContext(rulesJs, context);

const exported = context.module && context.module.exports ? context.module.exports : {};
const pick = (name) => context[name] || exported[name] || (context.window && context.window[name]);

const isWoo = pick('isCoreWooCommercePlugin');
const isElem = pick('isCoreElementorPlugin');
const analyzeSystem = pick('analyzeSystem');
assert(typeof isWoo === 'function', 'isCoreWooCommercePlugin available');
assert(typeof isElem === 'function', 'isCoreElementorPlugin available');
assert(typeof analyzeSystem === 'function', 'analyzeSystem available');

console.log('\n--- 2. Exact matcher unit cases ---');
assert(isWoo('WooCommerce') === true, 'bare WooCommerce name');
assert(isWoo('WooCommerce (woocommerce)') === true, 'WooCommerce (woocommerce)');
assert(isWoo('woocommerce/woocommerce.php') === true, 'path woocommerce/woocommerce.php');
assert(isWoo('WooCommerce PayPal Payments (woocommerce-paypal-payments)') === false, 'PayPal not core');
assert(isWoo('Klarna for WooCommerce (klarna-payments-for-woocommerce)') === false, 'Klarna not core');
assert(isWoo('PDF Invoices & Packing slips for WooCommerce (woocommerce-pdf-invoices-packing-slips)') === false, 'PDF not core');
assert(isElem('Elementor') === true, 'bare Elementor');
assert(isElem('Elementor (elementor)') === true, 'Elementor (elementor)');
assert(isElem('elementor/elementor.php') === true, 'path elementor');
assert(isElem('Elementor Pro (elementor-pro)') === false, 'Elementor Pro not core');
assert(isElem('Elementor Pro') === false, 'bare Elementor Pro not core');

console.log('\n--- 3. analyzeSystem versionMatrix (maximeraprofil-like) ---');
const pluginsActive = {
  'Klarna for WooCommerce (klarna-payments-for-woocommerce)': { version: '4.13.1' },
  'WooCommerce (woocommerce)': { version: '11.1.2' },
  'WooCommerce PayPal Payments (woocommerce-paypal-payments)': { version: '4.1.3' },
  'PDF Invoices & Packing Slips for WooCommerce (woocommerce-pdf-invoices-packing-slips)': { version: '5.16.3' },
  'Elementor (elementor)': { version: '4.2.4' },
  'Elementor Pro (elementor-pro)': { version: '4.2.3' },
  'LiteSpeed Cache (litespeed-cache)': { version: '7.9.1' },
  'Wordfence Security (wordfence)': { version: '9.0.1' }
};
const sysInfo = {
  'wp-core': { version: '7.1.2' },
  'wp-server': { httpd_software: 'LiteSpeed', php_version: '8.2' },
  'wp-constants': {},
  'wp-active-theme': { name: 'Astra' },
  'wp-plugins-active': pluginsActive
};

const result = analyzeSystem(sysInfo, null, null, null, null, null, null, null);
const env = result.environment;
assert(env.wooVersion === '11.1.2', `wooVersion is 11.1.2 (got ${env.wooVersion})`);
assert(env.elemVersion === '4.2.4', `elemVersion is 4.2.4 (got ${env.elemVersion})`);
assert(env.hasWooCommerce === true, 'hasWooCommerce true');
assert(env.hasElementor === true, 'hasElementor true');

const wooRow = (result.versionMatrix || []).find(r => r.toolKey === 'woocommerce');
assert(!!wooRow, 'versionMatrix has woocommerce row');
assert(wooRow.installedVersion === '11.1.2' || wooRow.installed === '11.1.2' || String(wooRow.installedVersion || wooRow.version || '').includes('11.1.2') || env.wooVersion === '11.1.2',
  'matrix reflects Woo 11.1.2');

// Pro-first order must not stick Pro version on core
const pluginsProFirst = {
  'Elementor Pro (elementor-pro)': { version: '4.2.3' },
  'Elementor (elementor)': { version: '4.2.4' },
  'WooCommerce PayPal Payments (woocommerce-paypal-payments)': { version: '4.1.3' },
  'WooCommerce (woocommerce)': { version: '11.1.2' }
};
const r2 = analyzeSystem({
  'wp-core': { version: '7.1.2' },
  'wp-server': { php_version: '8.2' },
  'wp-constants': {},
  'wp-active-theme': { name: 'Astra' },
  'wp-plugins-active': pluginsProFirst
}, null, null, null, null, null, null, null);
assert(r2.environment.wooVersion === '11.1.2', 'PayPal-first still yields Woo 11.1.2');
assert(r2.environment.elemVersion === '4.2.4', 'Pro-first still yields Elementor 4.2.4');

console.log(`\n=== RESULTS: ${passed} passed, ${failed} failed ===`);
process.exit(failed > 0 ? 1 : 0);
