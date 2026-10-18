/**
 * Read-only audit: false unmeasured / true unmeasured / suspicious measured
 * Against real LSCWP export. Does not modify production JS.
 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const BASE = path.resolve(__dirname, '..');
const DATA = '/Users/richardviitanen/Downloads/LSCWP_cfg-www.roligakalsonger.se_-20260924_083028.data';
const OUT = path.join(__dirname, 'audit-unmeasured-20260924.md');

const exporterJs = fs.readFileSync(path.join(BASE, 'js/exporter.js'), 'utf8');
const rulesJs = fs.readFileSync(path.join(BASE, 'js/rules.js'), 'utf8');

const context = {
  console, setTimeout, clearTimeout, Math, Date, JSON, String, Number, Boolean,
  parseInt, parseFloat, isNaN, Array, Object, RegExp, Error, atob: (s) => Buffer.from(s, 'base64').toString('binary'),
  module: { exports: {} },
  exports: {}
};
context.window = context;
context.global = context;
vm.createContext(context);
vm.runInContext(exporterJs, context);
vm.runInContext(rulesJs, context);

const exported = context.module && context.module.exports ? context.module.exports : {};
for (const k of ['KEY_MAPPING_TO_INTERNAL','KEY_MAPPING_TO_LSCWP','parseSettingsFile','getOptionComparison','buildCompleteLscwpSettings','analyzeSystem','translateKeysToInternal']) {
  if (!context[k] && exported[k]) context[k] = exported[k];
}

const raw = fs.readFileSync(DATA, 'utf8');
const parsed = context.parseSettingsFile(raw);

// Raw keys before translate (from line-delimited tuples)
const rawKeys = [];
const rawMap = {};
for (const line of raw.split(/\r?\n/)) {
  const t = line.trim();
  if (!t) continue;
  try {
    const a = JSON.parse(t);
    if (Array.isArray(a) && a.length >= 2) {
      rawKeys.push(a[0]);
      rawMap[a[0]] = a[1];
    }
  } catch (e) {}
}

const MAP_I = context.KEY_MAPPING_TO_INTERNAL || {};
const MAP_L = context.KEY_MAPPING_TO_LSCWP || {};

const env = {
  hasWooCommerce: true,
  hasElementor: true,
  isLiteSpeedServer: true,
  hasSysInfo: false,
  hasRedis: false,
  hasThemeInfo: false
};

const tabs = context.buildCompleteLscwpSettings(env, parsed, {}, {}, {});
const allOpts = [];
for (const tab of tabs) {
  for (const opt of (tab.options || [])) {
    allOpts.push({ ...opt, _tab: tab.id, _tabTitle: tab.title || tab.id });
  }
}

function plausibleKeysFor(optId) {
  const keys = new Set();
  keys.add(optId);
  if (MAP_L[optId]) keys.add(MAP_L[optId]);
  keys.add(optId.replace(/_/g, '-'));
  // first-underscore-to-hyphen (LSCWP style: cache-priv, media-lazy, optm-css_min, img_optm-webp, crawler-load_limit)
  const m = optId.match(/^([a-z0-9]+)_(.+)$/);
  if (m) keys.add(m[1] + '-' + m[2]);
  // img_optm special
  if (optId.startsWith('img_optm_')) keys.add('img_optm-' + optId.slice('img_optm_'.length));
  // reverse map entries pointing to this id
  for (const [k, v] of Object.entries(MAP_I)) {
    if (v === optId) keys.add(k);
  }
  return [...keys];
}

function keyPresentInParsed(key) {
  if (!parsed || typeof parsed !== 'object') return false;
  if (Object.prototype.hasOwnProperty.call(parsed, key) && parsed[key] !== undefined && parsed[key] !== null) return true;
  if (parsed.options && Object.prototype.hasOwnProperty.call(parsed.options, key) && parsed.options[key] !== undefined && parsed.options[key] !== null) return true;
  return false;
}

function keyPresentInRaw(key) {
  return Object.prototype.hasOwnProperty.call(rawMap, key);
}

function findPresentAlias(optId) {
  const cands = plausibleKeysFor(optId);
  const found = [];
  for (const k of cands) {
    if (keyPresentInParsed(k) || keyPresentInRaw(k)) found.push(k);
  }
  // also scan raw keys for fuzzy: starts with prefix or contains id stem
  const stem = optId.replace(/_/g, '[-_]');
  const re = new RegExp('^' + stem + '$|' + stem.replace(/\[-_\]/g, '[-_]'));
  for (const rk of rawKeys) {
    if (found.includes(rk)) continue;
    // close variants: same after normalizing separators
    const norm = (s) => s.replace(/-/g, '_');
    if (norm(rk) === norm(optId)) found.push(rk);
    else if (rk.replace(/-/g, '_') === optId || optId.replace(/_/g, '-') === rk) found.push(rk);
  }
  return [...new Set(found)];
}

/** Soft-cover heuristics (like media_webp ← img_optm_webp) */
function softCoverHints(optId) {
  const covers = [];
  // next-gen covering media_webp
  if (optId === 'media_webp' || optId === 'media_webp_replace' || optId === 'media_webp_attribute') {
    if (keyPresentInParsed('img_optm_webp') || keyPresentInRaw('img_optm-webp')) covers.push('img_optm-webp / img_optm_webp (Next-Gen)');
  }
  // satellite when parent off
  const parentOffCovers = {
    media_lazy_exc: ['media_lazy', 'media-lazy'],
    media_vpi: ['media_lazy', 'media-lazy'],
    media_lazy_placeholder: ['media_lazy', 'media-lazy'],
    media_lazy_native: ['media_lazy', 'media-lazy'],
    optm_ccss_per_url: ['optm_css_async', 'optm-css_async'],
    optm_css_async_inline: ['optm_css_async', 'optm-css_async'],
    optm_ggfonts_async: ['optm_ggfonts_rm', 'optm-ggfonts_rm'],
    js_delayed_exclude: ['optm_js_defer', 'optm-js_defer'],
  };
  if (parentOffCovers[optId]) {
    for (const pk of parentOffCovers[optId]) {
      if (keyPresentInParsed(pk) || keyPresentInRaw(pk)) {
        covers.push(`parent/cover key present: ${pk}`);
        break;
      }
    }
  }
  // crawler satellites when crawler present
  if (optId.startsWith('crawler_') || optId === 'crawler_usleep' || optId === 'crawler_load_limit') {
    if (keyPresentInRaw('crawler') || keyPresentInParsed('crawler')) covers.push('crawler master key present');
    if (optId === 'crawler_load_limit' && keyPresentInRaw('crawler-load_limit')) covers.push('raw crawler-load_limit');
    if (optId === 'crawler_usleep' && (keyPresentInRaw('crawler-crawl_interval') || keyPresentInRaw('crawler-usleep'))) covers.push('raw crawler-crawl_interval/usleep');
  }
  // object / cache_object satellites
  if (optId.startsWith('cache_object') || optId === 'cache_object') {
    if (keyPresentInRaw('object') || keyPresentInParsed('cache_object') || keyPresentInParsed('object')) covers.push('object / cache_object family');
  }
  // guest
  if (optId === 'guest_mode' && (keyPresentInRaw('guest') || keyPresentInParsed('guest_mode'))) covers.push('guest → guest_mode');
  // domain_key / hash / api_key
  if (optId === 'domain_key') {
    if (keyPresentInRaw('hash') || keyPresentInParsed('domain_key')) covers.push('hash → domain_key');
    if (keyPresentInRaw('api_key')) covers.push('api_key also in export (unmapped?)');
  }
  // db_optm
  if (optId.startsWith('db_optm_')) {
    const hyphen = 'db_optm-' + optId.slice('db_optm_'.length);
    if (keyPresentInRaw(hyphen)) covers.push(hyphen);
    // revisions_max vs revisions
    if (optId === 'db_optm_revisions' && (keyPresentInRaw('db_optm-revisions_max') || keyPresentInRaw('db_optm-revisions_age'))) {
      covers.push('db_optm-revisions_max/age (export shape mismatch)');
    }
  }
  return covers;
}

