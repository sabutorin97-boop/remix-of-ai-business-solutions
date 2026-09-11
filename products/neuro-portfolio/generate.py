#!/usr/bin/env python3
"""Нейро-Портфолио: сборка сайта-портфолио из client.json.

    python generate.py schema/example.json dist/

На входе — данные клиента, на выходе — статическая папка: index.html,
privacy.html, style.css, script.js и img/. Ни сборщиков, ни рантайма,
ни единого внешнего запроса у собранной страницы.
"""

from __future__ import annotations

import argparse
import json
import re
import shutil
import sys
from dataclasses import dataclass
from datetime import date
from html.parser import HTMLParser
from pathlib import Path
from typing import Any, Iterable

from jinja2 import ChoiceLoader, Environment, FileSystemLoader, StrictUndefined

from shared import (
    FAQ_TEMPLATE_DIR,
    PRODUCT_DIR,
    faq_jsonld,
    faq_script,
    faq_styles,
    faq_warnings,
    normalize_faq,
    plural,
)
from validation import ClientDataError, load_client, validate_client

TEMPLATE_DIR = PRODUCT_DIR / "templates"
THEME_DIR = PRODUCT_DIR / "themes"
ASSET_DIR = PRODUCT_DIR / "assets"
SCHEMA_PATH = PRODUCT_DIR / "schema" / "client.schema.json"

PAGE_BUDGET_KB = 150  # вес страницы без картинок
TOTAL_BUDGET_KB = 1024  # вес со всеми картинками

# Единицы, которые генератор умеет склонять при усреднении.
UNITS = {
    "день": ("день", "дня", "дней"),
    "дня": ("день", "дня", "дней"),
    "дней": ("день", "дня", "дней"),
    "неделя": ("неделя", "недели", "недель"),
    "недели": ("неделя", "недели", "недель"),
    "недель": ("неделя", "недели", "недель"),
    "месяц": ("месяц", "месяца", "месяцев"),
    "месяца": ("месяц", "месяца", "месяцев"),
    "месяцев": ("месяц", "месяца", "месяцев"),
    "час": ("час", "часа", "часов"),
    "часа": ("час", "часа", "часов"),
    "часов": ("час", "часа", "часов"),
    "минута": ("минута", "минуты", "минут"),
    "минуты": ("минута", "минуты", "минут"),
    "минут": ("минута", "минуты", "минут"),
    "раз": ("раз", "раза", "раз"),
    "раза": ("раз", "раза", "раз"),
    "заявка": ("заявка", "заявки", "заявок"),
    "заявки": ("заявка", "заявки", "заявок"),
    "заявок": ("заявка", "заявки", "заявок"),
}

_NUMBER_RE = re.compile(r"^(?P<prefix>[^\d\-+]*)(?P<sign>[-+]?)(?P<number>[\d\s  ]*\d(?:[.,]\d+)?)(?P<suffix>.*)$")


class BuildError(Exception):
    """Ошибка сборки, которую нужно показать человеку, а не трейсбеком."""


@dataclass
class Build:
    """Результат сборки: что собрали и о чём стоит предупредить."""

    out_dir: Path
    warnings: list[str]
    page_bytes: int
    total_bytes: int


# --------------------------------------------------------------------------- #
# Подготовка данных
# --------------------------------------------------------------------------- #


