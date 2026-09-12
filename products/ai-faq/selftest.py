#!/usr/bin/env python3
"""Прогон критериев приёмки AI-FAQ: python selftest.py

Проверяет сборку примера, поведение на битых и неполных данных, совпадение
текста разметки с видимым текстом, оформление и вес страницы.
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


def main() -> int:
    with tempfile.TemporaryDirectory() as tmp:
        work = Path(tmp)

        print("\nСборка примера")
        result = run(str(EXAMPLE), str(work / "example"))
        check("generate.py отрабатывает без ошибок", result.returncode == 0, result.stderr)
        out = work / "example"
        check(
            "собраны три файла",
            all((out / name).exists() for name in ("index.html", "style.css", "script.js")),
        )
        html = (out / "index.html").read_text(encoding="utf-8")

        print("\nМикроразметка")
        block = re.search(r'<script type="application/ld\+json">(.*?)</script>', html, re.S)
        check("JSON-LD на месте", block is not None)
        markup = json.loads(block.group(1)) if block else {}
        types = [node["@type"] for node in markup.get("@graph", [])]
        check("есть Organization и FAQPage", types == ["Organization", "FAQPage"], str(types))
        check("угловые скобки экранированы", block is not None and "<" not in block.group(1))

        sys.path.insert(0, str(PRODUCT_DIR))
        from generate import check_markup_matches_page  # noqa: E402

        problems = check_markup_matches_page(html, block.group(1))
        check("текст разметки совпадает с видимым", not problems, "; ".join(problems[:2]))

        print("\nОформление")
        check("атрибуты оформления на html", 'data-scheme="light"' in html and 'data-font="serif"' in html)
        styles = (out / "style.css").read_text(encoding="utf-8")
        check("акцент клиента подставлен", "--accent: #7A2E4E" in styles)
        check("стили аккордеона включены", ".faq__question" in styles)
        # Внешним запросом считается только загрузка ресурса: canonical и og:url
        # обязаны быть абсолютными адресами и запроса не создают.
        resources = re.findall(r'<script[^>]+src="([^"]+)"', html)
        resources += re.findall(r'<link[^>]+rel="stylesheet"[^>]+href="([^"]+)"', html)
        resources += re.findall(r'<img[^>]+src="([^"]+)"', html)
        resources += re.findall(r"url\(\s*['\"]?([^)'\"]+)", styles)
        resources += re.findall(r"@import\s+['\"]([^'\"]+)", styles)
        outside = [link for link in resources if link.startswith(("http://", "https://", "//"))]
        check("страница не грузит ничего снаружи", not outside, str(outside[:3]))

        dark = json.loads(EXAMPLE.read_text(encoding="utf-8"))
        dark["design"] = {"scheme": "dark", "font": "sans", "radius": "sharp"}
        path = work / "dark.json"
        path.write_text(json.dumps(dark, ensure_ascii=False), encoding="utf-8")
        result = run(str(path), str(work / "dark"))
        check("тёмная схема собирается", result.returncode == 0, result.stderr)
        dark_html = (work / "dark" / "index.html").read_text(encoding="utf-8")
        check("тёмная схема отмечена атрибутом", 'data-scheme="dark"' in dark_html)

        print("\nНеполные данные")
        light = json.loads(EXAMPLE.read_text(encoding="utf-8"))
        for key in ("cta", "contacts", "design", "legal"):
            light.pop(key, None)
        light["cta"] = {"url": "mailto:demo@example.com"}
        light["intro"].pop("text", None)
        light["intro"].pop("updated", None)
        light["brand"].pop("site_url", None)
        light["brand"].pop("tagline", None)
        path = work / "light.json"
        path.write_text(json.dumps(light, ensure_ascii=False), encoding="utf-8")
        result = run(str(path), str(work / "light"))
        check("собирается без необязательных разделов", result.returncode == 0, result.stderr)
        bare = (work / "light" / "index.html").read_text(encoding="utf-8")
        check("блок контактов не рендерится пустым", 'class="contacts"' not in bare)
        check("дата обновления не рендерится пустой", "Обновлено:" not in bare)

        print("\nОшибки во входных данных")
        broken = work / "broken.json"
        broken.write_text('{"meta": {"title": "Вопросы",}}', encoding="utf-8")
        result = run(str(broken), str(work / "broken"))
        check("битый JSON: код возврата 1", result.returncode == 1)
        check("битый JSON: без трейсбека", "Traceback" not in result.stderr, result.stderr[:200])
        check("битый JSON: указана строка", "строка" in result.stderr)

        invalid = json.loads(EXAMPLE.read_text(encoding="utf-8"))
        invalid["faq"][1]["a"] = ""
        invalid["design"] = {"scheme": "neon"}
        invalid["contacts"] = {}
        invalid["cta"] = {}
        path = work / "invalid.json"
        path.write_text(json.dumps(invalid, ensure_ascii=False), encoding="utf-8")
        result = run(str(path), str(work / "invalid"))
        check("пустой ответ: назван вопрос", "вопрос №2" in result.stderr, result.stderr[:300])
        check("неизвестная схема: перечислены допустимые", "light" in result.stderr)
        check("без контактов и кнопки — ошибка", "некуда обратиться" in result.stderr)
        check("ошибки без трейсбека", "Traceback" not in result.stderr)

        print("\nПравила текста")
        long_answer = json.loads(EXAMPLE.read_text(encoding="utf-8"))
        long_answer["faq"][0]["a"] = "слово " * 200
        long_answer["faq"] = long_answer["faq"][:2]
        path = work / "long.json"
        path.write_text(json.dumps(long_answer, ensure_ascii=False), encoding="utf-8")
        result = run(str(path), str(work / "long"))
        check("длинный ответ вызывает замечание", "больше 120" in result.stdout, result.stdout[:200])
        check("короткий список вызывает замечание", "нужно от 3" in result.stdout)

        print("\nВес")
        page = sum(
            (out / name).stat().st_size for name in ("index.html", "style.css", "script.js")
        )
        check(f"страница {page // 1024} КБ меньше 80 КБ", page < 80 * 1024)

    print(f"\nИтого: {passed} пройдено, {failed} не пройдено\n")
    return 1 if failed else 0


if __name__ == "__main__":
    raise SystemExit(main())
