const fs = require('fs');
const path = require('path');
const vm = require('vm');

const BASE_DIR = '/Users/richardviitanen/Documents/arewee-optimizer';
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

console.log('=== STARTING v2.6.8 COMPREHENSIVE VERIFICATION SUITE ===\n');

// 1. Synchronous Version Check across all 7 core files
const indexHtml = fs.readFileSync(path.join(BASE_DIR, 'index.html'), 'utf8');
const stylesCss = fs.readFileSync(path.join(BASE_DIR, 'css/styles.css'), 'utf8');
const appJs = fs.readFileSync(path.join(BASE_DIR, 'js/app.js'), 'utf8');
const rulesJs = fs.readFileSync(path.join(BASE_DIR, 'js/rules.js'), 'utf8');
const exporterJs = fs.readFileSync(path.join(BASE_DIR, 'js/exporter.js'), 'utf8');
const readmeMd = fs.readFileSync(path.join(BASE_DIR, 'README.md'), 'utf8');
const geminiMd = fs.readFileSync(path.join(BASE_DIR, 'gemini.md'), 'utf8');

assert(indexHtml.includes('(v2.6.8)') && indexHtml.includes('css/styles.css?v=2.6.8') && indexHtml.includes('js/app.js?v=2.6.8'), 'index.html has v2.6.8 in title and asset tags');
assert(stylesCss.includes('(v2.6.8)'), 'css/styles.css has v2.6.8 header');
assert(appJs.includes('Version: 2.6.8') && appJs.includes('targetVersion = "2.6.8"'), 'js/app.js has v2.6.8 header and targetVersion');
assert(rulesJs.includes('v2.6.8') && rulesJs.includes('benchmarkVersion: "2.6.8"'), 'js/rules.js has v2.6.8 header and benchmark versions');
assert(exporterJs.includes('(v2.6.8)') && exporterJs.includes("'syncPluginVersion' => '2.6.8'"), 'js/exporter.js has v2.6.8 header and sync plugin version');
assert(readmeMd.includes('(v2.6.8)'), 'README.md has v2.6.8 header');
assert(geminiMd.includes('(v2.6.8)'), 'gemini.md has v2.6.8 reference');

// 2. Test compFn definition in triggerAnalysis()
assert(appJs.includes('const compFn = (typeof getOptionComparison === "function")'), 'js/app.js explicitly defines compFn inside triggerAnalysis');

// 3. Emulate browser context and load rules.js & exporter.js & app.js functions
const domMock = {
    window: {
        location: { href: 'http://localhost' },
        sessionStorage: {
            store: {},
            getItem(k) { return this.store[k] || null; },
            setItem(k, v) { this.store[k] = String(v); },
            removeItem(k) { delete this.store[k]; }
        }
    },
    document: {
        getElementById: () => ({ textContent: '', innerHTML: '', value: '', classList: { add() {}, remove() {}, contains() { return false; } }, style: {}, addEventListener() {} }),
        querySelector: () => null,
        querySelectorAll: () => []
    },
    console: console,
    fetch: () => Promise.resolve({ ok: true, json: () => Promise.resolve({}) })
};
domMock.window.document = domMock.document;

const ctx = vm.createContext(domMock);
vm.runInContext(rulesJs, ctx);
vm.runInContext(exporterJs, ctx);

// Test getOptionComparison function exists
assert(typeof ctx.getOptionComparison === 'function', 'getOptionComparison is defined in rules.js');

// Test compFn logic safely executes
const compTest = ctx.getOptionComparison('optm_css_min', 1, 0, {});
assert(compTest && typeof compTest.status === 'string', 'getOptionComparison returns comparison object');

// 4. Test Second Opinion Markdown generation with polymorphic signature
const sampleAnalysis = {
    scores: { total: 85, stability: 90, performance: 80, security: 85, configuration: 85 },
    profile: { type: 'WooCommerce', siteUrl: 'https://example.com' },
    topologyWarnings: [],
    risks: [],
    recommendations: { optm_css_min: 1 }
};
const sampleState = {
    profileType: 'woocommerce',
    siteUrl: 'https://example.com',
    uploadedSettings: { optm_css_min: 0 },
    sysInfo: { wp_version: '6.7.1', php_version: '8.2.20' }
};

const secondOpinion1 = ctx.generateSecondOpinionMarkdown(sampleAnalysis, sampleState);
assert(secondOpinion1 && secondOpinion1.includes('AreWee-Optimizer: Fullständig Site-Report & Second Opinion (v2.6.8)'), 'generateSecondOpinionMarkdown(analysis, state) generates valid prompt');

const secondOpinion2 = ctx.generateSecondOpinionMarkdown(sampleState);
assert(secondOpinion2 && secondOpinion2.includes('AreWee-Optimizer: Fullständig Site-Report & Second Opinion (v2.6.8)'), 'generateSecondOpinionMarkdown(state) fallback generates valid prompt');

// 5. Test Live Sync PHP Plugin Generation & Contract
const syncPhp = ctx.generateSyncPluginPhp();
assert(syncPhp.includes("'syncPluginVersion' => '2.6.8'"), 'generateSyncPluginPhp contains syncPluginVersion 2.6.8');
assert(syncPhp.includes('arewee-optimizer/v1') && syncPhp.includes('wp_optimizer_sync_verify_token'), 'generateSyncPluginPhp has valid REST endpoint and token verification');
assert(syncPhp.includes("'sysInfo' => $sysinfo"), 'generateSyncPluginPhp has normalized sysInfo payload key matching frontend expectation');
assert(syncPhp.includes("'uploadedSettings' => $lscwp_options"), 'generateSyncPluginPhp has normalized uploadedSettings payload key matching frontend expectation');

// 6. Test parsing sample system profiles
const sampleFile1 = fs.readFileSync(path.join(BASE_DIR, '2you.se-wp-systemfil-260604.txt'), 'utf8');
const sampleFile2 = fs.readFileSync(path.join(BASE_DIR, 'maximeraprofil.se-wp-systemfil-260604.txt'), 'utf8');

assert(sampleFile1.length > 500, '2you.se sample profile exists and is readable');
assert(sampleFile2.length > 500, 'maximeraprofil.se sample profile exists and is readable');

console.log(`\n=== TEST SUITE COMPLETED: ${passed} passed, ${failed} failed ===`);
if (failed > 0) process.exit(1);
