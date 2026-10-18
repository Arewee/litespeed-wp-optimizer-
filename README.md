# LiteSpeed Cache & WordPress Optimizer Dashboard (v2.8.35)

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
1. Öppna denna app och ladda upp dina filer (källkodsanalys, WooCommerce-status, .htaccess i Slot 7 samt din nyligen exporterade `litespeed.data`-fil i Slot 8).
   - *Tips:* Om du startar en helt ny sajt och inte har någon `litespeed.data`-fil än, lämnar du bara Slot 8 tom. Appen kommer då automatiskt att generera en optimal profil från scratch!
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

### 🚀 Release v2.8.17: Grok Deep-Audit Paritet & Robust No-Abort Skydd
- **No-Abort Telemetri & Apache/LiteSpeed REDIRECT:** Fullt stöd för `[REDIRECT_noabort] => 1` och `$_SERVER['REDIRECT_noabort']` i Wordfence diagnostic dumps.
- **Normalisering av citattecken:** Typografiska citattecken (`‘ ’ “ ”`) konverteras deterministiskt till raka citattecken så att varningsfraser matchas exakt och aldrig felaktigt identifieras som aktiva.
- **Svenska varningsfraser:** Utökat stöd för lokala formuleringar i Wordfence (t.ex. *kan inte avgöra om "noabort"*).
- **Kommentarsfiltrering i .htaccess:** Rader som inleds med `#` eller `//` hoppas över, så bortkommenterade rewrite-regler tolkas inte som aktiva.
- **Prioritetsordning & Direkt .htaccess-bevis:** Uppladdad `.htaccess`-fil har företräde framför föråldrad Wordfence-diagnostik. Saknas regeln i en uppladdad `.htaccess` sätts mätningen ärligt till `AV` (`hasNoabort: false`).
- **Objektsammanfogning för SCM & .htaccess:** Separata kodsnuttar och `.htaccess`-direktiv skrivs inte längre över i samma dataplats utan samverkar.
- **Eliminering av dubbel poängsänkning:** `wf_noabort` i inställningstabellen har `scoreImpact: 0`, medan `alert_litespeed_noabort` hanterar den samlade stabilitetssänkningen (-5p).
- **Kontextuell filtrering:** `wf_noabort`-larm och `.htaccess`-rekommendation visas endast på sajter med både LiteSpeed och Wordfence.
- **Språk & Benchmarks:** Export skriver alltid svenskt `[KRONISKT]` och `BENCHMARK_VERSIONS.wordpress` är uppdaterad till 6.8.2.

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



### 🚀 Release v2.8.15: Rättning av 4 falska avvikelser, robust noabort & Ej uppmätt-filter/sortering
- **Rättning av 4 falska avvikelser i Rekommenderade inställningar:**
  - **`wf_ip_header`:** Sanerad från sektionsrubriker i Wordfence diagnostic (`## How Wordfence gets IPs: Methods of detecting a visitor's IP address. ##`) som tidigare orsakade en felaktig avvikelse (`-15p`). Standardiserad till `REMOTE_ADDR` (🟢 Optimal).
  - **`wf_disable_live_traffic`:** Outfylld diagnos sätter inte längre ett falskt `❌ AV` (`-10p`). När data saknas klassas inställningen ärligt som `⚪ Ej uppmätt` (0p avdrag).
  - **`woo_cart_fragments` & `woo_transients_cleanup`:** Standardiserade med `null`-default i WooCommerce-parsern. `woo_transients_cleanup` är frikopplad från LiteSpeed DB `db_optm_transient`, vilket eliminerar falska avvikelser (`❌ AV` `-10p`) för sajter med standard `.data`-fil.
- **Robust No-Abort detektering (`wf_noabort` & `.htaccess`):**
  - Stöd för flexibla regex-mönster (`noabort: 1`, `[noabort] => 1`, `e=noabort:1`) i Wordfence diagnostic, `.htaccess` och serverrapporter.
- **Nytt filter och sortering `⚪ Ej uppmätt / Okänd`:**
  - Ny snabbfilterknapp `⚪ Ej uppmätt / Okänd` i inställningspanelen som samlar alla oidentifierade inställningar över hela webbplatsen i en enda vy med hopp-brickor till respektive flik.
  - Ny sorteringsordning i dropdownen (`⚪ Ej uppmätt / Okänd först`) för snabb och pedagogisk felsökning av saknade indatafiler.

### 🚀 Release v2.8.14: LiteSpeed + Wordfence No-Abort Telemetri & Pedagogisk 3-kolumnersguide
- **Aktiv No-Abort Telemetri (`wf_noabort` & `alert_litespeed_noabort`):**
  - Optimeraren läser av Wordfence diagnostic och `.htaccess` för direkt detektering av `E=noabort:1` rewrite-direktivet.
  - Visar `🟢 PÅ (noabort:1 aktiv)` när regeln finns aktiv.
  - Visar `⚠️ AV (Wordfence varnar)` och genererar stabilitetslarm under Identifierade risker endast när servern är LiteSpeed och Wordfence flaggar bakgrundsavbrott eller saknad regel.
  - Visar `⚪ Ej inläst` (0p poängavdrag) om data saknas, så att sajter inte varnas i onödan.
  - Fullständig paritet i gränssnittet under Inställningar (Tab 9 Wordfence) och i den exporterade Site-Reporten.
