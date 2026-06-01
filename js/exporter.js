/**
 * LiteSpeed-Helper - Exporter / Serializer
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
        // 'N' already consumed, offset was after 'N', type skip moved past ':' which isn't there for N;
        // Actually, N is usually 'N;' - let's handle it
        offset--; // backtrack the colon skip since Null is just 'N;'
        offset += 2; // skip 'N;'
        return null;
      }
      case 's': { // String: s:4:"test";
        const colon = str.indexOf(':', offset);
        const len = parseInt(str.substring(offset, colon), 10);
        offset = colon + 2; // skip ': "'
        const val = str.substring(offset, offset + len);
        offset += len + 2; // skip string content and '";'
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
 * @returns {Object} Parsed settings object
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
    if (parsed) return parsed;
  }

  // Try JSON
  try {
    return JSON.parse(content);
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
    return fallbackObj;
  }

  throw new Error("Kunde inte tolka inställningsfilen. Kontrollera filformatet.");
}

// Node.js export support
if (typeof module !== "undefined" && module.exports) {
  module.exports = { php_serialize, php_deserialize, parseSettingsFile };
}
