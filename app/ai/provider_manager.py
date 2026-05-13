from app.ai.deepseek_provider import DeepSeekProvider
from app.ai.local_provider import LocalProvider
from app.ai.openai_provider import OpenAIProvider
from app.config import AI_PROVIDER, DEEPSEEK_API_KEY, OPENAI_API_KEY


PROVIDERS = {
    "deepseek": DeepSeekProvider,
    "local": LocalProvider,
    "openai": OpenAIProvider,
}

REQUIRED_KEYS = {
    "deepseek": DEEPSEEK_API_KEY,
    "openai": OPENAI_API_KEY,
}


def get_provider(provider_name=None):
    name = (provider_name or AI_PROVIDER or "local").lower()
    if name in REQUIRED_KEYS and not REQUIRED_KEYS[name]:
        return LocalProvider()

    provider_class = PROVIDERS.get(name, LocalProvider)
    return provider_class()
