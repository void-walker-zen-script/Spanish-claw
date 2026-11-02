from flask import Blueprint, abort, jsonify, render_template, request

from app.ai.base_provider import ProviderUnavailableError
from app.ai.provider_manager import get_available_providers, resolve_ask_provider
from app.data_loader import (
    get_default_lesson,
    get_grammar_essentials,
    get_grammar_module,
    get_lesson,
    get_lessons,
    get_pronunciation_targets,
    get_vocab_entries,
)
from app.news_service import NEWS_CATEGORIES, get_news_headlines


main = Blueprint("main", __name__)


ASK_CLAW_SYSTEM_PROMPT = """
你是 Spanish Claw 的学习助手 Ask Claw。
用户是有英语基础的中文西语学习者。
请用简体中文解释，并用英语作为桥梁解释西语结构。
西语例句保留西语，必要时提供 English counterpart。
不要编造不存在的 lesson 内容；如果上下文没有提供，就说明需要更多上下文。
不要直接复制外部来源内容。
回答要简洁、像学习助手。
""".strip()


def build_ask_claw_context(payload):
    def clean(value, default="-"):
        if value is None:
            return default
        value = str(value).strip()
        return value or default

    return "\n".join(
        [
            f"page_type: {clean(payload.get('page_type'))}",
            f"lesson_slug: {clean(payload.get('lesson_slug'))}",
            f"grammar_slug: {clean(payload.get('grammar_slug'))}",
            f"selected_text: {clean(payload.get('selected_text'))}",
            f"context: {clean(payload.get('context'))}",
        ]
    )


@main.route("/")
def index():
    lessons = get_lessons()
    default_lesson = lessons[0] if lessons else None
    return render_template("index.html", lessons=lessons, default_lesson=default_lesson)


@main.route("/lesson")
def default_lesson():
    lesson = get_default_lesson()
    if lesson is None:
        abort(404)
    return lesson_page(lesson.get("slug") or lesson["id"])


@main.route("/lesson/<lesson_id>")
def lesson_page(lesson_id):
    lesson = get_lesson(lesson_id)
    if lesson is None:
        abort(404)
    return render_template(
        "lesson.html",
        lesson=lesson,
        vocab_entries=get_vocab_entries(),
    )


@main.route("/saved")
def saved():
    return render_template("saved.html")


@main.route("/pronunciation")
def pronunciation():
    return render_template(
        "pronunciation.html",
        targets=get_pronunciation_targets(),
    )


@main.route("/grammar")
def grammar():
    return render_template(
        "grammar.html",
        grammar_essentials=get_grammar_essentials(),
    )


@main.route("/grammar/<slug>")
def grammar_detail(slug):
    module = get_grammar_module(slug)
    if module is None:
        abort(404)
    return render_template("grammar_detail.html", module=module)


@main.route("/vocabulary")
def vocabulary():
    return render_template("vocabulary.html", entries=get_vocab_entries().values())


@main.route("/news")
def news():
    return render_template("news.html", categories=NEWS_CATEGORIES)


@main.route("/buddy")
def buddy():
    return render_template("buddy.html")


@main.route("/about")
def about():
    return render_template("about.html")


@main.route("/api/lessons")
def api_lessons():
    return jsonify({"lessons": get_lessons()})


@main.route("/api/lesson/<lesson_id>")
def api_lesson(lesson_id):
    lesson = get_lesson(lesson_id)
    if lesson is None:
        abort(404)
    return jsonify({"lesson": lesson})


@main.route("/api/vocab")
def api_vocab():
    return jsonify({"entries": get_vocab_entries()})


@main.route("/api/news")
def api_news():
    category = request.args.get("category", "technology")
    if category not in NEWS_CATEGORIES:
        return jsonify({"error": "Unknown news category"}), 400
    return jsonify({"category": category, "headlines": get_news_headlines(category)})


@main.route("/api/pronunciation-targets")
def api_pronunciation_targets():
    return jsonify({"targets": get_pronunciation_targets()})


@main.route("/api/ai-providers")
def api_ai_providers():
    return jsonify({"providers": get_available_providers()})


@main.route("/api/ask-claw", methods=["POST"])
def api_ask_claw():
    payload = request.get_json(silent=True) or {}
    requested_model = str(payload.get("model") or "").strip()
    provider_info = resolve_ask_provider(payload.get("provider"))
    if not provider_info.get("available"):
        return jsonify(
            {
                "error": "Provider unavailable",
                "provider": provider_info["provider_name"],
            }
        )

    provider = provider_info["provider"]
    model = requested_model or provider_info["model"]
    try:
        answer = provider.ask(
            question=str(payload.get("question") or "").strip(),
            context=build_ask_claw_context(payload),
            system_prompt=ASK_CLAW_SYSTEM_PROMPT,
            model=None if model == "local" else model,
        )
    except ProviderUnavailableError as error:
        return jsonify(
            {
                "error": str(error) or "Provider unavailable",
                "provider": provider_info["provider_name"],
                "model": model,
            }
        )

    if not str(answer or "").strip():
        return jsonify(
            {
                "error": "Provider returned empty answer",
                "provider": provider_info["provider_name"],
                "model": model,
            }
        )

    return jsonify(
        {
            "answer": str(answer).strip(),
            "provider": provider_info["provider_name"],
            "model": model,
            "source": provider_info["source"],
        }
    )
