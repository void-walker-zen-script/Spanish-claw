import json
from urllib.error import HTTPError, URLError
from urllib.parse import quote
from urllib.request import Request, urlopen

from app.ai.base_provider import BaseProvider
from app.ai.local_provider import LocalProvider
from app.config import GEMINI_API_KEY, GEMINI_MODEL


DEFAULT_SYSTEM_PROMPT = """
你是 Spanish Claw 的学习助手。
用户是有英语基础的中文西语学习者。
请用简体中文解释，并用英语作为桥梁解释西语结构。
西语例句保留西语，必要时提供 English counterpart。
不要直接复制外部来源内容。
回答要简洁。
""".strip()


class GeminiProvider(BaseProvider):
    api_base_url = "https://generativelanguage.googleapis.com/v1beta/models"

    def ask(self, question, context="", system_prompt=""):
        if not GEMINI_API_KEY:
            return LocalProvider().ask(question, context, system_prompt)

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
        model = quote(GEMINI_MODEL, safe="")
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
        except (HTTPError, URLError, TimeoutError):
            return LocalProvider().ask(question, context, system_prompt)

        candidates = data.get("candidates") or []
        if not candidates:
            return ""

        parts = candidates[0].get("content", {}).get("parts") or []
        return "".join(part.get("text", "") for part in parts).strip()