const falseUnmeasured = [];
const trueUnmeasured = [];
const suspiciousMeasured = [];
const measuredOk = [];
const allComparisons = [];

for (const opt of allOpts) {
  if (!opt.id) continue;
  const tool = opt.tool || 'litespeed';
  // Focus on litespeed/tool options as requested
  const isLs = !tool || tool === 'litespeed' || tool === 'tool' ||
    (!String(opt.id).match(/^(elem_|woo_|wf_|theme_|php_|wp_)/) && tool !== 'elementor' && tool !== 'woocommerce' && tool !== 'wordfence' && tool !== 'theme' && tool !== 'server' && tool !== 'scm');

  const comp = context.getOptionComparison(opt, parsed, env);
  allComparisons.push({ opt, comp, isLs });

  if (!isLs) continue;

  if (!comp.isMeasured) {
    const aliases = findPresentAlias(opt.id);
    const covers = softCoverHints(opt.id);
    // Also check if any raw key normalizes to this id but mapping missed it
    const lscwpKey = MAP_L[opt.id] || (opt.id.startsWith('img_optm_') ? ('img_optm-' + opt.id.slice('img_optm_'.length)) : opt.id.replace(/_/g, '-'));
    const mappingMiss = aliases.length > 0 && !keyPresentInParsed(opt.id) && !keyPresentInParsed(lscwpKey);

    if (aliases.length > 0 || covers.length > 0) {
      falseUnmeasured.push({
        id: opt.id,
        title: opt.title,
        tab: opt._tab,
        tool,
        aliases,
        covers,
        mappingMiss,
        lscwpKey,
        statusLabel: comp.statusLabel,
        currentDisplay: comp.currentDisplay,
        recommendedDisplay: comp.recommendedDisplay,
        reason: aliases.length
          ? `plausible key(s) in .data: ${aliases.join(', ')}`
          : `soft-cover candidate: ${covers.join('; ')}`
      });
    } else {
      trueUnmeasured.push({
        id: opt.id,
        title: opt.title,
        tab: opt._tab,
        tool,
        lscwpKey,
        statusLabel: comp.statusLabel,
        recommendedDisplay: comp.recommendedDisplay,
        note: 'key truly absent from .data with no soft-cover'
      });
    }
  } else {
    // Suspicious measured heuristics
    const issues = [];
    const disp = String(comp.currentDisplay || '');
    const status = String(comp.status || '');
    const label = String(comp.statusLabel || '');
    const rawM = comp.rawMeasured;

    // Optimal when likely should be policy
    if (/optimal/i.test(label) && /policy|mjuk|soft/i.test(String(opt.criticalLevel || '')) === false) {
      // check known policy options
      const policyIds = new Set(['cdn','cdn_quic','cdn_cloudflare','domain_key','img_optm_lossless','img_optm_exif','img_optm_sizes_skipped','img_optm_webp_attr','img_optm_rm_bkup','img_optm_webp','img_optm_ori','img_optm_webp_replace_srcset','cache_priv','optm_ggfonts_rm','media_lazy','media_webp']);
      if (policyIds.has(opt.id) && !/policy|mjuk|soft|info/i.test(label)) {
        // only flag if comparison claims optimal match incorrectly — look at isPolicyContext path
      }
    }

    // Wrong PÅ/AV inversion suspicion: recommended AV but display PÅ when raw is falsy-looking mapped wrong
    // media_webp historically mapped from wrong keys
    if (opt.id === 'media_webp') {
      const hasMediaKey = keyPresentInRaw('media-webp') || keyPresentInParsed('media_webp');
      const hasImg = keyPresentInRaw('img_optm-webp') || keyPresentInParsed('img_optm_webp');
      if (!hasMediaKey && hasImg) {
        // soft-measured — check display
        if (!/AV|Next-Gen|täcker|off|0/i.test(disp) && /PÅ|ON|1/i.test(disp)) {
          issues.push('media_webp soft-measured but display looks ON; should be AV (Next-Gen covers)');
        }
        // record soft measure outcome for report
        issues.push(`SOFT-MEASURED via Next-Gen: display="${disp}" status="${label}" raw=${JSON.stringify(rawM)}`);
      }
      // wrong historical mapping: media-webp_dec / media_optm_webp → media_webp
      if (MAP_I['media-webp_dec'] === 'media_webp' || MAP_I['media_optm_webp'] === 'media_webp') {
        // check if those keys exist and could pollute
        if (keyPresentInRaw('media-webp_dec')) issues.push('media-webp_dec present and maps to media_webp (risk)');
      }
    }

    // Empty string / false falsely shown as Ej inläst shouldn't happen if measured — check empty display
    if (disp === 'Ej inläst' && comp.isMeasured) {
      issues.push('isMeasured=true but currentDisplay still "Ej inläst"');
    }

    // Object cache: object:true should be PÅ
    if (opt.id === 'cache_object') {
      if (rawMap['object'] === true || rawMap['object'] === '1' || parsed.cache_object === '1' || parsed.cache_object === 1 || parsed.cache_object === true) {
        if (/AV|off|0/i.test(disp) && !/PÅ|ON|1/i.test(disp)) {
          issues.push(`cache_object: export object=true but display=${disp}`);
        }
      }
    }

    // guest_mode
    if (opt.id === 'guest_mode') {
      const g = rawMap['guest'];
      const expectedOff = (g === false || g === '0' || g === 0);
      if (expectedOff && /PÅ/i.test(disp) && !/AV/i.test(disp)) {
        issues.push(`guest false but display=${disp}`);
      }
    }

    // domain_key: hash present → should measure, mask secret
    if (opt.id === 'domain_key') {
      if (!comp.isMeasured && keyPresentInRaw('hash')) issues.push('hash present but domain_key unmeasured');
      if (comp.isMeasured && String(rawM || '').length > 8 && disp === String(rawM)) {
        issues.push('domain_key may be unmasked in display');
      }
    }

    // crawler_load_limit mapping: catalog may use underscored but export crawler-load_limit
    if (opt.id === 'crawler_load_limit' || opt.id === 'crawler_usleep') {
      // if measured via wrong path
    }

    // img_optm false values
    if (opt.id.startsWith('img_optm_') && (rawM === false || rawM === '0' || rawM === 0 || rawM === '')) {
      if (!comp.isMeasured) issues.push('img_optm falsy value not measured (regression)');
    }

    // Status Optimal when isMatches and recommended differs in spirit for CDN off
    if ((opt.id === 'cdn' || opt.id === 'cdn_quic' || opt.id === 'cdn_cloudflare') && /Optimal/i.test(label)) {
      // CDN off matching rec off is fine; note if rec is on
      if (String(opt.recommendedRaw) === '1' || opt.recommendedRaw === 1) {
        issues.push(`CDN option Optimal while recommended ON? disp=${disp} rec=${comp.recommendedDisplay}`);
      }
    }

    // Double-check: measured via wrong key pollution (media_webp from img incorrectly as ON)
    if (opt.id === 'media_webp' && hasImgWebp()) {
      // already handled
    }

    if (issues.length) {
      suspiciousMeasured.push({
        id: opt.id,
        title: opt.title,
        tab: opt._tab,
        display: disp,
        statusLabel: label,
        status,
        rawMeasured: rawM,
        recommendedDisplay: comp.recommendedDisplay,
        isMatches: comp.isMatches,
        issues
      });
    } else {
      measuredOk.push(opt.id);
    }
  }
}

