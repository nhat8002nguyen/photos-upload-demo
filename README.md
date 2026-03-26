# PhotoShare (`photo-upload-app`)

Next.js (App Router) app with Prisma + PostgreSQL, Ant Design, username/password auth (JWT cookie), local disk photo storage under `UPLOAD_DIR`, and a following feed.

## Features

- Register with username and password; session is created immediately (redirect to feed).
- Upload images (field name `photo`, max **20** per user, ~10MB, jpg/png/gif/webp) served at `/uploads/...`.
- Explore all photos; feed shows photos from users you follow.
- Comments on photos; follow/unfollow users from profiles.

## Prerequisites

- Node.js 20+ (project uses Prisma 5; Prisma 7 requires a newer Node).
- PostgreSQL (local or Docker).

## Setup

1. Copy environment:

   ```bash
   cp .env.example .env
   ```

   Set `AUTH_SECRET` to a random string **at least 16 characters**. Set `DATABASE_URL` for your Postgres instance.

2. Start Postgres (optional):

   ```bash
   docker compose up -d
   ```

3. Apply migrations and run:

   ```bash
   npm install
   npx prisma migrate deploy
   npm run dev
   ```

   Open [http://localhost:3000](http://localhost:3000).

## Scripts

| Script            | Description                |
| ----------------- | -------------------------- |
| `npm run dev`     | Development server         |
| `npm run build`   | Production build           |
| `npm run start`   | Start production server    |
| `npm run prisma:migrate` | `prisma migrate dev` (dev DB) |
| `npm run prisma:generate` | Regenerate Prisma client |

## Production deployment (Docker + nginx)

The app image is **Node 20** (see `Dockerfile`). Next.js is built with **`output: "standalone"`**; the container runs `prisma migrate deploy` on start, then `node server.js` on port 3000.

### Layout

- **`deploy/docker-compose.prod.yml`** — `postgres`, `app` (Next), `nginx` (reverse proxy), `certbot` (renewal loop; obtain certs separately, e.g. `certbot certonly --webroot`).
- **`deploy/nginx/`** — `client_max_body_size 20M` so multipart uploads pass through nginx.
- **`uploads_data`** Docker volume → `/app/uploads` in the app container (`UPLOAD_DIR=/app/uploads`).
- **`deploy/systemd/photo-upload-app.service`** — same pattern as `deploy/systemd/tinder-app.service`: `WorkingDirectory=/opt/photo-upload-app/deploy`, `docker compose -f docker-compose.prod.yml up -d`.

### Environment (production)

| Variable | Role |
| -------- | ---- |
| `DATABASE_URL` | PostgreSQL URL; in Compose use host `postgres` and the same DB name/user/password as `POSTGRES_*`. |
| `AUTH_SECRET` | JWT signing; **at least 16 characters**. |
| `UPLOAD_DIR` | Set to `/app/uploads` in the Compose file (default in image). |

Copy `deploy/env.example` to **`deploy/.env`** (gitignored) and set strong values. Keep `DATABASE_URL` in sync with `POSTGRES_USER`, `POSTGRES_PASSWORD`, and `POSTGRES_DB`.

### Run on a server

1. Clone or copy the repo to e.g. `/opt/photo-upload-app` (so `deploy/` matches the systemd unit).
2. `cd /opt/photo-upload-app/deploy && cp env.example .env` and edit `.env`.
3. `docker compose -f docker-compose.prod.yml up -d --build`
4. HTTP on port **80** proxies to Next; bind **443** only after TLS certificates exist (optional `conf.d` for SSL, same idea as the Tinder `deploy/nginx` setup).

### systemd (optional)

```bash
sudo cp deploy/systemd/photo-upload-app.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now photo-upload-app.service
```

Adjust `WorkingDirectory` if the app root is not `/opt/photo-upload-app`.

### EC2 helper scripts

Shell scripts (bootstrap, deploy, backup/restore, SSL, systemd, monitoring) live in **`deploy/scripts/`**. See **[`deploy/scripts/README.md`](deploy/scripts/README.md)** for usage, the same layout as `try-build-tinder/deploy/scripts/`.
