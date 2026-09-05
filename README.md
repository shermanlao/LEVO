# LEVO

Lighting catalog site (Next.js) plus Express API. Local development uses SQLite. Production uses PostgreSQL.

See [markdown_index.md](markdown_index.md) for guides. PostgreSQL: [docs/postgresql.md](docs/postgresql.md). More than one site on the VPS: [docs/vps-multiple-sites.md](docs/vps-multiple-sites.md). Do not run the unused `cms/` or `backend/` folders ([docs/legacy-unused.md](docs/legacy-unused.md)).

## Run

```bash
npm run dev
```

- Site: http://localhost:3000
- API: http://127.0.0.1:3333
- Local database: `backend-server/database.sqlite` (created locally; not committed)
- Production database: set `DATABASE_URL` (see [docs/postgresql.md](docs/postgresql.md))
- Admin: http://localhost:3000/admin

Clone this repo, run `npm install` at the root plus `frontend` and `backend-server`, then `npm run dev`. Local `node_modules`, `.next`, `.env`, and SQLite files are gitignored. From the root, `npm test` runs the API unit checks (session cookie, SSRF, upload magic bytes, catalog allowlist).

Production on the VPS pulls this GitHub repo with `sudo /usr/local/sbin/levo-deploy`. In Cursor you can say **push** and **deploy** instead of doing that by hand. Setup steps: [docs/vps-github.md](docs/vps-github.md).