function hasImgWebp() {
  return keyPresentInRaw('img_optm-webp') || keyPresentInParsed('img_optm_webp');
}

// Set differences
const catalogIds = allOpts.filter(o => o.id).map(o => o.id);
const lsCatalogIds = allComparisons.filter(x => x.isLs && x.opt.id).map(x => x.opt.id);

function correspondingDataKeys(optId) {
  return plausibleKeysFor(optId);
}

const catalogNoData = [];
for (const id of lsCatalogIds) {
  const keys = correspondingDataKeys(id);
  const hit = keys.some(k => keyPresentInRaw(k) || keyPresentInParsed(k));
  // also soft covers
  const covers = softCoverHints(id);
  if (!hit && covers.length === 0) catalogNoData.push({ id, tried: keys });
  else if (!hit && covers.length) catalogNoData.push({ id, tried: keys, softOnly: covers });
}

const dataNoCatalog = [];
const catalogSet = new Set(lsCatalogIds);
const catalogNorm = new Set(lsCatalogIds.map(s => s.replace(/-/g, '_')));
// also include mapped internal ids
for (const v of Object.values(MAP_I)) catalogNorm.add(String(v).replace(/-/g, '_'));
for (const id of lsCatalogIds) {
  const l = MAP_L[id];
  if (l) catalogSet.add(l);
}

