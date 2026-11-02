"""Small, dependency-free RSS adapter for the News learning module."""

from datetime import datetime, timedelta, timezone
from email.utils import parsedate_to_datetime
from threading import Lock
from urllib.parse import quote_plus
from urllib.request import Request, urlopen
from xml.etree import ElementTree


NEWS_CATEGORIES = {
    "technology": {"label": "科技", "query": "tecnología"},
    "entertainment": {"label": "娱乐", "query": "entretenimiento"},
    "food": {"label": "美食", "query": "gastronomía"},
    "travel": {"label": "旅行", "query": "viajes"},
    "education": {"label": "教育", "query": "educación"},
    "celebrity": {"label": "明星八卦", "query": "famosos"},
    "finance": {"label": "财经", "query": "finanzas"},
    "sports": {"label": "运动体育", "query": "deportes"},
}

_CACHE = {}
_LOCK = Lock()
_CACHE_TTL = timedelta(minutes=15)


def _clean_title(title):
    return title.rsplit(" - ", 1)[0].strip() if " - " in title else title.strip()


def _to_iso(value):
    try:
        return parsedate_to_datetime(value).astimezone(timezone.utc).isoformat()
    except (TypeError, ValueError):
        return ""


def get_news_headlines(category, limit=8):
    """Fetch Spanish-language headline metadata and preserve the original publisher link."""
    now = datetime.now(timezone.utc)
    with _LOCK:
        cached = _CACHE.get(category)
        if cached and now - cached["fetched_at"] < _CACHE_TTL:
            return cached["items"]

    query = NEWS_CATEGORIES[category]["query"]
    url = "https://news.google.com/rss/search?q={}&hl=es&gl=ES&ceid=ES:es".format(quote_plus(query))
    request = Request(url, headers={"User-Agent": "SpanishClaw/0.1 (learning prototype)"})
    try:
        with urlopen(request, timeout=6) as response:
            root = ElementTree.fromstring(response.read())
        items = []
        for item in root.findall("./channel/item")[:limit]:
            source = item.find("source")
            items.append({
                "title": _clean_title(item.findtext("title", "")),
                "publisher": source.text.strip() if source is not None and source.text else "新闻来源",
                "url": item.findtext("link", ""),
                "published_at": _to_iso(item.findtext("pubDate", "")),
            })
    except Exception:
        items = []

    with _LOCK:
        _CACHE[category] = {"fetched_at": now, "items": items}
    return items
