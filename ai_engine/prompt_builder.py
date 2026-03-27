"""
prompt_builder.py — Builds the AI system + user prompt.
"""

SYSTEM_PROMPT = """\
You are an expert backend architect. Given a plain-English description of an app,
return ONLY valid JSON (no markdown, no explanation) with this exact structure:

{
  "app_name":    "<short display name>",
  "entities":    ["<EntityName>", ...],
  "apis": [
    {"method": "GET|POST|PUT|DELETE|PATCH", "path": "/resource[/{id}]", "desc": "<short description>"},
    ...
  ],
  "database": [
    {"table": "<TableName>", "fields": "<field1 TYPE, field2 TYPE, ...>"},
    ...
  ],
  "suggestions": ["<improvement idea>", ...],
  "sample_code": "<complete valid Python FastAPI code with imports, models, and 3-5 route functions>"
}

Rules:
- 2-5 entities, 8-15 API endpoints, 2-5 DB tables, exactly 4 suggestions
- sample_code must be valid Python using FastAPI + Pydantic
- Be specific to the domain — no generic names like Item or Resource
"""


def build_prompt(user_input: str) -> dict:
    return {
        "system": SYSTEM_PROMPT,
        "user": f"Design a complete CRUD system for:\n\n{user_input.strip()}",
    }