- **Pedagogisk 3-kolumnersguide under Referenser & Källor:**
  - De två separata förklaringsrutorna har bakats ihop till en enda komplett och enhetlig guide direkt under systemfilsöversikten:
    1. 🟡 **Avvikelser mot rekommendation (1:1 mot Benchmark):** Enskilda inställningsval som skiljer sig från standarden men som inte ger driftstörningar.
    2. 🚨 **Konflikter & Stabilitetsrisker (Kollision mellan verktyg):** Funktioner som krockar med risk för trasig kassa eller layoutkrasch som måste åtgärdas direkt.
    3. 🔵 **Kroniska fel (Externa hostingbegränsningar):** Begränsningar i webbhotellets servermiljö som inte kan lösas i WordPress och undantas från Config Completion.
  - Granskningsdatumet för konsensus och källor har uppdaterats till **2026-10-16**.

### 🚀 Release v2.8.13: Wordfence IP & Live Traffic Paritet, Grok Audit & No-Abort Skydd
- **Wordfence IP Header Paritet (`wf_ip_header`):**
  - Stöd för strängbaserade värden (`REMOTE_ADDR`, `CF-Connecting-IP`, etc.) i inställningspanelen under Wordfence med grön statusbricka (`🟢 REMOTE_ADDR`).
  - Single Source of Truth: Wordfence miljö och diagnostik kopplas direkt via `environment.wfInfo` till regelsystemet.
- **Wordfence Live Traffic Skydd (`wf_disable_live_traffic`):**
  - Strikt prioritering av "Traffic logging mode: Security Only". Generiska rader som "Live traffic: Enabled" tillåts inte längre skriva över ett aktivt "Security Only"-val.
- **LiteSpeed No-Abort (.htaccess) Skydd:**
  - Dokumentation och exportguidning för `E=noabort:1` rewrite-block i `.htaccess` för att säkra bakgrundsprocesser och cron-anrop på delade LiteSpeed-servrar (t.ex. Inleed).
- **Grok Deep-Audit Rättningar:**
  - **Top Finding & Pluralgrammatik:** Visar både kvarvarande optimeringar och kroniska fel när avvikelser finns; korrekt svensk grammatik (`1 externt kroniskt fel` / `X externa kroniska fel`).
  - **Cart Fragments & Transients:** Slutat gissa "PÅ via SCM" baserat på enbart plugin-närvaro eller rå kodsökning. Endast verifierade mätningar godkänns, annars visas ärligt `⚪ Ej inläst` (0p påverkan).
  - **Config Completion Dynamisk Copy:** Påståendet *"allt du kan påverka är optimalt"* visas strikt vid 100% Config Completion; vid < 100% anges exakt antal poängavvikelser kvar att åtgärda i WordPress.
  - **Export- och Tabellparitet:** Engelsk `[CHRONIC]` ersatt med svensk `[KRONISKT]` i export; batch-tabellens kolumn omdöpt till `Overall Score / Config` och visar båda poängen.
  - **Info-larm:** Standardavdrag för informationsnotiser utan explicit värde ändrat från 2p till 0p.
  - **Temanamnssanering (`stripThemeSlug`):** Rensar endast tekniska slugs som matchar temanamnet (t.ex. `Astra (astra)` $\rightarrow$ `Astra`), medan meningsfulla tillägg som `(Child Theme)` bevaras intakta.
  - **Benchmark-uppdatering:** Synkade officiella benchmarks för WordPress 6.8.0, WooCommerce 9.8.5, LiteSpeed 7.9.1 och Wordfence 8.0.4.
- **Verifiering:** hard-reload `?v=2.8.13`. Full testsvit i `scratch/test-v280.js`.

### 🚀 Release v2.8.12: Grok Deep-Audit Paritet & Pedagogisk Källförklaring
- **Pedagogisk Förklaring i Referenser & Källor:**
  - Ny 3-kolumners pedagogisk översiktsruta i modalen under *Referenser & Källor* som tydliggör skillnaden mellan:
    1. **Avvikelser mot rekommendation (Gult 🟡):** Enskilda inställningsavvikelser utan driftstörningsrisk.
    2. **Konflikter & Stabilitetsrisker (Rött 🚨):** Direkt krock mellan aktiva moduler med risk för krascher, brutna sessioner eller trasig layout.
    3. **Kroniska fel (Blått 🔵):** Externa hostingbegränsningar (delad OPcache, grann-sajters påverkan på TTFB) som inte kan lösas i WP/plugins.
