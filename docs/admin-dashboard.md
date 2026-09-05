# Admin dashboard

`/admin` is a stats-first home for staff after login.

## Layout

1. **Header** — title, signed-in username and role, API pill (Connected / Not running), Back to Homepage, Log out. The site head banner on `/admin` (except `/admin/login`) keeps **Home** and replaces the public links with **Catalog**, **Projects**, **Settings**, and **Users**, plus a header **Log out** button (signed-out visitors see **Login** on public pages). Hover (or keyboard focus) expands the same sub-options as the shortcut cards below. **Users** in the header is always listed; the dashboard Users card and `/admin/users` remain admin-role only (staff are redirected). On small screens the hamburger lists those sub-options under each heading.
2. **Stat tiles** — size packs, types, series, projects, inquiries (7 days), unique visitors (7 days), page views (7 days), featured series. Tiles that have an admin list page are links (inquiries open `/admin/inquiries`; catalog tiles open series).
3. **Top pages** — last 7 days, if any visitor hits exist.
4. **Shortcuts** — Catalog (Product Types, Series, **Variant**, plus LDT library and AI settings), Projects (plus Contact inquiries), Settings, Users (admin role only). Settings opens `/admin/settings` for brand, homepage, contact, and SEO. See [admin-site-settings.md](admin-site-settings.md). **Variant** (`/admin/variant-options`) is the global option+code catalog; series pages add those options as tags. See [variant-options.md](variant-options.md).
5. **Needs attention** — series with no featured image, size packs with no main photo, inquiries in the last 7 days. Each row is a link. Hidden when all are zero.

Counts come from `GET /api/admin/dashboard` (session required). Next proxies to Express `GET /api/dashboard`. Staff and admin can load it; the user count is included only for admin.

Visitors are first-party public page views, not Cloudflare. Signed-in **admin** and **staff** are not counted. See [visitor-analytics.md](visitor-analytics.md).
