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
        
        const charLen = getCharLengthForBytes(str, offset, byteLen);
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
  "drop_uri": "drop_uri",
  "esi": "esi_enabled",
  "esi_enabled": "esi_enabled",
  "object": "object_cache",
  "object_cache": "object_cache",
  "cache-browser": "cache_browser",
  "cache_browser": "cache_browser",
  "optm-css_min": "css_minify",
  "css_minify": "css_minify",
  "optm-css_comb": "css_combine",
  "css_combine": "css_combine",
  "optm-css_comb_priority": "css_combined_priority",
  "css_combined_priority": "css_combined_priority",
  "optm-css_exc": "css_exclude",
  "css_exclude": "css_exclude",
  "optm-css_preload": "css_preload",
  "css_preload": "css_preload",
  "optm-font_display": "font_display",
  "font_display": "font_display",
  "optm-js_min": "js_minify",
  "js_minify": "js_minify",
  "optm-js_comb": "js_combine",
  "js_combine": "js_combine",
  "optm-js_defer": "js_defer",
  "js_defer": "js_defer",
  "optm-js_exc": "js_exclude",
  "js_exclude": "js_exclude",
  "media-lazy": "media_lazy",
  "media_lazy": "media_lazy",
  "media-lazy_native": "media_lazy_native",
  "media_lazy_native": "media_lazy_native",
  "media-lazy_placeholder": "media_lazy_placeholder",
  "media_lazy_placeholder": "media_lazy_placeholder",
  "media-lazy_exc": "media_lazy_exclude",
  "media_lazy_exclude": "media_lazy_exclude",
  "media-iframe_lazy": "media_iframe_lazy",
  "media_iframe_lazy": "media_iframe_lazy",
  "crawler": "crawler",
  
  // Custom CSS key mapping
  "optm-css_custom": "optm_css_custom",
  "optm_css_custom": "optm_css_custom"
};

