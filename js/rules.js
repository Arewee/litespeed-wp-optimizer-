/**
 * AreWee WP-Optimizer - Dynamic Rules & Compatibility Engine (v2.7.3)
 * Master Rule Matrix for WordPress 6.8+, LiteSpeed Cache 7.1.1+ (including v7.9.1+ JSON tuple export), WooCommerce 9.8.0+, Elementor 3.28.3+, Wordfence 8.0.4+
 * 
 * Comprehensive rule evaluations for LiteSpeed Cache (100% 1:1 tab parity),
 * CTM (Consent & Tracking Manager), SCM (Site Code Manager), WooCommerce, Elementor,
 * Wordfence, WordPress Core, and Server Memory configurations (.htaccess / wp-config).
 *
 * Official benchmarks mapped to specific versions, latest ecosystem releases, and audit dates.
 */

// --- HELPER UTILITIES: EXCLUSIONS & MEMORY MANAGEMENT ---
function compareVersions(v1, v2) {
  if (!v1 && !v2) return 0;
  if (!v1) return -1;
  if (!v2) return 1;
  const clean1 = v1.toString().trim().split(/[-+]/)[0].replace(/[^0-9.]/g, "");
  const clean2 = v2.toString().trim().split(/[-+]/)[0].replace(/[^0-9.]/g, "");
  const p1 = clean1.split(".").map(Number);
  const p2 = clean2.split(".").map(Number);
  const maxLen = Math.max(p1.length, p2.length);
  for (let i = 0; i < maxLen; i++) {
    const num1 = isNaN(p1[i]) ? 0 : p1[i];
    const num2 = isNaN(p2[i]) ? 0 : p2[i];
    if (num1 > num2) return 1;
    if (num1 < num2) return -1;
  }
  return 0;
}

/**
 * Mask secrets for UI / Second Opinion (never show full domain_key / API keys).
 * Shows first 4 + … + last 4 when length >= 10; shorter non-empty → ••••.
 */
function maskSecretKey(val) {
  if (val === null || val === undefined) return "";
  const s = String(val).trim();
  if (!s || s === "0" || s === "1") return s;
  if (s.length < 10) return "••••";
  return s.slice(0, 4) + "…" + s.slice(-4);
}



/**
 * Plugin identity helpers for Versionsgranskning (v2.7.1.6+).
 * Prefer exact slug / bare display name so "WooCommerce PayPal Payments"
 * and "Klarna for WooCommerce" never overwrite core WooCommerce.
 * Supports keys shaped as:
 *   "WooCommerce"
 *   "WooCommerce (woocommerce)"
 *   "woocommerce/woocommerce.php"
 */
function getPluginMatchTokens(pluginKey) {
  const raw = String(pluginKey || "").trim();
  const lower = raw.toLowerCase();
  let slug = null;
  const paren = raw.match(/\(([^)]+)\)\s*$/);
  if (paren) slug = paren[1].trim().toLowerCase();
  const pathMatch = lower.match(/^([a-z0-9._-]+)\/[a-z0-9._-]+\.php$/);
  if (pathMatch) slug = pathMatch[1];
  if (!slug && /^[a-z0-9._-]+$/.test(lower)) slug = lower;
  const baseName = raw
    .replace(/\s*\([^)]*\)\s*$/, "")
    .replace(/\/[^/]+\.php$/i, "")
    .trim()
    .toLowerCase();
  return { slug, baseName, lower };
}

function isCoreWooCommercePlugin(pluginKey) {
  const { slug, baseName } = getPluginMatchTokens(pluginKey);
  return slug === "woocommerce" || baseName === "woocommerce";
}

function isCoreElementorPlugin(pluginKey) {
  const { slug, baseName } = getPluginMatchTokens(pluginKey);
  return slug === "elementor" || baseName === "elementor";
}

function normalizeExclusionPattern(pattern) {
  if (!pattern) return "";
  let p = pattern.trim().toLowerCase();
  // Strip leading caret or query prefix if present for clean comparison
  if (p.startsWith("^")) p = p.substring(1);
  if (p.startsWith("?")) p = p.substring(1);
  if (p.endsWith("$")) p = p.substring(0, p.length - 1);
  return p;
}

// --- MEMORY STRING PARSER (MB Normalizer) ---
function parseMemoryMB(memStr) {
  if (!memStr || typeof memStr !== "string") return null;
  const trimmed = memStr.trim();
  if (trimmed === "-1" || trimmed === "-1M" || trimmed === "-1G") return 999999;
  const match = trimmed.match(/^(\d+(?:\.\d+)?)\s*([KMGTP]?)/i);
  if (!match) return null;
  const num = parseFloat(match[1]);
  const unit = match[2].toUpperCase();
  if (unit === "G") return num * 1024;
  if (unit === "M") return num;
  if (unit === "K") return num / 1024;
  return num; // Default MB
}

// --- NATIVE LSCWP DEFAULTS MATRIX (Fresh Install Defaults) ---
const LSCWP_NATIVE_DEFAULTS = {
  "cache": "1",
  "cache_priv": "1",
  "cache_commenter": "1",
  "cache_rest": "1",
  "cache_page_login": "1",
  "cache_mobile": "0",
  "cache_browser": "0",
  "cache_object": "0",
  "esi": "0",
  "auto_upgrade": "0",
  "guest_mode": "0",
  "guest_optm": "0",
  "purge_upgrade": "1",
  "purge_stale": "0",
  "optm_css_min": "0",
  "optm_html_min": "0",
  "optm_css_comb": "0",
  "optm_css_comb_ext_inl": "0",
  "optm_ucss": "0",
  "optm_ucss_inline": "0",
  "optm_css_async": "0",
  "optm_ccss_per_url": "0",
  "optm_css_async_inline": "0",
  "optm_font_display": "0",
  "optm_ggfonts_async": "0",
  "optm_ggfonts_rm": "0",
  "optm_js_min": "0",
  "optm_js_comb": "0",
  "optm_js_comb_ext_inl": "0",
  "optm_js_defer": "0",
  "js_delayed_exclude": "",
  "optm_js_delayed_exc": "",
  "js_exclude": "",
  "css_exclude": "",
  "media_lazy": "0",
  "media_lazy_exc": "",
  "media_webp": "0",
  "media_vpi": "0",
  "drop_uri": "",
  "optm_emojis_rm": "0",
  "optm_qs_rm": "0",
  "optm_dns_prefetch": "",
  "crawler": "0"
};

// --- HELPER FOR CHECKING MISSING MULTI-LINE EXCLUSIONS ---
function checkMissingExclusions(currentExclusionsStr, recommendedExclusionsStr) {
  if (!recommendedExclusionsStr) return [];
  if (!currentExclusionsStr) {
    return recommendedExclusionsStr
      .split(/\r?\n/)
      .map(s => s.replace(/\r/g, "").trim())
      .filter(Boolean);
  }

  const currentLines = currentExclusionsStr
    .split(/\r?\n/)
    .map(s => s.replace(/\r/g, "").trim().toLowerCase())
    .filter(Boolean);

  const recommendedLines = recommendedExclusionsStr
    .split(/\r?\n/)
    .map(s => s.replace(/\r/g, "").trim())
    .filter(Boolean);

  const missing = [];
  recommendedLines.forEach(recLine => {
    const recLower = recLine.toLowerCase();
    // Strip only ^ and $ anchors, avoid deleting full lines like ^/checkout/$
    const cleanRec = recLower.replace(/[\^\$]/g, "").replace(/[\.\*\+\?\(\)\[\]\{\}\\\|\/]/g, "").trim();
    
    // Check if the recommended line or its essential slug is present in current lines
    const found = currentLines.some(curLine => {
      const cleanCur = curLine.replace(/[\^\$]/g, "").replace(/[\.\*\+\?\(\)\[\]\{\}\\\|\/]/g, "").trim();
      return curLine === recLower || (cleanRec && cleanCur.includes(cleanRec)) || (cleanCur && cleanRec.includes(cleanCur));
    });

    if (!found) {
      missing.push(recLine);
    }
  });

  return missing;
}

function getFulfilledExclusions(currentExclusionsStr, recommendedExclusionsStr) {
  if (!recommendedExclusionsStr || !currentExclusionsStr) return [];
  const currentLines = currentExclusionsStr
    .split(/\r?\n/)
    .map(s => s.replace(/\r/g, "").trim().toLowerCase())
    .filter(Boolean);
  const recommendedLines = recommendedExclusionsStr
    .split(/\r?\n/)
    .map(s => s.replace(/\r/g, "").trim())
    .filter(Boolean);

  const fulfilled = [];
  recommendedLines.forEach(recLine => {
    const recLower = recLine.toLowerCase();
    const cleanRec = recLower.replace(/[\^\$]/g, "").replace(/[\.\*\+\?\(\)\[\]\{\}\\\|\/]/g, "").trim();
    const found = currentLines.some(curLine => {
      const cleanCur = curLine.replace(/[\^\$]/g, "").replace(/[\.\*\+\?\(\)\[\]\{\}\\\|\/]/g, "").trim();
      return curLine === recLower || (cleanRec && cleanCur.includes(cleanRec)) || (cleanCur && cleanRec.includes(cleanCur));
    });
    if (found) {
      fulfilled.push(recLine);
    }
  });
  return fulfilled;
}

function mergeExclusions(currentExclusionsStr, requiredList) {
  let list = requiredList;
  if (typeof list === "string") {
    list = list.split(/\r?\n/).map(s => s.replace(/\r/g, "").trim()).filter(Boolean);
  } else if (!Array.isArray(list)) {
    list = [];
  }
  if (!currentExclusionsStr) return list.join("\n");
  const missing = checkMissingExclusions(currentExclusionsStr, list);
  if (missing.length === 0) return currentExclusionsStr;
  return currentExclusionsStr.trim() + "\n" + missing.join("\n");
}


// --- SHARED: external Google Fonts context (async + DNS Prefetch must agree) ---
/**
 * True only for explicit Active/ON theme Google Fonts signals.
 * CRITICAL: never use JSON.stringify(...).includes("google_fonts") — that false-positives
 * on google_fonts:false / "google_fonts":0 keys (skateyourname / Hello Elementor theme slots).
 */
function isActiveGoogleFontsValue(val) {
  if (val === true || val === 1 || val === "1") return true;
  if (typeof val !== "string") return false;
  const s = val.toLowerCase().trim();
  if (!s || s === "0" || s === "false" || s === "off" || s === "no" || s === "disabled" || s === "inactive" || s === "inaktiv" || s === "disable" || s === "av" || s === "avstängd") return false;
  if (s === "active" || s === "aktiv" || s === "enabled" || s === "enable" || s === "on" || s === "yes" || s === "true" || s === "standard (aktiv)" || s === "active by default" || s === "default (active)") return true;
  if (s.includes("fonts.googleapis.com") || s.includes("fonts.gstatic.com")) return true;
  return false;
}

function isGoogleFontsKeyName(key) {
  const k = String(key || "").toLowerCase();
  return (
    k === "google_fonts" || k === "google-fonts" || k === "googlefonts" ||
    k === "use_google_fonts" || k === "use-google-fonts" ||
    k === "ast_load_google_fonts" || k === "load_google_fonts" ||
    k.includes("google_fonts") || k.includes("google-fonts") ||
    k.includes("google_font") || k.includes("e_google_fonts")
  );
}

/**
 * Walk themeInfo for explicit Active GF flags or real fonts.googleapis/gstatic URL values.
 * Keys named google_fonts with false/0/off are NOT a signal.
 */
function themeSignalsExternalGoogleFonts(themeInfo) {
  if (!themeInfo || typeof themeInfo !== "object") return false;

  if (typeof themeInfo.rawText === "string" && themeInfo.rawText) {
    const t = themeInfo.rawText.toLowerCase();
    if (t.includes("fonts.googleapis.com") || t.includes("fonts.gstatic.com")) return true;
    if (/google[\s_-]*fonts?\s*:\s*(active|aktiv|enabled|enable|on|yes|true|1)\b/.test(t)) return true;
  }

  const stack = [themeInfo];
  const seen = typeof WeakSet !== "undefined" ? new WeakSet() : null;
  let guard = 0;
  while (stack.length && guard < 5000) {
    guard++;
    const node = stack.pop();
    if (!node || typeof node !== "object") continue;
    if (seen) {
      if (seen.has(node)) continue;
      seen.add(node);
    }
    if (Array.isArray(node)) {
      for (let i = 0; i < node.length; i++) stack.push(node[i]);
      continue;
    }
    const keys = Object.keys(node);
    for (let i = 0; i < keys.length; i++) {
      const key = keys[i];
      if (key === "rawText") continue; // handled above with stricter patterns
      const val = node[key];
      if (isGoogleFontsKeyName(key) && isActiveGoogleFontsValue(val)) return true;
      if (typeof val === "string" && (val.toLowerCase().includes("fonts.googleapis.com") || val.toLowerCase().includes("fonts.gstatic.com"))) return true;
      if (val && typeof val === "object") stack.push(val);
    }
  }
  return false;
}

/**
 * True only when Elementor explicitly signals external Google Fonts.
 * v2.7.3: Custom Fonts count is NOT Google Fonts. Stale pre-2.7.2 profiles with
 * google_fonts:true but no explicit google_fonts experiment are treated as false
 * (old default invented Active without a system-info line).
 */
function elementorSignalsExternalGoogleFonts(elemInfo) {
  if (!elemInfo || typeof elemInfo !== "object") return false;

  const exps = Array.isArray(elemInfo.experiments) ? elemInfo.experiments : [];
  const hasExplicitExp = exps.some(e => {
    const low = String(e).toLowerCase().trim();
    if (!low || low.includes("custom font")) return false;
    return (
      low === "google_fonts" ||
      low === "google fonts" ||
      low === "e_google_fonts" ||
      low === "google-typsnitt" ||
      (low.includes("google") && (low.includes("font") || low.includes("typsnitt")))
    );
  });

  const rawTrue = (
    elemInfo.google_fonts === true ||
    elemInfo.google_fonts === "1" ||
    elemInfo.google_fonts === "active" ||
    elemInfo.google_fonts === "enabled"
  );

  // Parser always pushes "google_fonts" into experiments when it sets true from an Active line.
  // true without that mark = stale default from history / pre-2.7.2 — do not invent external GF.
  if (rawTrue && !hasExplicitExp) return false;
  if (rawTrue) return true;

  // experiments-only Active signal (rare JSON imports)
  if (hasExplicitExp && elemInfo.google_fonts !== false && elemInfo.google_fonts !== 0 && elemInfo.google_fonts !== "0") {
    return true;
  }
  return false;
}

/**
 * Sanitize elemInfo in place: clear stale google_fonts:true without explicit experiment.
 * Prefer explicit system-info Active only; never treat Custom Fonts as GF.
 */
function sanitizeElementorGoogleFonts(elemInfo) {
  if (!elemInfo || typeof elemInfo !== "object") return elemInfo;
  if (!elementorSignalsExternalGoogleFonts(elemInfo)) {
    elemInfo.google_fonts = false;
  } else {
    elemInfo.google_fonts = true;
  }
  return elemInfo;
}

/**
 * True when LSCWP Remove Google Fonts is OFF and Elementor or theme signals external GF.
 * Missing / unknown Elementor google_fonts must NOT invent Active (false/unset = no signal).
 * Theme google_fonts:false must NOT invent Active (v2.7.2.1).
 * Stale Elementor google_fonts:true without explicit experiment → no signal (v2.7.3).
 */
function hasExternalGoogleFonts(uploadedSettings, environment) {
  const isLscwpGgFontsRm = uploadedSettings ? (
    uploadedSettings.optm_ggfonts_rm === "1" || uploadedSettings.optm_ggfonts_rm === 1 ||
    uploadedSettings["optm-ggfonts_rm"] === "1" || uploadedSettings["optm-ggfonts_rm"] === 1 ||
    (uploadedSettings.options && (uploadedSettings.options.optm_ggfonts_rm === "1" || uploadedSettings.options["optm-ggfonts_rm"] === "1"))
  ) : false;

  const isElemGg = environment ? (
    elementorSignalsExternalGoogleFonts(environment.elemInfo) ||
    Boolean(environment.hasElementorGoogleFonts)
  ) : false;

  const isThemeGg = environment ? (
    themeSignalsExternalGoogleFonts(environment.themeInfo) ||
    Boolean(environment.hasThemeGoogleFonts)
  ) : false;

  return !isLscwpGgFontsRm && (isElemGg || isThemeGg);
}

