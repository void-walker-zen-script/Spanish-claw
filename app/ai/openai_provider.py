from app.ai.base_provider import BaseProvider
from app.ai.local_provider import LocalProvider
from app.config import OPENAI_API_KEY, OPENAI_MODEL


DEFAULT_SYSTEM_PROMPT = """
你是 Spanish Claw 的学习助手。
用户是有英语基础的中文西语学习者。
请用简体中文解释，并用英语作为桥梁解释西语结构。
西语例句保留西语，必要时提供 English counterpart。
不要直接复制外部来源内容。
回答要简洁、像学习助手。
""".strip()


class OpenAIProvider(BaseProvider):
    def ask(self, question, context="", system_prompt=""):
        if not OPENAI_API_KEY:
            return LocalProvider().ask(question, context, system_prompt)

        from openai import OpenAI

        prompt = system_prompt or DEFAULT_SYSTEM_PROMPT
        user_input = "\n".join(
            [
                f"context: {context or '-'}",
                f"question: {question or '-'}",
            ]
        )

        client = OpenAI(api_key=OPENAI_API_KEY)
        response = client.responses.create(
            model=OPENAI_MODEL,
            instructions=prompt,
            input=user_input,
        )

        return getattr(response, "output_text", "") or ""