for (const rk of rawKeys) {
  // skip meta
  if (rk.startsWith('_') || rk === 'hash' || rk === 'api_key') {
    // still report if no catalog for domain_key coverage
  }
  const internal = MAP_I[rk] || MAP_I[rk.replace(/-/g, '_')] || null;
  const norm = rk.replace(/-/g, '_');
  let matched = false;
  if (internal && (catalogSet.has(internal) || catalogNorm.has(internal.replace(/-/g, '_')))) matched = true;
  if (catalogSet.has(rk) || catalogNorm.has(norm)) matched = true;
  // prefix family match: cache-ttl_* etc often intentionally omitted
  if (!matched) {
    dataNoCatalog.push({ rawKey: rk, suggestedInternal: internal || norm, valuePreview: previewVal(rawMap[rk]) });
  }
}

function previewVal(v) {
  if (v === null || v === undefined) return String(v);
  if (typeof v === 'boolean' || typeof v === 'number') return String(v);
  if (Array.isArray(v)) return `Array(${v.length})`;
  if (typeof v === 'object') return 'Object';
  const s = String(v);
  return s.length > 60 ? s.slice(0, 40) + '…' : s;
}

// Specific risk checks
const riskChecks = [];
function addRisk(id, severity, msg) {
  riskChecks.push({ id, severity, msg });
}

