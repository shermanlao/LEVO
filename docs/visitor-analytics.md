# Visitor analytics (first-party)

LEVO counts public page views in SQLite. There is no Cloudflare, Google Analytics, or marketing pixel.

## Cookie

`levo_vid` is a random UUID. httpOnly, `SameSite=Lax`, `Secure` in production, path `/`, about one year. It only distinguishes unique browsers. It is not the admin session and is not tied to a name or email.

## What is stored

Table `visitor_events`: `visitor_key`, `path` (no query string), `created_at`. No IP, no User-Agent.

Public client `VisitorBeacon` posts the current path to `POST /api/visitors/hit` on navigation. Hits skip `/admin`, `/api`, `/_next`, static files, obvious bots, and **signed-in admin or staff** (anyone with `levo_admin_session`). Dashboard unique-visitor and page-view counts are public catalog traffic only. Events older than 90 days are deleted when the API starts.

## Dashboard

Last **7 days**: unique `visitor_key` values, total page views, top 5 paths.

## Privacy

This is first-party counting for the catalog operator. It is not advertising. If you later need a cookie notice for UK visitors, treat `levo_vid` as an analytics cookie.
