import json
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

from app.ai.base_provider import BaseProvider
from app.ai.local_provider import LocalProvider
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
    api_url = "https://api.deepseek.com/chat/completions"

    def ask(self, question, context="", system_prompt=""):
        if not DEEPSEEK_API_KEY:
            return LocalProvider().ask(question, context, system_prompt)

        prompt = system_prompt or DEFAULT_SYSTEM_PROMPT
        payload = {
            "model": DEEPSEEK_MODEL,
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
        except (HTTPError, URLError, TimeoutError):
            return LocalProvider().ask(question, context, system_prompt)

        choices = data.get("choices") or []
        if not choices:
            return ""
        return choices[0].get("message", {}).get("content", "")
