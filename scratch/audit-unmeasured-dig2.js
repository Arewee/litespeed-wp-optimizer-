const fs = require('fs');
const path = require('path');
const vm = require('vm');
const BASE = path.resolve(__dirname, '..');
const DATA = '/Users/richardviitanen/Downloads/LSCWP_cfg-www.roligakalsonger.se_-20260924_083028.data';
const exporterJs = fs.readFileSync(path.join(BASE, 'js/exporter.js'), 'utf8');
const rulesJs = fs.readFileSync(path.join(BASE, 'js/rules.js'), 'utf8');
const context = {
  console, Math, Date, JSON, String, Number, Boolean, parseInt, parseFloat, isNaN,
  Array, Object, RegExp, Error,
  atob: (s) => Buffer.from(s, 'base64').toString('binary'),
  module: { exports: {} }, exports: {}
};
context.window = context; context.global = context;
vm.createContext(context);
vm.runInContext(exporterJs, context);
vm.runInContext(rulesJs, context);
const ex = context.module.exports || {};
for (const k of Object.keys(ex)) if (!context[k]) context[k] = ex[k];

const raw = fs.readFileSync(DATA, 'utf8');
const parsed = context.parseSettingsFile(raw);
const MAP_L = context.KEY_MAPPING_TO_LSCWP;
const MAP_I = context.KEY_MAPPING_TO_INTERNAL;

const rawMap = {};
for (const line of raw.split(/\n/)) {
  const t = line.trim(); if (!t) continue;
  try { const a = JSON.parse(t); if (Array.isArray(a) && a.length >= 2) rawMap[a[0]] = a[1]; } catch (e) {}
}
const rawKeys = new Set(Object.keys(rawMap));

const env = { hasWooCommerce: true, hasElementor: true, isLiteSpeedServer: true };
const tabs = context.buildCompleteLscwpSettings(env, parsed, {}, {}, {});
const ls = [];
for (const t of tabs) for (const o of (t.options || [])) {
  if (!o.tool || o.tool === 'litespeed') ls.push({ ...o, tab: t.id });
}

console.log('=== ROUND-TRIP (LS catalog) ===');
for (const opt of ls) {
  const writeKey = MAP_L[opt.id] || opt.id.replace(/_/g, '-');
  const readKeys = Object.entries(MAP_I).filter(([, v]) => v === opt.id).map(([k]) => k);
  const rawHits = [...rawKeys].filter(k => readKeys.includes(k) || k === writeKey || k === opt.id);
  const writeInRaw = rawKeys.has(writeKey);
  if (!writeInRaw && rawHits.length) {
    console.log(`DRIFT ${opt.id}: WRITE "${writeKey}" but export has [${rawHits.join(', ')}]`);
  } else if (!writeInRaw && !rawHits.length) {
    const c = context.getOptionComparison(opt, parsed, env);
    console.log(`NO-RAW ${opt.id}: writeKey=${writeKey} measured=${c.isMeasured} disp=${c.currentDisplay}`);
  }
}

console.log('\n=== PROBES ===');
const probes = [
  ['optm_font_display', ['optm-font_display', 'optm-css_font_display']],
  ['optm_emojis_rm', ['optm-emojis_rm', 'optm-emoji_rm']],
  ['crawler_usleep', ['crawler_usleep', 'crawler-usleep', 'crawler-crawl_interval']],
  ['crawler_load_limit', ['crawler_load_limit', 'crawler-load_limit']],
  ['cache_object', ['cache-object', 'object']],
  ['guest_mode', ['guest', 'guest_mode']],
  ['domain_key', ['domain_key', 'hash', 'api_key']],
  ['media_webp', ['media-webp', 'media_webp']],
  ['js_delayed_exclude', ['optm-js_delayed_exc', 'optm-js_delay_exc']],
];
for (const [id, keys] of probes) {
  console.log(id, 'MAP_L=' + MAP_L[id], '|', keys.map(k => k + '=' + (rawKeys.has(k) ? JSON.stringify(rawMap[k]).slice(0, 48) : 'ABSENT')).join(' | '));
}

