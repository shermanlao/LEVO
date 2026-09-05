# Regular PostgreSQL backups (VPS)

Production data for LEVO is the `levo` database. It **binds only to localhost** on the VPS (`127.0.0.1:5432`). It is not open on the public internet. To use pgAdmin or DBeaver on your PC, open an **SSH tunnel**, then connect to your own machine.

Catalog photos under `/var/www/levo/frontend/public/` are **not** in Postgres.

## Bind (how you connect)

Postgres on the server:

| Field | Value |
| --- | --- |
| Bind address | `127.0.0.1` (VPS only; not `0.0.0.0`) |
| Port | `5432` |
| Database | `levo` |
| User | `levo` |
| Password | `POSTGRES_PASSWORD` in `/root/levo-credentials.txt` on the VPS |

From Windows, keep this tunnel open:

```powershell
powershell -File scripts/levo-pg-tunnel.ps1
```

Or:

```powershell
ssh -i $env:USERPROFILE\.ssh\id_ed25519_levo -o IdentitiesOnly=yes -N -L 5433:127.0.0.1:5432 root@187.7.21.12
```

Then in **pgAdmin** or **DBeaver** (new server / new connection):

| Field | Value |
| --- | --- |
| Host | `127.0.0.1` |
| Port | `5433` |
| Database | `levo` |
| User | `levo` |
| Password | same as `POSTGRES_PASSWORD` on the VPS |
| SSL | disable |

You are talking to production through SSH. Do not change `listen_addresses` to `*` and do not open `5432` in the firewall.

Get the password (on the VPS, do not put it in git):

```bash
ssh -i $env:USERPROFILE\.ssh\id_ed25519_levo root@187.7.21.12 "grep POSTGRES_PASSWORD /root/levo-credentials.txt"
```

## Monitor

On the VPS:

```bash
sudo /usr/local/sbin/levo-pg-status
```

That shows whether the daily timer is active, the next run, the last dump log, files in `/var/backups/levo-postgres`, and a product count.

Manual dump:

```bash
sudo /usr/local/sbin/levo-pg-backup
```

Ask Cursor: **backup status** or **dump the database now**.

## Restore

This **replaces** the live catalog. Stop is handled by the script.

```bash
sudo /usr/local/sbin/levo-pg-status
sudo /usr/local/sbin/levo-pg-restore /var/backups/levo-postgres/levo-REPLACE.dump
```

Copy a dump to your PC first if you want a local copy:

```powershell
scp -i $env:USERPROFILE\.ssh\id_ed25519_levo root@187.7.21.12:/var/backups/levo-postgres/levo-REPLACE.dump .
```

## What is already set up

| Item | Location |
| --- | --- |
| Daily dump | `levo-pg-backup.timer` — about **03:15 UTC**, keep 14 days |
| Dump script | `/usr/local/sbin/levo-pg-backup` |
| Status | `/usr/local/sbin/levo-pg-status` |
| Restore | `/usr/local/sbin/levo-pg-restore` |
| Files | `/var/backups/levo-postgres/levo-*.dump` |
| Tunnel helper | `scripts/levo-pg-tunnel.ps1` |

## Optional extras

- Hostinger disk snapshots are whole-VPS, not a SQL restore. Keep `pg_dump`.
- Also copy `/var/www/levo/frontend/public/uploads` if photos matter.
- Longer retention: `KEEP_DAYS=30 sudo /usr/local/sbin/levo-pg-backup`.

## Install on a new VPS

```bash
install -m 755 scripts/levo-pg-backup.sh /usr/local/sbin/levo-pg-backup
install -m 755 scripts/levo-pg-status.sh /usr/local/sbin/levo-pg-status
install -m 755 scripts/levo-pg-restore.sh /usr/local/sbin/levo-pg-restore
```

Enable the timer units from the previous version of this guide (`levo-pg-backup.service` / `.timer`), then `sudo systemctl enable --now levo-pg-backup.timer`.