- **Dedikerad Alert-typ `type: "chronic"`:**
  - Kroniska larm (`alert_opcache_critical`, `alert_wc_checkout_ttfb`) har nu `type: "chronic"`, vilket förhindrar att de någonsin feltolkas som generella kompatibilitetsvarningar (`warning`).
  - Top finding-rubriken och sammanfattningskortet visar **🟢 Säkrad OK** och ren status när endast kroniska larm föreligger.
- **Återställd Multikomponent-filtrering (W1):**
  - Återaktiverat `a.components.includes(compKey)` i verktygskort, toolbar-filter och `displayAlerts` så att tvärgående larm (t.ex. Tema + LiteSpeed) visas korrekt under båda berörda verktyg utan att TTFB dubbelräknas på servern.
- **Kassa & Resurs-optimeringar:**
  - Kassa-kortet (Kort 7) prioriterar åtgärdbara brister som **`Saknar Redis 🟡`** före kronisk **`Ojämn TTFB 🔵`**.
  - Dynamiska avdragsbrickor: `🔵 Kroniskt fel (-5p)` för OPcache och `🔵 Kroniskt fel (0p)` för TTFB.
  - Flik [1] Server Core för `php_opcache_memory` visar **`🔵 Kroniskt fel`** med synkade buffer-full-kriterier.
- **Förbättrad Dataintegritet:**
  - Revisioner gissas inte längre till 5 om data saknas (`isMeasured: false`).
  - SCM cart fragments & transients markeras endast om SCM-kod faktiskt detekterats.
- **Verifiering:** hard-reload `?v=2.8.12`. Full testsvit i `scratch/test-v280.js`.

### 🚀 Release v2.8.11: Blå standard för Kroniska fel & Renodlad Miljökarta
- **Enhetlig Blå Färgkod för Kroniska fel (`#38bdf8`):**
  - **Identifierade risker & konflikter:** Larm med `isChronic: true` (OPcache & TTFB) renderas nu i en dedikerad blå container (`.alert-item.chronic`) med mjuk himmelsblå bakgrund och blå kantlinje istället för varningsgult.
  - Brickan i larmet uppdaterad till **`🔵 Kroniskt fel (0p)`** i enhetligt blått.
- **Verktygskort utan Dubbelräkning (SSOT):**
  - Varje larm binds strikt till sitt primära verktyg (`a.component === compKey`).
  - Larmet för ojämn TTFB tillhör nu strikt WooCommerce (`components: ["woocommerce"]`), vilket eliminerar den tidigare dubbelräkningen på WordPress Core / WP-system.
  - `wp_system` visar **`🔵 1 Kroniskt fel`**, `woocommerce` visar **`🔵 1 Kroniskt fel`** och övriga visar **`🟢 Optimal`**.
  - Total summan över verktygskorten är exakt 2 (1 + 1), i perfekt 1:1 paritet med listan under Identifierade risker. Varningar (påverkbara) är 0 st.
- **Funktionskort med Blå Status:**
  - Kort 6 (Serverresurser) och Kort 7 (Checkout) visar informativ blå status (**`Delad pool 🔵`** / **`Ojämn TTFB 🔵`**) med textfärg `#38bdf8` vid kroniska serverbegränsningar.
- **Renodlad Miljökarta (Conflict Topology):**
  - Kroniska fel filtreras bort från `drawTopologyMap()` (`!a.isChronic`).
  - WordPress Core och WooCommerce ritas **100% Gröna (🟢)** med gröna förbindelselinjer utan falska gula varningskrockar.
- **Verifiering:** hard-reload `?v=2.8.11`. Full testsvit i `scratch/test-v280.js`.

### 🚀 Release v2.8.10: Renodlad Overall Score & Config Completion
- **Overall Score Typografi & Layout:**
  - Texten inuti den cirkulära Gauge-mätaren har ändrats från "Hälsa" till **`Overall`<br>`Score`** uppdelat på två rader med balanserad radhöjd och versaler.
  - Rubriken under mätaren har renodlats till **`95% Overall Score 🟢 ℹ️`**.
  - Den tidigare textraden under rubriken ("Din sajt är optimalt konfigurerad...") har tagits bort helt för en ren, minimalistisk och professionell presentation.
- **Config Completion (Större stapel med centrerat 100%):**
  - Rubriken har döpts till **`Config Completion`** (onödigt kugghjul ⚙️, parentes och dubblerat "100%" till höger har avlägsnats).
  - Själva stapeldiagrammet har gjorts större och kraftigare (höjd ökad till 32px med 16px border-radius).
  - Inuti den gröna stapeln visas nu en framträdande, ren och centrerad procentsats: **`100%`**.
- **Verifiering:** hard-reload `?v=2.8.10`. Full testsvit i `scratch/test-v280.js`.

