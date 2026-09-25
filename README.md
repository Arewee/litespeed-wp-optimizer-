# LiteSpeed Cache & WordPress Optimizer Dashboard (v2.7.3)

En premium, interaktiv och modern optimeringspanel för att analysera WordPress-installationer, WooCommerce-kompatibilitet samt konfigurera optimala inställningar för **LiteSpeed Cache (LSCWP)**.

Verktyget är byggt med ett modernt, mörkt "glassmorphism"-gränssnitt och hjälper dig att gå från rå systemdata till en skräddarsydd, optimal LiteSpeed-konfiguration.

## 🚀 Huvudfunktioner
- **📊 Översikt & Hälsostatus**: Dynamisk, glödande cirkulär mätare för "Health Score" (0–100) baserad på dina uppladdade filer, WooCommerce-kompatibilitet och WordPress-version.
- **🛡️ Risker & Kompatibilitetsanalys**: Automatisk identifiering av kritiska källkodsrisker, felaktiga WooCommerce-inställningar (t.ex. kassa/lazyload-konflikter) samt framtidssäkring inför HPOS (High-Performance Order Storage).
- **⚙️ LSCWP Jämförelse & Export**: Interaktiv panel som visar dina nuvarande inställningar sida vid sida med våra rekommenderade inställningar. Skillnader färgkodas (Optimal vs. Avvikelse) för maximal tydlighet.
- **📥 Smidig Export**: Exportera din skräddarsydda profil som en färdig `litespeed.data`-fil som du kan importera direkt i WordPress under *LiteSpeed Cache -> Verktyg -> Importera/Exportera*.

---

## 🛠️ Rekommenderat Arbetsflöde: Användning av Presets (Bästa praxis)

Eftersom LiteSpeed Cache innehåller över 100 avancerade inställningar (såsom CDN, crawlers, avancerade cacheregler etc.) som inte direkt berörs av den grundläggande källkodsanalysen, är det **bästa praxis** att kombinera LiteSpeeds inbyggda mallar (Presets) med vår Optimizer-app.

Följ dessa steg för ett perfekt resultat:

### 1. Applicera en grund-preset i WordPress
Innan du gör något annat, applicera en av LiteSpeeds officiella presets för att sätta en stabil och säker grund för hela webbplatsen:
1. Gå till **LiteSpeed Cache -> Verktyg -> Presets** i din WordPress-meny.
2. Välj en lämplig nivå, till exempel **Advanced (Rekommenderas)** eller **Aggressive**.
3. Klicka på **Apply Preset**.

### 2. Exportera din grundkonfiguration
1. Gå till fliken **Importera/Exportera** under samma meny (*LiteSpeed Cache -> Verktyg*).
2. Klicka på **Exportera** för att ladda ner din nuvarande konfiguration. Du får en fil som heter något i stil med `litespeed.data`.

### 3. Kör analysen i Optimizer-appen
1. Öppna denna app och ladda upp dina filer (källkodsanalys, WooCommerce-status, samt din nyligen exporterade `litespeed.data`-fil i slot 7).
   - *Tips:* Om du startar en helt ny sajt och inte har någon `litespeed.data`-fil än, lämnar du bara Slot 7 tom. Appen kommer då automatiskt att generera en optimal profil från scratch!
2. Gå till fliken **LSCWP Inställningar** för att se rekommendationer skräddarsydda efter din sajts unika källkod.
3. Anpassa inställningarna direkt i appen vid behov.

### 4. Exportera och Importera tillbaka till WordPress
1. Klicka på **Exportera optimerad .data-fil** längst ner i appen.
2. Appen slår samman dina visuella val med din ursprungliga fil, vilket gör att alla övriga 100+ inställningar (CDN, databasscheman osv.) behålls intakta.
3. Gå tillbaka till WordPress under **LiteSpeed Cache -> Verktyg -> Importera/Exportera**.
4. Välj den nya optimerade filen du laddade ner från appen och klicka på **Importera**.

**Klart! Din sajt är nu maximalt optimerad och helt fri från kända källkodskonflikter!** 🌟

---

## 🗺️ Roadmap & Kommande Versioner

