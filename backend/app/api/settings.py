"""Settings endpoint — provider status + runtime API key management."""

import os
from typing import List, Optional

from fastapi import APIRouter
from pydantic import BaseModel

from app.config import settings

router = APIRouter(prefix="/settings", tags=["settings"])

_PROVIDERS = [
    {"name": "anthropic", "label": "Anthropic (Claude)", "attr": "anthropic_api_key", "env": "ANTHROPIC_API_KEY"},
    {"name": "gemini",    "label": "Google Gemini",      "attr": "gemini_api_key",    "env": "GEMINI_API_KEY"},
    {"name": "cerebras",  "label": "Cerebras",           "attr": "cerebras_api_key",  "env": "CEREBRAS_API_KEY"},
    {"name": "groq",      "label": "Groq",               "attr": "groq_api_key",       "env": "GROQ_API_KEY"},
]


class ProviderStatus(BaseModel):
    name: str
    label: str
    configured: bool


class SettingsOut(BaseModel):
    providers: List[ProviderStatus]
    heuristic_always_available: bool = True


class UpdateKeysIn(BaseModel):
    anthropic_api_key: Optional[str] = None
    gemini_api_key: Optional[str] = None
    cerebras_api_key: Optional[str] = None
    groq_api_key: Optional[str] = None


def _provider_statuses() -> List[ProviderStatus]:
    result = []
    for p in _PROVIDERS:
        val = getattr(settings, p["attr"], "") or ""
        result.append(ProviderStatus(name=p["name"], label=p["label"], configured=bool(val.strip())))
    return result


@router.get("", response_model=SettingsOut)
def get_settings():
    return SettingsOut(providers=_provider_statuses())


@router.post("", response_model=SettingsOut)
def update_settings(req: UpdateKeysIn):
    """Update API keys at runtime (in-memory; resets on server restart).
    For permanent storage add them as Replit Secrets."""
    mapping = {
        "anthropic_api_key": req.anthropic_api_key,
        "gemini_api_key": req.gemini_api_key,
        "cerebras_api_key": req.cerebras_api_key,
        "groq_api_key": req.groq_api_key,
    }
    for attr, val in mapping.items():
        if val is not None:
            setattr(settings, attr, val)
            # Also poke os.environ so any code that reads it directly picks it up
            env_key = attr.upper()
            os.environ[env_key] = val

    return SettingsOut(providers=_provider_statuses())