### 🚀 Release v2.8.9: Ärlig Total Sajthälsa, Config Score & Card Overflow Fix
- **Två Tydliga Grafer (Mätare & Stapel):**
  - **Total Sajthälsa (Gauge-mätare som idag):** Visar verklig sajthälsa med ärligt och proportionerligt avdrag för externa hostingbegränsningar (5p för delad OPcache-pool på Inleed $\rightarrow$ **95% 🟢**). Ingen skönmålning!
  - **Ingen dubbelbestraffning för TTFB:** TTFB-larmet i kassan klassas som ett direkt symptom/konsekvens av delad OPcache och ges **0p separat avdrag**, vilket ger en metodiskt rättvis Total Score på 95%.
  - **Config Score (Liggande stapeldiagram):** Ny liggande stapel direkt i score-kortet som visar användarens påverkansgrad (**100% – Allt du kan påverka är optimalt**).
- **Renodlad Konflikträkning (Grok V1 Fix):** Kroniska fel räknas inte längre som vanliga konfliktvarningar (`warningCount` filtrerar bort `isChronic`). Sajten visar därför "Konfliktvarningar: 0 st 🟢" och "Kroniska fel: 2 st 🌐", och rubriken skrivs inte längre felaktigt över med "Bra status med varningar 🟡".
- **Lösning på Card Overflow (Media Image Fix):**
  - Gridkolumnerna i Riskdetektorns Rad 1 och Rad 2 har breddats till `minmax(205px, 1fr)`.
  - `overflow: hidden;` har lagts till på `.risk-component-card` och `.risk-function-card`.
  - Funktionskortens headrar har fått `flex-wrap: wrap; gap: 0.25rem;` så att långa statustexter (t.ex. `Låg hitrate 🟡`) bryts snyggt utan att svämma över 41px på grannkortet.
  - Värdebrickorna har fått `white-space: nowrap;` så att `Ej inläst` inte delas upp på två rader.
- **Grok Audit Rättningar (V2, V3, V4):**
  - **V4:** Rättat variabelnamnet `opHitNum` $\rightarrow$ `opcacheHitNum`.
  - **V3:** Texten om full minnesbuffert är nu villkorad på `isHighUsage` istället för att alltid påstås vid låg hitrate.
  - **V2:** TTFB-larmtexten är nu dynamisk och nämner endast Redis, HPOS och Server-Cron om de faktiskt är aktiverade i miljön.
  - **Kassakortet:** `Ojämn TTFB 🟡` prioriteras före `Saknar Redis 🟡` så att kopplingen till OPcache-larmet syns direkt på kortet.
- **Verifiering:** hard-reload `?v=2.8.9`. Full testsvit i `scratch/test-v280.js`.

### 🚀 Release v2.8.8: SSOT Riskdetektor, Kortlayout & Grok Djupaudit
- **Renodlat Temakort (`Astra`):** Slug-parentesen `(astra)` rensas bort automatiskt så att temat visas rent och enhetligt som `Astra` (eller `Astra v4.8.7`) utan upprepning.
- **Responsiv Kortlayout & Skilda Bakgrunder:** Verktygskorten i Rad 1 har breddats till samma storlek som funktionskorten (`minmax(175px, 1fr)`) och tillåts bryta över flera rader så att versionstexter (WooCommerce, Tema etc.) aldrig trycks ihop. Rad 1 har fått en subtil skifferblå bakgrund medan Rad 2 (Funktioner) har en mörkare grafitkolsyta för tydlig visuell separation.
- **SSOT för Kroniska Fel under Riskdetektor:** Kroniska externa observationer visas nu i risklistan med egen distinkt badge `🟡 Kroniskt fel (0p)`. Klick på kort 6 (`🖥️ Serverresurser`) eller kort 7 (`🛒 Checkout`) scrollar direkt ned till motsvarande förklaring.
- **Inleed OPcache-tröskel & Kassa TTFB-korrelering:** Sätter kronisk observation även vid full buffert ($\ge 95\%$) med träffprocent under 95% (syns därmed på delade Inleed-sajter). Genererar dedikerat larm `alert_wc_checkout_ttfb` under WooCommerce så att TTFB-varningen i kassan är 100% förklarad.
- **Flik [1] `php_opcache_memory`:** Visar gult märke `🟡 Kroniskt fel` istället för missvisande `🟢 Optimal` när serverns delade pool belastas.
- **Grok Deep-Audit Sanering:**
  - Rå textsökning efter betalsätt borttagen; `Shipmondo` borttagen som betalsätt (fraktlösning).
  - Kustom Checkout räknas som Klarna Checkout i JS-exkluderingar för att förhindra falska kassa-larm.
  - Wordfence Live Traffic lämnas som `Ej uppmätt` om data saknas istället för att felaktigt antas vara aktiv.
  - Pluralgrammatik i Health Score rättad ("X kroniska fel undantagna").
- **Verifiering:** hard-reload `?v=2.8.8`. Full testsvit i `scratch/test-v280.js`.

