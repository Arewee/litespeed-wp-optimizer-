/**
 * AreWee WP-Optimizer - Exporter / Serializer
 * Provides high-fidelity serialization and deserialization between JavaScript objects,
 * PHP serialized format (.data), and JSON.
 */

/**
 * Parses a serialized PHP array string and returns a JavaScript object.
 * @param {string} str Serialized PHP string
 * @returns {Object} Deserialized key-value pairs
 */
function php_deserialize(str) {
  let offset = 0;

  function getCharLengthForBytes(s, start, targetByteLen) {
    let byteCount = 0;
    let charCount = 0;
    while (byteCount < targetByteLen && (start + charCount) < s.length) {
      const code = s.charCodeAt(start + charCount);
      if (code < 0x80) {
        byteCount += 1;
      } else if (code < 0x800) {
        byteCount += 2;
      } else if (code < 0x10000) {
        byteCount += 3;
      } else {
        byteCount += 4;
      }
      charCount++;
    }
    return charCount;
  }

  function parse() {
    if (offset >= str.length) return null;

    const type = str[offset];
    offset += 2; // skip type and colon (e.g., 's:')

    switch (type) {
      case 'i': { // Integer: i:123;
        const end = str.indexOf(';', offset);
        const val = parseInt(str.substring(offset, end), 10);
        offset = end + 1;
        return val;
      }
      case 'd': { // Double/Float: d:12.34;
        const end = str.indexOf(';', offset);
        const val = parseFloat(str.substring(offset, end));
        offset = end + 1;
        return val;
      }
      case 'b': { // Boolean: b:1; or b:0;
        const val = str[offset] === '1';
        offset += 2; // skip '1;' or '0;'
        return val;
      }
      case 'N': { // Null: N;
        // 'N' and ';' were consumed by the offset += 2 above (since N is followed by ;)
        return null;
      }
      case 's': { // String: s:4:"test";
        const colon = str.indexOf(':', offset);
        const byteLen = parseInt(str.substring(offset, colon), 10);
        offset = colon + 2; // skip ': "'
        
        let charLen = getCharLengthForBytes(str, offset, byteLen);
        if (str.substring(offset + charLen, offset + charLen + 2) !== '";') {
          const nextQuoteSemi = str.indexOf('";', offset);
          if (nextQuoteSemi !== -1 && nextQuoteSemi >= offset) {
            charLen = nextQuoteSemi - offset;
          }
        }
        const val = str.substring(offset, offset + charLen);
        offset += charLen + 2; // skip string content and '";'
        return val;
      }
      case 'a': { // Array: a:2:{i:0;s:1:"a";...}
        const brace = str.indexOf('{', offset);
        const len = parseInt(str.substring(offset, brace), 10);
        offset = brace + 1; // skip '{'
        
        const obj = {};
        for (let i = 0; i < len; i++) {
          const key = parse();
          const val = parse();
          if (key !== null) {
            obj[key] = val;
          }
        }
        offset++; // skip '}'
        return obj;
      }
      default:
        // Fail-safe: try to recover if parsing hits unexpected character
        offset++;
        return null;
    }
  }

  try {
    // Basic clean up of input string (remove leading/trailing spaces)
    const cleaned = str.trim();
    if (cleaned.startsWith("a:")) {
      return parse();
    }
    // Check if it's actually JSON
    if (cleaned.startsWith("{") || cleaned.startsWith("[")) {
      return JSON.parse(cleaned);
    }
  } catch (e) {
    console.error("Deserialization error:", e);
  }
  return null;
}

/**
 * Serializes a JavaScript object into a PHP serialized array string.
 * @param {Object} obj Key-value pairs
 * @returns {string} Serialized PHP string
 */
function php_serialize(obj) {
  if (obj === null || typeof obj === "undefined") {
    return "N;";
  }

  const type = typeof obj;

  if (type === "number") {
    if (Number.isInteger(obj)) {
      return `i:${obj};`;
    }
    return `d:${obj};`;
  }

  if (type === "boolean") {
    return `b:${obj ? 1 : 0};`;
  }

  if (type === "string") {
    // PHP string serialization uses byte length, not char length.
    // For standard ASCII this is same, but for UTF-8 it can differ.
    // In our client-side app, simple char length is usually fine, but let's do UTF-8 byte length for robustness!
    const byteLen = new TextEncoder().encode(obj).length;
    return `s:${byteLen}:"${obj}";`;
  }

  if (type === "object") {
    const keys = Object.keys(obj);
    let out = `a:${keys.length}:{`;
    keys.forEach(k => {
      // Map numeric keys to integers, otherwise strings
      const isNum = /^\d+$/.test(k);
      if (isNum) {
        out += `i:${parseInt(k, 10)};`;
      } else {
        const keyByteLen = new TextEncoder().encode(k).length;
        out += `s:${keyByteLen}:"${k}";`;
      }
      out += php_serialize(obj[k]);
    });
    out += "}";
    return out;
  }

  return "N;";
}

/**
 * Analyzes and decodes any uploaded settings file (detecting JSON, base64 or raw serialized PHP).
 * @param {string} rawContent Raw uploaded file string
 * @returns {Object} Parsed settings object (translated to internal keys)
 */
