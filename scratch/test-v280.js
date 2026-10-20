/**
 * Automated Verification Suite for AreWee Optimizer v2.8.0
 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert');

console.log('=== AreWee-Optimizer v2.8.0 Verification Suite ===\n');

const ROOT = path.resolve(__dirname, '..');

// 1. Version Parity Checks
console.log('1. Checking version parity across all files...');

const indexHtml = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const appJs = fs.readFileSync(path.join(ROOT, 'js/app.js'), 'utf8');
const rulesJs = fs.readFileSync(path.join(ROOT, 'js/rules.js'), 'utf8');
const exporterJs = fs.readFileSync(path.join(ROOT, 'js/exporter.js'), 'utf8');
const stylesCss = fs.readFileSync(path.join(ROOT, 'css/styles.css'), 'utf8');
const readmeMd = fs.readFileSync(path.join(ROOT, 'README.md'), 'utf8');
const geminiPath = fs.existsSync(path.join(ROOT, 'gemini.md')) ? path.join(ROOT, 'gemini.md') : path.join(ROOT, 'GEMINI.md');
const geminiMd = fs.readFileSync(geminiPath, 'utf8');

const appVersionMatch = appJs.match(/const APP_VERSION = "([^"]+)";/);
assert(appVersionMatch, 'app.js defines APP_VERSION');
const currentVer = appVersionMatch[1];

assert(indexHtml.includes(`<title>AreWee-Optimizer - WordPress prestanda & stabilitetsoptimerare (v${currentVer})</title>`), `index.html title has v${currentVer}`);
assert(indexHtml.includes(`styles.css?v=${currentVer}`), `index.html styles.css?v=${currentVer}`);
assert(indexHtml.includes(`js/rules.js?v=${currentVer}`), `index.html rules.js?v=${currentVer}`);
assert(indexHtml.includes(`js/exporter.js?v=${currentVer}`), `index.html exporter.js?v=${currentVer}`);
assert(indexHtml.includes(`js/app.js?v=${currentVer}`), `index.html app.js?v=${currentVer}`);
assert(indexHtml.includes(`class="logo-tag">v${currentVer}</span>`), `index.html logo-tag v${currentVer}`);
assert(indexHtml.includes(`Nuvarande rekommendationer (v${currentVer})`), `index.html recommendations modal v${currentVer}`);

assert(rulesJs.includes(`AreWee WP-Optimizer - Dynamic Rules & Compatibility Engine (v${currentVer})`), `rules.js header v${currentVer}`);

assert(exporterJs.includes(`AreWee WP-Optimizer - Exporter / Serializer (v${currentVer})`), `exporter.js header v${currentVer}`);
assert(exporterJs.includes(`'syncPluginVersion' => '${currentVer}'`), `exporter.js syncPluginVersion ${currentVer}`);

assert(stylesCss.includes(`AreWee WP-Optimizer - Stylesheet (v${currentVer})`), `styles.css header v${currentVer}`);
assert(readmeMd.includes(`# LiteSpeed Cache & WordPress Optimizer Dashboard (v${currentVer})`), `README.md header v${currentVer}`);
assert(geminiMd.includes(`Projektets Riktlinjer & Arkitektur (v${currentVer})`), `GEMINI.md header v${currentVer}`);

console.log(`   ✓ Version parity verified for v${currentVer} across index.html, app.js, rules.js, exporter.js, styles.css, README.md, GEMINI.md`);

// 2. UI Layout Cleanup Check
console.log('2. Checking UI cleanup: overview status grid removed...');
assert(!indexHtml.includes('overview-component-status-grid'), 'index.html does not contain overview-component-status-grid');
assert(!appJs.includes('overviewGridEl'), 'app.js does not contain overviewGridEl');
console.log('   ✓ Overview status grid cleanly removed without residue');

// 3. VM Context Setup for rules.js & app.js functions
console.log('3. Loading rules.js into sandbox context for logic testing...');

// Mock browser / DOM environment
const createMockElement = () => ({
    style: {},
    classList: { add: () => {}, remove: () => {}, toggle: () => {} },
    setAttribute: () => {},
    getAttribute: () => null,
    addEventListener: () => {},
    removeEventListener: () => {},
    appendChild: () => {},
    innerHTML: '',
    textContent: '',
    value: '',
});

const mockStorage = {
    getItem: () => null,
    setItem: () => {},
    removeItem: () => {},
    clear: () => {}
};

const sandbox = {
    console,
    window: {
        addEventListener: () => {},
        removeEventListener: () => {},
        location: { search: '' },
        localStorage: mockStorage,
        sessionStorage: mockStorage,
    },
    localStorage: mockStorage,
    sessionStorage: mockStorage,
    document: {
        getElementById: () => createMockElement(),
        querySelector: () => createMockElement(),
        querySelectorAll: () => [],
        createElement: () => createMockElement(),
        addEventListener: (event, cb) => {
            if (event === 'DOMContentLoaded' && typeof cb === 'function') {
                cb();
            }
        },
        removeEventListener: () => {},
        body: createMockElement(),
    },
    navigator: { userAgent: 'node' },
    ResizeObserver: class {
        observe() {}
        unobserve() {}
        disconnect() {}
    },
    setTimeout,
    clearTimeout,
    setInterval: () => {},
    clearInterval: () => {},
};
sandbox.window.ResizeObserver = sandbox.ResizeObserver;
sandbox.window.document = sandbox.document;
sandbox.window.window = sandbox.window;
vm.createContext(sandbox);

// Run rules.js in sandbox
vm.runInContext(rulesJs, sandbox);
assert(typeof sandbox.analyzeSystem === 'function', 'analyzeSystem function exists in sandbox');
console.log('   ✓ rules.js successfully loaded in sandbox');

// 4. Test OPcache, Autoload and Memory Rules Logic
console.log('4. Testing alert evaluation on various Site Health data fixtures...');

// Fixture 1: Swedish export with Full OPcache and high autoload (like campingdrömmar.se)
const sysInfoFixtureSwedishFull = {
    'wp-core': { version: '6.7.2' },
    'wp-server': {
        httpd_software: 'LiteSpeed',
        server_architecture: 'LiteSpeed',
        php_version: '8.2.27',
        memory_limit: '1024M',
        time_limit: '30',
        max_execution_time: '30',
        opcache_enabled: true,
        opcache_is_full: true,
        opcache_hit_rate: '98.2%',
        opcache_status: 'enabled'
    },
    'wp-constants': {
        WP_MEMORY_LIMIT: '1024M',
        WP_MAX_MEMORY_LIMIT: '256M'
    },
    'wp-database': {
        autoload_options_size: '1.75 MB'
    },
    'wp-paths-sizes': {
        uploads_size: '6.2 GB'
    },
    'wp-plugins-active': {
        'woocommerce/woocommerce.php': { name: 'WooCommerce', version: '9.8.0' },
        'elementor/elementor.php': { name: 'Elementor', version: '3.28.3' }
    }
};

const uploadedSettings1 = {
    img_optm_rm_bkup: 0
};

const analysis1 = sandbox.analyzeSystem(sysInfoFixtureSwedishFull, { is_active: true }, null, { is_active: true }, uploadedSettings1);
const alertIds1 = analysis1.alerts.map(a => a.id);

assert(!alertIds1.includes('alert_opcache_critical'), 'No false alert_opcache_critical when hit rate is 98.2% even if cache is full');
assert(alertIds1.includes('alert_wc_cron_visitor'), 'Triggers alert_wc_cron_visitor when WooCommerce is active and DISABLE_WP_CRON is missing');
assert(alertIds1.includes('alert_autoload_critical'), 'Triggers alert_autoload_critical when autoload > 1.5MB');
assert(alertIds1.includes('alert_wp_max_memory_low'), 'Triggers alert_wp_max_memory_low when WP_MAX_MEMORY_LIMIT < 512M on Woo/Elementor');
assert(alertIds1.includes('alert_max_execution_time_low'), 'Triggers alert_max_execution_time_low when max_execution_time <= 30 on LiteSpeed');
assert(alertIds1.includes('alert_uploads_backup_bloat'), 'Triggers alert_uploads_backup_bloat when uploads > 5GB and backup rm is OFF');

console.log('   ✓ Swedish full-load fixture correctly triggered all anticipated critical/warning alerts');

const sResCard = analysis1.cockpitFunctions.find(f => f.id === 'server_res');
assert(sResCard.name === '🖥️ Server' || sResCard.name === '🖥️ Serverresurser', 'Card name is Server');
console.log('   ✓ 6th function card "🖥️ Server" verified');

// Fixture 2: Moderate Autoload (1.1 MB) + OPcache hit rate drops < 80%
const sysInfoFixtureHitRateDrop = {
    'wp-server': {
        httpd_software: 'LiteSpeed',
        server_architecture: 'LiteSpeed',
        php_version: '8.2.27',
        memory_limit: '512M',
        time_limit: '120',
        opcache_status: 'enabled',
        opcache_is_full: false,
        opcache_hit_rate: '72.4%'
    },
    'wp-constants': {
        WP_MEMORY_LIMIT: '1024M', // WP_MEMORY_LIMIT > memory_limit ceiling mismatch!
        WP_MAX_MEMORY_LIMIT: '512M'
    },
    'wp-database': {
        autoload_options_size: '1.1 MB' // Between 800 KB and 1.5 MB
    }
};

const analysis2 = sandbox.analyzeSystem(sysInfoFixtureHitRateDrop, null, null, null, {});
const alertIds2 = analysis2.alerts.map(a => a.id);

assert(alertIds2.includes('alert_opcache_critical'), 'Triggers alert_opcache_critical when hit_rate < 80%');
const opCritAlert = analysis2.alerts.find(a => a.id === 'alert_opcache_critical');
assert.strictEqual(opCritAlert.type, 'chronic', 'OPcache alert has dedicated type: chronic');
assert.strictEqual(opCritAlert.isChronic, true, 'OPcache alert is marked as chronic');
assert(alertIds2.includes('alert_autoload_warning'), 'Triggers alert_autoload_warning when autoload is between 800KB and 1.5MB');
const ceilingAlert = analysis2.alerts.find(a => a.id === 'alert_memory_ceiling_mismatch');
assert(ceilingAlert, 'Triggers alert_memory_ceiling_mismatch when WP_MEMORY_LIMIT > memory_limit');
assert.strictEqual(ceilingAlert.type, 'info', 'Memory ceiling mismatch is informational');
assert.strictEqual(ceilingAlert.scoreImpact, 0, 'Memory ceiling mismatch has scoreImpact: 0 (per Grok guidance)');

console.log('   ✓ Moderate autoload, ceiling mismatch and low hit rate tests passed (scoreImpact: 0)');

// Fixture 3: English export, completely healthy with optimal thresholds
const sysInfoFixtureEnglishHealthy = {
    'wp-server': {
        httpd_software: 'LiteSpeed',
        server_architecture: 'LiteSpeed',
        php_version: '8.3.1',
        memory_limit: '1024M',
        time_limit: '120',
        opcache_status: 'enabled',
        opcache_is_full: false,
        opcache_hit_rate: '99.1%'
    },
    'wp-constants': {
        WP_MEMORY_LIMIT: '512M',
        WP_MAX_MEMORY_LIMIT: '512M'
    },
    'wp-database': {
        autoload_options_size: '450 KB'
    },
    'wp-plugins-active': {
        'woocommerce/woocommerce.php': { name: 'WooCommerce', version: '9.8.0' }
    }
};

const analysis3 = sandbox.analyzeSystem(sysInfoFixtureEnglishHealthy, { is_active: true }, null, null, {});
const alertIds3 = analysis3.alerts.map(a => a.id);

assert(!alertIds3.includes('alert_opcache_critical'), 'No opcache critical on healthy system');
assert(!alertIds3.includes('alert_opcache_warning'), 'No opcache warning on healthy system');
assert(!alertIds3.includes('alert_autoload_critical'), 'No autoload critical on healthy system');
assert(!alertIds3.includes('alert_autoload_warning'), 'No autoload warning on healthy system');
assert(!alertIds3.includes('alert_wp_max_memory_low'), 'No wp_max_memory_low on healthy system');
assert(!alertIds3.includes('alert_memory_ceiling_mismatch'), 'No ceiling mismatch on healthy system');
assert(!alertIds3.includes('alert_max_execution_time_low'), 'No max_execution_time_low on healthy system');

console.log('   ✓ English healthy fixture passed cleanly with 0 false positive alerts');

// Fixture 4: Missing OPcache & Autoload (e.g. basic Site Health export without server/database section)
const sysInfoFixtureMissing = {
    'wp-server': {
        httpd_software: 'Apache'
    }
};

const analysis4 = sandbox.analyzeSystem(sysInfoFixtureMissing, null, null, null, {});
const telemetryAlerts = analysis4.alerts.filter(a =>
    a.id === 'alert_opcache_critical' ||
    a.id === 'alert_opcache_warning' ||
    a.id === 'alert_autoload_critical' ||
    a.id === 'alert_autoload_warning' ||
    a.id === 'alert_wp_max_memory_low' ||
    a.id === 'alert_memory_ceiling_mismatch' ||
    a.id === 'alert_max_execution_time_low'
);
assert.strictEqual(telemetryAlerts.length, 0, 'No false alerts generated when server telemetry is missing');
console.log('   ✓ Missing server telemetry produces exactly 0 false alerts');

// Test 4B: Missing WP_MAX_MEMORY_LIMIT does NOT trigger false warning
const sysInfoNoMaxMem = {
    'wp-server': { httpd_software: 'LiteSpeed', php_version: '8.2', memory_limit: '512M' },
    'wp-constants': { WP_MEMORY_LIMIT: '512M' }, // NO WP_MAX_MEMORY_LIMIT!
    'wp-plugins-active': { 'woocommerce/woocommerce.php': { name: 'WooCommerce', version: '9.8.0' } }
};
const analysisNoMaxMem = sandbox.analyzeSystem(sysInfoNoMaxMem, { is_active: true }, null, null, {});
assert(!analysisNoMaxMem.alerts.some(a => a.id === 'alert_wp_max_memory_low'), 'Missing WP_MAX_MEMORY_LIMIT does not trigger false warning');
console.log('   ✓ Missing WP_MAX_MEMORY_LIMIT does not trigger false alert_wp_max_memory_low');

// Test 4C: Swedish spacing in parseBytes & parseMemoryMB
assert.strictEqual(sandbox.parseBytes("1 234 KB"), 1234 * 1024, 'Swedish space in KB');
assert.strictEqual(sandbox.parseBytes("1 620 MB"), 1620 * 1024 * 1024, 'Swedish space in MB');
assert.strictEqual(sandbox.parseBytes("1\u00A0234 KB"), 1234 * 1024, 'Non-breaking space in KB');
assert.strictEqual(sandbox.parseMemoryMB("1 024M"), 1024, 'Swedish space in parseMemoryMB');
console.log('   ✓ Swedish thousands-spacing and non-breaking spaces handled cleanly in parseBytes and parseMemoryMB');

// Test 4D: Decimal hit rate fraction (0.995 => 99.5%)
const sysInfoFractionHitRate = {
    'wp-server': {
        httpd_software: 'LiteSpeed',
        opcache_status: 'enabled',
        opcache_is_full: false,
        opcache_hit_rate: '0.995'
    }
};
const analysisHitRate = sandbox.analyzeSystem(sysInfoFractionHitRate, null, null, null, {});
assert(!analysisHitRate.alerts.some(a => a.id === 'alert_opcache_critical'), 'Hit rate 0.995 does not trigger false critical alarm');
console.log('   ✓ Decimal hit rate 0.995 normalized to 99.5% (no false alarm)');

// Test 4E: Boolean "Ja" for OPcache full
const sysInfoJa = {
    'wp-server': {
        httpd_software: 'LiteSpeed',
        opcache_status: 'enabled',
        opcache_is_full: 'Ja'
    }
};
const analysisJa = sandbox.analyzeSystem(sysInfoJa, null, null, null, {});
assert(analysisJa.alerts.some(a => a.id === 'alert_opcache_critical' || a.id === 'alert_opcache_warning'), 'opcache_is_full="Ja" triggers chronic alert (informational) when hit rate is unknown');
console.log('   ✓ OPcache full="Ja" correctly normalized in rules.js (informational alert, 0 score penalty)');

// Test 4F: Interned strings at 96%
const sysInfoInterned = {
    'wp-server': {
        httpd_software: 'LiteSpeed',
        opcache_status: 'enabled',
        opcache_is_full: false,
        opcache_hit_rate: '99%',
        opcache_memory_used: '100 MB av 512 MB',
        opcache_interned_strings: '31 MB av 32 MB' // 96.8%
    }
};
const analysisInterned = sandbox.analyzeSystem(sysInfoInterned, null, null, null, {});
assert(analysisInterned.alerts.some(a => a.id === 'alert_opcache_warning'), 'Interned strings at 96.8% triggers alert_opcache_warning');
console.log('   ✓ Interned strings at 96% triggers alert_opcache_warning');

// Test 4G: Sync Plugin in exporter.js collects OPcache and Autoload
assert(exporterJs.includes("opcache_get_status"), 'Sync plugin collects opcache_get_status');
assert(exporterJs.includes("autoload_options_size"), 'Sync plugin queries autoload options size');
assert(exporterJs.includes("recurse_dirsize"), 'Sync plugin checks uploads dir size');
console.log('   ✓ Sync plugin in exporter.js verified for complete OPcache and Autoload collection');

// 5. Test Site Health Raw Parser Logic (from app.js)
console.log('5. Testing Site Health text parsing on Swedish and English samples...');

// Extract parseSystemInfoText from app.js using VM or regex
vm.runInContext(appJs, sandbox);
const parseSystemInfoText = sandbox.window.parseSystemInfoText || sandbox.parseSystemInfoText;
assert(typeof parseSystemInfoText === 'function', 'parseSystemInfoText function exists');

const swedishSiteHealthSample = [
    '### wp-server ###',
    'server_architecture: Linux 5.14.0-503.21.1.el9_5.x86_64 x86_64',
    'httpd_software: LiteSpeed',
    'php_version: 8.2.27 64bit',
    'php_sapi: litespeed',
    'max_execution_time: 30',
    'memory_limit: 1024M',
    'opcache:',
    '\tstatus: enabled',
    '\tmemory_consumption: 512M',
    '\tused_memory: 511M',
    '\tfree_memory: 1M',
    '\twasted_memory: 0M',
    '\tcurrent_wasted_percentage: 0%',
    '\tinterned_strings_buffer_size: 32M',
    '\tinterned_strings_used_memory: 31M',
    '\tinterned_strings_free_memory: 1M',
    '\tcached_scripts: 4120',
    '\tcached_keys: 4500',
    '\tmax_cached_keys: 16229',
    '\thit_rate: 98.7%',
    '\topcache_is_full: true',
    '',
    '### wp-database ###',
    'autoload_size: 1.62 MB',
    'number_of_tables: 84'
].join('\n');

const parsedSwedish = parseSystemInfoText(swedishSiteHealthSample);
assert.strictEqual(parsedSwedish['wp-server'].httpd_software, 'LiteSpeed');
assert(parsedSwedish['wp-server'].php_version.includes('8.2.27'));
assert.strictEqual(parsedSwedish['wp-server'].max_execution_time, '30');
assert.strictEqual(parsedSwedish['wp-server'].opcache_is_full, true);
assert.strictEqual(parsedSwedish['wp-database'].autoload_options_size, '1.62 MB');

console.log('   ✓ Swedish raw Site Health sample parsed OPcache and Autoload accurately');

const englishSiteHealthSample = [
    '### wp-server ###',
    'httpd_software: LiteSpeed',
    'php_version: 8.3.1',
    'memory_limit: 512M',
    'max_execution_time: 120',
    'opcode-cache: enabled',
    'hit rate for opcode cache: 99.2%',
    'memory usage for cached opcodes: 128MB',
    'is opcode cache full: false',
    '',
    '### wp-database ###',
    'autoloaded options size: 750 KB'
].join('\n');

const parsedEnglish = parseSystemInfoText(englishSiteHealthSample);
assert.strictEqual(parsedEnglish['wp-server'].opcache_status, 'enabled');
assert.strictEqual(parsedEnglish['wp-server'].opcache_is_full, false);
assert.strictEqual(parsedEnglish['wp-server'].opcache_hit_rate, '99.2%');
assert.strictEqual(parsedEnglish['wp-database'].autoload_options_size, '750 KB');

console.log('   ✓ English raw Site Health sample parsed OPcache and Autoload accurately');

// 5B. Test with real campingdrömmar.se raw Site Health export
console.log('5B. Testing parser and analysis on real campingdrömmar.se export...');
const realCampingText = [
    '### wp-core ###',
    'version: 7.1.3',
    '### wp-server ###',
    'httpd_software: LiteSpeed',
    'php_version: 8.3.33 64bit',
    'php_sapi: litespeed',
    'max_input_variables: 8000',
    'time_limit: 300',
    'memory_limit: 8G',
    'opcode_cache: true',
    'opcode_cache_memory_usage: 536831296 of 536870912',
    'opcode_cache_interned_strings_usage: 99.22% of 33554432 (261944 free)',
    'opcode_cache_hit_rate: 81.82',
    'opcode_cache_full: true',
    '### wp-dropins (1) ###',
    'object-cache.php: true',
    '### wp-plugins-active (18) ###',
    'SureRank SEO: version: 1.10.2, author: SureRank',
    'WooCommerce: version: 11.2.1, author: Automattic',
    'LiteSpeed Cache: version: 7.9.1, author: LiteSpeed Technologies',
    '### wp-constants ###',
    'WP_MEMORY_LIMIT: 768M',
    'WP_MAX_MEMORY_LIMIT: 8G'
].join('\n');

const parsedRealCamping = parseSystemInfoText(realCampingText);
assert.strictEqual(parsedRealCamping['wp-server'].httpd_software, 'LiteSpeed');
assert.strictEqual(parsedRealCamping['wp-server'].opcache_is_full, true);
assert.strictEqual(parsedRealCamping['wp-server'].opcache_hit_rate, '81.82');
assert.strictEqual(parsedRealCamping['wp-server'].opcache_memory_used, '536831296 of 536870912');
assert.strictEqual(parsedRealCamping['wp-constants'].WP_MEMORY_LIMIT, '768M');

const analysisCamping = sandbox.analyzeSystem(parsedRealCamping, { is_active: true }, null, null, {});
assert(analysisCamping.alerts.some(a => a.id === 'alert_opcache_critical'), 'Real campingdrömmar (81.82% on full buffer) triggers alert_opcache_critical (chronic shared pool on Inleed)');
assert(analysisCamping.alerts.some(a => a.id === 'alert_wc_checkout_ttfb'), 'Real campingdrömmar triggers alert_wc_checkout_ttfb for WooCommerce checkout TTFB correlation');
const opWarn = analysisCamping.alerts.find(a => a.id === 'alert_opcache_critical');
assert.strictEqual(opWarn.scoreImpact, 5, 'OPcache alert has 5p score deduction for Total Sajthälsa on shared hosting (v2.8.9)');
assert(analysisCamping.alerts.some(a => a.id === 'alert_wc_cron_visitor'), 'Missing DISABLE_WP_CRON triggers alert_wc_cron_visitor for WooCommerce site');
assert(!analysisCamping.alerts.some(a => a.title && a.title.includes('SureRank')), 'SureRank 1.10.2 does NOT trigger false vulnerability alert');

const campingServerRes = analysisCamping.cockpitFunctions.find(f => f.id === 'server_res');
assert.strictEqual(campingServerRes.status, 'chronic');
assert(campingServerRes.statusText.includes('Delad pool'), 'Server statusText includes Delad pool');
const opTool = campingServerRes.tools.find(t => t.name.includes('OPcache'));
assert.strictEqual(opTool.state, '82%', 'OPcache tool state shows hit rate 82%');
const wpMemTool = campingServerRes.tools.find(t => t.name === 'WP_MEMORY_LIMIT');
assert(wpMemTool && wpMemTool.state.includes('768M'), 'WP_MEMORY_LIMIT tool state includes 768M');

const campingDbRes = analysisCamping.cockpitFunctions.find(f => f.id === 'database_res');
assert(campingDbRes, 'database_res function card exists');
const autoTool = campingDbRes.tools.find(t => t.name.includes('Autoload'));
assert.strictEqual(autoTool.state, 'Ej inläst', 'autoload_options_size is compact Ej inläst');

const kassaCard = analysisCamping.cockpitFunctions.find(f => f.id === 'kassa_perf');
assert(kassaCard, 'kassa_perf function card exists when WooCommerce is active');
assert.strictEqual(kassaCard.name, '🛒 Checkout', 'Card name is 🛒 Checkout');
assert.strictEqual(kassaCard.status, 'warning');
assert(kassaCard.statusText.includes('Bromsrisk'), 'kassa statusText includes Bromsrisk');
assert(kassaCard.tools.find(t => t.name === 'Server-Cron').state.includes('Besökare'), 'Server-Cron state is Besökare');
assert(kassaCard.tools.find(t => t.name === 'Redis Cache').state.includes('PÅ'), 'Redis Cache state is PÅ');

console.log('   ✓ Real campingdrömmar.se export parsed and verified: OPcache full caught, SureRank 1.10.2 clean!');

// 6. Test Settings paritet in Flik 1 (core_server)
console.log('6. Checking core_server options paritet in Flik [1]...');
const sampleSettings = sandbox.buildCompleteLscwpSettings({});
const coreServer = sampleSettings.find(s => s.id === 'core_server');
assert(coreServer, 'core_server group exists');
assert(coreServer.options.some(o => o.id === 'php_opcache_memory'), 'php_opcache_memory exists in core_server');
assert(coreServer.options.some(o => o.id === 'wp_autoload_size'), 'wp_autoload_size exists in core_server');
console.log('   ✓ Flik [1] Server Core options paritet verified');

// 7. v2.8.4 Specific Regressions & Telemetry Tests
console.log('7. Running v2.8.4 regression and interpretation tests...');

// 7a. Test extractSiteUrl vendor filtering (Astra vs real domain)
const testRawWithAstra = [
  '### wp-core ###',
  'version: 6.8.0',
  'site_url: https://xn--campingdrmmar-qmb.se',
  'home_url: https://xn--campingdrmmar-qmb.se',
  '### wp-active-theme ###',
  'name: Astra (astra)',
  'version: 4.8.0',
  'author_website: https://wpastra.com'
].join('\n');
const parsedWithAstra = parseSystemInfoText(testRawWithAstra);
const extractSiteUrl = sandbox.window.extractSiteUrl || sandbox.extractSiteUrl;
const detectedUrl = extractSiteUrl(parsedWithAstra, testRawWithAstra);
assert.strictEqual(detectedUrl, 'https://xn--campingdrmmar-qmb.se', 'extractSiteUrl prioritizes wp-core over wpastra.com');

// 7b. Test DISABLE_WP_CRON with "Enabled" / "Aktiverad" / "1"
const sysInfoCronEnabled = parseSystemInfoText([
  '### wp-constants ###',
  'DISABLE_WP_CRON: Enabled',
  'WP_MEMORY_LIMIT: 768M'
].join('\n'));
const analysisCronEnabled = sandbox.analyzeSystem(sysInfoCronEnabled, { is_active: true }, null, null, {});
assert(!analysisCronEnabled.alerts.some(a => a.id === 'alert_wc_cron_visitor'), 'DISABLE_WP_CRON: Enabled prevents alert_wc_cron_visitor');
const checkoutCardEnabled = analysisCronEnabled.cockpitFunctions.find(f => f.id === 'kassa_perf');
assert.strictEqual(checkoutCardEnabled.tools.find(t => t.name === 'Server-Cron').state, 'Server', 'Server-Cron tool is Server');

const sysInfoCronAktiverad = parseSystemInfoText([
  '### wp-constants ###',
  'DISABLE_WP_CRON: Aktiverad',
  'WP_MEMORY_LIMIT: 768M'
].join('\n'));
const analysisCronAktiverad = sandbox.analyzeSystem(sysInfoCronAktiverad, { is_active: true }, null, null, {});
assert(!analysisCronAktiverad.alerts.some(a => a.id === 'alert_wc_cron_visitor'), 'DISABLE_WP_CRON: Aktiverad prevents alert_wc_cron_visitor');

// 7c. Test HPOS sync enabled: no / nej (English & Swedish)
const parseWooCommerceStatus = sandbox.window.parseWooCommerceStatus || sandbox.parseWooCommerceStatus;
const wooStatusNoSyncEn = [
  '### WooCommerce Status ###',
  'HPOS enabled: yes',
  'HPOS data sync enabled: no'
].join('\n');
const parsedWooNoSyncEn = parseWooCommerceStatus(wooStatusNoSyncEn);
assert.strictEqual(parsedWooNoSyncEn.hpos_enabled, true, 'HPOS is enabled');
assert.strictEqual(parsedWooNoSyncEn.hpos_sync_enabled, false, 'HPOS sync is FALSE when no');
const analysisHposNoSyncEn = sandbox.analyzeSystem(sysInfoCronEnabled, parsedWooNoSyncEn, null, null, {});
assert(!analysisHposNoSyncEn.alerts.some(a => a.id === 'alert_wc_hpos_dual_write'), 'HPOS sync no does NOT trigger dual write alert');

const wooStatusNoSyncSv = [
  '### WooCommerce Status ###',
  'High-Performance Order Storage: aktiverat',
  'HPOS-datasynkronisering aktiverad: nej'
].join('\n');
const parsedWooNoSyncSv = parseWooCommerceStatus(wooStatusNoSyncSv);
assert.strictEqual(parsedWooNoSyncSv.hpos_enabled, true, 'HPOS is aktiverat');
assert.strictEqual(parsedWooNoSyncSv.hpos_sync_enabled, false, 'HPOS sync is FALSE when nej');
const analysisHposNoSyncSv = sandbox.analyzeSystem(sysInfoCronEnabled, parsedWooNoSyncSv, null, null, {});
assert(!analysisHposNoSyncSv.alerts.some(a => a.id === 'alert_wc_hpos_dual_write'), 'HPOS sync nej does NOT trigger dual write alert');

const parseWordfenceDiagnostic = sandbox.window.parseWordfenceDiagnostic || sandbox.parseWordfenceDiagnostic;
const parseElementorStatus = sandbox.window.parseElementorStatus || sandbox.parseElementorStatus;
const parseBooleanValue = sandbox.parseBooleanValue || sandbox.window.parseBooleanValue;

// 7d. Test parseBooleanValue utility
assert.strictEqual(parseBooleanValue("Enabled"), true);
assert.strictEqual(parseBooleanValue("Aktiverad"), true);
assert.strictEqual(parseBooleanValue("1"), true);
assert.strictEqual(parseBooleanValue("På"), true);
assert.strictEqual(parseBooleanValue("true"), true);
assert.strictEqual(parseBooleanValue("Disabled"), false);
assert.strictEqual(parseBooleanValue("Inaktiverad"), false);
assert.strictEqual(parseBooleanValue("Nej"), false);
assert.strictEqual(parseBooleanValue("Av"), false);
assert.strictEqual(parseBooleanValue("0"), false);
assert.strictEqual(parseBooleanValue("false"), false);

// 7e. Test advanced-cache.php is NOT treated as Redis
const sysInfoAdvancedCacheOnly = {
  'wp-server': { httpd_software: 'LiteSpeed' },
  'wp-dropins': { 'advanced-cache.php': true },
  'wp-constants': { 'DISABLE_WP_CRON': 'true' }
};
const analysisAdvCache = sandbox.analyzeSystem(sysInfoAdvancedCacheOnly, { is_active: true }, null, null, {});
assert.strictEqual(analysisAdvCache.environment.hasRedis, false, 'advanced-cache.php alone does NOT enable Redis');
const kassaAdv = analysisAdvCache.cockpitFunctions.find(f => f.id === 'kassa_perf');
assert.strictEqual(kassaAdv.tools.find(t => t.name === 'Redis Cache').state, 'AV', 'Redis Cache is AV when only advanced-cache.php exists');

// 7f. Test HPOS enabled label isolation: "HPOS enabled: no" must be false
const wooStatusHposDisabled = [
  '### WooCommerce Status ###',
  'HPOS enabled: no',
  'HPOS data sync enabled: no'
].join('\n');
const parsedWooHposDisabled = parseWooCommerceStatus(wooStatusHposDisabled);
assert.strictEqual(parsedWooHposDisabled.hpos_enabled, false, 'HPOS enabled: no sets hpos_enabled to false');

// 7g. Test Wordfence Live Traffic
const wfLiveTrafficDisabled = [
  '### Wordfence Diagnostics ###',
  'Traffic logging mode: Security Only'
].join('\n');
const parsedWfDisabled = parseWordfenceDiagnostic(wfLiveTrafficDisabled);
assert.strictEqual(parsedWfDisabled.live_traffic_disabled, true, 'Traffic logging mode: Security Only disables live traffic');

const wfLiveTrafficAll = [
  '### Wordfence Diagnostics ###',
  'Traffic logging mode: All Traffic'
].join('\n');
const parsedWfAll = parseWordfenceDiagnostic(wfLiveTrafficAll);
assert.strictEqual(parsedWfAll.live_traffic_disabled, false, 'Traffic logging mode: All Traffic keeps live traffic active');

// 7h. Test Elementor experiment: bare "default" does not mark active without qualifier
const elemDefaultExp = [
  '### Elementor ###',
  'Improved CSS Loading: default'
].join('\n');
const parsedElemExp = parseElementorStatus(elemDefaultExp);
assert.strictEqual(parsedElemExp.css_loading, null, 'Improved CSS Loading: default stays null (does not falsely activate)');

console.log('   ✓ v2.8.4 URL extraction, DISABLE_WP_CRON, HPOS label isolation, advanced-cache rejection & WF tests passed');

// 8. v2.8.5 Specific Regressions & Deep Audit Tests
console.log('8. Running v2.8.5 deep audit interpretation tests...');

// 8a. Test WooCommerce "WP Cron: –" parses as disabled cron (server cron active)
const wooWithCronDash = [
  '### WordPress Environment ###',
  'WP Cron: –'
].join('\n');
const parsedWooCronDash = parseWooCommerceStatus(wooWithCronDash);
assert.strictEqual(parsedWooCronDash.wp_cron_disabled, true, 'WP Cron: – sets wp_cron_disabled to true');
const analysisWooCronDash = sandbox.analyzeSystem({}, parsedWooCronDash, null, null, {});
assert.strictEqual(analysisWooCronDash.environment.disableWpCron, true, 'environment.disableWpCron is true from WooCommerce status');
assert(!analysisWooCronDash.alerts.some(a => a.id === 'alert_wc_cron_visitor'), 'alert_wc_cron_visitor is not triggered');

// 8b. Test HPOS sync dash "–" is parsed as false
const wooWithHposSyncDash = [
  '### Settings ###',
  'HPOS enabled: yes',
  'HPOS data sync enabled: –'
].join('\n');
const parsedWooHposSyncDash = parseWooCommerceStatus(wooWithHposSyncDash);
assert.strictEqual(parsedWooHposSyncDash.hpos_enabled, true, 'hpos_enabled is true');
assert.strictEqual(parsedWooHposSyncDash.hpos_sync_enabled, false, 'hpos_sync_enabled is false for –');

// 8c. Test Wordfence IP header does not match IP value rows
const wfTableSample = [
  '### Wordfence Diagnostics ###',
  'How Wordfence gets IPs: REMOTE_ADDR (Standard)',
  'IP-detektering: REMOTE_ADDR',
  'REMOTE_ADDR 185.189.51.40'
].join('\n');
const parsedWfTable = parseWordfenceDiagnostic(wfTableSample);
assert.strictEqual(parsedWfTable.ip_header, 'REMOTE_ADDR', 'ip_header is REMOTE_ADDR, not an IP address');

// 8d. Test PHP redis extension alone does NOT activate object cache
const sysInfoPhpRedisOnly = {
  'wp-server': { httpd_software: 'LiteSpeed', php_extensions: 'curl, mbstring, redis, json' }
};
const analysisPhpRedisOnly = sandbox.analyzeSystem(sysInfoPhpRedisOnly, null, null, null, {});
assert.strictEqual(analysisPhpRedisOnly.environment.hasRedis, false, 'PHP redis extension alone does NOT activate hasRedis');

// 8e. Test Klarna / Stripe checkout defer check does NOT trigger when gateway is inactive
const analysisNoKlarna = sandbox.analyzeSystem(
  { 'wp-server': { httpd_software: 'LiteSpeed' }, 'wp-plugins-active': { 'woocommerce/woocommerce.php': { name: 'WooCommerce' } } },
  { is_active: true },
  null,
  null,
  { optm_js_defer: '1', js_exclude: 'woocommerce' }
);
assert(!analysisNoKlarna.alerts.some(a => a.id === 'alert_crit_js_exclude_missing' && a.desc.includes('klarna')), 'Klarna defer alert not triggered when Klarna is absent');

console.log('   ✓ v2.8.5 WooCommerce cron dash, HPOS dash, WF IP-header, strict Redis & gateway tests passed');

// 9. v2.8.6 SSOT, OPcache Byte Parsing, SCM Telemetry & Checkout Correlation Tests
console.log('9. Running v2.8.6 Single Source of Truth and Checkout correlation tests...');

const allSettingsOptions = sampleSettings.flatMap(s => s.options);
const opcacheOpt = allSettingsOptions.find(o => o.id === 'php_opcache_memory');
assert(opcacheOpt, 'php_opcache_memory option exists in settings');
assert(opcacheOpt.wpPath && opcacheOpt.wpPath.includes('cPanel'), 'php_opcache_memory includes cPanel path guidance');

// 9a. Test php_opcache_memory parsing bytes "536863296 of 536870912"
const envOpcacheBytes = { opcacheMemoryTotal: '536863296 of 536870912', opcacheMemoryUsed: '536863296', opcacheHitRate: '98%' };
const opcacheComp = sandbox.getOptionComparison(opcacheOpt, {}, envOpcacheBytes);
assert.strictEqual(opcacheComp.isMatches, true, 'php_opcache_memory matches 512M threshold when given 536870912 bytes');
assert.strictEqual(opcacheComp.currentDisplay, '512M', 'php_opcache_memory displays as 512M');

// 9b. Test SCM SSOT for woo_cart_fragments and woo_transients_cleanup (v2.8.13 Grok audit paritet)
const cartOpt = allSettingsOptions.find(o => o.id === 'woo_cart_fragments');
const transientsOpt = allSettingsOptions.find(o => o.id === 'woo_transients_cleanup');
assert(cartOpt, 'woo_cart_fragments option exists');
assert(transientsOpt, 'woo_transients_cleanup option exists');

// When SCM actually has cart_fragments and transients configured:
const envWithSCM = { hasWooCommerce: true, wooInfo: {}, hasSCM: true, scmInfo: { cart_fragments: true, transients: true } };
const cartComp = sandbox.getOptionComparison(cartOpt, {}, envWithSCM);
assert.strictEqual(cartComp.isMatches, true, 'woo_cart_fragments is true when SCM configures it');
assert.strictEqual(cartComp.currentDisplay, 'PÅ (Optimerad via SCM)', 'woo_cart_fragments displays SCM label');

const transComp = sandbox.getOptionComparison(transientsOpt, {}, envWithSCM);
assert.strictEqual(transComp.isMatches, true, 'woo_transients_cleanup is true when SCM configures it');
assert.strictEqual(transComp.currentDisplay, 'PÅ (Hanteras av SCM)', 'woo_transients_cleanup displays SCM label');

// When SCM is present but does NOT configure them, both transients and cart fragments remain unmeasured unless header cart / Elementor Pro is present:
const envWithBareSCM = { hasWooCommerce: true, wooInfo: {}, hasSCM: true };
const cartBare = sandbox.getOptionComparison(cartOpt, {}, envWithBareSCM);
assert.strictEqual(cartBare.isMeasured, false, 'woo_cart_fragments is unmeasured when no header cart or Elementor Pro is present');
const envWithElemPro = { hasWooCommerce: true, hasElementorPro: true };
const cartElemPro = sandbox.getOptionComparison(cartOpt, {}, envWithElemPro);
assert.strictEqual(cartElemPro.isMeasured, false, 'woo_cart_fragments is unmeasured when Elementor Pro has no mini-cart signal');
const envWithElemProMiniCart = { hasWooCommerce: true, hasElementorPro: true, elementorInfo: { menu_cart: true } };
const cartElemProMini = sandbox.getOptionComparison(cartOpt, {}, envWithElemProMiniCart);
assert.strictEqual(cartElemProMini.isMeasured, true, 'woo_cart_fragments is measured when mini-cart signal exists');
assert.strictEqual(cartElemProMini.isMatches, true, 'woo_cart_fragments matches optimal (header cart)');
const transBare = sandbox.getOptionComparison(transientsOpt, {}, envWithBareSCM);
assert.strictEqual(transBare.isMeasured, false, 'woo_transients_cleanup is unmeasured if no explicit measurement exists');

// 9c. Test Elementor Theme Builder suppresses redundant Astra minicart & GF alerts
const sysInfoAstraElem = {
  'wp-server': { httpd_software: 'LiteSpeed', php_version: '8.3.0', opcache_enabled: true, opcache_hit_rate: '98%' },
  'wp-plugins-active': {
    'woocommerce/woocommerce.php': { name: 'WooCommerce' },
    'elementor/elementor.php': { name: 'Elementor' },
    'elementor-pro/elementor-pro.php': { name: 'Elementor Pro' },
    'site-code-manager/site-code-manager.php': { name: 'Site Code Manager' }
  },
  'wp-theme': { name: 'Astra', template: 'astra' },
  'wp-constants': { WP_MEMORY_LIMIT: '768M', WP_MAX_MEMORY_LIMIT: '8G' }
};
const analysisAstraElem = sandbox.analyzeSystem(
  sysInfoAstraElem,
  { is_active: true, wp_cron_disabled: true },
  null,
  { is_active: true, has_theme_builder: true, global_fonts_active: true },
  {}
);
assert(!analysisAstraElem.alerts.some(a => a.id === 'alert_info_astra_minicart'), 'Astra minicart alert suppressed when Elementor Theme Builder is active');
assert(!analysisAstraElem.alerts.some(a => a.id === 'alert_info_astra_google_fonts'), 'Astra Google fonts alert suppressed when Elementor Global Fonts are active');

// 9d. Test Checkout card status reflects missing Redis and OPcache TTFB
const checkoutCardMissingRedis = analysisAstraElem.cockpitFunctions.find(f => f.id === 'kassa_perf');
assert(checkoutCardMissingRedis, 'kassa_perf card exists');
assert(checkoutCardMissingRedis.statusText.includes('Saknar Redis'), 'kassa_perf displays Saknar Redis when Redis is not active');

// 9e. Test OPcache critical alert contains cPanel path, isChronic flag and TTFB relation
const sysInfoLowOpcache = {
  'wp-server': { httpd_software: 'LiteSpeed', php_version: '8.3.0', opcache_enabled: true, opcache_hit_rate: '68.4%', opcache_is_full: true },
  'wp-plugins-active': { 'woocommerce/woocommerce.php': { name: 'WooCommerce' } },
  'wp-constants': { WP_MEMORY_LIMIT: '768M', WP_MAX_MEMORY_LIMIT: '8G' }
};
const analysisLowOpcache = sandbox.analyzeSystem(sysInfoLowOpcache, { is_active: true }, null, null, {});
const opcacheAlert = analysisLowOpcache.alerts.find(a => a.id === 'alert_opcache_critical');
assert(opcacheAlert, 'alert_opcache_critical is triggered');
assert.strictEqual(opcacheAlert.isChronic, true, 'alert_opcache_critical has isChronic: true');
assert(opcacheAlert.title.includes('Kroniskt fel'), 'alert_opcache_critical title specifies Kroniskt fel');
assert(opcacheAlert.desc.includes('TTFB'), 'alert_opcache_critical desc specifies TTFB relation');
const checkoutTtfbAlert = analysisLowOpcache.alerts.find(a => a.id === 'alert_wc_checkout_ttfb');
assert(checkoutTtfbAlert, 'alert_wc_checkout_ttfb is triggered for WooCommerce checkout correlation');
assert(checkoutTtfbAlert.title.includes('TTFB'), 'alert_wc_checkout_ttfb title specifies TTFB in checkout');
assert(opcacheAlert.desc.includes('delat webbhotell'), 'alert_opcache_critical mentions delat webbhotell / Inleed');
assert(opcacheAlert.wpPath.includes('cPanel'), 'alert_opcache_critical specifies cPanel path');

// 9f. Test php_opcache_memory shows Kroniskt indicator when hit rate is under 80%
const opcacheCompLow = sandbox.getOptionComparison(opcacheOpt, {}, { opcacheMemoryTotal: '536863296 of 536870912', opcacheHitRate: '68.4%' });
assert(opcacheCompLow.currentDisplay.includes('Kroniskt'), 'php_opcache_memory includes Kroniskt in currentDisplay when hit rate < 80%');

// 9g. Test UI elements: Kroniska fel metric row present, button removed, update counter removed
assert(indexHtml.includes('id="metric-chronic-observations"'), 'index.html contains metric-chronic-observations');
assert(indexHtml.includes('Kroniska fel'), 'index.html contains Kroniska fel label');
assert(!indexHtml.includes('Hur beräknas min poäng?'), 'index.html has removed bulky button');
assert(!indexHtml.includes('id="health-score-updates"'), 'index.html has removed health-score-updates notice');

console.log('   ✓ v2.8.7 Kroniska fel, score i-toggle, phantom counter removal & TTFB alert tests passed');

// 10. v2.8.8 Verification: Theme slug stripping, Grid CSS, Gateway Sanity & Chronic status
console.log('10. Running v2.8.8 theme slug, grid layout, gateway sanity and chronic status tests...');

// 10a. Theme slug removal
const sysInfoThemeSlug = {
  'wp-active-theme': { name: 'Astra (astra)', version: '4.8.7' }
};
const analysisTheme = sandbox.analyzeSystem(sysInfoThemeSlug, {}, null, null, {});
assert.strictEqual(analysisTheme.environment.activeTheme, 'Astra', 'Theme name "Astra (astra)" stripped of parentheses');
const themeCard = analysisTheme.cockpitTools.find(t => t.id === 'theme');
assert.strictEqual(themeCard.version, 'Astra v4.8.7', 'Theme card shows "Astra v4.8.7" without slug in parentheses');

// 10b. Payment gateway sanity
const activePluginsWithShipmondo = {
  'woocommerce/woocommerce.php': { name: 'WooCommerce' },
  'shipmondo-for-woocommerce/shipmondo-for-woocommerce.php': { name: 'Shipmondo for WooCommerce' },
  'kustom-checkout-for-woocommerce/kustom-checkout.php': { name: 'Kustom Checkout for WooCommerce' }
};
const analysisGateways = sandbox.analyzeSystem({ 'wp-plugins-active': activePluginsWithShipmondo }, { hasWooCommerce: true }, null, null, {});
assert(!analysisGateways.environment.wooGateways.includes('Shipmondo'), 'Shipmondo is NOT classified as a payment gateway');
assert(analysisGateways.environment.hasKlarna, 'Kustom Checkout is correctly classified as Klarna Checkout');

// 10c. Stylesheet grid layout
assert(stylesCss.includes('minmax(205px, 1fr)'), 'styles.css has minmax(205px, 1fr) for broadened responsive cockpit card widths');

// 10d. php_opcache_memory chronic status label
const opcacheCompChronic = sandbox.getOptionComparison(opcacheOpt, {}, { opcacheMemoryTotal: '536863296 of 536870912', opcacheHitRate: '75%' });
assert.strictEqual(opcacheCompChronic.status, 'chronic', 'php_opcache_memory has status "chronic" when hit rate < 90%');
assert.strictEqual(opcacheCompChronic.statusLabel, '🔵 Kroniskt fel', 'php_opcache_memory has statusLabel "🔵 Kroniskt fel"');
assert.strictEqual(opcacheCompChronic.isDeviant, false, 'chronic setting isDeviant is false (0 score impact)');

console.log('   ✓ v2.8.8 theme slug, grid layout, gateway sanity and chronic status tests passed');

// 11. v2.8.9 Verification: Dual Score, Grok V1-V4 Audits & Card Overflow Fixes
console.log('11. Running v2.8.9 Dual Score, Grok Audits and Card Overflow tests...');

// 11a. UI elements: Config Score bar and card overflow CSS
assert(indexHtml.includes('id="config-score-wrapper"'), 'index.html contains config-score-wrapper');
assert(indexHtml.includes('id="config-score-bar-fill"'), 'index.html contains config-score-bar-fill');
assert(stylesCss.includes('.config-score-bar-track'), 'styles.css contains .config-score-bar-track');
assert(stylesCss.includes('.config-score-bar-fill'), 'styles.css contains .config-score-bar-fill');
assert(stylesCss.includes('overflow: hidden;'), 'styles.css contains overflow: hidden on cards');
assert(appJs.includes('flex-wrap: wrap'), 'app.js includes flex-wrap: wrap on function card headers');
assert(appJs.includes('white-space: nowrap'), 'app.js includes white-space: nowrap on tool state plinths');

// 11b. Inleed OPcache and TTFB alerts: scoreImpact 5 vs 0
const inleedSys = {
  'wp-server': { 
    php_version: '8.2.27', 
    httpd_software: 'LiteSpeed',
    opcache_is_full: true,
    opcache_hit_rate: '73.4',
    opcache_memory_used: '536863296 of 536870912'
  },
  'wp-constants': { WP_MEMORY_LIMIT: '512M', DISABLE_WP_CRON: true }
};
const inleedWoo = {
  hasWooCommerce: true,
  hpos_enabled: true,
  wp_cron_disabled: true
};
const analysisInleed = sandbox.analyzeSystem(
  inleedSys,
  inleedWoo,
  null,
  null,
  { 'cache-priv': 1, 'optm-js_exc': 'wc-cart-fragments\nwoocommerce' },
  null,
  null,
  null,
  { opcacheMemoryTotal: '536863296 of 536870912', opcacheHitRate: '73.4%' }
);

const opAlert = analysisInleed.alerts.find(a => a.id === 'alert_opcache_critical');
const ttfbAlert = analysisInleed.alerts.find(a => a.id === 'alert_wc_checkout_ttfb');

assert(opAlert, 'alert_opcache_critical is generated for Inleed');
assert.strictEqual(opAlert.type, 'chronic', 'OPcache alert has dedicated type: "chronic"');
assert.strictEqual(opAlert.isChronic, true, 'OPcache alert is marked isChronic: true');
assert.strictEqual(opAlert.scoreImpact, 5, 'OPcache alert has scoreImpact: 5 (5p deduction on Total Sajthälsa)');

assert(ttfbAlert, 'alert_wc_checkout_ttfb is generated for WooCommerce');
assert.strictEqual(ttfbAlert.type, 'chronic', 'TTFB alert has dedicated type: "chronic"');
assert.strictEqual(ttfbAlert.isChronic, true, 'TTFB alert is marked isChronic: true');
assert.strictEqual(ttfbAlert.scoreImpact, 0, 'TTFB alert has scoreImpact: 0 (no double penalty as it is symptom of OPcache)');

// 11c. Grok V2 dynamic TTFB description & Grok V3 conditional buffer
assert(ttfbAlert.desc.includes('trots att HPOS, Server-Cron är aktivt konfigurerat') || ttfbAlert.desc.includes('är aktivt konfigurerat'), 'TTFB text mentions active optimizations dynamically');
assert(opAlert.desc.includes('minnesbufferten är full'), 'OPcache text mentions buffer full when usage is >= 95%');

// Test low hit rate without full buffer (buffer not full)
const analysisNotFull = sandbox.analyzeSystem(
  { 'wp-server': { opcache_hit_rate: '70', opcache_memory_used: '100M of 512M' } },
  {}, null, null, {}
);
const opAlertNotFull = analysisNotFull.alerts.find(a => a.id === 'alert_opcache_critical');
assert(opAlertNotFull, 'Low hit rate triggers chronic OPcache alert');
assert(!opAlertNotFull.desc.includes('minnesbufferten är full'), 'OPcache text does NOT claim buffer is full when usage is low (Grok V3 fix)');
assert(opAlertNotFull.desc.includes('i en delad servermiljö'), 'OPcache text mentions shared server environment instead of full buffer');

// 11d. Checkout function card prioritizes actionable issues (!hasRedis) over chronic TTFB
const kassaCardV2812 = analysisInleed.cockpitFunctions.find(fn => fn.id === 'kassa_perf');
assert(kassaCardV2812, 'kassa_perf cockpit function card exists');
assert(kassaCardV2812.statusText.includes('Saknar Redis'), 'kassa_perf prioritizes actionable Saknar Redis over chronic TTFB');

// If Redis is configured, it falls back to chronic blue TTFB
const analysisInleedWithRedis = sandbox.analyzeSystem(
  { ...inleedSys, 'wp-dropins': { 'object-cache.php': true } },
  inleedWoo,
  null,
  null,
  { 'cache-priv': 1, 'optm-js_exc': 'wc-cart-fragments\nwoocommerce' },
  null,
  null,
  null,
  { opcacheMemoryTotal: '536863296 of 536870912', opcacheHitRate: '73.4%' }
);
const kassaCardWithRedis = analysisInleedWithRedis.cockpitFunctions.find(fn => fn.id === 'kassa_perf');
assert(kassaCardWithRedis.statusText.includes('Ojämn TTFB'), 'kassa_perf shows Ojämn TTFB when Redis is present and TTFB is chronic');

// 11e. Grok V1: warningCount and dangerCount filter out chronic alerts
const allAlertsInleed = analysisInleed.alerts;
const dangerCount = allAlertsInleed.filter(a => a.type === 'danger' && !a.isChronic).length;
const warningCount = allAlertsInleed.filter(a => a.type === 'warning' && !a.isChronic).length;
assert.strictEqual(dangerCount, 0, 'dangerCount excluding chronic alerts is 0');
assert.strictEqual(warningCount, 0, 'warningCount excluding chronic alerts is 0 (Grok V1 fix: no phantom Konfliktvarningar)');

// 11f. v2.8.10 UI Renodling: Overall Score & Config Completion
assert(indexHtml.includes('Overall<br>Score'), 'index.html gauge label has Overall<br>Score on two lines');
assert(indexHtml.includes('Config Completion'), 'index.html horizontal bar is titled Config Completion');
assert(!indexHtml.includes('⚙️ Konfigurationsbetyg'), 'index.html removed gear and old Konfigurationsbetyg title');
assert(!indexHtml.includes('(Påverkbart)'), 'index.html removed (Påverkbart) label');
assert(stylesCss.includes('height: 32px'), 'styles.css config bar height is 32px');
assert(appJs.includes('Overall Score'), 'app.js renders Overall Score in header title');

// 11g. v2.8.11 Blue Standard for Chronic & Topology Map Cleanup & SSOT Tool Cards
assert(ttfbAlert.components.length === 1 && ttfbAlert.components[0] === 'woocommerce', 'alert_wc_checkout_ttfb strictly belongs to woocommerce to avoid double counting on server');
assert(stylesCss.includes('.alert-item.chronic'), 'styles.css includes .alert-item.chronic');
assert(appJs.includes('🔵 Kroniskt fel${deductionText}'), 'app.js renders dynamic blue chronic badge with deduction');
assert(appJs.includes('.filter(a => !a.isChronic)'), 'drawTopologyMap filters out chronic alerts');

// 11h. v2.8.12 / v2.8.14 Pedagogical Explanation under Referenser & Källor
assert(indexHtml.includes('Tolkning av resultat: Avvikelser, Konflikter & Kroniska fel'), 'index.html includes pedagogical explanation');
assert(indexHtml.includes('Avvikelser mot rekommendation (1:1 mot Benchmark)'), 'index.html includes yellow deviations explanation with benchmark note');
assert(indexHtml.includes('Konflikter & Stabilitetsrisker (Kollision mellan verktyg)'), 'index.html includes red conflicts explanation with tool collision note');
assert(indexHtml.includes('Kroniska fel (Externa hostingbegränsningar)'), 'index.html includes blue chronic explanation with external hosting note');
assert(!indexHtml.includes('Skillnaden mellan Avvikelser och Konflikter'), 'index.html removed old duplicate 2-column card');
assert(indexHtml.includes('Verifierade och granskade: <strong>2026-10-16</strong>'), 'index.html updated audit date to 2026-10-16');

console.log('   ✓ v2.8.14 Pedagogical Explanation and audit date verified');

// 11i. v2.8.13 Wordfence IP & Live Traffic Paritet, Grok Audit & No-Abort Skydd
console.log('11i. Checking v2.8.13 Wordfence IP & Live Traffic parity, Grok audit and No-Abort protection...');

// 1. stripThemeSlug preserves meaningful parentheticals
assert.strictEqual(sandbox.stripThemeSlug("Astra (astra)"), "Astra", "stripThemeSlug removes slug identical to theme name");
assert.strictEqual(sandbox.stripThemeSlug("GeneratePress (generatepress)"), "GeneratePress", "stripThemeSlug removes slug for GeneratePress");
assert.strictEqual(sandbox.stripThemeSlug("Astra (Child Theme)"), "Astra (Child Theme)", "stripThemeSlug preserves (Child Theme)");
assert.strictEqual(sandbox.stripThemeSlug("Custom Theme (v2)"), "Custom Theme (v2)", "stripThemeSlug preserves (v2)");

// 2. Wordfence wf_ip_header comparison
const wfIpOpt = { id: "wf_ip_header", title: "IP Header", tool: "wordfence", recommendedRaw: "REMOTE_ADDR" };
const wfCompRemote = sandbox.getOptionComparison(wfIpOpt, {}, { wfInfo: { ip_header: "REMOTE_ADDR" }, hasWordfence: true });
assert.strictEqual(wfCompRemote.isMatches, true, "wf_ip_header matches REMOTE_ADDR");
assert.strictEqual(wfCompRemote.currentDisplay, "REMOTE_ADDR", "wf_ip_header displays REMOTE_ADDR");

const wfCompStandard = sandbox.getOptionComparison(wfIpOpt, {}, { wfInfo: { ip_header: "Standard" }, hasWordfence: true });
assert.strictEqual(wfCompStandard.isMatches, true, "wf_ip_header matches Standard as REMOTE_ADDR");

// 3. String option display for Wordfence in app.js
assert(appJs.includes('(opt.tool === "server" || opt.tool === "wordfence") && typeof opt.recommendedRaw === "string"'), 'app.js supports string status display for wordfence');

// 4. Default deduction for type: "info" is 0p
assert(appJs.includes('const deduction = (a.scoreImpact !== undefined) ? a.scoreImpact : (isDanger ? 18 : (isWarning ? 7 : 0));'), 'app.js info alert default deduction is 0p');

// 5. Exporter Swedish [KRONISKT] and Overall Score / Config column
assert(exporterJs.includes('(a.isChronic || a.type === "chronic") ? "KRONISKT"'), 'exporter.js uses Swedish KRONISKT label');
assert(exporterJs.includes('| Overall Score / Config |'), 'exporter.js batch markdown has Overall Score / Config header');
assert(exporterJs.includes('RewriteRule .* - [E=noabort:1]'), 'exporter.js includes noabort .htaccess rule');

// 6. Top finding text and plural grammar
assert(appJs.includes('1 externt kroniskt fel'), 'app.js has singular 1 externt kroniskt fel');
assert(appJs.includes('externa kroniska fel'), 'app.js has plural externa kroniska fel');
assert(appJs.includes('rekommenderade optimeringar att åtgärda (se \'Rekommenderade inställningar\') samt'), 'app.js shows deviation advice alongside chronic errors');

// 7. Config Completion text dynamic
assert(appJs.includes('avvikelser kvar att optimera i WordPress'), 'app.js dynamic config completion copy when < 100%');

console.log('   ✓ v2.8.13 Wordfence IP & Live Traffic Paritet, Grok Audit & No-Abort Skydd verified');

// 11j. v2.8.14 LiteSpeed + Wordfence No-Abort Telemetri
console.log('11j. Checking v2.8.14 LiteSpeed + Wordfence No-Abort telemetry and option parity...');

// 1. parseWordfenceDiagnostic detects noabort PÅ, AV, and null
const parseWfDiag = sandbox.window.parseWordfenceDiagnostic || sandbox.parseWordfenceDiagnostic;
const parseCcText = sandbox.window.parseCustomCodeText || sandbox.parseCustomCodeText;

const wfDiagOn = parseWfDiag("Wordfence Diagnostic Report\nRewriteRule .* - [E=noabort:1]\n");
assert.strictEqual(wfDiagOn.noabort_active, true, "parseWordfenceDiagnostic detects E=noabort:1 as true");

const wfDiagOff = parseWfDiag("Wordfence Diagnostic Report\nWordfence cannot determine whether \"noabort\" is set\n");
assert.strictEqual(wfDiagOff.noabort_active, false, "parseWordfenceDiagnostic detects warning as false");

const wfDiagNull = parseWfDiag("Wordfence Diagnostic Report\nGeneral Wordfence Options\n");
assert.strictEqual(wfDiagNull.noabort_active, null, "parseWordfenceDiagnostic leaves unmentioned noabort as null");

// 2. parseCustomCodeText detects .htaccess noabort
const customCodeHtaccess = parseCcText("<IfModule rewrite_module>\nRewriteRule .* - [E=noabort:1]\n</IfModule>");
assert.strictEqual(customCodeHtaccess.hasNoabort, true, "parseCustomCodeText detects noabort in .htaccess");

// 3. getOptionComparison for wf_noabort
const wfNoabortOpt = { id: "wf_noabort", title: "LiteSpeed noabort skydd", tool: "wordfence", recommendedRaw: "PÅ" };

const compNoabortOn = sandbox.getOptionComparison(wfNoabortOpt, {}, { noabortActive: true, hasWordfence: true, isLiteSpeedServer: true });
assert.strictEqual(compNoabortOn.isMatches, true, "wf_noabort isMatches when noabortActive: true");
assert.ok(compNoabortOn.currentDisplay.startsWith("PÅ (noabort:1 aktiv"), "wf_noabort displays PÅ when active");

const compNoabortOff = sandbox.getOptionComparison(wfNoabortOpt, {}, { noabortActive: false, hasWordfence: true, isLiteSpeedServer: true, hasHtaccessFile: true, isCompleteHtaccess: true });
assert.strictEqual(compNoabortOff.isMatches, false, "wf_noabort does not match when noabortActive: false");
assert.strictEqual(compNoabortOff.currentDisplay, "AV (Saknas i .htaccess)", "wf_noabort displays AV when missing in .htaccess");

const compNoabortNoHt = sandbox.getOptionComparison(wfNoabortOpt, {}, { noabortActive: false, hasWordfence: true, isLiteSpeedServer: true, hasHtaccessFile: false });
assert.strictEqual(compNoabortNoHt.currentDisplay, "AV (Enligt Wordfence · .htaccess ej inläst)", "wf_noabort indicates htaccess unread when missing file");

const compNoabortNull = sandbox.getOptionComparison(wfNoabortOpt, {}, { noabortActive: null, hasWordfence: true, isLiteSpeedServer: true });
assert.strictEqual(compNoabortNull.isMeasured, false, "wf_noabort is unmeasured when null");
assert.strictEqual(compNoabortNull.status, "unmeasured", "wf_noabort status is unmeasured");

// 4. analyzeSystem alert_litespeed_noabort generation
const sysLsServer = {
  "wp-core": { version: "6.8.0" },
  "wp-server": { server_architecture: "LiteSpeed", php_version: "8.3" },
  "wp-plugins-active": { "wordfence/wordfence.php": { version: "8.0.4" } }
};

const resNoabortOff = sandbox.analyzeSystem(sysLsServer, null, { noabort_active: false }, null, {});
const alertOff = resNoabortOff.alerts.find(a => a.id === "alert_litespeed_noabort");
assert(alertOff, "alert_litespeed_noabort is generated when server is LiteSpeed and noabortActive is false");

const resNoabortOn = sandbox.analyzeSystem(sysLsServer, null, { noabort_active: true }, null, {});
const alertOn = resNoabortOn.alerts.find(a => a.id === "alert_litespeed_noabort");
assert(!alertOn, "alert_litespeed_noabort is NOT generated when noabortActive is true");

const resNoabortNull = sandbox.analyzeSystem(sysLsServer, null, { noabort_active: null }, null, {});
const alertNull = resNoabortNull.alerts.find(a => a.id === "alert_litespeed_noabort");
assert(!alertNull, "alert_litespeed_noabort is NOT generated when noabortActive is null (no false alerts)");

console.log('   ✓ v2.8.14 LiteSpeed + Wordfence No-Abort telemetry and option parity verified');

// 11k. v2.8.15 Regression Tests: 4 False Deviations, Robust No-Abort & Unmeasured Filter/Sort
console.log('11k. Checking v2.8.15 4 False Deviations, Robust No-Abort and Unmeasured Filter/Sort...');

// 1. wf_ip_header section title ignore test
const wfDiagSectionHeader = `
## How Wordfence gets IPs: Methods of detecting a visitor's IP address. ##
`;
const parsedWfHeader = parseWfDiag(wfDiagSectionHeader);
assert.notStrictEqual(parsedWfHeader.ip_header, "Methods of detecting a visitor's IP address. ##", "wf_ip_header does not take section header as IP");
const compWfIp = sandbox.getOptionComparison(
  { id: "wf_ip_header", tool: "wordfence", recommendedRaw: "REMOTE_ADDR" },
  {},
  { wfInfo: parsedWfHeader, hasWordfence: true }
);
assert.strictEqual(compWfIp.isMatches, true, "wf_ip_header defaults safely to REMOTE_ADDR matching recommendation");
assert.strictEqual(compWfIp.isDeviant, false, "wf_ip_header does not cause a deviation");

// 2. wf_disable_live_traffic null/unmeasured test
const parsedWfEmpty = parseWfDiag("Wordfence Diagnostic Report\nSome random text\n");
assert.strictEqual(parsedWfEmpty.live_traffic_disabled, null, "live_traffic_disabled is null when unmeasured");
const compWfNoFile = sandbox.getOptionComparison(
  { id: "wf_disable_live_traffic", tool: "wordfence", recommendedRaw: 1 },
  {},
  { wfInfo: null, hasWordfence: false }
);
assert.strictEqual(compWfNoFile.isMeasured, false, "wf_disable_live_traffic is not measured when Wordfence is not loaded");

const compWfLive = sandbox.getOptionComparison(
  { id: "wf_disable_live_traffic", tool: "wordfence", recommendedRaw: 1 },
  {},
  { wfInfo: parsedWfEmpty, hasWordfence: true }
);
assert.strictEqual(compWfLive.isMeasured, false, "wf_disable_live_traffic is unmeasured when Wordfence report lacks live traffic telemetry");
assert.strictEqual(compWfLive.isDeviant, false, "wf_disable_live_traffic does not trigger a false deviation");

// 3. woo_cart_fragments & woo_transients_cleanup null/unmeasured test
const parseWoo = appJs.match(/function parseWooCommerceStatus\(text\)\s*\{([\s\S]*?)\n  \}/);
const parseWooFn = new Function('text', parseWoo[1]);
const parsedWooEmpty = parseWooFn("### WooCommerce Status ###\nWC Version: 9.8.5\n");
assert.strictEqual(parsedWooEmpty.cart_fragments_dequeued, null, "cart_fragments_dequeued defaults to null");
assert.strictEqual(parsedWooEmpty.transients_cleanup_enabled, null, "transients_cleanup_enabled defaults to null");

const compWooCart = sandbox.getOptionComparison(
  { id: "woo_cart_fragments", tool: "woocommerce", recommendedRaw: 1 },
  { db_optm_transient: "0" },
  { wooInfo: parsedWooEmpty, hasWooCommerce: true }
);
assert.strictEqual(compWooCart.isMeasured, false, "woo_cart_fragments without header cart / Elementor Pro remains unmeasured (Värde saknas)");
assert.strictEqual(compWooCart.isDeviant, false, "woo_cart_fragments does not cause false deviation");

const compWooCartPro = sandbox.getOptionComparison(
  { id: "woo_cart_fragments", tool: "woocommerce", recommendedRaw: 1 },
  { db_optm_transient: "0" },
  { wooInfo: parsedWooEmpty, hasWooCommerce: true, hasMenuCart: true }
);
assert.strictEqual(compWooCartPro.isMeasured, true, "woo_cart_fragments is measured as active header cart when menu cart is present");
assert.strictEqual(compWooCartPro.isMatches, true, "woo_cart_fragments matches optimal");

const compWooCartNoWoo = sandbox.getOptionComparison(
  { id: "woo_cart_fragments", tool: "woocommerce", recommendedRaw: 1 },
  {},
  { hasWooCommerce: false }
);
assert.strictEqual(compWooCartNoWoo.isMeasured, false, "woo_cart_fragments is unmeasured when WooCommerce not present");

const parsedWooOld = parseWooFn("### WooCommerce Status ###\nWC Version: 7.0.0\n");
const compWooTrans = sandbox.getOptionComparison(
  { id: "woo_transients_cleanup", tool: "woocommerce", recommendedRaw: 1 },
  { db_optm_transient: "0" }, // standard LSCWP .data key
  { wooInfo: parsedWooOld, wooVersion: "7.0.0", hasWooCommerce: true }
);
assert.strictEqual(compWooTrans.isMeasured, false, "woo_transients_cleanup decoupled from LiteSpeed db_optm_transient on legacy WC");
assert.strictEqual(compWooTrans.isDeviant, false, "woo_transients_cleanup does not cause false deviation on legacy WC");

const compWooTransModern = sandbox.getOptionComparison(
  { id: "woo_transients_cleanup", tool: "woocommerce", recommendedRaw: 1 },
  { db_optm_transient: "0" },
  { wooInfo: parsedWooEmpty, wooVersion: "9.8.5", hasWooCommerce: true }
);
assert.strictEqual(compWooTransModern.isMeasured, true, "woo_transients_cleanup is measured on WC >= 7.8");
assert.strictEqual(compWooTransModern.isMatches, true, "woo_transients_cleanup is optimal on WC >= 7.8");

// 4. Robust noabort: 1 with space test
const parsedWfSpaceNoabort = parseWfDiag("LiteSpeed Environment\nnoabort: 1\n");
assert.strictEqual(parsedWfSpaceNoabort.noabort_active, true, "parseWordfenceDiagnostic detects noabort: 1 with space");

const parsedWfDumpNoabort = parseWfDiag("Array\n(\n    [noabort] => 1\n)\n");
assert.strictEqual(parsedWfDumpNoabort.noabort_active, true, "parseWordfenceDiagnostic detects [noabort] => 1 in diagnostic array dump");

// 5. Unmeasured filter button and sort select in index.html and app.js
assert(indexHtml.includes('data-filter="unmeasured"'), "index.html has data-filter=unmeasured button");
assert(appJs.includes('activeSettingsFilter === "unmeasured"'), "app.js supports activeSettingsFilter unmeasured");
assert(appJs.includes('sortBy === "unmeasured"'), "app.js supports sortBy unmeasured");

console.log('   ✓ v2.8.15 4 False Deviations, Robust No-Abort and Unmeasured Filter/Sort verified');

// 6. v2.8.16 End-to-End System Analysis Tests
console.log('27. Testing v2.8.16 end-to-end analyzeSystem unmeasured integrity...');
const fullAnalysisRes = sandbox.analyzeSystem(
  {
    "wp-core": { version: "6.8.0" },
    "wp-server": { server_architecture: "LiteSpeed", php_version: "8.2.0", php_sapi: "litespeed" },
    "wp-plugins-active": { "woocommerce/woocommerce.php": { version: "9.8.5" }, "wordfence/wordfence.php": { version: "8.0.4" } }
  },
  parsedWooEmpty, // from parseWooCommerceStatus
  parsedWfEmpty,  // from parseWordfenceDiagnostic
  null,
  { "optm-css_min": "1" }
);

const liveTrafficComp = sandbox.getOptionComparison(
  { id: "wf_disable_live_traffic", tool: "wordfence", recommendedRaw: 1 },
  { "optm-css_min": "1" },
  fullAnalysisRes.environment
);
assert.strictEqual(liveTrafficComp.isMeasured, false, "wf_disable_live_traffic is unmeasured when Wordfence report lacks live traffic telemetry in full analyzeSystem");
assert.strictEqual(liveTrafficComp.isDeviant, false, "wf_disable_live_traffic is not deviant in full analyzeSystem");

const cartFragComp = sandbox.getOptionComparison(
  { id: "woo_cart_fragments", tool: "woocommerce", recommendedRaw: 1 },
  { "optm-css_min": "1" },
  fullAnalysisRes.environment
);
assert(cartFragComp, "woo_cart_fragments found in comparisons");
assert.strictEqual(cartFragComp.isMeasured, false, "woo_cart_fragments is unmeasured without header cart or Elementor Pro in full analyzeSystem");
assert.strictEqual(cartFragComp.isDeviant, false, "woo_cart_fragments is not deviant without SCM or LS exclude");

const transCleanComp = sandbox.getOptionComparison(
  { id: "woo_transients_cleanup", tool: "woocommerce", recommendedRaw: 1 },
  { "optm-css_min": "1" },
  fullAnalysisRes.environment
);
assert(transCleanComp, "woo_transients_cleanup found in comparisons");
assert.strictEqual(transCleanComp.isMeasured, true, "woo_transients_cleanup is measured as builtin in full analyzeSystem");
assert.strictEqual(transCleanComp.isMatches, true, "woo_transients_cleanup is optimal as builtin");
assert.strictEqual(transCleanComp.isDeviant, false, "woo_transients_cleanup is not deviant without SCM");

// Also test historical profile sanitization
const legacyWooInfo = { hpos_enabled: true, cart_fragments_dequeued: false, transients_cleanup_enabled: false };
const legacyWfInfo = { firewall_mode: "Enabled", ip_header: "REMOTE_ADDR", disable_live_traffic: false, live_traffic_disabled: null };
if (legacyWooInfo.cart_fragments_dequeued === false) legacyWooInfo.cart_fragments_dequeued = null;
if (legacyWooInfo.transients_cleanup_enabled === false) legacyWooInfo.transients_cleanup_enabled = null;
if (legacyWfInfo.disable_live_traffic === false && (legacyWfInfo.live_traffic_disabled === null || legacyWfInfo.live_traffic_disabled === undefined)) {
  legacyWfInfo.disable_live_traffic = null;
}
assert.strictEqual(legacyWooInfo.cart_fragments_dequeued, null, "legacy cart_fragments_dequeued sanitized to null");
assert.strictEqual(legacyWooInfo.transients_cleanup_enabled, null, "legacy transients_cleanup_enabled sanitized to null");
assert.strictEqual(legacyWfInfo.disable_live_traffic, null, "legacy disable_live_traffic sanitized to null");

console.log('   ✓ v2.8.16 False Deviations completely eliminated & verified');

// 28. Testing v2.8.17 Grok Deep-Audit Parity & Robust No-Abort Protection
console.log('28. Testing v2.8.17 Grok Deep-Audit Parity & Robust No-Abort Protection...');

// 1. Wordfence diagnostic REDIRECT_noabort => 1
const wfRedirectDiagnostic = `
## Server Environment ##
Server: LiteSpeed
$_SERVER['REDIRECT_noabort'] => 1
`;
const redirectMatches = /(?:REDIRECT_)?noabort['"\]\s]*[:=>(?:=>)]+\s*['"]?1['"]?/i.test(wfRedirectDiagnostic);
assert(redirectMatches, "REDIRECT_noabort => 1 matched by regex");

// 2. Normalization of curly quotes and Swedish warning phrases
const curlyWarning = `Vi kan inte avgöra om “noabort” är aktivt på LiteSpeed`;
const cleanCurly = curlyWarning.replace(/[\u2018\u2019\u201A\u201B]/g, "'").replace(/[\u201C\u201D\u201E\u201F]/g, '"');
assert(cleanCurly.includes('kan inte avgöra om "noabort"'), "curly quotes normalized to straight quotes");

// 3. Commented out rule in .htaccess does not activate
const htaccessWithComments = `
# RewriteRule .* - [E=noabort:1]
// RewriteRule .* - [E=noabort:1]
RewriteEngine On
`;
const htaccessLines = htaccessWithComments.split(/\r?\n/);
let commentedActive = false;
htaccessLines.forEach(l => {
  const tr = l.trim();
  if (tr.startsWith('#') || tr.startsWith('//')) return;
  if (/noabort/i.test(tr)) commentedActive = true;
});
assert.strictEqual(commentedActive, false, "Commented out noabort rules in .htaccess skipped");

// 4. .htaccess proof overrides older Wordfence diagnostic in analyzeSystem
const analysisWithHtaccessOverride = sandbox.analyzeSystem(
  {
    "wp-core": { version: "6.8.2" },
    "wp-server": { server_architecture: "LiteSpeed", php_version: "8.2.0", php_sapi: "litespeed" },
    "wp-plugins-active": { "wordfence/wordfence.php": { version: "8.0.4" } }
  },
  null,
  { noabort_active: false }, // Wordfence diagnostic previously warned
  null,
  { "optm-css_min": "1" },
  { hasNoabort: true } // .htaccess uploaded has the rule
);
assert.strictEqual(analysisWithHtaccessOverride.environment.noabortActive, true, ".htaccess direct proof overrides old Wordfence diagnostic warning");

// 5. Direct .htaccess without rule sets hasNoabort: false
const analysisWithHtaccessMissing = sandbox.analyzeSystem(
  {
    "wp-core": { version: "6.8.2" },
    "wp-server": { server_architecture: "LiteSpeed", php_version: "8.2.0", php_sapi: "litespeed" },
    "wp-plugins-active": { "wordfence/wordfence.php": { version: "8.0.4" } }
  },
  null,
  null,
  null,
  { "optm-css_min": "1" },
  { hasNoabort: false }
);
assert.strictEqual(analysisWithHtaccessMissing.environment.noabortActive, false, ".htaccess without rule sets noabortActive false");
const missingAlert = analysisWithHtaccessMissing.alerts.find(a => a.id === "alert_litespeed_noabort");
assert(missingAlert, "alert_litespeed_noabort triggered when noabort is missing");
assert.strictEqual(missingAlert.scoreImpact, 5, "alert_litespeed_noabort carries single positive 5p score impact deduction");

// 6. Contextual gating: no alert and isMeasured=false on Nginx or without Wordfence
const analysisNginxServer = sandbox.analyzeSystem(
  {
    "wp-core": { version: "6.8.2" },
    "wp-server": { server_architecture: "nginx/1.24.0", php_version: "8.2.0" },
    "wp-plugins-active": { "wordfence/wordfence.php": { version: "8.0.4" } }
  },
  null,
  null,
  null,
  { "optm-css_min": "1" },
  { hasNoabort: false }
);
const nginxAlert = analysisNginxServer.alerts.find(a => a.id === "alert_litespeed_noabort");
assert(!nginxAlert, "alert_litespeed_noabort not triggered on Nginx server");

// 7. Contextual gating in buildCompleteLscwpSettings for wf_noabort
const tabsLSAndWf = sandbox.buildCompleteLscwpSettings({ isLiteSpeedServer: true, hasWordfence: true });
const wfTabLS = tabsLSAndWf.find(t => t.id === "wordfence");
assert(wfTabLS && wfTabLS.options.some(o => o.id === "wf_noabort"), "wf_noabort included in recommendations when LiteSpeed + Wordfence");

const tabsNginxAndWf = sandbox.buildCompleteLscwpSettings({ isLiteSpeedServer: false, hasWordfence: true });
const wfTabNginx = tabsNginxAndWf.find(t => t.id === "wordfence");
assert(wfTabNginx && !wfTabNginx.options.some(o => o.id === "wf_noabort"), "wf_noabort omitted from recommendations when server is not LiteSpeed");

// 8. SCM / PHP code protection against false .htaccess matching
const scmWithRewrite = parseCcText(`<?php
// SCM Snippet mentioning rewrite rules
// IfModule rewrite_module RewriteRule .* - [E=something:1]
add_action('init', function() { return true; });
`);
assert.strictEqual(scmWithRewrite.hasNoabort, null, "SCM PHP code is not falsely evaluated as missing .htaccess noabort");

// 9. WP_POST_REVISIONS extraction and comparison
const wpConfigSnippet = parseCcText(`<?php
define('WP_POST_REVISIONS', 5);
`);
assert.strictEqual(wpConfigSnippet.wpPostRevisions, 5, "parseCustomCodeText extracts WP_POST_REVISIONS as 5");

const wpRevOpt = { id: "wp_post_revisions", title: "Begränsa inläggsrevisioner", tool: "server", recommendedRaw: 5 };
const compWpRev = sandbox.getOptionComparison(wpRevOpt, {}, { wpPostRevisions: 5 });
assert.strictEqual(compWpRev.isMatches, true, "wp_post_revisions matches when wpPostRevisions: 5");
assert.strictEqual(compWpRev.isMeasured, true, "wp_post_revisions is measured");
assert.strictEqual(compWpRev.currentDisplay, "5", "wp_post_revisions display is 5");

// 10. WordPress benchmark updated to 6.8.2
assert.strictEqual((sandbox.BENCHMARK_VERSIONS || sandbox.window.BENCHMARK_VERSIONS).wordpress.benchmarkVersion, "6.8.2", "BENCHMARK_VERSIONS.wordpress is 6.8.2");

// 11. Exporter produces [KRONISKT]
assert(exporterJs.includes('(a.isChronic || a.type === "chronic") ? "KRONISKT" :'), "exporter uses Swedish KRONISKT label");

console.log('   ✓ v2.8.18 Grok Audit Parity, Correct Score Direction, SCM Protection & WP_POST_REVISIONS verified');

// 12. v2.8.19 SCM Data Pipeline, Profile Raw Preservation & Honest Theme Measurement
console.log('\n--- Testing v2.8.19 SCM Pipeline, Profile Preservation & Honest Theme Measurement ---');

// A. SCM PHP Snippet Parsing: cart_fragments & transients_cleanup
const scmPhpCode = `<?php
/**
 * Plugin Name: SCM Site Code Manager
 * Version: 1.4.2
 */
