# AreWee-Optimizer — unmeasured / false-negative audit

- Generated: 2026-09-24 16:08 CEST
- Export: `/Users/richardviitanen/Downloads/LSCWP_cfg-www.roligakalsonger.se_-20260924_083028.data` (188 keys, LSCWP line-JSON tuples)
- Tree: `rules.js` + `exporter.js` **v2.7.1.4** (another agent may still be touching soft-measure; this audit is read-only)
- Method: node `vm` load of exporter+rules → `parseSettingsFile` → `buildCompleteLscwpSettings` → `getOptionComparison` for every LiteSpeed catalog option (56)
- Env stub: Woo + Elementor + LiteSpeed server
- **No commits / no version bumps / no production JS edits**

## Headline counts (this export, this tree)

| Bucket | n | Notes |
|--------|--:|-------|
| LiteSpeed catalog options | 56 | |
| Measured on real export | **56 / 56** | includes soft-covers |
| **A) False-unmeasured on THIS export** | **0 hard** | `crawler_usleep` soft-covered because `crawler=false` |
| **A-residual) False-unmeasured when crawler ON** | **1** | `crawler-crawl_interval` still not aliased to `crawler_usleep` |
| **B) True unmeasured (catalog)** | **0** | |
| **C) Suspicious measured / round-trip** | **≥8** | see below |
| `.data` settings-like keys with no catalog option | **many** | export-gaps / intentional omits |

> Original class (`media_webp` absent + `img_optm_*` empty/false) looks **fixed** on 2.7.1.4 for this file. Remaining work is sibling bugs (crawler interval rename, write-key drift, alias pollution, catalog gaps).

---

## Top findings for Sensei (≥10)

1. **[A-residual / mapping] `crawler_usleep`** — Export has `crawler-crawl_interval=302400` (LSCWP 7.x renamed usleep→interval). Soft-cover **6d** measures `Inaktiv (Crawler AV)` only while `crawler` is OFF. If crawler is ON, even with `crawler-crawl_interval` present → **`isMeasured=false`**. `crawler-usleep` alone measures; interval does not.
   - Fix: **mapping** `crawler-crawl_interval` → `crawler_usleep` (and/or rename UI to Crawl Interval). Soft-cover alone is incomplete.

2. **[info / soft-cover OK] `media_webp`** — `media-webp` absent; `img_optm-webp=1` present → `AV (Next-Gen täcker)` / Policy. Same class as the original bug; covered on this tree.
   - Fix: keep **soft-cover**; add regression test with crawler-style “parent on + covering key” if missing.

3. **[mapping-risk] Extra INTERNAL aliases → `media_webp`** — Still folded: `media-optm_webp`, `media_optm_webp`, `media-webp_dec`, `media_webp_dec`. Historical false-ON risk.
   - Fix: **mapping cleanup** (keep only `media-webp` / `media_webp`).

4. **[C-round-trip] `optm_font_display`** — READ via `optm-css_font_display`; WRITE key `optm-font_display` ∉ export.
   - Fix: **mapping** `KEY_MAPPING_TO_LSCWP.optm_font_display = "optm-css_font_display"`.

5. **[C-round-trip] `optm_emojis_rm`** — READ via `optm-emoji_rm`; WRITE `optm-emojis_rm` ∉ export.
   - Fix: **mapping** → `optm-emoji_rm`.

6. **[C-round-trip] `cache_object`** — READ via `object`; WRITE `cache-object` ∉ export.
   - Fix: **mapping** → `object` (mirror `guest_mode`→`guest`).

7. **[C-round-trip] `domain_key`** — READ via `hash`; WRITE `domain_key` ∉ export. Sibling **`api_key`** present and **unmapped**.
   - Fix: **mapping** write=`hash`; **omit or map** `api_key`.

8. **[candidate / mapping+UI] `crawler_load_limit`** — In export as `crawler-load_limit=1`. In KEY maps (`crawler-load_limit`) but **not in catalog**.
   - Fix: **add catalog option** or **omit from maps** (dead map).

9. **[candidate / mapping] `db_optm_*` map entries** — Maps list `db_optm_revisions` etc.; export has `db_optm-revisions_max` / `db_optm-revisions_age` (untranslated leftovers in parsed). No DB Optimizer UI.
   - Fix: **mapping** to real keys + UI, or **drop dead maps**.

10. **[candidate / export-gap] `cdn-mapping`** — Present; INTERNAL may map to `cdn_mapping`; **no catalog option** (only `cdn` / `cdn_quic` / `cdn_cloudflare`).
    - Fix: **omit from UI** (document) or **add option**.

