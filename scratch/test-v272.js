/**
 * Automated Verification Suite for AreWee-Optimizer v2.7.2.1
 * A) GF context (Elementor default false + shared hasExternalGoogleFonts)
 * B) Crawler Policy on LS when OFF
 * C) all_deviations default filter wiring (static) + isDeviant semantics
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
const geminiMd = fs.readFileSync(path.join(BASE_DIR, 'GEMINI.md'), 'utf8');

console.log('--- 1. Version Consistency (v2.7.2.1) ---');
assert(indexHtml.includes('(v2.7.2.1)'), 'index.html mentions v2.7.2.1');
assert(indexHtml.includes('?v=2.7.2.1'), 'index.html cache-bust ?v=2.7.2.1');
assert(appJs.includes('const APP_VERSION = "2.7.2.1"'), 'app.js APP_VERSION = 2.7.2.1');
assert(appJs.includes('targetVersion = "2.7.2.1"'), 'app.js targetVersion = 2.7.2.1');
assert(rulesJs.includes('Compatibility Engine (v2.7.2.1)'), 'rules.js header v2.7.2.1');
assert(exporterJs.includes('Exporter / Serializer (v2.7.2.1)'), 'exporter.js header v2.7.2.1');
assert(exporterJs.includes("'syncPluginVersion' => '2.7.2.1'"), 'exporter.js syncPluginVersion 2.7.2.1');
assert(stylesCss.includes('Stylesheet (v2.7.2.1)'), 'styles.css header v2.7.2.1');
assert(readmeMd.includes('Dashboard (v2.7.2.1)'), 'README.md header v2.7.2.1');
assert(readmeMd.includes('Release v2.7.2.1:'), 'README.md has v2.7.2.1 changelog');
assert(geminiMd.includes('Arkitektur (v2.7.2.1)'), 'GEMINI.md Arkitektur v2.7.2.1');

console.log('\n--- 2. Static wiring (A/B/C) ---');
assert(/google_fonts:\s*false/.test(appJs), 'Elementor parse default google_fonts: false');
assert(!/google_fonts:\s*true/.test(appJs.match(/function parseElementorStatus[\s\S]*?return data;/)?.[0] || ''),
  'parseElementorStatus default block has no google_fonts: true');
assert(rulesJs.includes('function hasExternalGoogleFonts'), 'hasExternalGoogleFonts defined');
assert(appJs.includes('activeSettingsFilter: "all_deviations"'), 'default filter is all_deviations');
assert(indexHtml.includes('data-filter="all_deviations"') && indexHtml.includes('filter-btn-all-deviations'),
  'index has Alla avvikelser button as default active');
assert(/filter-btn active" data-filter="all_deviations"/.test(indexHtml) ||
       /data-filter="all_deviations"[^>]*class="filter-btn active"/.test(indexHtml) ||
       indexHtml.includes('class="filter-btn active" data-filter="all_deviations"'),
  'all_deviations button is the active default');
assert(indexHtml.includes('Endast avvikelser (flik)'), 'tab-scoped deviations label kept');
assert(stylesCss.includes('.category-tab-badge'), 'CSS for category badge present');
assert(appJs.includes('isDeviant && comp.isMeasured') || appJs.includes('comp.isDeviant && comp.isMeasured'),
  'filter predicate uses isDeviant && isMeasured');

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

const getOptionComparison = pick('getOptionComparison');
const hasExternalGoogleFonts = pick('hasExternalGoogleFonts');
assert(typeof getOptionComparison === 'function', 'getOptionComparison available');
assert(typeof hasExternalGoogleFonts === 'function', 'hasExternalGoogleFonts available');

const optAsync = { id: 'optm_ggfonts_async', title: 'GF Async', recommendedRaw: 1, criticalLevel: 'standard', scoreImpact: 0 };
const optDns = { id: 'optm_dns_prefetch', title: 'DNS Prefetch', recommendedRaw: '//fonts.googleapis.com\n//fonts.gstatic.com', criticalLevel: 'standard', scoreImpact: 0 };
const optCrawl = { id: 'crawler', title: 'Crawler', recommendedRaw: 1, criticalLevel: 'standard', scoreImpact: 0 };

console.log('\n--- 3. A) GF helper + async ---');
assert(hasExternalGoogleFonts({ optm_ggfonts_rm: '0' }, { elemInfo: { google_fonts: false } }) === false,
  'helper: false Elementor GF → no external');
assert(hasExternalGoogleFonts({ optm_ggfonts_rm: '0' }, { elemInfo: {} }) === false,
  'helper: missing google_fonts → no external (do not invent)');
assert(hasExternalGoogleFonts({ optm_ggfonts_rm: '0' }, { elemInfo: { google_fonts: true } }) === true,
  'helper: explicit true → external');
assert(hasExternalGoogleFonts({ optm_ggfonts_rm: '1' }, { elemInfo: { google_fonts: true } }) === false,
  'helper: Remove ON → no external even if Elem GF');

const asyncNoGf = getOptionComparison(optAsync, { optm_ggfonts_async: '0', optm_ggfonts_rm: '0' }, { elemInfo: { google_fonts: false } });
assert(asyncNoGf.isMatches === true && asyncNoGf.isDeviant === false, 'async OFF + GF false → Optimal');
assert(String(asyncNoGf.recommendedDisplay).includes('Inaktiv') || String(asyncNoGf.currentDisplay).includes('Inaktiv'),
  'async no-GF copy mentions Inaktiv');

const asyncMissing = getOptionComparison(optAsync, { optm_ggfonts_async: '0', optm_ggfonts_rm: '0' }, { elemInfo: {} });
assert(asyncMissing.isMatches === true && asyncMissing.isDeviant === false, 'async OFF + GF missing → Optimal');

const asyncRm = getOptionComparison(optAsync, { optm_ggfonts_async: '0', optm_ggfonts_rm: '1' }, { elemInfo: { google_fonts: true } });
assert(asyncRm.isMatches === true && asyncRm.isDeviant === false, 'Remove ON → async Optimal');

const asyncDev = getOptionComparison(optAsync, { optm_ggfonts_async: '0', optm_ggfonts_rm: '0' }, { elemInfo: { google_fonts: true } });
assert(asyncDev.isMatches === false && asyncDev.isDeviant === true, 'explicit GF true + async OFF → deviant');

const asyncOk = getOptionComparison(optAsync, { optm_ggfonts_async: '1', optm_ggfonts_rm: '0' }, { elemInfo: { google_fonts: true } });
assert(asyncOk.isMatches === true && asyncOk.isDeviant === false, 'GF true + async ON → Optimal');

console.log('\n--- 4. A) DNS Prefetch soft-match ---');
const dnsEmptyNoGf = getOptionComparison(optDns, { optm_dns_prefetch: '', optm_ggfonts_rm: '0' }, { elemInfo: { google_fonts: false } });
assert(dnsEmptyNoGf.isMatches === true && dnsEmptyNoGf.isDeviant === false, 'DNS empty + no GF → Optimal-Inaktiv');
assert(String(dnsEmptyNoGf.currentDisplay).includes('Inaktiv'), 'DNS no-GF display Inaktiv');

const dnsEmptyRm = getOptionComparison(optDns, { optm_dns_prefetch: '', optm_ggfonts_rm: '1' }, { elemInfo: { google_fonts: true } });
assert(dnsEmptyRm.isMatches === true && dnsEmptyRm.isDeviant === false, 'DNS empty + Remove ON → Optimal-Inaktiv');

const dnsEmptyWithGf = getOptionComparison(optDns, { optm_dns_prefetch: '', optm_ggfonts_rm: '0' }, { elemInfo: { google_fonts: true } });
assert(dnsEmptyWithGf.isMatches === false && dnsEmptyWithGf.isDeviant === true, 'DNS empty + GF in use → deviant');

const dnsFilled = getOptionComparison(optDns, {
  optm_dns_prefetch: '//fonts.googleapis.com\n//fonts.gstatic.com',
  optm_ggfonts_rm: '0'
}, { elemInfo: { google_fonts: true } });
assert(dnsFilled.isMatches === true && dnsFilled.isDeviant === false, 'DNS filled + GF in use → Optimal');

// async and DNS must agree on hasExternalGg
const envAgree = { elemInfo: { google_fonts: false } };
const settAgree = { optm_ggfonts_async: '0', optm_dns_prefetch: '', optm_ggfonts_rm: '0' };
const a1 = getOptionComparison(optAsync, settAgree, envAgree);
const d1 = getOptionComparison(optDns, settAgree, envAgree);
assert(a1.isDeviant === false && d1.isDeviant === false, 'async+DNS agree Optimal when no GF');

console.log('\n--- 5. B) Crawler Policy ---');
const crawlOffLs = getOptionComparison(optCrawl, { crawler: '0' }, { isLiteSpeedServer: true });
assert(crawlOffLs.isMatches === true, 'LS + crawler OFF → isMatches true');
assert(crawlOffLs.isDeviant === false, 'LS + crawler OFF → not deviant');
assert(crawlOffLs.isPolicyContext === true, 'LS + crawler OFF → isPolicyContext');
assert(String(crawlOffLs.statusLabel).includes('Policy'), 'LS + crawler OFF statusLabel Policy');
assert(String(crawlOffLs.recommendedDisplay).toLowerCase().includes('shared') ||
       String(crawlOffLs.currentDisplay).toLowerCase().includes('shared'),
  'LS + crawler OFF copy mentions shared');

const crawlOnLs = getOptionComparison(optCrawl, { crawler: '1' }, { isLiteSpeedServer: true });
assert(crawlOnLs.isMatches === true && crawlOnLs.isDeviant === false, 'LS + crawler ON → Optimal');
assert(crawlOnLs.isPolicyContext !== true, 'LS + crawler ON is not Policy');

const crawlOnNonLs = getOptionComparison(optCrawl, { crawler: '1' }, { isLiteSpeedServer: false });
assert(crawlOnNonLs.isMatches === false && crawlOnNonLs.isDeviant === true, 'non-LS + crawler ON → deviant (rec AV)');

const crawlOffNonLs = getOptionComparison(optCrawl, { crawler: '0' }, { isLiteSpeedServer: false });
assert(crawlOffNonLs.isMatches === true && crawlOffNonLs.isDeviant === false, 'non-LS + crawler OFF → Optimal');

console.log('\n--- 6. C) isDeviant filter semantics ---');
function isGlobalDeviation(comp) {
  return !!(comp && comp.isMeasured && comp.isDeviant);
}
assert(isGlobalDeviation(asyncDev) === true, 'filter includes measured deviant');
assert(isGlobalDeviation(crawlOffLs) === false, 'filter excludes Policy (isMatches true)');
assert(isGlobalDeviation(asyncNoGf) === false, 'filter excludes Optimal');
assert(isGlobalDeviation({ isMeasured: false, isDeviant: true }) === false, 'filter excludes unmeasured even if deviant flag');
assert(isGlobalDeviation({ isMeasured: true, isDeviant: false, isMatches: true }) === false, 'filter excludes measured Optimal');

console.log(`\n=== RESULTS: ${passed} passed, ${failed} failed ===`);
process.exit(failed > 0 ? 1 : 0);