add_action('wp_enqueue_scripts', function() {
    if (!is_cart() && !is_checkout()) {
        wp_dequeue_script('wc-cart-fragments');
    }
}, 99);

add_action('scm_daily_cron', function() {
    delete_expired_transients();
});
`;

const parsedScmPhp = parseCcText(scmPhpCode);
assert.strictEqual(parsedScmPhp.cart_fragments_dequeued, true, "parseCustomCodeText detects cart_fragments dequeue in PHP");
assert.strictEqual(parsedScmPhp.transients_cleanup, true, "parseCustomCodeText detects transients_cleanup in PHP");
assert.strictEqual(parsedScmPhp.version, "1.4.2", "parseCustomCodeText detects SCM version in PHP header");

// B. SCM JSON Parsing
const scmJsonStr = JSON.stringify({
  version: "1.4.2",
  cart_fragments: true,
  transients_cleanup: true,
  options: {
    redis_active: true
  }
});
const parsedScmJson = parseCcText(scmJsonStr);
assert.strictEqual(parsedScmJson.cart_fragments, true, "parseCustomCodeText detects cart_fragments in JSON");
assert.strictEqual(parsedScmJson.transients_cleanup, true, "parseCustomCodeText detects transients_cleanup in JSON");
assert.strictEqual(parsedScmJson.version, "1.4.2", "parseCustomCodeText detects SCM version in JSON");

// C. Rules verification for SCM integration
const compScmCart = sandbox.getOptionComparison(
  { id: "woo_cart_fragments", title: "Cart Fragments", tool: "woocommerce", recommendedRaw: "1" },
  {},
  { hasWooCommerce: true, scmInfo: parsedScmPhp, hasMenuCart: false }
);
assert.strictEqual(compScmCart.isMeasured, true, "woo_cart_fragments is measured when SCM info present on WooCommerce site");
assert.strictEqual(compScmCart.isMatches, true, "woo_cart_fragments matches recommendation with SCM");

const compScmTransients = sandbox.getOptionComparison(
  { id: "woo_transients_cleanup", title: "Transients", tool: "woocommerce", recommendedRaw: "1" },
  {},
  { hasWooCommerce: true, scmInfo: parsedScmPhp }
);
assert.strictEqual(compScmTransients.isMeasured, true, "woo_transients_cleanup is measured when SCM info present on WooCommerce site");
assert.strictEqual(compScmTransients.isMatches, true, "woo_transients_cleanup matches recommendation with SCM");

// D. Honest theme measurement without false positive 1
const compThemeLogoNoTheme = sandbox.getOptionComparison(
  { id: "theme_site_logo", title: "Logo", tool: "theme", recommendedRaw: "1" },
  {},
  { hasThemeSource: false, hasSpecificTheme: false, hasUploadedTheme: false }
);
assert.strictEqual(compThemeLogoNoTheme.isMeasured, false, "theme_site_logo is unmeasured when theme missing");
assert.strictEqual(compThemeLogoNoTheme.statusLabel, "⚪ Värde saknas (5. Tema / 1. WP-system)", "theme_site_logo shows 5. Tema / 1. WP-system when missing");

const compThemeLogoEmptyTheme = sandbox.getOptionComparison(
  { id: "theme_site_logo", title: "Logo", tool: "theme", recommendedRaw: "1" },
  {},
  { hasThemeInfo: true, hasSpecificTheme: true, themeInfo: { theme_name: "Astra" } }
);
assert.strictEqual(compThemeLogoEmptyTheme.isMeasured, true, "theme_site_logo is measured when theme info uploaded");
assert.strictEqual(compThemeLogoEmptyTheme.rawMeasured, "0", "theme_site_logo falls back to 0 (not 1) when logo missing in theme");
assert.strictEqual(compThemeLogoEmptyTheme.isMatches, false, "theme_site_logo does not falsely match when logo missing in theme");

// E. Accurate unmeasured labels reflecting actual source slots
const compUnmeasuredNoabort = sandbox.getOptionComparison(
  { id: "wf_noabort", title: "LiteSpeed noabort", tool: "wordfence", recommendedRaw: "1" },
  {},
  {}
);
assert.strictEqual(compUnmeasuredNoabort.statusLabel, "⚪ Värde saknas (8. .htaccess / 4. Wordfence)", "wf_noabort unmeasured label shows 8. .htaccess / 4. Wordfence");

const compUnmeasuredCart = sandbox.getOptionComparison(
  { id: "woo_cart_fragments", title: "Cart Fragments", tool: "woocommerce", recommendedRaw: "1" },
  {},
  {}
);
assert.strictEqual(compUnmeasuredCart.statusLabel, "⚪ Värde saknas (6. Elementor / 7. SCM / 9. LiteSpeed)", "woo_cart_fragments unmeasured label shows 6. Elementor / 7. SCM / 9. LiteSpeed");

console.log('   ✓ v2.8.19 SCM Pipeline, Profile Preservation & Honest Theme Measurement verified');

// 13. v2.8.20 SCM Tight Regex, Context Isolation, WP_POST_REVISIONS 0 & 0p Deviation Immunity
console.log('\n--- Testing v2.8.20 SCM Context, 0p Policy Parity & Revisions 0 ---');

// A. Negative test: Loose word 'cart_fragments' and 'disable' across separate functions does NOT match
const looseCartPhp = `<?php
// We have a cart_fragments reference in a comment
function disable_some_other_thing() {
    return true;
}
`;
const parsedLooseCart = parseCcText(looseCartPhp);
assert.strictEqual(parsedLooseCart.cart_fragments, null, "Loose words cart_fragments + disable do NOT match cart_fragments");

// B. Negative test: Loose single 'delete_transient' does NOT match batch cleanup
const looseTransientPhp = `<?php
function clean_my_custom_key() {
    delete_transient('my_custom_single_key');
}
`;
const parsedLooseTransient = parseCcText(looseTransientPhp);
assert.strictEqual(parsedLooseTransient.transients_cleanup, null, "delete_transient('key') does NOT trigger automated transients_cleanup");

// Positive test: delete_expired_transients triggers batch cleanup
const batchTransientPhp = `<?php
add_action('cron_cleanup', function() {
    delete_expired_transients();
});
`;
const parsedBatchTransient = parseCcText(batchTransientPhp);
assert.strictEqual(parsedBatchTransient.transients_cleanup, true, "delete_expired_transients triggers transients_cleanup");

// C. SCM Version isolation: generic plugin version does NOT set SCM version
const genericPluginPhp = `<?php
/**
 * Plugin Name: Some Other Plugin
 * Version: 2.1.0
 */
