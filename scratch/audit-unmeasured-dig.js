const fs = require('fs');
const path = require('path');
const vm = require('vm');
const BASE = path.resolve(__dirname, '..');
const DATA = '/Users/richardviitanen/Downloads/LSCWP_cfg-www.roligakalsonger.se_-20260924_083028.data';
const exporterJs = fs.readFileSync(path.join(BASE, 'js/exporter.js'), 'utf8');
const rulesJs = fs.readFileSync(path.join(BASE, 'js/rules.js'), 'utf8');
const context = {
  console, setTimeout, clearTimeout, Math, Date, JSON, String, Number, Boolean,
  parseInt, parseFloat, isNaN, Array, Object, RegExp, Error,
  atob: (s) => Buffer.from(s, 'base64').toString('binary'),
  module: { exports: {} }, exports: {}
};
context.window = context; context.global = context;
vm.createContext(context);
vm.runInContext(exporterJs, context);
vm.runInContext(rulesJs, context);
const exported = context.module.exports || {};
for (const k of Object.keys(exported)) if (!context[k]) context[k] = exported[k];

const raw = fs.readFileSync(DATA, 'utf8');
const parsed = context.parseSettingsFile(raw);
const MAP_L = context.KEY_MAPPING_TO_LSCWP;
const MAP_I = context.KEY_MAPPING_TO_INTERNAL;

const env = { hasWooCommerce: true, hasElementor: true, isLiteSpeedServer: true };
const tabs = context.buildCompleteLscwpSettings(env, parsed, {}, {}, {});

console.log('TABS:', tabs.map(t => `${t.id}(${(t.options||[]).length})`).join(', '));

const all = [];
for (const t of tabs) for (const o of (t.options||[])) all.push({...o, tab: t.id});

const byTool = {};
for (const o of all) {
  const tool = o.tool || 'litespeed';
  byTool[tool] = (byTool[tool]||0)+1;
}
console.log('byTool', byTool);

const ls = all.filter(o => {
  const tool = o.tool || 'litespeed';
  return !tool || tool === 'litespeed' || tool === 'tool';
});
console.log('ls count', ls.length);

let measured = 0, unmeasured = [];
for (const opt of ls) {
  const c = context.getOptionComparison(opt, parsed, env);
  if (c.isMeasured) measured++;
  else unmeasured.push({id: opt.id, tab: opt.tab, title: opt.title, tool: opt.tool, lscwp: MAP_L[opt.id], status: c.statusLabel});
}
console.log('measured', measured, 'unmeasured', unmeasured.length);
unmeasured.forEach(u => console.log(' UNM', u.id, u.tab, 'lscwp='+u.lscwp));

console.log('\n--- ALL LS OPTION IDS ---');
ls.forEach(o => {
  const c = context.getOptionComparison(o, parsed, env);
  const lscwp = MAP_L[o.id] || '?';
  const inParsed = parsed.hasOwnProperty(o.id);
  const inParsedL = parsed.hasOwnProperty(lscwp);
  console.log(`${c.isMeasured?'Y':'N'} ${o.id.padEnd(36)} tab=${o.tab.padEnd(22)} lscwp=${String(lscwp).padEnd(28)} parsedId=${inParsed} parsedL=${inParsedL} disp=${String(c.currentDisplay).slice(0,40)} status=${c.statusLabel}`);
});

// Check hyphen fallback bug: opt.id.replace(/_/g, "-") for mixed keys
console.log('\n--- HYPHEN FALLBACK ANALYSIS ---');
for (const opt of ls) {
  const mapped = MAP_L[opt.id];
  const naiveAll = opt.id.replace(/_/g, '-');
  const firstOnly = opt.id.replace(/^([a-z0-9]+)_/, '$1-');
  if (mapped && mapped !== naiveAll) {
    console.log(`MAPDIFF ${opt.id}: mapped=${mapped} naiveAll=${naiveAll} firstOnly=${firstOnly}`);
  }
  if (!mapped) {
    console.log(`NOMAP ${opt.id}: naiveAll=${naiveAll} firstOnly=${firstOnly} rawHasNaive=${raw.includes('"'+naiveAll+'"')} rawHasFirst=${raw.includes('"'+firstOnly+'"')}`);
  }
}

// Keys in parsed that look like settings
console.log('\n--- PARSED KEY COUNT', Object.keys(parsed).length);
console.log('Sample unmapped concerns:');
for (const rk of ['crawler-load_limit','crawler-crawl_interval','db_optm-revisions_max','media-webp','media-lazy_native','api_key','object','guest','cdn-mapping','optm-js_delayed_exc','optm-emoji_rm']) {
  const internal = MAP_I[rk];
  console.log(` raw ${rk}: inRaw=${raw.includes('["'+rk+'"')} internal=${internal} parsedHasInternal=${internal?parsed.hasOwnProperty(internal):false} parsedVal=${internal?JSON.stringify(parsed[internal]):'n/a'}`);
}

// Does catalog include crawler_load_limit, db_optm_*, media_webp_replace?
const want = ['crawler','crawler_usleep','crawler_load_limit','db_optm_revisions','db_optm_transient','media_webp','media_webp_replace','media_webp_attribute','media_lazy_native','cdn_mapping','optm_emojis_rm','js_delayed_exclude','domain_key','cache_object','guest_mode','esi'];
for (const id of want) {
  const o = all.find(x => x.id === id);
  console.log(`catalog ${id}: ${o?('YES tab='+o.tab+' tool='+o.tool):'NO'}`);
}

// Check if analyzeSystem path differs
if (typeof context.analyzeSystem === 'function') {
  try {
    const sys = context.analyzeSystem({}, {}, {}, {}, parsed, {}, '', {}, null);
    console.log('\nanalyzeSystem keys', sys && Object.keys(sys).slice(0,20));
    if (sys && sys.tabs) console.log('analyze tabs', sys.tabs.length);
    if (sys && sys.recommendations) console.log('recs', sys.recommendations.length);
  } catch (e) {
    console.log('analyzeSystem err', e.message);
  }
}

// Empty-string false negative check: force empty values
console.log('\n--- EMPTY / FALSE REGRESSION CHECKS ---');
const sizes = ls.find(o => o.id === 'img_optm_sizes_skipped');
if (sizes) {
  for (const up of [
    {'img_optm-sizes_skipped': ''},
    {'img_optm-sizes_skipped': []},
    {img_optm_sizes_skipped: ''},
    {'img_optm_sizes-skipped': 'x'}, // wrong
  ]) {
    const c = context.getOptionComparison(sizes, up, {});
    console.log('sizes', JSON.stringify(up), '→ measured', c.isMeasured, c.currentDisplay);
  }
}

// Check media_lazy_native soft-cover when media-lazy false
const mln = ls.find(o => o.id === 'media_lazy_native');
if (mln) {
  const c = context.getOptionComparison(mln, parsed, env);
  console.log('media_lazy_native on real export', c.isMeasured, c.currentDisplay);
}

// List makeOpt ids that use underscore forms where export uses different shape
console.log('\n--- DB OPTM / CRAWLER CATALOG SCAN ---');
all.filter(o => /db_optm|crawler|heartbeat|lqip|localize|html_lazy|avatar|instant|qc-|webp_attr|webp_replace|jpg_quality/i.test(o.id)).forEach(o => {
  const c = context.getOptionComparison(o, parsed, env);
  console.log(`${c.isMeasured?'Y':'N'} ${o.id} tool=${o.tool} tab=${o.tab}`);
});
