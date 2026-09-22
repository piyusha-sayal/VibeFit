from time import perf_counter

from fastapi import FastAPI
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from core.config import settings
from core.observability import RequestDiagnosticsMiddleware, configure_logging
from api.routes.auth import router as auth_router
from api.routes.analysis import router as analysis_router
from api.routes.chat import router as chat_router
from api.routes.user import router as user_router
from api.routes.profile import router as profile_router
from api.routes.plan import router as plan_router
from api.routes.color import router as color_router
from api.routes.passport import router as passport_router
from api.routes.face import router as face_router
from api.routes.hair import router as hair_router
from api.routes.makeup import router as makeup_router
from api.routes.accessories import router as accessories_router
from api.routes.guides import router as guides_router
from api.routes.style import router as style_router
from api.routes.looks import router as looks_router
from api.routes.privacy import router as privacy_router


app = FastAPI(
    title="VibeFit API",
    version="1.0.0",
    description="AI-powered personal styling and appearance intelligence API",
)

configure_logging()

# Added first so it wraps everything, CORS included.
app.add_middleware(RequestDiagnosticsMiddleware)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

API_PREFIX = "/api/v1"
app.include_router(auth_router, prefix=API_PREFIX)
app.include_router(analysis_router, prefix=API_PREFIX)
app.include_router(chat_router, prefix=API_PREFIX)
app.include_router(user_router, prefix=API_PREFIX)
app.include_router(profile_router, prefix=API_PREFIX)
app.include_router(plan_router, prefix=API_PREFIX)
app.include_router(color_router, prefix=API_PREFIX)
app.include_router(passport_router, prefix=API_PREFIX)
app.include_router(face_router, prefix=API_PREFIX)
app.include_router(hair_router, prefix=API_PREFIX)
app.include_router(makeup_router, prefix=API_PREFIX)
app.include_router(accessories_router, prefix=API_PREFIX)
app.include_router(guides_router, prefix=API_PREFIX)
app.include_router(style_router, prefix=API_PREFIX)
app.include_router(looks_router, prefix=API_PREFIX)
app.include_router(privacy_router, prefix=API_PREFIX)


@app.get("/health")
async def health():
    return {"status": "ok", "version": "1.0.0"}


@app.get("/health/db")
async def health_db():
    """Proves the database is reachable, separately from the app being up.

    A plain /health can pass while the pool cannot hand out a live connection,
    which is exactly the gap a transient 5xx hides in.
    """
    from sqlalchemy import text

    from core.database import engine

    started = perf_counter()
    try:
        async with engine.connect() as conn:
            await conn.execute(text("SELECT 1"))
    except Exception as exc:
        return JSONResponse(
            status_code=503,
            content={"status": "degraded", "database": "unreachable",
                     "error": type(exc).__name__,
                     "ms": round((perf_counter() - started) * 1000)},
        )
    return {"status": "ok", "database": "reachable",
            "ms": round((perf_counter() - started) * 1000)}
