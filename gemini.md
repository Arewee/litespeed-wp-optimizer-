# gemini.md - AreWee-Optimizer Projektregler & Arbetsinstruktioner

## 🕒 Svarsformat & Header
Varje svar från assistenten **MÅSTE** inledas med följande rad högst upp:
`AreWee-Optimizer [Tid] - [Datum (YYMMDD)]`
*Exempel:* `AreWee-Optimizer 10:20 - 260916`

## 🚦 Arbetsflöde, Instruktionsefterlevnad & Klartecken
1. **Obligatorisk kontroll inför varje svar**:
   - Assistenten ska **ALLTID läsa, konsultera och följa `gemini.md` inför VARJE enskilt svar**, utan undantag!
2. **STRIKT KODFÖRBUD utan uttryckligt användarkommando**:
   - Assistenten **BÖRJAR ALDRIG KODA** eller genomföra ändringar/skrivningar i projektfiler förrän användaren uttryckligen och specifikt har gett klartecken och bett assistenten att börja koda.
3. **Frågor, Verifiering & Redo att koda**:
   - Assistenten ska alltid ställa kontrollfrågor vid behov för att säkerställa 100% förståelse för användarens prompt och avsikt.
   - När assistenten har analyserat läget, är helt redo och inte har några fler frågor till användaren på prompten, ska assistenten meddela att den är **klar att koda** och avsluta med:
     `"inga fler frågor - avvaktar klartecken för att börja"`
4. **Git Commit & Push**:
   - `git commit` och `git push` får **ENDAST** genomföras när användaren uttryckligen ber om det.
5. **Risk- & Konsekvensanalys samt Kvalitetssäkring innan start**:
   - När alla frågor är besvarade kan assistenten dela en **Risk- och konsekvensanalys** för det planerade arbetet:
     - Vilka potentiella risker och konflikter kan uppstå i relation till den miljö respektive sajt kör i.
     - Vad som är smart att genomföra stegvis för att möjliggöra snabbare och enklare felsökning.
     - Hur felsökning hanteras och hur onödiga fel förebyggs genom assistentens **egna automatiserade tester** innan kod presenteras (inga syntax- eller logikfel tolereras).
     - Försäkran om att koden är optimalt prestandaoptimerad, anpassad till senaste relevanta best-practice för WordPress-miljöer, säker samt följer gällande lagar och integritetspolicyer (GDPR/ePrivacy vid t.ex. CTM-spårning).
6. **Versionsökning vid kodändringar**:
   - Alla godkända kodändringar och uppdateringar **MÅSTE** medföra ett nytt, bumpat versionsnummer (semantisk versionshantering: Patch för fixar/småjusteringar, Minor för nya funktioner/moduler, Major för arkitekturändringar).
   - Det nya versionsnumret ska uppdateras synkront i UI (`index.html`), skript (`app.js`, `rules.js`, `exporter.js`), dokumentation (`README.md`, `gemini.md`) och cache-busting-parametrar.

## 📌 Projektets Riktlinjer & Arkitektur (v2.6.10.3)
1. **Versionshantering & Benchmark-granskning**:
   - Om en sajt medvetet kör en äldre version av t.ex. WordPress eller WooCommerce (i väntan på buggfixar/stabilitet) ska appen **flagga** att en nyare version finns tillgänglig.
   - **Viktigt:** Vid granskning och jämförelse mot officiell dokumentation och rekommenderade inställningar ska jämförelsen **alltid göras mot samma/rätt version** som körs på sajten.
   - Relevanta forum, community-rapporter och expertkällor ska kontrolleras för bästa möjliga svar och källhänvisningar.
2. **Egenskapade verktyg (CTM & SCM)**:
   - **CTM (Consent & Tag Manager)**: Ersätter GTM4WP, Complianz och PixelYourSite. JS- och samtyckesskript måste exkluderas korrekt från LiteSpeeds JS Delay/Combine.
   - **SCM (Server & Site Configuration Module)**: Egenutvecklad servermodul för caching, Redis, HTTP/3, säkerhet och cron-styrning.
3. **Fullständig inställningsstruktur (1:1 paritet med plugins)**:
   - Alla inställningar i LiteSpeed Cache, Wordfence, Elementor, WooCommerce och WordPress Core ska visas i samma struktur och ordning som i respektive plugin.
   - Kritiska inställningar för stabilitet, säkerhet och e-handel ska markeras tydligt med visuella badges/varningsikoner.
4. **Transparent Health Score**:
   - Det ska framgå exakt hur poängen räknas ut med en tydlig nedbrytning per kategori (Stabilitet, Prestanda, Säkerhet, Konfiguration).
5. **Stegvis process**:
   - Steg 1: Analys och översikt baserad på uppladdade filer.
   - Steg 2: Export och nedladdning av färdiga `.data`- och konfigurationsfiler.
