"""Подключение общих модулей студии.

FAQ-аккордеон и разметка FAQPage живут в соседнем продукте `products/ai-faq/`
и переиспользуются отсюда. Модуль добавляет его в путь импорта, чтобы
генератор не носил вторую копию той же вёрстки.
"""

from __future__ import annotations

import sys
from pathlib import Path

PRODUCT_DIR = Path(__file__).resolve().parent
AI_FAQ_DIR = PRODUCT_DIR.parent / "ai-faq"

if not (AI_FAQ_DIR / "faq_module").is_dir():
    raise SystemExit(
        f"Не найден модуль FAQ: {AI_FAQ_DIR / 'faq_module'}.\n"
        "Продукт переиспользует аккордеон и разметку из products/ai-faq/ — "
        "проверьте, что каталог на месте."
    )

if str(AI_FAQ_DIR) not in sys.path:
    sys.path.insert(0, str(AI_FAQ_DIR))

from faq_module import (  # noqa: E402  (путь настраивается выше по коду)
    TEMPLATE_DIR as FAQ_TEMPLATE_DIR,
    FaqItem,
    faq_jsonld,
    faq_script,
    faq_styles,
    faq_warnings,
    normalize_faq,
    plural,
)
from faq_module.schema_check import (  # noqa: E402
    DataError,
    Naming,
    check as check_schema,
    human_path,
    load_json,
)

__all__ = [
    "AI_FAQ_DIR",
    "DataError",
    "FAQ_TEMPLATE_DIR",
    "Naming",
    "PRODUCT_DIR",
    "FaqItem",
    "check_schema",
    "human_path",
    "load_json",
    "faq_jsonld",
    "faq_script",
    "faq_styles",
    "faq_warnings",
    "normalize_faq",
    "plural",
]
