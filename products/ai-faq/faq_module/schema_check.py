"""Проверка входного JSON по схеме — общая для продуктов студии.

С файлами данных работает менеджер, а не программист, поэтому ошибка должна
называть раздел, номер элемента и суть проблемы, а не показывать трейсбек.

Поддерживается то подмножество JSON Schema, которым описаны схемы продуктов:
type, required, properties, additionalProperties, items, minItems, maxItems,
minLength, maxLength, enum, pattern. Сторонних библиотек модуль не тянет:
на выходе продуктов — статика, и лишние зависимости здесь не нужны.

Названия разделов и подписи элементов продукт передаёт сам через `Naming`:
у портфолио это «кейс №2», у FAQ — «вопрос №2».
"""

from __future__ import annotations

import difflib
import json
import re
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

from .faq import plural

TYPE_NAMES = {
    "object": "объект",
    "array": "список",
    "string": "строка",
    "number": "число",
    "integer": "целое число",
    "boolean": "да/нет",
    "null": "пусто",
}


class DataError(Exception):
    """Ошибка входных данных: показывается человеку без трейсбека."""

    def __init__(self, problems: list[str]) -> None:
        self.problems = problems
        super().__init__("\n".join(problems))


@dataclass(frozen=True)
class Naming:
    """Как называть разделы и элементы списков в сообщениях об ошибках."""

    sections: dict[str, str] = field(default_factory=dict)
    item_labels: dict[str, str] = field(default_factory=dict)

    def section(self, name: str) -> str:
        return self.sections.get(name, name)

    def item_label(self, list_name: str) -> str:
        return self.item_labels.get(list_name, "элемент")


@dataclass
class _Context:
    """Накопитель ошибок с путём до поля."""

    naming: Naming
    problems: list[str] = field(default_factory=list)

    def add(self, path: list[Any], message: str) -> None:
        self.problems.append(f"{human_path(path, self.naming)}: {message}")


def load_json(path: Path) -> dict[str, Any]:
    """Прочитать файл данных и объяснить синтаксическую ошибку по-человечески."""

    try:
        raw = path.read_text(encoding="utf-8")
    except FileNotFoundError:
        raise DataError([f"файл {path} не найден"]) from None
    except UnicodeDecodeError:
        raise DataError(
            [f"файл {path} не читается как UTF-8 — пересохраните его в кодировке UTF-8"]
        ) from None

    try:
        data = json.loads(raw)
    except json.JSONDecodeError as error:
        lines = raw.splitlines()
        line = lines[error.lineno - 1] if error.lineno <= len(lines) else ""
        raise DataError(
            [
                f"{path}: строка {error.lineno}, символ {error.colno} — {_json_hint(error.msg)}",
                f"  {line.strip()}" if line.strip() else "",
            ]
        ) from None

    if not isinstance(data, dict):
        raise DataError([f"{path}: ожидался объект с полями, а получен {type_name(data)}"])
    return data


def check(data: dict[str, Any], schema: dict[str, Any], naming: Naming) -> list[str]:
    """Проверить данные по схеме и вернуть список проблем на русском."""

    context = _Context(naming=naming)
    _check(data, schema, [], context)
    return context.problems


def _check(value: Any, schema: dict[str, Any], path: list[Any], context: _Context) -> None:
    """Рекурсивная проверка значения по узлу схемы."""

    expected = schema.get("type")
    if expected is not None and not _type_matches(value, expected):
        context.add(path, f"ожидалась {_expected_type(expected)}, а получено: {type_name(value)}")
        return

    if value is None:
        return

    if isinstance(value, str):
        _check_string(value, schema, path, context)
    elif isinstance(value, list):
        _check_array(value, schema, path, context)
    elif isinstance(value, dict):
        _check_object(value, schema, path, context)

    if "enum" in schema and value not in schema["enum"]:
        allowed = ", ".join(str(item) for item in schema["enum"])
        context.add(path, f"значение «{value}» недопустимо, выберите одно из: {allowed}")


def _check_string(value: str, schema: dict[str, Any], path: list[Any], context: _Context) -> None:
    minimum = schema.get("minLength")
    maximum = schema.get("maxLength")
    length = len(value.strip())
    if not value.strip() and minimum:
        context.add(path, "поле пустое, а оно обязательное")
        return

    symbols = ("символ", "символа", "символов")
    if minimum is not None and length < minimum:
        context.add(path, f"слишком коротко: {length} {plural(length, symbols)}, нужно хотя бы {minimum}")
    if maximum is not None and length > maximum:
        context.add(path, f"слишком длинно: {length} {plural(length, symbols)}, максимум {maximum}")

    pattern = schema.get("pattern")
    if pattern and not re.match(pattern, value):
        context.add(path, f"значение «{value}» не подходит по формату ({pattern})")


