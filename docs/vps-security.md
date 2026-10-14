# VPS host security

Production is `187.7.21.12` (`srv1954898`). LEVO runs as the `levo` user. See [VPS GitHub deploy](vps-github.md).

## What Hostinger stopped (14 Oct 2026)

Hostinger stopped the VPS because a process named `/tmp/hasaneyoh` was running. After the restart that file was already gone (`/tmp` does not survive a reboot). Nothing named `hasaneyoh` was left on disk.

What was still there:

- The `levo` crontab tried, every 30 minutes, to start Docker containers named `amco_*` and to create a sudo user named `pakchoi`. Docker is not installed, and `levo` cannot create users, so that user was never added and `/etc/sudoers.d/` has no `pakchoi` file. The crontab was removed. A redacted copy is root-only at `/root/levo-crontab-removed-20261014.txt`.
- Root has no crontab. `authorized_keys` still has only the `levo-vps` key. SSH accepted logins in the current logs are that key from `61.93.231.130`. There were no successful password logins.
- `admin_users` still has the two accounts created on 7 Sep 2026 (`info@levolight.com`, `operation@levolight.com`). No extra admin row was added.
- App source under `/var/www/levo` matched git aside from product images, the npm cache, and lockfiles.

The way in was the LEVO site, not SSH. It was running Next.js `15.3.1`, which is missing the React Server Components fix (CVE-2025-55182 / CVE-2025-66478). That bug lets an unauthenticated request run code as the `levo` user. The site also turns on AVIF image optimization, which needs Next.js `15.5.24` or newer. The installed release is now `15.5.27`.

A second file, `/tmp/safenet-client`, appeared at 09:02 UTC on 14 Oct 2026, owned by `levo`, while the old Next.js process was still up. It is a stripped Linux program that registers with a remote scanner and looks for known website bugs. It was not running after the patched site started at 09:12 UTC. It is now root-only at `/root/quarantine/safenet-client-20261014` (mode `600`). Its pid and spool files in `/tmp` were removed. No second copy was under `/var/www`, `/opt`, `/root`, or `/home`.

`levo` can read `/var/www/levo/backend-server/.env` (mode `600`, owner `levo`). Treat these as exposed and rotate them: `DATABASE_URL`, `ADMIN_PASSWORD`, `ADMIN_SESSION_SECRET`, `AI_SETTINGS_ENCRYPTION_KEY`, and `INTERNAL_API_SECRET`. `/etc/levo/next.env` is root-only, but `levo-web` still receives `ADMIN_SESSION_SECRET` and `INTERNAL_API_SECRET` in its environment, so those two were rotated on the server when the patched site was restarted. Changing `AI_SETTINGS_ENCRYPTION_KEY` makes stored AI tokens unreadable until they are saved again. Changing `DATABASE_URL` also needs `ALTER USER` in Postgres. Staff should change both admin passwords under User management, because the seed password in `.env` was readable.

Do not roll a deploy back to a commit that pins Next.js below `15.5.27`. `levo-deploy` refuses to finish if `frontend/node_modules/next` is older than that.

## SSH, firewall, and bans

| Control | Setting |
| --- | --- |
| SSH | Key only. `/etc/ssh/sshd_config.d/00-levo-hardening.conf` sets `PasswordAuthentication no`, `KbdInteractiveAuthentication no`, `PermitRootLogin prohibit-password`, `X11Forwarding no`, `MaxAuthTries 3` |
| Firewall | `ufw` is active. Incoming default is deny. Allowed: `22/tcp`, `80/tcp`, `443/tcp`. Postgres stays on localhost |
| fail2ban | `sshd` jail, 5 failures in 10 minutes, ban for 1 hour. Config: `/etc/fail2ban/jail.d/sshd.local` |

Check from the VPS:

```bash
sshd -T | grep -E 'passwordauthentication|permitrootlogin'
ufw status
fail2ban-client status sshd
crontab -u levo -l
node -p "require('/var/www/levo/frontend/node_modules/next/package.json').version"
```

Log in with the existing ed25519 key (`~/.ssh/id_ed25519_levo`). Password login will not work. The Hostinger browser console still can.