const KEY_MAPPING_TO_LSCWP = {
  "auto_upgrade": "auto_upgrade",
  "domain_key": "hash",
  "guest_mode": "guest",
  "cache_priv": "cache-priv",
  "cache_commenter": "cache-commenter",
  "cache_rest": "cache-rest",
  "cache_page_login": "cache-page_login",
  "cache_mobile": "cache-mobile",
  "drop_uri": "cache-exc",
  "esi_enabled": "esi",
  "object_cache": "object",
  "cache_browser": "cache-browser",
  "css_minify": "optm-css_min",
  "css_combine": "optm-css_comb",
  "css_combined_priority": "optm-css_comb_priority",
  "css_exclude": "optm-css_exc",
  "css_preload": "optm-css_preload",
  "font_display": "optm-font_display",
  "js_minify": "optm-js_min",
  "js_combine": "optm-js_comb",
  "js_defer": "optm-js_defer",
  "js_exclude": "optm-js_exc",
  "media_lazy": "media-lazy",
  "media_lazy_native": "media-lazy_native",
  "media_lazy_placeholder": "media-lazy_placeholder",
  "media_lazy_exclude": "media-lazy_exc",
  "media_iframe_lazy": "media-iframe_lazy",
  "crawler": "crawler",
  
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
    if (internalKey === "drop_uri" || internalKey === "js_exclude" || internalKey === "css_exclude" || internalKey === "media_lazy_exclude") {
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
    if (key.startsWith("woo_") || key.startsWith("elem_") || key.startsWith("wf_") || key.startsWith("cc_")) {
      return;
    }
    const lscwpKey = KEY_MAPPING_TO_LSCWP[key] || key;
    let val = obj[key];
    
    // Convert internal newline strings back to indexed objects (representing PHP arrays)
    if (key === "drop_uri" || key === "js_exclude" || key === "css_exclude" || key === "media_lazy_exclude") {
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
 * Plugin Name: WordPress Performance & Compatibility Auto-Optimizer
 * Description: Programmatically configures WooCommerce, Elementor, and Wordfence optimal settings and adds compatibility hooks based on AreWee WP-Optimizer analysis.
 * Version: 2.1.0
 * Author: AreWee WP-Optimizer
 * License: GPL2
 */

if (!defined('ABSPATH')) {
    exit;
}

/**
 * 1. AUTOMATED SETTINGS CONFIGURATION (Runs on init)
 */
add_action('init', function() {
`;

  if (editedSettings.elem_css_print_method === 'external') {
    phpCode += `    // Set Elementor CSS print method to external file\n    if (get_option('elementor_css_print_method') !== 'external') {\n        update_option('elementor_css_print_method', 'external');\n    }\n\n`;
  }

  phpCode += `    // Configure Elementor active experiments/features
    if (class_exists('\\\\Elementor\\\\Plugin')) {
        $elem_experiments = get_option('elementor_active_experiments', array());
`;
  if (editedSettings.elem_dom_optimization === 1) {
    phpCode += `        $elem_experiments['e_dom_optimization'] = 'active';\n`;
  }
  if (editedSettings.elem_asset_loading === 1) {
    phpCode += `        $elem_experiments['e_optimized_assets_loading'] = 'active';\n`;
  }
  if (editedSettings.elem_css_loading === 1) {
    phpCode += `        $elem_experiments['e_optimized_css_loading'] = 'active';\n`;
  }
  if (editedSettings.elem_lazy_load === 0) {
    phpCode += `        $elem_experiments['e_lazy_load_images'] = 'inactive';\n`;
  }
  phpCode += `        update_option('elementor_active_experiments', $elem_experiments);
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
    phpCode += `        wfConfig::set('liveTrafficEnabled', false);\n`;
  }
  if (editedSettings.wf_ip_header) {
    phpCode += `        wfConfig::set('howGetIPs', '${editedSettings.wf_ip_header}');\n`;
  }
  if (editedSettings.wf_low_resource === 1) {
    phpCode += `        wfConfig::set('lowResourceScanSelection', true);\n`;
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
    generator: "Code Snippets AreWee WP-Optimizer",
    date_created: new Date().toISOString().replace('T', ' ').substring(0, 19),
    snippets: snippets
  };

  return JSON.stringify(exportObj, null, 2);
}

/**
 * Generates the complete PHP code for the wp-optimizer-sync.php companion WordPress plugin.
 */
function generateSyncPluginPhp() {
  return `<?php
/**
 * Plugin Name: AreWee WP-Optimizer REST API Sync Helper
 * Description: Enables secure, token-authenticated, whitelisted REST API connection between your site and the WordPress Multi-Tool Optimizer dashboard.
 * Version: 2.1.0
 * Author: AreWee WP-Optimizer
 * License: GPL2
 */

if (!defined('ABSPATH')) {
    exit;
}

// Generate connection token on activation
register_activation_hook(__FILE__, function() {
    if (!get_option('wp_optimizer_sync_token')) {
        $token = bin2hex(random_bytes(16)); // Cryptographically secure token
        update_option('wp_optimizer_sync_token', $token);
    }
});

// Admin notice showing token in WordPress
add_action('admin_notices', function() {
    $token = get_option('wp_optimizer_sync_token');
    if ($token) {
        echo '<div class="notice notice-info is-dismissible">
            <p><strong>⚡ AreWee WP-Optimizer Sync Aktivt!</strong> Din anslutnings-token är: <code>' . esc_html($token) . '</code> - Kopiera denna och ange i din Optimizer Dashboard för att koppla upp din sajt live.</p>
        </div>';
    }
});

// Register REST API routes
add_action('rest_api_init', function() {
    // 1. Fetch Diagnostics Route
    register_rest_route('wp-optimizer-sync/v1', '/diagnostics', array(
        'methods' => 'GET',
        'callback' => 'wp_optimizer_sync_get_diagnostics',
        'permission_callback' => 'wp_optimizer_sync_check_auth'
    ));
    
    // 2. Apply Settings Route
    register_rest_route('wp-optimizer-sync/v1', '/apply-settings', array(
        'methods' => 'POST',
        'callback' => 'wp_optimizer_sync_apply_settings',
        'permission_callback' => 'wp_optimizer_sync_check_auth'
    ));
});

// Authentication callback
function wp_optimizer_sync_check_auth($request) {
    $header_token = $request->get_header('X-WP-Optimizer-Token');
    $saved_token = get_option('wp_optimizer_sync_token');
    return ($saved_token && hash_equals($saved_token, $header_token));
}

// GET Diagnostics Callback
function wp_optimizer_sync_get_diagnostics() {
    // Collect WP Core data
    $wp_version = get_bloginfo('version');
    
    // Get Active Plugins
    $active_plugins = get_option('active_plugins', array());
    $plugins_data = array();
    foreach ($active_plugins as $plugin) {
        $data = get_plugin_data(WP_PLUGIN_DIR . '/' . $plugin);
        $plugins_data[$plugin] = array(
            'version' => $data['Version'],
            'name' => $data['Name']
        );
    }
    
    // Active Theme
    $theme = wp_get_theme();
    $theme_data = array(
        'name' => $theme->get('Name'),
        'version' => $theme->get('Version')
    );
    
    // Server Software
    $server_software = isset($_SERVER['SERVER_SOFTWARE']) ? $_SERVER['SERVER_SOFTWARE'] : 'Unknown';
    $php_version = phpversion();
    
    // Dropins
    $object_cache_active = file_exists(WP_CONTENT_DIR . '/object-cache.php');
    
    // Compile System Info payload format (mocking standard WordPress health check dump)
    $sysinfo = array(
        'wp-core' => array('version' => $wp_version),
        'wp-server' => array(
            'httpd_software' => $server_software,
            'php_version' => $php_version,
            'php_sapi' => php_sapi_name(),
            'imagick_availability' => class_exists('Imagick') ? 'true' : 'false'
        ),
        'wp-active-theme' => array('name' => $theme_data['name']),
        'wp-dropins' => array('object-cache.php' => $object_cache_active ? 'true' : 'false'),
        'wp-plugins-active' => $plugins_data
    );
    
    // WooCommerce Status Info
    $woo_data = array('gateways' => array(), 'overrides' => array(), 'hpos_enabled' => false);
    if (class_exists('WooCommerce')) {
        // HPOS check
        if (class_exists('\\\\Automattic\\\\WooCommerce\\\\Internal\\\\DataStores\\\\Orders\\\\CustomOrdersTableController')) {
            $hpos_enabled = \\Automattic\\WooCommerce\\Utilities\\OrderUtil::custom_orders_table_usage_is_enabled();
            $woo_data['hpos_enabled'] = $hpos_enabled;
        }
        
        // Gateways
        $gateways = WC()->payment_gateways->payment_gateways();
        foreach ($gateways as $gateway) {
            if ($gateway->enabled === 'yes') {
                $woo_data['gateways'][] = $gateway->title;
            }
        }
        
        // Template overrides (mock check)
        if (is_dir(get_stylesheet_directory() . '/woocommerce')) {
            $woo_data['overrides'][] = 'Active theme woocommerce directory override detected';
        }
    }
    
    // Wordfence
    $wf_data = array('firewall_mode' => 'Unknown', 'ip_header' => 'Unknown', 'live_traffic_disabled' => false, 'low_resource_scan' => false, 'crawler_whitelisted' => false);
    if (class_exists('wfConfig')) {
        $wf_data['firewall_mode'] = wfConfig::get('firewallMode', 'Unknown');
        $wf_data['ip_header'] = wfConfig::get('howGetIPs', 'Unknown');
        $wf_data['live_traffic_disabled'] = !wfConfig::get('liveTrafficEnabled', true);
        $wf_data['low_resource_scan'] = wfConfig::get('lowResourceScanSelection', false);
    }
    
    // Elementor
    $elem_data = array('experiments' => array(), 'hasLazyLoad' => false, 'css_print_method' => 'external');
    if (class_exists('\\\\Elementor\\\\Plugin')) {
        $elem_data['css_print_method'] = get_option('elementor_css_print_method', 'external');
        $experiments = get_option('elementor_active_experiments', array());
        foreach ($experiments as $exp => $status) {
            if ($status === 'active') {
                $elem_data['experiments'][] = $exp;
            }
        }
        if (in_array('e_lazy_load_images', $elem_data['experiments']) || get_option('elementor_lazy_load_images') === 'yes') {
            $elem_data['hasLazyLoad'] = true;
        }
    }
    
    // Custom Code checks
    $custom_code = array(
        'hasXmlRpcDisabled' => !wp_is_xmlrpc_enabled() || !apply_filters('xmlrpc_enabled', true),
        'hasEmojisDisabled' => !has_action('wp_head', 'print_emoji_detection_script')
    );
    
    // LiteSpeed Config (LSCWP settings array)
    $lscwp_conf = get_option('litespeed-cache-conf', array());
    
    return array(
        'syncPluginVersion' => '2.1.0',
        'sysInfo' => $sysinfo,
        'wooInfo' => $woo_data,
        'wfInfo' => $wf_data,
        'elemInfo' => $elem_data,
        'customCode' => $custom_code,
        'uploadedSettings' => $lscwp_conf
    );
}

// POST Apply Settings Callback
function wp_optimizer_sync_apply_settings($request) {
    $params = $request->get_json_params();
    if (empty($params)) {
        return new WP_REST_Response(array('success' => false, 'message' => 'Inga inställningar mottogs'), 400);
    }
    
    $applied = array();
    
    // Apply options directly (Strict Option Whitelist)
    foreach ($params as $key => $value) {
        // 1. LiteSpeed Cache Config Option (litespeed-cache-conf)
        if ($key === 'litespeed-cache-conf' || $key === 'litespeed_cache_conf') {
            if (is_array($value)) {
                $sanitized_lscwp = array();
                foreach ($value as $k => $v) {
                    $sanitized_lscwp[sanitize_key($k)] = is_array($v) ? array_map('sanitize_text_field', $v) : sanitize_text_field($v);
                }
                update_option('litespeed-cache-conf', $sanitized_lscwp);
                $applied[] = 'litespeed-cache-conf';
            }
        }
        
        // 2. Elementor Options
        if ($key === 'elementor_css_print_method') {
            $val = sanitize_text_field($value);
            if (in_array($val, array('external', 'internal'))) {
                update_option('elementor_css_print_method', $val);
                $applied[] = 'elementor_css_print_method';
            }
        }
        if ($key === 'elementor_active_experiments') {
            if (is_array($value)) {
                $sanitized_experiments = array();
                foreach ($value as $exp => $status) {
                    $sanitized_experiments[sanitize_key($exp)] = sanitize_text_field($status);
                }
                update_option('elementor_active_experiments', $sanitized_experiments);
                $applied[] = 'elementor_active_experiments';
            }
        }
        
        // 3. WooCommerce HPOS Options
        if ($key === 'woocommerce_custom_orders_table_enabled') {
            $val = sanitize_text_field($value);
            if (in_array($val, array('yes', 'no'))) {
                update_option('woocommerce_custom_orders_table_enabled', $val);
                $applied[] = 'woocommerce_custom_orders_table_enabled';
            }
        }
        
        // 4. Wordfence Config Updates via wfConfig class
        if (class_exists('wfConfig')) {
            if ($key === 'wf_live_traffic') {
                wfConfig::set('liveTrafficEnabled', (bool)$value);
                $applied[] = 'wordfence_liveTrafficEnabled';
            }
            if ($key === 'wf_ip_header') {
                wfConfig::set('howGetIPs', sanitize_text_field($value));
                $applied[] = 'wordfence_howGetIPs';
            }
            if ($key === 'wf_low_resource') {
                wfConfig::set('lowResourceScanSelection', (bool)$value);
                $applied[] = 'wordfence_lowResourceScanSelection';
            }
        }
    }
    
    return array(
        'success' => true,
        'applied_settings' => $applied
    );
}
`;
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
    generateSyncPluginPhp
  };
}
