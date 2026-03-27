"""
main.py — CRUD Architect API + Static File Server
==================================================
Single entry point for Render deployment.
- All API routes live under /api/...
- The entire frontend (HTML/CSS/JS) is served from the /static folder.
- Root / redirects to /login.html automatically.

Run locally:
    uvicorn main:app --reload

Deploy on Render:
    Build command : pip install -r requirements.txt
    Start command : uvicorn main:app --host 0.0.0.0 --port $PORT
"""

import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import RedirectResponse

from routes import router

# ── App ──────────────────────────────────────────────────────────
app = FastAPI(
    title="CRUD Architect",
    description="Prompt-Based CRUD App Generator — API + Frontend",
    version="2.0.0",
    docs_url="/api/docs",
    redoc_url="/api/redoc",
)

# ── CORS (allow all for demo — tighten in production) ────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── API routes (/api/generate, /api/health) ──────────────────────
app.include_router(router)

# ── Root redirect → login page ───────────────────────────────────
@app.get("/", include_in_schema=False)
def root():
    return RedirectResponse(url="/login.html")

# ── Serve static frontend files (/login.html, /index.html, etc.) ─
# NOTE: This must be registered AFTER all API routes so it doesn't
#       intercept /api/* paths.
_static_dir = os.path.join(os.path.dirname(__file__), "static")
app.mount("/", StaticFiles(directory=_static_dir, html=True), name="static")
