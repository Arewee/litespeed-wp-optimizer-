/**
 * LiteSpeed & WordPress Optimizer - Main Application Controller
 * Version: 2.7.3
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

  const APP_VERSION = "2.7.3";
  try { window.APP_VERSION = APP_VERSION; } catch (e) {}

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
    activeSettingsFilter: "all_deviations",
    activeRiskFilter: "all",
    settingsSortBy: "deviations", // deviations (default) | default | impact | status | alphabetical
    settingsSearchQuery: "",
    psiScores: null,
    quicLiveHeaders: undefined, // undefined=unprobed; null=probed/failed; object=header map
    editedSettings: {}, // Active options configuration (1 for ON, 0 for OFF, or strings)
    apiUrl: "",
    apiToken: "",
    uploadMetadata: {
      sysInfo: { name: "", timestamp: "" },
      wooInfo: { name: "", timestamp: "" },
      wfInfo: { name: "", timestamp: "" },
      themeInfo: { name: "", timestamp: "" },
      elemInfo: { name: "", timestamp: "" },
      customCodeInfo: { name: "", timestamp: "" },
      uploadedSettings: { name: "", timestamp: "" }
    }
  };

  // --- DOM ELEMENT REFERENCES ---
  const sysInfoDropzone = document.getElementById("sysinfo-dropzone");
  const woocommerceDropzone = document.getElementById("woocommerce-dropzone");
  const wordfenceDropzone = document.getElementById("wordfence-dropzone");
  const themeDropzone = document.getElementById("theme-dropzone");
  const elementorDropzone = document.getElementById("elementor-dropzone");
  const customcodeDropzone = document.getElementById("customcode-dropzone");
  const settingsDropzone = document.getElementById("settings-dropzone");

  const sysInfoInput = document.getElementById("sysinfo-input");
  const woocommerceInput = document.getElementById("woocommerce-input");
  const wordfenceInput = document.getElementById("wordfence-input");
  const themeInput = document.getElementById("theme-input");
  const elementorInput = document.getElementById("elementor-input");
  const customcodeInput = document.getElementById("customcode-input");
  const settingsInput = document.getElementById("settings-input");
  
  const sysInfoStatus = document.getElementById("sysinfo-status");
  const woocommerceStatus = document.getElementById("woocommerce-status");
  const wordfenceStatus = document.getElementById("wordfence-status");
  const themeStatus = document.getElementById("theme-status");
  const elementorStatus = document.getElementById("elementor-status");
  const customcodeStatus = document.getElementById("customcode-status");
  const settingsStatus = document.getElementById("settings-status");
  
  const sysInfoSummary = document.getElementById("sysinfo-summary");
  const woocommerceSummary = document.getElementById("woocommerce-summary");
  const wordfenceSummary = document.getElementById("wordfence-summary");
  const themeSummary = document.getElementById("theme-summary");
  const elementorSummary = document.getElementById("elementor-summary");
  const customcodeSummary = document.getElementById("customcode-summary");
  const settingsSummary = document.getElementById("settings-summary");

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
  const compareSelectA = document.getElementById("compare-select-a");
  const compareSelectB = document.getElementById("compare-select-b");
  const btnCompareExecute = document.getElementById("btn-compare-execute");
  const btnCompareClose = document.getElementById("btn-compare-close");
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

  // Robust Cross-Browser Clipboard Helper with execCommand Fallback
  async function copyToClipboard(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      try {
        await navigator.clipboard.writeText(text);
        return true;
      } catch (e) {
        console.warn("navigator.clipboard failed, attempting fallback:", e);
      }
    }
    const textArea = document.createElement("textarea");
    textArea.value = text;
    textArea.style.position = "fixed";
    textArea.style.left = "-9999px";
    textArea.style.top = "0";
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    try {
      const successful = document.execCommand("copy");
      document.body.removeChild(textArea);
      return successful;
    } catch (err) {
      document.body.removeChild(textArea);
      throw err;
    }
  }

  // Generic Clipboard Copy Handler for Exclusions & Lists
  document.addEventListener("click", async (e) => {
    const btn = e.target.closest(".btn-copy-missing, .btn-copy-current, .btn-copy-full-rec");
    if (btn && btn.dataset.copy) {
      e.stopPropagation();
      e.preventDefault();
      const textToCopy = btn.dataset.copy;
      try {
        await copyToClipboard(textToCopy);
        const origText = btn.innerHTML;
        btn.innerHTML = "✓ Kopierad!";
        btn.style.borderColor = "var(--color-success)";
        btn.style.color = "#86efac";
        setTimeout(() => {
          btn.innerHTML = origText;
          btn.style.borderColor = "";
          btn.style.color = "";
        }, 2200);
      } catch (err) {
        console.error("Clipboard copy failed:", err);
      }
    }
  });

  // --- EVENT ATTACHMENTS & DRAG/DROP ---
  setupDragAndDrop(sysInfoDropzone, sysInfoInput, handleSysInfoFile);
  setupDragAndDrop(woocommerceDropzone, woocommerceInput, handleWooCommerceFile);
  setupDragAndDrop(wordfenceDropzone, wordfenceInput, handleWordfenceFile);
  setupDragAndDrop(themeDropzone, themeInput, handleThemeFile);
  setupDragAndDrop(elementorDropzone, elementorInput, handleElementorFile);
  setupDragAndDrop(customcodeDropzone, customcodeInput, handleCustomCodeFile);
  setupDragAndDrop(settingsDropzone, settingsInput, handleSettingsFile);

  // --- PASTE MODAL & DIRECT CLIPBOARD INGESTION ---
  let activePasteSlot = null;
  const pasteModal = document.getElementById("paste-modal");
  const pasteModalTitle = document.getElementById("paste-modal-title");
  const pasteModalTextarea = document.getElementById("paste-modal-textarea");
  const btnClosePasteModal = document.getElementById("btn-close-paste-modal");
  const btnCancelPasteModal = document.getElementById("btn-cancel-paste-modal");
  const btnSubmitPasteModal = document.getElementById("btn-submit-paste-modal");

  const slotLabels = {
    sysinfo: "1. WP-system",
    woocommerce: "2. WooCommerce",
    wordfence: "3. Wordfence",
    theme: "4. Tema",
    elementor: "5. Elementor",
    customcode: "6. SCM",
    settings: "7. LiteSpeed"
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
    if (lower.startsWith("diagnostics_for_") || lower.includes("wordfence") || lower.includes("wf-diagnostic") || lower.includes("wfconfig") || lower.includes("wf_diagnostic") || lower.includes("diagnostic")) {
      return "wordfence";
    }
    if (lower.startsWith("system-info-") || lower.includes("elementor") || lower.includes("elem-info") || lower.includes("elementor-system")) {
      return "elementor";
    }
    if (lower.startsWith("systemstatusreport_") || lower.includes("systemstatusreport") || lower.includes("woocommerce") || lower.includes("wc-status") || lower.includes("wc_status") || lower.includes("woo-status") || lower.includes("wc-report")) {
      return "woocommerce";
    }
    if (lower.startsWith("astra-") || lower.startsWith("blocksy-") || lower.includes("theme-options") || lower.includes("theme_options") || lower.includes("customizer") || lower.includes("hello-elementor") || lower.includes("child-theme") || lower.includes("theme")) {
      return "theme";
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
    return null;
  }

  function detectPastedFormat(text, filenameHint) {
    if (!text || isBinaryContent(text)) return null;
    const trimmed = text.trim();
    
    // 1. SysInfo (WordPress Site Health Info)
    if (trimmed.includes("### wp-core ###") || trimmed.includes("wp-server") || trimmed.includes("wp-paths-sizes") || trimmed.includes("wp-database") || (trimmed.includes("### wp-plugins-active") && trimmed.includes("wp-version"))) {
      return "sysinfo";
    }

    // 2. Elementor System Info (Checked before generic plugin mentions to avoid false routing)
    if (trimmed.includes("== Elementor ==") || 
        trimmed.includes("### Elementor ###") || 
        trimmed.includes("== Elementor Pro ==") || 
        trimmed.includes("== Elementor -") || 
        trimmed.includes("== Elementor Experiments ==") || 
        trimmed.includes("e_dom_optimization") ||
        trimmed.includes("Optimized DOM Output") ||
        trimmed.includes("Optimerad DOM-utmatning") ||
        ((trimmed.includes("== Server Environment ==") || trimmed.includes("== Features ==") || trimmed.includes("== Experiments ==") || trimmed.includes("== Elements Usage ==")) && trimmed.toLowerCase().includes("elementor"))
    ) {
      return "elementor";
    }

    // 3. WooCommerce System Status Report
    if (trimmed.includes("### woocommerce ###") || 
        trimmed.includes("### payment-gateways ###") || 
        trimmed.includes("WC Version:") || 
        trimmed.includes("WooCommerce Version:") || 
        (trimmed.includes("Database tables") && trimmed.toLowerCase().includes("woocommerce")) || 
        trimmed.includes("high-performance order storage") || 
        trimmed.includes("### woocommerce-tables ###")) {
      return "woocommerce";
    }

    // 4. Wordfence Diagnostic Report (Strict diagnostic markers, avoiding loose plugin mentions)
    if (trimmed.includes("Wordfence Diagnostic") || 
        trimmed.includes("wfConfig") || 
        trimmed.includes("Wordfence Network") || 
        trimmed.includes("Wordfence Live Traffic") || 
        trimmed.includes("How Wordfence gets IPs") || 
        trimmed.includes("Wordfence Memory Limit") || 
        (trimmed.includes("Firewall Mode:") && trimmed.includes("wf_")) || 
        trimmed.toLowerCase().includes("wordfence diagnostic report") ||
        trimmed.includes("wordfence-diagnostic") ||
        (trimmed.includes("### Wordfence ###") && !trimmed.includes("### wp-plugins-active"))) {
      return "wordfence";
    }

    // 5. Theme / Astra / Blocksy / Customizer
    if (trimmed.includes("astra-settings") || trimmed.includes("astra_settings") || trimmed.includes("blocksy_options") || trimmed.includes('"astra"') || trimmed.includes("wp-active-theme") || (trimmed.includes("theme") && (trimmed.includes("google_fonts") || trimmed.includes("fonts.googleapis") || trimmed.includes("customizer")))) {
      return "theme";
    }
    // 6. Custom code / SCM
    if (trimmed.startsWith("<?php") || trimmed.includes("add_action(") || trimmed.includes("Site Code Manager") || trimmed.includes('"isScmPackage"') || (trimmed.includes('"snippets"') && trimmed.includes("["))) {
      return "customcode";
    }
    // 7. LiteSpeed .data settings (PHP serialize, classic keys, OR LSCWP 7.1.9+ JSON tuples)
    const hasTupleHelper = (typeof looksLikeLscwpJsonTuples === "function")
      ? looksLikeLscwpJsonTuples(trimmed)
      : (typeof window !== "undefined" && typeof window.looksLikeLscwpJsonTuples === "function" && window.looksLikeLscwpJsonTuples(trimmed));
    if (
      trimmed.startsWith("a:") ||
      trimmed.includes("litespeed-cache-conf") ||
      (trimmed.includes("optm_") && trimmed.includes("cache_")) ||
      (trimmed.includes("optm-") && trimmed.includes("media-")) ||
      hasTupleHelper ||
      (trimmed.includes('["_version"') || trimmed.includes("['_version'")) ||
      (trimmed.startsWith("[") && trimmed.includes('"_version"') && trimmed.includes("optm-")) ||
      (/\[\s*"cache-priv"/.test(trimmed) && /\[\s*"optm-/.test(trimmed))
    ) {
      return "settings";
    }

    // Secondary fallback: If filenameHint is available and text contains relevant partial match
    if (filenameHint) {
      if (filenameHint === "elementor" && (trimmed.includes("Elementor") || trimmed.includes("== Server Environment =="))) return "elementor";
      if (filenameHint === "woocommerce" && trimmed.includes("WooCommerce")) return "woocommerce";
      if (filenameHint === "wordfence" && (trimmed.includes("Wordfence") || trimmed.includes("wf"))) return "wordfence";
      if (filenameHint === "theme" && (trimmed.includes("theme") || trimmed.includes("astra") || trimmed.includes("blocksy"))) return "theme";
      if (filenameHint === "settings" && (trimmed.startsWith("a:") || trimmed.includes("cache") || trimmed.includes("optm"))) return "settings";
      if (filenameHint === "customcode" && (trimmed.includes("<?php") || trimmed.includes("function") || trimmed.includes("snippets"))) return "customcode";
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
      alert(`❌ Ogiltigt innehåll: Filen eller texten "${sourceName || "Urklipp"}" kunde inte valideras som en godkänd rapport eller konfiguration för WordPress, WooCommerce, Wordfence, Tema, Elementor, SCM eller LiteSpeed.`);
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
    } else if (targetSlot === "theme") {
      processThemeText(text, finalSourceName);
    } else if (targetSlot === "elementor") {
      processElementorText(text, finalSourceName);
    } else if (targetSlot === "customcode") {
      processCustomCodeTextData(text, finalSourceName);
    } else if (targetSlot === "settings") {
      // Layer 2: validate that content actually parses as LSCWP settings
      try {
        const parseFn = (typeof parseSettingsFile === "function") ? parseSettingsFile : (typeof window !== "undefined" ? window.parseSettingsFile : null);
        const validFn = (typeof isValidLscwpSettingsObject === "function") ? isValidLscwpSettingsObject : (typeof window !== "undefined" ? window.isValidLscwpSettingsObject : null);
        if (parseFn) {
          const parsedProbe = parseFn(text);
          if (validFn && !validFn(parsedProbe)) {
            alert(`❌ Ogiltig LiteSpeed-konfiguration: Innehållet identifierades som .data men saknar igenkännbara LSCWP-nycklar.`);
            return false;
          }
        }
      } catch (probeErr) {
        alert(`❌ Ogiltig LiteSpeed-konfiguration: Kunde inte tolka innehållet som LSCWP-inställningar (${probeErr.message}).`);
        return false;
      }
      processSettingsText(text, finalSourceName);
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
    const hasAnySource = !!(state.sysInfo || state.uploadedSettings || state.wooInfo || state.wfInfo || state.elemInfo || state.themeInfo || state.customCodeInfo);
    if (hasAnySource) {
      try {
        triggerAnalysis(true);
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

  // --- SEPARATE CUSTOM CSS INPUT SYSTEM (DEBOUNCED) ---
  let cssDebounceTimer = null;
  const appCssPastebox = document.getElementById("app-custom-css-pastebox");
  if (appCssPastebox) {
    appCssPastebox.addEventListener("input", (e) => {
      clearTimeout(cssDebounceTimer);
      const val = e.target.value;
      cssDebounceTimer = setTimeout(() => {
        syncCustomCss(val, "app-custom-css-pastebox");
      }, 150);
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
    const tempResults = analyzeSystem(state.sysInfo, state.wooInfo, state.wfInfo, state.elemInfo, state.uploadedSettings, state.customCodeInfo, state.customCss, state.themeInfo, buildAnalyzeLiveContext());
    
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


  /** v2.7.3: Build 9th-arg live context for analyzeSystem (URL + optional QUIC headers). */
  function buildAnalyzeLiveContext() {
    const siteUrl = state.detectedSiteUrl || extractSiteUrl(state.sysInfo, state.wooInfo) ||
      (state.uploadedSettings && (state.uploadedSettings.site_url || state.uploadedSettings.home_url)) ||
      (state.apiUrl || null);
    return {
      detectedSiteUrl: siteUrl || null,
      quicLiveHeaders: state.quicLiveHeaders
    };
  }

  /**
   * v2.7.3: Best-effort live header probe for QUIC.cloud x-qc-*.
   * Browser CORS often blocks header reads; sync-plugin path is preferred.
   * Sets state.quicLiveHeaders: object on success, null on hard failure after URL known.
   */
  async function probeQuicLiveHeaders(url) {
    if (!url || typeof url !== "string" || !url.startsWith("http")) return null;
    try {
      const res = await fetch(url, { method: "GET", mode: "cors", cache: "no-store", redirect: "follow" });
      const map = {};
      let sawAny = false;
      if (res && res.headers && typeof res.headers.forEach === "function") {
        res.headers.forEach(function (v, k) {
          map[String(k).toLowerCase()] = v;
          sawAny = true;
        });
      }
      // Even if CORS-safelist only, store what we got (may lack x-qc-*)
      state.quicLiveHeaders = sawAny ? map : null;
      return state.quicLiveHeaders;
    } catch (e) {
      // CORS / network — mark probed-but-unavailable so UI does not claim Optimal edge
      state.quicLiveHeaders = null;
      return null;
    }
  }

  async function maybeProbeQuicLiveEdge() {
    const us = state.uploadedSettings;
    if (!us) return;
    const quicOn = (us.cdn_quic === "1" || us.cdn_quic === 1 || us["cdn-quic"] === "1" || us["cdn-quic"] === 1);
    if (!quicOn) return;
    if (state.quicLiveHeaders !== undefined && state.quicLiveHeaders !== null && typeof state.quicLiveHeaders === "object") {
      // already have real headers (e.g. from API sync)
      const keys = Object.keys(state.quicLiveHeaders);
      if (keys.some(function (k) { return String(k).toLowerCase().indexOf("x-qc-") === 0; })) return;
    }
    const url = state.detectedSiteUrl || extractSiteUrl(state.sysInfo, state.wooInfo) || state.apiUrl ||
      (us.site_url || us.home_url) || null;
    if (!url) return;
    await probeQuicLiveHeaders(url);
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

  function updateSlotFileBadge(slotKey, fileName, isLoaded) {
    const defaultHints = {
      sysinfo: "system-report.json",
      woocommerce: "SystemStatusReport_*.txt",
      wordfence: "diagnostics_for_*.txt",
      theme: "astra-settings.json / options",
      elementor: "system-info-*.txt",
      customcode: "scm-export-*.json / *.php",
      settings: "LSCWP_*.data"
    };
    const hintEl = document.getElementById(`${slotKey}-hint`);
    const dropzone = document.getElementById(`${slotKey}-dropzone`);
    if (!hintEl) return;

    if (isLoaded && fileName) {
      const isPasted = fileName.startsWith("Inklistrad") || fileName.startsWith("Data (") || fileName.startsWith("pasted ");
      const icon = isPasted ? "📋" : "📁";
      
      const slotMap = { sysinfo: "sysInfo", woocommerce: "wooInfo", wordfence: "wfInfo", theme: "themeInfo", elementor: "elemInfo", customcode: "customCodeInfo", settings: "uploadedSettings" };
      const meta = state.uploadMetadata[slotMap[slotKey]];
      let compactDate = "";
      if (meta && meta.timestamp) {
        compactDate = meta.timestamp.replace(/\s*-\s*kl\.\s*/, "-").trim();
      } else {
        const now = new Date();
        const yy = String(now.getFullYear()).slice(-2);
        const mm = String(now.getMonth() + 1).padStart(2, '0');
        const dd = String(now.getDate()).padStart(2, '0');
        const hh = String(now.getHours()).padStart(2, '0');
        const min = String(now.getMinutes()).padStart(2, '0');
        compactDate = `${yy}${mm}${dd}-${hh}:${min}`;
      }

      let displayLabel = "";
      if (isPasted) {
        displayLabel = `pasted ${compactDate}`;
      } else {
        let cleanName = fileName.replace(/\.[^/.]+$/, "");
        if (cleanName.length > 20) {
          cleanName = cleanName.substring(0, 18) + '…';
        }
        displayLabel = `${cleanName} (${compactDate})`;
      }

      hintEl.innerHTML = `<span class="slot-file-badge" title="${escapeHtml(fileName)} (${compactDate})">${icon} ${escapeHtml(displayLabel)}</span>`;
      hintEl.classList.add("loaded-file");
      if (dropzone) dropzone.classList.add("has-file");
    } else {
      hintEl.textContent = defaultHints[slotKey] || "";
      hintEl.classList.remove("loaded-file");
      if (dropzone) dropzone.classList.remove("has-file");
    }
  }

  function updateAnalysisReadyState() {
    const hasAnySource = !!(state.sysInfo || state.uploadedSettings || state.wooInfo || state.wfInfo || state.elemInfo || state.themeInfo || state.customCodeInfo);
    if (!btnStartAnalysis) return;

    if (hasAnySource) {
      btnStartAnalysis.disabled = false;
      btnStartAnalysis.className = "btn-primary btn-pulse";
      btnStartAnalysis.style.background = "linear-gradient(135deg, var(--accent-cyan) 0%, var(--accent-indigo) 100%)";
      btnStartAnalysis.style.color = "var(--text-main)";
      btnStartAnalysis.style.cursor = "pointer";
      
      if (!state.analysisResults && analysisReadyText) {
        if (state.uploadedSettings && !state.sysInfo) {
          analysisReadyText.innerHTML = `<strong>LiteSpeed-datafil inläst!</strong> Klicka på knappen bredvid för att köra optimeringsanalysen.`;
        } else if (state.sysInfo) {
          analysisReadyText.innerHTML = `<strong>Systemrapport inläst!</strong> Klicka på knappen bredvid för att köra analysen.`;
        } else {
          analysisReadyText.innerHTML = `<strong>Datafil inläst!</strong> Klicka på knappen bredvid för att köra analysen.`;
        }
        analysisReadyText.style.color = "var(--accent-cyan)";
      }
    } else {
      btnStartAnalysis.disabled = true;
      btnStartAnalysis.className = "btn-primary";
      btnStartAnalysis.style.background = "rgba(255, 255, 255, 0.05)";
      btnStartAnalysis.style.color = "var(--text-muted)";
      btnStartAnalysis.style.boxShadow = "none";
      btnStartAnalysis.style.cursor = "not-allowed";
      if (analysisReadyText) {
        analysisReadyText.textContent = "Väntar på datafil...";
        analysisReadyText.style.color = "var(--text-muted)";
      }
    }
  }

  function processSysInfoText(text, sourceName) {
    try {
      state.sysInfo = parseSystemInfoText(text);
      state.uploadMetadata.sysInfo = { name: sourceName, timestamp: formatTimestamp(new Date()) };
      sysInfoStatus.textContent = "✓ Inläst";
      sysInfoStatus.title = sourceName;
      sysInfoStatus.className = "file-status loaded";
      updateSlotFileBadge("sysinfo", sourceName, true);
      
      if (sysInfoSummary) {
        const wpVer = state.sysInfo["wp-core"] ? (state.sysInfo["wp-core"].version || state.sysInfo["wp-core"].wp_version || "") : "";
        const pluginCount = state.sysInfo["wp-plugins-active"] ? Object.keys(state.sysInfo["wp-plugins-active"]).length : 0;
        sysInfoSummary.textContent = `✓ WP ${wpVer || "Inläst"} (${pluginCount} tillägg)`;
        sysInfoSummary.classList.add("active");
      }

      updateAnalysisReadyState();
      
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
      updateSlotFileBadge("woocommerce", sourceName, true);
      
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
      updateSlotFileBadge("wordfence", sourceName, true);
      
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
      if (state.elemInfo && typeof window.sanitizeElementorGoogleFonts === "function") {
        window.sanitizeElementorGoogleFonts(state.elemInfo);
      }
      state.uploadMetadata.elemInfo = { name: sourceName, timestamp: formatTimestamp(new Date()) };
      elementorStatus.textContent = "✓ Inläst";
      elementorStatus.title = sourceName;
      elementorStatus.className = "file-status loaded";
      updateSlotFileBadge("elementor", sourceName, true);
      
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
      updateSlotFileBadge("customcode", sourceName, true);
      
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
      updateSlotFileBadge("settings", sourceName, true);
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

      const detectedUrl = extractSiteUrl(state.sysInfo, state.wooInfo, text) || (state.uploadedSettings && (state.uploadedSettings.site_url || state.uploadedSettings.home_url));
      if (detectedUrl && !state.detectedSiteUrl) {
        updateDetectedSiteUrl(detectedUrl);
      }

      updateAnalysisReadyState();
      silentUpdateAnalysis();
    } catch (err) {
      alert(`Kunde inte läsa LiteSpeed-inställningsfil: ${err.message}`);
    }
  }

  function handleSettingsFile(file) {
    const reader = new FileReader();
    reader.onload = function(e) {
      routeAndProcessContent(e.target.result, "settings", file.name);
    };
    reader.readAsText(file);
  }

  function processThemeText(text, sourceName) {
    try {
      let parsedTheme = null;
      try {
        const json = JSON.parse(text);
        if (json) {
          parsedTheme = json;
        }
      } catch (jsonErr) {
        // Text format / options
        parsedTheme = { rawText: text };
      }

      state.themeInfo = parsedTheme;
      state.uploadMetadata.themeInfo = { name: sourceName, timestamp: formatTimestamp(new Date()) };
      themeStatus.textContent = "✓ Inläst";
      themeStatus.title = sourceName;
      themeStatus.className = "file-status loaded";
      updateSlotFileBadge("theme", sourceName, true);
      
      if (themeSummary) {
        themeSummary.textContent = `✓ Tema (${sourceName ? sourceName.replace(/\.[^/.]+$/, "") : "Inläst"})`;
        themeSummary.classList.add("active");
      }

      silentUpdateAnalysis();
    } catch (err) {
      alert(`Kunde inte läsa Temadata: ${err.message}`);
    }
  }

  function handleThemeFile(file) {
    const reader = new FileReader();
    reader.onload = function(e) {
      routeAndProcessContent(e.target.result, "theme", file.name);
    };
    reader.readAsText(file);
  }

  /**
   * Parses WordPress Core Site Health info dump
   */
  function parseSystemInfoText(text) {
    if (typeof text === "object" && text !== null) return text;
    const trimmed = (text || "").trim();

    // 1. Full JSON export support (from WordPress Site Health system-report.json)
    if (trimmed.startsWith("{")) {
      try {
        const json = JSON.parse(trimmed);
        if (json && typeof json === "object") {
          const data = {};
          for (const secKey of Object.keys(json)) {
            const rawSec = json[secKey];
            let targetKey = secKey.toLowerCase();
            if (targetKey === "core") targetKey = "wp-core";
            if (targetKey === "server") targetKey = "wp-server";
            if (targetKey === "plugins") targetKey = "wp-plugins-active";
            if (targetKey === "theme") targetKey = "wp-active-theme";
            if (targetKey === "constants") targetKey = "wp-constants";
            if (targetKey === "database") targetKey = "wp-database";

            data[targetKey] = {};
            const fieldsObj = (rawSec && rawSec.fields && typeof rawSec.fields === "object") ? rawSec.fields : rawSec;
            if (fieldsObj && typeof fieldsObj === "object") {
              for (const [fKey, fVal] of Object.entries(fieldsObj)) {
                if (fVal && typeof fVal === "object" && fVal.value !== undefined) {
                  data[targetKey][fKey] = fVal.value;
                } else {
                  data[targetKey][fKey] = fVal;
                }
              }
            }
          }
          return data;
        }
      } catch (e) {}
    }

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
            let version = "Okänd", latestVersion = null, author = "Okänd";
            
            const verMatch = rest.match(/version:\s*([^,()]+)/i);
            const latestMatch = rest.match(/\(latest version:\s*([^)]+)\)/i);
            const autMatch = rest.match(/author:\s*(.+)$/i);
            
            if (verMatch) version = verMatch[1].trim();
            if (latestMatch) latestVersion = latestMatch[1].trim();
            if (autMatch) author = autMatch[1].trim();
            
            data[currentSection][name] = { version, latestVersion, author };
          }
        } else if (currentSection === "wp-active-theme") {
          const colonIndex = line.indexOf(":");
          if (colonIndex !== -1) {
            const key = line.substring(0, colonIndex).trim().toLowerCase();
            const val = line.substring(colonIndex + 1).trim();
            if (key === "version") {
              const verMatch = val.match(/^([^,()]+)/);
              const latestMatch = val.match(/\(latest version:\s*([^)]+)\)/i);
              data[currentSection].version = verMatch ? verMatch[1].trim() : val;
              if (latestMatch) data[currentSection].latestVersion = latestMatch[1].trim();
            } else {
              data[currentSection][key] = val;
            }
          }
        } else if (currentSection === "wp-constants") {
          const colonIndex = line.indexOf(":");
          if (colonIndex !== -1) {
            const rawKey = line.substring(0, colonIndex).trim();
            let val = line.substring(colonIndex + 1).trim();
            const valLower = val.toLowerCase();
            if (valLower.includes("definierad (true)") || valLower.includes("definierad (sant)") || valLower === "aktiverad" || valLower === "aktiv" || valLower === "ja" || valLower === "definierad") {
              val = "true";
            } else if (valLower === "inaktiverad" || valLower === "inaktiv" || valLower === "nej" || valLower.includes("definierad (false)") || valLower.includes("ej definierad")) {
              val = "false";
            }
            data[currentSection][rawKey] = val;
            data[currentSection][rawKey.toUpperCase()] = val;
            data[currentSection][rawKey.toLowerCase()] = val;
          }
        } else if (currentSection === "code-snippets") {
          const colonIndex = line.indexOf(":");
          if (colonIndex !== -1) {
            data[currentSection][line.substring(0, colonIndex).trim()] = line.substring(colonIndex + 1).trim();
          }
        } else {
          const colonIndex = line.indexOf(":");
          if (colonIndex !== -1) {
            const k = line.substring(0, colonIndex).trim();
            const val = line.substring(colonIndex + 1).trim();
            data[currentSection][k] = val;
            data[currentSection][k.toLowerCase()] = val;
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
    if (!text) return null;
    const data = { 
      gateways: [], 
      overrides: [], 
      hpos_enabled: false, 
      cart_fragments_dequeued: false, 
      transients_cleanup_enabled: false,
      version: null
    };
    
    const verMatch = text.match(/WC Version:\s*([0-9.]+)/i) || text.match(/WooCommerce Version:\s*([0-9.]+)/i);
    if (verMatch) data.version = verMatch[1];

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
      
      if (currentSection.includes("payment") || currentSection.includes("gateways") || currentSection.includes("betalsätt") || currentSection.includes("betalning")) {
        const parts = line.split(":");
        if (parts.length >= 2) {
          const name = parts[0].trim();
          const status = parts[1].trim().toLowerCase();
          if (status.includes("enabled") || status.includes("aktiverad") || status.includes("aktiverat") || status.includes("true") || status.includes("ja") || status.includes("✔") || status.includes("1")) {
            data.gateways.push(name);
          }
        }
      }
      
      if (currentSection.includes("templates") || currentSection.includes("mallar") || lower.includes("override") || lower.includes(".php")) {
        if (line.includes("/") && (line.includes(".php") || line.includes("override"))) {
          data.overrides.push(line);
        }
      }

      // Explicit Line-by-line check for HPOS
      if (lower.includes("order datastore") || lower.includes("hpos") || lower.includes("high-performance order storage") || lower.includes("cot enabled") || lower.includes("lagring av orderdata") || lower.includes("orders table") || lower.includes("ordertabeller") || lower.includes("databasdatakälla")) {
        if (lower.includes("orderstabledatastore") ||
            lower.includes("enabled: ✔") ||
            lower.includes("enabled: yes") ||
            lower.includes("enabled: true") ||
            lower.includes("enabled: 1") ||
            lower.includes("aktiv: ja") ||
            lower.includes("aktivt: ja") ||
            lower.includes("aktiv: true") ||
            lower.includes("orders table (hpos)") ||
            lower.includes("ordertabeller (hpos)") ||
            lower.includes("hpos: ✔") ||
            lower.includes("hpos: enabled") ||
            lower.includes("hpos: aktiv") ||
            lower.includes("hpos enabled: yes") ||
            lower.includes("hpos enabled: ✔") ||
            lower.includes("hpos enabled: true") ||
            lower.includes("hpos enabled: 1") ||
            lower.includes(": enabled") ||
            lower.includes(": aktiverat") ||
            lower.includes(": aktiv")) {
          data.hpos_enabled = true;
        }
      }
    });
    
    // Fallback / Extra searches for WooCommerce settings across entire text
    const lowerText = text.toLowerCase();
    if (!data.hpos_enabled) {
      if (lowerText.includes("orderstabledatastore") ||
          lowerText.includes("high-performance order storage: enabled") || 
          lowerText.includes("high-performance order storage (cot): enabled") || 
          lowerText.includes("high-performance order storage: aktiverat") || 
          lowerText.includes("high-performance order storage: aktiv") || 
          lowerText.includes("cot enabled: yes") ||
          lowerText.includes("hpos: ✔") ||
          lowerText.includes("hpos: enabled") ||
          lowerText.includes("hpos: aktiv") ||
          lowerText.includes("hpos enabled: yes") ||
          lowerText.includes("hpos enabled: ✔") ||
          lowerText.includes("hpos enabled: true") ||
          lowerText.includes("orders table (hpos)") ||
          lowerText.includes("ordertabeller (hpos)")) {
        data.hpos_enabled = true;
      }
    }
    
    if (lowerText.includes("disable-cart-fragments") || 
        lowerText.includes("dequeue wc-cart-fragments") || 
        lowerText.includes("wc_cart_fragments_dequeue") ||
        lowerText.includes("cart_fragments: false") ||
        lowerText.includes("cart fragments: inaktiv")) {
      data.cart_fragments_dequeued = true;
    }
    
    if (lowerText.includes("transient_cleanup") || 
        lowerText.includes("cleanup_expired_transients") || 
        lowerText.includes("woocommerce_cleanup_personal_data") ||
        lowerText.includes("transients: rensas")) {
      data.transients_cleanup_enabled = true;
    }
    
    if (data.gateways.length === 0) {
      if (lowerText.includes("stripe")) data.gateways.push("Stripe");
      if (lowerText.includes("klarna") || lowerText.includes("kco")) data.gateways.push("Klarna");
      if (lowerText.includes("swish")) data.gateways.push("Swish");
      if (lowerText.includes("svea")) data.gateways.push("Svea");
      if (lowerText.includes("paypal")) data.gateways.push("PayPal");
      if (lowerText.includes("qliro")) data.gateways.push("Qliro");
      if (lowerText.includes("avarda")) data.gateways.push("Avarda");
      if (lowerText.includes("nets")) data.gateways.push("Nets");
      if (lowerText.includes("resurs")) data.gateways.push("Resurs");
      if (lowerText.includes("walley")) data.gateways.push("Walley");
      if (lowerText.includes("shipmondo")) data.gateways.push("Shipmondo");
    }
    
    return data;
  }

  /**
   * Parses Wordfence diagnostic report text
   */
  function parseWordfenceDiagnostic(text) {
    if (!text) return null;
    const cleanText = text.replace(/[\u200B-\u200D\uFEFF]/g, "");
    const data = { 
      firewall_mode: "Okänd", 
      ip_header: "Okänd", 
      live_traffic_disabled: false, 
      disable_live_traffic: false,
      low_resource_scan: false, 
      low_resource: false,
      crawler_whitelisted: false 
    };

    // Try parsing as JSON first (Wordfence settings export)
    try {
      if (cleanText.trim().startsWith("{") || cleanText.trim().startsWith("[")) {
        const json = JSON.parse(cleanText);
        const obj = Array.isArray(json) ? (json[0] || {}) : json;
        if (obj.howGetIPs) data.ip_header = obj.howGetIPs;
        if (obj.ip_header) data.ip_header = obj.ip_header;
        if (obj.firewall_mode) data.firewall_mode = obj.firewall_mode;
        if (obj.liveTrafficEnabled === 0 || obj.liveTrafficEnabled === "0" || obj.liveTrafficEnabled === false || obj.live_traffic_disabled === true || obj.liveTraffic_display === "security" || obj.liveTraffic_display === "SECURITY" || obj.liveTraffic_display === "securityOnly") {
          data.live_traffic_disabled = true;
          data.disable_live_traffic = true;
        }
        if (obj.lowResourceScanSelection === 1 || obj.lowResourceScanSelection === "1" || obj.lowResourceScanSelection === true || obj.low_resource_scan === true) {
          data.low_resource_scan = true;
          data.low_resource = true;
        }
        if (obj.crawler_whitelisted === true || obj.whitelist_crawler === true) {
          data.crawler_whitelisted = true;
        }
      }
    } catch (e) {}

    const lines = cleanText.split(/\r?\n/);
    
    lines.forEach(line => {
      const lower = line.toLowerCase().trim();
      if (!lower) return;

      if (lower.includes("firewall mode") || lower.includes("brandväggsläge") || lower.includes("firewall status") || lower.includes("firewall:")) {
        const parts = line.split(/[:\t]+/);
        if (parts.length >= 2) data.firewall_mode = parts.slice(1).join(" ").trim();
      }
      if (lower.includes("how wordfence gets ips") || lower.includes("howgetips") || lower.includes("ip-detektering") || lower.includes("remote_addr") || lower.includes("connecting-ip") || lower.includes("ip detection")) {
        const parts = line.split(/[:\t]+/);
        if (parts.length >= 2) {
          let hVal = parts.slice(1).join(" ").trim();
          hVal = hVal.replace(/\s*\([^)]*\)/g, "").trim(); // Strip extra (Standard) or (Cloudflare)
          if (hVal.toUpperCase().includes("REMOTE_ADDR")) data.ip_header = "REMOTE_ADDR";
          else if (hVal.toUpperCase().includes("CF_CONNECTING_IP") || hVal.toUpperCase().includes("CF-CONNECTING-IP")) data.ip_header = "CF-Connecting-IP";
          else if (hVal.toUpperCase().includes("X_FORWARDED_FOR") || hVal.toUpperCase().includes("X-FORWARDED-FOR")) data.ip_header = "HTTP_X_FORWARDED_FOR";
          else if (hVal.toUpperCase().includes("X_REAL_IP") || hVal.toUpperCase().includes("X-REAL-IP")) data.ip_header = "HTTP_X_REAL_IP";
          else data.ip_header = hVal;
        } else if (lower.includes("remote_addr")) {
          data.ip_header = "REMOTE_ADDR";
        } else if (lower.includes("cf-connecting-ip") || lower.includes("cf_connecting_ip")) {
          data.ip_header = "CF-Connecting-IP";
        }
      }

      // Line-based Live Traffic detection (tolerant to colons, tabs, multiple spaces)
      if (lower.includes("traffic logging mode") || lower.includes("live traffic") || lower.includes("livetraffic") || lower.includes("realtidstrafik")) {
        if (lower.includes("security only") || lower.includes("security") || lower.includes("disabled") || lower.includes("off") || lower.includes("0") || lower.includes("false") || lower.includes("av") || lower.includes("inaktiv")) {
          data.live_traffic_disabled = true;
          data.disable_live_traffic = true;
        }
      }
    });

    const normalizedFullText = cleanText.replace(/\s+/g, " ").toLowerCase();
    if (normalizedFullText.includes("security only") ||
        normalizedFullText.includes("securityonly") ||
        normalizedFullText.includes("security_only") ||
        normalizedFullText.includes("säkerhetsrelaterat") ||
        normalizedFullText.includes("realtidstrafik: inaktiverad") ||
        normalizedFullText.includes("realtidstrafik: av") ||
        normalizedFullText.includes("realtidstrafik: endast säkerhet") ||
        normalizedFullText.includes("traffic logging mode security only") ||
        normalizedFullText.includes("traffic logging mode: security only") ||
        normalizedFullText.includes("live traffic security only") ||
        normalizedFullText.includes("live traffic: security only") ||
        normalizedFullText.includes("live traffic logging: security only") ||
        normalizedFullText.includes("live traffic logging security only") ||
        normalizedFullText.includes("live traffic logging: disabled") || 
        normalizedFullText.includes("live traffic status: off") || 
        normalizedFullText.includes("live_traffic_enabled: false") ||
        normalizedFullText.includes("livetrafficenabled: false") ||
        normalizedFullText.includes("livetrafficenabled: 0") ||
        normalizedFullText.includes("livetrafficenabled 0") ||
        normalizedFullText.includes("livetraffic_display security") ||
        normalizedFullText.includes("livetrafficmode: securityonly") ||
        normalizedFullText.includes("livetrafficmode securityonly") ||
        normalizedFullText.includes("livetrafficmode: disabled") ||
        normalizedFullText.includes("live traffic: off")) {
      data.live_traffic_disabled = true;
      data.disable_live_traffic = true;
    }
    
    if (normalizedFullText.includes("low resource scan: enabled") || 
        normalizedFullText.includes("low resource scan enabled") || 
        normalizedFullText.includes("low resource: yes") ||
        normalizedFullText.includes("low resource yes") ||
        normalizedFullText.includes("low_resource_scan: true") ||
        normalizedFullText.includes("lowresourcescanselection: 1") ||
        normalizedFullText.includes("lowresourcescanselection 1") ||
        normalizedFullText.includes("lowresourcescanselection: true") ||
        normalizedFullText.includes("resurssnål skanning: aktiverad") ||
        normalizedFullText.includes("resurssnål skanning aktiverad")) {
      data.low_resource_scan = true;
      data.low_resource = true;
    }
    
    if (normalizedFullText.includes("crawler whitelist: active") || 
        normalizedFullText.includes("crawler whitelist active") || 
        normalizedFullText.includes("whitelist litespeed crawler") ||
        normalizedFullText.includes("crawler_whitelisted: true") ||
        normalizedFullText.includes("litespeed crawler: whitelisted") ||
        normalizedFullText.includes("litespeed crawler whitelisted")) {
      data.crawler_whitelisted = true;
    }
    
    return data;
  }

  /**
   * Parses Elementor status text dump
   */
  function parseElementorStatus(text) {
    if (typeof text === "object" && text !== null) return text;
    const data = {
      version: "",
      experiments: [],
      hasLazyLoad: false,
      css_print_method: "external",
      dom_optimization: null,
      asset_loading: null,
      css_loading: null,
      lazy_load: false,
      font_icon_svg: false,
      google_fonts: false, // v2.7.2: only true on explicit Active signal — never invent from missing lines
      container: false
    };
    const lines = text.split(/\r?\n/);
    let currentSection = "";
    let lastPluginHeader = "";
    
    lines.forEach(line => {
      const rawLine = line.trim();
      if (!rawLine) return;

      // Section detection
      const secMatch = rawLine.match(/^==\s*(.*?)\s*==$/);
      if (secMatch) {
        currentSection = secMatch[1].toLowerCase();
        lastPluginHeader = "";
        return;
      }

      // Track active plugin subheaders (e.g. in == Active Plugins ==)
      if (currentSection.includes("plugin") || currentSection.includes("tillägg")) {
        if (!rawLine.includes(":") && (rawLine.toLowerCase().includes("elementor") || rawLine.length > 2)) {
          lastPluginHeader = rawLine.toLowerCase();
        }
      }

      if (rawLine.includes(":")) {
        const parts = rawLine.split(":");
        const name = parts[0].trim();
        const status = parts.slice(1).join(":").trim();
        const statusLower = status.toLowerCase();
        const nameLower = name.toLowerCase();

        const isExplicitlyActive = (
          statusLower.includes("active") || 
          statusLower.includes("aktiv") || 
          statusLower === "1" || 
          statusLower === "true" || 
          statusLower.includes("enabled") || 
          statusLower === "default" ||
          statusLower === "standard" ||
          statusLower.includes("standard (aktiv)") ||
          statusLower.includes("aktiv som standard") ||
          statusLower.includes("active by default") ||
          statusLower.includes("default (active)")
        ) && 
        !statusLower.includes("inactive") && 
        !statusLower.includes("inaktiv") && 
        !statusLower.includes("inaktivera") && 
        !statusLower.includes("inaktiverad") && 
        !statusLower.includes("disabled") &&
        !statusLower.includes("disable") &&
        !statusLower.includes("off") &&
        !statusLower.includes("avstängd") &&
        !statusLower.includes("default (inactive)") &&
        !statusLower.includes("standard (inaktiv)") &&
        !statusLower.includes("inaktiv som standard");

        // 1. Check Elementor Version (only in elementor sections, active plugins, or explicit key)
        if (!data.version) {
          if (
            (currentSection.includes("elementor") && !currentSection.includes("environment") && (nameLower === "version" || nameLower === "elementor version" || nameLower === "elementor pro version")) ||
            ((currentSection.includes("plugin") || currentSection.includes("tillägg")) && lastPluginHeader.includes("elementor") && nameLower === "version") ||
            ((currentSection.includes("plugin") || currentSection.includes("tillägg")) && (nameLower === "elementor" || nameLower === "elementor pro")) ||
            nameLower === "elementor version" ||
            nameLower === "elementor pro version"
          ) {
            const vMatch = status.match(/\b\d+(?:\.\d+)+\b/) || status.match(/\b\d+\b/);
            if (vMatch) data.version = vMatch[0];
          }
        }

        // 2. Check CSS Print Method
        if (
          nameLower.includes("css write") ||
          nameLower.includes("css print") ||
          nameLower.includes("css-skriv") ||
          nameLower.includes("css skriv") ||
          nameLower.includes("css-utskrift") ||
          nameLower.includes("css utskrift") ||
          nameLower.includes("css method") ||
          nameLower.includes("css-metod")
        ) {
          if (statusLower.includes("internal") || statusLower.includes("inline") || statusLower.includes("inbäddad") || statusLower.includes("intern")) {
            data.css_print_method = "internal";
          } else {
            data.css_print_method = "external";
          }
        }

        // 3. Check Optimized DOM Output specifically (English & Swedish: "Optimerad märkkod", "Optimized DOM Output", "e_dom_optimization")
        if (
          nameLower.includes("dom") || 
          nameLower.includes("märkkod") || 
          nameLower.includes("markup") ||
          nameLower.includes("e_dom_optimization")
        ) {
          data.dom_optimization = isExplicitlyActive;
          if (isExplicitlyActive && !data.experiments.includes("e_dom_optimization")) {
            data.experiments.push("e_dom_optimization");
          }
        }

        // 4. Check Asset loading specifically (English & Swedish: "tillgångsladdning", "resursladdning", "improved asset loading")
        // Defaults stay null; only set true when Active, false when Inactive (v2.6.10.1)
        if (
          nameLower.includes("asset") || 
          nameLower.includes("resurs") || 
          nameLower.includes("tillgång") ||
          nameLower.includes("e_optimized_assets_loading")
        ) {
          const isExplicitlyInactiveAsset = (
            statusLower.includes("inactive") ||
            statusLower.includes("inaktiv") ||
            statusLower.includes("disabled") ||
            statusLower.includes("disable") ||
            statusLower === "0" ||
            statusLower === "false" ||
            statusLower === "off" ||
            statusLower.includes("avstängd")
          );
          if (isExplicitlyActive) {
            data.asset_loading = true;
            if (!data.experiments.includes("e_optimized_assets_loading")) {
              data.experiments.push("e_optimized_assets_loading");
            }
          } else if (isExplicitlyInactiveAsset) {
            data.asset_loading = false;
          }
        }

        // 5. Check CSS loading specifically (English & Swedish: "css-inläsning", "css-laddning", "improved css loading")
        // Defaults stay null; only set true when Active, false when Inactive (v2.6.10.1)
        if (
          nameLower.includes("css loading") || 
          nameLower.includes("css-laddning") || 
          nameLower.includes("css laddning") || 
          nameLower.includes("css-inläsning") || 
          nameLower.includes("css inläsning") || 
          nameLower.includes("e_optimized_css_loading")
        ) {
          const isExplicitlyInactiveCss = (
            statusLower.includes("inactive") ||
            statusLower.includes("inaktiv") ||
            statusLower.includes("disabled") ||
            statusLower.includes("disable") ||
            statusLower === "0" ||
            statusLower === "false" ||
            statusLower === "off" ||
            statusLower.includes("avstängd")
          );
          if (isExplicitlyActive) {
            data.css_loading = true;
            if (!data.experiments.includes("e_optimized_css_loading")) {
              data.experiments.push("e_optimized_css_loading");
            }
          } else if (isExplicitlyInactiveCss) {
            data.css_loading = false;
          }
        }

        // 6. Check Lazy load (English & Swedish)
        if (
          nameLower.includes("lazy load") || 
          nameLower.includes("lazyload") || 
          nameLower.includes("e_lazy_load_images")
        ) {
          data.lazy_load = isExplicitlyActive;
          data.hasLazyLoad = isExplicitlyActive;
          if (isExplicitlyActive && !data.experiments.includes("e_lazy_load_images")) {
            data.experiments.push("e_lazy_load_images");
          }
        }

        // 7. Check Font icons (English & Swedish)
        if (nameLower.includes("font icon") || nameLower.includes("inline font") || nameLower.includes("ikoner") || nameLower.includes("e_font_icon_svg")) {
          data.font_icon_svg = isExplicitlyActive;
          if (isExplicitlyActive && !data.experiments.includes("e_font_icon_svg")) {
            data.experiments.push("e_font_icon_svg");
          }
        }

        // 8. Check Container (English & Swedish: "Behållare")
        if (nameLower.includes("container") || nameLower.includes("behållare") || nameLower.includes("flexbox") || nameLower.includes("e_nested_elements")) {
          data.container = isExplicitlyActive;
          if (isExplicitlyActive && !data.experiments.includes("container")) {
            data.experiments.push("container");
          }
        }

        // 9. Check Breakpoints (English & Swedish)
        if (nameLower.includes("brytpunkter") || nameLower.includes("breakpoint") || nameLower.includes("custom_breakpoints")) {
          if (isExplicitlyActive && !data.experiments.includes("custom_breakpoints")) {
            data.experiments.push("custom_breakpoints");
          }
        }

        // 10. Check Google Fonts (English & Swedish)
        // v2.7.3: Custom Fonts / Custom Icons are NOT Google Fonts (count ≠ Active GF)
        if (
          !nameLower.includes("custom font") &&
          !nameLower.includes("custom icon") &&
          (
            nameLower.includes("google font") ||
            nameLower.includes("google-typsnitt") ||
            nameLower.includes("google_font") ||
            nameLower.includes("e_google_fonts")
          )
        ) {
          data.google_fonts = isExplicitlyActive && !statusLower.includes("inaktivera") && !statusLower.includes("inaktiv") && !statusLower.includes("disable") && !statusLower.includes("disabled");
          if (data.google_fonts && !data.experiments.includes("google_fonts")) {
            data.experiments.push("google_fonts");
          }
        }

        if (isExplicitlyActive && !data.experiments.includes(name)) {
          data.experiments.push(name);
        }
      }
    });

    // Fallback checks on entire text if formatted without clean colons
    if (!data.version) {
      const vMatch = text.match(/(?:==\s*Elementor(?:\s*Pro)?\s*==|Elementor(?:\s*Pro)?\s*[\r\n]+\s*Version:)\s*(\d+(?:\.\d+)+)/i) || 
                     text.match(/Elementor(?:\s*Pro)?[\s\S]*?Version:\s*(\d+(?:\.\d+)+)/i) ||
                     text.match(/Elementor\s+Version:\s*(\d+(?:\.\d+)+)/i) || 
                     text.match(/Elementor\s*-\s*Version:\s*(\d+(?:\.\d+)+)/i) ||
                     text.match(/Elementor:\s*(?:by[^\n–—]+[–—]\s*)?(\d+(?:\.\d+)+)/i);
      if (vMatch && vMatch[1]) {
        data.version = vMatch[1];
      }
    }

    const lowerText = text.toLowerCase();
    if (!data.dom_optimization) {
      if (
        (lowerText.includes("optimized dom output: active") || 
         lowerText.includes("optimerad dom-utmatning: aktiv") || 
         lowerText.includes("optimerad märkkod: aktiv") ||
         lowerText.includes("optimerad märkkod: aktiv som standard") ||
         lowerText.includes("e_dom_optimization: active") ||
         lowerText.includes("optimized dom output: default (active)") ||
         lowerText.includes("optimerad dom-utmatning: standard (aktiv)")) &&
        !lowerText.includes("optimized dom output: inactive") &&
        !lowerText.includes("optimerad dom-utmatning: inaktiv") &&
        !lowerText.includes("optimerad märkkod: inaktiv")
      ) {
        data.dom_optimization = true;
        if (!data.experiments.includes("e_dom_optimization")) data.experiments.push("e_dom_optimization");
      }
    }

    if (
      lowerText.includes("google fonts: inaktivera") || 
      lowerText.includes("google fonts: inaktiv") || 
      lowerText.includes("google fonts: disable") || 
      lowerText.includes("google fonts: disabled") || 
      lowerText.includes("google fonts: inactive") ||
      lowerText.includes("google-typsnitt: inaktivera") ||
      lowerText.includes("google-typsnitt: inaktiv") ||
      lowerText.includes("google fonts: avstängd") ||
      lowerText.includes("google_font-disabled") ||
      lowerText.includes("google_font_disabled") ||
      lowerText.includes("settings: css_print_method-external, google_font-disabled")
    ) {
      data.google_fonts = false;
    }

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

    if (lower.includes("add_action") && (lower.includes("wp_head") || lower.includes("wp_footer")) && (lower.includes("<script") || lower.includes("<style") || lower.includes("echo '<style") || lower.includes('echo "<style') || lower.includes("echo '<script") || lower.includes('echo "<script'))) {
      data.hasRawScriptHooks = true;
    }

    if (lower.includes("header(") && (lower.includes("cache-control") || lower.includes("pragma") || lower.includes("expires"))) {
      data.hasManualCacheHeaders = true;
    }
    
    if (lower.includes("xmlrpc_enabled") && (lower.includes("return false") || lower.includes("__return_false"))) {
      data.hasXmlRpcDisabled = true;
    }
    
    if (lower.includes("disable_emojis") || lower.includes("print_emoji_detection_script") || lower.includes("print_emoji_styles")) {
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
  if (typeof window !== "undefined") window.parseCustomCodeText = parseCustomCodeText;

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
      { key: "sysInfo", label: "WP-system", icon: "📝" },
      { key: "wooInfo", label: "WooCommerce", icon: "🛒" },
      { key: "wfInfo", label: "Wordfence", icon: "🔒" },
      { key: "themeInfo", label: "Tema", icon: "🎭" },
      { key: "elemInfo", label: "Elementor", icon: "🎨" },
      { key: "customCodeInfo", label: "SCM", icon: "🔌" },
      { key: "uploadedSettings", label: "LiteSpeed", icon: "⚡" }
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
      } else if (state.uploadMetadata.sysInfo && state.uploadMetadata.sysInfo.name) {
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

  function clearSlot(slotKey) {
    if (slotKey === "sysinfo") {
      state.sysInfo = null;
      state.uploadMetadata.sysInfo = { name: "", timestamp: "" };
    } else if (slotKey === "woocommerce") {
      state.wooInfo = null;
      state.uploadMetadata.wooInfo = { name: "", timestamp: "" };
    } else if (slotKey === "wordfence") {
      state.wfInfo = null;
      state.uploadMetadata.wfInfo = { name: "", timestamp: "" };
    } else if (slotKey === "theme") {
      state.themeInfo = null;
      state.uploadMetadata.themeInfo = { name: "", timestamp: "" };
    } else if (slotKey === "elementor") {
      state.elemInfo = null;
      state.uploadMetadata.elemInfo = { name: "", timestamp: "" };
    } else if (slotKey === "customcode") {
      state.scmInfo = null;
      state.customCodeInfo = null;
      state.uploadMetadata.customCodeInfo = { name: "", timestamp: "" };
    } else if (slotKey === "settings") {
      state.uploadedSettings = null;
      state.editedSettings = {};
      state.uploadMetadata.uploadedSettings = { name: "", timestamp: "" };
    }

    const input = document.getElementById(`${slotKey}-input`);
    if (input) input.value = "";
    const dropzone = document.getElementById(`${slotKey}-dropzone`);
    if (dropzone) dropzone.classList.remove("has-file");
    const summary = document.getElementById(`${slotKey}-summary`);
    if (summary) {
      summary.innerHTML = "";
      summary.classList.remove("active");
    }
    const status = document.getElementById(`${slotKey}-status`);
    if (status) {
      status.textContent = slotKey === "sysinfo" ? "Krävs *" : "Valfri";
      status.className = "file-status";
    }
    updateSlotFileBadge(slotKey, null, false);
    updateActiveSiteStatusBar();
    updateAnalysisReadyState();
    silentUpdateAnalysis();
  }

  function silentUpdateAnalysis() {
    updateAnalysisReadyState();
    // Generate temporary rules engine results to render the 3 bullets inside the uploader slots immediately!
    const tempResults = analyzeSystem(state.sysInfo, state.wooInfo, state.wfInfo, state.elemInfo, state.uploadedSettings, state.customCodeInfo, state.customCss, state.themeInfo, buildAnalyzeLiveContext());
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
    const hasAnySource = !!(state.sysInfo || state.uploadedSettings || state.wooInfo || state.wfInfo || state.elemInfo || state.themeInfo || state.customCodeInfo);
    if (!hasAnySource) return;

    try {
      state.analysisResults = analyzeSystem(state.sysInfo, state.wooInfo, state.wfInfo, state.elemInfo, state.uploadedSettings, state.customCodeInfo, state.customCss, state.themeInfo, buildAnalyzeLiveContext());
      // v2.7.3: async live-edge probe (CORS may fail; sync-plugin headers preferred)
      maybeProbeQuicLiveEdge().then(function () {
        if (!state.analysisResults) return;
        state.analysisResults = analyzeSystem(state.sysInfo, state.wooInfo, state.wfInfo, state.elemInfo, state.uploadedSettings, state.customCodeInfo, state.customCss, state.themeInfo, buildAnalyzeLiveContext());
        try { renderAlerts(); } catch (e1) {}
        try { renderSettingsPanel(); } catch (e2) {}
        try { updateActiveSiteStatusBar(); } catch (e3) {}
      }).catch(function () {});
      
      const compFn = (typeof getOptionComparison === "function") 
        ? getOptionComparison 
        : ((typeof window !== "undefined" && window.getOptionComparison) ? window.getOptionComparison : null);

      state.analysisResults.recommendations.forEach(tab => {
        tab.options.forEach(opt => {
          if (state.editedSettings[opt.id] === undefined) {
            const comp = compFn ? compFn(opt, state.uploadedSettings, state.analysisResults.environment) : null;
            // v2.6.9 P0: Only seed from REAL measurements. Never invent Optimal via recommendedRaw.
            const upVal = (comp && comp.isMeasured && comp.rawMeasured !== null && comp.rawMeasured !== undefined)
              ? comp.rawMeasured
              : undefined;

            if (upVal !== undefined && upVal !== null && upVal !== "") {
              if (opt.id === "js_exclude" || opt.id === "css_exclude" || opt.id === "media_lazy_exc" || opt.id === "drop_uri" || opt.id === "js_delayed_exclude") {
                state.editedSettings[opt.id] = upVal;
              } else if (upVal === 2 || upVal === "2") {
                state.editedSettings[opt.id] = 2;
              } else if (typeof opt.recommendedRaw === "string" && opt.recommendedRaw !== "1" && opt.recommendedRaw !== "0") {
                state.editedSettings[opt.id] = upVal;
              } else if (typeof upVal === "string" && upVal !== "1" && upVal !== "0" && upVal !== "on" && upVal !== "off") {
                state.editedSettings[opt.id] = upVal;
              } else {
                state.editedSettings[opt.id] = (upVal === "1" || upVal === 1 || upVal === "on" || upVal === true) ? 1 : 0;
              }
            }
            // else: leave unset/unknown — UI shows measured | unknown | recommended | status
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

    let elemVersion = (typeof BENCHMARK_VERSIONS !== "undefined" && BENCHMARK_VERSIONS.elementor && BENCHMARK_VERSIONS.elementor.benchmarkVersion) ? BENCHMARK_VERSIONS.elementor.benchmarkVersion : "4.2.0"; // dynamic ~4.2.x baseline
    if (state.sysInfo && state.sysInfo["wp-plugins-active"]) {
      const keys = Object.keys(state.sysInfo["wp-plugins-active"]);
      const matchKey = keys.find(k => k.toLowerCase() === "elementor");
      if (matchKey) {
        elemVersion = state.sysInfo["wp-plugins-active"][matchKey].version;
      }
    }

    let lscwpVersion = "7.8.1"; // default/fallback
    if (state.uploadedSettings && (state.uploadedSettings.version || state.uploadedSettings.the_version || state.uploadedSettings.lscwp_cur_version)) {
      lscwpVersion = state.uploadedSettings.version || state.uploadedSettings.the_version || state.uploadedSettings.lscwp_cur_version;
    } else if (state.sysInfo && state.sysInfo["wp-plugins-active"]) {
      const keys = Object.keys(state.sysInfo["wp-plugins-active"]);
      const matchKey = keys.find(k => k.toLowerCase() === "litespeed-cache" || k.toLowerCase() === "litespeed cache");
      if (matchKey) {
        lscwpVersion = state.sysInfo["wp-plugins-active"][matchKey].version;
      }
    }

    const files = [
      {
        name: "1. WP-system",
        status: state.sysInfo ? "Inläst ✓" : "Ej inläst (Standardprofil)",
        loaded: !!state.sysInfo,
        color: state.sysInfo ? "var(--color-success)" : "var(--text-muted)",
        details: state.sysInfo 
          ? `<strong>WordPress version:</strong> ${escapeHtml(env.wpVersion)}<br><strong>Webbserver:</strong> ${escapeHtml(env.server)}<br><strong>PHP-version:</strong> ${escapeHtml(env.phpVersion)}<br><strong>Aktivt tema:</strong> ${escapeHtml(env.theme)}`
          : "Valfri. Standardreferensmiljö tillämpas om filen inte laddas upp."
      },
      {
        name: "2. WooCommerce",
        status: state.wooInfo ? "Inläst ✓" : "Ej inläst (Valfri)",
        loaded: !!state.wooInfo,
        color: state.wooInfo ? "var(--color-success)" : "var(--text-muted)",
        details: state.wooInfo 
          ? `<strong>Antal betalsätt:</strong> ${env.wooGateways.length} st (${escapeHtml(env.wooGateways.join(", "))})<br><strong>Mallöverskrivningar:</strong> ${env.wooOverrides.length} st`
          : (env.hasWooCommerce ? "<strong>WooCommerce är aktivt!</strong> Ladda upp för att analysera betalsätt och kassa." : "Inte aktivt på sajten.")
      },
      {
        name: "3. Wordfence",
        status: state.wfInfo ? "Inläst ✓" : "Ej inläst (Valfri)",
        loaded: !!state.wfInfo,
        color: state.wfInfo ? "var(--color-success)" : "var(--text-muted)",
        details: state.wfInfo 
          ? `<strong>Brandväggsläge:</strong> ${escapeHtml(env.wfFirewallMode)}<br><strong>IP-detektering:</strong> ${escapeHtml(env.wfIpHeader)}`
          : (state.sysInfo && env.activePlugins.some(p => p.toLowerCase().includes("wordfence")) ? "<strong>Wordfence är aktivt!</strong> Ladda upp för att verifiera IP-detektering." : "Inte aktivt på sajten.")
      },
      {
        name: "4. Tema",
        status: state.themeInfo ? "Inläst ✓" : "Ej inläst (Valfri)",
        loaded: !!state.themeInfo,
        color: state.themeInfo ? "var(--color-success)" : "var(--text-muted)",
        details: state.themeInfo
          ? `<strong>Aktivt tema:</strong> ${escapeHtml(env.theme)}<br><strong>Struktur:</strong> ${env.hasChildTheme ? "Barntema aktivt" : "Huvudtema"}`
          : `<strong>Detekterat tema:</strong> ${escapeHtml(env.theme || "Aktivt tema")}`
      },
      {
        name: "5. Elementor",
        status: state.elemInfo ? "Inläst ✓" : "Ej inläst (Valfri)",
        loaded: !!state.elemInfo,
        color: state.elemInfo ? "var(--color-success)" : "var(--text-muted)",
        details: state.elemInfo 
          ? `<strong>Live-version:</strong> v${escapeHtml(elemVersion)}<br><strong>Lazy load:</strong> ${env.hasElementorLazyLoad ? "Aktiv (Risk!)" : "Inaktiv (Optimalt)"}<br><strong>Funktioner:</strong> ${parseInt(env.elemExperiments.length, 10) || 0} st<br><strong>Källa:</strong> Slot 5 (Elementor)`
          : (env.hasElementor ? "<strong>Elementor är aktivt!</strong> Ladda upp för att verifiera inbyggd lazyload." : "Inte aktivt på sajten.")
      },
      {
        name: "6. SCM",
        status: state.customCodeInfo ? "Inläst ✓" : "Ej inläst (Valfri)",
        loaded: !!state.customCodeInfo,
        color: state.customCodeInfo ? "var(--color-success)" : "var(--text-muted)",
        details: state.customCodeInfo 
          ? `<strong>Analyserade snippets:</strong> ${state.customCodeInfo.snippets ? state.customCodeInfo.snippets.length : 1} st<br><strong>Stabilitetsrisker:</strong> ${state.analysisResults ? state.analysisResults.customCodeAlerts.filter(a => a.type === "danger" || a.type === "warning").length : 0} st`
          : "Site Code Manager redo för optimeringssnippets och filter."
      },
      {
        name: "7. LiteSpeed",
        status: state.uploadedSettings ? "Inläst ✓" : "Genereras från scratch",
        loaded: !!state.uploadedSettings,
        color: state.uploadedSettings ? "var(--color-success)" : "var(--accent-indigo)",
        details: state.uploadedSettings 
          ? `<strong>Inlästa parametrar:</strong> ${Object.keys(state.uploadedSettings).length} st<br><strong>Referens:</strong> LiteSpeed Cache v${escapeHtml(String(lscwpVersion))}`
          : "Ingen basfil inläst. Skapar en ren optimeringsprofil från scratch!"
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
      specTitle.innerHTML = `🎨 Elementor v${escapeHtml(String(elemVersion))} (${state.sysInfo && state.sysInfo["wp-plugins-active"] && Object.keys(state.sysInfo["wp-plugins-active"]).some(k => k.toLowerCase() === "elementor") ? "Detekterad" : "Referens ~4.2.x"})`;
    }

    const lscwpSpecTitle = document.getElementById("lscwp-spec-title");
    if (lscwpSpecTitle) {
      lscwpSpecTitle.innerHTML = `⚡ LiteSpeed Cache v${escapeHtml(String(lscwpVersion))} (Konfigurationer)`;
    }

    const lscwpRefBadge = document.getElementById("lscwp-ref-badge");
    if (lscwpRefBadge) {
      lscwpRefBadge.innerHTML = `Referens: LiteSpeed Cache v${escapeHtml(String(lscwpVersion))}`;
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
            <span style="color: var(--text-muted); font-size: 0.7rem; margin-left: 0.25rem;">(${escapeHtml(row.auditDate)})</span>
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
    const allAlerts = [
      ...(results.alerts || []),
      ...(results.customCodeAlerts || []),
      ...(results.customCssAlerts || [])
    ];

    let stabilityDeductions = 0;
    let perfDeductions = 0;
    let secDeductions = 0;

    allAlerts.forEach(a => {
      let cat = a.impactCategory;
      if (!cat) {
        if (a.component === "wordfence" || (a.components && a.components.includes("wordfence"))) cat = "security";
        else if (a.component === "elementor" || a.component === "css" || a.component === "litespeed") cat = "performance";
        else cat = "stability";
      }

      const isDanger = a.type === "danger";
      const isWarning = a.type === "warning";
      // Explicit scoreImpact: 0 (e.g. SCM raw echo advisory) must never deduct points
      const deduction = (a.scoreImpact === 0) ? 0 : (isDanger ? 18 : (isWarning ? 7 : 2));

      if (cat === "stability") {
        stabilityDeductions += deduction;
      } else if (cat === "security") {
        secDeductions += deduction;
      } else if (cat === "performance") {
        perfDeductions += deduction;
      } else {
        stabilityDeductions += deduction;
      }
    });

    const stabilityScore = Math.max(10, 100 - stabilityDeductions);
    const configPerfScore = Math.max(10, 100 - perfDeductions);
    const hasPsi = state.psiScores?.mobile != null || state.psiScores?.desktop != null;
    const psiScoreVal = state.psiScores?.mobile ?? state.psiScores?.desktop;
    const perfScore = hasPsi 
      ? Math.round((configPerfScore * 0.5) + (psiScoreVal * 0.5))
      : configPerfScore;

    const secScore = Math.max(10, 100 - secDeductions);

    let configDeductions = 0;
    const compFn = window.getOptionComparison || getOptionComparison;
    if (results.recommendations) {
      results.recommendations.forEach(tab => {
        tab.options.forEach(opt => {
          if (opt.id === "optm_css_custom") return;
          const comp = compFn ? compFn(opt, state.uploadedSettings, results.environment) : { isDeviant: false, isMeasured: false };
          // Only deduct if the setting is actually measured and deviant (never penalize unmeasured slots)
          if (comp.isDeviant && comp.isMeasured !== false) configDeductions += 3;
        });
      });
    }
    const configScore = Math.max(10, 100 - configDeductions);

    const masterScore = Math.max(15, Math.min(100, Math.round(
      (stabilityScore * 0.40) + (perfScore * 0.30) + (secScore * 0.20) + (configScore * 0.10)
    )));

    return { stabilityScore, perfScore, secScore, configScore, masterScore, hasPsiScore: hasPsi };
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
        <strong style="color: ${stabilityScore >= 80 ? 'var(--color-success)' : (stabilityScore >= 60 ? 'var(--color-warning)' : 'var(--color-danger)')};">${stabilityScore}/100</strong>
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

    // Render ecosystem updates notice under health gauge (count only)
    const updatesEl = document.getElementById("health-score-updates");
    if (updatesEl) {
      const updateAlert = (results.alerts || []).find(a => a.id === "alert_available_updates");
      if (updateAlert && updateAlert.components && updateAlert.components.length > 0) {
        const count = updateAlert.components.length;
        updatesEl.textContent = `${count} uppdatering${count > 1 ? "ar" : ""} tillgänglig${count > 1 ? "a" : ""}`;
        updatesEl.style.display = "inline-flex";
        updatesEl.onclick = () => {
          const tabBtn = document.querySelector('[data-tab="conflicts"]') || document.getElementById("tab-conflicts");
          if (tabBtn) tabBtn.click();
          const targetCard = document.getElementById("alert_available_updates");
          if (targetCard) targetCard.scrollIntoView({ behavior: "smooth", block: "center" });
        };
      } else {
        updatesEl.style.display = "none";
        updatesEl.textContent = "";
      }
    }

    const allAlerts = [
      ...(results.alerts || []),
      ...(results.customCodeAlerts || []),
      ...(results.customCssAlerts || [])
    ];
    const dangerCount = allAlerts.filter(a => a.type === "danger").length;
    const warningCount = allAlerts.filter(a => a.type === "warning").length;
    const totalConflicts = dangerCount + warningCount;

    // 1. Populate Konfliktvarningar metric row
    const conflictEl = document.getElementById("metric-conflict-warnings");
    const conflictCountEl = document.getElementById("metric-conflict-count");
    const conflictIconEl = document.getElementById("metric-conflict-icon");
    if (conflictCountEl) {
      conflictCountEl.textContent = `${totalConflicts} st`;
      if (dangerCount > 0) {
        conflictCountEl.style.background = "rgba(239, 68, 68, 0.18)";
        conflictCountEl.style.color = "#f87171";
        conflictCountEl.style.border = "1px solid rgba(239, 68, 68, 0.35)";
        if (conflictIconEl) conflictIconEl.textContent = "🚨";
      } else if (warningCount > 0) {
        conflictCountEl.style.background = "rgba(245, 158, 11, 0.18)";
        conflictCountEl.style.color = "#fbbf24";
        conflictCountEl.style.border = "1px solid rgba(245, 158, 11, 0.35)";
        if (conflictIconEl) conflictIconEl.textContent = "⚠️";
      } else {
        conflictCountEl.style.background = "rgba(16, 185, 129, 0.18)";
        conflictCountEl.style.color = "var(--color-success)";
        conflictCountEl.style.border = "1px solid rgba(16, 185, 129, 0.35)";
        if (conflictIconEl) conflictIconEl.textContent = "🟢";
      }
    }
    if (conflictEl) {
      conflictEl.onclick = () => {
        switchMasterView("risks");
      };
    }

    // 2. Populate Avvikelser mot rekommendation metric row
    const devEl = document.getElementById("metric-setting-deviations");
    const devCountEl = document.getElementById("metric-deviation-count");
    if (devCountEl) {
      devCountEl.textContent = `${deviationCount} st`;
      if (deviationCount > 0) {
        devCountEl.style.background = "rgba(245, 158, 11, 0.18)";
        devCountEl.style.color = "#fbbf24";
        devCountEl.style.border = "1px solid rgba(245, 158, 11, 0.35)";
      } else {
        devCountEl.style.background = "rgba(16, 185, 129, 0.18)";
        devCountEl.style.color = "var(--color-success)";
        devCountEl.style.border = "1px solid rgba(16, 185, 129, 0.35)";
      }
    }
    if (devEl) {
      devEl.onclick = () => {
        switchMasterView("settings");
      };
    }

    if (scoreTitleEl && scoreDescEl) {
      if (dangerCount > 0) {
        scoreTitleEl.textContent = "Åtgärd krävs! 🔴";
        scoreDescEl.textContent = `Kritiska stabilitetsrisker eller krockar detekterade (${dangerCount} st).`;
      } else if (warningCount > 0) {
        scoreTitleEl.textContent = "Bra status med varningar 🟡";
        scoreDescEl.textContent = `Sajten är stabil men har ${warningCount} åtgärdsbara konfliktvarningar.`;
      } else if (score >= 95) {
        scoreTitleEl.textContent = "100% LSCWP Advanced Preset! 🟢";
        scoreDescEl.textContent = "Din sajt är optimalt konfigurerad och har maximal stabilitet.";
      } else {
        scoreTitleEl.textContent = "Godkänd status 🟢";
        scoreDescEl.textContent = "Sajten är stabil med några mindre konfigurationsjusteringar.";
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
          const psiSection = document.getElementById("psi-tool-section");
          if (psiSection) psiSection.scrollIntoView({ behavior: "smooth" });
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
          const psiSection = document.getElementById("psi-tool-section");
          if (psiSection) psiSection.scrollIntoView({ behavior: "smooth" });
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
        checkoutSecure = clean.includes("checkout") || clean.includes("kassa") || clean.includes("kassan") || clean.includes("kco") || clean.includes("kustom");
        cartSecure = clean.includes("cart") || clean.includes("varukorg") || clean.includes("kundvagn") || checkoutSecure;
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
        li1.innerHTML = `<span style="color: var(--color-warning);">⚠️</span> Servern kör ej LiteSpeed (${escapeHtml(env.server)}). Backend-crawler är begränsad.`;
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
          li2.innerHTML = `<span style="color: #94a3b8;">ℹ️</span> Kassaexkluderingar verifieras när .data-fil laddas upp i Slot 7.`;
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
    if (sumTheme) sumTheme.textContent = env.activeTheme || env.theme || "Okänt tema";
    
    if (sumWooCommerce) {
      sumWooCommerce.textContent = env.hasWooCommerce ? "Aktiv" : "Inaktiv";
      sumWooCommerce.className = env.hasWooCommerce ? "info-value badge-info" : "info-value";
    }
    
    if (sumElementor) {
      sumElementor.textContent = env.hasElementor ? "Aktiv" : "Inaktiv";
      sumElementor.className = env.hasElementor ? "info-value badge-info" : "info-value";
    }
    
    if (sumObjectCache) {
      const hasObj = !!(env.hasRedis || env.isRedisConnected || env.hasObjectCache);
      sumObjectCache.textContent = hasObj ? "Ja" : "Nej";
      sumObjectCache.className = hasObj ? "info-value badge-info" : "info-value";
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
      theme: { key: "theme", label: "Tema", icon: "🎭" },
      elementor: { key: "elementor", label: "Elementor", icon: "🎨" },
      ctm: { key: "ctm", label: "CTM", icon: "🏷️" },
      server: { key: "server", label: "Server & Core", icon: "🖥️" },
      scm: { key: "scm", label: "SCM", icon: "💻" }
    };

    // Normalize component on each alert
    const normalizedAlerts = rawAlerts.map(a => {
      let comp = a.component;
      if (!comp) {
        if (a.targetTabId === "elementor") comp = "elementor";
        else if (a.targetTabId === "wordfence") comp = "wordfence";
        else if (a.targetTabId === "theme") comp = "theme";
        else if (a.title.toLowerCase().includes("tema") || a.title.toLowerCase().includes("astra") || a.title.toLowerCase().includes("blocksy")) comp = "theme";
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
    if (critBadge) {
      critBadge.textContent = `${critCount} Kritiska`;
      critBadge.className = critCount > 0 ? "badge-risk critical" : "badge-risk zero";
    }
    if (warnBadge) {
      warnBadge.textContent = `${warnCount} Varning${warnCount === 1 ? "" : "ar"}`;
      warnBadge.className = warnCount > 0 ? "badge-risk warning" : "badge-risk zero";
    }

    // 1. Render Cockpit Rad 1: Verktyg
    const toolsGridEl = document.getElementById("risk-cockpit-tools");
    if (toolsGridEl) {
      toolsGridEl.innerHTML = "";
      const tools = state.analysisResults.cockpitTools || [];
      const toolToComponentKey = {
        wp_system: "server",
        litespeed: "litespeed",
        woocommerce: "woocommerce",
        wordfence: "wordfence",
        theme: "theme",
        elementor: "elementor",
        scm: "scm",
        ctm: "ctm"
      };

      tools.forEach(tool => {
        const compKey = toolToComponentKey[tool.id] || tool.id;
        const compAlerts = normalizedAlerts.filter(a => {
          if (a.components && Array.isArray(a.components)) {
            return a.components.includes(compKey);
          }
          return a.component === compKey;
        });
        const cCount = compAlerts.filter(a => a.type === "danger").length;
        const wCount = compAlerts.filter(a => a.type === "warning").length;

        let cardStatusClass = "ok";
        let statusBadgeText = "🟢 Optimal";
        if (cCount > 0) {
          cardStatusClass = "danger";
          statusBadgeText = `🔴 ${cCount} Kritiska`;
        } else if (wCount > 0) {
          cardStatusClass = "warning";
          statusBadgeText = `🟡 ${wCount} Varning${wCount > 1 ? "ar" : ""}`;
        }

        const isSelected = state.activeRiskFilter === compKey;

        const card = document.createElement("div");
        card.className = `risk-component-card ${cardStatusClass} ${isSelected ? "selected" : ""}`;
        card.style.cursor = "pointer";
        card.innerHTML = `
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.15rem;">
            <strong style="font-size: 0.78rem; color: #fff; display: flex; align-items: center; gap: 0.25rem;">
              <span>${tool.icon}</span> ${escapeHtml(tool.name)}
            </strong>
            <span style="font-size: 0.62rem; color: #94a3b8;">${escapeHtml(tool.version)}</span>
          </div>
          <div style="font-size: 0.66rem; color: var(--text-muted); margin-bottom: 0.25rem; text-overflow: ellipsis; overflow: hidden; white-space: nowrap;" title="${escapeHtml(tool.subtext)}">
            ${escapeHtml(tool.subtext)}
          </div>
          <div style="font-size: 0.68rem; font-weight: 600;">
            ${statusBadgeText}
          </div>
        `;

        card.addEventListener("click", () => {
          state.activeRiskFilter = state.activeRiskFilter === compKey ? "all" : compKey;
          renderAlerts();
        });

        toolsGridEl.appendChild(card);
      });
    }

    // 2. Render Cockpit Rad 2: Funktioner (PÅ / AV per verktyg)
    const functionsGridEl = document.getElementById("risk-cockpit-functions");
    if (functionsGridEl) {
      functionsGridEl.innerHTML = "";
      const functions = state.analysisResults.cockpitFunctions || [];

      functions.forEach(fn => {
        let statusColor = "var(--color-success)";
        let statusBg = "rgba(16, 185, 129, 0.04)";
        let statusBorder = "rgba(16, 185, 129, 0.18)";
        if (fn.status === "danger") {
          statusColor = "#f87171";
          statusBg = "rgba(239, 68, 68, 0.06)";
          statusBorder = "rgba(239, 68, 68, 0.25)";
        } else if (fn.status === "warning") {
          statusColor = "var(--color-warning)";
          statusBg = "rgba(245, 158, 11, 0.06)";
          statusBorder = "rgba(245, 158, 11, 0.2)";
        } else if (fn.status === "neutral" || fn.status === "info") {
          statusColor = "#94a3b8";
          statusBg = "rgba(148, 163, 184, 0.04)";
          statusBorder = "rgba(148, 163, 184, 0.15)";
        }

        const card = document.createElement("div");
        card.className = "risk-function-card";
        card.style.background = statusBg;
        card.style.borderColor = statusBorder;

        const toolsHtml = (fn.tools || []).map(t => {
          const isEnabled = t.state.startsWith("PÅ");
          const stateColor = isEnabled ? "#34d399" : "#94a3b8";
          const stateBg = isEnabled ? "rgba(16, 185, 129, 0.14)" : "rgba(148, 163, 184, 0.1)";
          const stateBorder = isEnabled ? "rgba(16, 185, 129, 0.25)" : "rgba(148, 163, 184, 0.18)";
          return `
            <div style="display: flex; justify-content: space-between; align-items: center; font-size: 0.7rem; padding: 0.1rem 0;">
              <span style="color: var(--text-muted);">${escapeHtml(t.name)}</span>
              <span style="font-size: 0.65rem; font-weight: 700; color: ${stateColor}; background: ${stateBg}; border: 1px solid ${stateBorder}; padding: 0.08rem 0.35rem; border-radius: 4px;">${escapeHtml(t.state)}</span>
            </div>
          `;
        }).join("");

        card.innerHTML = `
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.15rem; border-bottom: 1px solid rgba(255,255,255,0.05); padding-bottom: 0.3rem;">
            <strong style="font-size: 0.8rem; color: #fff;">
              ${escapeHtml(fn.name)}
            </strong>
            <span style="font-size: 0.68rem; font-weight: 600; color: ${statusColor};">${escapeHtml(fn.statusText || "")}</span>
          </div>
          <div style="display: flex; flex-direction: column; gap: 0.1rem;">
            ${toolsHtml}
          </div>
        `;
        functionsGridEl.appendChild(card);
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
        { key: "theme", label: "Tema", count: normalizedAlerts.filter(a => a.components ? a.components.includes("theme") : a.component === "theme").length },
        { key: "elementor", label: "Elementor", count: normalizedAlerts.filter(a => a.components ? a.components.includes("elementor") : a.component === "elementor").length },
        { key: "ctm", label: "CTM", count: normalizedAlerts.filter(a => a.components ? a.components.includes("ctm") : a.component === "ctm").length },
        { key: "scm", label: "SCM", count: normalizedAlerts.filter(a => a.components ? a.components.includes("scm") : a.component === "scm").length },
        { key: "server", label: "Server/Core", count: normalizedAlerts.filter(a => a.components ? a.components.includes("server") : a.component === "server").length }
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
          return a.components.includes(f);
        }
        return a.component === f;
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
      checkoutSecure = clean.includes("checkout") || clean.includes("kassa") || clean.includes("kassan") || clean.includes("kco") || clean.includes("kustom");
      cartSecure = clean.includes("cart") || clean.includes("varukorg") || clean.includes("kundvagn") || checkoutSecure;
    }

    checklist.push({
      label: "Kassacaching undantagen (drop_uri)",
      status: !isDropUriMeasured ? "Ej uppmätt (Kräver Slot 7)" : (checkoutSecure ? "Skyddad" : "RISK"),
      risk: isDropUriMeasured && !checkoutSecure,
      desc: !isDropUriMeasured
        ? "Ladda upp LiteSpeed .data (Slot 7) för att verifiera att kassan är exkluderad i drop_uri."
        : (checkoutSecure 
          ? "Kassan exkluderas från cachning för att förhindra session- och dataläckor."
          : "Kassan cachas aktivt! Risk för session-läckor eller misslyckade köp."),
      wpPath: "LiteSpeed Cache ➔ Inställningar ➔ Cache ➔ [4] Exkludera ➔ Exkludera sökvägar (drop_uri)",
      targetTabId: "cache",
      targetSettingId: "drop_uri"
    });

    checklist.push({
      label: "Varukorgscaching undantagen (drop_uri)",
      status: !isDropUriMeasured ? "Ej uppmätt (Kräver Slot 7)" : (cartSecure ? "Skyddad" : "RISK"),
      risk: isDropUriMeasured && !cartSecure,
      desc: !isDropUriMeasured
        ? "Ladda upp LiteSpeed .data (Slot 7) för att verifiera att varukorgen är exkluderad i drop_uri."
        : (cartSecure
          ? "Varukorgen är exkluderad eller integrerad i kassan, vilket säkrar kundvagnsfragmenten."
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
        else if (gateLower.includes("klarna") && (activeExcludes.includes("klarna") || activeExcludes.includes("kco") || activeExcludes.includes("krokedil"))) isExcluded = true;
        else if (gateLower.includes("paypal") && (activeExcludes.includes("paypalobjects") || activeExcludes.includes("paypal"))) isExcluded = true;
        else if (gateLower.includes("shipmondo") && activeExcludes.includes("shipmondo")) isExcluded = true;
        else if (gateLower.includes("kustom") && (activeExcludes.includes("kustom") || activeExcludes.includes("klarna-checkout") || activeExcludes.includes("klarna"))) isExcluded = true;
        else if (gateLower.includes("swish") || gateLower.includes("bjorntech")) {
          isExcluded = activeExcludes.includes("swish") || activeExcludes.includes("bjorntech") || activeExcludes.includes("woocommerce") || activeExcludes.includes("jquery");
        } else if (gateLower.includes("svea")) {
          isExcluded = activeExcludes.includes("svea") || activeExcludes.includes("woocommerce");
        } else {
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
          Ladda upp functions.php eller en snippet-fil (Slot 6 SCM) för att köra PHP-analys.
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

    // READ-ONLY CUSTOM CSS DIAGNOSTICS CARD (Rendered if CSS is loaded from Slot 6 or theme)
    if (state.activeTabId === "page_optimization_css" && state.customCss) {
      const cssDiagCard = document.createElement("div");
      cssDiagCard.className = "setting-card glass-card";
      cssDiagCard.style.gridColumn = "span 2";
      cssDiagCard.style.background = "rgba(6, 182, 212, 0.02)";
      cssDiagCard.style.borderColor = "rgba(6, 182, 212, 0.2)";
      
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

      cssDiagCard.innerHTML = `
        <div class="setting-info" style="width:100%;">
          <div class="setting-title-row">
            <h4 class="setting-title" style="color:var(--accent-cyan);">🎨 Inläst Anpassad CSS (Slot 6)</h4>
            <span class="badge-risk safe">Prestandagranskad</span>
          </div>
          <p class="setting-desc" style="margin-bottom: 0.75rem;">
            Anpassad CSS-kod inläst från dina filer granskas automatiskt efter render-blockerande @imports eller reflow-animeringar.
          </p>
          <pre style="width:100%; max-height:140px; overflow-y:auto; font-family: monospace; font-size:0.75rem; background: rgba(0,0,0,0.3); border: 1px solid rgba(255,255,255,0.05); color: var(--text-main); padding: 0.75rem; border-radius:8px;"><code>${escapeHtml(state.customCss)}</code></pre>
          <div id="custom-css-audit-results" style="display:flex; flex-direction:column; gap:0.5rem; margin-top:0.75rem;">
            ${cssAlertsHtml || '<div style="color:var(--color-success); font-size:0.75rem;">✓ Inga prestandakritiska @imports eller reflows detekterade i din anpassade CSS.</div>'}
          </div>
        </div>
      `;

      settingsContainer.appendChild(cssDiagCard);
    }

    // Filter options: all_deviations = cross-tab flatten; others scoped to active tab
    const compFn = window.getOptionComparison || getOptionComparison;
    const annotateTab = (o, tab) => Object.assign({}, o, {
      _sourceTabId: tab.id,
      _sourceTabTitle: tab.title,
      tabCategoryTitle: tab.title
    });
    const isMeasuredDeviant = (o) => {
      const comp = compFn ? compFn(o, state.uploadedSettings, state.analysisResults.environment) : { isDeviant: false, isMeasured: false };
      return !!(comp.isDeviant && comp.isMeasured);
    };

    let filteredOptions;
    const isAllDev = state.activeSettingsFilter === "all_deviations";

    if (isAllDev) {
      filteredOptions = [];
      (state.analysisResults.recommendations || []).forEach(tab => {
        (tab.options || []).forEach(o => {
          if (o.id === "optm_css_custom") return;
          if (isMeasuredDeviant(o)) filteredOptions.push(annotateTab(o, tab));
        });
      });
    } else {
      filteredOptions = activeTab.options.filter(o => o.id !== "optm_css_custom").map(o => annotateTab(o, activeTab));
      if (state.activeSettingsFilter === "critical") {
        filteredOptions = filteredOptions.filter(o => o.criticalLevel === "critical");
      } else if (state.activeSettingsFilter === "deviations") {
        filteredOptions = filteredOptions.filter(isMeasuredDeviant);
      } else if (state.activeSettingsFilter === "ecommerce") {
        filteredOptions = filteredOptions.filter(o => o.id.includes("woo") || o.id.includes("drop_uri") || o.id.includes("esi") || o.id.includes("cart"));
      } else if (state.activeSettingsFilter === "baseline") {
        // keep all annotated options in active tab
      }
    }

    // Apply live search query filter if entered
    if (state.settingsSearchQuery && state.settingsSearchQuery.trim()) {
      const q = state.settingsSearchQuery.trim().toLowerCase();
      filteredOptions = filteredOptions.filter(o => {
        return (o.title && o.title.toLowerCase().includes(q)) ||
               (o.id && o.id.toLowerCase().includes(q)) ||
               (o.desc && o.desc.toLowerCase().includes(q)) ||
               (o.tabCategoryTitle && o.tabCategoryTitle.toLowerCase().includes(q));
      });
    }

    if (filteredOptions.length === 0) {
      const emptyNotice = document.createElement("div");
      emptyNotice.className = "glass-card";
      emptyNotice.style.gridColumn = "span 2";
      emptyNotice.style.padding = "2rem";
      emptyNotice.style.textAlign = "center";
      emptyNotice.style.color = "var(--text-muted)";
      if (state.settingsSearchQuery && state.settingsSearchQuery.trim()) {
        emptyNotice.innerHTML = `
          <span style="font-size: 2rem; display: block; margin-bottom: 0.5rem;">🔍</span>
          <strong>Inga inställningar i denna flik matchar sökningen "${escapeHtml(state.settingsSearchQuery)}".</strong>
          <p style="font-size: 0.8rem; margin-top: 0.25rem;">Rensa sökfältet för att återställa listan.</p>
        `;
      } else if (state.activeSettingsFilter === "all_deviations") {
        emptyNotice.innerHTML = `
          <span style="font-size: 2.2rem; display: block; margin-bottom: 0.5rem; color: #4ade80;">🎉</span>
          <strong style="color: #4ade80; font-size: 1rem;">Inga avvikelser på hela sajten!</strong>
          <p style="font-size: 0.82rem; margin-top: 0.25rem;">Alla uppmätta inställningar över alla kategorier matchar våra optimala rekommendationer (Policy/Context räknas inte som avvikelse).</p>
        `;
      } else if (state.activeSettingsFilter === "deviations") {
        emptyNotice.innerHTML = `
          <span style="font-size: 2.2rem; display: block; margin-bottom: 0.5rem; color: #4ade80;">🎉</span>
          <strong style="color: #4ade80; font-size: 1rem;">Inga avvikelser i denna flik!</strong>
          <p style="font-size: 0.82rem; margin-top: 0.25rem;">Alla inställningar under "${escapeHtml(activeTab.title)}" matchar våra optimala rekommendationer (100% optimalt).</p>
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

    // Toolbar: Sök, Sortering & Snabbinformation
    const toolbarDiv = document.createElement("div");
    toolbarDiv.className = "settings-toolbar";
    toolbarDiv.style.cssText = "display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.25rem; flex-wrap: wrap; gap: 0.75rem; width: 100%; grid-column: span 2; background: rgba(15, 23, 42, 0.6); border: 1px solid rgba(255, 255, 255, 0.08); padding: 0.6rem 1rem; border-radius: 10px;";
    
    toolbarDiv.innerHTML = `
      <div style="font-size: 0.8rem; color: var(--text-muted); display: flex; align-items: center; gap: 0.4rem;">
        <span>Visar <strong>${filteredOptions.length}</strong> inställningar</span>
      </div>
      <div style="display: flex; align-items: center; gap: 0.6rem; flex-wrap: wrap;">
        <div style="position: relative; display: flex; align-items: center;">
          <span style="position: absolute; left: 0.6rem; font-size: 0.75rem; color: var(--text-muted); pointer-events: none;">🔍</span>
          <input 
            type="text" 
            id="settings-search-input" 
            class="settings-search-input" 
            placeholder="Sök inställning..." 
            value="${escapeHtml(state.settingsSearchQuery || '')}"
            style="padding: 0.35rem 0.6rem 0.35rem 1.8rem; font-size: 0.78rem; background: rgba(0, 0, 0, 0.3); border: 1px solid rgba(255, 255, 255, 0.12); border-radius: 6px; color: #f8fafc; outline: none; width: 200px;"
          />
        </div>
        <div style="display: flex; align-items: center; gap: 0.4rem;">
          <label for="settings-sort-select" style="font-size: 0.75rem; color: var(--text-muted); font-weight: 600;">🔀 Sortera:</label>
          <select id="settings-sort-select" class="settings-sort-select">
            <option value="deviations" ${state.settingsSortBy === "deviations" ? "selected" : ""}>🚨 Avvikelser & Kritiska först (Standard)</option>
            <option value="default" ${state.settingsSortBy === "default" ? "selected" : ""}>⚡ LiteSpeed-ordning</option>
            <option value="impact" ${state.settingsSortBy === "impact" ? "selected" : ""}>⚠️ Känslighet (Kritisk ➔ Hög ➔ Standard)</option>
            <option value="status" ${state.settingsSortBy === "status" ? "selected" : ""}>🔘 Aktiveringsstatus (PÅ ➔ AV)</option>
            <option value="alphabetical" ${state.settingsSortBy === "alphabetical" ? "selected" : ""}>🔤 Namn (A–Ö)</option>
          </select>
        </div>
      </div>
    `;
    settingsContainer.appendChild(toolbarDiv);

    const searchInputEl = toolbarDiv.querySelector("#settings-search-input");
    if (searchInputEl) {
      searchInputEl.addEventListener("input", (e) => {
        state.settingsSearchQuery = e.target.value;
        renderSettingsPanel();
        const activeSearch = document.getElementById("settings-search-input");
        if (activeSearch) {
          activeSearch.focus();
          activeSearch.selectionStart = activeSearch.selectionEnd = activeSearch.value.length;
        }
      });
    }

    const sortSelectEl = toolbarDiv.querySelector("#settings-sort-select");
    if (sortSelectEl) {
      sortSelectEl.addEventListener("change", (e) => {
        state.settingsSortBy = e.target.value;
        renderSettingsPanel();
      });
    }

    const sortedOptions = [...filteredOptions].sort((a, b) => {
      const compA = compFn ? compFn(a, state.uploadedSettings, state.analysisResults.environment) : { isMeasured: false, isMatches: true, isDeviant: false };
      const compB = compFn ? compFn(b, state.uploadedSettings, state.analysisResults.environment) : { isMeasured: false, isMatches: true, isDeviant: false };

      const sortBy = state.settingsSortBy || "deviations";

      if (sortBy === "alphabetical") {
        return (a.title || "").localeCompare(b.title || "", "sv");
      }

      if (sortBy === "impact") {
        const impactScore = opt => opt.criticalLevel === "critical" ? 1 : (opt.criticalLevel === "high" ? 2 : (opt.criticalLevel === "standard" ? 3 : 4));
        const diff = impactScore(a) - impactScore(b);
        if (diff !== 0) return diff;
        return (a.title || "").localeCompare(b.title || "", "sv");
      }

      if (sortBy === "status") {
        const getStatusScore = (opt, comp) => {
          if (!comp || !comp.isMeasured) return 3;
          if (comp.currentDisplay === "PÅ" || comp.currentDisplay.includes("Delayed") || comp.currentDisplay.includes("Deferred") || comp.currentDisplay.includes("Optimalt") || comp.currentDisplay.includes("Extern fil") || comp.currentDisplay.includes("Matchar")) return 1;
          return 2;
        };
        const diff = getStatusScore(a, compA) - getStatusScore(b, compB);
        if (diff !== 0) return diff;
        return (a.title || "").localeCompare(b.title || "", "sv");
      }

      if (sortBy === "deviations") {
        function getDevPriority(opt, comp) {
          if (!comp || !comp.isMeasured) return 4;
          if (comp.isDeviant || !comp.isMatches) {
            if (opt.criticalLevel === "critical") return 1;
            if (opt.criticalLevel === "high") return 2;
            return 3;
          }
          return 5;
        }
        const diff = getDevPriority(a, compA) - getDevPriority(b, compB);
        if (diff !== 0) return diff;
        return (a.title || "").localeCompare(b.title || "", "sv");
      }

      return 0; // Default LiteSpeed tab order
    });

    sortedOptions.forEach(opt => {
      // Avoid re-rendering custom_css as a separate card if it's the custom CSS option field
      if (opt.id === "optm_css_custom") return;

      const card = document.createElement("div");
      card.className = "setting-card";

      const comp = compFn ? compFn(opt, state.uploadedSettings, state.analysisResults.environment) : {
        isMeasured: !!state.uploadedSettings,
        isMatches: true,
        statusLabel: "🟢 Optimal",
        currentDisplay: "PÅ",
        recommendedDisplay: "PÅ",
        rawMeasured: null
      };

      let activeUserVal = "";
      if (state.editedSettings && state.editedSettings.hasOwnProperty(opt.id)) {
        activeUserVal = state.editedSettings[opt.id];
      } else if (comp && comp.rawMeasured !== null && comp.rawMeasured !== undefined) {
        activeUserVal = comp.rawMeasured;
      } else if (state.uploadedSettings && state.uploadedSettings.hasOwnProperty(opt.id)) {
        activeUserVal = state.uploadedSettings[opt.id];
      }
      // Never surface object-pswd / API keys in cleartext in the options UI
      if (activeUserVal !== "" && activeUserVal !== null && activeUserVal !== undefined) {
        const secretFn = (typeof window !== "undefined" && typeof window.isSecretOptionKey === "function")
          ? window.isSecretOptionKey
          : ((id) => /pswd|passwd|password|secret|token|domain_key|cloudflare_key|(^|[_-])hash$/i.test(String(id || "")));
        const maskFn = (typeof window !== "undefined" && typeof window.maskSecretKey === "function")
          ? window.maskSecretKey
          : null;
        if (secretFn(opt.id) && maskFn) {
          activeUserVal = maskFn(activeUserVal);
        }
      }

      let isChecked = false;
      let isMatches = false;

      if (opt.id === "drop_uri" || opt.id === "js_exclude" || opt.id === "css_exclude" || opt.id === "media_lazy_exc" || opt.id === "js_delayed_exclude") {
        isMatches = comp.isMatches;
      } else if (typeof opt.recommendedRaw === "string" && opt.recommendedRaw !== "1" && opt.recommendedRaw !== "0") {
        isMatches = comp.isMatches;
      } else {
        isChecked = activeUserVal === 1 || activeUserVal === "1" || activeUserVal === "on" || activeUserVal === true;
        isMatches = comp.isMatches;
      }

      const isTextareaField = opt.id === "js_exclude" || opt.id === "css_exclude" || opt.id === "media_lazy_exc" || opt.id === "drop_uri" || opt.id === "js_delayed_exclude" || opt.id === "optm_dns_prefetch";

      const sourceSlotBadge = (opt.tool === "elementor" || (opt.id && opt.id.startsWith("elem_")))
        ? `<span class="badge-risk info" style="margin-left: 0.35rem; background: rgba(168, 85, 247, 0.12); color: #d8b4fe; border: 1px solid rgba(168, 85, 247, 0.3); font-size: 0.65rem;">📂 Slot 5 · Elementor</span>`
        : "";

      const showCategoryBadge = state.activeSettingsFilter === "all_deviations";
      const categoryBadge = showCategoryBadge && (opt._sourceTabTitle || opt.tabCategoryTitle)
        ? `<button type="button" class="category-tab-badge btn-jump-category" data-tab-id="${escapeHtml(opt._sourceTabId || "")}" data-setting-id="${escapeHtml(opt.id)}" title="Hoppa till flik">${escapeHtml(opt._sourceTabTitle || opt.tabCategoryTitle)}</button>`
        : "";

      const matchBadge = !comp.isMeasured 
        ? `<span class="badge-risk info" style="margin-left: auto; background: rgba(148, 163, 184, 0.15); color: #94a3b8; border: 1px solid rgba(148, 163, 184, 0.3);">⚪ Ej uppmätt / Okänd</span>`
        : (comp.isPolicyContext)
          ? `<span class="badge-risk info" style="margin-left: auto; background: rgba(59, 130, 246, 0.15); color: #93c5fd; border: 1px solid rgba(59, 130, 246, 0.35);">🔵 Policy/Context</span>`
        : comp.isMatches 
          ? `<span class="badge-risk safe" style="margin-left: auto; background: rgba(16, 185, 129, 0.15); color: var(--color-success); border: 1px solid rgba(16, 185, 129, 0.3);">🟢 Optimal</span>`
          : opt.criticalLevel === "critical"
            ? `<span class="badge-risk high" style="margin-left: auto; background: rgba(239, 68, 68, 0.15); color: #f87171; border: 1px solid rgba(239, 68, 68, 0.3);">🚨 Avvikelse</span>`
            : opt.criticalLevel === "high"
              ? `<span class="badge-risk high" style="margin-left: auto; background: rgba(251, 146, 60, 0.15); color: #fb923c; border: 1px solid rgba(251, 146, 60, 0.3);">⚠️ Avvikelse</span>`
              : `<span class="badge-risk high" style="margin-left: auto; background: rgba(245, 158, 11, 0.15); color: var(--color-warning); border: 1px solid rgba(245, 158, 11, 0.3);">🟡 Avvikelse</span>`;

      // 1. Status Activation Pill (Far Left)
      let statusClass = "status-unset";
      let statusText = "⚪ —";
      if (!comp.isMeasured) {
        statusClass = "status-unset";
        statusText = "⚪ —";
      } else if (isTextareaField) {
        if (comp && comp.currentDisplay && comp.currentDisplay.includes("Inaktiv")) {
          statusClass = "status-on";
          statusText = `🟢 ${comp.currentDisplay}`;
        } else {
          const rawSiteExcl = (comp && comp.rawMeasured !== null && comp.rawMeasured !== undefined) ? comp.rawMeasured.toString() : "";
          const cleanLines = rawSiteExcl.split(/[\r\n]+/).map(l => l.trim()).filter(Boolean);
          const lineCount = cleanLines.length;
          if (lineCount > 0) {
            statusClass = "status-on";
            statusText = `✅ PÅ (${lineCount} rader)`;
          } else {
            statusClass = "status-off";
            statusText = "❌ AV (0 rader)";
          }
        }
      } else if (opt.id === "elem_css_print_method") {
        statusClass = comp.isMatches ? "status-on" : "status-off";
        statusText = comp.isMatches ? "📄 Extern fil" : "⚠️ Intern/Inline";
      } else if (opt.tool === "server" && typeof opt.recommendedRaw === "string" && opt.recommendedRaw !== "1" && opt.recommendedRaw !== "0") {
        statusClass = comp.isMatches ? "status-on" : "status-off";
        statusText = `📦 ${comp.currentDisplay || activeUserVal || "Ej satt"}`;
      } else if (
        comp.currentDisplay === "PÅ" ||
        comp.currentDisplay === "1" ||
        comp.currentDisplay.includes("Delayed") ||
        comp.currentDisplay.includes("Deferred") ||
        comp.currentDisplay.includes("Optimalt") ||
        comp.currentDisplay.includes("Extern") ||
        comp.currentDisplay.includes("external") ||
        comp.currentDisplay.includes("Matchar") ||
        (comp.currentDisplay !== "AV" && comp.currentDisplay !== "0" && (comp.rawMeasured === 1 || comp.rawMeasured === "1" || comp.rawMeasured === true || comp.rawMeasured === 2 || comp.rawMeasured === "2"))
      ) {
        statusClass = "status-on";
        statusText = "✅ PÅ";
      } else {
        statusClass = "status-off";
        statusText = "❌ AV";
      }

      // 2. 3-Source Traffic Light Consensus (Right)
      const sources = opt.sources || {
        lsAdv: { status: "neutral", text: "LiteSpeed Technologies: Standardinställning." },
        oom: { status: "neutral", text: "Online Media Masters: Rekommenderat val." },
        domain: { name: "WordPress Core", status: "neutral", text: "Standard branschrekommendation." }
      };

      const lsAdvText = sources.lsAdv.text || "LiteSpeed: Ingen rekommendation";
      const oomText = sources.oom.text || "Online Media Masters: Ingen rekommendation";
      const domainText = sources.domain.text || `${sources.domain.name || 'Domänkälla'}: Standard`;

      const trafficLightHtml = `
        <div class="traffic-light-widget">
          <div class="traffic-light-housing" title="3-Källors Konsensus (Hovra lampor för detaljer)">
            <div class="traffic-dot dot-${sources.lsAdv.status || 'neutral'}" data-tooltip="⚡ ${escapeHtml(lsAdvText)}"></div>
            <div class="traffic-dot dot-${sources.oom.status || 'neutral'}" data-tooltip="🌐 ${escapeHtml(oomText)}"></div>
            <div class="traffic-dot dot-${sources.domain.status || 'neutral'}" data-tooltip="🛡️ ${escapeHtml(domainText)}"></div>
          </div>
        </div>
      `;

      // Expert Citations Collapsible Block
      let citationsHtml = "";
      if (opt.citations) {
        citationsHtml = `
          <details class="expert-citations" style="margin-top: 0.65rem; background: rgba(255, 255, 255, 0.01); border: 1px solid rgba(255, 255, 255, 0.04); border-radius: 6px; padding: 0.5rem 0.75rem; width: 100%;">
            <summary style="font-size: 0.75rem; color: var(--accent-cyan); cursor: pointer; display: flex; align-items: center; gap: 0.25rem; user-select: none; outline: none; font-weight: 500;">
              <span>🔗 Visa källhänvisningar & expertmotivering</span>
            </summary>
            <div style="margin-top: 0.5rem; display: flex; flex-direction: column; gap: 0.5rem; font-size: 0.72rem; line-height: 1.4; border-top: 1px solid rgba(255,255,255,0.03); padding-top: 0.5rem;">
              <div style="border-left: 2px solid var(--accent-indigo); padding-left: 0.5rem;">
                <strong style="color: #c7d2fe; display: block; margin-bottom: 0.1rem;">LiteSpeed Advanced:</strong>
                <span style="color: var(--text-muted);">${escapeHtml(sources.lsAdv.text || opt.citations.litespeed || "")}</span>
              </div>
              <div style="border-left: 2px solid var(--color-warning); padding-left: 0.5rem; margin-top: 0.25rem;">
                <strong style="color: #fde68a; display: block; margin-bottom: 0.1rem;">Online Media Masters (Tom Dupuis):</strong>
                <span style="color: var(--text-muted);">${escapeHtml(sources.oom.text || opt.citations.consensus || "")}</span>
              </div>
              <div style="border-left: 2px solid var(--accent-cyan); padding-left: 0.5rem; margin-top: 0.25rem;">
                <strong style="color: #a5f3fc; display: block; margin-bottom: 0.1rem;">${escapeHtml(sources.domain.name || "Domänkälla")}:</strong>
                <span style="color: var(--text-muted);">${escapeHtml(sources.domain.text || "")}</span>
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

      // Alternatives Matrix for Theme Synergy & Method Selection
      let alternativesHtml = "";
      if (opt.alternatives && Array.isArray(opt.alternatives)) {
        alternativesHtml = `
          <div class="alternatives-matrix-box" style="margin-top: 0.65rem; background: rgba(0, 0, 0, 0.25); border: 1px solid rgba(255, 255, 255, 0.06); border-radius: 8px; padding: 0.6rem 0.85rem;">
            <div style="font-size: 0.72rem; font-weight: 600; color: #94a3b8; margin-bottom: 0.4rem; text-transform: uppercase; letter-spacing: 0.05em; display: flex; align-items: center; gap: 0.35rem;">
              <span>🔀</span> Tillgängliga metoder & styrning:
            </div>
            <div style="display: flex; flex-wrap: wrap; gap: 0.5rem;">
              ${opt.alternatives.map(alt => {
                const isAltOn = alt.status === "on";
                const bg = isAltOn ? "rgba(16, 185, 129, 0.12)" : "rgba(148, 163, 184, 0.08)";
                const border = isAltOn ? "rgba(16, 185, 129, 0.35)" : "rgba(148, 163, 184, 0.2)";
                const color = isAltOn ? "#34d399" : "#94a3b8";
                return `
                  <div style="display: flex; align-items: center; gap: 0.4rem; background: ${bg}; border: 1px solid ${border}; border-radius: 6px; padding: 0.25rem 0.6rem; font-size: 0.73rem;">
                    <span style="font-weight: 500; color: #f1f5f9;">${escapeHtml(alt.name)}:</span>
                    <span style="color: ${color}; font-weight: 600;">${escapeHtml(alt.label)}</span>
                  </div>
                `;
              }).join("")}
            </div>
          </div>
        `;
      }

      if (isTextareaField) {
        let impactScoreHtml = "";
        if (opt.scoreImpact === 0 || opt.readOnly || (comp && comp.isPolicyContext)) {
          impactScoreHtml = `<span style="color: #93c5fd; font-weight: 600;">Påverkan av Score: Policy / 0 p</span>`;
        } else if (opt.criticalLevel === "critical") {
          impactScoreHtml = `<span style="color: #f87171; font-weight: 600;">Påverkan av Score: Kritisk (- 15 p vid avvikelse)</span>`;
        } else if (opt.criticalLevel === "high") {
          impactScoreHtml = `<span style="color: #fb923c; font-weight: 600;">Påverkan av Score: Hög (- 10 p vid avvikelse)</span>`;
        } else {
          impactScoreHtml = `<span style="color: var(--text-muted); opacity: 0.85;">Påverkan av Score: Låg (- 2 p vid avvikelse)</span>`;
        }
        
        const rawSiteExcl = (comp && comp.rawMeasured !== null && comp.rawMeasured !== undefined) ? comp.rawMeasured.toString() : "";
        const cleanExclusionLines = rawSiteExcl
          .split(/[\r\n]+/)
          .map(l => l.replace(/[\u00A0\s]+/g, " ").trim())
          .filter(Boolean)
          .join("\n");
        const measuredLineCount = cleanExclusionLines ? cleanExclusionLines.split('\n').length : 0;
        
        const recListStr = (opt.recommendedRaw || "").toString().trim();
        const missingItems = (comp && comp.missing && Array.isArray(comp.missing)) ? comp.missing : [];
        const fulfilledItems = (comp && comp.fulfilled && Array.isArray(comp.fulfilled)) ? comp.fulfilled : [];
        const missingCount = missingItems.length;
        const fulfilledCount = fulfilledItems.length;

        const missingPillsHtml = missingCount > 0 ? `
          <div style="margin-top: 0.65rem; background: rgba(239, 68, 68, 0.08); border: 1px solid rgba(239, 68, 68, 0.25); border-radius: 8px; padding: 0.75rem;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.45rem; flex-wrap: wrap; gap: 0.4rem;">
              <span style="color: #fca5a5; font-size: 0.75rem; font-weight: 700; display: flex; align-items: center; gap: 0.35rem;">
                <span>🚨</span> Saknas i nuläget (${missingCount} st rekommenderade mönster):
              </span>
              <button type="button" class="btn-copy-missing" data-copy="${escapeHtml(missingItems.join('\n'))}" style="background: rgba(239, 68, 68, 0.2); border: 1px solid rgba(239, 68, 68, 0.45); color: #fecaca; padding: 0.22rem 0.65rem; border-radius: 4px; font-size: 0.72rem; font-weight: 700; cursor: pointer; transition: all 0.2s; display: flex; align-items: center; gap: 0.3rem;">
                📋 Kopiera saknade rader
              </button>
            </div>
            <div style="display: flex; flex-wrap: wrap; gap: 0.35rem;">
              ${missingItems.map(m => `<span style="background: rgba(0,0,0,0.3); color: #fca5a5; border: 1px solid rgba(239,68,68,0.3); border-radius: 4px; padding: 2px 7px; font-family: monospace; font-size: 0.72rem;">+ ${escapeHtml(m)}</span>`).join('')}
            </div>
          </div>
        ` : '';

        const fulfilledPillsHtml = fulfilledCount > 0 ? `
          <div style="margin-top: 0.5rem; font-size: 0.72rem; color: #86efac; display: flex; align-items: center; gap: 0.35rem; flex-wrap: wrap;">
            <span style="color: #4ade80; font-weight: 600;">✓ Identifierade skyddsmönster på sajten:</span>
            <span style="color: var(--text-muted); font-size: 0.7rem;">(${fulfilledCount} st matchade mot LS-rek)</span>
          </div>
        ` : '';

        let guidanceBoxHtml = "";
        if (opt.id === "js_delayed_exclude") {
          const isDelayedInactive = comp && comp.currentDisplay && comp.currentDisplay.includes("Inaktiv");
          if (isDelayedInactive) {
            card.style.opacity = "0.75";
          }
          guidanceBoxHtml = `
            <div style="margin-top: 0.65rem; background: rgba(99, 102, 241, 0.08); border: 1px solid rgba(99, 102, 241, 0.25); border-radius: 8px; padding: 0.65rem 0.85rem; font-size: 0.73rem; color: #e0e7ff; line-height: 1.45;">
              <strong style="color: #a5b4fc; display: flex; align-items: center; gap: 0.35rem; margin-bottom: 0.25rem;">
                <span>💡</span> Fördröj JS (JS Delay) Exkluderingar:
              </strong>
              <span>${isDelayedInactive ? '<strong>Obs:</strong> JS Delay är inaktivt (sajten kör JS Defer). Detta fält används endast om du slår på JS Delay (läge 2). Vid Defer räcker det att undantagen finns i <em>Exkluderingar av JS</em>.' : 'Klistra in denna lista i <strong>"Undantag för uppskjuten/fördröjd JS" (JS Delayed Exclude)</strong> i LiteSpeed för att skydda samtycke och kassa när JS Delay (läge 2) är aktivt.'}</span>
            </div>
          `;
        } else if (opt.id === "js_exclude") {
          guidanceBoxHtml = `
            <div style="margin-top: 0.65rem; background: rgba(99, 102, 241, 0.08); border: 1px solid rgba(99, 102, 241, 0.25); border-radius: 8px; padding: 0.65rem 0.85rem; font-size: 0.73rem; color: #e0e7ff; line-height: 1.45;">
              <strong style="color: #a5b4fc; display: flex; align-items: center; gap: 0.35rem; margin-bottom: 0.25rem;">
                <span>💡</span> Bästa praxis & Säkerhetsrekommendation för JS:
              </strong>
              <span>Klistra in denna lista i <strong>"Exkluderingar av JS" (js_exclude)</strong> i LiteSpeed. Om du även aktiverar JS Delay (läge 2) klistras listan in i båda fälten. Detta säkerställer att kassa och samtyckesspårning aldrig bryts.</span>
              <div style="margin-top: 0.35rem; color: #fca5a5; font-size: 0.7rem; display: flex; align-items: flex-start; gap: 0.35rem;">
                <span>⚠️</span> <span><em>Viktigt: LiteSpeed exkluderar INGET JavaScript automatiskt (till skillnad från sidcachen). Manuella undantag är ett strikt krav för att inte bryta kassa eller samtycke.</em></span>
              </div>
            </div>
          `;
        } else if (opt.id === "media_lazy_exc") {
          const isLazyInactive = comp && comp.currentDisplay && comp.currentDisplay.includes("Inaktiv");
          if (isLazyInactive) {
            card.style.opacity = "0.75";
          }
          guidanceBoxHtml = `
            <div style="margin-top: 0.65rem; background: rgba(99, 102, 241, 0.08); border: 1px solid rgba(99, 102, 241, 0.25); border-radius: 8px; padding: 0.65rem 0.85rem; font-size: 0.73rem; color: #e0e7ff; line-height: 1.45;">
              <strong style="color: #a5b4fc; display: flex; align-items: center; gap: 0.35rem; margin-bottom: 0.25rem;">
                <span>💡</span> Lazy Load Bild-undantag:
              </strong>
              <span>${isLazyInactive ? '<strong>Inaktivt läge:</strong> LiteSpeeds egna bild-lazyload är avstängd (WordPress inbyggda Native Lazy Load styr bilderna). Detta undantagsfält i LiteSpeed behöver därför inte konfigureras och ger inget poängavdrag.' : 'När LiteSpeed Media Lazy Load är aktivt måste Above-the-fold bilder (logo, header, hero) exkluderas här för att inte fördröja LCP.'}</span>
            </div>
          `;
        } else if (opt.id === "css_exclude") {
          guidanceBoxHtml = `
            <div style="margin-top: 0.65rem; background: rgba(99, 102, 241, 0.08); border: 1px solid rgba(99, 102, 241, 0.25); border-radius: 8px; padding: 0.65rem 0.85rem; font-size: 0.73rem; color: #e0e7ff; line-height: 1.45;">
              <strong style="color: #a5b4fc; display: flex; align-items: center; gap: 0.35rem; margin-bottom: 0.25rem;">
                <span>💡</span> Bästa praxis för CSS i LiteSpeed:
              </strong>
              <span>LiteSpeed exkluderar <strong>inte heller CSS automatiskt</strong>. För att undvika trasiga layouter och brutna mobilbrytpunkter måste Elementor (<code style="color:#67e8f9; background:rgba(0,0,0,0.3); padding:1px 4px; border-radius:3px;">wp-content/uploads/elementor/css/*</code>), CTM och kassa-CSS alltid läggas in här.</span>
            </div>
          `;
        }

        card.innerHTML = `
          <div class="setting-info" style="flex: 1; text-align: left !important; width: 100%;">
            <div class="setting-title-row" style="display: flex; align-items: center; gap: 0.6rem; flex-wrap: wrap; margin-bottom: 0.5rem; width: 100%;">
              <span class="setting-state-pill ${statusClass}">${statusText}</span>
              <h4 class="setting-title" style="margin: 0; font-size: 0.95rem; font-weight: 700;">${opt.title}</h4>
              <span style="font-size: 0.7rem; color: var(--text-muted); opacity: 0.7; font-family: monospace;">(ID: ${opt.id})</span>
              ${categoryBadge}${sourceSlotBadge}${matchBadge}
            </div>
            <p class="setting-desc" style="margin-bottom: 0.75rem;">${opt.desc}</p>
            ${opt.wpPath ? `<div style="margin: 0.15rem 0 0.55rem; font-size: 0.7rem; opacity: 0.9;"><span>📍 <strong>WP:</strong></span> <code style="background: rgba(0,0,0,0.3); padding: 0.1rem 0.35rem; border-radius: 4px; color: #a5b4fc; font-family: monospace; font-size: 0.68rem; border: 1px solid rgba(255,255,255,0.03);">${escapeHtml(opt.wpPath)}</code></div>` : ""}
            ${singleSourceHtml}
            ${citationsHtml}

            ${guidanceBoxHtml}
            ${missingPillsHtml}
            ${fulfilledPillsHtml}

            <!-- 1. Current list on site (Collapsible Dropdown) -->
            <details class="exclusion-accordion" style="margin-top: 0.65rem;">
              <summary class="exclusion-accordion-summary">
                <span style="display: flex; align-items: center; gap: 0.45rem;">
                  <span class="accordion-arrow">▶</span>
                  <strong style="font-size: 0.72rem;">Aktiva exkluderingar på sajten (Nuläge)</strong>
                  <span class="badge-count">${measuredLineCount} rader</span>
                </span>
                <button type="button" class="btn-copy-current btn-copy-compact" data-copy="${escapeHtml(cleanExclusionLines)}" title="Kopiera aktiva rader">
                  📋 Kopiera nuläge
                </button>
              </summary>
              <div class="exclusion-accordion-content">
                <pre class="exclusion-pre">${escapeHtml(cleanExclusionLines || "(Inga aktiva exkluderingar inlästa på sajten)")}</pre>
              </div>
            </details>

            <!-- 2. Full recommended list ready to copy (Collapsible Dropdown) -->
            <details class="exclusion-accordion rec" style="margin-top: 0.5rem;" ${missingCount > 0 ? 'open' : ''}>
              <summary class="exclusion-accordion-summary rec">
                <span style="display: flex; align-items: center; gap: 0.45rem;">
                  <span class="accordion-arrow">▶</span>
                  <strong style="font-size: 0.72rem;">Komplett rekommenderad lista för LiteSpeed</strong>
                  <span class="badge-count rec">${recListStr ? recListStr.split('\n').length : 0} rader</span>
                </span>
                <button type="button" class="btn-copy-full-rec btn-copy-compact rec" data-copy="${escapeHtml(recListStr)}" title="Kopiera komplett lista">
                  📋 Kopiera komplett lista
                </button>
              </summary>
              <div class="exclusion-accordion-content rec">
                <pre class="exclusion-pre rec">${escapeHtml(recListStr)}</pre>
              </div>
            </details>

            <div style="margin-top: 0.6rem; display: flex; justify-content: space-between; align-items: center; font-size: 0.72rem; color: var(--text-muted); opacity: 0.85;">
              <span>${isMatches ? '✓ Alla rekommenderade mönster är exkluderade' : '⚠️ Vissa nödvändiga skyddsmönster saknas i nuläget'}</span>
              ${impactScoreHtml}
            </div>
          </div>
          <div class="setting-right-col" style="align-self: flex-start; margin-top: 0.25rem;">
            ${trafficLightHtml}
          </div>
        `;
      } else {
        let impactScoreHtml = "";
        if (opt.scoreImpact === 0 || opt.readOnly || (comp && comp.isPolicyContext)) {
          impactScoreHtml = `<span style="color: #93c5fd; font-weight: 600;">Påverkan av Score: Policy / 0 p</span>`;
        } else if (opt.criticalLevel === "critical") {
          impactScoreHtml = `<span style="color: #f87171; font-weight: 600;">Påverkan av Score: Kritisk (- 15 p vid avvikelse)</span>`;
        } else if (opt.criticalLevel === "high") {
          impactScoreHtml = `<span style="color: #fb923c; font-weight: 600;">Påverkan av Score: Hög (- 10 p vid avvikelse)</span>`;
        } else {
          impactScoreHtml = `<span style="color: var(--text-muted); opacity: 0.85;">Påverkan av Score: Låg (- 2 p vid avvikelse)</span>`;
        }

        card.innerHTML = `
          <div class="setting-info" style="flex: 1;">
            <div class="setting-title-row" style="display: flex; align-items: center; gap: 0.6rem; flex-wrap: wrap; margin-bottom: 0.5rem; width: 100%;">
              <span class="setting-state-pill ${statusClass}">${statusText}</span>
              <h4 class="setting-title" style="margin: 0; font-size: 0.95rem; font-weight: 700;">${opt.title}</h4>
              <span style="font-size: 0.7rem; color: var(--text-muted); opacity: 0.7; font-family: monospace;">(ID: ${opt.id})</span>
              ${categoryBadge}${matchBadge}
            </div>
            <p class="setting-desc">${opt.desc}</p>
            ${opt.wpPath ? `<div style="margin: 0.35rem 0 0.5rem; font-size: 0.7rem; opacity: 0.9;"><span>📍 <strong>WP:</strong></span> <code style="background: rgba(0,0,0,0.3); padding: 0.1rem 0.35rem; border-radius: 4px; color: #a5b4fc; font-family: monospace; font-size: 0.68rem; border: 1px solid rgba(255,255,255,0.03);">${escapeHtml(opt.wpPath)}</code></div>` : ""}
            ${alternativesHtml}
            ${singleSourceHtml}
            ${citationsHtml}
            <div style="margin-top: 0.6rem; font-size: 0.72rem;">
              ${impactScoreHtml}
            </div>
          </div>
          <div class="setting-right-col">
            ${trafficLightHtml}
          </div>
        `;
      }

      settingsContainer.appendChild(card);

      const jumpBtn = card.querySelector(".btn-jump-category");
      if (jumpBtn) {
        jumpBtn.addEventListener("click", (e) => {
          e.preventDefault();
          e.stopPropagation();
          const tabId = jumpBtn.getAttribute("data-tab-id");
          const settingId = jumpBtn.getAttribute("data-setting-id");
          if (tabId && settingId) {
            // Switch to tab-scoped "all" so the target card is visible in its category
            if (state.activeSettingsFilter === "all_deviations") {
              state.activeSettingsFilter = "all";
              document.querySelectorAll(".filter-btn").forEach(b => {
                b.classList.toggle("active", b.dataset.filter === "all");
              });
            }
            jumpToSetting(tabId, settingId);
          }
        });
      }
    });
  }

  // --- DIFFERENCES & THREE-TIER AUDIT REPORT VIEWER ---

  function renderComparisonSummary() {
    if (!comparisonSummaryCard) return;

    if (!state.uploadedSettings) {
      comparisonSummaryCard.style.display = "block";
      comparisonSummaryCard.style.background = "rgba(16, 185, 129, 0.05)";
      comparisonSummaryCard.style.borderColor = "rgba(16, 185, 129, 0.25)";
      if (btnFixAll) btnFixAll.style.display = "none";
      
      comparisonSummaryDesc.innerHTML = "✨ <strong>Ny optimeringsprofil skapad från scratch:</strong> Eftersom du inte laddat upp någon befintlig LSCWP-fil (Slot 7 LiteSpeed), har vi genererat en helt ren och optimal profil anpassad för din sajt. Klicka på flikarna nedan för att se LSCWP Advanced Preset för din WordPress-version!";
      
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
    let measuredCount = 0;

    state.analysisResults.recommendations.forEach(tab => {
      tab.options.forEach(opt => {
        if (opt.id === "optm_css_custom") return;

        const comp = compFn ? compFn(opt, state.uploadedSettings, state.analysisResults.environment) : { isDeviant: false, isMeasured: false };
        if (comp.isMeasured) {
          measuredCount++;
        }
        if (comp.isDeviant) {
          const devData = {
            id: opt.id,
            title: opt.title,
            origVal: ((typeof window.isSecretOptionKey === "function" && window.isSecretOptionKey(opt.id)) || opt.id === "domain_key" || opt.id === "cdn_cloudflare_key" || /cloudflare_key|domain_key|hash|pswd|password|passwd|secret|token/i.test(String(opt.id || "")))
              ? ((typeof window.maskSecretKey === "function" && comp.rawMeasured) ? window.maskSecretKey(comp.rawMeasured) : (String(comp.currentDisplay || "").length > 12 ? (String(comp.currentDisplay).slice(0,4) + "…" + String(comp.currentDisplay).slice(-4)) : comp.currentDisplay))
              : comp.currentDisplay,
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

    if (measuredCount === 0) {
      const upCount = Object.keys(state.uploadedSettings).length;
      comparisonSummaryCard.style.display = "block";
      comparisonSummaryCard.style.background = "rgba(99, 102, 241, 0.05)";
      comparisonSummaryCard.style.borderColor = "rgba(99, 102, 241, 0.25)";
      if (btnFixAll) btnFixAll.style.display = "none";
      
      comparisonSummaryDesc.innerHTML = `✅ <strong>LiteSpeed-fil inläst (${upCount} parametrar):</strong> Inga explicita avvikelser hittades bland dina ändrade parametrar i .data-filen. Övriga inställningar körs med LiteSpeeds standardvärden.`;
      
      comparisonDiffsList.innerHTML = `
        <div style="display:flex; flex-direction:column; gap:0.6rem; padding: 0.5rem 0;">
          <div style="display:flex; align-items:center; gap:0.5rem; color:var(--color-success); font-size:0.875rem;">
            <span>ℹ️</span> <strong>Slot 7 aktiv:</strong> Alla inställningar nedan jämförs mot din inlästa profil och LSCWP-standard.
          </div>
        </div>
      `;
      return;
    }

    if (totalDeviations === 0) {
      comparisonSummaryCard.style.display = "block";
      comparisonSummaryCard.style.background = "rgba(16, 185, 129, 0.05)";
      comparisonSummaryCard.style.borderColor = "rgba(16, 185, 129, 0.25)";
      if (btnFixAll) btnFixAll.style.display = "none";
      
      comparisonSummaryDesc.innerHTML = `🎉 <strong>100% LSCWP Advanced Preset!</strong> Din uppladdade LiteSpeed-konfiguration (${measuredCount} kontrollerade inställningar) matchar alla våra rekommenderade inställningar och kassaskyddsregler.`;
      
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

              const isTextareaField = opt.id === "js_exclude" || opt.id === "css_exclude" || opt.id === "media_lazy_exc" || opt.id === "drop_uri" || opt.id === "js_delayed_exclude" || opt.id === "optm_dns_prefetch";

              if (isTextareaField) {
                if (orig !== current) diffCount++;
              } else if (opt.id === "optm_js_defer") {
                const origNorm = (orig === "2" || orig === 2) ? 2 : ((orig === "1" || orig === 1 || orig === "on" || orig === true) ? 1 : 0);
                const curNorm = (current === "2" || current === 2) ? 2 : ((current === "1" || current === 1 || current === "on" || current === true) ? 1 : 0);
                if (origNorm !== curNorm) {
                  diffCount++;
                }
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
        } else if (typeof LSCWP_NATIVE_DEFAULTS !== "undefined") {
          exportObj = JSON.parse(JSON.stringify(LSCWP_NATIVE_DEFAULTS));
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
  if (apiSiteUrl && (sessionStorage.getItem("wp_optimizer_api_url") || localStorage.getItem("wp_optimizer_api_url"))) {
    const savedUrl = sessionStorage.getItem("wp_optimizer_api_url") || localStorage.getItem("wp_optimizer_api_url");
    apiSiteUrl.value = savedUrl;
    state.apiUrl = savedUrl;
  }
  if (apiSyncToken && sessionStorage.getItem("wp_optimizer_api_token")) {
    const savedTok = sessionStorage.getItem("wp_optimizer_api_token");
    apiSyncToken.value = savedTok;
    state.apiToken = savedTok;
  }
  // Proactively remove any legacy plaintext tokens from localStorage
  try {
    localStorage.removeItem("wp_optimizer_api_token");
  } catch (e) {}

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
        let response = await fetch(`${url}/wp-json/arewee-optimizer/v1/diagnostics`, {
          method: "GET",
          headers: {
            "X-Optimizer-Token": token,
            "X-WP-Optimizer-Token": token,
            "Authorization": `Bearer ${token}`
          }
        });

        // Fallback to legacy route namespace if server returns 404
        if (response.status === 404) {
          response = await fetch(`${url}/wp-json/wp-optimizer-sync/v1/diagnostics`, {
            method: "GET",
            headers: {
              "X-Optimizer-Token": token,
              "X-WP-Optimizer-Token": token,
              "Authorization": `Bearer ${token}`
            }
          });
        }

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.message || `HTTP fel! Status: ${response.status}`);
        }

        const data = await response.json();
        
        // Store credentials securely in sessionStorage (and preserve URL in localStorage for convenience)
        sessionStorage.setItem("wp_optimizer_api_url", url);
        sessionStorage.setItem("wp_optimizer_api_token", token);
        localStorage.setItem("wp_optimizer_api_url", url);
        // Clean up legacy plaintext token from localStorage if present
        localStorage.removeItem("wp_optimizer_api_token");

        state.apiUrl = url;
        state.apiToken = token;

        // Apply data to state with full normalization across root and data wrapper
        const payload = (data && data.data) ? data.data : (data || {});
        state.sysInfo = payload.sysInfo || payload.sysinfo || data.sysInfo || data.sysinfo;
        state.wooInfo = payload.wooInfo || payload.wooinfo || payload.woocommerce || data.wooInfo || data.woocommerce;
        state.wfInfo = payload.wfInfo || payload.wfinfo || payload.wordfence || data.wfInfo || data.wordfence;
        state.elemInfo = payload.elemInfo || payload.eleminfo || payload.elementor || data.elemInfo || data.elementor;
        state.customCodeInfo = payload.customCodeInfo || payload.customCode || payload.customcode || data.customCode;
        
        const rawSettings = payload.uploadedSettings || payload.lscwp_settings || payload.lscwpSettings || data.uploadedSettings || data.lscwp_settings;
        if (rawSettings) {
          state.uploadedSettings = translateKeysToInternal(rawSettings);
          state.editedSettings = JSON.parse(JSON.stringify(state.uploadedSettings));
        }
        // v2.7.3: live QUIC response headers from sync plugin homepage probe
        const liveHdrs = payload.quicLiveHeaders || payload.quic_live_headers || data.quicLiveHeaders || data.quic_live_headers ||
          (payload.data && (payload.data.quicLiveHeaders || payload.data.quic_live_headers));
        if (liveHdrs && typeof liveHdrs === "object") {
          state.quicLiveHeaders = liveHdrs;
        }
        updateDetectedSiteUrl(url);

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

        const companionVersion = payload.syncPluginVersion || data.syncPluginVersion || "1.0.0";
        const targetVersion = "2.7.3";
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
        await copyToClipboard(md);
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
        await copyToClipboard(md);
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
        await copyToClipboard(phpSnippet);
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

  // --- VISUAL CONFLICT TOPOLOGY DRAW ENGINE (v2.4.20) ---
  function drawTopologyMap() {
    const container = document.getElementById("topology-nodes");
    const svg = document.getElementById("topology-svg");
    if (!container || !svg) return;

    container.innerHTML = "";
    svg.innerHTML = "";

    // Determine nodes active/inactive status and dynamic theme label
    const activeThemeObj = state.themeInfo || (state.sysInfo && state.sysInfo["wp-active-theme"]);
    const rawThemeName = activeThemeObj?.name || "";
    const themeLabel = rawThemeName ? (rawThemeName.length > 18 ? rawThemeName.substring(0, 16) + "…" : rawThemeName) : "Tema";

    const nodeConfigs = {
      wp: { id: "node-wp", label: "WordPress Core", icon: "🌐", x: 50, y: 52, active: true },
      lscwp: { 
        id: "node-lscwp", 
        label: "LiteSpeed Cache", 
        icon: "⚡", 
        x: 50, 
        y: 12, 
        active: !!state.uploadedSettings || (state.sysInfo && state.sysInfo['wp-plugins-active'] && Object.keys(state.sysInfo['wp-plugins-active']).some(k => k.toLowerCase().includes('litespeed')))
      },
      theme: {
        id: "node-theme",
        label: themeLabel,
        icon: "🎭",
        x: 30,
        y: 46,
        active: !!state.themeInfo || !!state.sysInfo?.['wp-active-theme'] || (state.sysInfo && state.sysInfo['wp-plugins-active'] && Object.keys(state.sysInfo['wp-plugins-active']).some(k => k.toLowerCase().includes('astra') || k.toLowerCase().includes('blocksy') || k.toLowerCase().includes('hello')))
      },
      woo: { 
        id: "node-woo", 
        label: "WooCommerce", 
        icon: "🛒", 
        x: 20, 
        y: 80, 
        active: !!state.wooInfo || (state.sysInfo && state.sysInfo['wp-plugins-active'] && Object.keys(state.sysInfo['wp-plugins-active']).some(k => k.toLowerCase().includes('woocommerce')))
      },
      elem: { 
        id: "node-elem", 
        label: "Elementor", 
        icon: "🎨", 
        x: 84, 
        y: 56, 
        active: !!state.elemInfo || (state.sysInfo && state.sysInfo['wp-plugins-active'] && Object.keys(state.sysInfo['wp-plugins-active']).some(k => k.toLowerCase().includes('elementor')))
      },
      wf: { 
        id: "node-wf", 
        label: "Wordfence Security", 
        icon: "🛡️", 
        x: 16, 
        y: 22, 
        active: !!state.wfInfo || (state.sysInfo && state.sysInfo['wp-plugins-active'] && Object.keys(state.sysInfo['wp-plugins-active']).some(k => k.toLowerCase().includes('wordfence')))
      },
      scm: { 
        id: "node-scm", 
        label: "SCM", 
        icon: "💻", 
        x: 84, 
        y: 22, 
        active: !!state.scmInfo || !!state.customCodeInfo || !!state.customCss || (state.sysInfo && state.sysInfo['wp-plugins-active'] && Object.keys(state.sysInfo['wp-plugins-active']).some(k => k.toLowerCase().includes('scm') || k.toLowerCase().includes('code-snippets')))
      },
      ctm: {
        id: "node-ctm",
        label: "CTM",
        icon: "🏷️",
        x: 50,
        y: 84,
        active: !!(state.sysInfo && state.sysInfo['wp-plugins-active'] && Object.keys(state.sysInfo['wp-plugins-active']).some(k => k.toLowerCase().includes('ctm') || k.toLowerCase().includes('consent') || k.toLowerCase().includes('tag-manager')))
      }
    };

    const allAlerts = [
      ...(state.analysisResults?.alerts || []),
      ...(state.analysisResults?.customCodeAlerts || []),
      ...(state.analysisResults?.customCssAlerts || [])
    ];

    function mapComponentKey(c) {
      if (!c) return "wp";
      const lc = c.toLowerCase();
      if (lc === "theme" || lc === "tema" || lc === "astra" || lc === "blocksy" || lc === "hello") return "theme";
      if (lc === "elementor" || lc === "elem") return "elem";
      if (lc === "wordfence" || lc === "wf") return "wf";
      if (lc === "woocommerce" || lc === "woo") return "woo";
      if (lc === "litespeed" || lc === "lscwp") return "lscwp";
      if (lc === "scm" || lc === "customcode" || lc === "css" || lc === "cc") return "scm";
      if (lc === "ctm" || lc === "consent" || lc === "tagmanager") return "ctm";
      return "wp";
    }

    // Determine status per node: 'danger' > 'warning' > 'optimal' > 'inactive'
    const nodeStatus = {};
    Object.keys(nodeConfigs).forEach(k => {
      if (!nodeConfigs[k].active) {
        nodeStatus[k] = "inactive";
        return;
      }
      const nodeAlerts = allAlerts.filter(a => {
        if (a.components && a.components.length > 0) {
          return a.components.some(comp => mapComponentKey(comp) === k);
        }
        return mapComponentKey(a.component) === k;
      });

      if (nodeAlerts.some(a => a.type === "danger")) {
        nodeStatus[k] = "danger";
      } else if (nodeAlerts.some(a => a.type === "warning")) {
        nodeStatus[k] = "warning";
      } else {
        nodeStatus[k] = "optimal";
      }
    });

    // Helper to determine line relationship between two nodes
    function getLineType(fromKey, toKey) {
      if (nodeStatus[fromKey] === "inactive" || nodeStatus[toKey] === "inactive") {
        return "normal";
      }
      const pairAlerts = allAlerts.filter(a => {
        if (!a.components || a.components.length < 2) return false;
        const comps = a.components.map(mapComponentKey);
        return comps.includes(fromKey) && comps.includes(toKey);
      });

      if (pairAlerts.some(a => a.type === "danger")) return "danger";
      if (pairAlerts.some(a => a.type === "warning")) return "warning";
      if (nodeStatus[fromKey] === "optimal" && nodeStatus[toKey] === "optimal") return "optimal";
      return "normal";
    }

    const width = container.clientWidth || 600;
    const height = container.clientHeight || 260;

    const nodes = {};
    Object.keys(nodeConfigs).forEach(key => {
      const cfg = nodeConfigs[key];
      nodes[key] = {
        id: cfg.id,
        label: cfg.label,
        icon: cfg.icon,
        active: cfg.active,
        status: nodeStatus[key],
        px: (cfg.x / 100) * width,
        py: (cfg.y / 100) * height
      };
    });

    // Connection lines
    const linePairs = [
      { from: "wp", to: "theme" },
      { from: "wp", to: "lscwp" },
      { from: "wp", to: "woo" },
      { from: "wp", to: "elem" },
      { from: "wp", to: "wf" },
      { from: "wp", to: "scm" },
      { from: "wp", to: "ctm" },
      { from: "theme", to: "lscwp" },
      { from: "theme", to: "elem" },
      { from: "theme", to: "woo" },
      { from: "lscwp", to: "wf" },
      { from: "lscwp", to: "elem" },
      { from: "lscwp", to: "woo" },
      { from: "lscwp", to: "scm" },
      { from: "lscwp", to: "ctm" },
      { from: "elem", to: "woo" },
      { from: "elem", to: "ctm" },
      { from: "scm", to: "woo" }
    ];

    linePairs.forEach(l => {
      if (nodes[l.from] && nodes[l.to]) {
        const nA = nodes[l.from];
        const nB = nodes[l.to];
        const lineType = getLineType(l.from, l.to);
        const lineEl = document.createElementNS("http://www.w3.org/2000/svg", "line");
        lineEl.setAttribute("x1", nA.px);
        lineEl.setAttribute("y1", nA.py);
        lineEl.setAttribute("x2", nB.px);
        lineEl.setAttribute("y2", nB.py);
        lineEl.setAttribute("class", `topology-line ${lineType}`);
        svg.appendChild(lineEl);
      }
    });

    // Render div nodes
    Object.keys(nodes).forEach(key => {
      const node = nodes[key];
      const nodeDiv = document.createElement("div");
      nodeDiv.className = `topology-node ${node.status}`;
      nodeDiv.style.left = `${node.px}px`;
      nodeDiv.style.top = `${node.py}px`;

      let statusBadgeIcon = "";
      if (node.status === "danger") statusBadgeIcon = `<span style="position: absolute; top: -4px; right: -4px; font-size: 0.8rem; background: rgba(0,0,0,0.8); border-radius: 50%;">🚨</span>`;
      else if (node.status === "warning") statusBadgeIcon = `<span style="position: absolute; top: -4px; right: -4px; font-size: 0.8rem; background: rgba(0,0,0,0.8); border-radius: 50%;">⚠️</span>`;
      else if (node.status === "optimal") statusBadgeIcon = `<span style="position: absolute; top: -4px; right: -4px; font-size: 0.75rem; background: rgba(0,0,0,0.8); border-radius: 50%;">🟢</span>`;

      nodeDiv.innerHTML = `
        <span class="topology-node-icon">${node.icon}</span>
        ${statusBadgeIcon}
        <div class="topology-node-label">${escapeHtml(node.label)}</div>
      `;
      
      nodeDiv.addEventListener("click", () => {
        if (key === "lscwp") {
          switchMasterView("settings");
        } else if (key === "scm") {
          state.activeRiskFilter = "scm";
          switchMasterView("risks");
          renderAlerts();
        } else if (key === "theme") {
          state.activeRiskFilter = "theme";
          switchMasterView("risks");
          renderAlerts();
        } else if (key === "ctm") {
          state.activeRiskFilter = "ctm";
          switchMasterView("risks");
          renderAlerts();
        } else if (key === "woo") {
          state.activeRiskFilter = "woocommerce";
          switchMasterView("risks");
          renderAlerts();
        } else if (key === "elem") {
          state.activeRiskFilter = "elementor";
          switchMasterView("risks");
          renderAlerts();
        } else if (key === "wf") {
          state.activeRiskFilter = "wordfence";
          switchMasterView("risks");
          renderAlerts();
        } else if (key === "server" || key === "wp") {
          state.activeRiskFilter = "server";
          switchMasterView("risks");
          renderAlerts();
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
    const hasAnySource = !!(state.sysInfo || state.uploadedSettings || state.wooInfo || state.wfInfo || state.elemInfo || state.themeInfo || state.customCodeInfo);
    if (!hasAnySource || !state.analysisResults) {
      alert("Ingen aktiv analys hittades. Ladda upp data och starta en analys först.");
      return;
    }

    const defaultName = state.apiUrl ? state.apiUrl.replace(/^https?:\/\//, "") : (state.sysInfo && state.sysInfo['wp-active-theme'] ? `${state.sysInfo['wp-active-theme'].name} Site` : (state.uploadedSettings && (state.uploadedSettings.site_url || state.uploadedSettings.home_url) ? (state.uploadedSettings.site_url || state.uploadedSettings.home_url).replace(/^https?:\/\//, "") : "LiteSpeed Profil"));
    const name = prompt("Ange ett namn för att spara denna sajtprofil i historiken:", defaultName);
    if (name === null) return;
    
    const profileName = name.trim() || defaultName;
    const healthScoreValEl = document.getElementById("health-score-value");
    const healthScore = healthScoreValEl ? parseInt(healthScoreValEl.textContent, 10) : 100;

    const env = state.analysisResults.environment || {};

    const profile = {
      id: "profile_" + Date.now(),
      name: profileName,
      timestamp: formatTimestamp(new Date()),
      healthScore: healthScore,
      wpVersion: (state.sysInfo && state.sysInfo['wp-core']) ? state.sysInfo['wp-core'].version : (env.wpVersion || '6.7.2'),
      phpVersion: (state.sysInfo && state.sysInfo['wp-server']) ? state.sysInfo['wp-server'].php_version : (env.phpVersion || '8.2'),
      theme: (state.sysInfo && state.sysInfo['wp-active-theme']) ? state.sysInfo['wp-active-theme'].name : (env.activeTheme || 'Standard'),
      pluginsCount: (state.sysInfo && state.sysInfo['wp-plugins-active']) ? Object.keys(state.sysInfo['wp-plugins-active']).length : (state.uploadedSettings ? 1 : 0),
      sysInfo: state.sysInfo,
      wooInfo: state.wooInfo,
      wfInfo: state.wfInfo,
      themeInfo: state.themeInfo,
      elemInfo: state.elemInfo,
      customCodeInfo: state.customCodeInfo,
      customCss: state.customCss,
      uploadedSettings: state.uploadedSettings,
      editedSettings: state.editedSettings,
      detectedSiteUrl: state.detectedSiteUrl,
      apiUrl: state.apiUrl,
      uploadMetadata: state.uploadMetadata,
      appVersion: APP_VERSION
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
      if (e.name === "QuotaExceededError" || e.code === 22) {
        if (historyLibrary.length > 1) {
          historyLibrary.shift(); // Drop oldest entry
          try {
            localStorage.setItem("wp_optimizer_history", JSON.stringify(historyLibrary));
            alert("⚠️ Webbläsarens lokala minne var fullt. Äldsta profilen togs bort automatiskt.");
            return;
          } catch (e2) {}
        }
      }
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

  function loadProfile(id) {
    const profile = historyLibrary.find(p => p.id === id);
    if (!profile) return;

    if (confirm(`Vill du läsa in profilen "${profile.name}" som det aktuella arbetstillståndet? Nuvarande osparat arbete kommer att skrivas över.`)) {
      state.sysInfo = profile.sysInfo;
      state.wooInfo = profile.wooInfo;
      state.wfInfo = profile.wfInfo;
      // Sanitize Wordfence info to ensure current best practices
      if (state.wfInfo && typeof state.wfInfo === "object") {
        if (state.wfInfo.disable_live_traffic === undefined && state.wfInfo.live_traffic_disabled !== undefined) {
          state.wfInfo.disable_live_traffic = state.wfInfo.live_traffic_disabled;
        }
      }
      state.themeInfo = profile.themeInfo || null;
      state.elemInfo = profile.elemInfo;
      // v2.7.3: clear stale google_fonts:true from pre-2.7.2 history (no explicit experiment)
      if (state.elemInfo && typeof window.sanitizeElementorGoogleFonts === "function") {
        window.sanitizeElementorGoogleFonts(state.elemInfo);
      } else if (state.elemInfo && state.elemInfo.google_fonts === true) {
        const exps = Array.isArray(state.elemInfo.experiments) ? state.elemInfo.experiments : [];
        const hasExplicit = exps.some(e => {
          const low = String(e).toLowerCase();
          return (low.includes("google") && (low.includes("font") || low.includes("typsnitt"))) && !low.includes("custom");
        });
        if (!hasExplicit) state.elemInfo.google_fonts = false;
      }
      state.customCodeInfo = profile.customCodeInfo;
      state.customCss = profile.customCss || "";
      state.uploadedSettings = profile.uploadedSettings;
      state.editedSettings = JSON.parse(JSON.stringify(profile.editedSettings || {}));
      state.apiUrl = profile.apiUrl || "";
      if (profile.detectedSiteUrl) {
        state.detectedSiteUrl = profile.detectedSiteUrl;
      }
      state.uploadMetadata = profile.uploadMetadata || {
        sysInfo: { name: profile.name + " (Historik WP)", timestamp: profile.timestamp },
        wooInfo: profile.wooInfo ? { name: "Historik WC", timestamp: profile.timestamp } : { name: "", timestamp: "" },
        wfInfo: profile.wfInfo ? { name: "Historik Wordfence", timestamp: profile.timestamp } : { name: "", timestamp: "" },
        themeInfo: profile.themeInfo ? { name: "Historik Tema", timestamp: profile.timestamp } : { name: "", timestamp: "" },
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
    const checkSet = (info, badge, key, slotKey) => {
      if (!badge) return;
      if (info) {
        badge.className = "file-status loaded";
        badge.textContent = "✓ Inläst";
        badge.title = state.uploadMetadata[key]?.name || 'Inläst';
        updateSlotFileBadge(slotKey, state.uploadMetadata[key]?.name || `upload ${state.uploadMetadata[key]?.timestamp || ''}`, true);
      } else {
        badge.className = "file-status";
        badge.title = "";
        if (key === "sysInfo") badge.textContent = "Krävs *";
        else if (key === "customCodeInfo") badge.textContent = "SCM JSON / PHP";
        else if (key === "uploadedSettings") badge.textContent = "Jämför .data";
        else badge.textContent = "Valfritt";
        updateSlotFileBadge(slotKey, null, false);
      }
    };
    checkSet(state.sysInfo, sysInfoStatus, "sysInfo", "sysinfo");
    checkSet(state.wooInfo, woocommerceStatus, "wooInfo", "woocommerce");
    checkSet(state.wfInfo, wordfenceStatus, "wfInfo", "wordfence");
    checkSet(state.elemInfo, elementorStatus, "elemInfo", "elementor");
    checkSet(state.customCodeInfo, customcodeStatus, "customCodeInfo", "customcode");
    checkSet(state.uploadedSettings, settingsStatus, "uploadedSettings", "settings");
    
    // Theme Slot 4: Check explicit themeInfo or extract directly from sysInfo (wp-active-theme)
    const activeThemeObj = state.themeInfo || (state.sysInfo && state.sysInfo["wp-active-theme"]);
    if (activeThemeObj && themeStatus) {
      themeStatus.className = "file-status loaded";
      const rawTName = activeThemeObj.name || (state.analysisResults && state.analysisResults.environment && state.analysisResults.environment.activeTheme) || "Aktivt tema";
      const cleanTName = rawTName.split("(")[0].trim();
      themeStatus.textContent = `✓ Inläst (${cleanTName})`;
      themeStatus.title = `Inläst från WP-system (${rawTName})`;
      updateSlotFileBadge("theme", cleanTName, true);
    } else {
      checkSet(state.themeInfo, themeStatus, "themeInfo", "theme");
    }
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
            <div class="history-card-appver" style="font-size:0.68rem; color:#a5b4fc; margin-top:0.15rem;">AreWee v${escapeHtml(p.appVersion || "—")}</div>
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
        
        const invalidIndex = imported.findIndex(p => !p || typeof p !== "object" || !p.hasOwnProperty("id") || !p.hasOwnProperty("name"));
        if (invalidIndex !== -1) {
          throw new Error(`Profil #${invalidIndex + 1} saknar nödvändiga fält (id och name).`);
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

  function resolveProfileSetting(profile, setting) {
    if (!profile) return "Ej konf";

    const aliases = setting.aliases || [setting.id];

    // 1. First check editedSettings (active user selections)
    if (profile.editedSettings) {
      for (const alias of aliases) {
        if (profile.editedSettings[alias] !== undefined && profile.editedSettings[alias] !== null && profile.editedSettings[alias] !== "") {
          return profile.editedSettings[alias];
        }
      }
    }

    // 2. Then check uploadedSettings (direct top-level and inside .options)
    if (profile.uploadedSettings) {
      for (const alias of aliases) {
        if (profile.uploadedSettings[alias] !== undefined && profile.uploadedSettings[alias] !== null && profile.uploadedSettings[alias] !== "") {
          return profile.uploadedSettings[alias];
        }
      }
      if (profile.uploadedSettings.options) {
        for (const alias of aliases) {
          if (profile.uploadedSettings.options[alias] !== undefined && profile.uploadedSettings.options[alias] !== null && profile.uploadedSettings.options[alias] !== "") {
            return profile.uploadedSettings.options[alias];
          }
        }
      }
    }

    // 3. Fallback checks for specific subsystems
    if (setting.type === "woo_hpos") {
      if (profile.wooInfo) {
        if (profile.wooInfo.hpos_enabled === true || profile.wooInfo.order_datastore === "OrdersTableDataStore") return 1;
        if (profile.wooInfo.hpos_enabled === false) return 0;
      }
      if (profile.sysInfo && profile.sysInfo['woocommerce']) {
        const woo = profile.sysInfo['woocommerce'];
        if (woo.order_datastore && String(woo.order_datastore).includes("OrdersTableDataStore")) return 1;
        if (woo.custom_order_tables_in_sync) return 1;
      }
    }

    if (setting.type === "elem_css_print_method") {
      if (profile.elemInfo && profile.elemInfo.css_print_method) {
        return profile.elemInfo.css_print_method;
      }
    }

    if (setting.id === "cache_object") {
      if (profile.sysInfo && profile.sysInfo['wp-server']) {
        const srv = profile.sysInfo['wp-server'];
        if (srv.redis_version || srv.memcached_version) {
          return 1;
        }
      }
    }

    return "Ej konf";
  }

  function formatComparisonValue(val, keyId) {
    if (val === "Ej konf" || val === undefined || val === null) {
      return `<span style="color: var(--text-muted); opacity: 0.7;">Ej konf</span>`;
    }

    if (keyId === "optm_js_defer") {
      if (val === 2 || val === "2") return `<span style="color: #38bdf8; font-weight: 600;">⚡ PÅ (Delayed)</span>`;
      if (val === 1 || val === "1" || val === "on" || val === true) return `<span style="color: var(--color-success); font-weight: 600;">✅ PÅ (Deferred)</span>`;
      if (val === 0 || val === "0" || val === "off" || val === false) return `<span style="color: var(--color-danger); font-weight: 600;">❌ AV (Inaktiv)</span>`;
      return escapeHtml(String(val));
    }

    if (keyId === "elem_css_print_method") {
      if (val === "external" || val === "file") return `<span style="color: var(--color-success); font-weight: 600;">Extern fil</span>`;
      if (val === "internal") return `<span style="color: var(--color-warning); font-weight: 600;">Inbäddad (Intern)</span>`;
      return escapeHtml(String(val));
    }

    if (keyId === "drop_uri" || keyId === "js_exclude" || keyId === "css_exclude") {
      const lines = String(val).split(/[\r\n]+/).map(s => s.trim()).filter(Boolean);
      if (lines.length === 0) return `<span style="color: var(--text-muted);">Inga undantag</span>`;
      return `<span style="font-weight: 600; color: #cbd5e1;">${lines.length} st rader</span>`;
    }

    // Standard toggles (1 / 0)
    if (val === 1 || val === "1" || val === "on" || val === true) {
      return `<span style="color: var(--color-success); font-weight: 600;">✅ PÅ (Aktiv)</span>`;
    }
    if (val === 0 || val === "0" || val === "off" || val === false) {
      return `<span style="color: var(--color-danger); font-weight: 600;">❌ AV (Inaktiv)</span>`;
    }

    return escapeHtml(String(val));
  }

  function closeComparisonResult() {
    if (comparisonResultTableWrapper) {
      comparisonResultTableWrapper.innerHTML = "";
      comparisonResultTableWrapper.style.display = "none";
    }
    if (compareSelectA) compareSelectA.value = "";
    if (compareSelectB) compareSelectB.value = "";
    if (btnCompareClose) btnCompareClose.style.display = "none";
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
            <td><span class="comparison-diff-badge" style="background:rgba(255,255,255,0.05); font-size:0.85rem; font-weight:700;">${isNaN(parseInt(profA.healthScore, 10)) ? 100 : parseInt(profA.healthScore, 10)}%</span></td>
            <td><span class="comparison-diff-badge" style="background:rgba(255,255,255,0.05); font-size:0.85rem; font-weight:700;">${isNaN(parseInt(profB.healthScore, 10)) ? 100 : parseInt(profB.healthScore, 10)}%</span></td>
            <td style="text-align: center;">
              <span class="comparison-diff-badge ${(profA.healthScore || 100) === (profB.healthScore || 100) ? 'match' : 'diff'}">
                ${(profA.healthScore || 100) === (profB.healthScore || 100) ? 'Lika' : 'Diff'}
              </span>
            </td>
          </tr>
          <tr>
            <td><strong>AreWee-app version</strong></td>
            <td>${escapeHtml(profA.appVersion || "—")}</td>
            <td>${escapeHtml(profB.appVersion || "—")}</td>
            <td style="text-align: center;">
              <span class="comparison-diff-badge ${(profA.appVersion || "") === (profB.appVersion || "") ? 'match' : 'diff'}">
                ${(profA.appVersion || "") === (profB.appVersion || "") ? 'Lika' : 'Diff'}
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
      { id: "cache", aliases: ["cache", "cache-cache", "cache_page"], label: "⚡ LiteSpeed Sidcache" },
      { id: "optm_css_min", aliases: ["optm_css_min", "optm-css_min", "css_minify", "optm_css"], label: "CSS Minifiering" },
      { id: "optm_css_comb", aliases: ["optm_css_comb", "optm-css_comb", "css_combine", "optm_css_comb_ext_inl"], label: "CSS Kombinering" },
      { id: "optm_js_min", aliases: ["optm_js_min", "optm-js_min", "js_minify", "optm_js"], label: "JS Minifiering" },
      { id: "optm_js_comb", aliases: ["optm_js_comb", "optm-js_comb", "js_combine", "optm_js_comb_ext_inl"], label: "JS Kombinering" },
      { id: "optm_js_defer", aliases: ["optm_js_defer", "optm-js_defer", "js_defer", "optm-js_delayed", "optm_js_delayed"], label: "JS Defer (Skjut upp)" },
      { id: "media_lazy", aliases: ["media_lazy", "optm_media_lazy", "optm-media_lazy", "media-lazy"], label: "Bild Lazy Load" },
      { id: "cache_object", aliases: ["cache_object", "cache-object", "object_cache", "object", "cache-object_kind", "cache_object_kind"], label: "Objekt-cache" },
      { id: "cache_browser", aliases: ["cache_browser", "cache-browser", "browser_cache"], label: "Webbläsarcache" },
      { id: "woo_hpos", aliases: ["woo_hpos", "hpos"], label: "WooCommerce HPOS", type: "woo_hpos" },
      { id: "elem_css_print_method", aliases: ["elem_css_print_method", "css_print_method"], label: "Elementor CSS-metod", type: "elem_css_print_method" },
      { id: "drop_uri", aliases: ["drop_uri", "cache-exc", "cache_exc", "cache-drop_uri", "cache_drop_uri", "cache-uri_exc"], label: "Exkluderade URL-sökvägar (drop_uri)" },
      { id: "js_exclude", aliases: ["js_exclude", "optm-js_exc", "optm_js_exc", "optm-js_exclude"], label: "Undantagen JS (js_exclude)" }
    ];

    settingsToCompare.forEach(setting => {
      const valA = resolveProfileSetting(profA, setting);
      const valB = resolveProfileSetting(profB, setting);

      const strA = formatComparisonValue(valA, setting.id);
      const strB = formatComparisonValue(valB, setting.id);

      const isNormEqual = (v1, v2, settingId) => {
        if (v1 === v2) return true;
        if (v1 === "Ej konf" || v2 === "Ej konf") return v1 === v2;
        if (settingId === "optm_js_defer") {
          const d1 = (v1 === 2 || v1 === "2") ? 2 : ((v1 === 1 || v1 === "1" || v1 === "on" || v1 === true) ? 1 : 0);
          const d2 = (v2 === 2 || v2 === "2") ? 2 : ((v2 === 1 || v2 === "1" || v2 === "on" || v2 === true) ? 1 : 0);
          return d1 === d2;
        }
        const norm1 = (v1 === 1 || v1 === "1" || v1 === "on" || v1 === true) ? 1 : ((v1 === 0 || v1 === "0" || v1 === "off" || v1 === false) ? 0 : String(v1).trim());
        const norm2 = (v2 === 1 || v2 === "1" || v2 === "on" || v2 === true) ? 1 : ((v2 === 0 || v2 === "0" || v2 === "off" || v2 === false) ? 0 : String(v2).trim());
        return norm1 === norm2;
      };

      const isMatch = isNormEqual(valA, valB, setting.id);

      tableHtml += `
        <tr>
          <td>${setting.label}</td>
          <td>${strA}</td>
          <td>${strB}</td>
          <td style="text-align: center;">
             <span class="comparison-diff-badge ${isMatch ? 'match' : 'diff'}">
               ${isMatch ? 'Lika' : 'Diff'}
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
    if (btnCompareClose) btnCompareClose.style.display = "flex";
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
        state.themeInfo = null;
        state.elemInfo = null;
        state.scmInfo = null;
        state.customCodeInfo = null;
        state.customCss = "";
        state.uploadedSettings = null;
        state.editedSettings = {};
        state.analysisResults = null;
        state.uploadMetadata = {};
        state.apiUrl = "";
        state.settingsSortBy = "deviations";
        state.settingsSearchQuery = "";

        // Reset file inputs and badges
        ["sysinfo", "woocommerce", "wordfence", "theme", "elementor", "customcode", "settings"].forEach(slot => {
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
          updateSlotFileBadge(slot, null, false);
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

  // Bind individual slot clear buttons
  document.querySelectorAll(".btn-slot-clear").forEach(btn => {
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      const slot = btn.dataset.slotClear;
      clearSlot(slot);
    });
  });

  // Bind History buttons event listeners
  if (btnSaveCurrentProfile) btnSaveCurrentProfile.addEventListener("click", saveCurrentProfile);
  if (btnExportHistory) btnExportHistory.addEventListener("click", exportHistoryLibrary);
  if (btnImportHistoryTrigger) btnImportHistoryTrigger.addEventListener("click", () => historyImportFile.click());
  if (historyImportFile) historyImportFile.addEventListener("change", handleHistoryImport);
  if (btnCompareExecute) btnCompareExecute.addEventListener("click", executeComparison);
  if (btnCompareClose) btnCompareClose.addEventListener("click", closeComparisonResult);

  // Initial rendering
  renderHistoryLibrary();
  updateCompareDropdowns();

  // Test/debug exports (v2.7.3)
  try {
    window.detectPastedFormat = detectPastedFormat;
    window.escapeHtml = escapeHtml;
    window.APP_VERSION = APP_VERSION;
    window.closeComparisonResult = closeComparisonResult;
    window.buildAnalyzeLiveContext = buildAnalyzeLiveContext;
    window.probeQuicLiveHeaders = probeQuicLiveHeaders;
  } catch (e) {}


  // --- UNSAVED DATA & RELOAD PROTECTION ---
  window.addEventListener("beforeunload", (e) => {
    const hasActiveData = !!(
      state.sysInfo || 
      state.uploadedSettings || 
      state.wooInfo || 
      state.wfInfo || 
      state.elemInfo || 
      state.themeInfo || 
      state.customCodeInfo ||
      (state.customCss && state.customCss.trim().length > 0)
    );
    if (hasActiveData) {
      e.preventDefault();
      e.returnValue = "";
      return "";
    }
  });

  // Expose parsers to window for modularity and testing
  if (typeof window !== "undefined") {
    window.parseElementorStatus = parseElementorStatus;
    window.parseSystemInfoText = parseSystemInfoText;
    window.parseWooCommerceStatus = parseWooCommerceStatus;
    window.parseWordfenceDiagnostic = parseWordfenceDiagnostic;
    window.parseCustomCodeText = parseCustomCodeText;
  }
});