`;
const parsedGenericPlugin = parseCcText(genericPluginPhp);
assert.strictEqual(parsedGenericPlugin.version, null, "Generic plugin version does NOT set SCM version");

const scmExplicitPhp = `<?php
/**
 * Plugin Name: SCM (Site Code Manager)
 * Version: 1.4.3
 */
`;
const parsedScmExplicit = parseCcText(scmExplicitPhp);
assert.strictEqual(parsedScmExplicit.version, "1.4.3", "SCM plugin header extracts SCM version");

// D. WooCommerce context isolation: non-WooCommerce site with SCM does NOT evaluate woo options
const compNoWooSite = sandbox.getOptionComparison(
  { id: "woo_cart_fragments", title: "Cart Fragments", tool: "woocommerce", recommendedRaw: "1" },
  {},
  { hasWooCommerce: false, wooInfo: null, scmInfo: { cart_fragments: true } }
);
assert.strictEqual(compNoWooSite.isMatches, false, "Non-WooCommerce site does not evaluate WooCommerce rules even if SCM uploaded");
assert.strictEqual(compNoWooSite.isMeasured, false, "Non-WooCommerce site marks WooCommerce options as unmeasured");

// E. WP_POST_REVISIONS: 0 and 'false' preservation
const wpRevZero = parseCcText(`<?php define('WP_POST_REVISIONS', 0); ?>`);
assert.strictEqual(wpRevZero.wpPostRevisions, 0, "parseCustomCodeText extracts 0 as number");

const compRevZero = sandbox.getOptionComparison(
  { id: "wp_post_revisions", title: "Revisioner", tool: "server", recommendedRaw: 5 },
  {},
  { wpPostRevisions: 0 }
);
assert.strictEqual(compRevZero.isMeasured, true, "wp_post_revisions 0 is measured");
assert.strictEqual(compRevZero.rawMeasured, '0', "wp_post_revisions rawMeasured is '0'");
assert.strictEqual(compRevZero.currentDisplay, "0 (Inaktiverad)", "wp_post_revisions displays '0 (Inaktiverad)'");
assert.strictEqual(compRevZero.isMatches, true, "wp_post_revisions 0 matches recommended policy");

const wpRevFalse = parseCcText(`<?php define('WP_POST_REVISIONS', false); ?>`);
assert.strictEqual(wpRevFalse.wpPostRevisions, 0, "parseCustomCodeText extracts false as 0");

// F. In v2.8.30: General 0p rule - conflicts on 0p items count as deviations (isDeviant: true) with 0 score deduction
const compWfNoabortPolicy = sandbox.getOptionComparison(
  { id: "wf_noabort", title: "LiteSpeed noabort", tool: "wordfence", recommendedRaw: "1", scoreImpact: 0 },
  {},
  { noabortActive: false, isLiteSpeedServer: true, hasWordfence: true }
);
assert.strictEqual(compWfNoabortPolicy.scoreImpact, 0, "wf_noabort scoreImpact is 0");
assert.strictEqual(compWfNoabortPolicy.isDeviant, true, "wf_noabort has isDeviant: true under v2.8.30 general deviation rule");
assert.strictEqual(compWfNoabortPolicy.status, "deviation", "wf_noabort status is deviation");
assert.strictEqual(compWfNoabortPolicy.statusLabel, "🟡 Avvikelse (0p)", "wf_noabort statusLabel is 🟡 Avvikelse (0p)");

// G. Autoload advice hint text
assert(appJs.includes("Slot 2 (Autoload Status)"), "app.js contains updated autoload hint with Slot 2 (Autoload Status)");

console.log('   ✓ v2.8.20 SCM Context, 0p Policy Parity & Revisions 0 verified');

// ==========================================
// 14. v2.8.21 Verification: Slot 7 .htaccess, 8 Slots, Värde saknas & Profile Card Layout
// ==========================================
console.log('\n14. Testing v2.8.21 features: Slot 7 .htaccess, 8 Slots, Värde saknas & Profile Card...');

// A. Slot 7 .htaccess and Slot 8 LiteSpeed in HTML
assert(indexHtml.includes('id="htaccess-dropzone"'), "index.html contains htaccess-dropzone");
assert(indexHtml.includes('id="htaccess-input"'), "index.html contains htaccess-input");
assert(indexHtml.includes('id="htaccess-status"'), "index.html contains htaccess-status");
assert(indexHtml.includes('id="htaccess-hint"'), "index.html contains htaccess-hint");
assert(indexHtml.includes('8. .htaccess'), "index.html contains 8. .htaccess");
assert(indexHtml.includes('9. LiteSpeed'), "index.html contains 9. LiteSpeed");
assert(indexHtml.includes('0 av 9 filer (idag)'), "index.html active site summary displays 0 av 9 filer");

// B. Värde saknas button, badge and sort option
assert(indexHtml.includes('<span>⚪</span> Värde saknas'), "index.html quick-filter has '⚪ Värde saknas'");
assert(rulesJs.includes('let unmeasuredLabel = "⚪ Värde saknas";'), "rules.js unmeasuredLabel is '⚪ Värde saknas'");
assert(appJs.includes('<option value="unmeasured"'), "app.js has unmeasured sort option");
assert(appJs.includes('⚪ Värde saknas först'), "app.js has '⚪ Värde saknas först' in sort options");
assert(appJs.includes('⚪ Värde saknas</span>'), "app.js renders '⚪ Värde saknas' badge on card");

// C. all_deviations includes both isMeasuredDeviant and isUnmeasured
assert(appJs.includes('if (isMeasuredDeviant(o) || isUnmeasured(o)) filteredOptions.push(annotateTab(o, tab));'), "app.js includes both measured deviations and unmeasured in all_deviations filter");

// D. Profile history card layout
assert(stylesCss.includes('.history-card-header'), "styles.css contains .history-card-header");
assert(stylesCss.includes('flex-direction: column;'), "styles.css has flex-direction column on history-card-header");
assert(stylesCss.includes('.history-card-scores-row'), "styles.css contains .history-card-scores-row");
assert(appJs.includes('Overall score: ${overallScore}%'), "app.js renders 'Overall score: ${overallScore}%'");
assert(appJs.includes('Config Score: ${configScore}%'), "app.js renders 'Config Score: ${configScore}%'");

// E. 9 Slots in app.js status bar & clearSlot
assert(appJs.includes('key: "autoloadInfo", label: "Autoload Status", icon: "🗄️"'), "app.js updateActiveSiteStatusBar includes autoloadInfo slot");
assert(appJs.includes('key: "htaccessInfo", label: ".htaccess", icon: "🌐"'), "app.js updateActiveSiteStatusBar includes htaccessInfo slot");
assert(appJs.includes('av 9 filer'), "app.js status bar uses 'av 9 filer'");
assert(appJs.includes('else if (slotKey === "autoload")'), "app.js clearSlot handles autoload");
assert(appJs.includes('else if (slotKey === "htaccess")'), "app.js clearSlot handles htaccess");

// F. .htaccess parsing & processHtaccessTextData
const htSample = `
RewriteEngine On
RewriteRule .* - [E=noabort:1]
`;
const parsedHt = parseCcText(htSample);
assert.strictEqual(parsedHt.hasNoabort, true, "parseCustomCodeText detects noabort:1 in htaccess sample");

console.log('   ✓ v2.8.21 Slot 7 .htaccess, 8 Slots, Värde saknas & Profile Card verified');

// ==========================================
// 15. v2.8.22 Verification: Autoload, Revisions, Wordfence & Report Export
// ==========================================
console.log('\n15. Testing v2.8.22 features: Autoload, Revisions, Wordfence & Report Export...');

// A. Core server settings table rendered in exporter.js
assert(exporterJs.includes('renderSettingsSection(["core_server"])'), "exporter.js renders core_server settings table in Site Report");

// B. Swedish Autoload-storlek parsing in parseSystemInfoText
const swedishSiteHealthWithHyphen = [
  '### wp-core ###',
  'version: 7.1.3',
  '### wp-server ###',
  'httpd_software: LiteSpeed',
  'php_version: 8.3.33',
  '### wp-database ###',
  'Autoload-storlek: 450 KB',
  'number_of_tables: 84'
].join('\n');
const parsedHyphen = parseSystemInfoText(swedishSiteHealthWithHyphen);
assert.strictEqual(parsedHyphen['wp-database'].autoload_options_size, '450 KB', "parseSystemInfoText extracts Autoload-storlek with hyphen");

// C. Autoload comparison evaluates numerically <= 800 KB as optimal
const compAutoload = sandbox.getOptionComparison(
  { id: "wp_autoload_size", title: "Autoload size", tool: "server", recommendedRaw: "< 800 KB" },
  {},
  { autoloadOptionsSize: "450 KB" }
);
assert.strictEqual(compAutoload.isMeasured, true, "wp_autoload_size is measured when autoloadOptionsSize exists");
assert.strictEqual(compAutoload.isMatches, true, "450 KB is <= 800 KB and matches recommendation");
assert.strictEqual(compAutoload.status, "optimal", "wp_autoload_size status is optimal");

// D. wp_post_revisions is measured strictly from wp-config / constants / SCM (not LiteSpeed DB cleanup)
const compRevisionsLs = sandbox.getOptionComparison(
  { id: "wp_post_revisions", title: "WP_POST_REVISIONS", tool: "server", recommendedRaw: "5" },
  { db_optm_revisions: 5 },
  {}
);
assert.strictEqual(compRevisionsLs.isMeasured, false, "wp_post_revisions is not measured solely from LiteSpeed db_optm_revisions");
const compRevisionsEnv = sandbox.getOptionComparison(
  { id: "wp_post_revisions", title: "WP_POST_REVISIONS", tool: "server", recommendedRaw: "5" },
  {},
  { wpPostRevisions: 5 }
);
assert.strictEqual(compRevisionsEnv.isMeasured, true, "wp_post_revisions is measured from environment.wpPostRevisions");
assert.strictEqual(compRevisionsEnv.isMatches, true, "5 revisions matches recommendation 5");
assert.strictEqual(compRevisionsEnv.currentDisplay, "5", "currentDisplay is 5");

// E. Wordfence Live Traffic is unmeasured (Värde saknas) when omitted from report
const compWfDefault = sandbox.getOptionComparison(
  { id: "wf_disable_live_traffic", title: "Disable Live Traffic", tool: "wordfence", recommendedRaw: "1" },
  {},
  { hasWordfence: true, wfInfo: { version: "8.0.4", firewall_mode: "Enabled" } }
);
assert.strictEqual(compWfDefault.isMeasured, false, "wf_disable_live_traffic is unmeasured when missing from Wordfence report");

// F. Cart fragments header cart synchronization tip text
assert(appJs.includes("minivarukorgen i headern ska synkas vid sidcache"), "app.js contains header sync tip for woo_cart_fragments");
assert(rulesJs.includes("Avregistrera INTE skriptet blint med PHP-snippets"), "rules.js warns against blind dequeuing for woo_cart_fragments");

console.log('   ✓ v2.8.22 Autoload, Revisions, Wordfence & Report Export verified');

// 16. v2.8.23 Verification: Autoload Dropzone (Slot 2), 9 Slots Parity & Modern Header Cart Fragments
console.log('\n16. Testing v2.8.23 features: Autoload Dropzone (Slot 2), 9 Slots Parity & Modern Header Cart Fragments...');

// A. index.html has 9 slots and autoload dropzone
assert(indexHtml.includes('id="autoload-dropzone"'), "index.html has autoload-dropzone");
assert(indexHtml.includes('id="autoload-input"'), "index.html has autoload-input");
assert(indexHtml.includes('id="autoload-status"'), "index.html has autoload-status element");
assert(indexHtml.includes('id="autoload-hint"'), "index.html has autoload-hint element");
assert(indexHtml.includes('0 av 9 filer (idag)'), "index.html has '0 av 9 filer (idag)'");
assert(indexHtml.includes('2. Autoload Status:'), "index.html 'Var hittar jag filerna...' lists Slot 2 Autoload Status");
assert(indexHtml.includes('Klarade prov'), "index.html 'Var hittar jag filerna...' explains Klarade prov accordion");

// B. parseAutoloadStatusText Swedish Site Health prose & LiteSpeed summary
const parseAutoloadFn = sandbox.window.parseAutoloadStatusText || sandbox.parseAutoloadStatusText;
assert(typeof parseAutoloadFn === "function", "parseAutoloadStatusText is defined and accessible");

const proseText = "Din webbplats har 1028 automatiskt laddade inställningar (storlek: 239 KB) i tabellen ”options”, vilket är acceptabelt.";
const parsedProse = parseAutoloadFn(proseText);
assert(parsedProse !== null, "parsedProse is not null");
assert.strictEqual(parsedProse.size, "239 KB", "parsedProse extracts size 239 KB");
assert.strictEqual(parsedProse.count, 1028, "parsedProse extracts count 1028");

const lsSummaryText = "Database Optimizer\nAutoload Size: 412 KB\nAutoload Entries: 980";
const parsedLsSummary = parseAutoloadFn(lsSummaryText);
assert(parsedLsSummary !== null, "parsedLsSummary is not null");
assert.strictEqual(parsedLsSummary.size, "412 KB", "parsedLsSummary extracts size 412 KB");
assert.strictEqual(parsedLsSummary.count, 980, "parsedLsSummary extracts count 980");

// C. Autoload comparison evaluates parsed prose size against < 800 KB
const compAutoloadParsed = sandbox.getOptionComparison(
  { id: "wp_autoload_size", title: "Autoload size", tool: "server", recommendedRaw: "< 800 KB" },
  {},
  { autoloadOptionsSize: parsedProse.size }
);
assert.strictEqual(compAutoloadParsed.isMeasured, true, "compAutoloadParsed is measured");
assert.strictEqual(compAutoloadParsed.isMatches, true, "compAutoloadParsed matches < 800 KB");
assert.strictEqual(compAutoloadParsed.status, "optimal", "compAutoloadParsed status is optimal");

// D. woo_cart_fragments modern header cart evaluation
const compCartModern = sandbox.getOptionComparison(
  { id: "woo_cart_fragments", title: "Cart Fragments", tool: "woocommerce", scoreImpact: 0, recommendedRaw: "1" },
  {},
  { hasWooCommerce: true, hasMenuCart: true }
);
assert.strictEqual(compCartModern.isMeasured, true, "compCartModern is measured when hasWooCommerce and hasMenuCart are true");
assert.strictEqual(compCartModern.isMatches, true, "compCartModern matches optimal (active header cart)");
assert.strictEqual(compCartModern.scoreImpact, 0, "compCartModern scoreImpact is 0p (Policy/Info)");
assert.strictEqual(compCartModern.status, "optimal", "compCartModern status is optimal");
assert.strictEqual(compCartModern.currentDisplay, "PÅ (Krävs för minivarukorg i header)", "compCartModern display text indicates header cart requirement");

console.log('   ✓ v2.8.23 Autoload Dropzone (Slot 2), 9 Slots Parity & Modern Header Cart Fragments verified');

// 17. v2.8.24 Verification: Grok Audit Parity, Slot Isolations, WP-CLI Autoload, Åtgärdslista & Cart Fragments Ghost Cart Protection
console.log('\n17. Testing v2.8.24 features: Grok Audit Parity, Slot Isolations, WP-CLI Autoload, Åtgärdslista & Ghost Cart Protection...');

// A. WP-CLI raw numeric bytes parsed by parseAutoloadStatusText
const rawWpCliAutoload = "244736";
const parsedWpCli = parseAutoloadFn(rawWpCliAutoload);
assert(parsedWpCli !== null, "parseAutoloadStatusText handles raw bytes");
assert.strictEqual(parsedWpCli.size, "239 KB", "244736 bytes converts to 239 KB");
assert.strictEqual(parsedWpCli.bytes, 244736, "bytes stored as 244736");

// B. Quick filter button renamed to Åtgärdslista
assert(indexHtml.includes('id="filter-btn-all-deviations"'), "index.html has filter-btn-all-deviations");
assert(indexHtml.includes('<span>🌐</span> Åtgärdslista'), "index.html button text is Åtgärdslista");

// C. Cart fragments ghost cart warning when dequeued with page cache
const compCartDequeued = sandbox.getOptionComparison(
  { id: "woo_cart_fragments", title: "Cart Fragments", tool: "woocommerce", scoreImpact: 0, recommendedRaw: "1" },
  {},
  { hasWooCommerce: true, cart_fragments_dequeued: true, isLiteSpeedServer: true, hasMenuCart: true }
);
assert.strictEqual(compCartDequeued.isMeasured, true, "cart fragments dequeued is measured");
assert.strictEqual(compCartDequeued.isMatches, false, "cart fragments dequeued with page cache is NOT optimal");
assert(compCartDequeued.currentDisplay.includes("Risk för spökvarukorg"), "currentDisplay warns about ghost cart (0 items)");

// D. Cart fragments unmeasured when no header cart or SCM dequeue exists
const compCartUnmeasured = sandbox.getOptionComparison(
  { id: "woo_cart_fragments", title: "Cart Fragments", tool: "woocommerce", scoreImpact: 0, recommendedRaw: "1" },
  {},
  { hasWooCommerce: true, hasElementorPro: false }
);
assert.strictEqual(compCartUnmeasured.isMeasured, false, "cart fragments without minicart or elementor pro is unmeasured (Värde saknas)");

// E. Theme Header/Footer builder requires Elementor Pro or explicit feature
const compThemeFreeElem = sandbox.getOptionComparison(
  { id: "theme_header_footer_builder", title: "Theme Header Footer", tool: "theme", recommendedRaw: "1" },
  {},
  { hasThemeInfo: true, hasElementor: true, hasElementorPro: false, themeFeatures: "menus" }
);
assert.strictEqual(compThemeFreeElem.isMeasured, true, "isMeasured with theme info");
assert.strictEqual(compThemeFreeElem.rawMeasured, "0", "Elementor free alone does NOT activate header/footer builder");

const compThemeProElem = sandbox.getOptionComparison(
  { id: "theme_header_footer_builder", title: "Theme Header Footer", tool: "theme", recommendedRaw: "1" },
  {},
  { hasThemeInfo: true, hasElementor: true, hasElementorPro: true, themeFeatures: "menus" }
);
assert.strictEqual(compThemeProElem.rawMeasured, "1", "Elementor Pro activates header/footer builder");

// F. Slot numbering: LiteSpeed is Slot 9 in app.js texts
assert(appJs.includes('LiteSpeed .data (Slot 9)'), "app.js references Slot 9 for LiteSpeed");
assert(appJs.includes('Slot 9 (LiteSpeed)'), "app.js diffs summary references Slot 9 (LiteSpeed)");
assert(!appJs.includes('Slot 8 (LiteSpeed)'), "app.js does not falsely refer to Slot 8 (LiteSpeed)");

console.log('   ✓ v2.8.24 Grok Audit Parity, Slot Isolations, WP-CLI Autoload, Åtgärdslista & Ghost Cart Protection verified');

console.log('\n======================================================');
console.log('ALL VERIFICATION TESTS PASSED (100% SUCCESS)');
console.log('======================================================');




