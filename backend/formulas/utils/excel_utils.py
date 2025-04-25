import logging

logger = logging.getLogger(__name__)

A4_HEIGHT_POINTS = 841.89  # Высота А4 в точках
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
    Форматирует результат измерения, заменяя минус на слово.
    """
    if not value or value == "не указано":
        return "не указано"

    str_value = str(value)
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
