/**
 * Comprehensive Automated Test Suite for AreWee-Optimizer v2.6.4
 */

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const baseDir = '/Users/richardviitanen/Documents/arewee-optimizer';

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (!condition) {
    console.error(`❌ FAIL: ${message}`);
    failed++;
    throw new Error(message);
  } else {
    console.log(`✅ PASS: ${message}`);
    passed++;
  }
}

function runTest(name, fn) {
  console.log(`\n--- Test: ${name} ---`);
  try {
    fn();
  } catch (e) {
    console.error(`Test '${name}' threw an exception:`, e.message);
  }
}

console.log('🚀 Starting AreWee-Optimizer v2.6.4 Test Suite...\n');

// 1. Version Synchronization Verification across 7 files
runTest('Version Synchronization across 7 Core Files (v2.6.4)', () => {
  const indexHtml = fs.readFileSync(path.join(baseDir, 'index.html'), 'utf8');
  const cssStyles = fs.readFileSync(path.join(baseDir, 'css/styles.css'), 'utf8');
  const appJs = fs.readFileSync(path.join(baseDir, 'js/app.js'), 'utf8');
  const rulesJs = fs.readFileSync(path.join(baseDir, 'js/rules.js'), 'utf8');
  const exporterJs = fs.readFileSync(path.join(baseDir, 'js/exporter.js'), 'utf8');
  const readmeMd = fs.readFileSync(path.join(baseDir, 'README.md'), 'utf8');
  const geminiMd = fs.readFileSync(path.join(baseDir, 'gemini.md'), 'utf8');

  assert(indexHtml.includes('v2.6.4'), 'index.html contains v2.6.4');
  assert(indexHtml.includes('css/styles.css?v=2.6.4'), 'index.html has stylesheet v=2.6.4');
  assert(indexHtml.includes('js/exporter.js?v=2.6.4'), 'index.html has exporter.js?v=2.6.4');
  assert(indexHtml.includes('js/rules.js?v=2.6.4'), 'index.html has rules.js?v=2.6.4');
  assert(indexHtml.includes('js/app.js?v=2.6.4'), 'index.html has app.js?v=2.6.4');

  assert(cssStyles.includes('v2.6.4'), 'css/styles.css contains v2.6.4');
  assert(appJs.includes('v2.6.4') || appJs.includes('2.6.4'), 'js/app.js contains 2.6.4');
  assert(rulesJs.includes('v2.6.4') || rulesJs.includes('2.6.4'), 'js/rules.js contains 2.6.4');
  assert(exporterJs.includes('v2.6.4') || exporterJs.includes('2.6.4'), 'js/exporter.js contains 2.6.4');
  assert(readmeMd.includes('v2.6.4'), 'README.md contains v2.6.4');
  assert(geminiMd.includes('v2.6.4'), 'gemini.md contains v2.6.4');

  // Check no legacy versions in production core files
  const coreFiles = [
    { name: 'index.html', content: indexHtml },
    { name: 'css/styles.css', content: cssStyles },
    { name: 'js/app.js', content: appJs },
    { name: 'js/rules.js', content: rulesJs },
    { name: 'js/exporter.js', content: exporterJs },
    { name: 'README.md', content: readmeMd },
    { name: 'gemini.md', content: geminiMd }
  ];

  const legacyVersions = ['2.6.3', '2.6.2', '2.6.1', '2.6.0', '2.4.32'];
  coreFiles.forEach(f => {
    legacyVersions.forEach(ver => {
      assert(!f.content.includes(ver), `${f.name} has zero occurrences of ${ver}`);
    });
  });
});

const domListeners = [];
function createMockElement() {
  return {
    innerHTML: '',
    textContent: '',
    value: '',
    style: {},
    classList: { add: () => {}, remove: () => {}, contains: () => false },
    addEventListener: () => {},
    querySelector: () => createMockElement(),
    querySelectorAll: () => [],
    appendChild: () => {},
    removeChild: () => {}
  };
}

const sandbox = {
  console: console,
  addEventListener: () => {},
  removeEventListener: () => {},
  window: {},
  document: {
    addEventListener: (event, fn) => {
      if (event === 'DOMContentLoaded') domListeners.push(fn);
    },
    getElementById: () => createMockElement(),
    querySelector: () => createMockElement(),
    querySelectorAll: () => [],
    createElement: () => createMockElement()
  },
  navigator: {
    clipboard: {
      writeText: () => Promise.resolve()
    }
  },
  sessionStorage: {
    data: {},
    getItem(k) { return this.data[k] || null; },
    setItem(k, v) { this.data[k] = String(v); },
    removeItem(k) { delete this.data[k]; }
  },
  localStorage: {
    data: {},
    getItem(k) { return this.data[k] || null; },
    setItem(k, v) { this.data[k] = String(v); },
    removeItem(k) { delete this.data[k]; }
  },
  URL: global.URL,
  Blob: global.Blob || class {},
  ResizeObserver: class { observe() {} unobserve() {} disconnect() {} }
};
sandbox.window = sandbox;
vm.createContext(sandbox);