11. **[candidate / export-gap] Media satellites** — `media-lqip*`, `media-add_missing_sizes`, `media-iframe_lazy`, `media-auto_rescale_ori`, `img_optm-jpg_quality=82` in `.data`; not in 56-option catalog.
    - Fix: **omit from UI** or selective **add**.

12. **[candidate / export-gap] Crawler satellites** — `crawler-sitemap`, `crawler-roles`, `crawler-cookies` (+ interval/load_limit) beyond UI.
    - Fix: **omit from UI** or extend crawler tab.

13. **[C-suspicious UX] Duplicate `domain_key`** — Same id on **general** and **image_optimization** tabs.
    - Fix: **omit from UI** on image tab.

14. **[latent] Fallback `id.replace(/_/g, "-")`** — Global underscore→hyphen invents `optm-css-min` but LSCWP uses first-separator form `optm-css_min`. Any future unmapped mixed key → false unmeasured (same class as old `img_optm_sizes-skipped`).
    - Fix: **fallback** = first `_`→`-` only; keep maps complete.

15. **[accept / soft-cover OK] Parent-off satellites** — `js_delayed_exclude`, `optm_ccss_per_url`, `optm_css_async_inline`, `optm_ggfonts_async`, `media_lazy_exc`, `media_vpi` soft-measure correctly on this export.
    - Fix: **accept**; guard with tests.

16. **[accept] `img_optm_*` empty/false** — `img_optm-sizes_skipped=[]` → Tom/Standard measured; falsy lossless/exif/rm_bkup measure AV; wrong `img_optm_sizes-skipped` alone stays unmeasured.
    - Fix: **accept** (prior bug class closed).

17. **[C-policy] `optm_qs_rm` / `crawler`** — Measured as PÅ/AV but status Avvikelse vs recommendation. Not measure bugs; policy check.
    - Fix: **policy review**.

18. **[candidate / export-gap] Heartbeat / localize / html_lazy / avatar / QC** — `misc-heartbeat_*`, `optm-localize*`, `optm-html_lazy`, `discuss-avatar_*`, `qc-nameservers` in export, no catalog.
    - Fix: **omit from UI** (labeled candidates).

---

## A) False unmeasured

### On this export (crawler OFF)
No catalog option is hard-unmeasured. Soft-covers hide gaps for `media_webp` and `crawler_usleep`.

### Residual (repro — crawler ON)

```
getOptionComparison(crawler_usleep, {...parsed, crawler:"1"})
  → isMeasured=false

getOptionComparison(crawler_usleep, {crawler:"1", "crawler-crawl_interval":302400})
  → isMeasured=false          // BUG: covering key ignored

getOptionComparison(crawler_usleep, {crawler:"1", "crawler-usleep":1000})
  → isMeasured=true           // only legacy key works
```

| Field | Value |
|-------|-------|
| Catalog id | `crawler_usleep` |
| Title | Crawler Fördröjning (Mikrosekunder) |
| MAP_L today | `crawler-usleep` (hyphen OK for legacy) |
| Export reality | `crawler-crawl_interval` (no usleep key) |
| Soft-cover 6d | only when crawler present & OFF |

---

## B) True unmeasured

**None** in the 56 LiteSpeed catalog options for this export (after soft-covers).

Absence notes:
- `media-webp` omitted while other `media-*` keys exist → soft-cover is correct product behavior.
- `optm-js_delayed_exc` omitted while defer≠delayed → soft-cover OK.
- `media-lazy_native` absent from export **and** catalog (version skew; not in-catalog unmeasured).

---

## C) Suspicious measured

| id | display / status | Issue |
|----|------------------|-------|
| `media_webp` | AV (Next-Gen täcker) / Policy | Soft OK; alias pollution remains |
| `crawler_usleep` | Inaktiv (Crawler AV) / Policy | Soft OK here; residual when crawler ON |
| `domain_key` | Ansluten (masked) / Policy × **2 tabs** | Duplicate + write-key drift |
| `cache_object` | PÅ / Optimal | READ `object`; WRITE would be `cache-object` |
| `optm_font_display` | PÅ / Optimal | READ `optm-css_font_display`; WRITE drift |
| `optm_emojis_rm` | PÅ / Optimal | READ `optm-emoji_rm`; WRITE drift |
| `optm_qs_rm` | PÅ / Avvikelse | Policy vs rec |
| `crawler` | AV / Avvikelse | Rec PÅ; expected deviant |

---

## Risk-area probe (requested)

