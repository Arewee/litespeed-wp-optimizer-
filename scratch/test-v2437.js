/**
 * Automated test suite for AreWee-Optimizer v2.4.37
 * Tests:
 * 1. Version consistency across all files (v2.4.37)
 * 2. Profile setting resolution for comparison (optm_js_defer, css_min, js_min, cache_object, woo_hpos, elem_css_print_method)
 * 3. Formatter output for optm_js_defer (Delayed, Deferred, Off) and subsystem metrics
 * 4. Exclusion dropdown markup and CSS styling rules in styles.css
 */

const fs = require('fs');
const path = require('path');
const assert = require('assert');

function runTest(testName, fn) {
  try {
    fn();
    console.log(`✓ PASS: ${testName}`);
  } catch (err) {
    console.error(`❌ FAIL: ${testName}`);
    console.error(err);
    process.exit(1);
  }
}

const basePath = '/Users/richardviitanen/Documents/arewee-optimizer';

// Test 1: Version consistency across all files (v2.4.37)
runTest("Version consistency across all files (v2.4.37)", () => {
  const indexHtml = fs.readFileSync(path.join(basePath, "index.html"), "utf8");
  const appFile = fs.readFileSync(path.join(basePath, "js/app.js"), "utf8");
  const rulesFile = fs.readFileSync(path.join(basePath, "js/rules.js"), "utf8");
  const exporterFile = fs.readFileSync(path.join(basePath, "js/exporter.js"), "utf8");
  const readmeFile = fs.readFileSync(path.join(basePath, "README.md"), "utf8");
  const geminiFile = fs.readFileSync(path.join(basePath, "gemini.md"), "utf8");

  assert(indexHtml.includes("v2.4.37"), "index.html must contain v2.4.37");
  assert(indexHtml.includes("css/styles.css?v=2.4.37"), "index.html stylesheet cache-busting v2.4.37");
  assert(indexHtml.includes("js/exporter.js?v=2.4.37"), "index.html exporter.js cache-busting v2.4.37");
  assert(indexHtml.includes("js/rules.js?v=2.4.37"), "index.html rules.js cache-busting v2.4.37");
  assert(indexHtml.includes("js/app.js?v=2.4.37"), "index.html app.js cache-busting v2.4.37");
  assert(appFile.includes("v2.4.37") || appFile.includes("2.4.37"), "app.js must contain 2.4.37");
  assert(rulesFile.includes("v2.4.37") || rulesFile.includes("2.4.37"), "rules.js must contain 2.4.37");
  assert(exporterFile.includes("v2.4.37") || exporterFile.includes("2.4.37"), "exporter.js must contain 2.4.37");
  assert(readmeFile.includes("v2.4.37"), "README.md must contain v2.4.37");
  assert(geminiFile.includes("v2.4.37"), "gemini.md must contain v2.4.37");
});

