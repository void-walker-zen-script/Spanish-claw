import json
from pathlib import Path


BASE_DIR = Path(__file__).resolve().parent.parent
DATA_DIR = BASE_DIR / "data"


def load_json(filename):
    path = DATA_DIR / filename
    with path.open("r", encoding="utf-8") as file:
        return json.load(file)


def get_lessons():
    return load_json("lessons.json")["lessons"]


def get_lesson(lesson_id):
    return next(
        (lesson for lesson in get_lessons() if lesson["id"] == lesson_id),
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
