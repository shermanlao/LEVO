# Admin users

Staff logins live in `admin_users` (SQLite locally, PostgreSQL in production). Only the **admin** role can open User management.

## Roles

| Role | Access |
|------|--------|
| `admin` | Catalog, projects, LightX, LDT, AI, and `/admin/users` |
| `staff` | Catalog, projects, LightX, LDT, AI. No user list or user APIs |

The User management card on `/admin` is shown only when the session role is `admin`. **Users** still appears in the site header for all staff; opening `/admin/users` as staff redirects to the dashboard. `GET/POST /api/admin/users` and `/api/admin/users/:id` return 403 for staff.

## Profile fields

| Field | Required | Notes |
|-------|----------|--------|
| Username | Yes | Short display name (2–32 letters, numbers, `_` or `-`). Shown in the header as “Signed in as”. |
| Email | Yes | Unique. This is the login identifier. Stored lowercase. |
| Full name | No | Legal / longer name |
| Phone | No | |
| Position | No | Job title |
| Division | No | Department |
| Role | Yes | `admin` or `staff` |
| Active | Yes | Disabled accounts cannot sign in |

Passwords are stored as scrypt hashes. The session cookie is still `username.role.exp.epoch.sig`. Changing password, username, email, role, or active increments `session_epoch` so existing cookies stop working.

## First admin

On API startup, if `admin_users` is empty, one **admin** row is created from `ADMIN_USERNAME` / `ADMIN_EMAIL` / `ADMIN_PASSWORD`. Locally the defaults are username `admin`, email `admin@levo.local`, password `abc4321`. Production requires `ADMIN_EMAIL` and `ADMIN_PASSWORD` and will not seed the testing password. After that, those env vars are not used for login. Change the profile and password in User management.

Existing rows that were created before email existed are backfilled: `ADMIN_EMAIL` for the seeded username if that env var is set, otherwise `{username}@levo.local`.

## Manage users

1. Sign in as admin and open `/admin`.
2. **User management** → **Manage users** (`/admin/users`).
3. **Add user**: username, email (login), optional full name / phone / position / division, password (at least 10 characters), role admin or staff. The numeric ID is assigned by the database.
4. **Edit**: profile fields, role, active, optional new password.
5. **Delete**: the last remaining **active admin** cannot be deleted, demoted to staff, or disabled.

Next proxies user CRUD to Express `/api/admin-users` on loopback. Those Express routes are not in the public Next rewrites.
