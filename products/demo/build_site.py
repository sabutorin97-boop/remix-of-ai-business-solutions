#!/usr/bin/env python3
"""Сборка публичной витрины продуктов для GitHub Pages.

    python products/demo/build_site.py site/

Собирает демо обоих продуктов: сайты-портфолио в трёх нишах (каждый во всех
четырёх темах) и страницу вопросов и ответов. Сверху каждой страницы панель
с переходом между демо и переключателем тем.

Панель существует только в витрине: у клиента страница собирается одной темой
и никакого переключателя не имеет.
"""

from __future__ import annotations

import argparse
import html
import importlib.util
import shutil
import sys
import tempfile
from pathlib import Path
from types import ModuleType

DEMO_DIR = Path(__file__).resolve().parent
PRODUCTS_DIR = DEMO_DIR.parent
PORTFOLIO_DIR = PRODUCTS_DIR / "neuro-portfolio"
AI_FAQ_DIR = PRODUCTS_DIR / "ai-faq"

# Оба продукта держат точку входа в файле generate.py, поэтому обычный импорт
# по имени подтянул бы один и тот же модуль дважды. Грузим их по путям, под
# разными именами.
sys.path.insert(0, str(PORTFOLIO_DIR))
sys.path.insert(0, str(AI_FAQ_DIR))


def _load(name: str, path: Path) -> ModuleType:
    spec = importlib.util.spec_from_file_location(name, path)
    if spec is None or spec.loader is None:
        raise SystemExit(f"Не удалось загрузить {path}")
    module = importlib.util.module_from_spec(spec)
    sys.modules[name] = module
    spec.loader.exec_module(module)
    return module


portfolio_product = _load("neuro_portfolio_generate", PORTFOLIO_DIR / "generate.py")
faq_product = _load("ai_faq_generate", AI_FAQ_DIR / "generate.py")

THEMES = [
    ("theme-a", "Сетка"),
    ("theme-b", "Воздух"),
    ("theme-c", "Ночь"),
    ("theme-d", "Печать"),
]

# Демо по нишам. Первое ложится в корень сайта, остальные — в подпапки.
PAGES = [
    {"slug": "", "file": "beauty.json", "title": "Салон красоты", "kind": "portfolio", "theme": "theme-b"},
    {"slug": "garage", "file": "garage.json", "title": "Автосервис", "kind": "portfolio", "theme": "theme-a"},
    {"slug": "legal", "file": "legal.json", "title": "Юристы", "kind": "portfolio", "theme": "theme-d"},
    {"slug": "faq", "file": "faq.json", "title": "FAQ-страница", "kind": "faq", "theme": None},
]

NOTE = (
    "<b>Демонстрационная сборка.</b> Компании, контакты и реквизиты вымышлены. "
    "Каждая страница собрана генератором студии из одного файла с данными."
)


def panel(current_slug: str, current_theme: str | None) -> str:
    """Панель витрины: пометка, переход между демо и темы для портфолио."""

    links = []
    for page in PAGES:
        if current_slug:
            href = "../" if page["slug"] == "" else "../" + page["slug"] + "/"
        else:
            href = "./" if page["slug"] == "" else page["slug"] + "/"
        current = ' aria-current="page"' if page["slug"] == current_slug else ""
        links.append(
            f'        <a class="showcase__link" href="{href}"{current}>'
            f'{html.escape(page["title"])}</a>'
        )

    newline = "\n"
    blocks = [
        '<div class="showcase">',
        f'  <p class="showcase__note">{NOTE}</p>',
        '  <div class="showcase__group" role="group" aria-label="Демо">',
        '    <span class="showcase__label">Демо:</span>',
        newline.join(links),
        "  </div>",
    ]

    if current_theme:
        buttons = []
        for key, name in THEMES:
            pressed = ' aria-pressed="true"' if key == current_theme else ""
            buttons.append(
                '        <button class="showcase__button" type="button" '
                f'data-theme="{key}"{pressed}>{html.escape(name)}</button>'
            )
        blocks += [
            '  <div class="showcase__group" role="group" aria-label="Тема оформления">',
            '    <span class="showcase__label">Тема:</span>',
            newline.join(buttons),
            "  </div>",
        ]

    blocks.append("</div>")
    return newline.join(blocks)


