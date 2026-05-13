import json
from pathlib import Path


BASE_DIR = Path(__file__).resolve().parent.parent
DATA_DIR = BASE_DIR / "data"


def load_json(filename):
    path = DATA_DIR / filename
    with path.open("r", encoding="utf-8") as file:
        return json.load(file)


def get_lessons():
    data = load_json("lessons.json")
    if isinstance(data, list):
        return data
    return data.get("lessons", [])


def get_lesson(lesson_ref):
    ref = str(lesson_ref)
    return next(
        (
            lesson
            for lesson in get_lessons()
            if str(lesson.get("id")) == ref or lesson.get("slug") == ref
        ),
        None,
    )


def get_default_lesson():
    lessons = get_lessons()
    return lessons[0] if lessons else None


def get_vocab_entries():
    entries = load_json("vocab.json")["entries"]
    return {entry["key"]: entry for entry in entries}


def get_pronunciation_targets():
    return load_json("pronunciation_targets.json")["targets"]


def get_grammar_essentials():
    return load_json("grammar.json").get("grammar_essentials", [])


def get_grammar_module(slug):
    return next(
        (
            module
            for module in get_grammar_essentials()
            if module.get("slug") == slug
        ),
        None,
    )
