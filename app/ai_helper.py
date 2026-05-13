from app.config import OPENAI_API_KEY, OPENAI_MODEL


FALLBACK_ANSWER = "Ask Claw AI 尚未配置 API Key，目前只能使用本地术语解释。"

SYSTEM_PROMPT = """
你是 Spanish Claw 的学习助手 Ask Claw。

教学规则：
- 目标用户是有英语基础的中文西语学习者。
- 西语学习使用 English as bridge，先帮助用户借助英文理解西语结构。
- 回答主要使用简体中文解释。
- 西语例句必须保留西语原句，不要翻成中文后替代西语。
- 可以使用 English counterpart 或英文结构短语辅助解释句子结构。
- 不要编造不存在的 lesson 内容；如果上下文没有提供，就明确说明需要更多上下文。
- 不要直接复制外部来源内容。
- 回答要简洁、像学习助手，优先解释用户当前问题。
""".strip()


def build_ask_claw_input(payload):
    question = (payload.get("question") or "").strip()
    page_type = (payload.get("page_type") or "").strip()
    lesson_slug = (payload.get("lesson_slug") or "").strip()
    grammar_slug = (payload.get("grammar_slug") or "").strip()
    selected_text = (payload.get("selected_text") or "").strip()
    context = (payload.get("context") or "").strip()

    return "\n".join(
        [
            "请根据以下 Spanish Claw 页面上下文回答学习者问题。",
            f"page_type: {page_type or '-'}",
            f"lesson_slug: {lesson_slug or '-'}",
            f"grammar_slug: {grammar_slug or '-'}",
            f"selected_text: {selected_text or '-'}",
            f"context: {context or '-'}",
            f"question: {question or '-'}",
        ]
    )


def extract_response_text(response):
    output_text = getattr(response, "output_text", None)
    if output_text:
      return output_text

    chunks = []
    for item in getattr(response, "output", []) or []:
        for content in getattr(item, "content", []) or []:
            text = getattr(content, "text", None)
            if text:
                chunks.append(text)
    return "\n".join(chunks).strip()


def ask_claw(payload):
    if not OPENAI_API_KEY:
        return {
            "answer": FALLBACK_ANSWER,
            "source": "fallback",
        }

    from openai import OpenAI

    client = OpenAI(api_key=OPENAI_API_KEY)
    response = client.responses.create(
        model=OPENAI_MODEL,
        instructions=SYSTEM_PROMPT,
        input=build_ask_claw_input(payload),
        max_output_tokens=700,
    )

    return {
        "answer": extract_response_text(response) or "Ask Claw 暂时没有生成回答，请稍后再试。",
        "source": "openai",
    }
