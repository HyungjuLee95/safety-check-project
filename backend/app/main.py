from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import CORS_ORIGINS
from app.routers import settings, checklists, inspections, users

def create_app() -> FastAPI:
    app = FastAPI()

    app.add_middleware(
        CORSMiddleware,
        allow_origins=CORS_ORIGINS,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    @app.get("/")
    def root():
        return {"status": "Safety Inspection API Running"}

    app.include_router(settings.router, prefix="/api/v1")
    app.include_router(checklists.router, prefix="/api/v1")
    app.include_router(inspections.router, prefix="/api/v1")
    app.include_router(users.router, prefix="/api/v1")

    return app

app = create_app()