### 🔧 Hotfix v2.6.10.2: Policy/Context för Google Fonts, VPI-kontext & Uppdateringsnotiser
- **Google Fonts (Ta bort / optm_ggfonts_rm):** PÅ klassificeras nu som **🔵 Policy/Context** (inte röd avvikelse eller poängavdrag) för sajter som avsiktligt tagit bort Google Fonts för GDPR eller lokal hosting. Trafikljus visar neutral/grön konsensus istället för 3 röda prickar.
- **Generera VPI (media_vpi):** Kontextberoende utvärdering i relation till LiteSpeed Lazy Load (`media_lazy`). Om LiteSpeed Lazy är AV utvärderas `media_vpi = AV` som **🟢 Optimal (Inaktiv vid WP Native Lazy)** utan QUIC.cloud-krav eller poängavdrag.
- **JS Delayed Exclude vid Defer:** Garanterat uppmätt status (`isMeasured: true`) med visning **🟢 Optimal (Inaktiv vid Defer)** även när fältet utelämnats ur `.data`-filen, vilket förhindrar felaktiga "⚪ Ej uppmätt"-brickor.
- **Ecosystem Uppdateringsnotis:** Lade till en rådgivande notis (`scoreImpact: 0`) under konflikter/varningar som upplyser när nyare stabila versioner finns tillgängliga i ekosystemet (t.ex. WooCommerce, Elementor, WordPress Core) utan att sänka hälsopoängen.

### 🔧 Hotfix v2.6.10.1: SCM scoreImpact, CSS Async cockpit & Elementor explicit off
- **SCM Rå HTML/JS:** Alert behåller `type: "info"` och sätter explicit `scoreImpact: 0` så hälsopoängen inte påverkas.
- **Cockpit CSS:** Async CSS PÅ medan rekommendation är AV → status **warning** ("Async CSS aktiv (avråds)"); Optimal endast när Combine AV, Async AV och Minify OK.
- **Elementor ≥3.16:** `asset_loading`/`css_loading` som `false`/`0`/`"0"`/inactive räknas som explicit av → avvikelse (inte Optimal); `null`/saknad → Optimal (inbyggd i Core).

### 🚀 Release v2.6.10: 1:1 Page Optimization-paritet, Kontexthantering & UX-justeringar
- **JS Defer vs Delay:** Fixat vilseledande varningar för `js_delayed_exclude` när sajten kör Defer (`optm_js_defer = 1`). Textarea visar `🟢 Inaktiv (N/A)` istället för felaktigt `❌ AV (0 rader)` och guidetexten är differentierad per fält.
- **WP Native Lazy Load Paritet:** När LiteSpeeds egen Lazy Load (`media_lazy`) är AV (0) flaggas inte längre saknade `media_lazy_exc`-undantag som avvikelser eller poängavdrag, eftersom WordPress inbyggda Lazy Load hanterar sidan.
- **Elementor Core Inläsningsstatus:** Korrigerat experiment-parsern för Elementor $\ge 3.16$ och $4.x$ så att `elem_asset_loading` och `elem_css_loading` korrekt utvärderas till **🟢 Optimal (Inbyggd i Core)** utan onödiga avvikelser.
- **Utökad 1:1 Paritet för CSS & JS:** Lagt till kort och export för `optm_ucss`, `optm_ucss_inline`, `optm_css_comb_ext_inl`, `optm_ccss_per_url`, `optm_css_async_inline`, `optm_ggfonts_async`, `optm_ggfonts_rm`, `optm_js_comb_ext_inl`, `media_vpi`, `optm_qs_rm` och `optm_dns_prefetch`.
- **Skydd mot riskabla Preset-inställningar:** Synliggör CSS/JS Combine och External + Inline som `AV (0)` så att användaren skyddas från trasig layout vid import av Aggressive/Advanced presets.
- **SCM Rå HTML/JS Reklassificering:** Ändrat alert från stabilitetsvarning till kodkvalitet (`info`) med `scoreImpact: 0` (0 poängavdrag).
- **Cockpit CSS Status:** Fixat beräkningen i Cockpit-översikten så att minifiering krävs för "Optimal" och Combine flaggas som en risk.

### 🚀 Release v2.6.9: Inläsning, Modern Baseline & Källkorrigering
- **Formatigenkänning:** Fullt stöd för LiteSpeed Cache 7.9.1+ JSON-tupler (`["_version","7.9.1"]`, `["media-lazy_exc", ...]`) i `detectPastedFormat()` och tvålager-validering i `routeAndProcessContent()`.
- **Elementor Core Baseline:** Standardiserar *Förbättrad CSS-inläsning* och *Förbättrad resursladdning* som **🟢 Optimal (Inbyggd i Core)** för Elementor $\ge$ 3.16 / 4.x.
- **Korrigerad `cache_priv`:** differentierad rekommendation (PÅ för medlems/B2B-portaler som `maximeraprofil.se` för att spara CPU; AV för vanliga sajter).
- **HTML Minifiering (`optm-html_min`):** Granskas och rekommenderas **PÅ** för fullständig minifieringstrio (HTML, CSS, JS).
- **SCM-notiser:** Låga poängavdrag för råa echo-varningar.
- **Versionsmärkning på Profiler:** Sparar och visar AreWee-appens version (t.ex. `AreWee v2.6.10`) på historikkorten och i jämförelsetabellen (A vs B) för tydlig historik.

