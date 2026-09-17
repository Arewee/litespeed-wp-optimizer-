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
    activeSettingsFilter: "all",
    activeRiskFilter: "all",
    psiScores: null,
    editedSettings: {}, // Active options configuration (1 for ON, 0 for OFF, or strings)
    apiUrl: "",
    apiToken: "",
    uploadMetadata: {
      sysInfo: { name: "", timestamp: "" },
      wooInfo: { name: "", timestamp: "" },
      wfInfo: { name: "", timestamp: "" },
      elemInfo: { name: "", timestamp: "" },
      customCodeInfo: { name: "", timestamp: "" },
      uploadedSettings: { name: "", timestamp: "" },
      customCss: { name: "", timestamp: "" }
    }
  };

  // --- DOM ELEMENT REFERENCES ---
  const sysInfoDropzone = document.getElementById("sysinfo-dropzone");
  const woocommerceDropzone = document.getElementById("woocommerce-dropzone");
  const wordfenceDropzone = document.getElementById("wordfence-dropzone");
  const elementorDropzone = document.getElementById("elementor-dropzone");
  const customcodeDropzone = document.getElementById("customcode-dropzone");
  const settingsDropzone = document.getElementById("settings-dropzone");
  const customcssDropzone = document.getElementById("customcss-dropzone");

  const sysInfoInput = document.getElementById("sysinfo-input");
  const woocommerceInput = document.getElementById("woocommerce-input");
  const wordfenceInput = document.getElementById("wordfence-input");
  const elementorInput = document.getElementById("elementor-input");
  const customcodeInput = document.getElementById("customcode-input");
  const settingsInput = document.getElementById("settings-input");
  const customcssInput = document.getElementById("customcss-input");
  
  const sysInfoStatus = document.getElementById("sysinfo-status");
  const woocommerceStatus = document.getElementById("woocommerce-status");
  const wordfenceStatus = document.getElementById("wordfence-status");
  const elementorStatus = document.getElementById("elementor-status");
  const customcodeStatus = document.getElementById("customcode-status");
  const settingsStatus = document.getElementById("settings-status");
  const customcssStatus = document.getElementById("customcss-status");
  
  const sysInfoSummary = document.getElementById("sysinfo-summary");
  const woocommerceSummary = document.getElementById("woocommerce-summary");
  const wordfenceSummary = document.getElementById("wordfence-summary");
  const elementorSummary = document.getElementById("elementor-summary");
  const customcodeSummary = document.getElementById("customcode-summary");
  const settingsSummary = document.getElementById("settings-summary");
  const customcssSummary = document.getElementById("customcss-summary");

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
  const btnCopyPhp = document.getElementById("btn-copy-php");
  const btnExportJson = document.getElementById("btn-export-json");
  const btnCopyAiSecondOpinion = document.getElementById("btn-copy-ai-second-opinion");
  const btnDownloadAiSecondOpinion = document.getElementById("btn-download-ai-second-opinion");
  const btnBatchAiSecondOpinion = document.getElementById("btn-batch-ai-second-opinion");

  const btnDownloadSyncPlugin = document.getElementById("btn-download-sync-plugin");
  const btnApiFetch = document.getElementById("btn-api-fetch");
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
  setupDragAndDrop(customcssDropzone, customcssInput, handleCustomCssFile);

  // --- PASTE MODAL & DIRECT CLIPBOARD INGESTION ---
  let activePasteSlot = null;
  const pasteModal = document.getElementById("paste-modal");
  const pasteModalTitle = document.getElementById("paste-modal-title");
  const pasteModalTextarea = document.getElementById("paste-modal-textarea");
  const btnClosePasteModal = document.getElementById("btn-close-paste-modal");
  const btnCancelPasteModal = document.getElementById("btn-cancel-paste-modal");
  const btnSubmitPasteModal = document.getElementById("btn-submit-paste-modal");

  const slotLabels = {
    sysinfo: "1. WordPress Systemfil (Hälsotillstånd)",
    woocommerce: "2. WooCommerce Systemstatus",
    wordfence: "3. Wordfence Diagnostik",
    elementor: "4. Elementor Systeminfo",
    customcode: "5. SCM / Anpassad PHP-kod",
    settings: "6. LiteSpeed Cache .data-inställningar",
    customcss: "7. Anpassad CSS-kod"
  };

  const ALLOWED_EXTENSIONS = [".txt", ".json", ".data", ".php", ".css", ".log", ".conf"];

  function isValidTextFileExtension(filename) {
    if (!filename || typeof filename !== "string") return false;
    const lower = filename.toLowerCase();
    return ALLOWED_EXTENSIONS.some(ext => lower.endsWith(ext));
  }

  function isBinaryContent(text) {
    if (!text || typeof text !== "string") return false;
    // Check known binary magic prefixes
    if (text.startsWith("%PDF-") || 
        text.startsWith("PK\x03\x04") || 
        text.startsWith("\x89PNG") || 
        text.startsWith("GIF8") || 
        text.startsWith("\xFF\xD8\xFF") ||
        text.startsWith("\x7fELF") ||
        text.startsWith("MZ")) {
      return true;
    }
    // Check for null bytes or excessive non-printable control characters in sample
    const sample = text.substring(0, 4096);
    if (sample.includes("\0")) return true;
    let nonPrintable = 0;
    for (let i = 0; i < sample.length; i++) {
      const code = sample.charCodeAt(i);
      // Allow standard whitespace (\t = 9, \n = 10, \r = 13) and printable chars >= 32
      if (code < 9 || (code > 10 && code < 13) || (code > 13 && code < 32)) {
        nonPrintable++;
      }
    }
    return nonPrintable > 5;
  }

  function detectFilenameHint(filename) {
    if (!filename || typeof filename !== "string") return null;
    const lower = filename.toLowerCase();
    if (lower.startsWith("system-info-") || lower.includes("elementor") || lower.includes("elem-info") || lower.includes("elementor-system")) {
      return "elementor";
    }
    if (lower.startsWith("diagnostics_for_") || lower.includes("wordfence") || lower.includes("wf-diagnostic") || lower.includes("wfconfig") || lower.includes("wf_diagnostic")) {
      return "wordfence";
    }
    if (lower.startsWith("systemstatusreport_") || lower.includes("systemstatusreport") || lower.includes("woocommerce") || lower.includes("wc-status") || lower.includes("wc_status") || lower.includes("woo-status") || lower.includes("wc-report")) {
      return "woocommerce";
    }
    if (lower.startsWith("lscwp_") || lower.endsWith(".data") || lower.includes("litespeed") || lower.includes("lscwp")) {
      return "settings";
    }
    if (lower.startsWith("scm-export-") || lower.includes("scm") || lower.includes("snippets") || lower.includes("site-code") || lower.endsWith(".php")) {
      return "customcode";
    }
    if (lower.includes("systemfil") || lower.includes("site-health") || lower.includes("wp-info") || lower.includes("wp-health") || lower.includes("system-report") || lower.includes("wp-system")) {
      return "sysinfo";
    }
    if (lower.endsWith(".css") || lower.includes("custom-css") || lower.includes("style.css")) {
      return "customcss";
    }
    return null;
  }

  function detectPastedFormat(text, filenameHint) {
    if (!text || isBinaryContent(text)) return null;
    const trimmed = text.trim();
    
    // 1. SysInfo
    if (trimmed.includes("### wp-core ###") || trimmed.includes("wp-server") || trimmed.includes("wp-paths-sizes") || trimmed.includes("wp-database") || (trimmed.includes("### wp-plugins-active") && trimmed.includes("wp-version"))) {
      return "sysinfo";
    }
    // 2. Elementor (Prioritized before generic checks, with strict section headers)
    if (trimmed.includes("== Elementor ==") || trimmed.includes("### Elementor ###") || trimmed.includes("== Elementor Pro ==") || trimmed.includes("== Elementor -") || trimmed.includes("== Elementor Experiments ==") || (trimmed.includes("== Server Environment ==") && trimmed.includes("== PHP ==") && trimmed.includes("Elementor"))) {
      return "elementor";
    }
    // 3. WooCommerce
    if (trimmed.includes("### woocommerce ###") || trimmed.includes("### payment-gateways ###") || trimmed.includes("WC Version") || trimmed.includes("WooCommerce Version") || (trimmed.includes("Database tables") && trimmed.toLowerCase().includes("woocommerce")) || trimmed.includes("high-performance order storage") || trimmed.includes("### woocommerce-tables ###")) {
      return "woocommerce";
    }
    // 4. Wordfence (Requires explicit Wordfence diagnostic headers, not just plugin list mentions)
    if (trimmed.includes("Wordfence Diagnostic") || trimmed.includes("wfConfig") || trimmed.includes("Wordfence Network") || trimmed.includes("Wordfence Live Traffic") || trimmed.includes("How Wordfence gets IPs") || trimmed.includes("Wordfence Memory Limit") || (trimmed.includes("Firewall Mode:") && trimmed.includes("Wordfence")) || (trimmed.toLowerCase().includes("wordfence diagnostic report"))) {
      return "wordfence";
    }
    // 5. Custom code / SCM
    if (trimmed.startsWith("<?php") || trimmed.includes("add_action(") || trimmed.includes("Site Code Manager") || trimmed.includes('"isScmPackage"') || (trimmed.includes('"snippets"') && trimmed.includes("["))) {
      return "customcode";
    }
    // 6. LiteSpeed .data settings
    if (trimmed.startsWith("a:") || trimmed.includes("litespeed-cache-conf") || (trimmed.includes("optm_") && trimmed.includes("cache_")) || (trimmed.includes("optm-") && trimmed.includes("media-"))) {
      return "settings";
    }
    // 7. Custom CSS
    if (trimmed.includes("{") && trimmed.includes("}") && (trimmed.includes("font-family") || trimmed.includes("color:") || trimmed.includes("margin:") || trimmed.includes("@media") || trimmed.includes("@font-face") || trimmed.includes(":root") || trimmed.includes("display:") || trimmed.includes("background:"))) {
      return "customcss";
    }

    // Secondary fallback: If filenameHint is available and text contains relevant partial match
    if (filenameHint) {
      if (filenameHint === "elementor" && (trimmed.includes("Elementor") || trimmed.includes("== Server Environment =="))) return "elementor";
      if (filenameHint === "wordfence" && trimmed.includes("Wordfence")) return "wordfence";
      if (filenameHint === "woocommerce" && trimmed.includes("WooCommerce")) return "woocommerce";
      if (filenameHint === "settings" && (trimmed.startsWith("a:") || trimmed.includes("cache") || trimmed.includes("optm"))) return "settings";
      if (filenameHint === "customcode" && (trimmed.includes("<?php") || trimmed.includes("function") || trimmed.includes("snippets"))) return "customcode";
      if (filenameHint === "customcss" && trimmed.includes("{") && trimmed.includes("}")) return "customcss";
      if (filenameHint === "sysinfo" && trimmed.includes("wp-")) return "sysinfo";
    }

    return null;
  }

  function routeAndProcessContent(text, intendedSlot, sourceName) {
    if (!text || !text.trim()) {
      alert("❌ Ingen data hittades i filen eller urklipp.");
      return false;
    }

    // Step 1: Binary & PDF Guard
    if (isBinaryContent(text)) {
      alert(`❌ Otillåten data: Filen "${sourceName || "Uppladdad fil"}" är en binärfil (t.ex. PDF, bild eller arkiv) och innehåller inte läsbar textdata.`);
      return false;
    }

    const filenameHint = sourceName ? detectFilenameHint(sourceName) : null;
    const detectedFormat = detectPastedFormat(text, filenameHint);

    // Step 2: Strict rejection of unknown / invalid content
    if (!detectedFormat) {
      alert(`❌ Ogiltigt innehåll: Filen eller texten "${sourceName || "Urklipp"}" kunde inte valideras som en godkänd rapport eller konfiguration för WordPress, WooCommerce, Wordfence, Elementor, SCM eller LiteSpeed.`);
      return false;
    }

    let targetSlot = intendedSlot;

    // Step 3: Smart cross-slot auto-routing with clear notification
    if (intendedSlot && intendedSlot !== "auto" && intendedSlot !== detectedFormat) {
      const sourceSlotName = slotLabels[intendedSlot] || intendedSlot;
      const destSlotName = slotLabels[detectedFormat] || detectedFormat;
      alert(`ℹ️ Innehållet släpptes/klistrades i [${sourceSlotName}] men identifierades som [${destSlotName}]. Det placerades automatiskt i rätt modul!`);
      targetSlot = detectedFormat;
    } else {
      targetSlot = detectedFormat;
    }

    const timestampStr = formatTimestamp(new Date());
    const finalSourceName = sourceName || ("Data (" + timestampStr + ")");

    if (targetSlot === "sysinfo") {
      processSysInfoText(text, finalSourceName);
    } else if (targetSlot === "woocommerce") {
      processWooCommerceText(text, finalSourceName);
    } else if (targetSlot === "wordfence") {
      processWordfenceText(text, finalSourceName);
    } else if (targetSlot === "elementor") {
      processElementorText(text, finalSourceName);
    } else if (targetSlot === "customcode") {
      processCustomCodeTextData(text, finalSourceName);
    } else if (targetSlot === "settings") {
      processSettingsText(text, finalSourceName);
    } else if (targetSlot === "customcss") {
      processCustomCssText(text, finalSourceName);
    }
    return true;
  }

  function openPasteModal(slotKey) {
    activePasteSlot = slotKey;
    if (pasteModalTitle) {
      const slotText = slotKey ? slotLabels[slotKey] : "Automatisk identifiering";
      pasteModalTitle.innerHTML = `<span>📋</span> Klistra in: ${escapeHtml(slotText)}`;
    }
    if (pasteModalTextarea) {
      pasteModalTextarea.value = "";
    }
    if (pasteModal) {
      pasteModal.style.display = "flex";
      setTimeout(() => {
        if (pasteModalTextarea) pasteModalTextarea.focus();
      }, 50);
    }
  }

  function closePasteModal() {
    if (pasteModal) {
      pasteModal.style.display = "none";
    }
    activePasteSlot = null;
  }

  if (btnClosePasteModal) btnClosePasteModal.addEventListener("click", closePasteModal);
  if (btnCancelPasteModal) btnCancelPasteModal.addEventListener("click", closePasteModal);

  // Trigger buttons inside dropzones
  document.querySelectorAll(".btn-paste-trigger").forEach(btn => {
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      const slot = btn.dataset.slot;
      openPasteModal(slot);
    });
  });

  function applyPastedContent(text, slotKey) {
    if (!text || !text.trim()) {
      alert("Ingen text klistrades in.");
      return;
    }
    const timestampStr = formatTimestamp(new Date());
    routeAndProcessContent(text, slotKey, "Inklistrad data (" + timestampStr + ")");
    closePasteModal();
  }

  // --- SLOT GUIDANCE HELP MODAL ---
  const slotHelpModal = document.getElementById("slot-help-modal");
  const slotHelpTitle = document.getElementById("slot-help-title");
  const slotHelpBody = document.getElementById("slot-help-body");
  const btnCloseSlotHelp = document.getElementById("btn-close-slot-help");
  const btnDismissSlotHelp = document.getElementById("btn-dismiss-slot-help");

  const SLOT_HELP_DATA = {
    sysinfo: {
      title: "📝 1. WP Systemfil (Webbplatshälsa)",
      html: `<div style="background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.06); border-radius: 8px; padding: 0.85rem; margin-bottom: 0.85rem;">
        <strong style="color: var(--accent-cyan); display: block; margin-bottom: 0.35rem;">📍 Var i WordPress:</strong>
        <code>WP Admin &rarr; Verktyg &rarr; Webbplatshälsa &rarr; Information</code><br>
        <span style="font-size: 0.75rem; color: var(--text-muted);">(Engelska: Tools &rarr; Site Health &rarr; Info)</span>
      </div>
      <strong style="color: #fff; display: block; margin-bottom: 0.35rem;">👉 Så här gör du:</strong>
      <ol style="margin: 0; padding-left: 1.2rem; color: var(--text-muted); font-size: 0.8rem; line-height: 1.6;">
        <li>Klicka på knappen <strong>"Kopiera webbplatsinformation till urklipp"</strong>.</li>
        <li>Gå tillbaka hit och klicka på <strong>"📋 Klistra in"</strong> i rutan för WP Systemfil.</li>
        <li>Klicka på <strong>"Spara & Tolka Data"</strong>.</li>
      </ol>`
    },
    woocommerce: {
      title: "🛒 2. WooCommerce Systemstatus",
      html: `<div style="background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.06); border-radius: 8px; padding: 0.85rem; margin-bottom: 0.85rem;">
        <strong style="color: var(--accent-cyan); display: block; margin-bottom: 0.35rem;">📍 Var i WordPress:</strong>
        <code>WP Admin &rarr; WooCommerce &rarr; Status &rarr; Systemstatus</code><br>
        <span style="font-size: 0.75rem; color: var(--text-muted);">(Engelska: WooCommerce &rarr; Status &rarr; System status)</span>
      </div>
      <strong style="color: #fff; display: block; margin-bottom: 0.35rem;">👉 Så här gör du:</strong>
      <ol style="margin: 0; padding-left: 1.2rem; color: var(--text-muted); font-size: 0.8rem; line-height: 1.6;">
        <li>Klicka på knappen <strong>"Hämta systemrapport"</strong> (*Get system report*).</li>
        <li>Klicka på knappen <strong>"Kopiera för support"</strong> (*Copy for support*).</li>
        <li>Klicka på <strong>"📋 Klistra in"</strong> i rutan för WC Status och läs in.</li>
      </ol>`
    },
    wordfence: {
      title: "🛡️ 3. Wordfence Diagnostik",
      html: `<div style="background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.06); border-radius: 8px; padding: 0.85rem; margin-bottom: 0.85rem;">
        <strong style="color: var(--accent-cyan); display: block; margin-bottom: 0.35rem;">📍 Var i WordPress:</strong>
        <code>WP Admin &rarr; Wordfence &rarr; Tools &rarr; Diagnostics</code><br>
        <span style="font-size: 0.75rem; color: var(--text-muted);">(Engelska: Wordfence &rarr; Tools &rarr; Diagnostics)</span>
      </div>
      <strong style="color: #fff; display: block; margin-bottom: 0.35rem;">👉 Så här gör du:</strong>
      <ol style="margin: 0; padding-left: 1.2rem; color: var(--text-muted); font-size: 0.8rem; line-height: 1.6;">
        <li>Klicka på <strong>"Send Report by Email" / "Export Diagnostic Data"</strong> eller kopiera all text från diagnostiksidan.</li>
        <li>Klicka på <strong>"📋 Klistra in"</strong> i rutan för WF Diagnostik och spara.</li>
      </ol>`
    },
    elementor: {
      title: "🎨 4. Elementor Systeminformation",
      html: `<div style="background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.06); border-radius: 8px; padding: 0.85rem; margin-bottom: 0.85rem;">
        <strong style="color: var(--accent-cyan); display: block; margin-bottom: 0.35rem;">📍 Var i WordPress:</strong>
        <code>WP Admin &rarr; Elementor &rarr; Systeminformation</code><br>
        <span style="font-size: 0.75rem; color: var(--text-muted);">(Engelska: Elementor &rarr; System Info)</span>
      </div>
      <strong style="color: #fff; display: block; margin-bottom: 0.35rem;">👉 Så här gör du:</strong>
      <ol style="margin: 0; padding-left: 1.2rem; color: var(--text-muted); font-size: 0.8rem; line-height: 1.6;">
        <li>Klicka på knappen <strong>"Kopiera systeminformation"</strong> (*Copy System Info*).</li>
        <li>Klicka på <strong>"📋 Klistra in"</strong> i rutan för Elementor Status och spara.</li>
      </ol>`
    },
    customcode: {
      title: "💻 5. SCM / Egna Kodsnuttar (Snippets)",
      html: `<div style="background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.06); border-radius: 8px; padding: 0.85rem; margin-bottom: 0.85rem;">
        <strong style="color: var(--accent-cyan); display: block; margin-bottom: 0.35rem;">📍 Var i WordPress:</strong>
        <code>Code Snippets / WPCode / Temats functions.php</code>
      </div>
      <strong style="color: #fff; display: block; margin-bottom: 0.35rem;">👉 Så här gör du:</strong>
      <ol style="margin: 0; padding-left: 1.2rem; color: var(--text-muted); font-size: 0.8rem; line-height: 1.6;">
        <li>Exportera dina kodsnuttar som <code>.json</code> eller kopiera innehållet ur din <code>functions.php</code>.</li>
        <li>Ladda upp filen eller klistra in koden via <strong>"📋 Klistra in"</strong>.</li>
      </ol>`
    },
    settings: {
      title: "⚙️ 6. LiteSpeed Cache Inställningsfil (.data)",
      html: `<div style="background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.06); border-radius: 8px; padding: 0.85rem; margin-bottom: 0.85rem;">
        <strong style="color: var(--accent-cyan); display: block; margin-bottom: 0.35rem;">📍 Var i WordPress:</strong>
        <code>WP Admin &rarr; LiteSpeed Cache &rarr; Verktyg &rarr; Importera / Exportera</code><br>
        <span style="font-size: 0.75rem; color: var(--text-muted);">(Engelska: LiteSpeed Cache &rarr; Toolbox &rarr; Import / Export)</span>
      </div>
      <strong style="color: #fff; display: block; margin-bottom: 0.35rem;">👉 Så här gör du:</strong>
      <ol style="margin: 0; padding-left: 1.2rem; color: var(--text-muted); font-size: 0.8rem; line-height: 1.6;">
        <li>Klicka på knappen <strong>"Exportera"</strong> (*Export*). En <code>.data</code>-fil laddas ner till din dator.</li>
        <li>Dra filen hit till rutan eller klicka för att välja den.</li>
      </ol>`
    },
    customcss: {
      title: "🎨 7. Anpassad CSS-kod",
      html: `<div style="background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.06); border-radius: 8px; padding: 0.85rem; margin-bottom: 0.85rem;">
        <strong style="color: var(--accent-cyan); display: block; margin-bottom: 0.35rem;">📍 Var i WordPress:</strong>
        <code>WP Admin &rarr; Utseende &rarr; Anpassa &rarr; Extra CSS (eller Elementor Custom CSS / Child-theme style.css)</code>
      </div>
      <strong style="color: #fff; display: block; margin-bottom: 0.35rem;">👉 Så här gör du:</strong>
      <ol style="margin: 0; padding-left: 1.2rem; color: var(--text-muted); font-size: 0.8rem; line-height: 1.6;">
        <li>Kopiera din anpassade CSS-kod.</li>
        <li>Klicka på <strong>"📋 Klistra in"</strong> i rutan för Anpassad CSS.</li>
        <li>Klicka på <strong>"Spara & Tolka Data"</strong>.</li>
      </ol>`
    }
  };

  function openSlotHelpModal(slotKey) {
    const data = SLOT_HELP_DATA[slotKey];
    if (!data || !slotHelpModal) return;
    if (slotHelpTitle) slotHelpTitle.innerHTML = `<span>ℹ️</span> ${data.title}`;
    if (slotHelpBody) slotHelpBody.innerHTML = data.html;
    slotHelpModal.style.display = "flex";
  }

  function closeSlotHelpModal() {
    if (slotHelpModal) slotHelpModal.style.display = "none";
  }

  if (btnCloseSlotHelp) btnCloseSlotHelp.addEventListener("click", closeSlotHelpModal);
  if (btnDismissSlotHelp) btnDismissSlotHelp.addEventListener("click", closeSlotHelpModal);
  if (slotHelpModal) {
    slotHelpModal.addEventListener("click", (e) => {
      if (e.target === slotHelpModal) closeSlotHelpModal();
    });
  }

  document.querySelectorAll(".btn-slot-info").forEach(btn => {
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      const slot = btn.dataset.slotHelp;
      openSlotHelpModal(slot);
    });
  });

  if (btnSubmitPasteModal) {
    btnSubmitPasteModal.addEventListener("click", () => {
      const text = pasteModalTextarea ? pasteModalTextarea.value : "";
      applyPastedContent(text, activePasteSlot);
    });
  }

  // Global paste handler (Cmd+V / Ctrl+V when not focused on another input)
  window.addEventListener("paste", (e) => {
    const activeEl = document.activeElement;
    if (activeEl && (activeEl.tagName === "TEXTAREA" || activeEl.tagName === "INPUT")) {
      return; // Default paste inside active fields
    }
    const pastedText = (e.clipboardData || window.clipboardData).getData("text");
    if (pastedText && pastedText.trim().length > 20) {
      const detected = detectPastedFormat(pastedText);
      if (detected) {
        applyPastedContent(pastedText, detected);
      } else {
        openPasteModal(null);
        if (pasteModalTextarea) {
          pasteModalTextarea.value = pastedText;
        }
      }
    }
  });

  // --- GOOGLE PAGESPEED INSIGHTS & CRUX LIVE RUNNER ---
  const btnRunPsi = document.getElementById("btn-run-psi");
  const psiResultsWrapper = document.getElementById("psi-results-wrapper");
  const psiLoadingStatus = document.getElementById("psi-loading-status");
  const psiScoreMobile = document.getElementById("psi-score-mobile");
  const psiScoreDesktop = document.getElementById("psi-score-desktop");
  const psiMetricLcp = document.getElementById("psi-metric-lcp");
  const psiMetricInp = document.getElementById("psi-metric-inp");
  const psiMetricCls = document.getElementById("psi-metric-cls");
  const psiMetricCrux = document.getElementById("psi-metric-crux");
  const psiDiagnosticsTips = document.getElementById("psi-diagnostics-tips");

  function setPsiScoreGauge(el, score) {
    if (!el) return;
    el.textContent = score !== null && score !== undefined ? Math.round(score) : "-";
    el.classList.remove("good", "needs-improvement", "poor");
    if (score >= 90) el.classList.add("good");
    else if (score >= 50) el.classList.add("needs-improvement");
    else el.classList.add("poor");
  }

  async function runPageSpeedInsights() {
    let targetUrl = state.detectedSiteUrl || extractSiteUrl(state.sysInfo, state.wooInfo);
    if (!targetUrl) {
      const psiTargetUrl = document.getElementById("psi-target-url");
      if (psiTargetUrl && psiTargetUrl.textContent && psiTargetUrl.textContent !== "-" && psiTargetUrl.textContent.startsWith("http")) {
        targetUrl = psiTargetUrl.textContent.trim();
      }
    }
    if (!targetUrl) {
      targetUrl = prompt("Ange webbplatsens fullständiga URL för att köra PageSpeed Insights (t.ex. https://example.com):");
    }
    if (!targetUrl) return;

    targetUrl = targetUrl.trim();
    if (!targetUrl.startsWith("http://") && !targetUrl.startsWith("https://")) {
      targetUrl = "https://" + targetUrl;
    }
    updateDetectedSiteUrl(targetUrl);

    if (psiLoadingStatus) psiLoadingStatus.style.display = "block";
    if (psiResultsWrapper) psiResultsWrapper.style.display = "none";
    if (btnRunPsi) {
      btnRunPsi.disabled = true;
      btnRunPsi.textContent = "⏳ Analyserar...";
    }

    try {
      const mobileApiUrl = `https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=${encodeURIComponent(targetUrl)}&strategy=mobile`;
      const desktopApiUrl = `https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=${encodeURIComponent(targetUrl)}&strategy=desktop`;

      const [mobileRes, desktopRes] = await Promise.all([
        fetch(mobileApiUrl).then(r => r.ok ? r.json() : null).catch(() => null),
        fetch(desktopApiUrl).then(r => r.ok ? r.json() : null).catch(() => null)
      ]);

      if (!mobileRes && !desktopRes) {
        throw new Error("Kunde inte ansluta till Google PageSpeed Insights API. Kontrollera att sajten är offentligt nåbar över internet.");
      }

      const mScore = mobileRes?.lighthouseResult?.categories?.performance?.score != null
        ? Math.round(mobileRes.lighthouseResult.categories.performance.score * 100)
        : null;
      const dScore = desktopRes?.lighthouseResult?.categories?.performance?.score != null
        ? Math.round(desktopRes.lighthouseResult.categories.performance.score * 100)
        : null;

      const mAudits = mobileRes?.lighthouseResult?.audits || {};
      const lcp = mAudits["largest-contentful-paint"]?.displayValue || "-";
      const inp = mAudits["interaction-to-next-paint"]?.displayValue || (mobileRes?.loadingExperience?.metrics?.INTERACTION_TO_NEXT_PAINT?.percentile ? `${mobileRes.loadingExperience.metrics.INTERACTION_TO_NEXT_PAINT.percentile} ms` : "-");
      const cls = mAudits["cumulative-layout-shift"]?.displayValue || "-";

      const cruxCategory = mobileRes?.loadingExperience?.overall_category || desktopRes?.loadingExperience?.overall_category || "Ingen fältdata (Låg trafik)";
      let cruxLabel = cruxCategory;
      if (cruxCategory === "FAST") cruxLabel = "🟢 Snabb (Godkänd CWV)";
      else if (cruxCategory === "AVERAGE") cruxLabel = "🟡 Medel (Förbättring krävs)";
      else if (cruxCategory === "SLOW") cruxLabel = "🔴 Långsam (Underkänd CWV)";

      // Store PSI scores in state
      state.psiScores = {
        mobile: mScore,
        desktop: dScore,
        lcp,
        inp,
        cls,
        crux: cruxLabel
      };

      setPsiScoreGauge(psiScoreMobile, mScore);
      setPsiScoreGauge(psiScoreDesktop, dScore);
      if (psiMetricLcp) psiMetricLcp.textContent = lcp;
      if (psiMetricInp) psiMetricInp.textContent = inp;
      if (psiMetricCls) psiMetricCls.textContent = cls;
      if (psiMetricCrux) psiMetricCrux.textContent = cruxLabel;

      // Update direct PSI link
      const psiDirectLink = document.getElementById("psi-direct-link");
      const psiDirectAnchor = document.getElementById("psi-direct-anchor");
      if (psiDirectLink && psiDirectAnchor) {
        psiDirectAnchor.href = `https://pagespeed.web.dev/analysis?url=${encodeURIComponent(targetUrl)}`;
        psiDirectLink.style.display = "block";
      }

      if (psiDiagnosticsTips) {
        const opps = [];
        if (mAudits["render-blocking-resources"]?.details?.items?.length) {
          opps.push("⚡ Eliminera render-blockerande resurser (Aktivera CSS/JS Defer & Exkludera CTM)");
        }
        if (mAudits["uses-optimized-images"]?.details?.items?.length || mAudits["modern-image-formats"]?.details?.items?.length) {
          opps.push("🖼️ Konvertera bilder till WebP/AVIF via LiteSpeed Image Optimization");
        }
        if (mAudits["unminified-css"]?.details?.items?.length || mAudits["unminified-javascript"]?.details?.items?.length) {
          opps.push("📦 Minifiera CSS/JS i LiteSpeed Cache");
        }
        if (mAudits["server-response-time"]?.numericValue > 600) {
          opps.push("🚀 Förbättra TTFB (Svarstid) med LiteSpeed HTML-cache & Redis Object Cache");
        }

        if (opps.length > 0) {
          psiDiagnosticsTips.innerHTML = `<strong>💡 Rekommenderade åtgärder baserat på Google Lighthouse:</strong><ul style="margin: 0.35rem 0 0 1rem; padding: 0;">` +
            opps.map(o => `<li style="margin-bottom: 0.2rem;">${escapeHtml(o)}</li>`).join("") +
            `</ul>`;
        } else {
          psiDiagnosticsTips.innerHTML = `<strong>✓ Utmärkt!</strong> Google Lighthouse hittade inga allvarliga prestandaflaskhalsar på den testade URL:en.`;
        }
      }

      if (psiResultsWrapper) psiResultsWrapper.style.display = "block";

      // Refresh health score with new PSI factor
      renderHealthScoreAndOverview();
    } catch (err) {
      console.error("PSI API error:", err);
      const psiDirectLink = document.getElementById("psi-direct-link");
      const psiDirectAnchor = document.getElementById("psi-direct-anchor");
      if (psiDirectLink && psiDirectAnchor && targetUrl) {
        psiDirectAnchor.href = `https://pagespeed.web.dev/analysis?url=${encodeURIComponent(targetUrl)}`;
        psiDirectLink.style.display = "block";
      }
      alert("PageSpeed Insights API kunde inte slutföras direkt (detta kan bero på att Google API blockeras av webbläsarens integritetsskydd/Brave Shields eller att sajten inte är publikt nåbar).\n\nAnvänd direktlänken under PSI-rutan för att öppna analysen på Google PageSpeed Insights.");
    } finally {
      if (psiLoadingStatus) psiLoadingStatus.style.display = "none";
      if (btnRunPsi) {
        btnRunPsi.disabled = false;
        btnRunPsi.textContent = "⚡ Kör PageSpeed Insights Live";
      }
    }
  }

  if (btnRunPsi) {
    btnRunPsi.addEventListener("click", runPageSpeedInsights);
  }

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

  // Settings Filter Bar buttons
  const filterBtns = document.querySelectorAll(".filter-btn");
  filterBtns.forEach(btn => {
    btn.addEventListener("click", () => {
      filterBtns.forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      state.activeSettingsFilter = btn.dataset.filter || "all";
      if (state.analysisResults) {
        renderSettingsPanel();
      }
    });
  });

  // Health Score Breakdown toggler
  const btnToggleHealthBreakdown = document.getElementById("btn-toggle-health-breakdown");
  const healthBreakdownPanel = document.getElementById("health-breakdown-panel");
  if (btnToggleHealthBreakdown && healthBreakdownPanel) {
    btnToggleHealthBreakdown.addEventListener("click", () => {
      const isVisible = healthBreakdownPanel.style.display === "block";
      healthBreakdownPanel.style.display = isVisible ? "none" : "block";
      btnToggleHealthBreakdown.innerHTML = isVisible 
        ? "💡 Hur beräknas min poäng? (Klicka för nedbrytning)" 
        : "💡 Dölj poängnedbrytning";
    });
  }

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
              <strong>${escapeHtml(alert.title)}</strong>
              <p style="opacity:0.85; font-size:0.7rem; margin-top:0.1rem;">${escapeHtml(alert.desc)}</p>
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

    function processSelectedFile(file) {
      if (!file) return;
      if (!isValidTextFileExtension(file.name)) {
        alert(`❌ Otillåten filtyp: "${file.name}". Du kan endast ladda upp textbaserade systemrapporter eller konfigurationsfiler (.txt, .data, .json, .php, .css).`);
        input.value = "";
        return;
      }
      try {
        fileHandler(file);
      } catch (error) {
        console.error(`Error in file handler for ${file.name}:`, error);
        alert(`Ett fel uppstod vid bearbetning av ${file.name}: ${error.message}`);
      } finally {
        input.value = "";
      }
    }

    input.addEventListener("change", (e) => {
      if (e.target.files.length > 0) {
        processSelectedFile(e.target.files[0]);
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
        processSelectedFile(e.dataTransfer.files[0]);
      }
    });
  }

  // --- URL EXTRACTION HELPER ---
  function extractSiteUrl(sysInfo, wooInfo, rawText) {
    if (sysInfo) {
      if (sysInfo["wp-core"]) {
        const core = sysInfo["wp-core"];
        for (const k of Object.keys(core)) {
          const lk = k.toLowerCase();
          if (lk.includes("site_url") || lk.includes("home_url") || lk.includes("webbplatsadress") || lk.includes("webbadress") || lk === "url" || lk.includes("siteurl") || lk.includes("homeurl")) {
            const val = core[k];
            if (val && typeof val === "string" && val.startsWith("http")) return val.trim();
          }
        }
      }
      for (const sec of Object.keys(sysInfo)) {
        if (typeof sysInfo[sec] === "object" && sysInfo[sec] !== null) {
          for (const k of Object.keys(sysInfo[sec])) {
            const lk = k.toLowerCase();
            if (lk.includes("site_url") || lk.includes("home_url") || lk.includes("webbplatsadress") || lk.includes("webbadress")) {
              const val = sysInfo[sec][k];
              if (val && typeof val === "string" && val.startsWith("http")) return val.trim();
            }
          }
        }
      }
    }
    if (wooInfo) {
      if (wooInfo.site_url && typeof wooInfo.site_url === "string" && wooInfo.site_url.startsWith("http")) return wooInfo.site_url.trim();
      if (wooInfo.home_url && typeof wooInfo.home_url === "string" && wooInfo.home_url.startsWith("http")) return wooInfo.home_url.trim();
      if (wooInfo.environment) {
        for (const k of Object.keys(wooInfo.environment)) {
          const lk = k.toLowerCase();
          if (lk.includes("site_url") || lk.includes("home_url") || lk.includes("url")) {
            const val = wooInfo.environment[k];
            if (val && typeof val === "string" && val.startsWith("http")) return val.trim();
          }
        }
      }
    }
    if (rawText && typeof rawText === "string") {
      const match = rawText.match(/(?:site_url|home_url|webbplatsadress|webbadress|siteurl|homeurl|site url|home url)\s*[:=]\s*(https?:\/\/[^\s\r\n]+)/i);
      if (match) return match[1].trim();
      const genericUrls = rawText.match(/https?:\/\/[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}(?:\/[^\s\r\n]*)?/g);
      if (genericUrls) {
        for (const u of genericUrls) {
          const lu = u.toLowerCase();
          if (!lu.includes("wordpress.org") && !lu.includes("github.com") && !lu.includes("litespeedtech.com") && !lu.includes("gravatar.com") && !lu.includes("schema.org") && !lu.includes("w3.org") && !lu.includes("w.org") && !lu.includes("googleapis.com")) {
            try {
              const parsed = new URL(u);
              return `${parsed.protocol}//${parsed.host}`;
            } catch (e) {
              return u;
            }
          }
        }
      }
    }
    return null;
  }

  function updateDetectedSiteUrl(url) {
    if (!url || typeof url !== "string") return;
    const cleanUrl = url.trim();
    if (!cleanUrl.startsWith("http://") && !cleanUrl.startsWith("https://")) return;
    state.detectedSiteUrl = cleanUrl;
    const psiTargetUrl = document.getElementById("psi-target-url");
    if (psiTargetUrl) psiTargetUrl.textContent = cleanUrl;
  }

  // --- PARSERS & UPLOAD/PASTE HANDLERS ---

  function processSysInfoText(text, sourceName) {
    try {
      state.sysInfo = parseSystemInfoText(text);
      state.uploadMetadata.sysInfo = { name: sourceName, timestamp: formatTimestamp(new Date()) };
      sysInfoStatus.textContent = "✓ Inläst";
      sysInfoStatus.title = sourceName;
      sysInfoStatus.className = "file-status loaded";
      
      if (sysInfoSummary) {
        const wpVer = state.sysInfo["wp-core"] ? (state.sysInfo["wp-core"].version || state.sysInfo["wp-core"].wp_version || "") : "";
        const pluginCount = state.sysInfo["wp-plugins-active"] ? Object.keys(state.sysInfo["wp-plugins-active"]).length : 0;
        sysInfoSummary.textContent = `✓ WP ${wpVer || "Inläst"} (${pluginCount} tillägg)`;
        sysInfoSummary.classList.add("active");
      }

      btnStartAnalysis.disabled = false;
      btnStartAnalysis.className = "btn-primary btn-pulse";
      btnStartAnalysis.style.background = "linear-gradient(135deg, var(--accent-cyan) 0%, var(--accent-indigo) 100%)";
      btnStartAnalysis.style.color = "var(--text-main)";
      btnStartAnalysis.style.cursor = "pointer";
      
      analysisReadyText.innerHTML = `<strong>Systemrapport inläst!</strong> Klicka på knappen bredvid för att köra analysen.`;
      analysisReadyText.style.color = "var(--accent-cyan)";
      
      const detectedUrl = extractSiteUrl(state.sysInfo, state.wooInfo, text);
      if (detectedUrl) {
        updateDetectedSiteUrl(detectedUrl);
      }

      silentUpdateAnalysis();
    } catch (err) {
      alert(`Kunde inte läsa systemdata: ${err.message}`);
    }
  }

  function handleSysInfoFile(file) {
    const reader = new FileReader();
    reader.onload = function(e) {
      routeAndProcessContent(e.target.result, "sysinfo", file.name);
    };
    reader.readAsText(file);
  }

  function processWooCommerceText(text, sourceName) {
    try {
      state.wooInfo = parseWooCommerceStatus(text);
      state.uploadMetadata.wooInfo = { name: sourceName, timestamp: formatTimestamp(new Date()) };
      woocommerceStatus.textContent = "✓ Inläst";
      woocommerceStatus.title = sourceName;
      woocommerceStatus.className = "file-status loaded";
      
      if (woocommerceSummary) {
        const wooVer = state.wooInfo.version || "";
        const gwCount = state.wooInfo.gateways ? state.wooInfo.gateways.length : 0;
        woocommerceSummary.textContent = `✓ WC ${wooVer || "Inläst"} (${gwCount} betalsätt)`;
        woocommerceSummary.classList.add("active");
      }

      const detectedUrl = extractSiteUrl(state.sysInfo, state.wooInfo, text);
      if (detectedUrl) {
        updateDetectedSiteUrl(detectedUrl);
      }

      silentUpdateAnalysis();
    } catch (err) {
      alert(`Kunde inte läsa WooCommerce-statusdata: ${err.message}`);
    }
  }

  function handleWooCommerceFile(file) {
    const reader = new FileReader();
    reader.onload = function(e) {
      routeAndProcessContent(e.target.result, "woocommerce", file.name);
    };
    reader.readAsText(file);
  }

  function processWordfenceText(text, sourceName) {
    try {
      state.wfInfo = parseWordfenceDiagnostic(text);
      state.uploadMetadata.wfInfo = { name: sourceName, timestamp: formatTimestamp(new Date()) };
      wordfenceStatus.textContent = "✓ Inläst";
      wordfenceStatus.title = sourceName;
      wordfenceStatus.className = "file-status loaded";
      
      if (wordfenceSummary) {
        const wafMode = state.wfInfo.firewall_mode || "Aktiv";
        wordfenceSummary.textContent = `✓ WAF (${wafMode})`;
        wordfenceSummary.classList.add("active");
      }

      const detectedUrl = extractSiteUrl(state.sysInfo, state.wooInfo, text);
      if (detectedUrl && !state.detectedSiteUrl) {
        updateDetectedSiteUrl(detectedUrl);
      }

      silentUpdateAnalysis();
    } catch (err) {
      alert(`Kunde inte läsa Wordfence-data: ${err.message}`);
    }
  }

  function handleWordfenceFile(file) {
    const reader = new FileReader();
    reader.onload = function(e) {
      routeAndProcessContent(e.target.result, "wordfence", file.name);
    };
    reader.readAsText(file);
  }

  function processElementorText(text, sourceName) {
    try {
      state.elemInfo = parseElementorStatus(text);
      state.uploadMetadata.elemInfo = { name: sourceName, timestamp: formatTimestamp(new Date()) };
      elementorStatus.textContent = "✓ Inläst";
      elementorStatus.title = sourceName;
      elementorStatus.className = "file-status loaded";
      
      if (elementorSummary) {
        const elemVer = state.elemInfo.version || "";
        elementorSummary.textContent = `✓ Elementor ${elemVer || "Inläst"}`;
        elementorSummary.classList.add("active");
      }

      const detectedUrl = extractSiteUrl(state.sysInfo, state.wooInfo, text);
      if (detectedUrl && !state.detectedSiteUrl) {
        updateDetectedSiteUrl(detectedUrl);
      }

      silentUpdateAnalysis();
    } catch (err) {
      alert(`Kunde inte läsa Elementor-data: ${err.message}`);
    }
  }

  function handleElementorFile(file) {
    const reader = new FileReader();
    reader.onload = function(e) {
      routeAndProcessContent(e.target.result, "elementor", file.name);
    };
    reader.readAsText(file);
  }

  function processCustomCodeTextData(text, sourceName) {
    try {
      let parsedScm = null;
      try {
        const json = JSON.parse(text);
        if (json && (json.snippets || Array.isArray(json))) {
          parsedScm = {
            snippets: json.snippets || json,
            isScmPackage: true
          };
        }
      } catch (jsonErr) {
        // Fallback to text parser
      }

      if (!parsedScm) {
        parsedScm = parseCustomCodeText(text);
      }

      state.scmInfo = parsedScm;
      state.customCodeInfo = parsedScm;
      state.uploadMetadata.customCodeInfo = { name: sourceName, timestamp: formatTimestamp(new Date()) };
      customcodeStatus.textContent = "✓ Inläst";
      customcodeStatus.title = sourceName;
      customcodeStatus.className = "file-status loaded";
      
      if (customcodeSummary) {
        const snipCount = parsedScm.snippets ? (Array.isArray(parsedScm.snippets) ? parsedScm.snippets.length : Object.keys(parsedScm.snippets).length) : 0;
        customcodeSummary.textContent = `✓ SCM (${snipCount > 0 ? snipCount + ' kodsnuttar' : text.length + ' tkn'})`;
        customcodeSummary.classList.add("active");
      }

      silentUpdateAnalysis();
    } catch (err) {
      alert(`Kunde inte läsa SCM-kod: ${err.message}`);
    }
  }

  function handleCustomCodeFile(file) {
    const reader = new FileReader();
    reader.onload = function(e) {
      routeAndProcessContent(e.target.result, "customcode", file.name);
    };
    reader.readAsText(file);
  }

  function processSettingsText(text, sourceName) {
    try {
      state.uploadedSettings = parseSettingsFile(text);
      state.uploadMetadata.uploadedSettings = { name: sourceName, timestamp: formatTimestamp(new Date()) };
      settingsStatus.textContent = "✓ Inläst";
      settingsStatus.title = sourceName;
      settingsStatus.className = "file-status loaded";
      state.editedSettings = {};
      
      if (settingsSummary) {
        const optCount = state.uploadedSettings ? Object.keys(state.uploadedSettings).length : 0;
        settingsSummary.textContent = `✓ .data (${optCount} inställningar)`;
        settingsSummary.classList.add("active");
      }

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
      alert(`Kunde inte läsa LiteSpeed settingsdata: ${err.message}`);
    }
  }

  function handleSettingsFile(file) {
    const reader = new FileReader();
    reader.onload = function(e) {
      routeAndProcessContent(e.target.result, "settings", file.name);
    };
    reader.readAsText(file);
  }

  function processCustomCssText(text, sourceName) {
    try {
      syncCustomCss(text, "slot-customcss");
      state.uploadMetadata.customCss = { name: sourceName, timestamp: formatTimestamp(new Date()) };
      customcssStatus.textContent = "✓ Inläst";
      customcssStatus.title = sourceName;
      customcssStatus.className = "file-status loaded";
      
      if (customcssSummary) {
        customcssSummary.textContent = `✓ CSS (${text.length} tecken)`;
        customcssSummary.classList.add("active");
      }

      silentUpdateAnalysis();
    } catch (err) {
      alert(`Kunde inte läsa CSS: ${err.message}`);
    }
  }

  function handleCustomCssFile(file) {
    const reader = new FileReader();
    reader.onload = function(e) {
      routeAndProcessContent(e.target.result, "customcss", file.name);
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
        summaryEl.textContent = `${loadedCount} av 7 filer (${dayLabel})`;
      } else {
        summaryEl.textContent = "0 av 7 filer";
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
      // If they already start analysis once, auto-sync and refresh dashboards dynamically without auto-switching tabs
      triggerAnalysis(false);
    }
  }

  // --- CORE SYSTEM CONTROLLER & RENDERERS ---

  function triggerAnalysis(autoSwitch = true) {
    if (!state.sysInfo) return;

    try {
      state.analysisResults = analyzeSystem(state.sysInfo, state.wooInfo, state.wfInfo, state.elemInfo, state.uploadedSettings, state.customCodeInfo, state.customCss);
      
      state.analysisResults.recommendations.forEach(tab => {
        tab.options.forEach(opt => {
          if (state.editedSettings[opt.id] === undefined) {
            if (state.uploadedSettings && state.uploadedSettings.hasOwnProperty(opt.id)) {
              const upVal = state.uploadedSettings[opt.id];
              
              if (opt.id === "js_exclude" || opt.id === "css_exclude" || opt.id === "media_lazy_exc" || opt.id === "drop_uri") {
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

      // Auto-switch to Översikt (Overview) tab only on explicit button click
      if (autoSwitch) {
        switchMasterView("overview");
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
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
        name: "5. Anpassad PHP-kod (functions.php / SCM)",
        status: state.customCodeInfo ? "Inläst ✓" : "Ej inläst (Valfri)",
        loaded: !!state.customCodeInfo,
        color: state.customCodeInfo ? "var(--color-success)" : "var(--text-muted)",
        details: state.customCodeInfo 
          ? `<strong>Analyserade moduler:</strong> ${state.customCodeInfo.snippets ? state.customCodeInfo.snippets.length : 1} st<br><strong>Stabilitetsrisker:</strong> ${state.analysisResults ? state.analysisResults.customCodeAlerts.filter(a => a.type === "danger" || a.type === "warning").length : 0} st`
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
      },
      {
        name: "7. Anpassad CSS & Stilregler",
        status: state.customCss ? "Inläst ✓" : "Ej inläst (Valfri)",
        loaded: !!state.customCss,
        color: state.customCss ? "var(--color-success)" : "var(--text-muted)",
        details: state.customCss 
          ? `<strong>CSS-storlek:</strong> ${state.customCss.length} tecken<br><strong>Stilvarningar:</strong> ${state.analysisResults ? state.analysisResults.customCssAlerts.filter(a => a.type === "danger" || a.type === "warning").length : 0} st`
          : "Ladda upp tema-CSS eller klistra in stilregler för granskning mot render-blockering."
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

  function renderBenchmarkMatrix() {
    const tbody = document.getElementById("benchmark-matrix-tbody");
    const parityBadge = document.getElementById("benchmark-parity-badge");
    if (!tbody || !state.analysisResults || !state.analysisResults.versionMatrix) return;

    let hasOlderVersions = false;
    let html = "";
    state.analysisResults.versionMatrix.forEach(row => {
      const isMatched = row.isParityMatch;
      if (row.isActive && !isMatched) hasOlderVersions = true;
      const badgeClass = row.isActive ? (isMatched ? "matched" : "notice") : "inactive";
      const badgeText = row.isActive ? (isMatched ? "✓ Senaste version" : "ℹ️ Äldre version (Auditerad)") : "Ej aktiv";

      html += `
        <tr>
          <td><strong>${escapeHtml(row.name)}</strong></td>
          <td><span style="color: #c7d2fe; font-weight: 600;">${escapeHtml(row.installedVersion)}</span></td>
          <td>
            <span style="color: #a5b4fc;">v${escapeHtml(row.benchmarkVersion)}</span>
            <span style="color: var(--text-muted); font-size: 0.7rem; margin-left: 0.25rem;">(Granskad: ${escapeHtml(row.auditDate)})</span>
          </td>
          <td><span style="color: #67e8f9; font-weight: 500;">v${escapeHtml(row.latestRelease || row.benchmarkVersion)}</span></td>
          <td><span style="color: var(--text-muted); font-size: 0.72rem;">${escapeHtml(row.source)}</span></td>
          <td><span class="parity-badge ${badgeClass}">${badgeText}</span></td>
        </tr>
      `;
    });

    tbody.innerHTML = html;

    if (parityBadge) {
      if (hasOlderVersions) {
        parityBadge.className = "parity-badge notice";
        parityBadge.textContent = "ℹ️ Granskad mot installerade versioner (Nyare finns tillgängliga)";
      } else {
        parityBadge.className = "parity-badge matched";
        parityBadge.textContent = "✓ 100% Versionsparitet (Senaste versioner)";
      }
    }
  }

  function computeHealthScoreBreakdown() {
    if (!state.analysisResults) return { stabilityScore: 100, perfScore: 100, secScore: 100, configScore: 100, masterScore: 100, hasPsiScore: false };

    const results = state.analysisResults;

    let stabilityDeductions = 0;
    results.alerts.filter(a => a.impactCategory === "stability" || a.type === "danger").forEach(() => stabilityDeductions += 15);
    const stabilityScore = Math.max(0, 100 - stabilityDeductions);

    let perfDeductions = 0;
    results.alerts.filter(a => a.impactCategory === "performance" && a.type !== "danger").forEach(() => perfDeductions += 10);
    const configPerfScore = Math.max(0, 100 - perfDeductions);
    const perfScore = state.psiScores?.mobile != null 
      ? Math.round((configPerfScore * 0.5) + (state.psiScores.mobile * 0.5))
      : configPerfScore;

    let secDeductions = 0;
    results.alerts.filter(a => a.impactCategory === "security").forEach(() => secDeductions += 15);
    const secScore = Math.max(0, 100 - secDeductions);

    let configDeductions = 0;
    results.recommendations.forEach(tab => {
      tab.options.forEach(opt => {
        if (opt.isChangedNeeded) configDeductions += 2;
      });
    });
    const configScore = Math.max(0, 100 - configDeductions);

    const masterScore = Math.max(20, Math.min(100, Math.round(
      (stabilityScore * 0.40) + (perfScore * 0.30) + (secScore * 0.20) + (configScore * 0.10)
    )));

    return { stabilityScore, perfScore, secScore, configScore, masterScore, hasPsiScore: state.psiScores?.mobile != null };
  }

  function renderHealthScoreBreakdown() {
    const rowsEl = document.getElementById("health-breakdown-rows");
    if (!rowsEl || !state.analysisResults) return;

    const { stabilityScore, perfScore, secScore, configScore, hasPsiScore } = computeHealthScoreBreakdown();

    const psiNote = hasPsiScore 
      ? `(30% - inkl. PSI Mobil ${state.psiScores.mobile}/100)` 
      : `(30% - kör PSI för live-data)`;

    rowsEl.innerHTML = `
      <div class="breakdown-row">
        <span>🛡️ Stabilitet & Kassaskydd (40%):</span>
        <strong style="color: ${stabilityScore >= 80 ? 'var(--color-success)' : 'var(--color-danger)'};">${stabilityScore}/100</strong>
      </div>
      <div class="breakdown-row">
        <span>⚡ Prestanda & CWV ${psiNote}:</span>
        <strong style="color: ${perfScore >= 80 ? 'var(--color-success)' : 'var(--color-warning)'};">${perfScore}/100</strong>
      </div>
      <div class="breakdown-row">
        <span>🔒 Säkerhet & Headers (20%):</span>
        <strong style="color: ${secScore >= 80 ? 'var(--color-success)' : 'var(--color-warning)'};">${secScore}/100</strong>
      </div>
      <div class="breakdown-row">
        <span>⚙️ Konfiguration & Paritet (10%):</span>
        <strong style="color: ${configScore >= 80 ? 'var(--color-success)' : 'var(--color-warning)'};">${configScore}/100</strong>
      </div>
    `;
  }

  function renderHealthScoreAndOverview() {
    const results = state.analysisResults;
    if (!results) return;

    const env = results.environment || {};

    let deviationCount = 0;
    const compFn = window.getOptionComparison || getOptionComparison;
    if (results.recommendations) {
      results.recommendations.forEach(tab => {
        tab.options.forEach(o => {
          if (o.id === "optm_css_custom") return;
          const comp = compFn ? compFn(o, state.uploadedSettings, env) : { isDeviant: false };
          if (comp.isDeviant) deviationCount++;
        });
      });
    }

    renderBenchmarkMatrix();
    renderHealthScoreBreakdown();

    const { masterScore } = computeHealthScoreBreakdown();
    const score = masterScore;

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
        scoreDescEl.textContent = "Din sajt är optimalt konfigurerad och har maximal stabilitet.";
      } else if (score >= 70) {
        scoreTitleEl.textContent = "Godkänd status 🟡";
        scoreDescEl.textContent = "Sajten är stabil men det finns prestandaavvikelser att optimera.";
      } else {
        scoreTitleEl.textContent = "Åtgärd krävs! 🔴";
        scoreDescEl.textContent = "Kritiska stabilitetsrisker eller krockar detekterade i din miljö.";
      }
    }

    // 7 Key Component Status Cards + PSI Card in Översikt
    const overviewGridEl = document.getElementById("overview-component-status-grid");
    if (overviewGridEl) {
      overviewGridEl.innerHTML = "";

      const rawAlerts = [
        ...(results.alerts || []),
        ...(results.customCodeAlerts || []),
        ...(results.customCssAlerts || [])
      ].filter(a => a.type === "danger" || a.type === "warning");

      const normalizedAlerts = rawAlerts.map(a => {
        let comp = a.component;
        if (!comp) {
          if (a.targetTabId === "elementor") comp = "elementor";
          else if (a.targetTabId === "wordfence") comp = "wordfence";
          else if (a.title.toLowerCase().includes("ctm")) comp = "ctm";
          else if (a.title.toLowerCase().includes("woo") || a.title.toLowerCase().includes("kassa") || a.title.toLowerCase().includes("cart")) comp = "woocommerce";
          else if (a.title.toLowerCase().includes("litespeed")) comp = "litespeed";
          else if (a.title.toLowerCase().includes("scm")) comp = "scm";
          else comp = "server";
        }
        return { ...a, component: comp };
      });

      const componentDefs = {
        litespeed: { key: "litespeed", label: "LiteSpeed", icon: "⚡" },
        woocommerce: { key: "woocommerce", label: "WooCommerce", icon: "🛒" },
        wordfence: { key: "wordfence", label: "Wordfence", icon: "🔒" },
        elementor: { key: "elementor", label: "Elementor", icon: "🎨" },
        ctm: { key: "ctm", label: "CTM", icon: "🏷️" },
        scm: { key: "scm", label: "SCM (Kod)", icon: "💻" },
        server: { key: "server", label: "Server & Core", icon: "🖥️" }
      };

      const statusKeys = ["litespeed", "woocommerce", "wordfence", "elementor", "ctm", "scm", "server"];

      statusKeys.forEach(k => {
        const def = componentDefs[k];
        const compAlerts = normalizedAlerts.filter(a => {
          if (a.components && Array.isArray(a.components)) return a.components.includes(k);
          return a.component === k;
        });

        const hasDanger = compAlerts.some(a => a.type === "danger");
        const hasWarning = compAlerts.some(a => a.type === "warning");
        const cardStatusClass = hasDanger ? "status-danger" : hasWarning ? "status-warning" : "status-safe";
        const cardStatusText = hasDanger ? "Kritiskt 🔴" : hasWarning ? "Varning 🟡" : "Optimalt 🟢";

        const card = document.createElement("div");
        card.className = `risk-component-card ${cardStatusClass}`;
        card.style.cursor = "pointer";
        card.title = "Klicka för att se detaljerade risker för denna modul i Riskdetektorn";
        card.innerHTML = `
          <div style="font-size: 1.25rem; margin-bottom: 0.25rem;">${def.icon}</div>
          <div style="font-weight: 700; color: #fff; font-size: 0.85rem;">${def.label}</div>
          <div class="risk-card-status" style="font-size: 0.72rem; margin-top: 0.25rem; font-weight: 600;">${cardStatusText}</div>
          <div style="font-size: 0.65rem; color: var(--text-muted); margin-top: 0.25rem;">
            ${compAlerts.length > 0 ? `${compAlerts.length} notifiering(ar)` : 'Noll krockar'}
          </div>
        `;

        card.addEventListener("click", () => {
          switchMasterView("risks");
          state.activeRiskFilter = k;
          renderAlerts();
        });

        overviewGridEl.appendChild(card);
      });

      // Append PSI score card if available
      const psiCard = document.createElement("div");
      if (state.psiScores && state.psiScores.mobile != null) {
        const mScore = state.psiScores.mobile;
        const psiClass = mScore >= 90 ? "status-safe" : mScore >= 50 ? "status-warning" : "status-danger";
        psiCard.className = `risk-component-card ${psiClass}`;
        psiCard.style.cursor = "pointer";
        psiCard.innerHTML = `
          <div style="font-size: 1.25rem; margin-bottom: 0.25rem;">📱</div>
          <div style="font-weight: 700; color: #fff; font-size: 0.85rem;">PSI Mobil</div>
          <div class="risk-card-status" style="font-size: 0.72rem; margin-top: 0.25rem; font-weight: 600;">${mScore}/100</div>
          <div style="font-size: 0.65rem; color: var(--text-muted); margin-top: 0.25rem;">
            ${state.psiScores.desktop != null ? `Desktop: ${state.psiScores.desktop}/100` : 'PageSpeed Insights'}
          </div>
        `;
        psiCard.title = "Klicka för att se PageSpeed Insights under Datakällor";
        psiCard.addEventListener("click", () => {
          switchMasterView("inputs");
        });
      } else {
        psiCard.className = "risk-component-card";
        psiCard.style.cursor = "pointer";
        psiCard.style.opacity = "0.75";
        psiCard.innerHTML = `
          <div style="font-size: 1.25rem; margin-bottom: 0.25rem;">📱</div>
          <div style="font-weight: 700; color: #fff; font-size: 0.85rem;">PSI Test</div>
          <div class="risk-card-status" style="font-size: 0.72rem; margin-top: 0.25rem; color: var(--text-muted);">Ej körd</div>
          <div style="font-size: 0.65rem; color: var(--accent-cyan); margin-top: 0.25rem; text-decoration: underline;">
            Kör PSI test ➔
          </div>
        `;
        psiCard.title = "Klicka för att köra live Google PageSpeed Insights test under Datakällor";
        psiCard.addEventListener("click", () => {
          switchMasterView("inputs");
          const urlInput = document.getElementById("psi-url-input");
          if (urlInput) urlInput.focus();
        });
      }

      overviewGridEl.appendChild(psiCard);
    }

    let isDropUriMeasured = false;
    let checkoutSecure = false;
    let cartSecure = false;
    if (env.hasWooCommerce) {
      const rawDropUri = state.uploadedSettings ? state.uploadedSettings.drop_uri : null;
      if (rawDropUri !== null && rawDropUri !== undefined) {
        isDropUriMeasured = true;
        const clean = String(rawDropUri).toLowerCase().replace(/[\^\$]/g, "");
        checkoutSecure = clean.includes("checkout") || clean.includes("kassa");
        cartSecure = clean.includes("cart") || clean.includes("varukorg");
      }
    }

    // Render top recommendation message
    const topFindingTextEl = document.getElementById("top-finding-text");
    if (topFindingTextEl) {
      if (env.hasWooCommerce && isDropUriMeasured && !checkoutSecure) {
        topFindingTextEl.textContent = "Varning: Din butikskassa (checkout) är inte exkluderad från LiteSpeed Cache i din inlästa profil! Detta är en allvarlig stabilitetsrisk som måste åtgärdas under inställningarna.";
      } else if (results.alerts.some(a => a.type === "danger")) {
        const firstDanger = results.alerts.find(a => a.type === "danger");
        topFindingTextEl.textContent = `Kritisk varning: ${firstDanger.title}. Se fliken 'Risker & Kompatibilitet'.`;
      } else if (results.alerts.some(a => a.type === "warning")) {
        topFindingTextEl.textContent = "Detekterade kompatibilitetsvarningar i din miljö (t.ex. krockande lazy-loads). Se fliken 'Risker & Kompatibilitet' för detaljerade råd.";
      } else if (deviationCount > 0) {
        topFindingTextEl.textContent = `Din sajt är stabil och har ${deviationCount} rekommenderade prestandaoptimeringar. Se fliken 'Rekommenderade inställningar'.`;
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
        if (isDropUriMeasured) {
          if (checkoutSecure && cartSecure) {
            li2.innerHTML = `<span style="color: var(--color-success);">✓</span> WooCommerce kassa- och varukorgssidor är säkrade från sessionsläckor.`;
          } else {
            li2.innerHTML = `<span style="color: var(--color-danger);">❌</span> Kassan/varukorgen saknar exkluderingsregler i inläst fil!`;
          }
        } else {
          li2.innerHTML = `<span style="color: #94a3b8;">ℹ️</span> Kassaexkluderingar verifieras när .data-fil laddas upp i Slot 6.`;
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
    if (!sumWpVersion || !state.analysisResults) return;
    const env = state.analysisResults.environment;
    
    sumWpVersion.textContent = env.wpVersion;
    if (sumServer) sumServer.textContent = env.server;
    if (sumPhpVersion) sumPhpVersion.textContent = env.phpVersion;
    if (sumTheme) sumTheme.textContent = env.theme;
    
    if (sumWooCommerce) {
      sumWooCommerce.textContent = env.hasWooCommerce ? "Aktiv" : "Inaktiv";
      sumWooCommerce.className = env.hasWooCommerce ? "info-value badge-info" : "info-value";
    }
    
    if (sumElementor) {
      sumElementor.textContent = env.hasElementor ? "Aktiv" : "Inaktiv";
      sumElementor.className = env.hasElementor ? "info-value badge-info" : "info-value";
    }
    
    if (sumObjectCache) {
      sumObjectCache.textContent = env.hasObjectCache ? "Ja" : "Nej";
      sumObjectCache.className = env.hasObjectCache ? "info-value badge-info" : "info-value";
    }
    
    if (summaryCardStatusBadge) {
      const hasCritAlert = state.analysisResults.alerts.some(a => a.type === "danger" || a.type === "warning");
      summaryCardStatusBadge.textContent = hasCritAlert ? "⚠️ Varning" : "🟢 Säkrad OK";
      summaryCardStatusBadge.style.color = hasCritAlert ? "var(--color-warning)" : "var(--color-success)";
      summaryCardStatusBadge.style.background = hasCritAlert ? "var(--color-warning-bg)" : "var(--color-success-bg)";
      summaryCardStatusBadge.style.borderColor = hasCritAlert ? "rgba(245,158,11,0.2)" : "rgba(16,185,129,0.2)";
    }
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
    if (!alertsList || !state.analysisResults) return;
    alertsList.innerHTML = "";

    const rawAlerts = [
      ...state.analysisResults.alerts,
      ...state.analysisResults.customCodeAlerts,
      ...(state.analysisResults.customCssAlerts || [])
    ].filter(a => a.type === "danger" || a.type === "warning");

    // Component mapping definitions
    const componentDefs = {
      litespeed: { key: "litespeed", label: "LiteSpeed", icon: "⚡" },
      woocommerce: { key: "woocommerce", label: "WooCommerce", icon: "🛒" },
      wordfence: { key: "wordfence", label: "Wordfence", icon: "🔒" },
      elementor: { key: "elementor", label: "Elementor", icon: "🎨" },
      ctm: { key: "ctm", label: "CTM", icon: "🏷️" },
      server: { key: "server", label: "Server & Core", icon: "🖥️" },
      scm: { key: "scm", label: "SCM (Kod)", icon: "💻" }
    };

    // Normalize component on each alert
    const normalizedAlerts = rawAlerts.map(a => {
      let comp = a.component;
      if (!comp) {
        if (a.targetTabId === "elementor") comp = "elementor";
        else if (a.targetTabId === "wordfence") comp = "wordfence";
        else if (a.title.toLowerCase().includes("ctm")) comp = "ctm";
        else if (a.title.toLowerCase().includes("woo") || a.title.toLowerCase().includes("kassa") || a.title.toLowerCase().includes("cart")) comp = "woocommerce";
        else if (a.title.toLowerCase().includes("litespeed")) comp = "litespeed";
        else if (a.title.toLowerCase().includes("scm")) comp = "scm";
        else comp = "server";
      }
      return { ...a, component: comp };
    });

    // Update global counter badges
    const critCount = normalizedAlerts.filter(a => a.type === "danger").length;
    const warnCount = normalizedAlerts.filter(a => a.type === "warning").length;
    const critBadge = document.getElementById("risk-count-critical-badge");
    const warnBadge = document.getElementById("risk-count-warning-badge");
    if (critBadge) critBadge.textContent = `${critCount} Kritiska`;
    if (warnBadge) warnBadge.textContent = `${warnCount} Varningar`;

    // 1. Render Top Component Status Grid
    const statusGridEl = document.getElementById("risk-component-status-grid");
    if (statusGridEl) {
      statusGridEl.innerHTML = "";
      const statusKeys = ["litespeed", "woocommerce", "wordfence", "elementor", "ctm", "scm", "server"];

      statusKeys.forEach(k => {
        const def = componentDefs[k] || { label: k, icon: "📦" };
        const compAlerts = normalizedAlerts.filter(a => {
          if (a.components && Array.isArray(a.components)) {
            return a.components.includes(k) || (k === "server" && (a.components.includes("scm") || a.components.includes("css")));
          }
          return a.component === k || (k === "server" && (a.component === "scm" || a.component === "css"));
        });
        const cCount = compAlerts.filter(a => a.type === "danger").length;
        const wCount = compAlerts.filter(a => a.type === "warning").length;

        let cardStatusClass = "ok";
        let statusBadgeText = "🟢 OK (Inga problem)";
        if (cCount > 0) {
          cardStatusClass = "danger";
          statusBadgeText = `🔴 ${cCount} Kritiska ${wCount > 0 ? `(${wCount} v)` : ""}`;
        } else if (wCount > 0) {
          cardStatusClass = "warning";
          statusBadgeText = `🟡 ${wCount} Varning${wCount > 1 ? "ar" : ""}`;
        }

        const isSelected = state.activeRiskFilter === k;

        const card = document.createElement("div");
        card.className = `risk-component-card ${cardStatusClass} ${isSelected ? "selected" : ""}`;
        card.style.cursor = "pointer";
        card.innerHTML = `
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.35rem;">
            <strong style="font-size: 0.85rem; color: #fff; display: flex; align-items: center; gap: 0.35rem;">
              <span>${def.icon}</span> ${escapeHtml(def.label)}
            </strong>
          </div>
          <div style="font-size: 0.72rem; font-weight: 600;">
            ${statusBadgeText}
          </div>
        `;

        card.addEventListener("click", () => {
          state.activeRiskFilter = state.activeRiskFilter === k ? "all" : k;
          renderAlerts();
        });

        statusGridEl.appendChild(card);
      });
    }

    // 2. Render Component Filter Toolbar
    const toolbarEl = document.getElementById("risk-filter-toolbar");
    if (toolbarEl) {
      toolbarEl.innerHTML = "";
      
      const filterItems = [
        { key: "all", label: "Alla", count: normalizedAlerts.length },
        { key: "litespeed", label: "LiteSpeed", count: normalizedAlerts.filter(a => a.components ? a.components.includes("litespeed") : a.component === "litespeed").length },
        { key: "woocommerce", label: "WooCommerce", count: normalizedAlerts.filter(a => a.components ? a.components.includes("woocommerce") : a.component === "woocommerce").length },
        { key: "wordfence", label: "Wordfence", count: normalizedAlerts.filter(a => a.components ? a.components.includes("wordfence") : a.component === "wordfence").length },
        { key: "elementor", label: "Elementor", count: normalizedAlerts.filter(a => a.components ? a.components.includes("elementor") : a.component === "elementor").length },
        { key: "ctm", label: "CTM", count: normalizedAlerts.filter(a => a.components ? a.components.includes("ctm") : a.component === "ctm").length },
        { key: "scm", label: "SCM", count: normalizedAlerts.filter(a => a.components ? a.components.includes("scm") : a.component === "scm").length },
        { key: "server", label: "Server/Core", count: normalizedAlerts.filter(a => a.components ? (a.components.includes("server") || a.components.includes("css")) : (a.component === "server" || a.component === "css")).length }
      ];

      filterItems.forEach(item => {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = `btn-risk-filter ${state.activeRiskFilter === item.key ? "active" : ""}`;
        btn.innerHTML = `${escapeHtml(item.label)} <span class="badge" style="margin-left: 0.25rem; font-size: 0.65rem;">${item.count}</span>`;
        btn.addEventListener("click", () => {
          state.activeRiskFilter = item.key;
          renderAlerts();
        });
        toolbarEl.appendChild(btn);
      });
    }

    // 3. Filter & Sort Alerts
    let displayAlerts = [...normalizedAlerts];
    if (state.activeRiskFilter && state.activeRiskFilter !== "all") {
      const f = state.activeRiskFilter;
      displayAlerts = displayAlerts.filter(a => {
        if (a.components && Array.isArray(a.components)) {
          return a.components.includes(f) || (f === "server" && (a.components.includes("scm") || a.components.includes("css")));
        }
        return a.component === f || (f === "server" && (a.component === "scm" || a.component === "css"));
      });
    }

    // Descending sort: danger first, then warning
    displayAlerts.sort((a, b) => {
      if (a.type === "danger" && b.type !== "danger") return -1;
      if (a.type !== "danger" && b.type === "danger") return 1;
      return 0;
    });

    if (displayAlerts.length === 0) {
      const activeFilterName = componentDefs[state.activeRiskFilter]?.label || "valda komponenten";
      alertsList.innerHTML = `
        <div class="alert-item success">
          <div class="alert-icon">✓</div>
          <div class="alert-content">
            <h4>Inga risker identifierade</h4>
            <p>${state.activeRiskFilter === "all" ? "Din webbplats matchar 100% av våra stabilitetsregler!" : `Inga aktiva risker för ${activeFilterName}. Status är 100% OK!`}</p>
          </div>
        </div>
      `;
      return;
    }

    displayAlerts.forEach((alert, index) => {
      const item = document.createElement("div");
      item.className = `alert-item ${alert.type}`;
      
      const compDef = componentDefs[alert.component] || { label: alert.component || "WordPress", icon: "⚙️" };

      let pathHtml = "";
      if (alert.wpPath) {
        pathHtml = `
          <div style="margin-top: 0.5rem; font-size: 0.72rem; opacity: 0.85; display: flex; flex-direction: column; gap: 0.25rem; border-top: 1px solid rgba(255,255,255,0.06); padding-top: 0.4rem;">
            <span>📍 <strong>Sökväg i WordPress:</strong></span>
            <code style="background: rgba(0,0,0,0.3); padding: 0.15rem 0.4rem; border-radius: 4px; color: #a5b4fc; display: inline-block; font-size: 0.7rem; font-family: monospace; border: 1px solid rgba(255,255,255,0.03);">${escapeHtml(alert.wpPath)}</code>
          </div>
        `;
      }

      let sourceHtml = "";
      if (alert.source || alert.compatibility) {
        sourceHtml = `
          <div style="margin-top: 0.5rem; background: rgba(0,0,0,0.25); border: 1px solid rgba(255,255,255,0.05); border-radius: 6px; padding: 0.45rem 0.65rem; font-size: 0.72rem; line-height: 1.45; display: flex; flex-direction: column; gap: 0.25rem;">
            ${alert.source ? `<div><strong style="color: #c7d2fe;">📖 Källa:</strong> <span style="color: #cbd5e1;">${escapeHtml(alert.source)}</span></div>` : ""}
            ${alert.compatibility ? `<div><strong style="color: #4ade80;">🔒 Kompatibilitet:</strong> <span style="color: #cbd5e1;">${escapeHtml(alert.compatibility)}</span></div>` : ""}
          </div>
        `;
      }

      let buttonHtml = "";
      if (alert.targetTabId && alert.targetSettingId) {
        buttonHtml = `
          <button class="btn-jump-setting" style="margin-top: 0.5rem; background: rgba(6, 182, 212, 0.15); border: 1px solid rgba(6, 182, 212, 0.3); color: var(--accent-cyan); font-size: 0.72rem; padding: 0.25rem 0.6rem; border-radius: 6px; cursor: pointer; font-weight: 600; display: inline-flex; align-items: center; gap: 0.25rem; transition: all 0.2s;">
            🎯 Visa inställningen i Rekommenderade inställningar ➔
          </button>
        `;
      }

      item.innerHTML = `
        <div class="alert-icon">${alert.icon}</div>
        <div class="alert-content">
          <div style="display: flex; align-items: center; gap: 0.4rem; margin-bottom: 0.25rem; flex-wrap: wrap;">
            <span class="badge" style="font-size: 0.65rem; background: rgba(99, 102, 241, 0.15); color: #c7d2fe; border: 1px solid rgba(99, 102, 241, 0.3); border-radius: 4px; padding: 0.1rem 0.4rem; font-weight: 600;">
              ${compDef.icon} ${escapeHtml(compDef.label)}
            </span>
            <h4 style="margin: 0; font-size: 0.95rem;">${index + 1}. ${escapeHtml(alert.title)}</h4>
          </div>
          <p style="margin-top: 0.25rem;">${escapeHtml(alert.desc)}</p>
          ${sourceHtml}
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

  function renderBulletLists(summaries) {
    // Bullets on slot cards replaced by slot-verified-summary
  }

  function renderPlaceholderBullets() {
    // No-op for cleaner slot cards
  }

  function renderWooChecklist() {
    if (!paymentChecklist || !state.analysisResults) return;
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

    // Checkout & Cart cache exclusions
    let isDropUriMeasured = false;
    let checkoutSecure = false;
    let cartSecure = false;
    const rawDropUri = state.uploadedSettings ? state.uploadedSettings.drop_uri : null;
    if (rawDropUri !== null && rawDropUri !== undefined) {
      isDropUriMeasured = true;
      const clean = String(rawDropUri).toLowerCase().replace(/[\^\$]/g, "");
      checkoutSecure = clean.includes("checkout") || clean.includes("kassa");
      cartSecure = clean.includes("cart") || clean.includes("varukorg");
    }

    checklist.push({
      label: "Kassacaching undantagen (drop_uri)",
      status: !isDropUriMeasured ? "Ej uppmätt (Kräver Slot 6)" : (checkoutSecure ? "Skyddad" : "RISK"),
      risk: isDropUriMeasured && !checkoutSecure,
      desc: !isDropUriMeasured
        ? "Ladda upp LiteSpeed .data (Slot 6) för att verifiera att kassan är exkluderad i drop_uri."
        : (checkoutSecure 
          ? "Kassan exkluderas från cachning för att förhindra session- och dataläckor."
          : "Kassan cachas aktivt! Risk för session-läckor eller misslyckade köp."),
      wpPath: "LiteSpeed Cache ➔ Inställningar ➔ Cache ➔ [4] Exkludera ➔ Exkludera sökvägar (drop_uri)",
      targetTabId: "cache",
      targetSettingId: "drop_uri"
    });

    checklist.push({
      label: "Varukorgscaching undantagen (drop_uri)",
      status: !isDropUriMeasured ? "Ej uppmätt (Kräver Slot 6)" : (cartSecure ? "Skyddad" : "RISK"),
      risk: isDropUriMeasured && !cartSecure,
      desc: !isDropUriMeasured
        ? "Ladda upp LiteSpeed .data (Slot 6) för att verifiera att varukorgen är exkluderad i drop_uri."
        : (cartSecure
          ? "Varukorgen är exkluderad, vilket säkrar kundvagnsfragmenten."
          : "Varukorgen är inte exkluderad. Risk för tomma kundvagnar under navigation."),
      wpPath: "LiteSpeed Cache ➔ Inställningar ➔ Cache ➔ [4] Exkludera ➔ Exkludera sökvägar (drop_uri)",
      targetTabId: "cache",
      targetSettingId: "drop_uri"
    });

    // WooCommerce gateways exclusions check
    const activeExcludes = ((state.uploadedSettings && state.uploadedSettings.js_exclude) || state.editedSettings.js_exclude || "").toLowerCase();
    
    if (env.wooGateways && env.wooGateways.length > 0) {
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
    if (!customCodeAlertsList || !state.analysisResults) return;
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
          <h4>${escapeHtml(alert.title)}</h4>
          <p>${escapeHtml(alert.desc)}</p>
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
        if (state.activeSettingsFilter === "deviations") {
          state.activeSettingsFilter = "all";
          const allBtn = document.getElementById("filter-btn-all");
          if (allBtn) {
            const fBtns = document.querySelectorAll(".filter-btn");
            fBtns.forEach(b => b.classList.remove("active"));
            allBtn.classList.add("active");
          }
        }
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
                <strong>${escapeHtml(alert.title)}</strong>
                <p style="opacity:0.85; font-size:0.7rem; margin-top:0.1rem;">${escapeHtml(alert.desc)}</p>
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

    // Filter options if filter is active
    const compFn = window.getOptionComparison || getOptionComparison;
    let filteredOptions = activeTab.options;
    
    if (state.activeSettingsFilter === "critical") {
      const allCritical = [];
      state.analysisResults.recommendations.forEach(tab => {
        tab.options.forEach(o => {
          if (o.id === "optm_css_custom") return;
          if (o.criticalLevel === "critical") {
            allCritical.push({ ...o, tabCategoryTitle: tab.title });
          }
        });
      });
      filteredOptions = allCritical;
    } else if (state.activeSettingsFilter === "deviations") {
      const allDeviations = [];
      state.analysisResults.recommendations.forEach(tab => {
        tab.options.forEach(o => {
          if (o.id === "optm_css_custom") return;
          const comp = compFn ? compFn(o, state.uploadedSettings, state.analysisResults.environment) : { isDeviant: false };
          if (comp.isDeviant) {
            allDeviations.push({ ...o, tabCategoryTitle: tab.title });
          }
        });
      });
      filteredOptions = allDeviations;
    } else if (state.activeSettingsFilter === "ecommerce") {
      filteredOptions = activeTab.options.filter(o => o.id.includes("woo") || o.id.includes("drop_uri") || o.id.includes("esi") || o.id.includes("cart"));
    } else if (state.activeSettingsFilter === "baseline") {
      filteredOptions = activeTab.options;
    }

    if (filteredOptions.length === 0) {
      const emptyNotice = document.createElement("div");
      emptyNotice.className = "glass-card";
      emptyNotice.style.gridColumn = "span 2";
      emptyNotice.style.padding = "2rem";
      emptyNotice.style.textAlign = "center";
      emptyNotice.style.color = "var(--text-muted)";
      if (state.activeSettingsFilter === "deviations") {
        emptyNotice.innerHTML = `
          <span style="font-size: 2.2rem; display: block; margin-bottom: 0.5rem; color: #4ade80;">🎉</span>
          <strong style="color: #4ade80; font-size: 1rem;">Inga avvikelser hittades!</strong>
          <p style="font-size: 0.82rem; margin-top: 0.25rem;">Alla inställningar matchar våra rekommenderade guldstandard-regler (100% Guldstandard).</p>
        `;
      } else {
        emptyNotice.innerHTML = `
          <span style="font-size: 2rem; display: block; margin-bottom: 0.5rem;">✓</span>
          <strong>Inga inställningar matchar det aktiva filtret ('${state.activeSettingsFilter}').</strong>
          <p style="font-size: 0.8rem; margin-top: 0.25rem;">Klicka på 'Alla inställningar' för att se hela listan.</p>
        `;
      }
      settingsContainer.appendChild(emptyNotice);
      return;
    }

    filteredOptions.forEach(opt => {
      // Avoid re-rendering custom_css as a separate card if it's the custom CSS option field
      if (opt.id === "optm_css_custom") return;

      const card = document.createElement("div");
      card.className = "setting-card";
      
      let criticalTagHtml = "";
      if (opt.tabCategoryTitle && (state.activeSettingsFilter === "deviations" || state.activeSettingsFilter === "critical")) {
        criticalTagHtml += `<span class="badge" style="background: rgba(255,255,255,0.08); color: #cbd5e1; font-size: 0.68rem; padding: 0.1rem 0.45rem; border-radius: 4px; border: 1px solid rgba(255,255,255,0.1);">📂 ${escapeHtml(opt.tabCategoryTitle)}</span>`;
      }
      if (state.activeSettingsFilter === "baseline") {
        criticalTagHtml += `<span class="badge-critical-tag" style="background: rgba(99, 102, 241, 0.2); color: #c7d2fe; border: 1px solid rgba(99, 102, 241, 0.4);">⭐ Golden Master</span>`;
      } else if (opt.criticalLevel === "critical") {
        criticalTagHtml += `<span class="badge-critical-tag critical">🚨 Kritisk</span>`;
      } else if (opt.criticalLevel === "high") {
        criticalTagHtml += `<span class="badge-critical-tag high">⚡ Hög påverkan</span>`;
      } else {
        criticalTagHtml += `<span class="badge-critical-tag standard">ℹ️ Standard</span>`;
      }

      let activeUserVal = "";
      if (state.editedSettings && state.editedSettings.hasOwnProperty(opt.id)) {
        activeUserVal = state.editedSettings[opt.id];
      } else if (state.uploadedSettings && state.uploadedSettings.hasOwnProperty(opt.id)) {
        activeUserVal = state.uploadedSettings[opt.id];
      }

      let isChecked = false;
      let isMatches = false;

      const comp = compFn ? compFn(opt, state.uploadedSettings, state.analysisResults.environment) : {
        isMeasured: !!state.uploadedSettings,
        isMatches: true,
        statusLabel: "🟢 Optimal",
        currentDisplay: "PÅ",
        recommendedDisplay: "PÅ"
      };

      if (opt.id === "drop_uri" || opt.id === "js_exclude" || opt.id === "css_exclude" || opt.id === "media_lazy_exc") {
        isMatches = comp.isMatches;
      } else if (typeof opt.recommendedRaw === "string" && opt.recommendedRaw !== "1" && opt.recommendedRaw !== "0") {
        isMatches = comp.isMatches;
      } else {
        isChecked = activeUserVal === 1 || activeUserVal === "1" || activeUserVal === "on" || activeUserVal === true;
        isMatches = comp.isMatches;
      }

      let riskBadge = "";
      if (opt.riskLevel === "high") {
        riskBadge = `<span class="badge-risk high">⚠️ Krockrisk: JS/CSS</span>`;
      } else if (opt.riskLevel === "critical") {
        riskBadge = `<span class="badge-risk high">🚨 Kritisk kassa/WooCommerce</span>`;
      } else if (opt.riskLevel === "safe") {
        riskBadge = `<span class="badge-risk safe">✓ Säker prestanda</span>`;
      }

      const toolLabels = {
        litespeed: "⚡ LiteSpeed Cache",
        woocommerce: "🛒 WooCommerce",
        elementor: "🎨 Elementor",
        wordfence: "🔒 Wordfence",
        server: "🖥️ WP Core & Server"
      };
      const toolBadgeHtml = `<span class="badge" style="background: rgba(99, 102, 241, 0.15); color: #c7d2fe; border: 1px solid rgba(99, 102, 241, 0.3); font-size: 0.68rem; padding: 0.1rem 0.45rem; border-radius: 4px; font-weight: 600;">${toolLabels[opt.tool || "litespeed"] || "⚡ LiteSpeed Cache"}</span>`;

      // Check if setting corresponds to an active alert in Riskdetektorn
      const hasActiveRisk = state.analysisResults && state.analysisResults.alerts && state.analysisResults.alerts.some(a => 
        (a.targetSettingId === opt.id) || 
        (a.targetTabId === state.activeTabId && (opt.id.includes("lazy") || opt.id.includes("drop") || opt.id.includes("js_exclude") || opt.id.includes("ip_header")))
      );
      const activeRiskBadge = hasActiveRisk 
        ? `<span class="badge-risk high" style="background: rgba(239, 68, 68, 0.15); color: #f87171; border: 1px solid rgba(239, 68, 68, 0.3); font-size: 0.68rem; padding: 0.1rem 0.45rem; border-radius: 4px; font-weight: 600;">🚨 Aktiv risk i Riskdetektorn</span>` 
        : "";

      const isTextareaField = opt.id === "js_exclude" || opt.id === "css_exclude" || opt.id === "media_lazy_exc" || opt.id === "drop_uri";

      const matchBadge = !comp.isMeasured 
        ? `<span class="badge-risk info" style="background: rgba(148, 163, 184, 0.15); color: #94a3b8; border: 1px solid rgba(148, 163, 184, 0.3);">⚪ Ej uppmätt (Kräver Slot 6)</span>`
        : comp.isMatches 
          ? `<span class="badge-risk safe" style="background: rgba(16, 185, 129, 0.15); color: var(--color-success); border: 1px solid rgba(16, 185, 129, 0.3);">🟢 Optimal (Matchar guldstandard)</span>`
          : `<span class="badge-risk high" style="background: rgba(245, 158, 11, 0.15); color: var(--color-warning); border: 1px solid rgba(245, 158, 11, 0.3);">🟡 Avvikelse (Rekommenderat: ${comp.recommendedDisplay})</span>`;

      let diffHtml = "";
      if (comp.isMeasured) {
        const curBadgeText = isTextareaField ? comp.currentDisplay : (comp.rawMeasured === "1" || comp.rawMeasured === 1 || comp.rawMeasured === "on" || comp.rawMeasured === true ? "PÅ" : "AV");
        const recBadgeText = isTextareaField ? comp.recommendedDisplay : (comp.rawRecommended === "1" || comp.rawRecommended === 1 || comp.rawRecommended === "on" || comp.rawRecommended === true ? "PÅ" : (typeof comp.rawRecommended === "string" ? comp.rawRecommended : "AV"));
        const currentClass = (comp.rawMeasured === 1 || comp.rawMeasured === "1" || (isTextareaField && comp.isMatches)) ? "on" : "off";
        const recClass = (comp.rawRecommended === 1 || comp.rawRecommended === "1" || (isTextareaField && comp.isMatches)) ? "on" : "off";
        
        diffHtml = `
          <div class="comparison-container" style="margin-top:0.75rem;">
            <div class="status-block">
              <span class="status-label">Din inställning</span>
              <span class="status-badge ${currentClass}">${curBadgeText}</span>
            </div>
            <span class="comparison-arrow">→</span>
            <div class="status-block">
              <span class="status-label">Rekommenderat</span>
              <span class="status-badge ${recClass}">${recBadgeText}</span>
            </div>
          </div>
        `;
      } else {
        diffHtml = `
          <div class="comparison-container" style="margin-top:0.75rem;">
            <div class="status-block">
              <span class="status-label">Slot 6 status</span>
              <span class="status-badge off" style="color:#94a3b8; border-color:rgba(255,255,255,0.1);">Ej inläst</span>
            </div>
            <span class="comparison-arrow">→</span>
            <div class="status-block">
              <span class="status-label">Guldstandard</span>
              <span class="status-badge on">${comp.recommendedDisplay}</span>
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
                <strong style="color: #c7d2fe; display: block; margin-bottom: 0.1rem;">Officiell rekommendation:</strong>
                <span style="color: var(--text-muted);">${opt.citations.litespeed || opt.citations.consensus || "Officiell rekommendation."}</span>
              </div>
              <div style="border-left: 2px solid var(--color-warning); padding-left: 0.5rem; margin-top: 0.25rem;">
                <strong style="color: #fde68a; display: block; margin-bottom: 0.1rem;">Modern Webb-standard & Konsensus:</strong>
                <span style="color: var(--text-muted);">${opt.citations.consensus || "Branschstandard och best practice."}</span>
              </div>
            </div>
          </details>
        `;
      }

      // Single Source of Truth / Double Activation Explanation
      let singleSourceHtml = "";
      if (opt.singleSourceInfo) {
        singleSourceHtml = `
          <div class="double-activation-info-box" style="margin-top: 0.65rem;">
            <div style="font-weight: 600; color: #38bdf8; display: flex; align-items: center; gap: 0.4rem; font-size: 0.76rem;">
              <span>ℹ️ Single Source of Truth:</span>
              <span class="badge-double-tag">${escapeHtml(opt.singleSourceInfo.recommendedTool)}</span>
            </div>
            <p style="margin-top: 0.25rem; font-size: 0.72rem; color: var(--text-muted); line-height: 1.35;">
              ${escapeHtml(opt.singleSourceInfo.reason)}
            </p>
            <div style="margin-top: 0.35rem; font-size: 0.7rem; color: #fde68a;">
              <strong>Åtgärd i andra verktyg:</strong> ${escapeHtml(opt.singleSourceInfo.actionOtherTools)}
            </div>
          </div>
        `;
      }

      if (isTextareaField) {
        const impactScore = opt.criticalLevel === "critical" ? "+15p Stabilitet (Kassaskydd)" : "+10p Prestanda";
        const impactColor = isMatches ? "var(--color-success)" : "var(--color-warning)";
        card.innerHTML = `
          <div class="setting-info" style="grid-column: span 2;">
            <div class="setting-title-row" style="flex-wrap: wrap; gap: 0.5rem; align-items: center;">
              ${toolBadgeHtml}
              <h4 class="setting-title">${opt.title}</h4>
              ${criticalTagHtml}
              ${riskBadge}
              ${activeRiskBadge}
              ${matchBadge}
              <span class="info-label" style="font-size:0.75rem;">(ID: ${opt.id})</span>
            </div>
            <p class="setting-desc" style="margin-bottom: 0.75rem;">${opt.desc}</p>
            ${singleSourceHtml}
            ${citationsHtml}
            <div style="margin-top: 0.5rem; background: rgba(0,0,0,0.25); border: 1px solid rgba(255,255,255,0.06); border-radius: 8px; padding: 0.75rem; font-family: monospace; font-size: 0.75rem; color: var(--text-main); white-space: pre-wrap; word-break: break-all;">
              <div style="color: var(--text-muted); font-size: 0.7rem; margin-bottom: 0.35rem; font-family: var(--font-sans); font-weight: 600;">Aktiva exkluderingar på sajten:</div>
              ${escapeHtml(activeUserVal || "(Inga aktiva exkluderingar inlästa)")}
            </div>
            <div style="margin-top: 0.5rem; display: flex; justify-content: space-between; align-items: center; font-size: 0.75rem; color: ${impactColor}; font-weight: 600; padding: 0.4rem 0.6rem; background: rgba(0,0,0,0.2); border-radius: 6px;">
              <span>${isMatches ? '✓ Alla rekommenderade mönster är exkluderade' : '⚠️ Vissa nödvändiga skyddsmönster saknas i nuläget'}</span>
              <span>${isMatches ? '✓ Optimalt' : `Påverkan: ${impactScore}`}</span>
            </div>
            ${diffHtml}
          </div>
        `;
      } else {
        const impactScore = opt.criticalLevel === "critical" ? "+15p Stabilitet" : opt.criticalLevel === "high" ? "+10p Prestanda" : "+2p Konfiguration";
        const impactColor = isMatches ? "var(--color-success)" : "var(--color-warning)";

        card.innerHTML = `
          <div class="setting-info" style="flex: 1;">
            <div class="setting-title-row" style="flex-wrap: wrap; gap: 0.5rem; align-items: center;">
              ${toolBadgeHtml}
              <h4 class="setting-title">${opt.title}</h4>
              ${criticalTagHtml}
              ${riskBadge}
              ${activeRiskBadge}
              ${matchBadge}
              <span class="info-label" style="font-size:0.75rem;">(ID: ${opt.id})</span>
            </div>
            <p class="setting-desc">${opt.desc}</p>
            ${singleSourceHtml}
            ${citationsHtml}
            ${diffHtml}
          </div>
          <div class="score-impact-box">
            <div style="font-size: 0.72rem; color: var(--text-muted); display: flex; justify-content: space-between; gap: 0.5rem;">
              <span>Nuläge på sajt:</span>
              <strong style="color: ${isMatches ? 'var(--color-success)' : 'var(--color-warning)'};">${comp.currentDisplay}</strong>
            </div>
            <div style="font-size: 0.72rem; color: var(--text-muted); display: flex; justify-content: space-between; gap: 0.5rem;">
              <span>Rekommendation:</span>
              <strong style="color: #c7d2fe;">${comp.recommendedDisplay}</strong>
            </div>
            <div style="font-size: 0.72rem; margin-top: 0.2rem; padding-top: 0.3rem; border-top: 1px solid rgba(255,255,255,0.06); color: ${impactColor}; font-weight: 600;">
              ${isMatches ? '✓ Optimal poäng' : `⚠️ Påverkan: ${impactScore}`}
            </div>
          </div>
        `;
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
      if (btnFixAll) btnFixAll.style.display = "none";
      
      comparisonSummaryDesc.innerHTML = "✨ <strong>Ny optimeringsprofil skapad från scratch:</strong> Eftersom du inte laddat upp någon befintlig LSCWP-fil (ruta 6), har vi genererat en helt ren och optimal profil anpassad för din sajt. Klicka på flikarna nedan för att se guldstandarden för din WordPress-version!";
      
      comparisonDiffsList.innerHTML = `
        <div style="display:flex; flex-direction:column; gap:0.6rem; padding: 0.5rem 0;">
          <div style="display:flex; align-items:center; gap:0.5rem; color:var(--color-success); font-size:0.875rem;">
            <span>🛡️</span> <strong>WooCommerce- & Elementor-skydd:</strong> drop_uri och kassaexkluderingar är fullt förkonfigurerade.
          </div>
          <div style="display:flex; align-items:center; gap:0.5rem; color:var(--color-success); font-size:0.875rem;">
            <span>⚡</span> <strong>Säkra prestandaförbättringar:</strong> CSS/JS Minify & Defer är aktiva (CSS/JS Combine är inaktiverat för stabilitet).
          </div>
          <div style="display:flex; align-items:center; gap:0.5rem; color:var(--color-success); font-size:0.875rem;">
            <span>⚙️</span> <strong>Optimerad för LiteSpeed Server:</strong> HTTP/3, Crawler och ESI-stöd är förberedda.
          </div>
        </div>
      `;
      return;
    }
    
    // Restore default card styling if a settings file is uploaded:
    comparisonSummaryCard.style.background = "rgba(99, 102, 241, 0.05)";
    comparisonSummaryCard.style.borderColor = "rgba(99, 102, 241, 0.2)";
    if (btnFixAll) btnFixAll.style.display = "none";

    comparisonDiffsList.innerHTML = "";
    
    let tiers = {
      stability: [],
      performance: [],
      finetuning: []
    };

    const compFn = window.getOptionComparison || getOptionComparison;

    state.analysisResults.recommendations.forEach(tab => {
      tab.options.forEach(opt => {
        if (opt.id === "optm_css_custom") return;

        const comp = compFn ? compFn(opt, state.uploadedSettings, state.analysisResults.environment) : { isDeviant: false };
        if (comp.isDeviant) {
          const devData = {
            id: opt.id,
            title: opt.title,
            origVal: comp.currentDisplay,
            recVal: comp.recommendedDisplay,
            recRaw: opt.recommendedRaw
          };

          if (comp.isCritical || opt.id.includes("woo") || opt.id.includes("drop_uri")) {
            tiers.stability.push(devData);
          } else if (opt.criticalLevel === "high" || opt.id.includes("css") || opt.id.includes("js") || opt.id.includes("media")) {
            tiers.performance.push(devData);
          } else {
            tiers.finetuning.push(devData);
          }
        }
      });
    });

    const totalDeviations = tiers.stability.length + tiers.performance.length + tiers.finetuning.length;

    if (totalDeviations === 0) {
      comparisonSummaryCard.style.display = "block";
      comparisonSummaryCard.style.background = "rgba(16, 185, 129, 0.05)";
      comparisonSummaryCard.style.borderColor = "rgba(16, 185, 129, 0.25)";
      if (btnFixAll) btnFixAll.style.display = "none";
      
      comparisonSummaryDesc.innerHTML = "🎉 <strong>100% Guldstandard!</strong> Din uppladdade LiteSpeed-konfiguration matchar alla våra rekommenderade inställningar och kassaskyddsregler.";
      
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
    comparisonSummaryDesc.innerHTML = `⚠️ Hittade totalt <strong>${totalDeviations}</strong> avvikelser uppdelade på tre säkerhetsportar:`;
    if (btnFixAll) btnFixAll.style.display = "none";

    function renderTierSection(title, list, badgeClass, color, emptyMsg) {
      const row = document.createElement("div");
      row.style.display = "flex";
      row.style.justify = "space-between";
      row.style.alignItems = "center";
      row.style.background = list.length > 0 ? "rgba(0,0,0,0.25)" : "rgba(16, 185, 129, 0.05)";
      row.style.border = list.length > 0 ? `1px solid rgba(255,255,255,0.06)` : "1px solid rgba(16, 185, 129, 0.15)";
      row.style.borderLeft = `4px solid ${color}`;
      row.style.padding = "0.6rem 0.85rem";
      row.style.borderRadius = "8px";
      row.style.fontSize = "0.82rem";

      row.innerHTML = `
        <div style="display: flex; align-items: center; gap: 0.5rem;">
          <strong style="color: #fff;">${title}:</strong>
          <span style="color: var(--text-muted); font-size: 0.75rem;">${list.length > 0 ? `${list.length} avvikelser att justera` : emptyMsg}</span>
        </div>
        <span class="badge-risk ${badgeClass}" style="font-size:0.7rem; padding: 0.1rem 0.45rem;">
          ${list.length > 0 ? `${list.length} Avvikelser` : 'Optimalt ✓'}
        </span>
      `;

      comparisonDiffsList.appendChild(row);
    }

    renderTierSection(
      "⚠️ Kritiska stabilitetsändringar", 
      tiers.stability, 
      tiers.stability.length > 0 ? "high" : "safe", 
      "var(--color-danger)", 
      "100% skyddad (Elementor & WooCommerce)"
    );
    
    renderTierSection(
      "⚡ Säkra prestandaförbättringar", 
      tiers.performance, 
      tiers.performance.length > 0 ? "high" : "safe", 
      "var(--accent-cyan)", 
      "Fullt optimerad (CSS/JS/Media)"
    );
    
    renderTierSection(
      "🔧 Miljö-finjusteringar", 
      tiers.finetuning, 
      tiers.finetuning.length > 0 ? "high" : "safe", 
      "var(--accent-indigo)", 
      "Optimalt konfigurerad för LiteSpeed Server"
    );
  }

  function updateActionBar() {
    if (statsChangesCount) {
      if (state.uploadedSettings) {
        let diffCount = 0;
        state.analysisResults.recommendations.forEach(tab => {
          tab.options.forEach(opt => {
            if (state.uploadedSettings.hasOwnProperty(opt.id)) {
              const orig = state.uploadedSettings[opt.id];
              const current = state.editedSettings[opt.id];

              const isTextareaField = opt.id === "js_exclude" || opt.id === "css_exclude" || opt.id === "media_lazy_exc" || opt.id === "drop_uri";

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
        statsChangesCount.innerHTML = `Hittade <strong>${diffCount}</strong> avvikelser i din aktiva LiteSpeed-konfiguration.`;
      } else {
        let activeCount = 0;
        let totalCount = 0;
        Object.keys(state.editedSettings).forEach(k => {
          totalCount++;
          const val = state.editedSettings[k];
          if (val === 1 || val === "on" || val === true || (typeof val === "string" && val.length > 5)) activeCount++;
        });
        statsChangesCount.innerHTML = `Optimeringsprofil redo: <strong>${activeCount}</strong> av <strong>${totalCount}</strong> inställningar analyserade.`;
      }
    }

    if (btnExport) btnExport.disabled = false;
    if (btnExportPhp) btnExportPhp.disabled = false;
    if (btnExportJson) btnExportJson.disabled = false;
    if (btnCopyAiSecondOpinion) btnCopyAiSecondOpinion.disabled = false;
    if (btnDownloadAiSecondOpinion) btnDownloadAiSecondOpinion.disabled = false;
  }

  // --- TRIGGER FILE EXPORT ---
  if (btnExport) {
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
        link.download = `arewee-optimizer-${new Date().toISOString().slice(0, 10)}.data`;
        
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      } catch (err) {
        alert(`Exporteringsfel: ${err.message}`);
      }
    });
  }

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
        link.download = "arewee-optimizer-sync.php";
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
        const targetVersion = "2.3.2";
        if (companionVersion !== targetVersion) {
          apiSyncStatusText.innerHTML = `⚠️ Ansluten live till ${escapeHtml(url.replace(/^https?:\/\//, ""))} (Plugin v${escapeHtml(companionVersion)} är föråldrad! Ladda ner v${escapeHtml(targetVersion)})`;
          apiSyncStatusText.style.color = "#fbbf24"; // warning color
        } else {
          apiSyncStatusText.textContent = `✓ Ansluten live till ${url.replace(/^https?:\/\//, "")}`;
          apiSyncStatusText.style.color = "var(--color-success)";
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

  // --- AI SECOND OPINION EXPORTERS (GROK / CLAUDE / CHATGPT) ---
  if (btnCopyAiSecondOpinion) {
    btnCopyAiSecondOpinion.addEventListener("click", async () => {
      try {
        const md = window.generateSecondOpinionMarkdown(state);
        await navigator.clipboard.writeText(md);
        alert("✓ AI Second Opinion rapporten har kopierats till urklipp!\n\nKlistra in direkt i Grok, Claude eller ChatGPT för att få en oberoende granskning.");
      } catch (err) {
        alert("Kunde inte kopiera automatiskt: " + err.message);
      }
    });
  }

  if (btnDownloadAiSecondOpinion) {
    btnDownloadAiSecondOpinion.addEventListener("click", () => {
      try {
        const md = window.generateSecondOpinionMarkdown(state);
        const blob = new Blob([md], { type: "text/markdown;charset=utf-8" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `arewee-optimizer-second-opinion-${new Date().toISOString().slice(0, 10)}.md`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      } catch (err) {
        alert(`Nedladdningsfel: ${err.message}`);
      }
    });
  }

  if (btnBatchAiSecondOpinion) {
    btnBatchAiSecondOpinion.addEventListener("click", async () => {
      try {
        const raw = localStorage.getItem("wp_optimizer_history") || localStorage.getItem("wp_optimizer_profiles_library");
        const library = (historyLibrary && historyLibrary.length > 0) ? historyLibrary : (raw ? JSON.parse(raw) : []);
        if (!library || library.length === 0) {
          alert("Ingen sparad historik finns ännu att sammanställa. Spara en eller flera sajtprofiler först!");
          return;
        }
        const md = window.generateBatchSecondOpinionMarkdown(library);
        await navigator.clipboard.writeText(md);
        alert(`✓ AI Batch-rapport för ${library.length} sparade sajter har kopierats till urklipp!\n\nKlistra in direkt i Grok eller Claude.`);
      } catch (err) {
        alert("Kunde inte skapa batch-rapport: " + err.message);
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
        link.download = `arewee-optimizer-helper-${new Date().toISOString().slice(0, 10)}.php`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      } catch (err) {
        alert(`Fel vid generering av PHP: ${err.message}`);
      }
    });
  }

  if (btnCopyPhp) {
    btnCopyPhp.addEventListener("click", async () => {
      try {
        const phpSnippet = generateAutoOptimizerSnippet(state.editedSettings);
        await navigator.clipboard.writeText(phpSnippet);
        alert("✓ AreWee-Optimizer PHP-koden har kopierats till urklipp!\n\nKlistra in direkt i functions.php, Code Snippets eller WPCode.");
      } catch (err) {
        alert("Kunde inte kopiera automatiskt: " + err.message);
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
        link.download = `arewee-optimizer-snippets-${new Date().toISOString().slice(0, 10)}.json`;
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
      state.uploadMetadata = profile.uploadMetadata || {
        sysInfo: { name: profile.name + " (Historik WP)", timestamp: profile.timestamp },
        wooInfo: profile.wooInfo ? { name: "Historik WC", timestamp: profile.timestamp } : { name: "", timestamp: "" },
        wfInfo: profile.wfInfo ? { name: "Historik Wordfence", timestamp: profile.timestamp } : { name: "", timestamp: "" },
        elemInfo: profile.elemInfo ? { name: "Historik Elementor", timestamp: profile.timestamp } : { name: "", timestamp: "" },
        customCodeInfo: profile.customCodeInfo ? { name: "Historik Snippets", timestamp: profile.timestamp } : { name: "", timestamp: "" },
        uploadedSettings: profile.uploadedSettings ? { name: "Historik LSCWP Settings", timestamp: profile.timestamp } : { name: "", timestamp: "" }
      };

      if (state.apiUrl && apiSiteUrl) apiSiteUrl.value = state.apiUrl;

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
        badge.textContent = "✓ Inläst";
        badge.title = state.uploadMetadata[key]?.name || 'Inläst';
      } else {
        badge.className = "file-status";
        badge.title = "";
        if (key === "sysInfo") badge.textContent = "Krävs *";
        else if (key === "customCodeInfo") badge.textContent = "SCM JSON / PHP";
        else if (key === "uploadedSettings") badge.textContent = "Jämför .data";
        else badge.textContent = "Valfritt";
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
    link.download = "arewee-optimizer-history.json";
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
          throw new Error("Historikfilen måste vara en giltig JSON-matris med sajtprofiler.");
        }
        
        const invalidIndex = imported.findIndex(p => !p.hasOwnProperty("id") || !p.hasOwnProperty("name") || !p.hasOwnProperty("healthScore") || !p.hasOwnProperty("sysInfo"));
        if (invalidIndex !== -1) {
          throw new Error(`Profil #${invalidIndex + 1} saknar nödvändiga fält (id, name, healthScore eller sysInfo).`);
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

  // Bind Datakällor top action buttons
  const btnSaveProfileInputs = document.getElementById("btn-save-profile-inputs");
  const btnClearInputs = document.getElementById("btn-clear-inputs");

  if (btnSaveProfileInputs) {
    btnSaveProfileInputs.addEventListener("click", saveCurrentProfile);
  }

  if (btnClearInputs) {
    btnClearInputs.addEventListener("click", () => {
      if (confirm("Vill du rensa all inläst data och återställa analysen?")) {
        state.sysInfo = null;
        state.wooInfo = null;
        state.wfInfo = null;
        state.elemInfo = null;
        state.customCodeInfo = null;
        state.customCss = "";
        state.uploadedSettings = null;
        state.editedSettings = {};
        state.analysisResults = null;
        state.uploadMetadata = {};
        state.apiUrl = "";

        // Reset file inputs and badges
        ["sysinfo", "woocommerce", "wordfence", "elementor", "customcode", "settings", "customcss"].forEach(slot => {
          const input = document.getElementById(`${slot}-input`);
          if (input) input.value = "";
          const dropzone = document.getElementById(`${slot}-dropzone`);
          if (dropzone) dropzone.classList.remove("has-file");
          const summary = document.getElementById(`${slot}-summary`);
          if (summary) summary.innerHTML = "";
          const status = document.getElementById(`${slot}-status`);
          if (status) {
            status.textContent = slot === "sysinfo" ? "Krävs *" : "Valfri";
            status.className = "file-status";
          }
        });

        if (btnStartAnalysis) {
          btnStartAnalysis.disabled = true;
          btnStartAnalysis.style.background = "rgba(255, 255, 255, 0.05)";
          btnStartAnalysis.style.color = "var(--text-muted)";
          btnStartAnalysis.style.boxShadow = "none";
        }
        if (analysisReadyText) {
          analysisReadyText.textContent = "Väntar på WP-systemfil (ruta 1)...";
          analysisReadyText.style.color = "var(--text-muted)";
        }

        // Hide analyzed views, show placeholders
        document.querySelectorAll(".view-section").forEach(sec => {
          const placeholder = sec.querySelector(".empty-state-placeholder");
          const content = sec.querySelector(".view-content");
          if (placeholder) placeholder.style.display = "block";
          if (content) content.style.display = "none";
        });

        updateActiveSiteStatusBar();
        renderSourcesTab();
        alert("✓ All inläst data har rensats.");
      }
    });
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
