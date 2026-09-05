# Open an SSH tunnel so Postgres stays on localhost on the VPS.
# Then connect pgAdmin / DBeaver to 127.0.0.1:5433
# Usage: powershell -File scripts/levo-pg-tunnel.ps1

$ErrorActionPreference = "Stop"
$key = Join-Path $env:USERPROFILE ".ssh\id_ed25519_levo"
if (-not (Test-Path $key)) {
  Write-Error "Missing $key — the VPS login key from the first deploy."
}
Write-Host "Tunnel: local 127.0.0.1:5433 -> VPS 127.0.0.1:5432"
Write-Host "Leave this window open. In pgAdmin use Host 127.0.0.1 Port 5433 User levo Database levo."
Write-Host "Password is POSTGRES_PASSWORD in /root/levo-credentials.txt on the VPS."
ssh -i $key -o IdentitiesOnly=yes -N -L 5433:127.0.0.1:5432 root@187.7.21.12
