/**
 * AreWee WP-Optimizer - Exporter / Serializer (v2.7.2.2)
 * Provides high-fidelity serialization and deserialization between JavaScript objects,
 * PHP serialized format (.data), LiteSpeed v7 JSON tuple formats, and JSON.
 */

/**
 * Parses a serialized PHP array string and returns a JavaScript object.
 * @param {string} rawStr Serialized PHP string
 * @returns {Object} Deserialized key-value pairs
 */
function php_deserialize(rawStr) {
  if (!rawStr || typeof rawStr !== "string") return null;

  const str = rawStr.trim();
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
      case 'i': { // Integer: i:123; or i:-123;
        const end = str.indexOf(';', offset);
        const val = parseInt(str.substring(offset, end), 10);
        offset = end + 1;
        return val;
      }
      case 'd': { // Double/Float: d:12.34; or d:INF; or d:NAN;
        const end = str.indexOf(';', offset);
        const rawNumStr = str.substring(offset, end).trim();
        let val;
        if (rawNumStr === "INF") val = Infinity;
        else if (rawNumStr === "-INF") val = -Infinity;
        else if (rawNumStr === "NAN") val = NaN;
        else val = parseFloat(rawNumStr);
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
    if (str.startsWith("a:")) {
      return parse();
    }
    // Check if it's actually JSON
    if (str.startsWith("{") || str.startsWith("[")) {
      return JSON.parse(str);
    }
  } catch (err) {
    console.error("Fel vid deserialisering av PHP data:", err);
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
 * Detect LiteSpeed Cache 7.1.9+ / 7.x JSON tuple export lines:
 * ["_version","7.9.1"] or ["media-lazy_exc", ["a","b"]]
 */
function looksLikeLscwpJsonTuples(text) {
  if (!text || typeof text !== "string") return false;
  const trimmed = text.trim();
  if (!trimmed) return false;
  // Whole-file JSON array of tuples
  if (trimmed.startsWith("[") && trimmed.includes('"_version"')) {
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed) && parsed.length > 0 && Array.isArray(parsed[0]) && typeof parsed[0][0] === "string") {
        return true;
      }
    } catch (e) { /* fall through to line scan */ }
  }
  const lines = trimmed.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  let tupleHits = 0;
  let knownKeyHits = 0;
  const knownRe = /^\[\s*"(?:_version|version|cache|cache-priv|cache-exc|optm-|media-|object|guest|esi)/;
  for (const line of lines.slice(0, 80)) {
    if (line.startsWith("[") && line.endsWith("]")) {
      try {
        const tup = JSON.parse(line);
        if (Array.isArray(tup) && tup.length >= 2 && typeof tup[0] === "string") {
          tupleHits++;
          if (knownRe.test(line) || /^(?:_|cache|optm|media|object|guest|esi)/.test(tup[0])) knownKeyHits++;
        }
      } catch (e) { /* ignore */ }
    }
  }
  return tupleHits >= 2 && knownKeyHits >= 1;
}

/**
 * Two-layer validation: parsed object must look like LSCWP settings.
 */
function isValidLscwpSettingsObject(obj) {
  if (!obj || typeof obj !== "object" || Array.isArray(obj)) return false;
  const keys = Object.keys(obj);
  if (keys.length === 0) return false;
  const markers = [
    "cache", "cache_priv", "optm_css_min", "optm_js_min", "optm_html_min",
    "drop_uri", "media_lazy", "guest_mode", "esi", "cache_object", "cache_browser",
    "_version", "version", "the_version", "lscwp_cur_version",
    "optm-css_min", "optm-js_min", "optm-html_min", "cache-priv", "cache-exc", "media-lazy"
  ];
  let hits = 0;
  for (const k of keys) {
    const kl = k.toLowerCase();
    if (markers.some(m => kl === m.toLowerCase() || kl.replace(/_/g, "-") === m.replace(/_/g, "-"))) hits++;
    if (/^(cache|optm|media|guest|esi|crawler|object)/i.test(k)) hits++;
  }
  return hits >= 1;
}

/**
 * Analyzes and decodes any uploaded settings file (detecting JSON, JSON tuples, base64 or raw serialized PHP).
 * @param {string} rawContent Raw uploaded file string
 * @returns {Object} Parsed settings object (translated to internal keys)
 */
