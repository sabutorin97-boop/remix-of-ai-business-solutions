#!/usr/bin/env python3
"""Прогон критериев приёмки: python selftest.py

Проверяет то, что иначе проверялось бы руками: сборку примера, все четыре
темы, поведение на неполных и битых данных, кириллицу в разметке и вес.
Вёрстку на экране и оценку Lighthouse этот скрипт не заменяет.
"""

from __future__ import annotations

import json
import re
import subprocess
import sys
import tempfile
from pathlib import Path

PRODUCT_DIR = Path(__file__).resolve().parent
EXAMPLE = PRODUCT_DIR / "schema" / "example.json"
THEMES = ["theme-a", "theme-b", "theme-c", "theme-d"]

passed = 0
failed = 0


def check(title: str, condition: bool, detail: str = "") -> None:
    global passed, failed
    if condition:
        passed += 1
        print(f"  ✓ {title}")
    else:
        failed += 1
        print(f"  ✗ {title}" + (f"\n      {detail}" if detail else ""))


def run(*args: str) -> subprocess.CompletedProcess[str]:
    return subprocess.run(
        [sys.executable, str(PRODUCT_DIR / "generate.py"), *args],
        capture_output=True,
        text=True,
        cwd=PRODUCT_DIR,
    )


def contrast(first: str, second: str) -> float:
    """Контраст двух цветов по WCAG: 4.5 нужен обычному тексту."""

    from generate import luminance

    high, low = sorted((luminance(first), luminance(second)), reverse=True)
    return (high + 0.05) / (low + 0.05)


def visible_text(html: str) -> str:
    from generate import _VisibleText, normalize_space

    parser = _VisibleText()
    parser.feed(html)
    return normalize_space(parser.text)


