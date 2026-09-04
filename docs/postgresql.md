# PostgreSQL (production) and SQLite (local)

The live API is `backend-server`. Sequelize talks to **SQLite** when you are developing, and to **PostgreSQL** when you set a Postgres connection string.

| Phase | Engine | How it is chosen |
| --- | --- | --- |
| Local development | SQLite file `backend-server/database.sqlite` | No `DATABASE_URL`, or `DB_DIALECT=sqlite` |
| Production | PostgreSQL | `DATABASE_URL=postgres://…` or `DB_DIALECT=postgres` |

Do not commit `.env` files. Copy `backend-server/.env.example` to `backend-server/.env`.

## 1. Install PostgreSQL on Windows

1. Download the Windows installer from [https://www.postgresql.org/download/windows/](https://www.postgresql.org/download/windows/) (EDB installer).
2. Install PostgreSQL 16. Keep **pgAdmin** and **Command Line Tools** checked.
3. Set a password for the `postgres` superuser and remember it.
4. Default port is `5432`. Finish the installer.
5. Open **SQL Shell (psql)** or PowerShell after adding `C:\Program Files\PostgreSQL\16\bin` to PATH.

Create the app role and database (psql as `postgres`):

```sql
CREATE USER levo WITH PASSWORD 'choose-a-strong-password';
CREATE DATABASE levo OWNER levo;
GRANT ALL PRIVILEGES ON DATABASE levo TO levo;
```

Then connect to `levo` and allow the role to create tables:

```sql
\c levo
GRANT ALL ON SCHEMA public TO levo;
ALTER SCHEMA public OWNER TO levo;
```

## 2. Point LEVO at PostgreSQL

In `backend-server/.env`:

```
DB_DIALECT=postgres
DATABASE_URL=postgres://levo:choose-a-strong-password@127.0.0.1:5432/levo
ADMIN_USERNAME=admin
ADMIN_PASSWORD=change-me
ADMIN_SESSION_SECRET=use-a-long-random-string
AI_SETTINGS_ENCRYPTION_KEY=use-a-long-random-string
SITE_ORIGIN=https://your-domain.example
```

Hosted Postgres (Neon, Railway, Render, Supabase, AWS RDS) usually needs TLS:

```
DATABASE_SSL=true
DATABASE_SSL_INSECURE=true
```

Use `DATABASE_SSL_INSECURE=true` only when the provider uses a certificate Node does not already trust.

## 3. Create tables, then copy local catalog data

Start the API once so Sequelize creates the Postgres tables:

```bash
cd backend-server
npx ts-node-dev --transpile-only src/server.ts
```

Stop it after the log line `Database connected (postgres)` and `All models were synchronized successfully.`

Copy the existing SQLite catalog into Postgres (this **replaces** rows in the listed tables):

```bash
cd backend-server
npm run db:copy-sqlite-to-pg
```

The script reads `SQLITE_PATH` or `backend-server/database.sqlite` and writes to `DATABASE_URL`.

Then start the full app from the repo root:

```bash
npm run dev
```

Sign in at `http://localhost:3000/admin` with the admin user that was copied, or the first-boot user from `ADMIN_USERNAME` / `ADMIN_PASSWORD` if `admin_users` was empty.

## 4. Production checklist

- Set `DATABASE_URL` on the host. Do not use the SQLite file in production.
- Set `ADMIN_SESSION_SECRET` and `AI_SETTINGS_ENCRYPTION_KEY` before the first production boot.
- Change the default admin password after the first sign-in.
- Keep Express on loopback (`127.0.0.1:3333`) and put the Next.js site in front, or set `SITE_ORIGIN` to the public site URL if Express must accept that origin.
- Uploads stay on disk under `frontend/public/`. Put that folder on persistent storage or object storage when you deploy.
- After deploy, open `/admin`, create a product type, and load a public catalog page to confirm Postgres reads and writes.

## 5. Switch back to local SQLite

Remove `DATABASE_URL` and `DB_DIALECT` from `.env`, or set `DB_DIALECT=sqlite`. The API uses `backend-server/database.sqlite` again.

## Connection variables

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` | Full `postgres://user:pass@host:5432/dbname` string |
| `DB_DIALECT` | `sqlite` or `postgres` (optional if the URL starts with `postgres`) |
| `DATABASE_HOST` / `DATABASE_PORT` / `DATABASE_NAME` / `DATABASE_USER` / `DATABASE_PASSWORD` | Used when `DATABASE_URL` is empty |
| `PGHOST` / `PGPORT` / `PGDATABASE` / `PGUSER` / `PGPASSWORD` | Same fields, libpq names |
| `DATABASE_SSL` | `true` to require TLS |
| `DATABASE_SSL_INSECURE` | `true` to skip CA verification |
| `SQLITE_PATH` | Override the local SQLite file |
| `DB_LOGGING` | `true` to print SQL |

Code: `backend-server/src/database.ts`, `backend-server/src/lib/dbSchema.ts`, `backend-server/src/scripts/copySqliteToPostgres.ts`.
