#!/bin/sh
set -e
# Standalone image has no node_modules/.bin — npx cannot find prisma. Call CLI entry directly.
if [ -n "$DATABASE_URL" ]; then
  node ./node_modules/prisma/build/index.js migrate deploy
fi
exec "$@"
