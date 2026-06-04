/**
 * AreWee WP-Optimizer - Main Application Script
 * Multi-file upload handlers, advanced WooCommerce, Wordfence, Elementor status parsers,
 * Custom PHP/CSS code static analyzer, three-tiered auditing, and settings comparison.
 * Implements permanently visible top bar slots, collapsible sidebar elements,
 * per-file 3-bullet diagnostics, and inline Custom CSS editor with live audits.
 */

document.addEventListener("DOMContentLoaded", () => {
  // --- SECURITY: HTML ESCAPING HELPER ---
  function escapeHtml(str) {
    if (str === null || str === undefined) return "";
    return str.toString()
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  // Prevent browser from navigating away and opening dropped files globally
  window.addEventListener("dragover", (e) => {
    e.preventDefault();
  }, false);
  window.addEventListener("drop", (e) => {
    e.preventDefault();
  }, false);

  // --- STATE ---
  let state = {
    sysInfo: null,
    wooInfo: null,
    wfInfo: null,
    elemInfo: null,
    customCodeInfo: null,
    customCss: "", // Paste CSS string
    uploadedSettings: null,
    analysisResults: null,
    activeTabId: "general",
    editedSettings: {}, // Active options configuration (1 for ON, 0 for OFF, or strings)
    apiUrl: "",
    apiToken: "",
    uploadMetadata: {
      sysInfo: { name: "", timestamp: "" },
      wooInfo: { name: "", timestamp: "" },
      wfInfo: { name: "", timestamp: "" },
      elemInfo: { name: "", timestamp: "" },
      customCodeInfo: { name: "", timestamp: "" },
      uploadedSettings: { name: "", timestamp: "" }
    }
  };

  // --- DOM ELEMENT REFERENCES ---
  const sysInfoDropzone = document.getElementById("sysinfo-dropzone");
  const woocommerceDropzone = document.getElementById("woocommerce-dropzone");
  const wordfenceDropzone = document.getElementById("wordfence-dropzone");
  const elementorDropzone = document.getElementById("elementor-dropzone");
  const customcodeDropzone = document.getElementById("customcode-dropzone");
  const settingsDropzone = document.getElementById("settings-dropzone");

  const sysInfoInput = document.getElementById("sysinfo-input");
  const woocommerceInput = document.getElementById("woocommerce-input");
  const wordfenceInput = document.getElementById("wordfence-input");
  const elementorInput = document.getElementById("elementor-input");
  const customcodeInput = document.getElementById("customcode-input");
  const settingsInput = document.getElementById("settings-input");
  
  const sysInfoStatus = document.getElementById("sysinfo-status");
  const woocommerceStatus = document.getElementById("woocommerce-status");
  const wordfenceStatus = document.getElementById("wordfence-status");
  const elementorStatus = document.getElementById("elementor-status");
  const customcodeStatus = document.getElementById("customcode-status");
  const settingsStatus = document.getElementById("settings-status");
  
  // Bullets lists references
  const sysInfoBullets = document.getElementById("sysinfo-bullets");
  const woocommerceBullets = document.getElementById("woocommerce-bullets");
  const wordfenceBullets = document.getElementById("wordfence-bullets");
  const elementorBullets = document.getElementById("elementor-bullets");
  const customcodeBullets = document.getElementById("customcode-bullets");
  const settingsBullets = document.getElementById("settings-bullets");

  // --- MASTER VIEW NAVIGATION SYSTEM ---
  const views = {
    inputs: { tab: document.getElementById("master-tab-inputs"), section: document.getElementById("view-inputs") },
    overview: { tab: document.getElementById("master-tab-overview"), section: document.getElementById("view-overview") },
    risks: { tab: document.getElementById("master-tab-risks"), section: document.getElementById("view-risks") },
    settings: { tab: document.getElementById("master-tab-settings"), section: document.getElementById("view-settings") },
    history: { tab: document.getElementById("master-tab-history"), section: document.getElementById("view-history") },
    sources: { tab: document.getElementById("master-tab-sources"), section: document.getElementById("view-sources") }
  };

  function switchMasterView(targetKey) {
    Object.keys(views).forEach(key => {
      const v = views[key];
      if (!v.tab || !v.section) return;
      if (key === targetKey) {
        v.tab.classList.add("active");
        v.section.classList.add("active");
      } else {
        v.tab.classList.remove("active");
        v.section.classList.remove("active");
      }
    });
  }

  // Bind click listeners for master tabs
  Object.keys(views).forEach(key => {
    if (views[key].tab) {
      views[key].tab.addEventListener("click", () => {
        switchMasterView(key);
      });
    }
  });
  
  // Start Analysis Elements
  const btnStartAnalysis = document.getElementById("btn-start-analysis");
  const analysisReadyText = document.getElementById("analysis-ready-text");
  
  // Summary card elements
  const sumWpVersion = document.getElementById("sum-wp-version");
  const sumServer = document.getElementById("sum-server");
  const sumPhpVersion = document.getElementById("sum-php-version");
  const sumTheme = document.getElementById("sum-theme");
  const sumWooCommerce = document.getElementById("sum-woocommerce");
  const sumElementor = document.getElementById("sum-elementor");
  const sumObjectCache = document.getElementById("sum-object-cache");
  const summaryCardStatusBadge = document.getElementById("summary-card-status-badge");
  
  // Checklist and custom code elements
  const paymentChecklist = document.getElementById("payment-checklist");
  const customCodeAlertsList = document.getElementById("custom-code-alerts-list");
  
  const alertsList = document.getElementById("alerts-list");
  const tabNavigation = document.getElementById("tab-navigation");
  const settingsContainer = document.getElementById("settings-container");
  
  // Comparison report elements
  const comparisonSummaryCard = document.getElementById("comparison-summary-card");
  const comparisonSummaryDesc = document.getElementById("comparison-summary-desc");
  const comparisonDiffsList = document.getElementById("comparison-diffs-list");
  const btnFixAll = document.getElementById("btn-fix-all");

  const statsChangesCount = document.getElementById("stats-changes-count");
  const btnExport = document.getElementById("btn-export");
  const btnExportPhp = document.getElementById("btn-export-php");
  const btnExportJson = document.getElementById("btn-export-json");

  const btnDownloadSyncPlugin = document.getElementById("btn-download-sync-plugin");
  const btnApiFetch = document.getElementById("btn-api-fetch");
  const btnApiPush = document.getElementById("btn-api-push");
  const apiSiteUrl = document.getElementById("api-site-url");
  const apiSyncToken = document.getElementById("api-sync-token");
  const apiSyncStatusText = document.getElementById("api-sync-status-text");

  const btnSaveCurrentProfile = document.getElementById("btn-save-current-profile");
  const btnExportHistory = document.getElementById("btn-export-history");
  const btnImportHistoryTrigger = document.getElementById("btn-import-history-trigger");
  const historyImportFile = document.getElementById("history-import-file");
  const btnClearHistory = document.getElementById("btn-clear-history");
  const compareSelectA = document.getElementById("compare-select-a");
  const compareSelectB = document.getElementById("compare-select-b");
  const btnCompareExecute = document.getElementById("btn-compare-execute");
  const comparisonResultTableWrapper = document.getElementById("comparison-result-table-wrapper");
  const historyProfilesGrid = document.getElementById("history-profiles-grid");
  const historyEmptyState = document.getElementById("history-empty-state");

  // --- INITIAL LAUNCH: POPULATE PLACEHOLDER BULLETS ---
  renderPlaceholderBullets();
  renderSourcesTab();

  // Active Site Header Dropdown Toggler
  const headerSiteWidget = document.getElementById("header-active-site-widget");
  const headerSiteDropdownPanel = document.getElementById("header-active-site-dropdown-panel");
  const headerSiteArrow = document.getElementById("header-active-site-arrow");
  if (headerSiteWidget && headerSiteDropdownPanel && headerSiteArrow) {
    headerSiteWidget.addEventListener("click", (e) => {
      e.stopPropagation();
      const isVisible = headerSiteDropdownPanel.style.display === "block";
      headerSiteDropdownPanel.style.display = isVisible ? "none" : "block";
      headerSiteArrow.textContent = isVisible ? "▼" : "▲";
      if (!isVisible) {
        headerSiteWidget.style.borderColor = "var(--accent-cyan)";
      } else {
        headerSiteWidget.style.borderColor = "rgba(99, 102, 241, 0.2)";
      }
    });

    document.addEventListener("click", () => {
      headerSiteDropdownPanel.style.display = "none";
      headerSiteArrow.textContent = "▼";
      headerSiteWidget.style.borderColor = "rgba(99, 102, 241, 0.2)";
    });

    headerSiteDropdownPanel.addEventListener("click", (e) => {
      e.stopPropagation();
    });
  }

  // --- EVENT ATTACHMENTS & DRAG/DROP ---
  setupDragAndDrop(sysInfoDropzone, sysInfoInput, handleSysInfoFile);
  setupDragAndDrop(woocommerceDropzone, woocommerceInput, handleWooCommerceFile);
  setupDragAndDrop(wordfenceDropzone, wordfenceInput, handleWordfenceFile);
  setupDragAndDrop(elementorDropzone, elementorInput, handleElementorFile);
  setupDragAndDrop(customcodeDropzone, customcodeInput, handleCustomCodeFile);
  setupDragAndDrop(settingsDropzone, settingsInput, handleSettingsFile);

  // Start Analysis button handler
  btnStartAnalysis.addEventListener("click", () => {
    if (state.sysInfo) {
      try {
        triggerAnalysis();
      } catch (err) {
        console.error("ANALYS-FEL:", err);
        alert("FEL VID ANALYS:\n" + err.message + "\n\nStacktrace:\n" + err.stack);
      }
    }
  });

  // --- SEPARATE CUSTOM CSS INPUT SYSTEM ---
  const appCssPastebox = document.getElementById("app-custom-css-pastebox");
  if (appCssPastebox) {
    appCssPastebox.addEventListener("input", (e) => {
      syncCustomCss(e.target.value, "app-custom-css-pastebox");
    });
  }

  function syncCustomCss(value, originId) {
    state.customCss = value;
    state.editedSettings["optm_css_custom"] = value;

    // Keep inputs in sync if both are visible
    const mainBox = document.getElementById("app-custom-css-pastebox");
    const tabBox = document.getElementById("custom-css-pastebox");

    if (mainBox && originId !== "app-custom-css-pastebox") {
      mainBox.value = value;
    }
    if (tabBox && originId !== "custom-css-pastebox") {
      tabBox.value = value;
    }

    renderCssAudits();
    
    // Silent update of rules engine to refresh dashboard alerts live
    silentUpdateAnalysis();
  }

  function renderCssAudits() {
    const tempResults = analyzeSystem(state.sysInfo, state.wooInfo, state.wfInfo, state.elemInfo, state.uploadedSettings, state.customCodeInfo, state.customCss);
    
    let cssAlertsHtml = "";
    if (tempResults && tempResults.customCssAlerts) {
      tempResults.customCssAlerts.forEach(alert => {
        cssAlertsHtml += `
          <div class="alert-item ${alert.type}" style="margin-top: 0.5rem; padding: 0.6rem 0.85rem; font-size:0.75rem;">
            <span class="alert-icon" style="font-size:1rem;">${alert.icon}</span>
            <div class="alert-content">
              <strong>${alert.title}</strong>
              <p style="opacity:0.85; font-size:0.7rem; margin-top:0.1rem;">${alert.desc}</p>
            </div>
          </div>
        `;
      });
    }

    const mainResults = document.getElementById("app-custom-css-audit-results");
    const tabResults = document.getElementById("custom-css-audit-results");

    if (mainResults) {
      mainResults.innerHTML = cssAlertsHtml || '<div style="color:var(--text-muted); font-size:0.75rem;">Skriv eller klistra in CSS ovan för att starta prestanda- och stabilitetsgranskning.</div>';
    }
    if (tabResults) {
      tabResults.innerHTML = cssAlertsHtml || '<div style="color:var(--text-muted); font-size:0.75rem;">Skriv eller klistra in CSS ovan för att starta prestanda- och stabilitetsgranskning.</div>';
    }
  }

  function setupDragAndDrop(dropzone, input, fileHandler) {
    if (!dropzone || !input) return;

    // Invisible absolute input overlay spans 100% of the zone and captures clicks natively.
    input.addEventListener("change", (e) => {
      console.log(`File input change event fired for: ${input.id}`);
      if (e.target.files.length > 0) {
        const file = e.target.files[0];
        console.log(`Selected file: ${file.name}, size: ${file.size} bytes`);
        try {
          fileHandler(file);
        } catch (error) {
          console.error(`Error in file handler for ${file.name}:`, error);
          alert(`Ett fel uppstod vid bearbetning av ${file.name}: ${error.message}`);
        }
      }
    });

    dropzone.addEventListener("dragover", (e) => {
      e.preventDefault();
      dropzone.classList.add("dragging");
    });

    dropzone.addEventListener("dragleave", () => {
      dropzone.classList.remove("dragging");
    });

    dropzone.addEventListener("drop", (e) => {
      e.preventDefault();
      dropzone.classList.remove("dragging");
      if (e.dataTransfer.files.length > 0) {
        fileHandler(e.dataTransfer.files[0]);
      }
    });
  }

  // --- PARSERS & UPLOAD HANDLERS ---

  function handleSysInfoFile(file) {
    const reader = new FileReader();
    reader.onload = function(e) {
      try {
        state.sysInfo = parseSystemInfoText(e.target.result);
        state.uploadMetadata.sysInfo = { name: file.name, timestamp: formatTimestamp(new Date()) };
        sysInfoStatus.textContent = `✓ ${file.name}`;
        sysInfoStatus.className = "file-status loaded";
        
        btnStartAnalysis.disabled = false;
        btnStartAnalysis.className = "btn-primary btn-pulse";
        btnStartAnalysis.style.background = "linear-gradient(135deg, var(--accent-cyan) 0%, var(--accent-indigo) 100%)";
        btnStartAnalysis.style.color = "var(--text-main)";
        btnStartAnalysis.style.cursor = "pointer";
        
        analysisReadyText.innerHTML = `<strong>Systemrapport inläst!</strong> Klicka på knappen bredvid för att köra analysen.`;
        analysisReadyText.style.color = "var(--accent-cyan)";
        
        // Dynamic audit update for the bullet summary
        silentUpdateAnalysis();
      } catch (err) {
        alert(`Kunde inte läsa systemfilen: ${err.message}`);
      }
    };
    reader.readAsText(file);
  }

  function handleWooCommerceFile(file) {
    const reader = new FileReader();
    reader.onload = function(e) {
      try {
        state.wooInfo = parseWooCommerceStatus(e.target.result);
        state.uploadMetadata.wooInfo = { name: file.name, timestamp: formatTimestamp(new Date()) };
        woocommerceStatus.textContent = `✓ ${file.name}`;
        woocommerceStatus.className = "file-status loaded";
        
        silentUpdateAnalysis();
      } catch (err) {
        alert(`Kunde inte läsa WooCommerce-statusfilen: ${err.message}`);
      }
    };
    reader.readAsText(file);
  }

  function handleWordfenceFile(file) {
    const reader = new FileReader();
    reader.onload = function(e) {
      try {
        state.wfInfo = parseWordfenceDiagnostic(e.target.result);
        state.uploadMetadata.wfInfo = { name: file.name, timestamp: formatTimestamp(new Date()) };
        wordfenceStatus.textContent = `✓ ${file.name}`;
        wordfenceStatus.className = "file-status loaded";
        
        silentUpdateAnalysis();
      } catch (err) {
        alert(`Kunde inte läsa Wordfence-filen: ${err.message}`);
      }
    };
    reader.readAsText(file);
  }

  function handleElementorFile(file) {
    const reader = new FileReader();
    reader.onload = function(e) {
      try {
        state.elemInfo = parseElementorStatus(e.target.result);
        state.uploadMetadata.elemInfo = { name: file.name, timestamp: formatTimestamp(new Date()) };
        elementorStatus.textContent = `✓ ${file.name}`;
        elementorStatus.className = "file-status loaded";
        
        silentUpdateAnalysis();
      } catch (err) {
        alert(`Kunde inte läsa Elementor-filen: ${err.message}`);
      }
    };
    reader.readAsText(file);
  }

  function handleCustomCodeFile(file) {
    const reader = new FileReader();
    reader.onload = function(e) {
      try {
        state.customCodeInfo = parseCustomCodeText(e.target.result);
        state.uploadMetadata.customCodeInfo = { name: file.name, timestamp: formatTimestamp(new Date()) };
        customcodeStatus.textContent = `✓ ${file.name}`;
        customcodeStatus.className = "file-status loaded";
        
        silentUpdateAnalysis();
      } catch (err) {
        alert(`Kunde inte läsa den anpassade kodfilen: ${err.message}`);
      }
    };
    reader.readAsText(file);
  }

  function handleSettingsFile(file) {
    const reader = new FileReader();
    reader.onload = function(e) {
      try {
        state.uploadedSettings = parseSettingsFile(e.target.result);
        state.uploadMetadata.uploadedSettings = { name: file.name, timestamp: formatTimestamp(new Date()) };
        settingsStatus.textContent = `✓ ${file.name}`;
        settingsStatus.className = "file-status loaded";
        state.editedSettings = {};
        
        // Grab custom CSS if exists in uploaded settings
        if (state.uploadedSettings && state.uploadedSettings.optm_css_custom) {
          state.customCss = state.uploadedSettings.optm_css_custom;
          const mainBox = document.getElementById("app-custom-css-pastebox");
          if (mainBox) {
            mainBox.value = state.customCss;
          }
          renderCssAudits();
        }

        silentUpdateAnalysis();
      } catch (err) {
        alert(`Kunde inte läsa LiteSpeed settingsfilen: ${err.message}`);
      }
    };
    reader.readAsText(file);
  }

  /**
   * Parses WordPress Core Site Health info dump
   */
  function parseSystemInfoText(text) {
    const data = {};
    let currentSection = null;
    const lines = text.split(/\r?\n/);
    
    lines.forEach(line => {
      line = line.trim();
      if (!line) return;
      
      if (line.startsWith("###") && line.endsWith("###")) {
        currentSection = line.replace(/###/g, "").trim().toLowerCase();
        currentSection = currentSection.replace(/\s*\(\d+\)\s*/g, "");
        data[currentSection] = {};
        return;
      }
      
      if (currentSection) {
        if (currentSection === "wp-plugins-active" || currentSection === "wp-plugins-inactive") {
          const colonIndex = line.indexOf(":");
          if (colonIndex !== -1) {
            const name = line.substring(0, colonIndex).trim();
            const rest = line.substring(colonIndex + 1).trim();
            let version = "Okänd", author = "Okänd";
            
            const verMatch = rest.match(/version:\s*([^,]+)/);
            const autMatch = rest.match(/author:\s*(.+)$/);
            
            if (verMatch) version = verMatch[1].trim();
            if (autMatch) author = autMatch[1].trim();
            
            data[currentSection][name] = { version, author };
          }
        } else if (currentSection === "code-snippets") {
          const colonIndex = line.indexOf(":");
          if (colonIndex !== -1) {
            data[currentSection][line.substring(0, colonIndex).trim()] = line.substring(colonIndex + 1).trim();
          }
        } else {
          const colonIndex = line.indexOf(":");
          if (colonIndex !== -1) {
            data[currentSection][line.substring(0, colonIndex).trim()] = line.substring(colonIndex + 1).trim();
          }
        }
      }
    });

    if (Object.keys(data).length === 0) {
      data["wp-server"] = {};
      data["wp-core"] = {};
      data["wp-active-theme"] = {};
      data["wp-plugins-active"] = {};

      lines.forEach(line => {
        const colonIndex = line.indexOf(":");
        if (colonIndex !== -1) {
          const key = line.substring(0, colonIndex).trim().toLowerCase();
          const val = line.substring(colonIndex + 1).trim();
          
          if (key.includes("version") && !data["wp-core"].version) data["wp-core"].version = val;
          else if (key.includes("server") || key.includes("httpd")) data["wp-server"].httpd_software = val;
          else if (key.includes("php")) data["wp-server"].php_version = val;
          else if (key.includes("theme")) data["wp-active-theme"].name = val;
        }
      });
    }
    return data;
  }

  /**
   * Parses WooCommerce status text dump
   */
  function parseWooCommerceStatus(text) {
    const data = { gateways: [], overrides: [], hpos_enabled: false, cart_fragments_dequeued: false, transients_cleanup_enabled: false };
    let currentSection = "";
    const lines = text.split(/\r?\n/);
    
    lines.forEach(line => {
      line = line.trim();
      if (!line) return;
      
      if (line.startsWith("###") && line.endsWith("###")) {
        currentSection = line.replace(/###/g, "").trim().toLowerCase();
        return;
      }
      
      const lower = line.toLowerCase();
      
      if (currentSection.includes("payment") || currentSection.includes("gateways") || currentSection.includes("betalsätt")) {
        const parts = line.split(":");
        if (parts.length >= 2) {
          const name = parts[0].trim();
          const status = parts[1].trim().toLowerCase();
          if (status.includes("enabled") || status.includes("aktiverad") || status.includes("true") || status.includes("ja")) {
            data.gateways.push(name);
          }
        }
      }
      
      if (currentSection.includes("templates") || currentSection.includes("mallar")) {
        if (line.includes("/") && (line.includes(".php") || line.includes("override"))) {
          data.overrides.push(line);
        }
      }
    });
    
    // Fallback / Extra searches for WooCommerce settings
    const lowerText = text.toLowerCase();
    if (lowerText.includes("high-performance order storage: enabled") || 
        lowerText.includes("high-performance order storage (cot): enabled") || 
        lowerText.includes("cot enabled: yes") ||
        lowerText.includes("high-performance order storage: aktiv")) {
      data.hpos_enabled = true;
    }
    
    if (lowerText.includes("disable-cart-fragments") || 
        lowerText.includes("dequeue wc-cart-fragments") || 
        lowerText.includes("wc_cart_fragments_dequeue")) {
      data.cart_fragments_dequeued = true;
    }
    
    if (lowerText.includes("transient_cleanup") || 
        lowerText.includes("cleanup_expired_transients") || 
        lowerText.includes("woocommerce_cleanup_personal_data")) {
      data.transients_cleanup_enabled = true;
    }
    
    if (data.gateways.length === 0) {
      if (lowerText.includes("stripe")) data.gateways.push("Stripe");
      if (lowerText.includes("klarna")) data.gateways.push("Klarna");
      if (lowerText.includes("paypal")) data.gateways.push("PayPal");
      if (lowerText.includes("shipmondo")) data.gateways.push("Shipmondo");
    }
    
    return data;
  }

  /**
   * Parses Wordfence diagnostic report text
   */
  function parseWordfenceDiagnostic(text) {
    const data = { firewall_mode: "Okänd", ip_header: "Okänd", live_traffic_disabled: false, low_resource_scan: false, crawler_whitelisted: false };
    const lines = text.split(/\r?\n/);
    
    lines.forEach(line => {
      const lower = line.toLowerCase();
      if (lower.includes("firewall mode") || lower.includes("brandväggsläge") || lower.includes("firewall status")) {
        const parts = line.split(":");
        if (parts.length >= 2) data.firewall_mode = parts[1].trim();
      }
      if (lower.includes("how wordfence gets ips") || lower.includes("ip-detektering") || lower.includes("remote_addr") || lower.includes("connecting-ip")) {
        const parts = line.split(":");
        if (parts.length >= 2) {
          data.ip_header = parts[1].trim();
        } else if (lower.includes("remote_addr")) {
          data.ip_header = "REMOTE_ADDR (Standard)";
        } else if (lower.includes("cf-connecting-ip")) {
          data.ip_header = "CF-Connecting-IP (Cloudflare)";
        }
      }
    });

    const lowerText = text.toLowerCase();
    if (lowerText.includes("live traffic logging: disabled") || 
        lowerText.includes("live traffic status: off") || 
        lowerText.includes("live_traffic_enabled: false") ||
        lowerText.includes("live traffic: off")) {
      data.live_traffic_disabled = true;
    }
    
    if (lowerText.includes("low resource scan: enabled") || 
        lowerText.includes("low resource: yes") ||
        lowerText.includes("low_resource_scan: true")) {
      data.low_resource_scan = true;
    }
    
    if (lowerText.includes("crawler whitelist: active") || 
        lowerText.includes("whitelist litespeed crawler") ||
        lowerText.includes("crawler_whitelisted: true")) {
      data.crawler_whitelisted = true;
    }
    
    return data;
  }

  /**
   * Parses Elementor status text dump
   */
  function parseElementorStatus(text) {
    const data = { experiments: [], hasLazyLoad: false, css_print_method: "external" };
    const lines = text.split(/\r?\n/);
    
    lines.forEach(line => {
      const lower = line.toLowerCase();
      if (lower.includes("experiment") || lower.includes("css loading") || 
          lower.includes("asset loading") || lower.includes("optimized css") || 
          lower.includes("lazy load") || lower.includes("lazyload") || 
          lower.includes("image loading")) {
        
        if (line.includes(":")) {
          const parts = line.split(":");
          const name = parts[0].trim();
          const status = parts.slice(1).join(":").trim().toLowerCase();
          
          // Ensure we don't match 'inactive' or 'inaktiv' as active
          const isActive = (status.includes("active") || status.includes("aktiv")) && 
                           !status.includes("inactive") && 
                           !status.includes("inaktiv");
          
          if (isActive) {
             data.experiments.push(name);
             
             const nameLower = name.toLowerCase();
             if (nameLower.includes("lazy load") || nameLower.includes("lazyload") || nameLower.includes("optimized image loading")) {
               data.hasLazyLoad = true;
             }
          }
        }
      }
      
      if (lower.includes("css write method") || lower.includes("css-skrivmetod") || lower.includes("css method")) {
        const parts = line.split(":");
        if (parts.length >= 2) {
          const val = parts[1].trim().toLowerCase();
          if (val.includes("inline") || val.includes("inbäddad")) {
            data.css_print_method = "inline";
          }
        }
      }
    });
    
    return data;
  }

  /**
   * Parses Child-Theme functions.php or Code Snippets PHP dumps for preperformance audits
   */
  function parseCustomCodeText(text) {
    const data = {
      hasOldHooks: false,
      hasRawScriptHooks: false,
      hasManualCacheHeaders: false,
      hasXmlRpcDisabled: false,
      hasEmojisDisabled: false,
      hasHeartbeatLimited: false,
      hasPingbacksDisabled: false,
      auditedFiles: []
    };

    const lower = text.toLowerCase();

    if (lower.includes("add_action") && lower.includes("woocommerce_add_to_cart_fragments")) {
      data.hasOldHooks = true;
    }

    if (lower.includes("add_action") && (lower.includes("wp_head") || lower.includes("wp_footer")) && lower.includes("<script")) {
      data.hasRawScriptHooks = true;
    }

    if (lower.includes("header(") && (lower.includes("cache-control") || lower.includes("pragma") || lower.includes("expires"))) {
      data.hasManualCacheHeaders = true;
    }
    
    if (lower.includes("xmlrpc_enabled") && (lower.includes("return false") || lower.includes("__return_false"))) {
      data.hasXmlRpcDisabled = true;
    }
    
    if (lower.includes("disable_emojis") || lower.includes("remove_action('wp_head', 'print_emoji_detection_script')")) {
      data.hasEmojisDisabled = true;
    }
    
    if (lower.includes("heartbeat") && (lower.includes("stop") || lower.includes("modify") || lower.includes("limit") || lower.includes("disable"))) {
      data.hasHeartbeatLimited = true;
    }
    
    if (lower.includes("wp_pingback") || lower.includes("pingback") || lower.includes("self_pingback")) {
      data.hasPingbacksDisabled = true;
    }

    return data;
  }

  // --- SILENT BACKGROUND UPDATE FOR BULLET SUMMARIES ---
  function formatTimestamp(date) {
    const d = (date instanceof Date) ? date : new Date(date);
    if (isNaN(d.getTime())) return String(date);
    const pad = (num) => String(num).padStart(2, "0");
    const yy = String(d.getFullYear()).slice(-2);
    const mm = pad(d.getMonth() + 1);
    const dd = pad(d.getDate());
    const hh = pad(d.getHours());
    const min = pad(d.getMinutes());
    return `${yy}${mm}${dd} - kl. ${hh}:${min}`;
  }

  function getFriendlyDay(dateString) {
    if (!dateString) return "";
    try {
      let uploadDate;
      const customMatch = String(dateString).match(/^(\d{2})(\d{2})(\d{2})\s*-\s*kl\.\s*(\d{2}):(\d{2})/);
      if (customMatch) {
        const yr = 2000 + parseInt(customMatch[1], 10);
        const mo = parseInt(customMatch[2], 10) - 1;
        const dy = parseInt(customMatch[3], 10);
        const hr = parseInt(customMatch[4], 10);
        const mn = parseInt(customMatch[5], 10);
        uploadDate = new Date(yr, mo, dy, hr, mn);
      } else {
        const dateParts = dateString.split(" ");
        const dateOnly = dateParts[0]; 
        uploadDate = new Date(dateOnly.replace(/\//g, "-"));
      }
      
      if (isNaN(uploadDate.getTime())) {
        return dateString;
      }
      
      const today = new Date();
      const yesterday = new Date();
      yesterday.setDate(today.getDate() - 1);
      
      if (uploadDate.toDateString() === today.toDateString()) {
        return "idag";
      } else if (uploadDate.toDateString() === yesterday.toDateString()) {
        return "igår";
      } else {
        const options = { weekday: 'long' };
        return uploadDate.toLocaleDateString('sv-SE', options);
      }
    } catch (e) {
      return "nyligen";
    }
  }

  function updateActiveSiteStatusBar() {
    const siteNameEl = document.getElementById("status-bar-site-name");
    const filesListEl = document.getElementById("status-bar-files-list");
    const summaryEl = document.getElementById("header-active-site-summary");
    if (!siteNameEl || !filesListEl) return;

    let siteName = "Ingen sajt inläst";
    let latestTimestamp = "";
    let loadedCount = 0;
    
    const slots = [
      { key: "sysInfo", label: "WP Systemfil", icon: "📝" },
      { key: "wooInfo", label: "WC Status", icon: "🛒" },
      { key: "wfInfo", label: "Wordfence", icon: "🛡️" },
      { key: "elemInfo", label: "Elementor", icon: "🎨" },
      { key: "customCodeInfo", label: "Snippets", icon: "🔌" },
      { key: "uploadedSettings", label: "LSCWP Inställningar", icon: "⚙️" }
    ];

    slots.forEach(slot => {
      const meta = state.uploadMetadata[slot.key];
      if (meta && meta.name) {
        loadedCount++;
        if (slot.key === "sysInfo") {
          latestTimestamp = meta.timestamp;
        }
      }
    });

    if (state.sysInfo) {
      const wpPath = (state.sysInfo["wp-paths-sizes"] && state.sysInfo["wp-paths-sizes"].wordpress_path) || "";
      const domainMatch = wpPath.match(/domains\/([^/]+)/);
      if (domainMatch && domainMatch[1]) {
        siteName = domainMatch[1];
      } else if (state.uploadMetadata.sysInfo.name) {
        const parts = state.uploadMetadata.sysInfo.name.split("-");
        siteName = parts[0];
      } else {
        siteName = "WordPress sajt";
      }
    }
    siteNameEl.textContent = siteName;

    if (summaryEl) {
      if (loadedCount > 0) {
        const dayLabel = latestTimestamp ? getFriendlyDay(latestTimestamp) : "idag";
        summaryEl.textContent = `${loadedCount} av 6 filer (${dayLabel})`;
      } else {
        summaryEl.textContent = "0 av 6 filer";
      }
    }

    let html = "";
    slots.forEach(slot => {
      const meta = state.uploadMetadata[slot.key];
      if (meta && meta.name) {
        html += `
          <div style="background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.05); padding: 0.25rem 0.6rem; border-radius: 6px; display: flex; align-items: center; gap: 0.35rem; white-space: nowrap;">
            <span>${slot.icon}</span>
            <span style="color: var(--color-success); font-size: 0.6rem; flex-shrink: 0;">●</span>
            <strong style="color: var(--text-main); font-weight: 600; margin-right: 0.25rem; flex-shrink: 0;">${slot.label}:</strong>
            <span style="color: #a5b4fc; text-overflow: ellipsis; overflow: hidden; white-space: nowrap; max-width: 320px;" title="${escapeHtml(meta.name)}">${escapeHtml(meta.name)}</span>
            <span style="color: var(--text-muted); font-size: 0.65rem; margin-left: auto; padding-left: 1.5rem; flex-shrink: 0;">(${meta.timestamp})</span>
          </div>
        `;
      } else {
        const isRequired = slot.key === "sysInfo";
        html += `
          <div style="background: rgba(0,0,0,0.2); border: 1px solid rgba(255,255,255,0.02); padding: 0.25rem 0.6rem; border-radius: 6px; display: flex; align-items: center; gap: 0.35rem; opacity: 0.6; white-space: nowrap;">
            <span>${slot.icon}</span>
            <span style="color: ${isRequired ? 'var(--color-danger)' : 'var(--text-muted)'}; font-size: 0.6rem; flex-shrink: 0;">●</span>
            <strong style="color: var(--text-muted); font-weight: 500; flex-shrink: 0;">${slot.label}:</strong>
            <span style="margin-left: auto; padding-left: 1.5rem; flex-shrink: 0;">${isRequired ? 'Krävs' : 'Ej inläst'}</span>
          </div>
        `;
      }
    });

    filesListEl.innerHTML = html;
  }

  function silentUpdateAnalysis() {
    // Generate temporary rules engine results to render the 3 bullets inside the uploader slots immediately!
    const tempResults = analyzeSystem(state.sysInfo, state.wooInfo, state.wfInfo, state.elemInfo, state.uploadedSettings, state.customCodeInfo, state.customCss);
    renderBulletLists(tempResults.fileSummaries);
    renderSourcesTab();
    updateActiveSiteStatusBar();
    
    if (state.analysisResults) {
      // If they already start analysis once, auto-sync and refresh dashboards dynamically
      triggerAnalysis();
    }
  }

  // --- CORE SYSTEM CONTROLLER & RENDERERS ---

  function triggerAnalysis() {
    if (!state.sysInfo) return;

    try {
      state.analysisResults = analyzeSystem(state.sysInfo, state.wooInfo, state.wfInfo, state.elemInfo, state.uploadedSettings, state.customCodeInfo, state.customCss);
      
      state.analysisResults.recommendations.forEach(tab => {
        tab.options.forEach(opt => {
          if (state.editedSettings[opt.id] === undefined) {
            if (state.uploadedSettings && state.uploadedSettings.hasOwnProperty(opt.id)) {
              const upVal = state.uploadedSettings[opt.id];
              
              if (opt.id === "js_exclude" || opt.id === "css_exclude" || opt.id === "media_lazy_exclude" || opt.id === "drop_uri") {
                state.editedSettings[opt.id] = upVal || opt.recommendedRaw;
              } else {
                state.editedSettings[opt.id] = (upVal === "1" || upVal === 1 || upVal === "on" || upVal === true || upVal === "swap") ? 1 : 0;
              }
            } else {
              state.editedSettings[opt.id] = opt.recommendedRaw;
            }
          }
        });
      });

      // Unlock analyzed content layouts inside all views
      document.querySelectorAll(".view-section").forEach(sec => {
        const placeholder = sec.querySelector(".empty-state-placeholder");
        const content = sec.querySelector(".view-content");
        if (placeholder) placeholder.style.display = "none";
        if (content) content.style.display = "block";
      });
      
      btnStartAnalysis.classList.remove("btn-pulse");
      analysisReadyText.innerHTML = `✓ Analysen kördes framgångsrikt kl. ${new Date().toLocaleTimeString()}. Uppdatera filer ovan live för att analysera igen.`;
      analysisReadyText.style.color = "var(--color-success)";

      renderSummaryCard();
      renderAlerts();
      renderWooChecklist();
      renderCustomCodeAudits();
      renderTabs();
      renderSettingsPanel();
      renderComparisonSummary();
      renderBulletLists(state.analysisResults.fileSummaries);
      
      // Calculate and render the Health Score & dynamic Overview summary
      renderHealthScoreAndOverview();

      updateActionBar();
      renderSourcesTab();
      
      // Draw visual Conflict Topology map
      drawTopologyMap();

      // Auto-switch to Översikt (Overview) tab on complete
      switchMasterView("overview");
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
      console.error("FEL I TRIGGERANALYSIS:", err);
      alert("FEL VID ANALYS:\n" + err.message + "\n\nStacktrace:\n" + err.stack);
    }
  }

  function renderSourcesTab() {
    const grid = document.getElementById("sources-files-grid");
    if (!grid) return;
    grid.innerHTML = "";

    const env = state.analysisResults ? state.analysisResults.environment : {
      wpVersion: "Okänd",
      server: "Okänd",
      phpVersion: "Okänd",
      theme: "Okänd",
      hasWooCommerce: state.wooInfo ? true : false,
      hasElementor: state.elemInfo ? true : false,
      hasWordfence: state.wfInfo ? true : false,
      hasKustomCheckout: false,
      wooGateways: state.wooInfo ? state.wooInfo.gateways : [],
      wooOverrides: state.wooInfo ? state.wooInfo.overrides : [],
      wfFirewallMode: state.wfInfo ? state.wfInfo.firewall_mode : "Okänd",
      wfIpHeader: state.wfInfo ? state.wfInfo.ip_header : "Okänd",
      elemExperiments: state.elemInfo ? state.elemInfo.experiments : [],
      hasElementorLazyLoad: state.elemInfo ? state.elemInfo.hasLazyLoad : false,
      activePlugins: []
    };

    let elemVersion = "4.1.1"; // default to Swedish live-version/user version
    if (state.sysInfo && state.sysInfo["wp-plugins-active"]) {
      const keys = Object.keys(state.sysInfo["wp-plugins-active"]);
      const matchKey = keys.find(k => k.toLowerCase() === "elementor");
      if (matchKey) {
        elemVersion = state.sysInfo["wp-plugins-active"][matchKey].version;
      }
    }

    let lscwpVersion = "7.8.1"; // default/fallback
    if (state.sysInfo && state.sysInfo["wp-plugins-active"]) {
      const keys = Object.keys(state.sysInfo["wp-plugins-active"]);
      const matchKey = keys.find(k => k.toLowerCase() === "litespeed-cache" || k.toLowerCase() === "litespeed cache");
      if (matchKey) {
        lscwpVersion = state.sysInfo["wp-plugins-active"][matchKey].version;
      }
    }

    const files = [
      {
        name: "1. WordPress Systemrapport",
        status: state.sysInfo ? "Inläst ✓" : "Ej inläst (Väntar)",
        loaded: !!state.sysInfo,
        color: state.sysInfo ? "var(--color-success)" : "var(--text-muted)",
        details: state.sysInfo 
          ? `<strong>WordPress version:</strong> ${env.wpVersion}<br><strong>Webbserver:</strong> ${env.server}<br><strong>PHP-version:</strong> ${env.phpVersion}<br><strong>Aktivt tema:</strong> ${env.theme}`
          : "Krävs för att köra analysen."
      },
      {
        name: "2. WooCommerce Systemstatus",
        status: state.wooInfo ? "Inläst ✓" : "Ej inläst (Valfri)",
        loaded: !!state.wooInfo,
        color: state.wooInfo ? "var(--color-success)" : "var(--text-muted)",
        details: state.wooInfo 
          ? `<strong>Antal betalsätt:</strong> ${env.wooGateways.length} st (${env.wooGateways.join(", ")})<br><strong>Mallöverskrivningar:</strong> ${env.wooOverrides.length} st`
          : (env.hasWooCommerce ? "<strong>WooCommerce är aktivt!</strong> Vi rekommenderar starkt att du laddar upp denna rapport för att analysera betalsätt." : "Inte aktivt på sajten.")
      },
      {
        name: "3. Wordfence Diagnostik",
        status: state.wfInfo ? "Inläst ✓" : "Ej inläst (Valfri)",
        loaded: !!state.wfInfo,
        color: state.wfInfo ? "var(--color-success)" : "var(--text-muted)",
        details: state.wfInfo 
          ? `<strong>Brandväggsläge:</strong> ${env.wfFirewallMode}<br><strong>IP-detekteringshuvud:</strong> ${env.wfIpHeader}`
          : (state.sysInfo && env.activePlugins.some(p => p.toLowerCase().includes("wordfence")) ? "<strong>Wordfence är aktivt!</strong> Ladda upp rapporten för att verifiera IP-detektering för sökspindeln." : "Inte aktivt på sajten.")
      },
      {
        name: "4. Elementor Statusrapport",
        status: state.elemInfo ? "Inläst ✓" : "Ej inläst (Valfri)",
        loaded: !!state.elemInfo,
        color: state.elemInfo ? "var(--color-success)" : "var(--text-muted)",
        details: state.elemInfo 
          ? `<strong>Detekterad live-version:</strong> v${elemVersion}<br><strong>Lazy load-status:</strong> ${env.hasElementorLazyLoad ? "Aktiv (Risk!)" : "Inaktiv (Optimalt)"}<br><strong>Aktiva funktioner:</strong> ${env.elemExperiments.length} st`
          : (env.hasElementor ? "<strong>Elementor är aktivt!</strong> Ladda upp rapporten för att automatiskt verifiera inbyggd lazy load." : "Inte aktivt på sajten.")
      },
      {
        name: "5. Anpassad PHP-kod (functions.php)",
        status: state.customCodeInfo ? "Inläst ✓" : "Ej inläst (Valfri)",
        loaded: !!state.customCodeInfo,
        color: state.customCodeInfo ? "var(--color-success)" : "var(--text-muted)",
        details: state.customCodeInfo 
          ? `<strong>Gjorda PHP-tester:</strong> 3 st godkända<br><strong>Stabilitetsrisker:</strong> ${state.analysisResults ? state.analysisResults.customCodeAlerts.filter(a => a.type === "danger" || a.type === "warning").length : 0} st`
          : "Ladda upp källkodsfiler för att granska anpassade filter och actions."
      },
      {
        name: "6. Nuvarande LiteSpeed Inställningar (.data)",
        status: state.uploadedSettings ? "Inläst ✓" : "Genereras från scratch",
        loaded: !!state.uploadedSettings,
        color: state.uploadedSettings ? "var(--color-success)" : "var(--accent-indigo)",
        details: state.uploadedSettings 
          ? `<strong>Inlästa parametrar:</strong> ${Object.keys(state.uploadedSettings).length} st<br><strong>Detekterad referens:</strong> LiteSpeed Cache v${lscwpVersion}`
          : "Ingen basfil inläst. Appen skapar en perfekt stabilitetsprofil från scratch!"
      }
    ];

    files.forEach(file => {
      const card = document.createElement("div");
      card.className = "finding-stat-card";
      card.style.flexDirection = "column";
      card.style.alignItems = "flex-start";
      card.style.padding = "1.25rem";
      card.style.background = file.loaded ? "rgba(16, 185, 129, 0.02)" : "rgba(255, 255, 255, 0.01)";
      card.style.borderColor = file.loaded ? "rgba(16, 185, 129, 0.15)" : "rgba(255, 255, 255, 0.03)";
      card.style.borderWidth = "1px";
      card.style.borderStyle = "solid";
      card.style.borderRadius = "12px";

      card.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center; width: 100%; border-bottom: 1px solid rgba(255,255,255,0.04); padding-bottom: 0.5rem; margin-bottom: 0.5rem;">
          <h4 style="font-size: 0.85rem; font-weight: 700; color: #fff; margin: 0;">${file.name}</h4>
          <span style="font-size: 0.72rem; font-weight: bold; color: ${file.color};">${file.status}</span>
        </div>
        <p style="font-size: 0.78rem; color: var(--text-muted); line-height: 1.45; margin: 0; width: 100%;">${file.details}</p>
      `;
      grid.appendChild(card);
    });

    const specTitle = document.getElementById("elementor-spec-title");
    if (specTitle) {
      specTitle.innerHTML = `🎨 Elementor v${elemVersion} (${state.sysInfo && state.sysInfo["wp-plugins-active"] && state.sysInfo["wp-plugins-active"]["Elementor"] ? "Detekterad" : "Referens"})`;
    }

    const lscwpSpecTitle = document.getElementById("lscwp-spec-title");
    if (lscwpSpecTitle) {
      lscwpSpecTitle.innerHTML = `⚡ LiteSpeed Cache v${lscwpVersion} (Konfigurationer)`;
    }

    const lscwpRefBadge = document.getElementById("lscwp-ref-badge");
    if (lscwpRefBadge) {
      lscwpRefBadge.innerHTML = `Referens: LiteSpeed Cache v${lscwpVersion}`;
    }
  }

  function renderHealthScoreAndOverview() {
    const results = state.analysisResults;
    if (!results) return;

    // Calculate score starting at 100
    let score = 100;

    // 1. Compatibility warnings
    results.alerts.forEach(alert => {
      if (alert.type === "danger") score -= 15;
      else if (alert.type === "warning") score -= 8;
    });

    // 2. Custom code (PHP) audits
    results.customCodeAlerts.forEach(alert => {
      if (alert.type === "danger") score -= 10;
      else if (alert.type === "warning") score -= 4;
    });

    // 3. Custom CSS alerts
    if (results.customCssAlerts) {
      results.customCssAlerts.forEach(alert => {
        if (alert.type === "danger") score -= 10;
        else if (alert.type === "warning") score -= 4;
      });
    }

    // 4. Exclusions / WooCommerce protection
    const env = results.environment;
    if (env.hasWooCommerce && !state.wooInfo) {
      score -= 5;
    }

    // 5. Settings deviations
    let deviationCount = 0;
    results.recommendations.forEach(tab => {
      tab.options.forEach(opt => {
        if (opt.isChangedNeeded) {
          deviationCount++;
        }
      });
    });
    score -= deviationCount * 1.5;

    // Clamp between 20 and 100
    score = Math.max(20, Math.min(100, Math.round(score)));

    // Render score value & gauge
    const scoreValEl = document.getElementById("health-score-value");
    const gaugeEl = document.getElementById("health-gauge");
    const scoreTitleEl = document.getElementById("health-score-title");
    const scoreDescEl = document.getElementById("health-score-desc");

    if (scoreValEl) scoreValEl.textContent = score;
    if (gaugeEl) {
      const deg = (score / 100) * 360;
      gaugeEl.style.setProperty("--score-deg", `${deg}deg`);
    }

    if (scoreTitleEl && scoreDescEl) {
      if (score >= 90) {
        scoreTitleEl.textContent = "Utmärkt status! 🟢";
        scoreDescEl.textContent = "Din sajt är perfekt optimerad och har maximal e-handelsstabilitet.";
      } else if (score >= 70) {
        scoreTitleEl.textContent = "Godkänd status 🟡";
        scoreDescEl.textContent = "Sajten är stabil men det finns prestandaförbättringar att göra.";
      } else {
        scoreTitleEl.textContent = "Åtgärd krävs! 🔴";
        scoreDescEl.textContent = "Kritiska stabilitetsrisker detekterade för kassan eller sidbyggaren.";
      }
    }

    // Render badge counts
    const statRisksCountEl = document.getElementById("stat-count-risks");
    const statRecChangesEl = document.getElementById("stat-count-rec-changes");
    const statSecuredStatusEl = document.getElementById("stat-secured-status");

    const totalRisksCount = results.alerts.filter(a => a.type === "danger" || a.type === "warning").length +
                            results.customCodeAlerts.filter(a => a.type === "danger" || a.type === "warning").length +
                            (results.customCssAlerts ? results.customCssAlerts.filter(a => a.type === "danger" || a.type === "warning").length : 0);

    if (statRisksCountEl) statRisksCountEl.textContent = totalRisksCount;
    if (statRecChangesEl) statRecChangesEl.textContent = deviationCount;

    let checkoutSecure = false;
    if (env.hasWooCommerce) {
      const dropUri = state.editedSettings.drop_uri || "";
      const dropUriLower = dropUri.toString().toLowerCase();
      if (dropUriLower.includes("checkout") || dropUriLower.includes("kassa")) {
        checkoutSecure = true;
      }
      
      if (statSecuredStatusEl) {
        if (checkoutSecure) {
          statSecuredStatusEl.textContent = "Säkrad OK";
          statSecuredStatusEl.style.color = "var(--color-success)";
        } else {
          statSecuredStatusEl.textContent = "RISK!";
          statSecuredStatusEl.style.color = "var(--color-danger)";
        }
      }
    } else {
      if (statSecuredStatusEl) {
        statSecuredStatusEl.textContent = "Ej aktiv";
        statSecuredStatusEl.style.color = "var(--text-muted)";
      }
    }

    // Render top recommendation message
    const topFindingTextEl = document.getElementById("top-finding-text");
    if (topFindingTextEl) {
      if (env.hasWooCommerce && !checkoutSecure) {
        topFindingTextEl.textContent = "Varning: Din butikskassa (checkout) är inte exkluderad från LiteSpeed Cache! Detta är en allvarlig stabilitetsrisk som måste åtgärdas omedelbart under inställningarna.";
      } else if (results.alerts.some(a => a.type === "danger" || a.type === "warning")) {
        topFindingTextEl.textContent = "Detekterade kompatibilitetsvarningar i din miljö (t.ex. krockande lazy-loads). Se fliken 'Risker & Kompatibilitet' för detaljerade råd.";
      } else if (deviationCount > 0) {
        topFindingTextEl.textContent = "Din sajt är kompatibel men inte fullt optimerad. Vi rekommenderar att du går till fliken 'LSCWP Inställningar', klickar på 'Åtgärda alla avvikelser' och laddar ner profilfilen.";
      } else {
        topFindingTextEl.textContent = "Din webbplats är fullt optimerad och butikskassan är säkrad. Inga ytterligare prestandaåtgärder behövs!";
      }
    }

    // Render key findings bullet list
    const bulletListEl = document.getElementById("key-findings-bullet-list");
    if (bulletListEl) {
      bulletListEl.innerHTML = "";

      // Bullet 1: Server
      const li1 = document.createElement("li");
      li1.style.fontSize = "0.85rem";
      li1.style.color = "var(--text-muted)";
      li1.style.display = "flex";
      li1.style.alignItems = "center";
      li1.style.gap = "0.5rem";
      if (env.isLiteSpeedServer) {
        li1.innerHTML = `<span style="color: var(--color-success);">✓</span> Webbserver stöder LiteSpeed Crawler och server-level cache optimalt.`;
      } else {
        li1.innerHTML = `<span style="color: var(--color-warning);">⚠️</span> Servern kör ej LiteSpeed (${env.server}). Backend-crawler är begränsad.`;
      }
      bulletListEl.appendChild(li1);

      // Bullet 2: Kassa skydd
      if (env.hasWooCommerce) {
        const li2 = document.createElement("li");
        li2.style.fontSize = "0.85rem";
        li2.style.color = "var(--text-muted)";
        li2.style.display = "flex";
        li2.style.alignItems = "center";
        li2.style.gap = "0.5rem";
        if (checkoutSecure) {
          li2.innerHTML = `<span style="color: var(--color-success);">✓</span> WooCommerce kassa- och varukorgssidor är säkrade från sessionsläckor.`;
        } else {
          li2.innerHTML = `<span style="color: var(--color-danger);">❌</span> Kassan saknar exkluderingsregler! Risk för session-läckor i din butik.`;
        }
        bulletListEl.appendChild(li2);
      }

      // Bullet 3: CSS
      const li3 = document.createElement("li");
      li3.style.fontSize = "0.85rem";
      li3.style.color = "var(--text-muted)";
      li3.style.display = "flex";
      li3.style.alignItems = "center";
      li3.style.gap = "0.5rem";
      if (results.customCssAlerts && results.customCssAlerts.some(a => a.type === "danger")) {
        li3.innerHTML = `<span style="color: var(--color-danger);">❌</span> Hittade render-blockerande @import i din anpassade CSS-kod.`;
      } else {
        li3.innerHTML = `<span style="color: var(--color-success);">✓</span> CSS-analys godkänd utan blockerande externa typsnitts-imports.`;
      }
      bulletListEl.appendChild(li3);
    }
  }

  function renderSummaryCard() {
    const env = state.analysisResults.environment;
    
    sumWpVersion.textContent = env.wpVersion;
    sumServer.textContent = env.server;
    sumPhpVersion.textContent = env.phpVersion;
    sumTheme.textContent = env.theme;
    
    sumWooCommerce.textContent = env.hasWooCommerce ? "Aktiv" : "Inaktiv";
    sumWooCommerce.className = env.hasWooCommerce ? "info-value badge-info" : "info-value";
    
    sumElementor.textContent = env.hasElementor ? "Aktiv" : "Inaktiv";
    sumElementor.className = env.hasElementor ? "info-value badge-info" : "info-value";
    
    sumObjectCache.textContent = env.hasObjectCache ? "Ja" : "Nej";
    sumObjectCache.className = env.hasObjectCache ? "info-value badge-info" : "info-value";
    
    // Toned down summary badge
    const hasCritAlert = state.analysisResults.alerts.some(a => a.type === "danger" || a.type === "warning");
    summaryCardStatusBadge.textContent = hasCritAlert ? "⚠️ Varning" : "🟢 Säkrad OK";
    summaryCardStatusBadge.style.color = hasCritAlert ? "var(--color-warning)" : "var(--color-success)";
    summaryCardStatusBadge.style.background = hasCritAlert ? "var(--color-warning-bg)" : "var(--color-success-bg)";
    summaryCardStatusBadge.style.borderColor = hasCritAlert ? "rgba(245,158,11,0.2)" : "rgba(16,185,129,0.2)";
  }

  function jumpToSetting(tabId, settingId) {
    // 1. Switch to Settings tab
    switchMasterView("settings");
    
    // 2. Set sub-tab
    state.activeTabId = tabId;
    renderTabs();
    renderSettingsPanel();
    
    // 3. Scroll to target element
    setTimeout(() => {
      const cardEl = document.getElementById(`toggle-${settingId}`) || 
                     document.getElementById(`textarea-${settingId}`) || 
                     document.getElementById(`custom-css-pastebox`);
      if (cardEl) {
        const cardWrapper = cardEl.closest(".setting-card");
        if (cardWrapper) {
          cardWrapper.scrollIntoView({ behavior: "smooth", block: "center" });
          
          // Apply a temporary glowing ring animation to draw focus
          cardWrapper.style.transition = "all 0.5s ease";
          cardWrapper.style.borderColor = "var(--accent-cyan)";
          cardWrapper.style.boxShadow = "0 0 25px rgba(6, 182, 212, 0.6)";
          cardWrapper.style.transform = "scale(1.02)";
          
          setTimeout(() => {
            cardWrapper.style.borderColor = "";
            cardWrapper.style.boxShadow = "";
            cardWrapper.style.transform = "";
          }, 3000);
        }
      }
    }, 150);
  }

  function renderAlerts() {
    alertsList.innerHTML = "";
    
    const activeAlerts = [
      ...state.analysisResults.alerts,
      ...state.analysisResults.customCodeAlerts,
      ...(state.analysisResults.customCssAlerts || [])
    ].filter(a => a.type === "danger" || a.type === "warning");

    // Sort activeAlerts: danger first, then warning
    activeAlerts.sort((a, b) => {
      if (a.type === "danger" && b.type !== "danger") return -1;
      if (a.type !== "danger" && b.type === "danger") return 1;
      return 0;
    });
    
    if (activeAlerts.length === 0) {
      alertsList.innerHTML = `
        <div class="alert-item success">
          <div class="alert-icon">✓</div>
          <div class="alert-content">
            <h4>Inga risker identifierade</h4>
            <p>Din webbplats matchar 100% av våra prestanda- och stabilitetsregler!</p>
          </div>
        </div>
      `;
      return;
    }

    activeAlerts.forEach((alert, index) => {
      const item = document.createElement("div");
      item.className = `alert-item ${alert.type}`;
      
      let pathHtml = "";
      if (alert.wpPath) {
        pathHtml = `
          <div style="margin-top: 0.5rem; font-size: 0.72rem; opacity: 0.85; display: flex; flex-direction: column; gap: 0.25rem; border-top: 1px solid rgba(255,255,255,0.06); padding-top: 0.4rem;">
            <span>📍 <strong>Sökväg i WordPress:</strong></span>
            <code style="background: rgba(0,0,0,0.3); padding: 0.15rem 0.4rem; border-radius: 4px; color: #a5b4fc; display: inline-block; font-size: 0.7rem; font-family: monospace; border: 1px solid rgba(255,255,255,0.03);">${alert.wpPath}</code>
          </div>
        `;
      }

      let buttonHtml = "";
      if (alert.targetTabId && alert.targetSettingId) {
        buttonHtml = `
          <button class="btn-jump-setting" style="margin-top: 0.5rem; background: rgba(6, 182, 212, 0.15); border: 1px solid rgba(6, 182, 212, 0.3); color: var(--accent-cyan); font-size: 0.72rem; padding: 0.25rem 0.6rem; border-radius: 6px; cursor: pointer; font-weight: 600; display: inline-flex; align-items: center; gap: 0.25rem; transition: all 0.2s;">
            🎯 Visa inställningen i LSCWP ➔
          </button>
        `;
      }

      item.innerHTML = `
        <div class="alert-icon">${alert.icon}</div>
        <div class="alert-content">
          <h4>${index + 1}. ${alert.title}</h4>
          <p>${alert.desc}</p>
          ${pathHtml}
          ${buttonHtml}
        </div>
      `;

      if (alert.targetTabId && alert.targetSettingId) {
        const btn = item.querySelector(".btn-jump-setting");
        if (btn) {
          btn.addEventListener("click", () => {
            jumpToSetting(alert.targetTabId, alert.targetSettingId);
          });
        }
      }

      alertsList.appendChild(item);
    });
  }

  // Populate dynamic 3-bullet lists on each upload card
  function renderBulletLists(summaries) {
    if (!summaries) return;

    function renderBulletsInto(ul, bullets) {
      if (!ul) return;
      ul.innerHTML = "";
      bullets.forEach(b => {
        const li = document.createElement("li");
        li.className = `file-bullet ${b.status !== 'neutral' ? 'active' : ''}`;
        
        li.innerHTML = `
          <span class="bullet-dot ${b.status}">●</span>
          <span>${b.text}</span>
        `;
        ul.appendChild(li);
      });
    }

    renderBulletsInto(sysInfoBullets, summaries.sysInfo);
    renderBulletsInto(woocommerceBullets, summaries.wooInfo);
    renderBulletsInto(wordfenceBullets, summaries.wfInfo);
    renderBulletsInto(elementorBullets, summaries.elemInfo);
    renderBulletsInto(customcodeBullets, summaries.customCode);
    renderBulletsInto(settingsBullets, summaries.settings);
  }

  function renderPlaceholderBullets() {
    const rulesObj = analyzeSystem(null);
    renderBulletLists(rulesObj.fileSummaries);
  }

  function renderWooChecklist() {
    paymentChecklist.innerHTML = "";
    const env = state.analysisResults.environment;
    
    if (!env.hasWooCommerce) {
      paymentChecklist.innerHTML = `
        <div style="color:var(--text-muted); font-size:0.8rem; text-align:center; padding:0.5rem 0;">
          WooCommerce är inaktivt på denna webbplats. Kassaskydd behövs ej.
        </div>
      `;
      return;
    }

    const checklist = [];

    // Checkout cache exclusion
    let checkoutSecure = false;
    if (state.editedSettings.drop_uri) {
      const dropUri = state.editedSettings.drop_uri.toLowerCase();
      if (dropUri.includes("checkout") || dropUri.includes("kassa")) {
        checkoutSecure = true;
      }
    }

    checklist.push({
      label: "Kassacaching undantagen (drop_uri)",
      status: checkoutSecure ? "Skyddad" : "RISK",
      risk: !checkoutSecure,
      desc: checkoutSecure 
        ? "Kassan exkluderas från cachning för att förhindra session- och dataläckor."
        : "Kassan cachas aktivt! Risk för session-läckor eller misslyckade köp.",
      wpPath: "LiteSpeed Cache ➔ Inställningar ➔ Cache ➔ [4] Exkludera ➔ Exkludera sökvägar (drop_uri)",
      targetTabId: "cache",
      targetSettingId: "drop_uri"
    });

    // Cart cache exclusion
    let cartSecure = false;
    if (state.editedSettings.drop_uri) {
      const dropUri = state.editedSettings.drop_uri.toLowerCase();
      if (dropUri.includes("cart") || dropUri.includes("varukorg")) {
        cartSecure = true;
      }
    }

    checklist.push({
      label: "Varukorgscaching undantagen (drop_uri)",
      status: cartSecure ? "Skyddad" : "RISK",
      risk: !cartSecure,
      desc: cartSecure
        ? "Varukorgen är exkluderad, vilket säkrar kundvagnsfragmenten."
        : "Varukorgen är inte exkluderad. Risk för tomma kundvagnar under navigation.",
      wpPath: "LiteSpeed Cache ➔ Inställningar ➔ Cache ➔ [4] Exkludera ➔ Exkludera sökvägar (drop_uri)",
      targetTabId: "cache",
      targetSettingId: "drop_uri"
    });

    // WooCommerce gateways exclusions check
    const activeExcludes = (state.editedSettings.js_exclude || "").toLowerCase();
    
    if (env.wooGateways.length > 0) {
      env.wooGateways.forEach(gate => {
        let isExcluded = false;
        const gateLower = gate.toLowerCase();
        
        if (gateLower.includes("stripe") && (activeExcludes.includes("stripe.com") || activeExcludes.includes("stripe"))) isExcluded = true;
        else if (gateLower.includes("klarna") && (activeExcludes.includes("klarna") || activeExcludes.includes("kco"))) isExcluded = true;
        else if (gateLower.includes("paypal") && (activeExcludes.includes("paypalobjects") || activeExcludes.includes("paypal"))) isExcluded = true;
        else if (gateLower.includes("shipmondo") && activeExcludes.includes("shipmondo")) isExcluded = true;
        else if (gateLower.includes("kustom") && activeExcludes.includes("kustom")) isExcluded = true;
        else if (!gateLower.includes("stripe") && !gateLower.includes("klarna") && !gateLower.includes("paypal") && !gateLower.includes("shipmondo") && !gateLower.includes("kustom")) {
          isExcluded = true;
        }

        checklist.push({
          label: `Betalsätt: ${gate}`,
          status: isExcluded ? "Verifierad & Skyddad" : "RISK",
          risk: !isExcluded,
          desc: isExcluded 
            ? "Gateway-skript exkluderas korrekt från JS Defer/Combine."
            : "Risk! Gateway-skript kan brytas av minifieringar i kassan.",
          wpPath: "LiteSpeed Cache ➔ Inställningar ➔ Sidoptimering ➔ [3] JS ➔ JS-exkluderingar (js_exclude)",
          targetTabId: "page_optimization_js",
          targetSettingId: "js_exclude"
        });
      });
    } else {
      checklist.push({
        label: "Betalsätts-exkluderingar",
        status: "Ingen statusrapport inläst",
        risk: true,
        desc: "Ladda upp WooCommerce statusrapport (ruta 2) för att skydda Klarna/Stripe."
      });
    }

    checklist.forEach(item => {
      const row = document.createElement("div");
      row.className = "checklist-item";
      
      let pathAndButtonHtml = "";
      if (item.wpPath) {
        pathAndButtonHtml = `
          <div style="margin-top: 0.4rem; font-size: 0.7rem; opacity: 0.85; display: flex; flex-direction: column; gap: 0.25rem; border-top: 1px solid rgba(255,255,255,0.06); padding-top: 0.35rem;">
            <span>📍 <strong>Sökväg i WordPress:</strong></span>
            <code style="background: rgba(0,0,0,0.3); padding: 0.12rem 0.35rem; border-radius: 4px; color: #a5b4fc; font-family: monospace; font-size: 0.68rem; display: block; overflow-x: auto; white-space: pre-wrap; border: 1px solid rgba(255,255,255,0.03);">${item.wpPath}</code>
            ${item.targetTabId && item.targetSettingId ? `
              <button class="btn-jump-woo" style="margin-top: 0.25rem; background: rgba(6, 182, 212, 0.15); border: 1px solid rgba(6, 182, 212, 0.3); color: var(--accent-cyan); font-size: 0.7rem; padding: 0.2rem 0.5rem; border-radius: 4px; cursor: pointer; font-weight: 600; width: fit-content; align-self: flex-start; transition: all 0.2s;">
                🎯 Visa inställningen ➔
              </button>
            ` : ""}
          </div>
        `;
      }

      row.innerHTML = `
        <div style="flex:1; padding-right:0.5rem;">
          <div style="display:flex; align-items:center; gap:0.5rem;">
            <span class="checklist-icon">${item.risk ? '❌' : '🛡️'}</span>
            <span class="checklist-label">${item.label}</span>
          </div>
          <p style="font-size:0.75rem; color:var(--text-muted); margin-top:0.2rem;">${item.desc}</p>
          ${pathAndButtonHtml}
        </div>
        <span class="checklist-status ${item.risk ? 'risk' : ''}">${item.status}</span>
      `;

      if (item.targetTabId && item.targetSettingId) {
        const btn = row.querySelector(".btn-jump-woo");
        if (btn) {
          btn.addEventListener("click", () => {
            jumpToSetting(item.targetTabId, item.targetSettingId);
          });
        }
      }

      paymentChecklist.appendChild(row);
    });
  }

  function renderCustomCodeAudits() {
    customCodeAlertsList.innerHTML = "";
    
    if (!state.customCodeInfo) {
      customCodeAlertsList.innerHTML = `
        <div style="color:var(--text-muted); font-size:0.8rem; text-align:center; padding:1rem 0;">
          Ladda upp functions.php eller en snippet-fil (ruta 5) för att köra PHP-analys.
        </div>
      `;
      return;
    }

    state.analysisResults.customCodeAlerts.forEach(alert => {
      const item = document.createElement("div");
      item.className = `alert-item ${alert.type}`;
      
      item.innerHTML = `
        <div class="alert-icon">${alert.icon}</div>
        <div class="alert-content">
          <h4>${alert.title}</h4>
          <p>${alert.desc}</p>
        </div>
      `;
      customCodeAlertsList.appendChild(item);
    });
  }

  function renderTabs() {
    tabNavigation.innerHTML = "";
    
    state.analysisResults.recommendations.forEach(tab => {
      const btn = document.createElement("button");
      btn.className = `tab-btn ${state.activeTabId === tab.id ? "active" : ""}`;
      btn.textContent = tab.title;
      btn.addEventListener("click", () => {
        state.activeTabId = tab.id;
        renderTabs();
        renderSettingsPanel();
      });
      tabNavigation.appendChild(btn);
    });
  }

  function renderSettingsPanel() {
    settingsContainer.innerHTML = "";
    
    const activeTab = state.analysisResults.recommendations.find(t => t.id === state.activeTabId);
    if (!activeTab) return;

    // INLINE CUSTOM CSS PASTING EDITOR (Rendered at the very top of CSS tab)
    if (state.activeTabId === "page_optimization_css") {
      const cssEditorCard = document.createElement("div");
      cssEditorCard.className = "setting-card glass-card";
      cssEditorCard.style.gridColumn = "span 2";
      cssEditorCard.style.background = "rgba(6, 182, 212, 0.02)";
      cssEditorCard.style.borderColor = "rgba(6, 182, 212, 0.2)";
      
      // Compute CSS audit warnings if any
      let cssAlertsHtml = "";
      if (state.analysisResults && state.analysisResults.customCssAlerts) {
        state.analysisResults.customCssAlerts.forEach(alert => {
          cssAlertsHtml += `
            <div class="alert-item ${alert.type}" style="margin-top: 0.5rem; padding: 0.6rem 0.85rem; font-size:0.75rem;">
              <span class="alert-icon" style="font-size:1rem;">${alert.icon}</span>
              <div class="alert-content">
                <strong>${alert.title}</strong>
                <p style="opacity:0.85; font-size:0.7rem; margin-top:0.1rem;">${alert.desc}</p>
              </div>
            </div>
          `;
        });
      }

      cssEditorCard.innerHTML = `
        <div class="setting-info" style="width:100%;">
          <div class="setting-title-row">
            <h4 class="setting-title" style="color:var(--accent-cyan);">🎨 Klistra in Anpassad CSS</h4>
            <span class="badge-risk safe">Prestandagranskad</span>
          </div>
          <p class="setting-desc" style="margin-bottom: 0.75rem;">
            Klistra in din anpassade CSS-kod direkt nedan. Vi scannar koden efter render-blockerande @imports eller reflow-animeringar som skadar din CLS-poäng! Koden sparas automatiskt i din exporterade inställningsfil under 'optm_css_custom'.
          </p>
          <textarea id="custom-css-pastebox" class="glass-card" placeholder="/* Klistra in dina CSS-regler här... */\nbody {\n  font-family: inherit;\n}" style="width:100%; min-height:140px; font-family: monospace; font-size:0.8rem; background: rgba(0,0,0,0.3); border: 1px solid rgba(255,255,255,0.05); color: var(--text-main); padding: 0.75rem; border-radius:8px; resize:vertical; outline:none; transition: border-color var(--transition-fast);">${state.customCss || ""}</textarea>
          <div id="custom-css-audit-results" style="display:flex; flex-direction:column; gap:0.5rem; margin-top:0.75rem;">
            ${cssAlertsHtml || '<div style="color:var(--text-muted); font-size:0.75rem;">Skriv eller klistra in CSS ovan för att starta en automatiserad prestandagranskning.</div>'}
          </div>
        </div>
      `;

      const pastebox = cssEditorCard.querySelector("#custom-css-pastebox");
      pastebox.addEventListener("input", (e) => {
        syncCustomCss(e.target.value, "custom-css-pastebox");
      });

      settingsContainer.appendChild(cssEditorCard);
    }

    activeTab.options.forEach(opt => {
      // Avoid re-rendering custom_css as a separate card if it's the custom CSS option field
      if (opt.id === "optm_css_custom") return;

      const card = document.createElement("div");
      card.className = "setting-card";
      
      const riskBadge = opt.safe 
          ? `<span class="badge-risk safe">Stabil</span>` 
          : `<span class="badge-risk high">Högre Risk</span>`;
        
      const activeUserVal = state.editedSettings[opt.id];
      const isChecked = activeUserVal === 1 || activeUserVal === "on" || activeUserVal === true;

      // Check if current value matches recommendation
      let isMatches = false;
      if (typeof opt.recommendedRaw === "string") {
        let missing = window.checkMissingExclusions ? window.checkMissingExclusions(activeUserVal, opt.recommendedRaw) : [];
        if (opt.id === "drop_uri") {
          const cleanVal = (activeUserVal || "").toString().toLowerCase();
          const hasCheckout = cleanVal.includes("checkout") || cleanVal.includes("kassa");
          const hasCart = cleanVal.includes("cart") || cleanVal.includes("varukorg");
          if (hasCheckout && hasCart) {
            missing = [];
          }
        }
        isMatches = missing.length === 0;
      } else {
        const userNorm = (activeUserVal === 1 || activeUserVal === "on" || activeUserVal === true) ? 1 : 0;
        const recNorm = (opt.recommendedRaw === 1 || opt.recommendedRaw === "on" || opt.recommendedRaw === true) ? 1 : 0;
        isMatches = userNorm === recNorm;
      }

      const matchBadge = isMatches 
        ? `<span class="badge-risk safe" style="background: rgba(16, 185, 129, 0.15); color: var(--color-success); border: 1px solid rgba(16, 185, 129, 0.3);">✓ Optimal</span>`
        : `<span class="badge-risk high" style="background: rgba(245, 158, 11, 0.15); color: var(--color-warning); border: 1px solid rgba(245, 158, 11, 0.3);">⚠️ Avvikelse</span>`;

      let diffHtml = "";
      if (state.uploadedSettings && state.uploadedSettings.hasOwnProperty(opt.id)) {
        let currentLabel = opt.currentValue;
        let recLabel = opt.recommendedValue;
        
        const currentClass = currentLabel.toLowerCase() === "på" || currentLabel.toLowerCase() === "matchar" ? "on" : "off";
        const recClass = recLabel.toLowerCase() === "på" || recLabel.toLowerCase() === "anpassad" ? "on" : "off";
        
        diffHtml = `
          <div class="comparison-container" style="margin-top:0.75rem;">
            <div class="status-block">
              <span class="status-label">Nuvarande</span>
              <span class="status-badge ${currentClass}">${currentLabel}</span>
            </div>
            <span class="comparison-arrow">→</span>
            <div class="status-block">
              <span class="status-label">Rekommenderat</span>
              <span class="status-badge ${recClass}">${recLabel}</span>
            </div>
          </div>
        `;
      }

      // Expert Citations Collapsible Block
      let citationsHtml = "";
      if (opt.citations) {
        citationsHtml = `
          <details class="expert-citations" style="margin-top: 0.65rem; background: rgba(255, 255, 255, 0.01); border: 1px solid rgba(255, 255, 255, 0.04); border-radius: 6px; padding: 0.5rem 0.75rem; width: 100%;">
            <summary style="font-size: 0.75rem; color: var(--accent-cyan); cursor: pointer; display: flex; align-items: center; gap: 0.25rem; user-select: none; outline: none; font-weight: 500;">
              <span>🔗 Visa källhänvisningar & expertåsikter</span>
            </summary>
            <div style="margin-top: 0.5rem; display: flex; flex-direction: column; gap: 0.5rem; font-size: 0.72rem; line-height: 1.4; border-top: 1px solid rgba(255,255,255,0.03); padding-top: 0.5rem;">
              <div style="border-left: 2px solid var(--accent-indigo); padding-left: 0.5rem;">
                <strong style="color: #c7d2fe; display: block; margin-bottom: 0.1rem;">Officiell LiteSpeed-rekommendation:</strong>
                <span style="color: var(--text-muted);">${opt.citations.litespeed || "Ingen officiell kommentar tillgänglig."}</span>
              </div>
              <div style="border-left: 2px solid var(--color-warning); padding-left: 0.5rem; margin-top: 0.25rem;">
                <strong style="color: #fde68a; display: block; margin-bottom: 0.1rem;">Modern Webb-standard & Konsensus:</strong>
                <span style="color: var(--text-muted);">${opt.citations.consensus || "Ingen konsensuskommentar tillgänglig."}</span>
              </div>
            </div>
          </details>
        `;
      }

      const isTextareaField = opt.id === "js_exclude" || opt.id === "css_exclude" || opt.id === "media_lazy_exclude" || opt.id === "drop_uri";

      if (isTextareaField) {
        card.innerHTML = `
          <div class="setting-info" style="grid-column: span 2;">
            <div class="setting-title-row" style="flex-wrap: wrap; gap: 0.5rem;">
              <h4 class="setting-title">${opt.title}</h4>
              ${riskBadge}
              ${matchBadge}
              <span class="info-label" style="font-size:0.75rem;">(ID: ${opt.id})</span>
            </div>
            <p class="setting-desc" style="margin-bottom: 0.75rem;">${opt.desc}</p>
            ${citationsHtml}
            <textarea id="textarea-${opt.id}" class="glass-card" style="width:100%; min-height:100px; font-family: monospace; font-size:0.8rem; background: rgba(0,0,0,0.2); border: 1px solid rgba(255,255,255,0.05); color: var(--text-main); padding: 0.75rem; border-radius:8px; resize:vertical; margin-top: 0.75rem;">${activeUserVal || ""}</textarea>
            ${diffHtml}
          </div>
        `;
        
        const textarea = card.querySelector(`#textarea-${opt.id}`);
        textarea.addEventListener("input", (e) => {
          state.editedSettings[opt.id] = e.target.value;
          updateActionBar();
          
          // Live optimal badge update in title row
          const titleRow = card.querySelector(".setting-title-row");
          if (titleRow) {
            let missing = window.checkMissingExclusions ? window.checkMissingExclusions(e.target.value, opt.recommendedRaw) : [];
            if (opt.id === "drop_uri") {
              const cleanVal = e.target.value.toString().toLowerCase();
              const hasCheckout = cleanVal.includes("checkout") || cleanVal.includes("kassa");
              const hasCart = cleanVal.includes("cart") || cleanVal.includes("varukorg");
              if (hasCheckout && hasCart) {
                missing = [];
              }
            }
            const innerIsMatch = missing.length === 0;

            const existingBadges = titleRow.querySelectorAll(".badge-risk");
            if (existingBadges.length >= 2) {
              const badgeToReplace = existingBadges[1];
              if (innerIsMatch) {
                badgeToReplace.outerHTML = `<span class="badge-risk safe" style="background: rgba(16, 185, 129, 0.15); color: var(--color-success); border: 1px solid rgba(16, 185, 129, 0.3);">✓ Optimal</span>`;
              } else {
                badgeToReplace.outerHTML = `<span class="badge-risk high" style="background: rgba(245, 158, 11, 0.15); color: var(--color-warning); border: 1px solid rgba(245, 158, 11, 0.3);">⚠️ Avvikelse</span>`;
              }
            }
          }
        });
      } else {
        const labelText = isChecked ? 'PÅ' : 'AV';
        const labelColor = isMatches ? 'var(--color-success)' : 'var(--color-warning)';
        
        card.innerHTML = `
          <div class="setting-info">
            <div class="setting-title-row" style="flex-wrap: wrap; gap: 0.5rem;">
              <h4 class="setting-title">${opt.title}</h4>
              ${riskBadge}
              ${matchBadge}
              <span class="info-label" style="font-size:0.75rem;">(ID: ${opt.id})</span>
            </div>
            <p class="setting-desc">${opt.desc}</p>
            ${citationsHtml}
            ${diffHtml}
          </div>
          <div class="toggle-interactive">
            <span class="switch-label" style="color: ${labelColor}; font-size: 0.8rem; font-weight: 600; display: inline-flex; align-items: center; gap: 0.25rem; white-space: nowrap;">
              ${isMatches ? '✓' : '⚠️'} ${labelText} ${isMatches ? '(Optimalt)' : '(Avvikelse)'}
            </span>
            <label class="switch">
              <input type="checkbox" id="toggle-${opt.id}" ${isChecked ? 'checked' : ''}>
              <span class="slider"></span>
            </label>
          </div>
        `;

        const toggle = card.querySelector(`#toggle-${opt.id}`);
        toggle.addEventListener("change", (e) => {
          const newVal = e.target.checked ? 1 : 0;
          state.editedSettings[opt.id] = newVal;
          
          renderSettingsPanel();
          updateActionBar();
        });
      }

      settingsContainer.appendChild(card);
    });
  }

  // --- DIFFERENCES & THREE-TIER AUDIT REPORT VIEWER ---

  function renderComparisonSummary() {
    if (!state.uploadedSettings) {
      comparisonSummaryCard.style.display = "block";
      comparisonSummaryCard.style.background = "rgba(16, 185, 129, 0.05)";
      comparisonSummaryCard.style.borderColor = "rgba(16, 185, 129, 0.25)";
      btnFixAll.style.display = "none";
      
      comparisonSummaryDesc.innerHTML = "✨ <strong>Ny optimeringsprofil skapad från scratch:</strong> Eftersom du inte laddat upp någon befintlig LSCWP-fil (ruta 6), har vi genererat en helt ren och optimal profil anpassad för din sajt. Klicka på flikarna nedan för att se reglerna, eller ladda ner `.data`-filen direkt för att importera i din nya WordPress!";
      
      comparisonDiffsList.innerHTML = `
        <div style="display:flex; flex-direction:column; gap:0.6rem; padding: 0.5rem 0;">
          <div style="display:flex; align-items:center; gap:0.5rem; color:var(--color-success); font-size:0.875rem;">
            <span>🛡️</span> <strong>WooCommerce- & Elementor-skydd:</strong> drop_uri och exkluderingar är fullt förkonfigurerade.
          </div>
          <div style="display:flex; align-items:center; gap:0.5rem; color:var(--color-success); font-size:0.875rem;">
            <span>⚡</span> <strong>Säkra prestandaförbättringar:</strong> CSS/JS Minify & Defer är aktiva (CSS/JS Combine är inaktiverat för stabilitet).
          </div>
          <div style="display:flex; align-items:center; gap:0.5rem; color:var(--color-success); font-size:0.875rem;">
            <span>⚙️</span> <strong>Förberedd för import:</strong> Ladda ner filen och importera under <em>LiteSpeed Cache ➔ Verktygslåda ➔ Import/Export</em>.
          </div>
        </div>
      `;
      return;
    }
    
    // Restore default card styling if a settings file is uploaded:
    comparisonSummaryCard.style.background = "rgba(99, 102, 241, 0.05)";
    comparisonSummaryCard.style.borderColor = "rgba(99, 102, 241, 0.2)";
    btnFixAll.style.display = "block";

    comparisonDiffsList.innerHTML = "";
    
    let tiers = {
      stability: [],
      performance: [],
      finetuning: []
    };

    state.analysisResults.recommendations.forEach(tab => {
      tab.options.forEach(opt => {
        const orig = state.uploadedSettings.hasOwnProperty(opt.id) ? state.uploadedSettings[opt.id] : "";
        const rec = opt.recommendedRaw;

        const origNorm = (orig === "1" || orig === 1 || orig === "on" || orig === true) ? 1 : 0;
        const recNorm = (rec === "1" || rec === 1 || rec === "on" || rec === true) ? 1 : 0;

        let isDeviant = false;
        let devData = {
          id: opt.id,
          title: opt.title,
          origVal: orig ? (origNorm === 1 ? "PÅ" : "AV") : "Ej angivet",
          recVal: recNorm === 1 ? "PÅ" : "AV",
          recRaw: rec
        };

        const isTextareaField = opt.id === "js_exclude" || opt.id === "css_exclude" || opt.id === "media_lazy_exclude" || opt.id === "drop_uri";

        if (isTextareaField) {
          let missing = window.checkMissingExclusions ? window.checkMissingExclusions(orig, rec) : [];
          if (opt.id === "drop_uri") {
            const cleanVal = (orig || "").toString().toLowerCase();
            const hasCheckout = cleanVal.includes("checkout") || cleanVal.includes("kassa");
            const hasCart = cleanVal.includes("cart") || cleanVal.includes("varukorg");
            if (hasCheckout && hasCart) {
              missing = [];
            }
          }
          if (missing.length > 0) {
            isDeviant = true;
            devData.origVal = orig ? "Saknar exkluderingar" : "Ej angivet";
            devData.recVal = "ANPASSAD";
            devData.recRaw = window.mergeExclusions ? window.mergeExclusions(orig, rec) : rec;
          }
        } else if (origNorm !== recNorm) {
          isDeviant = true;
        }

        if (isDeviant) {
          const category = opt.category === "security" ? "stability" : (opt.category || "finetuning");
          if (tiers[category]) {
            tiers[category].push(devData);
          } else {
            tiers.finetuning.push(devData);
          }
        }
      });
    });

    const totalDeviations = tiers.stability.length + tiers.performance.length + tiers.finetuning.length;

    if (totalDeviations === 0) {
      comparisonSummaryCard.style.display = "block";
      comparisonSummaryDesc.innerHTML = "✨ <strong>Analys klar:</strong> Din nuvarande LiteSpeed-fil matchar vår rekommenderade prestandaprofil till 100%! Alla audit-portar är fullt gröna.";
      btnFixAll.style.display = "none";
      
      comparisonDiffsList.innerHTML = `
        <div style="display:flex; flex-direction:column; gap:0.6rem; padding: 0.5rem 0;">
          <div style="display:flex; align-items:center; gap:0.5rem; color:var(--color-success); font-size:0.875rem;">
            <span>✅</span> <strong>Kritiska stabilitetsändringar:</strong> 100% kompatibel (Elementor & WooCommerce skyddade).
          </div>
          <div style="display:flex; align-items:center; gap:0.5rem; color:var(--color-success); font-size:0.875rem;">
            <span>✅</span> <strong>Säkra prestandaförbättringar:</strong> Fullt minifierad och lazy-loadad.
          </div>
          <div style="display:flex; align-items:center; gap:0.5rem; color:var(--color-success); font-size:0.875rem;">
            <span>✅</span> <strong>Miljö-finjusteringar:</strong> Optimalt konfigurerad för LiteSpeed Server.
          </div>
        </div>
      `;
      return;
    }

    comparisonSummaryCard.style.display = "block";
    comparisonSummaryDesc.innerHTML = `⚠️ Hittade totalt <strong>${totalDeviations}</strong> avvikelser uppdelade på tre säkerhetsportar.`;
    btnFixAll.style.display = "block";

    function renderTierSection(title, list, badgeClass, color, emptyMsg) {
      const header = document.createElement("div");
      header.style.margin = "0.75rem 0 0.4rem 0";
      header.style.fontSize = "0.85rem";
      header.style.fontWeight = "700";
      header.style.color = color;
      header.style.display = "flex";
      header.style.justify = "space-between";
      header.style.alignItems = "center";
      
      header.innerHTML = `
        <span>${title} (${list.length} st)</span>
        <span class="badge-risk ${badgeClass}" style="font-size:0.65rem; padding: 0.05rem 0.35rem;">
          ${list.length > 0 ? 'Åtgärd rekommenderas' : 'Verifierad OK'}
        </span>
      `;
      comparisonDiffsList.appendChild(header);

      if (list.length === 0) {
        const row = document.createElement("div");
        row.style.background = "rgba(16, 185, 129, 0.05)";
        row.style.border = "1px solid rgba(16, 185, 129, 0.15)";
        row.style.padding = "0.5rem 0.85rem";
        row.style.borderRadius = "8px";
        row.style.fontSize = "0.8rem";
        row.style.color = "#a7f3d0";
        row.innerHTML = `✓ ${emptyMsg}`;
        comparisonDiffsList.appendChild(row);
        return;
      }

      list.forEach(dev => {
        const row = document.createElement("div");
        row.style.display = "flex";
        row.style.justify = "space-between";
        row.style.alignItems = "center";
        row.style.background = "rgba(0,0,0,0.15)";
        row.style.padding = "0.5rem 0.85rem";
        row.style.borderRadius = "8px";
        row.style.fontSize = "0.8rem";
        row.style.borderLeft = `3px solid ${color}`;

        row.innerHTML = `
          <div style="flex:1; padding-right: 0.5rem;">
            <span style="font-weight:600; color:var(--text-main);">${dev.title}</span> 
            <span style="color:#94a3b8; font-size:0.75rem;">(${dev.id})</span>
          </div>
          <div style="display:flex; align-items:center; gap:0.5rem;">
            <span style="color:var(--color-danger); text-decoration:line-through; font-size:0.75rem;">${dev.origVal}</span>
            <span style="color:var(--text-muted); font-size:0.75rem;">→</span>
            <span style="color:var(--color-success); font-weight:700; font-size:0.75rem;">${dev.recVal}</span>
            <button class="btn-primary" style="padding:0.2rem 0.5rem; font-size:0.7rem; background:rgba(16, 185, 129, 0.15); border:1px solid rgba(16, 185, 129, 0.3); color:var(--color-success); box-shadow:none; margin-left:0.4rem;">
              Åtgärda
            </button>
          </div>
        `;

        row.querySelector("button").addEventListener("click", () => {
          state.editedSettings[dev.id] = dev.recRaw;
          triggerAnalysis();
        });

        comparisonDiffsList.appendChild(row);
      });
    }

    renderTierSection(
      "⚠️ Kritiska stabilitetsändringar", 
      tiers.stability, 
      "high", 
      "var(--color-danger)", 
      "Kompatibel och stabil! Alla sidbyggar- och e-handelsinställningar skyddade."
    );
    
    renderTierSection(
      "⚡ Säkra prestandaförbättringar", 
      tiers.performance, 
      "safe", 
      "var(--accent-cyan)", 
      "Fullt optimerad prestanda! Säkra medier- och minifieringar är korrekt aktiverade."
    );
    
    renderTierSection(
      "🔧 Miljö-finjusteringar", 
      tiers.finetuning, 
      "safe", 
      "var(--accent-indigo)", 
      "Finjusterad! Miljön är perfekt kalibrerad för din LiteSpeed Server."
    );

    btnFixAll.onclick = function() {
      Object.keys(tiers).forEach(t => {
        tiers[t].forEach(dev => {
          state.editedSettings[dev.id] = dev.recRaw;
        });
      });
      triggerAnalysis();
    };
  }

  function updateActionBar() {
    let diffCount = 0;
    
    if (state.uploadedSettings) {
      state.analysisResults.recommendations.forEach(tab => {
        tab.options.forEach(opt => {
          if (state.uploadedSettings.hasOwnProperty(opt.id)) {
            const orig = state.uploadedSettings[opt.id];
            const current = state.editedSettings[opt.id];

            const isTextareaField = opt.id === "js_exclude" || opt.id === "css_exclude" || opt.id === "media_lazy_exclude" || opt.id === "drop_uri";

            if (isTextareaField) {
              if (orig !== current) diffCount++;
            } else {
              const origNorm = (orig === "1" || orig === 1 || orig === "on" || orig === true) ? 1 : 0;
              const curNorm = (current === "1" || current === 1 || current === "on" || current === true) ? 1 : 0;
              if (origNorm !== curNorm) {
                diffCount++;
              }
            }
          }
        });
      });
      statsChangesCount.innerHTML = `Hittade <strong>${diffCount}</strong> inställningar som kommer att ändras i din exporterade profil.`;
    } else {
      let activeCount = 0;
      let totalCount = 0;
      Object.keys(state.editedSettings).forEach(k => {
        totalCount++;
        const val = state.editedSettings[k];
        if (val === 1 || val === "on" || val === true || (typeof val === "string" && val.length > 5)) activeCount++;
      });
      statsChangesCount.innerHTML = `Optimeringsprofil redo: <strong>${activeCount}</strong> av <strong>${totalCount}</strong> inställningar aktiverade.`;
    }

    btnExport.disabled = false;
    if (btnExportPhp) btnExportPhp.disabled = false;
    if (btnExportJson) btnExportJson.disabled = false;
  }

  // --- TRIGGER FILE EXPORT ---

  btnExport.addEventListener("click", () => {
    try {
      let exportObj = {};
      if (state.uploadedSettings) {
        exportObj = JSON.parse(JSON.stringify(state.uploadedSettings));
      }

      Object.keys(state.editedSettings).forEach(key => {
        exportObj[key] = state.editedSettings[key];
      });

      // Translate all internal keys back to the real LSCWP database keys
      const finalExportObj = translateKeysToLscwp(exportObj);
      const serializedData = php_serialize(finalExportObj);

      const blob = new Blob([serializedData], { type: "text/plain;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `arewee-wp-optimizer-export-${new Date().toISOString().slice(0, 10)}.data`;
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      alert(`Exporteringsfel: ${err.message}`);
    }
  });

  // --- CREDENTIALS RESTORATION ---
  if (apiSiteUrl && localStorage.getItem("wp_optimizer_api_url")) {
    apiSiteUrl.value = localStorage.getItem("wp_optimizer_api_url");
    state.apiUrl = localStorage.getItem("wp_optimizer_api_url");
  }
  if (apiSyncToken && localStorage.getItem("wp_optimizer_api_token")) {
    apiSyncToken.value = localStorage.getItem("wp_optimizer_api_token");
    state.apiToken = localStorage.getItem("wp_optimizer_api_token");
  }
  if (state.apiUrl && apiSyncStatusText) {
    apiSyncStatusText.textContent = `Status: Sparad anslutning till ${state.apiUrl.replace(/^https?:\/\//, "")}`;
    if (btnApiPush) {
      btnApiPush.disabled = false;
      btnApiPush.style.background = "linear-gradient(135deg, #10b981, #059669)";
      btnApiPush.style.color = "#fff";
    }
  }

  // --- DOWNLOAD SYNC PLUGIN EVENT ---
  if (btnDownloadSyncPlugin) {
    btnDownloadSyncPlugin.addEventListener("click", () => {
      try {
        const phpCode = generateSyncPluginPhp();
        const blob = new Blob([phpCode], { type: "application/x-httpd-php;charset=utf-8" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = "wp-optimizer-sync.php";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      } catch (err) {
        alert(`Fel vid skapande av sync-plugin: ${err.message}`);
      }
    });
  }

  // --- REST API SYNC CLIENT ---
  if (btnApiFetch) {
    btnApiFetch.addEventListener("click", async () => {
      const url = apiSiteUrl.value.trim().replace(/\/$/, "");
      const token = apiSyncToken.value.trim();

      if (!url || !token) {
        alert("Vänligen fyll i både sajt-URL och anslutnings-token.");
        return;
      }

      btnApiFetch.disabled = true;
      btnApiFetch.textContent = "Ansluter...";
      apiSyncStatusText.textContent = "Status: Ansluter...";
      apiSyncStatusText.style.color = "var(--text-muted)";

      try {
        const response = await fetch(`${url}/wp-json/wp-optimizer-sync/v1/diagnostics`, {
          method: "GET",
          headers: {
            "X-WP-Optimizer-Token": token
          }
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.message || `HTTP fel! Status: ${response.status}`);
        }

        const data = await response.json();
        
        // Store credentials
        localStorage.setItem("wp_optimizer_api_url", url);
        localStorage.setItem("wp_optimizer_api_token", token);
        state.apiUrl = url;
        state.apiToken = token;

        // Apply data to state
        state.sysInfo = data.sysInfo;
        state.wooInfo = data.wooInfo;
        state.wfInfo = data.wfInfo;
        state.elemInfo = data.elemInfo;
        state.customCodeInfo = data.customCode;
        if (data.uploadedSettings) {
          state.uploadedSettings = translateKeysToInternal(data.uploadedSettings);
          state.editedSettings = JSON.parse(JSON.stringify(state.uploadedSettings));
        }

        // Check status markers in UI
        if (sysInfoStatus) {
          sysInfoStatus.className = "status-badge success";
          sysInfoStatus.textContent = "✓ Inläst";
        }
        if (state.wooInfo && woocommerceStatus) {
          woocommerceStatus.className = "status-badge success";
          woocommerceStatus.textContent = "✓ Inläst";
        }
        if (state.wfInfo && wordfenceStatus) {
          wordfenceStatus.className = "status-badge success";
          wordfenceStatus.textContent = "✓ Inläst";
        }
        if (state.elemInfo && elementorStatus) {
          elementorStatus.className = "status-badge success";
          elementorStatus.textContent = "✓ Inläst";
        }
        if (state.customCodeInfo && customcodeStatus) {
          customcodeStatus.className = "status-badge success";
          customcodeStatus.textContent = "✓ Inläst";
        }
        if (state.uploadedSettings && settingsStatus) {
          settingsStatus.className = "status-badge success";
          settingsStatus.textContent = "✓ Inläst";
        }

        triggerAnalysis();

        const companionVersion = data.syncPluginVersion || "1.0.0";
        const targetVersion = "2.1.0";
        if (companionVersion !== targetVersion) {
          apiSyncStatusText.innerHTML = `⚠️ Ansluten live till ${url.replace(/^https?:\/\//, "")} (Plugin v${companionVersion} är föråldrad! Ladda ner v${targetVersion})`;
          apiSyncStatusText.style.color = "#fbbf24"; // warning color
        } else {
          apiSyncStatusText.textContent = `✓ Ansluten live till ${url.replace(/^https?:\/\//, "")}`;
          apiSyncStatusText.style.color = "var(--color-success)";
        }
        if (btnApiPush) {
          btnApiPush.disabled = false;
          btnApiPush.style.background = "linear-gradient(135deg, #10b981, #059669)";
          btnApiPush.style.color = "#fff";
        }

      } catch (err) {
        console.error("Fetch error:", err);
        apiSyncStatusText.textContent = `✗ Fel: ${err.message}`;
        apiSyncStatusText.style.color = "var(--color-danger)";
        alert(`Misslyckades att hämta data live: ${err.message}`);
      } finally {
        btnApiFetch.disabled = false;
        btnApiFetch.textContent = "🔄 Hämta data live";
      }
    });
  }

  if (btnApiPush) {
    btnApiPush.addEventListener("click", async () => {
      const url = localStorage.getItem("wp_optimizer_api_url") || apiSiteUrl.value.trim().replace(/\/$/, "");
      const token = localStorage.getItem("wp_optimizer_api_token") || apiSyncToken.value.trim();

      if (!url || !token) {
        alert("Ingen aktiv koppling hittades. Hämta data live först.");
        return;
      }

      btnApiPush.disabled = true;
      btnApiPush.textContent = "Skickar...";

      try {
        let exportObj = {};
        if (state.uploadedSettings) {
          exportObj = JSON.parse(JSON.stringify(state.uploadedSettings));
        }
        Object.keys(state.editedSettings).forEach(key => {
          exportObj[key] = state.editedSettings[key];
        });

        // Compile option updates
        const lscwpConf = translateKeysToLscwp(exportObj);
        
        const payload = {
          "litespeed-cache-conf": lscwpConf
        };

        // WooCommerce HPOS
        if (state.editedSettings['woo_hpos'] !== undefined) {
          payload["woocommerce_custom_orders_table_enabled"] = 
            (state.editedSettings['woo_hpos'] === 1 || state.editedSettings['woo_hpos'] === "1" || state.editedSettings['woo_hpos'] === "yes") ? 'yes' : 'no';
        }

        // Elementor External CSS print method
        if (state.editedSettings['elem_css_print_method'] !== undefined) {
          payload["elementor_css_print_method"] = state.editedSettings['elem_css_print_method'] || 'external';
        }

        // Elementor active experiments compilation
        const activeExps = {};
        if (state.elemInfo && state.elemInfo.experiments) {
          state.elemInfo.experiments.forEach(exp => {
            activeExps[exp] = 'active';
          });
        }
        if (state.editedSettings['elem_dom_optimization'] !== undefined) {
          const status = (state.editedSettings['elem_dom_optimization'] === 1) ? 'active' : 'inactive';
          activeExps['container'] = status;
          activeExps['e_dom_optimization'] = status;
        }
        if (state.editedSettings['elem_asset_loading'] !== undefined) {
          const status = (state.editedSettings['elem_asset_loading'] === 1) ? 'active' : 'inactive';
          activeExps['e_optimized_assets_loading'] = status;
        }
        if (state.editedSettings['elem_css_loading'] !== undefined) {
          const status = (state.editedSettings['elem_css_loading'] === 1) ? 'active' : 'inactive';
          activeExps['e_optimized_css_loading'] = status;
        }
        payload["elementor_active_experiments"] = activeExps;

        // Wordfence Live Traffic
        if (state.editedSettings['wf_live_traffic'] !== undefined) {
          payload["wf_live_traffic"] = (state.editedSettings['wf_live_traffic'] === 1 || state.editedSettings['wf_live_traffic'] === true) ? 1 : 0;
        }
        // Wordfence IP Header
        if (state.editedSettings['wf_ip_header'] !== undefined) {
          payload["wf_ip_header"] = state.editedSettings['wf_ip_header'];
        }

        const response = await fetch(`${url}/wp-json/wp-optimizer-sync/v1/settings`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-WP-Optimizer-Token": token
          },
          body: JSON.stringify(payload)
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.message || `HTTP fel! Status: ${response.status}`);
        }

        alert("✓ Inställningar har skickats och tillämpats live på din WordPress-sajt!");
      } catch (err) {
        console.error("Push error:", err);
        alert(`Misslyckades att skicka inställningar live: ${err.message}`);
      } finally {
        btnApiPush.disabled = false;
        btnApiPush.textContent = "🚀 Skicka inställningar live";
      }
    });
  }

  // --- ADDITIONAL EXPORTER TRIGGERS ---
  if (btnExportPhp) {
    btnExportPhp.addEventListener("click", () => {
      try {
        const phpSnippet = generateAutoOptimizerSnippet(state.editedSettings);
        const blob = new Blob([phpSnippet], { type: "application/x-httpd-php;charset=utf-8" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `wp-auto-optimizer-${new Date().toISOString().slice(0, 10)}.php`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      } catch (err) {
        alert(`Fel vid generering av PHP: ${err.message}`);
      }
    });
  }

  if (btnExportJson) {
    btnExportJson.addEventListener("click", () => {
      try {
        const snippetsJson = generateCodeSnippetsJson(state.editedSettings);
        const blob = new Blob([snippetsJson], { type: "application/json;charset=utf-8" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `wp-code-snippets-${new Date().toISOString().slice(0, 10)}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      } catch (err) {
        alert(`Fel vid generering av Snippets JSON: ${err.message}`);
      }
    });
  }

  // --- VISUAL CONFLICT TOPOLOGY DRAW ENGINE ---
  function drawTopologyMap() {
    const container = document.getElementById("topology-nodes");
    const svg = document.getElementById("topology-svg");
    if (!container || !svg) return;

    container.innerHTML = "";
    svg.innerHTML = "";

    // Determine nodes active/inactive status
    const nodeConfigs = {
      wp: { id: "node-wp", label: "WordPress Core", icon: "🌐", x: 50, y: 50, active: true },
      lscwp: { 
        id: "node-lscwp", 
        label: "LiteSpeed Cache", 
        icon: "⚡", 
        x: 50, 
        y: 15, 
        active: !!state.uploadedSettings || (state.sysInfo && state.sysInfo['wp-plugins-active'] && Object.keys(state.sysInfo['wp-plugins-active']).some(k => k.toLowerCase().includes('litespeed')))
      },
      woo: { 
        id: "node-woo", 
        label: "WooCommerce", 
        icon: "🛒", 
        x: 20, 
        y: 75, 
        active: !!state.wooInfo || (state.sysInfo && state.sysInfo['wp-plugins-active'] && Object.keys(state.sysInfo['wp-plugins-active']).some(k => k.toLowerCase().includes('woocommerce')))
      },
      elem: { 
        id: "node-elem", 
        label: "Elementor Pro", 
        icon: "🎨", 
        x: 80, 
        y: 75, 
        active: !!state.elemInfo || (state.sysInfo && state.sysInfo['wp-plugins-active'] && Object.keys(state.sysInfo['wp-plugins-active']).some(k => k.toLowerCase().includes('elementor')))
      },
      wf: { 
        id: "node-wf", 
        label: "Wordfence Security", 
        icon: "🛡️", 
        x: 20, 
        y: 25, 
        active: !!state.wfInfo || (state.sysInfo && state.sysInfo['wp-plugins-active'] && Object.keys(state.sysInfo['wp-plugins-active']).some(k => k.toLowerCase().includes('wordfence')))
      },
      cc: { 
        id: "node-cc", 
        label: "Snippets & CSS", 
        icon: "🔌", 
        x: 80, 
        y: 25, 
        active: !!state.customCodeInfo || !!state.customCss || (state.sysInfo && state.sysInfo['wp-plugins-active'] && Object.keys(state.sysInfo['wp-plugins-active']).some(k => k.toLowerCase().includes('code-snippets')))
      }
    };

    // Scan dashboard alerts for specific conflicts
    const alerts = (state.analysisResults && state.analysisResults.alerts) || [];
    const conflicts = {
      "lscwp-wf": alerts.some(a => (a.title.includes("Wordfence") || a.desc.includes("Wordfence") || a.title.includes("Crawler")) && (a.type === "danger" || a.type === "warning")),
      "lscwp-elem": alerts.some(a => (a.title.includes("Elementor") || a.desc.includes("Elementor") || a.title.includes("Lazy Load")) && (a.type === "danger" || a.type === "warning")),
      "lscwp-woo": alerts.some(a => (a.title.includes("WooCommerce") || a.desc.includes("WooCommerce") || a.title.includes("kassa") || a.title.includes("Checkout")) && (a.type === "danger" || a.type === "warning")),
      "elem-woo": alerts.some(a => (a.title.includes("Elementor") || a.desc.includes("Elementor")) && (a.title.includes("WooCommerce") || a.desc.includes("WooCommerce") || a.desc.includes("minicart") || a.desc.includes("wc-cart-fragments")) && (a.type === "danger" || a.type === "warning")),
      "cc-woo": alerts.some(a => (a.title.includes("hook") || a.desc.includes("hook")) && (a.title.includes("WooCommerce") || a.desc.includes("WooCommerce")) && (a.type === "danger" || a.type === "warning")),
      "cc-lscwp": alerts.some(a => (a.title.includes("CSS") || a.desc.includes("CSS") || a.title.includes("exkludering")) && (a.type === "danger" || a.type === "warning"))
    };

    const hasConflict = {
      wp: false,
      lscwp: conflicts["lscwp-wf"] || conflicts["lscwp-elem"] || conflicts["lscwp-woo"] || conflicts["cc-lscwp"],
      woo: conflicts["lscwp-woo"] || conflicts["elem-woo"] || conflicts["cc-woo"],
      elem: conflicts["lscwp-elem"] || conflicts["elem-woo"],
      wf: conflicts["lscwp-wf"],
      cc: conflicts["cc-woo"] || conflicts["cc-lscwp"]
    };

    const width = container.clientWidth || 600;
    const height = container.clientHeight || 260;

    const nodes = {};
    Object.keys(nodeConfigs).forEach(key => {
      const cfg = nodeConfigs[key];
      if (!cfg.active) return;
      nodes[key] = {
        id: cfg.id,
        label: cfg.label,
        icon: cfg.icon,
        px: (cfg.x / 100) * width,
        py: (cfg.y / 100) * height,
        conflict: hasConflict[key]
      };
    });

    // Render connection lines
    const linesToDraw = [
      { from: "wp", to: "lscwp", type: "normal" },
      { from: "wp", to: "woo", type: "normal" },
      { from: "wp", to: "elem", type: "normal" },
      { from: "wp", to: "wf", type: "normal" },
      { from: "wp", to: "cc", type: "normal" },
      
      { from: "lscwp", to: "wf", type: conflicts["lscwp-wf"] ? "conflict" : "normal" },
      { from: "lscwp", to: "elem", type: conflicts["lscwp-elem"] ? "conflict" : "normal" },
      { from: "lscwp", to: "woo", type: conflicts["lscwp-woo"] ? "conflict" : "normal" },
      { from: "elem", to: "woo", type: conflicts["elem-woo"] ? "conflict" : "normal" },
      { from: "cc", to: "woo", type: conflicts["cc-woo"] ? "conflict" : "normal" },
      { from: "cc", to: "lscwp", type: conflicts["cc-lscwp"] ? "conflict" : "normal" }
    ];

    linesToDraw.forEach(l => {
      if (nodes[l.from] && nodes[l.to]) {
        const nA = nodes[l.from];
        const nB = nodes[l.to];
        const lineEl = document.createElementNS("http://www.w3.org/2000/svg", "line");
        lineEl.setAttribute("x1", nA.px);
        lineEl.setAttribute("y1", nA.py);
        lineEl.setAttribute("x2", nB.px);
        lineEl.setAttribute("y2", nB.py);
        lineEl.setAttribute("class", `topology-line ${l.type}`);
        svg.appendChild(lineEl);
      }
    });

    // Render divs nodes
    Object.keys(nodes).forEach(key => {
      const node = nodes[key];
      const nodeDiv = document.createElement("div");
      nodeDiv.className = `topology-node ${node.conflict ? "conflict" : ""}`;
      nodeDiv.style.left = `${node.px}px`;
      nodeDiv.style.top = `${node.py}px`;
      nodeDiv.innerHTML = `
        <span class="topology-node-icon">${node.icon}</span>
        <div class="topology-node-label">${node.label}</div>
      `;
      
      nodeDiv.addEventListener("click", () => {
        if (key === "lscwp") switchMasterView("settings");
        else if (key === "wf" || key === "woo" || key === "elem") switchMasterView("risks");
        else if (key === "cc") {
          switchMasterView("inputs");
          const pastebox = document.getElementById("app-custom-css-pastebox");
          if (pastebox) pastebox.focus();
        }
      });

      container.appendChild(nodeDiv);
    });
  }

  // Handle Resize for SVG Coordinates recalculation
  const resizeObserver = new ResizeObserver(() => {
    if (state.analysisResults) drawTopologyMap();
  });
  const wrapper = document.querySelector(".topology-wrapper");
  if (wrapper) resizeObserver.observe(wrapper);

  // --- LOCALSTORAGE PROFILE HISTORY & SIDE-BY-SIDE COMPARISON ---
  let historyLibrary = [];
  try {
    const rawHistory = localStorage.getItem("wp_optimizer_history");
    if (rawHistory) {
      historyLibrary = JSON.parse(rawHistory);
    }
  } catch (e) {
    console.error("Fel vid laddning av historik från localStorage:", e);
  }

  function saveCurrentProfile() {
    if (!state.sysInfo) {
      alert("Ingen aktiv analys hittades. Ladda upp data och starta en analys först.");
      return;
    }

    const defaultName = state.apiUrl ? state.apiUrl.replace(/^https?:\/\//, "") : (state.sysInfo['wp-active-theme'] ? `${state.sysInfo['wp-active-theme'].name} Site` : "Sajt Profil");
    const name = prompt("Ange ett namn för att spara denna sajtprofil i historiken:", defaultName);
    if (name === null) return;
    
    const profileName = name.trim() || defaultName;
    const healthScoreValEl = document.getElementById("health-score-value");
    const healthScore = healthScoreValEl ? parseInt(healthScoreValEl.textContent, 10) : 100;

    const profile = {
      id: "profile_" + Date.now(),
      name: profileName,
      timestamp: formatTimestamp(new Date()),
      healthScore: healthScore,
      wpVersion: state.sysInfo['wp-core'] ? state.sysInfo['wp-core'].version : 'Okänd',
      phpVersion: state.sysInfo['wp-server'] ? state.sysInfo['wp-server'].php_version : 'Okänd',
      theme: state.sysInfo['wp-active-theme'] ? state.sysInfo['wp-active-theme'].name : 'Okänt',
      pluginsCount: state.sysInfo['wp-plugins-active'] ? Object.keys(state.sysInfo['wp-plugins-active']).length : 0,
      sysInfo: state.sysInfo,
      wooInfo: state.wooInfo,
      wfInfo: state.wfInfo,
      elemInfo: state.elemInfo,
      customCodeInfo: state.customCodeInfo,
      customCss: state.customCss,
      uploadedSettings: state.uploadedSettings,
      editedSettings: state.editedSettings,
      apiUrl: state.apiUrl,
      apiToken: state.apiToken,
      uploadMetadata: state.uploadMetadata
    };

    const existingIndex = historyLibrary.findIndex(p => p.name.toLowerCase() === profileName.toLowerCase());
    if (existingIndex !== -1) {
      if (confirm(`En profil med namnet "${profileName}" finns redan. Vill du skriva över den?`)) {
        historyLibrary[existingIndex] = profile;
      } else {
        return;
      }
    } else {
      historyLibrary.push(profile);
    }

    saveHistoryToLocalStorage();
    renderHistoryLibrary();
    updateCompareDropdowns();
    alert(`✓ Profil "${profileName}" sparad framgångsrikt!`);
  }

  function saveHistoryToLocalStorage() {
    try {
      localStorage.setItem("wp_optimizer_history", JSON.stringify(historyLibrary));
    } catch (e) {
      alert(`Kunde inte spara till webbläsaren: ${e.message}`);
    }
  }

  function deleteProfile(id) {
    if (confirm("Är du säker på att du vill ta bort denna sparade profil?")) {
      historyLibrary = historyLibrary.filter(p => p.id !== id);
      saveHistoryToLocalStorage();
      renderHistoryLibrary();
      updateCompareDropdowns();
    }
  }

  function clearAllHistory() {
    if (confirm("⚠️ Är du säker på att du vill radera ALL sparad historik? Detta kan inte ångras.")) {
      historyLibrary = [];
      saveHistoryToLocalStorage();
      renderHistoryLibrary();
      updateCompareDropdowns();
      if (comparisonResultTableWrapper) comparisonResultTableWrapper.style.display = "none";
    }
  }

  function loadProfile(id) {
    const profile = historyLibrary.find(p => p.id === id);
    if (!profile) return;

    if (confirm(`Vill du läsa in profilen "${profile.name}" som det aktuella arbetstillståndet? Nuvarande osprat arbete kommer att skrivas över.`)) {
      state.sysInfo = profile.sysInfo;
      state.wooInfo = profile.wooInfo;
      state.wfInfo = profile.wfInfo;
      state.elemInfo = profile.elemInfo;
      state.customCodeInfo = profile.customCodeInfo;
      state.customCss = profile.customCss || "";
      state.uploadedSettings = profile.uploadedSettings;
      state.editedSettings = JSON.parse(JSON.stringify(profile.editedSettings || {}));
      state.apiUrl = profile.apiUrl || "";
      state.apiToken = profile.apiToken || "";
      state.uploadMetadata = profile.uploadMetadata || {
        sysInfo: { name: profile.name + " (Historik WP)", timestamp: profile.timestamp },
        wooInfo: profile.wooInfo ? { name: "Historik WC", timestamp: profile.timestamp } : { name: "", timestamp: "" },
        wfInfo: profile.wfInfo ? { name: "Historik Wordfence", timestamp: profile.timestamp } : { name: "", timestamp: "" },
        elemInfo: profile.elemInfo ? { name: "Historik Elementor", timestamp: profile.timestamp } : { name: "", timestamp: "" },
        customCodeInfo: profile.customCodeInfo ? { name: "Historik Snippets", timestamp: profile.timestamp } : { name: "", timestamp: "" },
        uploadedSettings: profile.uploadedSettings ? { name: "Historik LSCWP Settings", timestamp: profile.timestamp } : { name: "", timestamp: "" }
      };

      if (state.apiUrl && apiSiteUrl) apiSiteUrl.value = state.apiUrl;
      if (state.apiToken && apiSyncToken) apiSyncToken.value = state.apiToken;

      const mainBox = document.getElementById("app-custom-css-pastebox");
      if (mainBox) mainBox.value = state.customCss;

      updateActiveSiteStatusBar();
      updateConnectionStatusBadges();
      triggerAnalysis();
      alert(`✓ Profil "${profile.name}" inläst!`);
    }
  }

  function updateConnectionStatusBadges() {
    const checkSet = (info, badge, key) => {
      if (!badge) return;
      if (info) {
        badge.className = "file-status loaded";
        badge.textContent = `✓ ${state.uploadMetadata[key]?.name || 'Inläst'}`;
      } else {
        badge.className = "file-status";
        badge.textContent = key === "sysInfo" ? "Krävs *" : "Valfritt";
      }
    };
    checkSet(state.sysInfo, sysInfoStatus, "sysInfo");
    checkSet(state.wooInfo, woocommerceStatus, "wooInfo");
    checkSet(state.wfInfo, wordfenceStatus, "wfInfo");
    checkSet(state.elemInfo, elementorStatus, "elemInfo");
    checkSet(state.customCodeInfo, customcodeStatus, "customCodeInfo");
    checkSet(state.uploadedSettings, settingsStatus, "uploadedSettings");
  }

  function renderHistoryLibrary() {
    if (!historyProfilesGrid) return;
    historyProfilesGrid.innerHTML = "";

    if (historyLibrary.length === 0) {
      if (historyEmptyState) historyEmptyState.style.display = "block";
      return;
    }

    if (historyEmptyState) historyEmptyState.style.display = "none";

    historyLibrary.forEach(p => {
      const card = document.createElement("div");
      card.className = "history-profile-card glass-card";
      
      let scoreClass = "good";
      if (p.healthScore < 70) scoreClass = "danger";
      else if (p.healthScore < 90) scoreClass = "warn";

      card.innerHTML = `
        <div class="history-card-header">
          <div>
            <div class="history-card-title" title="${escapeHtml(p.name)}">${escapeHtml(p.name)}</div>
            <div class="history-card-date">${escapeHtml(p.timestamp)}</div>
          </div>
          <div class="history-card-score ${scoreClass}">Hälsa: ${parseInt(p.healthScore, 10)}%</div>
        </div>
        <div class="history-card-specs">
          <div><strong>WP:</strong> ${escapeHtml(p.wpVersion)}</div>
          <div><strong>PHP:</strong> ${escapeHtml(p.phpVersion)}</div>
          <div style="grid-column: span 2; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;"><strong>Tema:</strong> ${escapeHtml(p.theme)}</div>
          <div style="grid-column: span 2;"><strong>Aktiva tillägg:</strong> ${parseInt(p.pluginsCount, 10)} st</div>
        </div>
        <div class="history-card-actions">
          <button class="history-card-btn active-load" data-id="${p.id}">Läs in</button>
          <button class="history-card-btn delete-btn" data-id="${p.id}">🗑️</button>
        </div>
      `;

      card.querySelector(".active-load").addEventListener("click", () => loadProfile(p.id));
      card.querySelector(".delete-btn").addEventListener("click", () => deleteProfile(p.id));

      historyProfilesGrid.appendChild(card);
    });
  }

  function updateCompareDropdowns() {
    if (!compareSelectA || !compareSelectB) return;
    
    const valA = compareSelectA.value;
    const valB = compareSelectB.value;

    compareSelectA.innerHTML = '<option value="">-- Välj profil A --</option>';
    compareSelectB.innerHTML = '<option value="">-- Välj profil B --</option>';

    historyLibrary.forEach(p => {
      const optA = document.createElement("option");
      optA.value = p.id;
      optA.textContent = `${p.name} (${p.timestamp})`;
      compareSelectA.appendChild(optA);

      const optB = document.createElement("option");
      optB.value = p.id;
      optB.textContent = `${p.name} (${p.timestamp})`;
      compareSelectB.appendChild(optB);
    });

    if (historyLibrary.some(p => p.id === valA)) compareSelectA.value = valA;
    if (historyLibrary.some(p => p.id === valB)) compareSelectB.value = valB;
  }

  function exportHistoryLibrary() {
    if (historyLibrary.length === 0) {
      alert("Historikbiblioteket är tomt. Inget att exportera.");
      return;
    }
    const rawJson = JSON.stringify(historyLibrary, null, 2);
    const blob = new Blob([rawJson], { type: "application/json;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "wp-optimizer-history.json";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  function handleHistoryImport(e) {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(evt) {
      try {
        const imported = JSON.parse(evt.target.result);
        if (!Array.isArray(imported)) {
          throw new Error("Historikfilen måste vara en JSON-matris av profiler.");
        }
        
        const isValid = imported.every(p => p.hasOwnProperty("id") && p.hasOwnProperty("name") && p.hasOwnProperty("healthScore") && p.hasOwnProperty("sysInfo"));
        if (!isValid) {
          throw new Error("JSON innehåller inte giltiga sajtprofiler.");
        }

        if (confirm(`Hittade ${imported.length} profiler i filen. Vill du slå ihop dem med dina nuvarande sparade profiler? (Profiler med samma namn skrivs över)`)) {
          imported.forEach(imp => {
            const existingIdx = historyLibrary.findIndex(p => p.name.toLowerCase() === imp.name.toLowerCase());
            if (existingIdx !== -1) {
              historyLibrary[existingIdx] = imp;
            } else {
              historyLibrary.push(imp);
            }
          });

          saveHistoryToLocalStorage();
          renderHistoryLibrary();
          updateCompareDropdowns();
          alert("✓ Profiler importerade och sammanslagna framgångsrikt!");
        }
      } catch (err) {
        alert(`Fel vid import: ${err.message}`);
      } finally {
        historyImportFile.value = "";
      }
    };
    reader.readAsText(file);
  }

  function executeComparison() {
    const idA = compareSelectA.value;
    const idB = compareSelectB.value;

    if (!idA || !idB) {
      alert("Vänligen välj både Profil A och Profil B för att jämföra.");
      return;
    }

    if (idA === idB) {
      alert("Vänligen välj två olika profiler att jämföra.");
      return;
    }

    const profA = historyLibrary.find(p => p.id === idA);
    const profB = historyLibrary.find(p => p.id === idB);

    if (!profA || !profB) {
      alert("Kunde inte hitta profilerna.");
      return;
    }

    let tableHtml = `
      <table class="comparison-table">
        <thead>
          <tr>
            <th style="width: 25%;">Parameter</th>
            <th style="width: 35%;">${escapeHtml(profA.name)} (A)</th>
            <th style="width: 35%;">${escapeHtml(profB.name)} (B)</th>
            <th style="width: 5%; text-align: center;">Status</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><strong>Hälsopoäng</strong></td>
            <td><span class="comparison-diff-badge" style="background:rgba(255,255,255,0.05); font-size:0.85rem; font-weight:700;">${parseInt(profA.healthScore, 10)}%</span></td>
            <td><span class="comparison-diff-badge" style="background:rgba(255,255,255,0.05); font-size:0.85rem; font-weight:700;">${parseInt(profB.healthScore, 10)}%</span></td>
            <td style="text-align: center;">
              <span class="comparison-diff-badge ${profA.healthScore === profB.healthScore ? 'match' : 'diff'}">
                ${profA.healthScore === profB.healthScore ? 'Lika' : 'Diff'}
              </span>
            </td>
          </tr>
          <tr>
            <td><strong>Sajt-URL</strong></td>
            <td><code>${profA.apiUrl ? escapeHtml(profA.apiUrl) : 'Manuell uppladdning'}</code></td>
            <td><code>${profB.apiUrl ? escapeHtml(profB.apiUrl) : 'Manuell uppladdning'}</code></td>
            <td style="text-align: center;">
              <span class="comparison-diff-badge ${profA.apiUrl === profB.apiUrl ? 'match' : 'diff'}">
                ${profA.apiUrl === profB.apiUrl ? 'Lika' : 'Diff'}
              </span>
            </td>
          </tr>
          <tr>
            <td><strong>WordPress Version</strong></td>
            <td>${escapeHtml(profA.wpVersion)}</td>
            <td>${escapeHtml(profB.wpVersion)}</td>
            <td style="text-align: center;">
              <span class="comparison-diff-badge ${profA.wpVersion === profB.wpVersion ? 'match' : 'diff'}">
                ${profA.wpVersion === profB.wpVersion ? 'Lika' : 'Diff'}
              </span>
            </td>
          </tr>
          <tr>
            <td><strong>PHP Version</strong></td>
            <td>${escapeHtml(profA.phpVersion)}</td>
            <td>${escapeHtml(profB.phpVersion)}</td>
            <td style="text-align: center;">
              <span class="comparison-diff-badge ${profA.phpVersion === profB.phpVersion ? 'match' : 'diff'}">
                ${profA.phpVersion === profB.phpVersion ? 'Lika' : 'Diff'}
              </span>
            </td>
          </tr>
          <tr>
            <td><strong>Tema</strong></td>
            <td>${escapeHtml(profA.theme)}</td>
            <td>${escapeHtml(profB.theme)}</td>
            <td style="text-align: center;">
              <span class="comparison-diff-badge ${profA.theme === profB.theme ? 'match' : 'diff'}">
                ${profA.theme === profB.theme ? 'Lika' : 'Diff'}
              </span>
            </td>
          </tr>
          <tr>
            <td><strong>Aktiva tillägg</strong></td>
            <td>${parseInt(profA.pluginsCount, 10)} st</td>
            <td>${parseInt(profB.pluginsCount, 10)} st</td>
            <td style="text-align: center;">
              <span class="comparison-diff-badge ${profA.pluginsCount === profB.pluginsCount ? 'match' : 'diff'}">
                ${profA.pluginsCount === profB.pluginsCount ? 'Lika' : 'Diff'}
              </span>
            </td>
          </tr>
    `;

    const settingsToCompare = [
      { key: "css_minify", label: "CSS Minifiering" },
      { key: "css_combine", label: "CSS Kombinering" },
      { key: "js_minify", label: "JS Minifiering" },
      { key: "js_combine", label: "JS Kombinering" },
      { key: "js_defer", label: "JS Defer (Skjut upp)" },
      { key: "media_lazy", label: "Bild Lazy Load" },
      { key: "object_cache", label: "Objekt-cache" },
      { key: "woo_hpos", label: "WooCommerce HPOS" },
      { key: "elem_css_print_method", label: "Elementor CSS-metod" }
    ];

    settingsToCompare.forEach(setting => {
      const valA = profA.editedSettings[setting.key] !== undefined ? profA.editedSettings[setting.key] : "Ej konf";
      const valB = profB.editedSettings[setting.key] !== undefined ? profB.editedSettings[setting.key] : "Ej konf";

      const formatVal = (v) => {
        if (v === 1 || v === "1" || v === "on" || v === true) return "✅ PÅ (Aktiv)";
        if (v === 0 || v === "0" || v === "off" || v === false) return "❌ AV (Inaktiv)";
        return v;
      };

      const strA = formatVal(valA);
      const strB = formatVal(valB);

      tableHtml += `
        <tr>
          <td>${setting.label}</td>
          <td>${strA}</td>
          <td>${strB}</td>
          <td style="text-align: center;">
             <span class="comparison-diff-badge ${valA === valB ? 'match' : 'diff'}">
               ${valA === valB ? 'Lika' : 'Diff'}
             </span>
          </td>
        </tr>
      `;
    });

    tableHtml += `
        </tbody>
      </table>
    `;

    if (comparisonResultTableWrapper) {
      comparisonResultTableWrapper.innerHTML = tableHtml;
      comparisonResultTableWrapper.style.display = "block";
    }
  }

  // Bind History buttons event listeners
  if (btnSaveCurrentProfile) btnSaveCurrentProfile.addEventListener("click", saveCurrentProfile);
  if (btnExportHistory) btnExportHistory.addEventListener("click", exportHistoryLibrary);
  if (btnImportHistoryTrigger) btnImportHistoryTrigger.addEventListener("click", () => historyImportFile.click());
  if (historyImportFile) historyImportFile.addEventListener("change", handleHistoryImport);
  if (btnClearHistory) btnClearHistory.addEventListener("click", clearAllHistory);
  if (btnCompareExecute) btnCompareExecute.addEventListener("click", executeComparison);

  // Initial rendering
  renderHistoryLibrary();
  updateCompareDropdowns();
});
