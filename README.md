# LEVO

Lighting catalog site (Next.js) plus Express API. Local development uses SQLite. Production uses PostgreSQL.

See [markdown_index.md](markdown_index.md) for guides. PostgreSQL setup: [docs/postgresql.md](docs/postgresql.md).

## Run

```bash
npm run dev
```

- Site: http://localhost:3000
- API: http://127.0.0.1:3333
- Local database: `backend-server/database.sqlite` (created locally; not committed)
- Production database: set `DATABASE_URL` (see [docs/postgresql.md](docs/postgresql.md))
- Admin: http://localhost:3000/admin

Clone this repo, run `npm install` at the root plus `frontend` and `backend-server`, then `npm run dev`. Local `node_modules`, `.next`, `.env`, and SQLite files are gitignored.