### ⚡ Release v2.6.10.3: CSS-satelliter, Google Fonts Async & Elementor Core Paritet
- **Kontextuella CSS-satelliter:** `optm_ccss_per_url` och `optm_css_async_inline` utvärderas som Optimal/inaktiv (0 avdrag) när Async CSS är AV.
- **Google Fonts Async kontextuell:** `optm_ggfonts_async` utvärderas som Optimal/inaktiv när sajten inte laddar externa Google Fonts (eller när Remove är PÅ).
- **Elementor Core Paritet:** `elem_asset_loading` standardiseras som permanent Optimal (Inbyggd i Core) för Elementor $\ge$ 3.16 / 4.x utan falska avvikelser.
- **Uppdateringsnotis under Health Score:** Ren räknare under score-gaugen (`ℹ️ X uppdateringar tillgängliga`) utan verktygsnamn och med 0 poängpåverkan.
- **Förfinad copy:** `js_delayed_exclude` visar tydligt `Inaktiv (Delay ej aktiv)` när både defer och delay är av.



### 🩹 Release v2.7.3: Profiler UI + QUIC.cloud live-edge

- **Profiler — ta bort "Rensa allt":** Knappen `btn-clear-history` och `clearAllHistory()` borttagna. Per-profil-radera samt datakällor `btn-clear-inputs` oförändrade.
- **Jämförelse — Stäng/Tillbaka:** Ny `btn-compare-close` ("Stäng jämförelse") döljer resultat-wrapper, tömmer innerHTML och nollställer A/B-select. Rör inte `historyLibrary`/localStorage.
- **QUIC.cloud live-edge:** `evaluateQuicCloudLiveEdge` — `cdn_quic` PÅ utan live `x-qc-*` → Policy/info (`scoreImpact: 0`). Domain Key / nameservers ≠ aktiverad CDN-edge. Utan URL → "kräver URL-check" / unmeasured (inte falsk Optimal). Synk-plugin kan returnera homepage-svarshuvuden.
- **Verifiering:** hard-reload `?v=2.7.3`. Tester: `scratch/test-v273.js`.

### 🩹 Release v2.7.2.2: Riskdetektor Verktyg-layout & stale Elementor GF

- **Layout:** Riskdetektor Verktyg-griden (`risk-status-grid`) tvingade `repeat(8, 1fr)` ≥1100px medan kort hade `min-width:auto` + nowrap-subtext → Wordfence (och övriga kort) klipptes av `body { overflow-x: hidden }`. Fix: `auto-fill` + `minmax(130–140px, 1fr)`, `min-width: 0` / `overflow: hidden` på `.risk-component-card`. WP-system-ikon `📝` → `🖥️`.
- **Elementor GF PÅ false-positive:** skate fixtures parsear redan `google_fonts: false`, men historik/profiler från före v2.7.2 kunde ha `google_fonts: true` (gammal default) utan experiment-markör → cockpit **Elementor PÅ** + `optm_ggfonts_async` / `optm_dns_prefetch` 🟡 Avvikelse trots live `google_font-disabled`. Fix: `elementorSignalsExternalGoogleFonts` / `sanitizeElementorGoogleFonts` — kräver explicit Active (experiment `google_fonts`); **Custom Fonts-count räknas inte**. Soft-match oförändrad i path.
- **Verifiering:** hard-reload `?v=2.7.2.2`, ladda om Elementor system-info (eller rensa historikprofil), kör om analys. Tester: `scratch/test-v2722.js`.

### 🩹 Release v2.7.2.1: theme google_fonts:false false-positive (async/DNS)

- **Root cause:** `hasExternalGoogleFonts` (och cockpit) använde `JSON.stringify(themeInfo).includes("google_fonts")`, vilket blev true även när temat hade `google_fonts: false` → `optm_ggfonts_async` + `optm_dns_prefetch` visade 🟡 Avvikelse och "Saknas … fonts.googleapis/gstatic" trots soft-match.
- **Fix:** ny `themeSignalsExternalGoogleFonts` / `isActiveGoogleFontsValue` — bara explicita Active/ON-värden eller riktiga `fonts.googleapis.com` / `fonts.gstatic.com`-URL:er räknas. Soft-match i `getOptionComparison` oförändrad i path.
- **Tester:** `scratch/test-v2721.js` (skate-lik fixture). Ingen commit utan OK.

