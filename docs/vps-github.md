# Update the VPS from GitHub

The production app on `187.7.21.12` lives in `/var/www/levo` and tracks [shermanlao/LEVO](https://github.com/shermanlao/LEVO). A **read-only deploy key** named `levo-vps` is registered on that repo. Secrets stay on the server in `/var/www/levo/backend-server/.env` and `/root/levo-credentials.txt`.

You can ship in two ways: ask Cursor in this project, or do it yourself on the VPS.

## Ask Cursor (usual)

In this LEVO workspace, tell the agent what you want:

| You say | What happens |
| --- | --- |
| **push** / **git push** | Push `main` to GitHub (`https://github.com/shermanlao/LEVO`) |
| **deploy** / **update the VPS** | SSH to the VPS and run `sudo /usr/local/sbin/levo-deploy` |
| **push and deploy** | GitHub first, then the live site |

The agent already has git access to the repo and SSH to `root@187.7.21.12`. You do not need to open a separate terminal for those steps.

Still ask for a **commit** when you want a git snapshot. Push without a new commit only works if there is already a local commit to send.

## Do it yourself

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

## How this VPS was connected (setup)

Do this only on a **new** server, or if the deploy key was removed.

1. On the VPS, as root, create a key used only for GitHub (not your laptop SSH key):

```bash
install -d -m 700 -o levo -g levo /var/www/levo/.ssh
sudo -u levo ssh-keygen -t ed25519 -f /var/www/levo/.ssh/github_deploy -N "" -C "levo-vps-deploy"
```

2. Put this SSH config at `/var/www/levo/.ssh/config` (owner `levo`, mode `600`):

```
Host github.com
  HostName github.com
  User git
  IdentityFile /var/www/levo/.ssh/github_deploy
  IdentitiesOnly yes
  StrictHostKeyChecking accept-new
```

3. Add the **public** key (`github_deploy.pub`) on GitHub: repo **Settings** → **Deploy keys** → **Add deploy key**. Title `levo-vps`. Leave **Allow write access** off.

4. Point the checkout at SSH and install the deploy command:

```bash
cd /var/www/levo
sudo -u levo git remote set-url origin git@github.com:shermanlao/LEVO.git
install -m 755 /var/www/levo/scripts/levo-deploy.sh /usr/local/sbin/levo-deploy
```

5. Test: `sudo -u levo ssh -i /var/www/levo/.ssh/github_deploy -T git@github.com`

GitHub should reply that `shermanlao/LEVO` authenticated, with no shell access.

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
