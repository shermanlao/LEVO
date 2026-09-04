# Security, error, and vulnerability diagnosis

Lighting catalog: Next.js (`frontend/`, port 3000) + Express (`backend-server/`, loopback port 3333) + SQLite.

This document tracks **structural** publish risks. Default testing passwords and encryption keys are a production cutover, not part of the structural work.

## Current architecture

Admin **pages** under `/admin` require the HMAC session cookie (`username.role.exp`). Catalog **writes** go through same-origin `/api/admin/backend/*` (and `/api/admin/ai`, `/api/admin/external-catalog`, `/api/admin/photometric-library`), which call `requireAdminSession` then proxy to Express. User CRUD uses `/api/admin/users` with `requireAdminRole`. Login verifies against Express `POST /api/auth/verify`.

Express listens on `127.0.0.1:3333` only. Next **fallback** rewrites public reads (`/api/contact`, `/api/datasheets`, `/api/labels`, `/api/product-media`, `/api/help-tips`, `/uploads`) only when no Next route matches. Public GET for products, series, types, and projects is a GET-only Next proxy. POST/PUT/DELETE on those public `/api/*` paths (and `/api/upload`) return 405. Mutating catalog/upload traffic uses `/api/admin/backend/*`.

## Structural controls in place

- Admin BFF allowlist: `products`, `product-types`, `product-series`, `projects`, `upload`
- Debug Next routes removed (filesystem probes, unauthenticated DB writes, seed, test image helpers)
- Uploads: MIME allowlist, size cap, random filenames; project uploads require a session
- Series descriptions render as text (no `dangerouslySetInnerHTML`)
- Project `mapLink` only if the scheme is `http:` or `https:`
- Partner fetches: public DNS only, no loopback/private IPs; credentials only to the partner host
- Rate limits on login, contact inquiries, uploads, and AI
- Helmet + CORS allowlist on Express; smaller JSON body limit (20mb retained on `/api/ai`)
- Root `error.tsx` / `global-error.tsx`; production 500s do not send stacks
- Login `next` path allowlisted to `/admin/...`
- Staff directory in SQLite; user APIs require `role === 'admin'`; last active admin cannot be removed
- First-party visitor hits (`levo_vid`) go through Next `POST /api/visitors/hit`; dashboard counts require an admin session

## Production cutover (not done here)

Set `ADMIN_USERNAME`, `ADMIN_PASSWORD`, `ADMIN_SESSION_SECRET`, and `AI_SETTINGS_ENCRYPTION_KEY` before the **first** API start (they seed the first admin row). After that, change passwords in User management. Do not ship the testing defaults.

## Local run

From the repo root: `npm run dev`. Site: `http://localhost:3000`. API: `127.0.0.1:3333` (not reachable from other machines).
