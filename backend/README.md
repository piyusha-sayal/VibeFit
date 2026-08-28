# VibeFit API

FastAPI backend for VibeFit: face / colour / hair / skin / body analysis from a
photo, plus the deterministic styling-rules engine, Vibe Profile and Action Plan.

## Local

```bash
pip install -r requirements-dev.txt  # runtime deps + the test-only ones
docker compose up                    # API :8000 + Postgres
.venv/Scripts/alembic upgrade head   # once; migrations are not auto-run
.venv/Scripts/python -m pytest -q
```

`requirements.txt` is runtime-only — it is what the image installs.
`requirements-dev.txt` includes it and adds pytest, factory-boy and aiosqlite.

See `../docs/ENVIRONMENT.md` for the full env-var reference.

## Deploying (Render free tier)

`../render.yaml` is a Blueprint: Render dashboard → **New → Blueprint** → point at
this repo. It builds `backend/Dockerfile` and health-checks `/health`.

Set these in the service's **Environment** tab — never in the repo:

| Variable | Required | Notes |
|---|---|---|
| `DATABASE_URL` | yes | `postgresql+asyncpg://…`, no `?sslmode` (asyncpg rejects it) |
| `SECRET_KEY` | yes | 64-char random; signs internal JWTs |
| `FIREBASE_PROJECT_ID` | for login | public value; must match the mobile app |
| `CORS_ORIGINS` | yes | comma-separated client origins |
| `GEMINI_API_KEY` / `GROQ_API_KEY` | no | LLM only rephrases grounded output |
| `AWS_*` / `S3_*` | no | S3-compatible storage; see below |

There is **no cache service to provision** — the cache is in-process (TTL + LRU,
`services/cache_service.py`). The whole deployment is this service plus Neon
Postgres.

### Image storage (optional)

Without an access key, photos are analyzed in memory and never retained; the
stored URL is a `local://` placeholder. Upload failures are non-fatal — storage
is not on the critical path, so a scan never fails because the bucket is down.

For Cloudflare R2 (free tier, zero egress):

```
AWS_ACCESS_KEY_ID / AWS_SECRET_ACCESS_KEY   R2 API token
AWS_S3_BUCKET                               bucket name
AWS_REGION                                  auto
S3_ENDPOINT_URL                             https://<account-id>.r2.cloudflarestorage.com
S3_PUBLIC_BASE_URL                          https://pub-<hash>.r2.dev  (or custom domain)
```

`S3_PUBLIC_BASE_URL` is required for R2 because its public URL is unrelated to
its API endpoint. Leave it blank for AWS S3 and the standard URL form is used.

After the first deploy, run migrations once against the hosted database:

```bash
DATABASE_URL=<neon-url> alembic upgrade head
```

Then check `GET /health` and point the mobile app's `EXPO_PUBLIC_API_URL` at the
Render URL.

### Free-tier behaviour

The free plan sleeps after 15 minutes idle, so the first request after a quiet
spell takes ~30–60s. To avoid that, ping `/health` every ~10 minutes with a free
external cron (cron-job.org, UptimeRobot). Prefer that over a GitHub Actions
schedule: Actions minutes are billed on private repos, and scheduled workflows
are throttled and auto-disable after 60 days of repo inactivity.

Resource notes, measured rather than assumed:

- Peak RSS through the full 7-analyzer pipeline is **~212 MB** (197 MB of that is
  imports) against the 512 MB limit.
- Keep **one** uvicorn worker. Each extra worker re-imports mediapipe/opencv and
  costs another ~200 MB.
- The Dockerfile binds `${PORT:-8000}` because Render injects `$PORT`.

## Analysis is asynchronous

`POST /analysis/upload` returns a `processing` row immediately; the ML pipeline
runs as a background task. Clients poll `GET /analysis/{id}` until `status` is
`complete` or `failed`.

That job runs in-process, so a restart mid-run would strand a row — rows still
`processing` after 10 minutes are reported `failed` so the app can offer a retry.
A real queue (arq/Celery) is the proper fix if this becomes load-bearing.
