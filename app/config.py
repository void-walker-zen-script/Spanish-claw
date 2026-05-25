from dotenv import load_dotenv
import os


load_dotenv()


def get_env(name, default=None):
    value = os.getenv(name, default)
    return value.strip() if isinstance(value, str) else value


AI_PROVIDER = get_env("AI_PROVIDER", "local")
AI_MODEL = get_env("AI_MODEL", "gpt-5-mini")
OPENAI_API_KEY = get_env("OPENAI_API_KEY")
OPENAI_MODEL = get_env("OPENAI_MODEL", AI_MODEL)
GEMINI_API_KEY = get_env("GEMINI_API_KEY")
GEMINI_MODEL = get_env("GEMINI_MODEL", "gemini-2.5-flash-lite")
ANTHROPIC_API_KEY = get_env("ANTHROPIC_API_KEY")
CLAUDE_MODEL = get_env("CLAUDE_MODEL", "claude-sonnet-4-5")
DEEPSEEK_API_KEY = get_env("DEEPSEEK_API_KEY")
DEEPSEEK_MODEL = get_env("DEEPSEEK_MODEL", "deepseek-chat")