### 🚀 Release v2.8.7: Kroniska Fel, Score-renodling & Transparent Kassa-korrelering
- **Kroniska fel (Icke påverkbara observationer):** Ny metrikrad under Health Score: `🌐 Kroniska fel: 1 st`. Tydliggör att externa serverbegränsningar (som Inleeds delade 512 MB OPcache-pool) inte kan styras via WordPress-inställningar och därför undantas från poängavdrag (0 p avdrag).
- **Kompakt Info-ikon (`ℹ️`):** Den stora knappen "Hur beräknas min poäng?" under mätaren har ersatts med ett klickbart info-ikon direkt efter rubriken `100% LSCWP Advanced Preset! 🟢 ℹ️` som fäller ut poängnedbrytningen vid klick.
- **Sanering av Phantom Update Counters:** Notisen "1 uppdatering tillgänglig" under mätaren har tagits bort helt för att undvika förvirring när inga åtgärder krävs.
- **Tydligt samband för Ojämn TTFB i Kassan:** `alert_opcache_critical` och Flik [1] `php_opcache_memory` förklarar explicit att låg OPcache-träffprocent tvingar PHP att kompilera om 3 av 10 filer från disk vid dynamiska kassanrop (varukorg/kassa kan inte sidcachas), vilket direkt orsakar att Checkout-kortet flaggar `Ojämn TTFB 🟡`.
- **Grok Deep-Audit Paritet (Gateways & Autoload):** Betalmetoder i WooCommerce härleds automatiskt från aktiva betal-plugins om statusrapporten saknar gateways-sektion; Autoload visar ärligt "Ej inläst" när telemetry saknas.
- **Verifiering:** hard-reload `?v=2.8.7`. Full testsvit i `scratch/test-v280.js`.

### 🚀 Release v2.8.6: Single Source of Truth, Kassa-korrelering & OPcache cPanel-guidning
- **OPcache 512M Minnesparitet:** Site Health exporterar minne i råbytes (`536863296 of 536870912`). Dedikerad parser konverterar till MB och matchar $\ge$ 512M som Optimal 🟢 istället för falsk strängmatchning och 10 p avdrag.
- **Förtydligad OPcache-observation på Delad Server:** Observationen kvarstår vid hit rate < 80 % och full minnesbuffert, men förtydligar att grundorsaken är delad hosting (Inleed) med delad 512M pool över hundratals sajter som inte kan ändras via php.ini. Exakt cPanel-sökväg anges (`Inleed cPanel ➔ Välj PHP-version ➔ Alternativ ➔ opcache.memory_consumption`).
- **Aktionsbara Sökvägar (`wpPath`):** Lagt till konkreta sökvägar för var inställningar ändras för `php_opcache_memory`, `woo_cart_fragments` och `woo_transients_cleanup`.
- **Single Source of Truth för SCM:** Om SCM är aktivt hanteras både `woo_cart_fragments` och `woo_transients_cleanup` via SCM:s dedikerade moduler och schemalagda cron, vilket visas som `PÅ (Optimerad via SCM)` / `PÅ (Hanteras av SCM)` med 0 falska straffpoäng.
- **Elementor Theme Builder Överstyrning:** När Elementor Theme Builder och Global Fonts är aktiva undertrycks redundanta och motsägelsefulla Astra-varningar för minicart och Google Fonts.
- **Kassa-korrelering (🛒 Checkout):** Funktionskort 7 korreleras mot helheten: saknas Redis visas `Saknar Redis 🟡` och vid låg OPcache hit rate visas `Ojämn TTFB 🟡` istället för falskt `Optimal 🟢`.
- **Kompakt Header & Textskydd:** Korta statustexter (`Låg hitrate 🚨`) och `flex-shrink: 0` på korttiteln säkerställer att `🖥️ Serverresurser` aldrig klipps (`Serverr...`).
- **Verifiering:** hard-reload `?v=2.8.6`. Full testsvit i `scratch/test-v280.js`.

### 🚀 Release v2.8.5: Fullständig Tolkningssanering (Grok Audit) för Cron, URL, Wordfence & Redis
- **WooCommerce WP Cron: – Detektering:** Site Health exporterar aldrig `DISABLE_WP_CRON`. Läser nu `WP Cron: –` från WooCommerce statusrapport (`–` = visitor cron av = server-cron på).
- **HPOS & Sync Isolering:** Separerat `hpos_enabled` från synkrader; stöd för tankstreck (`–`, `—`, `-`) som falskt värde i båda raderna.
- **Dynamisk URL-uppdatering:** Ny uppladdning skriver över `detectedSiteUrl`; WooCommerce `Site address (URL)` och `WordPress address (URL)` tolkas som pålitlig källa.
- **Wordfence IP-header & Live Traffic:** IP-header matchar inte längre rader i IP-värdetabeller; Live Traffic låter inte generisk `security only` i fulltexten skriva över explicit radvärde som "All traffic".
- **Strikt Redis-aktivering:** PHP-extension `redis` eller `cache-object_kind=1` tolkas inte längre som aktiv cache utan `object-cache.php` drop-in.
- **Gateway & Checkout-avgränsning:** JS Defer-kassavarning för Klarna/Stripe kontrollerar faktiskt aktiva plugins/gateways (`environment.wooGateways`) istället för heltextssökning i dumpen.
- **Verifiering:** hard-reload `?v=2.8.5`. Full testsvit i `scratch/test-v280.js`.

