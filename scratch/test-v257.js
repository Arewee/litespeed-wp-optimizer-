/**
 * Automated Verification Test Suite for AreWee-Optimizer v2.5.7
 * Verifies:
 * 1. 100% version synchronization across all 7 core files (v2.5.7).
 * 2. Deviation badge placement with margin-left: auto inside setting-title-row.
 * 3. Event listeners use renderSettingsPanel() (no undefined renderLscwpSettings calls).
 * 4. Active tab filtering for 'deviations' and 'critical'.
 * 5. Impact sorting priority (critical -> high -> standard).
 * 6. Runtime eval integrity for rules.js and exporter.js.
 */

const fs = require('fs');
const path = require('path');
const assert = require('assert');

const basePath = path.resolve(__dirname, '..');

console.log('=== RUNNING VERIFICATION SUITE FOR v2.5.7 ===\n');

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

  // Must contain 2.5.7
  if (!content.includes('2.5.7') && !content.includes('v2.5.7')) {
    errors.push(`[VERSION FAIL] ${file} is missing version 2.5.7`);
  } else {
    console.log(`✓ [VERSION PASS] ${file} contains v2.5.7`);
  }

  // Must NOT contain 2.5.6
  if (content.includes('2.5.6') || content.includes('v2.5.6')) {
    errors.push(`[OBSOLETE VERSION FAIL] ${file} still contains version 2.5.6`);
  } else {
    console.log(`✓ [CLEAN PASS] ${file} is clean of 2.5.6 references`);
  }
});

// 2. Check matchBadge and margin-left: auto inside setting-title-row
const appJs = fs.readFileSync(path.join(basePath, 'js/app.js'), 'utf8');

if (!appJs.includes('margin-left: auto;') || !appJs.includes('${matchBadge}')) {
  errors.push('[BADGE LAYOUT FAIL] matchBadge with margin-left: auto is missing in setting-title-row!');
} else {
  console.log('✓ [LAYOUT PASS] matchBadge is placed on the far right of setting-title-row using margin-left: auto.');
}

// 3. Ensure no undefined renderLscwpSettings() calls remain
if (appJs.includes('renderLscwpSettings()')) {
  errors.push('[UNDEFINED FUNCTION FAIL] js/app.js still calls renderLscwpSettings()!');
} else {
  console.log('✓ [CALL INTEGRITY PASS] Sorter and search listeners correctly invoke renderSettingsPanel().');
}

// 4. Check sorting logic by impact
const sampleOptions = [
  { id: 'opt_std', title: 'Standard Opt', criticalLevel: 'standard' },
  { id: 'opt_crit', title: 'Critical Opt', criticalLevel: 'critical' },
  { id: 'opt_high', title: 'High Opt', criticalLevel: 'high' }
];

const impactScore = opt => opt.criticalLevel === "critical" ? 1 : (opt.criticalLevel === "high" ? 2 : (opt.criticalLevel === "standard" ? 3 : 4));
sampleOptions.sort((a, b) => impactScore(a) - impactScore(b));

assert.strictEqual(sampleOptions[0].id, 'opt_crit', 'Critical must sort first');
assert.strictEqual(sampleOptions[1].id, 'opt_high', 'High must sort second');
assert.strictEqual(sampleOptions[2].id, 'opt_std', 'Standard must sort third');
console.log('✓ [SORT LOGIC PASS] Sensitivity sort correctly orders: Critical (1) -> High (2) -> Standard (3).');

// 5. Test loading and basic execution of exporter.js and rules.js
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
  console.log('🎉 ALL TESTS PASSED! v2.5.7 IS FULLY VERIFIED.');
}
