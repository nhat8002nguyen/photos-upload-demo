# EC2 / server scripts (`photo-upload-app/deploy/scripts`)

Bash helpers modeled after `try-build-tinder/deploy/scripts/`, adapted for this stack: **Next.js app + PostgreSQL + nginx** (no Redis). All commands assume you are **on the server**, in the **`deploy/`** directory (e.g. `/opt/photo-upload-app/deploy`), with **`env.example` copied to `.env`** and filled in.

## Prerequisites

- Ubuntu (or similar) with Docker and Docker Compose plugin (use **`setup-ec2.sh`** on a fresh EC2 instance).
- `deploy/.env` with at least `DATABASE_URL`, `AUTH_SECRET`, `POSTGRES_*` (see `../env.example`).
- Docker volume names depend on the **Compose project name** (usually the `deploy/` folder name, e.g. `deploy_postgres_data`). Scripts resolve real names from **`photo_upload_*`** containers when they are running.

## Scripts

| Script | Purpose |
| ------ | ------- |
| **`setup-ec2.sh`** | Installs Docker, Compose plugin, UFW (22/80/443), creates `/opt/photo-upload-app`, sysctl/logrotate stubs. **Run with `sudo`.** |
| **`deploy.sh`** | Optional volume backup, `docker compose down`, build, `up -d`, basic checks. Main deploy entrypoint. |
| **`backup.sh`** | `pg_dump`, tar of Postgres + uploads volumes, copy of `.env` → `/opt/photo-upload-app/backups/<timestamp>/`. |
| **`restore.sh`** | `restore.sh <timestamp>` — restores volumes/SQL from a backup (destructive; prompts for `yes`). |
| **`health-check.sh`** | Exit `0` if nginx/app/postgres are up and `http://127.0.0.1/` works. Use in **cron** or monitoring. |
| **`monitor.sh`** | One-screen status: `compose ps`, `docker stats`, logs tail. |
| **`setup-systemd.sh`** | Copies `../systemd/photo-upload-app.service` to `/etc/systemd/system/` and enables it. **Run with `sudo`.** |
| **`setup-ssl.sh`** | Let's Encrypt **certonly** via webroot, then swaps in `nginx/conf.d/default-ssl.conf`. Requires **`DOMAIN_NAME`** and **`EMAIL_FOR_SSL`** in `.env`. |
| **`switch-nginx-to-ssl.sh`** | Re-applies SSL `default.conf` after a deploy overwrote it (certs must already exist). |
| **`troubleshoot-https.sh`** | Checks UFW, nginx `:443`, local `https://127.0.0.1/`. |

Shared helpers live in **`lib.sh`** (sourced by other scripts; not run directly).

## Typical flow (EC2)

1. **Bootstrap the VM** (once):

   ```bash
   sudo ./scripts/setup-ec2.sh
   # log out and back in for docker group
   ```

2. **Put the app** under `/opt/photo-upload-app` (git clone or CI rsync), then:

   ```bash
   cd /opt/photo-upload-app/deploy
   cp env.example .env
   nano .env   # DATABASE_URL, AUTH_SECRET, POSTGRES_*, etc.
   ```

3. **Deploy**:

   ```bash
   ./scripts/deploy.sh
   ```

4. **TLS** (after DNS points to the instance):

   ```bash
   # Uncomment and set in .env:
   # DOMAIN_NAME=photos.example.com
   # EMAIL_FOR_SSL=you@example.com
   ./scripts/setup-ssl.sh
   ```

5. **Boot-time start** (optional):

   ```bash
   sudo ./scripts/setup-systemd.sh
   sudo systemctl start photo-upload-app
   ```

## Compose command used everywhere

Scripts use:

`docker compose --env-file .env -f docker-compose.prod.yml …`

Override the compose file with **`PHOTO_DEPLOY_COMPOSE_FILE`**. If no containers are running, volume fallbacks use **`PHOTO_PROJECT_NAME`** (default **`deploy`** — match your `docker compose` project name if different).

## Cron example (health check)

```cron
*/5 * * * * cd /opt/photo-upload-app/deploy && ./scripts/health-check.sh || logger "photo-upload health failed"
```

Daily backup (run as a user that can use `docker`):

```cron
0 3 * * * cd /opt/photo-upload-app/deploy && ./scripts/backup.sh >> /var/log/photo-backup.log 2>&1
```

## Troubleshooting

### `photo_upload_app` unhealthy / nginx never starts

The Docker healthcheck must hit a URL that returns **HTTP 200**. The app’s `/` responds with **307** redirects; `wget --spider` on `/` can exit with an error, so the container stays **unhealthy**. The stack uses **`GET /api/health`** (200 JSON) for health checks. If you deploy an older image without that route, update the app and rebuild.

### `permission denied` connecting to Docker socket

Run `deploy` scripts as a user in the **`docker`** group (`newgrp docker` or log out and back in after `setup-ec2.sh`), or use `sudo ./scripts/deploy.sh` once.

### Files under `/opt/photo-upload-app` owned by root

After `sudo git clone` / `sudo mv`, fix ownership so you can edit `.env` without sudo:

`sudo chown -R "$USER:$USER" /opt/photo-upload-app`

## See also

- Root app README: `../../README.md`
- Systemd unit: `../systemd/photo-upload-app.service`
