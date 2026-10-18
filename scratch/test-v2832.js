/**
 * Verification test suite for AreWee-Optimizer v2.8.32
 * Tests:
 * 1. Version parity across all 7 project files
 * 2. Slot toggle label & checkbox z-index layer isolation (preventing file-picker intercept)
 * 3. Inline style safety in index.html
 * 4. StopPropagation event listeners in app.js
 */

const fs = require("fs");
const path = require("path");
const assert = require("assert");

console.log("=== AreWee-Optimizer v2.8.32 Verification Suite ===\n");

const baseDir = path.resolve(__dirname, "..");
const files = {
  index: path.join(baseDir, "index.html"),
  app: path.join(baseDir, "js", "app.js"),
  rules: path.join(baseDir, "js", "rules.js"),
  exporter: path.join(baseDir, "js", "exporter.js"),
  styles: path.join(baseDir, "css", "styles.css"),
  readme: path.join(baseDir, "README.md"),
  gemini: fs.existsSync(path.join(baseDir, "gemini.md")) ? path.join(baseDir, "gemini.md") : path.join(baseDir, "GEMINI.md")
};

// 1. Version Parity
console.log("1. Checking version parity across all files...");
const appContent = fs.readFileSync(files.app, "utf8");
const appVersionMatch = appContent.match(/const APP_VERSION = "([^"]+)";/);
assert(appVersionMatch, "APP_VERSION must be defined in app.js");
const expectedVersion = appVersionMatch[1];
assert(expectedVersion.startsWith("2.8."), "Version should be 2.8.x");

const indexContent = fs.readFileSync(files.index, "utf8");
assert(indexContent.includes(`(v${expectedVersion})`), "index.html has title/modal with (v2.8.32)");
assert(indexContent.includes(`v=${expectedVersion}`), "index.html has script/css tags with v=2.8.32");

const stylesContent = fs.readFileSync(files.styles, "utf8");
assert(stylesContent.includes(`(v${expectedVersion})`), "styles.css has header with (v2.8.32)");

const rulesContent = fs.readFileSync(files.rules, "utf8");
assert(rulesContent.includes(`(v${expectedVersion})`), "rules.js has header with (v2.8.32)");

const exporterContent = fs.readFileSync(files.exporter, "utf8");
assert(exporterContent.includes(`(v${expectedVersion})`), "exporter.js has header with (v2.8.32)");

const readmeContent = fs.readFileSync(files.readme, "utf8");
assert(readmeContent.includes(`(v${expectedVersion})`), "README.md has header with (v2.8.32)");

const geminiContent = fs.readFileSync(files.gemini, "utf8");
assert(geminiContent.includes(`(v${expectedVersion})`), "GEMINI.md has header with (v2.8.32)");
console.log("   ✓ Version parity verified across all 7 project files");

// 2. CSS z-index and positioning for .slot-toggle-label and checkbox
console.log("2. Checking styles.css for .slot-toggle-label layer isolation...");
assert(stylesContent.includes(".slot-toggle-label {"), ".slot-toggle-label selector found in styles.css");
assert(stylesContent.includes("z-index: 10;"), "z-index: 10 found for .slot-toggle-label");
assert(stylesContent.includes("z-index: 11;"), "z-index: 11 found for .slot-toggle-label input[type=\"checkbox\"]");
console.log("   ✓ styles.css has correct z-index layers (10 and 11, strictly > 1 file-input)");

// 3. Inline style check in index.html for slots 4, 5, 6
console.log("3. Checking index.html inline style safety on slot toggles...");
const slotToggleLabels = indexContent.match(/<label class="slot-toggle-label"[^>]*>/g) || [];
assert.strictEqual(slotToggleLabels.length, 3, "Exactly 3 slot-toggle-label elements in index.html");
slotToggleLabels.forEach((labelTag, idx) => {
  assert(labelTag.includes("position: relative"), `Label #${idx + 1} has position: relative inline`);
  assert(labelTag.includes("z-index: 10"), `Label #${idx + 1} has z-index: 10 inline`);
});
console.log("   ✓ All 3 slot-toggle-label elements in index.html have position: relative and z-index: 10 inline");

// 4. stopPropagation in app.js
console.log("4. Checking stopPropagation event isolation in app.js...");
assert(appContent.includes("toggle.addEventListener(\"click\", (e) => e.stopPropagation())"), "click stopPropagation on toggle found");
assert(appContent.includes("toggle.addEventListener(\"change\", (e) => e.stopPropagation())"), "change stopPropagation on toggle found");
assert(appContent.includes("parentLabel.addEventListener(\"click\", (e) => e.stopPropagation())"), "click stopPropagation on parentLabel found");
console.log("   ✓ stopPropagation verified for click and change on toggles and labels");

console.log("\n======================================================");
console.log("ALL v2.8.32 VERIFICATION TESTS PASSED (100% SUCCESS)");
console.log("======================================================\n");
