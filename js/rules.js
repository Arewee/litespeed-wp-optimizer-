/**
 * AreWee WP-Optimizer - Rules Engine
 * Implements a three-tiered auditing system, payment gateway checklists,
 * and comprehensive expert citations mapping (Official LiteSpeed vs Google Web Dev/WP Rocket consensus).
 */

const LSCWP_REFERENCE_VERSION = "7.8.1";

/**
 * Smart matching helper for exclusions. Checks if all entries in recommendedStr are
 * covered in currentStr, handling wildcards, regex patterns and casing.
 */
function checkMissingExclusions(currentStr, recommendedStr) {
  const cleanCur = (currentStr || "").toString().trim().toLowerCase().replace(/\r\n/g, "\n");
  const cleanRec = (recommendedStr || "").toString().trim().toLowerCase().replace(/\r\n/g, "\n");
  
  const curExcludes = cleanCur.split("\n").map(x => x.trim()).filter(Boolean);
  const recExcludes = cleanRec.split("\n").map(x => x.trim()).filter(Boolean);
  
  const normalize = (str) => {
    let norm = str.replace(/[\^\$\*\\\/]/g, "").trim();
    norm = norm.replace(/^wc-/, "");
    norm = norm.replace(/\.min\.(js|css)$/, "").replace(/\.(js|css)$/, "");
    return norm;
  };

  const isCovered = (recRule) => {
    const normRec = normalize(recRule);
    if (!normRec) return true;
    
    return curExcludes.some(curRule => {
      const normCur = normalize(curRule);
      return normCur.includes(normRec) || normRec.includes(normCur);
    });
  };
  
  return recExcludes.filter(r => !isCovered(r));
}

if (typeof window !== "undefined") {
  window.checkMissingExclusions = checkMissingExclusions;
}

/**
 * Smart merging helper for exclusions. Appends any missing recommended rules
 * to the user's current rules list, preserving their existing custom exclusions.
 */
function mergeExclusions(currentVal, recommendedVal) {
  const cleanCur = (currentVal || "").toString().trim().replace(/\r\n/g, "\n");
  const cleanRec = (recommendedVal || "").toString().trim().replace(/\r\n/g, "\n");
  
  const curExcludes = cleanCur.split("\n").map(x => x.trim()).filter(Boolean);
  const missing = checkMissingExclusions(currentVal, recommendedVal);
  
  if (missing.length === 0) return cleanCur;
  
  return [...curExcludes, ...missing].join("\n");
}

if (typeof window !== "undefined") {
  window.mergeExclusions = mergeExclusions;
}

/**
 * Parses and runs multi-file analysis to generate environment insights and LiteSpeed Cache recommendations.
 * @param {Object} sysInfo WordPress system report data
 * @param {Object} wooInfo WooCommerce system report data
 * @param {Object} wfInfo Wordfence diagnostic report data
 * @param {Object} elemInfo Elementor status report data
 * @param {Object} uploadedSettings Uploaded LiteSpeed settings (.data parsed)
 * @param {Object} customCode Custom PHP/snippets data
 * @param {string} customCss Custom pasted CSS
 * @returns {Object} Analysis results, alerts, and settings recommendations
 */
