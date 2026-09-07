# Point levolight.com (Hostinger) at the LEVO VPS

The catalog app already runs on the VPS `187.7.21.12`. The domain `levolight.com` is only DNS at Hostinger — do **not** use Hostinger Website Builder or Hostinger web hosting for this site. After DNS points at the VPS, nginx on the VPS serves LEVO.

The public URL is `https://levolight.com`. HTTP on the domain redirects to HTTPS. Keep `http://187.7.21.12` as a backup.

## 1. DNS in Hostinger hPanel

1. Sign in at [hpanel.hostinger.com](https://hpanel.hostinger.com).
2. Open **Domains** → **levolight.com** → **DNS / DNS Zone Editor**.
3. Set these records (delete or change any Hostinger parking / website A records that still point at Hostinger IPs):

| Type | Name | Points to | TTL |
| --- | --- | --- | --- |
| A | `@` | `187.7.21.12` | 300 or default |
| A | `www` | `187.7.21.12` | 300 or default |

Leave MX / mail records alone if you use Hostinger email.

4. Wait until a lookup shows the VPS:

```bash
nslookup levolight.com
nslookup www.levolight.com
```

Both should return `187.7.21.12`. This can take a few minutes to 24 hours.

## 2. Tell nginx the new host names

On the VPS, edit `/etc/nginx/sites-available/levo` so `server_name` includes the domain. Keep `default_server` if the bare IP should still open LEVO:

```nginx
server {
    listen 80 default_server;
    listen [::]:80 default_server;
    server_name levolight.com www.levolight.com 187.7.21.12 _;
    client_max_body_size 32m;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-Host $host;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
```

Then:

```bash
sudo nginx -t
sudo systemctl reload nginx
```

## 3. Set the public origin

In **both** files, set the public URL (no trailing slash):

- `/var/www/levo/backend-server/.env` — `SITE_ORIGIN=https://levolight.com`
- `/etc/levo/next.env` — `SITE_ORIGIN=https://levolight.com` and `COOKIE_SECURE=true`

Restart:

```bash
sudo systemctl restart levo-api levo-web
```

On `/admin/settings`, set **Website** to `https://levolight.com` so datasheet QR codes use the domain. Empty social and contact fields stay hidden on the footer.

## 4. HTTPS (on the VPS, not Hostinger)

Do **not** turn on Hostinger SSL for a Hostinger website. The certificate lives on the VPS with certbot:

```bash
sudo apt-get install -y certbot python3-certbot-nginx
sudo certbot --nginx -d levolight.com -d www.levolight.com --redirect
```

That is already in place. HTTP `levolight.com` / `www.levolight.com` redirects to HTTPS. Renewals use the Ubuntu `certbot.timer`. Then set `SITE_ORIGIN=https://levolight.com` and `COOKIE_SECURE=true` as above. See [vps-github.md](vps-github.md).

## 5. UAT

`/admin/settings` has **UNDER CONSTRUCTION for visitors**. While it is on, signed-out visitors only see the header, footer, and UNDER CONSTRUCTION. Sign in at `/admin/login` to see the real catalog. Uncheck that box when the public site should go live.

More than one hostname on the same VPS: [vps-multiple-sites.md](vps-multiple-sites.md).
