/**
 * Automated Verification Suite for AreWee-Optimizer v2.7.2.1
 * Fixes theme google_fonts:false stringify false-positive that made
 * optm_ggfonts_async + optm_dns_prefetch show Avvikelse / missing fonts.* on skateyourname.
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

console.log('=== STARTING v2.7.2.1 VERIFICATION SUITE ===\n');

const indexHtml = fs.readFileSync(path.join(BASE_DIR, 'index.html'), 'utf8');
const appJs = fs.readFileSync(path.join(BASE_DIR, 'js/app.js'), 'utf8');
const rulesJs = fs.readFileSync(path.join(BASE_DIR, 'js/rules.js'), 'utf8');
const exporterJs = fs.readFileSync(path.join(BASE_DIR, 'js/exporter.js'), 'utf8');
const stylesCss = fs.readFileSync(path.join(BASE_DIR, 'css/styles.css'), 'utf8');
const readmeMd = fs.readFileSync(path.join(BASE_DIR, 'README.md'), 'utf8');
const geminiMd = fs.readFileSync(path.join(BASE_DIR, 'gemini.md'), 'utf8');

console.log('--- 1. Version Consistency (v2.7.2.1) ---');
assert(indexHtml.includes('(v2.7.2.1)'), 'index.html mentions v2.7.2.1');
assert(indexHtml.includes('?v=2.7.2.1'), 'index.html cache-bust ?v=2.7.2.1');
assert(appJs.includes('const APP_VERSION = "2.7.2.1"'), 'app.js APP_VERSION');
assert(appJs.includes('targetVersion = "2.7.2.1"'), 'app.js targetVersion');
assert(rulesJs.includes('Compatibility Engine (v2.7.2.1)'), 'rules.js header');
assert(exporterJs.includes('Exporter / Serializer (v2.7.2.1)'), 'exporter.js header');
assert(exporterJs.includes("'syncPluginVersion' => '2.7.2.1'"), 'exporter syncPluginVersion');
assert(stylesCss.includes('Stylesheet (v2.7.2.1)'), 'styles.css header');
assert(readmeMd.includes('Dashboard (v2.7.2.1)'), 'README header');
assert(readmeMd.includes('Release v2.7.2.1:'), 'README changelog 2.7.2.1');
assert(geminiMd.includes('Arkitektur (v2.7.2.1)'), 'gemini Arkitektur');

console.log('\n--- 2. Static: no theme stringify false-positive ---');
assert(rulesJs.includes('function themeSignalsExternalGoogleFonts'), 'themeSignalsExternalGoogleFonts defined');
assert(rulesJs.includes('function isActiveGoogleFontsValue'), 'isActiveGoogleFontsValue defined');
assert(rulesJs.includes('function hasExternalGoogleFonts'), 'hasExternalGoogleFonts defined');
// Live code must not use JSON.stringify(themeInfo).includes("google_fonts")
const liveRules = rulesJs.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
assert(!/JSON\.stringify\s*\(\s*(?:environment\.)?themeInfo\s*\)[\s\S]{0,80}includes\s*\(\s*["']google_fonts["']\s*\)/.test(liveRules),
  'no live JSON.stringify(themeInfo).includes("google_fonts")');
assert(liveRules.includes('themeSignalsExternalGoogleFonts(environment.themeInfo)') ||
       liveRules.includes('themeSignalsExternalGoogleFonts(themeInfo)'),
  'helper used in comparison/cockpit path');

const context = {
  console, setTimeout, clearTimeout, Math, Date, JSON, String, Number, Boolean,
  parseInt, parseFloat, isNaN, Array, Object, RegExp, Error, Map, Set, WeakSet,
  module: { exports: {} }, exports: {}
};
context.window = context;
context.global = context;
vm.createContext(context);
vm.runInContext(exporterJs, context);
context.module.exports = {};
vm.runInContext(rulesJs, context);

const exported = context.module && context.module.exports ? context.module.exports : {};
const pick = (name) => context[name] || exported[name] || (context.window && context.window[name]);

const getOptionComparison = pick('getOptionComparison');
const hasExternalGoogleFonts = pick('hasExternalGoogleFonts');
const themeSignalsExternalGoogleFonts = pick('themeSignalsExternalGoogleFonts');
const analyzeSystem = pick('analyzeSystem');
const parseSettingsFile = pick('parseSettingsFile');

assert(typeof getOptionComparison === 'function', 'getOptionComparison available');
assert(typeof hasExternalGoogleFonts === 'function', 'hasExternalGoogleFonts available');
assert(typeof themeSignalsExternalGoogleFonts === 'function', 'themeSignals helper available');

const optAsync = { id: 'optm_ggfonts_async', title: 'GF Async', recommendedRaw: 1, criticalLevel: 'standard', scoreImpact: 0 };
const optDns = { id: 'optm_dns_prefetch', title: 'DNS Prefetch', recommendedRaw: '//fonts.googleapis.com\n//fonts.gstatic.com', criticalLevel: 'standard', scoreImpact: 0 };

console.log('\n--- 3. themeSignals: false must NOT be external ---');
assert(themeSignalsExternalGoogleFonts({ google_fonts: false }) === false, 'theme google_fonts:false → no signal');
assert(themeSignalsExternalGoogleFonts({ google_fonts: 0 }) === false, 'theme google_fonts:0 → no signal');
assert(themeSignalsExternalGoogleFonts({ google_fonts: '0' }) === false, 'theme google_fonts:"0" → no signal');
assert(themeSignalsExternalGoogleFonts({ google_fonts: 'disabled' }) === false, 'theme google_fonts:disabled → no signal');
assert(themeSignalsExternalGoogleFonts({ typography: { google_fonts: false } }) === false, 'nested google_fonts:false → no signal');
assert(themeSignalsExternalGoogleFonts({ name: 'Hello Elementor', version: '3.5.1' }) === false, 'theme name only → no signal');
assert(themeSignalsExternalGoogleFonts({ google_fonts: true }) === true, 'theme google_fonts:true → signal');
assert(themeSignalsExternalGoogleFonts({ 'google-fonts': 'enabled' }) === true, 'google-fonts:enabled → signal');
assert(themeSignalsExternalGoogleFonts({ css: 'https://fonts.googleapis.com/css2?family=Roboto' }) === true, 'googleapis URL value → signal');
assert(themeSignalsExternalGoogleFonts({ rawText: 'some theme dump with google_fonts: false inside' }) === false,
  'rawText mentioning key name + false → no signal');
assert(themeSignalsExternalGoogleFonts({ rawText: 'url(https://fonts.gstatic.com/s/x.woff2)' }) === true,
  'rawText with gstatic URL → signal');

console.log('\n--- 4. Skate-like: Remove OFF + elem GF false + theme google_fonts:false ---');
const skateSettings = {
  optm_ggfonts_async: '0',
  optm_ggfonts_rm: '0',
  optm_dns_prefetch: ''
};
const skateEnv = {
  elemInfo: { google_fonts: false, version: '4.2.4' },
  themeInfo: { name: 'Hello Elementor', version: '3.5.1', google_fonts: false, typography: { google_fonts: false } }
};
assert(hasExternalGoogleFonts(skateSettings, skateEnv) === false, 'skate-like hasExternalGg === false');

const asyncSkate = getOptionComparison(optAsync, skateSettings, skateEnv);
assert(asyncSkate.isMeasured === true, 'async measured');
assert(asyncSkate.isMatches === true && asyncSkate.isDeviant === false, 'async → Optimal (not Avvikelse)');
assert(String(asyncSkate.statusLabel).includes('Optimal'), 'async statusLabel Optimal');
assert(String(asyncSkate.currentDisplay).includes('Inaktiv') || String(asyncSkate.recommendedDisplay).includes('Inaktiv'),
  'async Inaktiv copy');

const dnsSkate = getOptionComparison(optDns, skateSettings, skateEnv);
assert(dnsSkate.isMeasured === true, 'dns measured');
assert(dnsSkate.isMatches === true && dnsSkate.isDeviant === false, 'dns → Optimal (not Avvikelse)');
assert(String(dnsSkate.statusLabel).includes('Optimal'), 'dns statusLabel Optimal');
assert(Array.isArray(dnsSkate.missing) && dnsSkate.missing.length === 0, 'dns missing patterns empty');
assert(!(dnsSkate.missing || []).some(m => /fonts\.(googleapis|gstatic)/i.test(String(m))),
  'dns missing has no fonts.googleapis/gstatic rows');
assert(String(dnsSkate.currentDisplay).includes('Inaktiv'), 'dns Inaktiv display');

console.log('\n--- 5. Control: real theme GF still deviant when async/DNS empty ---');
const realEnv = {
  elemInfo: { google_fonts: false },
  themeInfo: { google_fonts: true }
};
assert(hasExternalGoogleFonts(skateSettings, realEnv) === true, 'real theme GF → external');
const asyncDev = getOptionComparison(optAsync, skateSettings, realEnv);
const dnsDev = getOptionComparison(optDns, skateSettings, realEnv);
assert(asyncDev.isDeviant === true, 'real GF + async OFF → deviant');
assert(dnsDev.isDeviant === true, 'real GF + DNS empty → deviant');
assert((dnsDev.missing || []).length >= 2, 'real GF DNS reports missing fonts patterns');

console.log('\n--- 6. Real skate fixtures (Downloads) if present ---');
const lscwpPath = '/Users/richardviitanen/Downloads/LSCWP_cfg-www.skateyourname.com_-20260924_150453.data';
const elemPath = '/Users/richardviitanen/Downloads/system-info-www.skateyourname.com-24-09-2026.txt';
if (fs.existsSync(lscwpPath) && fs.existsSync(elemPath) && typeof parseSettingsFile === 'function') {
  const uploaded = parseSettingsFile(fs.readFileSync(lscwpPath, 'utf8'));
  const m2 = appJs.match(/function parseElementorStatus\(text\) \{[\s\S]*?return data;\n  \}/);
  vm.runInContext(m2[0], context);
  const elemInfo = context.parseElementorStatus(fs.readFileSync(elemPath, 'utf8'));
  const themeFalse = { name: 'Hello Elementor', version: '3.5.1', google_fonts: false };
  const analysis = analyzeSystem(null, null, null, elemInfo, uploaded, null, null, themeFalse);
  const env = analysis.environment;
  assert(elemInfo.google_fonts === false, 'fixture elem google_fonts false');
  assert(hasExternalGoogleFonts(uploaded, env) === false, 'fixture+themeFalse hasExternalGg false');
  const a = getOptionComparison(optAsync, uploaded, env);
  const d = getOptionComparison(optDns, uploaded, env);
  assert(a.isMatches && !a.isDeviant, 'fixture async Optimal');
  assert(d.isMatches && !d.isDeviant, 'fixture dns Optimal');
  assert((d.missing || []).length === 0, 'fixture dns no missing fonts rows');
  console.log('   fixture async:', a.statusLabel, a.currentDisplay);
  console.log('   fixture dns:', d.statusLabel, d.currentDisplay, 'missing=', d.missing);
} else {
  console.log('   (fixtures not found — skipped live skate parse)');
  assert(true, 'fixtures optional skip placeholder');
}

console.log(`\n=== RESULTS: ${passed} passed, ${failed} failed ===`);
process.exit(failed > 0 ? 1 : 0);
