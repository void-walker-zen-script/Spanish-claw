import json
import re
import unicodedata
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


def get_scene_catalog():
    scenes = load_json("scenes.json").get("scenes", [])
    stories = load_json("scene_stories.json").get("stories", {})
    return [
        {**scene, "lesson_dialogue": stories.get(scene.get("slug"), scene.get("dialogue", []))}
        for scene in scenes
    ]


def get_scene(scene_slug):
    return next((scene for scene in get_scene_catalog() if scene.get("slug") == scene_slug), None)


def _scene_vocab_key(value):
    normalized = unicodedata.normalize("NFD", value.lower())
    normalized = "".join(char for char in normalized if unicodedata.category(char) != "Mn")
    return re.sub(r"[^a-z0-9]+", "_", normalized).strip("_")


def build_scene_lesson(scene):
    """Adapt a scene-card data record to the shared interactive lesson UI."""
    vocabulary = scene.get("vocabulary", [])
    roles = scene.get("roles", [])
    dialogue = scene.get("lesson_dialogue") or scene.get("dialogue", [])
    characters = [
        {
            "name": role,
            "role_zh": role,
            "role_en": role,
            "description_zh": f"在「{scene.get('title', '当前情境')}」中完成自己的沟通任务。",
        }
        for role in roles
    ]

    transcript = [
        {
            "id": f"{scene['slug']}-intro",
            "type": "narration",
            "speaker": "Narration",
            "speaker_label_en": "Scene setup",
            "speaker_label_zh": "情境导入",
            "spanish": "Escucha el diálogo y observa cómo los personajes resuelven la tarea.",
            "english": "Listen to the dialogue and notice how the characters complete the task.",
            "chinese": "先听对话，再观察角色如何完成眼前的任务。",
            "structure_hint_zh": "先理解任务目标，再留意角色如何提出请求、确认信息或回应对方。",
            "clickable_items": [],
        }
    ]

    for index, line in enumerate(dialogue, start=1):
        speaker, spanish, chinese = line
        matching_words = []
        normalized_line = _scene_vocab_key(spanish)
        for spanish_word, translation in vocabulary:
            normalized_word = _scene_vocab_key(spanish_word)
            if normalized_word and normalized_word in normalized_line:
                matching_words.append(
                    {
                        "id": f"{scene['slug']}-line-{index}-{normalized_word}",
                        "spanish_text": spanish_word,
                        "english_text": "-",
                        "translation_zh": translation,
                        "type": "phrase",
                        "vocab_key": f"scene_{scene['slug']}_{normalized_word}",
                    }
                )
        transcript.append(
            {
                "id": f"{scene['slug']}-line-{index}",
                "type": "dialogue",
                "speaker": speaker,
                "speaker_label_en": speaker,
                "speaker_label_zh": speaker,
                "spanish": spanish,
                "chinese": chinese,
                "structure_hint_zh": "结合角色目标理解这句话：它在推进任务、确认信息或给出回应。",
                "clickable_items": matching_words,
            }
        )

    return {
        "id": f"scene-{scene['slug']}",
        "slug": f"scene-{scene['slug']}",
        "is_scene_lesson": True,
        "scene_slug": scene["slug"],
        "title": scene["title"],
        "level": scene.get("level", "A1-A2"),
        "scene": scene.get("sector", "具体情境"),
        "category": "Role-play scene lesson",
        "summary_zh": scene.get("context", scene.get("subtitle", "")),
        "summary_en": scene.get("subtitle", ""),
        "characters": characters,
        "learning_goals_zh": [
            f"理解「{scene.get('title', '当前情境')}」的角色任务与对话顺序",
            "点击高频词组，结合原句确认它的具体用法",
            "用完整句子完成一次询问、确认或回应",
        ],
        "keywords": [word[0] for word in vocabulary],
        "grammar_points_zh": [
            "角色任务中的礼貌请求与信息确认",
            "名词、数量与描述信息的对应表达",
            "根据身份与目的选择合适语气",
        ],
        "audio": {
            "tts_text": " ".join(item.get("spanish", "") for item in transcript),
        },
        "transcript": transcript,
    }


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
