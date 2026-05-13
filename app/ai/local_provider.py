import json
from pathlib import Path

from app.ai.base_provider import BaseProvider


UNKNOWN_ANSWER = "这个问题后续会由外部 AI 模型回答。"


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

    def _find_term(self, question, context):
        text = f"{question or ''} {context or ''}".lower()
        for term in self.terms:
            term_zh = (term.get("term_zh") or "").lower()
            term_en = (term.get("term_en") or "").lower()
            if term_zh and term_zh in text:
                return term
            if term_en and term_en in text:
                return term
        return None

    def ask(self, question, context="", system_prompt=""):
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
