import logging

logger = logging.getLogger(__name__)

A4_HEIGHT_POINTS = (
    811.89  # Высота А4 в точках (на 2 строки меньше из-за нижнего колонтитула)
)
DEFAULT_ROW_HEIGHT = 15  # Стандартная высота строки в Excel


def save_row_dimensions(worksheet):
    """
    Сохраняет размеры всех строк в рабочем листе.
    """
    return {row: {"height": rd.height} for row, rd in worksheet.row_dimensions.items()}


def restore_row_dimensions(
    worksheet, original_dimensions, shift_after_row, shift_amount
):
    """
    Восстанавливает размеры строк с учетом сдвига.
    """
    new_dimensions = {}

    # Копируем размеры до строки вставки без изменений
    for row, dims in original_dimensions.items():
        if row <= shift_after_row:
            new_dimensions[row] = dims
        else:
            # Сдвигаем размеры после строки вставки
            new_dimensions[row + shift_amount] = dims

    # Копируем размеры для вставленных строк
    for i in range(shift_amount):
        new_row = shift_after_row + 1 + i
        if shift_after_row in original_dimensions:
            new_dimensions[new_row] = original_dimensions[shift_after_row]

    # Применяем новые размеры
    for row, dims in new_dimensions.items():
        worksheet.row_dimensions[row].height = dims["height"]


def format_result(value):
    """
    Форматирует результат измерения:
    - заменяет минус на слово
    - приводит специальные значения к нижнему регистру
    """
    if not value or value == "не указано":
        return "не указано"

    str_value = str(value)

    special_values = ["Отсутствие", "Неудовлетворительно", "Следы"]

    # Проверяем, является ли значение без учета регистра
    for special_value in special_values:
        if str_value.lower() == special_value.lower():
            return str_value.lower()

    if str_value.startswith("-"):
        return f"минус {str_value[1:]}"

    return str_value


def get_content_height(worksheet, start_row, end_row):
    """
    Вычисляет общую высоту контента в точках.
    """
    total_height = 0
    for row in range(start_row, end_row + 1):
        row_height = (
            worksheet.row_dimensions[row].height
            if row in worksheet.row_dimensions
            else DEFAULT_ROW_HEIGHT
        )
        total_height += row_height
    return total_height


def find_table_headers(worksheet, source_row):
    """
    Ищет шапку таблицы для указанной строки.
    Возвращает номер строки начала шапки или None, если шапка не найдена.
    """
    # Максимальное количество строк для поиска шапки вверх
    MAX_LOOKUP_ROWS = 5

    for i in range(source_row - 1, max(1, source_row - MAX_LOOKUP_ROWS - 1), -1):
        for col in range(1, worksheet.max_column + 1):
            cell = worksheet.cell(row=i, column=col)
            if cell.value and isinstance(cell.value, str):
                if any(
                    header in cell.value
                    for header in ["Таблица 1", "Таблица 2", "Таблица 3"]
                ):
                    return i
    return None


def get_table_header_rows(worksheet, header_row, source_row):
    """
    Получает все строки шапки таблицы от заголовка до текущей строки с данными.
    Включает строку заголовка и 2 строки после неё.
    """
    header_rows = []
    header_rows.append(header_row)

    for i in range(header_row + 1, min(header_row + 3, source_row)):
        for col in range(1, worksheet.max_column + 1):
            cell = worksheet.cell(row=i, column=col)
            if cell.value and isinstance(cell.value, str):
                # Если в строке есть текст и это не данные таблицы
                if not any(str(num) in str(cell.value) for num in range(10)):
                    if i not in header_rows:
                        header_rows.append(i)
                    break

    return sorted(header_rows)


def format_decimal_ru(value):
    """
    Форматирует число для отображения с запятой вместо точки.
    Используется для форматирования числовых значений в соответствии с российским стандартом.
    """
    if value is None:
        return "не указано"

    try:
        num = float(value)
        return str(num).replace(".", ",")
    except (ValueError, TypeError):
        return str(value)


def get_object_suffix(test_objects):
    """
    Определяет суффикс для номера протокола на основе объектов испытаний.
    Если есть несколько объектов, проверяет каждый.
    """
    if not test_objects:
        return ""

    # Разделяем строку с объектами по запятой и приводим к нижнему регистру
    objects = [obj.strip().lower() for obj in test_objects.split(",")]

    # Проверяем каждый объект
    for test_object in objects:
        if "конденсат" in test_object:
            return "дк"
        elif "нефть" in test_object:
            return "н"
    return ""


def format_protocol_number(protocol, excel_template):
    """
    Форматирует номер протокола в зависимости от условий.
    """
    if not protocol.test_protocol_number:
        return ""

    # Если протокол не аккредитован, возвращаем просто номер протокола
    if not protocol.is_accredited:
        return protocol.test_protocol_number

    # Получаем все объекты испытаний из проб протокола
    test_objects = ", ".join(
        [sample.test_object for sample in protocol.samples.filter(is_deleted=False)]
    )

    suffix = get_object_suffix(test_objects)
    base_number = (
        f"{protocol.test_protocol_number}/07/{suffix}"
        if suffix
        else f"{protocol.test_protocol_number}/07"
    )

    # Если есть дата протокола, добавляем её
    if protocol.test_protocol_date:
        return f"{base_number} от {protocol.test_protocol_date.strftime('%d.%m.%Y')}"

    return base_number
