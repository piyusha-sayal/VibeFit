# Environment setup

Two env files, neither committed (both are covered by `.gitignore`):
`backend/.env` and `mobile/.env`.

> These are the canonical key lists. If you want `.env.example` files too, copy
> the blocks below into `backend/.env.example` / `mobile/.env.example` — the
> assistant is blocked from writing `.env*` paths by a local permission rule.

---

## backend/.env

```ini
# --- required ---
# Postgres (asyncpg driver). Local docker-compose uses the `db` service host.
# Hosted (Neon): postgresql+asyncpg://USER:PASSWORD@HOST/DBNAME
DATABASE_URL=
# Signing key for internal JWTs.
# Generate: python -c "import secrets;print(secrets.token_urlsafe(48))"
SECRET_KEY=

# --- auth ---
# Firebase project id. This is a PUBLIC value — same string as mobile's
# EXPO_PUBLIC_FIREBASE_PROJECT_ID, and it appears in every ID token's `aud`.
# Empty = Firebase ID-token verification disabled, internal JWT only.
FIREBASE_PROJECT_ID=
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
REFRESH_TOKEN_EXPIRE_DAYS=30

# --- cache ---
# None. The cache is in-process (services/cache_service.py) — no Redis, no
# external service. Entries are lost on restart, by design.

# --- AI (all optional) ---
# The app is fully functional with none of these set: the deterministic rules
# engine is the baseline, the LLM only rephrases/personalizes grounded output.
GEMINI_API_KEY=
GROQ_API_KEY=
AI_PROVIDER=auto
GEMINI_MODEL=gemini-2.5-flash
GEMINI_FALLBACK_MODEL=gemini-2.5-flash-lite
GROQ_MODEL=llama-3.3-70b-versatile

# --- image storage (optional, S3-compatible) ---
# Without an access key, uploads return a local:// placeholder — the photo is
# still analyzed in memory, it is just never retained. Upload failures are also
# non-fatal: a scan never fails because storage is down.
#
# Cloudflare R2 (free tier, zero egress fees):
#   AWS_ACCESS_KEY_ID / AWS_SECRET_ACCESS_KEY = R2 API token credentials
#   AWS_S3_BUCKET       = your R2 bucket name
#   AWS_REGION          = auto
#   S3_ENDPOINT_URL     = https://<account-id>.r2.cloudflarestorage.com
#   S3_PUBLIC_BASE_URL  = https://pub-<hash>.r2.dev  (or your custom domain)
# R2's public URL is unrelated to its API endpoint, so it must be set
# explicitly; leave it blank for AWS S3 and the standard URL form is used.
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
AWS_S3_BUCKET=vibefit-uploads
AWS_REGION=us-east-1
S3_ENDPOINT_URL=
S3_PUBLIC_BASE_URL=

# --- runtime ---
ENVIRONMENT=development
LOG_LEVEL=INFO
# Comma-separated. Expo dev server default is http://localhost:8081
CORS_ORIGINS=http://localhost:8081
```

Only `DATABASE_URL` and `SECRET_KEY` are mandatory — everything else has a
working default or degrades gracefully.

---

## mobile/.env

`EXPO_PUBLIC_*` values are embedded in the app bundle and are **not secret** —
Firebase web client keys are public by design. Never put a server secret here.

```ini
# --- backend ---
# Physical device via Expo Go: your machine's LAN IP, e.g. http://192.168.1.175:8000
# Android emulator: http://10.0.2.2:8000
# iOS simulator:    http://localhost:8000
# Deployed:         your Hugging Face Space URL
EXPO_PUBLIC_API_URL=http://localhost:8000
EXPO_PUBLIC_API_VERSION=v1

# --- Firebase (required for login) ---
# Firebase console > Project settings > General > Your apps > Web app config.
# Enable Email/Password under Authentication > Sign-in method.
EXPO_PUBLIC_FIREBASE_API_KEY=
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=
EXPO_PUBLIC_FIREBASE_PROJECT_ID=
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
EXPO_PUBLIC_FIREBASE_APP_ID=

# --- Google Sign-In (optional) ---
# Web client id covers Expo Go / web. Native ids are only needed for EAS builds.
EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=
EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID=
EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID=
```

Without Firebase keys the app still builds, but Login/Register throw
`"Firebase not configured..."` — `services/firebase.ts` fails loudly rather than
silently no-oping.

---

## Local run

```bash
docker compose up                              # API :8000 + Postgres
cd backend && .venv/Scripts/alembic upgrade head   # once; migrations are not auto-run
cd mobile && npx expo start
```

## Deployed run (Hugging Face Space)

Set the backend keys as **Space secrets**, never in the repo — free Spaces are
publicly visible. Point `EXPO_PUBLIC_API_URL` at the Space URL. Run
`alembic upgrade head` against the hosted database once.