def _check_array(
    value: list[Any], schema: dict[str, Any], path: list[Any], context: _Context
) -> None:
    minimum = schema.get("minItems")
    maximum = schema.get("maxItems")
    if minimum is not None and len(value) < minimum:
        context.add(path, f"нужно хотя бы {minimum} шт., а сейчас {len(value)}")
    if maximum is not None and len(value) > maximum:
        context.add(path, f"больше {maximum} шт. не поместится, а сейчас {len(value)}")

    item_schema = schema.get("items")
    if isinstance(item_schema, dict):
        for index, item in enumerate(value):
            _check(item, item_schema, path + [index], context)


def _check_object(
    value: dict[str, Any], schema: dict[str, Any], path: list[Any], context: _Context
) -> None:
    properties = schema.get("properties", {})
    for name in schema.get("required", []):
        if name not in value or value[name] in (None, "", [], {}):
            title = properties.get(name, {}).get("title", "")
            # Не повторять пояснение, если оно уже стоит в названии раздела.
            hint = (
                f" — {title}"
                if title and title not in human_path(path + [name], context.naming)
                else ""
            )
            context.add(path + [name], f"обязательное поле не заполнено{hint}")

    if schema.get("additionalProperties") is False:
        for name in value:
            if name not in properties:
                close = _closest(name, list(properties))
                hint = f", похоже на «{close}»" if close else ""
                context.add(
                    path + [name], f"неизвестное поле{hint}; поля сверх схемы не рендерятся"
                )

    for name, item in value.items():
        if name in properties:
            _check(item, properties[name], path + [name], context)


def human_path(path: list[Any], naming: Naming) -> str:
    """Собрать путь вида «cases (кейсы) → кейс №2 → pain»."""

    if not path:
        return "корень файла"

    parts: list[str] = [naming.section(str(path[0]))]
    for index, item in enumerate(path[1:], start=1):
        if isinstance(item, int):
            parts.append(f"{naming.item_label(str(path[index - 1]))} №{item + 1}")
        else:
            parts.append(str(item))
    return " → ".join(parts)


def _type_matches(value: Any, expected: Any) -> bool:
    if isinstance(expected, list):
        return any(_type_matches(value, item) for item in expected)
    if expected == "object":
        return isinstance(value, dict)
    if expected == "array":
        return isinstance(value, list)
    if expected == "string":
        return isinstance(value, str)
    if expected == "boolean":
        return isinstance(value, bool)
    if expected == "integer":
        return isinstance(value, int) and not isinstance(value, bool)
    if expected == "number":
        return isinstance(value, (int, float)) and not isinstance(value, bool)
    if expected == "null":
        return value is None
    return True


def _expected_type(expected: Any) -> str:
    if isinstance(expected, list):
        return " или ".join(TYPE_NAMES.get(item, item) for item in expected)
    return TYPE_NAMES.get(expected, expected)


def type_name(value: Any) -> str:
    """Как назвать то, что пришло вместо ожидаемого значения."""

    if value is None:
        return "пусто (null)"
    if isinstance(value, bool):
        return "да/нет"
    if isinstance(value, dict):
        return "объект"
    if isinstance(value, list):
        return "список"
    if isinstance(value, str):
        return f"строка «{value[:30]}»" if value else "пустая строка"
    return f"число {value}"


def _json_hint(message: str) -> str:
    """Перевести типовые жалобы json на русский."""

    hints = {
        "Expecting ',' delimiter": "пропущена запятая между полями",
        "Expecting ':' delimiter": "пропущено двоеточие после названия поля",
        "Expecting property name enclosed in double quotes": (
            "ожидалось название поля в двойных кавычках — возможно, лишняя запятая перед скобкой"
        ),
        "Expecting value": "пропущено значение поля",
        "Invalid control character at": "внутри строки перенос строки — замените его на \\n",
        "Unterminated string starting at": "строка не закрыта кавычкой",
    }
    for needle, hint in hints.items():
        if message.startswith(needle):
            return hint
    return message


def _closest(name: str, options: list[str]) -> str | None:
    """Подсказать похожее название поля при опечатке."""

    matches = difflib.get_close_matches(name, options, n=1, cutoff=0.6)
    return matches[0] if matches else None
