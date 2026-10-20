// scratch/test-v2841.js - Test suite for v2.8.41
const fs = require('fs');
const path = require('path');
const assert = require('assert');

console.log("=== Testing AreWee-Optimizer v2.8.41 ===");

const rootDir = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(rootDir, 'index.html'), 'utf8');
const rulesJs = fs.readFileSync(path.join(rootDir, 'js', 'rules.js'), 'utf8');
const appJs = fs.readFileSync(path.join(rootDir, 'js', 'app.js'), 'utf8');
const exporterJs = fs.readFileSync(path.join(rootDir, 'js', 'exporter.js'), 'utf8');
const stylesCss = fs.readFileSync(path.join(rootDir, 'css', 'styles.css'), 'utf8');
const readmeMd = fs.readFileSync(path.join(rootDir, 'README.md'), 'utf8');
const geminiMd = fs.readFileSync(path.join(rootDir, 'gemini.md'), 'utf8');

// 1. Version parity across all 7 files
console.log("Checking version parity (v2.8.41)...");
assert(html.includes("v2.8.41"), "index.html missing v2.8.41");
assert(html.includes("app.js?v=2.8.41"), "index.html app.js query missing v2.8.41");
assert(rulesJs.includes("v2.8.41"), "rules.js missing v2.8.41");
assert(appJs.includes("2.8.41"), "app.js missing 2.8.41");
assert(appJs.includes('APP_VERSION = "2.8.41"'), "app.js APP_VERSION missing 2.8.41");
assert(exporterJs.includes("v2.8.41"), "exporter.js missing v2.8.41");
assert(stylesCss.includes("v2.8.41"), "styles.css missing v2.8.41");
assert(readmeMd.includes("v2.8.41"), "README.md missing v2.8.41");
assert(geminiMd.includes("v2.8.41"), "gemini.md missing v2.8.41");

// 2. Card 8 (Server) uses exact WP and PHP configuration directive names
console.log("Checking Card 8 exact directive names in rules.js...");
assert(rulesJs.includes('name: "php_value memory_limit"'), 'rules.js missing php_value memory_limit');
assert(rulesJs.includes('name: "WP_MEMORY_LIMIT"'), 'rules.js missing WP_MEMORY_LIMIT');
assert(rulesJs.includes('name: "php_value upload_max_filesize"'), 'rules.js missing php_value upload_max_filesize');
assert(rulesJs.includes('name: "php_value post_max_size"'), 'rules.js missing php_value post_max_size');
assert(rulesJs.includes('name: "php_value max_execution_time"'), 'rules.js missing php_value max_execution_time');
assert(rulesJs.includes('name: "php_value max_input_vars"'), 'rules.js missing php_value max_input_vars');
assert(rulesJs.includes('name: "OPcache Hit Rate"'), 'rules.js missing OPcache Hit Rate');

// 3. Card 9 (Database) uses actual database name in title, exact WP names, and eliminates repetition/parentheses
console.log("Checking Card 9 in rules.js...");
assert(rulesJs.includes('const dbCardTitle = (dbName && dbName !== "Databas" && dbName !== "Ej inläst") ? `🗄️ ${dbName}` : "🗄️ Databas"'), 'rules.js missing dynamic dbCardTitle');
assert(rulesJs.includes('name: "DB_NAME", state: dbName'), 'rules.js missing DB_NAME');
assert(rulesJs.includes('name: "$table_prefix", state: tblPrefix'), 'rules.js missing $table_prefix');
assert(rulesJs.includes('name: "Uploads / Tillägg", state: `${upSize} / ${plSize}`'), 'rules.js missing Uploads / Tillägg');
assert(!rulesJs.includes('(Prefix: ${tblPrefix})'), 'rules.js should not repeat Prefix in value');

// 4. Check that new cards eliminated parentheses and use slashes
console.log("Checking no parentheses in new card tools in rules.js...");
assert(rulesJs.includes('fetchPriorityState = "PÅ / WP Core 6.3+"'), 'rules.js missing PÅ / WP Core 6.3+');
assert(rulesJs.includes('heroLazyState = "Undantagen ✓ / Korrekt"'), 'rules.js missing Undantagen ✓ / Korrekt');
assert(rulesJs.includes('hposState = environment.hpos_enabled ? (isDualWrite ? "Synk på / Risk" : "PÅ / Ren") : "AV"'), 'rules.js missing clean hposState');
assert(rulesJs.includes('cronState = environment.disableWpCron ? "PÅ / Server" : "AV / Besökare"'), 'rules.js missing clean cronState');
assert(rulesJs.includes('redisState = hasRedis ? "PÅ / Aktiv" : "AV / Saknas"'), 'rules.js missing clean redisState');

// 5. Comparison table alignment in app.js
console.log("Checking comparison table alignment in app.js...");
assert(appJs.includes('{ label: "php_value memory_limit"'), 'app.js comparison missing php_value memory_limit');
assert(appJs.includes('{ label: "WP_MEMORY_LIMIT"'), 'app.js comparison missing WP_MEMORY_LIMIT');
assert(appJs.includes('{ label: "DB_NAME"'), 'app.js comparison missing DB_NAME');
assert(appJs.includes('{ label: "$table_prefix"'), 'app.js comparison missing $table_prefix');
assert(appJs.includes('{ label: "Uploads / Tillägg"'), 'app.js comparison missing Uploads / Tillägg');

console.log("All v2.8.41 tests passed successfully!");
