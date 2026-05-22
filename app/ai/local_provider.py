import json
import re
from pathlib import Path

from app.ai.base_provider import BaseProvider


UNKNOWN_ANSWER = "这个词暂时没有本地解释。你可以之后把它补充进 vocab.json，或配置外部 AI provider 进行实时回答。"


class LocalProvider(BaseProvider):
    def __init__(self, glossary_path=None):
        base_dir = Path(__file__).resolve().parent.parent.parent
        self.glossary_path = glossary_path or base_dir / "data" / "glossary.json"
        self.vocab_path = base_dir / "data" / "vocab.json"
        self.terms = self._load_terms()
        self.vocab_entries = self._load_vocab_entries()

    def _load_terms(self):
        if not self.glossary_path.exists():
            return []

        with self.glossary_path.open("r", encoding="utf-8") as file:
            return json.load(file).get("terms", [])

    def _load_vocab_entries(self):
        if not self.vocab_path.exists():
            return []

        with self.vocab_path.open("r", encoding="utf-8") as file:
            return json.load(file).get("entries", [])

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

    def _extract_vocab_target(self, question, context):
        selected_text = self._extract_selected_text(context)
        if selected_text:
            return selected_text.split()[0].strip("¿?¡!.,:;\"'()[]{}").lower()

        normalized_question = (question or "").strip().lower()
        patterns = [
            r"什么是\s+([a-záéíóúüñ]+)",
            r"([a-záéíóúüñ]+)\s+是什么意思",
            r"que significa\s+([a-záéíóúüñ]+)",
            r"qué significa\s+([a-záéíóúüñ]+)",
            r"what does\s+([a-záéíóúüñ]+)\s+mean",
            r"what is\s+([a-záéíóúüñ]+)",
        ]

        for pattern in patterns:
            match = re.search(pattern, normalized_question, flags=re.IGNORECASE)
            if match:
                return match.group(1).strip().lower()

        return ""

    def _find_vocab_entry(self, target):
        normalized_target = (target or "").lower()
        if not normalized_target:
            return None

        for entry in self.vocab_entries:
            candidates = {
                entry.get("text", ""),
                entry.get("lemma", ""),
                entry.get("spanish_text", ""),
                entry.get("audio_text", ""),
            }
            if normalized_target in {str(item).lower() for item in candidates if item}:
                return entry
        return None

    def _format_vocab_answer(self, entry):
        text = entry.get("text") or entry.get("spanish_text") or entry.get("lemma")
        lemma = entry.get("lemma")
        translation = entry.get("translation") or entry.get("english_text") or entry.get("translation_zh")
        parts = [f"{text} 的意思是：{translation}。"]

        if lemma and lemma != text:
            parts.append(f"它的原形/词条形式是 {lemma}。")
        if entry.get("pos"):
            parts.append(f"词性：{entry.get('pos')}。")
        if entry.get("common_usage"):
            parts.append(f"常见用法：{entry.get('common_usage')}")
        if entry.get("example"):
            parts.append(f"例句：{entry.get('example')}")

        return "\n".join(parts)

    def _rule_based_vocab_answer(self, target):
        if target == "libros":
            return "libros 是 libro 的复数，意思是 books / 书。西语中名词通常会根据单复数变化，libro 是单数，libros 是复数。"
        return ""

    def ask(self, question, context="", system_prompt="", model=None):
        term = self._find_term(question, context)
        if term:
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

        vocab_target = self._extract_vocab_target(question, context)
        vocab_entry = self._find_vocab_entry(vocab_target)
        if vocab_entry:
            return self._format_vocab_answer(vocab_entry)

        rule_answer = self._rule_based_vocab_answer(vocab_target)
        if rule_answer:
            return rule_answer

        return UNKNOWN_ANSWER
