#!/bin/sh
set -e

# Apply any pending migrations to the SQLite file on the persistent volume
# (DATABASE_URL points there, e.g. file:/data/feedhub.db).
echo "[feedhub] applying database migrations…"
npx prisma migrate deploy

# Seed the curated sources + populate the feed in the background. It waits for
# the server (started just below) to accept requests, seeds only if the DB is
# empty, then triggers one fetch. Backgrounded so it never blocks startup;
# survives the exec below as an orphaned short-lived process.
echo "[feedhub] launching background seed/refresh…"
node /app/scripts/seed-and-fetch.mjs &

echo "[feedhub] starting Next.js on :${PORT:-3000}"
exec npm run start -- -H 0.0.0.0 -p "${PORT:-3000}"
