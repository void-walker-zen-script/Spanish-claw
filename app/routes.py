from flask import Blueprint, abort, jsonify, render_template

from app.data_loader import (
    get_default_lesson,
    get_lesson,
    get_lessons,
    get_pronunciation_targets,
    get_vocab_entries,
)


main = Blueprint("main", __name__)


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
    return lesson_page(lesson["id"])


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


@main.route("/api/pronunciation-targets")
def api_pronunciation_targets():
    return jsonify({"targets": get_pronunciation_targets()})
