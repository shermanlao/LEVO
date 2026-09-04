# Admin users

Staff logins live in SQLite (`admin_users`). Only the **admin** role can open User management.

## Roles

| Role | Access |
|------|--------|
| `admin` | Catalog, projects, LightX, LDT, AI, and `/admin/users` |
| `staff` | Catalog, projects, LightX, LDT, AI. No user list or user APIs |

The User management card on `/admin` is shown only when the session role is `admin`. **Users** still appears in the site header for all staff; opening `/admin/users` as staff redirects to the dashboard. `GET/POST /api/admin/users` and `/api/admin/users/:id` return 403 for staff.

## First admin

On API startup, if `admin_users` is empty, one **admin** row is created from `ADMIN_USERNAME` / `ADMIN_PASSWORD` (defaults `admin` / `abc4321`). After that, those env vars are not used for login. Change passwords in User management (or by replacing the sqlite row).

## Manage users

1. Sign in as admin and open `/admin`.
2. **User management** → **Manage users** (`/admin/users`).
3. **Add user**: username (2–32 letters, numbers, `_` or `-`; this is the login name), password (at least 6 characters), role admin or staff. The numeric ID is assigned by the database.
4. **Edit**: role, active, optional new password.
5. **Delete**: the last remaining **active admin** cannot be deleted, demoted to staff, or disabled.

Passwords are stored as scrypt hashes. The session cookie is `username.role.exp.sig`.

Next proxies user CRUD to Express `/api/admin-users` on loopback. Those Express routes are not in the public Next rewrites.