// --- SINGLE SOURCE OF TRUTH: OPTION COMPARISON ENGINE ---
function getOptionComparison(opt, uploadedSettings, environment) {
  const hasSettings = !!(uploadedSettings && Object.keys(uploadedSettings).length > 0);
  
  let rawMeasured = null;
  let isMeasured = false;

  // 1. Cross-tool & Environment Multi-Channel Resolution
  if (opt.tool === "woocommerce" || (opt.id && opt.id.startsWith("woo_"))) {
    if (environment && environment.hasWooCommerce && (environment.wooInfo || environment.hpos_enabled !== undefined)) {
      isMeasured = true;
      if (opt.id === "woo_hpos") {
        rawMeasured = (environment.hpos_enabled || (environment.wooInfo && environment.wooInfo.hpos_enabled)) ? "1" : "0";
      } else if (opt.id === "woo_cart_fragments") {
        const isCartOpt = !!(
          environment.cart_fragments_dequeued || 
          (environment.wooInfo && (environment.wooInfo.cart_fragments_dequeued || environment.wooInfo.woo_cart_fragments === "1" || environment.wooInfo.woo_cart_fragments === 1)) ||
          environment.hasSCM ||
          (uploadedSettings && String(uploadedSettings["optm-js_exc"] || uploadedSettings.js_exclude || "").includes("wc-cart-fragments"))
        );
        rawMeasured = isCartOpt ? "1" : "0";
      } else if (opt.id === "woo_transients_cleanup") {
        const isTransClean = !!(
          environment.transients_cleanup_enabled || 
          (environment.wooInfo && (environment.wooInfo.transients_cleanup_enabled || environment.wooInfo.woo_transients_cleanup === "1" || environment.wooInfo.woo_transients_cleanup === 1)) ||
          environment.hasSCM ||
          (uploadedSettings && (uploadedSettings["db_optm_transient"] === "1" || uploadedSettings["db_optm_transient"] === 1))
        );
        rawMeasured = isTransClean ? "1" : "0";
      } else if (environment.wooInfo && environment.wooInfo[opt.id] !== undefined) {
        rawMeasured = environment.wooInfo[opt.id];
      }
    } else {
      isMeasured = false;
    }
  } else if (opt.tool === "wordfence" || (opt.id && opt.id.startsWith("wf_"))) {
    if (environment && environment.wfInfo) {
      isMeasured = true;
      if (opt.id === "wf_ip_header") {
        let rawHeader = environment.wfIpHeader || (environment.wfInfo && (environment.wfInfo.ip_header || environment.wfInfo.howGetIPs)) || "REMOTE_ADDR";
        rawHeader = String(rawHeader).replace(/\s*\([^)]*\)/g, "").trim();
        rawMeasured = rawHeader;
      } else if (opt.id === "wf_disable_live_traffic") {
        const isLiveDisabled = environment.wfLiveTrafficDisabled || (environment.wfInfo && (
          environment.wfInfo.live_traffic === false ||
          environment.wfInfo.liveTrafficEnabled === false ||
          environment.wfInfo.liveTrafficEnabled === "0" ||
          environment.wfInfo.liveTrafficEnabled === 0 ||
          environment.wfInfo.disable_live_traffic === true ||
          environment.wfInfo.live_traffic_disabled === true
        ));
        rawMeasured = isLiveDisabled ? "1" : "0";
      } else if (opt.id === "wf_low_resource") {
        const isLowRes = environment.wfLowResource || (environment.wfInfo && (
          environment.wfInfo.low_resource === true ||
          environment.wfInfo.lowResourceScanSelection === true ||
          environment.wfInfo.lowResourceScanSelection === "1" ||
          environment.wfInfo.lowResourceScanSelection === 1 ||
          environment.wfInfo.low_resource_scan === true
        ));
        rawMeasured = isLowRes ? "1" : "0";
      } else if (environment.wfInfo && environment.wfInfo[opt.id] !== undefined) {
        rawMeasured = environment.wfInfo[opt.id];
      }
    } else if (uploadedSettings && uploadedSettings[opt.id] !== undefined) {
      isMeasured = true;
      rawMeasured = uploadedSettings[opt.id];
    } else {
      isMeasured = false;
    }
  } else if (opt.tool === "elementor" || (opt.id && opt.id.startsWith("elem_"))) {
    if (environment && environment.elemInfo) {
      isMeasured = true;
      if (opt.id === "elem_css_print_method") {
        rawMeasured = (environment.elemInfo.css_print_method === "internal" || environment.elemInfo.css_print_method === "inline") ? "internal" : "external";
      } else if (opt.id === "elem_dom_optimization") {
        rawMeasured = (environment.elemDomOpt || environment.elemInfo.dom_optimization === true || environment.elemInfo.e_dom_optimization === "active" || environment.elemInfo.dom_optimization === 1 || (environment.elemInfo.experiments && environment.elemInfo.experiments.some(e => e.toLowerCase().includes("dom") || e.toLowerCase().includes("optimized_dom")))) ? "1" : "0";
      } else if (opt.id === "elem_asset_loading") {
        // Elementor ≥3.16 / 4.x: Improved Asset Loading är permanent integrerad i Core (Optimal by default)
        const elemVer = (environment.elemVersion || environment.elemInfo.version || "").toString();
        const isModernCore = !elemVer || (typeof compareVersions === "function" ? compareVersions(elemVer, "3.16.0") >= 0 : true);
        if (isModernCore) {
          rawMeasured = "1";
        } else {
          const assetVal = environment.elemInfo.asset_loading;
          const assetExpVal = environment.elemInfo.e_optimized_assets_loading;
          const explicitlyOff = assetVal === false || assetVal === 0 || assetVal === "0" ||
                                assetExpVal === false || assetExpVal === 0 || assetExpVal === "0" ||
                                (typeof assetVal === "string" && /^(inactive|inaktiv|disabled|off|false)$/i.test(assetVal.trim())) ||
                                (typeof assetExpVal === "string" && /inactive|inaktiv|disabled|off/i.test(assetExpVal));
          if (explicitlyOff) {
            rawMeasured = "0";
          } else {
            rawMeasured = (environment.elemAssetLoading || assetVal === true || assetExpVal === "active" || assetVal === 1 || (environment.elemInfo.experiments && environment.elemInfo.experiments.some(e => e.toLowerCase().includes("asset") || e.toLowerCase().includes("optimized_assets")))) ? "1" : "0";
          }
        }
      } else if (opt.id === "elem_css_loading") {
        // Elementor ≥3.16 / 4.x: Improved CSS Loading is built into Core (Optimal by default)
        // Optimal only when NOT explicitly off; false/0/"0"/inactive always count as off (v2.6.10.1)
        const elemVerCss = (environment.elemVersion || environment.elemInfo.version || "").toString();
        const isModernCoreCss = !elemVerCss || (typeof compareVersions === "function" ? compareVersions(elemVerCss, "3.16.0") >= 0 : true);
        const cssVal = environment.elemInfo.css_loading;
        const cssExpVal = environment.elemInfo.e_optimized_css_loading;
        const explicitlyOffCss = cssVal === false || cssVal === 0 || cssVal === "0" ||
                                 cssExpVal === false || cssExpVal === 0 || cssExpVal === "0" ||
                                 (typeof cssVal === "string" && /^(inactive|inaktiv|disabled|off|false)$/i.test(cssVal.trim())) ||
                                 (typeof cssExpVal === "string" && /inactive|inaktiv|disabled|off/i.test(cssExpVal));
        if (explicitlyOffCss) {
          rawMeasured = "0";
        } else if (isModernCoreCss || environment.elemCssLoading || cssVal === true || cssExpVal === "active" || cssVal === 1 || (environment.elemInfo.experiments && environment.elemInfo.experiments.some(e => e.toLowerCase().includes("css") || e.toLowerCase().includes("optimized_css")))) {
          rawMeasured = "1";
        } else {
          rawMeasured = isModernCoreCss ? "1" : "0";
        }
      } else if (opt.id === "elem_lazy_load") {
        rawMeasured = (environment.elemInfo.lazy_load === true || environment.elemInfo.hasLazyLoad === true || environment.elemInfo.e_lazy_load_images === "active") ? "1" : "0";
      } else if (opt.id === "elem_font_icon_svg") {
        rawMeasured = (environment.elemInfo.font_icon_svg === true || environment.elemInfo.e_font_icon_svg === "active" || (environment.elemInfo.experiments && environment.elemInfo.experiments.some(e => e.toLowerCase().includes("font") || e.toLowerCase().includes("icon")))) ? "1" : "0";
      } else if (opt.id === "elem_container") {
        rawMeasured = (environment.elemInfo.container === true || environment.elemInfo.e_nested_elements === "active" || (environment.elemInfo.experiments && environment.elemInfo.experiments.some(e => e.toLowerCase().includes("container")))) ? "1" : "0";
      } else if (environment.elemInfo && environment.elemInfo[opt.id] !== undefined) {
        rawMeasured = environment.elemInfo[opt.id];
      }
    }
  } else if (opt.tool === "server" || (opt.id && (opt.id.startsWith("wp_") || opt.id.startsWith("php_") || opt.id === "disable_wp_cron" || opt.id === "core_server"))) {
    if (environment && (environment.hasSysInfo || environment.wpMemoryLimit || environment.server !== "Okänd")) {
      if (opt.id === "wp_memory_limit") {
        if (environment.wpMemoryLimit && environment.wpMemoryLimit !== "Okänd") {
          isMeasured = true;
          rawMeasured = environment.wpMemoryLimit;
        }
      } else if (opt.id === "wp_max_memory_limit") {
        if (environment.wpMaxMemoryLimit && environment.wpMaxMemoryLimit !== "Okänd") {
          isMeasured = true;
          rawMeasured = environment.wpMaxMemoryLimit;
        }
      } else if (opt.id === "php_memory_limit") {
        if (environment.phpMemoryLimit && environment.phpMemoryLimit !== "Okänd") {
          isMeasured = true;
          rawMeasured = environment.phpMemoryLimit;
        }
      } else if (opt.id === "php_max_input_vars") {
        if (environment.phpMaxInputVars && environment.phpMaxInputVars !== "Okänd") {
          isMeasured = true;
          rawMeasured = String(environment.phpMaxInputVars);
        }
      } else if (opt.id === "php_max_execution_time") {
        if (environment.phpMaxExecutionTime && environment.phpMaxExecutionTime !== "Okänd") {
          isMeasured = true;
          rawMeasured = String(environment.phpMaxExecutionTime);
        }
      } else if (opt.id === "php_max_input_time") {
        if (environment.phpMaxInputTime && environment.phpMaxInputTime !== "Okänd") {
          isMeasured = true;
          rawMeasured = String(environment.phpMaxInputTime);
        }
      } else if (opt.id === "php_post_max_size") {
        if (environment.phpPostMaxSize && environment.phpPostMaxSize !== "Okänd") {
          isMeasured = true;
          rawMeasured = String(environment.phpPostMaxSize);
        }
      } else if (opt.id === "php_upload_max_filesize") {
        if (environment.phpUploadMaxFilesize && environment.phpUploadMaxFilesize !== "Okänd") {
          isMeasured = true;
          rawMeasured = String(environment.phpUploadMaxFilesize);
        }
      } else if (opt.id === "wp_disable_cron" || opt.id === "disable_wp_cron") {
        if (environment.disableWpCron !== undefined) {
          isMeasured = true;
          rawMeasured = environment.disableWpCron ? "1" : "0";
        } else if (environment.wpConstants && (environment.wpConstants.DISABLE_WP_CRON !== undefined || environment.wpConstants.disable_wp_cron !== undefined)) {
          isMeasured = true;
          const cronVal = environment.wpConstants.DISABLE_WP_CRON !== undefined ? environment.wpConstants.DISABLE_WP_CRON : environment.wpConstants.disable_wp_cron;
          rawMeasured = (cronVal === true || cronVal === "true" || cronVal === "1" || cronVal === 1) ? "1" : "0";
        }
      } else if (opt.id === "wp_debug") {
        if (environment.wpDebug !== undefined) {
          isMeasured = true;
          rawMeasured = environment.wpDebug ? "1" : "0";
        }
      } else if (opt.id === "wp_post_revisions") {
        isMeasured = true;
        rawMeasured = environment.wpPostRevisions || "5";
      }
    }
  } else if (opt.tool === "theme" || (opt.id && opt.id.startsWith("theme_"))) {
    const hasThemeSource = !!(environment && (environment.hasThemeInfo || (environment.themeInfo && Object.keys(environment.themeInfo).length > 0) || environment.hasSysInfo || (environment.activeTheme && environment.activeTheme !== "Okänt tema")));
    const hasThemeSettings = !!(uploadedSettings && (uploadedSettings[opt.id] !== undefined || (uploadedSettings.theme && uploadedSettings.theme[opt.id] !== undefined)));

    if (opt.id === "theme_outdated_template_overrides" || opt.id === "theme_template_overrides") {
      if (environment && (environment.hasWooCommerce || environment.hasSysInfo || environment.wooInfo)) {
        isMeasured = true;
        if (!environment.wooInfo || !environment.wooInfo.overrides || !Array.isArray(environment.wooInfo.overrides) || environment.wooInfo.overrides.length === 0) {
          rawMeasured = "0";
        } else {
          const outdatedList = environment.wooInfo.overrides.filter(o => {
            const low = String(o || "").toLowerCase();
            return low.includes("out of date") || low.includes("föråldrad") || low.includes("är föråldrad") || low.includes("outdated");
          });
          rawMeasured = String(outdatedList.length);
        }
      } else {
        isMeasured = false;
      }
    } else if (opt.id === "theme_code_architecture") {
      if (hasThemeSource) {
        isMeasured = true;
        rawMeasured = "1";
      } else {
        isMeasured = false;
      }
    } else if (opt.id === "theme_navigation_menus") {
      if (hasThemeSource) {
        isMeasured = true;
        rawMeasured = (environment && (String(environment.themeFeatures || "").includes("menus") || environment.hasElementor)) ? "1" : "0";
      } else {
        isMeasured = false;
      }
    } else if (opt.id === "theme_header_footer_builder" || opt.id === "theme_elementor_header_footer") {
      if (hasThemeSource) {
        isMeasured = true;
        rawMeasured = (environment && (environment.hasElementor || String(environment.themeFeatures || "").includes("header-footer-elementor") || String(environment.themeFeatures || "").includes("fl-theme-builder"))) ? "1" : "1";
      } else {
        isMeasured = false;
      }
    } else if (opt.id === "theme_typography_fonts" || opt.id === "theme_google_fonts_local" || opt.id === "theme_preload_local_fonts") {
      if (hasThemeSource) {
        isMeasured = true;
        rawMeasured = "1";
      } else {
        isMeasured = false;
      }
    } else if (opt.id === "theme_color_palette") {
      if (hasThemeSource) {
        isMeasured = true;
        rawMeasured = "1";
      } else {
        isMeasured = false;
      }
    } else if (opt.id === "theme_woocommerce_synergy" || opt.id === "theme_woocommerce_minicart_ajax") {
      if (hasThemeSource) {
        isMeasured = true;
        rawMeasured = "1";
      } else {
        isMeasured = false;
      }
    } else if (opt.id === "theme_site_logo") {
      if (hasThemeSource) {
        isMeasured = true;
        rawMeasured = (environment && (String(environment.themeFeatures || "").includes("custom-logo") || environment.hasElementor)) ? "1" : "1";
      } else {
        isMeasured = false;
      }
    } else if (opt.id === "theme_inactive_cleanup") {
      if (hasThemeSource) {
        isMeasured = true;
        const inactives = (environment && environment.inactiveThemes) ? Object.keys(environment.inactiveThemes) : [];
        rawMeasured = inactives.length === 0 ? "0" : String(inactives.length);
      } else {
        isMeasured = false;
      }
    } else if (hasThemeSource || hasThemeSettings) {
      isMeasured = true;
      const tInfo = (environment && environment.themeInfo) || (uploadedSettings && uploadedSettings.theme) || uploadedSettings || {};

      if (opt.id === "theme_dynamic_css_file") {
        rawMeasured = (tInfo.theme_dynamic_css_file !== undefined ? tInfo.theme_dynamic_css_file : (tInfo["file-generation"] !== undefined ? (tInfo["file-generation"] === "file" || tInfo["file-generation"] === true || tInfo["file-generation"] === "1" ? "1" : "0") : (tInfo["dynamic-css-file"] !== undefined ? tInfo["dynamic-css-file"] : (tInfo.css_file_generation !== undefined ? tInfo.css_file_generation : "1"))));
      } else if (tInfo[opt.id] !== undefined) {
        rawMeasured = tInfo[opt.id];
      } else {
        rawMeasured = "1";
      }
    } else {
      isMeasured = false;
    }
  }

  // 2. LiteSpeed Cache & .data Settings Resolution
  // Elementor/Woo/WF/Theme/Server status must NEVER be updated from LSCWP .data
  const isLitespeedTool = !opt.tool || opt.tool === "litespeed" || (opt.id && !opt.id.startsWith("elem_") && !opt.id.startsWith("woo_") && !opt.id.startsWith("wf_") && !opt.id.startsWith("theme_") && !opt.id.startsWith("php_") && !opt.id.startsWith("wp_") && opt.tool !== "elementor" && opt.tool !== "woocommerce" && opt.tool !== "wordfence" && opt.tool !== "theme" && opt.tool !== "server" && opt.tool !== "scm");
  if (!isMeasured && hasSettings && isLitespeedTool) {
    const lscwpKey = (typeof KEY_MAPPING_TO_LSCWP !== "undefined" && KEY_MAPPING_TO_LSCWP[opt.id])
      || (opt.id && opt.id.startsWith("img_optm_") ? ("img_optm-" + opt.id.slice("img_optm_".length)) : opt.id.replace(/_/, "-"));
    
    // 1. Special direct alias & environment resolution for Object Cache
    if (opt.id === "cache_object") {
      if (environment && (environment.hasRedis || environment.isRedisConnected)) {
        isMeasured = true;
        rawMeasured = "1";
      } else if (uploadedSettings["cache-object"] !== undefined || uploadedSettings["object_cache"] !== undefined || uploadedSettings["object"] !== undefined || uploadedSettings["cache-object_kind"] !== undefined || uploadedSettings["cache_object_kind"] !== undefined || uploadedSettings["cache-object_port"] !== undefined || uploadedSettings["cache_object_port"] !== undefined || uploadedSettings["cache_object"] !== undefined) {
        isMeasured = true;
        const oVal = uploadedSettings["cache-object"] !== undefined ? uploadedSettings["cache-object"] : (uploadedSettings["cache_object"] !== undefined ? uploadedSettings["cache_object"] : (uploadedSettings["object_cache"] !== undefined ? uploadedSettings["object_cache"] : (uploadedSettings["object"] !== undefined ? uploadedSettings["object"] : (uploadedSettings["cache-object_kind"] || uploadedSettings["cache_object_kind"]))));
        rawMeasured = (oVal === "1" || oVal === 1 || oVal === true || oVal === "on") ? "1" : (oVal === "0" || oVal === 0 || oVal === false || oVal === "off" ? "0" : "1");
      }
    }
    // 2. Special direct alias & environment resolution for Browser Cache
    else if (opt.id === "cache_browser") {
      if (uploadedSettings["cache-browser"] !== undefined || uploadedSettings["browser_cache"] !== undefined || uploadedSettings["browser"] !== undefined || uploadedSettings["cache-browser_ttl"] !== undefined || uploadedSettings["cache_browser_ttl"] !== undefined || uploadedSettings["cache_browser"] !== undefined) {
        isMeasured = true;
        const bVal = uploadedSettings["cache-browser"] !== undefined ? uploadedSettings["cache-browser"] : (uploadedSettings["cache_browser"] !== undefined ? uploadedSettings["cache_browser"] : (uploadedSettings["browser_cache"] !== undefined ? uploadedSettings["browser_cache"] : (uploadedSettings["browser"] !== undefined ? uploadedSettings["browser"] : (uploadedSettings["cache-browser_ttl"] || uploadedSettings["cache_browser_ttl"]))));
        rawMeasured = (bVal === "1" || bVal === 1 || bVal === true || bVal === "on" || (typeof bVal === "string" && parseInt(bVal, 10) > 0) || (typeof bVal === "number" && bVal > 0)) ? "1" : (bVal === "0" || bVal === 0 || bVal === false || bVal === "off" ? "0" : "1");
      } else if (environment && (environment.hasBrowserCache || environment.hasHtaccessRules)) {
        isMeasured = true;
        rawMeasured = "1";
      }
    }
    // 3. Special direct alias resolution for drop_uri & exclusions
    else if (opt.id === "drop_uri" && (uploadedSettings["cache-exc"] !== undefined || uploadedSettings["cache_exc"] !== undefined || uploadedSettings["cache-drop_uri"] !== undefined || uploadedSettings["cache-uri_exc"] !== undefined || uploadedSettings["drop_uri"] !== undefined)) {
      isMeasured = true;
      rawMeasured = uploadedSettings["cache-exc"] !== undefined ? uploadedSettings["cache-exc"] : (uploadedSettings["cache_exc"] !== undefined ? uploadedSettings["cache_exc"] : (uploadedSettings["drop_uri"] !== undefined ? uploadedSettings["drop_uri"] : (uploadedSettings["cache-drop_uri"] !== undefined ? uploadedSettings["cache-drop_uri"] : uploadedSettings["cache-uri_exc"])));
    }
    else if (opt.id === "media_lazy_exc") {
      if (uploadedSettings["media-lazy_exc"] !== undefined || uploadedSettings["media_lazy_exc"] !== undefined || uploadedSettings["media-lazy-exc"] !== undefined || uploadedSettings["media_lazy_exclude"] !== undefined || uploadedSettings["media-lazy_img_exc"] !== undefined || uploadedSettings["media_lazy_img_exc"] !== undefined) {
        isMeasured = true;
        rawMeasured = uploadedSettings["media-lazy_exc"] !== undefined ? uploadedSettings["media-lazy_exc"] : (uploadedSettings["media_lazy_exc"] !== undefined ? uploadedSettings["media_lazy_exc"] : (uploadedSettings["media-lazy-exc"] !== undefined ? uploadedSettings["media-lazy-exc"] : (uploadedSettings["media_lazy_exclude"] !== undefined ? uploadedSettings["media_lazy_exclude"] : (uploadedSettings["media-lazy_img_exc"] !== undefined ? uploadedSettings["media-lazy_img_exc"] : uploadedSettings["media_lazy_img_exc"]))));
      } else {
        const isLsLazy = uploadedSettings["media-lazy"] === "1" || uploadedSettings["media_lazy"] === "1" || (uploadedSettings.options && (uploadedSettings.options["media-lazy"] === "1" || uploadedSettings.options["media_lazy"] === "1"));
        if (!isLsLazy) {
          isMeasured = true;
          rawMeasured = "";
        }
      }
    }
    else if (opt.id === "js_exclude" && (uploadedSettings["optm-js_exc"] !== undefined || uploadedSettings["optm_js_exc"] !== undefined || uploadedSettings["js_exclude"] !== undefined || uploadedSettings["js-exclude"] !== undefined || uploadedSettings["optm_js_exclude"] !== undefined || uploadedSettings["optm-js-exc"] !== undefined || uploadedSettings["js_exc"] !== undefined)) {
      isMeasured = true;
      rawMeasured = uploadedSettings["optm-js_exc"] !== undefined ? uploadedSettings["optm-js_exc"] : (uploadedSettings["optm_js_exc"] !== undefined ? uploadedSettings["optm_js_exc"] : (uploadedSettings["js_exclude"] !== undefined ? uploadedSettings["js_exclude"] : (uploadedSettings["js-exclude"] !== undefined ? uploadedSettings["js-exclude"] : (uploadedSettings["optm_js_exclude"] !== undefined ? uploadedSettings["optm_js_exclude"] : (uploadedSettings["optm-js-exc"] !== undefined ? uploadedSettings["optm-js-exc"] : uploadedSettings["js_exc"])))));
    }
    else if (opt.id === "css_exclude" && (uploadedSettings["optm-css_exc"] !== undefined || uploadedSettings["optm_css_exc"] !== undefined || uploadedSettings["css_exclude"] !== undefined || uploadedSettings["css-exclude"] !== undefined || uploadedSettings["optm_css_exclude"] !== undefined || uploadedSettings["optm-css-exc"] !== undefined || uploadedSettings["css_exc"] !== undefined)) {
      isMeasured = true;
      rawMeasured = uploadedSettings["optm-css_exc"] !== undefined ? uploadedSettings["optm-css_exc"] : (uploadedSettings["optm_css_exc"] !== undefined ? uploadedSettings["optm_css_exc"] : (uploadedSettings["css_exclude"] !== undefined ? uploadedSettings["css_exclude"] : (uploadedSettings["css-exclude"] !== undefined ? uploadedSettings["css-exclude"] : (uploadedSettings["optm_css_exclude"] !== undefined ? uploadedSettings["optm_css_exclude"] : (uploadedSettings["optm-css-exc"] !== undefined ? uploadedSettings["optm-css-exc"] : uploadedSettings["css_exc"])))));
    }
    else if (opt.id === "js_delayed_exclude") {
      if (uploadedSettings["optm-js_delayed_exc"] !== undefined || uploadedSettings["optm_js_delayed_exc"] !== undefined || uploadedSettings["js_delayed_exclude"] !== undefined || uploadedSettings["js_delayed_exc"] !== undefined) {
        isMeasured = true;
        rawMeasured = uploadedSettings["optm-js_delayed_exc"] !== undefined ? uploadedSettings["optm-js_delayed_exc"] : (uploadedSettings["optm_js_delayed_exc"] !== undefined ? uploadedSettings["optm_js_delayed_exc"] : (uploadedSettings["js_delayed_exclude"] !== undefined ? uploadedSettings["js_delayed_exclude"] : uploadedSettings["js_delayed_exc"]));
      } else {
        const defMode = uploadedSettings["optm-js_defer"] !== undefined ? uploadedSettings["optm-js_defer"] : (uploadedSettings["optm_js_defer"] !== undefined ? uploadedSettings["optm_js_defer"] : "0");
        if (defMode !== "2" && defMode !== 2) {
          isMeasured = true;
          rawMeasured = "";
        }
      }
    }
    else if (opt.id === "media_vpi") {
      if (uploadedSettings["media-vpi"] !== undefined || uploadedSettings["media_vpi"] !== undefined) {
        isMeasured = true;
        rawMeasured = uploadedSettings["media-vpi"] !== undefined ? uploadedSettings["media-vpi"] : uploadedSettings["media_vpi"];
      } else {
        const isLsLazy = uploadedSettings["media-lazy"] === "1" || uploadedSettings["media_lazy"] === "1" || (uploadedSettings.options && (uploadedSettings.options["media-lazy"] === "1" || uploadedSettings.options["media_lazy"] === "1"));
        if (!isLsLazy) {
          isMeasured = true;
          rawMeasured = "0";
        }
      }
    }
    else if (opt.id === "optm_ccss_per_url" || opt.id === "optm_css_async_inline") {
      const aliasKey = opt.id === "optm_ccss_per_url" ? "optm-ccss_per_url" : "optm-css_async_inline";
      if (uploadedSettings[aliasKey] !== undefined || uploadedSettings[opt.id] !== undefined) {
        isMeasured = true;
        rawMeasured = uploadedSettings[aliasKey] !== undefined ? uploadedSettings[aliasKey] : uploadedSettings[opt.id];
      } else {
        const isAsyncCss = uploadedSettings["optm-css_async"] === "1" || uploadedSettings["optm_css_async"] === "1" || (uploadedSettings.options && (uploadedSettings.options["optm-css_async"] === "1" || uploadedSettings.options["optm_css_async"] === "1"));
        if (!isAsyncCss) {
          isMeasured = true;
          rawMeasured = "0";
        }
      }
    }
    else if (opt.id === "optm_ggfonts_async") {
      if (uploadedSettings["optm-ggfonts_async"] !== undefined || uploadedSettings["optm_ggfonts_async"] !== undefined) {
        isMeasured = true;
        rawMeasured = uploadedSettings["optm-ggfonts_async"] !== undefined ? uploadedSettings["optm-ggfonts_async"] : uploadedSettings["optm_ggfonts_async"];
      } else {
        const isGgRm = uploadedSettings["optm-ggfonts_rm"] === "1" || uploadedSettings["optm_ggfonts_rm"] === "1" || (uploadedSettings.options && (uploadedSettings.options["optm-ggfonts_rm"] === "1" || uploadedSettings.options["optm_ggfonts_rm"] === "1"));
        if (isGgRm) {
          isMeasured = true;
          rawMeasured = "0";
        }
      }
    }
    else if (opt.id === "optm_js_defer" && (uploadedSettings["optm-js_defer"] !== undefined || uploadedSettings["optm_js_defer"] !== undefined || uploadedSettings["js_defer"] !== undefined || uploadedSettings["optm-js_delayed"] !== undefined)) {
      isMeasured = true;
      rawMeasured = uploadedSettings["optm-js_defer"] !== undefined ? uploadedSettings["optm-js_defer"] : (uploadedSettings["optm_js_defer"] !== undefined ? uploadedSettings["optm_js_defer"] : (uploadedSettings["js_defer"] !== undefined ? uploadedSettings["js_defer"] : uploadedSettings["optm-js_delayed"]));
    }
    // 4. Direct match on opt.id
    else if (uploadedSettings.hasOwnProperty(opt.id) && uploadedSettings[opt.id] !== undefined && uploadedSettings[opt.id] !== null) {
      // Present key counts as measured — "" / 0 / false are valid (e.g. empty sizes_skipped, AV)
      isMeasured = true;
      rawMeasured = uploadedSettings[opt.id];
    }
    // 5. Direct match on LiteSpeed native key alias (e.g., 'guest', 'cache-priv')
    else if (uploadedSettings.hasOwnProperty(lscwpKey) && uploadedSettings[lscwpKey] !== undefined && uploadedSettings[lscwpKey] !== null) {
      isMeasured = true;
      rawMeasured = uploadedSettings[lscwpKey];
    }
    // 6. Nested within uploadedSettings.options or uploadedSettings.data
    else if (uploadedSettings.options && typeof uploadedSettings.options === "object") {
      if (uploadedSettings.options.hasOwnProperty(opt.id) && uploadedSettings.options[opt.id] !== undefined && uploadedSettings.options[opt.id] !== null) {
        isMeasured = true;
        rawMeasured = uploadedSettings.options[opt.id];
      } else if (uploadedSettings.options.hasOwnProperty(lscwpKey) && uploadedSettings.options[lscwpKey] !== undefined && uploadedSettings.options[lscwpKey] !== null) {
        isMeasured = true;
        rawMeasured = uploadedSettings.options[lscwpKey];
      }
    }
    // 6b. img_optm_* alias + options (runs if still unmeasured; accept "" / 0 / "0" / false)
    if (!isMeasured && opt.id && opt.id.startsWith("img_optm_")) {
      const hyphenForm = (typeof KEY_MAPPING_TO_LSCWP !== "undefined" && KEY_MAPPING_TO_LSCWP[opt.id])
        || ("img_optm-" + opt.id.slice("img_optm_".length));
      const candidates = [opt.id, hyphenForm];
      const pick = (obj) => {
        if (!obj || typeof obj !== "object") return undefined;
        for (const k of candidates) {
          // Key present (own property) → measured, even when value is "" / 0 / "0" / false
          if (Object.prototype.hasOwnProperty.call(obj, k) && obj[k] !== undefined && obj[k] !== null) {
            return obj[k];
          }
        }
        return undefined;
      };
      let v = pick(uploadedSettings);
      if (v === undefined && uploadedSettings.options) v = pick(uploadedSettings.options);
      if (v !== undefined) {
        isMeasured = true;
        rawMeasured = v;
      }
    }
    // 6c. media_webp: if HTML-replace key absent but Next-Gen (img_optm-webp) exists → measure as AV (Next-Gen may cover)
    if (!isMeasured && opt.id === "media_webp") {
      const pickOwn = (obj, keys) => {
        if (!obj || typeof obj !== "object") return undefined;
        for (const k of keys) {
          if (Object.prototype.hasOwnProperty.call(obj, k) && obj[k] !== undefined && obj[k] !== null) {
            return obj[k];
          }
        }
        return undefined;
      };
      const imgKeys = ["img_optm_webp", "img_optm-webp"];
      let imgVal = pickOwn(uploadedSettings, imgKeys);
      if (imgVal === undefined && uploadedSettings.options) imgVal = pickOwn(uploadedSettings.options, imgKeys);
      if (imgVal !== undefined) {
        const mediaKeys = ["media_webp", "media-webp"];
        let mediaVal = pickOwn(uploadedSettings, mediaKeys);
        if (mediaVal === undefined && uploadedSettings.options) mediaVal = pickOwn(uploadedSettings.options, mediaKeys);
        isMeasured = true;
        // Absent HTML replacement = off; display branch shows "AV (Next-Gen täcker)" when nextGenOn
        rawMeasured = mediaVal !== undefined ? mediaVal : "0";
      }
    }
    // 6d. crawler_usleep: if usleep key absent but crawler is present and OFF → measure inactive
    // Prefer inactive-when-crawler-off only; crawler ON + usleep absent → leave unmeasured (honest)
    if (!isMeasured && opt.id === "crawler_usleep") {
      const pickOwn = (obj, keys) => {
        if (!obj || typeof obj !== "object") return undefined;
        for (const k of keys) {
          if (Object.prototype.hasOwnProperty.call(obj, k) && obj[k] !== undefined && obj[k] !== null) {
            return obj[k];
          }
        }
        return undefined;
      };
      const usleepKeys = ["crawler_usleep", "crawler-usleep", "crawler-crawl_interval", "crawler_crawl_interval"];
      let usleepVal = pickOwn(uploadedSettings, usleepKeys);
      if (usleepVal === undefined && uploadedSettings.options) usleepVal = pickOwn(uploadedSettings.options, usleepKeys);
      if (usleepVal !== undefined) {
        isMeasured = true;
        rawMeasured = usleepVal;
      } else {
        const crawlerKeys = ["crawler"];
        let cVal = pickOwn(uploadedSettings, crawlerKeys);
        if (cVal === undefined && uploadedSettings.options) cVal = pickOwn(uploadedSettings.options, crawlerKeys);
        if (cVal !== undefined) {
          const crawlerOff = (cVal === "0" || cVal === 0 || cVal === false || cVal === "off" || cVal === "Off");
          if (crawlerOff) {
            isMeasured = true;
            rawMeasured = "0";
          }
          // crawler ON but usleep absent → leave unmeasured
        }
      }
    }
    // 7. v2.6.9: Do NOT invent measurements from LSCWP_NATIVE_DEFAULTS.
    // Missing keys stay unmeasured (unknown) — never false Optimal.
  }

  const isTextarea = opt.id === "drop_uri" || opt.id === "js_exclude" || opt.id === "css_exclude" || opt.id === "media_lazy_exc" || opt.id === "js_delayed_exclude" || opt.id === "optm_dns_prefetch";
  const rec = opt.recommendedRaw;
  const recNorm = (rec === "1" || rec === 1 || rec === "on" || rec === true || rec === "swap") ? 1 : (typeof rec === "string" ? rec : 0);

  if (!isMeasured) {
    let unmeasuredLabel = "⚪ Ej inläst";
    if (opt.tool === "theme" || (opt.id && opt.id.startsWith("theme_"))) unmeasuredLabel = "⚪ Ej inläst (Slot 4)";
    else if (opt.tool === "elementor" || (opt.id && opt.id.startsWith("elem_"))) unmeasuredLabel = "⚪ Ej inläst (Slot 5)";
    else if (opt.tool === "woocommerce" || (opt.id && opt.id.startsWith("woo_"))) unmeasuredLabel = "⚪ Ej inläst (Slot 2)";
    else if (opt.tool === "wordfence" || (opt.id && opt.id.startsWith("wf_"))) unmeasuredLabel = "⚪ Ej inläst (Slot 3)";
    else if (opt.tool === "server") unmeasuredLabel = "⚪ Ej inläst (Slot 1)";
    else if (opt.tool === "scm") unmeasuredLabel = "⚪ Ej inläst (Slot 6)";
    else unmeasuredLabel = "⚪ Ej inläst (Slot 7)";

    return {
      id: opt.id,
      title: opt.title,
      tool: opt.tool || "litespeed",
      criticalLevel: opt.criticalLevel || "standard",
      hasUploadedSettings: hasSettings,
      isMeasured: false,
      status: "unmeasured",
      statusLabel: unmeasuredLabel,
      currentDisplay: "Ej inläst",
      recommendedDisplay: isTextarea ? "Komplett LS-rek" : (opt.id === "optm_js_defer" ? (rec == 2 ? "PÅ (Delayed)" : (rec == 1 ? "PÅ (Deferred)" : "AV")) : (recNorm === 1 ? "PÅ" : (typeof rec === "string" ? rec : "AV"))),
      isMatches: false,
      isDeviant: false,
      isCritical: opt.criticalLevel === "critical",
      rawMeasured: null,
      rawRecommended: rec
    };
  }

  let isMatches = false;
  let currentDisplay = "";
  let recommendedDisplay = "";

  let missingExclusions = [];
  let fulfilledExclusions = [];

  if (isTextarea) {
    recommendedDisplay = "Komplett LS-rek";
    missingExclusions = checkMissingExclusions(rawMeasured, rec);
    fulfilledExclusions = getFulfilledExclusions(rawMeasured, rec);

    if (opt.id === "js_delayed_exclude") {
      // In LiteSpeed Cache Advanced Preset, optm_js_defer is 1 (Deferred).
      // JS Delayed Excludes is only active if optm_js_defer is set to 2 (Delayed).
      const currentDeferMode = (uploadedSettings && (uploadedSettings.optm_js_defer !== undefined ? uploadedSettings.optm_js_defer : uploadedSettings["optm-js_defer"])) || 0;
      const isDelayActive = currentDeferMode === "2" || currentDeferMode === 2;
      const isDeferActive = currentDeferMode === "1" || currentDeferMode === 1;
      
      if (!isDelayActive) {
        isMatches = true;
        currentDisplay = isDeferActive ? "Inaktiv (Defer aktiv)" : "Inaktiv (Delay ej aktiv)";
        missingExclusions = [];
      } else {
        isMatches = missingExclusions.length === 0;
        currentDisplay = isMatches ? "Matchar LS-rek" : "Avviker från LS-rek";
      }
    } else if (opt.id === "media_lazy_exc") {
      const isLscwpLazy = uploadedSettings ? (
        uploadedSettings.media_lazy === "1" || uploadedSettings.media_lazy === 1 ||
        uploadedSettings["media-lazy"] === "1" || uploadedSettings["media-lazy"] === 1 ||
        (uploadedSettings.options && (uploadedSettings.options.media_lazy === "1" || uploadedSettings.options["media-lazy"] === "1"))
      ) : false;

      if (!isLscwpLazy) {
        isMatches = true;
        currentDisplay = "Inaktiv (WP Native aktiv / LSCWP Lazy AV)";
        missingExclusions = [];
      } else {
        isMatches = missingExclusions.length === 0;
        currentDisplay = isMatches ? "Matchar LS-rek" : "Avviker från LS-rek";
      }
    } else if (opt.id === "drop_uri") {
      const cleanVal = (rawMeasured || "").toString().toLowerCase().replace(/[\^\$]/g, "");
      const hasCheckout = cleanVal.includes("checkout") || cleanVal.includes("kassa") || cleanVal.includes("kassan") || cleanVal.includes("kco") || cleanVal.includes("kustom");
      const hasCart = cleanVal.includes("cart") || cleanVal.includes("varukorg") || cleanVal.includes("kundvagn");
      const hasAccount = cleanVal.includes("my-account") || cleanVal.includes("mitt-konto") || cleanVal.includes("account") || cleanVal.includes("konto");
      // For WooCommerce sites, BOTH checkout, cart and my-account exclusions are strictly required
      if (environment && environment.hasWooCommerce) {
        isMatches = hasCheckout && hasCart && hasAccount;
        const missingParts = [];
        if (!hasCheckout) missingParts.push("kassa");
        if (!hasCart) missingParts.push("varukorg");
        if (!hasAccount) missingParts.push("mitt-konto");
        currentDisplay = isMatches 
          ? "Matchar LS-rek (Kassa, Varukorg & Konto)" 
          : `Saknas i drop_uri: ${missingParts.join(", ")}`;
      } else {
        // Non-WooCommerce site: does not require checkout/cart exclusions
        isMatches = true;
        currentDisplay = (rawMeasured && rawMeasured.toString().trim().length > 0) ? "Matchar LS-rek (Anpassad)" : "Standard (Ej e-handel)";
      }
    } else if (opt.id === "optm_dns_prefetch") {
      // Soft-match satellit: när Remove GF är PÅ eller inga externa GF bekräftats → Optimal/Inaktiv
      // (samma hasExternalGoogleFonts-helper som optm_ggfonts_async).
      const hasExternalGg = hasExternalGoogleFonts(uploadedSettings, environment);
      if (!hasExternalGg) {
        isMatches = true;
        currentDisplay = "Inaktiv (inga externa Google Fonts)";
        recommendedDisplay = "Inaktiv (inga externa Google Fonts)";
        missingExclusions = [];
      } else {
        isMatches = missingExclusions.length === 0;
        currentDisplay = isMatches ? "Matchar LS-rek" : "Avviker från LS-rek";
        recommendedDisplay = "Komplett LS-rek (fonts.googleapis / fonts.gstatic)";
      }
    } else {
      isMatches = missingExclusions.length === 0;
      currentDisplay = isMatches ? "Matchar LS-rek" : "Avviker från LS-rek";
    }
  } else if (opt.id === "wp_memory_limit" || opt.id === "wp_max_memory_limit" || opt.id === "php_memory_limit" || opt.id === "php_post_max_size" || opt.id === "php_upload_max_filesize") {
    const memMB = parseMemoryMB(rawMeasured);
    if (opt.id === "wp_memory_limit") {
      isMatches = memMB !== null && memMB >= 256;
      currentDisplay = String(rawMeasured);
      recommendedDisplay = "512M (min 256M)";
    } else if (opt.id === "wp_max_memory_limit") {
      isMatches = memMB !== null && memMB >= 256;
      currentDisplay = String(rawMeasured);
      recommendedDisplay = "512M (min 256M)";
    } else if (opt.id === "php_memory_limit") {
      isMatches = memMB !== null && memMB >= 512;
      currentDisplay = String(rawMeasured);
      recommendedDisplay = "512M (min 512M)";
    } else if (opt.id === "php_post_max_size" || opt.id === "php_upload_max_filesize") {
      isMatches = memMB !== null && memMB >= 128;
      currentDisplay = String(rawMeasured);
      recommendedDisplay = "128M (min 128M)";
    }
  } else if (opt.id === "php_max_input_vars") {
    const vars = parseInt(rawMeasured, 10);
    isMatches = !isNaN(vars) && vars >= 5000;
    currentDisplay = String(rawMeasured);
    recommendedDisplay = "5000+ (min 5000)";
  } else if (opt.id === "php_max_execution_time" || opt.id === "php_max_input_time") {
    const secs = parseInt(rawMeasured, 10);
    isMatches = (!isNaN(secs) && (secs >= 300 || secs === -1 || secs === 0));
    currentDisplay = (secs === 0 || secs === -1) ? "Obegränsat (0s)" : String(rawMeasured) + (String(rawMeasured).endsWith("s") ? "" : "s");
    recommendedDisplay = "300s (min 300s)";
  } else if (opt.id === "wp_debug") {
    const isDeb = (rawMeasured === "1" || rawMeasured === 1 || rawMeasured === true || rawMeasured === "true");
    isMatches = !isDeb;
    currentDisplay = isDeb ? "PÅ (Risk)" : "AV (Optimalt)";
    recommendedDisplay = "AV";
  } else if (opt.id === "elem_lazy_load") {
    const isLz = (rawMeasured === "1" || rawMeasured === 1 || rawMeasured === true || rawMeasured === "true");
    isMatches = !isLz;
    currentDisplay = isLz ? "PÅ (Risk CLS)" : "AV (Optimalt)";
    recommendedDisplay = "AV";
  } else if (opt.id === "optm_js_defer") {
    let measVal = 0;
    if (rawMeasured === "2" || rawMeasured === 2) measVal = 2;
    else if (rawMeasured === "1" || rawMeasured === 1 || rawMeasured === "on" || rawMeasured === true) measVal = 1;
    
    let targetVal = 0;
    if (rec === "2" || rec === 2) targetVal = 2;
    else if (rec === "1" || rec === 1 || rec === "on" || rec === true) targetVal = 1;

    isMatches = (measVal === targetVal);
    currentDisplay = measVal === 2 ? "PÅ (Delayed)" : (measVal === 1 ? "PÅ (Deferred)" : "AV");
    recommendedDisplay = targetVal === 2 ? "PÅ (Delayed)" : (targetVal === 1 ? "PÅ (Deferred)" : "AV");
  } else if (opt.id === "elem_css_print_method") {
    const rawVal = String(rawMeasured || "").toLowerCase();
    const isExt = rawVal.includes("external") || rawVal.includes("extern");
    isMatches = isExt;
    currentDisplay = isExt ? "Extern fil (Optimalt)" : "Inbäddad/Inline (Risk)";
    recommendedDisplay = "Extern fil";
  } else if (opt.id === "cache_priv") {
    // Policy/context setting — ON for members/B2B portals, OFF for typical admin-only sites.
    // When site type is unknown, do NOT hard-flag deviation (cite Online Media Masters).
    const measNormPriv = (rawMeasured === "1" || rawMeasured === 1 || rawMeasured === "on" || rawMeasured === true) ? 1 : 0;
    const isMembersLike = !!(environment && (environment.isMembershipSite || environment.isB2B || environment.hasMembershipPlugin ||
      (environment.activeTheme && /maximera|member|portal|b2b/i.test(String(environment.activeTheme))) ||
      (environment.detectedSiteUrl && /maximera|member|portal|b2b/i.test(String(environment.detectedSiteUrl))) ||
      (environment.activePlugins && environment.activePlugins.some(p => /member|restrict|wishlist|b2b|wholesale/i.test(String(p))))));
    const siteTypeKnown = isMembersLike || !!(environment && environment.siteTypeKnown === true);
    if (isMembersLike) {
      isMatches = measNormPriv === 1;
      currentDisplay = measNormPriv === 1 ? "PÅ (Medlems/B2B)" : "AV";
      recommendedDisplay = "PÅ (Medlems/B2B)";
    } else if (!siteTypeKnown) {
      // Unknown site type → policy/context, never hard deviation
      isMatches = true;
      currentDisplay = measNormPriv === 1 ? "PÅ (policy/context)" : "AV (policy/context)";
      recommendedDisplay = "Policy: PÅ medlems/B2B · AV admin-only";
    } else {
      isMatches = measNormPriv === 0;
      currentDisplay = measNormPriv === 1 ? "PÅ" : "AV (admin-only)";
      recommendedDisplay = "AV (typisk admin-only)";
    }

  } else if (opt.id === "media_lazy") {
    // WP Native Lazy (media_lazy AV / 0): always Optimal/Policy — no score hit for intentional WP Native.
    // LiteSpeed Lazy ON is evaluated against Elementor-aware recommendation (AV when Elementor present).
    const measLazy = (rawMeasured === "1" || rawMeasured === 1 || rawMeasured === "on" || rawMeasured === true) ? 1 : 0;
    const targetLazy = (rec === "1" || rec === 1 || rec === "on" || rec === true) ? 1 : 0;
    if (measLazy === 0) {
      isMatches = true;
      currentDisplay = "AV (WP Native Lazy)";
      recommendedDisplay = "AV (WP Native) · eller PÅ med LCP-exclude";
    } else {
      isMatches = (measLazy === targetLazy);
      currentDisplay = "PÅ (LiteSpeed Lazy)";
      recommendedDisplay = targetLazy === 1 ? "PÅ (med LCP-exclude)" : "AV (WP Native / undvik dubbel lazy)";
    }

  } else if (opt.id === "optm_ggfonts_rm") {
    // Policy setting: PÅ om sajten blockerar Google Fonts / kör lokala typsnitt (GDPR-säkert).
    // AV om Google Fonts används på sajten.
    // Oavsett om användaren har PÅ eller AV är det ett avsiktligt val — aldrig hård avvikelse eller poängavdrag!
    const measNormGg = (rawMeasured === "1" || rawMeasured === 1 || rawMeasured === "on" || rawMeasured === true) ? 1 : 0;
    isMatches = true;
    currentDisplay = measNormGg === 1 ? "PÅ (GDPR / Lokala fonter)" : "AV (Google Fonts tillåts)";
    recommendedDisplay = "Policy: PÅ för lokala fonter · AV om externa används";

  } else if (opt.id === "media_vpi") {
    // VPI (Viewport Images) är enbart meningsfullt om LiteSpeed Lazy Load faktiskt är aktivt.
    // Om LiteSpeed Lazy Load är AV (media_lazy === 0) kör sajten WP Native Lazy.
    // Då är media_vpi = AV helt optimalt och ger 0 avvikelse.
    const isLscwpLazy = uploadedSettings ? (
      uploadedSettings.media_lazy === "1" || uploadedSettings.media_lazy === 1 ||
      uploadedSettings["media-lazy"] === "1" || uploadedSettings["media-lazy"] === 1 ||
      (uploadedSettings.options && (uploadedSettings.options.media_lazy === "1" || uploadedSettings.options["media-lazy"] === "1"))
    ) : false;

    const measVpi = (rawMeasured === "1" || rawMeasured === 1 || rawMeasured === "on" || rawMeasured === true) ? 1 : 0;

    if (!isLscwpLazy) {
      isMatches = true;
      currentDisplay = measVpi === 1 ? "PÅ (Ej nödvändig vid WP Native)" : "AV (Optimalt vid WP Native)";
      recommendedDisplay = "AV (Inaktiv vid WP Native Lazy)";
    } else {
      isMatches = (measVpi === 1);
      currentDisplay = measVpi === 1 ? "PÅ" : "AV";
      recommendedDisplay = "PÅ";
    }

  } else if (opt.id === "optm_ccss_per_url" || opt.id === "optm_css_async_inline") {
    // Kontextberoende CSS-satelliter: CCSS per URL och Inline CSS Async Lib är endast relevanta när Load CSS Asynchronously är PÅ.
    // När Async CSS är AV (0) krävs inte dessa satelliter och ska inte flaggas som avvikelser.
    const isCssAsyncActive = uploadedSettings ? (
      uploadedSettings.optm_css_async === "1" || uploadedSettings.optm_css_async === 1 ||
      uploadedSettings["optm-css_async"] === "1" || uploadedSettings["optm-css_async"] === 1 ||
      (uploadedSettings.options && (uploadedSettings.options.optm_css_async === "1" || uploadedSettings.options["optm-css_async"] === "1"))
    ) : false;

    const measSat = (rawMeasured === "1" || rawMeasured === 1 || rawMeasured === "on" || rawMeasured === true) ? 1 : 0;

    if (!isCssAsyncActive) {
      isMatches = true;
      currentDisplay = measSat === 1 ? "PÅ (Ej nödvändig vid Async CSS AV)" : "AV (Inaktiv vid Async CSS AV)";
      recommendedDisplay = "AV (Inaktiv vid Async CSS AV)";
    } else {
      isMatches = (measSat === 1);
      currentDisplay = measSat === 1 ? "PÅ" : "AV";
      recommendedDisplay = "PÅ";
    }

  } else if (opt.id === "optm_ggfonts_async") {
    // Ladda Google Fonts asynkront är endast relevant om externa Google Fonts faktiskt används på sajten.
    // Delad helper med optm_dns_prefetch så satelliterna inte kan motsäga varandra.
    const hasExternalGg = hasExternalGoogleFonts(uploadedSettings, environment);
    const measGgAsync = (rawMeasured === "1" || rawMeasured === 1 || rawMeasured === "on" || rawMeasured === true) ? 1 : 0;

    if (!hasExternalGg) {
      isMatches = true;
      currentDisplay = measGgAsync === 1 ? "PÅ (Ej nödvändig utan Google Fonts)" : "AV (Inaktiv utan Google Fonts)";
      recommendedDisplay = "Inaktiv (inga externa Google Fonts)";
    } else {
      isMatches = (measGgAsync === 1);
      currentDisplay = measGgAsync === 1 ? "PÅ" : "AV";
      recommendedDisplay = "PÅ";
    }

  } else if (opt.id === "domain_key") {
    const rawKey = String(rawMeasured !== null && rawMeasured !== undefined ? rawMeasured : "").trim();
    const connected = rawKey.length > 5 && rawKey !== "0" && rawKey !== "1";
    isMatches = true; // status/read-only — never score
    currentDisplay = connected ? ("Ansluten (" + maskSecretKey(rawKey) + ")") : "Ej ansluten";
    recommendedDisplay = "QUIC.cloud Domain Key (maskad)";

  } else if (opt.id === "cdn" || opt.id === "cdn_quic" || opt.id === "cdn_cloudflare") {
    const meas = (rawMeasured === "1" || rawMeasured === 1 || rawMeasured === "on" || rawMeasured === true) ? 1 : 0;
    isMatches = true; // status/policy — no score hit
    currentDisplay = meas === 1 ? "PÅ" : "AV";
    recommendedDisplay = "Status (Policy/Context)";
    if (opt.id === "cdn_quic") {
      const liveEval = evaluateQuicCloudLiveEdge({
        cdnQuic: meas,
        domainKey: uploadedSettings && (uploadedSettings.domain_key || uploadedSettings.hash),
        liveHeaders: (environment && environment.quicLiveHeaders !== undefined)
          ? environment.quicLiveHeaders
          : (uploadedSettings && uploadedSettings._quic_live_headers),
        siteUrl: (environment && environment.detectedSiteUrl) ||
          (uploadedSettings && (uploadedSettings.site_url || uploadedSettings.home_url)) || null
      });
      currentDisplay = liveEval.displayLabel;
      if (liveEval.status === "confirmed") {
        recommendedDisplay = "PÅ när live-edge (x-qc-*) bekräftad";
      } else if (meas === 1) {
        recommendedDisplay = "Policy: Domain Key ≠ CDN-edge — verifiera x-qc-*";
      }
    }

  } else if (opt.id === "img_optm_auto") {
    const hasQuic = !!(uploadedSettings && (
      (typeof uploadedSettings.domain_key === "string" && uploadedSettings.domain_key.length > 5) ||
      (typeof uploadedSettings.hash === "string" && uploadedSettings.hash.length > 5)
    ));
    const meas = (rawMeasured === "1" || rawMeasured === 1 || rawMeasured === "on" || rawMeasured === true) ? 1 : 0;
    if (hasQuic) {
      isMatches = (meas === 1);
      currentDisplay = meas === 1 ? "PÅ" : "AV";
      recommendedDisplay = "PÅ (QUIC ansluten)";
    } else {
      isMatches = true; // soft without key
      currentDisplay = meas === 1 ? "PÅ (utan QUIC-nyckel)" : "AV (policy/context)";
      recommendedDisplay = "Policy: PÅ när QUIC ansluten";
    }

  } else if (opt.id === "img_optm_rm_bkup") {
    const meas = (rawMeasured === "1" || rawMeasured === 1 || rawMeasured === "on" || rawMeasured === true) ? 1 : 0;
    // AV recommended; PÅ is informational (🚨 alert elsewhere), not score collapse
    isMatches = true;
    currentDisplay = meas === 1 ? "PÅ (🚨 oåterkalleligt)" : "AV";
    recommendedDisplay = "AV (behåll säkerhetskopior)";

  } else if (opt.id === "img_optm_lossless" || opt.id === "img_optm_exif" || opt.id === "img_optm_sizes_skipped" || opt.id === "img_optm_webp_attr") {
    // Policy / soft — never hard deviation score
    isMatches = true;
    if (opt.id === "img_optm_sizes_skipped" || opt.id === "img_optm_webp_attr") {
      const rawStr = String(rawMeasured !== null && rawMeasured !== undefined ? rawMeasured : "").trim();
      const lines = rawStr ? rawStr.split(/[\r\n]+/).map(l => l.trim()).filter(Boolean).length : 0;
      currentDisplay = lines > 0 ? ("Lista (" + lines + " rader)") : "Tom / Standard";
      recommendedDisplay = "Policy / LS-standardlista";
    } else {
      const meas = (rawMeasured === "1" || rawMeasured === 1 || rawMeasured === "on" || rawMeasured === true) ? 1 : 0;
      currentDisplay = meas === 1 ? "PÅ" : "AV";
      recommendedDisplay = "Policy/Context";
    }

  } else if (opt.id === "img_optm_webp") {
    // Next-Gen format: 0=AV, 1=WebP, 2=AVIF — WebP (1) rek; soft/policy, avoid double yellow with media_webp
    let measVal = 0;
    if (rawMeasured === "2" || rawMeasured === 2) measVal = 2;
    else if (rawMeasured === "1" || rawMeasured === 1 || rawMeasured === "on" || rawMeasured === true) measVal = 1;
    const mediaWebpOn = !!(uploadedSettings && (
      uploadedSettings.media_webp === "1" || uploadedSettings.media_webp === 1 ||
      uploadedSettings["media-webp"] === "1" || uploadedSettings["media-webp"] === 1
    ));
    // Soft match: if WebP generation ON (1) OR media HTML replace ON with same intent → Optimal
    if (measVal === 1 || (measVal === 0 && mediaWebpOn)) {
      isMatches = true;
    } else if (measVal === 2) {
      isMatches = true; // AVIF intentional / paid — policy
    } else {
      isMatches = true; // policy default — no hard yellow; info alert if needed
    }
    currentDisplay = measVal === 2 ? "AVIF (2)" : (measVal === 1 ? "WebP (1)" : "AV (0)");
    recommendedDisplay = "WebP (1) · Policy";

  } else if (opt.id === "img_optm_ori" || opt.id === "img_optm_webp_replace_srcset") {
    const meas = (rawMeasured === "1" || rawMeasured === 1 || rawMeasured === "on" || rawMeasured === true) ? 1 : 0;
    const target = (rec === "1" || rec === 1 || rec === "on" || rec === true) ? 1 : 0;
    // Soft/policy — scoreImpact 0 via isMatches true when aligned OR context
    const nextGenOn = !!(uploadedSettings && (
      uploadedSettings.img_optm_webp === "1" || uploadedSettings.img_optm_webp === 1 || uploadedSettings.img_optm_webp === "2" || uploadedSettings.img_optm_webp === 2 ||
      uploadedSettings["img_optm-webp"] === "1" || uploadedSettings["img_optm-webp"] === 1 || uploadedSettings["img_optm-webp"] === "2" || uploadedSettings["img_optm-webp"] === 2
    ));
    if (opt.id === "img_optm_webp_replace_srcset" && !nextGenOn && meas === 0) {
      isMatches = true;
      currentDisplay = "AV (Inaktiv utan Next-Gen)";
      recommendedDisplay = "PÅ om Next-Gen PÅ";
    } else {
      isMatches = true; // policy — avoid score collapse
      currentDisplay = meas === 1 ? "PÅ" : "AV";
      recommendedDisplay = target === 1 ? "PÅ (Policy)" : "AV (Policy)";
    }

  } else if (opt.id === "media_webp") {
    // HTML replacement vs QUIC next-gen generation — soft match when either path fulfills intent
    const meas = (rawMeasured === "1" || rawMeasured === 1 || rawMeasured === "on" || rawMeasured === true) ? 1 : 0;
    const _opts = uploadedSettings && uploadedSettings.options && typeof uploadedSettings.options === "object" ? uploadedSettings.options : null;
    const imgOptmWebp = uploadedSettings ? (
      uploadedSettings.img_optm_webp !== undefined && uploadedSettings.img_optm_webp !== null ? uploadedSettings.img_optm_webp :
      (uploadedSettings["img_optm-webp"] !== undefined && uploadedSettings["img_optm-webp"] !== null ? uploadedSettings["img_optm-webp"] :
      (_opts && _opts.img_optm_webp !== undefined && _opts.img_optm_webp !== null ? _opts.img_optm_webp :
      (_opts && _opts["img_optm-webp"] !== undefined && _opts["img_optm-webp"] !== null ? _opts["img_optm-webp"] : null)))
    ) : null;
    const nextGenOn = (imgOptmWebp === "1" || imgOptmWebp === 1 || imgOptmWebp === "2" || imgOptmWebp === 2);
    if (meas === 1 || nextGenOn) {
      isMatches = true;
      currentDisplay = meas === 1 ? "PÅ (HTML-ersättning)" : "AV (Next-Gen täcker)";
    } else {
      isMatches = true; // soft — prefer info over yellow double-flag
      currentDisplay = "AV";
    }
    recommendedDisplay = "PÅ (HTML) · eller Next-Gen";

  } else if (opt.id === "crawler") {
    // LiteSpeed server + crawler OFF → Policy/Context (shared/unknown hosting; ingen tillförlitlig VPS-signal).
    // Crawler ON → Optimal. Non-LS rekommenderar AV (befintligt beteende).
    const measCrawl = (rawMeasured === "1" || rawMeasured === 1 || rawMeasured === "on" || rawMeasured === true) ? 1 : 0;
    const isLs = !!(environment && environment.isLiteSpeedServer);
    if (isLs) {
      if (measCrawl === 1) {
        isMatches = true;
        currentDisplay = "PÅ";
        recommendedDisplay = "PÅ";
      } else {
        isMatches = true; // Policy — not hard Avvikelse; scoreImpact already 0
        currentDisplay = "AV (Policy: valfri på shared)";
        recommendedDisplay = "Policy: valfri på shared; rekommenderas på VPS/dedicated om hosten tillåter";
      }
    } else {
      isMatches = (measCrawl === 0);
      currentDisplay = measCrawl === 1 ? "PÅ" : "AV";
      recommendedDisplay = "AV";
    }

  } else if (opt.id === "crawler_usleep") {
    const pickCrawler = (obj) => {
      if (!obj || typeof obj !== "object") return undefined;
      if (Object.prototype.hasOwnProperty.call(obj, "crawler") && obj.crawler !== undefined && obj.crawler !== null) return obj.crawler;
      return undefined;
    };
    let cVal = uploadedSettings ? pickCrawler(uploadedSettings) : undefined;
    if (cVal === undefined && uploadedSettings && uploadedSettings.options) cVal = pickCrawler(uploadedSettings.options);
    const crawlerOn = (cVal === "1" || cVal === 1 || cVal === true || cVal === "on");
    const crawlerOff = (cVal === "0" || cVal === 0 || cVal === false || cVal === "off" || cVal === "Off");
    if (!crawlerOn && (crawlerOff || rawMeasured === "0" || rawMeasured === 0 || rawMeasured === "")) {
      isMatches = true;
      currentDisplay = "Inaktiv (Crawler AV)";
      recommendedDisplay = "Inaktiv när Crawler AV";
    } else {
      currentDisplay = String(rawMeasured !== null && rawMeasured !== undefined ? rawMeasured : "Ej satt");
      recommendedDisplay = String(rec) + " µs";
      const n = Number(rawMeasured);
      const r = Number(rec);
      isMatches = (!isNaN(n) && !isNaN(r)) ? (n === r) : (String(rawMeasured) === String(rec));
    }

  } else if (typeof rec === "string" && rec !== "1" && rec !== "0") {
    const rawStr = String(rawMeasured !== null && rawMeasured !== undefined ? rawMeasured : "").trim().toLowerCase();
    const recStr = String(rec || "").trim().toLowerCase();
    isMatches = rawStr !== "" && (rawStr.includes(recStr) || recStr.includes(rawStr));
    currentDisplay = String(rawMeasured !== null && rawMeasured !== undefined ? rawMeasured : "Ej satt");
    recommendedDisplay = String(rec);
  } else {
    const measNorm = (rawMeasured === "1" || rawMeasured === 1 || rawMeasured === "on" || rawMeasured === true) ? 1 : 0;
    const targetNorm = (rec === "1" || rec === 1 || rec === "on" || rec === true) ? 1 : 0;
    isMatches = measNorm === targetNorm;
    currentDisplay = measNorm === 1 ? "PÅ" : "AV";
    recommendedDisplay = targetNorm === 1 ? "PÅ" : "AV";
  }

  const isPolicyContext = (opt.id === "cache_priv" && isMatches && String(currentDisplay).includes("policy")) || (opt.id === "optm_ggfonts_rm") || (opt.id === "media_lazy" && isMatches && String(currentDisplay).includes("WP Native")) || (opt.id === "cdn" || opt.id === "cdn_quic" || opt.id === "cdn_cloudflare" || opt.id === "domain_key" || opt.id === "img_optm_lossless" || opt.id === "img_optm_exif" || opt.id === "img_optm_sizes_skipped" || opt.id === "img_optm_webp_attr" || opt.id === "img_optm_rm_bkup" || opt.id === "img_optm_webp" || opt.id === "img_optm_ori" || opt.id === "img_optm_webp_replace_srcset" || (opt.id === "img_optm_auto" && String(currentDisplay).toLowerCase().includes("policy")) || (opt.id === "media_webp" && isMatches) || (opt.id === "crawler" && isMatches && String(currentDisplay).includes("Policy")) || (opt.id === "crawler_usleep" && isMatches && String(currentDisplay).includes("Inaktiv")));

  return {
    id: opt.id,
    title: opt.title,
    tool: opt.tool || "litespeed",
    criticalLevel: opt.criticalLevel || "standard",
    isMeasured: true,
    status: isPolicyContext ? "policy" : (isMatches ? "optimal" : "deviation"),
    statusLabel: isPolicyContext ? "🔵 Policy/Context" : (isMatches ? "🟢 Optimal" : (opt.criticalLevel === "critical" ? "🚨 Avvikelse" : "🟡 Avvikelse")),
    isPolicyContext: isPolicyContext,
    currentDisplay,
    recommendedDisplay,
    isMatches,
    isDeviant: !isMatches,
    isCritical: opt.criticalLevel === "critical",
    rawMeasured,
    rawRecommended: rec,
    missing: missingExclusions,
    fulfilled: fulfilledExclusions,
    isTextarea
  };
}