// 2. Syntax & Module Evaluation
runTest('JS Syntax & Sandbox Loading', () => {
  const exporterCode = fs.readFileSync(path.join(baseDir, 'js/exporter.js'), 'utf8');
  const rulesCode = fs.readFileSync(path.join(baseDir, 'js/rules.js'), 'utf8');
  const appCode = fs.readFileSync(path.join(baseDir, 'js/app.js'), 'utf8');

  vm.runInContext(exporterCode, sandbox);
  vm.runInContext(rulesCode, sandbox);
  vm.runInContext(appCode, sandbox);

  // Trigger DOMContentLoaded callbacks to initialize modules
  domListeners.forEach(fn => {
    try { fn(); } catch (e) { console.error("DOMContentLoaded error:", e); }
  });

  assert(typeof sandbox.generateSyncPluginPhp === 'function', 'generateSyncPluginPhp is defined');
  assert(typeof sandbox.translateKeysToInternal === 'function', 'translateKeysToInternal is defined');
  assert(typeof sandbox.getOptionComparison === 'function', 'getOptionComparison is defined');
  assert(typeof sandbox.buildCompleteLscwpSettings === 'function', 'buildCompleteLscwpSettings is defined');
});

// 3. P1: Test Nested Object Preservation vs Textarea Flattening in translateKeysToInternal
runTest('P1: Complex Nested Objects Preserved & Textareas Flattened', () => {
  const rawParsedSettings = {
    // Known textarea key with array of values
    "media-lazy_img_exc": {
      "0": "logo",
      "1": "header-img",
      "2": "hero-banner"
    },
    "optm-js_exc": ["wp-content/themes/mytheme", "jquery.js"],
    // Complex nested object that should NOT be flattened to a newline string
    "cdn_mapping": {
      "url": "https://cdn.example.com",
      "inc_img": 1,
      "inc_css": 1,
      "inc_js": 1
    },
    "crawler_sitemap": {
      "custom_url": "https://example.com/sitemap.xml"
    },
    "cache-priv": "1"
  };

  const translated = sandbox.translateKeysToInternal(rawParsedSettings);
  
  // Textareas should be flattened to newline strings
  assert(typeof translated.media_lazy_exc === 'string', 'media_lazy_exc is converted to string');
  assert(translated.media_lazy_exc.includes('logo'), 'media_lazy_exc contains logo');
  assert(translated.media_lazy_exc.includes('header-img'), 'media_lazy_exc contains header-img');
  assert(translated.media_lazy_exc.includes('hero-banner'), 'media_lazy_exc contains hero-banner');
  assert(!translated.media_lazy_exc.includes('[object Object]'), 'media_lazy_exc has no [object Object]');

  assert(typeof translated.js_exclude === 'string', 'js_exclude is converted to string');
  assert(translated.js_exclude.includes('jquery.js'), 'js_exclude contains jquery.js');

  // Complex objects must remain objects
  assert(typeof translated.cdn_mapping === 'object' && !Array.isArray(translated.cdn_mapping), 'cdn_mapping remains an object');
  assert(translated.cdn_mapping.url === 'https://cdn.example.com', 'cdn_mapping.url is intact');
  assert(typeof translated.crawler_sitemap === 'object', 'crawler_sitemap remains an object');
});

// 4. P1/P2: Test Exact Ternary Comparison for JS Defer (0=AV, 1=Deferred, 2=Delayed)
runTest('P1/P2: Exact Ternary Comparison for optm_js_defer', () => {
  const opt = {
    id: 'optm_js_defer',
    recommendedRaw: 1, // Recommended is Deferred (1)
    tool: 'litespeed',
    criticalLevel: 'high'
  };

  // Case A: User has Defer = 2 (Delayed), recommended = 1 (Deferred) -> Must be DEVIATION
  const compDelayed = sandbox.getOptionComparison(opt, { optm_js_defer: 2 }, {});
  assert(compDelayed.isMatches === false, 'Defer=2 does NOT match recommended=1');
  assert(compDelayed.isDeviant === true, 'Defer=2 is flagged as deviant');
  assert(compDelayed.currentDisplay === 'PÅ (Delayed)', 'currentDisplay reflects Delayed');
  assert(compDelayed.recommendedDisplay === 'PÅ (Deferred)', 'recommendedDisplay reflects Deferred');

  // Case B: User has Defer = 1 (Deferred), recommended = 1 (Deferred) -> Must be OPTIMAL
  const compDeferred = sandbox.getOptionComparison(opt, { optm_js_defer: 1 }, {});
  assert(compDeferred.isMatches === true, 'Defer=1 matches recommended=1');
  assert(compDeferred.isDeviant === false, 'Defer=1 is NOT deviant');

  // Case C: User has Defer = 0 (OFF), recommended = 1 (Deferred) -> Must be DEVIATION
  const compOff = sandbox.getOptionComparison(opt, { optm_js_defer: 0 }, {});
  assert(compOff.isMatches === false, 'Defer=0 does NOT match recommended=1');
  assert(compOff.isDeviant === true, 'Defer=0 is flagged as deviant');
});

