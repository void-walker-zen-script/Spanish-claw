import time

from app.ai.claude_provider import ClaudeProvider
from app.ai.deepseek_provider import DeepSeekProvider
from app.ai.gemini_provider import GeminiProvider
from app.ai.local_provider import LocalProvider
from app.ai.openai_provider import OpenAIProvider
from app import config


HEALTH_CHECK_TTL_SECONDS = 300
_HEALTH_CHECK_CACHE = {}

PROVIDERS = {
    "claude": ClaudeProvider,
    "deepseek": DeepSeekProvider,
    "gemini": GeminiProvider,
    "local": LocalProvider,
    "openai": OpenAIProvider,
}

REQUIRED_KEY_NAMES = {
    "claude": "ANTHROPIC_API_KEY",
    "deepseek": "DEEPSEEK_API_KEY",
    "gemini": "GEMINI_API_KEY",
    "openai": "OPENAI_API_KEY",
}

PROVIDER_METADATA = {
    "local": {
        "name": "Local Glossary",
        "default_model": "local",
        "cost_tier": "free",
        "best_for": "local glossary and basic vocabulary explanations",
    },
    "openai": {
        "name": "OpenAI",
        "default_model": lambda: config.OPENAI_MODEL,
        "cost_tier": "medium",
        "best_for": "high-quality Spanish learning explanations",
    },
    "gemini": {
        "name": "Gemini 2.5 Flash-Lite",
        "default_model": lambda: config.GEMINI_MODEL,
        "cost_tier": "low",
        "best_for": "high-volume grammar and word explanations",
    },
    "claude": {
        "name": "Claude",
        "default_model": lambda: config.CLAUDE_MODEL,
        "cost_tier": "medium",
        "best_for": "clear tutoring explanations and writing help",
    },
    "deepseek": {
        "name": "DeepSeek",
        "default_model": lambda: config.DEEPSEEK_MODEL,
        "cost_tier": "low",
        "best_for": "cost-efficient grammar and vocabulary Q&A",
    },
}


def get_provider_key(provider_name):
    key_name = REQUIRED_KEY_NAMES.get(provider_name)
    return str(getattr(config, key_name, "") or "").strip()


def get_provider_default_model(provider_name):
    metadata = PROVIDER_METADATA.get(provider_name, PROVIDER_METADATA["local"])
    default_model = metadata["default_model"]
    return default_model() if callable(default_model) else default_model


def get_provider_health_signature(provider_name):
    return (
        get_provider_key(provider_name),
        get_provider_default_model(provider_name),
    )


def check_provider_health(provider_name):
    name = str(provider_name or "").strip().lower()
    provider_class = PROVIDERS.get(name)
    if provider_class is None:
        return False

    health_check = getattr(provider_class, "health_check", None)
    if health_check is None:
        return True

    signature = get_provider_health_signature(name)
    now = time.monotonic()
    cached = _HEALTH_CHECK_CACHE.get(name)
    if cached and cached["signature"] == signature and cached["expires_at"] > now:
        return cached["available"]

    try:
        available = bool(health_check(model=get_provider_default_model(name)))
    except Exception:
        available = False
    _HEALTH_CHECK_CACHE[name] = {
        "available": available,
        "expires_at": now + HEALTH_CHECK_TTL_SECONDS,
        "signature": signature,
    }
    return available


def is_provider_available(provider_name):
    name = str(provider_name or "").strip().lower()
    if name == "local":
        return True
    if name not in PROVIDERS:
        return False
    if not get_provider_key(name):
        return False
    return check_provider_health(name)


def get_available_providers():
    return [
        {
            "id": provider_id,
            "name": metadata["name"],
            "default_model": get_provider_default_model(provider_id),
            "cost_tier": metadata["cost_tier"],
            "best_for": metadata["best_for"],
        }
        for provider_id, metadata in PROVIDER_METADATA.items()
        if is_provider_available(provider_id)
    ]


def get_provider(provider_name=None):
    name = str(provider_name or config.AI_PROVIDER or "local").strip().lower()
    if not is_provider_available(name):
        return LocalProvider()

    provider_class = PROVIDERS.get(name, LocalProvider)
    return provider_class()


def resolve_ask_provider(provider_name=None):
    explicit_provider = provider_name is not None and str(provider_name).strip() != ""
    requested_name = str(provider_name if explicit_provider else config.AI_PROVIDER or "local").strip().lower()

    if explicit_provider and not is_provider_available(requested_name):
        return {
            "available": False,
            "provider_name": requested_name,
        }

    if not explicit_provider and not is_provider_available(requested_name):
        requested_name = "local"

    provider_class = PROVIDERS.get(requested_name, LocalProvider)
    provider = provider_class()
    provider_name = requested_name if requested_name in PROVIDERS else "local"
    return {
        "available": True,
        "provider": provider,
        "provider_name": provider_name,
        "model": get_provider_default_model(provider_name),
        "source": "local_glossary" if provider_name == "local" else "ai",
    }


def resolve_provider(provider_name=None):
    requested_name = str(provider_name or config.AI_PROVIDER or "local").strip().lower()
    if not is_provider_available(requested_name):
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
        "model": get_provider_default_model(provider_name),
        "source": "local_glossary" if provider_name == "local" else "ai",
    }
