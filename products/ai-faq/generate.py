#!/usr/bin/env python3
"""AI-FAQ: сборка страницы вопросов и ответов из одного файла с данными.

    python generate.py schema/example.json dist/

На выходе три файла: index.html, style.css, script.js. Страница ставится на
сайт клиента как есть, внешних запросов не делает и ничего не считает —
аналитики и cookie на ней нет, поэтому и баннер согласия не нужен.

Аккордеон и микроразметку страница берёт из общего модуля `faq_module`,
второй копии этой вёрстки в репозитории нет.
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
from typing import Any

from jinja2 import ChoiceLoader, Environment, FileSystemLoader, StrictUndefined

from faq_module import (
    TEMPLATE_DIR as FAQ_TEMPLATE_DIR,
    faq_jsonld,
    faq_script,
    faq_styles,
    faq_warnings,
    normalize_faq,
    plural,
)
from faq_module.schema_check import DataError, Naming, check, load_json

PRODUCT_DIR = Path(__file__).resolve().parent
TEMPLATE_DIR = PRODUCT_DIR / "templates"
THEME_DIR = PRODUCT_DIR / "themes"
SCHEMA_PATH = PRODUCT_DIR / "schema" / "faq.schema.json"

PAGE_BUDGET_KB = 80  # вес страницы: она встраивается в чужой сайт, лишнего не тащим

NAMING = Naming(
    sections={
        "meta": "meta (мета-данные страницы)",
        "brand": "brand (бренд)",
        "intro": "intro (шапка страницы)",
        "faq": "faq (вопросы и ответы)",
        "cta": "cta (блок «не нашли ответ»)",
        "contacts": "contacts (контакты)",
        "design": "design (оформление)",
        "legal": "legal (реквизиты)",
    },
    item_labels={"faq": "вопрос"},
)


@dataclass
class Build:
    """Результат сборки: куда собрали и о чём предупредить."""

    out_dir: Path
    warnings: list[str]
    page_bytes: int


def prepare_contacts(raw: dict[str, Any]) -> dict[str, Any]:
    """Развернуть контакты в ссылки с подписями."""

    channels: list[dict[str, str]] = []

    telegram = str(raw.get("telegram") or "").strip()
    if telegram:
        handle = telegram.lstrip("@").replace("https://t.me/", "").replace("t.me/", "").strip("/")
        channels.append({"label": "Telegram", "text": f"@{handle}", "url": f"https://t.me/{handle}"})

    phone = str(raw.get("phone") or "").strip()
    if phone:
        channels.append(
            {"label": "Телефон", "text": phone, "url": "tel:" + re.sub(r"[^\d+]", "", phone)}
        )

    whatsapp = str(raw.get("whatsapp") or "").strip()
    if whatsapp:
        channels.append(
            {
                "label": "WhatsApp",
                "text": whatsapp,
                "url": "https://wa.me/" + re.sub(r"\D", "", whatsapp),
            }
        )

    email = str(raw.get("email") or "").strip()
    if email:
        channels.append({"label": "Почта", "text": email, "url": f"mailto:{email}"})

    return {
        "channels": channels,
        "primary": channels[0] if channels else None,
        "hours": str(raw.get("hours") or "").strip(),
    }


def build_jsonld(context: dict[str, Any], items: list[Any]) -> str:
    """Собрать JSON-LD: организация и FAQPage. Экранирование — через json.dumps."""

    brand = context["brand"]
    contacts = context["contacts"]

    organization: dict[str, Any] = {
        "@type": "Organization",
        "name": brand["name"],
        "url": brand["site_url"] or context["meta"]["url"] or None,
    }
    if brand["tagline"]:
        organization["description"] = brand["tagline"]
    phone = next((c["text"] for c in contacts["channels"] if c["label"] == "Телефон"), None)
    if phone:
        organization["telephone"] = phone
    email = next((c["text"] for c in contacts["channels"] if c["label"] == "Почта"), None)
    if email:
        organization["email"] = email
    organization = {key: value for key, value in organization.items() if value}

    graph: list[dict[str, Any]] = [organization]
    faq_block = faq_jsonld(items)
    if faq_block:
        graph.append(faq_block)

    text = json.dumps({"@context": "https://schema.org", "@graph": graph}, ensure_ascii=False, indent=2)
    # Экранируем угловые скобки: иначе текст с «<» закроет тег script.
    return text.replace("<", "\\u003c").replace(">", "\\u003e").replace("&", "\\u0026")


def build_context(data: dict[str, Any], warnings: list[str]) -> dict[str, Any]:
    """Собрать всё, что нужно шаблону, из проверенных данных."""

    meta = {
        "title": data["meta"]["title"],
        "description": data["meta"]["description"],
        "url": str(data["meta"].get("url") or "").strip(),
        "lang": data["meta"].get("lang") or "ru",
    }
    brand = {
        "name": data["brand"]["name"],
        "tagline": str(data["brand"].get("tagline") or "").strip(),
        "site_url": str(data["brand"].get("site_url") or "").strip(),
        "logo": str(data["brand"].get("logo") or "") or None,
    }
    intro = {
        "headline": data["intro"]["headline"],
        "text": str(data["intro"].get("text") or "").strip(),
        "updated": str(data["intro"].get("updated") or "").strip(),
    }
    design = data.get("design") or {}
    contacts = prepare_contacts(data.get("contacts") or {})
    items = normalize_faq(data["faq"])
    warnings.extend(faq_warnings(items))

    cta = data.get("cta") or {}
    context: dict[str, Any] = {
        "lang": meta["lang"],
        "meta": meta,
        "brand": brand,
        "intro": intro,
        "legal": {
            "entity": str((data.get("legal") or {}).get("entity") or ""),
            "inn": str((data.get("legal") or {}).get("inn") or ""),
        },
        "contacts": contacts,
        "design": {
            "scheme": design.get("scheme") or "light",
            "accent": design.get("accent"),
            "font": design.get("font") or "sans",
            "radius": design.get("radius") or "soft",
        },
        "cta": {
            "title": cta.get("title") or "Не нашли свой вопрос?",
            "text": cta.get("text")
            or "Напишите — ответим и добавим вопрос на эту страницу, если он окажется частым.",
            "button": cta.get("button") or "Задать вопрос",
            "url": str(cta.get("url") or (contacts["primary"] or {}).get("url") or "").strip(),
        },
        # Переменные общего FAQ-модуля: названия полей в нём фиксированы.
        "faq_items": items,
        "faq_title": "Вопросы и ответы",
        "faq_help_text": None,
        "faq_help_url": None,
        "faq_help_link_text": None,
        "year": date.today().year,
    }
    context["jsonld"] = build_jsonld(context, items)
    return context


def render_page(context: dict[str, Any]) -> str:
    """Отрисовать страницу. Шаблон аккордеона берётся из общего модуля."""

    env = Environment(
        loader=ChoiceLoader([FileSystemLoader(TEMPLATE_DIR), FileSystemLoader(FAQ_TEMPLATE_DIR)]),
        autoescape=True,
        undefined=StrictUndefined,
        trim_blocks=True,
        lstrip_blocks=True,
    )
    return env.get_template("page.html.j2").render(**context)


def build_styles(design: dict[str, Any]) -> str:
    """Базовые стили, стили аккордеона и акцент клиента одним файлом."""

    parts = [(THEME_DIR / "base.css").read_text(encoding="utf-8"), faq_styles()]
    accent = design.get("accent")
    if accent:
        parts.append(
            "\n/* Акцент клиента из данных: design.accent */\n"
            ":root {\n"
            f"  --accent: {accent};\n"
            f"  --accent-strong: {accent};\n"
            f"  --accent-text: {'#ffffff' if _luminance(accent) < 0.55 else '#10100f'};\n"
            f"  --focus: {accent};\n"
            "}\n"
        )
    return "\n".join(parts)


def _luminance(color: str) -> float:
    """Относительная яркость цвета — по ней выбирается текст на кнопке."""

    value = color.lstrip("#")
    if len(value) == 3:
        value = "".join(char * 2 for char in value)
    red, green, blue = (int(value[i : i + 2], 16) / 255 for i in (0, 2, 4))

    def channel(part: float) -> float:
        return part / 12.92 if part <= 0.04045 else ((part + 0.055) / 1.055) ** 2.4

    return 0.2126 * channel(red) + 0.7152 * channel(green) + 0.0722 * channel(blue)


class _VisibleText(HTMLParser):
    """Сбор видимого текста страницы: без head, script и style."""

    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self.chunks: list[str] = []
        self._skip = 0

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        if tag in {"script", "style", "head"}:
            self._skip += 1

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

    return re.sub(r"\s+", " ", text.replace(" ", " ")).strip()


def check_markup_matches_page(html: str, jsonld: str) -> list[str]:
    """Сверить текст разметки с видимым текстом: расхождение — ошибка в Вебмастере."""

    parser = _VisibleText()
    parser.feed(html)
    visible = parser.text

    problems: list[str] = []
    for node in json.loads(jsonld)["@graph"]:
        if node["@type"] == "FAQPage":
            for question in node["mainEntity"]:
                for what, value in (
                    ("вопрос", question["name"]),
                    ("ответ", question["acceptedAnswer"]["text"]),
                ):
                    if normalize_space(value) not in visible:
                        problems.append(
                            f"{what} из разметки не найден в видимом тексте: "
                            f"«{normalize_space(value)[:60]}…»"
                        )
        else:
            for key in ("name", "description", "telephone", "email"):
                value = node.get(key)
                if value and normalize_space(str(value)) not in visible:
                    problems.append(f"поле {key} из разметки не найдено в видимом тексте")
    return problems


def validate(data: dict[str, Any]) -> None:
    """Проверить данные по схеме и по правилам продукта."""

    schema = json.loads(SCHEMA_PATH.read_text(encoding="utf-8"))
    problems = check(data, schema, NAMING)

    contacts = data.get("contacts") or {}
    has_contact = any(
        str(contacts.get(key) or "").strip() for key in ("telegram", "phone", "whatsapp", "email")
    )
    has_cta_url = str((data.get("cta") or {}).get("url") or "").strip()
    if not has_contact and not has_cta_url:
        problems.append(
            "contacts (контакты): не заполнен ни один контакт и не задан cta.url — "
            "человеку с вопросом некуда обратиться"
        )

    if problems:
        raise DataError(problems)


def build(data_path: Path, out_dir: Path) -> Build:
    """Собрать страницу в указанную папку."""

    data = load_json(data_path)
    validate(data)

    warnings: list[str] = []
    context = build_context(data, warnings)
    html = render_page(context)
    # Оформление ставится атрибутами на <html>: вёрстка одна, наборы цветов разные.
    design = context["design"]
    html = html.replace(
        f'<html lang="{context["lang"]}">',
        f'<html lang="{context["lang"]}" data-scheme="{design["scheme"]}"'
        f' data-font="{design["font"]}" data-radius="{design["radius"]}">',
        1,
    )
    warnings.extend(check_markup_matches_page(html, context["jsonld"]))

    if out_dir.exists():
        shutil.rmtree(out_dir)
    out_dir.mkdir(parents=True)

    (out_dir / "index.html").write_text(html, encoding="utf-8")
    (out_dir / "style.css").write_text(build_styles(design), encoding="utf-8")
    (out_dir / "script.js").write_text(faq_script(), encoding="utf-8")
    if context["brand"]["logo"]:
        logo = data_path.parent / context["brand"]["logo"]
        if logo.is_file():
            target = out_dir / context["brand"]["logo"]
            target.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(logo, target)
        else:
            warnings.append(f"логотип {context['brand']['logo']} не найден — страница соберётся без него")

    page_bytes = sum(
        (out_dir / name).stat().st_size for name in ("index.html", "style.css", "script.js")
    )
    if page_bytes > PAGE_BUDGET_KB * 1024:
        warnings.append(
            f"страница весит {page_bytes // 1024} КБ, бюджет — {PAGE_BUDGET_KB} КБ"
        )

    return Build(out_dir=out_dir, warnings=warnings, page_bytes=page_bytes)


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(
        prog="generate.py",
        description="Собрать FAQ-страницу из файла с вопросами",
        epilog="Пример: python generate.py schema/example.json dist/",
    )
    parser.add_argument("data", type=Path, help="файл с данными (faq.json)")
    parser.add_argument("out", type=Path, nargs="?", default=Path("dist"), help="папка сборки")
    parser.add_argument("--quiet", action="store_true", help="печатать только ошибки")
    args = parser.parse_args(argv)

    try:
        result = build(args.data, args.out)
    except DataError as error:
        print("Данные страницы не прошли проверку:\n", file=sys.stderr)
        for problem in error.problems:
            if problem:
                print(f"  • {problem}", file=sys.stderr)
        print(
            "\nПоля описаны в schema/faq.schema.json, пример — schema/example.json.",
            file=sys.stderr,
        )
        return 1

    if not args.quiet:
        print(f"Собрано: {result.out_dir}")
        print(f"  страница {result.page_bytes // 1024} КБ из {PAGE_BUDGET_KB} КБ")
        if result.warnings:
            print(f"  {plural(len(result.warnings), ('Замечание', 'Замечания', 'Замечаний'))}:")
            for warning in result.warnings:
                print(f"    • {warning}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
