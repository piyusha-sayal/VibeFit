#!/bin/sh
# Container entrypoint: migrate, then serve.
#
# Alembic is run here rather than baked into the image build because the build
# has no database. `upgrade head` is a no-op when the schema is already current,
# so a restart or redeploy costs one short query.
#
# Safe with the single worker this plan runs. If the service is ever scaled to
# several instances, move this to a Render pre-deploy command instead: two
# containers racing `upgrade head` can deadlock on the alembic_version row.
set -e

# Render finds the service by scanning for an open port, starting at $PORT and
# falling back to 10000. Defaulting to anything else makes detection depend on
# Render's fallback list rather than on this line, which is how the service came
# up with "Port scan timeout reached, no open ports detected" while the
# container was alive and the migration had already completed.
PORT="${PORT:-10000}"

echo "startup: applying database migrations"
alembic upgrade head
echo "startup: migrations complete"

echo "startup: launching uvicorn on 0.0.0.0:${PORT}"
exec uvicorn main:app \
  --host 0.0.0.0 \
  --port "${PORT}" \
  --log-level info
