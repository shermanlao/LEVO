# Admin users

Staff logins live in `admin_users` (SQLite locally, PostgreSQL in production). Roles are **system**, **admin**, and **operation**. Page access is stored in `admin_role_permissions` and edited at `/admin/users/access`.

## Roles

| Role | Default access |
|------|----------------|
| `system` | Every admin page. Users and Page access cannot be turned off. |
| `admin` | Every admin page by default, including users and page access. Those two can be unchecked. |
| `operation` | Catalog, partner catalog, LDT, projects, inquiries, settings, and AI. Cannot receive Users or Page access. |

This matches LightX: assign a role on the user, then grant pages on a role × page matrix. Existing `staff` rows become `operation` on API start (session cookies for those accounts stop working until they sign in again). The first seeded account is `system`.

The User management card and **Page access** link show only when the session role can open those pages. Operation opening `/admin/users` is redirected to the dashboard. `GET/POST /api/admin/users` and `/api/admin/users/:id` return 403 without the Users page. `/api/admin/permissions` needs the Page access page.

## Page access

1. Sign in as system or admin and open `/admin/users`.
2. **Page access** (`/admin/users/access`).
3. Check or uncheck pages for each role. Locked cells stay as they are.
4. **Save** writes `admin_role_permissions`. **Reset** restores the defaults above.

Header menus and dashboard cards hide pages the role does not have. The same matrix is enforced on the matching `/api/admin/*` routes.

| Page | Admin UI | API |
|------|----------|-----|
| Catalog | Product types, series, variants | `/api/admin/backend/products`, `product-types`, `product-series`, `variant-options`, `upload` |
| Partner catalog | `/admin/external-catalog` | `/api/admin/external-catalog` |
| LDT library | `/admin/ldt-library` | `/api/admin/photometric-library` |
| Projects | `/admin/projects` | `/api/admin/backend/projects`, `/api/project-upload` |
| Inquiries | `/admin/inquiries` | `/api/admin/inquiries` |
| Settings | `/admin/settings` | `/api/admin/site-settings` |
| AI | `/admin/ai` | `/api/admin/ai` settings, usage, style uploads, and connection test. Generate / refine / stylize / appearance / label / phrase also accept **Catalog** (those buttons live on series and variant pages). |
| Users | `/admin/users` | `/api/admin/users` |
| Page access | `/admin/users/access` | `/api/admin/permissions` |

## Profile fields

| Field | Required | Notes |
|-------|----------|--------|
| Username | Yes | Short display name (2–32 letters, numbers, `_` or `-`). Shown in the header as “Signed in as”. |
| Email | Yes | Unique. This is the login identifier. Stored lowercase. |
| Full name | No | Legal / longer name |
| Phone | No | |
| Position | No | Job title |
| Division | No | Department |
| Role | Yes | `system`, `admin`, or `operation` |
| Active | Yes | Disabled accounts cannot sign in |

Passwords are stored as scrypt hashes. The session cookie is still `username.role.exp.epoch.sig`. Changing password, username, email, role, or active increments `session_epoch` so other browsers are signed out. Saving your own account issues a fresh cookie so the next action (for example Add user) still works. If a tab still has the old cookie, `/api/admin/me` and user APIs return 401 and the UI sends you to `/admin/login` — sign in again; that is not an API outage.

## First admin

On API startup, if `admin_users` is empty, one **system** row is created from `ADMIN_USERNAME` / `ADMIN_EMAIL` / `ADMIN_PASSWORD`. Locally the defaults are username `admin`, email `admin@levo.local`, password `abc4321`. Production requires `ADMIN_EMAIL` and `ADMIN_PASSWORD` and will not seed the testing password. After that, those env vars are not used for login. Change the profile and password in User management.

Existing rows that were created before email existed are backfilled: `ADMIN_EMAIL` for the seeded username if that env var is set, otherwise `{username}@levo.local`.

If `admin_role_permissions` is empty, the default matrix is inserted.

## Manage users

1. Sign in as system or admin and open `/admin`.
2. **User management** → **Manage users** (`/admin/users`).
3. **Add user**: username, email (login), optional full name / phone / position / division, password (at least 10 characters), role system / admin / operation. The numeric ID is assigned by the database.
4. **Edit**: profile fields, role, active, optional new password.
5. **Page access**: role × page checkboxes.
6. **Delete**: the last remaining **active system or admin** cannot be deleted, demoted to operation, or disabled.

Next proxies user CRUD to Express `/api/admin-users` on loopback, and the matrix to `/api/admin-permissions`. Those Express routes are not in the public Next rewrites.
