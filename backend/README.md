---
title: VibeFit API
emoji: 💄
colorFrom: yellow
colorTo: gray
sdk: docker
app_port: 8000
pinned: false
---

# VibeFit API

FastAPI backend for VibeFit: face / colour / hair / skin / body analysis from a
photo, plus the deterministic styling-rules engine, Vibe Profile and Action Plan.

The YAML block above is Hugging Face Space configuration. `app_port: 8000`
matches the `EXPOSE`/`CMD` in the `Dockerfile`; HF otherwise defaults to 7860.

## Deploying to a Space

The Dockerfile lives in this `backend/` directory, but a Space expects it at the
repo root — so push this subdirectory as the Space's root:

```bash
# from the repo root, once:
git remote add hf https://huggingface.co/spaces/<user>/<space-name>
git subtree push --prefix=backend hf main
```

## Required Space secrets

Set these in Space Settings → Variables and secrets. **Never commit them** —
free Spaces are publicly readable.

| Secret | Required | Notes |
|---|---|---|
| `DATABASE_URL` | yes | `postgresql+asyncpg://…` (Neon free tier) |
| `SECRET_KEY` | yes | 64-char random; signs internal JWTs |
| `FIREBASE_PROJECT_ID` | for login | public value; must match the mobile app |
| `CORS_ORIGINS` | yes | comma-separated app origins |
| `GEMINI_API_KEY` / `GROQ_API_KEY` | no | LLM only rephrases grounded output |
| `AWS_*` | no | without them uploads use `local://` placeholders |

`REDIS_URL` is optional: `CacheService` degrades to a cache-miss when Redis is
unreachable, so the Space runs without it.

## After first deploy

Migrations are not run automatically. Once, against the hosted database:

```bash
DATABASE_URL=<neon-url> alembic upgrade head
```

Then check `GET /health`, and point the mobile app's `EXPO_PUBLIC_API_URL` at the
Space URL.

## Notes

- Analysis is asynchronous: `POST /analysis/upload` returns a `processing` row
  immediately and the ML pipeline runs as a background task. Clients poll
  `GET /analysis/{id}` until `status` is `complete` or `failed`.
- Because that job runs in-process, a container restart mid-run would strand a
  row; rows still `processing` after 10 minutes are reported `failed` so the app
  can offer a retry.
- See `../docs/ENVIRONMENT.md` for the full env-var reference.