console.log('\n=== crawler_usleep scenarios ===');
const cu = ls.find(o => o.id === 'crawler_usleep');
for (const [label, up] of [
  ['real', parsed],
  ['crawler-usleep:0', { 'crawler-usleep': 0 }],
  ['crawler_usleep:0', { crawler_usleep: 0 }],
  ['crawler-crawl_interval:302400', { 'crawler-crawl_interval': 302400 }],
  ['crawler-load_limit:1', { 'crawler-load_limit': 1 }],
]) {
  const c = context.getOptionComparison(cu, up, {});
  console.log(label, 'measured=' + c.isMeasured, 'disp=' + c.currentDisplay);
}

console.log('\n=== LATENT all-hyphen fallback ===');
// optm_css_min has MAP; demonstrate naive replace would fail for mixed keys if map missing
const cssMin = ls.find(o => o.id === 'optm_css_min');
console.log('with only optm-css-min (wrong):', context.getOptionComparison(cssMin, { 'optm-css-min': '1' }, {}).isMeasured);
console.log('with only optm-css_min (correct):', context.getOptionComparison(cssMin, { 'optm-css_min': '1' }, {}).isMeasured);
// If MAP_L missing, lscwpKey = id.replace(/_/g,'-') => optm-css-min (WRONG for LSCWP)

console.log('\n=== catalog gaps for present raw keys ===');
const interesting = [
  'crawler-load_limit','crawler-crawl_interval','crawler-sitemap','crawler-roles','crawler-cookies',
  'db_optm-revisions_max','db_optm-revisions_age',
  'media-lazy_native','media-lqip','media-add_missing_sizes','media-iframe_lazy','media-auto_rescale_ori',
  'img_optm-jpg_quality','cdn-mapping','cdn-ori','cdn-attr',
  'api_key','misc-heartbeat_front','optm-html_lazy','optm-localize','discuss-avatar_cache',
  'qc-nameservers','esi-cache_admbar','object-kind','object-host','purge-stale','util-instant_click'
];
for (const rk of interesting) {
  if (!rawKeys.has(rk)) { console.log('ABSENT_RAW', rk); continue; }
  const internal = MAP_I[rk] || MAP_I[rk.replace(/-/g, '_')] || null;
  const inCat = internal ? ls.some(o => o.id === internal) : ls.some(o => o.id === rk || o.id === rk.replace(/-/g, '_'));
  console.log(`${inCat ? 'CAT' : 'GAP'} raw=${rk} val=${JSON.stringify(rawMap[rk]).slice(0,40)} internal=${internal}`);
}

console.log('\n=== duplicate domain_key tabs ===');
const dkTabs = [];
for (const t of tabs) for (const o of (t.options || [])) if (o.id === 'domain_key') dkTabs.push(t.id);
console.log(dkTabs);

console.log('\n=== media_webp aliases in MAP_I ===');
for (const [k, v] of Object.entries(MAP_I)) if (v === 'media_webp') console.log(k, '→', v);

console.log('\n=== MAP_L crawler/db (wrong underscore LSCWP forms?) ===');
for (const [k, v] of Object.entries(MAP_L)) {
  if (/crawler|db_optm/.test(k)) console.log(k, '→', v, 'rawHas=', rawKeys.has(v), 'rawHasHyphen=', rawKeys.has(v.replace(/_/g, '-')));
}

// Soft satellites already measured?
console.log('\n=== satellite soft-measure status ===');
for (const id of ['js_delayed_exclude','optm_ccss_per_url','optm_css_async_inline','optm_ggfonts_async','media_lazy_exc','media_vpi','media_webp']) {
  const o = ls.find(x => x.id === id);
  if (!o) { console.log('NOCAT', id); continue; }
  const c = context.getOptionComparison(o, parsed, env);
  console.log(id, 'measured=' + c.isMeasured, 'disp=' + String(c.currentDisplay).slice(0, 50), 'status=' + c.statusLabel);
}