### 🚀 Release v2.8.4: Telemetrifix & Feltolkningssanering för Cron, HPOS & Webbplats-URL

- **Träffsäker URL-detektering:** `extractSiteUrl()` prioriterar `wp-core` (`home` / `siteurl`) och filtrerar bort externa temadomäner som `wpastra.com` och plugin-leverantörer. Sajtens faktiska domän (inkl. punycode och svenska tecken) identifieras alltid korrekt.
- **Robust Server-Cron tolkning (`DISABLE_WP_CRON`):** Stöd för Site Health-värden som `"Enabled"`, `"Aktiverad"`, `"Aktiv"`, `"1"` och `"Ja"` istället för enbart strikt `"true"`. Eliminerar falska varningar om saknad Server-Cron när `define('DISABLE_WP_CRON', true);` är aktivt i `wp-config.php`.
- **Eliminerat falskt larm för HPOS Kompatibilitetsläge:** Åtgärdat en parser-bugg i WooCommerce System Status där närvaron av ordet "enabled" / "aktiverad" i etiketterna (`HPOS data sync enabled: no` / `HPOS-datasynkronisering aktiverad: nej`) felaktigt tolkades som aktiv dubbelskrivning. Värdedelen efter kolon utvärderas nu isolerat med företräde för negativa värden (`no`, `nej`, `false`, `disabled`, `inaktiv`).
- **Objektcache-detektering:** Utökat stöd för `object-cache.php` drop-ins så att aktiva Redis-kopplingar registreras tillförlitligt oavsett strängrepresentation.
- **Verifiering:** hard-reload `?v=2.8.4`. Full testsvit i `scratch/test-v280.js`.

### 🚀 Release v2.8.3: Renodlad Checkout & Högerställd Statusdesign

- **Renodlad Checkout:** 7:e funktionskortet döpt om till `🛒 Checkout` med larmstatus `Bromsrisk 🟡` istället för texten "Kassan Bromsas".
- **Intuitiv Server-Cron telemetri:** Verktygsraden i Checkout visar `Server-Cron` med tydliga lägen (`PÅ (Server)` vid aktiv `DISABLE_WP_CRON` / `AV (Besökare)` när besökare belastas). Larmet förtydligat till *Server-Cron saknas: Kassan fördröjs av bakgrundsjobb (Besöksstyrd Cron)*.
- **Högerställd och kompakt statusdesign:** Statusen i 6:e funktionskortet (`🖥️ Serverresurser`) förenklad till `Acceptabel 🟡` (tog bort `(Delad)`). Kortens rubrikrad har fått flex-skydd (`white-space: nowrap`, `margin-left: auto`, `text-align: right`, `flex-shrink: 0`) för att eliminera oönskade radbrytningar och textkollisioner.
- **Verifiering:** hard-reload `?v=2.8.3`. Tester: `scratch/test-v280.js`.

### 🚀 Release v2.8.2: Kassa- och E-handelsfokus & Delad OPcache-kalibrering

- **Kassa & E-handel (7:e funktionskortet):** Dedikerat kort i Riskdetektorn (`🛒 Kassa & E-handel`) som övervakar kassans mest kritiska prestandafaktorer: Redis Object Cache, WP-Cron och HPOS-synk.
- **Rättvis OPcache på delad hosting:** Larm på delad hosting sänkta till neutral information (`scoreImpact: 0`). Ny realistisk skala för träffprocent ($\ge 90\,\%$ grön, $80–89\,\%$ acceptabel/gul, $< 80\,\%$ röd). Kortet visar ren träffprocent under `opcache_hit_rate` istället för att falsklarma "OPcache Full".
- **WP-Cron via besökare:** Ny telemetriregel som varnar när `DISABLE_WP_CRON` är inaktivt vid aktiv WooCommerce, med exakta instruktioner för `wp-config.php` och cPanel-cron.
- **HPOS Dubbelskrivning / Synk:** Ny telemetriregel som upptäcker om HPOS körs med kompatibilitetssynk mot gamla tabeller, vilket halverar orderläggningshastigheten.
- **Adaptiv Grid:** Riskdetektorns funktionsrutnät anpassat för att hantera 7 kort responsivt på breda skärmar.
- **Verifiering:** hard-reload `?v=2.8.2`. Tester: `scratch/test-v280.js`.

### 🚀 Release v2.8.1: Kompakta Serverresurser & Förfinad OPcache-telemetri

