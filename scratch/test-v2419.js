const fs = require('fs');
const path = require('path');

// Mock browser globals
global.window = {};
global.document = {
  addEventListener: () => {},
  getElementById: () => null
};

// Load rules.js
const rulesCode = fs.readFileSync(path.join(__dirname, '../js/rules.js'), 'utf8');
eval(rulesCode);

console.log("Testing AreWee-Optimizer v2.4.19...");

let passed = 0;
let total = 0;
function assert(cond, msg) {
  total++;
  if (cond) {
    console.log(`  ✓ PASS: ${msg}`);
    passed++;
  } else {
    console.error(`  ✗ FAIL: ${msg}`);
  }
}

// Test 1: Woo Overrides with modern up-to-date versions (not out of date)
{
  const sysInfo = {
    "wp-core": { version: "6.7.1" },
    "wp-active-theme": { name: "Astra", version: "4.8.7" },
    "wp-plugins-active": {
      "woocommerce/woocommerce.php": { version: "9.3.3" }
    }
  };
  const wooInfo = {
    version: "9.3.3",
    overrides: [
      "astra/woocommerce/cart/cart.php version 9.3.3",
      "astra/woocommerce/checkout/form-checkout.php version 9.3.3"
    ]
  };
  const result = window.analyzeSystem(sysInfo, wooInfo, null, null, {}, null, null);
  const templateAlert = result.alerts.find(a => a.id === "alert_outdated_theme_templates");
  assert(!templateAlert, "Clean up-to-date WooCommerce overrides do not trigger false positive template warning");
}

// Test 2: Woo Overrides when Elementor is active (should be suppressed because Elementor Theme Builder overrides templates)
{
  const sysInfo = {
    "wp-core": { version: "6.7.1" },
    "wp-active-theme": { name: "Astra", version: "4.8.7" },
    "wp-plugins-active": {
      "woocommerce/woocommerce.php": { version: "9.3.3" },
      "elementor/elementor.php": { version: "3.24.4" }
    }
  };
  const wooInfo = {
    version: "9.3.3",
    overrides: [
      "astra/woocommerce/cart/cart.php version 7.0.0 is out of date",
      "astra/woocommerce/checkout/form-checkout.php version 7.0.0 is out of date"
    ]
  };
  const elemInfo = {
    version: "3.24.4",
    dom_optimization: true,
    experiments: ["e_dom_optimization"]
  };
  const result = window.analyzeSystem(sysInfo, wooInfo, null, elemInfo, {}, null, null);
  const templateAlert = result.alerts.find(a => a.id === "alert_outdated_theme_templates");
  assert(!templateAlert, "When Elementor is active, theme WooCommerce template alert is suppressed");
}

// Test 3: Woo Overrides when Elementor is NOT active and overrides ARE out of date (should trigger warning)
{
  const sysInfo = {
    "wp-core": { version: "6.7.1" },
    "wp-active-theme": { name: "Astra", version: "4.8.7" },
    "wp-plugins-active": {
      "woocommerce/woocommerce.php": { version: "9.3.3" }
    }
  };
  const wooInfo = {
    version: "9.3.3",
    overrides: [
      "astra/woocommerce/cart/cart.php version 7.0.0 är föråldrad",
      "astra/woocommerce/checkout/form-checkout.php version 7.0.0 is out of date"
    ]
  };
  const result = window.analyzeSystem(sysInfo, wooInfo, null, null, {}, null, null);
  const templateAlert = result.alerts.find(a => a.id === "alert_outdated_theme_templates");
  assert(!!templateAlert, "When Elementor is NOT active and overrides are out of date, warning is correctly triggered");
}

// Test 4: Elementor DOM Optimization detection
{
  const sysInfo = {
    "wp-core": { version: "6.7.1" },
    "wp-plugins-active": {
      "elementor/elementor.php": { version: "3.24.4" }
    }
  };
  const elemInfo = {
    version: "3.24.4",
    dom_optimization: true,
    experiments: ["e_dom_optimization"]
  };
  const result = window.analyzeSystem(sysInfo, null, null, elemInfo, {}, null, null);
  const domAlert = result.alerts.find(a => a.title && a.title.includes("Optimized DOM Output"));
  assert(!domAlert, "Elementor DOM Optimization active = NO warning");
}

console.log(`\nResult: ${passed}/${total} assertions passed.`);
if (passed === total) {
  console.log("ALL UNIT TESTS PASSED SUCCESSFULLY.");
  process.exit(0);
} else {
  process.exit(1);
}