def main() -> int:
    with tempfile.TemporaryDirectory() as tmp:
        work = Path(tmp)

        print("\nСборка примера")
        result = run(str(EXAMPLE), str(work / "example"))
        check("generate.py отрабатывает без ошибок", result.returncode == 0, result.stderr)
        index = work / "example" / "index.html"
        check("собраны все файлы", all((work / "example" / name).exists()
              for name in ("index.html", "privacy.html", "style.css", "script.js")))
        html = index.read_text(encoding="utf-8")

        print("\nМикроразметка")
        block = re.search(r'<script type="application/ld\+json">(.*?)</script>', html, re.S)
        check("JSON-LD на месте", block is not None)
        markup = json.loads(block.group(1)) if block else {}
        types = [node["@type"] for node in markup.get("@graph", [])]
        check("есть ProfessionalService и FAQPage", types == ["ProfessionalService", "FAQPage"], str(types))
        check("у каждого вопроса есть ответ",
              all(node.get("acceptedAnswer", {}).get("text")
                  for node in markup["@graph"][1]["mainEntity"]) if len(types) > 1 else False)
        visible = visible_text(html)
        texts = [markup["@graph"][0]["name"], markup["@graph"][0]["description"]]
        texts += [question["name"] for question in markup["@graph"][1]["mainEntity"]]
        missing = [text for text in texts if text not in visible]
        check("текст разметки совпадает с видимым", not missing, "; ".join(missing[:2]))

        print("\nКириллица")
        check("кавычки-ёлочки в HTML", "«Эстетика»" in html)
        check("кавычки-ёлочки в разметке", "«Эстетика»" in markup["@graph"][0]["name"])
        check("угловые скобки в JSON-LD экранированы", "<" not in block.group(1))
        check("страница в UTF-8 читается обратно", index.read_text(encoding="utf-8") == html)
        check("знак № и тире не ломаются", "—" in html and "…" not in markup["@graph"][0]["name"])

        print("\nТемы")
        styles = {}
        for theme in THEMES:
            result = run(str(EXAMPLE), str(work / theme), "--theme", theme)
            check(f"{theme} собирается", result.returncode == 0, result.stderr)
            styles[theme] = (work / theme / "style.css").read_text(encoding="utf-8")
        unique = {style[:2000] for style in styles.values()}
        check("темы отличаются друг от друга", len(unique) == len(THEMES))
        check("в теме нет внешних подключений",
              all("@import" not in style and "http" not in style for style in styles.values()))

        print("\nНеполные данные")
        minimal = json.loads(EXAMPLE.read_text(encoding="utf-8"))
        for key in ("approach", "reviews", "faq"):
            minimal.pop(key, None)
        minimal["cases"] = [{k: v for k, v in minimal["cases"][0].items()
                             if k in {"pain", "solution", "result"}}]
        minimal["hero"]["media"] = None
        minimal["brand"]["logo"] = None
        path = work / "minimal.json"
        path.write_text(json.dumps(minimal, ensure_ascii=False), encoding="utf-8")
        result = run(str(path), str(work / "minimal"))
        check("собирается без approach, reviews и faq", result.returncode == 0, result.stderr)
        light = (work / "minimal" / "index.html").read_text(encoding="utf-8")
        check("пустые блоки не рендерятся",
              'id="faq"' not in light and 'id="reviews"' not in light and 'id="approach"' not in light)
        check("итог по цифрам не показывается на одном кейсе", "Итог по всем проектам" not in light)
        check("в разметке остался только ProfessionalService",
              '"FAQPage"' not in light)

        print("\nОшибки во входных данных")
        broken = work / "broken.json"
        broken.write_text('{"meta": {"title": "Сайт",}}', encoding="utf-8")
        result = run(str(broken), str(work / "broken"))
        check("битый JSON: код возврата 1", result.returncode == 1)
        check("битый JSON: без трейсбека", "Traceback" not in result.stderr, result.stderr[:200])
        check("битый JSON: указана строка", "строка" in result.stderr, result.stderr[:200])

        invalid = json.loads(EXAMPLE.read_text(encoding="utf-8"))
        invalid["cases"][1]["result"] = ""
        invalid["meta"]["theme"] = "theme-z"
        invalid["contacts"] = {"telegram": "", "phone": "", "whatsapp": "", "email": ""}
        path = work / "invalid.json"
        path.write_text(json.dumps(invalid, ensure_ascii=False), encoding="utf-8")
        result = run(str(path), str(work / "invalid"))
        check("пустое поле: назван кейс", "кейс №2" in result.stderr, result.stderr[:300])
        check("пустое поле: названо поле", "result" in result.stderr)
        check("неизвестная тема: перечислены допустимые", "theme-a" in result.stderr)
        check("контакты: сказано, чего не хватает", "контакт" in result.stderr)
        check("ошибки без трейсбека", "Traceback" not in result.stderr)

        unknown = json.loads(EXAMPLE.read_text(encoding="utf-8"))
        unknown["cases"][0]["titel"] = "опечатка"
        path = work / "unknown.json"
        path.write_text(json.dumps(unknown, ensure_ascii=False), encoding="utf-8")
        result = run(str(path), str(work / "unknown"))
        check("лишнее поле замечено", "неизвестное поле" in result.stderr, result.stderr[:200])

        print("\nДоступность")
        images = re.findall(r"<img[^>]*>", html, re.S)
        without_size = [tag for tag in images if 'width="' not in tag or 'height="' not in tag]
        check("у всех картинок заданы размеры", not without_size, str(without_size[:1]))
        check("у всех картинок есть alt", all('alt="' in tag for tag in images))
        check("есть ссылка «к содержанию»", 'class="skip"' in html)
        check("у секций есть заголовки", html.count("aria-labelledby") >= 3)

        pairs = [("text", "bg"), ("text-muted", "bg"), ("accent", "bg"),
                 ("text", "bg-alt"), ("text-muted", "bg-alt"), ("accent-text", "accent")]
        for theme in THEMES:
            css = (PRODUCT_DIR / "themes" / f"{theme}.css").read_text(encoding="utf-8")
            colors = dict(re.findall(r"^\s*--([a-z-]+):\s*(#[0-9a-fA-F]{3,6});", css, re.M))
            weak = [f"{a}/{b}={contrast(colors[a], colors[b]):.1f}"
                    for a, b in pairs if contrast(colors[a], colors[b]) < 4.5]
            check(f"{theme}: контраст текста не ниже 4.5", not weak, ", ".join(weak))

        print("\nВес и внешние запросы")
        page = sum((work / "example" / name).stat().st_size
                   for name in ("index.html", "style.css", "script.js"))
        check(f"страница {page // 1024} КБ меньше 150 КБ", page < 150 * 1024)
        total = sum(item.stat().st_size for item in (work / "example").rglob("*") if item.is_file())
        check(f"сборка {total // 1024} КБ меньше 1 МБ", total < 1024 * 1024)
        # Внешним запросом считается только загрузка ресурса: canonical и og:image
        # адресами наружу быть обязаны, запроса они не создают.
        resources = re.findall(r'<script[^>]+src="([^"]+)"', html)
        resources += re.findall(r'<link[^>]+rel="stylesheet"[^>]+href="([^"]+)"', html)
        resources += re.findall(r'<img[^>]+src="([^"]+)"', html)
        style = styles["theme-b"]
        resources += re.findall(r'url\(\s*[\'"]?([^\)\'"]+)', style)
        resources += re.findall(r'@import\s+[\'"]([^\'"]+)', style)
        outside = [link for link in resources if link.startswith(("http://", "https://", "//"))]
        check("страница не грузит ничего снаружи", not outside, str(outside[:3]))
        check("шрифты и иконки локальные", "fonts.googleapis" not in html and "cdn" not in html.lower())

    print(f"\nИтого: {passed} пройдено, {failed} не пройдено\n")
    return 1 if failed else 0


if __name__ == "__main__":
    raise SystemExit(main())