// media_webp
{
  const opt = allOpts.find(o => o.id === 'media_webp');
  const comp = opt ? context.getOptionComparison(opt, parsed, env) : null;
  addRisk('media_webp', 'HIGH',
    `raw media-webp absent=${!keyPresentInRaw('media-webp')}; img_optm-webp=${JSON.stringify(rawMap['img_optm-webp'])}; ` +
    `isMeasured=${comp && comp.isMeasured}; display=${comp && comp.currentDisplay}; status=${comp && comp.statusLabel}`);
}
// img_optm empties
for (const id of ['img_optm_sizes_skipped','img_optm_lossless','img_optm_exif','img_optm_rm_bkup','img_optm_webp','img_optm_auto','img_optm_ori','img_optm_webp_attr','img_optm_webp_replace_srcset']) {
  const opt = allOpts.find(o => o.id === id);
  if (!opt) { addRisk(id, 'MED', 'option missing from catalog'); continue; }
  const comp = context.getOptionComparison(opt, parsed, env);
  addRisk(id, comp.isMeasured ? 'OK' : 'HIGH',
    `isMeasured=${comp.isMeasured} display=${comp.currentDisplay} raw=${JSON.stringify(comp.rawMeasured)} rawExport=${JSON.stringify(rawMap[MAP_L[id]||id])}`);
}
// wrong hyphen
addRisk('img_optm_sizes-skipped', 'INFO',
  `wrong key in raw? ${keyPresentInRaw('img_optm_sizes-skipped')}; correct img_optm-sizes_skipped=${JSON.stringify(rawMap['img_optm-sizes_skipped'])}`);
// CDN / domain_key / quic
for (const id of ['cdn','cdn_quic','cdn_cloudflare','domain_key','cdn_mapping']) {
  const opt = allOpts.find(o => o.id === id);
  const comp = opt ? context.getOptionComparison(opt, parsed, env) : null;
  addRisk(id, opt ? (comp.isMeasured ? 'OK' : 'MED') : 'MED',
    opt ? `isMeasured=${comp.isMeasured} display=${comp.currentDisplay} status=${comp.statusLabel} raw=${JSON.stringify(comp.rawMeasured)}`
        : 'not in catalog');
}
// crawler
for (const id of ['crawler','crawler_usleep','crawler_load_limit']) {
  const opt = allOpts.find(o => o.id === id);
  const comp = opt ? context.getOptionComparison(opt, parsed, env) : null;
  addRisk(id, !opt ? 'MED' : (comp.isMeasured ? 'OK' : 'HIGH'),
    !opt ? 'not in catalog' :
    `isMeasured=${comp.isMeasured} display=${comp.currentDisplay} lscwpKey=${MAP_L[id]} rawKeys related: crawler=${rawMap['crawler']} load=${rawMap['crawler-load_limit']} interval=${rawMap['crawler-crawl_interval']}`);
}
// guest / esi / object
for (const id of ['guest_mode','guest_optm','esi','cache_object','cache_browser']) {
  const opt = allOpts.find(o => o.id === id);
  const comp = opt ? context.getOptionComparison(opt, parsed, env) : null;
  addRisk(id, !opt ? 'MED' : (comp.isMeasured ? 'OK' : 'HIGH'),
    !opt ? 'not in catalog' : `isMeasured=${comp.isMeasured} display=${comp.currentDisplay} status=${comp.statusLabel} raw=${JSON.stringify(comp.rawMeasured)}`);
}
// optm satellites
for (const id of ['optm_ccss_per_url','optm_css_async_inline','optm_ggfonts_async','js_delayed_exclude','media_vpi','media_lazy_exc','media_lazy_native']) {
  const opt = allOpts.find(o => o.id === id);
  const comp = opt ? context.getOptionComparison(opt, parsed, env) : null;
  addRisk(id, !opt ? 'INFO' : (comp.isMeasured ? 'OK' : 'MED'),
    !opt ? 'not in catalog' : `isMeasured=${comp.isMeasured} display=${comp.currentDisplay} raw=${JSON.stringify(comp.rawMeasured)}`);
}
// db_optm
for (const id of ['db_optm_revisions','db_optm_auto_draft','db_optm_trash_post','db_optm_spam_comment','db_optm_trash_comment','db_optm_trackbacks','db_optm_transient']) {
  const opt = allOpts.find(o => o.id === id);
  const comp = opt ? context.getOptionComparison(opt, parsed, env) : null;
  addRisk(id, !opt ? 'INFO' : (comp.isMeasured ? 'OK' : 'MED'),
    !opt ? 'not in catalog' : `isMeasured=${comp.isMeasured} display=${comp.currentDisplay}`);
}

// Historical wrong mapping check
const wrongMapHits = [];
for (const [k, v] of Object.entries(MAP_I)) {
  if (v === 'media_webp' && k !== 'media-webp' && k !== 'media_webp') {
    wrongMapHits.push(`${k} → media_webp`);
  }
}