| Area | Result |
|------|--------|
| `media_webp` / `media-webp` missing | Soft-measured via `img_optm-webp` ✅ |
| `img_optm_*` empty / false | Measured ✅ |
| Wrong hyphen `img_optm_sizes-skipped` | Alone → unmeasured (correct) ✅ |
| CDN / `domain_key` / quic | CDN family measured; `domain_key` write drift + dup tab ⚠️ |
| `crawler_*` | Master OK; usleep residual ⚠️; load_limit map-without-UI ⚠️ |
| `optm_*` satellites when parent off | Soft OK ✅ |
| Guest / ESI / object aliases | guest/esi OK; object READ OK, WRITE drift ⚠️ |
| Historical wrong → `media_webp` maps | optm_webp / webp_dec still present ⚠️ |

### `media_webp` INTERNAL aliases (cleanup list)

```
media-webp → media_webp
media_webp → media_webp
media-optm_webp → media_webp      ← remove
media_optm_webp → media_webp      ← remove
media-webp_dec → media_webp       ← remove
media_webp_dec → media_webp       ← remove
```

---

## Set difference

### Catalog LS ids with no direct `.data` key

| id | Resolution |
|----|------------|
| `media_webp` | soft via `img_optm-webp` |
| `js_delayed_exclude` | soft via defer≠delayed |
| `crawler_usleep` | soft via crawler OFF; **hard miss if crawler ON** |

### High-signal `.data` keys with no catalog option

- `crawler-load_limit`, `crawler-crawl_interval`, `crawler-sitemap`, `crawler-roles`, `crawler-cookies`
- `db_optm-revisions_max`, `db_optm-revisions_age`
- `cdn-mapping`, `cdn-ori`, `cdn-attr`, …
- `media-lqip*`, `media-iframe_lazy`, `media-add_missing_sizes`, `media-auto_rescale_ori`
- `img_optm-jpg_quality`
- `api_key` (beside `hash`→`domain_key`)
- `object-kind` / host / port / life / … (partially mapped, no UI)
- `misc-heartbeat_*`, `optm-localize*`, `optm-html_lazy`, `discuss-avatar_*`, `qc-nameservers`
- `esi-cache_admbar`, `esi-cache_commform`, `esi-nonce`
- Large intentional omit sets: `purge-*`, `debug-*`, `cache-ttl_*`, `cache-exc_*`

---

## Dump: catalog LiteSpeed option ids (56)

```
auto_upgrade
domain_key
guest_mode
guest_optm
server_ip
cache
cache_priv
cache_commenter
cache_rest
cache_page_login
cache_mobile
drop_uri
esi
cache_object
cache_browser
optm_html_min
optm_css_min
optm_css_comb
optm_css_comb_ext_inl
optm_ucss
optm_ucss_inline
optm_css_async
optm_ccss_per_url
optm_css_async_inline
optm_font_display
optm_ggfonts_async
optm_ggfonts_rm
css_exclude
optm_js_min
optm_js_comb
optm_js_comb_ext_inl
optm_js_defer
js_exclude
js_delayed_exclude
media_lazy
media_lazy_exc
media_webp
media_vpi
cdn
cdn_quic
cdn_cloudflare
domain_key                 ← duplicate on image_optimization
img_optm_auto
img_optm_ori
img_optm_rm_bkup
img_optm_lossless
img_optm_sizes_skipped
img_optm_exif
img_optm_webp
img_optm_webp_attr
img_optm_webp_replace_srcset
optm_qs_rm
optm_dns_prefetch
optm_emojis_rm
crawler
crawler_usleep
```

## Dump: all `.data` keys (188)

