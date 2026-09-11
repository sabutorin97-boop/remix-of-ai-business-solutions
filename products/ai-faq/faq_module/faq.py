"""Аккордеон FAQ и микроразметка FAQPage.

Здесь лежит вся логика FAQ: нормализация вопросов, генерация JSON-LD и
проверки текста ответов. Разметка и видимый текст берутся из одних и тех же
строк — расхождение между ними Яндекс.Вебмастер считает ошибкой.
"""

from __future__ import annotations

import re
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Iterable

MODULE_DIR = Path(__file__).resolve().parent
TEMPLATE_DIR = MODULE_DIR / "templates"
STATIC_DIR = MODULE_DIR / "static"

# Границы из методики: ответ должен читаться отдельно от страницы, чтобы его
# мог процитировать нейропоиск, но не превращаться в статью.
MIN_WORDS = 40
MAX_WORDS = 120
MIN_ITEMS = 3
MAX_ITEMS = 7

# Ссылку внутри ответа поисковик показать не сможет, а текст ей ломается.
_LINK_RE = re.compile(r"https?://|www\.|\[[^\]]+\]\(", re.IGNORECASE)
_WORD_RE = re.compile(r"[^\s]+")


@dataclass(frozen=True)
class FaqItem:
    """Один вопрос: идентификатор для якоря, вопрос и ответ."""

    id: str
    question: str
    answer: str


def normalize_faq(raw: Iterable[dict[str, Any]] | None, prefix: str = "faq") -> list[FaqItem]:
    """Привести список вопросов к единому виду и отбросить пустые записи."""

    items: list[FaqItem] = []
    for index, entry in enumerate(raw or [], start=1):
        question = str(entry.get("q", "")).strip()
        answer = str(entry.get("a", "")).strip()
        if not question or not answer:
            continue
        items.append(FaqItem(id=f"{prefix}-{index}", question=question, answer=answer))
    return items


def faq_jsonld(items: Iterable[FaqItem]) -> dict[str, Any] | None:
    """Собрать объект FAQPage. Пустой список разметки не даёт."""

    items = list(items)
    if not items:
        return None
    return {
        "@type": "FAQPage",
        "mainEntity": [
            {
                "@type": "Question",
                "name": item.question,
                "acceptedAnswer": {"@type": "Answer", "text": item.answer},
            }
            for item in items
        ],
    }


def plural(number: int, forms: tuple[str, str, str]) -> str:
    """Слово в форме под число: 1 слово, 2 слова, 5 слов."""

    tail_hundred = number % 100
    tail = number % 10
    if 11 <= tail_hundred <= 14:
        return forms[2]
    if tail == 1:
        return forms[0]
    if 2 <= tail <= 4:
        return forms[1]
    return forms[2]


def word_count(text: str) -> int:
    """Число слов в ответе — по этой мерке проверяется длина."""

    return len(_WORD_RE.findall(text))


def faq_warnings(items: Iterable[FaqItem]) -> list[str]:
    """Предупреждения для менеджера, заполняющего JSON.

    Это не ошибки сборки: страница соберётся и с длинным ответом. Но правила
    из методики стоит держать перед глазами, поэтому генератор о них говорит.
    """

    items = list(items)
    if not items:
        return []

    warnings: list[str] = []
    if len(items) < MIN_ITEMS:
        warnings.append(
            f"в FAQ {len(items)} {plural(len(items), ('вопрос', 'вопроса', 'вопросов'))}, "
            f"а нужно от {MIN_ITEMS} до {MAX_ITEMS} — "
            "короткий список редко попадает в выдачу"
        )
    if len(items) > MAX_ITEMS:
        warnings.append(
            f"в FAQ {len(items)} вопросов, это больше {MAX_ITEMS} — "
            "лишние вопросы размывают блок, унесите их в отдельную страницу"
        )

    for number, item in enumerate(items, start=1):
        words = word_count(item.answer)
        if words < MIN_WORDS:
            warnings.append(
                f"ответ №{number} «{_short(item.question)}» — {words} "
                f"{plural(words, ('слово', 'слова', 'слов'))}, меньше {MIN_WORDS}: "
                "вне страницы такой ответ непонятен"
            )
        elif words > MAX_WORDS:
            warnings.append(
                f"ответ №{number} «{_short(item.question)}» — {words} "
                f"{plural(words, ('слово', 'слова', 'слов'))}, больше {MAX_WORDS}: "
                "поисковик обрежет его на середине"
            )
        if _LINK_RE.search(item.answer):
            warnings.append(
                f"в ответе №{number} «{_short(item.question)}» есть ссылка — "
                "уберите её, в сниппете ссылка не кликается"
            )
    return warnings


def faq_styles() -> str:
    """Стили аккордеона."""

    return (STATIC_DIR / "faq.css").read_text(encoding="utf-8")


def faq_script() -> str:
    """Скрипт аккордеона: плавное раскрытие поверх рабочего <details>."""

    return (STATIC_DIR / "faq.js").read_text(encoding="utf-8")


def _short(text: str, limit: int = 40) -> str:
    """Обрезать вопрос для сообщения, не разрывая слово посередине."""

    text = text.strip()
    if len(text) <= limit:
        return text
    return text[:limit].rsplit(" ", 1)[0] + "…"
