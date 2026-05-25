import json
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

from app.ai.base_provider import BaseProvider, ProviderUnavailableError
from app.config import DEEPSEEK_API_KEY, DEEPSEEK_MODEL


DEFAULT_SYSTEM_PROMPT = """
你是 Spanish Claw 的学习助手。
用户是有英语基础的中文西语学习者。
请用简体中文解释，并用英语作为桥梁解释西语结构。
西语例句保留西语，必要时提供 English counterpart。
不要直接复制外部来源内容。
回答要简洁、像学习助手。
""".strip()


class DeepSeekProvider(BaseProvider):
    provider_name = "deepseek"
    default_model = DEEPSEEK_MODEL
    api_url = "https://api.deepseek.com/chat/completions"

    @classmethod
    def health_check(cls, model=None):
        if not DEEPSEEK_API_KEY:
            return False

        payload = {
            "model": model or cls.default_model,
            "messages": [
                {"role": "user", "content": "Reply with OK."},
            ],
            "max_tokens": 4,
            "stream": False,
        }
        request = Request(
            cls.api_url,
            data=json.dumps(payload).encode("utf-8"),
            headers={
                "Authorization": f"Bearer {DEEPSEEK_API_KEY}",
                "Content-Type": "application/json",
            },
            method="POST",
        )

        try:
            with urlopen(request, timeout=10):
                return True
        except (HTTPError, URLError, TimeoutError):
            return False

    def _read_error_message(self, error):
        try:
            data = json.loads(error.read().decode("utf-8"))
        except (AttributeError, json.JSONDecodeError, UnicodeDecodeError):
            return "DeepSeek API request failed."
        return data.get("error", {}).get("message") or "DeepSeek API request failed."

    def _extract_answer(self, data):
        choices = data.get("choices") or []
        if not choices:
            return ""
        message = choices[0].get("message") or {}
        return (message.get("content") or "").strip()

    def ask(self, question, context="", system_prompt="", model=None):
        if not DEEPSEEK_API_KEY:
            raise ProviderUnavailableError("DeepSeek API key is not configured.")

        prompt = system_prompt or DEFAULT_SYSTEM_PROMPT
        payload = {
            "model": model or self.default_model,
            "messages": [
                {"role": "system", "content": prompt},
                {
                    "role": "user",
                    "content": "\n".join(
                        [
                            f"context: {context or '-'}",
                            f"question: {question or '-'}",
                        ]
                    ),
                },
            ],
            "stream": False,
        }
        request = Request(
            self.api_url,
            data=json.dumps(payload).encode("utf-8"),
            headers={
                "Authorization": f"Bearer {DEEPSEEK_API_KEY}",
                "Content-Type": "application/json",
            },
            method="POST",
        )

        try:
            with urlopen(request, timeout=30) as response:
                data = json.loads(response.read().decode("utf-8"))
        except HTTPError as error:
            raise ProviderUnavailableError(self._read_error_message(error)) from error
        except (URLError, TimeoutError, json.JSONDecodeError, UnicodeDecodeError) as error:
            raise ProviderUnavailableError("DeepSeek API request failed.") from error

        answer = self._extract_answer(data)
        if not answer:
            raise ProviderUnavailableError("Provider returned empty answer")
        return answer