- **Kompakta verktygsvärden i funktionskortet:** 6:e funktionskortet (`🖥️ Serverresurser`) visar rena procent (`100%`, `82%`), minnestak (`768M`) och databasstorlekar (`450 KB`) utan textomslag och onödig plottrighet.
- **Koncis OPcache-förklaring:** Larmtexten kortad till två prydliga rader – med optimal träffprocent definierad som 100 % och saklig förklaring av delade serverresurser utan opraktiska förslag på plugin-radering eller serverbyte.
- **Multi-line varningsrendering:** Applicerat `white-space: pre-line` i riskdetektorn så att radbrytningar presenteras strukturerat i webbläsaren.
- **Verifiering & Site Health-paritet:** Fullständigt kalibrerat och verifierat mot skarp telemetry från produktionssajter. Tester: `scratch/test-v280.js`.

### 🚀 Release v2.8.0: Serverresurser, OPcache, Autoload & Renodlad Översikt

- **Renodlad Översikt:** Dubblettstatusraden (`overview-component-status-grid`) borttagen under miljökartan. Översikten fokuserar nu knivskarpt på Health Score & Breakdown, WordPress Miljökarta (Conflict Topology) och Versionsgranskning.
- **Serverresurser & PHP-motor:** Nytt 6:e funktionskort i Riskdetektorn (`🖥️ Serverresurser`) med standardiserade namn (`opcache.memory_consumption`, `WP_MEMORY_LIMIT`, `autoload_options_size`) och ultrakompakta trösklar (t.ex. `Optimal <800 KB`, `Kritisk >1.5 MB`).
- **OPcache-analys:** Identifierar full opcode-cache eller låg träffprocent (`opcache_is_full` / `opcache_hit_rate < 95%`) som kritiskt larm, samt förbrukning $\ge 95\%$ som proaktiv varning med tydliga copy-paste-rader för `php.ini`.
- **Autoloaded Options Size:** Analyserar `autoload_options_size` från WordPress Site Health (`### wp-database ###`) mot WordPress Core Performance Benchmarks (varning $>800\text{ KB}$, kritisk TTFB-påverkan $>1.5\text{ MB}$).
- **Minneskrock & Admin-minne:** Informerar sakligt när `WP_MEMORY_LIMIT > memory_limit` (info, scoreImpact: 0), samt varnar om `WP_MAX_MEMORY_LIMIT < 512M` vid aktiv WooCommerce eller Elementor.
- **Lagrings- & Backup-hygien:** Korsregel mellan storlek på `uploads`-katalogen ($>5\text{ GB}$) och LiteSpeed Cache backup-radering (`img_optm_rm_bkup`).
- **Flik 1 Core Paritet:** Parametrar för OPcache-minnesallokering och Autoload-storlek integrerade i inställningsgranskningen.
- **Verifiering:** hard-reload `?v=2.8.0`. Tester: `scratch/test-v280.js`.

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
### 🚀 Release v2.8.18: Grok Audit Paritet, Korrekt Poängriktning, SCM-skydd & Pedagogisk Ej Uppmätt-guidning
- **Korrekt poängriktning för No-Abort:** `alert_litespeed_noabort` har `scoreImpact: 5` (dras av korrekt från stabilitet: $100 - 5 = 95$ istället för att felaktigt addera $+5$).
- **Eliminering av dubbelbestraffning i inställningstabellen:** Inställningar med `scoreImpact === 0` (t.ex. `wf_noabort` och Policy-flaggor) blockeras från automatisk extra sänkning (-3p) i `configSettingsScore`.
- **Skydd mot feltolkning av SCM-export och PHP-kod:** Kod med PHP-taggar (`<?php`) eller SCM-export tolkas aldrig felaktigt som en ofullständig `.htaccess` även om de innehåller nyckelord som `RewriteRule` eller `<IfModule>`.
- **Kontextuell filtrering av `wf_noabort`:** Inställningsbrickan inkluderas endast i granskningen när sajten faktiskt kör både LiteSpeed och Wordfence.
- **WP_POST_REVISIONS telemetri & extraktion:** Tolkning av `define('WP_POST_REVISIONS', ...)` från `wp-config.php`/SCM (Slot 6), `wp-constants` (Slot 1) samt fallback till LiteSpeed DB-revisioner.
- **Pedagogisk vägledning för "Ej uppmätt":** Varje outfyllt inställningskort har en tydlig instruktionsruta: `💡 För att mäta detta: Klistra in [fil] i [Slot X]`.
- **Synkade versioner (v2.8.18):** Synkroniserat över UI, script, regler, export och dokumentation.

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
### 🩹 Release v2.8.19: SCM Pipeline, Profil-omtolkning, Slot-korrigering & Ärlig Temamätning
- **SCM Data Pipeline & Parsning:** Åtgärdat felet där SCM-funktioner (`cart_fragments`, `transients_cleanup`) och SCM-version inte kopplades till granskningsreglerna. Parsar nu avregistrering och cron-funktioner från anpassad PHP-kod och JSON i Slot 6 så att de verifieras korrekt.
- **Råtext-bevarande i Profiler & Omtolkning vid Inläsning:** Sparade profiler sparar nu råtexter (`rawUploadTexts`) och kör den aktuella versionens parsers vid inläsning (`loadProfile`), vilket förhindrar att äldre profilögonblicksbilder fryser inaktuella tolkningsbeslut.
- **Korrekt Slot-kartläggning och vägledning:** Åtgärdat felaktig hänvisning i tipsrutor och granskning (Wordfence är Slot 3, Elementor Slot 5, SCM/kod Slot 6).
- **Ärlig Temamätning:** Tema-inställningar (`theme_site_logo`, `theme_header_footer_builder`, paletter och typsnitt) antas inte längre blint vara aktiva utan kräver faktisk mätning från inlästa temadata.
### 🩹 Release v2.8.21: Dedikerad .htaccess-källa (Slot 7), 8 Slots, Värde saknas & Profilkorts-layout
- **Dedikerad .htaccess-datakälla (Slot 7):** Introducerat en separat dropzone och parser för `.htaccess`. SCM (Slot 6) renodlas till PHP-källkod och JSON-paket, medan `.htaccess` har sin egen slot med oberoende filstatus och verifiering. LiteSpeed (.data) numreras om till Slot 8.
- **8 Slots & Statusbar-paritet:** Headerns aktiva sajt-sammanfattning visar nu `0 av 8 filer`, och statusbaren listar alla 8 källor med egna ikoner och tidsstämplar.
- **Profilkort i Profiler & Historik:** Korttiteln tar nu full bredd (100%), och poängen flyttas till en egen rad under datum/titel med tydliga `Overall score: XX%` och `Config Score: XX%` som separata textbadges.
- **Terminologibyte "⚪ Värde saknas":** Bytet från "Ej uppmätt / Okänd" till "⚪ Värde saknas" har genomförts konsekvent över filterknappar, sorteringsalternativ, statusbrickor och tipsrutor.
- **"Alla avvikelser" som komplett åtgärdslista:** Standardfiltret `all_deviations` visar nu både uppmätta avvikelser och saknade värden så att användaren får en samlad översikt över allt som behöver åtgärdas.