### 🩹 Release v2.7.2: GF-kontext, Crawler Policy & Alla avvikelser (default)

- **A) Google Fonts-kontext:** Elementor-default `google_fonts` är nu `false` (sätts bara `true` vid explicit Active). Delad helper `hasExternalGoogleFonts` styr både `optm_ggfonts_async` och `optm_dns_prefetch` — Remove ON eller inga externa GF → Optimal/Inaktiv (inga falska Avvikelser för fonts.googleapis/gstatic).
- **B) Crawler Policy:** På LiteSpeed-server + crawler AV → **🔵 Policy/Context** (valfri på shared; rekommenderas på VPS/dedicated om hosten tillåter), `isDeviant=false`, `scoreImpact: 0`. Crawler PÅ → Optimal. Non-LS AV oförändrat.
- **C) Alla avvikelser (default):** Ny cross-tab-filter `all_deviations` (predikat `isDeviant && isMeasured`) är **default** `activeSettingsFilter`. Visar flik-badge + `jumpToSetting`. Flik-scoped "Endast avvikelser (flik)" behålls. Tomt tillstånd: sajt-övergripande copy.
- **Tester:** `scratch/test-v272.js`. Ingen commit utan OK.

### 🩹 Release v2.7.1.6: Versionsgranskning exact-match (Woo / Elementor)
- **Bugfix:** `analyzeSystem` matchade alla tilläggsnamn som *innehåller* `woocommerce` / `elementor`. Sista träffen vann → t.ex. WooCommerce PayPal Payments **4.1.3** skrev över kärn-Woo (**11.1.2**).
- **Fix:** exakt slug/namn via `isCoreWooCommercePlugin` / `isCoreElementorPlugin` (`woocommerce`, `WooCommerce`, `woocommerce/woocommerce.php`; samma för Elementor vs Pro).
- **Tester:** `scratch/test-v2716.js`. Ingen commit utan OK.
- **Parkerat (löst i v2.7.3):** quic.cloud live-edge (`x-qc-cache`) detektion.

### 🩹 Release v2.7.1.5: audit remediation (crawl_interval, write maps, aliases)
- **crawler_usleep ↔ crawler-crawl_interval:** INTERNAL `crawler-crawl_interval` → `crawler_usleep`; WRITE `crawler_usleep` → `crawler-crawl_interval` (LSCWP 7.x). Legacy `crawler-usleep` still read. Soft-cover när crawler AV behålls. UI-titel: Crawl Interval.
- **WRITE maps (KEY_MAPPING_TO_LSCWP):** `optm_font_display` → `optm-css_font_display`; `optm_emojis_rm` → `optm-emoji_rm`; `cache_object` → `object`; `domain_key` → `hash` (export skriver endast `hash`).
- **READ:** `api_key` → intern `domain_key` (överwrites inte befintlig längre `hash`).
- **media_webp alias cleanup:** tog bort `media-optm_webp` / `media_optm_webp` / `media-webp_dec` / `media_webp_dec`. Kvar: `media-webp` / `media_webp`.
- **Duplicate domain_key:** bort från Bildoptimering-fliken; kvar på General.
- **Hyphen fallback:** första `_` → `-` (inte global), så `optm_css_min` → `optm-css_min` (inte `optm-css-min`).
- **db_optm maps:** `db_optm_revisions` ↔ `db_optm-revisions_max`; `db_optm_revisions_age` ↔ `db_optm-revisions_age`; döda auto_draft/trash/spam/transient-maps borttagna.
- **Backlog (ej UI i 2.7.1.5):** `crawler_load_limit`, `img_optm-jpg_quality`, `optm-html_lazy`, `drop_qs`/cdn-mapping satellites, media-lqip*, heartbeat/localize, full DB Optimizer UI.

### 🩹 Release v2.7.1.4: crawler_usleep inactive-when-off + object-pswd mask
- När `crawler` är AV (0/false) och `crawler_usleep` / `crawler-usleep` saknas → `crawler_usleep` räknas som **uppmätt** och UI visar `Inaktiv (Crawler AV)` (mirrors js_delayed_exclude / media_lazy_exc).
- Crawler PÅ men usleep saknas → fortsatt ⚪ Ej uppmätt (ärligt). KEY_MAPPING alias `crawler-usleep` ↔ `crawler_usleep`.
- `object-pswd` / `object_pswd` (Redis-lösenord) i secret-denylist — maskas alltid i UI/Second Opinion; export round-trip behåller råvärdet internt.

