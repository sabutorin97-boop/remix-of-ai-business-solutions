"""Общий FAQ-модуль студии: аккордеон и разметка FAQPage.

Модуль — единственная реализация FAQ на все продукты. Соседние генераторы
подключают его, а не копируют вёрстку, поэтому правка расходится по всем
собранным сайтам сразу.
"""

from .faq import (
    MAX_ITEMS,
    MAX_WORDS,
    MIN_ITEMS,
    MIN_WORDS,
    STATIC_DIR,
    TEMPLATE_DIR,
    FaqItem,
    faq_jsonld,
    faq_script,
    faq_styles,
    faq_warnings,
    normalize_faq,
    plural,
)

__all__ = [
    "FaqItem",
    "MAX_ITEMS",
    "MAX_WORDS",
    "MIN_ITEMS",
    "MIN_WORDS",
    "STATIC_DIR",
    "TEMPLATE_DIR",
    "faq_jsonld",
    "faq_script",
    "faq_styles",
    "faq_warnings",
    "normalize_faq",
    "plural",
]