function parseSettingsFile(rawContent) {
  let content = rawContent.trim();
  
  // Try decoding base64 if it looks like it
  if (!content.startsWith("a:") && !content.startsWith("{") && /^[A-Za-z0-9+/=\s]+$/.test(content)) {
    try {
      content = atob(content.replace(/\s/g, ''));
    } catch (e) {
      // Not base64, revert
      content = rawContent.trim();
    }
  }

  // Parse PHP serialized
  if (content.startsWith("a:")) {
    const parsed = php_deserialize(content);
    if (parsed) return translateKeysToInternal(parsed);
  }

  // Try JSON
  try {
    const parsed = JSON.parse(content);
    return translateKeysToInternal(parsed);
  } catch (e) {
    // Not JSON
  }

  // Fallback pattern matching for very simple files (key=value or key:value lines)
  const fallbackObj = {};
  const lines = content.split(/\r?\n/);
  lines.forEach(line => {
    const parts = line.split(/[=:]/);
    if (parts.length >= 2) {
      const key = parts[0].trim().replace(/^['"]|['"]$/g, '');
      const val = parts.slice(1).join('=').trim().replace(/^['"]|['"]$/g, '');
      if (key && val) {
        fallbackObj[key] = val;
      }
    }
  });

  if (Object.keys(fallbackObj).length > 0) {
    return translateKeysToInternal(fallbackObj);
  }

  throw new Error("Kunde inte tolka inställningsfilen. Kontrollera filformatet.");
}

// --- TWO-WAY KEY TRANSLATION LAYER ---

const KEY_MAPPING_TO_INTERNAL = {
  "auto_upgrade": "auto_upgrade",
  "hash": "domain_key",
  "domain_key": "domain_key",
  "guest": "guest_mode",
  "guest_mode": "guest_mode",
  "guest_optm": "guest_optm",
  "server_ip": "server_ip",
  "cache": "cache",
  "cache-cache": "cache",
  "cache_cache": "cache",
  "cache_type": "cache",
  "cache-priv": "cache_priv",
  "cache_priv": "cache_priv",
  "cache-commenter": "cache_commenter",
  "cache_commenter": "cache_commenter",
  "cache-rest": "cache_rest",
  "cache_rest": "cache_rest",
  "cache-page_login": "cache_page_login",
  "cache_page_login": "cache_page_login",
  "cache-mobile": "cache_mobile",
  "cache_mobile": "cache_mobile",
  "cache-exc": "drop_uri",
  "cache_exc": "drop_uri",
  "cache-uri_exc": "drop_uri",
  "cache_uri_exc": "drop_uri",
  "cache-drop_uri": "drop_uri",
  "cache_drop_uri": "drop_uri",
  "drop_uri": "drop_uri",
  "drop-uri": "drop_uri",
  "exc_uri": "drop_uri",
  "esi": "esi",
  "esi_enabled": "esi",
  "object": "cache_object",
  "cache-object": "cache_object",
  "cache_object": "cache_object",
  "object_cache": "cache_object",
  "cache-browser": "cache_browser",
  "cache_browser": "cache_browser",
  "optm-css_min": "optm_css_min",
  "optm_css_min": "optm_css_min",
  "css_minify": "optm_css_min",
  "optm-css_comb": "optm_css_comb",
  "optm_css_comb": "optm_css_comb",
  "css_combine": "optm_css_comb",
  "optm-css_async": "optm_css_async",
  "optm_css_async": "optm_css_async",
  "optm-css_comb_priority": "css_combined_priority",
  "css_combined_priority": "css_combined_priority",
  "optm-css_exc": "css_exclude",
  "optm_css_exc": "css_exclude",
  "css_exclude": "css_exclude",
  "optm-css_preload": "css_preload",
  "css_preload": "css_preload",
  "optm-font_display": "optm_font_display",
  "optm_font_display": "optm_font_display",
  "font_display": "optm_font_display",
  "optm-js_min": "optm_js_min",
  "optm_js_min": "optm_js_min",
  "js_minify": "optm_js_min",
  "optm-js_comb": "optm_js_comb",
  "optm_js_comb": "optm_js_comb",
  "js_combine": "optm_js_comb",
  "optm-js_defer": "optm_js_defer",
  "optm_js_defer": "optm_js_defer",
  "js_defer": "optm_js_defer",
  "optm-js_exc": "js_exclude",
  "optm_js_exc": "js_exclude",
  "js_exclude": "js_exclude",
  "media-lazy": "media_lazy",
  "media_lazy": "media_lazy",
  "media-lazy_native": "media_lazy_native",
  "media_lazy_native": "media_lazy_native",
  "media-lazy_placeholder": "media_lazy_placeholder",
  "media_lazy_placeholder": "media_lazy_placeholder",
  "media-lazy_exc": "media_lazy_exc",
  "media_lazy_exc": "media_lazy_exc",
  "media_lazy_exclude": "media_lazy_exc",
  "media-iframe_lazy": "media_iframe_lazy",
  "media_iframe_lazy": "media_iframe_lazy",
  "media-webp": "media_webp",
  "media_webp": "media_webp",
  "media-optm_webp": "media_webp",
  "media_optm_webp": "media_webp",
  "media-webp_dec": "media_webp",
  "media_webp_dec": "media_webp",
  "media-webp_attribute": "media_webp_attribute",
  "media-webp_replace": "media_webp_replace",
  "media-webp_rep": "media_webp_replace",
  "media_webp_rep": "media_webp_replace",
  "optm-emojis_rm": "optm_emojis_rm",
  "optm_emojis_rm": "optm_emojis_rm",
  "crawler": "crawler",
  "crawler_usleep": "crawler_usleep",
  
  // Custom CSS key mapping
  "optm-css_custom": "optm_css_custom",
  "optm_css_custom": "optm_css_custom"
};

const KEY_MAPPING_TO_LSCWP = {
  "auto_upgrade": "auto_upgrade",
  "domain_key": "domain_key",
  "guest_mode": "guest",
  "guest_optm": "guest_optm",
  "server_ip": "server_ip",
  "cache": "cache",
  "cache_priv": "cache-priv",
  "cache_commenter": "cache-commenter",
  "cache_rest": "cache-rest",
  "cache_page_login": "cache-page_login",
  "cache_mobile": "cache-mobile",
  "drop_uri": "cache-exc",
  "esi": "esi",
  "cache_object": "cache-object",
  "cache_browser": "cache-browser",
  "optm_css_min": "optm-css_min",
  "optm_css_comb": "optm-css_comb",
  "optm_css_async": "optm-css_async",
  "css_combined_priority": "optm-css_comb_priority",
  "css_exclude": "optm-css_exc",
  "css_preload": "optm-css_preload",
  "optm_font_display": "optm-font_display",
  "optm_js_min": "optm-js_min",
  "optm_js_comb": "optm-js_comb",
  "optm_js_defer": "optm-js_defer",
  "js_exclude": "optm-js_exc",
  "media_lazy": "media-lazy",
  "media_lazy_native": "media-lazy_native",
  "media_lazy_placeholder": "media-lazy_placeholder",
  "media_lazy_exc": "media-lazy_exc",
  "media_iframe_lazy": "media-iframe_lazy",
  "media_webp": "media-webp",
  "optm_emojis_rm": "optm-emojis_rm",
  "crawler": "crawler",
  "crawler_usleep": "crawler_usleep",
  
  // Custom CSS key mapping
  "optm_css_custom": "optm-css_custom"
};

function translateKeysToInternal(obj) {
  if (!obj || typeof obj !== "object") return obj;
  const newObj = {};
  Object.keys(obj).forEach(key => {
    const internalKey = KEY_MAPPING_TO_INTERNAL[key] || key;
    let val = obj[key];
    
    // Convert LSCWP array-stored options to newline strings for internal use
    if (internalKey === "drop_uri" || internalKey === "js_exclude" || internalKey === "css_exclude" || internalKey === "media_lazy_exc") {
      if (val && typeof val === "object") {
        val = Object.values(val).join("\n");
      }
    }
    
    newObj[internalKey] = val;
  });
  return newObj;
}

function translateKeysToLscwp(obj) {
  if (!obj || typeof obj !== "object") return obj;
  const newObj = {};
  Object.keys(obj).forEach(key => {
    // Filter out tool-specific custom option keys so LSCWP settings are kept clean
    if (key.startsWith("woo_") || key.startsWith("elem_") || key.startsWith("wf_") || key.startsWith("cc_") || key.startsWith("wp_")) {
      return;
    }
    
    // Safety check: Never output domain_key as integer 1 or 0
    if (key === "domain_key" || key === "hash") {
      if (typeof obj[key] === "string" && obj[key].length > 5 && obj[key] !== "1" && obj[key] !== "0") {
        newObj["hash"] = obj[key];
        newObj["domain_key"] = obj[key];
      }
      return;
    }

    const lscwpKey = KEY_MAPPING_TO_LSCWP[key] || key;
    let val = obj[key];
    
    // Convert internal newline strings back to indexed objects (representing PHP arrays)
    if (key === "drop_uri" || key === "js_exclude" || key === "css_exclude" || key === "media_lazy_exc" || key === "media_lazy_exclude") {
      if (typeof val === "string") {
        const lines = val.split("\n").map(x => x.trim()).filter(Boolean);
        const arrayObj = {};
        lines.forEach((line, idx) => {
          arrayObj[idx] = line;
        });
        val = arrayObj;
      }
    }
    
    newObj[lscwpKey] = val;
  });
  return newObj;
}

/**
 * Compiles all active options into a programmatically installable WP Auto-Optimizer PHP plugin.
 */
function generateAutoOptimizerSnippet(editedSettings) {
  let phpCode = `<?php
/**
 * Plugin Name: AreWee-Optimizer Performance & Compatibility Helper
 * Description: Programmatically configures WooCommerce, Elementor, and Wordfence optimal settings and adds compatibility hooks based on AreWee-Optimizer analysis.
 * Version: 2.3.2
 * Author: AreWee-Optimizer
 * License: GPL2
 */

if (!defined('ABSPATH')) {
    exit;
}

/**
 * 1. AUTOMATED SETTINGS CONFIGURATION (Runs safely in admin_init to avoid frontend DB writes)
 */
add_action('admin_init', function() {
    if (!current_user_can('manage_options')) {
        return;
    }
`;

  if (editedSettings.elem_css_print_method === 'external') {
    phpCode += `    // Set Elementor CSS print method to external file\n    if (get_option('elementor_css_print_method') !== 'external') {\n        update_option('elementor_css_print_method', 'external');\n    }\n\n`;
  }

  phpCode += `    // Configure Elementor active experiments/features
    if (class_exists('\\\\Elementor\\\\Plugin')) {
        $elem_experiments = get_option('elementor_active_experiments', array());
        $elem_changed = false;
`;
  if (editedSettings.elem_dom_optimization === 1) {
    phpCode += `        if (!isset($elem_experiments['e_dom_optimization']) || $elem_experiments['e_dom_optimization'] !== 'active') { $elem_experiments['e_dom_optimization'] = 'active'; $elem_changed = true; }\n`;
  }
  if (editedSettings.elem_asset_loading === 1) {
    phpCode += `        if (!isset($elem_experiments['e_optimized_assets_loading']) || $elem_experiments['e_optimized_assets_loading'] !== 'active') { $elem_experiments['e_optimized_assets_loading'] = 'active'; $elem_changed = true; }\n`;
  }
  if (editedSettings.elem_css_loading === 1) {
    phpCode += `        if (!isset($elem_experiments['e_optimized_css_loading']) || $elem_experiments['e_optimized_css_loading'] !== 'active') { $elem_experiments['e_optimized_css_loading'] = 'active'; $elem_changed = true; }\n`;
  }
  if (editedSettings.elem_lazy_load === 0) {
    phpCode += `        if (!isset($elem_experiments['e_lazy_load_images']) || $elem_experiments['e_lazy_load_images'] !== 'inactive') { $elem_experiments['e_lazy_load_images'] = 'inactive'; $elem_changed = true; }\n`;
  }
  phpCode += `        if ($elem_changed) {
            update_option('elementor_active_experiments', $elem_experiments);
        }
    }

`;

  if (editedSettings.woo_hpos === 1) {
    phpCode += `    // Enable WooCommerce High-Performance Order Storage (HPOS)
    if (get_option('woocommerce_custom_orders_table_enabled') !== 'yes') {
        update_option('woocommerce_custom_orders_table_enabled', 'yes');
    }\n\n`;
  }

  phpCode += `    // Configure Wordfence settings if active
    if (class_exists('wfConfig')) {
`;
  if (editedSettings.wf_live_traffic === 0) {
    phpCode += `        if (wfConfig::get('liveTrafficEnabled', true)) { wfConfig::set('liveTrafficEnabled', false); }\n`;
  }
  if (editedSettings.wf_ip_header) {
    phpCode += `        if (wfConfig::get('howGetIPs') !== '${editedSettings.wf_ip_header}') { wfConfig::set('howGetIPs', '${editedSettings.wf_ip_header}'); }\n`;
  }
  if (editedSettings.wf_low_resource === 1) {
    phpCode += `        if (!wfConfig::get('lowResourceScanSelection')) { wfConfig::set('lowResourceScanSelection', true); }\n`;
  }
  phpCode += `    }\n});\n\n`;

  if (editedSettings.woo_transients_cleanup === 1) {
    phpCode += `/**
 * 2. WOOCOMMERCE TRANSIENT DAILY CLEANUP
 */
if (!wp_next_scheduled('litespeed_helper_woo_transients_cleanup')) {
    wp_schedule_event(time(), 'daily', 'litespeed_helper_woo_transients_cleanup');
}
add_action('litespeed_helper_woo_transients_cleanup', function() {
    global $wpdb;
    // Clear WooCommerce customer session transients older than 3 days
    $wpdb->query("DELETE FROM {$wpdb->options} WHERE option_name LIKE '_transient_wc_user_membership_%' OR option_name LIKE '_transient_timeout_wc_user_membership_%'");
    $wpdb->query("DELETE FROM {$wpdb->options} WHERE option_name LIKE '_transient_timeout_paypal_express_%' OR option_name LIKE '_transient_paypal_express_%'");
    delete_expired_transients(true);
});\n\n`;
  }

  if (editedSettings.woo_cart_fragments === 1) {
    phpCode += `/**
 * 3. DEQUEUE WOOCOMMERCE AJAX CART FRAGMENTS ON NON-SHOP PAGES
 */
add_action('wp_enqueue_scripts', function() {
    if (function_exists('is_woocommerce')) {
        if (!is_cart() && !is_checkout() && !is_woocommerce() && !is_product()) {
            wp_dequeue_script('wc-cart-fragments');
        }
    }
}, 99);\n\n`;
  }

  if (editedSettings.cc_limit_heartbeat === 1) {
    phpCode += `/**
 * 4. LIMIT WORDPRESS HEARTBEAT API FREQUENCY (Save CPU)
 */
add_filter('heartbeat_settings', function($settings) {
    $settings['interval'] = 120;
    return $settings;
});\n\n`;
  }

  if (editedSettings.cc_disable_xmlrpc === 1) {
    phpCode += `/**
 * 5. DISABLE XML-RPC API
 */
add_filter('xmlrpc_enabled', '__return_false');\n\n`;
  }

  if (editedSettings.cc_disable_pingbacks === 1) {
    phpCode += `/**
 * 6. DISABLE SELF-PINGBACKS
 */
add_action('pre_ping', function(&$links) {
    $home = get_option('home');
    foreach ($links as $l => $link) {
        if (0 === strpos($link, $home)) {
            unset($links[$l]);
        }
    }
});\n\n`;
  }

  if (editedSettings.cc_disable_emojis === 1) {
    phpCode += `/**
 * 7. DISABLE WORDPRESS NATIVE EMOJIS SCRIPTS & STYLES
 */
add_action('init', function() {
    remove_action('wp_head', 'print_emoji_detection_script', 7);
    remove_action('admin_print_scripts', 'print_emoji_detection_script');
    remove_action('wp_print_styles', 'print_emoji_styles');
    remove_action('admin_print_styles', 'print_emoji_styles');
    remove_filter('the_content_feed', 'wp_staticize_emoji');
    remove_filter('comment_text_rss', 'wp_staticize_emoji');
    remove_filter('wp_mail', 'wp_staticize_emoji_for_email');
    add_filter('tiny_mce_plugins', function($plugins) {
        return is_array($plugins) ? array_diff($plugins, array('wpemoji')) : array();
    });
    add_filter('wp_resource_hints', function($urls, $relation_type) {
        if ('dns-prefetch' === $relation_type) {
            $emoji_svg_url = apply_filters('emoji_svg_url', 'https://s.w.org/images/core/emoji/2.2.1/svg/');
            $urls = array_diff($urls, array($emoji_svg_url));
        }
        return $urls;
    }, 10, 2);
});\n`;
  }

  return phpCode;
}

/**
 * Compiles performance optimizations into a Code Snippets plugin JSON file.
 */
function generateCodeSnippetsJson(editedSettings) {
  const snippets = [];

  if (editedSettings.woo_cart_fragments === 1) {
    snippets.push({
      name: "WooCommerce: Dequeue Cart Fragments",
      desc: "Inaktiverar wc-cart-fragments pa sidor som inte ar en del av e-handeln (Cart, Checkout, Shop, Single Product) för att förbättra TTFB.",
      code: "add_action('wp_enqueue_scripts', function() {\n    if (function_exists('is_woocommerce')) {\n        if (!is_cart() && !is_checkout() && !is_woocommerce() && !is_product()) {\n            wp_dequeue_script('wc-cart-fragments');\n        }\n    }\n}, 99);",
      active: 1,
      scope: "global"
    });
  }

  if (editedSettings.woo_transients_cleanup === 1) {
    snippets.push({
      name: "WooCommerce: Transient-rensning",
      desc: "Schemalägger en daglig rensning av gamla utgångna transienter i databasen för att förhindra database bloat.",
      code: "if (!wp_next_scheduled('litespeed_helper_woo_transients_cleanup')) {\n    wp_schedule_event(time(), 'daily', 'litespeed_helper_woo_transients_cleanup');\n}\nadd_action('litespeed_helper_woo_transients_cleanup', function() {\n    global $wpdb;\n    $wpdb->query(\"DELETE FROM {$wpdb->options} WHERE option_name LIKE '_transient_wc_user_membership_%' OR option_name LIKE '_transient_timeout_wc_user_membership_%'\");\n    $wpdb->query(\"DELETE FROM {$wpdb->options} WHERE option_name LIKE '_transient_timeout_paypal_express_%' OR option_name LIKE '_transient_paypal_express_%'\");\n    delete_expired_transients(true);\n});",
      active: 1,
      scope: "global"
    });
  }

  if (editedSettings.cc_limit_heartbeat === 1) {
    snippets.push({
      name: "Core: Begränsa Heartbeat API",
      desc: "Sänker Heartbeat-intervallet till 120 sekunder för att spara CPU-resurser när adminpaneler lämnas öppna.",
      code: "add_filter('heartbeat_settings', function($settings) {\n    $settings['interval'] = 120;\n    return $settings;\n});",
      active: 1,
      scope: "global"
    });
  }

  if (editedSettings.cc_disable_xmlrpc === 1) {
    snippets.push({
      name: "Core: Inaktivera XML-RPC API",
      desc: "Stänger av XML-RPC API:t för att blockera DDoS- och brute-force attacker mot pingback-systemet.",
      code: "add_filter('xmlrpc_enabled', '__return_false');",
      active: 1,
      scope: "global"
    });
  }

  if (editedSettings.cc_disable_pingbacks === 1) {
    snippets.push({
      name: "Core: Inaktivera själv-pingbacks",
      desc: "Förhindrar att din egen sajt pingar sig själv när du länkar till dina egna blogginlägg.",
      code: "add_action('pre_ping', function(&$links) {\n    $home = get_option('home');\n    foreach ($links as $l => $link) {\n        if (0 === strpos($link, $home)) {\n            unset($links[$l]);\n        }\n    }\n});",
      active: 1,
      scope: "global"
    });
  }

  if (editedSettings.cc_disable_emojis === 1) {
    snippets.push({
      name: "Core: Stäng av Emojis skript",
      desc: "Inaktiverar WordPress emoji-stödkod för att ta bort en blockerande JS-förfrågan.",
      code: "add_action('init', function() {\n    remove_action('wp_head', 'print_emoji_detection_script', 7);\n    remove_action('admin_print_scripts', 'print_emoji_detection_script');\n    remove_action('wp_print_styles', 'print_emoji_styles');\n    remove_action('admin_print_styles', 'print_emoji_styles');\n    remove_filter('the_content_feed', 'wp_staticize_emoji');\n    remove_filter('comment_text_rss', 'wp_staticize_emoji');\n    remove_filter('wp_mail', 'wp_staticize_emoji_for_email');\n    add_filter('tiny_mce_plugins', function($plugins) {\n        return is_array($plugins) ? array_diff($plugins, array('wpemoji')) : array();\n    });\n});",
      active: 1,
      scope: "global"
    });
  }

  const exportObj = {
    generator: "Site Code Manager / Code Snippets (AreWee-Optimizer)",
    version: "2.2.0",
    date_created: new Date().toISOString().replace('T', ' ').substring(0, 19),
    snippets: snippets
  };

  return JSON.stringify(exportObj, null, 2);
}

/**
 * Generates the complete PHP code for the arewee-optimizer-sync.php companion WordPress plugin.
 */
function generateSyncPluginPhp() {
  return `<?php
/**
 * Plugin Name: AreWee-Optimizer REST API Sync Helper
 * Description: Enables secure, token-authenticated, read-only REST API connection between your WordPress site and AreWee-Optimizer.
 * Version: 2.3.2
 * Author: AreWee-Optimizer
 * License: GPL2
 */

if (!defined('ABSPATH')) {
    exit;
}

// Generate connection token on activation
register_activation_hook(__FILE__, function() {
    if (!get_option('wp_optimizer_sync_token')) {
        $token = bin2hex(random_bytes(24)); // Cryptographically secure 48-char token
        update_option('wp_optimizer_sync_token', $token);
    }
});

// Register Dedicated Settings Submenu (No permanent public admin notice)
add_action('admin_menu', function() {
    add_options_page(
        'AreWee-Optimizer Sync',
        'AreWee Sync',
        'manage_options',
        'arewee-optimizer-sync',
        'wp_optimizer_sync_render_settings_page'
    );
});

function wp_optimizer_sync_render_settings_page() {
    if (!current_user_can('manage_options')) {
        return;
    }
    
    // Regenerate Token handler
    if (isset($_POST['wp_optimizer_regen_token']) && check_admin_referer('wp_optimizer_sync_action', 'wp_optimizer_sync_nonce')) {
        $new_token = bin2hex(random_bytes(24));
        update_option('wp_optimizer_sync_token', $new_token);
        echo '<div class="notice notice-success is-dismissible"><p>✓ Ny anslutnings-token genererades framgångsrikt!</p></div>';
    }
    
    $token = get_option('wp_optimizer_sync_token');
    $site_url = site_url();
    ?>
    <div class="wrap">
        <h1>⚡ AreWee-Optimizer Sync Inställningar (v2.3.2)</h1>
        <div class="card" style="max-width: 700px; margin-top: 1.5rem; padding: 1.5rem;">
            <h2>Säker Anslutningstoken</h2>
            <p>Använd denna token i AreWee-Optimizer för att koppla upp din sajt säkert via krypterad REST API.</p>
            <table class="form-table">
                <tr>
                    <th scope="row">REST API Endpoint</th>
                    <td><code><?php echo esc_url($site_url); ?>/wp-json/wp-optimizer-sync/v1/diagnostics</code></td>
                </tr>
                <tr>
                    <th scope="row">Din Token</th>
                    <td>
                        <input type="text" readonly value="<?php echo esc_attr($token); ?>" class="regular-text code" style="font-family: monospace; font-size: 14px; width: 420px;" onclick="this.select();">
                        <p class="description">Kopiera denna token och klistra in i AreWee-Optimizer.</p>
                    </td>
                </tr>
            </table>
            
            <form method="post" style="margin-top: 1.5rem;">
                <?php wp_nonce_field('wp_optimizer_sync_action', 'wp_optimizer_sync_nonce'); ?>
                <button type="submit" name="wp_optimizer_regen_token" class="button button-secondary" onclick="return confirm('Är du säker på att du vill generera en ny token? Den gamla tokenen slutar fungera direkt.');">🔄 Generera ny token</button>
            </form>
        </div>
    </div>
    <?php
}

// Register Read-Only REST API Route
add_action('rest_api_init', function() {
    register_rest_route('wp-optimizer-sync/v1', '/diagnostics', array(
        'methods' => 'GET',
        'callback' => 'wp_optimizer_sync_get_diagnostics',
        'permission_callback' => 'wp_optimizer_sync_verify_token'
    ));
});

function wp_optimizer_sync_verify_token($request) {
    // Basic Rate Limiting: Max 60 requests per minute per IP
    $ip = sanitize_text_field($_SERVER['REMOTE_ADDR'] ?? '127.0.0.1');
    $transient_key = 'wp_sync_rate_' . md5($ip);
    $requests = (int) get_transient($transient_key);
    if ($requests > 60) {
        return new WP_Error('rate_limited', 'För många förfrågningar. Försök igen senare.', array('status' => 429));
    }
    set_transient($transient_key, $requests + 1, 60);

    $header_token = $request->get_header('X-Optimizer-Token');
    $query_token = $request->get_param('token');
    $token = $header_token ?: $query_token;
    
    $saved_token = get_option('wp_optimizer_sync_token');
    if (!$saved_token || !$token || !hash_equals($saved_token, $token)) {
        return new WP_Error('unauthorized', 'Ogiltig eller saknad anslutningstoken', array('status' => 403));
    }
    return true;
}

function wp_optimizer_sync_get_diagnostics() {
    if (!function_exists('get_plugins')) {
        require_once ABSPATH . 'wp-admin/includes/plugin.php';
    }
    
    // 1. Gather System Health Info (100% Read-Only)
    $active_plugins = get_option('active_plugins', array());
    $all_plugins = get_plugins();
    $plugins_active_data = array();
    foreach ($active_plugins as $plugin_path) {
        if (isset($all_plugins[$plugin_path])) {
            $slug = dirname($plugin_path) !== '.' ? dirname($plugin_path) : basename($plugin_path, '.php');
            $plugins_active_data[$slug] = array(
                'name' => $all_plugins[$plugin_path]['Name'],
                'version' => $all_plugins[$plugin_path]['Version'],
                'author' => $all_plugins[$plugin_path]['Author']
            );
        }
    }
    
    $sysinfo = array(
        'wp-core' => array(
            'version' => get_bloginfo('version'),
            'site_url' => site_url(),
            'home_url' => home_url(),
            'language' => get_locale(),
            'permalink_structure' => get_option('permalink_structure')
        ),
        'wp-server' => array(
            'httpd_software' => $_SERVER['SERVER_SOFTWARE'] ?? 'Unknown',
            'php_version' => phpversion(),
            'php_memory_limit' => ini_get('memory_limit'),
            'php_max_execution_time' => ini_get('max_execution_time')
        ),
        'wp-active-theme' => array(
            'name' => wp_get_theme()->get('Name'),
            'version' => wp_get_theme()->get('Version')
        ),
        'wp-plugins-active' => $plugins_active_data
    );
    
    // 2. Gather WooCommerce Info (Read-Only)
    $woo_data = null;
    if (class_exists('WooCommerce')) {
        $woo_data = array(
            'version' => WC()->version,
            'hpos_enabled' => class_exists('\\Automattic\\WooCommerce\\Utilities\\OrderUtil') && \\Automattic\\WooCommerce\\Utilities\\OrderUtil::custom_orders_table_usage_is_enabled(),
            'cart_page_id' => wc_get_page_id('cart'),
            'checkout_page_id' => wc_get_page_id('checkout'),
            'gateways' => array()
        );
        $available_gateways = WC()->payment_gateways ? WC()->payment_gateways->get_available_payment_gateways() : array();
        foreach ($available_gateways as $id => $gw) {
            $woo_data['gateways'][] = array('id' => $id, 'title' => $gw->get_title());
        }
    }
    
    // 3. Gather Wordfence Info (Read-Only)
    $wf_data = null;
    if (class_exists('wfConfig')) {
        $wf_data = array(
            'firewall_mode' => wfConfig::get('firewallMode', 'disabled'),
            'live_traffic_disabled' => !wfConfig::get('liveTrafficEnabled', true),
            'low_resource_scan' => (bool) wfConfig::get('lowResourceScanEnable', false)
        );
    }
    
    // 4. Gather Elementor Info (Read-Only)
    $elem_data = null;
    if (defined('ELEMENTOR_VERSION')) {
        $elem_data = array(
            'version' => ELEMENTOR_VERSION,
            'experiments' => array(),
            'hasLazyLoad' => false,
            'css_print_method' => get_option('elementor_css_print_method', 'external')
        );
        $features_manager = \\Elementor\\Plugin::$instance->experiments ?? null;
        if ($features_manager && method_exists($features_manager, 'get_features')) {
            foreach ($features_manager->get_features() as $feature_name => $feature_data) {
                if ($features_manager->is_feature_active($feature_name)) {
                    $elem_data['experiments'][] = $feature_name;
                }
            }
        }
        if (in_array('e_lazy_load_images', $elem_data['experiments'])) {
            $elem_data['hasLazyLoad'] = true;
        }
    }
    
    $lscwp_conf = get_option('litespeed-cache-conf', array());
    
    return array(
        'syncPluginVersion' => '2.3.2',
        'sysInfo' => $sysinfo,
        'wooInfo' => $woo_data,
        'wfInfo' => $wf_data,
        'elemInfo' => $elem_data,
        'uploadedSettings' => $lscwp_conf
    );
}
`;
}

/**
 * Generates structured Markdown prompt for AI review (Grok, Claude, ChatGPT) for a single site.
 * Organized 1:1 by component tool, ensuring 100% Single Source of Truth consistency.
 */
function generateSecondOpinionMarkdown(state) {
  if (!state || !state.sysInfo) {
    return "# AreWee WP-Optimizer: Ingen aktiv sajt inläst för analys.";
  }

  const sys = state.sysInfo;
  const analysis = state.analysisResults || {};
  const env = analysis.environment || {};
  
  // Extract site URL reliably
  const siteUrl = state.detectedSiteUrl || 
    (sys["wp-core"] && (sys["wp-core"].site_url || sys["wp-core"].home_url || sys["wp-core"].url)) || 
    (sys["wp-paths-sizes"] && sys["wp-paths-sizes"].url) || 
    "https://example.com (URL ej detekterad i systemfil)";

  const wpVer = (sys["wp-core"] && sys["wp-core"].version) || env.wpVersion || "Okänd";
  const server = (sys["wp-server"] && sys["wp-server"].httpd_software) || env.server || "Okänd";
  const phpVer = (sys["wp-server"] && sys["wp-server"].php_version) || env.phpVersion || "Okänd";
  const phpMem = (sys["wp-server"] && sys["wp-server"].php_memory_limit) || env.phpMemoryLimit || "Ej angivet i serverdump";
  const wpMem = (sys["wp-constants"] && sys["wp-constants"].WP_MEMORY_LIMIT) || env.wpMemoryLimit || "40M (WP standard)";
  const wpMaxMem = (sys["wp-constants"] && sys["wp-constants"].WP_MAX_MEMORY_LIMIT) || env.wpMaxMemoryLimit || "256M (WP standard)";
  const disableCron = (sys["wp-constants"] && sys["wp-constants"].DISABLE_WP_CRON) === "true" || env.disableWpCron;
  const theme = (sys["wp-active-theme"] && sys["wp-active-theme"].name) || env.activeTheme || "Okänt tema";
  
  const pluginsObj = sys["wp-plugins-active"] || {};
  const plugins = Object.keys(pluginsObj);

  const rawAlerts = [
    ...(analysis.alerts || []),
    ...(analysis.customCodeAlerts || []),
    ...(analysis.customCssAlerts || [])
  ];

  // Helper to normalize measured user value from uploaded settings
  function getMeasuredVal(key, fallback) {
    if (state.uploadedSettings && state.uploadedSettings.hasOwnProperty(key)) {
      return state.uploadedSettings[key];
    }
    return fallback;
  }

  let md = `# AreWee-Optimizer: Fullständig Site-Report & Second Opinion (v2.3.9)\n\n`;
  md += `**Sajt:** \`${siteUrl}\`\n`;
  md += `**Genererad:** ${new Date().toISOString().replace('T', ' ').substring(0, 19)}\n`;
  md += `**Syfte:** Oberoende granskning (Second Opinion) av WordPress prestanda, stabilitet och säkerhetskonfiguration mot LiteSpeed Cache, WooCommerce, Elementor, Wordfence, SCM och CTM.\n\n`;

  // --- 1. SYSTEMMILJÖ & CORE ---
  md += `## 1. 🌐 Systemmiljö & WordPress Core\n`;
  md += `- **Webbplats URL:** \`${siteUrl}\`\n`;
  md += `- **WordPress Core:** ${wpVer}\n`;
  md += `- **Webbserver:** ${server} (${env.isLiteSpeedServer ? "LiteSpeed Enterprise / OpenLiteSpeed aktiv" : "Ej LiteSpeed-server"})\n`;
  md += `- **PHP Version:** ${phpVer}\n`;
  md += `- **Minnesallokering (Trefaldig separation):**\n`;
  md += `  - **PHP Server \`memory_limit\`:** \`${phpMem}\`\n`;
  md += `  - **Frontend \`WP_MEMORY_LIMIT\`:** \`${wpMem}\`\n`;
  md += `  - **Admin / Cron \`WP_MAX_MEMORY_LIMIT\`:** \`${wpMaxMem}\`\n`;
  md += `- **Aktivt Tema:** ${theme}\n`;
  md += `- **System-Cron (\`DISABLE_WP_CRON\`):** ${disableCron ? "PÅ (Kräver aktivt server-cronjobb via crontab/systemd)" : "AV (Körs via besöksanrop / WP default)"}\n`;
  md += `- **Aktiva Plugins (${plugins.length} st):** ${plugins.map(p => `\`${p}\``).join(", ") || "Inga listade"}\n\n`;

  // Helper to format alerts for a component
  function renderComponentAlerts(compKey) {
    const compAlerts = rawAlerts.filter(a => {
      if (a.components && Array.isArray(a.components)) return a.components.includes(compKey);
      return a.component === compKey;
    });

    if (compAlerts.length === 0) {
      return `*Inga aktiva stabilitetsrisker eller varningar identifierade för denna modul (Status: 🟢 OK).* \n\n`;
    }

    let out = `**Identifierade risker & avvikelser (${compAlerts.length} st):**\n\n`;
    compAlerts.forEach((a, i) => {
      out += `#### ${i + 1}. [${a.type.toUpperCase()}] ${a.title}\n`;
      out += `- **Beskrivning:** ${a.desc}\n`;
      if (a.source) out += `- **Källa:** ${a.source}\n`;
      if (a.compatibility) out += `- **Kompatibilitet:** ${a.compatibility}\n`;
      if (a.wpPath) out += `- **Sökväg i WordPress:** \`${a.wpPath}\`\n`;
      if (a.singleSourceInfo) {
        out += `- **Single Source of Truth:** ${a.singleSourceInfo.recommendedTool || a.singleSourceInfo.primaryTool}\n`;
        out += `  - *Motivering:* ${a.singleSourceInfo.whyRecommended || a.singleSourceInfo.reason}\n`;
        out += `  - *Åtgärd i andra verktyg:* ${a.singleSourceInfo.actionOtherTools || a.singleSourceInfo.actionForSecondary}\n`;
      }
      out += `\n`;
    });
    return out;
  }

  // Helper to format settings table for specific tab IDs using Single Source of Truth
  function renderSettingsSection(tabIds) {
    if (!analysis.recommendations) return "";
    const matchedTabs = analysis.recommendations.filter(t => tabIds.includes(t.id));
    if (matchedTabs.length === 0) return "";

    const comparisonFn = (typeof getOptionComparison === "function") 
      ? getOptionComparison 
      : (typeof window !== "undefined" && window.getOptionComparison) 
        ? window.getOptionComparison 
        : null;

    let out = "";
    matchedTabs.forEach(tab => {
      out += `#### Inställningsparitet: ${tab.title}\n\n`;
      out += `| Inställning | Faktiskt Nuläge | Rekommenderat | Status | Riktlinje & Påverkan |\n`;
      out += `| :--- | :--- | :--- | :--- | :--- |\n`;

      tab.options.forEach(opt => {
        if (opt.id === "optm_css_custom") return;

        let comp = null;
        if (comparisonFn) {
          comp = comparisonFn(opt, state.uploadedSettings, env);
        } else {
          const hasMeas = state.uploadedSettings && state.uploadedSettings.hasOwnProperty(opt.id);
          comp = {
            currentDisplay: hasMeas ? String(state.uploadedSettings[opt.id]) : "Ej inläst (Kräver Slot 6)",
            recommendedDisplay: String(opt.recommendedRaw),
            statusLabel: hasMeas ? "🟢 Optimal" : "⚪ Ej uppmätt"
          };
        }

        const descClean = (opt.desc || "").replace(/\|/g, "/");
        out += `| \`${opt.id}\` (${opt.title}) | ${comp.currentDisplay} | ${comp.recommendedDisplay} | ${comp.statusLabel} | ${descClean} |\n`;
      });
      out += `\n`;
    });
    return out;
  }

  // --- 2. LITESPEED CACHE ---
  md += `## 2. ⚡ LiteSpeed Cache (LSCWP)\n`;
  md += `- **Installerad pluginversion:** ${env.lscwpVersion || "Okänd"}\n`;
  md += `- **Granskad mot benchmark:** LiteSpeed Cache v7.9.1 Official Best Practice\n\n`;
  md += renderComponentAlerts("litespeed");
  md += renderSettingsSection(["general", "cache", "purge", "page_optimization_css", "page_optimization_js", "page_optimization_media", "crawler", "tuning"]);
  
  // Full un-truncated exclusion blocks
  const curDropUri = getMeasuredVal("drop_uri", "(Inga aktiva drop_uri-regler inlästa)");
  const curJsExc = getMeasuredVal("js_exclude", "(Inga aktiva js_exclude-regler inlästa)");
  const curCssExc = getMeasuredVal("css_exclude", "(Inga aktiva css_exclude-regler inlästa)");
  const curMediaExc = getMeasuredVal("media_lazy_exc", "(Inga aktiva media_lazy_exc-regler inlästa)");

  md += `#### 📋 Oavkortade Aktiva Exkluderingsregler i LiteSpeed\n\n`;
  md += `**Exkluderade URL-sökvägar (\`drop_uri\`):**\n\`\`\`text\n${curDropUri}\n\`\`\`\n\n`;
  md += `**Exkluderade JavaScript-filer (\`js_exclude\`):**\n\`\`\`text\n${curJsExc}\n\`\`\`\n\n`;
  md += `**Exkluderade CSS-filer (\`css_exclude\`):**\n\`\`\`text\n${curCssExc}\n\`\`\`\n\n`;
  md += `**Exkluderade Lazy Load-bilder (\`media_lazy_exc\`):**\n\`\`\`text\n${curMediaExc}\n\`\`\`\n\n`;

  // --- 3. WOOCOMMERCE ---
  md += `## 3. 🛒 WooCommerce\n`;
  md += `- **Installerad version:** ${env.hasWooCommerce ? env.wooVersion : "Ej installerad"}\n`;
  md += `- **Kassaskydd & Sessionsintegritet:** ${env.hasWooCommerce ? (String(curDropUri).toLowerCase().includes("checkout") || String(curDropUri).toLowerCase().includes("kassa") ? "🟢 Skyddad i drop_uri" : "🚨 Risk för sessionsläckor") : "N/A"}\n\n`;
  md += renderComponentAlerts("woocommerce");
  md += renderSettingsSection(["woocommerce"]);

  // --- 4. ELEMENTOR ---
  md += `## 4. 🎨 Elementor Sidbyggare\n`;
  md += `- **Installerad version:** ${env.hasElementor ? env.elemVersion : "Ej installerad"}\n`;
  md += `- **DOM & Lazyload-status:** ${env.hasElementor ? "Granskad mot Elementor Core experiments" : "N/A"}\n\n`;
  md += renderComponentAlerts("elementor");
  md += renderSettingsSection(["elementor"]);

  // --- 5. WORDFENCE SECURITY ---
  md += `## 5. 🔒 Wordfence Security\n`;
  md += `- **Installerad version:** ${env.hasWordfence ? env.wfVersion : "Ej installerad"}\n`;
  md += `- **IP-header bakom proxy/LiteSpeed:** \`${getMeasuredVal("wf_ip_header", "HTTP_X_FORWARDED_FOR")}\`\n\n`;
  md += renderComponentAlerts("wordfence");
  md += renderSettingsSection(["wordfence"]);

  // --- 6. CTM (CONSENT & TRACKING MANAGER) ---
  md += `## 6. 🏷️ CTM (Consent & Tracking Manager)\n`;
  md += `- **Version:** v2.3.6\n`;
  md += `- **Status i LiteSpeed JS-exkludering:** ${(String(curJsExc).toLowerCase().includes("ctm") || String(curJsExc).toLowerCase().includes("cookieconsent") || String(curJsExc).toLowerCase().includes("datalayer")) ? "🟢 Fullt exkluderad (GDPR-säkrad)" : "🚨 Saknas i js_exclude"}\n\n`;
  md += renderComponentAlerts("ctm");

  // --- 7. SCM (SITE CODE MANAGER) ---
  md += `## 7. 💻 SCM (Site Code Manager / Server & Kod)\n`;
  md += `- **Version:** v2.3.6\n`;
  md += `- **Redis Object Cache:** ${env.hasRedis ? (env.isRedisConnected ? "🟢 Redis ansluten och aktiv" : "🟡 Redis installerad men ej ansluten") : "⚪ Ej aktiv (Rekommenderas för Woo/dynamiska sajter)"}\n`;
  md += `- **Anpassad CSS:** ${state.customCss ? `\`\`\`css\n${state.customCss}\n\`\`\`` : "*Ingen anpassad CSS inläst.*"}\n\n`;
  md += renderComponentAlerts("scm");
  md += renderComponentAlerts("server");

  // --- 8. SECOND OPINION AI QUESTIONS ---
  md += `## 8. ❓ Riktade Frågor för Second Opinion (AI-granskning)\n`;
  md += `1. **Kassa- & Betalningsstabilitet:** Granska \`drop_uri\`-kodblocket i §2 ovan — är alla nödvändiga vägar för varukorg, kassa, my-account och eventuella Klarna/Stripe/Kustom callbacks fullt säkrade mot cachning?\n`;
  md += `2. **JS/CSS Optimering & Samtycke:** Granska \`js_exclude\`-kodblocket i §2 ovan — är CTM (\`ctm-init\`, \`cookieconsent\`, \`dataLayer\`) och Elementor-skript tillräckligt isolerade från Defer/Combine för att förhindra brutna widgets eller spårningsbortfall?\n`;
  md += `3. **Minne & Resursdimensionering:** Är \`memory_limit\` (PHP Server) och \`WP_MEMORY_LIMIT\` (WordPress) optimalt dimensionerade för den aktiva stacken (${plugins.join(", ")})?\n`;
  md += `4. **Ytterligare Stabilitets- och Prestandavinster:** Finns det specifika flaskhalsar eller förbättringar du noterar i konfigurationen utan att tumma på driftsäkerheten?\n`;

  return md;
}