// 5. P2: Test SCM Parser for raw style and script tags
runTest('P2: SCM detects echo <style and <script tags', () => {
  const snippetWithEchoStyle = `
    add_action('wp_head', function() {
      echo '<style>.custom-banner { display: block; }</style>';
    });
  `;
  const parsed1 = sandbox.parseCustomCodeText(snippetWithEchoStyle);
  assert(parsed1.hasRawScriptHooks === true, 'SCM detects echo <style in wp_head');

  const snippetWithEchoDoubleQuote = `
    add_action('wp_footer', function() {
      echo "<style>body { margin: 0; }</style>";
    });
  `;
  const parsed2 = sandbox.parseCustomCodeText(snippetWithEchoDoubleQuote);
  assert(parsed2.hasRawScriptHooks === true, 'SCM detects echo "<style in wp_footer');
});

// 6. P2: Test WooCommerce drop_uri requires checkout, cart, AND my-account
runTest('P2: WooCommerce drop_uri requires cart, checkout, AND my-account', () => {
  const opt = {
    id: 'drop_uri',
    recommendedRaw: '/cart/\n/checkout/\n/my-account/',
    tool: 'litespeed',
    criticalLevel: 'critical'
  };

  const wooEnv = { hasWooCommerce: true };

  // Missing my-account
  const compMissingAccount = sandbox.getOptionComparison(opt, { drop_uri: '/cart/\n/checkout/' }, wooEnv);
  assert(compMissingAccount.isMatches === false, 'Missing my-account is a deviation for Woo');
  assert(compMissingAccount.currentDisplay.includes('mitt-konto'), 'currentDisplay indicates mitt-konto is missing');

  // All 3 present
  const compAllPresent = sandbox.getOptionComparison(opt, { drop_uri: '/cart/\n/checkout/\n/my-account/' }, wooEnv);
  assert(compAllPresent.isMatches === true, 'All 3 exclusions present is optimal');
});

// 7. P0: REST API Plugin & Exporter v2.6.4 Parity
runTest('P0: Exporter Sync Plugin & Route Parity v2.6.4', () => {
  const pluginPhp = sandbox.generateSyncPluginPhp();
  assert(pluginPhp.includes('* Version: 2.6.4'), 'Plugin PHP has Version: 2.6.4');
  assert(pluginPhp.includes("register_rest_route('arewee-optimizer/v1', '/diagnostics'"), 'Plugin registers arewee-optimizer/v1 route');
  assert(pluginPhp.includes("rest_url('arewee-optimizer/v1/diagnostics')"), 'Plugin points to arewee-optimizer/v1 endpoint');

  const autoOptimizer = sandbox.generateAutoOptimizerSnippet({
    elem_dom_optimization: 1,
    elem_css_print_method: 'external',
    woo_hpos: 1
  });
  assert(autoOptimizer.includes('Version: 2.6.4'), 'AutoOptimizer snippet has Version: 2.6.4');

  const secondOpinionMd = sandbox.generateSecondOpinionMarkdown({
    sysInfo: {
      "wp-core": { site_url: "https://example.com", version: "6.8.0" },
      "wp-server": { httpd_software: "LiteSpeed", php_version: "8.3", php_memory_limit: "512M" }
    },
    uploadedSettings: { cache: "1" },
    analysisResults: {
      environment: { lscwpVersion: '7.9.1', hasWooCommerce: true, hasElementor: true },
      recommendations: [],
      alerts: []
    }
  });
  assert(secondOpinionMd.includes('v2.6.4'), 'Second Opinion contains v2.6.4');

  const batchMd = sandbox.generateBatchSecondOpinionMarkdown([
    { siteName: 'Test Site', wpVersion: '6.8.0', phpVersion: '8.3', healthScore: 98 }
  ]);
  assert(batchMd.includes('v2.6.4'), 'Batch Second Opinion contains v2.6.4');
});

console.log(`\n========================================`);
console.log(`Test Results: ${passed} Passed, ${failed} Failed`);
console.log(`========================================\n`);

if (failed > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