function analyzeSystem(sysInfo, wooInfo = null, wfInfo = null, elemInfo = null, uploadedSettings = null, customCode = null, customCss = "") {
  const alerts = [];
  
  let lscwpVersion = LSCWP_REFERENCE_VERSION; // default "7.8.1"
  if (sysInfo && sysInfo["wp-plugins-active"]) {
    const keys = Object.keys(sysInfo["wp-plugins-active"]);
    const matchKey = keys.find(k => k.toLowerCase() === "litespeed-cache" || k.toLowerCase() === "litespeed cache");
    if (matchKey) {
      lscwpVersion = sysInfo["wp-plugins-active"][matchKey].version;
    }
  }
  
  const customCodeAlerts = [];
  const environment = {
    wpVersion: "Okänd",
    server: "Okänd",
    phpVersion: "Okänd",
    theme: "Okänd",
    isLiteSpeedServer: false,
    hasWooCommerce: false,
    hasElementor: false,
    hasWordfence: false,
    hasObjectCache: false,
    hasImagick: true,
    hasKustomCheckout: false,
    wooGateways: [],
    wooOverrides: [],
    wfFirewallMode: "Okänd",
    wfIpHeader: "Okänd",
    elemExperiments: [],
    activePlugins: []
  };

  // --- 1. CONSOLIDATE ENVIRONMENT DATA ---

  if (sysInfo) {
    environment.wpVersion = sysInfo["wp-core"]?.version || "Okänd";
    environment.server = sysInfo["wp-server"]?.httpd_software || "Okänd";
    environment.phpVersion = sysInfo["wp-server"]?.php_version || "Okänd";
    environment.theme = sysInfo["wp-active-theme"]?.name || "Okänd";
    
    if (environment.server.toLowerCase().includes("litespeed") || 
        (sysInfo["wp-server"]?.php_sapi && sysInfo["wp-server"]?.php_sapi.toLowerCase().includes("litespeed"))) {
      environment.isLiteSpeedServer = true;
    }

    if (sysInfo["wp-dropins"]?.["object-cache.php"] === "true" || sysInfo["wp-dropins"]?.["object-cache.php"] === true) {
      environment.hasObjectCache = true;
    }

    if (sysInfo["wp-server"]?.imagick_availability === "false" || sysInfo["wp-server"]?.imagick_availability === false) {
      environment.hasImagick = false;
    }

    const pluginsActive = sysInfo["wp-plugins-active"] || {};
    environment.activePlugins = Object.keys(pluginsActive);
  }

  environment.activePlugins.forEach(pluginName => {
    const nameLower = pluginName.toLowerCase();
    if (nameLower.includes("woocommerce")) environment.hasWooCommerce = true;
    if (nameLower.includes("elementor")) environment.hasElementor = true;
    if (nameLower.includes("wordfence")) environment.hasWordfence = true;
    
    // Auto-populate gateways based on active plugins list as a fallback/enhancement
    if (nameLower.includes("klarna")) {
      if (!environment.wooGateways.includes("Klarna")) environment.wooGateways.push("Klarna");
    }
    if (nameLower.includes("stripe")) {
      if (!environment.wooGateways.includes("Stripe")) environment.wooGateways.push("Stripe");
    }
    if (nameLower.includes("paypal")) {
      if (!environment.wooGateways.includes("PayPal")) environment.wooGateways.push("PayPal");
    }
    if (nameLower.includes("shipmondo")) {
      if (!environment.wooGateways.includes("Shipmondo")) environment.wooGateways.push("Shipmondo");
    }
    if (nameLower.includes("kustom checkout") || nameLower.includes("kustom-checkout") || nameLower.includes("kustom")) {
      environment.hasKustomCheckout = true;
      if (!environment.wooGateways.includes("Kustom Checkout")) environment.wooGateways.push("Kustom Checkout");
    }
  });

  if (wooInfo) {
    environment.hasWooCommerce = true;
    if (wooInfo.overrides) environment.wooOverrides = wooInfo.overrides;
    if (wooInfo.gateways) environment.wooGateways = wooInfo.gateways;
  }

  if (wfInfo) {
    environment.hasWordfence = true;
    environment.wfFirewallMode = wfInfo.firewall_mode || "Okänd";
    environment.wfIpHeader = wfInfo.ip_header || "Okänd";
  }

  if (elemInfo) {
    environment.hasElementor = true;
    if (elemInfo.experiments) environment.elemExperiments = elemInfo.experiments;
    environment.hasElementorLazyLoad = elemInfo.hasLazyLoad || false;
  }

  // --- 2. 3-BULLET PER-FILE DIAGNOSTIC SUMMARIES (🟢, 🟡, 🔴) ---

  const fileSummaries = {
    sysInfo: [
      { text: "Ladda upp WordPress systemrapport för granskning.", status: "neutral" },
      { text: "Kontrollerar servertyp, PHP-version och aktiva tillägg.", status: "neutral" },
      { text: "Identifierar prestanda- och kompatibilitetsrisker.", status: "neutral" }
    ],
    wooInfo: [
      { text: "Ladda upp WooCommerce statusrapport för granskning.", status: "neutral" },
      { text: "Kontrollerar kassans och varukorgens cache-exkludering.", status: "neutral" },
      { text: "Analyserar betalsätts-skript (Klarna/Stripe) för undantag.", status: "neutral" }
    ],
    wfInfo: [
      { text: "Ladda upp Wordfence diagnostikrapport för granskning.", status: "neutral" },
      { text: "Kontrollerar Wordfences IP-detekteringsmetoder.", status: "neutral" },
      { text: "Analyserar brandväggsläge och vitlistningsstatus.", status: "neutral" }
    ],
    elemInfo: [
      { text: "Ladda upp Elementor statusrapport för granskning.", status: "neutral" },
      { text: "Granskar minnesgränser och Elementors inbyggda lazyload-funktioner.", status: "neutral" },
      { text: "Söker efter aktiva prestandafunktioner (Features) som krockar.", status: "neutral" }
    ],
    customCode: [
      { text: "Koppla functions.php eller snippets för granskning.", status: "neutral" },
      { text: "Kontrollerar manuella PHP-headers och skript-enqueues.", status: "neutral" },
      { text: "Scannar efter föråldrade WooCommerce action-hooks.", status: "neutral" }
    ],
    settings: [
      { text: "Koppla en LSCWP .data settingsfil för att jämföra.", status: "neutral" },
      { text: "Analyserar avvikelser mot prestandarekommendationer.", status: "neutral" },
      { text: "Visar exakta inställningsändringar under tre audit-portar.", status: "neutral" }
    ]
  };

  if (sysInfo) {
    fileSummaries.sysInfo = [
      { text: `WP ${environment.wpVersion} & PHP ${environment.phpVersion} är optimalt.`, status: "success" },
      { 
        text: environment.isLiteSpeedServer 
          ? "LiteSpeed-server stöder Crawler & ESI fullt ut." 
          : `Server '${environment.server}' saknar server-level Crawler.`,
        status: environment.isLiteSpeedServer ? "success" : "warning"
      },
      { 
        text: environment.hasImagick 
          ? "PHP Imagick är aktivt för bästa bildkomprimering." 
          : "Imagick saknas på servern (långsammare GD används).", 
        status: environment.hasImagick ? "success" : "warning" 
      }
    ];
  }

  if (wooInfo) {
    const dropUri = uploadedSettings ? (uploadedSettings.drop_uri || "").toLowerCase() : "/checkout\n/cart";
    const cacheExcl = (dropUri.includes("checkout") || dropUri.includes("kassa")) && (dropUri.includes("cart") || dropUri.includes("varukorg"));
    const outdated = environment.wooOverrides.filter(o => o.includes("outdated") || o.includes("föråldrad"));
    
    fileSummaries.wooInfo = [
      { text: cacheExcl ? "Kassa/Varukorg exkluderas korrekt från cache." : "Kassa/Varukorg saknar cache-undantag!", status: cacheExcl ? "success" : "danger" },
      { text: `${environment.wooGateways.length} betalsätt (Klarna/Stripe) är aktiva.`, status: "success" },
      { text: outdated.length > 0 ? `Hittade ${outdated.length} föråldrade templates.` : "Inga föråldrade templates upptäckta.", status: outdated.length > 0 ? "danger" : "success" }
    ];
  } else if (environment.hasWooCommerce) {
    fileSummaries.wooInfo = [
      { text: "WooCommerce är aktivt men saknar statusrapport!", status: "danger" },
      { text: "Kassa- och betalsäkerhet kan inte verifieras.", status: "danger" },
      { text: "Ladda upp WC statusrapport (ruta 2) för att skydda kassan.", status: "warning" }
    ];
  }

  if (wfInfo) {
    const isIpSecure = !environment.wfIpHeader.toLowerCase().includes("remot_addr") || (!environment.server.toLowerCase().includes("cloudflare") && !environment.isLiteSpeedServer);
    fileSummaries.wfInfo = [
      { text: `Brandvägg är i läge: ${environment.wfFirewallMode}.`, status: "success" },
      { text: isIpSecure ? "IP-detektering är säkert konfigurerad." : "REMOTE_ADDR krockar med Proxy/CDN (Risk!).", status: isIpSecure ? "success" : "danger" },
      { text: `Wordfence läser IP via: ${environment.wfIpHeader}.`, status: isIpSecure ? "success" : "warning" }
    ];
  } else if (environment.hasWordfence) {
    fileSummaries.wfInfo = [
      { text: "Wordfence är aktivt och diagnostik saknas.", status: "warning" },
      { text: "Kan inte verifiera korrekt IP-detektering för Crawler.", status: "warning" },
      { text: "Sökspindeln riskerar att blockeras av brandväggen.", status: "warning" }
    ];
  }

  if (elemInfo) {
    const cssExperiment = environment.elemExperiments.find(e => e.includes("css") || e.includes("assets"));
    fileSummaries.elemInfo = [
      { text: "Elementor Page Builder upptäckt.", status: "success" },
      { 
        text: environment.hasElementorLazyLoad 
          ? "Elementors egna Lazy Load är AKTIVERAT (Risk för krock!)." 
          : "Elementors inbyggda Lazy Load är inaktiverat (Optimalt).", 
        status: environment.hasElementorLazyLoad ? "danger" : "success" 
      },
      { text: cssExperiment ? `Funktionen '${cssExperiment}' är aktiv.` : "Inga krockande prestandafunktioner aktiva.", status: cssExperiment ? "warning" : "success" }
    ];
  } else if (environment.hasElementor) {
    fileSummaries.elemInfo = [
      { text: "Elementor används men statusrapport saknas.", status: "warning" },
      { text: "Kan inte analysera aktiva CSS-optimeringar.", status: "warning" },
      { text: "CSS-kombinering bör ställas till AV för säkerhet.", status: "success" }
    ];
  }

  if (customCode) {
    fileSummaries.customCode = [
      { text: customCode.hasRawScriptHooks ? "Utskrift av råa skript-taggar upptäckt." : "Skript enqueuas korrekt via hooks.", status: customCode.hasRawScriptHooks ? "danger" : "success" },
      { text: customCode.hasOldHooks ? "Föråldrad WooCommerce-hook används." : "Kompatibla e-handels-hooks verifierade.", status: customCode.hasOldHooks ? "warning" : "success" },
      { text: customCode.hasManualCacheHeaders ? "Manuella Cache-Headers i PHP hittades." : "Inga krockande cache-headers upptäckta.", status: customCode.hasManualCacheHeaders ? "danger" : "success" }
    ];
  }

  if (uploadedSettings) {
    fileSummaries.settings = [
      { text: "LiteSpeed settingsfil (.data) är inladdad.", status: "success" },
      { text: "Jämförelse- och ändringsrapport är genererad.", status: "success" },
      { text: "Du kan åtgärda avvikelser live med ett klick.", status: "success" }
    ];
  }


  // --- 3. CUSTOM PASTED CSS STATIC AUDIT ---
  const customCssAlerts = [];
  if (customCss && customCss.trim().length > 0) {
    const lowerCss = customCss.toLowerCase();

    if (lowerCss.includes("@import")) {
      customCssAlerts.push({
        type: "danger",
        title: "@import-regel upptäckt i CSS (Kritiskt!)",
        desc: "Du använder `@import` för att ladda externa resurser eller typsnitt. Detta blockerar sidans rendering helt och hållet, vilket dramatiskt ökar laddningstiden (FCP/LCP) för besökare. Köa istället stilar via child theme functions.php.",
        icon: "🚨"
      });
    }

    if (lowerCss.includes("!important")) {
      const count = (lowerCss.match(/!important/g) || []).length;
      if (count > 5) {
        customCssAlerts.push({
          type: "warning",
          title: "Många !important-regler upptäckta",
          desc: `Din CSS innehåller ${count} stycken '!important'-regler. Detta försvårar underhåll och kan störa LiteSpeeds minifiering.`,
          icon: "⚠️"
        });
      }
    }

    if (lowerCss.includes("@keyframes") && (lowerCss.includes("width:") || lowerCss.includes("height:") || lowerCss.includes("margin:"))) {
      customCssAlerts.push({
        type: "warning",
        title: "Tunga CSS-animeringar detekterade",
        desc: "Dina CSS-animeringar ändrar egenskaper som bredd, höjd eller marginaler. Detta tvingar webbläsaren att göra reflow under rendering vilket bryter CLS-värdet. Använd istället transform och opacity.",
        icon: "🎨"
      });
    }

    if (customCssAlerts.length === 0) {
      customCssAlerts.push({
        type: "success",
        title: "Anpassad CSS granskad: OK!",
        desc: "Din klistrade CSS är prestandaoptimerad och saknar render-blockerande @imports.",
        icon: "🎨"
      });
    }
  }


  // --- 4. ADVANCED COMPATIBILITY ALERTS & CONFLICT CHECKS ---

  if (sysInfo) {
    if (!environment.isLiteSpeedServer) {
      alerts.push({
        type: "warning",
        title: "Icke-LiteSpeed server detekterad",
        desc: `Din server rapporterar '${environment.server}'. ESI och Sökspindel (Crawler) kommer inte fungera optimalt på servernivå utan LiteSpeed.`,
        icon: "⚠️"
      });
    } else {
      alerts.push({
        type: "success",
        title: "LiteSpeed Server Detekterad!",
        desc: "Din webbplats körs på en äkta LiteSpeed-webbserver. Detta är optimalt och låser upp alla avancerade funktioner i pluginet (Server-level cachning, ESI och Sökspindel).",
        icon: "⚡"
      });
    }
  }

  if (environment.hasWooCommerce) {
    if (!wooInfo) {
      alerts.push({
        type: "warning",
        title: "WooCommerce Statusrapport saknas (Kritiskt!)",
        desc: "Kassan och varukorgen kan inte garanteras fungera! Utan statusrapporten kan vi inte verifiera dina betalsätt för att skapa exkluderingsregler.",
        icon: "🚨",
        wpPath: "WordPress Admin ➔ WooCommerce ➔ Status ➔ Systemstatus"
      });
    } else {
      if (environment.wooOverrides.length > 0) {
        const outdated = environment.wooOverrides.filter(o => o.includes("outdated") || o.includes("föråldrad"));
        if (outdated.length > 0) {
          alerts.push({
            type: "warning",
            title: "Föråldrade WooCommerce-mallar i temat",
            desc: `Ditt tema Astra skriver över ${outdated.length} föråldrade WooCommerce-mallar. Detta kan orsaka JavaScript-fel i kassan.`,
            icon: "🚨",
            wpPath: "WordPress Admin ➔ WooCommerce ➔ Status ➔ Systemstatus ➔ Fliken 'Mallar' (Templates)"
          });
        }
      }
    }

    if (uploadedSettings) {
      const dropUri = (uploadedSettings.drop_uri || "").toString().toLowerCase();
      const hasCheckoutExclusion = dropUri.includes("checkout") || dropUri.includes("kassa");
      const hasCartExclusion = dropUri.includes("cart") || dropUri.includes("varukorg");

      if (!hasCheckoutExclusion || !hasCartExclusion) {
        alerts.push({
          type: "warning",
          title: "Kassan/Varukorgen är INTE undantagen från cache!",
          desc: "Kritiskt stabilitetshot! Din LiteSpeed-konfiguration saknar exkluderingar för kassa- eller varukorgssidor under drop_uri. Detta kommer att leda till att besökare ser andras personuppgifter eller att köp misslyckas. Säkerställ att '/checkout*', '/cart*', '/kassa*' och '/varukorg*' är exkluderade!",
          icon: "🚨",
          wpPath: "LiteSpeed Cache ➔ Inställningar ➔ Cache ➔ [4] Exkludera ➔ Exkludera sökvägar (drop_uri)",
          targetTabId: "cache",
          targetSettingId: "drop_uri"
        });
      } else {
        alerts.push({
          type: "success",
          title: "Kassacachning OK - Undantag verifierade",
          desc: "Dina LSCWP drop_uri-regler exkluderar korrekt kassan och varukorgen från att sparas i cachen.",
          icon: "✅"
        });
      }
    }
  }

  if (environment.hasWordfence && wfInfo) {
    if (environment.wfIpHeader.toLowerCase().includes("remot_addr") && 
        (environment.server.toLowerCase().includes("cloudflare") || environment.isLiteSpeedServer)) {
      alerts.push({
        type: "warning",
        title: "Wordfence IP-detektering risk",
        desc: "Wordfence är inställt på REMOTE_ADDR under en Proxy/CDN-miljö. Wordfence kan felaktigt blockera CDN-servrarnas IP vilket stoppar all trafik. Ändra IP-detektering i Wordfence till CF-Connecting-IP eller X-Forwarded-For.",
        icon: "🌐",
        wpPath: "Wordfence ➔ Allmänna inställningar ➔ IP-detektering"
      });
    }
  }

  if (sysInfo) {
    const hasLscwpLazy = uploadedSettings ? (uploadedSettings.media_lazy === "1" || uploadedSettings.media_lazy === 1 || uploadedSettings.media_lazy === true) : true;
    
    if (hasLscwpLazy && uploadedSettings && (uploadedSettings.media_lazy_native !== "1" && uploadedSettings.media_lazy_native !== 1)) {
      alerts.push({
        type: "info",
        title: "Lazy Load-konflikt: WordPress Native vs LiteSpeed",
        desc: "Både WordPress inbyggda lazyload (loading='lazy') och LiteSpeed JavaScript-lazyload är aktiva utan samordning. Rekommenderas att sätta 'Native Lazy Load' till PÅ i LiteSpeed Cache för att undvika dubbel bildanalys och layoutförskjutningar.",
        icon: "🖼️",
        wpPath: "LiteSpeed Cache ➔ Inställningar ➔ Sidoptimering ➔ [4] Media ➔ Native Lazy Load",
        targetTabId: "page_optimization_media",
        targetSettingId: "media_lazy_native"
      });
    }

    if (environment.hasElementor) {
      if (elemInfo) {
        if (environment.hasElementorLazyLoad) {
          alerts.push({
            type: "danger",
            title: "Lazyload-krock: Elementor vs LiteSpeed (Aktivt!)",
            desc: "Elementors inbyggda bild-lazyload är aktiverat i din miljö samtidigt som LiteSpeed lazyload körs. Detta orsakar dubbel bearbetning av bilder, sämre LCP och potentiella layout-hopp (CLS). Inaktivera Elementors lazyload under Elementor ➔ Inställningar ➔ Funktioner ➔ Lazy Load Images för att låta LiteSpeed hantera all lazyload.",
            icon: "🚨",
            wpPath: "Elementor ➔ Inställningar ➔ Funktioner ➔ Lazy Load Images",
            targetTabId: "page_optimization_media",
            targetSettingId: "media_lazy_exclude"
          });
        } else {
          alerts.push({
            type: "success",
            title: "Elementor Lazyload OK",
            desc: "Elementors inbyggda bild-lazyload är inaktiverat, vilket är optimalt då LiteSpeed Cache hanterar lazyloading.",
            icon: "✅"
          });
        }
      } else {
        alerts.push({
          type: "warning",
          title: "Lazyload-krock risk: Elementor vs LiteSpeed",
          desc: "Elementor upptäcktes bland aktiva tillägg. Om Elementors egna 'Lazy Load Images' är aktivt kan det krocka med LiteSpeeds optimering. Dubbelkolla inställningen eller ladda upp Elementor statusrapport (ruta 4) för automatisk verifiering.",
          icon: "⚠️",
          wpPath: "Elementor ➔ Inställningar ➔ Funktioner ➔ Lazy Load Images",
          targetTabId: "page_optimization_media",
          targetSettingId: "media_lazy_exclude"
        });
      }
    }

    if (uploadedSettings && environment.hasKustomCheckout) {
      const jsExclude = (uploadedSettings.js_exclude || "").toString().toLowerCase();
      if (!jsExclude.includes("kustom")) {
        alerts.push({
          type: "warning",
          title: "Kustom Checkout JS-konflikt risk",
          desc: "Kustom Checkout är aktivt men dess skript ('kustom') är inte exkluderat från JS-optimeringar (JS Defer/Combine). Detta kan leda till att kassan låser sig eller att ordersummeringen inte uppdateras. Lägg till 'kustom' under JS-exkluderingar.",
          icon: "🛍️",
          wpPath: "LiteSpeed Cache ➔ Inställningar ➔ Sidoptimering ➔ [3] JS ➔ JS-exkluderingar (js_exclude)",
          targetTabId: "page_optimization_js",
          targetSettingId: "js_exclude"
        });
      } else {
        alerts.push({
          type: "success",
          title: "Kustom Checkout JS-skydd OK",
          desc: "Kustom Checkout-skripten är exkluderade från JavaScript-minifieringar, vilket förhindrar konflikter i kassan.",
          icon: "✅"
        });
      }
    }

    if (uploadedSettings && environment.hasElementor && environment.hasWooCommerce) {
      const jsExclude = (uploadedSettings.js_exclude || "").toString().toLowerCase();
      const hasCartFrags = jsExclude.includes("wc-cart-fragments");
      const hasWcExclude = jsExclude.includes("woocommerce");
      
      if (!hasCartFrags || !hasWcExclude) {
        alerts.push({
          type: "warning",
          title: "Elementor Minicart uppdateringsrisk",
          desc: "Du använder Elementor och WooCommerce tillsammans (och sannolikt Elementor Minicart). För att varukorgens innehåll ska uppdateras i realtid utan cache-problem måste 'wc-cart-fragments' och 'woocommerce' exkluderas under JS-exkluderingar.",
          icon: "🛒",
          wpPath: "LiteSpeed Cache ➔ Inställningar ➔ Sidoptimering ➔ [3] JS ➔ JS-exkluderingar (js_exclude)",
          targetTabId: "page_optimization_js",
          targetSettingId: "js_exclude"
        });
      } else {
        alerts.push({
          type: "success",
          title: "Elementor Minicart JS-skydd OK",
          desc: "Tilläggsfiler för WooCommerce och kundvagns-fragment är exkluderade från JS-optimeringar, vilket säkrar minicart-uppdateringar.",
          icon: "✅"
        });
      }
    }
  }

  if (customCode) {
    if (customCode.hasOldHooks) {
      customCodeAlerts.push({
        type: "warning",
        title: "Föråldrad WooCommerce-hook upptäckt",
        desc: "Dina anpassade skript använder föråldrade WooCommerce-hooks (t.ex. `woocommerce_add_to_cart_fragments`). Detta kan bryta AJAX-kundvagnen under prestandaoptimeringar. Uppdatera till `woocommerce_add_to_cart_fragments` filter.",
        icon: "💻"
      });
    }

    if (customCode.hasRawScriptHooks) {
      customCodeAlerts.push({
        type: "warning",
        title: "Rå JavaScript utskriven i wp_head/wp_footer",
        desc: "Anpassad kod skriver ut råa `<script>`-taggar direkt i wp_head eller wp_footer istället för att registrera dem med `wp_enqueue_script`. Detta gör det omöjligt för LiteSpeed Cache att minifiera eller skjuta upp skriptet på ett säkert sätt.",
        icon: "💻"
      });
    }

    if (customCode.hasManualCacheHeaders) {
      customCodeAlerts.push({
        type: "warning",
        title: "Manuella Cache-Headers i PHP",
        desc: "Din anpassade kod skickar manuella cache- eller cookies-headers (`header('Cache-Control...')`). Detta krockar med LiteSpeeds serverbaserade cachning.",
        icon: "⚠️"
      });
    }

    if (customCodeAlerts.length === 0) {
      customCodeAlerts.push({
        type: "success",
        title: "Anpassad kod granskad: OK!",
        desc: "Inga uppenbara prestanda- eller kompatibilitetsrisker identifierades i din anpassade PHP-kod.",
        icon: "💻"
      });
    }
  }


  // --- 5. DYNAMIC EXCLUSIONS GENERATION (STABILITY-FIRST) ---
  
  let jsExcludes = [
    "jquery.js",
    "jquery.min.js",
    "wc-cart-fragments",
    "woocommerce"
  ];

  if (environment.wooGateways.length > 0) {
    environment.wooGateways.forEach(g => {
      const gLower = g.toLowerCase();
      if (gLower.includes("stripe")) jsExcludes.push("stripe.com", "stripe", "stripe-checkout");
      if (gLower.includes("klarna")) jsExcludes.push("klarna", "kco", "klarna-checkout");
      if (gLower.includes("paypal")) jsExcludes.push("paypalobjects", "paypal");
      if (gLower.includes("swish")) jsExcludes.push("swish", "bjorntech");
      if (gLower.includes("shipmondo")) jsExcludes.push("shipmondo");
      if (gLower.includes("kustom")) jsExcludes.push("kustom");
    });
  }

  // Check active plugins for CTM and GTM4WP
  let hasGtm4wp = false;
  let hasCtm = false;
  
  environment.activePlugins.forEach(p => {
    const pLower = p.toLowerCase();
    if (pLower.includes("gtm4wp")) hasGtm4wp = true;
    if (pLower.includes("consent & tracking manager") || pLower.includes("consent-tracking-manager") || pLower.includes("arewee")) hasCtm = true;
  });

  if (hasGtm4wp) {
    jsExcludes.push("gtm4wp", "gtm");
  }
  if (hasCtm) {
    jsExcludes.push("consent", "arewee", "consent-tracking");
  } else if (environment.activePlugins.some(p => p.toLowerCase().includes("consent") || p.toLowerCase().includes("tracking"))) {
    jsExcludes.push("consent", "tracking-manager", "arewee");
  }

  const jsExcludesString = jsExcludes.join("\n");

  let cssExcludes = [
    "elementor-icons",
    "astra-theme-css"
  ];
  const cssExcludesString = cssExcludes.join("\n");

  let lazyExcludes = [
    "logo",
    "hero",
    "wp-post-image",
    "attachment-shop_single",
    "woocommerce-product-gallery__image"
  ];
  const lazyExcludesString = lazyExcludes.join("\n");

  const tabs = [
    {
      id: "general",
      title: "Generellt (General)",
      options: [
        {
          id: "auto_upgrade",
          title: "Automatisk uppgradering",
          value: 1,
          desc: "Aktiverar automatiska uppdateringar av LiteSpeed Cache-tillägget för maximal säkerhet.",
          safe: true,
          category: "finetuning",
          citations: {
            litespeed: "LiteSpeed Technologies rekommenderar starkt automatiska uppdateringar för att snabbt täcka kända sårbarheter och bibehålla serverkompatibilitet.",
            consensus: "Full konsensus. Samtliga säkerhetsexperter (t.ex. Patchstack, Wordfence) rekommenderar automatiska plugin-uppdateringar för kritiska tillägg."
          }
        },
        {
          id: "domain_key",
          title: "Begär domännyckel (Domain Key)",
          value: 1,
          desc: "Krävs för bildoptimering och molnbaserad CSS-generering via QUIC.cloud.",
          safe: true,
          category: "finetuning",
          citations: {
            litespeed: "Krävs för att ansluta sajten till QUIC.cloud API for avancerad bildkomprimering och kritiskt CSS-skaparverktyg.",
            consensus: "Nödvändig nyckel om du ska använda LiteSpeeds molnbaserade funktioner. Det finns inga kända nackdelar eller spridda åsikter."
          }
        },
        {
          id: "guest_mode",
          title: "Gästläge (Guest Mode)",
          value: 0,
          desc: "Rekommenderas AV för maximal stabilitet. Gästläge kan orsaka layoutproblem eller visa felaktigt innehåll för e-handelsbesökare.",
          safe: true,
          category: "stability",
          citations: {
            litespeed: "LiteSpeed föreslår PÅ som standard för att ge förstabesökare en ögonblicklig laddningstid via för-cachad gästhink.",
            consensus: "Delade åsikter / Hög risk! Core WordPress-utvecklare och e-handelsexperter avråder starkt från Gästläge på WooCommerce-sajter då det ofta serverar 'stela' cache-sessioner som döljer kundkorgar och orsakar allvarliga betalningsfel."
          }
        }
      ]
    },
    {
      id: "cache",
      title: "Cachning (Cache)",
      options: [
        {
          id: "cache_priv",
          title: "Cacha inloggade användare",
          value: 1,
          desc: "Cachar sidor för inloggade administratörer separat. Mycket säkert.",
          safe: true,
          category: "finetuning",
          citations: {
            litespeed: "Rekommenderar PÅ. LiteSpeed servern hanterar inloggade cache-kakor (cookies) separat och säkert på servernivå.",
            consensus: "Konsensus råder. Mycket fördelaktigt för att spara serverresurser när administratörer och butikschefer redigerar i adminpanelen."
          }
        },
        {
          id: "cache_commenter",
          title: "Cacha kommentatorer",
          value: 0,
          desc: "Bör vara AV för att förhindra att personer som precis skrivit en kommentar felaktigt ser cachat innehåll.",
          safe: true,
          category: "finetuning",
          citations: {
            litespeed: "Rekommenderar AV för att säkerställa att besökare som interagerar med kommentarer direkt ser sin publicerade kommentar utan cache-fördröjning.",
            consensus: "Full konsensus bland webbutvecklare för att undvika förvirrande UX vid blogg-diskussioner."
          }
        },
        {
          id: "cache_rest",
          title: "Cacha REST API",
          value: 1,
          desc: "Cachar anrop från WordPress REST API, vilket snabbar upp moderna blockredigerare.",
          safe: true,
          category: "performance",
          citations: {
            litespeed: "Rekommenderar PÅ för att reducera serverbelastning orsakad av konstanta asynkrona REST API-anrop.",
            consensus: "Mestadels konsensus. Kan i sällsynta fall störa externa live-integrationer, men för standard WordPress block-editor (Gutenberg) är det säkert och starkt rekommenderat."
          }
        },
        {
          id: "cache_page_login",
          title: "Cacha inloggningssida",
          value: 1,
          desc: "Skyddar servern genom att cacha standardinloggningssidan, vilket drastiskt minskar brute-force inloggningsattacker.",
          safe: true,
          category: "finetuning",
          citations: {
            litespeed: "Rekommenderar PÅ. Inloggningssidan är ett vanligt mål för brute-force bots, att cacha den skyddar serverresurserna från att bottna.",
            consensus: "Enighet råder bland säkerhetsexperter. Detta är ett utmärkt komplement till Wordfence-skyddet."
          }
        },
        {
          id: "cache_mobile",
          title: "Mobil cache",
          value: 0,
          desc: "Bör vara AV eftersom ditt aktiva tema (Astra) är responsivt. Sparar diskutrymme på servern.",
          safe: true,
          category: "finetuning",
          citations: {
            litespeed: "LiteSpeed rekommenderar PÅ endast om sajten serverar helt olika mobilmallar (t.ex. via WP-Touch eller nischade mobilteman).",
            consensus: "Full konsensus. Moderna responsiva teman (som Astra) anpassar layouten i webbläsaren via CSS, inte på servern. Att ha mobil cache PÅ halverar bara diskutrymmet i onödan."
          }
        },
        {
          id: "drop_uri",
          title: "Exkluderade sidor (drop_uri)",
          value: "/checkout*\n/cart*\n/kassa*\n/varukorg*",
          desc: "Sid-exkluderingar som garanterat skyddas från all cachning. Helt nödvändigt för e-handelsfunktion.",
          safe: true,
          category: "stability",
          citations: {
            litespeed: "Kräver att känsliga sidor som kassa och personliga konton exkluderas för att förhindra session-läckor.",
            consensus: "Stenfast konsensus bland e-handelsexperter. Utan dessa exkluderingar kommer kunder förr eller senare se andras sessionsuppgifter eller inte kunna slutföra köp."
          }
        },
        {
          id: "esi_enabled",
          title: "ESI (Edge Side Includes)",
          value: environment.isLiteSpeedServer && environment.hasWooCommerce ? 1 : 0,
          desc: environment.isLiteSpeedServer && environment.hasWooCommerce 
            ? "REKOMMENDERAS PÅ: Eftersom du har en LiteSpeed-server och e-handel tillåter ESI att du cachar hela sidans layout men håller kundvagnen dynamisk."
            : "Rekommenderas AV. Kräver en äkta LiteSpeed-server.",
          safe: true,
          category: "finetuning",
          citations: {
            litespeed: "LiteSpeeds flaggskeppsteknik. Tillåter att e-handelsmallar cachas fullt ut på servernivå, medan dynamiska moduler (som kundvagnen i Astra-headern) läses in via ESI-hål.",
            consensus: "Mycket kraftfullt men kräver att servern stöder LiteSpeed Enterprise/OpenLiteSpeed. Utvecklare är eniga om att det är en 'game-changer' för tunga e-handelsbutiker."
          }
        },
        {
          id: "object_cache",
          title: "Objekts-cachning (Object Cache)",
          value: environment.hasObjectCache ? 1 : 0,
          desc: environment.hasObjectCache 
            ? "REKOMMENDERAS PÅ: En objektcache-dropin hittades! Att ha detta aktivt i LiteSpeed accelererar databasförfrågningar för din WooCommerce-kassa."
            : "Rekommenderas AV tills en Redis/Memcached-server är konfigurerad på ditt webbhotell.",
          safe: true,
          category: "finetuning",
          citations: {
            litespeed: "Objektcachning minskar databasbelastningen dramatiskt genom att hålla färdiga databasfrågor lagrade i serverminnet.",
            consensus: "Enighet råder bland WP-utvecklare: Objekts-cachning (Redis/Memcached) är det viktigaste steget för att accelerera WooCommerce-admin och kassans hastighet."
          }
        },
        {
          id: "cache_browser",
          title: "Webbläsarcachning (Browser Cache)",
          value: 1,
          desc: "Sparar statiska resurser lokalt i besökarens webbläsare så att återkommande besök laddas ögonblickligen.",
          safe: true,
          category: "performance",
          citations: {
            litespeed: "Rekommenderar PÅ för att skriva korrekta utgångs-headers till webbläsaren via webbplatsens .htaccess-fil.",
            consensus: "100% konsensus. Google Lighthouse och alla prestandaexperter kräver webbläsarcachning för godkända prestandabetyg."
          }
        }
      ]
    },
    {
      id: "page_optimization_css",
      title: "Sidoptimering - CSS",
      options: [
        {
          id: "css_minify",
          title: "CSS Minifiering",
          value: 1,
          desc: "Tar bort radbrytningar och onödigt tomrum från CSS-filer för att minska deras filstorlek. Mycket säkert prestandalyft.",
          safe: true,
          category: "performance",
          citations: {
            litespeed: "Rekommenderar PÅ för att krympa CSS-storleken som skickas över nätverket.",
            consensus: "Konsensus råder. Minifiering är extremt säkert då det endast ändrar filens formatering (tar bort mellanslag), inte dess renderings-ordning eller funktion."
          }
        },
        {
          id: "css_combine",
          title: "CSS Kombinering (CSS Combine)",
          value: 0,
          desc: "REKOMMENDERAS AV: På grund av Elementor och HTTP/2/3 är det mycket säkrare att ladda filerna separat. Kombinering riskerar att bryta Astras eller Elementors layout-ordning.",
          safe: false,
          category: "stability",
          citations: {
            litespeed: "Föreslår PÅ i sina äldre standardinställningar för att minska antalet HTTP-begäran i äldre HTTP/1.1-miljöer.",
            consensus: "Delade åsikter / Starkt avrått i modern tid! Google Web Dev, GTmetrix och WP Rocket avråder starkt från CSS-kombinering på moderna servrar som stöder HTTP/2 eller HTTP/3 multiplexing. Att slå samman alla stiler till en jättefil orsakar render-blockering (längre First Contentful Paint) och raderar cache-fördelarna så fort du ändrar en enda CSS-rad."
          }
        },
        {
          id: "css_combined_priority",
          title: "CSS Kombinera prioriterat",
          value: 0,
          desc: "Bör vara AV när CSS-kombinering är inaktiverat för att undvika onödig serverbearbetning.",
          safe: true,
          category: "finetuning",
          citations: {
            litespeed: "Behöver endast justeras om CSS Combine är aktivt för att bestämma laddningsordning på det kombinerade paketet.",
            consensus: "Rör inte denna inställning om CSS Combine är avstängt, det ger bara onödig serverbelastning."
          }
        },
        {
          id: "css_exclude",
          title: "Undantagna CSS-filer",
          value: cssExcludesString,
          desc: "Specificerar CSS-skript som inte ska slås samman eller minifieras, vilket skyddar stilar.",
          safe: true,
          category: "stability",
          citations: {
            litespeed: "Tillhandahåller listan så att utvecklare manuellt kan exkludera trasiga eller ordningskänsliga CSS-filer från optimeringar.",
            consensus: "Viktigt verktyg för felsökning. Teman som Astra har dynamisk CSS som ständigt ändras och bör undantas vid eventuell CSS-kombinering."
          }
        },
        {
          id: "css_preload",
          title: "CSS Förladdning (Preload)",
          value: 1,
          desc: "Laddar in viktiga CSS-filer tidigare i renderingsprocessen för att motverka render-blocking CSS-varningar.",
          safe: true,
          category: "performance",
          citations: {
            litespeed: "Rekommenderar PÅ för att låta webbläsaren upptäcka och prioritera kritiska stilfiler tidigt.",
            consensus: "Konsensus råder. Mycket effektivt för att motverka render-blocking CSS-varningar i Google Lighthouse."
          }
        },
        {
          id: "font_display",
          title: "Font Display Optimerare",
          value: "swap",
          desc: "Lägger till 'font-display: swap' på alla typsnitt. Gör att texten visas direkt med ett fallback-typsnitt.",
          safe: true,
          category: "performance",
          citations: {
            litespeed: "Rekommenderar 'swap' för att förhindra det kända problemet med 'Invisible Text During Font Load' (FOIT).",
            consensus: "100% konsensus bland webbprestandaexperter. Att använda 'swap' ger omedelbar synlighet för texten och förbättrar användarupplevelsen dramatiskt på mobila enheter."
          }
        }
      ]
    },
    {
      id: "page_optimization_js",
      title: "Sidoptimering - JS",
      options: [
        {
          id: "js_minify",
          title: "JS Minifiering",
          value: 1,
          desc: "Minskar storleken på JavaScript-filer på ett säkert sätt genom att komprimera koden.",
          safe: true,
          category: "performance",
          citations: {
            litespeed: "Rekommenderar PÅ för att minska JavaScript-filernas nedladdningsvikt.",
            consensus: "Full enighet. JS-minifiering är mycket säkert då det inte förändrar skriptets inbördes ordning eller exekveringstid."
          }
        },
        {
          id: "js_combine",
          title: "JS Kombinering (JS Combine)",
          value: 0,
          desc: "REKOMMENDERAS STARKT AV: Att slå på detta bryter ofta e-handels- och kassafunktioner (som Kustom Checkout och Klarna).",
          safe: false,
          category: "stability",
          citations: {
            litespeed: "Förespråkar kombinering i sina standardprofiler för att minska anslutningsköer under HTTP/1.1.",
            consensus: "Enighet mot kombinering på e-handel! Alla ledande PageSpeed-utvecklare (inklusive Google Web Dev och WP Rocket) avråder starkt från JS-kombinering på moderna e-handelssajter. Att lägga alla JS-filer i en stor fil blockerar exekvering och är den absolut största källan till att betalningskassor (Klarna, Stripe) slutar fungera."
          }
        },
        {
          id: "js_defer",
          title: "Skjut upp laddning (JS Defer)",
          value: 1,
          desc: "Låter webbläsaren bygga och visa hela sidan först, och köra JavaScript i bakgrunden. Ger ett stort prestandalyft.",
          safe: true,
          category: "performance",
          citations: {
            litespeed: "Rekommenderar PÅ för att ta bort blockerande skript-exekvering under den initiala sidrenderingstiden.",
            consensus: "Hög konsensus. Att skjuta upp JavaScript (Defer) är det i särklass säkraste sättet att radera render-blocking JavaScript i Google Lighthouse, utan att bryta källkodens exekveringsordning."
          }
        },
        {
          id: "js_exclude",
          title: "Undantagna JS-filer",
          value: jsExcludesString,
          desc: "Säkerställer att kritiska JavaScript-filer laddas normalt och inte skjuts upp eller slås samman.",
          safe: true,
          category: "stability",
          citations: {
            litespeed: "Erbjuder uteslutningsfältet så datatekniker manuellt kan exkludera instabila JS-bibliotek (t.ex. betalningsgateways).",
            consensus: "Helt avgörande! På WooCommerce-sajter råder det 100% konsensus om att betalsätt (Stripe, Klarna, PayPal) och kundvagns-kakor (fragments) absolut MÅSTE exkluderas från sammanslagning eller aggresiv Defer för att garantera att kassan inte låser sig."
          }
        }
      ]
    },
    {
      id: "page_optimization_media",
      title: "Sidoptimering - Media",
      options: [
        {
          id: "media_lazy",
          title: "Lazy Load Bilder",
          value: 1,
          desc: "Laddar endast bilder som är synliga på skärmen just nu. Förbättrar laddningstiden (LCP) dramatiskt.",
          safe: true,
          category: "performance",
          citations: {
            litespeed: "Rekommenderar PÅ för att spara bandbredd och reducera initial laddningstid för bildtunga sidor.",
            consensus: "Full konsensus. Lazy loading är en av de mest grundläggande och säkraste prestandaoptimeringarna som finns."
          }
        },
        {
          id: "media_lazy_native",
          title: "Native Lazy Load",
          value: 1,
          desc: "Samordnar LiteSpeeds lazyload med WordPress inbyggda bild-lazyload, vilket förhindrar dubbel bildbearbetning.",
          safe: true,
          category: "performance",
          citations: {
            litespeed: "LiteSpeed Cache stöder att synkronisera JS-platshållare med WordPress native loading='lazy' taggar.",
            consensus: "Rekommenderas PÅ för att ge webbläsaren en enhetlig instruktion och förhindra layout-hopp (CLS) som uppstår om två olika system försöker lazy-loada samma bild."
          }
        },
        {
          id: "media_lazy_placeholder",
          title: "Lazy Load Platshållare",
          value: 1,
          desc: "Visar en platshållare under tiden en bild laddas in, vilket motverkar layout-hopp.",
          safe: true,
          category: "performance",
          citations: {
            litespeed: "Rekommenderar PÅ. LiteSpeed ritar en lättviktig SVG-platshållare med bildens exakta dimensioner i HTML-koden.",
            consensus: "Konsensus råder. Platshållare med fasta höjder och bredder är det viktigaste steget för att eliminera CLS-förskjutningar i Lighthouse."
          }
        },
        {
          id: "media_lazy_exclude",
          title: "Undantagna Lazy Load-bilder",
          value: lazyExcludesString,
          desc: "Helt nödvändigt för LCP! Undantar bilder ovanför sidvecket (t.ex. sajt-logotypen, produktgalleriet eller hjältebilder) från lazyload.",
          safe: true,
          category: "performance",
          citations: {
            litespeed: "Erbjuder exkludering via bild-klasser eller filnamn så att framträdande bilder kan undantas från att fördröjas.",
            consensus: "Kritiskt för LCP (Largest Contentful Paint)! Google Web Dev och prestandaspecialister varnar för att lazy-loada sajt-loggan eller herobilden i sidans topp, eftersom det fördröjer renderingen av sidans viktigaste visuella element. Dessa bilder bör ALLTID exkluderas och laddas direkt med högsta prioritet."
          }
        },
        {
          id: "media_iframe_lazy",
          title: "Lazy Load Iframes",
          value: 1,
          desc: "Skjuter upp laddningen av tunga iframes (som YouTube-spelare, Google Maps etc.) tills besökaren skrollar ner till dem.",
          safe: true,
          category: "performance",
          citations: {
            litespeed: "Rekommenderar PÅ för att blockera iframes från att konsumera nätverksresurser innan de är synliga.",
            consensus: "Konsensus råder. Externa iframes (t.ex. YouTube-videor) är extremt tunga då de ofta laddar in egna JS-bibliotek i bakgrunden. Att lazy-loada dem sparar enormt mycket laddningstid."
          }
        }
      ]
    },
    {
      id: "crawler",
      title: "LiteSpeed Crawler",
      options: [
        {
          id: "crawler",
          title: "Aktivera sökspindel",
          value: environment.isLiteSpeedServer ? 1 : 0,
          desc: environment.isLiteSpeedServer 
            ? "REKOMMENDERAS PÅ: Sökspindeln arbetar i bakgrunden för att för-cacha sidor. Besökare möts alltid av en färdigcachad och blixtsnabb sida!"
            : "Rekommenderas AV. Kräver en äkta LiteSpeed-server.",
          safe: true,
          category: "finetuning",
          citations: {
            litespeed: "LiteSpeeds paradfunktion. Sökspindeln läser av din sitemap och för-cachrar automatiskt alla sidor som har löpt ut, vilket garanterar att en besökare ALDRIG möts av en okachad (långsam) sida.",
            consensus: "Mycket starkt rekommenderat. Det är en av de största prestandafördelarna med att köra på en LiteSpeed-server framför Nginx/Apache. Se dock till att vitlista serverns IP i Wordfence så att spindeln inte av misstag blockeras."
          }
        }
      ]
    },
    {
      id: "woocommerce",
      title: "WooCommerce",
      options: [
        {
          id: "woo_hpos",
          title: "High-Performance Order Storage (HPOS)",
          value: 1,
          desc: "Aktiverar HPOS (High-Performance Order Storage) i WooCommerce. Detta flyttar orderdata till dedikerade databastabeller vilket ökar prestandan i kassan med upp till 40%.",
          safe: true,
          category: "performance",
          citations: {
            litespeed: "LiteSpeed stöder HPOS till fullo och drar nytta av snabbare databasfrågor.",
            consensus: "HPOS är standard i alla nya WooCommerce-installationer och rekommenderas starkt av Automattic för stabilitet."
          },
          wpPath: "WooCommerce ➔ Inställningar ➔ Avancerat ➔ Funktioner ➔ High-Performance Order Storage"
        },
        {
          id: "woo_cart_fragments",
          title: "Bortkoppling av wc-cart-fragments",
          value: 1,
          desc: "Bortkopplar wc-cart-fragments JavaScript på icke-shoppar för att spara tunga admin-ajax.php-resurser.",
          safe: true,
          category: "performance",
          citations: {
            litespeed: "wc-cart-fragments är en av de största källorna till höga svarstider (TTFB) på WordPress-sajter.",
            consensus: "Enighet bland utvecklare om att dequeuea fragments där det inte behövs."
          },
          wpPath: "Hanteras via det genererade Code Snippet-tillägget."
        },
        {
          id: "woo_transients_cleanup",
          title: "Automatisk transient-rensning",
          value: 1,
          desc: "Rensar automatiskt utgångna transients från WooCommerce-kunder för att förhindra databas-uppsvällning.",
          safe: true,
          category: "finetuning",
          citations: {
            litespeed: "En ren databas ger snabbare svarstider under cache-bypass-förfrågningar.",
            consensus: "Viktigt för storskaliga WooCommerce-sajter."
          },
          wpPath: "Hanteras via det genererade PHP-tillägget."
        },
        {
          id: "woo_checkout_exclusion",
          title: "Kassacachning undantagen (drop_uri)",
          value: 1,
          desc: "Säkerställer att kassasidor (/checkout*, /kassa*) exkluderas under drop_uri i LiteSpeed Cache.",
          safe: true,
          category: "stability",
          citations: {
            litespeed: "Nödvändigt för att förhindra sessionsläckor på e-handelssajter.",
            consensus: "Fullständigt krav. Kundens personuppgifter får aldrig sparas i cachen."
          },
          wpPath: "LiteSpeed Cache ➔ Inställningar ➔ Cache ➔ [4] Exkludera ➔ drop_uri"
        }
      ]
    },
    {
      id: "elementor",
      title: "Elementor Pro",
      options: [
        {
          id: "elem_css_print_method",
          title: "CSS-skrivmetod (External file)",
          value: "external",
          desc: "Ställer in Elementors CSS-utmatning till 'Extern fil' istället för 'Inbäddad CSS' så att filerna kan cachas av webbläsaren.",
          safe: true,
          category: "performance",
          citations: {
            litespeed: "LiteSpeed Cache kräver externa filer för att kunna utföra CSS-optimering och asynkron laddning.",
            consensus: "Inbäddad CSS ökar HTML-storleken och gör sajten tyngre."
          },
          wpPath: "Elementor ➔ Inställningar ➔ Avancerat ➔ CSS-skrivmetod"
        },
        {
          id: "elem_dom_optimization",
          title: "Optimera DOM-utmatning",
          value: 1,
          desc: "Aktiverar Elementors experimentella DOM-optimering för att ta bort onödiga omslutande div-taggar.",
          safe: true,
          category: "performance",
          citations: {
            litespeed: "Färre DOM-noder minskar minnesförbrukningen och påskyndar sidrendering.",
            consensus: "Kritiskt för Google PageSpeed-betyg."
          },
          wpPath: "Elementor ➔ Inställningar ➔ Funktioner ➔ Optimized DOM Output"
        },
        {
          id: "elem_asset_loading",
          title: "Förbättrad laddning av tillgångar",
          value: 1,
          desc: "Laddar endast de Elementor JavaScript-bibliotek som faktiskt används på den aktuella sidan.",
          safe: true,
          category: "performance",
          citations: {
            litespeed: "Minskar mängden kod som skickas via JS-defer.",
            consensus: "Minskar initial JS-vikt på icke-redigeringssidor."
          },
          wpPath: "Elementor ➔ Inställningar ➔ Funktioner ➔ Improved Asset Loading"
        },
        {
          id: "elem_css_loading",
          title: "Förbättrad CSS-laddning",
          value: 1,
          desc: "Delar upp Elementors stilar i mindre bitar och laddar dem asynkront.",
          safe: true,
          category: "performance",
          citations: {
            litespeed: "Samverkar perfekt med LiteSpeeds CSS-preload.",
            consensus: "Förbättrar renderingstiden på mobila enheter."
          },
          wpPath: "Elementor ➔ Inställningar ➔ Funktioner ➔ Improved CSS Loading"
        },
        {
          id: "elem_lazy_load",
          title: "Stäng av Elementors Lazy Load Images",
          value: 0,
          desc: "Elementors egna lazyload bör vara AV eftersom LiteSpeed Cache sköter lazy loading på ett mer avancerat sätt.",
          safe: true,
          category: "stability",
          citations: {
            litespeed: "Dubbel lazyloading orsakar renderingsfel och krockar.",
            consensus: "Endast en motor bör sköta bild-lazyloading på en sajt."
          },
          wpPath: "Elementor ➔ Inställningar ➔ Funktioner ➔ Lazy Load Images"
        }
      ]
    },
    {
      id: "wordfence",
      title: "Wordfence",
      options: [
        {
          id: "wf_live_traffic",
          title: "Inaktivera Live Traffic-loggning",
          value: 0,
          desc: "Inaktiverar eller begränsar Wordfence 'Live Traffic' till endast säkerhetshändelser för att spara databasresurser.",
          safe: true,
          category: "performance",
          citations: {
            litespeed: "Tunga skrivningar under varje klick sänker serverns svarstid under trafiktoppar.",
            consensus: "Full konsensus: Live Traffic loggning är den enskilt största prestandaboven i Wordfence."
          },
          wpPath: "Wordfence ➔ Globala inställningar ➔ Inställningar för Live Traffic-vy ➔ Trafikloggningsläge"
        },
        {
          id: "wf_ip_header",
          title: "IP-detektering för Crawler",
          value: "CF-Connecting-IP",
          desc: "Konfigurerar Wordfence att läsa besökarens IP via rätt proxy-header ifall sajten kör Cloudflare eller LiteSpeed-server.",
          safe: true,
          category: "stability",
          citations: {
            litespeed: "LiteSpeed Crawlers begäran måste identifieras korrekt av Wordfence så att de inte blockeras.",
            consensus: "Nödvändigt steg vid körning bakom CDN för att undvika blockering av legitima anrop."
          },
          wpPath: "Wordfence ➔ Allmänna inställningar ➔ IP-detektering"
        },
        {
          id: "wf_low_resource",
          title: "Låg-resurs-läge för scanning",
          value: 1,
          desc: "Begränsar Wordfence skanner-resursanvändning under schemalagda genomsökningar. Rekommenderas för shared hosting.",
          safe: true,
          category: "stability",
          citations: {
            litespeed: "Wordfence standardscans kan orsaka CPU-spikar som ger tillfälliga 503-fel.",
            consensus: "Viktigt för att hålla sajten stabil under scans."
          },
          wpPath: "Wordfence ➔ Skanna ➔ Skanningsalternativ ➔ Låg resursanvändning"
        }
      ]
    },
    {
      id: "customcode",
      title: "Child Theme & Snippets",
      options: [
        {
          id: "cc_limit_heartbeat",
          title: "Begränsa WordPress Heartbeat API",
          value: 1,
          desc: "Begränsar WordPress Heartbeat API-anrop från 15s till 120s för att spara CPU-användning i adminpanelen.",
          safe: true,
          category: "performance",
          citations: {
            litespeed: "Heartbeat genererar tunga, ocachbara AJAX-förfrågningar till admin-ajax.php.",
            consensus: "Standardprestandaåtgärd. Bör begränsas eller stängas av helt."
          },
          wpPath: "Hanteras via den genererade Auto-Optimizer PHP-koden."
        },
        {
          id: "cc_disable_xmlrpc",
          title: "Inaktivera XML-RPC API",
          value: 1,
          desc: "Inaktiverar XML-RPC API:t i WordPress, vilket sparar serverresurser och skyddar mot DDoS- och brute-force-attacker.",
          safe: true,
          category: "security",
          citations: {
            litespeed: "Skyddar serverns processer från att överbelastas av brute-force XML-RPC pingback-attacker.",
            consensus: "Viktigt skydd för alla sajter som inte använder externa mobil-appar."
          },
          wpPath: "Hanteras via den genererade Auto-Optimizer PHP-koden."
        },
        {
          id: "cc_disable_pingbacks",
          title: "Inaktivera själv-pingbacks",
          value: 1,
          desc: "Förhindrar att WordPress skickar pingbacks till sig själv när du länkar till dina egna inlägg.",
          safe: true,
          category: "performance",
          citations: {
            litespeed: "Minskar onödiga interna serveranrop.",
            consensus: "Rekommenderas för alla WordPress-bloggar."
          },
          wpPath: "Hanteras via den genererade Auto-Optimizer PHP-koden."
        },
        {
          id: "cc_disable_emojis",
          title: "Inaktivera Emojis scripts",
          value: 1,
          desc: "Inaktiverar WordPress emoji-stödkod. Moderna webbläsare ritar emojis inbyggt, så detta JS/CSS-skript är onödigt.",
          safe: true,
          category: "performance",
          citations: {
            litespeed: "Tar bort ett onödigt JS-anrop som blockerar First Contentful Paint.",
            consensus: "Fullständig enighet bland prestandautvecklare."
          },
          wpPath: "Hanteras via den genererade Auto-Optimizer PHP-koden."
        }
      ]
    }
  ];

  const recommendationsOutput = [];
  tabs.forEach(tab => {
    const recTab = {
      id: tab.id,
      title: tab.title,
      options: []
    };

    tab.options.forEach(opt => {
      let isChangedNeeded = false;
      let currentValue = null;
      let displayCurrentValue = "Ej angivet";

      const isLscwpTab = ["general", "cache", "page_optimization_css", "page_optimization_js", "page_optimization_media", "crawler"].includes(tab.id);

      if (isLscwpTab) {
        if (uploadedSettings) {
          const uploadedKey = opt.id;
          currentValue = uploadedSettings.hasOwnProperty(uploadedKey) ? uploadedSettings[uploadedKey] : "";
          
          const curValNorm = (currentValue === "1" || currentValue === 1 || currentValue === "on" || currentValue === true || currentValue === "swap") ? 1 : 0;
          const recValNorm = (opt.value === "1" || opt.value === 1 || opt.value === "on" || opt.value === true || opt.value === "swap") ? 1 : 0;

          if (typeof opt.value === "string" && (opt.id === "js_exclude" || opt.id === "css_exclude" || opt.id === "media_lazy_exclude" || opt.id === "drop_uri")) {
            let missingExcludes = checkMissingExclusions(currentValue, opt.value);
            
            if (opt.id === "drop_uri") {
              const cleanCur = (currentValue || "").toString().toLowerCase();
              const hasCheckout = cleanCur.includes("checkout") || cleanCur.includes("kassa");
              const hasCart = cleanCur.includes("cart") || cleanCur.includes("varukorg");
              if (hasCheckout && hasCart) {
                missingExcludes = [];
              }
            }

            if (missingExcludes.length > 0) {
              isChangedNeeded = true;
              displayCurrentValue = currentValue ? "Saknar exkluderingar" : "Ej angivet";
            } else {
              isChangedNeeded = false;
              displayCurrentValue = "Matchar";
            }
          } else if (curValNorm !== recValNorm) {
            isChangedNeeded = true;
            displayCurrentValue = curValNorm === 1 ? "PÅ" : "AV";
          } else {
            displayCurrentValue = curValNorm === 1 ? "PÅ" : "AV";
          }
        }
      } else {
        // Tool-specific options (WooCommerce, Elementor, Wordfence, CustomCode)
        let toolUploaded = false;
        
        if (tab.id === "woocommerce") {
          toolUploaded = !!wooInfo;
          if (wooInfo) {
            if (opt.id === "woo_hpos") {
              currentValue = wooInfo.hpos_enabled ? 1 : 0;
              displayCurrentValue = wooInfo.hpos_enabled ? "PÅ" : "AV";
            } else if (opt.id === "woo_cart_fragments") {
              currentValue = wooInfo.cart_fragments_dequeued ? 1 : 0;
              displayCurrentValue = wooInfo.cart_fragments_dequeued ? "AV" : "PÅ";
            } else if (opt.id === "woo_transients_cleanup") {
              currentValue = wooInfo.transients_cleanup_enabled ? 1 : 0;
              displayCurrentValue = wooInfo.transients_cleanup_enabled ? "PÅ" : "AV";
            } else if (opt.id === "woo_checkout_exclusion") {
              const dropUri = uploadedSettings ? (uploadedSettings.drop_uri || "").toLowerCase() : "";
              const isExcl = dropUri.includes("checkout") || dropUri.includes("kassa");
              currentValue = isExcl ? 1 : 0;
              displayCurrentValue = isExcl ? "PÅ" : "AV";
            }
          }
        } else if (tab.id === "elementor") {
          toolUploaded = !!elemInfo;
          if (elemInfo) {
            if (opt.id === "elem_css_print_method") {
              currentValue = elemInfo.css_print_method;
              displayCurrentValue = currentValue === "external" ? "Extern fil" : "Inbäddad";
            } else if (opt.id === "elem_dom_optimization") {
              const active = elemInfo.experiments.some(e => e.toLowerCase().includes("dom") || e.toLowerCase().includes("optimized_dom"));
              currentValue = active ? 1 : 0;
              displayCurrentValue = active ? "PÅ" : "AV";
            } else if (opt.id === "elem_asset_loading") {
              const active = elemInfo.experiments.some(e => e.toLowerCase().includes("asset") || e.toLowerCase().includes("improved_asset"));
              currentValue = active ? 1 : 0;
              displayCurrentValue = active ? "PÅ" : "AV";
            } else if (opt.id === "elem_css_loading") {
              const active = elemInfo.experiments.some(e => e.toLowerCase().includes("css") || e.toLowerCase().includes("improved_css"));
              currentValue = active ? 1 : 0;
              displayCurrentValue = active ? "PÅ" : "AV";
            } else if (opt.id === "elem_lazy_load") {
              currentValue = elemInfo.hasLazyLoad ? 1 : 0;
              displayCurrentValue = elemInfo.hasLazyLoad ? "PÅ" : "AV";
            }
          }
        } else if (tab.id === "wordfence") {
          toolUploaded = !!wfInfo;
          if (wfInfo) {
            if (opt.id === "wf_live_traffic") {
              currentValue = wfInfo.live_traffic_disabled ? 1 : 0;
              displayCurrentValue = wfInfo.live_traffic_disabled ? "AV" : "PÅ";
            } else if (opt.id === "wf_ip_header") {
              currentValue = wfInfo.ip_header;
              displayCurrentValue = wfInfo.ip_header || "Okänd";
            } else if (opt.id === "wf_low_resource") {
              currentValue = wfInfo.low_resource_scan ? 1 : 0;
              displayCurrentValue = wfInfo.low_resource_scan ? "PÅ" : "AV";
            } else if (opt.id === "wf_crawler_whitelisting") {
              currentValue = wfInfo.crawler_whitelisted ? 1 : 0;
              displayCurrentValue = wfInfo.crawler_whitelisted ? "PÅ" : "AV";
            }
          }
        } else if (tab.id === "customcode") {
          toolUploaded = !!customCode;
          if (customCode) {
            if (opt.id === "cc_limit_heartbeat") {
              currentValue = customCode.hasHeartbeatLimited ? 1 : 0;
              displayCurrentValue = customCode.hasHeartbeatLimited ? "PÅ" : "AV";
            } else if (opt.id === "cc_disable_xmlrpc") {
              currentValue = customCode.hasXmlRpcDisabled ? 1 : 0;
              displayCurrentValue = customCode.hasXmlRpcDisabled ? "PÅ" : "AV";
            } else if (opt.id === "cc_disable_pingbacks") {
              currentValue = customCode.hasPingbacksDisabled ? 1 : 0;
              displayCurrentValue = customCode.hasPingbacksDisabled ? "PÅ" : "AV";
            } else if (opt.id === "cc_disable_emojis") {
              currentValue = customCode.hasEmojisDisabled ? 1 : 0;
              displayCurrentValue = customCode.hasEmojisDisabled ? "PÅ" : "AV";
            }
          }
        }

        if (toolUploaded) {
          const curValNorm = (currentValue === "1" || currentValue === 1 || currentValue === "on" || currentValue === true || currentValue === "external" || currentValue === "CF-Connecting-IP") ? 1 : 0;
          const recValNorm = (opt.value === "1" || opt.value === 1 || opt.value === "on" || opt.value === true || opt.value === "external" || opt.value === "CF-Connecting-IP") ? 1 : 0;
          
          if (curValNorm !== recValNorm) {
            isChangedNeeded = true;
          }
        }
      }

      recTab.options.push({
        id: opt.id,
        title: opt.title,
        recommendedValue: typeof opt.value === "string" ? (opt.value === "external" ? "Extern fil" : "ANPASSAD") : (opt.value === 1 ? "PÅ" : "AV"),
        recommendedRaw: opt.value,
        currentValue: displayCurrentValue,
        currentRaw: currentValue,
        isChangedNeeded: isChangedNeeded,
        desc: opt.desc,
        safe: opt.safe,
        category: opt.category || "finetuning",
        citations: opt.citations || null,
        wpPath: opt.wpPath || null
      });
    });

    recommendationsOutput.push(recTab);
  });

  // Flag settings deviations if there are any
  if (uploadedSettings) {
    let deviationCount = 0;
    recommendationsOutput.forEach(tab => {
      // Only LSCWP tab deviations trigger the LiteSpeed settings deviation count
      const isLscwpTab = ["general", "cache", "page_optimization_css", "page_optimization_js", "page_optimization_media", "crawler"].includes(tab.id);
      if (isLscwpTab) {
        tab.options.forEach(opt => {
          if (opt.isChangedNeeded) {
            deviationCount++;
          }
        });
      }
    });

    if (deviationCount > 0) {
      alerts.push({
        type: "warning",
        title: "Inställningsavvikelser i LiteSpeed Cache",
        desc: `Det finns ${deviationCount} avvikelse(r) mellan din nuvarande konfiguration och den rekommenderade prestandaprofilen. Granska och åtgärda dessa under fliken 'LSCWP Inställningar'.`,
        icon: "⚙️",
        targetTabId: "cache"
      });
    }
  }

  return {
    environment,
    alerts,
    customCodeAlerts,
    customCssAlerts,
    fileSummaries,
    recommendations: recommendationsOutput,
    lscwpVersion: lscwpVersion
  };
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = { analyzeSystem, LSCWP_REFERENCE_VERSION, checkMissingExclusions, mergeExclusions };
}
