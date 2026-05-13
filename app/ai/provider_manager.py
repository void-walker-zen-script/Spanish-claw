from app.ai.local_provider import LocalProvider
from app.config import AI_PROVIDER


PROVIDERS = {
    "local": LocalProvider,
}


def get_provider(provider_name=None):
    name = (provider_name or AI_PROVIDER or "local").lower()
    provider_class = PROVIDERS.get(name, LocalProvider)
    return provider_class()
