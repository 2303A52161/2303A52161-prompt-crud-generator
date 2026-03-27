"""
models.py — Pydantic data models for the /api/generate endpoint.
"""

from pydantic import BaseModel
from typing import List


class GenerateRequest(BaseModel):
    prompt: str

    model_config = {
        "json_schema_extra": {
            "example": {"prompt": "Build a student management system with grades"}
        }
    }


class APIEndpoint(BaseModel):
    method: str   # GET | POST | PUT | DELETE | PATCH
    path:   str   # e.g. /students/{id}
    desc:   str   # short description


class DBTable(BaseModel):
    table:  str   # table name
    fields: str   # field definitions


class GenerateResponse(BaseModel):
    app_name:    str
    entities:    List[str]
    apis:        List[APIEndpoint]
    database:    List[DBTable]
    suggestions: List[str]
    sample_code: str
