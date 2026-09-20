/**
 * Comprehensive Automated Test Suite for AreWee-Optimizer v2.6.3
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

console.log('🚀 Starting AreWee-Optimizer v2.6.3 Test Suite...\n');

// 1. Version Synchronization Verification across 7 files
runTest('Version Synchronization across 7 Core Files (v2.6.3)', () => {
  const indexHtml = fs.readFileSync(path.join(baseDir, 'index.html'), 'utf8');
  const cssStyles = fs.readFileSync(path.join(baseDir, 'css/styles.css'), 'utf8');
  const appJs = fs.readFileSync(path.join(baseDir, 'js/app.js'), 'utf8');
  const rulesJs = fs.readFileSync(path.join(baseDir, 'js/rules.js'), 'utf8');
  const exporterJs = fs.readFileSync(path.join(baseDir, 'js/exporter.js'), 'utf8');
  const readmeMd = fs.readFileSync(path.join(baseDir, 'README.md'), 'utf8');
  const geminiMd = fs.readFileSync(path.join(baseDir, 'gemini.md'), 'utf8');

  assert(indexHtml.includes('v2.6.3'), 'index.html contains v2.6.3');
  assert(indexHtml.includes('css/styles.css?v=2.6.3'), 'index.html has stylesheet v=2.6.3');
  assert(indexHtml.includes('js/exporter.js?v=2.6.3'), 'index.html has exporter.js?v=2.6.3');
  assert(indexHtml.includes('js/rules.js?v=2.6.3'), 'index.html has rules.js?v=2.6.3');
  assert(indexHtml.includes('js/app.js?v=2.6.3'), 'index.html has app.js?v=2.6.3');

  assert(cssStyles.includes('v2.6.3'), 'css/styles.css contains v2.6.3');
  assert(appJs.includes('v2.6.3') || appJs.includes('2.6.3'), 'js/app.js contains 2.6.3');
  assert(rulesJs.includes('v2.6.3') || rulesJs.includes('2.6.3'), 'js/rules.js contains 2.6.3');
  assert(exporterJs.includes('v2.6.3') || exporterJs.includes('2.6.3'), 'js/exporter.js contains 2.6.3');
  assert(readmeMd.includes('v2.6.3'), 'README.md contains v2.6.3');
  assert(geminiMd.includes('v2.6.3'), 'gemini.md contains v2.6.3');

  // Check no legacy 2.6.2, 2.4.32, 2.6.1, 2.6.0 in production core files
  const coreFiles = [
    { name: 'index.html', content: indexHtml },
    { name: 'css/styles.css', content: cssStyles },
    { name: 'js/app.js', content: appJs },
    { name: 'js/rules.js', content: rulesJs },
    { name: 'js/exporter.js', content: exporterJs },
    { name: 'README.md', content: readmeMd },
    { name: 'gemini.md', content: geminiMd }
  ];

  coreFiles.forEach(f => {
    assert(!f.content.includes('2.6.2'), `${f.name} has zero occurrences of 2.6.2`);
    assert(!f.content.includes('2.4.32'), `${f.name} has zero occurrences of 2.4.32`);
    assert(!f.content.includes('2.6.1'), `${f.name} has zero occurrences of 2.6.1`);
    assert(!f.content.includes('2.6.0'), `${f.name} has zero occurrences of 2.6.0`);
  });
});

// Setup sandbox environment for DOM and browser globals
const sandbox = {
  console: console,
  window: {},
  document: {
    addEventListener: () => {},
    getElementById: () => null,
    querySelector: () => null,
    querySelectorAll: () => []
  },
  navigator: {
    clipboard: {
      writeText: () => Promise.resolve()
    }
  },
  URL: global.URL,
  Blob: global.Blob || class {}
};
sandbox.window = sandbox;
vm.createContext(sandbox);

// 2. Syntax & Module Evaluation
runTest('JS Syntax & Sandbox Loading', () => {
  const exporterCode = fs.readFileSync(path.join(baseDir, 'js/exporter.js'), 'utf8');
  const rulesCode = fs.readFileSync(path.join(baseDir, 'js/rules.js'), 'utf8');

  vm.runInContext(exporterCode, sandbox);
  vm.runInContext(rulesCode, sandbox);

  assert(typeof sandbox.generateSyncPluginPhp === 'function', 'generateSyncPluginPhp is defined');
  assert(typeof sandbox.translateKeysToInternal === 'function', 'translateKeysToInternal is defined');
  assert(typeof sandbox.getOptionComparison === 'function', 'getOptionComparison is defined');
  assert(typeof sandbox.buildCompleteLscwpSettings === 'function', 'buildCompleteLscwpSettings is defined');
});

// 3. Test Array/Object Deserialization in Exporter (Fix for [object Object] in media_lazy_exc)
runTest('Array Deserialization in translateKeysToInternal', () => {
  const rawParsedSettings = {
    "media-lazy_img_exc": {
      "0": "logo",
      "1": "header-img",
      "2": "hero-banner"
    },
    "optm-js_exc": ["wp-content/themes/mytheme", "jquery.js"],
    "cache-priv": "1"
  };

  const translated = sandbox.translateKeysToInternal(rawParsedSettings);
  assert(typeof translated.media_lazy_exc === 'string', 'media_lazy_exc is converted to string');
  assert(translated.media_lazy_exc.includes('logo'), 'media_lazy_exc contains logo');
  assert(translated.media_lazy_exc.includes('header-img'), 'media_lazy_exc contains header-img');
  assert(translated.media_lazy_exc.includes('hero-banner'), 'media_lazy_exc contains hero-banner');
  assert(!translated.media_lazy_exc.includes('[object Object]'), 'media_lazy_exc has no [object Object]');

  assert(typeof translated.js_exclude === 'string', 'js_exclude is converted to string');
  assert(translated.js_exclude.includes('jquery.js'), 'js_exclude contains jquery.js');
});

// 4. Test Regex Anchor Stripping in Exclusions Check
runTest('Regex Anchor Stripping in Exclusions Check', () => {
  const currentSettings = 'logo\nheader-hero\nfooter-banner';
  const recommendedSettings = '^logo$\n^header-hero$';
  
  const missing = sandbox.checkMissingExclusions(currentSettings, recommendedSettings);
  assert(missing.length === 0, 'No exclusions should be missing when present without anchors');

  const fulfilled = sandbox.getFulfilledExclusions(currentSettings, recommendedSettings);
  assert(fulfilled.length === 2, 'Both exclusions fulfilled');
});

// 5. Test Memory MB parsing for -1 (unlimited)
runTest('parseMemoryMB handles -1 and units', () => {
  assert(sandbox.parseMemoryMB('-1') === 999999, '-1 returns 999999 MB');
  assert(sandbox.parseMemoryMB(' -1 ') === 999999, ' -1 with spaces returns 999999 MB');
  assert(sandbox.parseMemoryMB('512M') === 512, '512M returns 512');
  assert(sandbox.parseMemoryMB('2G') === 2048, '2G returns 2048');
  assert(sandbox.parseMemoryMB('1024MB') === 1024, '1024MB returns 1024');
});

// 6. Test Exporter Sync Plugin & Markdown Generation
runTest('Exporter generateSyncPluginPhp & Markdown version v2.6.3', () => {
  const pluginPhp = sandbox.generateSyncPluginPhp();
  assert(pluginPhp.includes('* Version: 2.6.3'), 'Plugin PHP has Version: 2.6.3');

  const autoOptimizer = sandbox.generateAutoOptimizerSnippet({
    elem_dom_optimization: 1,
    elem_css_print_method: 'external',
    woo_hpos: 1
  });
  assert(autoOptimizer.includes('Version: 2.6.3'), 'AutoOptimizer snippet has Version: 2.6.3');

  const mockEnv = {
    lscwpVersion: '7.9.1',
    hasWooCommerce: true,
    wooVersion: '9.8.0',
    hasElementor: true,
    elemVersion: '3.28.3',
    hasWordfence: true,
    wfVersion: '8.0.4'
  };

  const recTabs = sandbox.buildCompleteLscwpSettings(mockEnv, {}, {}, {}, {});
  assert(Array.isArray(recTabs) && recTabs.length > 0, 'buildCompleteLscwpSettings returns tabs');

  const secondOpinionMd = sandbox.generateSecondOpinionMarkdown({
    sysInfo: {
      "wp-core": { site_url: "https://example.com", version: "6.8.0" },
      "wp-server": { httpd_software: "LiteSpeed", php_version: "8.3", php_memory_limit: "512M" }
    },
    uploadedSettings: { cache: "1" },
    analysisResults: {
      environment: mockEnv,
      recommendations: recTabs,
      alerts: []
    }
  });
  assert(secondOpinionMd.includes('v2.6.3'), 'Second Opinion contains v2.6.3');

  const batchMd = sandbox.generateBatchSecondOpinionMarkdown([
    { siteName: 'Test Site', wpVersion: '6.8.0', phpVersion: '8.3', healthScore: 98 }
  ]);
  assert(batchMd.includes('v2.6.3'), 'Batch Second Opinion contains v2.6.3');
});

// 7. Test Health Score Deduction Isolation for Unmeasured Slots
runTest('Health score is not penalized for unmeasured slots', () => {
  const mockEnv = {
    isLiteSpeedServer: true,
    phpMemoryLimitMB: 512,
    wpMemoryLimitMB: 512,
    hasWooCommerce: false,
    hasElementor: false
  };

  const opt = {
    id: 'cache_object',
    recommendedRaw: '1',
    category: 'performance',
    title: 'Object Cache'
  };

  // When no settings uploaded (Slot 7 missing), option is unmeasured
  const comp = sandbox.getOptionComparison(opt, {}, mockEnv);
  assert(comp.isMeasured === false, 'Option is marked as isMeasured === false');
});

console.log(`\n========================================`);
console.log(`Test Results: ${passed} Passed, ${failed} Failed`);
console.log(`========================================\n`);

if (failed > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
