from app.ai.claude_provider import ClaudeProvider
from app.ai.deepseek_provider import DeepSeekProvider
from app.ai.gemini_provider import GeminiProvider
from app.ai.local_provider import LocalProvider
from app.ai.openai_provider import OpenAIProvider
from app.config import (
    AI_PROVIDER,
    ANTHROPIC_API_KEY,
    DEEPSEEK_API_KEY,
    GEMINI_API_KEY,
    OPENAI_API_KEY,
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


def get_provider(provider_name=None):
    name = (provider_name or AI_PROVIDER or "local").lower()
    if name in REQUIRED_KEYS and not REQUIRED_KEYS[name]:
        return LocalProvider()

    provider_class = PROVIDERS.get(name, LocalProvider)
    return provider_class()