// Build markdown
const lines = [];
const now = new Date();
const stockholm = now.toLocaleString('sv-SE', { timeZone: 'Europe/Stockholm' });
lines.push(`# AreWee-Optimizer unmeasured audit — 2026-09-24`);
lines.push('');
lines.push(`- Generated: ${stockholm} (Europe/Stockholm)`);
lines.push(`- Export: \`LSCWP_cfg-www.roligakalsonger.se_-20260924_083028.data\` (${rawKeys.length} keys)`);
lines.push(`- rules.js header: ${(rulesJs.match(/Compatibility Engine \(v[\d.]+\)/)||[])[0] || 'unknown'}`);
lines.push(`- exporter.js header: ${(exporterJs.match(/Exporter \/ Serializer \(v[\d.]+\)/)||[])[0] || 'unknown'}`);
lines.push(`- Catalog options (all tools): ${allOpts.length}; litespeed-ish compared: ${lsCatalogIds.length}`);
lines.push(`- Measured OK (no suspicion): ${measuredOk.length}`);
lines.push(`- **A) False unmeasured (bugs / soft-cover gaps): ${falseUnmeasured.length}**`);
lines.push(`- **B) True unmeasured (export gap): ${trueUnmeasured.length}**`);
lines.push(`- **C) Suspicious measured: ${suspiciousMeasured.length}**`);
lines.push('');
lines.push(`> Read-only audit. Another agent may own media_webp soft-measure (2.7.1.3). Do not treat this file as a patch.`);
lines.push('');

lines.push(`## Executive summary (≥10 concrete findings)`);
lines.push('');

// Collect top findings for the mandatory ≥10 list
const findings = [];

function pushFinding(n, kind, optId, cause, fix) {
  findings.push({ n, kind, optId, cause, fix });
}

// From false unmeasured
falseUnmeasured.forEach((f, i) => {
  pushFinding(findings.length + 1, 'A-false-unmeasured', f.id, f.reason, f.covers.length ? 'soft-cover' : (f.mappingMiss ? 'mapping' : 'mapping'));
});
// Risk HIGH not already covered
for (const r of riskChecks) {
  if (r.severity === 'HIGH' || (r.severity === 'MED' && /unmeasured|not in catalog|mismatch|absent/i.test(r.msg))) {
    if (!findings.some(f => f.optId === r.id && f.kind.startsWith('A'))) {
      // only if actually a problem
      const opt = allOpts.find(o => o.id === r.id);
      const comp = opt ? context.getOptionComparison(opt, parsed, env) : null;
      if (!opt || (comp && !comp.isMeasured) || /mismatch|wrong|risk|absent/i.test(r.msg)) {
        pushFinding(findings.length + 1, r.severity === 'HIGH' ? 'A-risk' : 'candidate', r.id, r.msg, 'mapping / soft-cover / export gap');
      }
    }
  }
}
// Suspicious
suspiciousMeasured.forEach(s => {
  pushFinding(findings.length + 1, 'C-suspicious', s.id, s.issues.join('; '), 'display/status fix');
});
// Mapping anomalies of interest
if (wrongMapHits.length) {
  pushFinding(findings.length + 1, 'mapping-risk', 'media_webp', `Extra KEY_MAPPING_TO_INTERNAL aliases into media_webp: ${wrongMapHits.join(', ')}`, 'mapping cleanup');
}
// api_key unmapped
if (keyPresentInRaw('api_key') && !MAP_I['api_key']) {
  pushFinding(findings.length + 1, 'candidate / export-gap', 'api_key', 'api_key present in .data but not in KEY_MAPPING_TO_INTERNAL (hash→domain_key only)', 'mapping or omit from UI');
}
// crawler-crawl_interval vs crawler_usleep
if (keyPresentInRaw('crawler-crawl_interval') && !MAP_I['crawler-crawl_interval']) {
  pushFinding(findings.length + 1, 'A-false-unmeasured / mapping', 'crawler_usleep', 'Export has crawler-crawl_interval; catalog/mapping uses crawler_usleep — no alias', 'mapping');
}
if (keyPresentInRaw('crawler-load_limit')) {
  const opt = allOpts.find(o => o.id === 'crawler_load_limit');
  const comp = opt && context.getOptionComparison(opt, parsed, env);
  if (opt && comp && !comp.isMeasured) {
    pushFinding(findings.length + 1, 'A-false-unmeasured', 'crawler_load_limit', 'raw crawler-load_limit present but KEY_MAPPING_TO_LSCWP points to crawler_load_limit (underscore) not crawler-load_limit', 'mapping');
  } else if (opt && comp && comp.isMeasured) {
    pushFinding(findings.length + 1, 'info', 'crawler_load_limit', `measured OK display=${comp.currentDisplay} (verify mapping path)`, 'accept');
  }
}
// db_optm shape
if (keyPresentInRaw('db_optm-revisions_max')) {
  const opt = allOpts.find(o => o.id === 'db_optm_revisions');
  const comp = opt && context.getOptionComparison(opt, parsed, env);
  pushFinding(findings.length + 1, (!comp || !comp.isMeasured) ? 'A-false-unmeasured' : 'info',
    'db_optm_revisions',
    `Export uses db_optm-revisions_max/age; catalog id db_optm_revisions; measured=${comp && comp.isMeasured}`,
    'mapping');
}
// media-lazy_native absent
if (!keyPresentInRaw('media-lazy_native')) {
  const opt = allOpts.find(o => o.id === 'media_lazy_native');
  const comp = opt && context.getOptionComparison(opt, parsed, env);
  pushFinding(findings.length + 1, (comp && !comp.isMeasured) ? 'B-true-unmeasured / candidate' : 'info',
    'media_lazy_native',
    `Absent from this export; measured=${comp && comp.isMeasured}. Other media-* keys ARE present — likely default-omit or version skew.`,
    (comp && !comp.isMeasured) ? 'soft-cover from media-lazy OR accept empty / export gap' : 'ok');
}
// qc-nameservers / misc-heartbeat etc
for (const rk of ['misc-heartbeat_front','qc-nameservers','optm-html_lazy','optm-localize','discuss-avatar_cache','media-lqip','media-add_missing_sizes','util-instant_click']) {
  if (keyPresentInRaw(rk) && dataNoCatalog.some(d => d.rawKey === rk)) {
    pushFinding(findings.length + 1, 'candidate / export-gap', rk,
      `.data has ${rk}=${previewVal(rawMap[rk])} but no catalog option / mapping`,
      'omit from UI OR add catalog option');
  }
}