### 🩹 Release v2.8.20: Strikt Nyckelordsmatchning, Profil-separering & Avvikelse-paritet
- **Strikt Nyckelordsmatchning i SCM:** Eliminerat gissningar på lösa ord: `cart_fragments` kräver nu explicit anropsmönster (`wp_dequeue_script`, `wp_deregister_script`, `remove_action` etc.), och transientrensning accepterar endast faktiska batch-rutiner (`delete_expired_transients`, `wc_delete_expired_transients`) och inte vanlig `delete_transient()`.
- **SCM Version & WooCommerce-isolering:** SCM-version extraheras strikt från SCM-specifika metadata och förväxlas inte med PHP- eller allmänna plugin-headers. WooCommerce-regler utvärderas endast om sajten faktiskt kör WooCommerce (`hasWooCommerce`).
- **WP_POST_REVISIONS med värdet 0:** Strikt typkontroll säkerställer att `0` (eller `false`) för inaktiverade revisioner inte tolkas som saknat värde eller faller igenom till LiteSpeed DB-standard.
- **Profilhygien & Samtidig .htaccess/SCM-lagring:** `state.rawUploadTexts` bevarar nu både `.htaccess` och anpassad PHP/SCM i separata fält så att de inte skriver över varandra. Vid tömning av en slot (`clearSlot`) nollställs råtexten korrekt. Äldre profiler flaggas med versionsmeddelande vid inläsning.
- **LocalStorage Skydd:** Bekräftelse inhämtas från användaren innan äldsta profilen tas bort vid fullt minnesutrymme (`QuotaExceededError`).
- **Avvikelse- och Policyparitet:** Inställningar med `scoreImpact: 0` (t.ex. `wf_noabort` och policyinställningar) visas med `🔵 Policy / 0p` och räknas inte som poängsänkande avvikelser.
- **Tydlig Autoload-guidning:** Tipset för `wp_autoload_size` instruerar användaren att klicka på knappen *Kopiera webbplatsinformation till urklipp* i WordPress.

### ⚡ Release v3.0.0: AreWee Sync Bridge (1-klicks API Sync: Push & Pull)
- **1-klicks import:** Lättviktig WordPress MU-Plugin / snippet-brygga.
- **Hybridstöd:**
  - **Pull (i appen):** Ange sajtens URL och hämta alla 7 källor via REST API på under 1 sekund.
  - **Push (i WP-Admin):** `[ ⚡ AreWee Check ]`-knapp i WordPress Admin Bar som öppnar appen förifylld.
- **Noll manuell inmatning:** Eliminerar helt behovet av att kopiera data manuellt från 6–7 separata källor.

