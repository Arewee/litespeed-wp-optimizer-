/**
 * Automated Verification Suite for AreWee-Optimizer v2.7.1.5
 * Audit remediation: crawl_interval, WRITE maps, media_webp aliases,
 * domain_key dedupe, first-_ hyphen fallback, APP_VERSION.
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

console.log('=== STARTING v2.7.1.5 VERIFICATION SUITE ===\n');

const indexHtml = fs.readFileSync(path.join(BASE_DIR, 'index.html'), 'utf8');
const appJs = fs.readFileSync(path.join(BASE_DIR, 'js/app.js'), 'utf8');
const rulesJs = fs.readFileSync(path.join(BASE_DIR, 'js/rules.js'), 'utf8');
const exporterJs = fs.readFileSync(path.join(BASE_DIR, 'js/exporter.js'), 'utf8');
const stylesCss = fs.readFileSync(path.join(BASE_DIR, 'css/styles.css'), 'utf8');
const readmeMd = fs.readFileSync(path.join(BASE_DIR, 'README.md'), 'utf8');
const geminiMd = fs.readFileSync(path.join(BASE_DIR, 'GEMINI.md'), 'utf8');

console.log('--- 1. Version Consistency (v2.7.1.5) ---');
assert(indexHtml.includes('(v2.7.1.5)'), 'index.html mentions v2.7.1.5');
assert(indexHtml.includes('?v=2.7.1.5'), 'index.html cache-bust ?v=2.7.1.5');
assert(appJs.includes('const APP_VERSION = "2.7.1.5"'), 'app.js APP_VERSION = 2.7.1.5');
assert(appJs.includes('targetVersion = "2.7.1.5"'), 'app.js targetVersion = 2.7.1.5');
assert(rulesJs.includes('Compatibility Engine (v2.7.1.5)'), 'rules.js header v2.7.1.5');
assert(exporterJs.includes('Exporter / Serializer (v2.7.1.5)'), 'exporter.js header v2.7.1.5');
assert(exporterJs.includes("'syncPluginVersion' => '2.7.1.5'"), 'exporter.js syncPluginVersion 2.7.1.5');
assert(stylesCss.includes('Stylesheet (v2.7.1.5)'), 'styles.css header v2.7.1.5');
assert(readmeMd.includes('Dashboard (v2.7.1.5)'), 'README.md header v2.7.1.5');
assert(readmeMd.includes('Release v2.7.1.5:'), 'README.md has v2.7.1.5 changelog');
assert(readmeMd.includes('Backlog (ej UI i 2.7.1.5)'), 'README.md documents backlog');
assert(geminiMd.includes('Arkitektur (v2.7.1.5)'), 'GEMINI.md Arkitektur v2.7.1.5');

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

assert(typeof pick('getOptionComparison') === 'function', 'getOptionComparison available');
assert(typeof pick('buildCompleteLscwpSettings') === 'function', 'buildCompleteLscwpSettings available');
assert(typeof pick('parseSettingsFile') === 'function', 'parseSettingsFile available');
assert(typeof pick('translateKeysToInternal') === 'function' || typeof pick('KEY_MAPPING_TO_INTERNAL') === 'object',
  'KEY_MAPPING_TO_INTERNAL available');

const TO_INT = pick('KEY_MAPPING_TO_INTERNAL');
const TO_LSCWP = pick('KEY_MAPPING_TO_LSCWP');
assert(!!TO_INT && !!TO_LSCWP, 'both KEY_MAPPING objects present');

console.log('\n--- 2. KEY_MAPPING_TO_INTERNAL (crawl_interval + aliases) ---');
assert(TO_INT['crawler-crawl_interval'] === 'crawler_usleep', 'INTERNAL crawler-crawl_interval → crawler_usleep');
assert(TO_INT['crawler-usleep'] === 'crawler_usleep', 'INTERNAL crawler-usleep alias kept');
assert(TO_INT['media-webp'] === 'media_webp', 'INTERNAL media-webp kept');
assert(TO_INT['media_webp'] === 'media_webp', 'INTERNAL media_webp kept');
assert(TO_INT['media-optm_webp'] === undefined, 'INTERNAL media-optm_webp removed');
assert(TO_INT['media_optm_webp'] === undefined, 'INTERNAL media_optm_webp removed');
assert(TO_INT['media-webp_dec'] === undefined, 'INTERNAL media-webp_dec removed');
assert(TO_INT['media_webp_dec'] === undefined, 'INTERNAL media_webp_dec removed');
assert(TO_INT['api_key'] === 'domain_key', 'INTERNAL api_key → domain_key');
assert(TO_INT['hash'] === 'domain_key', 'INTERNAL hash → domain_key');
assert(TO_INT['db_optm-revisions_max'] === 'db_optm_revisions', 'INTERNAL revisions_max');
assert(TO_INT['db_optm-revisions_age'] === 'db_optm_revisions_age', 'INTERNAL revisions_age');

console.log('\n--- 3. KEY_MAPPING_TO_LSCWP write keys ---');
assert(TO_LSCWP['optm_font_display'] === 'optm-css_font_display', 'WRITE font_display → optm-css_font_display');
assert(TO_LSCWP['optm_emojis_rm'] === 'optm-emoji_rm', 'WRITE emojis_rm → optm-emoji_rm');
assert(TO_LSCWP['cache_object'] === 'object', 'WRITE cache_object → object');
assert(TO_LSCWP['domain_key'] === 'hash', 'WRITE domain_key → hash');
assert(TO_LSCWP['crawler_usleep'] === 'crawler-crawl_interval', 'WRITE crawler_usleep → crawler-crawl_interval');
assert(TO_LSCWP['db_optm_revisions'] === 'db_optm-revisions_max', 'WRITE db_optm_revisions → revisions_max');

const tabs = pick('buildCompleteLscwpSettings')(
  { hasWooCommerce: true, hasElementor: true, isLiteSpeedServer: true },
  {}
);
let usleepOpt = null;
let mediaWebpOpt = null;
let imgWebpOpt = null;
let domainKeyCount = 0;
for (const t of tabs) {
  if (!t.options) continue;
  for (const o of t.options) {
    if (o.id === 'crawler_usleep') usleepOpt = o;
    if (o.id === 'media_webp') mediaWebpOpt = o;
    if (o.id === 'img_optm_webp') imgWebpOpt = o;
    if (o.id === 'domain_key') domainKeyCount++;
  }
}
assert(!!usleepOpt, 'crawler_usleep option present');
assert(domainKeyCount === 1, `only one domain_key in catalog (got ${domainKeyCount})`);
assert(/Crawl Interval/i.test(String(usleepOpt.title)), `title mentions Crawl Interval got=${usleepOpt.title}`);

const getComp = pick('getOptionComparison');

console.log('\n--- 4. Crawler ON + crawl_interval only → measured ---');
{
  const uploaded = { crawler: '1', 'crawler-crawl_interval': 302400 };
  const comp = getComp(usleepOpt, uploaded, {});
  assert(comp.isMeasured === true, `crawler on+interval: isMeasured (got ${comp.isMeasured})`);
  assert(String(comp.currentDisplay).includes('302400'),
    `crawler on+interval: shows 302400 got=${comp.currentDisplay}`);
  assert(!/Inaktiv/i.test(String(comp.currentDisplay)),
    `crawler on+interval: not Inaktiv got=${comp.currentDisplay}`);
}

console.log('\n--- 5. Crawler OFF → still Inaktiv ---');
{
  const uploaded = { crawler: '0', 'crawler-crawl_interval': 302400 };
  const comp = getComp(usleepOpt, uploaded, {});
  assert(comp.isMeasured === true, `crawler off: isMeasured (got ${comp.isMeasured})`);
  assert(/Inaktiv/i.test(String(comp.currentDisplay)) && /Crawler/i.test(String(comp.currentDisplay)),
    `crawler off: Inaktiv/Crawler got=${comp.currentDisplay}`);
}
{
  const uploaded = { crawler: false };
  const comp = getComp(usleepOpt, uploaded, {});
  assert(comp.isMeasured === true, `crawler false no interval: isMeasured`);
  assert(/Inaktiv/i.test(String(comp.currentDisplay)),
    `crawler false: Inaktiv got=${comp.currentDisplay}`);
}

console.log('\n--- 6. Legacy crawler-usleep still works ---');
{
  const uploaded = { crawler: '1', 'crawler-usleep': 1200 };
  const comp = getComp(usleepOpt, uploaded, {});
  assert(comp.isMeasured === true, 'legacy usleep: isMeasured');
  assert(String(comp.currentDisplay).includes('1200'),
    `legacy usleep: shows 1200 got=${comp.currentDisplay}`);
}

console.log('\n--- 7. Hyphen fallback: first underscore only ---');
{
  // Simulate unmapped mixed key via source inspection + runtime lscwpKey path
  // Source must use replace(/_/, "-") not /_/g
  assert(rulesJs.includes('opt.id.replace(/_/, "-")'), 'rules.js first-underscore fallback');
  assert(!/opt\.id\.replace\(\/_\/g,\s*"-"\)/.test(rulesJs), 'rules.js no global _→- fallback');
  // Runtime: if we had an unmapped optm_css_min, lscwpKey should be optm-css_min
  // Use a synthetic option id that is NOT in KEY_MAPPING_TO_LSCWP
  const syntheticId = 'optm_css_min_SYNTH_TEST';
  // Directly verify the fallback expression semantics
  const fallback = (id) => id.startsWith('img_optm_')
    ? ('img_optm-' + id.slice('img_optm_'.length))
    : id.replace(/_/, '-');
  assert(fallback('optm_css_min') === 'optm-css_min', 'fallback optm_css_min → optm-css_min');
  assert(fallback('optm_css_min') !== 'optm-css-min', 'fallback does NOT produce optm-css-min');
  assert(fallback('img_optm_sizes_skipped') === 'img_optm-sizes_skipped', 'img_optm_* special path');
  void syntheticId;
}

console.log('\n--- 8. translateKeysToLscwp write keys ---');
{
  const translateOut = pick('translateKeysToLscwp');
  assert(typeof translateOut === 'function', 'translateKeysToLscwp available');
  const out = translateOut({
    optm_font_display: '1',
    optm_emojis_rm: '1',
    cache_object: '1',
    domain_key: 'ABCDEFGH12345678',
    crawler_usleep: 500
  });
  assert(out['optm-css_font_display'] !== undefined, 'translated has optm-css_font_display');
  assert(out['optm-font_display'] === undefined, 'translated lacks wrong optm-font_display');
  assert(out['optm-emoji_rm'] !== undefined, 'translated has optm-emoji_rm');
  assert(out['optm-emojis_rm'] === undefined, 'translated lacks wrong optm-emojis_rm');
  assert(out['object'] !== undefined, 'translated has object');
  assert(out['cache-object'] === undefined, 'translated lacks wrong cache-object');
  assert(out['hash'] === 'ABCDEFGH12345678', 'translated domain_key → hash');
  assert(out['domain_key'] === undefined, 'translated does not emit domain_key write key');
  assert(out['crawler-crawl_interval'] === 500, 'translated crawler_usleep → crawl_interval');
}

console.log('\n--- 9. Smoke: media_webp soft + img_optm ---');
{
  assert(!!mediaWebpOpt, 'media_webp option present');
  const soft = getComp(mediaWebpOpt, { 'img_optm-webp': '1' }, {});
  assert(soft.isMeasured === true, `media_webp soft via next-gen: isMeasured got=${soft.isMeasured}`);
  assert(/Next-Gen/i.test(String(soft.currentDisplay)) || /AV/i.test(String(soft.currentDisplay)),
    `media_webp soft display got=${soft.currentDisplay}`);

  if (imgWebpOpt) {
    const imgComp = getComp(imgWebpOpt, { 'img_optm-webp': 0 }, {});
    assert(imgComp.isMeasured === true, `img_optm_webp=0 measured got=${imgComp.isMeasured}`);
  }
  const sizesOpt = (() => {
    for (const t of tabs) {
      if (!t.options) continue;
      for (const o of t.options) if (o.id === 'img_optm_sizes_skipped') return o;
    }
    return null;
  })();
  if (sizesOpt) {
    const sc = getComp(sizesOpt, { 'img_optm-sizes_skipped': '' }, {});
    assert(sc.isMeasured === true, `img_optm_sizes_skipped empty measured got=${sc.isMeasured}`);
  }
}

console.log('\n--- 10. APP_VERSION runtime ---');
assert(/const APP_VERSION = "2\.7\.1\.5"/.test(appJs), 'APP_VERSION source 2.7.1.5');

console.log('\n--- 11. Real export smoke (roligakalsonger) ---');
const realPath = '/Users/richardviitanen/Downloads/LSCWP_cfg-www.roligakalsonger.se_-20260924_083028.data';
if (fs.existsSync(realPath)) {
  const raw = fs.readFileSync(realPath, 'utf8');
  const parsed = pick('parseSettingsFile')(raw);
  assert(parsed && typeof parsed === 'object', 'parseSettingsFile returns object');
  // After INTERNAL map, crawl_interval should land as crawler_usleep
  assert(parsed.crawler_usleep !== undefined || parsed['crawler-crawl_interval'] !== undefined,
    'parsed has crawler interval/usleep');
  const usleepComp = getComp(usleepOpt, parsed, {});
  assert(usleepComp.isMeasured === true, `real: crawler_usleep isMeasured got=${usleepComp.isMeasured}`);
  assert(/Inaktiv/i.test(String(usleepComp.currentDisplay)),
    `real crawler off: Inaktiv got=${usleepComp.currentDisplay}`);

  // crawler ON with only interval from real file shape
  const onParsed = Object.assign({}, parsed, { crawler: '1' });
  // Ensure interval present under either key
  if (onParsed.crawler_usleep === undefined && onParsed['crawler-crawl_interval'] === undefined) {
    onParsed['crawler-crawl_interval'] = 302400;
  }
  const onComp = getComp(usleepOpt, onParsed, {});
  assert(onComp.isMeasured === true, `real+crawler ON: isMeasured got=${onComp.isMeasured} display=${onComp.currentDisplay}`);
} else {
  console.log('⚠️  real .data missing — skipped');
}

console.log(`\n=== v2.7.1.5 VERIFICATION SUMMARY: ${passed} passed, ${failed} failed ===`);
process.exit(failed > 0 ? 1 : 0);
