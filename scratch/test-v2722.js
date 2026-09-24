/**
 * Automated Verification Suite for AreWee-Optimizer v2.7.2.2
 * - Riskdetektor Verktyg grid wraps (no forced 8-col clip)
 * - Stale Elementor google_fonts:true without experiment → no external GF
 * - Custom Fonts count ≠ Google Fonts
 * - Skate fixtures: cockpit Elementor AV + soft-match async/DNS Optimal
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

console.log('=== STARTING v2.7.2.2 VERIFICATION SUITE ===\n');

const indexHtml = fs.readFileSync(path.join(BASE_DIR, 'index.html'), 'utf8');
const appJs = fs.readFileSync(path.join(BASE_DIR, 'js/app.js'), 'utf8');
const rulesJs = fs.readFileSync(path.join(BASE_DIR, 'js/rules.js'), 'utf8');
const exporterJs = fs.readFileSync(path.join(BASE_DIR, 'js/exporter.js'), 'utf8');
const stylesCss = fs.readFileSync(path.join(BASE_DIR, 'css/styles.css'), 'utf8');
const readmeMd = fs.readFileSync(path.join(BASE_DIR, 'README.md'), 'utf8');
const geminiMd = fs.readFileSync(path.join(BASE_DIR, 'gemini.md'), 'utf8');

console.log('--- 1. Version Consistency (v2.7.2.2) ---');
assert(indexHtml.includes('(v2.7.2.2)'), 'index.html mentions v2.7.2.2');
assert(indexHtml.includes('?v=2.7.2.2'), 'index.html cache-bust ?v=2.7.2.2');
assert(!indexHtml.includes('?v=2.7.2.1'), 'index.html no stale ?v=2.7.2.1');
assert(appJs.includes('const APP_VERSION = "2.7.2.2"'), 'app.js APP_VERSION');
assert(appJs.includes('targetVersion = "2.7.2.2"'), 'app.js targetVersion');
assert(rulesJs.includes('Compatibility Engine (v2.7.2.2)'), 'rules.js header');
assert(exporterJs.includes('Exporter / Serializer (v2.7.2.2)'), 'exporter.js header');
assert(exporterJs.includes("'syncPluginVersion' => '2.7.2.2'"), 'exporter syncPluginVersion');
assert(stylesCss.includes('Stylesheet (v2.7.2.2)'), 'styles.css header');
assert(readmeMd.includes('Dashboard (v2.7.2.2)'), 'README header');
assert(readmeMd.includes('Release v2.7.2.2:'), 'README changelog 2.7.2.2');
assert(geminiMd.includes('Arkitektur (v2.7.2.2)'), 'gemini Arkitektur');

console.log('\n--- 2. Static: Riskdetektor Verktyg layout ---');
assert(stylesCss.includes('auto-fill'), 'risk-status-grid uses auto-fill');
assert(stylesCss.includes('minmax(140px, 1fr)') || stylesCss.includes('minmax(130px, 1fr)'), 'minmax column sizing');
assert(!/risk-status-grid\s*\{[^}]*repeat\(\s*8\s*,\s*1fr\s*\)/s.test(stylesCss) &&
       !/@media \(min-width: 1100px\) \{\s*\.risk-status-grid \{\s*grid-template-columns:\s*repeat\(8, 1fr\)/s.test(stylesCss),
  'no forced repeat(8, 1fr) on risk-status-grid');
assert(/\.risk-component-card\s*\{[^}]*min-width:\s*0/s.test(stylesCss), 'risk-component-card min-width:0');
assert(rulesJs.includes('icon: "🖥️"') || rulesJs.includes("icon: '🖥️'"), 'WP-system icon is desktop emoji');
assert(!rulesJs.includes('id: "wp_system"') || !/id: "wp_system"[\s\S]{0,80}icon: "📝"/.test(rulesJs),
  'WP-system no longer uses notepad emoji');

console.log('\n--- 3. Static: Elementor GF sanitize helpers ---');
assert(rulesJs.includes('function elementorSignalsExternalGoogleFonts'), 'elementorSignalsExternalGoogleFonts defined');
assert(rulesJs.includes('function sanitizeElementorGoogleFonts'), 'sanitizeElementorGoogleFonts defined');
assert(appJs.includes('!nameLower.includes("custom font")'), 'parser excludes custom font');
assert(appJs.includes('google_font-disabled'), 'parser recognizes google_font-disabled');
assert(appJs.includes('sanitizeElementorGoogleFonts'), 'app.js calls sanitize on load/parse');

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
const elementorSignalsExternalGoogleFonts = pick('elementorSignalsExternalGoogleFonts');
const sanitizeElementorGoogleFonts = pick('sanitizeElementorGoogleFonts');
const analyzeSystem = pick('analyzeSystem');
const parseSettingsFile = pick('parseSettingsFile');

assert(typeof getOptionComparison === 'function', 'getOptionComparison available');
assert(typeof hasExternalGoogleFonts === 'function', 'hasExternalGoogleFonts available');
assert(typeof elementorSignalsExternalGoogleFonts === 'function', 'elementorSignals available');
assert(typeof sanitizeElementorGoogleFonts === 'function', 'sanitizeElementor available');

const m2 = appJs.match(/function parseElementorStatus\(text\) \{[\s\S]*?return data;\n  \}/);
assert(!!m2, 'parseElementorStatus extractable');
vm.runInContext(m2[0], context);
const parseElementorStatus = context.parseElementorStatus;

const optAsync = { id: 'optm_ggfonts_async', title: 'GF Async', recommendedRaw: 1, criticalLevel: 'standard', scoreImpact: 2 };
const optDns = { id: 'optm_dns_prefetch', title: 'DNS Prefetch', recommendedRaw: '//fonts.googleapis.com\n//fonts.gstatic.com', criticalLevel: 'standard', scoreImpact: 0 };

console.log('\n--- 4. Stale Elementor google_fonts:true without experiment ---');
const stale = { google_fonts: true, version: '4.2.4', experiments: ['Custom Fonts', 'Inline Font Icons', 'container'] };
assert(elementorSignalsExternalGoogleFonts(stale) === false, 'stale true + Custom Fonts only → no signal');
const sanitized = sanitizeElementorGoogleFonts({ ...stale, experiments: [...stale.experiments] });
assert(sanitized.google_fonts === false, 'sanitize clears stale true');

const explicit = { google_fonts: true, experiments: ['google_fonts', 'Google Fonts'] };
assert(elementorSignalsExternalGoogleFonts(explicit) === true, 'explicit google_fonts experiment → signal');

const customOnly = { google_fonts: false, experiments: ['Custom Fonts'] };
assert(elementorSignalsExternalGoogleFonts(customOnly) === false, 'Custom Fonts only → no signal');

const skateSettings = {
  optm_ggfonts_async: '0',
  optm_ggfonts_rm: '0',
  optm_dns_prefetch: ''
};

const staleEnv = {
  elemInfo: { google_fonts: true, experiments: ['Custom Fonts', 'Behållare'] },
  themeInfo: { name: 'Hello Elementor', google_fonts: false }
};
assert(hasExternalGoogleFonts(skateSettings, staleEnv) === false, 'stale env hasExternalGg === false');
const asyncStale = getOptionComparison(optAsync, skateSettings, staleEnv);
const dnsStale = getOptionComparison(optDns, skateSettings, staleEnv);
assert(asyncStale.isMatches && !asyncStale.isDeviant, 'stale → async Optimal');
assert(dnsStale.isMatches && !dnsStale.isDeviant, 'stale → dns Optimal');
assert((dnsStale.missing || []).length === 0, 'stale → dns missing empty');

console.log('\n--- 5. Parser: Custom Fonts must not set google_fonts ---');
const parsedCustom = parseElementorStatus('== Funktioner ==\n\tCustom Fonts: 1\n\tCustom Icons: 0\n');
assert(parsedCustom.google_fonts === false, 'Custom Fonts:1 → google_fonts false');
assert(elementorSignalsExternalGoogleFonts(parsedCustom) === false, 'parsed Custom Fonts → no external signal');

const parsedActive = parseElementorStatus('Google Fonts: Active\n');
assert(parsedActive.google_fonts === true, 'Google Fonts: Active → true');
assert(elementorSignalsExternalGoogleFonts(parsedActive) === true, 'Active → external signal');

const parsedDisabledMeta = parseElementorStatus('meta generator settings: css_print_method-external, google_font-disabled, font_display-swap\n');
assert(parsedDisabledMeta.google_fonts === false, 'google_font-disabled meta → false');

console.log('\n--- 6. Skate fixtures: cockpit + soft-match ---');
const lscwpPath = '/Users/richardviitanen/Downloads/LSCWP_cfg-www.skateyourname.com_-20260924_150453.data';
const elemPath = '/Users/richardviitanen/Downloads/system-info-www.skateyourname.com-24-09-2026.txt';
if (fs.existsSync(lscwpPath) && fs.existsSync(elemPath) && typeof parseSettingsFile === 'function') {
  const uploaded = parseSettingsFile(fs.readFileSync(lscwpPath, 'utf8'));
  const elemInfo = parseElementorStatus(fs.readFileSync(elemPath, 'utf8'));
  sanitizeElementorGoogleFonts(elemInfo);
  const themeFalse = { name: 'Hello Elementor', version: '3.5.1', google_fonts: false };
  const analysis = analyzeSystem(null, null, null, elemInfo, uploaded, null, null, themeFalse);
  const env = analysis.environment;
  const gfFn = (analysis.cockpitFunctions || []).find(f => f.id === 'google_fonts');

  console.log('   cockpit GF:', JSON.stringify(gfFn && gfFn.tools));
  console.log('   hasExternal:', hasExternalGoogleFonts(uploaded, env));
  console.log('   elem.google_fonts:', elemInfo.google_fonts);

  assert(elemInfo.google_fonts === false, 'skate fixture elem google_fonts false');
  assert(elementorSignalsExternalGoogleFonts(elemInfo) === false, 'skate elementorSignals false');
  assert(hasExternalGoogleFonts(uploaded, env) === false, 'skate hasExternalGg false');
  assert(gfFn && gfFn.tools.find(t => t.name === 'Elementor').state === 'AV', 'cockpit Elementor AV');
  assert(gfFn && gfFn.tools.find(t => t.name === 'Tema').state === 'AV', 'cockpit Tema AV');
  assert(gfFn && (gfFn.statusText === 'Optimal' || gfFn.status === 'optimal'), 'cockpit GF Optimal (not Extern laddning)');

  const a = getOptionComparison(optAsync, uploaded, env);
  const d = getOptionComparison(optDns, uploaded, env);
  assert(a.isMatches && !a.isDeviant, 'skate async Optimal');
  assert(d.isMatches && !d.isDeviant, 'skate dns Optimal');
  assert((d.missing || []).length === 0, 'skate dns no missing fonts rows');
  assert(!(d.missing || []).some(m => /fonts\.(googleapis|gstatic)/i.test(String(m))),
    'skate dns missing has no fonts.googleapis/gstatic');

  // Simulate stale history profile + same LSCWP
  const staleElem = { google_fonts: true, version: '4.2.4', experiments: ['Custom Fonts', 'Inline Font Icons'] };
  const analysisStale = analyzeSystem(null, null, null, staleElem, uploaded, null, null, themeFalse);
  const gfStale = (analysisStale.cockpitFunctions || []).find(f => f.id === 'google_fonts');
  assert(gfStale && gfStale.tools.find(t => t.name === 'Elementor').state === 'AV',
    'stale profile cockpit Elementor AV after sanitize');
  assert(hasExternalGoogleFonts(uploaded, analysisStale.environment) === false,
    'stale profile hasExternal false after analyzeSystem sanitize');
} else {
  console.log('   (fixtures not found — skipped live skate parse)');
  assert(true, 'fixtures optional skip placeholder');
}

console.log('\n--- 7. Control: real Elementor GF still deviant ---');
const realEnv = {
  elemInfo: { google_fonts: true, experiments: ['google_fonts'] },
  themeInfo: { google_fonts: false }
};
assert(hasExternalGoogleFonts(skateSettings, realEnv) === true, 'real Elementor GF → external');
assert(getOptionComparison(optAsync, skateSettings, realEnv).isDeviant === true, 'real GF async deviant');
assert(getOptionComparison(optDns, skateSettings, realEnv).isDeviant === true, 'real GF dns deviant');

console.log(`\n=== RESULTS: ${passed} passed, ${failed} failed ===`);
process.exit(failed > 0 ? 1 : 0);
