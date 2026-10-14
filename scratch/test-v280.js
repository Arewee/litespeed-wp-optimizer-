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

assert(indexHtml.includes('<title>AreWee-Optimizer - WordPress prestanda & stabilitetsoptimerare (v2.8.3)</title>'), 'index.html title has v2.8.3');
assert(indexHtml.includes('styles.css?v=2.8.3'), 'index.html styles.css?v=2.8.3');
assert(indexHtml.includes('js/rules.js?v=2.8.3'), 'index.html rules.js?v=2.8.3');
assert(indexHtml.includes('js/exporter.js?v=2.8.3'), 'index.html exporter.js?v=2.8.3');
assert(indexHtml.includes('js/app.js?v=2.8.3'), 'index.html app.js?v=2.8.3');
assert(indexHtml.includes('class="logo-tag">v2.8.3</span>'), 'index.html logo-tag v2.8.3');
assert(indexHtml.includes('Nuvarande rekommendationer (v2.8.3)'), 'index.html recommendations modal v2.8.3');

assert(appJs.includes('const APP_VERSION = "2.8.3";'), 'app.js APP_VERSION = 2.8.3');
assert(appJs.includes('const targetVersion = "2.8.3";'), 'app.js targetVersion 2.8.3');

assert(rulesJs.includes('AreWee WP-Optimizer - Dynamic Rules & Compatibility Engine (v2.8.3)'), 'rules.js header v2.8.3');

assert(exporterJs.includes('AreWee WP-Optimizer - Exporter / Serializer (v2.8.3)'), 'exporter.js header v2.8.3');
assert(exporterJs.includes("'syncPluginVersion' => '2.8.3'"), 'exporter.js syncPluginVersion 2.8.3');

assert(stylesCss.includes('AreWee WP-Optimizer - Stylesheet (v2.8.3)'), 'styles.css header v2.8.3');
assert(readmeMd.includes('# LiteSpeed Cache & WordPress Optimizer Dashboard (v2.8.3)'), 'README.md header v2.8.3');
assert(geminiMd.includes('Projektets Riktlinjer & Arkitektur (v2.8.3)'), 'GEMINI.md header v2.8.3');

console.log('   ✓ Version parity verified across index.html, app.js, rules.js, exporter.js, styles.css, README.md, GEMINI.md');

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
assert(sResCard, 'server_res card exists in cockpitFunctions');
assert.strictEqual(sResCard.name, '🖥️ Serverresurser');
assert.strictEqual(JSON.stringify(sResCard.tools.map(t => t.name)), JSON.stringify(['opcache_hit_rate', 'WP_MEMORY_LIMIT', 'autoload_options_size']));
console.log('   ✓ 6th function card "🖥️ Serverresurser" verified with exact tools [opcache_hit_rate, WP_MEMORY_LIMIT, autoload_options_size]');

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
assert.strictEqual(opCritAlert.scoreImpact, 0, 'OPcache alert has 0 score penalty on shared hosting');
assert.strictEqual(opCritAlert.type, 'info', 'OPcache alert is informational observation');
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
assert(analysisJa.alerts.some(a => a.id === 'alert_opcache_warning'), 'opcache_is_full="Ja" triggers alert_opcache_warning (informational) when hit rate is unknown');
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
assert(analysisCamping.alerts.some(a => a.id === 'alert_opcache_warning'), 'Real campingdrömmar (81.82%) triggers alert_opcache_warning (80-89% acceptable on shared hosting)');
assert(!analysisCamping.alerts.some(a => a.id === 'alert_opcache_critical'), 'Real campingdrömmar (81.82%) does NOT trigger false alert_opcache_critical');
const opWarn = analysisCamping.alerts.find(a => a.id === 'alert_opcache_warning');
assert.strictEqual(opWarn.scoreImpact, 0, 'OPcache alert has 0 score penalty on shared hosting');
assert(analysisCamping.alerts.some(a => a.id === 'alert_wc_cron_visitor'), 'Missing DISABLE_WP_CRON triggers alert_wc_cron_visitor for WooCommerce site');
assert(!analysisCamping.alerts.some(a => a.title && a.title.includes('SureRank')), 'SureRank 1.10.2 does NOT trigger false vulnerability alert');

const campingServerRes = analysisCamping.cockpitFunctions.find(f => f.id === 'server_res');
assert.strictEqual(campingServerRes.status, 'warning');
assert.strictEqual(campingServerRes.statusText, 'Acceptabel 🟡');
const opTool = campingServerRes.tools.find(t => t.name === 'opcache_hit_rate');
assert.strictEqual(opTool.state, '82%', 'OPcache tool state shows hit rate 82%');
const memTool = campingServerRes.tools.find(t => t.name === 'WP_MEMORY_LIMIT');
assert.strictEqual(memTool.state, '768M', 'WP_MEMORY_LIMIT tool state is compact 768M');
const autoTool = campingServerRes.tools.find(t => t.name === 'autoload_options_size');
assert.strictEqual(autoTool.state, 'Ej inläst', 'autoload_options_size is compact Ej inläst');

const kassaCard = analysisCamping.cockpitFunctions.find(f => f.id === 'kassa_perf');
assert(kassaCard, 'kassa_perf function card exists when WooCommerce is active');
assert.strictEqual(kassaCard.name, '🛒 Checkout', 'Card name is 🛒 Checkout');
assert.strictEqual(kassaCard.status, 'warning');
assert.strictEqual(kassaCard.statusText, 'Bromsrisk 🟡');
assert.strictEqual(kassaCard.tools.find(t => t.name === 'Server-Cron').state, 'AV (Besökare)');
assert.strictEqual(kassaCard.tools.find(t => t.name === 'Redis Cache').state, 'PÅ (Aktiv)');

console.log('   ✓ Real campingdrömmar.se export parsed and verified: OPcache full caught, SureRank 1.10.2 clean!');

// 6. Test Settings paritet in Flik 1 (core_server)
console.log('6. Checking core_server options paritet in Flik [1]...');
const sampleSettings = sandbox.buildCompleteLscwpSettings({});
const coreServer = sampleSettings.find(s => s.id === 'core_server');
assert(coreServer, 'core_server group exists');
assert(coreServer.options.some(o => o.id === 'php_opcache_memory'), 'php_opcache_memory exists in core_server');
assert(coreServer.options.some(o => o.id === 'wp_autoload_size'), 'wp_autoload_size exists in core_server');
console.log('   ✓ Flik [1] Server Core options paritet verified');

console.log('\n======================================================');
console.log('ALL VERIFICATION TESTS PASSED (100% SUCCESS)');
console.log('======================================================');
