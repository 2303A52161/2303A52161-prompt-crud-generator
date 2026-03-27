"""
routes.py — API route definitions
POST /api/generate  → generate CRUD structure from a prompt
GET  /api/health    → health check
"""

from fastapi import APIRouter, HTTPException
from models import GenerateRequest, GenerateResponse
from ai_engine.generator import generate_crud_app

router = APIRouter(prefix="/api", tags=["Generator"])


@router.post("/generate", response_model=GenerateResponse)
def generate_app(request: GenerateRequest):
    """
    Accept a plain-English prompt and return a structured CRUD architecture:
    entities, REST endpoints, DB schema, sample FastAPI code, and suggestions.
    """
    prompt = (request.prompt or "").strip()
    if not prompt:
        raise HTTPException(status_code=400, detail="Prompt cannot be empty.")
    return generate_crud_app(prompt)


@router.get("/health")
def health_check():
    return {"status": "ok", "version": "2.0.0"}
