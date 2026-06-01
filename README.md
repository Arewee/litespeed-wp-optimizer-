# LiteSpeed Cache & WordPress Optimizer Dashboard

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
1. Öppna denna app och ladda upp dina filer (källkodsanalys, WooCommerce-status, samt din nyligen exporterade `litespeed.data`-fil i slot 6).
   - *Tips:* Om du startar en helt ny sajt och inte har någon `litespeed.data`-fil än, lämnar du bara Slot 6 tom. Appen kommer då automatiskt att generera en optimal profil från scratch!
2. Gå till fliken **LSCWP Inställningar** för att se rekommendationer skräddarsydda efter din sajts unika källkod.
3. Anpassa inställningarna direkt i appen vid behov.

### 4. Exportera och Importera tillbaka till WordPress
1. Klicka på **Exportera optimerad .data-fil** längst ner i appen.
2. Appen slår samman dina visuella val med din ursprungliga fil, vilket gör att alla övriga 100+ inställningar (CDN, databasscheman osv.) behålls intakta.
3. Gå tillbaka till WordPress under **LiteSpeed Cache -> Verktyg -> Importera/Exportera**.
4. Välj den nya optimerade filen du laddade ner från appen och klicka på **Importera**.

**Klart! Din sajt är nu maximalt optimerad och helt fri från kända källkodskonflikter!** 🌟
