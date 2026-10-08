# Admin login

Staff routes under `/admin` require a signed-in session. Logins are rows in `admin_users` (SQLite locally, PostgreSQL in production), not a single hardcoded pair after first boot.

## How to sign in

1. Start the app (`npm run dev` from the repo root — runs the site and the API together). The site is `http://localhost:3000`; the API listens on `127.0.0.1:3333` (same machine only).
2. Open `http://localhost:3000/admin`, or click the user icon in the site header. You land on `/admin/login`. That form still shows when **UNDER CONSTRUCTION for visitors** is on; only public pages are replaced.
3. Use email `admin@levo.local` and password `abc4321` the first time (or `ADMIN_EMAIL` / `ADMIN_PASSWORD` if those were set when the API first created the users table). After that, use accounts from User management. Username is the display name, not the login.
4. After sign-in the browser stays on the same host (`window.location.replace` to `/admin` or the `next` path). The header user icon becomes an **Admin** tag (opens `/admin`) and a logout icon. Use the header logout icon, or **Log out** on the dashboard, to end the session. Header logout on an admin page returns to the homepage.

If the form shows **Failed to fetch** / cannot reach the login API, the Next.js site is not running. Start it with `npm run dev` and retry. An **Invalid email or password** message means the credentials themselves were rejected. A 502-style message means the Express API is not running.

The session is an httpOnly cookie (`levo_admin_session`) signed with `ADMIN_SESSION_SECRET`. Payload is `username.role.exp` plus HMAC (username stays the cookie subject after email login). Next.js middleware only matches `/admin` and `/admin/:path*` (not `/api/*`, so large Size drawing POSTs are not rejected as Forbidden). It blocks those pages except `/admin/login`. Unsigned visitors are sent to `/admin/login` using the public `Host` / `X-Forwarded-Host` (or `SITE_ORIGIN`) so the browser stays on `http://187.7.21.12/admin`, not the Next.js bind address (`localhost:3000`). Operation cannot open `/admin/users`. Admin writes go through `/api/admin/*` (including `/api/admin/backend` for catalog and uploads, and `/api/admin/users` for the staff directory) and are **not** rewritten as open Express routes.

The cookie is `Secure` only when the public site is HTTPS (`SITE_ORIGIN` / `NEXT_PUBLIC_SITE_URL` starts with `https://`, or `COOKIE_SECURE=true` in `/etc/levo/next.env`). On the current HTTP VPS IP, a `Secure` cookie would never be stored.

Roles: **system**, **admin**, and **operation**, plus a role × page matrix. See [Admin users](admin-users.md). The dashboard layout and counts are in [Admin dashboard](admin-dashboard.md). Public visitor counts use a first-party cookie; see [Visitor analytics](visitor-analytics.md).

If you change your own role or password, other tabs need a fresh cookie. A stale cookie still passes the Next.js path check, but `/api/admin/me` returns 401. Admin pages then send you back to `/admin/login` instead of showing **API: Not running**. Sign in again; do not treat that as a crashed API.

## Dashboard catalog layers

On `/admin`, catalog shortcuts are ordered by hierarchy:

1. **Product Types** → `/admin/product-types` (categories: name, slug, description, featured photos). **Move up** / **Move down** save `sort_order` for `/products`. **Edit** opens `/admin/product-types/[id]/edit`. Featured photos are the type photo (`featured_image_source`) and the 16:9 card (`featured_image`, used on `/products` and this list). Click a filled photo to edit it with AI; **Replace photo** and **Extend to 16:9** match the series editor.
2. **Product Series** → `/admin/product-series` (grouped under a type). The list API must return `{ data: [{ id, attributes: { name, slug, product_type, featured_image, options, ldt_family, product_code, is_featured, show_on_site, option_count, datasheet_labels, ... } }] }` — same shape as product types. Rows are grouped by type in that type’s `sort_order`. **Move up** / **Move down** save `sort_order` inside that type for `/products/{type}` (hidden series keep their slot). **Variants** on a row opens `/admin/product-series/[id]` for variant menus, per-size photos, model code, featured flag, **Show on site** (header switch, default on), **View product** (public `/products/{type}/{series}` in a new tab), datasheet labels, and partner import into that series. A hidden series shows **Hidden** on the list. Create/update/delete use `POST` / `PUT /:id` / `DELETE /:id`. Reorder uses `PUT /reorder` with `{ ids }`. Featured photos are the series photo (`featured_image_page`, used on the series page and family datasheet) and the 16:9 card (`featured_image`, used on this list). Older `featured_image_source` and `featured_image_datasheet` values stay in the database. Files upload through `/api/admin/backend/upload` and are saved as paths on the series row. List thumbs show the card photo; drop / paste / choose is on **Add New Series** / **Edit** and on size photos. Delete unassigns size packs (`series_id` cleared) instead of removing them.
3. **Variant** → `/admin/variant-options` for global spec option labels and SKU codes. Series editors add those options as tags (see [variant-options.md](variant-options.md)).

`/admin/products` and `/admin/products/[id]` redirect to `/admin/product-series`. A product row is now a **size pack** (size + photos) owned by the series, not a visitor SKU.

Partner catalog (LightX) stays as a separate import entry on the same card; import from a series page. **LDT library** (`/admin/ldt-library`) and **AI settings** (`/admin/ai`) are linked from the same dashboard card. **Contact inquiries** (`/admin/inquiries`) is on the Projects card, the inquiries tile, and Needs attention. **User management** (`/admin/users`) is a separate card with **Page access** (`/admin/users/access`). **Git versions** (`/admin/deploy`) is on the Settings card for system and admin only; see [admin-deploy.md](admin-deploy.md). Header menus and dashboard cards hide pages the role does not have.
