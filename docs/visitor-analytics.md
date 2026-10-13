# Visitor analytics (first-party)

LEVO counts public page views in SQLite. There is no Cloudflare, Google Analytics, or marketing pixel.

## Cookie

`levo_vid` is a random UUID. httpOnly, `SameSite=Lax`, path `/`, about one year. `Secure` only when the public site is HTTPS (`SITE_ORIGIN` / `COOKIE_SECURE`). It only distinguishes unique browsers. It is not the admin session and is not tied to a name or email.

## What is stored

Table `visitor_events`: `visitor_key`, `path` (no query string), `country` (ISO 3166-1 alpha-2), `referrer` (external page that sent the visitor), `query_params` (sanitized query string), `duration_ms` (time on that page), `created_at`. The raw IP and User-Agent are not stored.

Public client `VisitorBeacon` posts the current path, query string, and `document.referrer` to `POST /api/visitors/hit` on navigation. The Next route resolves country from nginx `X-Real-IP` with an offline lookup, then forwards only the country code to Express. Hits skip `/admin`, `/api`, `/_next`, static files, obvious bots, and **signed-in admin or staff** (anyone with `levo_admin_session`). Same-site or empty referrers are stored as empty and shown as **Direct**. Password-like query keys (`password`, `token`, `session`, and similar) are dropped. Dashboard unique-visitor and page-view counts are public catalog traffic only. Events older than 90 days are deleted when the API starts.

Hits recorded before country / referrer / query columns existed still appear in lists; those fields stay blank (**Unknown** / **Direct**). The IP was never stored, so those older rows cannot be filled in later.

`VisitorBeacon` sends `duration_ms` when the visitor opens another page, hides the tab, or closes it. The API keeps the longest report for that visit, capped at 30 minutes. If no leave was reported, the analysis page uses the gap until that visitor’s next page when the gap is within 30 minutes. The last page of a session with no leave report has no stay time.

## Dashboard

Last **7 days**: unique `visitor_key` values, total page views, top 5 paths. The unique-visitors and page-views tiles, and a **Visitor analysis** button, open `/admin/visitors`.

## Visitor analysis

`/admin/visitors` lists public visits for the last 7, 30, or 90 days:

- **Country** — ISO country code and view count
- **Redirect link** — external referrer, or Direct
- **Parameters** — each remaining `key=value` pair and count
- Visit table — time, country, page, stay, redirect link, and parameters (newest 500)
- Average stay for visits in the range that have a duration

Staff need the **Visitor analysis** page in the role matrix (on by default for system, admin, and operation). `GET /api/admin/visitors` requires that page.

## Privacy

This is first-party counting for the catalog operator. It is not advertising. If the public site is aimed at the UK or EU, show a cookie notice and treat `levo_vid` as an analytics cookie.

Rate limits trust nginx `X-Real-IP` (not the first `X-Forwarded-For` hop).
