# Git versions (`/admin/deploy`)

System and admin can open **Settings → Git versions** to see the running git SHA, fetch GitHub, and deploy or roll back a commit on the VPS. Operation never sees the page, the nav link, or the API.

This is the in-admin equivalent of asking Cursor to run `sudo /usr/local/sbin/levo-deploy`.

## Who can open it

| Role | Access |
|------|--------|
| `system` | Always on. Cannot be unchecked on Page access. |
| `admin` | Always on. Cannot be unchecked on Page access. |
| `operation` | Never. Cannot be granted on Page access. Middleware and `AdminPageGate` send them back to `/admin`. |

`GET`/`POST /api/admin/deploy` returns 403 without the Git versions page.

## What the page does

1. Sign in as system or admin and open `/admin/deploy`.
2. **Current version** shows the SHA, message, author, branch, and GitHub remote (passwords stripped).
3. **Fetch from GitHub** downloads new commits without changing the live site.
4. **Live admin** opens `https://levolight.com/admin` in a new tab so you can check production after a deploy.
5. **Deploy** on a row (or **Redeploy current version**) checks out that branch or SHA, rebuilds the API and Next.js site, and restarts `levo-api` and `levo-web`. Confirm first; the public site may be briefly unavailable.
6. The last deploy log stays on the page. While a job is running, the page refreshes every 2 seconds.

Local `npm run dev` can list commits and fetch. Production deploy buttons stay disabled unless `/usr/local/sbin/levo-deploy` exists (the VPS).

## APIs

| Call | Role |
|------|------|
| `GET /api/admin/deploy` | Current SHA, last 40 commits (`HEAD` plus `origin/main` when present), whether deploy is available, last job status |
| `POST /api/admin/deploy` `{ "action": "fetch" }` | `git fetch origin --prune` |
| `POST /api/admin/deploy` `{ "action": "deploy", "ref": "main" }` or a SHA | Starts `/usr/local/sbin/levo-deploy --background <ref>` (202). Refs are validated; git is `execFile`, not a shell string. |

Next checks the session and the `deploy` page key, then proxies to Express `/api/deploy` with `X-Levo-Internal`.

## VPS one-time setup

After this feature is first pulled onto the server, copy the script and sudoers (root):

```bash
install -m 755 /var/www/levo/scripts/levo-deploy.sh /usr/local/sbin/levo-deploy
install -m 440 /var/www/levo/scripts/levo-deploy-sudoers /etc/sudoers.d/90-levo-deploy
visudo -c -f /etc/sudoers.d/90-levo-deploy
```

That lets the `levo` API user run `sudo -n /usr/local/sbin/levo-deploy` with no password. Later deploys copy those files again from the repo.

`--background` starts a `systemd-run` unit named `levo-admin-deploy` so restarting `levo-api` does not kill the job. SSH / Cursor deploys omit `--background` and still wait in the foreground. See [VPS GitHub deploy](vps-github.md).
