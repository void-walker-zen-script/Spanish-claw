from app.ai.claude_provider import ClaudeProvider
from app.ai.deepseek_provider import DeepSeekProvider
from app.ai.gemini_provider import GeminiProvider
from app.ai.local_provider import LocalProvider
from app.ai.openai_provider import OpenAIProvider
from app.config import (
    AI_PROVIDER,
    ANTHROPIC_API_KEY,
    CLAUDE_MODEL,
    DEEPSEEK_API_KEY,
    DEEPSEEK_MODEL,
    GEMINI_API_KEY,
    GEMINI_MODEL,
    OPENAI_API_KEY,
    OPENAI_MODEL,
)


PROVIDERS = {
    "claude": ClaudeProvider,
    "deepseek": DeepSeekProvider,
    "gemini": GeminiProvider,
    "local": LocalProvider,
    "openai": OpenAIProvider,
}

REQUIRED_KEYS = {
    "claude": ANTHROPIC_API_KEY,
    "deepseek": DEEPSEEK_API_KEY,
    "gemini": GEMINI_API_KEY,
    "openai": OPENAI_API_KEY,
}

PROVIDER_METADATA = {
    "local": {
        "name": "Local Glossary",
        "default_model": "local",
    },
    "openai": {
        "name": "OpenAI",
        "default_model": OPENAI_MODEL,
    },
    "gemini": {
        "name": "Gemini",
        "default_model": GEMINI_MODEL,
    },
    "claude": {
        "name": "Claude",
        "default_model": CLAUDE_MODEL,
    },
    "deepseek": {
        "name": "DeepSeek",
        "default_model": DEEPSEEK_MODEL,
    },
}


def is_provider_available(provider_name):
    name = str(provider_name or "").strip().lower()
    if name == "local":
        return True
    if name not in PROVIDERS:
        return False
    return bool(REQUIRED_KEYS.get(name))


def get_available_providers():
    return [
        {
            "id": provider_id,
            "name": metadata["name"],
            "default_model": metadata["default_model"],
        }
        for provider_id, metadata in PROVIDER_METADATA.items()
        if is_provider_available(provider_id)
    ]


def get_provider(provider_name=None):
    name = str(provider_name or AI_PROVIDER or "local").strip().lower()
    if name in REQUIRED_KEYS and not REQUIRED_KEYS[name]:
        return LocalProvider()

    provider_class = PROVIDERS.get(name, LocalProvider)
    return provider_class()


def resolve_provider(provider_name=None):
    requested_name = str(provider_name or AI_PROVIDER or "local").strip().lower()
    if requested_name in REQUIRED_KEYS and not REQUIRED_KEYS[requested_name]:
        provider = LocalProvider()
        return {
            "provider": provider,
            "provider_name": "local",
            "model": "local",
            "source": "local_glossary",
        }

    provider_class = PROVIDERS.get(requested_name)
    if provider_class is None:
        provider = LocalProvider()
        return {
            "provider": provider,
            "provider_name": "local",
            "model": "local",
            "source": "local_glossary",
        }

    provider = provider_class()
    provider_name = requested_name if requested_name in PROVIDERS else "local"
    return {
        "provider": provider,
        "provider_name": provider_name,
        "model": getattr(provider, "default_model", "local"),
        "source": "local_glossary" if provider_name == "local" else "ai",
    }