def assemble(page_html: str, slug: str, theme: str | None) -> str:
    """Вставить панель витрины в готовую страницу генератора."""

    if theme:
        page_html = page_html.replace(
            '<link rel="stylesheet" href="style.css">',
            f'<link id="page-theme" rel="stylesheet" href="{theme}.css">\n'
            '  <link rel="stylesheet" href="showcase.css">',
        )
    else:
        page_html = page_html.replace(
            '<link rel="stylesheet" href="style.css">',
            '<link rel="stylesheet" href="style.css">\n  <link rel="stylesheet" href="showcase.css">',
        )

    page_html = page_html.replace(
        '<a class="skip" href="#main">К содержанию</a>',
        '<a class="skip" href="#main">К содержанию</a>\n\n  ' + panel(slug, theme),
    )
    return page_html.replace("</body>", '  <script src="showcase.js" defer></script>\n</body>')


def build_portfolio(page: dict, target: Path) -> list[str]:
    """Собрать демо портфолио во всех темах, страницу — на теме по умолчанию."""

    warnings: list[str] = []
    with tempfile.TemporaryDirectory() as tmp:
        work = Path(tmp)
        client = work / "client.json"
        client.write_text((DEMO_DIR / page["file"]).read_text(encoding="utf-8"), encoding="utf-8")
        # Картинки берём из примера продукта: второй копии в demo/ не держим.
        shutil.copytree(PORTFOLIO_DIR / "schema" / "img", work / "img")

        for theme, _ in THEMES:
            result = portfolio_product.build(client, work / "out" / theme, theme)
            warnings.extend(f"{page['file']} [{theme}]: {item}" for item in result.warnings)
            shutil.copy2(work / "out" / theme / "style.css", target / f"{theme}.css")

        source = work / "out" / page["theme"]
        for name in ("script.js", "privacy.html", "style.css"):
            shutil.copy2(source / name, target / name)
        if (source / "img").is_dir():
            shutil.copytree(source / "img", target / "img", dirs_exist_ok=True)

        page_html = (source / "index.html").read_text(encoding="utf-8")
        (target / "index.html").write_text(
            assemble(page_html, page["slug"], page["theme"]), encoding="utf-8"
        )
    return warnings


def build_faq(page: dict, target: Path) -> list[str]:
    """Собрать демо FAQ-страницы."""

    with tempfile.TemporaryDirectory() as tmp:
        work = Path(tmp)
        data = work / "faq.json"
        data.write_text((DEMO_DIR / page["file"]).read_text(encoding="utf-8"), encoding="utf-8")
        result = faq_product.build(data, work / "out")

        for name in ("style.css", "script.js"):
            shutil.copy2(result.out_dir / name, target / name)
        page_html = (result.out_dir / "index.html").read_text(encoding="utf-8")
        (target / "index.html").write_text(assemble(page_html, page["slug"], None), encoding="utf-8")

    return [f"{page['file']}: {item}" for item in result.warnings]


def build_site(out_dir: Path) -> None:
    """Собрать сайт витрины целиком."""

    if out_dir.exists():
        shutil.rmtree(out_dir)
    out_dir.mkdir(parents=True)

    for page in PAGES:
        target = out_dir / page["slug"] if page["slug"] else out_dir
        target.mkdir(parents=True, exist_ok=True)

        if page["kind"] == "portfolio":
            warnings = build_portfolio(page, target)
        else:
            warnings = build_faq(page, target)

        for warning in warnings:
            print(f"  {warning}")

        for asset in ("showcase.css", "showcase.js"):
            shutil.copy2(DEMO_DIR / asset, target / asset)

        print(f"Собрано демо «{page['title']}»: {target}")

    # Pages не должен пропускать файлы через Jekyll — у нас чистая статика.
    (out_dir / ".nojekyll").write_text("", encoding="utf-8")

    total = sum(item.stat().st_size for item in out_dir.rglob("*") if item.is_file())
    print(f"Сайт витрины готов: {out_dir}, {total // 1024} КБ")


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(
        prog="build_site.py", description="Собрать витрину демо для GitHub Pages"
    )
    parser.add_argument("out", type=Path, nargs="?", default=Path("site"), help="папка сайта")
    args = parser.parse_args(argv)
    build_site(args.out)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
