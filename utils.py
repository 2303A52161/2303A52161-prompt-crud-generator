"""
utils.py — Shared helper functions.
"""

import re
from typing import List


def slugify(text: str) -> str:
    text = text.lower().strip()
    text = re.sub(r"[^\w\s-]", "", text)
    text = re.sub(r"[\s_]+", "-", text)
    return re.sub(r"-+", "-", text)


def extract_entity_name(prompt: str) -> str:
    STOP = {
        "create","build","make","develop","design","a","an","the","system",
        "app","application","management","platform","with","and","for","my",
        "our","simple","basic","web","full","new","using","that","has",
    }
    words = re.sub(r"[^a-zA-Z\s]", "", prompt).split()
    filtered = [w for w in words if w.lower() not in STOP and len(w) > 2]
    raw = filtered[0] if filtered else "Item"
    return raw[0].upper() + raw[1:].lower()


def infer_app_name(prompt: str) -> str:
    STOP = {
        "create","build","make","develop","design","a","an","the","system",
        "app","application","management","platform","with","and","for","my",
        "our","simple","basic","web","full","new",
    }
    words = re.sub(r"[^a-zA-Z\s]", "", prompt).split()
    filtered = [w[0].upper() + w[1:].lower()
                for w in words if w.lower() not in STOP and len(w) > 2]
    return " ".join(filtered[:3]) + " App" if filtered else "Generated App"


def validate_prompt(prompt: str) -> List[str]:
    errors: List[str] = []
    if not prompt or not prompt.strip():
        errors.append("Prompt must not be empty.")
    elif len(prompt.strip()) < 5:
        errors.append("Prompt is too short.")
    elif len(prompt) > 1000:
        errors.append("Prompt is too long (max 1000 chars).")
    return errors
