import json
from urllib.error import HTTPError, URLError
from urllib.parse import quote
from urllib.request import Request, urlopen

from app.ai.base_provider import BaseProvider, ProviderUnavailableError
from app.config import GEMINI_API_KEY, GEMINI_MODEL


DEFAULT_SYSTEM_PROMPT = """
你是 Spanish Claw 的学习助手。
用户是有英语基础的中文西语学习者。
请用简体中文解释，并用英语作为桥梁解释西语结构。
西语例句保留西语，必要时提供 English counterpart。
不要直接复制外部来源内容。
回答要简洁、像学习助手。
""".strip()


class GeminiProvider(BaseProvider):
    provider_name = "gemini"
    default_model = GEMINI_MODEL
    api_base_url = "https://generativelanguage.googleapis.com/v1beta/models"

    @classmethod
    def health_check(cls, model=None):
        if not GEMINI_API_KEY:
            return False

        health_model = quote(model or cls.default_model, safe="")
        payload = {
            "contents": [
                {
                    "role": "user",
                    "parts": [{"text": "Reply with OK."}],
                }
            ],
            "generationConfig": {
                "maxOutputTokens": 4,
                "temperature": 0,
            },
        }
        request = Request(
            f"{cls.api_base_url}/{health_model}:generateContent",
            data=json.dumps(payload).encode("utf-8"),
            headers={
                "Content-Type": "application/json",
                "x-goog-api-key": GEMINI_API_KEY,
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
            return "Gemini API request failed."
        return data.get("error", {}).get("message") or "Gemini API request failed."

    def _extract_answer(self, data):
        text = data.get("text")
        if text:
            return text.strip()

        chunks = []
        for candidate in data.get("candidates") or []:
            content = candidate.get("content") or {}
            for part in content.get("parts") or []:
                part_text = part.get("text")
                if part_text:
                    chunks.append(part_text)

        return "".join(chunks).strip()

    def ask(self, question, context="", system_prompt="", model=None):
        if not GEMINI_API_KEY:
            raise ProviderUnavailableError("Gemini API key is not configured.")

        prompt = system_prompt or DEFAULT_SYSTEM_PROMPT
        user_text = "\n".join(
            [
                prompt,
                "",
                f"context: {context or '-'}",
                f"question: {question or '-'}",
            ]
        )
        payload = {
            "contents": [
                {
                    "role": "user",
                    "parts": [{"text": user_text}],
                }
            ]
        }
        model = quote(model or self.default_model, safe="")
        request = Request(
            f"{self.api_base_url}/{model}:generateContent",
            data=json.dumps(payload).encode("utf-8"),
            headers={
                "Content-Type": "application/json",
                "x-goog-api-key": GEMINI_API_KEY,
            },
            method="POST",
        )

        try:
            with urlopen(request, timeout=30) as response:
                data = json.loads(response.read().decode("utf-8"))
        except HTTPError as error:
            raise ProviderUnavailableError(self._read_error_message(error)) from error
        except (URLError, TimeoutError, json.JSONDecodeError, UnicodeDecodeError) as error:
            raise ProviderUnavailableError("Gemini API request failed.") from error

        answer = self._extract_answer(data)
        if not answer:
            raise ProviderUnavailableError("Provider returned empty answer")
        return answer
