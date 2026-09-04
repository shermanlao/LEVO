# Update the VPS from GitHub

The production app on `187.7.21.12` lives in `/var/www/levo` and tracks [shermanlao/LEVO](https://github.com/shermanlao/LEVO). A **read-only deploy key** named `levo-vps` is registered on that repo. Secrets stay on the server in `/var/www/levo/backend-server/.env` and `/root/levo-credentials.txt`.

## How to publish a change

From your PC, commit and push to `main`. Then on the VPS:

```bash
ssh root@187.7.21.12
sudo /usr/local/sbin/levo-deploy
```

That script pulls `main`, installs dependencies, builds the API and Next.js site, and restarts `levo-api` and `levo-web`. Nginx and PostgreSQL are left running.

Optional branch:

```bash
sudo /usr/local/sbin/levo-deploy main
```

## What the VPS uses

| Item | Location |
| --- | --- |
| App checkout | `/var/www/levo` |
| Git remote | `git@github.com:shermanlao/LEVO.git` |
| Deploy key | `/var/www/levo/.ssh/github_deploy` (private; not in git) |
| Deploy script | `/usr/local/sbin/levo-deploy` (copy of `scripts/levo-deploy.sh`) |
| Site | http://187.7.21.12 |

`.env` files are gitignored, so `git reset --hard` during deploy does not wipe database credentials.

## If `git pull` fails

1. Confirm the `levo-vps` deploy key still exists: GitHub → repo **Settings** → **Deploy keys**.
2. On the VPS: `sudo -u levo ssh -i /var/www/levo/.ssh/github_deploy -T git@github.com`

The GitHub reply `Hi shermanlao/LEVO! You've successfully authenticated...` means the key works (read-only keys cannot push).
