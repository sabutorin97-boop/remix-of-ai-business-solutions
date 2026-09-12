"""Проверка client.json до рендера.

Ядро проверки по схеме — общее для продуктов студии, оно живёт в
`products/ai-faq/faq_module/schema_check.py`. Здесь остаётся то, что
свойственно только портфолио: как называются разделы и элементы списков в
сообщениях и какие правила не выражаются схемой.
"""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any

from shared import DataError, Naming, check_schema, human_path, load_json

# Человеческие названия верхних разделов — они попадают в текст ошибки.
SECTION_NAMES = {
    "meta": "meta (мета-данные страницы)",
    "brand": "brand (бренд)",
    "hero": "hero (первый экран)",
    "approach": "approach (подход)",
    "cases": "cases (кейсы)",
    "reviews": "reviews (отзывы)",
    "faq": "faq (вопросы и ответы)",
    "contacts": "contacts (контакты)",
    "cta": "cta (блок действия)",
    "legal": "legal (реквизиты)",
}

ITEM_LABELS = {
    "cases": "кейс",
    "reviews": "отзыв",
    "faq": "вопрос",
    "approach": "тезис",
}

NAMING = Naming(sections=SECTION_NAMES, item_labels=ITEM_LABELS)

# Имя ошибки оставлено прежним: с ним работает generate.py и тексты в README.
ClientDataError = DataError


def load_client(path: Path) -> dict[str, Any]:
    """Прочитать JSON клиента, объяснив синтаксическую ошибку по-человечески."""

    return load_json(path)


def validate_client(data: dict[str, Any], schema_path: Path) -> None:
    """Проверить данные по схеме и по правилам продукта."""

    schema = json.loads(schema_path.read_text(encoding="utf-8"))
    problems = check_schema(data, schema, NAMING)
    problems.extend(_business_rules(data))
    if problems:
        raise ClientDataError(problems)


def _business_rules(data: dict[str, Any]) -> list[str]:
    """Правила продукта, которых нет в схеме."""

    problems: list[str] = []

    def add(path: list[Any], message: str) -> None:
        problems.append(f"{human_path(path, NAMING)}: {message}")

    contacts = data.get("contacts") or {}
    if isinstance(contacts, dict):
        filled = [
            key
            for key in ("telegram", "phone", "whatsapp", "email")
            if str(contacts.get(key) or "").strip()
        ]
        if not filled:
            add(
                ["contacts"],
                "не заполнен ни один контакт — нужен хотя бы один из telegram, phone, whatsapp, email",
            )

    cases = data.get("cases")
    if isinstance(cases, list):
        for index, case in enumerate(cases):
            if not isinstance(case, dict):
                continue
            numbers = case.get("numbers") or []
            if isinstance(numbers, list) and len(numbers) > 4:
                add(
                    ["cases", index, "numbers"],
                    f"{len(numbers)} цифр в одном кейсе — в строку помещается 4, "
                    "лишние перегружают карточку",
                )

    email = str((data.get("contacts") or {}).get("email") or "").strip()
    if email and "@" not in email:
        add(["contacts", "email"], f"«{email}» не похоже на адрес почты")

    return problems
