# Admin login

Staff routes under `/admin` require a signed-in session. Logins are rows in SQLite (`admin_users`), not a single hardcoded pair after first boot.

## How to sign in

1. Start the app (`npm run dev` from the repo root — runs the site and the API together). The site is `http://localhost:3000`; the API listens on `127.0.0.1:3333` (same machine only).
2. Open `http://localhost:3000/admin`. You are redirected to `/admin/login`.
3. Use ID `admin` and password `abc4321` the first time (or `ADMIN_USERNAME` / `ADMIN_PASSWORD` if those were set when the API first created the users table). After that, use accounts from User management.
4. Use **Log out** on the dashboard to end the session.

If the form shows **Failed to fetch** / cannot reach the login API, the Next.js site is not running. Start it with `npm run dev` and retry. An **Invalid ID or password** message means the credentials themselves were rejected. A 502-style message means the Express API is not running.

The session is an httpOnly cookie (`levo_admin_session`) signed with `ADMIN_SESSION_SECRET`. Payload is `username.role.exp` plus HMAC. Next.js middleware blocks `/admin/*` except `/admin/login`. Staff cannot open `/admin/users`. Admin writes go through `/api/admin/*` (including `/api/admin/backend` for catalog and uploads, and `/api/admin/users` for the staff directory) and are **not** rewritten as open Express routes.

Roles: **admin** (including User management) and **staff** (catalog and projects only). See [Admin users](admin-users.md). The dashboard layout and counts are in [Admin dashboard](admin-dashboard.md). Public visitor counts use a first-party cookie; see [Visitor analytics](visitor-analytics.md).

## Dashboard catalog layers

On `/admin`, catalog shortcuts are ordered by hierarchy:

1. **Product Types** → `/admin/product-types` (categories: name, slug, description, featured image)
2. **Product Series** → `/admin/product-series` (under a type). The list API must return `{ data: [{ id, attributes: { name, slug, product_type, featured_image, options, ldt_family, product_code, is_featured, option_count, datasheet_labels, ... } }] }` — same shape as product types. **Variants** on a row opens `/admin/product-series/[id]` for option tags, per-size photos, model code, featured flag, datasheet labels, and partner import into that series. Create/update/delete use `POST` / `PUT /:id` / `DELETE /:id`. Featured image is one source plus three crops (`featured_image_source`, catalog 16:9 `featured_image`, page 4:5 `featured_image_page`, datasheet 1:1 `featured_image_datasheet`) uploaded through `/api/admin/backend/upload` then saved as paths on the series row. Delete unassigns size packs (`series_id` cleared) instead of removing them.
3. **Variant** → `/admin/variant-options` for global spec option labels and SKU codes. Series editors add those options as tags (see [variant-options.md](variant-options.md)).

`/admin/products` and `/admin/products/[id]` redirect to `/admin/product-series`. A product row is now a **size pack** (size + photos) owned by the series, not a visitor SKU.

Partner catalog (LightX) stays as a separate import entry on the same card; import from a series page. **LDT library** (`/admin/ldt-library`) and **AI settings** (`/admin/ai`) are linked from the same dashboard card. **Contact inquiries** (`/admin/inquiries`) is on the Projects card, the inquiries tile, and Needs attention. **User management** (`/admin/users`) is a separate card, visible to the admin role only. The site header still lists **Users** for all signed-in staff.
