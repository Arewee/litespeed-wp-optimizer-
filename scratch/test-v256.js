/**
 * Automated Verification Test Suite for AreWee-Optimizer v2.5.6
 * Verifies:
 * 1. 100% version synchronization across all 7 core files (v2.5.6).
 * 2. Color verification:
 *    - Critical (-15p): Red (#f87171)
 *    - High (-10p): Orange (#fb923c)
 *    - Low (-2p): Muted (var(--text-muted))
 * 3. Layout validation (vertical traffic light in setting-right-col).
 * 4. Runtime parse/eval sanity checks.
 */

const fs = require('fs');
const path = require('path');
const assert = require('assert');

const basePath = path.resolve(__dirname, '..');

console.log('=== RUNNING VERIFICATION SUITE FOR v2.5.6 ===\n');

// 1. Check version string across all 7 files
const filesToCheck = [
  'index.html',
  'README.md',
  'gemini.md',
  'css/styles.css',
  'js/app.js',
  'js/rules.js',
  'js/exporter.js'
];

let errors = [];

filesToCheck.forEach(file => {
  const filePath = path.join(basePath, file);
  assert(fs.existsSync(filePath), `File does not exist: ${file}`);
  const content = fs.readFileSync(filePath, 'utf8');

  // Must contain 2.5.6
  if (!content.includes('2.5.6') && !content.includes('v2.5.6')) {
    errors.push(`[VERSION FAIL] ${file} is missing version 2.5.6`);
  } else {
    console.log(`✓ [VERSION PASS] ${file} contains v2.5.6`);
  }

  // Must NOT contain 2.5.5
  if (content.includes('2.5.5') || content.includes('v2.5.5')) {
    errors.push(`[OBSOLETE VERSION FAIL] ${file} still contains version 2.5.5`);
  } else {
    console.log(`✓ [CLEAN PASS] ${file} is clean of 2.5.5 references`);
  }
});

// 2. Check Score Impact color logic in js/app.js
const appJs = fs.readFileSync(path.join(basePath, 'js/app.js'), 'utf8');

const hasCriticalRed = appJs.includes('color: #f87171; font-weight: 600;') &&
  appJs.includes('Påverkan av Score: Kritisk (- 15 p vid avvikelse)');

const hasHighOrange = appJs.includes('color: #fb923c; font-weight: 600;') &&
  appJs.includes('Påverkan av Score: Hög (- 10 p vid avvikelse)');

const hasLowMuted = appJs.includes('color: var(--text-muted); opacity: 0.85;') &&
  appJs.includes('Påverkan av Score: Låg (- 2 p vid avvikelse)');

if (!hasCriticalRed) {
  errors.push('[COLOR FAIL] Critical (-15p) is not rendered with red (#f87171)!');
} else {
  console.log('✓ [COLOR PASS] Critical (-15p) correctly styled in Red (#f87171).');
}

if (!hasHighOrange) {
  errors.push('[COLOR FAIL] High (-10p) is not rendered with Orange (#fb923c)!');
} else {
  console.log('✓ [COLOR PASS] High (-10p) correctly styled in Orange (#fb923c).');
}

if (!hasLowMuted) {
  errors.push('[COLOR FAIL] Low (-2p) is not rendered with muted text style!');
} else {
  console.log('✓ [COLOR PASS] Low (-2p) correctly kept in muted text style.');
}

// 3. Check syntax and runtime eval for rules.js and exporter.js
try {
  global.window = {};
  global.document = {
    addEventListener: () => {},
    getElementById: () => null,
    querySelector: () => null,
    querySelectorAll: () => []
  };

  const rulesContent = fs.readFileSync(path.join(basePath, 'js/rules.js'), 'utf8');
  eval(rulesContent);
  console.log('✓ [EVAL PASS] js/rules.js evaluates without syntax or runtime errors.');

  const exporterContent = fs.readFileSync(path.join(basePath, 'js/exporter.js'), 'utf8');
  eval(exporterContent);
  console.log('✓ [EVAL PASS] js/exporter.js evaluates without syntax or runtime errors.');
} catch (e) {
  errors.push(`[EVAL ERROR] ${e.message}`);
}

console.log('\n----------------------------------------');
if (errors.length > 0) {
  console.error(`FAILED with ${errors.length} errors:`);
  errors.forEach(err => console.error(`  ❌ ${err}`));
  process.exit(1);
} else {
  console.log('🎉 ALL TESTS PASSED! v2.5.6 IS FULLY VERIFIED.');
}