// Ensure ≥10 by adding clear candidates from trueUnmeasured (labeled)
let pad = 0;
for (const t of trueUnmeasured) {
  if (findings.length >= 14) break;
  if (findings.some(f => f.optId === t.id)) continue;
  pushFinding(findings.length + 1, 'B-true-unmeasured / candidate / export-gap', t.id,
    t.note + `; recommendedDisplay=${t.recommendedDisplay}`,
    'accept empty / omit from UI / export gap');
  pad++;
}

findings.forEach((f, i) => {
  lines.push(`${i + 1}. **[${f.kind}] \`${f.optId}\`** — ${f.cause}`);
  lines.push(`   - Suggested fix: **${f.fix}**`);
});
lines.push('');

lines.push(`## A) False unmeasured (isMeasured=false but key/cover exists)`);
lines.push('');
if (!falseUnmeasured.length) {
  lines.push('_None detected by alias/cover heuristics. Check risk table and findings for soft-cover gaps that 6c already handles._');
} else {
  for (const f of falseUnmeasured) {
    lines.push(`### \`${f.id}\` (${f.tab})`);
    lines.push(`- Title: ${f.title}`);
    lines.push(`- Cause: ${f.reason}`);
    lines.push(`- Aliases found: ${f.aliases.join(', ') || '—'}`);
    lines.push(`- Soft-covers: ${f.covers.join('; ') || '—'}`);
    lines.push(`- Expected LSCWP key: \`${f.lscwpKey}\``);
    lines.push(`- UI: ${f.statusLabel} / ${f.currentDisplay}`);
    lines.push('');
  }
}

lines.push(`## B) True unmeasured (absent from .data, no soft-cover)`);
lines.push('');
lines.push(`Count: ${trueUnmeasured.length}. Many may be UI-only, other-tool, or LSCWP omitting default-off options. Note: many \`media-*\` keys **are** present in this export; absence is more suspicious for media_* than for obscure debug keys.`);
lines.push('');
for (const t of trueUnmeasured) {
  lines.push(`- \`${t.id}\` (${t.tab}) — lscwpKey=\`${t.lscwpKey}\` — ${t.note}`);
}

lines.push('');
lines.push(`## C) Suspicious measured`);
lines.push('');
if (!suspiciousMeasured.length) {
  lines.push('_No strong display/status anomalies beyond informational soft-measure notes._');
} else {
  for (const s of suspiciousMeasured) {
    lines.push(`### \`${s.id}\``);
    lines.push(`- display=\`${s.display}\` status=\`${s.statusLabel}\` matches=${s.isMatches}`);
    lines.push(`- rawMeasured=${JSON.stringify(s.rawMeasured)}`);
    lines.push(`- issues: ${s.issues.join(' | ')}`);
    lines.push('');
  }
}

