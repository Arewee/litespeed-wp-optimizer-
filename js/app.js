/**
 * LiteSpeed-Helper - Main Application Script
 * Multi-file upload handlers, advanced WooCommerce, Wordfence, Elementor status parsers,
 * Custom PHP/CSS code static analyzer, three-tiered auditing, and settings comparison.
 * Implements permanently visible top bar slots, collapsible sidebar elements,
 * per-file 3-bullet diagnostics, and inline Custom CSS editor with live audits.
 */

document.addEventListener("DOMContentLoaded", () => {
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
    editedSettings: {} // Active options configuration (1 for ON, 0 for OFF, or strings)
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
    settings: { tab: document.getElementById("master-tab-settings"), section: document.getElementById("view-settings") }
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

  // --- INITIAL LAUNCH: POPULATE PLACEHOLDER BULLETS ---
  renderPlaceholderBullets();

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
      triggerAnalysis();
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
    const data = { gateways: [], overrides: [] };
    let currentSection = "";
    const lines = text.split(/\r?\n/);
    
    lines.forEach(line => {
      line = line.trim();
      if (!line) return;
      
      if (line.startsWith("###") && line.endsWith("###")) {
        currentSection = line.replace(/###/g, "").trim().toLowerCase();
        return;
      }
      
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
    
    if (data.gateways.length === 0) {
      if (text.toLowerCase().includes("stripe")) data.gateways.push("Stripe");
      if (text.toLowerCase().includes("klarna")) data.gateways.push("Klarna");
      if (text.toLowerCase().includes("paypal")) data.gateways.push("PayPal");
      if (text.toLowerCase().includes("shipmondo")) data.gateways.push("Shipmondo");
    }
    
    return data;
  }

  /**
   * Parses Wordfence diagnostic report text
   */
  function parseWordfenceDiagnostic(text) {
    const data = { firewall_mode: "Okänd", ip_header: "Okänd" };
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
    
    return data;
  }

  /**
   * Parses Elementor status text dump
   */
  function parseElementorStatus(text) {
    const data = { experiments: [] };
    const lines = text.split(/\r?\n/);
    
    lines.forEach(line => {
      const lower = line.toLowerCase();
      if (lower.includes("experiment") || lower.includes("css loading") || lower.includes("asset loading") || lower.includes("optimized css")) {
        if (line.includes(":") && (lower.includes("active") || lower.includes("aktiv"))) {
          const parts = line.split(":");
          data.experiments.push(parts[0].trim());
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

    return data;
  }

  // --- SILENT BACKGROUND UPDATE FOR BULLET SUMMARIES ---
  function silentUpdateAnalysis() {
    // Generate temporary rules engine results to render the 3 bullets inside the uploader slots immediately!
    const tempResults = analyzeSystem(state.sysInfo, state.wooInfo, state.wfInfo, state.elemInfo, state.uploadedSettings, state.customCodeInfo, state.customCss);
    renderBulletLists(tempResults.fileSummaries);
    
    if (state.analysisResults) {
      // If they already start analysis once, auto-sync and refresh dashboards dynamically
      triggerAnalysis();
    }
  }

  // --- CORE SYSTEM CONTROLLER & RENDERERS ---

  function triggerAnalysis() {
    if (!state.sysInfo) return;

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

    // Auto-switch to Översikt (Overview) tab on complete
    switchMasterView("overview");
    window.scrollTo({ top: 0, behavior: "smooth" });
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
                            results.customCodeAlerts.filter(a => a.type === "danger" || a.type === "warning").length;

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
    
    if (state.analysisResults.alerts.length === 0) {
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

    state.analysisResults.alerts.forEach(alert => {
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
          <h4>${alert.title}</h4>
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
        const cleanCur = (activeUserVal || "").toString().trim().replace(/\r\n/g, "\n");
        const cleanRec = (opt.recommendedRaw || "").toString().trim().replace(/\r\n/g, "\n");
        const curExcludes = cleanCur.split("\n").map(x => x.trim()).filter(Boolean);
        const recExcludes = cleanRec.split("\n").map(x => x.trim()).filter(Boolean);
        const missing = recExcludes.filter(r => !curExcludes.some(c => c.includes(r)));
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
            const cleanCur = e.target.value.toString().trim().replace(/\r\n/g, "\n");
            const cleanRec = opt.recommendedRaw.toString().trim().replace(/\r\n/g, "\n");
            const curExcludes = cleanCur.split("\n").map(x => x.trim()).filter(Boolean);
            const recExcludes = cleanRec.split("\n").map(x => x.trim()).filter(Boolean);
            const missing = recExcludes.filter(r => !curExcludes.some(c => c.includes(r)));
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
        if (state.uploadedSettings.hasOwnProperty(opt.id)) {
          const orig = state.uploadedSettings[opt.id];
          const rec = opt.recommendedRaw;

          const origNorm = (orig === "1" || orig === 1 || orig === "on" || orig === true) ? 1 : 0;
          const recNorm = (rec === "1" || rec === 1 || rec === "on" || rec === true) ? 1 : 0;

          let isDeviant = false;
          let devData = {
            id: opt.id,
            title: opt.title,
            origVal: origNorm === 1 ? "PÅ" : "AV",
            recVal: recNorm === 1 ? "PÅ" : "AV",
            recRaw: recNorm
          };

          const isTextareaField = opt.id === "js_exclude" || opt.id === "css_exclude" || opt.id === "media_lazy_exclude" || opt.id === "drop_uri";

          if (isTextareaField) {
            const cleanOrig = (orig || "").toString().trim().replace(/\r\n/g, "\n");
            const cleanRec = (rec || "").toString().trim().replace(/\r\n/g, "\n");
            
            const origArr = cleanOrig.split("\n").map(x => x.trim()).filter(Boolean);
            const recArr = cleanRec.split("\n").map(x => x.trim()).filter(Boolean);
            const missing = recArr.filter(r => !origArr.some(c => c.includes(r)));

            if (missing.length > 0) {
              isDeviant = true;
              devData.origVal = "Saknar exkluderingar";
              devData.recVal = "ANPASSAD";
              devData.recRaw = rec;
            }
          } else if (origNorm !== recNorm) {
            isDeviant = true;
          }

          if (isDeviant) {
            tiers[opt.category].push(devData);
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

      const serializedData = php_serialize(exportObj);

      const blob = new Blob([serializedData], { type: "text/plain;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `litespeed-helper-export-${new Date().toISOString().slice(0, 10)}.data`;
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      alert(`Exporteringsfel: ${err.message}`);
    }
  });
});