def build_context(data: dict[str, Any], theme: str, warnings: list[str]) -> dict[str, Any]:
    """Собрать всё, что нужно шаблонам, из проверенных данных клиента."""

    meta = {
        "title": data["meta"]["title"],
        "description": data["meta"]["description"],
        "domain": str(data["meta"].get("domain") or "").rstrip("/"),
        "lang": data["meta"].get("lang") or "ru",
    }
    brand = {
        "name": data["brand"]["name"],
        "tagline": data["brand"]["tagline"],
        "logo": str(data["brand"].get("logo") or "") or None,
        "social": [link for link in (data["brand"].get("social") or []) if link],
    }
    hero = {
        "headline": data["hero"]["headline"],
        "subline": data["hero"]["subline"],
        "cta_text": data["hero"]["cta_text"],
        "cta_url": data["hero"]["cta_url"],
        "media": str(data["hero"].get("media") or "") or None,
        "media_alt": str(data["hero"].get("media_alt") or ""),
    }
    legal = {
        "entity": str((data.get("legal") or {}).get("entity") or ""),
        "inn": str((data.get("legal") or {}).get("inn") or ""),
        "privacy_contact": str((data.get("legal") or {}).get("privacy_contact") or ""),
    }
    contacts = prepare_contacts(data.get("contacts") or {})
    cases = prepare_cases(data["cases"])
    faq_items = normalize_faq(data.get("faq"))
    warnings.extend(faq_warnings(faq_items))

    cta = data.get("cta") or {}
    cta_url = str(cta.get("url") or hero["cta_url"]).strip()

    context: dict[str, Any] = {
        "lang": meta["lang"],
        "meta": meta,
        "theme": theme,
        "brand": brand,
        "hero": hero,
        "approach": [item for item in (data.get("approach") or []) if item.get("title")],
        "cases": cases,
        "summary": summarize(cases),
        "reviews": prepare_reviews(data.get("reviews") or []),
        "reviews_title": "Что говорят клиенты",
        "contacts": contacts,
        "legal": legal,
        "cta": {
            # Название действия одно на всю страницу: заголовок блока, кнопка
            # и подтверждение формы называются одинаково.
            "title": cta.get("title") or hero["cta_text"],
            "text": cta.get("text")
            or "Расскажите про задачу — ответим, что из этого решается и за какой срок.",
            "button": cta.get("button") or hero["cta_text"],
            "url": cta_url,
            "form": cta.get("form", True) is not False,
        },
        "icons": load_icons(),
        # Переменные FAQ-модуля: шаблон общий, названия полей фиксированы.
        "faq_items": faq_items,
        "faq_title": "Вопросы и ответы",
        "faq_help_text": "Не нашли свой вопрос?",
        "faq_help_url": contacts["primary"]["url"] if contacts["primary"] else None,
        "faq_help_link_text": "Спросите напрямую",
        "og_image": absolute_url(meta["domain"], hero["media"] or first_case_image(cases)),
        "year": date.today().year,
    }
    context["jsonld"] = build_jsonld(context, faq_items)
    return context


def attach_image_sizes(context: dict[str, Any], source_dir: Path) -> None:
    """Проставить размеры картинок, чтобы страница не прыгала при загрузке."""

    def size_of(relative: str | None) -> dict[str, int | None]:
        if not relative:
            return {"width": None, "height": None}
        found = image_size(source_dir / relative)
        return {"width": found[0], "height": found[1]} if found else {"width": None, "height": None}

    context["hero_media_size"] = size_of(context["hero"].get("media"))
    for case in context["cases"]:
        case["size"] = size_of(case["image"])


def prepare_contacts(raw: dict[str, Any]) -> dict[str, Any]:
    """Развернуть контакты в ссылки и подписи."""

    items: list[dict[str, str]] = []

    telegram = str(raw.get("telegram") or "").strip()
    if telegram:
        handle = telegram.lstrip("@").replace("https://t.me/", "").replace("t.me/", "").strip("/")
        items.append(
            {
                "kind": "telegram",
                "label": "Telegram",
                "text": f"@{handle}",
                "url": f"https://t.me/{handle}",
            }
        )

    phone = str(raw.get("phone") or "").strip()
    if phone:
        items.append(
            {
                "kind": "phone",
                "label": "Телефон",
                "text": phone,
                "url": "tel:" + re.sub(r"[^\d+]", "", phone),
            }
        )

    whatsapp = str(raw.get("whatsapp") or "").strip()
    if whatsapp:
        digits = re.sub(r"\D", "", whatsapp)
        items.append(
            {
                "kind": "whatsapp",
                "label": "WhatsApp",
                "text": whatsapp,
                "url": f"https://wa.me/{digits}",
            }
        )

    email = str(raw.get("email") or "").strip()
    if email:
        items.append({"kind": "mail", "label": "Почта", "text": email, "url": f"mailto:{email}"})

    return {
        "channels": items,
        "primary": items[0] if items else None,
        "email": email,
        "telegram_url": next((item["url"] for item in items if item["kind"] == "telegram"), ""),
        "address": str(raw.get("address") or "").strip(),
        "hours": str(raw.get("hours") or "").strip(),
    }