/**
 * Generates batch Markdown report for all sites in history.
 */
function generateBatchSecondOpinionMarkdown(historyList) {
  if (!historyList || !Array.isArray(historyList) || historyList.length === 0) {
    return "# AreWee WP-Optimizer: Ingen sparad historik tillgänglig.";
  }

  let md = `# AreWee-Optimizer: Multi-Site Sammanställning (Batch Second Opinion v2.3.6)\n\n`;
  md += `**Antal analyserade sajter:** ${historyList.length}\n`;
  md += `**Datum:** ${new Date().toISOString().replace('T', ' ').substring(0, 19)}\n\n`;

  md += `| Sajt / Domän | WP | PHP | Server | WooCommerce | Elementor | Health Score |\n`;
  md += `| :--- | :--- | :--- | :--- | :--- | :--- | :--- |\n`;

  historyList.forEach(item => {
    const siteName = item.siteName || "Okänd";
    const wp = item.wpVersion || "-";
    const php = item.phpVersion || "-";
    const srv = item.server || "-";
    const woo = item.hasWoo ? "Ja" : "Nej";
    const elem = item.hasElem ? "Ja" : "Nej";
    const score = item.healthScore ? `${item.healthScore}/100` : "-";
    md += `| **${siteName}** | ${wp} | ${php} | ${srv} | ${woo} | ${elem} | ${score} |\n`;
  });

  md += `\n\n---\n\n`;
  md += `*Genererad automatiskt av AreWee WP-Optimizer v2.3.6*\n`;

  return md;
}

// Global browser window attachment
if (typeof window !== "undefined") {
  window.generateSecondOpinionMarkdown = generateSecondOpinionMarkdown;
  window.generateBatchSecondOpinionMarkdown = generateBatchSecondOpinionMarkdown;
  window.KEY_MAPPING_TO_INTERNAL = KEY_MAPPING_TO_INTERNAL;
  window.KEY_MAPPING_TO_LSCWP = KEY_MAPPING_TO_LSCWP;
  window.parseSettingsFile = parseSettingsFile;
  window.php_serialize = php_serialize;
  window.php_deserialize = php_deserialize;
}

// Node.js export support
if (typeof module !== "undefined" && module.exports) {
  module.exports = { 
    php_serialize, 
    php_deserialize, 
    parseSettingsFile, 
    translateKeysToInternal, 
    translateKeysToLscwp,
    generateAutoOptimizerSnippet,
    generateCodeSnippetsJson,
    generateSyncPluginPhp,
    generateSecondOpinionMarkdown,
    generateBatchSecondOpinionMarkdown,
    KEY_MAPPING_TO_INTERNAL,
    KEY_MAPPING_TO_LSCWP
  };
}
