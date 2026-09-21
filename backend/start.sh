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

echo "Applying database migrations..."
alembic upgrade head

echo "Starting API on port ${PORT:-8000}..."
exec uvicorn main:app --host 0.0.0.0 --port "${PORT:-8000}"