def prepare_reviews(raw: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """Отзывы с заполненными необязательными полями."""

    return [
        {
            "author": review["author"],
            "role": str(review.get("role") or ""),
            "text": review["text"],
            "photo": str(review.get("photo") or "") or None,
        }
        for review in raw
        if str(review.get("text") or "").strip()
    ]


def first_case_image(cases: list[dict[str, Any]]) -> str:
    """Первая картинка кейса — запасной вариант превью для соцсетей."""

    return next((case["image"] for case in cases if case["image"]), "")


def absolute_url(domain: str, path: str | None) -> str:
    """Абсолютный адрес картинки: соцсети относительные пути не читают."""

    if not path:
        return ""
    if path.startswith(("http://", "https://")):
        return path
    if not domain:
        return ""
    return f"{domain}/{path.lstrip('/')}"


def prepare_cases(raw: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """Разложить кейсы и пронумеровать их для якорей."""

    cases: list[dict[str, Any]] = []
    for index, case in enumerate(raw, start=1):
        numbers = [item for item in (case.get("numbers") or []) if item.get("value")]
        cases.append(
            {
                "id": f"case-{index}",
                "client": str(case.get("client") or "").strip(),
                "niche": str(case.get("niche") or "").strip(),
                "pain": case["pain"].strip(),
                "solution": case["solution"].strip(),
                "result": case["result"].strip(),
                "numbers": numbers,
                "image": str(case.get("image") or "").strip(),
                "image_alt": str(case.get("image_alt") or "").strip(),
                "url": str(case.get("url") or "").strip(),
                "quote": str(case.get("quote") or "").strip(),
                "quote_author": str(case.get("quote_author") or "").strip(),
            }
        )
    return cases


def summarize(cases: list[dict[str, Any]]) -> list[dict[str, str]]:
    """Свести цифры кейсов в общий итог.

    Руками ничего не вбивается: считаем проекты, ниши и средние по тем
    подписям, которые встречаются минимум в двух кейсах.
    """

    total: list[dict[str, str]] = [
        {
            "value": str(len(cases)),
            "label": plural(len(cases), ("проект в портфолио", "проекта в портфолио", "проектов в портфолио")),
        }
    ]

    niches = {case["niche"] for case in cases if case["niche"]}
    if len(niches) > 1:
        total.append(
            {"value": str(len(niches)), "label": plural(len(niches), ("ниша", "ниши", "ниш"))}
        )

    grouped: dict[str, list[str]] = {}
    for case in cases:
        for number in case["numbers"]:
            grouped.setdefault(number["label"].strip().lower(), []).append(number["value"])

    averages: list[tuple[int, dict[str, str]]] = []
    for label, values in grouped.items():
        if len(values) < 2:
            continue
        average = average_value(values)
        if average:
            # «≈» короче слов «в среднем» и не ломает подпись из данных кейса.
            averages.append((len(values), {"value": f"≈{average}", "label": label}))

    averages.sort(key=lambda item: item[0], reverse=True)
    total.extend(item for _, item in averages[:2])
    return total[:4]


def average_value(values: list[str]) -> str | None:
    """Среднее по списку значений вида «+38%», «2 дня», «180 000 ₽»."""

    parsed = [parse_number(value) for value in values]
    if any(item is None for item in parsed):
        return None

    prefixes = {item[1] for item in parsed}          # type: ignore[index]
    suffixes = {item[3].strip().lower() for item in parsed}  # type: ignore[index]
    if len(prefixes) > 1 or len(suffixes) > 1:
        return None

    numbers = [item[2] for item in parsed]  # type: ignore[index]
    mean = sum(numbers) / len(numbers)
    prefix = parsed[0][1]  # type: ignore[index]
    sign = parsed[0][0]    # type: ignore[index]
    suffix = parsed[0][3]  # type: ignore[index]

    rounded = round(mean) if mean >= 10 or float(mean).is_integer() else round(mean, 1)
    word = suffix.strip()
    if word.lower() in UNITS:
        rounded = round(mean)
        suffix = " " + plural(int(rounded), UNITS[word.lower()])

    return f"{prefix}{sign}{format_number(rounded)}{suffix}"


def parse_number(value: str) -> tuple[str, str, float, str] | None:
    """Разобрать «+38%» на знак, число и хвост. None — если числа нет."""

    match = _NUMBER_RE.match(value.strip())
    if not match:
        return None
    digits = re.sub(r"[\s  ]", "", match.group("number")).replace(",", ".")
    try:
        number = float(digits)
    except ValueError:
        return None
    return match.group("sign"), match.group("prefix"), number, match.group("suffix")


def format_number(number: float) -> str:
    """Число по-русски: запятая в дробях, неразрывный пробел в тысячах."""

    if float(number).is_integer():
        text = f"{int(number):,}".replace(",", " ")
    else:
        text = f"{number:,.1f}".replace(",", " ").replace(".", ",")
    return text


def image_size(path: Path) -> tuple[int, int] | None:
    """Ширина и высота картинки из самого файла.

    Нужны атрибуты width и height у <img>: без них страница прыгает, пока
    грузятся изображения. Разбираем SVG, PNG, JPEG и WebP — остального в
    портфолио не бывает.
    """

    try:
        head = path.read_bytes()
    except OSError:
        return None

    suffix = path.suffix.lower()
    if suffix == ".svg":
        text = head[:2000].decode("utf-8", "ignore")
        width = re.search(r'width="(\d+(?:\.\d+)?)', text)
        height = re.search(r'height="(\d+(?:\.\d+)?)', text)
        if width and height:
            return int(float(width.group(1))), int(float(height.group(1)))
        box = re.search(r'viewBox="[\d.\s-]*?([\d.]+)\s+([\d.]+)"', text)
        if box:
            return int(float(box.group(1))), int(float(box.group(2)))
        return None

    if suffix == ".png" and head[:8] == b"\x89PNG\r\n\x1a\n":
        return int.from_bytes(head[16:20], "big"), int.from_bytes(head[20:24], "big")

    if suffix in {".jpg", ".jpeg"} and head[:2] == b"\xff\xd8":
        index = 2
        while index + 9 < len(head):
            if head[index] != 0xFF:
                index += 1
                continue
            marker = head[index + 1]
            length = int.from_bytes(head[index + 2 : index + 4], "big")
            if 0xC0 <= marker <= 0xCF and marker not in {0xC4, 0xC8, 0xCC}:
                height = int.from_bytes(head[index + 5 : index + 7], "big")
                width = int.from_bytes(head[index + 7 : index + 9], "big")
                return width, height
            index += 2 + length
        return None

    if suffix == ".webp" and head[:4] == b"RIFF" and head[8:12] == b"WEBP":
        if head[12:16] == b"VP8 ":
            return (
                int.from_bytes(head[26:28], "little") & 0x3FFF,
                int.from_bytes(head[28:30], "little") & 0x3FFF,
            )
        if head[12:16] == b"VP8L":
            bits = int.from_bytes(head[21:25], "little")
            return (bits & 0x3FFF) + 1, ((bits >> 14) & 0x3FFF) + 1
        if head[12:16] == b"VP8X":
            return (
                int.from_bytes(head[24:27], "little") + 1,
                int.from_bytes(head[27:30], "little") + 1,
            )
    return None


def load_icons() -> dict[str, str]:
    """Прочитать иконки из assets — в HTML они попадают инлайном.

    Иконочных библиотек и шрифтов нет намеренно: инлайновый SVG не создаёт
    запросов и красится текущим цветом темы.
    """

    icons: dict[str, str] = {}
    for path in sorted((ASSET_DIR / "icons").glob("*.svg")):
        icons[path.stem] = path.read_text(encoding="utf-8").strip()
    return icons


def build_jsonld(context: dict[str, Any], faq_items: Iterable[Any]) -> str:
    """Собрать JSON-LD. Экранирование — только через json.dumps."""

    brand = context["brand"]
    contacts = context["contacts"]

    organization: dict[str, Any] = {
        "@type": "ProfessionalService",
        "name": brand["name"],
        "description": brand["tagline"],
        "url": context["meta"].get("domain") or None,
    }

    if brand.get("logo"):
        organization["logo"] = absolute_url(context["meta"]["domain"], brand["logo"]) or brand["logo"]

    telephone = next((item["text"] for item in contacts["channels"] if item["kind"] == "phone"), None)
    if telephone:
        organization["telephone"] = telephone
    if contacts["email"]:
        organization["email"] = contacts["email"]
    if contacts["address"]:
        organization["address"] = {"@type": "PostalAddress", "streetAddress": contacts["address"]}

    same_as = [item["url"] for item in contacts["channels"] if item["url"].startswith("https://")]
    same_as.extend(str(link) for link in (brand.get("social") or []) if link)
    if same_as:
        organization["sameAs"] = same_as

    organization = {key: value for key, value in organization.items() if value}

    graph: list[dict[str, Any]] = [organization]
    faq_block = faq_jsonld(faq_items)
    if faq_block:
        graph.append(faq_block)

    document = {"@context": "https://schema.org", "@graph": graph}
    text = json.dumps(document, ensure_ascii=False, indent=2)
    # Экранируем угловые скобки и амперсанд: иначе текст с «<» закроет <script>.
    return text.replace("<", "\\u003c").replace(">", "\\u003e").replace("&", "\\u0026")


# --------------------------------------------------------------------------- #
# Рендер и запись
# --------------------------------------------------------------------------- #


def render_pages(context: dict[str, Any]) -> dict[str, str]:
    """Отрисовать страницы. Шаблон FAQ берётся из общего модуля."""

    env = Environment(
        loader=ChoiceLoader([FileSystemLoader(TEMPLATE_DIR), FileSystemLoader(FAQ_TEMPLATE_DIR)]),
        autoescape=True,
        undefined=StrictUndefined,
        trim_blocks=True,
        lstrip_blocks=True,
    )
    return {
        "index.html": env.get_template("base.html.j2").render(**context),
        "privacy.html": env.get_template("privacy.html.j2").render(**context),
    }


def build_styles(theme: str, accent: str | None) -> str:
    """Склеить базовую вёрстку, тему и стили FAQ в один файл."""

    theme_path = THEME_DIR / f"{theme}.css"
    if not theme_path.exists():
        available = ", ".join(sorted(path.stem for path in THEME_DIR.glob("theme-*.css")))
        raise BuildError(f"тема «{theme}» не найдена, доступны: {available}")

    parts = [
        theme_path.read_text(encoding="utf-8"),
        (THEME_DIR / "base.css").read_text(encoding="utf-8"),
        faq_styles(),
    ]
    if accent:
        parts.append(accent_override(accent))
    return "\n".join(parts)


def accent_override(accent: str) -> str:
    """Свой акцент клиента поверх темы, с подобранным цветом текста на нём."""

    text_on_accent = "#ffffff" if luminance(accent) < 0.55 else "#10100f"
    return (
        "\n/* Акцент клиента из client.json: brand.accent_override */\n"
        ":root {\n"
        f"  --accent: {accent};\n"
        f"  --accent-text: {text_on_accent};\n"
        "}\n"
    )


def luminance(color: str) -> float:
    """Относительная яркость цвета — по ней выбирается текст на кнопке."""

    value = color.lstrip("#")
    if len(value) == 3:
        value = "".join(char * 2 for char in value)
    red, green, blue = (int(value[index : index + 2], 16) / 255 for index in (0, 2, 4))

    def channel(part: float) -> float:
        return part / 12.92 if part <= 0.04045 else ((part + 0.055) / 1.055) ** 2.4

    return 0.2126 * channel(red) + 0.7152 * channel(green) + 0.0722 * channel(blue)


def build_script() -> str:
    """Скрипт страницы: аккордеон из общего модуля плюс форма."""

    form_js = (ASSET_DIR / "form.js").read_text(encoding="utf-8")
    return f"{faq_script()}\n{form_js}"


def copy_images(data: dict[str, Any], source_dir: Path, out_dir: Path, warnings: list[str]) -> int:
    """Скопировать картинки клиента в dist/img и вернуть их общий вес."""

    wanted: list[str] = []
    for path in (
        (data["brand"].get("logo"),),
        (data["hero"].get("media"),),
        *[(case.get("image"),) for case in data["cases"]],
        *[(review.get("photo"),) for review in (data.get("reviews") or [])],
    ):
        if path[0]:
            wanted.append(str(path[0]))

    total = 0
    for relative in dict.fromkeys(wanted):
        source = (source_dir / relative).resolve()
        if not source.is_file():
            warnings.append(
                f"картинка {relative} не найдена рядом с данными клиента — "
                "блок соберётся без неё"
            )
            continue
        target = out_dir / relative
        target.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(source, target)
        total += target.stat().st_size
    return total


def missing_images(data: dict[str, Any], source_dir: Path) -> set[str]:
    """Список путей, которых нет на диске: такие картинки не рендерятся."""

    missing: set[str] = set()
    candidates = [data["brand"].get("logo"), data["hero"].get("media")]
    candidates += [case.get("image") for case in data["cases"]]
    candidates += [review.get("photo") for review in (data.get("reviews") or [])]
    for candidate in candidates:
        if candidate and not (source_dir / str(candidate)).is_file():
            missing.add(str(candidate))
    return missing


# --------------------------------------------------------------------------- #
# Проверки готовой страницы
# --------------------------------------------------------------------------- #


class _VisibleText(HTMLParser):
    """Сбор видимого текста страницы: без head, script и style."""

    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self.chunks: list[str] = []
        self._skip = 0

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        if tag in {"script", "style", "head"}:
            self._skip += 1
        # Подписи на картинках тоже видимы пользователю вспомогательных технологий.
        if tag == "img":
            for name, value in attrs:
                if name == "alt" and value:
                    self.chunks.append(value)

    def handle_endtag(self, tag: str) -> None:
        if tag in {"script", "style", "head"} and self._skip:
            self._skip -= 1

    def handle_data(self, data: str) -> None:
        if not self._skip:
            self.chunks.append(data)

    @property
    def text(self) -> str:
        return normalize_space(" ".join(self.chunks))


def normalize_space(text: str) -> str:
    """Схлопнуть пробелы, чтобы сравнивать тексты без ложных расхождений."""

    return re.sub(r"\s+", " ", text.replace(" ", " ").replace(" ", " ")).strip()


def check_markup_matches_page(html: str, jsonld: str) -> list[str]:
    """Сверить тексты разметки с видимым текстом страницы.

    Расхождение — ошибка в Яндекс.Вебмастере, поэтому проверка встроена в
    сборку, а не оставлена на ручную вычитку.
    """

    parser = _VisibleText()
    parser.feed(html)
    visible = parser.text

    problems: list[str] = []
    document = json.loads(jsonld)
    for node in document["@graph"]:
        if node["@type"] == "FAQPage":
            for question in node["mainEntity"]:
                _expect(visible, question["name"], "вопрос FAQ", problems)
                _expect(visible, question["acceptedAnswer"]["text"], "ответ FAQ", problems)
        else:
            for key in ("name", "description", "telephone", "email"):
                if node.get(key):
                    _expect(visible, str(node[key]), f"поле {key} в разметке", problems)
    return problems


def _expect(visible: str, needle: str, what: str, problems: list[str]) -> None:
    if normalize_space(needle) not in visible:
        problems.append(f"{what} не найден в видимом тексте: «{normalize_space(needle)[:60]}…»")


# --------------------------------------------------------------------------- #
# Сборка
# --------------------------------------------------------------------------- #


def build(client_path: Path, out_dir: Path, theme_override: str | None = None) -> Build:
    """Собрать сайт клиента в указанную папку."""

    data = load_client(client_path)
    validate_client(data, SCHEMA_PATH)

    warnings: list[str] = []
    theme = theme_override or data["meta"]["theme"]

    source_dir = client_path.parent
    absent = missing_images(data, source_dir)

    context = build_context(data, theme, warnings)
    # Картинок, которых нет на диске, в вёрстке быть не должно.
    if absent:
        if context["hero"].get("media") in absent:
            context["hero"] = {**context["hero"], "media": None}
        if context["brand"].get("logo") in absent:
            context["brand"] = {**context["brand"], "logo": None}
        for case in context["cases"]:
            if case["image"] in absent:
                case["image"] = ""
        for review in context["reviews"]:
            if review.get("photo") in absent:
                review["photo"] = None

    attach_image_sizes(context, source_dir)
    pages = render_pages(context)
    styles = build_styles(theme, data["brand"].get("accent_override"))
    script = build_script()

    warnings.extend(check_markup_matches_page(pages["index.html"], context["jsonld"]))

    if out_dir.exists():
        shutil.rmtree(out_dir)
    out_dir.mkdir(parents=True)

    for name, html in pages.items():
        (out_dir / name).write_text(html, encoding="utf-8")
    (out_dir / "style.css").write_text(styles, encoding="utf-8")
    (out_dir / "script.js").write_text(script, encoding="utf-8")

    images_bytes = copy_images(data, source_dir, out_dir, warnings)

    page_bytes = sum(
        (out_dir / name).stat().st_size for name in ("index.html", "style.css", "script.js")
    )
    total_bytes = page_bytes + images_bytes + (out_dir / "privacy.html").stat().st_size

    if page_bytes > PAGE_BUDGET_KB * 1024:
        warnings.append(
            f"страница без картинок весит {page_bytes // 1024} КБ, бюджет — {PAGE_BUDGET_KB} КБ"
        )
    if total_bytes > TOTAL_BUDGET_KB * 1024:
        warnings.append(
            f"вся сборка весит {total_bytes // 1024} КБ, бюджет — {TOTAL_BUDGET_KB} КБ: "
            "пережмите картинки"
        )

    return Build(out_dir=out_dir, warnings=warnings, page_bytes=page_bytes, total_bytes=total_bytes)


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(
        prog="generate.py",
        description="Собрать сайт-портфолио из данных клиента",
        epilog="Пример: python generate.py schema/example.json dist/",
    )
    parser.add_argument("client", type=Path, help="файл с данными клиента (client.json)")
    parser.add_argument("out", type=Path, nargs="?", default=Path("dist"), help="папка сборки")
    parser.add_argument(
        "--theme",
        choices=["theme-a", "theme-b", "theme-c", "theme-d"],
        help="собрать другой темой, не трогая client.json",
    )
    parser.add_argument(
        "--all-themes",
        action="store_true",
        help="собрать все четыре темы в подпапки — удобно показывать клиенту",
    )
    parser.add_argument("--quiet", action="store_true", help="печатать только ошибки")
    args = parser.parse_args(argv)

    themes = ["theme-a", "theme-b", "theme-c", "theme-d"] if args.all_themes else [args.theme]

    try:
        for theme in themes:
            target = args.out / theme if args.all_themes else args.out
            result = build(args.client, target, theme)
            if not args.quiet:
                _report(result)
    except ClientDataError as error:
        print("Данные клиента не прошли проверку:\n", file=sys.stderr)
        for problem in error.problems:
            if problem:
                print(f"  • {problem}", file=sys.stderr)
        print("\nПоля описаны в schema/client.schema.json, пример — schema/example.json.", file=sys.stderr)
        return 1
    except BuildError as error:
        print(f"Сборка не удалась: {error}", file=sys.stderr)
        return 1
    return 0


def _report(result: Build) -> None:
    """Отчёт о сборке: куда собрали, сколько весит, о чём предупредить."""

    print(f"Собрано: {result.out_dir}")
    print(
        f"  страница {result.page_bytes // 1024} КБ из {PAGE_BUDGET_KB} КБ, "
        f"всего {result.total_bytes // 1024} КБ из {TOTAL_BUDGET_KB} КБ"
    )
    if result.warnings:
        print(f"  {plural(len(result.warnings), ('Замечание', 'Замечания', 'Замечаний'))}:")
        for warning in result.warnings:
            print(f"    • {warning}")


if __name__ == "__main__":
    raise SystemExit(main())
