# Security, error, and vulnerability diagnosis

Lighting catalog: Next.js (`frontend/`, port 3000) + Express (`backend-server/`, loopback port 3333) + SQLite locally / PostgreSQL in production.

This document tracks **structural** publish risks and production secret checks.

## Current architecture

Admin **pages** under `/admin` require the HMAC session cookie (`username.role.exp.epoch.sig`). Catalog **writes** go through same-origin `/api/admin/backend/*` (and `/api/admin/ai`, `/api/admin/external-catalog`, `/api/admin/photometric-library`), which call `requireAdminSession` then proxy to Express with `X-Levo-Internal`. User CRUD uses `/api/admin/users` with `requireAdminRole`. Login verifies against Express `POST /api/auth/verify` (internal secret + 12 attempts / 15 min). Changing a user’s password, role, or active flag increments `session_epoch` and invalidates existing cookies.

Express listens on `127.0.0.1:3333` only. Next **fallback** rewrites public reads (`/api/contact`, `/api/datasheets`, `/api/labels`, `/api/product-media`, `/api/help-tips`, `/uploads`) only when no Next route matches. Public GET for products, series, types, and projects is a GET-only Next proxy. POST/PUT/DELETE on those public `/api/*` paths (and `/api/upload`) return 405. Mutating catalog/upload traffic uses `/api/admin/backend/*`.

## Structural controls in place

- Admin BFF allowlist: `products`, `product-types`, `product-series`, `projects`, `upload`, `variant-options`
- Express non-public routes require `X-Levo-Internal` (`INTERNAL_API_SECRET`)
- Production refuses to start if `ADMIN_SESSION_SECRET`, `AI_SETTINGS_ENCRYPTION_KEY`, or `INTERNAL_API_SECRET` are missing or still the local defaults
- Site settings and footer/hero links only accept `http:` / `https:` (or a same-site path for the hero CTA)
- Rate limits on login (Next + Express verify), contact inquiries, uploads, and AI
- Debug Next routes removed (filesystem probes, unauthenticated DB writes, seed, test image helpers)
- Uploads: MIME allowlist, size cap, random filenames, JPEG/PNG/GIF/WebP magic bytes; project uploads require a session
- Series descriptions render as text (no `dangerouslySetInnerHTML`)
- Project `mapLink` only if the scheme is `http:` or `https:`
- Partner fetches: public DNS only, no loopback/private IPs (signed 32-bit mask compare so 172.16/12 and 192.168/16 are blocked); credentials only to the partner host
- Helmet + CORS allowlist on Express; smaller JSON body limit (20mb retained on `/api/ai`)
- Next response headers: `X-Frame-Options: SAMEORIGIN`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`. No HSTS until the site is on HTTPS
- Rate limits trust nginx `X-Real-IP` only (not the first `X-Forwarded-For` hop)
- Root `error.tsx` / `global-error.tsx`; production 500s do not send stacks
- Login `next` path allowlisted to `/admin/...`
- Staff directory in the app database; user APIs require `role === 'admin'`; last active admin cannot be removed
- First-party visitor hits (`levo_vid`) go through Next `POST /api/visitors/hit`; dashboard counts require an admin session

## Production secrets

Set these in `/var/www/levo/backend-server/.env` **and** in the Next.js (`levo-web`) environment before the first production start:

- `ADMIN_USERNAME` / `ADMIN_PASSWORD` — used only when `admin_users` is empty. Production will not seed `abc4321`.
- `ADMIN_SESSION_SECRET` — HMAC cookie key (not `levo-dev-admin-session`)
- `AI_SETTINGS_ENCRYPTION_KEY` — AES key for stored AI tokens (not `levo-local-ai-settings-key`)
- `INTERNAL_API_SECRET` — Next → Express header `X-Levo-Internal` (not `levo-dev-internal`)

After the first admin row exists, change passwords in User management. Do not put these values in git. Local `npm run dev` still uses the documented testing defaults.

## Checks

From the repo root: `npm test` (HMAC session cookie, admin BFF allowlist, public catalog POST → 405 / missing cookie → 401 constants, SSRF host block, cartesian SKU cap, image magic bytes, production secrets, stored hrefs).

Next `typescript.ignoreBuildErrors` is off (`npx tsc --noEmit` in `frontend/` must stay clean). `eslint.ignoreDuringBuilds` stays on until the existing `no-explicit-any` debt in catalog clients is cleaned up.

## Local run

From the repo root: `npm run dev`. Site: `http://localhost:3000`. API: `127.0.0.1:3333` (not reachable from other machines).
