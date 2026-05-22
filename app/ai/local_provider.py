import json
from pathlib import Path

from app.ai.base_provider import BaseProvider


UNKNOWN_ANSWER = "这个问题暂时没有匹配到本地术语。后续会由外部 AI 模型回答，或可补充到 vocab/glossary。"


class LocalProvider(BaseProvider):
    def __init__(self, glossary_path=None):
        base_dir = Path(__file__).resolve().parent.parent.parent
        self.glossary_path = glossary_path or base_dir / "data" / "glossary.json"
        self.terms = self._load_terms()

    def _load_terms(self):
        if not self.glossary_path.exists():
            return []

        with self.glossary_path.open("r", encoding="utf-8") as file:
            return json.load(file).get("terms", [])

    def _match_term(self, text):
        normalized_text = (text or "").lower()
        if not normalized_text:
            return None

        for term in self.terms:
            term_zh = (term.get("term_zh") or "").lower()
            term_en = (term.get("term_en") or "").lower()
            if term_zh and term_zh in normalized_text:
                return term
            if term_en and term_en in normalized_text:
                return term
        return None

    def _extract_selected_text(self, context):
        for line in (context or "").splitlines():
            key, _, value = line.partition(":")
            if key.strip().lower() == "selected_text":
                selected_text = value.strip()
                return "" if selected_text == "-" else selected_text
        return ""

    def _can_use_context_fallback(self, question):
        normalized_question = (question or "").strip().lower()
        if not normalized_question:
            return False
        return normalized_question in {
            "这是什么意思",
            "这个是什么意思",
            "这是什么",
            "这个是什么",
            "解释一下",
            "帮我解释一下",
            "what does this mean",
            "what is this",
            "explain this",
        }

    def _find_term(self, question, context):
        question_match = self._match_term(question)
        if question_match:
            return question_match

        selected_text_match = self._match_term(self._extract_selected_text(context))
        if selected_text_match:
            return selected_text_match

        if self._can_use_context_fallback(question):
            return self._match_term(context)

        return None

    def ask(self, question, context="", system_prompt="", model=None):
        term = self._find_term(question, context)
        if not term:
            return UNKNOWN_ANSWER

        spanish_examples = term.get("spanish_examples") or []
        english_examples = term.get("english_examples") or []
        example_lines = []
        for spanish, english in zip(spanish_examples[:2], english_examples[:2]):
            example_lines.append(f"- {spanish}\n  English: {english}")

        parts = [
            f"{term.get('term_zh')}（{term.get('term_en')}）",
            term.get("short_explanation_zh") or "",
            term.get("detailed_explanation_zh") or "",
        ]

        if example_lines:
            parts.append("例句：\n" + "\n".join(example_lines))

        return "\n\n".join(part for part in parts if part)
