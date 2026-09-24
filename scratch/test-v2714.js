/**
 * Automated Verification Suite for AreWee-Optimizer v2.7.1.4
 * - crawler OFF, no usleep → crawler_usleep measured Inaktiv/Crawler
 * - crawler ON + usleep present → measured with value
 * - crawler ON + usleep absent → unmeasured (honest)
 * - APP_VERSION 2.7.1.4
 * - mask: object-pswd never returned raw via maskSecretKey / isSecretOptionKey
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

console.log('=== STARTING v2.7.1.4 VERIFICATION SUITE ===\n');

const indexHtml = fs.readFileSync(path.join(BASE_DIR, 'index.html'), 'utf8');
const appJs = fs.readFileSync(path.join(BASE_DIR, 'js/app.js'), 'utf8');
const rulesJs = fs.readFileSync(path.join(BASE_DIR, 'js/rules.js'), 'utf8');
const exporterJs = fs.readFileSync(path.join(BASE_DIR, 'js/exporter.js'), 'utf8');
const stylesCss = fs.readFileSync(path.join(BASE_DIR, 'css/styles.css'), 'utf8');
const readmeMd = fs.readFileSync(path.join(BASE_DIR, 'README.md'), 'utf8');
const geminiMd = fs.readFileSync(path.join(BASE_DIR, 'GEMINI.md'), 'utf8');

console.log('--- 1. Version Consistency (v2.7.1.4) ---');
assert(indexHtml.includes('(v2.7.1.4)'), 'index.html mentions v2.7.1.4');
assert(indexHtml.includes('?v=2.7.1.4'), 'index.html cache-bust ?v=2.7.1.4');
assert(appJs.includes('const APP_VERSION = "2.7.1.4"'), 'app.js APP_VERSION = 2.7.1.4');
assert(appJs.includes('targetVersion = "2.7.1.4"'), 'app.js targetVersion = 2.7.1.4');
assert(rulesJs.includes('Compatibility Engine (v2.7.1.4)'), 'rules.js header v2.7.1.4');
assert(rulesJs.includes('6d. crawler_usleep'), 'rules.js has 6d crawler_usleep soft measure');
assert(rulesJs.includes('Inaktiv (Crawler AV)'), 'rules.js display Inaktiv (Crawler AV)');
assert(exporterJs.includes('Exporter / Serializer (v2.7.1.4)'), 'exporter.js header v2.7.1.4');
assert(exporterJs.includes("'syncPluginVersion' => '2.7.1.4'"), 'exporter.js syncPluginVersion 2.7.1.4');
assert(exporterJs.includes('"crawler-usleep": "crawler_usleep"') || exporterJs.includes("'crawler-usleep': 'crawler_usleep'"), 'KEY_MAPPING crawler-usleep → crawler_usleep');
assert(exporterJs.includes('"crawler_usleep": "crawler-usleep"') || exporterJs.includes("'crawler_usleep': 'crawler-usleep'"), 'KEY_MAPPING_TO_LSCWP crawler_usleep → crawler-usleep');
assert(exporterJs.includes('object-pswd'), 'exporter mentions object-pswd denylist');
assert(exporterJs.includes('function isSecretOptionKey'), 'isSecretOptionKey defined');
assert(stylesCss.includes('Stylesheet (v2.7.1.4)'), 'styles.css header v2.7.1.4');
assert(readmeMd.includes('Dashboard (v2.7.1.4)'), 'README.md header v2.7.1.4');
assert(readmeMd.includes('Release v2.7.1.4:'), 'README.md has v2.7.1.4 changelog');
assert(readmeMd.includes('Release v2.7.1.3:'), 'README.md keeps v2.7.1.3 changelog');
assert(geminiMd.includes('Arkitektur (v2.7.1.4)'), 'GEMINI.md Arkitektur v2.7.1.4');

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
// Reset module.exports so rules can attach
context.module.exports = {};
vm.runInContext(rulesJs, context);

const exported = context.module && context.module.exports ? context.module.exports : {};
const pick = (name) => context[name] || exported[name] || (context.window && context.window[name]);

assert(typeof pick('getOptionComparison') === 'function', 'getOptionComparison available');
assert(typeof pick('buildCompleteLscwpSettings') === 'function', 'buildCompleteLscwpSettings available');
assert(typeof pick('parseSettingsFile') === 'function', 'parseSettingsFile available');
assert(typeof pick('maskSecretKey') === 'function', 'maskSecretKey available');
assert(typeof pick('isSecretOptionKey') === 'function', 'isSecretOptionKey available');

const tabs = pick('buildCompleteLscwpSettings')(
  { hasWooCommerce: true, hasElementor: true, isLiteSpeedServer: true },
  {}
);
let usleepOpt = null;
let crawlerOpt = null;
for (const t of tabs) {
  if (!t.options) continue;
  for (const o of t.options) {
    if (o.id === 'crawler_usleep') usleepOpt = o;
    if (o.id === 'crawler') crawlerOpt = o;
  }
}
assert(!!usleepOpt, 'crawler_usleep option present');
assert(!!crawlerOpt, 'crawler option present');

const getComp = pick('getOptionComparison');

console.log('\n--- 2. Crawler OFF, no usleep → measured Inaktiv ---');
{
  const uploaded = { crawler: '0', 'crawler-crawl_interval': 302400 };
  const comp = getComp(usleepOpt, uploaded, {});
  assert(comp.isMeasured === true, `crawler off: isMeasured true (got ${comp.isMeasured})`);
  assert(/Inaktiv/i.test(String(comp.currentDisplay)) && /Crawler/i.test(String(comp.currentDisplay)),
    `crawler off: display Inaktiv/Crawler got=${comp.currentDisplay}`);
  assert(comp.isMatches === true, 'crawler off: isMatches soft true');
}

console.log('\n--- 3. Crawler false boolean, no usleep ---');
{
  const uploaded = { crawler: false };
  const comp = getComp(usleepOpt, uploaded, {});
  assert(comp.isMeasured === true, `crawler false: isMeasured (got ${comp.isMeasured})`);
  assert(/Inaktiv/i.test(String(comp.currentDisplay)),
    `crawler false: Inaktiv got=${comp.currentDisplay}`);
}

console.log('\n--- 4. Crawler ON + usleep present → measured with value ---');
{
  const uploaded = { crawler: '1', crawler_usleep: 500 };
  const comp = getComp(usleepOpt, uploaded, {});
  assert(comp.isMeasured === true, 'crawler on+usleep: isMeasured');
  assert(String(comp.currentDisplay).includes('500'),
    `crawler on+usleep: shows 500 got=${comp.currentDisplay}`);
  assert(!/Inaktiv/i.test(String(comp.currentDisplay)),
    `crawler on+usleep: not Inaktiv got=${comp.currentDisplay}`);
}

console.log('\n--- 5. Crawler ON + crawler-usleep hyphen alias ---');
{
  const uploaded = { crawler: 1, 'crawler-usleep': 1200 };
  const comp = getComp(usleepOpt, uploaded, {});
  assert(comp.isMeasured === true, 'hyphen usleep: isMeasured');
  assert(String(comp.currentDisplay).includes('1200'),
    `hyphen usleep: shows 1200 got=${comp.currentDisplay}`);
}

console.log('\n--- 6. Crawler ON + usleep absent → unmeasured ---');
{
  const uploaded = { crawler: '1', 'crawler-crawl_interval': 100 };
  const comp = getComp(usleepOpt, uploaded, {});
  assert(comp.isMeasured === false,
    `crawler on no usleep: unmeasured got isMeasured=${comp.isMeasured} display=${comp.currentDisplay}`);
}

console.log('\n--- 7. Real roligakalsonger .data ---');
const realPath = '/Users/richardviitanen/Downloads/LSCWP_cfg-www.roligakalsonger.se_-20260924_083028.data';
assert(fs.existsSync(realPath), 'real .data file exists');
if (fs.existsSync(realPath)) {
  const raw = fs.readFileSync(realPath, 'utf8');
  const parsed = pick('parseSettingsFile')(raw);
  assert(parsed && typeof parsed === 'object', 'parseSettingsFile returns object');
  assert(parsed.crawler === '0' || parsed.crawler === 0 || parsed.crawler === false,
    `real crawler off got=${parsed.crawler}`);
  assert(parsed.crawler_usleep === undefined && parsed['crawler-usleep'] === undefined,
    'real file has NO crawler_usleep key');
  assert(typeof parsed['object-pswd'] === 'string' && parsed['object-pswd'].length > 5,
    'real file keeps object-pswd internally for round-trip');

  const usleepComp = getComp(usleepOpt, parsed, {});
  assert(usleepComp.isMeasured === true, `real: crawler_usleep isMeasured got=${usleepComp.isMeasured}`);
  assert(/Inaktiv/i.test(String(usleepComp.currentDisplay)) && /Crawler/i.test(String(usleepComp.currentDisplay)),
    `real: Inaktiv (Crawler AV) got=${usleepComp.currentDisplay}`);

  // Password must not leak via mask helpers
  const SAMPLE = parsed['object-pswd'];
  const masked = pick('maskSecretKey')(SAMPLE);
  assert(masked !== SAMPLE, 'maskSecretKey does not return raw password');
  assert(!String(masked).includes(SAMPLE), 'masked output does not contain full password');
  assert(pick('isSecretOptionKey')('object-pswd') === true, 'isSecretOptionKey(object-pswd)');
  assert(pick('isSecretOptionKey')('object_pswd') === true, 'isSecretOptionKey(object_pswd)');
  assert(pick('maskValueIfSecret')('object-pswd', SAMPLE) !== SAMPLE,
    'maskValueIfSecret masks object-pswd');
  assert(pick('maskValueIfSecret')('crawler', '0') === '0' || pick('maskValueIfSecret')('crawler', '0') === 0,
    'maskValueIfSecret leaves non-secret alone');
}

console.log('\n--- 8. APP_VERSION runtime ---');
assert(/const APP_VERSION = "2\.7\.1\.4"/.test(appJs), 'APP_VERSION source 2.7.1.4');

console.log(`\n=== v2.7.1.4 VERIFICATION SUMMARY: ${passed} passed, ${failed} failed ===`);
process.exit(failed > 0 ? 1 : 0);