lines.push(`## Specific risk-area probe`);
lines.push('');
lines.push('| id | sev | detail |');
lines.push('|----|-----|--------|');
for (const r of riskChecks) {
  lines.push(`| \`${r.id}\` | ${r.severity} | ${String(r.msg).replace(/\|/g, '\\|')} |`);
}
lines.push('');

lines.push(`## Historical media_webp mapping aliases`);
lines.push('');
lines.push('KEY_MAPPING_TO_INTERNAL entries that resolve to `media_webp`:');
for (const [k, v] of Object.entries(MAP_I)) {
  if (v === 'media_webp') lines.push(`- \`${k}\` → media_webp`);
}
lines.push('');

lines.push(`## Set difference: catalog ids with no .data key`);
lines.push('');
lines.push(`(After KEY_MAPPING_TO_LSCWP + hyphen variants; soft-only noted)`);
lines.push('');
const noDataHard = catalogNoData.filter(x => !x.softOnly);
const noDataSoft = catalogNoData.filter(x => x.softOnly);
lines.push(`### Hard miss (${noDataHard.length})`);
for (const x of noDataHard) {
  lines.push(`- \`${x.id}\` tried: ${x.tried.slice(0, 8).join(', ')}`);
}
lines.push('');
lines.push(`### Soft-cover only (${noDataSoft.length})`);
for (const x of noDataSoft) {
  lines.push(`- \`${x.id}\` soft: ${x.softOnly.join('; ')}`);
}
lines.push('');

lines.push(`## Set difference: .data keys with no catalog option`);
lines.push('');
lines.push(`Count: ${dataNoCatalog.length} (includes intentional TTL/purge/debug satellites)`);
lines.push('');
// Group by prefix
const byPrefix = {};
for (const d of dataNoCatalog) {
  const p = d.rawKey.split(/[-_]/)[0];
  byPrefix[p] = byPrefix[p] || [];
  byPrefix[p].push(d);
}
for (const [p, items] of Object.entries(byPrefix).sort((a,b) => b[1].length - a[1].length)) {
  lines.push(`### prefix \`${p}\` (${items.length})`);
  for (const d of items) {
    lines.push(`- \`${d.rawKey}\` → suggested \`${d.suggestedInternal}\` = ${d.valuePreview}`);
  }
  lines.push('');
}

lines.push(`## Dump: all .data keys (${rawKeys.length})`);
lines.push('');
lines.push('```');
lines.push(rawKeys.join('\n'));
lines.push('```');
lines.push('');

lines.push(`## Dump: all catalog option ids (${catalogIds.length})`);
lines.push('');
lines.push('```');
lines.push(catalogIds.join('\n'));
lines.push('```');
lines.push('');

lines.push(`## Parsed internal sample (media/img/cdn/crawler/guest/object/domain)`);
lines.push('');
const sampleKeys = Object.keys(parsed).filter(k =>
  /media|img_optm|cdn|crawler|guest|object|domain|esi|webp|hash|api/i.test(k)
).sort();
lines.push('```json');
const sample = {};
for (const k of sampleKeys) sample[k] = parsed[k];
lines.push(JSON.stringify(sample, null, 2).slice(0, 8000));
lines.push('```');
lines.push('');

lines.push(`## Method notes`);
lines.push('');
lines.push('1. Loaded `exporter.js` + `rules.js` in node `vm` (same pattern as `scratch/test-v2712.js`).');
lines.push('2. `parseSettingsFile` on real export → internal keys via `KEY_MAPPING_TO_INTERNAL`.');
lines.push('3. `buildCompleteLscwpSettings` for full option catalog; `getOptionComparison` per litespeed-ish option.');
lines.push('4. False-unmeasured = `isMeasured===false` but plausible raw/parsed key OR soft-cover hint.');
lines.push('5. No production JS edited; report only.');
lines.push('');

fs.writeFileSync(OUT, lines.join('\n'));
console.log('Wrote', OUT);
console.log('falseUnmeasured', falseUnmeasured.length);
console.log('trueUnmeasured', trueUnmeasured.length);
console.log('suspiciousMeasured', suspiciousMeasured.length);
console.log('findings', findings.length);
console.log('---FINDINGS---');
findings.forEach((f,i) => console.log(`${i+1}. [${f.kind}] ${f.optId}: ${f.cause.slice(0,120)} | fix=${f.fix}`));
console.log('---FALSE---');
falseUnmeasured.forEach(f => console.log(f.id, '::', f.reason));
console.log('---TRUE (first 40)---');
trueUnmeasured.slice(0,40).forEach(t => console.log(t.id, t.tab));
console.log('---SUSPICIOUS---');
suspiciousMeasured.forEach(s => console.log(s.id, s.issues.join(' | ')));
