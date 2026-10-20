// scratch/test-v2840.js - Test suite for v2.8.40
const fs = require('fs');
const path = require('path');
const assert = require('assert');

console.log("=== Testing AreWee-Optimizer v2.8.40 ===");

const rootDir = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(rootDir, 'index.html'), 'utf8');
const rulesJs = fs.readFileSync(path.join(rootDir, 'js', 'rules.js'), 'utf8');
const appJs = fs.readFileSync(path.join(rootDir, 'js', 'app.js'), 'utf8');
const exporterJs = fs.readFileSync(path.join(rootDir, 'js', 'exporter.js'), 'utf8');
const stylesCss = fs.readFileSync(path.join(rootDir, 'css', 'styles.css'), 'utf8');
const readmeMd = fs.readFileSync(path.join(rootDir, 'README.md'), 'utf8');
const geminiMd = fs.readFileSync(path.join(rootDir, 'gemini.md'), 'utf8');

// 1. Version parity across all 7 files
console.log("Checking version parity (v2.8.40)...");
assert(html.includes("v2.8.40"), "index.html missing v2.8.40");
assert(html.includes("app.js?v=2.8.40"), "index.html app.js query missing v2.8.40");
assert(rulesJs.includes("v2.8.40"), "rules.js missing v2.8.40");
assert(appJs.includes("2.8.40"), "app.js missing 2.8.40");
assert(appJs.includes('APP_VERSION = "2.8.40"'), "app.js APP_VERSION missing 2.8.40");
assert(exporterJs.includes("v2.8.40"), "exporter.js missing v2.8.40");
assert(stylesCss.includes("v2.8.40"), "styles.css missing v2.8.40");
assert(readmeMd.includes("v2.8.40"), "README.md missing v2.8.40");
assert(geminiMd.includes("v2.8.40"), "gemini.md missing v2.8.40");

// 2. Test sanitizeDiskSizeString behavior
console.log("Checking sanitizeDiskSizeString in rules.js...");
const vm = require('vm');
const sandbox = { console };
vm.createContext(sandbox);

// Extract sanitizeDiskSizeString function from rulesJs
const sanitizeMatch = rulesJs.match(/function sanitizeDiskSizeString[\s\S]*?\n\}/);
assert(sanitizeMatch, "sanitizeDiskSizeString not found in rules.js");
vm.runInContext(sanitizeMatch[0], sandbox);

const sanitizeDiskSizeString = sandbox.sanitizeDiskSizeString;
assert.strictEqual(sanitizeDiskSizeString("15,10 MB (15835136 bytes)"), "15 MB", "15,10 MB should be 15 MB");
assert.strictEqual(sanitizeDiskSizeString("455,31 MB"), "455 MB", "455,31 MB should be 455 MB");
assert.strictEqual(sanitizeDiskSizeString("120 MB"), "120 MB", "120 MB should remain 120 MB");
assert.strictEqual(sanitizeDiskSizeString("4,12 GB (4423876608 bytes)"), "4,12 GB", "4,12 GB should retain 2 decimals");
assert.strictEqual(sanitizeDiskSizeString("4.12 GB"), "4,12 GB", "4.12 GB should be formatted as 4,12 GB");
assert.strictEqual(sanitizeDiskSizeString("239 KB (244736 bytes)"), "239 KB", "239 KB should strip bytes");
assert.strictEqual(sanitizeDiskSizeString("1,4 MB (1468006 bytes)", true), "1,4 MB", "Autoload with isAutoload=true should retain 1,4 MB");

// 3. Card 9 (Database) verification
console.log("Checking Card 9 tools in rules.js...");
assert(rulesJs.includes('name: "Databas & Prefix"'), 'Card 9 must have "Databas & Prefix"');
assert(rulesJs.includes('name: "Databasstorlek", state: `${dbSize}`'), 'Card 9 Databasstorlek must be clean');
assert(!rulesJs.includes('name: "Databas & Motor"'), 'Card 9 should not have "Databas & Motor"');

// 4. Name change "Webbplatsprofiler" -> "Profiler"
console.log("Checking name change in index.html and app.js...");
assert(html.includes("<span>📋</span> Sparade profiler"), "index.html must say Sparade profiler");
assert(!html.includes("Sparade webbplatsprofiler"), "index.html must not contain Sparade webbplatsprofiler");
assert(appJs.includes('Ange ett namn för att spara denna profil i historiken:'), "app.js prompt should say profil");

// 5. Profile comparison includes Server and Database sections
console.log("Checking comparison table in app.js...");
assert(appJs.includes("🖥️ Serverresurser & Miljö"), "app.js comparison missing Server section");
assert(appJs.includes("🗄️ Databas & Lagring"), "app.js comparison missing Database section");
assert(appJs.includes("function getProfileTelemetry"), "app.js missing getProfileTelemetry helper");

// 6. Profile auto-sanitization of plugin count
console.log("Checking plugin count auto-sanitizing in renderHistoryLibrary in app.js...");
assert(appJs.includes('sysInfo["wp-plugins-active-count"]'), "renderHistoryLibrary should check wp-plugins-active-count");

console.log("All v2.8.40 tests passed successfully!");