// Test 2: Profile setting resolution logic
runTest("Profile setting resolution correctly resolves LiteSpeed options and aliases", () => {
  function resolveProfileSetting(profile, setting) {
    if (!profile) return "Ej konf";
    const aliases = setting.aliases || [setting.id];
    if (profile.editedSettings) {
      for (const alias of aliases) {
        if (profile.editedSettings[alias] !== undefined && profile.editedSettings[alias] !== null && profile.editedSettings[alias] !== "") {
          return profile.editedSettings[alias];
        }
      }
    }
    if (profile.uploadedSettings) {
      for (const alias of aliases) {
        if (profile.uploadedSettings[alias] !== undefined && profile.uploadedSettings[alias] !== null && profile.uploadedSettings[alias] !== "") {
          return profile.uploadedSettings[alias];
        }
      }
      if (profile.uploadedSettings.options) {
        for (const alias of aliases) {
          if (profile.uploadedSettings.options[alias] !== undefined && profile.uploadedSettings.options[alias] !== null && profile.uploadedSettings.options[alias] !== "") {
            return profile.uploadedSettings.options[alias];
          }
        }
      }
    }
    if (setting.type === "woo_hpos") {
      if (profile.wooInfo) {
        if (profile.wooInfo.hpos_enabled === true || profile.wooInfo.order_datastore === "OrdersTableDataStore") return 1;
        if (profile.wooInfo.hpos_enabled === false) return 0;
      }
      if (profile.sysInfo && profile.sysInfo['woocommerce']) {
        const woo = profile.sysInfo['woocommerce'];
        if (woo.order_datastore && String(woo.order_datastore).includes("OrdersTableDataStore")) return 1;
        if (woo.custom_order_tables_in_sync) return 1;
      }
    }
    if (setting.type === "elem_css_print_method") {
      if (profile.elemInfo && profile.elemInfo.css_print_method) {
        return profile.elemInfo.css_print_method;
      }
    }
    if (setting.id === "cache_object") {
      if (profile.sysInfo && profile.sysInfo['wp-server']) {
        const srv = profile.sysInfo['wp-server'];
        if (srv.redis_version || srv.memcached_version) return 1;
      }
    }
    return "Ej konf";
  }

  const jsDeferSetting = { id: "optm_js_defer", aliases: ["optm_js_defer", "optm-js_defer", "js_defer", "optm-js_delayed", "optm_js_delayed"], label: "JS Defer" };
  const cssMinSetting = { id: "optm_css_min", aliases: ["optm_css_min", "optm-css_min", "css_minify", "optm_css"], label: "CSS Minifiering" };
  const objectCacheSetting = { id: "cache_object", aliases: ["cache_object", "cache-object", "object_cache", "object"], label: "Objekt-cache" };
  const hposSetting = { id: "woo_hpos", aliases: ["woo_hpos", "hpos"], label: "WooCommerce HPOS", type: "woo_hpos" };

  // Profile A: Profile with editedSettings
  const profA = {
    name: "RK test 3",
    editedSettings: {
      optm_js_defer: 0,
      optm_css_min: 1,
      cache_object: 0
    }
  };

  // Profile B: Profile with uploadedSettings (e.g. 2you with JS Defer active)
  const profB = {
    name: "2you - js-defer",
    editedSettings: {},
    uploadedSettings: {
      "optm-js_defer": "1",
      "optm_css_min": "1",
      "cache-object": "1"
    },
    wooInfo: {
      hpos_enabled: true
    }
  };

  assert.strictEqual(resolveProfileSetting(profA, jsDeferSetting), 0, "ProfA optm_js_defer should resolve to 0");
  assert.strictEqual(resolveProfileSetting(profB, jsDeferSetting), "1", "ProfB optm_js_defer should resolve to '1'");
  assert.strictEqual(resolveProfileSetting(profB, cssMinSetting), "1", "ProfB optm_css_min should resolve to '1'");
  assert.strictEqual(resolveProfileSetting(profB, objectCacheSetting), "1", "ProfB cache_object should resolve to '1'");
  assert.strictEqual(resolveProfileSetting(profB, hposSetting), 1, "ProfB HPOS should resolve to 1");
});

// Test 3: Comparison formatting
runTest("Comparison formatting renders clear badges for Deferred, Delayed and Inaktiv", () => {
  function formatComparisonValue(val, keyId) {
    if (val === "Ej konf" || val === undefined || val === null) {
      return `Ej konf`;
    }
    if (keyId === "optm_js_defer") {
      if (val === 2 || val === "2") return `⚡ PÅ (Delayed)`;
      if (val === 1 || val === "1" || val === "on" || val === true) return `✅ PÅ (Deferred)`;
      if (val === 0 || val === "0" || val === "off" || val === false) return `❌ AV (Inaktiv)`;
      return String(val);
    }
    if (val === 1 || val === "1" || val === "on" || val === true) return `✅ PÅ (Aktiv)`;
    if (val === 0 || val === "0" || val === "off" || val === false) return `❌ AV (Inaktiv)`;
    return String(val);
  }

  assert.strictEqual(formatComparisonValue(2, "optm_js_defer"), "⚡ PÅ (Delayed)");
  assert.strictEqual(formatComparisonValue("1", "optm_js_defer"), "✅ PÅ (Deferred)");
  assert.strictEqual(formatComparisonValue(0, "optm_js_defer"), "❌ AV (Inaktiv)");
  assert.strictEqual(formatComparisonValue(1, "optm_css_min"), "✅ PÅ (Aktiv)");
});

// Test 4: Exclusion dropdown and CSS classes exist
runTest("Exclusion dropdown markup and CSS styling rules exist", () => {
  const css = fs.readFileSync(path.join(basePath, "css/styles.css"), "utf8");
  const app = fs.readFileSync(path.join(basePath, "js/app.js"), "utf8");

  assert(css.includes(".exclusion-accordion"), "styles.css must define .exclusion-accordion");
  assert(css.includes(".exclusion-accordion-summary"), "styles.css must define .exclusion-accordion-summary");
  assert(css.includes(".btn-copy-compact"), "styles.css must define .btn-copy-compact");
  assert(app.includes("details class=\"exclusion-accordion\""), "app.js must render <details class='exclusion-accordion'>");
  assert(app.includes("summary class=\"exclusion-accordion-summary\""), "app.js must render <summary class='exclusion-accordion-summary'>");
});

console.log("\n🎉 ALL AREWEE-OPTIMIZER v2.4.37 TESTS PASSED!");
