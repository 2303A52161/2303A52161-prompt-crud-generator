"""
parser.py — Validates and normalises raw AI JSON output.
"""

import json
import re
from typing import Any, Dict


class ParseError(Exception):
    pass


def strip_fences(raw: str) -> str:
    raw = re.sub(r"^```(?:json)?\s*", "", raw.strip(), flags=re.IGNORECASE)
    return re.sub(r"\s*```$", "", raw.strip()).strip()


def parse_ai_output(raw: str) -> Dict[str, Any]:
    cleaned = strip_fences(raw)
    try:
        data = json.loads(cleaned)
    except json.JSONDecodeError as exc:
        raise ParseError(f"Invalid JSON from AI: {exc}") from exc

    required = {"app_name", "entities", "apis", "database", "suggestions", "sample_code"}
    missing  = required - set(data.keys())
    if missing:
        raise ParseError(f"Missing keys: {', '.join(missing)}")

    # Normalise apis
    data["apis"] = [
        {
            "method": e.get("method", "GET").upper(),
            "path":   e.get("path", "/unknown"),
            "desc":   e.get("desc") or e.get("description", ""),
        }
        for e in data.get("apis", [])
    ]

    # Normalise database
    data["database"] = [
        {
            "table":  e.get("table") or e.get("name", "Unknown"),
            "fields": e.get("fields") or e.get("schema", "id INT PK"),
        }
        for e in data.get("database", [])
    ]

    for k in ("entities", "suggestions"):
        if not isinstance(data[k], list):
            data[k] = [str(data[k])]

    if not isinstance(data["sample_code"], str):
        data["sample_code"] = str(data["sample_code"])

    return data
