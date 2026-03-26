#!/bin/bash
# Shared helpers for photo-upload-app deploy scripts (source after cd to deploy/).

export PHOTO_DEPLOY_COMPOSE_FILE="${PHOTO_DEPLOY_COMPOSE_FILE:-docker-compose.prod.yml}"
# Fallback prefix if containers are not running (Compose default project name = directory name, often "deploy")
export PHOTO_PROJECT_NAME="${PHOTO_PROJECT_NAME:-deploy}"

photo_compose() {
  docker compose --env-file .env -f "$PHOTO_DEPLOY_COMPOSE_FILE" "$@"
}

photo_require_env_file() {
  if [ ! -f ".env" ]; then
    echo "[ERROR] .env not found in $(pwd). Copy env.example to .env and configure it."
    exit 1
  fi
}

# Resolve actual volume name from a running container (works with any compose project name).
photo_volume_postgres() {
  if docker inspect photo_upload_postgres &>/dev/null; then
    docker inspect -f '{{ range .Mounts }}{{ if and (eq .Type "volume") (eq .Destination "/var/lib/postgresql/data") }}{{ .Name }}{{ end }}{{ end }}' photo_upload_postgres
  else
    echo "${PHOTO_PROJECT_NAME}_postgres_data"
  fi
}

photo_volume_uploads() {
  if docker inspect photo_upload_app &>/dev/null; then
    docker inspect -f '{{ range .Mounts }}{{ if and (eq .Type "volume") (eq .Destination "/app/uploads") }}{{ .Name }}{{ end }}{{ end }}' photo_upload_app
  else
    echo "${PHOTO_PROJECT_NAME}_uploads_data"
  fi
}
