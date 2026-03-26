#!/bin/bash
#
# Exit 0 if nginx, app, postgres are up and HTTP responds. For cron / monitoring.
#

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DEPLOY_DIR="$(dirname "$SCRIPT_DIR")"
cd "$DEPLOY_DIR"
# shellcheck source=deploy/scripts/lib.sh
source "$SCRIPT_DIR/lib.sh"

photo_require_env_file

EXIT_CODE=0

if ! docker ps --filter "name=photo_upload_nginx" --format '{{.Names}}' | grep -q .; then
  echo "ERROR: nginx container not running"
  EXIT_CODE=1
fi

if ! docker ps --filter "name=photo_upload_app" --format '{{.Names}}' | grep -q .; then
  echo "ERROR: app container not running"
  EXIT_CODE=1
fi

if ! docker ps --filter "name=photo_upload_postgres" --format '{{.Names}}' | grep -q .; then
  echo "ERROR: postgres container not running"
  EXIT_CODE=1
fi

if ! curl -fsS -o /dev/null --max-time 10 http://127.0.0.1/; then
  echo "ERROR: http://127.0.0.1/ did not return successfully"
  EXIT_CODE=1
fi

if ! docker exec photo_upload_postgres pg_isready -U postgres &>/dev/null; then
  echo "ERROR: PostgreSQL not ready"
  EXIT_CODE=1
fi

if [ "$EXIT_CODE" -eq 0 ]; then
  echo "OK: All checks passed"
fi

exit "$EXIT_CODE"
