# Host more than one website on the VPS

The VPS `187.7.21.12` can run several sites. Nginx on port **80** (and later **443**) is the public front door. Each site is a separate **server block** chosen by the **domain name** in the browser (`Host` header). Apps stay on localhost on different ports.

LEVO today is the only site and is `default_server`, so **any** host — including `http://187.7.21.12` — goes to LEVO.

## What you need for a second site

1. A **domain or subdomain** (for example `other.example.com`) with a DNS **A** record to `187.7.21.12`.
2. The app files in their **own folder** (not inside `/var/www/levo`).
3. The app listening on **localhost** on a **new port** (LEVO already uses `3000` and `3333`).
4. A new nginx file under `/etc/nginx/sites-available/`.
5. Optionally its **own Postgres database** (do not put another product’s tables in the `levo` database).

Two different sites cannot both be “the website at `http://187.7.21.12/`” at the same time. The IP can stay as LEVO’s fallback; other sites should use names.

## Port map (keep these unique)

| Service | Bind | Public |
| --- | --- | --- |
| nginx | `0.0.0.0:80` (and `:443` after TLS) | yes |
| LEVO Next.js | `127.0.0.1:3000` | no |
| LEVO Express | `127.0.0.1:3333` | no |
| PostgreSQL | `127.0.0.1:5432` | no |
| Next other site | `127.0.0.1:3001` (example) | no |
| API other site | `127.0.0.1:3334` (example) | no |
| SSH | `:22` | yes |

Do not open `3000`, `3333`, or `5432` on the firewall.

## Step 1 — Point DNS

At your domain registrar:

```
A    levo.example.com      187.7.21.12
A    other.example.com     187.7.21.12
```

Wait until `ping other.example.com` resolves to the VPS. You can still test LEVO at `http://187.7.21.12` until you change `default_server`.

## Step 2 — Give LEVO a real name (when you have a domain)

Edit `/etc/nginx/sites-available/levo`. Use the LEVO hostname and **keep** `default_server` only if you still want the bare IP to open LEVO:

```nginx
server {
    listen 80 default_server;
    listen [::]:80 default_server;
    server_name levo.example.com 187.7.21.12 _;
    client_max_body_size 32m;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
```

Set `SITE_ORIGIN` in `/var/www/levo/backend-server/.env` to the public URL (for example `http://levo.example.com` or `https://levo.example.com` after TLS). Then `sudo systemctl restart levo-api`.

## Step 3 — Add the other site

Example: a second Next.js app on port `3001`.

```bash
# app files
sudo mkdir -p /var/www/other
# clone or copy the project into /var/www/other
# run it with systemd on 127.0.0.1:3001
```

Create `/etc/nginx/sites-available/other`:

```nginx
server {
    listen 80;
    listen [::]:80;
    server_name other.example.com;
    client_max_body_size 32m;

    location / {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
```

Enable and reload:

```bash
sudo ln -sfn /etc/nginx/sites-available/other /etc/nginx/sites-enabled/other
sudo nginx -t
sudo systemctl reload nginx
```

Visit `http://other.example.com`. LEVO stays at its own name (and at the IP if it is still `default_server`).

### Static HTML instead of Node

If the second site is only files:

```nginx
server {
    listen 80;
    server_name other.example.com;
    root /var/www/other/public;
    index index.html;
}
```

## Step 4 — HTTPS (after DNS works)

```bash
sudo apt-get install -y certbot python3-certbot-nginx
sudo certbot --nginx -d levo.example.com -d other.example.com
```

Certbot edits the server blocks. Renewals are handled by a systemd timer on Ubuntu.

## Separate Postgres databases

```bash
sudo -u postgres psql <<'SQL'
CREATE USER other WITH PASSWORD 'choose-a-strong-password';
CREATE DATABASE other OWNER other;
GRANT ALL PRIVILEGES ON DATABASE other TO other;
\c other
GRANT ALL ON SCHEMA public TO other;
ALTER SCHEMA public OWNER TO other;
SQL
```

Put that site’s `DATABASE_URL` only in **its** `.env`, not in LEVO’s.

## systemd for the second app

Copy the idea of `/etc/systemd/system/levo-web.service`: new unit, new `WorkingDirectory`, new port (`-H 127.0.0.1 -p 3001`). Do **not** reuse `levo-deploy` for another repo; that script only updates `/var/www/levo`.

## Do not mix with LEVO

- Do not put another site under `/var/www/levo`.
- Do not run `sudo /usr/local/sbin/levo-deploy` for other projects.
- Do not share LEVO’s `admin` session secret or `AI_SETTINGS_ENCRYPTION_KEY`.

## Ask Cursor

When the next site is ready, say which **domain** it should use and where the **code** lives (another GitHub repo or a folder). In this LEVO workspace the agent can SSH to the VPS and add the nginx block; a different project should keep its own docs and deploy script.
