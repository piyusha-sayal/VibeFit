# VibeFit
Framework: Is the backend added will work in production? do we need another db for that?
Target platform: is everything added free?
Target users: what do we need all these keys for?
Storage: can we use NOVA?
Constraints: OPENAI is not free, i want free and relaible options?

# AI strategy
Use Haiku for simple tasks; Sonnet for main dev; Opus for complex arch or if Sonnet fails 2x.
Keep context low: Grep before Read, targeted reads only.

# Stack (as built)
FastAPI + async SQLAlchemy + Alembic on Neon Postgres, deployed to Render (Docker,
free plan; start.sh runs `alembic upgrade head` then uvicorn). Expo SDK 54 /
RN 0.81 mobile with expo-router, zustand and React Query; EAS preview profile
builds the APK. Firebase ID-token auth via google-auth. Brand: MyLookFit; package
com.mylookfit.app, scheme mylookfit (vibefit:// legacy). EAS slug, Firebase
project and API host intentionally stay `vibefit` (docs/BRAND_PACKAGE_MIGRATION.md).

Styling is deterministic rules, not AI: colour season, face shape, hair, makeup,
accessories, fashion and outfit engines under backend/rules, composed by
look_composer for Create My Look. Zero per-request AI cost.

Local backend tests: `cd backend && source .venv/Scripts/activate && python -m pytest -q`.

# Rules
Concise responses. No overengineering. No unrequested extras.