// --- VERSIONS & DOCUMENTATION BENCHMARK DATABASE ---
const BENCHMARK_VERSIONS = {
  litespeed: {
    name: "LiteSpeed Cache (LSCWP)",
    benchmarkVersion: "7.9.1",
    latestRelease: "7.9.1",
    auditDate: "2026-09-18",
    source: "LiteSpeed Tech Official Docs & GitHub Trac",
    url: "https://docs.litespeedtech.com/lsc/lscwp/"
  },
  woocommerce: {
    name: "WooCommerce",
    benchmarkVersion: "9.8.0",
    latestRelease: "9.8.2",
    auditDate: "2026-09-24",
    source: "WooCommerce Developer Handbook & GitHub Releases",
    url: "https://developer.woocommerce.com/"
  },
  elementor: {
    name: "Elementor",
    benchmarkVersion: "4.2.0",
    latestRelease: "4.2.1",
    auditDate: "2026-09-24",
    source: "Elementor Developer Hub & Performance Docs (4.x core baseline)",
    url: "https://developers.elementor.com/"
  },
  wordfence: {
    name: "Wordfence Security",
    benchmarkVersion: "8.0.2",
    latestRelease: "8.0.2",
    auditDate: "2026-09-18",
    source: "Wordfence Learning Center & LiteSpeed Guide",
    url: "https://www.wordfence.com/help/"
  },
  ctm: {
    name: "Consent & Tag Manager (CTM)",
    benchmarkVersion: "1.9.0",
    latestRelease: "1.9.0",
    releaseDate: "2026-09-24",
    changelogSummary: "Egenutvecklad ersättare för GTM4WP, Complianz och PixelYourSite med noll externa beroenden.",
    docsUrl: "https://arewee.se/ctm-docs"
  },
  scm: {
    name: "SCM (Site Code Manager)",
    benchmarkVersion: "1.4.1",
    latestRelease: "1.4.1",
    auditDate: "2026-09-24",
    source: "SCM Source Manual & Code Standards",
    url: "internal://site-code-manager"
  },
  wordpress: {
    name: "WordPress Core",
    benchmarkVersion: "6.8",
    latestRelease: "6.8",
    auditDate: "2026-09-18",
    source: "WordPress Developer Handbook & Trac",
    url: "https://developer.wordpress.org/"
  },
  php: {
    name: "PHP Runtime",
    benchmarkVersion: "8.2 / 8.3",
    latestRelease: "8.3",
    auditDate: "2026-09-18",
    source: "PHP.net Official Documentation",
    url: "https://www.php.net/supported-versions.php"
  },
  astra: {
    name: "Astra Theme",
    benchmarkVersion: "4.8.7",
    latestRelease: "4.8.7",
    auditDate: "2026-09-18",
    source: "Brainstorm Force Astra Theme Documentation",
    url: "https://wpastra.com/docs/"
  },
  blocksy: {
    name: "Blocksy Theme",
    benchmarkVersion: "2.0.75",
    latestRelease: "2.0.75",
    auditDate: "2026-09-18",
    source: "CreativeThemes / Blocksy Docs",
    url: "https://creativethemes.com/blocksy/docs/"
  },
  hello_elementor: {
    name: "Hello Elementor Theme",
    benchmarkVersion: "3.1.1",
    latestRelease: "3.1.1",
    auditDate: "2026-09-18",
    source: "Elementor Official Theme Repo",
    url: "https://elementor.com/products/hello-theme/"
  }
};

/**
 * Main multi-file analysis controller
 */

/**
 * v2.7.3: QUIC.cloud live-edge evaluation.
 * Plugin toggle cdn_quic / Domain Key / qc-nameservers ≠ activated CDN edge.
 * Live confirmation looks for x-qc-cache / x-qc-pop (or any x-qc-* header).
 * Prefer Policy/info (scoreImpact 0) — never invent Optimal CDN-active.
 *
 * @param {Object} opts
 * @param {string|number|boolean} [opts.cdnQuic]
 * @param {string} [opts.domainKey]
 * @param {Object|null} [opts.liveHeaders] - lowercased header map, or null if unprobed
 * @param {string|null} [opts.siteUrl]
 * @returns {{ status: string, edgeConfirmed: boolean, alertCandidate: Object|null, displayLabel: string, scoreImpact: number, note: string|null }}
 */
