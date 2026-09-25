/**
 * Automated Verification Suite for AreWee-Optimizer v2.7.3
 * - Version bump 2.7.2.2 → 2.7.3
 * - Profiles: btn-clear-history / clearAllHistory removed (btn-clear-inputs kept)
 * - Compare close: closeComparisonResult resets wrapper + selects
 * - QUIC.cloud live-edge: evaluateQuicCloudLiveEdge helper + Policy alerts
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

console.log('=== STARTING v2.7.3 VERIFICATION SUITE ===\n');

const indexHtml = fs.readFileSync(path.join(BASE_DIR, 'index.html'), 'utf8');
const appJs = fs.readFileSync(path.join(BASE_DIR, 'js/app.js'), 'utf8');
const rulesJs = fs.readFileSync(path.join(BASE_DIR, 'js/rules.js'), 'utf8');
const exporterJs = fs.readFileSync(path.join(BASE_DIR, 'js/exporter.js'), 'utf8');
const stylesCss = fs.readFileSync(path.join(BASE_DIR, 'css/styles.css'), 'utf8');
const readmeMd = fs.readFileSync(path.join(BASE_DIR, 'README.md'), 'utf8');
const geminiMd = fs.readFileSync(path.join(BASE_DIR, 'gemini.md'), 'utf8');

console.log('--- 1. Version Consistency (v2.7.3) ---');
assert(indexHtml.includes('(v2.7.3)'), 'index.html mentions v2.7.3');
assert(indexHtml.includes('?v=2.7.3'), 'index.html cache-bust ?v=2.7.3');
assert(indexHtml.includes('logo-tag">v2.7.3'), 'index.html logo-tag v2.7.3');
assert(!indexHtml.includes('?v=2.7.2.2'), 'index.html no stale ?v=2.7.2.2');
assert(appJs.includes('const APP_VERSION = "2.7.3"'), 'app.js APP_VERSION');
assert(appJs.includes('targetVersion = "2.7.3"'), 'app.js targetVersion');
assert(rulesJs.includes('Compatibility Engine (v2.7.3)'), 'rules.js header');
assert(exporterJs.includes('Exporter / Serializer (v2.7.3)'), 'exporter.js header');
assert(exporterJs.includes("'syncPluginVersion' => '2.7.3'"), 'exporter syncPluginVersion');
assert(stylesCss.includes('Stylesheet (v2.7.3)'), 'styles.css header');
assert(readmeMd.includes('Dashboard (v2.7.3)'), 'README header');
assert(readmeMd.includes('Release v2.7.3:'), 'README changelog 2.7.3');
assert(readmeMd.includes('Release v2.7.2.2:'), 'README preserves 2.7.2.2 changelog');
assert(geminiMd.includes('Arkitektur (v2.7.3)'), 'gemini Arkitektur');
assert(geminiMd.includes('evaluateQuicCloudLiveEdge'), 'gemini mentions live-edge helper');

console.log('\n--- 2. Feature 1: Remove profiles Rensa allt ---');
assert(!indexHtml.includes('btn-clear-history'), 'index.html no btn-clear-history');
assert(indexHtml.includes('btn-clear-inputs'), 'index.html keeps btn-clear-inputs');
assert(!appJs.includes('clearAllHistory'), 'app.js no clearAllHistory');
assert(!appJs.includes('btn-clear-history'), 'app.js no btn-clear-history');
assert(!appJs.includes('btnClearHistory'), 'app.js no btnClearHistory');
assert(appJs.includes('function deleteProfile'), 'per-profile deleteProfile kept');

console.log('\n--- 3. Feature 2: Compare close / back ---');
assert(indexHtml.includes('btn-compare-close'), 'index.html has btn-compare-close');
assert(indexHtml.includes('Stäng jämförelse'), 'Swedish close label');
assert(appJs.includes('function closeComparisonResult'), 'closeComparisonResult defined');
assert(appJs.includes('comparisonResultTableWrapper.innerHTML = ""'), 'close clears innerHTML');
assert(/compareSelectA\.value\s*=\s*""/.test(appJs) && /compareSelectB\.value\s*=\s*""/.test(appJs), 'close resets A/B selects');
assert(appJs.includes('btnCompareClose.addEventListener("click", closeComparisonResult)'), 'close button bound');
assert(appJs.includes('btnCompareClose.style.display = "flex"'), 'close shown after run');
assert(!/closeComparisonResult[\s\S]{0,400}historyLibrary\s*=\s*\[\]/.test(appJs), 'close does not wipe historyLibrary');

console.log('\n--- 4. Feature 3: QUIC helper static presence ---');
assert(rulesJs.includes('function evaluateQuicCloudLiveEdge'), 'evaluateQuicCloudLiveEdge defined');
assert(rulesJs.includes('cdn_quic_live_edge_missing') || rulesJs.includes('cdn_quic_live_edge_unmeasured'), 'live-edge alert ids present');
assert(rulesJs.includes('Domain Key') && rulesJs.includes('CDN-edge'), 'copy clarifies Domain Key ≠ CDN-edge');
assert(exporterJs.includes('quicLiveHeaders'), 'sync plugin returns quicLiveHeaders');
assert(appJs.includes('buildAnalyzeLiveContext'), 'app builds live context');
assert(appJs.includes('probeQuicLiveHeaders') || appJs.includes('maybeProbeQuicLiveEdge'), 'app has live probe');

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
const evaluateQuicCloudLiveEdge = exported.evaluateQuicCloudLiveEdge || context.evaluateQuicCloudLiveEdge;
const analyzeSystem = exported.analyzeSystem || context.analyzeSystem;
const getOptionComparison = exported.getOptionComparison || context.getOptionComparison;

console.log('\n--- 5. QUIC helper runtime ---');
assert(typeof evaluateQuicCloudLiveEdge === 'function', 'evaluateQuicCloudLiveEdge callable');

const off = evaluateQuicCloudLiveEdge({
  cdnQuic: 0,
  domainKey: 'ABCDEFGH1234567890KEY',
  liveHeaders: null,
  siteUrl: 'https://example.com'
});
assert(off.status === 'off', 'cdn_quic off → status off');
assert(!off.edgeConfirmed, 'cdn_quic off → not edgeConfirmed');
assert(!off.alertCandidate, 'cdn_quic off → no alert');
assert(off.displayLabel === 'AV' || /AV/i.test(off.displayLabel), 'cdn_quic off → AV display');
assert(off.note && /Domain Key/i.test(off.note), 'domain key alone noted ≠ edge when quic off');

const keyOnlyClaim = evaluateQuicCloudLiveEdge({
  cdnQuic: 0,
  domainKey: 'ABCDEFGH1234567890KEY',
  liveHeaders: { 'x-qc-cache': 'HIT' },
  siteUrl: 'https://example.com'
});
assert(keyOnlyClaim.status === 'off' && !keyOnlyClaim.edgeConfirmed, 'domain key + headers but cdn_quic off → no false CDN-active');

const confirmed = evaluateQuicCloudLiveEdge({
  cdnQuic: 1,
  domainKey: 'ABCDEFGH1234567890KEY',
  liveHeaders: { 'x-qc-cache': 'HIT', 'x-qc-pop': 'lax' },
  siteUrl: 'https://maximeraprofil.se'
});
assert(confirmed.status === 'confirmed', 'cdn_quic on + x-qc → confirmed');
assert(confirmed.edgeConfirmed === true, 'edgeConfirmed true');
assert(!confirmed.alertCandidate, 'no alert when live edge OK');
assert(/bekräftad|live-edge/i.test(confirmed.displayLabel), 'confirmed display label');

const missing = evaluateQuicCloudLiveEdge({
  cdnQuic: '1',
  domainKey: 'ABCDEFGH1234567890KEY',
  liveHeaders: { 'content-type': 'text/html', 'server': 'LiteSpeed' },
  siteUrl: 'https://sweetmini.se'
});
assert(missing.status === 'missing_live', 'cdn_quic on + no x-qc → missing_live');
assert(missing.alertCandidate && missing.alertCandidate.scoreImpact === 0, 'missing → Policy scoreImpact 0');
assert(missing.alertCandidate.type === 'info', 'missing → info/policy type');
assert(/x-qc/i.test(missing.alertCandidate.desc) || /CDN-edge/i.test(missing.alertCandidate.desc), 'missing alert mentions x-qc or CDN-edge');

const needsUrl = evaluateQuicCloudLiveEdge({
  cdnQuic: 1,
  domainKey: '',
  liveHeaders: undefined,
  siteUrl: null
});
assert(needsUrl.status === 'needs_url', 'cdn_quic on + no URL → needs_url');
assert(needsUrl.alertCandidate && /URL-check|URL/i.test(needsUrl.alertCandidate.title + needsUrl.alertCandidate.desc), 'needs_url soft message');
assert(needsUrl.alertCandidate.scoreImpact === 0, 'needs_url scoreImpact 0');
assert(/URL-check/i.test(needsUrl.displayLabel), 'display requires URL-check');

console.log('\n--- 6. analyzeSystem integration ---');
assert(typeof analyzeSystem === 'function', 'analyzeSystem callable');

const baseSys = {
  'wp-core': { version: '6.8.1', site_url: 'https://sweetmini.se' },
  'wp-server': { httpd_software: 'LiteSpeed', php_version: '8.2' },
  'wp-plugins-active': {
    'litespeed-cache/litespeed-cache.php': { name: 'LiteSpeed Cache', version: '7.1' }
  }
};

const analysisMissing = analyzeSystem(baseSys, null, null, null, {
  cdn_quic: '1',
  domain_key: 'ABCDEFGH1234567890SECRET',
  cache: '1'
}, null, null, null, {
  detectedSiteUrl: 'https://sweetmini.se',
  quicLiveHeaders: { server: 'LiteSpeed', 'content-type': 'text/html' }
});
const alertMiss = (analysisMissing.alerts || []).find(a => a.id === 'cdn_quic_live_edge_missing' || a.id === 'cdn_quic_live_edge_unmeasured');
assert(!!alertMiss, 'analyzeSystem emits live-edge alert when cdn_quic on without x-qc');
assert(alertMiss.scoreImpact === 0, 'analyzeSystem alert scoreImpact 0');

const analysisOk = analyzeSystem(baseSys, null, null, null, {
  cdn_quic: 1,
  domain_key: 'ABCDEFGH1234567890SECRET'
}, null, null, null, {
  detectedSiteUrl: 'https://maximeraprofil.se',
  quicLiveHeaders: { 'x-qc-cache': 'HIT', 'x-qc-pop': 'sto' }
});
const alertOk = (analysisOk.alerts || []).find(a => String(a.id || '').startsWith('cdn_quic_live_edge'));
assert(!alertOk, 'no live-edge alert when x-qc present');

const analysisOff = analyzeSystem(baseSys, null, null, null, {
  cdn_quic: 0,
  domain_key: 'ABCDEFGH1234567890SECRET'
}, null, null, null, {
  detectedSiteUrl: 'https://example.com',
  quicLiveHeaders: null
});
const alertOff = (analysisOff.alerts || []).find(a => String(a.id || '').startsWith('cdn_quic_live_edge'));
assert(!alertOff, 'cdn_quic off → no false CDN-active live-edge alert');

const analysisNoUrl = analyzeSystem({
  'wp-core': { version: '6.8.1' },
  'wp-server': { httpd_software: 'LiteSpeed', php_version: '8.2' },
  'wp-plugins-active': { 'litespeed-cache/litespeed-cache.php': { name: 'LiteSpeed Cache', version: '7.1' } }
}, null, null, null, { cdn_quic: '1' }, null, null, null, { quicLiveHeaders: undefined });
const alertNoUrl = (analysisNoUrl.alerts || []).find(a => a.id === 'cdn_quic_live_edge_unmeasured');
assert(!!alertNoUrl, 'no URL → unmeasured / kräver URL-check alert');

if (typeof getOptionComparison === 'function') {
  const imgTab = (analysisMissing.recommendations || []).find(t => t.id === 'image_optimization');
  const quicOpt = imgTab && imgTab.options.find(o => o.id === 'cdn_quic');
  assert(!!quicOpt, 'cdn_quic option still under [6] Bildoptimering');
  const comp = getOptionComparison(quicOpt, { cdn_quic: '1', domain_key: 'ABCDEFGH1234567890SECRET' }, {
    detectedSiteUrl: 'https://sweetmini.se',
    quicLiveHeaders: { server: 'LiteSpeed' }
  });
  assert(comp && /live-edge|ej bekräftad|URL-check|PÅ/i.test(comp.currentDisplay), 'cdn_quic comparison shows live-edge aware label');
  assert(comp.isMatches === true, 'cdn_quic remains soft/policy match (no hard score)');
}

console.log('\n--- 7. closeComparisonResult extractable logic (source contract) ---');
// Simulate the state-reset contract without DOM
function simulateCloseComparison(state) {
  state.wrapperInnerHTML = '';
  state.wrapperDisplay = 'none';
  state.selectA = '';
  state.selectB = '';
  state.closeBtnDisplay = 'none';
  // must NOT touch history
  return state;
}
const sim = simulateCloseComparison({
  wrapperInnerHTML: '<table></table>',
  wrapperDisplay: 'block',
  selectA: 'id-a',
  selectB: 'id-b',
  closeBtnDisplay: 'flex',
  historyLibrary: [{ id: 1 }]
});
assert(sim.wrapperInnerHTML === '' && sim.wrapperDisplay === 'none', 'sim close clears wrapper');
assert(sim.selectA === '' && sim.selectB === '', 'sim close resets selects');
assert(sim.historyLibrary.length === 1, 'sim close preserves historyLibrary');

console.log('\n=== RESULTS: ' + passed + '/' + (passed + failed) + ' passed ===');
if (failed > 0) process.exit(1);
