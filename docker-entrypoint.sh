#!/bin/sh
set -e

# Apply any pending migrations to the SQLite file on the persistent volume
# (DATABASE_URL points there, e.g. file:/data/feedhub.db).
echo "[feedhub] applying database migrations…"
npx prisma migrate deploy

echo "[feedhub] starting Next.js on :${PORT:-3000}"
exec npm run start -- -H 0.0.0.0 -p "${PORT:-3000}"
