from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from core.config import settings
from api.routes.auth import router as auth_router
from api.routes.analysis import router as analysis_router
from api.routes.chat import router as chat_router
from api.routes.user import router as user_router
from api.routes.profile import router as profile_router
from api.routes.plan import router as plan_router


app = FastAPI(
    title="VibeFit API",
    version="1.0.0",
    description="AI-powered personal styling and appearance intelligence API",
)

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


@app.get("/health")
async def health():
    return {"status": "ok", "version": "1.0.0"}