```
_version
hash
api_key
auto_upgrade
server_ip
guest
guest_optm
news
cache
cache-priv
cache-commenter
cache-rest
cache-page_login
cache-mobile
cache-mobile_rules
cache-browser
cache-exc_useragents
cache-exc_cookies
cache-exc_qs
cache-exc_cat
cache-exc_tag
cache-force_uri
cache-force_pub_uri
cache-priv_uri
cache-exc
cache-exc_roles
cache-drop_qs
cache-ttl_pub
cache-ttl_priv
cache-ttl_frontpage
cache-ttl_feed
cache-ttl_rest
cache-ttl_browser
cache-ttl_status
cache-login_cookie
cache-ajax_ttl
cache-vary_cookies
cache-vary_group
purge-upgrade
purge-stale
purge-post_all
purge-post_f
purge-post_h
purge-post_p
purge-post_pwrp
purge-post_a
purge-post_y
purge-post_m
purge-post_d
purge-post_t
purge-post_pt
purge-timed_urls
purge-timed_urls_time
purge-hook_all
esi
esi-cache_admbar
esi-cache_commform
esi-nonce
util-instant_click
util-no_https_vary
debug-disable_all
debug
debug-ips
debug-level
debug-filesize
debug-collapse_qs
debug-inc
debug-exc
debug-exc_strings
db_optm-revisions_max
db_optm-revisions_age
optm-css_min
optm-css_comb
optm-css_comb_ext_inl
optm-ucss
optm-ucss_inline
optm-ucss_whitelist
optm-ucss_file_exc_inline
optm-ucss_exc
optm-css_exc
optm-js_min
optm-js_comb
optm-js_comb_ext_inl
optm-js_delay_inc
optm-js_exc
optm-html_min
optm-html_lazy
optm-html_skip_comment
optm-qs_rm
optm-ggfonts_rm
optm-css_async
optm-ccss_per_url
optm-ccss_sep_posttype
optm-ccss_sep_uri
optm-ccss_whitelist
optm-css_async_inline
optm-css_font_display
optm-js_defer
optm-emoji_rm
optm-noscript_rm
optm-ggfonts_async
optm-exc_roles
optm-ccss_con
optm-js_defer_exc
optm-gm_js_exc
optm-dns_prefetch
optm-dns_prefetch_ctrl
optm-dns_preconnect
optm-exc
optm-guest_only
object
object-kind
object-host
object-port
object-life
object-persistent
object-admin
object-db_id
object-user
object-pswd
object-global_groups
object-non_persistent_groups
discuss-avatar_cache
discuss-avatar_cron
discuss-avatar_cache_ttl
optm-localize
optm-localize_domains
media-lazy
media-lazy_placeholder
media-placeholder_resp
media-placeholder_resp_color
media-placeholder_resp_svg
media-lqip
media-lqip_qual
media-lqip_min_w
media-lqip_min_h
media-placeholder_resp_async
media-iframe_lazy
media-add_missing_sizes
media-lazy_exc
media-lazy_cls_exc
media-lazy_parent_cls_exc
media-iframe_lazy_cls_exc
media-iframe_lazy_parent_cls_exc
media-lazy_uri_exc
media-lqip_exc
media-vpi
media-vpi_cron
media-auto_rescale_ori
img_optm-auto
img_optm-ori
img_optm-rm_bkup
img_optm-webp
img_optm-lossless
img_optm-sizes_skipped
img_optm-exif
img_optm-webp_attr
img_optm-webp_replace_srcset
img_optm-jpg_quality
crawler
crawler-crawl_interval
crawler-load_limit
crawler-sitemap
crawler-roles
crawler-cookies
misc-heartbeat_front
misc-heartbeat_front_ttl
misc-heartbeat_back
misc-heartbeat_back_ttl
misc-heartbeat_editor
misc-heartbeat_editor_ttl
cdn
cdn-ori
cdn-ori_dir
cdn-exc
cdn-quic
cdn-cloudflare
cdn-cloudflare_email
cdn-cloudflare_key
cdn-cloudflare_name
cdn-cloudflare_zone
cdn-cloudflare_clear
cdn-mapping
cdn-attr
qc-nameservers
qc-cname
debug-disable_tmp
_cache
```

---

## Method notes

1. Loaded `js/exporter.js` + `js/rules.js` in node `vm` (same idea as `scratch/test-v2712.js`).
2. Parsed real export; compared every LiteSpeed `makeOpt` id.
3. Classified A/B/C; computed catalog↔`.data` differences after KEY maps + hyphen variants + soft-cover hints.
4. Re-validated after discovering in-flight 2.7.1.4 soft-cover for `crawler_usleep` when crawler OFF — residual bug documented with crawler-ON repro.
5. Helpers: `scratch/audit-unmeasured-run.js`, `scratch/audit-unmeasured-dig.js`, `scratch/audit-unmeasured-dig2.js` (scratch only).

## Sensei priority table

| P | id | one-line cause | fix type |
|---|----|----------------|----------|
| P0 | `crawler_usleep` | `crawler-crawl_interval` not aliased; soft-cover only when crawler OFF | mapping (+ optional rename) |
| P1 | `optm_font_display` / `optm_emojis_rm` / `cache_object` / `domain_key` | READ aliases OK, WRITE keys wrong | mapping |
| P1 | `media_webp` aliases | optm_webp / webp_dec still fold into media_webp | mapping cleanup |
| P2 | `crawler_load_limit` | export+map, no UI | add UI or omit map |
| P2 | `db_optm_*` | dead maps vs revisions_max/age | mapping / omit |
| P3 | `cdn-mapping`, lqip, iframe_lazy, jpg_quality, heartbeat, … | export-only | omit from UI or add |
| P3 | duplicate `domain_key` | two tabs | omit from UI |
| P3 | `/_/g→-` fallback | latent false unmeasured | fallback fix |
| — | `media_webp` / empty `img_optm_*` | prior class | accept (fixed on 2.7.1.4) |
