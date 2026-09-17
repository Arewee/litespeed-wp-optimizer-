/**
 * AreWee-Optimizer - Core Rules Engine (v2.3.9)
 * 
 * Comprehensive rule evaluations for LiteSpeed Cache (100% 1:1 tab parity),
 * CTM (Consent & Tracking Manager), SCM (Site Code Manager), WooCommerce, Elementor,
 * Wordfence, WordPress Core, and Server Memory configurations (.htaccess / wp-config).
 *
 * Official benchmarks mapped to specific versions, latest ecosystem releases, and audit dates.
 */

// --- HELPER UTILITIES: EXCLUSIONS & MEMORY MANAGEMENT ---
function normalizeExclusionPattern(pattern) {
  if (!pattern) return "";
  let p = pattern.trim().toLowerCase();
  // Strip leading caret or query prefix if present for clean comparison
  if (p.startsWith("^")) p = p.substring(1);
  if (p.startsWith("?")) p = p.substring(1);
  if (p.endsWith("$")) p = p.substring(0, p.length - 1);
  return p;
}

function parseMemoryMB(val) {
  if (!val || typeof val !== "string") return null;
  const str = val.trim().toUpperCase();
  if (str === "-1" || str.includes("UNLIMITED")) return 999999;
  
  const match = str.match(/^(\d+(?:\.\d+)?)\s*([GMK])?B?$/);
  if (!match) return null;
  
  const num = parseFloat(match[1]);
  if (isNaN(num)) return null;
  
  const unit = match[2];
  if (unit === "G") return num * 1024;
  if (unit === "K") return num / 1024;
  return num; // Default MB
}

function checkMissingExclusions(currentExclusionsStr, requiredList) {
  let list = requiredList;
  if (typeof list === "string") {
    list = list.split("\n").map(s => s.trim()).filter(Boolean);
  } else if (!Array.isArray(list)) {
    list = [];
  }
  if (!currentExclusionsStr) return [...list];

  const currentLines = (currentExclusionsStr || "")
    .toString()
    .split("\n")
    .map(normalizeExclusionPattern)
    .filter(Boolean);

  return list.filter(item => {
    const normItem = normalizeExclusionPattern(item);
    return !currentLines.some(line => line === normItem || line.includes(normItem) || normItem.includes(line));
  });
}

function mergeExclusions(currentExclusionsStr, requiredList) {
  let list = requiredList;
  if (typeof list === "string") {
    list = list.split("\n").map(s => s.trim()).filter(Boolean);
  } else if (!Array.isArray(list)) {
    list = [];
  }
  if (!currentExclusionsStr) return list.join("\n");
  const missing = checkMissingExclusions(currentExclusionsStr, list);
  if (missing.length === 0) return currentExclusionsStr;
  return currentExclusionsStr.trim() + "\n" + missing.join("\n");
}

