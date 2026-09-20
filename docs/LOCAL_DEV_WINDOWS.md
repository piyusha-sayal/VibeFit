# Local development on Windows

One tested path for running the FastAPI backend and the Expo app on a Windows
machine. Commands are PowerShell. Verified 2026-09-12 (see `status.md`).

## Prerequisites

| Tool | Version used | Notes |
|---|---|---|
| Node.js | 24.15.0 (npm 9.8) | Expo SDK 54 needs Node 20.19.4 or newer |
| Python | 3.12 | the tested venv; pinned mediapipe/numpy target 3.12 |
| Android Studio | any recent | only for the Android emulator |
| Expo Go | SDK 54 build | installed on the emulator automatically, or from the store on a phone |
| Docker Desktop | optional | only if you want Postgres in a container |

The app runs in **Expo Go**. No native module needs a development build.

## 1. Backend

```powershell
cd E:\VibeFit\backend
py -3.12 -m venv .venv                      # skip if .venv already exists
.\.venv\Scripts\python.exe -m pip install -r requirements-dev.txt
.\.venv\Scripts\python.exe -m pytest -q     # expect all tests to pass
```

### Pick a local database

`backend/.env` is loaded automatically, but **shell environment variables win
over it**. If your `.env` points `DATABASE_URL` at a hosted database, override
it for local work so smoke tests never write there. The `$env:` values below
last for that PowerShell window only.

**Option A — SQLite (no Docker needed):**

```powershell
$env:DATABASE_URL = "sqlite+aiosqlite:///$env:TEMP/vibefit-local.db"
```

**Option B — Postgres in Docker** (not verified on this machine: Docker
Desktop's `docker-desktop` WSL distro was broken):

```powershell
cd E:\VibeFit
docker compose up -d db
docker compose ps
$env:DATABASE_URL = "postgresql+asyncpg://vibefit:vibefit@localhost:5432/vibefit"
```

Compose publishes Postgres on host port 5432. If a native PostgreSQL service
already listens there, stop it first or compose's `db` cannot bind.

### Migrate and run

```powershell
cd E:\VibeFit\backend
.\.venv\Scripts\alembic.exe upgrade head
.\.venv\Scripts\alembic.exe current          # expect 0002_profile_plan (head)

# Must equal mobile's EXPO_PUBLIC_FIREBASE_PROJECT_ID, or every app request 401s.
$env:FIREBASE_PROJECT_ID = "vibefit-a897e"
$env:CORS_ORIGINS = "http://localhost:8081,http://127.0.0.1:8081"

.\.venv\Scripts\python.exe -m uvicorn main:app --host 0.0.0.0 --port 8000
```

Check it from another window: `curl.exe http://127.0.0.1:8000/health`.

- `--host 0.0.0.0` is required for a physical phone; emulators and web work
  with it too.
- No Gemini/Groq key: analysis runs on the deterministic rules engine; chat
  replies with a setup hint instead of failing.
- No S3/R2 credentials: photos are analyzed in memory and not stored. The
  facial overlay action stays disabled because it needs a stored image URL.
- CORS only matters for the web build. Native apps send no `Origin` header.

## 2. Mobile

```powershell
cd E:\VibeFit\mobile
npm ci
npm run typecheck
npm run lint
npm run doctor
npm run test:ci
```

### Point the app at the backend

`EXPO_PUBLIC_API_URL` is baked into the bundle when Metro starts. Set it in the
shell (overrides `mobile/.env`) and restart Metro whenever it changes.

| Target | `EXPO_PUBLIC_API_URL` |
|---|---|
| Android emulator | `http://10.0.2.2:8000` |
| iOS simulator (macOS only) | `http://127.0.0.1:8000` |
| Web | `http://127.0.0.1:8000` |
| Physical phone, same Wi-Fi | `http://<PC LAN IP>:8000` (from `ipconfig`, the Wi-Fi adapter) |

Only public client config belongs in `EXPO_PUBLIC_*` — it ships inside the app.

### Run

```powershell
$env:EXPO_PUBLIC_API_URL = "http://10.0.2.2:8000"
npm run start:clear
```

Then press `a` for the Android emulator (Expo Go is installed on first run) or
`w` for web. If Expo Go install fails with `Can't find service: package`, the
emulator had not finished booting — wait a minute and press `a` again.

### Physical phone

1. Phone and PC on the same Wi-Fi.
2. Open `http://<PC LAN IP>:8000/health` in the phone's browser. It must load.
3. Scan the QR code from `npm run start:clear` with Expo Go.

If the phone cannot reach the PC: Windows marks new Wi-Fi networks **Public**,
and the inbound firewall rule Windows creates for Node.js on first run can be
*Block* on Public networks (the case on the verification machine), which hides
Metro on port 8081 from the phone. Check with
`Get-NetConnectionProfile` and `Get-NetFirewallRule -DisplayName "Node.js*"`. Either switch the Wi-Fi network to **Private** (Settings → Network &
internet → Wi-Fi → your network), allow Node.js and Python on Private networks
when Windows prompts, or run `npx expo start --tunnel`.

## Sign-in

The app signs in with Firebase only (email/password, Google). The backend
verifies those ID tokens when `FIREBASE_PROJECT_ID` is set. Without Firebase
keys in `mobile/.env`, Login and Register show "Firebase not configured".

The backend's own `POST /api/v1/auth/register` and `/auth/login` issue internal
JWTs. They are useful for API testing with curl but the app does not use them.

## Known limits

- **PDF report and summary card** download through `expo-file-system` and open
  the native share sheet. They work on Android/iOS, not on web.
- **Photo library on some emulator images** (for example the 16 KB page-size
  Android 15 image) has no system photo picker; "Upload Photo" then shows an
  error. Use "Take Photo" on the emulator, or a physical device.
- Metro started with `CI=1` has no hot reload; the app then logs
  "Cannot connect to Metro". Start without `CI` for normal development.
