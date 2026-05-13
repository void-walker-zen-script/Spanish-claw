import json
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

from app.ai.base_provider import BaseProvider
from app.ai.local_provider import LocalProvider
from app.config import ANTHROPIC_API_KEY, CLAUDE_MODEL


DEFAULT_SYSTEM_PROMPT = """
你是 Spanish Claw 的学习助手。
用户是有英语基础的中文西语学习者。
请用简体中文解释，并用英语作为桥梁解释西语结构。
西语例句保留西语，必要时提供 English counterpart。
不要直接复制外部来源内容。
回答要简洁。
""".strip()


class ClaudeProvider(BaseProvider):
    api_url = "https://api.anthropic.com/v1/messages"

    def ask(self, question, context="", system_prompt=""):
        if not ANTHROPIC_API_KEY:
            return LocalProvider().ask(question, context, system_prompt)

        prompt = system_prompt or DEFAULT_SYSTEM_PROMPT
        payload = {
            "model": CLAUDE_MODEL,
            "max_tokens": 700,
            "system": prompt,
            "messages": [
                {
                    "role": "user",
                    "content": "\n".join(
                        [
                            f"context: {context or '-'}",
                            f"question: {question or '-'}",
                        ]
                    ),
                }
            ],
        }
        request = Request(
            self.api_url,
            data=json.dumps(payload).encode("utf-8"),
            headers={
                "x-api-key": ANTHROPIC_API_KEY,
                "anthropic-version": "2023-06-01",
                "content-type": "application/json",
            },
            method="POST",
        )

        try:
            with urlopen(request, timeout=30) as response:
                data = json.loads(response.read().decode("utf-8"))
        except (HTTPError, URLError, TimeoutError):
            return LocalProvider().ask(question, context, system_prompt)

        content = data.get("content") or []
        return "".join(item.get("text", "") for item in content if item.get("type") == "text").strip()
