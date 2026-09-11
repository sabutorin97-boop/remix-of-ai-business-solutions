#!/usr/bin/env python3
"""Сборка публичной витрины для GitHub Pages.

    python demo/build_demo.py site/

Собирает каждое демо во всех четырёх темах и склеивает страницу: сверху
панель с переключателем тем и списком демо, ниже — ровно та страница,
которую выдаёт генератор. Панель существует только здесь: у клиента
страница собирается одной темой и никакого переключателя не имеет.
"""

from __future__ import annotations

import argparse
import html
import shutil
import sys
import tempfile
from pathlib import Path

DEMO_DIR = Path(__file__).resolve().parent
PRODUCT_DIR = DEMO_DIR.parent
sys.path.insert(0, str(PRODUCT_DIR))

from generate import build  # noqa: E402  (путь к продукту настраивается выше)

THEMES = [
    ("theme-a", "Сетка"),
    ("theme-b", "Воздух"),
    ("theme-c", "Ночь"),
    ("theme-d", "Печать"),
]

# Демо по нишам. Первое ложится в корень сайта, остальные — в подпапки.
DEMOS = [
    {"slug": "", "file": "beauty.json", "title": "Салон красоты", "theme": "theme-b"},
    {"slug": "garage", "file": "garage.json", "title": "Автосервис", "theme": "theme-a"},
]

NOTE = (
    "<b>Демонстрационная сборка.</b> Компании, контакты и реквизиты вымышлены. "
    "Каждая страница собрана генератором «Нейро-Портфолио» из одного файла с данными."
)


def panel(current_slug: str, current_theme: str) -> str:
    """Панель витрины: пометка, темы и переход между нишами."""

    buttons = []
    for key, name in THEMES:
        pressed = ' aria-pressed="true"' if key == current_theme else ""
        buttons.append(
            '        <button class="showcase__button" type="button" '
            f'data-theme="{key}"{pressed}>{html.escape(name)}</button>'
        )

    links = []
    for demo in DEMOS:
        if current_slug:
            href = "../" if demo["slug"] == "" else "../" + demo["slug"] + "/"
        else:
            href = "./" if demo["slug"] == "" else demo["slug"] + "/"
        current = ' aria-current="page"' if demo["slug"] == current_slug else ""
        links.append(
            f'        <a class="showcase__link" href="{href}"{current}>'
            f'{html.escape(demo["title"])}</a>'
        )

    newline = "\n"
    return (
        '<div class="showcase">\n'
        f'  <p class="showcase__note">{NOTE}</p>\n'
        '  <div class="showcase__group" role="group" aria-label="Ниша">\n'
        '    <span class="showcase__label">Ниша:</span>\n'
        f'{newline.join(links)}\n'
        "  </div>\n"
        '  <div class="showcase__group" role="group" aria-label="Тема оформления">\n'
        '    <span class="showcase__label">Тема:</span>\n'
        f'{newline.join(buttons)}\n'
        "  </div>\n"
        "</div>"
    )


def assemble(page_html: str, current_slug: str, current_theme: str) -> str:
    """Вставить панель витрины в готовую страницу генератора."""

    page_html = page_html.replace(
        '<link rel="stylesheet" href="style.css">',
        '<link id="page-theme" rel="stylesheet" href="' + current_theme + '.css">\n'
        '  <link rel="stylesheet" href="showcase.css">',
    )
    page_html = page_html.replace(
        '<a class="skip" href="#main">К содержанию</a>',
        '<a class="skip" href="#main">К содержанию</a>\n\n  ' + panel(current_slug, current_theme),
    )
    return page_html.replace(
        "</body>", '  <script src="showcase.js" defer></script>\n</body>'
    )


def build_site(out_dir: Path) -> None:
    """Собрать сайт витрины целиком."""

    if out_dir.exists():
        shutil.rmtree(out_dir)
    out_dir.mkdir(parents=True)

    for demo in DEMOS:
        target = out_dir / demo["slug"] if demo["slug"] else out_dir
        target.mkdir(parents=True, exist_ok=True)

        with tempfile.TemporaryDirectory() as tmp:
            work = Path(tmp)
            client = work / "client.json"
            client.write_text((DEMO_DIR / demo["file"]).read_text(encoding="utf-8"), encoding="utf-8")
            # Картинки берём из примера: отдельной копии в demo/ не держим.
            shutil.copytree(PRODUCT_DIR / "schema" / "img", work / "img")

            for theme, _ in THEMES:
                result = build(client, work / "out" / theme, theme)
                for warning in result.warnings:
                    print(f"  {demo['file']} [{theme}]: {warning}")
                shutil.copy2(work / "out" / theme / "style.css", target / f"{theme}.css")

            source = work / "out" / demo["theme"]
            for name in ("script.js", "privacy.html"):
                shutil.copy2(source / name, target / name)
            shutil.copy2(source / "style.css", target / "style.css")
            if (source / "img").is_dir():
                shutil.copytree(source / "img", target / "img", dirs_exist_ok=True)

            page = (source / "index.html").read_text(encoding="utf-8")
            (target / "index.html").write_text(
                assemble(page, demo["slug"], demo["theme"]), encoding="utf-8"
            )

        for asset in ("showcase.css", "showcase.js"):
            shutil.copy2(DEMO_DIR / asset, target / asset)

        print(f"Собрано демо «{demo['title']}»: {target}")

    # Pages не должен пропускать файлы через Jekyll — у нас чистая статика.
    (out_dir / ".nojekyll").write_text("", encoding="utf-8")

    total = sum(item.stat().st_size for item in out_dir.rglob("*") if item.is_file())
    print(f"Сайт витрины готов: {out_dir}, {total // 1024} КБ")


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(
        prog="build_demo.py", description="Собрать витрину демо для GitHub Pages"
    )
    parser.add_argument("out", type=Path, nargs="?", default=Path("site"), help="папка сайта")
    args = parser.parse_args(argv)
    build_site(args.out)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
