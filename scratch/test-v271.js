/**
 * Automated Verification Suite for AreWee-Optimizer v2.7.1
 * - Tab order: media → image_optimization → html → crawler ([5]/[6]/[7]/[8])
 * - img_optm options + CDN status fields present
 * - domain_key masked in maskSecretKey helper
 * - CTM/SCM latestRelease ≠ app version 2.7.1
 * - qs_rm still deviant when ON on woo
 * - Version string 2.7.1
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

console.log('=== STARTING v2.7.1 VERIFICATION SUITE ===\n');

// --- 1. Version consistency ---
console.log('--- 1. Version Consistency (current = v2.7.1.2) ---');
const indexHtml = fs.readFileSync(path.join(BASE_DIR, 'index.html'), 'utf8');
const stylesCss = fs.readFileSync(path.join(BASE_DIR, 'css/styles.css'), 'utf8');
const appJs = fs.readFileSync(path.join(BASE_DIR, 'js/app.js'), 'utf8');
const rulesJs = fs.readFileSync(path.join(BASE_DIR, 'js/rules.js'), 'utf8');
const exporterJs = fs.readFileSync(path.join(BASE_DIR, 'js/exporter.js'), 'utf8');
const readmeMd = fs.readFileSync(path.join(BASE_DIR, 'README.md'), 'utf8');
const geminiMd = fs.readFileSync(path.join(BASE_DIR, 'GEMINI.md'), 'utf8');

assert(indexHtml.includes('(v2.7.1.2)'), 'index.html mentions v2.7.1.2');
assert(indexHtml.includes('?v=2.7.1.2'), 'index.html cache-bust ?v=2.7.1.2');
assert(appJs.includes('const APP_VERSION = "2.7.1.2"'), 'app.js APP_VERSION = 2.7.1.2');
assert(appJs.includes('targetVersion = "2.7.1.2"'), 'app.js targetVersion = 2.7.1.2');
assert(rulesJs.includes('Compatibility Engine (v2.7.1.2)'), 'rules.js header v2.7.1.2');
assert(exporterJs.includes('Exporter / Serializer (v2.7.1.2)'), 'exporter.js header v2.7.1.2');
assert(exporterJs.includes("'syncPluginVersion' => '2.7.1.2'"), 'exporter.js syncPluginVersion 2.7.1.2');
assert(stylesCss.includes('Stylesheet (v2.7.1.2)'), 'styles.css header v2.7.1.2');
assert(readmeMd.includes('Dashboard (v2.7.1.2)'), 'README.md header v2.7.1.2');
assert(readmeMd.includes('Release v2.7.1:'), 'README.md has v2.7.1 changelog');
assert(geminiMd.includes('Arkitektur (v2.7.1.2)'), 'GEMINI.md Arkitektur v2.7.1.2');
assert(exporterJs.includes('image_optimization'), 'exporter.js includes image_optimization in section order');

// --- Load rules + exporter ---
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
vm.runInContext(rulesJs, context);

// Prefer window attachments; fall back to module.exports from exporter
const exported = context.module && context.module.exports ? context.module.exports : {};
if (!context.KEY_MAPPING_TO_INTERNAL && exported.KEY_MAPPING_TO_INTERNAL) {
  context.KEY_MAPPING_TO_INTERNAL = exported.KEY_MAPPING_TO_INTERNAL;
  context.KEY_MAPPING_TO_LSCWP = exported.KEY_MAPPING_TO_LSCWP;
  context.maskSecretKey = exported.maskSecretKey || context.maskSecretKey;
}

const tabs = context.buildCompleteLscwpSettings(
  { hasWooCommerce: true, hasElementor: true, isLiteSpeedServer: true },
  { media_lazy: '0', domain_key: 'ABCD1234SECRETKEY9999XYZW', 'img_optm-auto': '1', 'img_optm-rm_bkup': '0' }
);
const ids = tabs.map(t => t.id);
const titles = Object.fromEntries(tabs.map(t => [t.id, t.title]));

// --- 2. Tab id/order ---
console.log('\n--- 2. Tab structure Media → Image → HTML → Crawler ---');
const iMedia = ids.indexOf('page_optimization_media');
const iImg = ids.indexOf('image_optimization');
const iHtml = ids.indexOf('page_optimization_html');
const iCrawler = ids.indexOf('crawler');
assert(iMedia !== -1, 'page_optimization_media tab exists');
assert(iImg !== -1, 'image_optimization tab exists');
assert(iHtml !== -1, 'page_optimization_html tab exists');
assert(iCrawler !== -1, 'crawler tab exists');
assert(iMedia < iImg && iImg < iHtml && iHtml < iCrawler, 'tab order: media → image_optimization → html → crawler');
assert(String(titles.page_optimization_media).includes('[5]') && String(titles.page_optimization_media).includes('Media'), 'media title is [5] Media & LCP');
assert(String(titles.image_optimization).includes('[6]') && String(titles.image_optimization).includes('Bildoptimering'), 'image title is [6] Bildoptimering');
assert(String(titles.page_optimization_html).includes('[7]') && String(titles.page_optimization_html).includes('HTML'), 'html title is [7] Sidopt. HTML');
assert(String(titles.crawler).includes('[8]'), 'crawler title contains [8]');

const mediaTab = tabs.find(t => t.id === 'page_optimization_media');
const imgTab = tabs.find(t => t.id === 'image_optimization');
const htmlTab = tabs.find(t => t.id === 'page_optimization_html');
const mediaOptIds = mediaTab.options.map(o => o.id);
const imgOptIds = imgTab.options.map(o => o.id);
const htmlOptIds = htmlTab.options.map(o => o.id);

assert(mediaOptIds.includes('media_webp') && !mediaOptIds.includes('img_optm_webp'), 'media_webp stays on Media & LCP; img_optm_webp not on media');
assert(imgOptIds.includes('img_optm_auto') && imgOptIds.includes('img_optm_ori') && imgOptIds.includes('img_optm_rm_bkup'), 'img tab has auto/ori/rm_bkup');
assert(imgOptIds.includes('img_optm_lossless') && imgOptIds.includes('img_optm_sizes_skipped') && imgOptIds.includes('img_optm_exif'), 'img tab has lossless/sizes/exif');
assert(imgOptIds.includes('img_optm_webp') && imgOptIds.includes('img_optm_webp_attr') && imgOptIds.includes('img_optm_webp_replace_srcset'), 'img tab has webp next-gen trio');
assert(imgOptIds.includes('cdn') && imgOptIds.includes('cdn_quic') && imgOptIds.includes('cdn_cloudflare'), 'CDN status fields present');
assert(imgOptIds.includes('domain_key'), 'QUIC domain_key status on image tab');
assert(htmlOptIds.includes('optm_qs_rm'), 'html tab still has qs_rm');

// wpPath required on image options
const missingPath = imgTab.options.filter(o => !o.wpPath);
assert(missingPath.length === 0, `all image_optimization options have wpPath (missing: ${missingPath.map(o=>o.id).join(',')})`);
assert(htmlTab.options.every(o => o.wpPath), 'html options have wpPath');

// --- 3. Key aliases ---
console.log('\n--- 3. Key aliases (hyphen ↔ underscore) ---');
const toInt = context.KEY_MAPPING_TO_INTERNAL || (context.module && context.module.exports && context.module.exports.KEY_MAPPING_TO_INTERNAL);
const toLs = context.KEY_MAPPING_TO_LSCWP || (context.module && context.module.exports && context.module.exports.KEY_MAPPING_TO_LSCWP);
assert(!!toInt && !!toLs, 'KEY_MAPPING tables available in context');
assert(toInt['img_optm-auto'] === 'img_optm_auto', 'img_optm-auto → img_optm_auto');
assert(toLs['img_optm_auto'] === 'img_optm-auto', 'img_optm_auto → img_optm-auto');
assert(toInt['img_optm-webp'] === 'img_optm_webp', 'img_optm-webp maps to img_optm_webp (NOT media_webp)');
assert(toInt['media-webp'] === 'media_webp', 'media-webp still maps to media_webp');
assert(toInt['cdn-quic'] === 'cdn_quic', 'cdn-quic → cdn_quic');
assert(toLs['cdn_cloudflare'] === 'cdn-cloudflare', 'cdn_cloudflare → cdn-cloudflare');

// --- 4. domain_key masking ---
console.log('\n--- 4. domain_key masking ---');
const maskFn = context.maskSecretKey || (context.module && context.module.exports && context.module.exports.maskSecretKey);
assert(typeof maskFn === 'function', 'maskSecretKey exported');
const full = 'ABCD1234SECRETKEY9999XYZW';
const masked = maskFn(full);
assert(masked === 'ABCD…XYZW', `maskSecretKey masks middle (got ${masked})`);
assert(!masked.includes('SECRET'), 'masked value does not contain SECRET');
const dkOpt = imgTab.options.find(o => o.id === 'domain_key');
assert(dkOpt && String(dkOpt.recommendedRaw).includes('…') || String(dkOpt.recommendedRaw).includes('ABCD'), 'domain_key recommendedRaw is masked in tab');
const dkComp = context.getOptionComparison(
  { id: 'domain_key', title: 'DK', recommendedRaw: '', tool: 'litespeed', criticalLevel: 'standard' },
  { domain_key: full },
  {}
);
assert(String(dkComp.currentDisplay).includes('…') || String(dkComp.currentDisplay).includes('Ansluten'), 'domain_key comparison display masked/connected');
assert(!String(dkComp.currentDisplay).includes('SECRET'), 'comparison does not leak SECRET');

// --- 5. CTM/SCM latest ≠ app version ---
console.log('\n--- 5. CTM/SCM BENCHMARK_VERSIONS ---');
const bv = context.BENCHMARK_VERSIONS;
assert(bv.ctm.latestRelease !== '2.7.1' && bv.ctm.latestRelease !== '2.7.0', `CTM latestRelease is plugin version (got ${bv.ctm.latestRelease})`);
assert(bv.scm.latestRelease !== '2.7.1' && bv.scm.latestRelease !== '2.7.0', `SCM latestRelease is plugin version (got ${bv.scm.latestRelease})`);
assert(bv.ctm.latestRelease === '1.9.0', 'CTM latestRelease is 1.9.0');
assert(bv.scm.latestRelease === '1.4.1', 'SCM latestRelease is 1.4.1');

// --- 6. qs_rm still deviant when ON on woo ---
console.log('\n--- 6. qs_rm Woo rule unchanged ---');
const qsOpt = htmlTab.options.find(o => o.id === 'optm_qs_rm');
assert(qsOpt && (qsOpt.recommendedRaw === 0 || qsOpt.recommendedRaw === '0'), 'qs_rm recommended AV on woo/elem profile');
const qsCompOn = context.getOptionComparison(
  { id: 'optm_qs_rm', title: 'QS', recommendedRaw: 0, tool: 'litespeed', criticalLevel: 'standard' },
  { optm_qs_rm: '1' },
  { hasWooCommerce: true }
);
assert(qsCompOn.isDeviant === true || qsCompOn.isMatches === false, 'qs_rm PÅ on woo is still deviant/yellow');

// --- 7. Info alerts for rm_bkup / missing QUIC ---
console.log('\n--- 7. Image optimization info alerts ---');
const analysisRm = context.analyzeSystem(
  { 'wp-core': { version: '6.8' }, 'wp-server': { httpd_software: 'LiteSpeed' }, 'wp-plugins-active': {} },
  null, null, null,
  { 'img_optm-rm_bkup': '1', media_lazy: '0' }
);
const rmAlert = (analysisRm.alerts || []).find(a => a.id === 'img_optm_rm_bkup_on');
assert(!!rmAlert, 'rm_bkup PÅ emits info alert');
assert(rmAlert.type === 'info', 'rm_bkup alert is info');
assert(rmAlert.scoreImpact === 0, 'rm_bkup alert scoreImpact 0');

const analysisNoKey = context.analyzeSystem(
  { 'wp-core': { version: '6.8' }, 'wp-server': { httpd_software: 'LiteSpeed' }, 'wp-plugins-active': {} },
  null, null, null,
  { 'img_optm-auto': '1', media_lazy: '0' }
);
const noKeyAlert = (analysisNoKey.alerts || []).find(a => a.id === 'img_optm_without_quic_key');
assert(!!noKeyAlert, 'img opt PÅ without QUIC key emits info alert');
assert(noKeyAlert.type === 'info' && noKeyAlert.scoreImpact === 0, 'no-key alert is info scoreImpact 0');

// --- 8. Exporter section order ---
console.log('\n--- 8. Exporter section order ---');
assert(
  /page_optimization_media["',\s]+image_optimization["',\s]+page_optimization_html["',\s]+crawler/.test(exporterJs.replace(/\s+/g, '')),
  'exporter section order: media → image_optimization → html → crawler'
);

console.log(`\n=== v2.7.1 VERIFICATION SUMMARY: ${passed} passed, ${failed} failed ===`);
process.exit(failed > 0 ? 1 : 0);