### 🩹 Release v2.7.1.3: media_webp Next-Gen soft measure
- När `media_webp` / `media-webp` saknas i .data men `img_optm-webp` (Next-Gen) finns → `media_webp` räknas som **uppmätt AV** och UI visar `AV (Next-Gen täcker)`.
- Om varken media_webp eller img_optm_webp finns → fortsatt ⚪ Ej uppmätt (ärligt).
- Saknar inte soft/Policy-score (`isMatches` oförändrad).

### 🩹 Release v2.7.1.2: Bildopt. empty-key measurement
- `img_optm_sizes_skipped` (tom lista `""`) och `img_optm_webp` (0/1/2/false) räknas som **uppmätta** när nyckeln finns i .data.
- Key-hyphen för `img_optm_*`: mapping först, annars `img_optm-` + rest (aldrig fel `img_optm_sizes-skipped`).
- Steps 4–6 / 6b `pick()` accepterar `""`, `0`, `"0"`, `false` när own-property finns.

### 🩹 Release v2.7.1.1: Bildopt. Policy-UI + health-ikon
- `img_optm_webp_attr` / `img_optm_sizes_skipped` är inte längre textarea/exclusion-kort (Policy / 0 p, ingen „skyddsmönster“-accordion).
- Health-score-notis under gauge: endast antal + text (ingen ℹ️-ikon).
- Robustare key-lookup för `img_optm-webp` / `img_optm_webp` (inkl. `uploadedSettings.options`).

### 🖼️ Release v2.7.1: Bildoptimering [6] + CDN/QUIC-status + CTM/SCM-fix
- **Ny flik [6] Bildoptimering** (`image_optimization`): CDN/QUIC/Cloudflare-status, Domain Key (maskad), samt Image Optimization-spakar (`img_optm-*`) med tydliga wpPath.
- **Omnumrering:** Sidopt. HTML → `[7]`, Crawler → `[8]`. `media_webp` stannar på Media & LCP; `img_optm_webp` = QUIC Next-Gen (separata nycklar, soft match).
- **Säkerhet:** `domain_key` / Cloudflare-nyckel maskas i UI och Second Opinion (första 4 + … + sista 4).
- **Score:** img-opt Policy/`scoreImpact: 0`. `img_optm_rm_bkup` PÅ = info-alert 🚨 (ingen danger-kollaps). Saknad QUIC-nyckel + img opt PÅ = info.
- **BENCHMARK_VERSIONS:** CTM/SCM `latestRelease` tillbaka till plugin-versioner (1.9.0 / 1.4.1) — slutar flagga falska uppdateringar mot Optimizer-version.

### 🎨 Release v2.7.0: Media & LCP / Sidopt. HTML / Crawler [7]
- **Flik [5] Media & LCP:** Dedikerad mediaflik (`page_optimization_media`) med endast `media_lazy`, `media_lazy_exc`, `media_webp` och `media_vpi`.
- **Flik [6] Sidopt. HTML:** Ny flik (`page_optimization_html`) för `optm_qs_rm`, `optm_dns_prefetch` och `optm_emojis_rm` (flyttade från mediafliken).
- **Flik [7] Crawler:** Tidigare [6] uppdaterad till `⚡ [7] Crawler`.
- **Score-policy lazy/LCP:** WP Native Lazy (`media_lazy` AV) ger Optimal/Policy med `scoreImpact: 0`. LiteSpeed Lazy PÅ utan logo/hero/LCP-exclude ger max **en** samlad warning (−7). Dubbel lazy (LS + Elementor) behålls (−7). VPI soft Optimal när LS Lazy är AV.

### 🗄️ Release v2.8.0: Lagring & Mediahygien (Storage & Media Audit)
- **Katalogstorlekar:** Automatisk kontroll av `wp-content/uploads` och databasstorlek från WordPress Site Health.
- **Kontextkänsliga trösklar:** Separata varningsnivåer för standard innehållssajter vs WooCommerce/e-handel.
- **Korsregel med LSCache Backup:** Varnar om originalbackup behålls på disken samtidigt som mediakatalogen är stor.

### ⚡ Release v3.0.0: AreWee Sync Bridge (1-klicks API Sync: Push & Pull)
- **1-klicks import:** Lättviktig WordPress MU-Plugin / snippet-brygga.
- **Hybridstöd:**
  - **Pull (i appen):** Ange sajtens URL och hämta alla 7 källor via REST API på under 1 sekund.
  - **Push (i WP-Admin):** `[ ⚡ AreWee Check ]`-knapp i WordPress Admin Bar som öppnar appen förifylld.
- **Noll manuell inmatning:** Eliminerar helt behovet av att kopiera data manuellt från 6–7 separata källor.