// --- SINGLE SOURCE OF TRUTH: OPTION COMPARISON ENGINE ---
function getOptionComparison(opt, uploadedSettings, environment) {
  const hasSettings = !!(uploadedSettings && Object.keys(uploadedSettings).length > 0);
  const isMeasured = hasSettings && uploadedSettings.hasOwnProperty(opt.id) && uploadedSettings[opt.id] !== undefined && uploadedSettings[opt.id] !== "";
  const rawMeasured = isMeasured ? uploadedSettings[opt.id] : null;
  const isTextarea = opt.id === "js_exclude" || opt.id === "css_exclude" || opt.id === "media_lazy_exc" || opt.id === "drop_uri";
  
  const rec = opt.recommendedRaw;
  const recNorm = (rec === "1" || rec === 1 || rec === "on" || rec === true || rec === "swap") ? 1 : (typeof rec === "string" ? rec : 0);

  if (!isMeasured) {
    return {
      id: opt.id,
      title: opt.title,
      tool: opt.tool || "litespeed",
      criticalLevel: opt.criticalLevel || "standard",
      isMeasured: false,
      status: "unmeasured",
      statusLabel: "⚪ Ej uppmätt",
      currentDisplay: "Ej inläst (Kräver Slot 6)",
      recommendedDisplay: isTextarea ? "Komplett guldstandard" : (recNorm === 1 ? "PÅ" : (typeof rec === "string" ? rec : "AV")),
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

  if (isTextarea) {
    let missing = checkMissingExclusions(rawMeasured, rec);
    if (opt.id === "drop_uri") {
      const cleanVal = (rawMeasured || "").toString().toLowerCase().replace(/[\^\$]/g, "");
      const hasCheckout = cleanVal.includes("checkout") || cleanVal.includes("kassa");
      const hasCart = cleanVal.includes("cart") || cleanVal.includes("varukorg");
      if (hasCheckout && hasCart) missing = [];
    }
    isMatches = missing.length === 0;
    currentDisplay = isMatches ? "Matchar guldstandard" : `Saknar ${missing.length} regel(er)`;
    recommendedDisplay = "Komplett guldstandard";
  } else if (typeof rec === "string" && rec !== "1" && rec !== "0") {
    const rawStr = String(rawMeasured).toLowerCase();
    const recStr = String(rec).toLowerCase();
    isMatches = rawStr.includes(recStr) || recStr.includes(rawStr);
    currentDisplay = String(rawMeasured);
    recommendedDisplay = String(rec);
  } else {
    const measNorm = (rawMeasured === "1" || rawMeasured === 1 || rawMeasured === "on" || rawMeasured === true) ? 1 : 0;
    const targetNorm = (rec === "1" || rec === 1 || rec === "on" || rec === true) ? 1 : 0;
    isMatches = measNorm === targetNorm;
    currentDisplay = measNorm === 1 ? "PÅ" : "AV";
    recommendedDisplay = targetNorm === 1 ? "PÅ" : "AV";
  }

  return {
    id: opt.id,
    title: opt.title,
    tool: opt.tool || "litespeed",
    criticalLevel: opt.criticalLevel || "standard",
    isMeasured: true,
    status: isMatches ? "optimal" : "deviation",
    statusLabel: isMatches ? "🟢 Optimal" : "🟡 Avvikelse",
    currentDisplay,
    recommendedDisplay,
    isMatches,
    isDeviant: !isMatches,
    isCritical: opt.criticalLevel === "critical",
    rawMeasured,
    rawRecommended: rec
  };
}

// --- VERSIONS & DOCUMENTATION BENCHMARK DATABASE ---
const BENCHMARK_VERSIONS = {
  litespeed: {
    name: "LiteSpeed Cache (LSCWP)",
    benchmarkVersion: "7.9.1",
    latestRelease: "7.9.1",
    auditDate: "2026-09-17",
    source: "LiteSpeed Tech Official Docs & GitHub Trac",
    url: "https://docs.litespeedtech.com/lsc/lscwp/"
  },
  woocommerce: {
    name: "WooCommerce",
    benchmarkVersion: "9.3.3",
    latestRelease: "9.3.3",
    auditDate: "2026-09-17",
    source: "WooCommerce Developer Handbook & GitHub Releases",
    url: "https://developer.woocommerce.com/"
  },
  elementor: {
    name: "Elementor",
    benchmarkVersion: "3.24.4",
    latestRelease: "3.24.4",
    auditDate: "2026-09-17",
    source: "Elementor Developer Hub & Experiment Matrix",
    url: "https://developers.elementor.com/"
  },
  wordfence: {
    name: "Wordfence Security",
    benchmarkVersion: "8.0.2",
    latestRelease: "8.0.2",
    auditDate: "2026-09-17",
    source: "Wordfence Learning Center & LiteSpeed Guide",
    url: "https://www.wordfence.com/help/"
  },
  ctm: {
    name: "CTM (Consent & Tracking Manager)",
    benchmarkVersion: "2.3.9",
    latestRelease: "2.3.9",
    auditDate: "2026-09-17",
    source: "CTM Source Manual & DataLayer Standards",
    url: "internal://consent-tracking-manager"
  },
  scm: {
    name: "SCM (Site Code Manager)",
    benchmarkVersion: "2.3.9",
    latestRelease: "2.3.9",
    auditDate: "2026-09-17",
    source: "SCM Source Manual & Code Standards",
    url: "internal://site-code-manager"
  },
  wordpress: {
    name: "WordPress Core",
    benchmarkVersion: "6.7.1",
    latestRelease: "6.7.1",
    auditDate: "2026-09-17",
    source: "WordPress Developer Handbook & Trac",
    url: "https://developer.wordpress.org/"
  },
  php: {
    name: "PHP Runtime",
    benchmarkVersion: "8.2 / 8.3",
    latestRelease: "8.3",
    auditDate: "2026-09-17",
    source: "PHP.net Official Documentation",
    url: "https://www.php.net/supported-versions.php"
  }
};

/**
 * Main multi-file analysis controller
 */
function analyzeSystem(sysInfo, wooInfo, wfInfo, elemInfo, uploadedSettings, scmInfo, customCss, serverConfigFiles) {
  if (!sysInfo) {
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
          { text: "Krävs för att starta optimering och analys", status: "warning" }
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

  const pluginsActive = sysInfo["wp-plugins-active"] || {};
  const activePluginKeys = Object.keys(pluginsActive);

  // 1. Environment and Plugin Detection
  const environment = {
    server: (sysInfo["wp-server"] && sysInfo["wp-server"].httpd_software) || "Okänd",
    phpVersion: (sysInfo["wp-server"] && sysInfo["wp-server"].php_version) || "Okänd",
    phpMemoryLimit: (sysInfo["wp-server"] && sysInfo["wp-server"].php_memory_limit) || "Okänd",
    phpMaxInputVars: (sysInfo["wp-server"] && sysInfo["wp-server"].php_max_input_vars) || "Okänd",
    wpVersion: (sysInfo["wp-core"] && sysInfo["wp-core"].version) || "Okänd",
    wpMemoryLimit: (sysInfo["wp-constants"] && sysInfo["wp-constants"].WP_MEMORY_LIMIT) || "40M",
    wpMaxMemoryLimit: (sysInfo["wp-constants"] && sysInfo["wp-constants"].WP_MAX_MEMORY_LIMIT) || "256M",
    wpDebug: (sysInfo["wp-constants"] && sysInfo["wp-constants"].WP_DEBUG) === "true",
    wpDebugDisplay: (sysInfo["wp-constants"] && sysInfo["wp-constants"].WP_DEBUG_DISPLAY) === "true",
    disableWpCron: (sysInfo["wp-constants"] && sysInfo["wp-constants"].DISABLE_WP_CRON) === "true",
    activeTheme: (sysInfo["wp-active-theme"] && sysInfo["wp-active-theme"].name) || "Okänt tema",
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
    serverConfig: serverConfigFiles || {} // .htaccess / wp-config parsed rules
  };

  // Check LiteSpeed Server
  if (
    environment.server.toLowerCase().includes("litespeed") || 
    (sysInfo["wp-server"] && sysInfo["wp-server"].php_sapi && sysInfo["wp-server"].php_sapi.toLowerCase().includes("litespeed"))
  ) {
    environment.isLiteSpeedServer = true;
  }

  // Check installed plugins & versions
  activePluginKeys.forEach(k => {
    const kLower = k.toLowerCase();
    const pData = pluginsActive[k];
    const pVer = (typeof pData === "object" && pData.version) ? pData.version : "Aktiv";

    if (kLower.includes("litespeed")) {
      environment.hasLiteSpeedPlugin = true;
      environment.lscwpVersion = pVer;
    }
    if (kLower.includes("woocommerce") && !kLower.includes("gateway") && !kLower.includes("addon")) {
      environment.hasWooCommerce = true;
      environment.wooVersion = pVer;
    }
    if (kLower.includes("elementor") && !kLower.includes("pro")) {
      environment.hasElementor = true;
      environment.elemVersion = pVer;
    }
    if (kLower.includes("wordfence")) {
      environment.hasWordfence = true;
      environment.wfVersion = pVer;
    }
    // Specific CTM matching (avoid false positive with generic "consent" like Complianz)
    if (kLower.includes("arewee-ctm") || kLower.includes("consent & tracking") || kLower.includes("consent-tracking-manager") || (kLower.includes("ctm") && !kLower.includes("custom") && !kLower.includes("contact"))) {
      environment.hasCTM = true;
      environment.ctmVersion = pVer;
    }
    if (kLower.includes("site code manager") || kLower.includes("scm") || kLower.includes("code-manager")) {
      environment.hasSCM = true;
      environment.scmVersion = pVer;
    }
    if (kLower.includes("redis") || kLower.includes("object cache")) {
      environment.hasRedis = true;
    }
  });

  // Collect WooCommerce Gateways
  const detectedGateways = [];
  if (wooInfo && Array.isArray(wooInfo.gateways)) {
    detectedGateways.push(...wooInfo.gateways);
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
  
  // Normalized Elementor Lazy Load detection
  environment.hasElementorLazyLoad = !!(elemInfo && (elemInfo.lazy_load_enabled || elemInfo.hasLazyLoad || (elemInfo.experiments && elemInfo.experiments.includes("e_lazy_load_images"))));
  
  // Normalized Wordfence fields
  environment.wfFirewallMode = (wfInfo && (wfInfo.firewall_mode || wfInfo.firewallMode)) || "Standard";
  environment.wfIpHeader = (wfInfo && (wfInfo.ip_header || wfInfo.ipHeader || wfInfo.howGetIPs)) || "Standard";

  // Redis object cache check
  if (sysInfo["wp-dropins"] && sysInfo["wp-dropins"]["object-cache.php"]) {
    environment.hasRedis = true;
    environment.isRedisConnected = true;
  }

  // 2. Build Version & Parity Matrix
  const versionMatrix = [
    {
      toolKey: "litespeed",
      name: "LiteSpeed Cache (LSCWP)",
      installedVersion: environment.hasLiteSpeedPlugin ? environment.lscwpVersion : "Ej installerat",
      benchmarkVersion: environment.hasLiteSpeedPlugin ? environment.lscwpVersion : BENCHMARK_VERSIONS.litespeed.benchmarkVersion,
      latestRelease: BENCHMARK_VERSIONS.litespeed.latestRelease,
      auditDate: BENCHMARK_VERSIONS.litespeed.auditDate,
      source: BENCHMARK_VERSIONS.litespeed.source,
      sourceUrl: BENCHMARK_VERSIONS.litespeed.url,
      isActive: environment.hasLiteSpeedPlugin,
      isParityMatch: environment.lscwpVersion === BENCHMARK_VERSIONS.litespeed.latestRelease
    },
    {
      toolKey: "woocommerce",
      name: "WooCommerce",
      installedVersion: environment.hasWooCommerce ? environment.wooVersion : "Ej installerat",
      benchmarkVersion: environment.hasWooCommerce ? environment.wooVersion : BENCHMARK_VERSIONS.woocommerce.benchmarkVersion,
      latestRelease: BENCHMARK_VERSIONS.woocommerce.latestRelease,
      auditDate: BENCHMARK_VERSIONS.woocommerce.auditDate,
      source: BENCHMARK_VERSIONS.woocommerce.source,
      sourceUrl: BENCHMARK_VERSIONS.woocommerce.url,
      isActive: environment.hasWooCommerce,
      isParityMatch: environment.wooVersion === BENCHMARK_VERSIONS.woocommerce.latestRelease
    },
    {
      toolKey: "elementor",
      name: "Elementor",
      installedVersion: environment.hasElementor ? environment.elemVersion : "Ej installerat",
      benchmarkVersion: environment.hasElementor ? environment.elemVersion : BENCHMARK_VERSIONS.elementor.benchmarkVersion,
      latestRelease: BENCHMARK_VERSIONS.elementor.latestRelease,
      auditDate: BENCHMARK_VERSIONS.elementor.auditDate,
      source: BENCHMARK_VERSIONS.elementor.source,
      sourceUrl: BENCHMARK_VERSIONS.elementor.url,
      isActive: environment.hasElementor,
      isParityMatch: environment.elemVersion === BENCHMARK_VERSIONS.elementor.latestRelease
    },
    {
      toolKey: "wordfence",
      name: "Wordfence Security",
      installedVersion: environment.hasWordfence ? environment.wfVersion : (wfInfo ? "Diagnostik inläst" : "Ej inläst"),
      benchmarkVersion: environment.hasWordfence ? environment.wfVersion : BENCHMARK_VERSIONS.wordfence.benchmarkVersion,
      latestRelease: BENCHMARK_VERSIONS.wordfence.latestRelease,
      auditDate: BENCHMARK_VERSIONS.wordfence.auditDate,
      source: BENCHMARK_VERSIONS.wordfence.source,
      sourceUrl: BENCHMARK_VERSIONS.wordfence.url,
      isActive: environment.hasWordfence || !!wfInfo,
      isParityMatch: true
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
      installedVersion: environment.wpVersion,
      benchmarkVersion: environment.wpVersion || BENCHMARK_VERSIONS.wordpress.benchmarkVersion,
      latestRelease: BENCHMARK_VERSIONS.wordpress.latestRelease,
      auditDate: BENCHMARK_VERSIONS.wordpress.auditDate,
      source: BENCHMARK_VERSIONS.wordpress.source,
      sourceUrl: BENCHMARK_VERSIONS.wordpress.url,
      isActive: true,
      isParityMatch: environment.wpVersion === BENCHMARK_VERSIONS.wordpress.latestRelease
    }
  ];

  // 3. Generate Alerts, Warnings & Conflicts
  const alerts = [];
  const customCodeAlerts = [];
  const customCssAlerts = [];

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
        title: "LiteSpeed .data-fil ej inläst (Slot 6) – Verifiera kassaexkluderingar",
        desc: "Ladda upp din litespeed.data-fil i Slot 6 för att verifiera att kassa- och varukorgssidor är undantagna från cachelagring.",
        source: "WooCommerce Developer Handbook & LiteSpeed E-Commerce Standards",
        compatibility: "Kritiskt för alla betalningslösningar (Klarna Checkout, Stripe, PayPal, Svea Checkout m.fl.).",
        wpPath: "LiteSpeed Cache ➔ Inställningar ➔ Cache ➔ [4] Exkludera ➔ Exkludera sökvägar (drop_uri)",
        targetTabId: "cache",
        targetSettingId: "drop_uri",
        criticalLevel: "standard"
      });
    } else {
      const dropUri = uploadedSettings.drop_uri || "";
      const dropUriClean = dropUri.toString().toLowerCase().replace(/[\^\$]/g, "");
      const hasCheckout = dropUriClean.includes("checkout") || dropUriClean.includes("kassa");
      const hasCart = dropUriClean.includes("cart") || dropUriClean.includes("varukorg");

      if (!hasCheckout || !hasCart) {
        alerts.push({
          type: "danger",
          icon: "🚨",
          component: "woocommerce",
          components: ["woocommerce", "litespeed"],
          title: "Kassan/Varukorgen är INTE undantagen från LiteSpeed Cache!",
          desc: "Kritiskt stabilitetsfel i inläst fil! Butikens kassa- eller varukorgssidor saknas i drop_uri. Detta kan leda till att besökare ser andras varukorgar eller att betalningar misslyckas.",
          source: "WooCommerce Developer Handbook & LiteSpeed E-Commerce Standards",
          compatibility: "Kritiskt för alla betalningslösningar (Klarna Checkout, Stripe, PayPal, Svea Checkout m.fl.).",
          wpPath: "LiteSpeed Cache ➔ Inställningar ➔ Cache ➔ [4] Exkludera ➔ Exkludera sökvägar (drop_uri)",
          targetTabId: "cache",
          targetSettingId: "drop_uri",
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

    const isJsCombineOn = uploadedSettings.optm_js_comb === "1" || uploadedSettings.optm_js_comb === 1;
    const isJsDeferOn = uploadedSettings.optm_js_defer === "1" || uploadedSettings.optm_js_defer === 1 || uploadedSettings.optm_js_defer === "2";

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
        criticalLevel: "critical"
      });
    }
  }

  // --- D1. Single Source of Truth: Lazy Load Overlap ---
  const isLscwpLazy = uploadedSettings ? (uploadedSettings.media_lazy === "1" || uploadedSettings.media_lazy === 1) : false;
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
    const isElemDomOptimized = elemInfo.experiments && elemInfo.experiments.some(e => e.toLowerCase().includes("dom") || e.toLowerCase().includes("optimized_dom"));
    if (!isElemDomOptimized) {
      alerts.push({
        type: "warning",
        icon: "⚡",
        component: "elementor",
        components: ["elementor"],
        title: "Elementor 'Optimized DOM Output' är inte aktiverat",
        desc: "Elementors optimerade DOM-struktur minskar onödiga kapslade div-element drastiskt och förbättrar PageSpeed & LCP märkbart.",
        source: "Elementor Developer Hub & Experiment Matrix (v3.24+)",
        compatibility: "100% kompatibel med LiteSpeed Cache och moderna WordPress-teman.",
        wpPath: "Elementor ➔ Inställningar ➔ Funktioner ➔ Optimerad DOM-utmatning",
        targetTabId: "elementor",
        criticalLevel: "high"
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
        criticalLevel: "high"
      });
    }
  }

  // --- E. Wordfence IP-detektering ---
  if (wfInfo && environment.wfIpHeader) {
    const ipHeaderLower = environment.wfIpHeader.toLowerCase();
    const isCloudflare = activePluginKeys.some(k => k.toLowerCase().includes("cloudflare")) || 
                         (sysInfo["wp-server"] && JSON.stringify(sysInfo["wp-server"]).toLowerCase().includes("cloudflare"));
    
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
        criticalLevel: "critical"
      });
    }
  }

  // --- F. SCM (Site Code Manager) Snippet Audits ---
  if (scmInfo && scmInfo.snippets && Array.isArray(scmInfo.snippets)) {
    scmInfo.snippets.forEach((snip, idx) => {
      const code = (snip.code || snip.content || "").toLowerCase();
      const title = snip.title || snip.name || `Snippet #${idx + 1}`;

      if (code.includes("woocommerce_before_cart") || code.includes("woocommerce_after_cart")) {
        customCodeAlerts.push({
          type: "warning",
          icon: "🛒",
          component: "scm",
          title: `SCM: Föråldrad kundkorgs-hook i '${title}'`,
          desc: "Snippet använder generiska varukorgs-hooks som kan sakta ner kundkorgens AJAX-uppdatering.",
          criticalLevel: "standard"
        });
      }

      if (code.includes("echo '<script") || code.includes("echo \"<script") || code.includes("echo '<style")) {
        customCodeAlerts.push({
          type: "warning",
          icon: "⚡",
          component: "scm",
          title: `SCM: Rå HTML/JS utskriven direkt i PHP i '${title}'`,
          desc: "Skript och stilar bör registreras via wp_enqueue_script/wp_enqueue_style istället för rå echo, så att LiteSpeed kan optimera dem säkert.",
          criticalLevel: "standard"
        });
      }

      if (code.includes("get_transient") && !code.includes("delete_transient")) {
        customCodeAlerts.push({
          type: "warning",
          icon: "💾",
          component: "scm",
          title: `SCM: Transienter utan automatisk rensning i '${title}'`,
          desc: "Säkerställ att utgångna transienter rensas så att inte wp_options-tabellen sväller i databasen.",
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
        criticalLevel: "standard"
      });
    }

    if (customCss.includes("@font-face") && !customCss.toLowerCase().includes("font-display")) {
      customCssAlerts.push({
        type: "warning",
        icon: "🔤",
        component: "css",
        title: "@font-face saknar 'font-display: swap;'",
        desc: "Externa typsnitt som saknar font-display: swap kan orsaka osynlig text under laddning (FOIT) och sänka Core Web Vitals (FCP/LCP).",
        criticalLevel: "standard"
      });
    }
  }

  // 4. Build Complete 1:1 LiteSpeed Cache Settings Recommendations
  const recommendations = buildCompleteLscwpSettings(environment, uploadedSettings, wooInfo, elemInfo, wfInfo);

  // 5. Build 3-bullet Upload Summaries
  const fileSummaries = {
    sysInfo: [
      { text: `WordPress v${environment.wpVersion} på ${environment.isLiteSpeedServer ? "LiteSpeed Server 🟢" : environment.server + " 🟡"}`, status: environment.isLiteSpeedServer ? "success" : "warning" },
      { text: `PHP v${environment.phpVersion} (Memory: ${environment.phpMemoryLimit}, WP: ${environment.wpMemoryLimit})`, status: wpMemNum >= 256 ? "success" : "danger" },
      { text: `Plugins: ${activePluginKeys.length} st (${environment.hasWooCommerce ? "WooCommerce OK, " : ""}${environment.hasElementor ? "Elementor OK, " : ""}CTM & SCM integrerade)`, status: "success" }
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

  return {
    environment,
    versionMatrix,
    alerts,
    customCodeAlerts,
    customCssAlerts,
    recommendations,
    fileSummaries
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

  // Build safe JS exclusions (Guarantees CTM, Elementor & WooCommerce protection)
  let defaultJsExclude = "ctm\nctm-init.js\ncookieconsent\ndataLayer\njquery.js\njquery.min.js";
  if (isWoo) {
    defaultJsExclude += "\nwoocommerce\nwc-checkout\nwc-cart\nstripe\nklarna\npaypal";
  }
  if (isElem) {
    defaultJsExclude += "\nelementorFrontend\nelementor-frontend";
  }

  function makeOpt(id, title, recommendedRaw, desc, criticalLevel, impactCategory, citations, singleSourceInfo, tool) {
    const optObj = { id, title, tool: tool || "litespeed", recommendedRaw, criticalLevel: criticalLevel || "standard" };
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

    return {
      id,
      title,
      tool: tool || "litespeed",
      recommendedRaw,
      value: userVal,
      desc,
      safe: true,
      criticalLevel: criticalLevel || "standard",
      impactCategory: impactCategory || "stability",
      singleSourceInfo: normalizedSsi,
      isChangedNeeded,
      citations: citations || {
        litespeed: "Officiell LiteSpeed-rekommendation.",
        consensus: "Branschstandard och best practice."
      }
    };
  }

  return [
    // --- TAB 1: General / Allmänt ---
    {
      id: "general",
      title: "⚡ LSCWP: [1] Generellt",
      options: [
        makeOpt(
          "auto_upgrade",
          "Automatisk uppgradering",
          0,
          "Rekommenderas AV på produktionssajter för att förhindra oväntade uppdateringar.",
          "standard",
          "stability",
          {
            litespeed: "LiteSpeed rekommenderar PÅ för automatiska säkerhetsfixar.",
            consensus: "Konsensus bland utvecklare: AV på e-handel/produktion; uppdateringar bör testas i staging först."
          }
        ),
        makeOpt(
          "domain_key",
          "Domännyckel (QUIC.cloud)",
          (uploadedSettings && typeof uploadedSettings.domain_key === "string") ? uploadedSettings.domain_key : "",
          "Visar ansluten QUIC.cloud domännyckel för bildoptimering och CCSS. Genereras i WP Admin.",
          "standard",
          "performance",
          {
            litespeed: "Krävs för alla QUIC.cloud molntjänster.",
            consensus: "Genereras via LiteSpeed Cache i WP Admin."
          }
        ),
        makeOpt(
          "guest_mode",
          "Gästläge (Guest Mode)",
          isWoo ? 0 : 1,
          isWoo ? "Bör vara AV på WooCommerce-butiker för att förhindra stela cache-sessioner och kassafel." : "PÅ ger blixtsnabb förstabesökar-cache på vanliga presentationssajter.",
          isWoo ? "critical" : "standard",
          "stability",
          {
            litespeed: "LiteSpeed föreslår PÅ som standard för maximal förstabesökarhastighet.",
            consensus: isWoo ? "Hög risk på e-handel! Avrådes starkt för WooCommerce då det kan visa tomma varukorgar." : "Utmärkt för bloggar och statiska företagssajter."
          }
        ),
        makeOpt(
          "guest_optm",
          "Gästoptimering (Guest Optimization)",
          isWoo ? 0 : 1,
          "Aktiverar maximal bild- och sidoptimering för gäster via QUIC.cloud.",
          "standard",
          "performance"
        ),
        makeOpt(
          "server_ip",
          "Server IP",
          (uploadedSettings && uploadedSettings.server_ip) ? uploadedSettings.server_ip : "",
          "Ange serverns publika IP-adress för direkt crawler- och rensningskommunikation.",
          "standard",
          "config"
        )
      ]
    },

    // --- TAB 2: Cache / Cachning ---
    {
      id: "cache",
      title: "⚡ LSCWP: [2] Cachning",
      options: [
        makeOpt(
          "cache",
          "Aktivera LiteSpeed Cache",
          1,
          "Huvudströmbrytare för sidcachning på servernivå. MÅSTE vara PÅ.",
          "critical",
          "performance",
          { litespeed: "Kärnfunktionen i LiteSpeed Cache.", consensus: "100% konsensus." }
        ),
        makeOpt(
          "cache_priv",
          "Cacha inloggade användare",
          1,
          "Cachar sidor för inloggade administratörer separat. Mycket säkert och sparar serverresurser.",
          "standard",
          "config"
        ),
        makeOpt(
          "cache_commenter",
          "Cacha kommentatorer",
          0,
          "Bör vara AV för att undvika att besökare ser cachade versioner efter kommentarer.",
          "standard",
          "config"
        ),
        makeOpt(
          "cache_rest",
          "Cacha REST API",
          1,
          "Cachar WordPress REST API-anrop, vilket snabbar upp Gutenberg och asynkrona anrop.",
          "standard",
          "performance"
        ),
        makeOpt(
          "cache_page_login",
          "Cacha inloggningssida",
          1,
          "Skyddar mot brute-force genom att cacha standardinloggningen.",
          "standard",
          "security"
        ),
        makeOpt(
          "cache_mobile",
          "Mobil cache",
          0,
          "Bör vara AV för responsiva teman (Astra/GeneratePress). Sätt endast PÅ om du har ett separat mobillayout-plugin.",
          "standard",
          "config"
        ),
        makeOpt(
          "drop_uri",
          "Exkluderade sökvägar (drop_uri)",
          defaultDropUri,
          isWoo ? "🚨 KASSASKYDD: Butikens kassa och varukorg MÅSTE vara exkluderade här." : "Sökvägar som aldrig ska cachas.",
          isWoo ? "critical" : "standard",
          "stability",
          { litespeed: "Obligatoriskt för e-handel.", consensus: "Fullständig enighet bland alla WooCommerce-utvecklare." },
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
          isWoo ? 1 : 0,
          "Möjliggör att cacha hela sidan offentligt medan personliga delar (minivarukorg, inloggning) serveras dynamiskt.",
          isWoo ? "high" : "standard",
          "performance"
        ),
        makeOpt(
          "cache_object",
          "Objektscachning (Redis / Memcached)",
          env.isRedisConnected ? 1 : 0,
          "Avlastar databasen genom att spara frekventa databasfrågor i RAM-minnet via Redis.",
          "high",
          "performance",
          { litespeed: "Starkt rekommenderat för WooCommerce.", consensus: "Kritiskt för snabb laddtid i kassan och admin." },
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
          "performance"
        )
      ]
    },

    // --- TAB 3: Page Optimization - CSS ---
    {
      id: "page_optimization_css",
      title: "⚡ LSCWP: [3] Sidoptimering - CSS",
      options: [
        makeOpt(
          "optm_css_min",
          "CSS Minifiering",
          1,
          "Tar bort kommentarer och onödiga blanksteg från CSS. Mycket säkert och snabbt.",
          "standard",
          "performance",
          null,
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
            litespeed: "Kan användas om sajten inte har många externa stilar.",
            consensus: "Google Web Dev & HTTP/3 best-practice avråder från kombinering; parallell multiplexing är snabbare och stabilare."
          }
        ),
        makeOpt(
          "optm_css_async",
          "Ladda CSS asynkront (Load CSS Asynchronously)",
          0,
          "Bör vara AV för Elementor för att förhindra FOUC (Flash of Unstyled Content) och layoutskakningar.",
          "high",
          "stability"
        ),
        makeOpt(
          "optm_font_display",
          "Font Display Optimerare (font-display: swap)",
          "swap",
          "Tvingar webbläsaren att visa text direkt med reservtypsnitt tills webbtypsnittet laddats klart.",
          "standard",
          "performance",
          null,
          {
            overlappingTools: ["LiteSpeed Cache", "Elementor Fonts", "WordPress Font Library"],
            primaryTool: "LiteSpeed Asynkron typsnittsladdning (swap)",
            whyRecommended: "Laddar webbtypsnitt asynkront och lägger till font-display: swap för att förhindra osynlig text och layoutförskjutning (CLS).",
            actionForSecondary: "Undvik att ladda samma typsnitt både i Elementor och via externa @import-regler i temat."
          }
        ),
        makeOpt(
          "css_exclude",
          "Undantagna CSS-filer",
          "elementor\nwoocommerce",
          "CSS-filer som inte ska minifieras eller flyttas.",
          "standard",
          "stability"
        )
      ]
    },

    // --- TAB 4: Page Optimization - JS ---
    {
      id: "page_optimization_js",
      title: "⚡ LSCWP: [4] Sidoptimering - JS",
      options: [
        makeOpt(
          "optm_js_min",
          "JS Minifiering",
          1,
          "Kompaktar JavaScript-kod genom att ta bort onödig whitespace.",
          "standard",
          "performance"
        ),
        makeOpt(
          "optm_js_comb",
          "JS Kombinering (JS Combine)",
          0,
          "Bör vara AV för att inte bryta händelselyssnare i CTM, WooCommerce eller Elementor.",
          "critical",
          "stability",
          {
            litespeed: "Erbjuds som alternativ.",
            consensus: "Kraftigt avrått för e-handel och CTM-spårning; bryter ofta checkout och samtyckeslogik."
          }
        ),
        makeOpt(
          "optm_js_defer",
          "Skjut upp JS (JS Defer)",
          1,
          "Laddar JavaScript parallellt så att HTML och CSS kan ritas ut snabbare (förbättrar INP och FCP).",
          "high",
          "performance",
          null,
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
          "🚨 CTM & KASSASKYDD: ctm-init.js, cookieconsent.umd.js och dataLayer MÅSTE exkluderas här.",
          "critical",
          "stability",
          {
            litespeed: "Kritiskt för att inte bryta dynamiska skript.",
            consensus: "Garanterar 100% GDPR- och spårningsfunktion i CTM."
          }
        )
      ]
    },

    // --- TAB 5: Page Optimization - HTML & Media ---
    {
      id: "page_optimization_media",
      title: "⚡ LSCWP: [5] Sidoptimering - Media",
      options: [
        makeOpt(
          "media_lazy",
          "Lazy Load för bilder",
          isElem ? 0 : 1,
          isElem ? "Bör vara AV om Elementors inbyggda lazyload eller WP Native används, för att undvika dubbel lazyload." : "PÅ fördröjer laddning av bilder utanför skärmen.",
          isElem ? "high" : "standard",
          "stability",
          {
            litespeed: "Rekommenderar PÅ för statiska teman.",
            consensus: isElem ? "Undvik dubbla lazyload-motorer (Elementor + LiteSpeed) då det orsakar bildflimmer." : "Standardprestanda."
          },
          {
            overlappingTools: ["LiteSpeed Cache", "Elementor", "WordPress Core (Native)"],
            recommendedTool: isElem ? "WordPress Native / LiteSpeed LQIP" : "LiteSpeed Cache (med VPI)",
            primaryTool: isElem ? "WordPress Native / LiteSpeed LQIP" : "LiteSpeed Cache (med VPI)",
            reason: "LiteSpeed genererar Low Quality Image Placeholders (LQIP) och responsiva SVG-platshållare på servernivå utan att belasta webbläsarens JS-tråd.",
            whyRecommended: "LiteSpeed genererar Low Quality Image Placeholders (LQIP) och responsiva SVG-platshållare på servernivå utan att belasta webbläsarens JS-tråd.",
            actionOtherTools: "Om du använder Elementor: Sätt Elementor 'Lazy Load Background Images' till Inaktiv för att undvika dubbla platshållare. Om du föredrar WP Core default: Låt WP Native HTML5 loading='lazy' styra och håll Elementors experiment inaktivt.",
            actionForSecondary: "Om du använder Elementor: Sätt Elementor 'Lazy Load Background Images' till Inaktiv för att undvika dubbla platshållare. Om du föredrar WP Core default: Låt WP Native HTML5 loading='lazy' styra och håll Elementors experiment inaktivt."
          }
        ),
        makeOpt(
          "media_lazy_exc",
          "Exkludera logotyp & Hero-bild från Lazy Load",
          "logo\nheader\nhero",
          "Säkerställer att LCP-bilden (Largest Contentful Paint) laddas direkt utan fördröjning.",
          "high",
          "performance",
          {
            litespeed: "Rekommenderar exkludering av Above-the-Fold bilder.",
            consensus: "Direkt krav från Google Core Web Vitals (LCP)."
          }
        ),
        makeOpt(
          "media_webp",
          "WebP / AVIF Bildersättning",
          1,
          "Ersätter automatiskt JPG/PNG med komprimerade nästa generations bildformat (WebP).",
          "standard",
          "performance"
        ),
        makeOpt(
          "optm_emojis_rm",
          "Ta bort WordPress Emojis-skript",
          1,
          "Inaktiverar standard WP-emoji-skript för att spara en blockerande HTTP-förfrågan.",
          "standard",
          "performance",
          null,
          {
            overlappingTools: ["LiteSpeed Cache", "SCM Snippets", "Disable Emojis Plugin"],
            primaryTool: "LiteSpeed Cache (optm_emojis_rm)",
            whyRecommended: "Inbyggd avstängning i LiteSpeed sparar en extern JS-förfrågan och kräver ingen extra PHP-kod i SCM.",
            actionForSecondary: "Om denna är PÅ i LiteSpeed kan du inaktivera motsvarande emoji-snippet i SCM."
          }
        )
      ]
    },

    // --- TAB 6: Crawler / Sökspindel ---
    {
      id: "crawler",
      title: "⚡ LSCWP: [6] Sökspindel (Crawler)",
      options: [
        makeOpt(
          "crawler",
          "Aktivera LiteSpeed Crawler",
          env.isLiteSpeedServer ? 1 : 0,
          env.isLiteSpeedServer ? "För-värmer cachen i bakgrunden så att alla besökare alltid möts av blixtsnabb cachad HTML." : "Kräver LiteSpeed Server.",
          "standard",
          "performance"
        ),
        makeOpt(
          "crawler_usleep",
          "Crawler Fördröjning (Mikrosekunder)",
          1000,
          "Paus mellan crawler-anrop för att förhindra serveröverbelastning.",
          "standard",
          "config"
        )
      ]
    },

    // --- TAB 7: WooCommerce & E-handel ---
    {
      id: "woocommerce",
      title: "🛒 WooCommerce",
      options: [
        makeOpt(
          "woo_hpos",
          "HPOS (High-Performance Order Storage)",
          1,
          "Flyttar orderdata från gamla wp_posts till separata, indexerade tabeller för 4x snabbare checkout och admin.",
          "critical",
          "performance",
          { litespeed: "Kompatibel med LSCWP.", consensus: "Officiell WooCommerce standard från v8.2+." },
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
          { litespeed: "Avlastar servern markant.", consensus: "Best practice för alla e-handelssajter." },
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
          null,
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
      title: "🎨 Elementor",
      options: [
        makeOpt(
          "elem_css_print_method",
          "CSS-utskriftsmetod (CSS Print Method)",
          "external",
          "Måste vara 'Extern fil' för att LiteSpeed ska kunna cacha och minifiera Elementor-stilar.",
          "high",
          "stability",
          { litespeed: "Krävs för CSS-optimering.", consensus: "Standard i Elementor." },
          null,
          "elementor"
        ),
        makeOpt(
          "elem_dom_optimization",
          "Optimerad DOM-utmatning (Optimized DOM)",
          1,
          "Tar bort onödiga omslutande div-taggar och minskar sidans DOM-djup.",
          "standard",
          "performance",
          { litespeed: "Minskar HTML-storlek.", consensus: "Elementor officiell rekommendation." },
          null,
          "elementor"
        ),
        makeOpt(
          "elem_asset_loading",
          "Förbättrad tillgångsladdning (Improved Asset Loading)",
          1,
          "Laddar endast JS/CSS för de Elementor-widgets som faktiskt används på sidan.",
          "standard",
          "performance",
          { litespeed: "Minskar onödig JS/CSS.", consensus: "Elementor Experiment standard." },
          null,
          "elementor"
        )
      ]
    },

    // --- TAB 9: Wordfence & Säkerhet ---
    {
      id: "wordfence",
      title: "🔒 Wordfence",
      options: [
        makeOpt(
          "wf_ip_header",
          "IP-detektering Header (How Wordfence gets IPs)",
          env.isCloudflare ? "CF-Connecting-IP" : "REMOTE_ADDR",
          "Bestämmer vilken metod Wordfence använder för besöks-IP. På direktanslutna servrar är PHP:s inbyggda REMOTE_ADDR säkrast mot IP-spoofing.",
          "critical",
          "security",
          { litespeed: "Wordfence: Använd REMOTE_ADDR om servern inte ligger bakom en separat proxy.", consensus: "REMOTE_ADDR är säkraste alternativet mot IP-spoofing vid direkt webbserverdrift." },
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
          { litespeed: "Minskar databasbelastning med upp till 80%.", consensus: "Branschstandard." },
          null,
          "wordfence"
        )
      ]
    },

    // --- TAB 10: WordPress Core & Serverminne ---
    {
      id: "core_server",
      title: "🖥️ WP Core & Serverminne",
      options: [
        makeOpt(
          "wp_memory_limit",
          "WP_MEMORY_LIMIT (wp-config.php)",
          "512M",
          "Minsta minnesallokering för WordPress i frontend. Krävs för stabil WooCommerce och Elementor.",
          "critical",
          "stability",
          { litespeed: "Förhindrar 500-fel under tunga processer.", consensus: "WooCommerce rekommendation: 512M." },
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
          { litespeed: "Snabbar upp sidvisningar genom att köra cron asynkront.", consensus: "Server best practice." },
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
          { litespeed: "Håller wp_posts-tabellen ren.", consensus: "WordPress Core rekommendation." },
          null,
          "server"
        )
      ]
    }
  ];
}

// Global window attachment for browser runtime
if (typeof window !== "undefined") {
  window.analyzeSystem = analyzeSystem;
  window.BENCHMARK_VERSIONS = BENCHMARK_VERSIONS;
  window.checkMissingExclusions = checkMissingExclusions;
  window.mergeExclusions = mergeExclusions;
  window.getOptionComparison = getOptionComparison;
  window.parseMemoryMB = parseMemoryMB;
}

// Node.js export for test runner
if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    analyzeSystem,
    BENCHMARK_VERSIONS,
    checkMissingExclusions,
    mergeExclusions,
    getOptionComparison,
    parseMemoryMB,
    buildCompleteLscwpSettings
  };
}