function evaluateQuicCloudLiveEdge(opts) {
  opts = opts || {};
  const rawQuic = opts.cdnQuic;
  const quicOn = (rawQuic === 1 || rawQuic === "1" || rawQuic === true || rawQuic === "on" || rawQuic === "On");
  const dk = (typeof opts.domainKey === "string") ? opts.domainKey.trim() : "";
  const hasDomainKey = dk.length > 5 && dk !== "0" && dk !== "1";
  const urlRaw = (opts.siteUrl != null) ? String(opts.siteUrl).trim() : "";
  const hasUrl = !!(urlRaw && /^https?:\/\//i.test(urlRaw));

  let headers = opts.liveHeaders;
  const probed = (headers !== null && headers !== undefined);
  const norm = {};
  if (probed && typeof headers === "object" && !Array.isArray(headers)) {
    Object.keys(headers).forEach(function (k) {
      norm[String(k).toLowerCase()] = headers[k];
    });
  }
  const hasXqc = probed && Object.keys(norm).some(function (k) {
    return k === "x-qc-cache" || k === "x-qc-pop" || k.indexOf("x-qc-") === 0;
  });

  if (!quicOn) {
    return {
      status: "off",
      edgeConfirmed: false,
      alertCandidate: null,
      displayLabel: "AV",
      scoreImpact: 0,
      note: hasDomainKey
        ? "Domain Key är satt — Domain Key / nameservers ≠ aktiverad QUIC.cloud CDN-edge (cdn_quic AV)."
        : null
    };
  }

  if (hasXqc) {
    return {
      status: "confirmed",
      edgeConfirmed: true,
      alertCandidate: null,
      displayLabel: "PÅ (live-edge bekräftad)",
      scoreImpact: 0,
      note: null
    };
  }

  if (!hasUrl) {
    return {
      status: "needs_url",
      edgeConfirmed: false,
      alertCandidate: {
        id: "cdn_quic_live_edge_unmeasured",
        type: "info",
        icon: "☁️",
        component: "litespeed",
        components: ["litespeed"],
        title: "QUIC.cloud CDN PÅ — live-edge kräver URL-check",
        desc: "cdn_quic är PÅ i LiteSpeed men live x-qc-* headers är inte verifierade (ingen sajt-URL). Domain Key / qc-nameservers ≠ aktiverad CDN-edge. Ange sajt-URL via profil, API-synk eller PSI för live-kontroll.",
        source: "QUIC.cloud CDN live-edge (AreWee Policy)",
        compatibility: "scoreImpact: 0 — Policy/info; ingen poängkollaps. Inte falsk Optimal.",
        wpPath: "LiteSpeed Cache ➔ CDN ➔ QUIC.cloud",
        targetTabId: "image_optimization",
        targetSettingId: "cdn_quic",
        impactCategory: "performance",
        criticalLevel: "standard",
        scoreImpact: 0
      },
      displayLabel: "PÅ (plugin) · kräver URL-check",
      scoreImpact: 0,
      note: "Unmeasured live-edge — kräver URL-check."
    };
  }

  // URL available but no x-qc confirmation (probe missing/failed OR probed empty)
  return {
    status: "missing_live",
    edgeConfirmed: false,
    alertCandidate: {
      id: "cdn_quic_live_edge_missing",
      type: "info",
      icon: "☁️",
      component: "litespeed",
      components: ["litespeed"],
      title: "QUIC.cloud CDN PÅ men live-edge saknar x-qc-*",
      desc: "Plugin-toggle cdn_quic=1 (och ev. Domain Key / nameservers) betyder inte att CDN-edge är aktiverad. Live-svar saknar x-qc-cache / x-qc-pop. Kontrollera i QUIC.cloud att CDN är aktiverad för domänen — inte bara Domain Key under General.",
      source: "QUIC.cloud CDN live-edge (AreWee Policy)",
      compatibility: "scoreImpact: 0 — Policy/info; Domain Key ≠ CDN-edge.",
      wpPath: "LiteSpeed Cache ➔ CDN ➔ QUIC.cloud",
      targetTabId: "image_optimization",
      targetSettingId: "cdn_quic",
      impactCategory: "performance",
      criticalLevel: "standard",
      scoreImpact: 0
    },
    displayLabel: "PÅ (plugin) · live-edge ej bekräftad",
    scoreImpact: 0,
    note: "Domain Key / nameservers ≠ aktiverad CDN-edge."
  };
}

function analyzeSystem(sysInfo, wooInfo, wfInfo, elemInfo, uploadedSettings, scmInfo, customCss, themeInfo, serverConfigFiles) {
  const hasAnyInput = !!(sysInfo || wooInfo || wfInfo || elemInfo || uploadedSettings || scmInfo || customCss || themeInfo);
  if (!hasAnyInput) {
    return {
      environment: null,
      versionMatrix: [],
      alerts: [],
      customCodeAlerts: [],
      customCssAlerts: [],
      recommendations: [],
      fileSummaries: {
        sysInfo: [
          { text: "Väntar på WordPress Hälsotillstånd / Systemrapport (.txt/.json)", status: "info" },
          { text: "Server, PHP, minnesgränser och aktiva tillägg identifieras automatiskt", status: "info" },
          { text: "Ladda upp Systemrapport eller LiteSpeed .data för att köra analys", status: "info" }
        ],
        wooInfo: [
          { text: "Frivillig WooCommerce-statusrapport", status: "info" },
          { text: "HPOS, varukorgsfragment och kassaskydd kontrolleras", status: "info" },
          { text: "Används för att säkra e-handelsflödet", status: "info" }
        ],
        wfInfo: [
          { text: "Frivillig Wordfence-diagnostikfil", status: "info" },
          { text: "IP-detektering och Live Traffic optimeras", status: "info" },
          { text: "Förhindrar prestandaförluster bakom LiteSpeed", status: "info" }
        ],
        themeInfo: [
          { text: "Frivillig temainställningsfil / Astra options (.json)", status: "info" },
          { text: "Lokala typsnitt och WooCommerce-mallar granskas", status: "info" },
          { text: "Förhindrar renderingblockerande Google Fonts och kassakrockar", status: "info" }
        ],
        elemInfo: [
          { text: "Frivillig Elementor-systemrapport", status: "info" },
          { text: "CSS Print Method och experiment synkas", status: "info" },
          { text: "Optimerar DOM-träd och minskar renderingsblockerande CSS", status: "info" }
        ],
        scmInfo: [
          { text: "Frivillig SCM / Code Snippets-fil (.json / .php)", status: "info" },
          { text: "PHP-kod och CSS granskas för noll krockar och optimala hooks", status: "info" },
          { text: "Färdigt SCM-optimeringspaket genereras i Steg 2", status: "info" }
        ],
        uploadedSettings: [
          { text: "Frivillig befintlig LiteSpeed Cache-export (.data / .json)", status: "info" },
          { text: "Befintliga val jämförs 1:1 mot officiella benchmarks", status: "info" },
          { text: "Om fil saknas genereras en komplett optimerad profil från scratch", status: "info" }
        ]
      }
    };
  }

  const effectiveSysInfo = sysInfo || {
    "wp-core": {
      version: "6.7.2",
      site_url: (uploadedSettings && (uploadedSettings.site_url || uploadedSettings.home_url)) || ""
    },
    "wp-server": {
      httpd_software: "LiteSpeed Web Server",
      server_architecture: "LiteSpeed",
      php_version: "8.2",
      php_sapi: "litespeed",
      memory_limit: "512M",
      max_input_variables: "5000",
      time_limit: "300"
    },
    "wp-constants": {
      WP_MEMORY_LIMIT: "256M",
      WP_MAX_MEMORY_LIMIT: "512M",
      WP_DEBUG: "false",
      DISABLE_WP_CRON: "true"
    },
    "wp-active-theme": {
      name: (themeInfo && themeInfo.name) || "Standardreferens",
      theme: (themeInfo && themeInfo.name) || "Standardreferens"
    },
    "wp-plugins-active": {
      "litespeed-cache/litespeed-cache.php": {
        name: "LiteSpeed Cache",
        version: (uploadedSettings && (uploadedSettings.version || uploadedSettings.the_version || uploadedSettings.lscwp_cur_version)) || BENCHMARK_VERSIONS.litespeed.benchmarkVersion,
        author: "LiteSpeed Technologies"
      }
    }
  };

  const pluginsActive = effectiveSysInfo["wp-plugins-active"] || {};
  const activePluginKeys = Object.keys(pluginsActive);

  // 1. Environment and Plugin Detection
  const environment = {
    server: (effectiveSysInfo["wp-server"] && (effectiveSysInfo["wp-server"].httpd_software || effectiveSysInfo["wp-server"].server_architecture || effectiveSysInfo["wp-server"].server)) || "Okänd",
    phpVersion: (effectiveSysInfo["wp-server"] && (effectiveSysInfo["wp-server"].php_version || effectiveSysInfo["wp-server"].version)) || "Okänd",
    phpMemoryLimit: (effectiveSysInfo["wp-server"] && (effectiveSysInfo["wp-server"].memory_limit || effectiveSysInfo["wp-server"].php_memory_limit || effectiveSysInfo["wp-server"]["memory_limit"])) || "Okänd",
    phpMaxInputVars: (effectiveSysInfo["wp-server"] && (effectiveSysInfo["wp-server"].max_input_variables || effectiveSysInfo["wp-server"].php_max_input_vars || effectiveSysInfo["wp-server"].max_input_vars)) || "Okänd",
    phpMaxExecutionTime: (effectiveSysInfo["wp-server"] && (effectiveSysInfo["wp-server"].time_limit || effectiveSysInfo["wp-server"].max_execution_time || effectiveSysInfo["wp-server"].php_time_limit)) || "Okänd",
    phpMaxInputTime: (effectiveSysInfo["wp-server"] && (effectiveSysInfo["wp-server"].max_input_time || effectiveSysInfo["wp-server"].php_max_input_time)) || "Okänd",
    phpPostMaxSize: (effectiveSysInfo["wp-server"] && (effectiveSysInfo["wp-server"].php_post_max_size || effectiveSysInfo["wp-server"].post_max_size)) || "Okänd",
    phpUploadMaxFilesize: (effectiveSysInfo["wp-server"] && (effectiveSysInfo["wp-server"].upload_max_filesize || effectiveSysInfo["wp-server"].upload_max_size)) || "Okänd",
    wpVersion: (effectiveSysInfo["wp-core"] && (effectiveSysInfo["wp-core"].version || effectiveSysInfo["wp-core"].wp_version)) || "Okänd",
    wpMemoryLimit: (effectiveSysInfo["wp-constants"] && (effectiveSysInfo["wp-constants"].WP_MEMORY_LIMIT || effectiveSysInfo["wp-constants"].wp_memory_limit)) || (effectiveSysInfo["wp-server"] && effectiveSysInfo["wp-server"].memory_limit) || "40M",
    wpMaxMemoryLimit: (effectiveSysInfo["wp-constants"] && (effectiveSysInfo["wp-constants"].WP_MAX_MEMORY_LIMIT || effectiveSysInfo["wp-constants"].wp_max_memory_limit)) || "256M",
    wpDebug: (effectiveSysInfo["wp-constants"] && (effectiveSysInfo["wp-constants"].WP_DEBUG === "true" || effectiveSysInfo["wp-constants"].WP_DEBUG === true || effectiveSysInfo["wp-constants"].wp_debug === "true")) || false,
    wpDebugDisplay: (effectiveSysInfo["wp-constants"] && (effectiveSysInfo["wp-constants"].WP_DEBUG_DISPLAY === "true" || effectiveSysInfo["wp-constants"].WP_DEBUG_DISPLAY === true || effectiveSysInfo["wp-constants"].wp_debug_display === "true")) || false,
    disableWpCron: (effectiveSysInfo["wp-constants"] && (effectiveSysInfo["wp-constants"].DISABLE_WP_CRON === "true" || effectiveSysInfo["wp-constants"].DISABLE_WP_CRON === true || effectiveSysInfo["wp-constants"].disable_wp_cron === "true")) || false,
    activeTheme: (effectiveSysInfo["wp-active-theme"] && (effectiveSysInfo["wp-active-theme"].name || effectiveSysInfo["wp-active-theme"].theme)) || "Okänt tema",
    theme: (effectiveSysInfo["wp-active-theme"] && (effectiveSysInfo["wp-active-theme"].name || effectiveSysInfo["wp-active-theme"].theme)) || "Okänt tema",
    hasObjectCache: false,
    isLiteSpeedServer: false,
    hasLiteSpeedPlugin: false,
    lscwpVersion: BENCHMARK_VERSIONS.litespeed.benchmarkVersion,
    hasWooCommerce: false,
    wooVersion: "Okänd",
    hasElementor: false,
    elemVersion: "Okänd",
    hasWordfence: false,
    wfVersion: "Okänd",
    hasCTM: false,
    ctmVersion: BENCHMARK_VERSIONS.ctm.benchmarkVersion,
    hasSCM: false,
    scmVersion: BENCHMARK_VERSIONS.scm.benchmarkVersion,
    hasRedis: false,
    isRedisConnected: false,
    serverConfig: serverConfigFiles || {},
    hasSysInfo: !!sysInfo,
    hasWooInfo: !!wooInfo,
    hasWfInfo: !!wfInfo,
    hasElemInfo: !!elemInfo,
    hasThemeInfo: !!themeInfo,
    hasScmInfo: !!scmInfo,
    hasUploadedSettings: !!(uploadedSettings && Object.keys(uploadedSettings).length > 0),
    wooInfo: wooInfo || null,
    wfInfo: wfInfo || null,
    elemInfo: elemInfo ? sanitizeElementorGoogleFonts(elemInfo) : null,
    themeInfo: themeInfo || null,
    scmInfo: scmInfo || null
  };

  // v2.7.3: site URL + optional QUIC live headers (from app probe / sync plugin)
  const liveCtx = (serverConfigFiles && typeof serverConfigFiles === "object") ? serverConfigFiles : {};
  let detectedUrl = liveCtx.detectedSiteUrl || null;
  if (!detectedUrl && effectiveSysInfo && effectiveSysInfo["wp-core"]) {
    const core = effectiveSysInfo["wp-core"];
    detectedUrl = core.site_url || core.home_url || core.siteurl || core.home || null;
  }
  if (!detectedUrl && uploadedSettings) {
    detectedUrl = uploadedSettings.site_url || uploadedSettings.home_url || null;
  }
  if (detectedUrl && typeof detectedUrl === "string" && detectedUrl.startsWith("http")) {
    environment.detectedSiteUrl = detectedUrl.trim();
  }
  if (liveCtx.quicLiveHeaders !== undefined) {
    environment.quicLiveHeaders = liveCtx.quicLiveHeaders;
  } else if (uploadedSettings && uploadedSettings._quic_live_headers !== undefined) {
    environment.quicLiveHeaders = uploadedSettings._quic_live_headers;
  } else {
    environment.quicLiveHeaders = undefined;
  }

  if (wooInfo) {
    environment.hasWooCommerce = true;
    environment.hpos_enabled = wooInfo.hpos_enabled;
    environment.cart_fragments_dequeued = wooInfo.cart_fragments_dequeued;
    environment.transients_cleanup_enabled = wooInfo.transients_cleanup_enabled;
  }
  if (wfInfo) {
    environment.hasWordfence = true;
    environment.wfIpHeader = wfInfo.ip_header || wfInfo.howGetIPs || "REMOTE_ADDR";
    environment.wfLiveTrafficDisabled = wfInfo.live_traffic === false || wfInfo.liveTrafficEnabled === false || wfInfo.disable_live_traffic === true || wfInfo.live_traffic_disabled === true;
    environment.wfLowResource = wfInfo.low_resource === true || wfInfo.lowResourceScanSelection === true || wfInfo.low_resource_scan === true;
  }
  if (elemInfo) {
    environment.hasElementor = true;
    environment.elemVersion = elemInfo.version || environment.elemVersion || "";
    environment.elemDomOpt = elemInfo.dom_optimization === true || elemInfo.e_dom_optimization === "active" || elemInfo.dom_optimization === 1 || (elemInfo.experiments && elemInfo.experiments.some(e => e.toLowerCase().includes("dom") || e.toLowerCase().includes("optimized_dom")));
    environment.elemAssetLoading = elemInfo.asset_loading === true || elemInfo.e_optimized_assets_loading === "active" || elemInfo.asset_loading === 1 || (elemInfo.experiments && elemInfo.experiments.some(e => e.toLowerCase().includes("asset") || e.toLowerCase().includes("optimized_assets")));
    environment.elemCssLoading = elemInfo.css_loading === true || elemInfo.e_optimized_css_loading === "active" || elemInfo.css_loading === 1 || (elemInfo.experiments && elemInfo.experiments.some(e => e.toLowerCase().includes("css") || e.toLowerCase().includes("optimized_css")));
    environment.elemLazyLoad = elemInfo.lazy_load === false || elemInfo.e_lazy_load_images === "inactive" || elemInfo.lazy_load === 0 || (elemInfo.hasLazyLoad === false && !elemInfo.lazy_load);
  }

  // Check LiteSpeed Server
  if (
    environment.server.toLowerCase().includes("litespeed") || 
    (effectiveSysInfo["wp-server"] && effectiveSysInfo["wp-server"].php_sapi && effectiveSysInfo["wp-server"].php_sapi.toLowerCase().includes("litespeed"))
  ) {
    environment.isLiteSpeedServer = true;
  }

  // Check installed plugins & versions
  activePluginKeys.forEach(k => {
    const kLower = k.toLowerCase();
    const pData = pluginsActive[k];
    let pVer = (typeof pData === "object" && pData.version) ? pData.version : (typeof pData === "string" ? pData : "Aktiv");
    if (typeof pVer === "string") {
      const vMatch = pVer.match(/\b\d+(?:\.\d+)+\b/);
      if (vMatch) pVer = vMatch[0];
    }
    const pLatest = (typeof pData === "object" && pData.latestVersion) ? pData.latestVersion : null;

    if (kLower.includes("litespeed")) {
      environment.hasLiteSpeedPlugin = true;
      environment.lscwpVersion = pVer;
      if (pLatest) environment.lscwpLatestReported = pLatest;
    }
    // v2.7.1.6: exact core match only (slug/name), never substring "woocommerce"/"elementor"
    if (isCoreWooCommercePlugin(k)) {
      environment.hasWooCommerce = true;
      environment.wooVersion = pVer;
      if (pLatest) environment.wooLatestReported = pLatest;
    }
    if (isCoreElementorPlugin(k)) {
      environment.hasElementor = true;
      environment.elemVersion = pVer;
      if (pLatest) environment.elemLatestReported = pLatest;
    } else if (kLower.includes("elementor")) {
      // Presence of Elementor Pro / addons still marks Elementor ecosystem active,
      // but must not overwrite core Elementor version.
      environment.hasElementor = true;
    }
    if (kLower.includes("wordfence")) {
      environment.hasWordfence = true;
      environment.wfVersion = pVer;
      if (pLatest) environment.wfLatestReported = pLatest;
    }
    // Specific CTM matching (avoid false positive with generic "consent" like Complianz)
    if (kLower.includes("arewee-ctm") || kLower.includes("consent & tracking") || kLower.includes("consent-tracking-manager") || (kLower.includes("ctm") && !kLower.includes("custom") && !kLower.includes("contact"))) {
      environment.hasCTM = true;
      environment.ctmVersion = pVer;
      if (pLatest) environment.ctmLatestReported = pLatest;
    }
    if (kLower.includes("site code manager") || kLower.includes("scm") || kLower.includes("code-manager")) {
      environment.hasSCM = true;
      environment.scmVersion = pVer;
      if (pLatest) environment.scmLatestReported = pLatest;
    }
    if (kLower.includes("redis") || kLower.includes("object cache")) {
      environment.hasRedis = true;
    }
  });

  // Direct module inference from uploaded files
  if (wooInfo) {
    environment.hasWooCommerce = true;
    if (wooInfo.version && (!environment.wooVersion || environment.wooVersion === "Okänd" || environment.wooVersion === "Aktiv")) {
      environment.wooVersion = wooInfo.version;
    }
  }
  if (elemInfo) {
    environment.hasElementor = true;
    if (elemInfo.version && (!environment.elemVersion || environment.elemVersion === "Okänd" || environment.elemVersion === "Aktiv")) {
      environment.elemVersion = elemInfo.version;
    }
  }
  if (wfInfo) {
    environment.hasWordfence = true;
  }

  // Collect WooCommerce Gateways
  const detectedGateways = [];
  if (wooInfo) {
    if (Array.isArray(wooInfo.gateways)) {
      detectedGateways.push(...wooInfo.gateways);
    }
    if (Array.isArray(wooInfo.active_gateways)) {
      wooInfo.active_gateways.forEach(g => {
        const name = typeof g === "string" ? g : (g.title || g.id || "Gateway");
        if (!detectedGateways.includes(name)) detectedGateways.push(name);
      });
    }
    if (Array.isArray(wooInfo.payment_gateways)) {
      wooInfo.payment_gateways.forEach(g => {
        const name = typeof g === "string" ? g : (g.title || g.id || "Gateway");
        if (!detectedGateways.includes(name)) detectedGateways.push(name);
      });
    }
  }
  activePluginKeys.forEach(k => {
    const kl = k.toLowerCase();
    if (kl.includes("stripe") && !detectedGateways.includes("Stripe")) detectedGateways.push("Stripe");
    if ((kl.includes("klarna") || kl.includes("kco")) && !detectedGateways.includes("Klarna")) detectedGateways.push("Klarna");
    if (kl.includes("paypal") && !detectedGateways.includes("PayPal")) detectedGateways.push("PayPal");
    if (kl.includes("shipmondo") && !detectedGateways.includes("Shipmondo")) detectedGateways.push("Shipmondo");
    if (kl.includes("kustom") && !detectedGateways.includes("Kustom")) detectedGateways.push("Kustom");
  });
  environment.wooGateways = detectedGateways;

  environment.activePlugins = activePluginKeys;
  environment.wooOverrides = (wooInfo && wooInfo.overrides) || [];
  environment.elemExperiments = (elemInfo && elemInfo.experiments) || [];
  
  // Normalized Elementor settings
  if (elemInfo) {
    if (elemInfo.e_lazy_load_images === "inactive" || elemInfo.lazy_load === false || elemInfo.lazy_load === 0) {
      environment.elemLazyLoad = false;
    }
    environment.elemDomOpt = !!(elemInfo.dom_optimization === true || elemInfo.e_dom_optimization === "active" || (elemInfo.experiments && elemInfo.experiments.some(e => {
      const low = e.toLowerCase();
      return (low.includes("dom") || low.includes("optimized_dom") || low.includes("märkkod") || low.includes("markup")) && !low.includes("inactive") && !low.includes("inaktiv");
    })));
  }

  // Active theme & SCM information
  const activeThemeObj = (effectiveSysInfo && effectiveSysInfo["wp-active-theme"]) || themeInfo || {};
  const parentThemeObj = (effectiveSysInfo && effectiveSysInfo["wp-parent-theme"]) || {};
  environment.activeTheme = activeThemeObj.name || (themeInfo && themeInfo.name) || "Aktivt Tema";
  environment.activeThemeVersion = activeThemeObj.version || (themeInfo && themeInfo.version) || "";
  if (activeThemeObj.latestVersion) {
    environment.activeThemeLatestReported = activeThemeObj.latestVersion;
  }
  environment.parentTheme = activeThemeObj.parent_theme || parentThemeObj.name || "";
  environment.parentThemeVersion = parentThemeObj.version || "";
  environment.hasChildTheme = !!environment.parentTheme && environment.parentTheme.toLowerCase() !== "none";
  environment.themeFeatures = activeThemeObj.theme_features || "";
  environment.inactiveThemes = (effectiveSysInfo && effectiveSysInfo["wp-themes-inactive"]) || {};
  environment.hasThemeInfo = !!(themeInfo || (effectiveSysInfo && effectiveSysInfo["wp-active-theme"]) || (environment.activeTheme && environment.activeTheme !== "Okänt tema"));
  environment.hasSCM = !!(scmInfo || (effectiveSysInfo && (effectiveSysInfo.scm || (effectiveSysInfo["wp-plugins-active"] && Object.keys(effectiveSysInfo["wp-plugins-active"]).some(p => p.toLowerCase().includes("scm") || p.toLowerCase().includes("site-code") || p.toLowerCase().includes("site code"))))));
  
  // Normalized Wordfence fields
  environment.wfFirewallMode = (wfInfo && (wfInfo.firewall_mode || wfInfo.firewallMode)) || "Standard";
  environment.wfIpHeader = (wfInfo && (wfInfo.ip_header || wfInfo.ipHeader || wfInfo.howGetIPs)) || "Standard";

  // Redis object cache check (drop-ins, PHP modules, or uploaded LiteSpeed settings)
  const hasDropinRedis = !!(effectiveSysInfo && effectiveSysInfo["wp-dropins"] && (effectiveSysInfo["wp-dropins"]["object-cache.php"] || effectiveSysInfo["wp-dropins"]["advanced-cache.php"]));
  const hasPhpRedis = !!(effectiveSysInfo && effectiveSysInfo["wp-server"] && typeof effectiveSysInfo["wp-server"].php_extensions === "string" && effectiveSysInfo["wp-server"].php_extensions.toLowerCase().includes("redis"));
  const hasUploadedRedis = !!(uploadedSettings && (
    uploadedSettings.cache_object === "1" || uploadedSettings.cache_object === 1 || uploadedSettings.cache_object === true ||
    uploadedSettings["cache-object"] === "1" || uploadedSettings["cache-object"] === 1 || uploadedSettings["cache-object"] === true ||
    uploadedSettings.object_cache === "1" || uploadedSettings.object_cache === 1 ||
    uploadedSettings["cache-object_kind"] === "1" || uploadedSettings["cache-object_kind"] === 1 ||
    (uploadedSettings.options && (uploadedSettings.options["cache-object"] === "1" || uploadedSettings.options["cache-object"] === 1 || uploadedSettings.options.cache_object === "1"))
  ));

  if (hasDropinRedis || hasPhpRedis || hasUploadedRedis || environment.hasRedis) {
    environment.hasRedis = true;
    environment.isRedisConnected = true;
  }

  // 2. Build Version & Parity Matrix
  const lscwpInstalled = environment.hasLiteSpeedPlugin ? environment.lscwpVersion : "Ej installerat";
  const lscwpLatest = environment.lscwpLatestReported || (compareVersions(environment.lscwpVersion, BENCHMARK_VERSIONS.litespeed.latestRelease) > 0 ? environment.lscwpVersion : BENCHMARK_VERSIONS.litespeed.latestRelease);

  const wooInstalled = environment.hasWooCommerce ? environment.wooVersion : "Ej installerat";
  const wooLatest = environment.wooLatestReported || (compareVersions(environment.wooVersion, BENCHMARK_VERSIONS.woocommerce.latestRelease) > 0 ? environment.wooVersion : BENCHMARK_VERSIONS.woocommerce.latestRelease);

  const elemInstalled = environment.hasElementor ? environment.elemVersion : "Ej installerat";
  const elemLatest = environment.elemLatestReported || (compareVersions(environment.elemVersion, BENCHMARK_VERSIONS.elementor.latestRelease) > 0 ? environment.elemVersion : BENCHMARK_VERSIONS.elementor.latestRelease);

  const wfInstalled = environment.hasWordfence ? environment.wfVersion : (wfInfo ? "Diagnostik inläst" : "Ej inläst");
  const wfLatest = environment.wfLatestReported || (compareVersions(environment.wfVersion, BENCHMARK_VERSIONS.wordfence.latestRelease) > 0 ? environment.wfVersion : BENCHMARK_VERSIONS.wordfence.latestRelease);

  const wpInstalled = environment.wpVersion;
  const wpLatest = compareVersions(environment.wpVersion, BENCHMARK_VERSIONS.wordpress.latestRelease) > 0 ? environment.wpVersion : BENCHMARK_VERSIONS.wordpress.latestRelease;

  const versionMatrix = [
    {
      toolKey: "litespeed",
      name: "LiteSpeed Cache (LSCWP)",
      installedVersion: lscwpInstalled,
      benchmarkVersion: environment.hasLiteSpeedPlugin ? environment.lscwpVersion : BENCHMARK_VERSIONS.litespeed.benchmarkVersion,
      latestRelease: lscwpLatest,
      auditDate: BENCHMARK_VERSIONS.litespeed.auditDate,
      source: BENCHMARK_VERSIONS.litespeed.source,
      sourceUrl: BENCHMARK_VERSIONS.litespeed.url,
      isActive: environment.hasLiteSpeedPlugin,
      isParityMatch: compareVersions(environment.lscwpVersion, lscwpLatest) >= 0
    },
    {
      toolKey: "woocommerce",
      name: "WooCommerce",
      installedVersion: wooInstalled,
      benchmarkVersion: environment.hasWooCommerce ? environment.wooVersion : BENCHMARK_VERSIONS.woocommerce.benchmarkVersion,
      latestRelease: wooLatest,
      auditDate: BENCHMARK_VERSIONS.woocommerce.auditDate,
      source: BENCHMARK_VERSIONS.woocommerce.source,
      sourceUrl: BENCHMARK_VERSIONS.woocommerce.url,
      isActive: environment.hasWooCommerce,
      isParityMatch: compareVersions(environment.wooVersion, wooLatest) >= 0
    },
    {
      toolKey: "elementor",
      name: "Elementor",
      installedVersion: elemInstalled,
      benchmarkVersion: environment.hasElementor ? environment.elemVersion : BENCHMARK_VERSIONS.elementor.benchmarkVersion,
      latestRelease: elemLatest,
      auditDate: BENCHMARK_VERSIONS.elementor.auditDate,
      source: BENCHMARK_VERSIONS.elementor.source,
      sourceUrl: BENCHMARK_VERSIONS.elementor.url,
      isActive: environment.hasElementor,
      isParityMatch: compareVersions(environment.elemVersion, elemLatest) >= 0
    },
    {
      toolKey: "wordfence",
      name: "Wordfence Security",
      installedVersion: wfInstalled,
      benchmarkVersion: environment.hasWordfence ? environment.wfVersion : BENCHMARK_VERSIONS.wordfence.benchmarkVersion,
      latestRelease: wfLatest,
      auditDate: BENCHMARK_VERSIONS.wordfence.auditDate,
      source: BENCHMARK_VERSIONS.wordfence.source,
      sourceUrl: BENCHMARK_VERSIONS.wordfence.url,
      isActive: environment.hasWordfence || !!wfInfo,
      isParityMatch: compareVersions(environment.wfVersion, wfLatest) >= 0
    },
    {
      toolKey: "ctm",
      name: "CTM (Consent & Tracking Manager)",
      installedVersion: environment.hasCTM ? environment.ctmVersion : "Aktiv (Källkod)",
      benchmarkVersion: BENCHMARK_VERSIONS.ctm.benchmarkVersion,
      latestRelease: BENCHMARK_VERSIONS.ctm.latestRelease,
      auditDate: BENCHMARK_VERSIONS.ctm.auditDate,
      source: BENCHMARK_VERSIONS.ctm.source,
      sourceUrl: BENCHMARK_VERSIONS.ctm.url,
      isActive: true, // Always monitored since user uses CTM across all sites
      isParityMatch: true
    },
    {
      toolKey: "scm",
      name: "SCM (Site Code Manager)",
      installedVersion: environment.hasSCM ? environment.scmVersion : (scmInfo ? "Snippets inlästa" : "Aktiv (Källkod)"),
      benchmarkVersion: BENCHMARK_VERSIONS.scm.benchmarkVersion,
      latestRelease: BENCHMARK_VERSIONS.scm.latestRelease,
      auditDate: BENCHMARK_VERSIONS.scm.auditDate,
      source: BENCHMARK_VERSIONS.scm.source,
      sourceUrl: BENCHMARK_VERSIONS.scm.url,
      isActive: true, // Always monitored
      isParityMatch: true
    },
    {
      toolKey: "wordpress",
      name: "WordPress Core",
      installedVersion: wpInstalled,
      benchmarkVersion: environment.wpVersion || BENCHMARK_VERSIONS.wordpress.benchmarkVersion,
      latestRelease: wpLatest,
      auditDate: BENCHMARK_VERSIONS.wordpress.auditDate,
      source: BENCHMARK_VERSIONS.wordpress.source,
      sourceUrl: BENCHMARK_VERSIONS.wordpress.url,
      isActive: true,
      isParityMatch: compareVersions(environment.wpVersion, wpLatest) >= 0
    }
  ];

  // 3. Generate Alerts, Warnings & Conflicts
  const alerts = [];
  const customCodeAlerts = [];
  const customCssAlerts = [];

  // --- A0. Ecosystem Updates Advisory (Informative only, scoreImpact: 0) ---
  const pendingUpdates = versionMatrix.filter(v => 
    v.isActive && 
    v.installedVersion && 
    typeof v.installedVersion === "string" &&
    /\d+(?:\.\d+)+/.test(v.installedVersion) &&
    v.installedVersion !== "Ej aktivt" && 
    v.installedVersion !== "Ej installerat" && 
    v.installedVersion !== "Okänd" && 
    v.latestRelease && 
    compareVersions(v.installedVersion, v.latestRelease) < 0
  );

  if (pendingUpdates.length > 0) {
    const namesList = pendingUpdates.map(p => `${p.name} (v${p.installedVersion} ➔ v${p.latestRelease})`).join(", ");
    alerts.push({
      id: "alert_available_updates",
      type: "info",
      icon: "ℹ️",
      component: "core",
      components: pendingUpdates.map(p => p.toolKey),
      title: `${pendingUpdates.length} ekosystem-uppdatering${pendingUpdates.length > 1 ? "ar" : ""} tillgänglig${pendingUpdates.length > 1 ? "a" : ""} (${pendingUpdates.map(p => p.name).join(", ")})`,
      desc: `Webbplatsen kör en stabil/äldre version av ${namesList}. Detta påverkar inte sajtens hälsopoäng då medveten frysning för stabilitet respekteras. Alla regler och jämförelser har anpassats specifikt mot dina installerade versioner.`,
      source: "AreWee Version Matrix & Benchmark Registry",
      compatibility: "Ingen aktiv konflikt. Noteringen är rent rådgivande inför framtida uppdateringscykler.",
      targetTabId: "general",
      impactCategory: "stability",
      criticalLevel: "standard",
      scoreImpact: 0
    });
  }

  // --- A. Server & Memory Alerts ---
  if (!environment.isLiteSpeedServer) {
    alerts.push({
      type: "warning",
      icon: "⚠️",
      component: "server",
      components: ["server", "litespeed"],
      title: "Icke-LiteSpeed server detekterad",
      desc: `Din server rapporterar '${environment.server}'. ESI, LiteSpeed Crawler och server-level cache fungerar endast optimalt under en äkta LiteSpeed/OpenLiteSpeed-server.`,
      source: "LiteSpeed Technologies Server Architecture Guide",
      compatibility: "LiteSpeed Cache fungerar delvis under Apache/Nginx men saknar serverbaserad cache-acceleration.",
      targetTabId: "general",
      impactCategory: "performance",
      criticalLevel: "high"
    });
  }

  // Memory checks (Parse numerical megabytes)
  const wpMemNum = parseMemoryMB(environment.wpMemoryLimit) || 40;
  const phpMemNum = parseMemoryMB(environment.phpMemoryLimit);

  if (environment.hasWooCommerce && wpMemNum < 256) {
    alerts.push({
      type: "danger",
      icon: "🚨",
      component: "server",
      components: ["server", "woocommerce"],
      title: "Kritiskt lågt WordPress-minne (WP_MEMORY_LIMIT)",
      desc: `Ditt WP_MEMORY_LIMIT är ${environment.wpMemoryLimit}. WooCommerce och Elementor kräver minst 256M (rekommenderat 512M) för att inte krascha med "Memory Exhausted" vid orderläggning eller redigering.`,
      source: "WooCommerce System Requirements & WordPress.org Guidelines",
      compatibility: "Nödvändigt för stabil orderbearbetning, Klarna/Stripe checkout och Elementor-redigeraren.",
      wpPath: "wp-config.php ➔ define('WP_MEMORY_LIMIT', '512M');",
      targetTabId: "core_server",
      targetSettingId: "wp_memory_limit",
      impactCategory: "stability",
      criticalLevel: "critical"
    });
  }

  if (phpMemNum !== null && phpMemNum < 256) {
    alerts.push({
      type: "warning",
      icon: "⚠️",
      component: "server",
      components: ["server"],
      title: "Låg PHP Memory Limit",
      desc: `Serverns PHP memory_limit är ${environment.phpMemoryLimit}. Rekommenderas minst 512M för stabil drift av e-handel och bildbehandling.`,
      source: "PHP Documentation & Hosting Best Practice",
      compatibility: "Ökar stabiliteten för bildoptimering och bakgrundsprocesser.",
      wpPath: ".htaccess / php.ini ➔ php_value memory_limit 512M",
      impactCategory: "stability",
      criticalLevel: "high"
    });
  }

  if (parseInt(environment.phpMaxInputVars, 10) < 3000) {
    alerts.push({
      type: "warning",
      icon: "⚠️",
      component: "server",
      components: ["server"],
      title: "Lågt max_input_vars på servern",
      desc: `PHP max_input_vars är ${environment.phpMaxInputVars}. Detta kan göra att stora menyer, Elementor-inställningar eller WooCommerce-attribut klipps av vid sparning. Höj till minst 5000.`,
      source: "WordPress.org & Elementor Server Requirements",
      compatibility: "Krävs för stora e-handelskataloger och komplexa navigationsmenyer.",
      wpPath: ".htaccess ➔ php_value max_input_vars 5000",
      impactCategory: "stability",
      criticalLevel: "standard"
    });
  }

  // --- B. WooCommerce Checkout & Cart Protection ---
  if (environment.hasWooCommerce) {
    if (!uploadedSettings || Object.keys(uploadedSettings).length === 0) {
      alerts.push({
        type: "warning",
        icon: "ℹ️",
        component: "woocommerce",
        components: ["woocommerce", "litespeed"],
        title: "LiteSpeed .data-fil ej inläst (Slot 7) – Verifiera kassaexkluderingar",
        desc: "Ladda upp din litespeed.data-fil i Slot 7 för att verifiera att kassa- och varukorgssidor är undantagna från cachelagring.",
        source: "WooCommerce Developer Handbook & LiteSpeed E-Commerce Standards",
        compatibility: "Kritiskt för alla betalningslösningar (Klarna Checkout, Kustom Checkout, Stripe, PayPal, Svea Checkout m.fl.).",
        wpPath: "LiteSpeed Cache ➔ Inställningar ➔ Cache ➔ [4] Exkludera ➔ Exkludera sökvägar (drop_uri)",
        targetTabId: "cache",
        targetSettingId: "drop_uri",
        impactCategory: "stability",
        criticalLevel: "standard"
      });
    } else {
      let rawDrop = uploadedSettings.drop_uri || uploadedSettings["cache-exc"] || uploadedSettings["cache_exc"] || uploadedSettings["cache-drop_uri"] || uploadedSettings["cache_drop_uri"];
      if (!rawDrop && uploadedSettings.options && typeof uploadedSettings.options === "object") {
        rawDrop = uploadedSettings.options.drop_uri || uploadedSettings.options["cache-exc"] || uploadedSettings.options["cache_exc"] || uploadedSettings.options["cache-drop_uri"] || uploadedSettings.options["cache_drop_uri"];
      }
      if (!rawDrop) rawDrop = "";

      let dropStr = "";
      if (Array.isArray(rawDrop)) dropStr = rawDrop.join("\n");
      else if (typeof rawDrop === "object" && rawDrop !== null) dropStr = Object.values(rawDrop).join("\n");
      else dropStr = String(rawDrop || "");

      const dropUriClean = dropStr.toLowerCase().replace(/[\^\$]/g, "");
      const hasCheckout = dropUriClean.includes("checkout") || dropUriClean.includes("kassa") || dropUriClean.includes("kassan") || dropUriClean.includes("kco") || dropUriClean.includes("kustom") || dropUriClean.includes("order-received") || dropUriClean.includes("order-pay");
      const hasCart = dropUriClean.includes("cart") || dropUriClean.includes("varukorg") || dropUriClean.includes("kundvagn");
      const hasSafeCheckout = hasCheckout || hasCart || dropUriClean.includes("wc-api");

      // Only flag danger if drop_uri was actively measured and explicitly missing safe exclusions
      const isDropUriFieldPresent = uploadedSettings.hasOwnProperty("drop_uri") || 
                                    uploadedSettings.hasOwnProperty("cache-exc") || 
                                    (uploadedSettings.options && (uploadedSettings.options.hasOwnProperty("drop_uri") || uploadedSettings.options.hasOwnProperty("cache-exc")));

      if (isDropUriFieldPresent && !hasSafeCheckout) {
        alerts.push({
          type: "danger",
          icon: "🚨",
          component: "woocommerce",
          components: ["woocommerce", "litespeed"],
          title: "Kassan/Varukorgen är INTE undantagen från LiteSpeed Cache!",
          desc: "Kritiskt stabilitetsfel i inläst fil! Butikens kassa- eller varukorgssidor saknas i drop_uri. Detta kan leda till att besökare ser andras varukorgar eller att betalningar misslyckas.",
          source: "WooCommerce Developer Handbook, Krokedil/Kustom & LiteSpeed Standards",
          compatibility: "Kritiskt för alla betalningslösningar (Klarna Checkout, Kustom Checkout, Stripe, PayPal, Svea Checkout m.fl.).",
          wpPath: "LiteSpeed Cache ➔ Inställningar ➔ Cache ➔ [4] Exkludera ➔ Exkludera sökvägar (drop_uri)",
          targetTabId: "cache",
          targetSettingId: "drop_uri",
          impactCategory: "stability",
          criticalLevel: "critical"
        });
      }
    }
  }

  // --- C. CTM (Consent & Tracking Manager) Protection ---
  if (uploadedSettings && Object.keys(uploadedSettings).length > 0) {
    const jsExclude = uploadedSettings.js_exclude || "";
    const jsDelayedExclude = uploadedSettings.js_delayed_exclude || "";
    const combinedExcludes = (jsExclude + "\n" + jsDelayedExclude).toLowerCase();
    const isCtmExcluded = combinedExcludes.includes("ctm") || combinedExcludes.includes("cookieconsent") || combinedExcludes.includes("datalayer");

    const isJsCombineOn = uploadedSettings.optm_js_comb === "1" || uploadedSettings.optm_js_comb === 1 || uploadedSettings["optm-js_comb"] === "1" || (uploadedSettings.options && (uploadedSettings.options.optm_js_comb === "1" || uploadedSettings.options["optm-js_comb"] === "1"));
    const isJsDeferOn = uploadedSettings.optm_js_defer === "1" || uploadedSettings.optm_js_defer === 1 || uploadedSettings.optm_js_defer === "2" || uploadedSettings["optm-js_defer"] === "1" || uploadedSettings["optm-js_defer"] === 1 || uploadedSettings["optm-js_defer"] === "2" || (uploadedSettings.options && (uploadedSettings.options.optm_js_defer === "1" || uploadedSettings.options["optm-js_defer"] === "1" || uploadedSettings.options["optm-js_defer"] === "2"));

    if (isJsDeferOn && !isCtmExcluded) {
      alerts.push({
        type: "danger",
        icon: "🚨",
        component: "ctm",
        components: ["ctm", "litespeed"],
        title: "CTM (Consent & Tag Manager) saknas i LiteSpeed JS-exkluderingar!",
        desc: "CTM hanterar samtyckesbannern och händelsespårning. Om ctm-init.js, cookieconsent.umd.js och dataLayer inte är exkluderade i LiteSpeed kan samtyckesbannern fördröjas eller Meta/GA4-händelser missas.",
        source: "CTM Source Manual & Consent Mode v2 Standards",
        compatibility: "Garanterar 100% GDPR-efterlevnad och stabil händelsespårning.",
        wpPath: "LiteSpeed Cache ➔ Inställningar ➔ Sidoptimering ➔ [3] JS ➔ JS-exkluderingar (js_exclude)",
        targetTabId: "page_optimization_js",
        targetSettingId: "js_exclude",
        impactCategory: "stability",
        criticalLevel: "critical"
      });
    }
  }

  // --- D1. Single Source of Truth: Lazy Load Overlap ---
  const isLscwpLazy = uploadedSettings ? (
    uploadedSettings.media_lazy === "1" || uploadedSettings.media_lazy === 1 ||
    uploadedSettings["media-lazy"] === "1" || uploadedSettings["media-lazy"] === 1 ||
    (uploadedSettings.options && (uploadedSettings.options.media_lazy === "1" || uploadedSettings.options["media-lazy"] === "1"))
  ) : false;
  const isElemLazy = elemInfo && (elemInfo.lazy_load_enabled || elemInfo.hasLazyLoad);
  
  if (isLscwpLazy && isElemLazy) {
    alerts.push({
      id: "double_activation_lazyload",
      type: "warning",
      icon: "🔄",
      component: "elementor",
      components: ["elementor", "litespeed"],
      title: "Dubbel Lazy Load aktiverad (LiteSpeed + Elementor)",
      desc: "Både LiteSpeed Cache och Elementor kör egna skript för bild-lazyload. Detta skapar dubbla event-lyssnare och layout-skakningar (CLS). Rekommendation: Inaktivera Elementors Lazy Load och låt antingen LiteSpeed (LQIP/VPI) eller WordPress native sköta bilderna.",
      source: "Elementor Developer Hub & LiteSpeed Page Optimization Best Practice",
      compatibility: "Eliminerar bildflimmer och förbättrar Cumulative Layout Shift (CLS).",
      singleSourceInfo: {
        overlappingTools: ["LiteSpeed Cache", "Elementor", "WordPress Core (Native)"],
        primaryTool: "LiteSpeed Cache (eller WP Native)",
        recommendedTool: "LiteSpeed Cache (eller WP Native)",
        whyRecommended: "LiteSpeed genererar Low Quality Image Placeholders (LQIP) och responsiva SVG-platshållare direkt på servernivå utan att belasta webbläsarens JavaScript-tråd.",
        reason: "LiteSpeed genererar Low Quality Image Placeholders (LQIP) och responsiva SVG-platshållare direkt på servernivå utan att belasta webbläsarens JavaScript-tråd.",
        actionForSecondary: "Gå till Elementor ➔ Inställningar ➔ Funktioner ➔ Sätt 'Lazy Load Background Images' till Inaktiv.",
        actionOtherTools: "Gå till Elementor ➔ Inställningar ➔ Funktioner ➔ Sätt 'Lazy Load Background Images' till Inaktiv."
      },
      wpPath: "Elementor ➔ Inställningar ➔ Funktioner ➔ Lazy Load",
      targetTabId: "page_optimization_media",
      targetSettingId: "media_lazy",
      impactCategory: "stability",
      criticalLevel: "high"
    });
  }

  // --- D1b. Single collective LCP/Hero exclude warning when LiteSpeed Lazy is ON ---
  // Max ONE warning (−7) for missing logo/hero/LCP excludes — no overlapping media warnings for the same gap.
  if (isLscwpLazy) {
    const lazyExcRaw = uploadedSettings
      ? (uploadedSettings.media_lazy_exc !== undefined ? uploadedSettings.media_lazy_exc
        : (uploadedSettings["media-lazy_exc"] !== undefined ? uploadedSettings["media-lazy_exc"]
          : (uploadedSettings["media-lazy-exc"] !== undefined ? uploadedSettings["media-lazy-exc"]
            : (uploadedSettings.media_lazy_exclude !== undefined ? uploadedSettings.media_lazy_exclude : ""))))
      : "";
    const lazyExcStr = Array.isArray(lazyExcRaw) ? lazyExcRaw.join("\n") : String(lazyExcRaw || "");
    const excLower = lazyExcStr.toLowerCase();
    const hasMeaningfulLcpExclude = /logo/.test(excLower) || /hero|header|banner|lcp|above.?fold|site-branding|custom-logo/.test(excLower);
    if (!hasMeaningfulLcpExclude) {
      alerts.push({
        id: "media_lazy_exc_missing",
        type: "warning",
        icon: "🖼️",
        component: "litespeed",
        components: ["litespeed"],
        title: "LiteSpeed Lazy Load saknar LCP/Hero-exkludering",
        desc: "LiteSpeed Lazy Load är PÅ men media_lazy_exc saknar meningsfulla undantag för logotyp, hero eller LCP-bild. Above-the-fold-bilder får inte lazy-loadas — lägg till logo/header/hero i exkluderingen (flik Media & LCP).",
        source: "Google Core Web Vitals (LCP) & LiteSpeed Page Optimization",
        compatibility: "En enda samlad varning (−7). Lägg till logo/header/hero i media_lazy_exc för omedelbar LCP-render.",
        wpPath: "LiteSpeed Cache ➔ Inställningar ➔ Sidoptimering ➔ [5] Media & LCP ➔ Lazy Load Excludes",
        targetTabId: "page_optimization_media",
        targetSettingId: "media_lazy_exc",
        impactCategory: "performance",
        criticalLevel: "high"
      });
    }
  }

  // --- D1c. Image Optimization info alerts (scoreImpact: 0) ---
  const hasQuicDomainKey = !!(uploadedSettings && (
    (typeof uploadedSettings.domain_key === "string" && uploadedSettings.domain_key.length > 5) ||
    (typeof uploadedSettings.hash === "string" && uploadedSettings.hash.length > 5)
  ));
  const getImgVal = (us, underscore, hyphen) => {
    if (!us) return null;
    if (us[underscore] !== undefined) return us[underscore];
    if (us[hyphen] !== undefined) return us[hyphen];
    if (us.options && typeof us.options === "object") {
      if (us.options[underscore] !== undefined) return us.options[underscore];
      if (us.options[hyphen] !== undefined) return us.options[hyphen];
    }
    return null;
  };
  const imgAuto = getImgVal(uploadedSettings, "img_optm_auto", "img_optm-auto");
  const imgOri = getImgVal(uploadedSettings, "img_optm_ori", "img_optm-ori");
  const imgWebp = getImgVal(uploadedSettings, "img_optm_webp", "img_optm-webp");
  const imgRmBkup = getImgVal(uploadedSettings, "img_optm_rm_bkup", "img_optm-rm_bkup");
  const imgOptmOn = (
    imgAuto === "1" || imgAuto === 1 ||
    imgOri === "1" || imgOri === 1 ||
    imgWebp === "1" || imgWebp === 1 || imgWebp === "2" || imgWebp === 2
  );
  if (imgRmBkup === "1" || imgRmBkup === 1) {
    alerts.push({
      id: "img_optm_rm_bkup_on",
      type: "info",
      icon: "🚨",
      component: "litespeed",
      components: ["litespeed"],
      title: "🚨 Bildoptimering: Ta bort ursprungliga säkerhetskopior är PÅ",
      desc: "img_optm-rm_bkup är aktiverat. Originalbilder raderas oåterkalleligt efter optimering. Rekommendation: AV på produktion. Detta är en info-alert — ingen danger-poängkollaps.",
      source: "LiteSpeed Image Optimization & AreWee Media Policy",
      compatibility: "scoreImpact: 0 — informativ varning om oåterkallelig dataförlust.",
      wpPath: "LiteSpeed Cache ➔ Image Optimization ➔ Image Optimization Settings ➔ Ta bort ursprungliga säkerhetskopior",
      targetTabId: "image_optimization",
      targetSettingId: "img_optm_rm_bkup",
      impactCategory: "stability",
      criticalLevel: "standard",
      scoreImpact: 0
    });
  }
  if (!hasQuicDomainKey && imgOptmOn) {
    alerts.push({
      id: "img_optm_without_quic_key",
      type: "info",
      icon: "🔑",
      component: "litespeed",
      components: ["litespeed"],
      title: "Bildoptimering PÅ utan QUIC Domain Key",
      desc: "En eller flera Image Optimization-spakar är PÅ men Domain Key saknas. Anslut QUIC.cloud under General ➔ Domain Key för att cron/next-gen ska fungera.",
      source: "LiteSpeed QUIC.cloud Image Optimization",
      compatibility: "scoreImpact: 0 — informativ; ingen poängkollaps.",
      wpPath: "LiteSpeed Cache ➔ General ➔ Domain Key / Online Services",
      targetTabId: "image_optimization",
      targetSettingId: "img_optm_auto",
      impactCategory: "performance",
      criticalLevel: "standard",
      scoreImpact: 0
    });
  }

  // --- D1d. QUIC.cloud live-edge Policy/info (v2.7.3, scoreImpact: 0) ---
  (function () {
    const qOn = !!(uploadedSettings && (
      uploadedSettings.cdn_quic === "1" || uploadedSettings.cdn_quic === 1 ||
      uploadedSettings["cdn-quic"] === "1" || uploadedSettings["cdn-quic"] === 1
    ));
    if (!qOn && !(uploadedSettings && (
      (typeof uploadedSettings.domain_key === "string" && uploadedSettings.domain_key.length > 5) ||
      (typeof uploadedSettings.hash === "string" && uploadedSettings.hash.length > 5)
    ))) {
      return; // nothing to evaluate
    }
    const liveEval = evaluateQuicCloudLiveEdge({
      cdnQuic: qOn ? 1 : 0,
      domainKey: uploadedSettings && (uploadedSettings.domain_key || uploadedSettings.hash),
      liveHeaders: environment.quicLiveHeaders,
      siteUrl: environment.detectedSiteUrl || null
    });
    if (liveEval.alertCandidate) {
      alerts.push(liveEval.alertCandidate);
    }
  })();

  // --- D2. Single Source of Truth: CTM vs Legacy Tracking Plugins ---
  const legacyTrackers = activePluginKeys.filter(k => {
    const kl = k.toLowerCase();
    return kl.includes("gtm4wp") || kl.includes("duracelltomi") || kl.includes("complianz") || kl.includes("pixelyoursite") || kl.includes("facebook-for-woocommerce");
  });
  if (legacyTrackers.length > 0) {
    alerts.push({
      id: "double_activation_trackers",
      type: "warning",
      icon: "🔄",
      component: "ctm",
      components: ["ctm", "woocommerce"],
      title: `Överlappande spårning/tagghanterare detekterad (${legacyTrackers.length} st)`,
      desc: `Följande äldre tillägg är aktiva: ${legacyTrackers.join(", ")}. CTM (Consent & Tag Manager) ska vara ensam Single Source of Truth för att undvika dubbla Meta/GA4-köphändelser och krockande cookie-banners.`,
      source: "CTM Source Manual & Single Source Architecture",
      compatibility: "Förhindrar dubbelräkning av intäkter och konverteringar i Google Analytics & Meta.",
      singleSourceInfo: {
        overlappingTools: ["CTM (Consent & Tag Manager)", ...legacyTrackers],
        primaryTool: "CTM",
        recommendedTool: "CTM",
        whyRecommended: "CTM samlar alla taggar, Meta CAPI och Consent Mode v2 i ett enda anrop och garanterar noll krockar med LiteSpeed JS-defer.",
        reason: "CTM samlar alla taggar, Meta CAPI och Consent Mode v2 i ett enda anrop och garanterar noll krockar med LiteSpeed JS-defer.",
        actionForSecondary: "Inaktivera eller avinstallera äldre spårningsplugins (GTM4WP, Complianz, PixelYourSite) för att förhindra dubbelspårning.",
        actionOtherTools: "Inaktivera eller avinstallera äldre spårningsplugins (GTM4WP, Complianz, PixelYourSite) för att förhindra dubbelspårning."
      },
      impactCategory: "stability",
      criticalLevel: "high"
    });
  }

  // --- D3. Elementor & DOM/CSS Conflicts ---
  if (environment.hasElementor && elemInfo) {
    const isElemDomOptimized = environment.elemDomOpt ||
      elemInfo.dom_optimization === true ||
      elemInfo.e_dom_optimization === "active" ||
      (elemInfo.experiments && elemInfo.experiments.some(e => {
        const low = e.toLowerCase();
        return (low.includes("dom") || low.includes("optimized_dom") || low.includes("märkkod") || low.includes("markup")) && !low.includes("inactive") && !low.includes("inaktiv");
      }));
    if (!isElemDomOptimized) {
      alerts.push({
        type: "info",
        icon: "💡",
        component: "elementor",
        components: ["elementor"],
        title: "Elementor 'Optimized DOM Output' är inte aktiverat",
        desc: "Elementors optimerade DOM-struktur minskar onödiga kapslade div-element drastiskt och förbättrar PageSpeed & LCP märkbart.",
        source: "Elementor Developer Hub & Experiment Matrix (v3.24+)",
        compatibility: "100% kompatibel med LiteSpeed Cache och moderna WordPress-teman.",
        wpPath: "Elementor ➔ Inställningar ➔ Funktioner ➔ Optimerad DOM-utmatning",
        targetTabId: "elementor",
        impactCategory: "performance",
        criticalLevel: "optimization"
      });
    }

    if (elemInfo.css_print_method && elemInfo.css_print_method !== "external") {
      alerts.push({
        type: "warning",
        icon: "🔄",
        component: "elementor",
        components: ["elementor", "litespeed"],
        title: "Elementor CSS skrivs ut internt i headern istället för extern fil",
        desc: "Ändra CSS Print Method till 'External File' så att LiteSpeed kan cacha och minifiera Elementors stilmallar optimalt.",
        source: "Elementor Documentation & LiteSpeed Cache Integration Guide",
        compatibility: "Extern fil minskar HTML-sidstorleken och aktiverar webbläsarcachning.",
        singleSourceInfo: {
          overlappingTools: ["LiteSpeed CSS Optimizer", "Elementor Internal CSS"],
          primaryTool: "LiteSpeed CSS Minifiering (Extern fil)",
          recommendedTool: "LiteSpeed CSS Minifiering (Extern fil)",
          whyRecommended: "Externa CSS-filer kan cachas i besökarens webbläsare och minifieras en gång på servern istället för att blåsa upp varje HTML-sidas storlek.",
          reason: "Externa CSS-filer kan cachas i besökarens webbläsare och minifieras en gång på servern istället för att blåsa upp varje HTML-sidas storlek.",
          actionForSecondary: "Gå till Elementor ➔ Inställningar ➔ Avancerat ➔ CSS-utskriftsmetod ➔ Välj 'Extern fil'.",
          actionOtherTools: "Gå till Elementor ➔ Inställningar ➔ Avancerat ➔ CSS-utskriftsmetod ➔ Välj 'Extern fil'."
        },
        wpPath: "Elementor ➔ Inställningar ➔ Avancerat ➔ CSS-utskriftsmetod ➔ Extern fil",
        targetTabId: "elementor",
        impactCategory: "performance",
        criticalLevel: "high"
      });
    }
  }

  // --- D4. Tema & Mallar (Astra, Blocksy, Hello Elementor & WooCommerce Overrides) ---
  const activeThemeName = (environment.activeTheme || "").toLowerCase();
  const isAstra = activeThemeName.includes("astra");
  const isBlocksy = activeThemeName.includes("blocksy");

  // Only check theme WooCommerce templates if theme actually controls templates (not overridden by Elementor Theme Builder)
  if (wooInfo && wooInfo.overrides && wooInfo.overrides.length > 0 && !environment.hasElementor) {
    const outdatedOverrides = wooInfo.overrides.filter(o => {
      const lower = o.toLowerCase();
      return lower.includes("out of date") || lower.includes("föråldrad") || lower.includes("är föråldrad") || lower.includes("ej uppdaterad") || lower.includes("outdated");
    });
    if (outdatedOverrides.length > 0) {
      alerts.push({
        id: "alert_outdated_theme_templates",
        type: "warning",
        icon: "⚠️",
        component: "theme",
        components: ["theme", "woocommerce"],
        title: `Föråldrade WooCommerce-mallar i temat (${outdatedOverrides.length} st)`,
        desc: `Ditt aktiva tema (${environment.activeTheme}) innehåller åsidosatta WooCommerce-mallar som är äldre än den installerade WooCommerce-versionen. Orsak: WooCommerce har uppdaterats före temat (väntar på temauppdatering).`,
        source: "WooCommerce Template Structure & Theme Development",
        compatibility: "Uppdatera temat under Instrumentpanel ➔ Uppdateringar för att synka mallarna, eller hantera layouten via Elementor Theme Builder.",
        wpPath: "wp-content/themes/" + (isAstra ? "astra" : (isBlocksy ? "blocksy" : "tema")) + "/woocommerce/",
        targetTabId: "theme_templates",
        impactCategory: "stability",
        criticalLevel: "standard"
      });
    }
  }

  if (isAstra && environment.hasElementor) {
    alerts.push({
      id: "alert_astra_elementor_cart",
      type: "info",
      icon: "ℹ️",
      component: "theme",
      components: ["theme", "elementor", "litespeed"],
      title: "Astra + Elementor: Säkerställ ren WooCommerce Mini-Cart",
      desc: "Både Astra och Elementor erbjuder egna varukorgs-ikoner i headern. Om båda används samtidigt kan dubbla AJAX-anrop ske. Rekommendation: Om du styr sidhuvudet via Elementor Theme Builder ersätts Astras varukorg automatiskt. I annat fall: ta bort Astras varukorg under Anpassare ➔ Header Builder.",
      source: "Astra Documentation & Elementor Theme Builder Guidelines",
      compatibility: "Garanterar felfri synkning mot LiteSpeed ESI och förhindrar dubbla AJAX-anrop.",
      wpPath: "Anpassare ➔ Header Builder ➔ Varukorg (eller Elementor Theme Builder)",
      targetTabId: "theme",
      impactCategory: "performance",
      criticalLevel: "standard"
    });
  }

  // Google Fonts lokala renderingstips för Astra & Blocksy
  if (isAstra || isBlocksy) {
    alerts.push({
      id: "alert_theme_google_fonts_local",
      type: "info",
      icon: "ℹ️",
      component: "theme",
      components: ["theme", "litespeed"],
      title: `${isAstra ? "Astra" : "Temat"}: Säkerställ lokal typografi / Google Fonts`,
      desc: `Externa anrop till fonts.googleapis.com / fonts.gstatic.com ökar laddtider (LCP) och kan bryta mot GDPR. Om dina tematypsnitt står på 'Inherit' eller styrs helt via Elementor sker inga externa anrop från temat. I annat fall: Aktivera 'Load Google Fonts Locally' under ${isAstra ? "Astra ➔ Inställningar ➔ Prestanda" : "Temainställningar ➔ Prestanda"}.`,
      source: "Google Web Vitals & Astra Performance Best Practice",
      compatibility: "Snabbare fontrendering och minskad LCP-latens utan externa nätverksanrop.",
      wpPath: isAstra ? "Astra ➔ Inställningar ➔ Prestanda ➔ Load Google Fonts Locally" : "Utseende ➔ Anpassa ➔ Typografi / Prestanda",
      targetTabId: "theme",
      impactCategory: "performance",
      criticalLevel: "standard"
    });
  }

  // --- E. Wordfence IP-detektering & Brandväggsläge ---
  if (wfInfo) {
    if (environment.wfIpHeader) {
      const ipHeaderLower = environment.wfIpHeader.toLowerCase();
      const isCloudflare = activePluginKeys.some(k => k.toLowerCase().includes("cloudflare")) || 
                           (effectiveSysInfo["wp-server"] && JSON.stringify(effectiveSysInfo["wp-server"]).toLowerCase().includes("cloudflare"));
      
      if (isCloudflare && !ipHeaderLower.includes("cf-connecting-ip") && !ipHeaderLower.includes("connecting-ip")) {
        alerts.push({
          type: "danger",
          icon: "🚨",
          component: "wordfence",
          components: ["wordfence", "server"],
          title: "Wordfence bör använda CF-Connecting-IP (Cloudflare aktivt)",
          desc: "Sajten körs bakom Cloudflare. Ändra Wordfence 'How does Wordfence get IPs' till 'CF-Connecting-IP' för att få äkta besöks-IP istället för Cloudflares proxy-IP.",
          source: "Wordfence Learning Center & Cloudflare Integration Guide",
          compatibility: "Nödvändigt för korrekt IP-blockering och säkerhetsloggar.",
          wpPath: "Wordfence ➔ All Options ➔ General Wordfence Options ➔ How does Wordfence get IPs",
          targetTabId: "wordfence",
          targetSettingId: "wf_ip_header",
          impactCategory: "security",
          criticalLevel: "critical"
        });
      }
    }

    const fwMode = (wfInfo.firewall_mode || wfInfo.firewallMode || "").toLowerCase();
    if (fwMode === "disabled" || fwMode === "learning-mode" || fwMode === "learning") {
      alerts.push({
        id: "alert_wf_firewall_mode",
        type: fwMode === "disabled" ? "danger" : "warning",
        icon: fwMode === "disabled" ? "🚨" : "🛡️",
        component: "wordfence",
        components: ["wordfence", "security"],
        title: fwMode === "disabled" ? "Wordfence Brandvägg är Inaktiverad" : "Wordfence Brandvägg är i 'Learning Mode'",
        desc: fwMode === "disabled" 
          ? "Webbplatsens brandvägg är helt avstängd. Aktivera 'Enabled and Protecting' under Wordfence Firewall Options för fullgott skydd." 
          : "Brandväggen är i inlärningsläge och blockerar inte aktiva attacker. Byt till 'Enabled and Protecting' när legitima anrop har lärts in.",
        source: "Wordfence Web Application Firewall Guide",
        compatibility: "Kritiskt för att skydda webbplatsen mot SQL-injections och skadliga anrop.",
        wpPath: "Wordfence ➔ Firewall ➔ Web Application Firewall Status",
        targetTabId: "wordfence",
        impactCategory: "security",
        criticalLevel: fwMode === "disabled" ? "critical" : "standard"
      });
    }
  }

  // --- E2. SureRank Security Audit (< v1.10.1) ---
  const sureRankKey = activePluginKeys.find(k => k.toLowerCase().includes("surerank"));
  if (sureRankKey && effectiveSysInfo && effectiveSysInfo["wp-plugins-active"] && effectiveSysInfo["wp-plugins-active"][sureRankKey]) {
    const sVer = effectiveSysInfo["wp-plugins-active"][sureRankKey].version || "";
    if (sVer && sVer.startsWith("1.") && !sVer.startsWith("1.10.1") && !sVer.startsWith("1.11") && !sVer.startsWith("1.12")) {
      alerts.push({
        type: "danger",
        icon: "🚨",
        component: "server",
        components: ["server"],
        title: `SureRank SEO (${sVer}) har känd sårbarhet (< v1.10.1)`,
        desc: `Din installerade version (${sVer}) av SureRank innehåller en känd säkerhetsbrist (risk för e-postläckage vid oautentiserade REST API-förfrågningar). Uppdatera till v1.10.1 eller senare.`,
        source: "WPScan & Patchstack Security Advisory (SureRank CVE)",
        compatibility: "Krävs för att skydda butikens kunddata och administratörers e-postadresser.",
        impactCategory: "security",
        criticalLevel: "critical"
      });
    }
  }

  // --- E3. LiteSpeed .data Critical Checkout & Payment Conflicts ---
  if (uploadedSettings && environment.hasWooCommerce) {
    const deferVal = uploadedSettings.optm_js_defer !== undefined ? uploadedSettings.optm_js_defer : (uploadedSettings["optm-js_defer"] !== undefined ? uploadedSettings["optm-js_defer"] : "0");
    const isJsDeferActive = deferVal === "1" || deferVal === 1 || deferVal === "2" || deferVal === 2;
    
    if (isJsDeferActive) {
      const allJsExcl = (
        String(uploadedSettings.js_exclude || uploadedSettings["optm-js_exclude"] || uploadedSettings["optm_js_exc"] || uploadedSettings["optm-js_exc"] || "") + "\n" +
        String(uploadedSettings.js_delayed_exclude || uploadedSettings["optm-js_delayed_exc"] || uploadedSettings["optm_js_delayed_exc"] || uploadedSettings["js_delayed_exc"] || "") + "\n" +
        String(uploadedSettings.optm_js_defer_exc || uploadedSettings["optm-js_defer_exc"] || "")
      ).toLowerCase();
      const missingCheckoutTokens = [];
      const hasKlarna = environment.hasKlarna || (effectiveSysInfo && JSON.stringify(effectiveSysInfo).toLowerCase().includes("klarna"));
      const hasStripe = environment.hasStripe || (effectiveSysInfo && JSON.stringify(effectiveSysInfo).toLowerCase().includes("stripe"));
      if (hasKlarna && !allJsExcl.includes("klarna") && !allJsExcl.includes("kco")) missingCheckoutTokens.push("klarna");
      if (hasStripe && !allJsExcl.includes("stripe")) missingCheckoutTokens.push("stripe");
      if (!allJsExcl.includes("woocommerce") && !allJsExcl.includes("wc-checkout") && !allJsExcl.includes("wc-cart")) missingCheckoutTokens.push("woocommerce");
      if (environment.hasCtm && !allJsExcl.includes("ctm") && !allJsExcl.includes("cookieconsent") && !allJsExcl.includes("datalayer")) missingCheckoutTokens.push("ctm");
      
      if (missingCheckoutTokens.length > 0) {
        alerts.push({
          id: "alert_crit_js_exclude_missing",
          type: "danger",
          icon: "🚨",
          component: "woocommerce",
          components: ["woocommerce", "litespeed"],
          title: "Kritisk Kassa-konflikt: JS Defer aktivt utan betal- och kassa-undantag",
          desc: `LiteSpeed JS Defer eller Delay är aktiverat i din .data-fil men nödvändiga undantag (${missingCheckoutTokens.join(", ")}) saknas i 'Undantagna JS-filer'. Detta bryter kassan, betal-iframes och samtyckesspårning i skarpt läge!`,
          source: "Krokedil, Stripe & LiteSpeed Official Integration Guidelines",
          compatibility: "Kräver omedelbar inläggning av kassa- och samtyckesskript i js_exclude.",
          wpPath: "LiteSpeed Cache ➔ Sidoptimering ➔ [4] Inställningar för JS ➔ Exkluderingar av JS",
          targetTabId: "page_opt",
          targetSettingId: "js_exclude",
          impactCategory: "stability",
          criticalLevel: "critical"
        });
      }
    }
  }

  // --- E4. WooCommerce max_input_vars & Server Check ---
  if (environment.hasWooCommerce && effectiveSysInfo && effectiveSysInfo["wp-server"] && effectiveSysInfo["wp-server"].php_max_input_vars) {
    const maxVars = parseInt(effectiveSysInfo["wp-server"].php_max_input_vars, 10);
    if (maxVars > 0 && maxVars < 1000) {
      alerts.push({
        id: "alert_woo_max_input_vars",
        type: "warning",
        icon: "🛒",
        component: "woocommerce",
        components: ["woocommerce", "server"],
        title: `Lågt php_max_input_vars (${maxVars}) för WooCommerce (Rekommenderas: ≥ 1000)`,
        desc: `E-butiker med många produktattribut, variationer eller checkout-fält kräver max_input_vars på minst 1000 (gärna 3000-5000) för att inte tappa data vid sparande.`,
        source: "WooCommerce Server Requirements Documentation",
        compatibility: "Förhindrar att produktvariationer eller kassan inställningar trunkeras vid sparande.",
        wpPath: "php.ini / .user.ini / .htaccess (max_input_vars = 3000)",
        impactCategory: "stability",
        criticalLevel: "standard"
      });
    }
  }

  // --- E5. Elementor Flexbox Containers Audit ---
  if (environment.hasElementor && elemInfo && Array.isArray(elemInfo.experiments)) {
    if (compareVersions(environment.elemVersion, "3.16.0") >= 0 && !elemInfo.experiments.includes("container")) {
      alerts.push({
        id: "alert_elem_flexbox_containers",
        type: "info",
        icon: "🎨",
        component: "elementor",
        components: ["elementor", "performance"],
        title: "Elementor: Aktivera Flexbox Containers för modern DOM-prestanda",
        desc: "Flexbox Containers reducerar antalet kapslade DOM-element drastiskt jämfört med gamla sektioner/kolumner och förbättrar Core Web Vitals (INP/LCP).",
        source: "Elementor Performance Roadmap & DOM Optimization",
        compatibility: "Minskar DOM-djup och HTML-storlek med upp till 40-70%.",
        wpPath: "Elementor ➔ Inställningar ➔ Funktioner ➔ Flexbox Container",
        targetTabId: "elementor",
        impactCategory: "performance",
        criticalLevel: "optimization"
      });
    }
  }

  // --- E6. Redis vs Memcached Port Mismatch Audit ---
  if (uploadedSettings) {
    const objKind = String(uploadedSettings.cache_object_kind || uploadedSettings["cache-object_kind"] || "").toLowerCase();
    const objPort = parseInt(uploadedSettings.cache_object_port || uploadedSettings["cache-object_port"] || 0, 10);
    if ((objKind === "0" || objKind === "redis") && objPort === 11211) {
      alerts.push({
        id: "alert_crit_redis_port_mismatch",
        type: "danger",
        icon: "🚨",
        component: "litespeed",
        components: ["litespeed", "server"],
        title: "Portkonflikt: Redis Object Cache inställt med Memcached-port (11211)",
        desc: "Redis är valt som Object Cache-metod men porten är satt till 11211 (Memcached standard). Redis standardport är 6379.",
        source: "LiteSpeed Cache Object Cache Documentation",
        compatibility: "Förhindrar anslutningsfel mot Object Cache-servern.",
        wpPath: "LiteSpeed Cache ➔ Cache ➔ [6] Objekt ➔ Port (6379)",
        targetTabId: "cache",
        impactCategory: "stability",
        criticalLevel: "critical"
      });
    } else if ((objKind === "1" || objKind === "memcached") && objPort === 6379) {
      alerts.push({
        id: "alert_crit_memcached_port_mismatch",
        type: "danger",
        icon: "🚨",
        component: "litespeed",
        components: ["litespeed", "server"],
        title: "Portkonflikt: Memcached Object Cache inställt med Redis-port (6379)",
        desc: "Memcached är valt som Object Cache-metod men porten är satt till 6379 (Redis standard). Memcached standardport är 11211.",
        source: "LiteSpeed Cache Object Cache Documentation",
        compatibility: "Förhindrar anslutningsfel mot Object Cache-servern.",
        wpPath: "LiteSpeed Cache ➔ Cache ➔ [6] Objekt ➔ Port (11211)",
        targetTabId: "cache",
        impactCategory: "stability",
        criticalLevel: "critical"
      });
    }
  }

  // --- E7. Theme WooCommerce Support Audit ---
  if (themeInfo && themeInfo.theme_features && Array.isArray(themeInfo.theme_features) && environment.hasWooCommerce) {
    if (!themeInfo.theme_features.includes("woocommerce")) {
      alerts.push({
        id: "alert_theme_woo_support_missing",
        type: "warning",
        icon: "🎭",
        component: "theme",
        components: ["theme", "woocommerce"],
        title: "Aktivt tema saknar deklarerat 'add_theme_support(\"woocommerce\")'",
        desc: "Temat deklarerar inte officiellt WooCommerce-stöd vilket kan orsaka stilproblem eller felaktig layout i butikssidor och kassa.",
        source: "WooCommerce Theme Developer Handbook",
        compatibility: "Nödvändigt för standardiserad rendering av produktgallerier och kassaformulär.",
        wpPath: "functions.php ➔ add_theme_support('woocommerce')",
        targetTabId: "theme",
        impactCategory: "stability",
        criticalLevel: "standard"
      });
    }
  }

  // --- F. SCM (Site Code Manager) Snippet Audits ---
  if (scmInfo && scmInfo.snippets && Array.isArray(scmInfo.snippets)) {
    scmInfo.snippets.forEach((snip, idx) => {
      const code = (snip.code || snip.content || "").toLowerCase();
      const rawCode = snip.code || snip.content || "";
      const title = snip.title || snip.name || `Snippet #${idx + 1}`;

      // Klammerbalanskontroll
      const openBraces = (rawCode.match(/\{/g) || []).length;
      const closeBraces = (rawCode.match(/\}/g) || []).length;
      if (openBraces !== closeBraces) {
        customCodeAlerts.push({
          type: "danger",
          icon: "⚠️",
          component: "scm",
          title: `SCM: Obalanserade klammerparenteser i '${title}' (${openBraces} st '{' vs ${closeBraces} st '}')`,
          desc: "PHP-koden har ojämnt antal klamrar. Detta kan orsaka syntaxfel (Parse error) eller Fatal Error när snippet aktiveras.",
          impactCategory: "stability",
          criticalLevel: "critical"
        });
      }

      if (code.includes("woocommerce_before_cart") || code.includes("woocommerce_after_cart")) {
        customCodeAlerts.push({
          type: "warning",
          icon: "🛒",
          component: "scm",
          title: `SCM: Föråldrad kundkorgs-hook i '${title}'`,
          desc: "Snippet använder generiska varukorgs-hooks som kan sakta ner kundkorgens AJAX-uppdatering.",
          impactCategory: "stability",
          criticalLevel: "standard"
        });
      }

      const hasRawEchoTag = /echo\s*['"]\s*<(script|style)/i.test(code) || /<\/?(script|style)>/i.test(code) || code.includes("echo '<script") || code.includes('echo "<script') || code.includes("echo '<style") || code.includes('echo "<style');
      if (hasRawEchoTag) {
        customCodeAlerts.push({
          type: "info",
          icon: "💡",
          component: "scm",
          title: `SCM Kodkvalitet: Rå HTML/JS utskriven direkt i PHP i '${title}'`,
          desc: "Rekommendation: Skript och stilar bör registreras via wp_enqueue_script/wp_enqueue_style istället för rå echo, så att LiteSpeed kan optimera dem säkert.",
          impactCategory: "stability",
          criticalLevel: "standard",
          scoreImpact: 0
        });
      }

      // Transient check: Only flag if dynamic keys without expiration or uncleaned transients are detected
      const hasDynamicTransientKey = /set_transient\s*\(\s*['"][^'"]*['"]\s*\.\s*\$/i.test(code) || 
                                     /set_transient\s*\(\s*\$/i.test(code) ||
                                     /set_transient\s*\([^,]+,[^,]+,\s*0\s*\)/i.test(code);
      
      const isRedisActive = environment && (environment.hasRedis || environment.isRedisConnected);

      if (hasDynamicTransientKey && !isRedisActive && !code.includes("delete_transient")) {
        customCodeAlerts.push({
          type: "warning",
          icon: "💾",
          component: "scm",
          title: `SCM: Dynamiska transienter utan automatisk rensning i '${title}'`,
          desc: "Snippet genererar dynamiska eller obegränsade transient-nycklar. Utan Object Cache (Redis) kan detta göra att wp_options-tabellen sväller. Säkerställ TTL eller registrera delete_transient() vid relevanta händelse-hooks.",
          impactCategory: "stability",
          criticalLevel: "standard"
        });
      }
    });
  }

  // --- G. Custom CSS Audits ---
  if (customCss) {
    const importantMatches = customCss.match(/!important/g);
    if (importantMatches && importantMatches.length > 5) {
      customCssAlerts.push({
        type: "warning",
        icon: "🎨",
        component: "css",
        title: `${importantMatches.length} st '!important'-regler i CSS`,
        desc: "Överdriven användning av !important gör stilar svåra att underhålla och kan försvåra LiteSpeeds kritiska CSS-generering.",
        impactCategory: "performance",
        criticalLevel: "standard"
      });
    }

    if (customCss.includes("@import")) {
      customCssAlerts.push({
        type: "danger",
        icon: "🚫",
        component: "css",
        title: "@import upptäckt i anpassad CSS",
        desc: "Användning av @import blockerar renderingspipelinen och fördröjer laddning av kritiska stilar. Lägg in CSS direkt eller köa med wp_enqueue_style() i SCM.",
        impactCategory: "performance",
        criticalLevel: "critical"
      });
    }

    if (customCss.includes("@font-face") && !customCss.toLowerCase().includes("font-display")) {
      customCssAlerts.push({
        type: "warning",
        icon: "🔤",
        component: "css",
        title: "@font-face saknar 'font-display: swap;'",
        desc: "Externa typsnitt som saknar font-display: swap kan orsaka osynlig text under laddning (FOIT) och sänka Core Web Vitals (FCP/LCP).",
        impactCategory: "performance",
        criticalLevel: "standard"
      });
    }
  }

  // 4. Build Complete 1:1 LiteSpeed Cache Settings Recommendations
  const recommendations = buildCompleteLscwpSettings(environment, uploadedSettings, wooInfo, elemInfo, wfInfo);

  // 5. Build 3-bullet Upload Summaries
  const fileSummaries = {
    sysInfo: sysInfo ? [
      { text: `WordPress v${environment.wpVersion} på ${environment.isLiteSpeedServer ? "LiteSpeed Server 🟢" : environment.server + " 🟡"}`, status: environment.isLiteSpeedServer ? "success" : "warning" },
      { text: `PHP v${environment.phpVersion} (Memory: ${environment.phpMemoryLimit}, WP: ${environment.wpMemoryLimit})`, status: wpMemNum >= 256 ? "success" : "danger" },
      { text: `Plugins: ${activePluginKeys.length} st (${environment.hasWooCommerce ? "WooCommerce OK, " : ""}${environment.hasElementor ? "Elementor OK, " : ""}CTM & SCM integrerade)`, status: "success" }
    ] : [
      { text: "Standardreferensmiljö (WordPress v6.7.2 + LiteSpeed Server)", status: "info" },
      { text: "Ladda upp WP-systemfil (Slot 1) för sajtunik server- & pluginidentifiering", status: "info" },
      { text: "Fristående analys aktiv baserat på inlästa moduler", status: "success" }
    ],
    wooInfo: [
      { text: environment.hasWooCommerce ? `WooCommerce v${environment.wooVersion} aktivt` : "WooCommerce ej aktivt på denna sajt", status: environment.hasWooCommerce ? "success" : "info" },
      { text: wooInfo && wooInfo.hpos_enabled ? "HPOS (High-Performance Order Storage) är AKTIVERAT 🟢" : (environment.hasWooCommerce ? "HPOS rekommenderas för ökad databasprestanda" : "Ej applicerbart"), status: wooInfo && wooInfo.hpos_enabled ? "success" : "warning" },
      { text: "Kassa- och varukorgssidor valideras mot drop_uri", status: "success" }
    ],
    wfInfo: [
      { text: wfInfo ? `Wordfence-diagnostik inläst (IP: ${environment.wfIpHeader})` : "Standard säkerhetsregler för LiteSpeed appliceras", status: "info" },
      { text: "Wordfence IP-detektering: " + (environment.wfIpHeader.includes("REMOTE_ADDR") ? "REMOTE_ADDR (Optimalt direktval) 🟢" : environment.wfIpHeader), status: "success" },
      { text: "Brandvägg och Live Traffic optimering kontrolleras", status: "success" }
    ],
    elemInfo: [
      { text: environment.hasElementor ? `Elementor v${environment.elemVersion} aktivt` : "Elementor ej aktivt", status: environment.hasElementor ? "success" : "info" },
      { text: elemInfo && elemInfo.css_print_method === "external" ? "CSS Print Method: Extern fil (Optimalt) 🟢" : "CSS Print Method rekommenderas som 'Extern fil'", status: elemInfo && elemInfo.css_print_method === "external" ? "success" : "warning" },
      { text: "DOM-optimering och förladdning av tillgångar granskas", status: "success" }
    ],
    scmInfo: [
      { text: scmInfo ? `SCM: Inläst och granskat (${scmInfo.snippets ? scmInfo.snippets.length : 0} snippets)` : "Site Code Manager (SCM) redo för snippets", status: "success" },
      { text: "PHP-hooks, WooCommerce-anrop och CSS valideras för noll krockar", status: "success" },
      { text: "Steg 2 Export: Färdig SCM JSON-profil genereras", status: "success" }
    ],
    uploadedSettings: [
      { text: uploadedSettings ? `Inläst LiteSpeed-profil (.data) med ${Object.keys(uploadedSettings).length} parametrar` : "Ingen .data-fil inläst – Advanced Preset genereras automatiskt från scratch", status: "success" },
      { text: "100% 1:1 paritet med LiteSpeed Cache adminflikar", status: "success" },
      { text: "Kritiska inställningar och avvikelser markeras tydligt", status: "success" }
    ]
  };

  // 6. Build Cockpit Architecture Overview (Verktyg & Funktioner)
  const cockpitTools = [
    {
      id: "wp_system",
      name: "WP-system",
      icon: "🖥️",
      version: environment.wpVersion !== "Okänd" ? `v${environment.wpVersion}` : "Inläst",
      status: "optimal",
      active: true,
      subtext: environment.isLiteSpeedServer ? "LiteSpeed Server" : environment.server
    },
    {
      id: "litespeed",
      name: "LiteSpeed",
      icon: "⚡",
      version: environment.hasLiteSpeedPlugin ? `v${environment.lscwpVersion}` : (uploadedSettings ? "Profil inläst" : "Advanced Preset"),
      status: environment.hasLiteSpeedPlugin || uploadedSettings ? "optimal" : "info",
      active: environment.hasLiteSpeedPlugin || !!uploadedSettings,
      subtext: "LSCWP Cachemotor"
    },
    {
      id: "woocommerce",
      name: "WooCommerce",
      icon: "🛒",
      version: environment.hasWooCommerce ? `v${environment.wooVersion}` : "Ej aktivt",
      status: environment.hasWooCommerce ? "optimal" : "neutral",
      active: environment.hasWooCommerce,
      subtext: environment.hasWooCommerce 
        ? (detectedGateways.length > 0 ? `${detectedGateways.join(" + ")} skyddade` : "Standard kassa")
        : "Ej installerat"
    },
    {
      id: "wordfence",
      name: "Wordfence",
      icon: "🔒",
      version: environment.hasWordfence ? `v${environment.wfVersion}` : (wfInfo ? "Diagnostik inläst" : "Standard"),
      status: environment.hasWordfence || !!wfInfo ? "optimal" : "neutral",
      active: environment.hasWordfence || !!wfInfo,
      subtext: environment.wfIpHeader.includes("REMOTE_ADDR") ? "REMOTE_ADDR" : (wfInfo ? "Diagnostik inläst" : "Ej inläst")
    },
    {
      id: "theme",
      name: "Tema",
      icon: "🎭",
      version: environment.activeTheme + (environment.activeThemeVersion ? ` v${environment.activeThemeVersion}` : ""),
      status: "optimal",
      active: true,
      subtext: environment.hasChildTheme ? "Barntema aktivt" : "Huvudtema"
    },
    {
      id: "elementor",
      name: "Elementor",
      icon: "🎨",
      version: environment.hasElementor ? `v${environment.elemVersion}` : "Ej aktivt",
      status: environment.hasElementor ? "optimal" : "neutral",
      active: environment.hasElementor,
      subtext: environment.hasElementor ? (elemInfo && elemInfo.css_print_method === "external" ? "Extern fil" : "Sidbyggare") : "Ej installerat"
    },
    {
      id: "scm",
      name: "SCM",
      icon: "🔌",
      version: `v${BENCHMARK_VERSIONS.scm.latestRelease}`,
      status: (environment.hasSCM || scmInfo) ? "optimal" : "neutral",
      active: Boolean(environment.hasSCM || scmInfo),
      subtext: scmInfo ? `${scmInfo.snippets ? scmInfo.snippets.length : 0} snippets granskade` : (environment.hasSCM ? "Aktiv källkod" : "Ej inläst")
    },
    {
      id: "ctm",
      name: "CTM",
      icon: "🛡️",
      version: `v${BENCHMARK_VERSIONS.ctm.latestRelease}`,
      status: environment.hasCTM ? "optimal" : "neutral",
      active: Boolean(environment.hasCTM),
      subtext: environment.hasCTM ? "Aktiv samtyckesmotor" : "Ej inläst"
    }
  ];

  // Determine active states (PÅ / AV) for the 5 multi-tool functions
  // 1. Lazyload
  const hasLscwpLazy = uploadedSettings ? (uploadedSettings.media_lazy === "1" || uploadedSettings.media_lazy === 1 || uploadedSettings["media-lazy"] === "1" || uploadedSettings["media-lazy"] === "1") : false;
  const hasElemLazy = elemInfo ? (elemInfo.lazy_load_enabled === true || elemInfo.hasLazyLoad === true || elemInfo.e_lazy_load_images === "active" || elemInfo.e_lazy_load_images === "1") : false;
  const isWpLazy = !Boolean(scmInfo && JSON.stringify(scmInfo).toLowerCase().includes("wp_lazy_loading_enabled") && JSON.stringify(scmInfo).toLowerCase().includes("false"));
  
  let lazyStatus = "optimal";
  let lazyStatusText = "Optimal";
  if (hasLscwpLazy && hasElemLazy) {
    lazyStatus = "danger";
    lazyStatusText = "Dubbel aktivering";
  } else if (!hasLscwpLazy && !hasElemLazy && !isWpLazy) {
    lazyStatus = "warning";
    lazyStatusText = "Inaktiv";
  } else {
    lazyStatus = "optimal";
    lazyStatusText = "Optimal";
  }

  // 2. JS-optimering
  const currentDeferVal = uploadedSettings ? (uploadedSettings.optm_js_defer !== undefined ? uploadedSettings.optm_js_defer : uploadedSettings["optm-js_defer"]) : "1";
  const isLscwpJs = currentDeferVal === "1" || currentDeferVal === 1 || currentDeferVal === "2" || currentDeferVal === 2;
  const isElemJs = elemInfo ? (elemInfo.elementor_experiment_e_optimized_assets_loading === "active" || elemInfo.e_optimized_assets_loading === "active") : false;
  
  let jsStatus = isLscwpJs ? "optimal" : "warning";
  let jsStatusText = isLscwpJs ? "Optimal" : "Inaktiv";

  // 3. CSS-generering (v2.6.10.3: Combine/Async AV + Minify = Optimal; Async ON medan rec=AV → warning)
  const isCombOn = uploadedSettings ? (uploadedSettings.optm_css_comb === "1" || uploadedSettings.optm_css_comb === 1 || uploadedSettings["optm-css_comb"] === "1" || uploadedSettings["optm-css_comb"] === 1) : false;
  const isCssMinOn = uploadedSettings ? (uploadedSettings.optm_css_min === "1" || uploadedSettings.optm_css_min === 1 || uploadedSettings["optm-css_min"] === "1" || uploadedSettings["optm-css_min"] === 1) : false;
  const isCssAsyncOn = uploadedSettings ? (uploadedSettings.optm_css_async === "1" || uploadedSettings.optm_css_async === 1 || uploadedSettings["optm-css_async"] === "1" || uploadedSettings["optm-css_async"] === 1) : false;
  const isLscwpCss = Boolean(uploadedSettings && (uploadedSettings.optm_css_async === "1" || uploadedSettings["optm-css_async"] === "1" || uploadedSettings.optm_css_comb === "1" || uploadedSettings["optm-css_comb"] === "1" || uploadedSettings.optm_css_min === "1" || uploadedSettings["optm-css_min"] === "1"));
  const isElemCss = elemInfo ? (elemInfo.css_print_method === "external" || elemInfo.css_print_method === "internal" || elemInfo.e_optimized_css_loading === "active") : false;
  
  let cssStatus = "optimal";
  let cssStatusText = "Optimal";
  if (isCombOn) {
    cssStatus = "warning";
    cssStatusText = "Kombinering aktiv (Risk)";
  } else if (isCssAsyncOn) {
    // Recommendation for optm_css_async is AV (0); Async ON must not produce Optimal
    cssStatus = "warning";
    cssStatusText = "Async CSS aktiv (avråds)";
  } else if (!isCssMinOn && uploadedSettings && Object.keys(uploadedSettings).length > 0) {
    cssStatus = "warning";
    cssStatusText = "Ej minifierad";
  } else {
    cssStatus = "optimal";
    cssStatusText = "Optimal";
  }

  // 4. Google Fonts
  const isLscwpGgAsync = uploadedSettings ? (uploadedSettings.optm_ggfonts_async === "1" || uploadedSettings["optm-ggfonts_async"] === "1") : false;
  const isLscwpGgFontsRm = uploadedSettings ? (uploadedSettings.optm_ggfonts_rm === "1" || uploadedSettings["optm-ggfonts_rm"] === "1") : false;
  let lsGgState = "AV";
  if (isLscwpGgFontsRm) {
    lsGgState = "AV (Blockerad)";
  } else if (isLscwpGgAsync) {
    lsGgState = "PÅ (Async)";
  }

  const isElemGgFonts = elementorSignalsExternalGoogleFonts(elemInfo);
  const isThemeGgFonts = themeSignalsExternalGoogleFonts(themeInfo) || Boolean(environment && environment.hasThemeGoogleFonts);
  
  let ggStatus = "optimal";
  let ggStatusText = "Optimal";
  if (isElemGgFonts || isThemeGgFonts) {
    if (!isLscwpGgFontsRm) {
      ggStatus = "info";
      ggStatusText = "Extern laddning";
    }
  }

  // 5. Brandvägg
  const isWfActive = Boolean(environment.hasWordfence || wfInfo);
  const isLsWafActive = Boolean(environment.isLiteSpeedServer);
  let wafStatus = isWfActive || isLsWafActive ? "optimal" : "warning";
  let wafStatusText = isWfActive || isLsWafActive ? "Optimal" : "Inaktiv";

  const cockpitFunctions = [
    {
      id: "lazyload",
      name: "Lazyload",
      status: lazyStatus,
      statusText: lazyStatusText,
      tools: [
        { name: "LiteSpeed", state: hasLscwpLazy ? "PÅ" : "AV" },
        { name: "Elementor", state: hasElemLazy ? "PÅ" : "AV" },
        { name: "WordPress", state: isWpLazy ? "PÅ" : "AV" }
      ]
    },
    {
      id: "js_opt",
      name: "JS-optimering",
      status: jsStatus,
      statusText: jsStatusText,
      tools: [
        { name: "LiteSpeed", state: isLscwpJs ? "PÅ" : "AV" },
        { name: "Elementor", state: isElemJs ? "PÅ" : "AV" }
      ]
    },
    {
      id: "css_gen",
      name: "CSS-generering",
      status: cssStatus,
      statusText: cssStatusText,
      tools: [
        { name: "LiteSpeed", state: isLscwpCss ? "PÅ" : "AV" },
        { name: "Elementor", state: isElemCss ? "PÅ" : "AV" }
      ]
    },
    {
      id: "google_fonts",
      name: "Google Fonts",
      status: ggStatus,
      statusText: ggStatusText,
      tools: [
        { name: "LiteSpeed", state: lsGgState },
        { name: "Elementor", state: isElemGgFonts ? "PÅ" : "AV" },
        { name: "Tema", state: isThemeGgFonts ? "PÅ" : "AV" }
      ]
    },
    {
      id: "firewall",
      name: "Brandvägg",
      status: wafStatus,
      statusText: wafStatusText,
      tools: [
        { name: "Wordfence", state: isWfActive ? "PÅ" : "AV" },
        { name: "LiteSpeed", state: isLsWafActive ? "PÅ" : "AV" }
      ]
    }
  ];

  return {
    environment,
    versionMatrix,
    alerts,
    customCodeAlerts,
    customCssAlerts,
    recommendations,
    fileSummaries,
    cockpitTools,
    cockpitFunctions
  };
}

/**
 * Builds the complete 1:1 LiteSpeed Cache setting structure matching the plugin's admin tabs.
 */
function buildCompleteLscwpSettings(env, uploadedSettings, wooInfo, elemInfo, wfInfo) {
  const isWoo = env.hasWooCommerce;
  const isElem = env.hasElementor;

  // Build safe drop_uri exclusions
  let defaultDropUri = "";
  if (isWoo) {
    defaultDropUri = "/cart/\n/checkout/\n/kassa/\n/varukorg/\n/my-account/\n/mitt-konto/\nwc-api=";
  }

  // Build safe JS exclusions (Guarantees CTM, Elementor & WooCommerce/Kustom/Klarna protection)
  let defaultJsExclude = "ctm\nctm-init.js\ncookieconsent\ndataLayer\njquery.js\njquery.min.js";
  if (isWoo) {
    defaultJsExclude += "\nwoocommerce\nwc-checkout\nwc-cart\nklarna-checkout-for-woocommerce\nklarna-payments\njs.live.kustom.co\njs.playground.kustom.co\ncdn.klarna.com\njs.klarna.com\nkustom\nkco\nstripe\nklarna\npaypal\nswish\nsvea";
  }
  if (isElem) {
    defaultJsExclude += "\nelementorFrontend\nelementor-frontend";
  }

  // Build safe CSS exclusions (Guarantees CTM, Elementor uploads & Payment styling protection)
  let defaultCssExclude = "cookieconsent\nctm-public";
  if (isWoo) {
    defaultCssExclude += "\nkustom\nklarna\npaypal\nswish";
  }
  if (isElem) {
    defaultCssExclude += "\nwp-content/uploads/elementor/css/*";
  }

  function makeOpt(id, title, recommendedRaw, desc, criticalLevel, impactCategory, citations, singleSourceInfo, tool, customSources, alternatives, extra) {
    const activeTool = tool || "litespeed";
    const optObj = { id, title, tool: activeTool, recommendedRaw, criticalLevel: criticalLevel || "standard" };
    const comp = getOptionComparison(optObj, uploadedSettings, env);
    const userVal = comp.isMeasured ? comp.rawMeasured : recommendedRaw;
    const isChangedNeeded = comp.isDeviant;

    let normalizedSsi = null;
    if (singleSourceInfo) {
      normalizedSsi = {
        overlappingTools: singleSourceInfo.overlappingTools || [],
        recommendedTool: singleSourceInfo.recommendedTool || singleSourceInfo.primaryTool || "Primärt verktyg",
        primaryTool: singleSourceInfo.primaryTool || singleSourceInfo.recommendedTool || "Primärt verktyg",
        reason: singleSourceInfo.reason || singleSourceInfo.whyRecommended || "",
        whyRecommended: singleSourceInfo.whyRecommended || singleSourceInfo.reason || "",
        actionOtherTools: singleSourceInfo.actionOtherTools || singleSourceInfo.actionForSecondary || "",
        actionForSecondary: singleSourceInfo.actionForSecondary || singleSourceInfo.actionOtherTools || ""
      };
    }

    let sources = null;
    if (customSources) {
      sources = customSources;
    } else {
      // 1. Wordfence specific settings
      if (activeTool === "wordfence" || id.startsWith("wf_")) {
        sources = {
          lsAdv: { name: "LiteSpeed Technologies", status: "neutral", text: "LiteSpeed Technologies: Ej tillämplig (Wordfence intern säkerhetsinställning)." },
          oom: { name: "Online Media Masters (Tom Dupuis)", status: "neutral", text: "Online Media Masters: Ej tillämplig (omfattas ej av LiteSpeed Cache-guiden)." },
          domain: { 
            name: "Wordfence Security", 
            status: id === "wf_disable_live_traffic" ? "green" : (recommendedRaw === "disabled" ? "red" : "green"), 
            text: (citations && citations.consensus) || "Wordfence Help Center: Officiell säkerhets- och prestandarekommendation." 
          }
        };
      }
      // 2. Elementor specific settings
      else if (activeTool === "elementor" || id.startsWith("elem_")) {
        const isLazy = id === "elem_lazy_load";
        sources = {
          lsAdv: { name: "LiteSpeed Technologies", status: "neutral", text: "LiteSpeed Technologies: Ej tillämplig (inställningen styrs internt i Elementor Core)." },
          oom: { 
            name: "Online Media Masters (Tom Dupuis)", 
            status: isLazy ? "red" : "green", 
            text: isLazy 
              ? "Online Media Masters: Avråder från Elementors inbyggda lazyload till förmån för LiteSpeed/Native för att undvika dubbla lyssnare." 
              : "Online Media Masters (Elementor Guide): Rekommenderar PÅ för optimal rendering och minskat DOM-djup." 
          },
          domain: { 
            name: "Elementor Core", 
            status: isLazy ? "red" : "green", 
            text: (citations && citations.consensus) || (isLazy 
              ? "Elementor Developer Hub: Inaktivera när externt cache-plugin hanterar bildoptimering." 
              : "Elementor Developer Hub: Rekommenderad standardinställning för modern sidstruktur.") 
          }
        };
      }
      // 3. Server / PHP environment settings
      else if (activeTool === "server" || id.startsWith("php_") || id.startsWith("wp_")) {
        sources = {
          lsAdv: { name: "LiteSpeed Technologies", status: "neutral", text: "LiteSpeed Technologies: Ej tillämplig (allmän server- och PHP-miljö)." },
          oom: { name: "Online Media Masters (Tom Dupuis)", status: "neutral", text: "Online Media Masters: Ej tillämplig (allmän servermiljö)." },
          domain: { 
            name: "WordPress & WooCommerce", 
            status: "green", 
            text: (citations && citations.consensus) || "WordPress Core & WooCommerce: Officiella system- och minneskrav för stabil drift." 
          }
        };
      }
      // 4. Theme specific settings
      else if (activeTool === "theme" || id.startsWith("theme_") || id.startsWith("astra_")) {
        sources = {
          lsAdv: { name: "LiteSpeed Technologies", status: "neutral", text: "LiteSpeed Technologies: Ej tillämplig (temaspecifik inställning)." },
          oom: { name: "Online Media Masters (Tom Dupuis)", status: "green", text: "Online Media Masters: Rekommenderar systemfonter eller lokalt sparade Google Fonts i temat." },
          domain: { 
            name: "Tema & WordPress", 
            status: "green", 
            text: (citations && citations.consensus) || "Tema & WordPress Standard: Officiella riktlinjer för mallar och typografi." 
          }
        };
      }
      // 5. WooCommerce specific settings
      else if (activeTool === "woocommerce" || id.startsWith("woo_")) {
        sources = {
          lsAdv: { name: "LiteSpeed Technologies", status: "green", text: (citations && citations.litespeed) || "LiteSpeed Technologies: Full kompatibilitet med modern WooCommerce-arkitektur." },
          oom: { name: "Online Media Masters (Tom Dupuis)", status: "green", text: "Online Media Masters: Rekommenderar HPOS och optimerad varukorg för e-handelsprestanda." },
          domain: { name: "WooCommerce Core", status: "green", text: (citations && citations.consensus) || "WooCommerce Developer Handbook: Officiell modern standard för orderlagring och databashantering." }
        };
      }
      // 6. ESI (Edge Side Includes)
      else if (id === "esi") {
        sources = {
          lsAdv: { name: "LiteSpeed Technologies", status: "red", text: "LiteSpeed Presets: Rekommenderar AV (0) som standard för att undvika onödig server-overhead vid sidmontering." },
          oom: { name: "Online Media Masters (Tom Dupuis)", status: "red", text: "Online Media Masters: Avråder från ESI (Off). Komplicerar cache, nonces och admin bar i onödan." },
          domain: { name: "WooCommerce & Web Standards", status: "red", text: "WooCommerce Core: Rekommenderar AV (0). Klientbaserad JS/AJAX hanterar varukorgsfragment medan statisk cache bypassas för kassa/varukorg." }
        };
      }
      // 7. CSS / JS Combine
      else if (id.includes("comb") || id.includes("combine")) {
        sources = {
          lsAdv: { name: "LiteSpeed Technologies", status: "yellow", text: "LiteSpeed Presets: Valfritt beroende på HTTP/2 vs HTTP/3 och sajtstorlek." },
          oom: { name: "Online Media Masters (Tom Dupuis)", status: "red", text: "Online Media Masters: Avråder från Combine vid HTTP/2/3 då det skapar stora render-blockerande resurser." },
          domain: { name: "Google Core Web Vitals", status: "red", text: "Google Core Web Vitals: HTTP/2 multiplexing gör Combine onödigt och skadligt för LCP och INP." }
        };
      }
      // 8. Guest Mode
      else if (id === "guest_mode") {
        sources = {
          lsAdv: { name: "LiteSpeed Technologies", status: isWoo ? "yellow" : "green", text: isWoo ? "LiteSpeed Presets: Kräver noggranna undantag för e-handel för att undvika session bleed." : "LiteSpeed Presets: Rekommenderar PÅ för statiska bloggar." },
          oom: { name: "Online Media Masters (Tom Dupuis)", status: isWoo ? "red" : "green", text: isWoo ? "Online Media Masters: Avråder från Guest Mode på WooCommerce för att undvika kundkorgs- och geolokaliseringsfel." : "Online Media Masters: Rekommenderar PÅ för maximal TTFB på vanliga webbplatser." },
          domain: { name: isWoo ? "WooCommerce Core" : "Google Web Dev", status: isWoo ? "red" : "green", text: isWoo ? "WooCommerce Developer Docs: Gästläge riskerar att visa statisk cache vid dynamiska kundvagnar." : "Google Web Dev: Snabbare TTFB för förstabesökare." }
        };
      }
      // 9. Object Cache (Redis / Memcached)
      else if (id === "cache_object") {
        sources = {
          lsAdv: { name: "LiteSpeed Technologies", status: "green", text: "LiteSpeed Object Cache: Inbyggd Redis/Memcached-modul sparar frekventa SQL-frågor i RAM." },
          oom: { name: "Online Media Masters (Tom Dupuis)", status: "green", text: "Online Media Masters: Rekommenderar Redis Object Cache om server/hosting har Redis installerat." },
          domain: { name: "WooCommerce Core", status: "green", text: "WooCommerce Performance Docs: Minskar databasbelastningen från hundratals frågor till ensiffrigt per sidvisning." }
        };
      }
      // 10. JS Defer
      else if (id === "optm_js_defer") {
        sources = {
          lsAdv: { name: "LiteSpeed Technologies", status: "green", text: "LiteSpeed Presets: Deferred/Delayed minskar Total Blocking Time (TBT)." },
          oom: { name: "Online Media Masters (Tom Dupuis)", status: "green", text: "Online Media Masters: Rekommenderar JS Delay/Defer för 90+ på PageSpeed Insights." },
          domain: { name: "Google Core Web Vitals", status: "green", text: "Google Web Dev (INP & LCP): Asynkron skriptexekvering förhindrar att JavaScript blockerar sidrendering." }
        };
      }
      // 11. Exclusions (drop_uri, js_exclude, css_exclude, media_lazy_exc)
      else if (id === "drop_uri" || id === "js_exclude" || id === "css_exclude" || id === "media_lazy_exc") {
        sources = {
          lsAdv: { name: "LiteSpeed Technologies", status: "green", text: "LiteSpeed Docs: Kräver manuella exkluderingar för kassa och samtyckesskript." },
          oom: { name: "Online Media Masters (Tom Dupuis)", status: "green", text: "Online Media Masters: Rekommenderar noggranna exkluderingar för att förhindra brutna betalningar och formulär." },
          domain: { name: isWoo ? "WooCommerce & Betalväxlar" : "WordPress & GDPR", status: "green", text: isWoo ? "Krokedil, Stripe & Klarna: Kritiskt att kassa, webhooks och betal-iframes undantas helt från optimering." : "WordPress Core & GDPR: Samtycke och formulärskript får inte fördröjas." }
        };
      }
      // 12. CTM / Consent scripts
      else if (id.includes("ctm") || id.includes("cookieconsent")) {
        sources = {
          lsAdv: { name: "LiteSpeed Technologies", status: "neutral", text: "LiteSpeed Technologies: Ej tillämplig (GDPR-samtyckeshanterare)." },
          oom: { name: "Online Media Masters (Tom Dupuis)", status: "neutral", text: "Online Media Masters: Ej tillämplig (omfattas ej av LiteSpeed-guiden)." },
          domain: { name: "CTM Consent Engine", status: "green", text: "CTM Source Guide: Samtyckesskript måste köras utan fördröjning för GDPR-efterlevnad." }
        };
      }
      // 13. Google Fonts Remove (Policy)
      else if (id === "optm_ggfonts_rm") {
        sources = {
          lsAdv: { name: "LiteSpeed Presets", status: "neutral", text: "LiteSpeed Presets: Standard är AV (0), men PÅ (1) rekommenderas om externa Google Fonts skall blockeras." },
          oom: { name: "Online Media Masters", status: "green", text: "Online Media Masters: PÅ rekommenderas om lokala fonter används för att stoppa externa Google-anrop." },
          domain: { name: "GDPR & Webbstandard", status: "green", text: "GDPR / ePrivacy: PÅ är optimalt om sajten inte använder Google Fonts eller har lokala fonter." }
        };
      }
      // 14. VPI (Viewport Images)
      else if (id === "media_vpi") {
        const hasLsLazy = uploadedSettings ? (uploadedSettings.media_lazy === "1" || uploadedSettings.media_lazy === 1 || uploadedSettings["media-lazy"] === "1" || uploadedSettings["media-lazy"] === 1) : false;
        sources = {
          lsAdv: { name: "LiteSpeed / QUIC.cloud", status: hasLsLazy ? "green" : "neutral", text: hasLsLazy ? "LiteSpeed VPI: Genererar automatiska viewport-bilder för att förbättra LCP." : "LiteSpeed VPI: Inaktiv/krävs ej när LiteSpeed Lazy Load är avstängd." },
          oom: { name: "Online Media Masters", status: hasLsLazy ? "green" : "neutral", text: hasLsLazy ? "Online Media Masters: Bra komplement när LiteSpeed bild-lazyload används." : "Online Media Masters: Behåll AV om sajten kör WordPress inbyggda Lazy Load." },
          domain: { name: "Core Web Vitals", status: "green", text: hasLsLazy ? "Google Web Dev: Förhindrar att ovanför-viket-bilder fördröjs." : "WordPress Native Lazy: Sköts av webbläsaren utan externa QUIC-anrop." }
        };
      }
      // 15. CSS Async Satellites (CCSS per URL & Inline Async Lib)
      else if (id === "optm_ccss_per_url" || id === "optm_css_async_inline") {
        const isCssAsyncActive = uploadedSettings ? (
          uploadedSettings.optm_css_async === "1" || uploadedSettings.optm_css_async === 1 ||
          uploadedSettings["optm-css_async"] === "1" || uploadedSettings["optm-css_async"] === 1 ||
          (uploadedSettings.options && (uploadedSettings.options.optm_css_async === "1" || uploadedSettings.options["optm-css_async"] === "1"))
        ) : false;
        sources = {
          lsAdv: { name: "LiteSpeed Docs", status: isCssAsyncActive ? "green" : "neutral", text: isCssAsyncActive ? "LiteSpeed Docs: Krävs när asynkron CSS används." : "LiteSpeed Docs: Inaktiv när asynkron CSS är avstängd." },
          oom: { name: "Online Media Masters", status: isCssAsyncActive ? "green" : "neutral", text: isCssAsyncActive ? "Online Media Masters: Viktig satellit vid asynkron CSS." : "Online Media Masters: Behåll inaktiv då Async CSS avråds vid sidbyggare." },
          domain: { name: "Web Vitals / Elementor", status: "green", text: isCssAsyncActive ? "Elementor Best Practice: Unik CCSS förhindrar layoutskakningar." : "Elementor & Core Web Vitals: Inaktiv då standard CSS-laddning används." }
        };
      }
      // 16. Google Fonts Async
      else if (id === "optm_ggfonts_async") {
        const isGgRm = uploadedSettings ? (uploadedSettings.optm_ggfonts_rm === "1" || uploadedSettings.optm_ggfonts_rm === 1 || uploadedSettings["optm-ggfonts_rm"] === "1" || uploadedSettings["optm-ggfonts_rm"] === 1) : false;
        sources = {
          lsAdv: { name: "LiteSpeed Presets", status: isGgRm ? "neutral" : "green", text: isGgRm ? "LiteSpeed Presets: Inaktiv när Google Fonts raderas (Remove är PÅ)." : "LiteSpeed Presets: Asynkron typsnittshämtning minskar FCP." },
          oom: { name: "Online Media Masters", status: isGgRm ? "neutral" : "green", text: isGgRm ? "Online Media Masters: Krävs ej vid lokala fonter eller borttagning." : "Online Media Masters: Rekommenderar PÅ om externa Google Fonts används." },
          domain: { name: "Google Web Dev", status: "green", text: isGgRm ? "GDPR / Lokala fonter: Inga externa anrop exekveras." : "Core Web Vitals: Undviker renderingsblockerande typsnitt." }
        };
      }
      // 17. Default LiteSpeed settings
      else {
        let isTurnedOff = recommendedRaw === 0 || recommendedRaw === "0";
        let isDelayed = recommendedRaw === 2 || recommendedRaw === "2";
        sources = {
          lsAdv: { 
            name: "LiteSpeed Advanced Preset", 
            status: isTurnedOff ? "red" : "green", 
            text: (citations && citations.litespeed) || (isTurnedOff ? "LiteSpeed Presets: Rekommenderar AV (0) för stabil grunddrift." : (isDelayed ? "LiteSpeed Presets: Stöder Delayed/Deferred (2) för maximal PageSpeed." : "LiteSpeed Presets: Rekommenderar PÅ (1) som optimerad standard."))
          },
          oom: { 
            name: "Online Media Masters (Tom Dupuis)", 
            status: isTurnedOff ? "red" : "green", 
            text: isTurnedOff ? "Online Media Masters: Rekommenderar AV för optimal stabilitet." : "Online Media Masters: Rekommenderat val för Core Web Vitals." 
          },
          domain: { 
            name: "WordPress & Web Standards", 
            status: isTurnedOff ? "red" : "green", 
            text: (citations && citations.consensus) || (isTurnedOff ? "WordPress Core & Web Standards: Standardrekommendation är inaktiverad." : "WordPress Core & Web Standards: Branschrekommenderad praxis.") 
          }
        };
      }
    }

    const extraProps = (extra && typeof extra === "object") ? extra : {};
    return {
      id,
      title,
      tool: activeTool,
      recommendedRaw,
      value: userVal,
      desc,
      safe: true,
      criticalLevel: criticalLevel || "standard",
      impactCategory: impactCategory || "stability",
      singleSourceInfo: normalizedSsi,
      isChangedNeeded,
      sources,
      citations: citations || {
        litespeed: sources.lsAdv.text,
        consensus: sources.domain.text
      },
      alternatives: alternatives || null,
      isTextarea: (id === "drop_uri" || id === "js_exclude" || id === "css_exclude" || id === "media_lazy_exc" || id === "js_delayed_exclude" || id === "optm_dns_prefetch"),
      wpPath: extraProps.wpPath || null,
      scoreImpact: (extraProps.scoreImpact !== undefined) ? extraProps.scoreImpact : undefined,
      readOnly: !!extraProps.readOnly
    };
  }

  return [
    // --- TAB 1: General / Allmänt ---
    {
      id: "general",
      title: "⚡ [1] Allmänt",
      options: [
        makeOpt(
          "auto_upgrade",
          "Automatisk uppgradering",
          0,
          "Rekommenderas AV på produktionssajter för att förhindra oväntade uppdateringar.",
          "standard",
          "stability",
          {
            litespeed: "LSCWP Advanced Preset: Inaktiverad på produktionssajter för att förhindra oväntade fel efter automatiska versionshopp.",
            consensus: "WordPress Core & DevOps Best Practice: Plugin-uppgraderingar ska alltid testas i staging innan driftsättning."
          }
        ),
        makeOpt(
          "domain_key",
          "Domännyckel (QUIC.cloud)",
          (uploadedSettings && typeof uploadedSettings.domain_key === "string" && uploadedSettings.domain_key.length > 5)
            ? maskSecretKey(uploadedSettings.domain_key)
            : "",
          "Visar ansluten QUIC.cloud domännyckel (maskad) för bildoptimering och CCSS. Full nyckel visas aldrig i UI/export.",
          "standard",
          "performance",
          {
            litespeed: "QUIC.cloud Integration: Krävs för externa molntjänster som CCSS-generering, LQIP och bildoptimering.",
            consensus: "Officiell LiteSpeed Docs: Genereras säkert via LSCWP Dashboard i WordPress Admin."
          },
          null, "litespeed", null, null,
          { wpPath: "LiteSpeed Cache ➔ General ➔ Domain Key / Online Services", scoreImpact: 0, readOnly: true }
        ),
        makeOpt(
          "guest_mode",
          "Gästläge (Guest Mode)",
          isWoo ? 0 : 1,
          isWoo ? "Bör vara AV på WooCommerce-butiker för att förhindra stela cache-sessioner och kassafel." : "PÅ ger blixtsnabb förstabesökar-cache på vanliga presentationssajter.",
          isWoo ? "critical" : "standard",
          "stability",
          {
            litespeed: "LSCWP Advanced Preset: PÅ för standard/innehållssajter för maximal TTFB och förstabesökar-cache.",
            consensus: isWoo ? "WooCommerce Developer Docs: Hög risk! Skapar statiska sidor för gäster vilket kan ge tomma varukorgar och session-cache fel." : "Google Web Dev (TTFB/FCP): Minskar svarstiden drastiskt för anonyma besökare."
          }
        ),
        makeOpt(
          "guest_optm",
          "Gästoptimering (Guest Optimization)",
          isWoo ? 0 : 1,
          "Aktiverar maximal bild- och sidoptimering för gäster via QUIC.cloud.",
          "standard",
          "performance",
          {
            litespeed: "QUIC.cloud Guest Optimization: Serverar max-optimerat innehåll till gästbesökare.",
            consensus: "Google Web Dev (Core Web Vitals): Optimerar laddtider för förstabesökare."
          }
        ),
        makeOpt(
          "server_ip",
          "Server IP",
          (uploadedSettings && uploadedSettings.server_ip) ? uploadedSettings.server_ip : "",
          "Ange serverns publika IP-adress för direkt crawler- och rensningskommunikation.",
          "standard",
          "config",
          {
            litespeed: "LSCWP Server Configuration: Tillåter direkt IP-anrop för intern crawler och cache-purging.",
            consensus: "Server Management Best Practice: Säkerställer att serverns interna anrop inte blockeras av externa brandväggar eller Cloudflare."
          }
        )
      ]
    },

    // --- TAB 2: Cache / Cachning ---
    {
      id: "cache",
      title: "⚡ [2] Cache",
      options: [
        makeOpt(
          "cache",
          "Aktivera LiteSpeed Cache",
          1,
          "Huvudströmbrytare för sidcachning på servernivå. MÅSTE vara PÅ.",
          "critical",
          "performance",
          {
            litespeed: "LSCWP Kärnmodul: Aktiverar sidcachning på webbservernivå (LiteSpeed Web Server / OpenLiteSpeed).",
            consensus: "Google Web Dev & WordPress Best Practice: Grundförutsättning för TTFB under 100ms och hög serverkapacitet."
          }
        ),
        makeOpt(
          "cache_priv",
          "Cacha inloggade användare",
          1,
          "Policy/context: PÅ för medlems-/B2B-portaler (sparar CPU för inloggade medlemmar). AV för typiska sajter där endast admin/redaktör loggar in. När sajttyp är okänd markeras detta som policy — inte hård avvikelse.",
          "standard",
          "config",
          {
            litespeed: "LSCWP Private Cache (cache-priv): Separat cache-vary för inloggade användare.",
            consensus: "Online Media Masters (Tom Dupuis): PÅ för membership/B2B-portaler som maximeraprofil.se; AV för vanliga sajter med enbart admin-inloggning — kontextstyrd rekommendation, inte universell avvikelse."
          }
        ),
        makeOpt(
          "cache_commenter",
          "Cacha kommentatorer",
          0,
          "Bör vara AV för att undvika att besökare ser cachade versioner efter kommentarer.",
          "standard",
          "config",
          {
            litespeed: "LSCWP Commenter Cache: Undviker att servera statisk cache till besökare som nyss skrivit en kommentar i granskningskö.",
            consensus: "WordPress Core Standard: Förhindrar att besökare tror att deras kommentar försvunnit."
          }
        ),
        makeOpt(
          "cache_rest",
          "Cacha REST API",
          1,
          "Cachar WordPress REST API-anrop, vilket snabbar upp Gutenberg och asynkrona anrop.",
          "standard",
          "performance",
          {
            litespeed: "LSCWP REST Cache: Cachar WordPress inbyggda REST API-endpoints för snabbare svarstider.",
            consensus: "Google Web Dev & Block Editor: Snabbar upp Gutenberg-redigering och asynkrona frontend-anrop."
          }
        ),
        makeOpt(
          "cache_page_login",
          "Cacha inloggningssida",
          1,
          "Skyddar mot brute-force genom att cacha standardinloggningen.",
          "standard",
          "security",
          {
            litespeed: "LSCWP Login Protection: Cachar standard wp-login.php för att skydda servern mot brute-force-attacker.",
            consensus: "Wordfence & Säkerhetspraxis: Minskar serverbelastning vid massiva inloggningsangrepp."
          }
        ),
        makeOpt(
          "cache_mobile",
          "Mobil cache",
          0,
          "Bör vara AV för responsiva teman (Astra/GeneratePress). Sätt endast PÅ om du har ett separat mobillayout-plugin.",
          "standard",
          "config",
          {
            litespeed: "LSCWP Mobile Cache: Separerar cache för mobila enheter baserat på User-Agent.",
            consensus: "Google Mobile-First & Responsiv Webbdesign: AV för moderna responsiva teman (Astra, GeneratePress, Elementor) för att undvika onödig cache-fragmentering."
          }
        ),
        makeOpt(
          "drop_uri",
          "Exkluderade sökvägar (drop_uri)",
          defaultDropUri,
          isWoo ? "🚨 KASSASKYDD: Butikens kassa och varukorg MÅSTE vara exkluderade här." : "Sökvägar som aldrig ska cachas.",
          isWoo ? "critical" : "standard",
          "stability",
          {
            litespeed: "LSCWP Advanced Preset: Obligatoriska bypass-regler för dynamiska e-handelssidor.",
            consensus: "WooCommerce Developer Docs: OBLIGATORISKT! Kassa, varukorg, mitt konto och webhook-endpoints (/cart/, /checkout/, /kassa/, wc-api=) får ALDRIG cachas."
          },
          isWoo ? {
            overlappingTools: ["LiteSpeed Cache", "WooCommerce", "Cloudflare/Varnish"],
            primaryTool: "LiteSpeed drop_uri",
            whyRecommended: "Förhindrar att kassan och varukorgen cachas, vilket eliminerar session bleed och tomma kundvagnar.",
            actionForSecondary: "Säkerställ att även Cloudflare bypassar cache för /cart och /checkout."
          } : null
        ),
        makeOpt(
          "esi",
          "ESI (Edge Side Includes)",
          0,
          "Möjliggör hålslagning i cachen för personliga element. Rekommenderas AV (0) som standard för att undvika onödig server-overhead.",
          "standard",
          "performance",
          {
            litespeed: "LiteSpeed Presets: Rekommenderar AV (0) som standard för att undvika onödig server-overhead vid sidmontering.",
            consensus: "WooCommerce & OOM: Rekommenderar AV (0). Klientbaserad JS/AJAX hanterar varukorgsfragment medan statisk cache bypassas för kassa/varukorg."
          }
        ),
        makeOpt(
          "cache_object",
          "Objektscachning (Redis / Memcached)",
          1,
          "Avlastar databasen genom att spara frekventa databasfrågor i RAM-minnet via Redis.",
          "high",
          "performance",
          {
            litespeed: "LSCWP Object Cache: Minneslagring av frekventa SQL-frågor via Redis eller Memcached.",
            consensus: "WooCommerce Performance Docs: Minskar antalet databasfrågor från hundratals till ensiffrigt vid varje sidvisning."
          },
          {
            overlappingTools: ["LiteSpeed Cache Object Cache", "Redis Object Cache Plugin", "Hosting Dropins"],
            primaryTool: "LiteSpeed Inbyggd Redis-modul",
            whyRecommended: "LiteSpeeds inbyggda Redis-anslutning är optimerad för LiteSpeed Web Server och kräver inga externa bakgrundsprocesser.",
            actionForSecondary: "Avinstallera externa Redis-plugins och låt LiteSpeeds object-cache.php styra minnescachen."
          }
        ),
        makeOpt(
          "cache_browser",
          "Webbläsarcachning (Browser Cache)",
          1,
          "Instruerar besökarens webbläsare att spara statiska filer (bilder, typsnitt, CSS) lokalt.",
          "standard",
          "performance",
          {
            litespeed: "LSCWP Browser Cache: Lägger till HTTP Expires- och Cache-Control-headers för statiska resurser.",
            consensus: "Google Web Dev (PageSpeed): Eliminerar onödiga nätverksanrop för återkommande besökare."
          }
        )
      ]
    },

    // --- TAB 3: Page Optimization - CSS ---
    {
      id: "page_optimization_css",
      title: "⚡ [3] Sidopt. CSS",
      options: [
        makeOpt(
          "optm_html_min",
          "HTML Minifiering",
          1,
          "Tar bort onödig whitespace från HTML. Rekommenderas PÅ för fullständig minifieringstrio (HTML, CSS, JS). Obs: kan i sällsynta fall påverka WooCommerce JSON-LD / strukturerad data — verifiera Rich Results efter aktivering.",
          "standard",
          "performance",
          {
            litespeed: "LSCWP HTML Minify (optm-html_min): Komprimerar HTML-svar på servernivå.",
            consensus: "Google Web Dev (Payload): Mindre HTML-byte. Woo/JSON-LD: kontrollera att Product/Offer-schema fortfarande validerar efter minify."
          }
        ),
        makeOpt(
          "optm_css_min",
          "CSS Minifiering",
          1,
          "Tar bort kommentarer och onödiga blanksteg från CSS. Mycket säkert och snabbt.",
          "standard",
          "performance",
          {
            litespeed: "LSCWP CSS Optimization: Tar bort kommentarer och whitespace ur stilmallar på servernivå.",
            consensus: "Google Web Dev (FCP/LCP): Minskar filstorleken och bandbreddsanvändningen för alla laddade CSS-filer."
          },
          {
            overlappingTools: ["LiteSpeed Cache", "Elementor", "Autoptimize"],
            primaryTool: "LiteSpeed Cache (Extern fil)",
            whyRecommended: "LiteSpeed minifierar och cachar CSS en gång på servernivå, vilket ger snabbare laddtider och webbläsarcachning.",
            actionForSecondary: "Sätt Elementor CSS Print Method till 'Extern fil' och avaktivera äldre minifieringstillägg."
          }
        ),
        makeOpt(
          "optm_css_comb",
          "CSS Kombinering (CSS Combine)",
          0,
          "Bör vara AV under HTTP/2 och HTTP/3. Att kombinera kan orsaka layout-hopp (CLS) och fördröja renderingen.",
          "high",
          "stability",
          {
            litespeed: "LSCWP Advanced Preset: Avråds för komplexa teman med dynamisk CSS.",
            consensus: "Google Web Dev & HTTP/3 Praxis: AV! Parallell multiplexing är snabbare och förhindrar layoutskakningar (CLS) och render-blockering."
          }
        ),
        makeOpt(
          "optm_css_comb_ext_inl",
          "Kombinera extern och infogad CSS",
          0,
          "Bör vara AV (syskon till CSS Combine) för att inte bryta CSS-prioriteter och specifikationsordning.",
          "high",
          "stability",
          {
            litespeed: "LSCWP Combine External/Inline: Kombinerar extern och inline CSS.",
            consensus: "Elementor & Woo Best Practice: AV! Orsakar krockar i dynamiska sidbyggarstilar."
          }
        ),
        makeOpt(
          "optm_ucss",
          "Generera UCSS (Unique CSS)",
          0,
          "Bör vara AV som standard på Elementor/WooCommerce för att undvika trasig layout och saknad CSS för dynamiska widgets/kassa. Aktiveras endast selektivt med QUIC.cloud och manuell QA.",
          "standard",
          "stability",
          {
            litespeed: "LSCWP UCSS: Genererar unik CSS per sida via QUIC.cloud.",
            consensus: "Elementor/Woo Consensus: AV som default-rek. UCSS utan manuell vitlistning rensar ofta CSS för minicart och interaktiva element."
          }
        ),
        makeOpt(
          "optm_ucss_inline",
          "Infogad UCSS (Inline UCSS)",
          0,
          "Följer UCSS. Om UCSS används bäddas den in inline för att spara en CSS-förfrågan.",
          "standard",
          "performance",
          {
            litespeed: "LSCWP Inline UCSS: Bäddar in genererad UCSS inline i HTML.",
            consensus: "LSCWP Best Practice: Används endast i tandem med UCSS."
          }
        ),
        makeOpt(
          "optm_css_async",
          "Ladda CSS asynkront (Load CSS Asynchronously)",
          0,
          "Bör vara AV för Elementor för att förhindra FOUC (Flash of Unstyled Content) och layoutskakningar.",
          "high",
          "stability",
          {
            litespeed: "LSCWP Asynkron CSS: Laddar CSS asynkront och förlitar sig på Critical CSS (CCSS).",
            consensus: "Elementor & Webbstandard: AV vid visuella sidbyggare för att undvika FOUC (Flash of Unstyled Content) och synliga layoutförskjutningar."
          }
        ),
        makeOpt(
          "optm_ccss_per_url",
          "CCSS per URL",
          1,
          "Kritiskt för Elementor om asynkron CSS/CCSS används, så att olika sidor får sin egen unika kritiska CSS (relevant främst om Async CSS är på).",
          "standard",
          "stability",
          {
            litespeed: "LSCWP CCSS per URL: Skapar unik kritisk CSS per sida istället för per inläggstyp.",
            consensus: "Elementor Best Practice: Krävs om CCSS används för att inte startsida och produktsidor delar fel CSS."
          }
        ),
        makeOpt(
          "optm_css_async_inline",
          "Inline CSS Async Lib",
          1,
          "Bäddar in det asynkrona CSS-biblioteket direkt i HTML för att spara en nätverksförfrågan (relevant främst om Async CSS är på).",
          "standard",
          "performance",
          {
            litespeed: "LSCWP Inline Async Lib: Sparar ett HTTP-anrop för laddningsbiblioteket.",
            consensus: "Web Vitals Best Practice: Inlining minskar anslutningslatens för laddningsskript."
          }
        ),
        makeOpt(
          "optm_font_display",
          "Font Display Optimerare (font-display: swap)",
          1,
          "Tvingar webbläsaren att visa text direkt med reservtypsnitt tills webbtypsnittet laddats klart.",
          "standard",
          "performance",
          {
            litespeed: "LSCWP Font Optimizer: Injicerar font-display: swap i alla länkade webbtypsnitt.",
            consensus: "Google Core Web Vitals (CLS/FCP): Säkerställer att text är synlig omedelbart och inte blockeras av externa Google Fonts (FOIT)."
          },
          {
            overlappingTools: ["LiteSpeed Cache", "Elementor Fonts", "WordPress Font Library"],
            primaryTool: "LiteSpeed Asynkron typsnittsladdning (swap)",
            whyRecommended: "Laddar webbtypsnitt asynkront och lägger till font-display: swap för att förhindra osynlig text och layoutförskjutning (CLS).",
            actionForSecondary: "Undvik att ladda samma typsnitt både i Elementor och via externa @import-regler i temat."
          }
        ),
        makeOpt(
          "optm_ggfonts_async",
          "Ladda Google Fonts asynkront",
          1,
          "Laddar externa Google Fonts asynkront så att de inte blockerar renderingen av sidan.",
          "standard",
          "performance",
          {
            litespeed: "LSCWP Google Fonts Async: Hämtar typsnitt i bakgrunden.",
            consensus: "Google Core Web Vitals (FCP): Eliminerar typsnitt som renderingsblockerande resurs."
          }
        ),
        makeOpt(
          "optm_ggfonts_rm",
          "Ta bort Google Fonts",
          0,
          "Policy: PÅ om sajten laddar lokala typsnitt (GDPR-säkert), annars AV om Google Fonts används på sajten.",
          "standard",
          "performance",
          {
            litespeed: "LSCWP Remove Google Fonts: Raderar Google Fonts-anrop.",
            consensus: "GDPR / ePrivacy: PÅ rekommenderas om lokala typsnitt har implementerats för att stoppa Google-anrop."
          }
        ),
        makeOpt(
          "css_exclude",
          "Undantagna CSS-filer (CSS Exclude)",
          defaultCssExclude,
          "Undantar kritiska CSS-filer för samtycke (CTM), e-handelskassa och Elementor så att layouter och responsiva brytpunkter inte bryts vid CSS Combine/Minify.",
          "standard",
          "stability",
          {
            litespeed: "LSCWP CSS Exclusions: Undantar valda stilmallar från minifiering och sammanslagning.",
            consensus: "Elementor & WooCommerce Best Practice: LiteSpeed exkluderar INGEN CSS automatiskt. Elementor (wp-content/uploads/elementor/css/*), CTM och kassa-CSS måste alltid exkluderas här."
          }
        )
      ]
    },

    // --- TAB 4: Page Optimization - JS ---
    {
      id: "page_optimization_js",
      title: "⚡ [4] Sidopt. JS",
      options: [
        makeOpt(
          "optm_js_min",
          "JS Minifiering",
          1,
          "Kompaktar JavaScript-kod genom att ta bort onödig whitespace.",
          "standard",
          "performance",
          {
            litespeed: "LSCWP JS Minifiering: Reducerar storleken på skriptfiler.",
            consensus: "Google Web Dev (INP/LCP): Minskar JS-parsingtid i webbläsarens huvudtråd."
          }
        ),
        makeOpt(
          "optm_js_comb",
          "JS Kombinering (JS Combine)",
          0,
          "Bör vara AV för att inte bryta händelselyssnare i CTM, WooCommerce eller Elementor.",
          "critical",
          "stability",
          {
            litespeed: "LSCWP Advanced Preset: Avråds för dynamiska webbplatser.",
            consensus: "CTM & WooCommerce Dev Docs: AV! Skapar beroendekrockar, bryter asynkrona händelselyssnare och fördröjer interaktivitet (försämrar INP)."
          }
        ),
        makeOpt(
          "optm_js_comb_ext_inl",
          "Kombinera extern och infogad JS",
          0,
          "Bör vara AV (syskon till JS Combine) då det annars bryter jQuery- och WooCommerce-beroenden.",
          "critical",
          "stability",
          {
            litespeed: "LSCWP Combine External/Inline JS: Kombinerar extern och inline JavaScript.",
            consensus: "CTM & WooCommerce Best Practice: AV! Kraschar kassan och asynkrona spårningsskript."
          }
        ),
        makeOpt(
          "optm_js_defer",
          "Skjut upp JS (JS Defer)",
          1,
          "Laddar JavaScript parallellt så att HTML och CSS kan ritas ut snabbare (förbättrar INP och FCP).",
          "high",
          "performance",
          {
            litespeed: "LSCWP JS Defer: Skjuter upp JavaScript-exekvering till efter att HTML och CSS har tolkats.",
            consensus: "Google Core Web Vitals (INP/FCP): Kritiskt för att eliminera renderingsblockerande resurser, förutsatt att samtyckesskript (CTM) exkluderas."
          },
          {
            overlappingTools: ["LiteSpeed Cache", "CTM (Consent & Tag Manager)"],
            primaryTool: "LiteSpeed Cache + CTM Exkluderingar",
            whyRecommended: "Skjuter upp icke-kritiska JavaScript för snabbare LCP och INP, medan CTM-spårning undantas för att inte bryta GDPR-samtycken.",
            actionForSecondary: "Säkerställ att ctm-init.js, cookieconsent.umd.js och dataLayer är inlagda i js_exclude."
          }
        ),
        makeOpt(
          "js_exclude",
          "Undantagna JS-filer (JS Exclude)",
          defaultJsExclude,
          "Undantar kritiska JavaScript för samtyckeshantering (CTM), e-handelskassa och sidbyggare så att de inte fördröjs eller bryts vid JS Defer.",
          "critical",
          "stability",
          {
            litespeed: "LSCWP JS Exclusions: Säkerställer att valda JS-filer exekveras inline och utan fördröjning.",
            consensus: "CTM & GDPR/ePrivacy Compliance: ctm-init.js, cookieconsent.umd.js, dataLayer och betalningsgateways MÅSTE exkluderas för att inte bryta samtycke och kassa."
          }
        ),
        makeOpt(
          "js_delayed_exclude",
          "Fördröj JS - Exkluderade filer (JS Delayed Exclude)",
          defaultJsExclude,
          "🚨 CTM, KASSA & INTERAKTIVITET: ctm-init.js, cookieconsent.umd.js, dataLayer och betalningsgateways exkluderas här om JS Delay (värde 2) används.",
          "high",
          "stability",
          {
            litespeed: "LSCWP JS Delayed Excludes: Skript som laddas direkt även om JS Delay (värde 2) är aktiverat.",
            consensus: "CTM & Checkout Security: Kritiskt att undanta samtyckesskript och kassa från användarinteraktionsfördröjning."
          }
        )
      ]
    },

    // --- TAB 5: Media & LCP-optimering ---
    {
      id: "page_optimization_media",
      title: "🖼️ [5] Media & LCP",
      options: [
        makeOpt(
          "media_lazy",
          "Lazy Load för bilder",
          isElem ? 0 : 1,
          isElem ? "Bör vara AV om Elementors inbyggda lazyload eller WP Native används, för att undvika dubbel lazyload." : "PÅ fördröjer laddning av bilder utanför skärmen.",
          isElem ? "high" : "standard",
          "stability",
          {
            litespeed: "LSCWP Lazy Load: Fördröjer laddning av bilder utanför viewporten.",
            consensus: isElem ? "Elementor & Google Web Dev: Undvik dubbla lazyload-motorer (Elementor + LiteSpeed) då det orsakar bildflimmer och försenad LCP." : "Google Web Dev (LCP/Data Savings): Standardpraxis för presentationssajter."
          },
          {
            overlappingTools: ["LiteSpeed Cache", "Elementor", "WordPress Core (Native)"],
            recommendedTool: isElem ? "WordPress Native / LiteSpeed LQIP" : "LiteSpeed Cache (med VPI)",
            primaryTool: isElem ? "WordPress Native / LiteSpeed LQIP" : "LiteSpeed Cache (med VPI)",
            reason: "LiteSpeed genererar Low Quality Image Placeholders (LQIP) och responsiva SVG-platshållare på servernivå utan att belasta webbläsarens JS-tråd.",
            whyRecommended: "LiteSpeed genererar Low Quality Image Placeholders (LQIP) och responsiva SVG-platshållare på servernivå utan att belasta webbläsarens JS-tråd.",
            actionOtherTools: "Om du använder Elementor: Sätt Elementor 'Lazy Load Background Images' till Inaktiv för att undvika dubbla platshållare. Om du föredrar WP Core default: Låt WP Native HTML5 loading='lazy' styra och håll Elementors experiment inaktivt.",
            actionForSecondary: "Om du använder Elementor: Sätt Elementor 'Lazy Load Background Images' till Inaktiv för att undvika dubbla platshållare. Om du föredrar WP Core default: Låt WP Native HTML5 loading='lazy' styra och håll Elementors experiment inaktivt."
          },
          "litespeed", null, null,
          { wpPath: "LiteSpeed Cache ➔ Sidoptimering ➔ [5] Media & LCP ➔ Lazy Load för bilder", scoreImpact: 0 }
        ),
        makeOpt(
          "media_lazy_exc",
          "Exkludera logotyp & Hero-bild från Lazy Load",
          "logo\nheader\nhero",
          "Säkerställer att LCP-bilden (Largest Contentful Paint) laddas direkt utan fördröjning.",
          "high",
          "performance",
          {
            litespeed: "LSCWP Lazy Exclude: Förhindrar att utvalda klasser/taggar (t.ex. logo, hero) lazy-loadas.",
            consensus: "Google Core Web Vitals (LCP): Hero-bilder och logotyper som syns ovanför viket (Above the Fold) får ALDRIG lazy-loadas."
          },
          null, "litespeed", null, null,
          { wpPath: "LiteSpeed Cache ➔ Sidoptimering ➔ [5] Media & LCP ➔ Lazy Load Excludes", scoreImpact: 0 }
        ),
        makeOpt(
          "media_webp",
          "WebP / AVIF Bildersättning (HTML)",
          1,
          "HTML-ersättning: byter JPG/PNG-URL:er i HTML till WebP/AVIF via rewrite. Skiljer sig från Bildoptimering → Next-Gen Image Format (QUIC genererar filer). Soft match om Next-Gen redan är PÅ — undvik dubbel gulflaggning.",
          "standard",
          "performance",
          {
            litespeed: "LSCWP Media WebP Replacement (media-webp): Serverar WebP via HTML/rewrite — inte samma sak som img_optm-webp (QUIC next-gen generation).",
            consensus: "Google Web Dev (Modern Image Formats): WebP/AVIF minskar bildvikten med 30-50%. Använd HTML-ersättning OCH/ELLER QUIC-generering beroende på setup."
          },
          null, "litespeed", null, null,
          { wpPath: "LiteSpeed Cache ➔ Sidoptimering ➔ [5] Media & LCP ➔ WebP/AVIF Replacement", scoreImpact: 0 }
        ),
        makeOpt(
          "media_vpi",
          "Generera VPI (Viewport Images)",
          1,
          "Genererar Viewport Images via QUIC.cloud när LiteSpeed Lazy Load används för att förbättra LCP.",
          "standard",
          "performance",
          {
            litespeed: "LSCWP VPI: Skapar automatisk viewport-exkludering för kritiska bilder.",
            consensus: "Web Vitals Best Practice: Bra komplement om LiteSpeed Lazy Load körs."
          },
          null, "litespeed", null, null,
          { wpPath: "LiteSpeed Cache ➔ Sidoptimering ➔ [5] Media & LCP ➔ VPI (Viewport Images)", scoreImpact: 0 }
        )
      ]
    },

    // --- TAB 6: Bildoptimering (Image Optimization / QUIC) ---
    {
      id: "image_optimization",
      title: "🖼️ [6] Bildoptimering",
      options: (function () {
        const hasQuicKey = !!(uploadedSettings && (
          (typeof uploadedSettings.domain_key === "string" && uploadedSettings.domain_key.length > 5) ||
          (typeof uploadedSettings.hash === "string" && uploadedSettings.hash.length > 5)
        ));
        const defaultWebpAttr = "img.src\ndiv.data-bg\nimg.data-src\nimg.srcset\nsource.srcset\ndiv.data-thumb\nimg.data-large_image\ndiv.data-large_image\nimg.data-background\ndiv.data-background";
        return [
          makeOpt(
            "cdn",
            "CDN aktiv",
            (uploadedSettings && (uploadedSettings.cdn === "1" || uploadedSettings.cdn === 1 || uploadedSettings["cdn"] === "1")) ? 1 : 0,
            "Status: om LiteSpeed CDN-modulen är PÅ. Read-only-liknande statusrad.",
            "standard",
            "config",
            {
              litespeed: "LSCWP CDN Settings: Aktiverar CDN-mappning för statiska resurser.",
              consensus: "CDN Best Practice: Policy/context beroende på hosting och QUIC/Cloudflare-setup."
            },
            null, "litespeed", null, null,
            { wpPath: "LiteSpeed Cache ➔ CDN ➔ CDN Settings", scoreImpact: 0, readOnly: true }
          ),
          makeOpt(
            "cdn_quic",
            "QUIC.cloud CDN",
            (uploadedSettings && (uploadedSettings.cdn_quic === "1" || uploadedSettings.cdn_quic === 1 || uploadedSettings["cdn-quic"] === "1" || uploadedSettings["cdn-quic"] === 1)) ? 1 : 0,
            "Status: QUIC.cloud CDN-tjänst. Komplement till Domain Key under General.",
            "standard",
            "config",
            {
              litespeed: "LSCWP CDN ➔ QUIC.cloud: Officiell LiteSpeed CDN-integration. Domain Key under General aktiverar Online Services — inte nödvändigtvis CDN-edge.",
              consensus: "AreWee Policy: Domain Key / qc-nameservers ≠ aktiverad CDN-edge. Bekräfta live via x-qc-cache / x-qc-pop. Saknad live-bekräftelse = Policy/info (scoreImpact 0), inte falsk Optimal."
            },
            null, "litespeed", null, null,
            { wpPath: "LiteSpeed Cache ➔ CDN", scoreImpact: 0, readOnly: true }
          ),
          makeOpt(
            "cdn_cloudflare",
            "Cloudflare API CDN",
            (uploadedSettings && (uploadedSettings.cdn_cloudflare === "1" || uploadedSettings.cdn_cloudflare === 1 || uploadedSettings["cdn-cloudflare"] === "1" || uploadedSettings["cdn-cloudflare"] === 1)) ? 1 : 0,
            "Status: Cloudflare API-integration i LiteSpeed CDN. API-nyckel maskas alltid i UI/export.",
            "standard",
            "config",
            {
              litespeed: "LSCWP CDN ➔ Cloudflare API: Synkar purge med Cloudflare.",
              consensus: "Cloudflare + LiteSpeed: Använd API-token med minsta nödvändiga behörighet."
            },
            null, "litespeed", null, null,
            { wpPath: "LiteSpeed Cache ➔ CDN ➔ Cloudflare API", scoreImpact: 0, readOnly: true }
          ),
          makeOpt(
            "img_optm_auto",
            "Automatisk begäran med Cron",
            hasQuicKey ? 1 : 0,
            hasQuicKey
              ? "PÅ rekommenderas när QUIC är ansluten så att nya bilder skickas till optimering via cron."
              : "Soft/Policy utan QUIC-nyckel — aktivera Domain Key först, annars info-varning om PÅ.",
            "standard",
            "performance",
            {
              litespeed: "LSCWP Image Optimization: Automatisk begäran med Cron (img_optm-auto).",
              consensus: "AreWee Woo/Elementor-baslinje: PÅ när QUIC ansluten."
            },
            null, "litespeed", null, null,
            { wpPath: "LiteSpeed Cache ➔ Image Optimization ➔ Image Optimization Settings ➔ Automatisk begäran med Cron", scoreImpact: 0 }
          ),
          makeOpt(
            "img_optm_ori",
            "Optimera originalbilder",
            1,
            "Optimerar originaluppladdade bilder (inte bara thumbnails). Policy/soft — scoreImpact 0.",
            "standard",
            "performance",
            {
              litespeed: "LSCWP img_optm-ori: Optimera originalbilder.",
              consensus: "Woo/Elementor-baslinje: PÅ för mindre mediavolym."
            },
            null, "litespeed", null, null,
            { wpPath: "LiteSpeed Cache ➔ Image Optimization ➔ Image Optimization Settings ➔ Optimera originalbilder", scoreImpact: 0 }
          ),
          makeOpt(
            "img_optm_rm_bkup",
            "🚨 Ta bort ursprungliga säkerhetskopior",
            0,
            "AV rekommenderas! PÅ raderar originalbackup oåterkalleligt. Om PÅ visas info-alert (🚨) — ingen danger-poängkollaps.",
            "standard",
            "stability",
            {
              litespeed: "LSCWP img_optm-rm_bkup: Ta bort ursprungliga säkerhetskopior efter optimering.",
              consensus: "AreWee Policy: Behåll alltid backup (AV) på produktion — oåterkalleligt annars."
            },
            null, "litespeed", null, null,
            { wpPath: "LiteSpeed Cache ➔ Image Optimization ➔ Image Optimization Settings ➔ Ta bort ursprungliga säkerhetskopior", scoreImpact: 0 }
          ),
          makeOpt(
            "img_optm_lossless",
            "Optimera förlustfritt",
            0,
            "Policy: PÅ ger högre kvalitet/filstorlek; AV (lossy) ger mindre filer. Soft match — ingen hård avvikelse.",
            "standard",
            "performance",
            {
              litespeed: "LSCWP img_optm-lossless: Förlustfri vs lossy komprimering.",
              consensus: "Policy beroende på fotokvalitetskrav."
            },
            null, "litespeed", null, null,
            { wpPath: "LiteSpeed Cache ➔ Image Optimization ➔ Image Optimization Settings ➔ Optimera förlustfritt", scoreImpact: 0 }
          ),
          makeOpt(
            "img_optm_sizes_skipped",
            "Optimize Image Sizes (skipped)",
            "",
            "Lista över bildstorlekar som hoppas över vid optimering. Visa som lista/textarea. Policy.",
            "standard",
            "config",
            {
              litespeed: "LSCWP img_optm-sizes_skipped: Hoppa över utvalda intermediate sizes.",
              consensus: "Policy: Lämna tom för att optimera alla storlekar, eller lista tunga sizes att skippa."
            },
            null, "litespeed", null, null,
            { wpPath: "LiteSpeed Cache ➔ Image Optimization ➔ Image Optimization Settings ➔ Optimize Image Sizes", scoreImpact: 0 }
          ),
          makeOpt(
            "img_optm_exif",
            "Behåll EXIF/XMP-data",
            0,
            "AV typiskt (strip metadata för mindre filer och integritet). Policy/soft.",
            "standard",
            "config",
            {
              litespeed: "LSCWP img_optm-exif: Behåll EXIF/XMP-data.",
              consensus: "Integritet & storlek: AV rekommenderas för de flesta sajter."
            },
            null, "litespeed", null, null,
            { wpPath: "LiteSpeed Cache ➔ Image Optimization ➔ Image Optimization Settings ➔ Behåll EXIF/XMP-data", scoreImpact: 0 }
          ),
          makeOpt(
            "img_optm_webp",
            "Next-Gen Image Format",
            1,
            "QUIC next-gen GENERERING: 0=AV, 1=WebP (rek), 2=AVIF (ej gratis). Skiljer sig från Media & LCP → media_webp (HTML-ersättning). Soft match när media_webp speglar samma avsikt.",
            "standard",
            "performance",
            {
              litespeed: "LSCWP img_optm-webp: Next-Gen Image Format via QUIC.cloud (genererar .webp/.avif-filer).",
              consensus: "AreWee: WebP (1) som standard. media_webp hanterar HTML-rewrite separat."
            },
            null, "litespeed", null, null,
            { wpPath: "LiteSpeed Cache ➔ Image Optimization ➔ Image Optimization Settings ➔ Next-Gen Image Format", scoreImpact: 0 }
          ),
          makeOpt(
            "img_optm_webp_attr",
            "WebP/AVIF Attribute To Replace",
            defaultWebpAttr,
            "Attribut/selektorer som ska bytas till next-gen. Policy/textarea — LS-standardlista.",
            "standard",
            "config",
            {
              litespeed: "LSCWP img_optm-webp_attr: WebP/AVIF Attribute To Replace.",
              consensus: "Behåll LS-standardlista om du saknar egen policy."
            },
            null, "litespeed", null, null,
            { wpPath: "LiteSpeed Cache ➔ Image Optimization ➔ Image Optimization Settings ➔ WebP/AVIF Attribute To Replace", scoreImpact: 0 }
          ),
          makeOpt(
            "img_optm_webp_replace_srcset",
            "WebP/AVIF For Extra srcset",
            1,
            "PÅ om Next-Gen Image Format är aktivt. Soft/inaktiv när next-gen är AV.",
            "standard",
            "performance",
            {
              litespeed: "LSCWP img_optm-webp_replace_srcset: WebP/AVIF For Extra srcset.",
              consensus: "Komplement till Next-Gen — aktivera tillsammans med WebP (1)."
            },
            null, "litespeed", null, null,
            { wpPath: "LiteSpeed Cache ➔ Image Optimization ➔ Image Optimization Settings ➔ WebP/AVIF For Extra srcset", scoreImpact: 0 }
          )
        ];
      })()
    },

    // --- TAB 7: Page Optimization - HTML & Tweaks ---
    {
      id: "page_optimization_html",
      title: "⚡ [7] Sidopt. HTML",
      options: [
        makeOpt(
          "optm_qs_rm",
          "Ta bort frågesträngar (Remove Query Strings)",
          0,
          "Bör vara AV på WooCommerce-sajter för att inte bryta cache-busting, script-versioner och dynamiska anrop.",
          "standard",
          "stability",
          {
            litespeed: "LSCWP Remove Query Strings: Tar bort versionsparametrar (?ver=...) från statiska resurser.",
            consensus: "WooCommerce Best Practice: AV! Många plugins och betalmoduler kräver frågesträngar för cache-ogiltigförklaring."
          },
          null, "litespeed", null, null,
          { wpPath: "LiteSpeed Cache ➔ Sidoptimering ➔ HTML-inställningar ➔ Ta bort frågesträngar", scoreImpact: 0 }
        ),
        makeOpt(
          "optm_dns_prefetch",
          "DNS-förhandshämtning (DNS Prefetch)",
          "//fonts.googleapis.com\n//fonts.gstatic.com",
          "Förhandshämtar DNS för externa domäner för att reducera anslutningslatens.",
          "standard",
          "performance",
          {
            litespeed: "LSCWP DNS Prefetch: Löser upp domännamn i förväg.",
            consensus: "Web Performance Standards: Bra för externa API:er och fonter."
          },
          null, "litespeed", null, null,
          { wpPath: "LiteSpeed Cache ➔ Sidoptimering ➔ HTML-inställningar / Tweaks ➔ DNS Prefetch", scoreImpact: 0 }
        ),
        makeOpt(
          "optm_emojis_rm",
          "Ta bort WordPress Emojis-skript",
          1,
          "Inaktiverar standard WP-emoji-skript för att spara en blockerande HTTP-förfrågan.",
          "standard",
          "performance",
          {
            litespeed: "LSCWP Tweaks: Inaktiverar inläsning av wp-emoji-release.min.js.",
            consensus: "WordPress Core Performance: Sparar ett onödigt externt HTTP-anrop på varje sidvisning; moderna webbläsare stöder emojis direkt."
          },
          {
            overlappingTools: ["LiteSpeed Cache", "SCM Snippets", "Disable Emojis Plugin"],
            primaryTool: "LiteSpeed Cache (optm_emojis_rm)",
            whyRecommended: "Inbyggd avstängning i LiteSpeed sparar en extern JS-förfrågan och kräver ingen extra PHP-kod i SCM.",
            actionForSecondary: "Om denna är PÅ i LiteSpeed kan du inaktivera motsvarande emoji-snippet i SCM."
          },
          "litespeed", null, null,
          { wpPath: "LiteSpeed Cache ➔ Sidoptimering ➔ HTML-inställningar / Tweaks ➔ Ta bort WordPress Emojis", scoreImpact: 0 }
        )
      ]
    },

    // --- TAB 8: Crawler / Sökspindel ---
    {
      id: "crawler",
      title: "⚡ [8] Crawler",
      options: [
        makeOpt(
          "crawler",
          "Aktivera LiteSpeed Crawler",
          env.isLiteSpeedServer ? 1 : 0,
          env.isLiteSpeedServer ? "För-värmer cachen i bakgrunden så att alla besökare alltid möts av blixtsnabb cachad HTML." : "Kräver LiteSpeed Server.",
          "standard",
          "performance",
          {
            litespeed: "LSCWP Crawler: Automatisk bakgrundsgenomsökning av sitemap för att hålla cache-sidor varma.",
            consensus: "LiteSpeed Server Enterprise: Garanterar att första besökaren på en sida alltid får en omedelbar cache-träff (HIT)."
          },
          null, "litespeed", null, null,
          { wpPath: "LiteSpeed Cache ➔ Crawler ➔ Aktivera Crawler", scoreImpact: 0 }
        ),
        makeOpt(
          "crawler_usleep",
          "Crawl Interval",
          1000,
          "LSCWP 7.x: crawler-crawl_interval (intervall). Legacy: crawler-usleep (µs). Paus/intervall så crawlern inte överbelastar servern.",
          "standard",
          "config",
          {
            litespeed: "LSCWP Crawler: Crawl Interval (crawler-crawl_interval); äldre nyckel crawler-usleep (mikrosekunder).",
            consensus: "Server Management Best Practice: Förhindrar att crawlern spikar serverns CPU vid stora produktkataloger."
          },
          null, "litespeed", null, null,
          { wpPath: "LiteSpeed Cache ➔ Crawler ➔ Crawl Interval", scoreImpact: 0 }
        )
      ]
    },

    // --- TAB 7: WooCommerce & E-handel ---
    {
      id: "woocommerce",
      title: "WooCommerce",
      options: [
        makeOpt(
          "woo_hpos",
          "HPOS (High-Performance Order Storage)",
          1,
          "Flyttar orderdata från gamla wp_posts till separata, indexerade tabeller för 4x snabbare checkout och admin.",
          "critical",
          "performance",
          {
            litespeed: "WooCommerce & LSCWP Kompatibilitet: Stödjer fullständigt HPOS-arkitektur.",
            consensus: "WooCommerce Developer Handbook: Officiell modern standard för orderlagring; separerar orders från wp_posts för upp till 5x snabbare checkout och sökningar."
          },
          null,
          "woocommerce"
        ),
        makeOpt(
          "woo_cart_fragments",
          "Optimera Cart Fragments (wc-cart-fragments.js)",
          1,
          "Inaktiverar onödiga AJAX-anrop till admin-ajax.php på icke-butikssidor.",
          "high",
          "performance",
          {
            litespeed: "WooCommerce Optimization: Minskar frekvensen av admin-ajax-anrop.",
            consensus: "WooCommerce Performance Best Practice: Förhindrar att wc-cart-fragments.js sänker sidladdningen på icke-e-handelssidor."
          },
          null,
          "woocommerce"
        ),
        makeOpt(
          "woo_transients_cleanup",
          "Daglig rensning av utgångna transienter",
          1,
          "Rensar automatiskt utgångna kundkorgs- och paypal-transienter i wp_options.",
          "standard",
          "config",
          {
            litespeed: "Database Maintenance: Rensar förbrukad sessionsdata.",
            consensus: "SCM & Databaspraxis: Nattlig schemalagd rensning håller tabellen wp_options slimmad och snabb."
          },
          {
            overlappingTools: ["SCM (Site Code Manager)", "LiteSpeed Database Optimizer", "WooCommerce Cron"],
            primaryTool: "SCM Schemalagt Cron",
            whyRecommended: "SCM kör kontrollerad rensning på natten utan att låsa databastabellerna under dagtid.",
            actionForSecondary: "Låt SCM sköta den automatiska rensningen och kör LiteSpeed manuellt vid behov."
          },
          "woocommerce"
        )
      ]
    },

    // --- TAB 8: Elementor ---
    {
      id: "elementor",
      title: "Elementor",
      options: [
        makeOpt(
          "elem_css_print_method",
          "CSS-utskriftsmetod (CSS Print Method)",
          "external",
          "Måste vara 'Extern fil' för att LiteSpeed ska kunna cacha och minifiera Elementor-stilar.",
          "high",
          "stability",
          {
            litespeed: "LSCWP + Elementor Synergy: Kräver 'External File' för att LiteSpeed ska kunna generera optimerad och cachad CSS.",
            consensus: "Elementor Official Documentation: 'External File' minskar inline-kod och möjliggör effektiv webbläsarcachning."
          },
          null,
          "elementor"
        ),
        makeOpt(
          "elem_dom_optimization",
          "Optimerad DOM-utmatning (Optimized DOM)",
          1,
          "Tar bort onödiga omslutande div-taggar och minskar sidans DOM-djup. Källa: Slot 5 (Elementor System Info) — LSCWP .data uppdaterar aldrig denna status.",
          "standard",
          "performance",
          {
            litespeed: "Elementor Features (Slot 5): DOM-flaggan läses enbart från Elementor-rapporten, aldrig från LiteSpeed .data.",
            consensus: "Google Lighthouse & PageSpeed: Mindre DOM-djup ger snabbare layoutrendering och lägre minnesanvändning."
          },
          null,
          "elementor"
        ),
        makeOpt(
          "elem_asset_loading",
          "Förbättrad tillgångsladdning (Improved Asset Loading)",
          1,
          "Inbyggd i Core som standard i moderna Elementor (≥3.16 / 4.x). Dynamisk tillgångsladdning hanteras automatiskt av kärnan.",
          "standard",
          "performance",
          {
            litespeed: "Elementor Core (≥3.16): Improved Asset Loading är inbyggd basfunktion — inte längre ett separat experimentkrav.",
            consensus: "Elementor Performance Docs (4.x): Optimal/built-in core. Äldre experiment-textkrav är borttagna."
          },
          null,
          "elementor"
        ),
        makeOpt(
          "elem_css_loading",
          "Förbättrad CSS-inläsning (Improved CSS Loading)",
          1,
          "Inbyggd i Core som standard i moderna Elementor (≥3.16 / 4.x). Optimerad CSS-laddning hanteras automatiskt av kärnan.",
          "standard",
          "performance",
          {
            litespeed: "Elementor Core (≥3.16): Improved CSS Loading är inbyggd basfunktion — inte längre ett separat experimentkrav.",
            consensus: "Elementor Performance Docs (4.x): Optimal/built-in core. Äldre experiment-textkrav är borttagna."
          },
          null,
          "elementor"
        ),
        makeOpt(
          "elem_lazy_load",
          "Elementor Bakgrundsbild Lazy Load",
          0,
          "Bör vara AV om LiteSpeed Cache (Media Lazy Load) eller WordPress native hanterar bildladdning för att undvika layoutskakningar (CLS).",
          "standard",
          "stability",
          {
            litespeed: "Conflict Prevention: Undvik dubbla lazyload-skript från både LiteSpeed och Elementor.",
            consensus: "PageSpeed Best Practice: Låt ett enda optimeringsverktyg styra lazyload för att undvika dubbla lyssnare och CLS."
          },
          null,
          "elementor"
        ),
        makeOpt(
          "elem_font_icon_svg",
          "Inline Font Icons (SVG)",
          1,
          "Laddar ikoner som lätta inline SVG:er istället för att ladda tunga Font Awesome-fontfiler.",
          "standard",
          "performance",
          {
            litespeed: "Asset Reduction: Minskar antalet externa typsnittsförfrågningar.",
            consensus: "Elementor Developer Docs: Ersätter FontAwesome eot/woff2 med inline SVG för snabbare rendering."
          },
          null,
          "elementor"
        )
      ]
    },

    // --- TAB 9: Wordfence & Säkerhet ---
    {
      id: "wordfence",
      title: "Wordfence",
      options: [
        makeOpt(
          "wf_ip_header",
          "IP-detektering Header (How Wordfence gets IPs)",
          env.isCloudflare ? "CF-Connecting-IP" : "REMOTE_ADDR",
          "Bestämmer vilken metod Wordfence använder för besöks-IP. På direktanslutna servrar är PHP:s inbyggda REMOTE_ADDR säkrast mot IP-spoofing.",
          "critical",
          "security",
          {
            litespeed: "LiteSpeed Web Server Header Compatibility: Sätts till REMOTE_ADDR vid direkt serverdrift eller CF-Connecting-IP bakom Cloudflare.",
            consensus: "Wordfence Official Security Docs: Korrekt IP-header är fundamentalt för att brandväggen ska blockera rätt angripare och inte blockera proxyn."
          },
          null,
          "wordfence"
        ),
        makeOpt(
          "wf_disable_live_traffic",
          "Inaktivera Live Traffic (Realtidstrafik)",
          1,
          "Stänger av realtidsloggning till databasen, vilket minskar databasskrivningar drastiskt.",
          "high",
          "performance",
          {
            litespeed: "Database Load Reduction: Inaktiverar realtidsskrivning av varje sidvisning till databasen.",
            consensus: "Wordfence Documentation & High-Traffic Best Practice: Avlastar serverdatabasen med upp till 80% under hög belastning."
          },
          null,
          "wordfence"
        )
      ]
    },

    // --- TAB 10: WordPress Core & Serverminne ---
    {
      id: "core_server",
      title: "Server",
      options: [
        makeOpt(
          "php_memory_limit",
          "PHP Memory Limit (memory_limit)",
          "512M",
          "Total minnesallokering för PHP-processer på servern. Krävs för bildbehandling, Elementor och WooCommerce.",
          "high",
          "stability",
          {
            litespeed: "Server PHP Configuration: Minnesallokering per PHP-tråd på servernivå.",
            consensus: "PHP & WooCommerce Requirements: Minst 512M rekommenderas för att undvika krascher vid bildgenerering och tunga bakgrundsjobb."
          },
          null,
          "server"
        ),
        makeOpt(
          "wp_memory_limit",
          "WordPress Minnesgräns (WP_MEMORY_LIMIT)",
          "512M",
          "Minsta minnesallokering för WordPress i frontend. Krävs för stabil WooCommerce och Elementor.",
          "critical",
          "stability",
          {
            litespeed: "WordPress Core Configuration: Minnesallokering för PHP i frontend och admin.",
            consensus: "WooCommerce & Elementor System Requirements: Minst 256M (rekommenderat 512M) krävs för att förhindra PHP Fatal Error: Allowed memory size exhausted."
          },
          null,
          "server"
        ),
        makeOpt(
          "wp_max_memory_limit",
          "WordPress Admin Minnesgräns (WP_MAX_MEMORY_LIMIT)",
          "512M",
          "Minnesallokering för WordPress admin-gränssnitt och tunga databasoperationer.",
          "high",
          "stability",
          {
            litespeed: "WordPress Admin Allocation: Tillåter extra minne vid bildbeskärning, produktimporter och plugin-uppdateringar.",
            consensus: "WordPress Core Best Practice: Minst 512M förhindrar att wp-admin hänger sig under tunga administrativa körningar."
          },
          null,
          "server"
        ),
        makeOpt(
          "php_max_input_vars",
          "PHP Max Input Variables (max_input_vars)",
          "5000",
          "Maximalt antal formulärvariabler som PHP tar emot. Krävs för stora menyer och produktattribut.",
          "high",
          "config",
          {
            litespeed: "Server Input Buffer: Tillåter att stora formulär sparas utan att data klipps av.",
            consensus: "WordPress Core & Elementor Docs: Stora navigationsmenyer och WooCommerce-varianter klipps av vid sparning om detta värde är för lågt (< 5000)."
          },
          null,
          "server"
        ),
        makeOpt(
          "php_max_execution_time",
          "PHP Max Exekveringstid (max_execution_time)",
          "300s",
          "Maximal tid i sekunder som ett PHP-skript får köras innan det avbryts av servern.",
          "standard",
          "stability",
          {
            litespeed: "Execution Timeout: Ger tillräckligt med tid för crawler och bildkonvertering.",
            consensus: "WooCommerce & LiteSpeed Docs: Minst 300 sekunder förhindrar 504 Gateway Timeouts vid stora exporter/importer och sökspindelkörningar."
          },
          null,
          "server"
        ),
        makeOpt(
          "php_max_input_time",
          "PHP Max Inmatningstid (max_input_time)",
          "300s",
          "Maximal tid i sekunder som PHP får lägga på att analysera inkommande POST/GET-data och filuppladdningar.",
          "standard",
          "stability",
          {
            litespeed: "Input Processing Timeout: Tillåter stora fil- och bildöverföringar.",
            consensus: "PHP Best Practice: Sätts till 300 sekunder för att hantera stora medieuppladdningar utan timeout."
          },
          null,
          "server"
        ),
        makeOpt(
          "php_post_max_size",
          "PHP Post Max Size (post_max_size)",
          "128M",
          "Maximal datamängd som kan skickas i en och samma HTTP POST-begäran.",
          "standard",
          "config",
          {
            litespeed: "POST Payload Limit: Bestämmer maxgränsen för sammansatta filuppladdningar och formulär.",
            consensus: "WordPress Hosting Best Practice: Rekommenderat minst 128M (optimalt 256M) för problemfri uppladdning av teman och tillägg."
          },
          null,
          "server"
        ),
        makeOpt(
          "php_upload_max_filesize",
          "PHP Upload Max Filesize (upload_max_filesize)",
          "128M",
          "Maximal storlek för en enskild uppladdad fil via mediebiblioteket eller tilläggshanteraren.",
          "standard",
          "config",
          {
            litespeed: "Single File Upload Limit: Styr maximal filstorlek i WordPress mediabibliotek.",
            consensus: "WordPress Core Best Practice: Minst 128M säkerställer att video, PDF:er och säkerhetskopior kan laddas upp obehindrat."
          },
          null,
          "server"
        ),
        makeOpt(
          "wp_debug",
          "WordPress Felsökningsläge (WP_DEBUG)",
          0,
          "Bör vara inaktiverat (false/0) i produktion för att förhindra prestandatapp och att känslig information exponeras.",
          "high",
          "security",
          {
            litespeed: "Security & Performance: Skriver inga PHP notices/warnings till HTML i produktion.",
            consensus: "WordPress Core Security Hardening: WP_DEBUG ska alltid vara false i skarp produktion."
          },
          null,
          "server"
        ),
        makeOpt(
          "wp_disable_cron",
          "System-Cron (DISABLE_WP_CRON)",
          1,
          "Inaktiverar anropsstyrd WP-Cron till förmån för ett schemalagt server-cron i crontab.",
          "high",
          "performance",
          {
            litespeed: "Server Cron Optimization: Snabbar upp sidvisningar genom att köra cron asynkront.",
            consensus: "WordPress Core & High-Performance Hosting: Systemstyrd crontab var 5-15 minut ger jämn serverbelastning och garanterar att schemalagda uppgifter körs i tid."
          },
          null,
          "server"
        ),
        makeOpt(
          "wp_post_revisions",
          "Begränsa inläggsreversioner (WP_POST_REVISIONS)",
          "5",
          "Begränsar sparade versioner per inlägg/produkt till 5 st för att förhindra databassvällning.",
          "standard",
          "config",
          {
            litespeed: "Database Hygiene: Håller wp_posts- och wp_postmeta-tabellerna slimmade.",
            consensus: "WordPress Core Best Practice: 5 versioner räcker för historik utan att skapa tusentals överflödiga rader."
          },
          null,
          "server"
        )
      ]
    },
    {
      id: "theme_templates",
      title: "Tema & Elementor-synergi",
      subTitle: "Astra / Blocksy / SCM & Elementor Pro Avlastningsmatris",
      options: [
        makeOpt(
          "theme_code_architecture",
          "Kodarkitektur & Skydd (SCM vs Child-tema)",
          1,
          "All anpassad PHP och CSS hanteras centralt och isolerat via SCM istället för osäkra child-tema filer.",
          "standard",
          "stability",
          {
            litespeed: "SCM isolerar anpassad kod från temauppdateringar och förhindrar databaslåsningar.",
            consensus: "Modern WordPress Architecture: Centraliserad kodhantering (SCM) ersätter functions.php i child-tema."
          },
          null,
          "theme",
          null,
          [
            { name: "SCM Kodhanterare", status: "on", label: "✅ PÅ (Optimal)" },
            { name: "Child-tema functions.php", status: "off", label: "⚪ AV" },
            { name: "Aktivt föräldratema (Astra/Blocksy)", status: "on", label: "✅ Aktiv bas" }
          ]
        ),
        makeOpt(
          "theme_navigation_menus",
          "Navigationsmenyer (WordPress Core ➔ Elementor Nav Menu)",
          1,
          "Menystrukturen sparas i WordPress och renderas dynamiskt av Elementor Nav Menu utan temats tunga navigationsskript.",
          "standard",
          "performance",
          {
            litespeed: "Eliminerar dubbla JS-lyssnare för mobilmenyer och minskar Total Blocking Time (INP).",
            consensus: "Elementor Best Practice: Nav Menu widget ger full kontroll över styling, animationer och off-canvas."
          },
          null,
          "theme",
          null,
          [
            { name: "Elementor Nav Menu Widget", status: "on", label: "✅ PÅ (Optimal)" },
            { name: "WordPress Menystruktur", status: "on", label: "✅ Lagring" },
            { name: "Temats Header-meny", status: "off", label: "⚪ AV" },
            { name: "Elementor Mega Menu", status: "off", label: "⚪ Valbart" }
          ]
        ),
        makeOpt(
          "theme_header_footer_builder",
          "Sidhuvud & Sidfot (Elementor Theme Builder)",
          1,
          "Elementor Pro Theme Builder styr sidhuvud och sidfot 100%. Temats inbyggda header/footer avlastas helt.",
          "high",
          "performance",
          {
            litespeed: "Förhindrar rendering av dubbel HTML och eliminerar temats oanvända header-stilar.",
            consensus: "Elementor Theme Builder: Ersätter temats header/footer med responsiva, dynamiska moduler."
          },
          null,
          "theme",
          null,
          [
            { name: "Elementor Theme Builder", status: "on", label: "✅ PÅ (Optimal)" },
            { name: "Temats inbyggda Header/Footer", status: "off", label: "⚪ AV (Avlastad)" },
            { name: "Standard WP Header", status: "off", label: "⚪ AV" }
          ]
        ),
        makeOpt(
          "theme_typography_fonts",
          "Typografi & Google Fonts (Elementor Global Fonts)",
          1,
          "Teckensnitt och Google Fonts styrs centralt av Elementor. Förhindrar dubbelnedladdning från temats Customizer.",
          "high",
          "performance",
          {
            litespeed: "Eliminerar dubbla font-anrop mot externa servrar och förbättrar LCP/CLS avsevärt.",
            consensus: "Google Web Vitals: Centraliserad font-inläsning förhindrar FOUT och layoutförskjutningar."
          },
          null,
          "theme",
          null,
          [
            { name: "Elementor Global Fonts", status: "on", label: "✅ PÅ (Optimal)" },
            { name: "Temats Customizer-fonter", status: "off", label: "⚪ AV (Ingen dubblering)" },
            { name: "Core Systemfonter", status: "off", label: "⚪ AV" }
          ]
        ),
        makeOpt(
          "theme_color_palette",
          "Globala Färger & Paletter (Elementor + SCM CSS)",
          1,
          "Färgvariabler hanteras via Elementor Global Colors och SCM CSS-variabler istället för temats inline-palett.",
          "standard",
          "performance",
          {
            litespeed: "Minskar storleken på sidans HTML och eliminerar inline-färgregler.",
            consensus: "Elementor Design System: Global Colors ger enhetlig färghantering över hela sajten."
          },
          null,
          "theme",
          null,
          [
            { name: "Elementor Global Colors + SCM", status: "on", label: "✅ PÅ (Optimal)" },
            { name: "Temats Customizer-palett", status: "off", label: "⚪ AV" },
            { name: "Gutenberg Editor-palett", status: "off", label: "⚪ AV" }
          ]
        ),
        makeOpt(
          "theme_woocommerce_synergy",
          "WooCommerce & Kassa (Elementor Woo Builder)",
          1,
          "Kassa, varukorg och produktsidor byggs med Elementor. Inga föråldrade temamallar eller minicart-krockar.",
          "critical",
          "stability",
          {
            litespeed: "Kräver exkludering av wc-cart-fragments från defer/delay.",
            consensus: "WooCommerce & Elementor Best Practice: Säkerställer korrekt varukorgssaldo i sidhuvudet vid sidcache."
          },
          null,
          "theme",
          null,
          [
            { name: "Elementor WooCommerce Builder", status: "on", label: "✅ PÅ (Optimal)" },
            { name: "Temats WooCommerce-mallar", status: "off", label: "⚪ AV" },
            { name: "WooCommerce Core", status: "on", label: "✅ Aktiv motor" }
          ]
        ),
        makeOpt(
          "theme_site_logo",
          "Webbplatslogotyp (Elementor Site Logo)",
          1,
          "Logotyp hämtas dynamiskt via WordPress Core / Elementor Site Logo och exkluderas från Lazy Load.",
          "standard",
          "performance",
          {
            litespeed: "Kräver att logotyp (SVG/WebP) inte lazy-loadas (media_lazy_exc).",
            consensus: "Google Web Vitals (LCP): Omedelbar rendering av logotyp i headern."
          },
          null,
          "theme",
          null,
          [
            { name: "Elementor Site Logo Widget", status: "on", label: "✅ PÅ (Optimal)" },
            { name: "WP Core custom-logo", status: "on", label: "✅ Lagring" },
            { name: "Temats Site-Branding div", status: "off", label: "⚪ AV" }
          ]
        ),
        makeOpt(
          "theme_outdated_template_overrides",
          "Föråldrade WooCommerce-mallfiler i temat",
          0,
          "Upptäck föråldrade WooCommerce-mallfiler (.php) i temat som avviker från installerad WooCommerce-version.",
          "critical",
          "stability",
          {
            litespeed: "Förhindrar checkout- och cart-krascher vid uppdateringar.",
            consensus: "WooCommerce Core Hardening: Kritiskt att hålla checkout-, cart- och order-mallar synkroniserade för att undvika betalningsavbrott."
          },
          null,
          "theme",
          null,
          [
            { name: "0 föråldrade mallar", status: "on", label: "✅ PÅ (Optimal)" },
            { name: "Avvikande mallfiler", status: "off", label: "⚪ 0 st funna" }
          ]
        ),
        makeOpt(
          "theme_inactive_cleanup",
          "Städning av inaktiva teman",
          0,
          "Oanvända teman raderas för att minimera säkerhetsrisker och hålla filsystemet rent.",
          "standard",
          "stability",
          {
            litespeed: "Minskar onödig databas- och filsystemskanning.",
            consensus: "WordPress Security Best Practice: Ta bort inaktiva teman och tillägg för att minimera attackytan."
          },
          null,
          "theme",
          null,
          [
            { name: "Aktivt tema (Astra/Blocksy)", status: "on", label: "✅ Aktivt" },
            { name: "Inaktiva teman", status: "off", label: "⚪ Bör rensas" }
          ]
        )
      ]
    }
  ];
}

// Global window attachment for browser runtime
if (typeof window !== "undefined") {
  window.analyzeSystem = analyzeSystem;
  window.BENCHMARK_VERSIONS = BENCHMARK_VERSIONS;
  window.maskSecretKey = maskSecretKey;
  window.checkMissingExclusions = checkMissingExclusions;
  window.getFulfilledExclusions = getFulfilledExclusions;
  window.mergeExclusions = mergeExclusions;
  window.getOptionComparison = getOptionComparison;
  window.parseMemoryMB = parseMemoryMB;
  window.compareVersions = compareVersions;
  window.getPluginMatchTokens = getPluginMatchTokens;
  window.isCoreWooCommercePlugin = isCoreWooCommercePlugin;
  window.isCoreElementorPlugin = isCoreElementorPlugin;
  window.hasExternalGoogleFonts = hasExternalGoogleFonts;
  window.themeSignalsExternalGoogleFonts = themeSignalsExternalGoogleFonts;
  window.elementorSignalsExternalGoogleFonts = elementorSignalsExternalGoogleFonts;
  window.sanitizeElementorGoogleFonts = sanitizeElementorGoogleFonts;
  window.isActiveGoogleFontsValue = isActiveGoogleFontsValue;
  window.evaluateQuicCloudLiveEdge = evaluateQuicCloudLiveEdge;
}

// Node.js export for test runner
if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    analyzeSystem,
    BENCHMARK_VERSIONS,
    maskSecretKey,
    checkMissingExclusions,
    getFulfilledExclusions,
    mergeExclusions,
    getOptionComparison,
    parseMemoryMB,
    compareVersions,
    buildCompleteLscwpSettings,
    getPluginMatchTokens,
    isCoreWooCommercePlugin,
    isCoreElementorPlugin,
    hasExternalGoogleFonts,
    themeSignalsExternalGoogleFonts,
    elementorSignalsExternalGoogleFonts,
    sanitizeElementorGoogleFonts,
    isActiveGoogleFontsValue,
    evaluateQuicCloudLiveEdge
  };
}

