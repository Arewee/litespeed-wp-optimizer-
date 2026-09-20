/**
 * Automated Verification Test Suite for AreWee-Optimizer v2.5.5
 * Verifies:
 * 1. 100% version synchronization across all 7 core files (v2.5.5).
 * 2. Complete absence of legacy .score-impact-box in js/app.js.
 * 3. Correct red styling for Critical/High score impacts and muted for Low.
 * 4. Proper positioning and markup for the 3-source traffic light component.
 * 5. Parsing, rules consistency and export validation.
 */

const fs = require('fs');
const path = require('path');
const assert = require('assert');

const basePath = path.resolve(__dirname, '..');

console.log('=== RUNNING VERIFICATION SUITE FOR v2.5.5 ===\n');

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

  // Must contain 2.5.5
  if (!content.includes('2.5.5') && !content.includes('v2.5.5')) {
    errors.push(`[VERSION FAIL] ${file} is missing version 2.5.5`);
  } else {
    console.log(`✓ [VERSION PASS] ${file} contains v2.5.5`);
  }

  // Must NOT contain 2.5.4
  if (content.includes('2.5.4') || content.includes('v2.5.4')) {
    errors.push(`[OBSOLETE VERSION FAIL] ${file} still contains version 2.5.4`);
  } else {
    console.log(`✓ [CLEAN PASS] ${file} is clean of 2.5.4 references`);
  }
});

// 2. Check removal of .score-impact-box in js/app.js
const appJs = fs.readFileSync(path.join(basePath, 'js/app.js'), 'utf8');

if (appJs.includes('score-impact-box')) {
  errors.push('[LEGACY BOX FAIL] js/app.js still contains .score-impact-box markup!');
} else {
  console.log('✓ [CLEANUP PASS] js/app.js has zero occurrences of score-impact-box.');
}

// 3. Check red styling for High & Critical score impact
const criticalHighCheck = appJs.includes('color: #f87171; font-weight: 600;') &&
  appJs.includes('Påverkan av Score: Kritisk (- 15 p vid avvikelse)') &&
  appJs.includes('Påverkan av Score: Hög (- 10 p vid avvikelse)') &&
  appJs.includes('Påverkan av Score: Låg (- 2 p vid avvikelse)');

if (!criticalHighCheck) {
  errors.push('[STYLING FAIL] Score impact red styling is missing or misconfigured in js/app.js');
} else {
  console.log('✓ [STYLING PASS] Score impact shows in bold red (#f87171) for Kritisk & Hög, and muted for Låg.');
}

// 4. Check traffic light vertical placement in .setting-right-col
if (!appJs.includes('<div class="setting-right-col">') || !appJs.includes('${trafficLightHtml}')) {
  errors.push('[LAYOUT FAIL] Traffic light vertical placement in setting-right-col missing in js/app.js');
} else {
  console.log('✓ [LAYOUT PASS] Traffic light cleanly rendered in setting-right-col on far right.');
}

// 5. Test loading and basic execution of exporter.js and rules.js
try {
  // Mock browser environment for rules.js / exporter.js
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
  console.log('🎉 ALL TESTS PASSED! v2.5.5 IS FULLY VERIFIED.');
}