function parseSettingsFile(rawContent) {
  let content = rawContent.trim();
  
  // Try decoding base64 if it looks like it
  if (!content.startsWith("a:") && !content.startsWith("{") && !content.startsWith("[") && /^[A-Za-z0-9+/=\s]+$/.test(content)) {
    try {
      content = atob(content.replace(/\s/g, ''));
    } catch (e) {
      // Not base64, revert
      content = rawContent.trim();
    }
  }

  let parsed = null;

  // 1. Parse PHP serialized
  if (content.startsWith("a:") || content.includes("a:")) {
    const aIndex = content.indexOf("a:");
    const phpStr = aIndex >= 0 ? content.substring(aIndex) : content;
    parsed = php_deserialize(phpStr);
  }

  // 2. Try JSON object
  if (!parsed) {
    try {
      parsed = JSON.parse(content);
      // If parsed as single 2D array of tuples [[k, v], [k, v]]
      if (Array.isArray(parsed) && parsed.length > 0 && Array.isArray(parsed[0])) {
        const tupleMap = {};
        parsed.forEach(tuple => {
          if (Array.isArray(tuple) && tuple.length >= 2) {
            let k = tuple[0];
            let v = tuple[1];
            if (Array.isArray(v)) {
              v = v.map(item => (typeof item === "string" ? item.replace(/\\\//g, "/") : item)).join("\n");
            } else if (typeof v === "boolean") {
              v = v ? "1" : "0";
            }
            tupleMap[k] = v;
          }
        });
        parsed = tupleMap;
      }
    } catch (e) {
      // Not single JSON object
    }
  }

  // 3. Parse line-delimited JSON tuples (LiteSpeed Cache v6.x/v7.x export format: ["key", value])
  if (!parsed && (content.includes('["') || content.includes("['"))) {
    try {
      const tupleObj = {};
      const lines = content.split(/\r?\n/);
      lines.forEach(line => {
        const trimmed = line.trim();
        if (!trimmed) return;
        if (trimmed.startsWith("[") && trimmed.endsWith("]")) {
          try {
            const parsedTuple = JSON.parse(trimmed);
            if (Array.isArray(parsedTuple) && parsedTuple.length >= 2) {
              const k = parsedTuple[0];
              let v = parsedTuple[1];
              if (Array.isArray(v)) {
                v = v.map(item => (typeof item === "string" ? item.replace(/\\\//g, "/") : item)).join("\n");
              } else if (typeof v === "boolean") {
                v = v ? "1" : "0";
              }
              tupleObj[k] = v;
            }
          } catch (lineErr) {
            // ignore non-JSON line
          }
        }
      });
      if (Object.keys(tupleObj).length > 0) {
        parsed = tupleObj;
      }
    } catch (e) {
      // ignore
    }
  }

  // 4. Fallback pattern matching for very simple files (key=value or key:value lines)
  if (!parsed) {
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
      parsed = fallbackObj;
    }
  }

  if (parsed && typeof parsed === "object") {
    // UNWRAP LiteSpeed exported structure:
    // LiteSpeed export format is: ['options' => [...], 'version' => '...', 'site_url' => '...']
    let flatObj = { ...parsed };
    if (parsed.options && typeof parsed.options === "object") {
      flatObj = { ...flatObj, ...parsed.options };
    }
    if (parsed.data && typeof parsed.data === "object") {
      flatObj = { ...flatObj, ...parsed.data };
    }
    if (parsed.settings && typeof parsed.settings === "object") {
      flatObj = { ...flatObj, ...parsed.settings };
    }
    if (parsed.conf && typeof parsed.conf === "object") {
      flatObj = { ...flatObj, ...parsed.conf };
    }
    return translateKeysToInternal(flatObj);
  }

  throw new Error("Kunde inte tolka inställningsfilen. Kontrollera filformatet.");
}


function maskSecretKey(val) {
  if (val === null || val === undefined) return "";
  const s = String(val).trim();
  if (!s || s === "0" || s === "1") return s;
  if (s.length < 10) return "••••";
  return s.slice(0, 4) + "…" + s.slice(-4);
}
const SECRET_OPTION_IDS = new Set([
  "domain_key", "hash", "cdn_cloudflare_key", "cdn-cloudflare_key",
  "object-pswd", "object_pswd", "object-password", "object_password",
  "cache-object_pswd", "cache_object_pswd", "object-pass", "object_pass",
  "redis_password", "redis-password", "redis_pswd", "redis-pswd"
]);

/** True when a settings/option key must never appear in cleartext in human-readable output. */
function isSecretOptionKey(id) {
  if (id === null || id === undefined) return false;
  const s = String(id);
  if (SECRET_OPTION_IDS.has(s)) return true;
  // Denylist patterns: passwords, keys, tokens, pswd/passwd
  if (/pswd|passwd|password|secret|token|(^|[_-])key($|[_-])/i.test(s)) return true;
  return false;
}

/** Mask value for display/report if key is secret; otherwise return as-is (stringified). */
function maskValueIfSecret(key, val) {
  if (!isSecretOptionKey(key)) return val;
  return maskSecretKey(val);
}

// --- TWO-WAY KEY TRANSLATION LAYER ---

const KEY_MAPPING_TO_INTERNAL = {
  "auto_upgrade": "auto_upgrade",
  "hash": "domain_key",
  "domain_key": "domain_key",
  "api_key": "domain_key",
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
  "cache-exc_uri": "drop_uri",
  "cache_exc_uri": "drop_uri",
  "_lscache_exc": "drop_uri",
  "lscache_exc": "drop_uri",
  "lscache-exc": "drop_uri",
  "drop_uri": "drop_uri",
  "drop-uri": "drop_uri",
  "exc_uri": "drop_uri",
  "exc-uri": "drop_uri",
  "esi": "esi",
  "esi_enabled": "esi",
  "object": "cache_object",
  "object-cache": "cache_object",
  "object_cache": "cache_object",
  "cache-object": "cache_object",
  "cache_object": "cache_object",
  "cache_object_status": "cache_object",
  "cache-object_kind": "cache_object_kind",
  "cache_object_kind": "cache_object_kind",
  "object-kind": "cache_object_kind",
  "cache-object_host": "cache_object_host",
  "cache_object_host": "cache_object_host",
  "object-host": "cache_object_host",
  "cache-object_port": "cache_object_port",
  "cache_object_port": "cache_object_port",
  "object-port": "cache_object_port",
  "cache-browser": "cache_browser",
  "cache_browser": "cache_browser",
  "browser": "cache_browser",
  "browser-cache": "cache_browser",
  "browser_cache": "cache_browser",
  "cache-browser_ttl": "cache_browser_ttl",
  "cache_browser_ttl": "cache_browser_ttl",
  "optm-css_min": "optm_css_min",
  "optm_css_min": "optm_css_min",
  "css_minify": "optm_css_min",
  "optm-html_min": "optm_html_min",
  "optm_html_min": "optm_html_min",
  "html_minify": "optm_html_min",
  "html_min": "optm_html_min",
  "optm-css_comb": "optm_css_comb",
  "optm_css_comb": "optm_css_comb",
  "css_combine": "optm_css_comb",
  "optm-css_comb_ext_inl": "optm_css_comb_ext_inl",
  "optm_css_comb_ext_inl": "optm_css_comb_ext_inl",
  "optm-ucss": "optm_ucss",
  "optm_ucss": "optm_ucss",
  "optm-ucss_inline": "optm_ucss_inline",
  "optm_ucss_inline": "optm_ucss_inline",
  "optm-css_async": "optm_css_async",
  "optm_css_async": "optm_css_async",
  "optm-ccss_per_url": "optm_ccss_per_url",
  "optm_ccss_per_url": "optm_ccss_per_url",
  "optm-css_async_inline": "optm_css_async_inline",
  "optm_css_async_inline": "optm_css_async_inline",
  "optm-css_comb_priority": "css_combined_priority",
  "css_combined_priority": "css_combined_priority",
  "optm-css_exc": "css_exclude",
  "optm_css_exc": "css_exclude",
  "css_exclude": "css_exclude",
  "optm-css_preload": "css_preload",
  "css_preload": "css_preload",
  "optm-font_display": "optm_font_display",
  "optm_font_display": "optm_font_display",
  "optm-css_font_display": "optm_font_display",
  "optm_css_font_display": "optm_font_display",
  "font_display": "optm_font_display",
  "optm-ggfonts_async": "optm_ggfonts_async",
  "optm_ggfonts_async": "optm_ggfonts_async",
  "optm-ggfonts_rm": "optm_ggfonts_rm",
  "optm_ggfonts_rm": "optm_ggfonts_rm",
  "optm-js_min": "optm_js_min",
  "optm_js_min": "optm_js_min",
  "js_minify": "optm_js_min",
  "optm-js_comb": "optm_js_comb",
  "optm_js_comb": "optm_js_comb",
  "js_combine": "optm_js_comb",
  "optm-js_comb_ext_inl": "optm_js_comb_ext_inl",
  "optm_js_comb_ext_inl": "optm_js_comb_ext_inl",
  "optm-js_defer": "optm_js_defer",
  "optm_js_defer": "optm_js_defer",
  "js_defer": "optm_js_defer",
  "optm-js_exc": "js_exclude",
  "optm_js_exc": "js_exclude",
  "js_exclude": "js_exclude",
  "optm-js_delayed_exc": "js_delayed_exclude",
  "optm_js_delayed_exc": "js_delayed_exclude",
  "js_delayed_exc": "js_delayed_exclude",
  "js_delayed_exclude": "js_delayed_exclude",
  "optm-js_defer_exc": "optm_js_defer_exc",
  "optm_js_defer_exc": "optm_js_defer_exc",
  "optm-js_delay_inc": "optm_js_delay_inc",
  "optm-qs_rm": "optm_qs_rm",
  "optm_qs_rm": "optm_qs_rm",
  "optm-dns_prefetch": "optm_dns_prefetch",
  "optm_dns_prefetch": "optm_dns_prefetch",
  "media-vpi": "media_vpi",
  "media_vpi": "media_vpi",
  "media-lazy": "media_lazy",
  "media_lazy": "media_lazy",
  "media-lazy_native": "media_lazy_native",
  "media_lazy_native": "media_lazy_native",
  "media-lazy_placeholder": "media_lazy_placeholder",
  "media_lazy_placeholder": "media_lazy_placeholder",
  "media-lazy_exc": "media_lazy_exc",
  "media_lazy_exc": "media_lazy_exc",
  "media-lazy-exc": "media_lazy_exc",
  "media_lazy_exclude": "media_lazy_exc",
  "media-lazy_img_exc": "media_lazy_exc",
  "media_lazy_img_exc": "media_lazy_exc",
  "media-lazy-img-exc": "media_lazy_exc",
  "media-lazy_class_exc": "media_lazy_exc",
  "media_lazy_class_exc": "media_lazy_exc",
  "media-lazy_uri_exc": "media_lazy_exc",
  "media_lazy_uri_exc": "media_lazy_exc",
  "media-iframe_lazy": "media_iframe_lazy",
  "media_iframe_lazy": "media_iframe_lazy",
  "media-webp": "media_webp",
  "media_webp": "media_webp",
  "img_optm-webp": "img_optm_webp",
  "img_optm_webp": "img_optm_webp",
  "img_optm-auto": "img_optm_auto",
  "img_optm_auto": "img_optm_auto",
  "img_optm-ori": "img_optm_ori",
  "img_optm_ori": "img_optm_ori",
  "img_optm-rm_bkup": "img_optm_rm_bkup",
  "img_optm_rm_bkup": "img_optm_rm_bkup",
  "img_optm-lossless": "img_optm_lossless",
  "img_optm_lossless": "img_optm_lossless",
  "img_optm-sizes_skipped": "img_optm_sizes_skipped",
  "img_optm_sizes_skipped": "img_optm_sizes_skipped",
  "img_optm-exif": "img_optm_exif",
  "img_optm_exif": "img_optm_exif",
  "img_optm-webp_attr": "img_optm_webp_attr",
  "img_optm_webp_attr": "img_optm_webp_attr",
  "img_optm-webp_replace_srcset": "img_optm_webp_replace_srcset",
  "img_optm_webp_replace_srcset": "img_optm_webp_replace_srcset",
  "cdn": "cdn",
  "cdn-quic": "cdn_quic",
  "cdn_quic": "cdn_quic",
  "cdn-cloudflare": "cdn_cloudflare",
  "cdn_cloudflare": "cdn_cloudflare",
  "cdn-mapping": "cdn_mapping",
  "cdn_mapping": "cdn_mapping",
  "cdn-cloudflare_key": "cdn_cloudflare_key",
  "cdn_cloudflare_key": "cdn_cloudflare_key",
  "media-webp_attribute": "media_webp_attribute",
  "media-webp_replace": "media_webp_replace",
  "media-webp_rep": "media_webp_replace",
  "media_webp_rep": "media_webp_replace",
  "optm-emojis_rm": "optm_emojis_rm",
  "optm_emojis_rm": "optm_emojis_rm",
  "optm-emoji_rm": "optm_emojis_rm",
  "optm_emoji_rm": "optm_emojis_rm",
  "optm-qs_rm": "optm_qs_rm",
  "optm_qs_rm": "optm_qs_rm",
  "optm-ggfonts_rm": "optm_ggfonts_rm",
  "optm_ggfonts_rm": "optm_ggfonts_rm",
  "crawler": "crawler",
  "crawler_usleep": "crawler_usleep",
  "crawler-usleep": "crawler_usleep",
  "crawler-crawl_interval": "crawler_usleep",
  "crawler_crawl_interval": "crawler_usleep",
  "crawler_load_limit": "crawler_load_limit",
  "crawler-load_limit": "crawler_load_limit",
  "object-pswd": "object-pswd",
  "object_pswd": "object-pswd",
  "cache-object_pswd": "object-pswd",
  "cache_object_pswd": "object-pswd",
  "db_optm_revisions": "db_optm_revisions",
  "db_optm-revisions_max": "db_optm_revisions",
  "db_optm_revisions_max": "db_optm_revisions",
  "db_optm_revisions_age": "db_optm_revisions_age",
  "db_optm-revisions_age": "db_optm_revisions_age",
  
  // Custom CSS key mapping
  "optm-css_custom": "optm_css_custom",
  "optm_css_custom": "optm_css_custom"
};

const KEY_MAPPING_TO_LSCWP = {
  "auto_upgrade": "auto_upgrade",
  "domain_key": "hash",
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
  "cache_object": "object",
  "cache_object_kind": "cache-object_kind",
  "cache_object_host": "cache-object_host",
  "cache_object_port": "cache-object_port",
  "cache_browser": "cache-browser",
  "cache_browser_ttl": "cache-browser_ttl",
  "optm_css_min": "optm-css_min",
  "optm_html_min": "optm-html_min",
  "optm_css_comb": "optm-css_comb",
  "optm_css_comb_ext_inl": "optm-css_comb_ext_inl",
  "optm_ucss": "optm-ucss",
  "optm_ucss_inline": "optm-ucss_inline",
  "optm_css_async": "optm-css_async",
  "optm_ccss_per_url": "optm-ccss_per_url",
  "optm_css_async_inline": "optm-css_async_inline",
  "css_combined_priority": "optm-css_comb_priority",
  "css_exclude": "optm-css_exc",
  "css_preload": "optm-css_preload",
  "optm_font_display": "optm-css_font_display",
  "optm_ggfonts_async": "optm-ggfonts_async",
  "optm_ggfonts_rm": "optm-ggfonts_rm",
  "optm_js_min": "optm-js_min",
  "optm_js_comb": "optm-js_comb",
  "optm_js_comb_ext_inl": "optm-js_comb_ext_inl",
  "optm_js_defer": "optm-js_defer",
  "optm_js_defer_exc": "optm-js_defer_exc",
  "optm_js_delay_inc": "optm-js_delay_inc",
  "js_exclude": "optm-js_exc",
  "js_delayed_exclude": "optm-js_delayed_exc",
  "optm_js_delayed_exc": "optm-js_delayed_exc",
  "optm_js_delay_exc": "optm-js_delayed_exc",
  "optm_dns_prefetch": "optm-dns_prefetch",
  "media_vpi": "media-vpi",
  "media_lazy": "media-lazy",
  "media_lazy_native": "media-lazy_native",
  "media_lazy_placeholder": "media-lazy_placeholder",
  "media_lazy_exc": "media-lazy_exc",
  "media_iframe_lazy": "media-iframe_lazy",
  "media_webp": "media-webp",
  "media_webp_replace": "media-webp_replace",
  "media_webp_attribute": "media-webp_attribute",
  "img_optm_auto": "img_optm-auto",
  "img_optm_ori": "img_optm-ori",
  "img_optm_rm_bkup": "img_optm-rm_bkup",
  "img_optm_lossless": "img_optm-lossless",
  "img_optm_sizes_skipped": "img_optm-sizes_skipped",
  "img_optm_exif": "img_optm-exif",
  "img_optm_webp": "img_optm-webp",
  "img_optm_webp_attr": "img_optm-webp_attr",
  "img_optm_webp_replace_srcset": "img_optm-webp_replace_srcset",
  "cdn": "cdn",
  "cdn_quic": "cdn-quic",
  "cdn_cloudflare": "cdn-cloudflare",
  "cdn_mapping": "cdn-mapping",
  "cdn_cloudflare_key": "cdn-cloudflare_key",
  "optm_emojis_rm": "optm-emoji_rm",
  "optm_qs_rm": "optm-qs_rm",
  "crawler": "crawler",
  "crawler_usleep": "crawler-crawl_interval",
  "crawler_load_limit": "crawler-load_limit",
  "object-pswd": "object-pswd",
  "object_pswd": "object-pswd",
  "db_optm_revisions": "db_optm-revisions_max",
  "db_optm_revisions_age": "db_optm-revisions_age",
  
  // Custom CSS key mapping
  "optm_css_custom": "optm-css_custom"
};

if (typeof window !== "undefined") {
  window.KEY_MAPPING_TO_INTERNAL = KEY_MAPPING_TO_INTERNAL;
  window.KEY_MAPPING_TO_LSCWP = KEY_MAPPING_TO_LSCWP;
}

const KNOWN_TEXTAREA_KEYS = new Set([
  "drop_uri", "cache-exc", "cache_exc", "cache-uri_exc", "cache_uri_exc", "cache-drop_uri", "cache_drop_uri", "exc_uri", "exc-uri",
  "js_exclude", "optm-js_exc", "optm_js_exc", "optm-js_exclude", "optm_js_exclude",
  "css_exclude", "optm-css_exc", "optm_css_exc",
  "media_lazy_exc", "media-lazy_exc", "media-lazy-exc", "media_lazy_exclude", "media-lazy_img_exc", "media_lazy_img_exc", "media-lazy_class_exc", "media_lazy_class_exc", "media-lazy_uri_exc", "media_lazy_uri_exc",
  "js_delayed_exclude", "optm-js_delayed_exc", "optm_js_delayed_exc", "js_delayed_exc",
  "optm_js_defer_exc", "optm-js_defer_exc", "optm_js_delay_inc", "optm-js_delay_inc",
  "optm_dns_prefetch", "optm-dns_prefetch",
  "css_preload", "optm-css_preload", "optm_css_preload",
  "optm_css_custom", "optm-css_custom",
  "img_optm_sizes_skipped", "img_optm-sizes_skipped",
  "img_optm_webp_attr", "img_optm-webp_attr"
]);

function translateKeysToInternal(obj) {
  if (!obj || typeof obj !== "object") return obj;
  const newObj = {};
  Object.keys(obj).forEach(key => {
    const cleanKey = key.replace(/^(?:litespeed[\._-]conf[\._-]|litespeed[\._-]|_lscache[\._-]|lscwp[\._-]|conf[\._-])/i, "");
    const internalKey = KEY_MAPPING_TO_INTERNAL[cleanKey] || KEY_MAPPING_TO_INTERNAL[key] || cleanKey;
    let val = obj[key];
    
    // Convert array- or indexed object-stored options to newline strings ONLY for known textarea/exclusion keys or simple string lists
    if (val !== null && val !== undefined) {
      const isKnownTextarea = KNOWN_TEXTAREA_KEYS.has(internalKey) || KNOWN_TEXTAREA_KEYS.has(cleanKey) || KNOWN_TEXTAREA_KEYS.has(key);
      if (isKnownTextarea) {
        if (Array.isArray(val)) {
          val = val.map(item => (typeof item === "string" ? item.replace(/\\\//g, "/") : item)).join("\n");
        } else if (typeof val === "object") {
          val = Object.values(val).map(item => (typeof item === "string" ? item.replace(/\\\//g, "/") : item)).join("\n");
        }
      } else if (Array.isArray(val) && val.every(item => typeof item === "string" || typeof item === "number")) {
        // Simple primitive array
        val = val.join("\n");
      }
      // General complex nested objects (e.g. CDN mappings) remain untouched
    }
    
    if (internalKey === "domain_key" && Object.prototype.hasOwnProperty.call(newObj, "domain_key")) {
      const existing = newObj["domain_key"];
      const keepExisting = (typeof existing === "string" && existing.length > 5) &&
        (!(typeof val === "string") || val.length <= existing.length);
      if (!keepExisting) newObj[internalKey] = val;
    } else {
      newObj[internalKey] = val;
    }
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
    
    // Safety check: Never output domain_key/hash as integer 1 or 0; LSCWP 7.x write key is hash
    if (key === "domain_key" || key === "hash") {
      if (typeof obj[key] === "string" && obj[key].length > 5 && obj[key] !== "1" && obj[key] !== "0") {
        newObj["hash"] = obj[key];
      }
      return;
    }

    const lscwpKey = KEY_MAPPING_TO_LSCWP[key] || key;
    let val = obj[key];
    
    // Convert internal newline strings back to indexed objects (representing PHP arrays)
    if (key === "drop_uri" || key === "js_exclude" || key === "css_exclude" || key === "media_lazy_exc" || key === "media_lazy_exclude" || key === "js_delayed_exclude" || key === "optm_js_delayed_exc") {
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
 * Version: 2.7.2.2
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
    if (class_exists('WooCommerce') && get_option('woocommerce_custom_orders_table_enabled') !== 'yes') {
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
 * Plugin Name: AreWee-Optimizer REST Sync Bridge
 * Description: Säker REST API-brygga för att exportera och importera diagnos- och inställningsdata till AreWee-Optimizer.
 * Version: 2.7.2.2
 * Author: AreWee-Optimizer
 * License: GPL2
 */

if (!defined('ABSPATH')) {
    exit;
}

// Generate connection token on activation
register_activation_hook(__FILE__, 'wp_optimizer_sync_activate');
function wp_optimizer_sync_activate() {
    if (!get_option('wp_optimizer_sync_token')) {
        $token = bin2hex(random_bytes(24)); // Cryptographically secure 48-char token
        update_option('wp_optimizer_sync_token', $token);
    }
}

// Admin menu to view token
add_action('admin_menu', 'wp_optimizer_sync_menu');
function wp_optimizer_sync_menu() {
    add_management_page(
        'AreWee Optimizer Sync',
        'Optimizer Sync',
        'manage_options',
        'arewee-optimizer-sync',
        'wp_optimizer_sync_page'
    );
}

function wp_optimizer_sync_page() {
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
    $api_url = rest_url('arewee-optimizer/v1/diagnostics');
    ?>
    <div class="wrap">
        <div style="background: #fff; border: 1px solid #ccd0d4; border-radius: 8px; padding: 20px; max-width: 750px; margin-top: 20px; box-shadow: 0 1px 3px rgba(0,0,0,0.05);">
            <h1 style="display: flex; align-items: center; gap: 8px; margin-bottom: 5px;">⚡ AreWee-Optimizer REST API Sync</h1>
            <p style="color: #646970; font-size: 14px; margin-bottom: 20px;">Säker, krypterad och skrivskyddad synkronisering med din AreWee-Optimizer panel.</p>
            
            <hr style="border: 0; border-top: 1px solid #f0f0f1; margin: 20px 0;">

            <h2>Säker Anslutningstoken</h2>
            <p>Använd denna token i AreWee-Optimizer för att koppla upp din sajt säkert via krypterad REST API.</p>
            
            <table class="form-table" style="margin-top: 10px;">
                <tr>
                    <th scope="row">REST API Endpoint</th>
                    <td>
                        <input type="text" readonly value="<?php echo esc_url($api_url); ?>" class="regular-text code" style="font-family: monospace; font-size: 13px; width: 420px;" onclick="this.select();">
                    </td>
                </tr>
                <tr>
                    <th scope="row">Din Token</th>
                    <td>
                        <input type="text" readonly value="<?php echo esc_attr($token); ?>" class="regular-text code" style="font-family: monospace; font-size: 14px; width: 420px;" onclick="this.select();">
                        <p class="description">Kopiera denna token och klistra in i AreWee-Optimizer.</p>
                    </td>
                </tr>
            </table>

            <form method="post" style="margin-top: 20px;">
                <?php wp_nonce_field('wp_optimizer_sync_action', 'wp_optimizer_sync_nonce'); ?>
                <button type="submit" name="wp_optimizer_regen_token" class="button button-secondary" onclick="return confirm('Är du säker på att du vill generera en ny token? Den gamla tokenen slutar fungera direkt.');">🔄 Generera ny token</button>
            </form>
        </div>
    </div>
    <?php
}

// Add CORS headers for REST API requests to support web UI synchronization
add_action('rest_api_init', function () {
    add_filter('rest_pre_serve_request', function ($value) {
        header('Access-Control-Allow-Origin: *');
        header('Access-Control-Allow-Methods: GET, OPTIONS');
        header('Access-Control-Allow-Headers: X-Optimizer-Token, X-WP-Optimizer-Token, Authorization, Content-Type');
        return $value;
    });
}, 15);

// Register secure REST API route
add_action('rest_api_init', function () {
    register_rest_route('arewee-optimizer/v1', '/diagnostics', array(
        'methods' => 'GET',
        'callback' => 'wp_optimizer_sync_get_diagnostics',
        'permission_callback' => 'wp_optimizer_sync_verify_token'
    ));
});

function wp_optimizer_sync_verify_token($request) {
    // 1. Strict IP Rate Limiting (max 60 requests/minute per IP)
    $ip = sanitize_text_field($_SERVER['REMOTE_ADDR'] ?? '127.0.0.1');
    $transient_key = 'wp_sync_rate_' . md5($ip);
    $requests = (int) get_transient($transient_key);
    if ($requests > 60) {
        return new WP_Error('rate_limited', 'För många förfrågningar. Försök igen senare.', array('status' => 429));
    }
    set_transient($transient_key, $requests + 1, 60);

    // 2. Strict Header-only Token Verification (No URL query parameter leakage)
    $header_token = $request->get_header('X-Optimizer-Token') ?: ($request->get_header('X-WP-Optimizer-Token') ?: $request->get_header('x_optimizer_token'));
    if (!$header_token) {
        $auth_header = $request->get_header('Authorization');
        if ($auth_header && preg_match('/Bearer\s+(.*)$/i', $auth_header, $matches)) {
            $header_token = trim($matches[1]);
        }
    }
    $token = $header_token;
    
    $saved_token = get_option('wp_optimizer_sync_token');
    if (!$saved_token || !$token || !hash_equals($saved_token, $token)) {
        return new WP_Error('unauthorized', 'Ogiltig eller saknad anslutningstoken (Token måste skickas via HTTP-header)', array('status' => 403));
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
    $wooinfo = null;
    if (class_exists('WooCommerce')) {
        $gateways = array();
        if (WC()->payment_gateways()) {
            foreach (WC()->payment_gateways()->payment_gateways() as $gw) {
                if ($gw->enabled === 'yes') {
                    $gateways[$gw->id] = $gw->title;
                }
            }
        }
        $wooinfo = array(
            'version' => WC()->version,
            'hpos_enabled' => class_exists('Automattic\\WooCommerce\\Utilities\\OrderUtil') && Automattic\WooCommerce\Utilities\OrderUtil::custom_orders_table_usage_is_enabled(),
            'active_gateways' => $gateways
        );
    }
    
    // 3. Gather Wordfence Info (Read-Only)
    $wfinfo = null;
    if (class_exists('wordfence')) {
        $wfinfo = array(
            'firewall_mode' => class_exists('wfConfig') ? wfConfig::get('wafStatus') : 'unknown',
            'live_traffic' => class_exists('wfConfig') ? (wfConfig::get('liveTrafficEnabled') ? 'enabled' : 'disabled') : 'unknown',
            'ip_header' => class_exists('wfConfig') ? wfConfig::get('howGetIPs') : 'REMOTE_ADDR'
        );
    }
    
    // 4. Gather Elementor Experiments (Read-Only)
    $eleminfo = null;
    if (did_action('elementor/loaded')) {
        $eleminfo = array(
            'version' => ELEMENTOR_VERSION,
            'css_print_method' => get_option('elementor_css_print_method', 'external'),
            'experiments' => array(
                'e_dom_optimization' => get_option('elementor_experiment-e_dom_optimization', 'default'),
                'e_optimized_assets_loading' => get_option('elementor_experiment-e_optimized_assets_loading', 'default'),
                'e_optimized_css_loading' => get_option('elementor_experiment-e_optimized_css_loading', 'default'),
                'e_font_icon_svg' => get_option('elementor_experiment-e_font_icon_svg', 'default')
            )
        );
    }
    
    // 5. Gather LiteSpeed Cache Raw Settings (Read-Only)
    $lscwp_options = get_option('litespeed.conf', array());
    if (empty($lscwp_options)) {
        $lscwp_options = get_option('litespeed-cache-conf', array());
    }

    return array(
        'status' => 'success',
        'syncPluginVersion' => '2.7.2.2',
        'generated_at' => current_time('mysql'),
        'sysInfo' => $sysinfo,
        'wooInfo' => $wooinfo,
        'wfInfo' => $wfinfo,
        'elemInfo' => $eleminfo,
        'uploadedSettings' => $lscwp_options,
        'data' => array(
            'syncPluginVersion' => '2.7.2.2',
            'sysInfo' => $sysinfo,
            'sysinfo' => $sysinfo,
            'wooInfo' => $wooinfo,
            'woocommerce' => $wooinfo,
            'wfInfo' => $wfinfo,
            'wordfence' => $wfinfo,
            'elemInfo' => $eleminfo,
            'elementor' => $eleminfo,
            'uploadedSettings' => $lscwp_options,
            'lscwp_settings' => $lscwp_options
        )
    );
}
`;
}

/**
 * Generates a comprehensive Markdown report (Second Opinion) detailing findings,
 * active environment stats, measured vs recommended LiteSpeed settings, and source consensus.
 * Supports both generateSecondOpinionMarkdown(state) and generateSecondOpinionMarkdown(analysis, state).
 * 
 * @param {Object} arg1 - Analysis results object or state object
 * @param {Object} [arg2] - Global state object if analysis was passed first
 * @returns {string} Markdown document formatted with clear headings, tables, and notes
 */
function generateSecondOpinionMarkdown(arg1, arg2) {
  let analysis = null;
  let state = null;

  if (arg2) {
    analysis = arg1;
    state = arg2;
  } else if (arg1) {
    state = arg1;
    if (state.analysisResults) {
      analysis = state.analysisResults;
    } else {
      const analyzeFn = (typeof analyzeSystem === "function") 
        ? analyzeSystem 
        : (typeof window !== "undefined" && window.analyzeSystem) 
          ? window.analyzeSystem 
          : null;
      if (analyzeFn) {
        analysis = analyzeFn(state.sysInfo, state.wooInfo, state.wfInfo, state.elemInfo, state.uploadedSettings, state.customCodeInfo, state.customCss, state.themeInfo);
      } else {
        analysis = {};
      }
    }
  }

  if (!state) return "# AreWee-Optimizer: Ingen data tillgänglig för rapport.";
  if (!analysis) analysis = {};

  const env = analysis.environment || {};
  const rawAlerts = analysis.alerts || [];
  const siteUrl = state.detectedSiteUrl || (state.sysInfo && state.sysInfo["wp-core"] && (state.sysInfo["wp-core"].site_url || state.sysInfo["wp-core"].home_url)) || "https://din-webbplats.se";
  const wpVer = env.wpVersion || (state.sysInfo && state.sysInfo["wp-core"] && state.sysInfo["wp-core"].version) || "Okänd";
  const phpVer = env.phpVersion || (state.sysInfo && state.sysInfo["wp-server"] && state.sysInfo["wp-server"].php_version) || "Okänd";
  const server = env.server || (state.sysInfo && state.sysInfo["wp-server"] && state.sysInfo["wp-server"].httpd_software) || "Okänd";
  const theme = env.theme || (state.sysInfo && state.sysInfo["wp-active-theme"] && state.sysInfo["wp-active-theme"].name) || "Okänt";
  const phpMem = env.phpMemoryLimit || (state.sysInfo && state.sysInfo["wp-server"] && state.sysInfo["wp-server"].php_memory_limit) || "Ej uppmätt";
  const wpMem = env.wpMemoryLimit || (state.sysInfo && state.sysInfo["wp-constants"] && state.sysInfo["wp-constants"].WP_MEMORY_LIMIT) || "Ej definierad (WP default: 40M)";
  const wpMaxMem = env.wpMaxMemoryLimit || (state.sysInfo && state.sysInfo["wp-constants"] && state.sysInfo["wp-constants"].WP_MAX_MEMORY_LIMIT) || "Ej definierad (WP default: 256M)";
  const disableCron = env.disableWpCron;
  const plugins = env.activePlugins || [];

  // Helper to normalize measured user value from uploaded settings
  function getMeasuredVal(key, fallback) {
    if (state.uploadedSettings && state.uploadedSettings.hasOwnProperty(key)) {
      const v = state.uploadedSettings[key];
      return isSecretOptionKey(key) ? maskSecretKey(v) : v;
    }
    return fallback;
  }

  let md = `# AreWee-Optimizer: Fullständig Site-Report & Second Opinion (v2.7.2.2)\n\n`;
  md += `**Sajt:** \`${siteUrl}\`\n`;
  md += `**Genererad:** ${new Date().toISOString().replace('T', ' ').substring(0, 19)}\n`;
  md += `**Syfte:** Oberoende granskning (Second Opinion) av WordPress prestanda, stabilitet och säkerhetskonfiguration mot LiteSpeed Cache, WooCommerce, Elementor, Wordfence, SCM, CTM och Aktivt Tema.\n\n`;

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
    if (!analysis.recommendations || !Array.isArray(analysis.recommendations)) return "";
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
          const hasSettings = !!(state.uploadedSettings && Object.keys(state.uploadedSettings).length > 0);
          const hasMeas = state.uploadedSettings && state.uploadedSettings.hasOwnProperty(opt.id);
          comp = {
            currentDisplay: hasMeas ? String(state.uploadedSettings[opt.id]) : (hasSettings ? "Standardvärde (ej modifierad i .data)" : "Ej inläst (Kräver Slot 7)"),
            recommendedDisplay: String(opt.recommendedRaw),
            statusLabel: hasMeas ? "🟢 Optimal" : (hasSettings ? "⚪ LSCWP Standard" : "⚪ Ej uppmätt")
          };
        }

        const descClean = (opt.desc || "").replace(/\|/g, "/");
        let curDisp = comp.currentDisplay;
        let recDisp = comp.recommendedDisplay;
        if (isSecretOptionKey(opt.id)) {
          if (comp.rawMeasured && String(comp.rawMeasured).length > 5) {
            curDisp = maskSecretKey(comp.rawMeasured);
          } else if (typeof curDisp === "string" && curDisp.length > 12 && !curDisp.includes("…") && !/Ansluten|PÅ|AV|Ej /.test(curDisp)) {
            curDisp = maskSecretKey(curDisp);
          }
          if (typeof recDisp === "string" && recDisp.length > 12 && !/policy|maskad|quic|domain|Status/i.test(recDisp)) {
            recDisp = maskSecretKey(recDisp);
          }
        }
        out += `| \`${opt.id}\` (${opt.title}) | ${curDisp} | ${recDisp} | ${comp.statusLabel} | ${descClean} |\n`;
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
  md += renderSettingsSection(["general", "cache", "purge", "page_optimization_css", "page_optimization_js", "page_optimization_media", "image_optimization", "page_optimization_html", "crawler", "tuning"]);
  
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
  let ctmVer = "Ej installerad (eller via tema/kod)";
  if (state.sysInfo && state.sysInfo["wp-plugins-active"]) {
    const ctmKey = Object.keys(state.sysInfo["wp-plugins-active"]).find(k => k.toLowerCase().includes("ctm") || k.toLowerCase().includes("consent"));
    if (ctmKey) ctmVer = state.sysInfo["wp-plugins-active"][ctmKey].version || "Aktiv";
  }
  md += `## 6. 🏷️ CTM (Consent & Tracking Manager)\n`;
  md += `- **Installerad version:** ${ctmVer}\n`;
  md += `- **Status i LiteSpeed JS-exkludering:** ${(String(curJsExc).toLowerCase().includes("ctm") || String(curJsExc).toLowerCase().includes("cookieconsent") || String(curJsExc).toLowerCase().includes("datalayer")) ? "🟢 Fullt exkluderad (GDPR-säkrad)" : "🚨 Saknas i js_exclude"}\n\n`;
  md += renderComponentAlerts("ctm");

  // --- 7. SCM (SITE CODE MANAGER) ---
  let scmVer = state.scmInfo ? (state.scmInfo.version || "Aktiv") : "Ej inläst";
  if (state.sysInfo && state.sysInfo["wp-plugins-active"]) {
    const scmKey = Object.keys(state.sysInfo["wp-plugins-active"]).find(k => k.toLowerCase().includes("scm") || k.toLowerCase().includes("site-code"));
    if (scmKey) scmVer = state.sysInfo["wp-plugins-active"][scmKey].version || "Aktiv";
  }
  md += `## 7. 💻 SCM (Site Code Manager / Server & Kod)\n`;
  md += `- **Installerad version:** ${scmVer}\n`;
  md += `- **Redis Object Cache:** ${env.hasRedis ? (env.isRedisConnected ? "🟢 Redis ansluten och aktiv" : "🟡 Redis installerad men ej ansluten") : "⚪ Ej aktiv (Rekommenderas för Woo/dynamiska sajter)"}\n`;
  md += `- **Anpassad CSS:** ${state.customCss ? `\`\`\`css\n${state.customCss}\n\`\`\`` : "*Ingen anpassad CSS inläst.*"}\n\n`;
  md += renderComponentAlerts("scm");
  md += renderComponentAlerts("server");

  // --- 8. TEMA & MALLAR ---
  md += `## 8. 🎭 Aktivt Tema & Mallar\n`;
  md += `- **Aktivt tema:** ${theme}\n`;
  md += renderComponentAlerts("theme");
  md += renderSettingsSection(["theme_templates"]);

  // --- 9. EXPERTKONSENSUS & KÄLLHÄNVISNINGAR ---
  md += `## 9. 🤝 Konsensus & Källhänvisningar\n\n`;
  md += `Alla rekommendationer baseras på 3-källors enhällig konsensus:\n`;
  md += `1. **LiteSpeed Technologies:** Officiell dokumentation och Advanced Presets.\n`;
  md += `2. **Online Media Masters (Tom Dupuis):** Beprövade riktlinjer för LSCWP + Elementor/WooCommerce.\n`;
  md += `3. **WordPress Core / WooCommerce Handbook:** Officiella standarder för stabilitet och säkerhet.\n\n`;

  md += `---\n*Genererad automatiskt av AreWee WP-Optimizer v2.7.2.2*\n`;

  return md;
}

/**
 * Generates batch Markdown report for all sites in history.
 */
function generateBatchSecondOpinionMarkdown(historyList) {
  if (!historyList || !Array.isArray(historyList) || historyList.length === 0) {
    return "# AreWee-Optimizer: Ingen sparad historik tillgänglig.";
  }

  let md = `# AreWee-Optimizer: Multi-Site Sammanställning (Batch Second Opinion v2.7.2.2)\n\n`;
  md += `**Antal analyserade sajter:** ${historyList.length}\n`;
  md += `**Datum:** ${new Date().toISOString().replace('T', ' ').substring(0, 19)}\n\n`;

  md += `| Sajt / Domän | WP | PHP | Server | Tema | WooCommerce | Elementor | Wordfence | Health Score |\n`;
  md += `| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |\n`;

  historyList.forEach(item => {
    const siteName = (item.siteName || "Okänd").replace(/\|/g, "-");
    const wp = item.wpVersion || "-";
    const php = item.phpVersion || "-";
    const srv = item.server || "-";
    const theme = (item.theme || item.themeName || "-").replace(/\|/g, "-");
    const woo = item.hasWoo ? "Ja" : "Nej";
    const elem = item.hasElem ? "Ja" : "Nej";
    const wf = item.hasWordfence ? "Aktiv" : (item.wfVersion ? `v${item.wfVersion}` : "Nej");
    const score = item.healthScore ? `${item.healthScore}/100` : "-";
    md += `| **${siteName}** | ${wp} | ${php} | ${srv} | ${theme} | ${woo} | ${elem} | ${wf} | ${score} |\n`;
  });

  md += `\n\n---\n\n`;
  md += `*Genererad automatiskt av AreWee WP-Optimizer v2.7.2.2*\n`;

  return md;
}

// Global browser window attachment
if (typeof window !== "undefined") {
  window.maskSecretKey = maskSecretKey;
  window.isSecretOptionKey = isSecretOptionKey;
  window.maskValueIfSecret = maskValueIfSecret;
  window.SECRET_OPTION_IDS = SECRET_OPTION_IDS;
  window.generateSecondOpinionMarkdown = generateSecondOpinionMarkdown;
  window.generateBatchSecondOpinionMarkdown = generateBatchSecondOpinionMarkdown;
  window.KEY_MAPPING_TO_INTERNAL = KEY_MAPPING_TO_INTERNAL;
  window.KEY_MAPPING_TO_LSCWP = KEY_MAPPING_TO_LSCWP;
  window.translateKeysToInternal = translateKeysToInternal;
  window.translateKeysToLscwp = translateKeysToLscwp;
  window.generateSyncPluginPhp = generateSyncPluginPhp;
  window.generateAutoOptimizerSnippet = generateAutoOptimizerSnippet;
  window.generateCodeSnippetsJson = generateCodeSnippetsJson;
  window.parseSettingsFile = parseSettingsFile;
  window.looksLikeLscwpJsonTuples = looksLikeLscwpJsonTuples;
  window.isValidLscwpSettingsObject = isValidLscwpSettingsObject;
  window.php_serialize = php_serialize;
  window.php_deserialize = php_deserialize;
}

// Node.js export support
if (typeof module !== "undefined" && module.exports) {
  module.exports = { 
    maskSecretKey,
    isSecretOptionKey,
    maskValueIfSecret,
    SECRET_OPTION_IDS,
    php_serialize, 
    php_deserialize, 
    parseSettingsFile,
    looksLikeLscwpJsonTuples,
    isValidLscwpSettingsObject,
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
