import json
import logging
from copy import copy
from io import BytesIO
from django.http import HttpResponse
from django.shortcuts import get_object_or_404
from openpyxl import load_workbook, Workbook
from openpyxl.styles import Font, Alignment
from openpyxl.cell.cell import MergedCell
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from ..models import ExcelTemplate, Protocol, Calculation
from ..utils.excel_utils import (
    A4_HEIGHT_POINTS,
    DEFAULT_ROW_HEIGHT,
    save_row_dimensions,
    restore_row_dimensions,
    format_result,
    get_content_height,
    find_table_headers,
    get_table_header_rows,
    format_decimal_ru,
)

logger = logging.getLogger(__name__)


@api_view(["GET"])
@permission_classes([AllowAny])
def generate_protocol_excel(request):
    """
    Создает файл протокола
    """
    try:
        protocol_id = request.query_params.get("protocol_id")
        registration_number = request.query_params.get("registration_number")

        if not protocol_id and not registration_number:
            return Response(
                {"error": "Необходимо указать ID протокола или регистрационный номер"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if registration_number:
            protocol = Protocol.objects.filter(
                registration_number=registration_number, is_deleted=False
            ).first()
            if not protocol:
                return Response(
                    {
                        "error": f"Протокол с регистрационным номером {registration_number} не найден"
                    },
                    status=status.HTTP_404_NOT_FOUND,
                )
        else:
            protocol = Protocol.objects.get(id=protocol_id)

        calculations = Calculation.objects.filter(protocol=protocol).order_by(
            "laboratory_activity_date"
        )

        if not calculations.exists():
            return Response(
                {"error": "Для протокола не найдены расчеты"},
                status=status.HTTP_404_NOT_FOUND,
            )

        min_date = calculations.first().laboratory_activity_date
        max_date = calculations.last().laboratory_activity_date

        laboratory_activity_dates = (
            f"{min_date.strftime('%d.%m.%Y')}-{max_date.strftime('%d.%m.%Y')}"
        )
        if min_date == max_date:
            laboratory_activity_dates = min_date.strftime("%d.%m.%Y")

        if not protocol.excel_template:
            return JsonResponse(
                {"error": "Для протокола не выбран шаблон Excel"}, status=400
            )

        # Загружаем шаблон
        template_bytes = protocol.excel_template.file
        workbook = load_workbook(BytesIO(template_bytes))
        worksheet = workbook.active

        # Получаем всех исполнителей из расчетов
        executors = list(set([calc.executor for calc in calculations if calc.executor]))
        executors_str = ", ".join(executors)

        # Подготавливаем данные для замены в шаблоне
        replacements = {
            "{test_protocol_number}": protocol.test_protocol_number or "",
            "{test_object}": protocol.test_object or "",
            "{laboratory_location}": protocol.laboratory_location or "",
            "{branch}": protocol.branch or "",
            "{sampling_location_detail}": protocol.sampling_location_detail or "",
            "{phone}": protocol.phone or "",
            "{sampling_act_number}": protocol.sampling_act_number or "",
            "{registration_number}": protocol.registration_number or "",
            "{sampling_date}": (
                protocol.sampling_date.strftime("%d.%m.%Y")
                if protocol.sampling_date
                else ""
            ),
            "{receiving_date}": (
                protocol.receiving_date.strftime("%d.%m.%Y")
                if protocol.receiving_date
                else ""
            ),
            "{executor}": executors_str,
            "{lab_location}": protocol.laboratory_location or "",
            "{subd}": protocol.branch,
            "{sampling_location}": protocol.sampling_location_detail,
            "{tel}": protocol.phone,
            "{res_object}": protocol.test_object,
            "{laboratory_activity_dates}": laboratory_activity_dates,
        }

        # Обработка условий отбора
        selection_conditions = protocol.selection_conditions or []
        has_filled_conditions = False
        rows_to_delete = set()

        # Находим все строки с метками условий отбора
        for row_idx, row in enumerate(worksheet.iter_rows(), 1):
            has_condition_tags = False
            all_tags_empty = True
            bu_cell = None

            for cell in row:
                if not cell.value or not isinstance(cell.value, str):
                    continue

                # Проверяем наличие меток условий отбора в строке
                for i in range(1, 100):  # Предполагаем максимум 99 условий
                    name_tag = f"{{sel_cond_name_{i}}}"
                    val_tag = f"{{sel_cond_val_{i}}}"
                    unit_tag = f"{{sel_cond_unit_{i}}}"

                    if (
                        name_tag in cell.value
                        or val_tag in cell.value
                        or unit_tag in cell.value
                    ):
                        has_condition_tags = True
                        if i <= len(selection_conditions):
                            condition = selection_conditions[i - 1]
                            if condition.get("value") is not None:
                                all_tags_empty = False
                                cell_value = cell.value
                                if name_tag in cell_value:
                                    cell.value = cell_value.replace(
                                        name_tag, condition.get("name", "") + ":"
                                    )
                                elif val_tag in cell_value:
                                    # Форматируем значение с заменой точки на запятую
                                    formatted_value = format_decimal_ru(
                                        condition.get("value", "")
                                    )
                                    cell.value = cell_value.replace(
                                        val_tag, formatted_value
                                    )
                                elif unit_tag in cell_value:
                                    cell.value = cell_value.replace(
                                        unit_tag, condition.get("unit", "")
                                    )
                                has_filled_conditions = True

                if "{bu}" in cell.value:
                    bu_cell = cell

            # Если в строке есть метки условий и все они пустые, добавляем строку к удалению
            if has_condition_tags and all_tags_empty:
                rows_to_delete.add(row_idx)

        # Обрабатываем метку {bu}
        if has_filled_conditions:
            # Если есть заполненные условия, очищаем метку {bu}
            for row in worksheet.iter_rows():
                for cell in row:
                    if (
                        cell.value
                        and isinstance(cell.value, str)
                        and "{bu}" in cell.value
                    ):
                        cell.value = cell.value.replace("{bu}", "")
        else:
            # Если нет заполненных условий, заменяем {bu} на "б/у"
            for row in worksheet.iter_rows():
                for cell in row:
                    if (
                        cell.value
                        and isinstance(cell.value, str)
                        and "{bu}" in cell.value
                    ):
                        cell.value = cell.value.replace("{bu}", "б/у")

        # Заменяем метки в файле
        for row in worksheet.iter_rows():
            for cell in row:
                if cell.value and isinstance(cell.value, str):
                    for tag, value in replacements.items():
                        if tag in cell.value:
                            cell.value = cell.value.replace(tag, str(value))

        # Обработка таблицы 1 (результаты расчетов)
        start_row = None
        end_row = None
        template_row = None

        # Находим границы таблицы 1
        for row_idx, row in enumerate(worksheet.iter_rows(), 1):
            for cell in row:
                if cell.value == "{start_table1}":
                    start_row = row_idx
                elif cell.value == "{end_table1}":
                    end_row = row_idx
                    break
            if start_row and end_row:
                break

        if start_row and end_row:
            template_row = start_row + 1
            rows_needed = calculations.count()

            logger.info(
                f"Найдены границы таблицы 1: start_row={start_row}, end_row={end_row}"
            )
            logger.info(f"Шаблонная строка: {template_row}")
            logger.info(f"Необходимо вставить строк: {rows_needed}")

            logger.info("Данные для вставки в таблицу 1:")
            for idx, calc in enumerate(calculations, 1):
                logger.info(
                    f"Строка {idx}:\n"
                    f"  - ID метода: {idx}\n"
                    f"  - Название метода: {calc.research_method.name}\n"
                    f"  - Единица измерения: {calc.unit or 'не указано'}\n"
                    f"  - Результат: {calc.result or 'не указано'}\n"
                    f"  - Погрешность: {calc.measurement_error or 'не указано'}\n"
                    f"  - Метод измерения: {calc.research_method.measurement_method or 'не указано'}\n"
                    f"  - Имеет группы: {calc.research_method.groups.exists()}\n"
                    f"  - Группы: {[g.name for g in calc.research_method.groups.all()]}"
                )

            # Сохраняем размеры строк перед любыми изменениями
            original_dimensions = save_row_dimensions(worksheet)

            # Обработка групп методов
            grouped_calculations = {}
            standalone_calculations = []

            logger.info("Анализ методов исследования и их групп:")
            for idx, calc in enumerate(calculations, 1):
                method = calc.research_method
                logger.info(f"Метод #{idx}: {method.name}")
                logger.info(f"  - ID метода: {method.id}")

                # Проверка атрибута groups
                if hasattr(method, "groups"):
                    logger.info(f"  - Метод имеет атрибут groups")
                    groups_count = method.groups.count()
                    logger.info(f"  - Количество групп у метода: {groups_count}")

                    if groups_count > 0:
                        groups = method.groups.all()
                        for group in groups:
                            logger.info(f"  - Группа: id={group.id}, name={group.name}")
                else:
                    logger.info(f"  - Метод НЕ имеет атрибута groups")

            for calc in calculations:
                group = None
                group_id = None
                group_name = None

                if hasattr(calc.research_method, "groups"):
                    if calc.research_method.groups.exists():
                        group = calc.research_method.groups.first()
                        group_id = group.id
                        group_name = group.name
                        logger.info(
                            f"Метод {calc.research_method.name} принадлежит группе {group_name}"
                        )

                if group_id is not None:
                    if group_id not in grouped_calculations:
                        grouped_calculations[group_id] = {
                            "name": group_name,
                            "calculations": [],
                            "methods": [],
                        }
                        logger.info(f"Создана новая группа для расчетов: {group_name}")

                    grouped_calculations[group_id]["calculations"].append(calc)
                    grouped_calculations[group_id]["methods"].append(
                        calc.research_method
                    )
                    logger.info(
                        f"Метод {calc.research_method.name} добавлен в группу {group_name}"
                    )
                else:
                    standalone_calculations.append(calc)
                    logger.info(
                        f"Метод {calc.research_method.name} добавлен как отдельный (не в группе)"
                    )

            logger.info(
                f"Итоговые сгруппированные методы: {[(k, v['name'], [m.name for m in v['methods']]) for k, v in grouped_calculations.items()]}"
            )
            logger.info(
                f"Итоговые одиночные методы: {[c.research_method.name for c in standalone_calculations]}"
            )

            # Вычисляем последнюю строку таблицы и правильное количество строк для вставки
            total_rows = 0
            for group_data in grouped_calculations.values():
                # +1 для строки с названием группы
                total_rows += len(group_data["calculations"]) + 1
            total_rows += len(standalone_calculations)

            # Определяем количество строк для вставки с учетом дополнительных строк для названий групп
            rows_to_insert = 0

            if total_rows > 1:
                # Вычитаем 1, так как одна строка уже есть в шаблоне
                rows_to_insert = total_rows - 1
                logger.info(
                    f"Для размещения всех методов и групп необходимо {total_rows} строк"
                )
                logger.info(f"Будет вставлено {rows_to_insert} дополнительных строк")

            # Сохраняем существующие объединенные ячейки во временный список
            merged_ranges = []
            for merge_range in worksheet.merged_cells.ranges:
                merged_ranges.append(
                    {
                        "min_row": merge_range.min_row,
                        "max_row": merge_range.max_row,
                        "min_col": merge_range.min_col,
                        "max_col": merge_range.max_col,
                    }
                )

            if rows_to_insert > 0:
                # Вставляем новые строки
                worksheet.insert_rows(template_row + 1, rows_to_insert)
                logger.info(
                    f"Вставлено {rows_to_insert} новых строк после строки {template_row}"
                )

                # Копируем стили для новых строк
                for i in range(rows_to_insert):
                    new_row = template_row + 1 + i
                    logger.info(f"Копирование стилей для новой строки {new_row}")

                    for col in range(1, worksheet.max_column + 1):
                        source_cell = worksheet.cell(row=template_row, column=col)
                        target_cell = worksheet.cell(row=new_row, column=col)

                        # Копируем стили только если в исходной ячейке есть значение или это ячейка с границами таблицы
                        if source_cell.has_style and (
                            source_cell.value is not None
                            or col in [1, worksheet.max_column]
                        ):
                            target_cell._style = copy(source_cell._style)

                        target_cell.value = source_cell.value

            # Восстанавливаем и обновляем объединенные ячейки
            worksheet.merged_cells.ranges.clear()
            for merge_range in merged_ranges:
                if merge_range["max_row"] < template_row:
                    worksheet.merge_cells(
                        start_row=merge_range["min_row"],
                        start_column=merge_range["min_col"],
                        end_row=merge_range["max_row"],
                        end_column=merge_range["max_col"],
                    )
                elif merge_range["min_row"] > template_row:
                    worksheet.merge_cells(
                        start_row=merge_range["min_row"] + rows_to_insert,
                        start_column=merge_range["min_col"],
                        end_row=merge_range["max_row"] + rows_to_insert,
                        end_column=merge_range["max_col"],
                    )
                elif merge_range["min_row"] == template_row:
                    for i in range(rows_needed):
                        worksheet.merge_cells(
                            start_row=template_row + i,
                            start_column=merge_range["min_col"],
                            end_row=template_row + i,
                            end_column=merge_range["max_col"],
                        )

            # Заполняем данные таблицы 1
            current_row = template_row

            # Вычисляем последнюю строку таблицы
            total_rows = 0
            for group_data in grouped_calculations.values():
                # +1 для строки с названием группы
                total_rows += len(group_data["calculations"]) + 1
            total_rows += len(standalone_calculations)
            last_row = template_row + total_rows - 1

            # Проверяем, есть ли только один группированный метод и нет одиночных
            only_one_group = (
                len(grouped_calculations) == 1 and len(standalone_calculations) == 0
            )

            if only_one_group:
                logger.info(
                    "Обнаружен только один группированный метод без одиночных методов, применяется специальная обработка"
                )

                # Получаем единственную группу
                group_id = next(iter(grouped_calculations.keys()))
                group_data = grouped_calculations[group_id]

                logger.info(
                    f"Группа: {group_data['name']}, методов в группе: {len(group_data['calculations'])}"
                )

                # Получаем общий метод измерения и единицу измерения для группы
                measurement_methods = set(
                    method.measurement_method for method in group_data["methods"]
                )
                units = set(calc.unit for calc in group_data["calculations"])

                common_measurement_method = (
                    next(iter(measurement_methods))
                    if len(measurement_methods) == 1
                    else None
                )
                common_unit = next(iter(units)) if len(units) == 1 else None

                logger.info(
                    f"Общий метод измерения для группы: {common_measurement_method}"
                )
                logger.info(f"Общая единица измерения для группы: {common_unit}")

                # Находим объединенные ячейки в шаблонной строке
                template_merged_cells = []
                for merge_range in worksheet.merged_cells.ranges:
                    if (
                        merge_range.min_row == template_row
                        and merge_range.max_row == template_row
                    ):
                        template_merged_cells.append(
                            {
                                "min_col": merge_range.min_col,
                                "max_col": merge_range.max_col,
                            }
                        )
                        logger.info(
                            f"Найдены объединенные ячейки в шаблоне: колонки {merge_range.min_col}-{merge_range.max_col}"
                        )

                # В первой строке выводим название группы и общие данные
                for col in range(1, worksheet.max_column + 1):
                    cell = worksheet.cell(row=current_row, column=col)
                    # Убираем нижнюю границу у ячеек в строке с названием группы
                    if cell.border:
                        new_border = copy(cell.border)
                        new_border.bottom = None
                        cell.border = new_border

                    if cell.value and isinstance(cell.value, str):
                        if "{id_method}" in cell.value:
                            cell.value = cell.value.replace("{id_method}", "1")
                        elif "{name_method}" in cell.value:
                            cell.value = f"{group_data['name']}:"
                        elif "{unit}" in cell.value:
                            # Выводим единицу измерения на уровне группы
                            cell.value = cell.value.replace(
                                "{unit}", common_unit or "не указано"
                            )
                        elif "{measurement_method}" in cell.value:
                            # Выводим метод измерения на уровне группы
                            cell.value = cell.value.replace(
                                "{measurement_method}",
                                common_measurement_method or "не указано",
                            )
                        else:
                            # Для остальных полей в первой строке ставим пустые значения
                            for placeholder in [
                                "{result}",
                                "{measurement_error}",
                                "{nd_code1}",
                                "{nd_name1}",
                            ]:
                                if placeholder in cell.value:
                                    cell.value = cell.value.replace(placeholder, "")

                # Применяем объединение ячеек для строки с названием группы
                for merged_cell in template_merged_cells:
                    worksheet.merge_cells(
                        start_row=current_row,
                        start_column=merged_cell["min_col"],
                        end_row=current_row,
                        end_column=merged_cell["max_col"],
                    )
                    logger.info(
                        f"Объединены ячейки в строке с названием группы: {current_row}, колонки {merged_cell['min_col']}-{merged_cell['max_col']}"
                    )

                current_row += 1

                # Выводим методы группы
                for i, calc in enumerate(group_data["calculations"]):
                    # Применяем объединение ячеек для строки метода в группе
                    for merged_cell in template_merged_cells:
                        worksheet.merge_cells(
                            start_row=current_row,
                            start_column=merged_cell["min_col"],
                            end_row=current_row,
                            end_column=merged_cell["max_col"],
                        )
                        logger.info(
                            f"Объединены ячейки в строке метода: {current_row}, колонки {merged_cell['min_col']}-{merged_cell['max_col']}"
                        )

                    for col in range(1, worksheet.max_column + 1):
                        cell = worksheet.cell(row=current_row, column=col)

                        # Особая обработка для последнего метода в группе
                        last_method_in_group = i == len(group_data["calculations"]) - 1

                        if cell.border:
                            new_border = copy(cell.border)

                            # Удаляем верхнюю и нижнюю границы для всех ячеек в строке
                            for col in range(1, worksheet.max_column + 1):
                                cell = worksheet.cell(row=current_row, column=col)
                                if cell.border:
                                    new_border = copy(cell.border)
                                    # Всегда удаляем верхнюю границу для методов в группе
                                    new_border.top = None

                                    # Для последнего метода в группе сохраняем нижнюю границу
                                    if last_method_in_group:
                                        template_cell = worksheet.cell(
                                            row=template_row, column=col
                                        )
                                        if (
                                            template_cell.border
                                            and template_cell.border.bottom
                                        ):
                                            new_border.bottom = copy(
                                                template_cell.border.bottom
                                            )
                                    else:
                                        # Для остальных методов в группе убираем нижнюю границу
                                        new_border.bottom = None

                                    cell.border = new_border

                        if cell.value and isinstance(cell.value, str):
                            if "{id_method}" in cell.value:
                                cell.value = ""  # Пустой ID для методов в группе
                            elif "{name_method}" in cell.value:
                                # Делаем первую букву метода строчной
                                method_name = calc.research_method.name
                                if method_name:
                                    method_name = (
                                        method_name[0].lower() + method_name[1:]
                                    )
                                    cell.value = method_name
                                logger.info(
                                    f"Установлено название метода в группе: {method_name}"
                                )
                            elif "{result}" in cell.value:
                                cell.value = cell.value.replace(
                                    "{result}", format_result(calc.result)
                                )
                                logger.info(f"Установлен результат: {calc.result}")
                            elif "{measurement_error}" in cell.value:
                                error_value = calc.measurement_error
                                formatted_error = (
                                    error_value
                                    if error_value and error_value.startswith("-")
                                    else (
                                        f"±{error_value}"
                                        if error_value and error_value != "не указано"
                                        else "не указано"
                                    )
                                )
                                cell.value = cell.value.replace(
                                    "{measurement_error}",
                                    formatted_error,
                                )
                            elif "{unit}" in cell.value:
                                cell.value = cell.value.replace(
                                    "{unit}", ""
                                )  # Пустая единица измерения для методов в группе
                            elif "{measurement_method}" in cell.value:
                                cell.value = cell.value.replace(
                                    "{measurement_method}", ""
                                )  # Пустой метод измерения для методов в группе
                            elif "{nd_code1}" in cell.value:
                                cell.value = cell.value.replace(
                                    "{nd_code1}",
                                    calc.research_method.nd_code or "не указано",
                                )
                            elif "{nd_name1}" in cell.value:
                                cell.value = cell.value.replace(
                                    "{nd_name1}",
                                    calc.research_method.nd_name or "не указано",
                                )

                    current_row += 1

            else:
                # Стандартная обработка для нескольких групп или одиночных методов
                # Сначала обрабатываем сгруппированные методы
                idx = 1
                logger.info(
                    f"Начинаем вывод сгруппированных методов. Всего групп: {len(grouped_calculations)}"
                )

                # Находим объединенные ячейки в шаблонной строке
                template_merged_cells = []
                for merge_range in worksheet.merged_cells.ranges:
                    if (
                        merge_range.min_row == template_row
                        and merge_range.max_row == template_row
                    ):
                        template_merged_cells.append(
                            {
                                "min_col": merge_range.min_col,
                                "max_col": merge_range.max_col,
                            }
                        )
                        logger.info(
                            f"Найдены объединенные ячейки в шаблоне: колонки {merge_range.min_col}-{merge_range.max_col}"
                        )

                for group_id, group_data in grouped_calculations.items():
                    logger.info(
                        f"Обработка группы: {group_data['name']}, методов в группе: {len(group_data['calculations'])}"
                    )

                    # Получаем общий метод измерения и единицу измерения для группы
                    measurement_methods = set(
                        method.measurement_method for method in group_data["methods"]
                    )
                    units = set(calc.unit for calc in group_data["calculations"])

                    common_measurement_method = (
                        next(iter(measurement_methods))
                        if len(measurement_methods) == 1
                        else None
                    )
                    common_unit = next(iter(units)) if len(units) == 1 else None

                    logger.info(
                        f"Общий метод измерения для группы: {common_measurement_method}"
                    )
                    logger.info(f"Общая единица измерения для группы: {common_unit}")

                    # В первой строке выводим только название группы
                    for col in range(1, worksheet.max_column + 1):
                        cell = worksheet.cell(row=current_row, column=col)
                        # Убираем нижнюю границу у ячеек в строке с названием группы
                        if cell.border:
                            new_border = copy(cell.border)
                            new_border.bottom = None
                            cell.border = new_border

                        if cell.value and isinstance(cell.value, str):
                            if "{id_method}" in cell.value:
                                cell.value = cell.value.replace("{id_method}", str(idx))
                                logger.info(
                                    f"Установлен ID метода {idx} для группы {group_data['name']}"
                                )
                            elif "{name_method}" in cell.value:
                                cell.value = f"{group_data['name']}:"
                                logger.info(
                                    f"Установлено название группы: {group_data['name']}"
                                )
                            elif "{unit}" in cell.value:
                                # Выводим единицу измерения на уровне группы
                                cell.value = cell.value.replace(
                                    "{unit}", common_unit or "не указано"
                                )
                            elif "{measurement_method}" in cell.value:
                                # Выводим метод измерения на уровне группы
                                cell.value = cell.value.replace(
                                    "{measurement_method}",
                                    common_measurement_method or "не указано",
                                )
                            else:
                                # Для остальных полей в первой строке ставим пустые значения
                                for placeholder in [
                                    "{result}",
                                    "{measurement_error}",
                                    "{nd_code1}",
                                    "{nd_name1}",
                                ]:
                                    if placeholder in cell.value:
                                        cell.value = cell.value.replace(placeholder, "")

                    # Применяем объединение ячеек для строки с названием группы
                    for merged_cell in template_merged_cells:
                        worksheet.merge_cells(
                            start_row=current_row,
                            start_column=merged_cell["min_col"],
                            end_row=current_row,
                            end_column=merged_cell["max_col"],
                        )
                        logger.info(
                            f"Объединены ячейки в строке с названием группы: {current_row}, колонки {merged_cell['min_col']}-{merged_cell['max_col']}"
                        )

                    current_row += 1
                    logger.info(
                        f"Строка с названием группы обработана, переход к строке {current_row}"
                    )

                    # Выводим все методы группы
                    for i, calc in enumerate(group_data["calculations"]):
                        logger.info(
                            f"Обработка метода в группе: {calc.research_method.name}"
                        )

                        # Применяем объединение ячеек для строки метода в группе
                        for merged_cell in template_merged_cells:
                            worksheet.merge_cells(
                                start_row=current_row,
                                start_column=merged_cell["min_col"],
                                end_row=current_row,
                                end_column=merged_cell["max_col"],
                            )
                            logger.info(
                                f"Объединены ячейки в строке метода: {current_row}, колонки {merged_cell['min_col']}-{merged_cell['max_col']}"
                            )

                        # Определяем, является ли метод последним в группе
                        last_method_in_group = i == len(group_data["calculations"]) - 1

                        # Удаляем верхнюю и нижнюю границы для всех ячеек в строке
                        for col in range(1, worksheet.max_column + 1):
                            cell = worksheet.cell(row=current_row, column=col)
                            if cell.border:
                                new_border = copy(cell.border)
                                # Всегда удаляем верхнюю границу для методов в группе
                                new_border.top = None

                                # Для последнего метода в группе сохраняем нижнюю границу
                                if last_method_in_group:
                                    template_cell = worksheet.cell(
                                        row=template_row, column=col
                                    )
                                    if (
                                        template_cell.border
                                        and template_cell.border.bottom
                                    ):
                                        new_border.bottom = copy(
                                            template_cell.border.bottom
                                        )
                                else:
                                    # Для остальных методов в группе убираем нижнюю границу
                                    new_border.bottom = None

                                cell.border = new_border

                            if cell.value and isinstance(cell.value, str):
                                if "{id_method}" in cell.value:
                                    cell.value = ""  # Пустой ID для методов в группе
                                elif "{name_method}" in cell.value:
                                    # Делаем первую букву метода строчной
                                    method_name = calc.research_method.name
                                    if method_name:
                                        method_name = (
                                            method_name[0].lower() + method_name[1:]
                                        )
                                    cell.value = method_name
                                    logger.info(
                                        f"Установлено название метода в группе: {method_name}"
                                    )
                                elif "{result}" in cell.value:
                                    cell.value = cell.value.replace(
                                        "{result}", format_result(calc.result)
                                    )
                                    logger.info(f"Установлен результат: {calc.result}")
                                elif "{measurement_error}" in cell.value:
                                    error_value = calc.measurement_error
                                    formatted_error = (
                                        error_value
                                        if error_value and error_value.startswith("-")
                                        else (
                                            f"±{error_value}"
                                            if error_value
                                            and error_value != "не указано"
                                            else "не указано"
                                        )
                                    )
                                    cell.value = cell.value.replace(
                                        "{measurement_error}",
                                        formatted_error,
                                    )
                                elif "{unit}" in cell.value:
                                    cell.value = cell.value.replace(
                                        "{unit}", ""
                                    )  # Пустая единица измерения для методов в группе
                                elif "{measurement_method}" in cell.value:
                                    cell.value = cell.value.replace(
                                        "{measurement_method}", ""
                                    )  # Пустой метод измерения для методов в группе
                                elif "{nd_code1}" in cell.value:
                                    cell.value = cell.value.replace(
                                        "{nd_code1}",
                                        calc.research_method.nd_code or "не указано",
                                    )
                                elif "{nd_name1}" in cell.value:
                                    cell.value = cell.value.replace(
                                        "{nd_name1}",
                                        calc.research_method.nd_name or "не указано",
                                    )

                        current_row += 1
                        logger.info(
                            f"Метод в группе обработан, переход к строке {current_row}"
                        )

                    idx += 1
                    logger.info(
                        f"Группа {group_data['name']} обработана, переход к следующей группе/методу"
                    )

                # Затем обрабатываем одиночные методы
                for calc in standalone_calculations:
                    # Применяем объединение ячеек для одиночного метода
                    for merged_cell in template_merged_cells:
                        worksheet.merge_cells(
                            start_row=current_row,
                            start_column=merged_cell["min_col"],
                            end_row=current_row,
                            end_column=merged_cell["max_col"],
                        )
                        logger.info(
                            f"Объединены ячейки в строке одиночного метода: {current_row}, колонки {merged_cell['min_col']}-{merged_cell['max_col']}"
                        )

                    for col in range(1, worksheet.max_column + 1):
                        cell = worksheet.cell(row=current_row, column=col)
                        source_cell = worksheet.cell(row=template_row, column=col)

                        # Копируем стили из шаблонной строки
                        if source_cell.has_style:
                            cell._style = copy(source_cell._style)

                        # Обработка значений ячеек
                        if cell.value and isinstance(cell.value, str):
                            # Форматируем погрешность с добавлением ±
                            error_value = calc.measurement_error
                            formatted_error = (
                                error_value
                                if error_value and error_value.startswith("-")
                                else (
                                    f"±{error_value}"
                                    if error_value and error_value != "не указано"
                                    else "не указано"
                                )
                            )

                            value = (
                                cell.value.replace("{id_method}", str(idx))
                                .replace("{name_method}", calc.research_method.name)
                                .replace("{result}", format_result(calc.result))
                                .replace(
                                    "{measurement_error}",
                                    formatted_error,
                                )
                                .replace("{unit}", calc.unit or "не указано")
                                .replace(
                                    "{measurement_method}",
                                    calc.research_method.measurement_method
                                    or "не указано",
                                )
                                .replace(
                                    "{nd_code1}",
                                    calc.research_method.nd_code or "не указано",
                                )
                                .replace(
                                    "{nd_name1}",
                                    calc.research_method.nd_name or "не указано",
                                )
                            )
                            cell.value = value

                    current_row += 1
                    idx += 1

            # Восстанавливаем размеры строк с учетом сдвига
            restore_row_dimensions(
                worksheet, original_dimensions, template_row, rows_to_insert
            )

        # Обработка таблицы 3 (НД методов испытаний)
        start_row_table3 = None
        end_row_table3 = None
        template_row_table3 = None

        # Находим границы таблицы 3
        for row_idx, row in enumerate(worksheet.iter_rows(), 1):
            for cell in row:
                if cell.value == "{start_table3}":
                    start_row_table3 = row_idx
                    logger.info(f"Найдена метка start_table3 в строке {row_idx}")
                elif cell.value == "{end_table3}":
                    end_row_table3 = row_idx
                    logger.info(f"Найдена метка end_table3 в строке {row_idx}")
                    break
            if start_row_table3 and end_row_table3:
                break

        if start_row_table3 and end_row_table3:
            template_row_table3 = start_row_table3 + 1

            # Получаем уникальные методы исследования
            unique_methods = []
            seen_methods = set()

            for calc in calculations:
                method = calc.research_method
                method_key = (method.nd_code or "", method.nd_name or "")

                if method_key not in seen_methods:
                    seen_methods.add(method_key)
                    unique_methods.append(method)

            rows_needed = len(unique_methods)

            logger.info(
                f"Найдены границы таблицы 3: start_row={start_row_table3}, end_row={end_row_table3}"
            )
            logger.info(f"Шаблонная строка таблицы 3: {template_row_table3}")
            logger.info(
                f"Необходимо вставить строк для уникальных методов: {rows_needed}"
            )
            logger.info(
                f"Уникальные методы: {[method.name for method in unique_methods]}"
            )

            # Проверяем содержимое шаблонной строки
            for col in range(1, worksheet.max_column + 1):
                cell = worksheet.cell(row=template_row_table3, column=col)
                if cell.value:
                    logger.info(f"Ячейка [{template_row_table3}, {col}]: {cell.value}")

            # Сохраняем размеры строк перед любыми изменениями
            original_dimensions = save_row_dimensions(worksheet)

            # Вставляем новые строки, если их больше одной
            if rows_needed > 1:
                # Сохраняем существующие объединенные ячейки
                merged_ranges = []
                for merge_range in worksheet.merged_cells.ranges:
                    merged_ranges.append(
                        {
                            "min_row": merge_range.min_row,
                            "max_row": merge_range.max_row,
                            "min_col": merge_range.min_col,
                            "max_col": merge_range.max_col,
                        }
                    )

                # Вставляем новые строки
                rows_to_insert = rows_needed - 1  # Одна строка уже есть
                worksheet.insert_rows(template_row_table3 + 1, rows_to_insert)
                logger.info(
                    f"Вставлено {rows_to_insert} новых строк после строки {template_row_table3}"
                )

                # Копируем стили для каждой новой строки
                for idx in range(rows_to_insert):
                    new_row = template_row_table3 + 1 + idx
                    logger.info(f"Копирование стилей для новой строки {new_row}")

                    for col in range(1, worksheet.max_column + 1):
                        source_cell = worksheet.cell(
                            row=template_row_table3, column=col
                        )
                        target_cell = worksheet.cell(row=new_row, column=col)

                        # Копируем стили только если в исходной ячейке есть значение или это ячейка с границами таблицы
                        if source_cell.has_style and (
                            source_cell.value is not None
                            or col in [1, worksheet.max_column]
                        ):
                            target_cell._style = copy(source_cell._style)

                        target_cell.value = source_cell.value

                # Восстанавливаем и обновляем объединенные ячейки
                worksheet.merged_cells.ranges.clear()
                for merge_range in merged_ranges:
                    if merge_range["max_row"] < template_row_table3:
                        worksheet.merge_cells(
                            start_row=merge_range["min_row"],
                            start_column=merge_range["min_col"],
                            end_row=merge_range["max_row"],
                            end_column=merge_range["max_col"],
                        )
                    elif merge_range["min_row"] > template_row_table3:
                        worksheet.merge_cells(
                            start_row=merge_range["min_row"] + rows_to_insert,
                            start_column=merge_range["min_col"],
                            end_row=merge_range["max_row"] + rows_to_insert,
                            end_column=merge_range["max_col"],
                        )
                    elif merge_range["min_row"] == template_row_table3:
                        for i in range(rows_needed):
                            worksheet.merge_cells(
                                start_row=template_row_table3 + i,
                                start_column=merge_range["min_col"],
                                end_row=template_row_table3 + i,
                                end_column=merge_range["max_col"],
                            )

            # Заполняем данные таблицы 3
            current_row = template_row_table3
            for idx, method in enumerate(unique_methods, 1):
                for col in range(1, worksheet.max_column + 1):
                    cell = worksheet.cell(row=current_row, column=col)
                    if cell.value and isinstance(cell.value, str):
                        value = (
                            cell.value.replace("{id_nd}", str(idx))
                            .replace("{nd_code}", method.nd_code or "не указано")
                            .replace("{name_nd}", method.nd_name or "не указано")
                        )
                        cell.value = value
                current_row += 1

            # Восстанавливаем размеры строк с учетом сдвига
            restore_row_dimensions(
                worksheet, original_dimensions, template_row_table3, rows_needed - 1
            )

        # Сохраняем промежуточный результат
        temp_output = BytesIO()
        workbook.save(temp_output)
        temp_output.seek(0)

        # Создаем новый файл из промежуточного результата
        source_workbook = load_workbook(temp_output)
        source_worksheet = source_workbook.active

        # Создаем новый файл
        target_workbook = Workbook()
        target_worksheet = target_workbook.active
        target_worksheet.title = "Лист1"

        # Копируем размеры столбцов
        for column in source_worksheet.column_dimensions:
            target_worksheet.column_dimensions[column] = copy(
                source_worksheet.column_dimensions[column]
            )

        markers = [
            "{start_header}",
            "{end_header}",
            "{start_table1}",
            "{end_table1}",
            "{start_table3}",
            "{end_table3}",
            "{{start_table}}",
            "{{end_table}}",
        ]

        table_ranges = []
        start_table_row = None

        # Находим все диапазоны с двойными фигурными скобками
        for source_row in range(1, source_worksheet.max_row + 1):
            for col in range(1, source_worksheet.max_column + 1):
                cell = source_worksheet.cell(row=source_row, column=col)
                if cell.value and isinstance(cell.value, str):
                    if "{{start_table}}" in cell.value:
                        start_table_row = source_row
                    elif "{{end_table}}" in cell.value and start_table_row is not None:
                        table_ranges.append((start_table_row, source_row))
                        start_table_row = None

        # Определяем строки, которые нужно пропустить из-за наличия фигурных скобок
        skip_rows = set()
        for start_row, end_row in table_ranges:
            has_braces = False
            for row in range(start_row, end_row + 1):
                for col in range(1, source_worksheet.max_column + 1):
                    cell = source_worksheet.cell(row=row, column=col)
                    if cell.value and isinstance(cell.value, str):
                        cell_value = cell.value
                        # Удаляем из проверки все метки start_table и end_table с цифрами
                        for i in range(10):
                            cell_value = cell_value.replace(f"{{start_table{i}}}", "")
                            cell_value = cell_value.replace(f"{{end_table{i}}}", "")
                        # Удаляем метки с двойными скобками
                        cell_value = cell_value.replace("{{start_table}}", "")
                        cell_value = cell_value.replace("{{end_table}}", "")
                        if "{" in cell_value or "}" in cell_value:
                            has_braces = True
                            break
                if has_braces:
                    break

            if has_braces:
                skip_rows.update(range(start_row, end_row + 1))

        # Добавляем строки с пустыми условиями отбора
        skip_rows.update(rows_to_delete)

        # Создаем словарь для маппинга исходных строк в целевые
        row_mapping = {}
        target_row = 1

        # Сначала определяем маппинг строк, пропуская строки с пустыми условиями отбора
        for source_row in range(1, source_worksheet.max_row + 1):
            if source_row in skip_rows:
                continue

            skip_row = False
            for col in range(1, source_worksheet.max_column + 1):
                cell = source_worksheet.cell(row=source_row, column=col)
                if cell.value and isinstance(cell.value, str):
                    if any(marker in cell.value for marker in markers):
                        skip_row = True
                        break

            if not skip_row:
                row_mapping[source_row] = target_row
                target_row += 1

        # Группируем строки по листам с учетом шапок таблиц
        sheets_content = []
        current_sheet_rows = []
        current_sheet_height = 0
        last_header_row = None
        last_header_rows = []

        for source_row, target_row in row_mapping.items():
            # Получаем высоту строки
            row_height = (
                source_worksheet.row_dimensions[source_row].height
                if source_row in source_worksheet.row_dimensions
                else DEFAULT_ROW_HEIGHT
            )

            # Проверяем, является ли текущая строка частью таблицы
            header_row = find_table_headers(source_worksheet, source_row)

            # Если нашли шапку таблицы, сохраняем её и получаем все строки шапки
            if header_row is not None:
                last_header_row = header_row
                last_header_rows = get_table_header_rows(
                    source_worksheet, header_row, source_row
                )

            # Если текущий лист превысит высоту А4
            if (
                current_sheet_height + row_height > A4_HEIGHT_POINTS
                and current_sheet_rows
            ):
                sheets_content.append(current_sheet_rows)
                current_sheet_rows = []
                current_sheet_height = 0

                # Если есть шапка таблицы, добавляем только строки шапки в начало нового листа
                if last_header_rows:
                    header_height = 0
                    for header_row in last_header_rows:
                        if header_row in row_mapping:
                            header_row_height = (
                                source_worksheet.row_dimensions[header_row].height
                                if header_row in source_worksheet.row_dimensions
                                else DEFAULT_ROW_HEIGHT
                            )
                            header_height += header_row_height
                            current_sheet_rows.append(header_row)
                    current_sheet_height = header_height

            current_sheet_rows.append(source_row)
            current_sheet_height += row_height

        # Добавляем последний набор строк
        if current_sheet_rows:
            sheets_content.append(current_sheet_rows)

        # Создаем и заполняем листы
        for sheet_index, sheet_rows in enumerate(sheets_content):
            if sheet_index == 0:
                # Используем первый лист
                current_sheet = target_worksheet
            else:
                # Создаем новый лист для следующей части данных
                current_sheet = target_workbook.create_sheet(f"Лист {sheet_index + 1}")

                # Копируем размеры столбцов на новый лист
                for column in source_worksheet.column_dimensions:
                    current_sheet.column_dimensions[column] = copy(
                        source_worksheet.column_dimensions[column]
                    )

            current_sheet_row = 1

            # Копируем содержимое для текущего листа
            for source_row in sheet_rows:
                # Копируем высоту строки
                if source_row in source_worksheet.row_dimensions:
                    current_sheet.row_dimensions[current_sheet_row] = copy(
                        source_worksheet.row_dimensions[source_row]
                    )

                # Копируем ячейки и их стили
                for col in range(1, source_worksheet.max_column + 1):
                    source_cell = source_worksheet.cell(row=source_row, column=col)
                    target_cell = current_sheet.cell(row=current_sheet_row, column=col)

                    # Копируем значение
                    target_cell.value = source_cell.value

                    # Копируем стили
                    if source_cell.has_style:
                        if source_cell.font:
                            target_cell.font = Font(
                                name=source_cell.font.name,
                                size=source_cell.font.size,
                                bold=source_cell.font.bold,
                                italic=source_cell.font.italic,
                                vertAlign=source_cell.font.vertAlign,
                                underline=source_cell.font.underline,
                                strike=source_cell.font.strike,
                                color=source_cell.font.color,
                            )

                        if source_cell.alignment:
                            target_cell.alignment = Alignment(
                                horizontal=source_cell.alignment.horizontal,
                                vertical=source_cell.alignment.vertical,
                                textRotation=source_cell.alignment.textRotation,
                                wrapText=source_cell.alignment.wrapText,
                                shrinkToFit=source_cell.alignment.shrinkToFit,
                                indent=source_cell.alignment.indent,
                            )

                        if source_cell.border:
                            target_cell.border = copy(source_cell.border)

                        if source_cell.fill:
                            target_cell.fill = copy(source_cell.fill)

                        target_cell.number_format = source_cell.number_format

                current_sheet_row += 1

            # Обновляем объединенные ячейки для текущего листа
            current_merged_cells = []
            for merge_range in source_worksheet.merged_cells.ranges:
                min_row = merge_range.min_row
                max_row = merge_range.max_row

                # Проверяем, что объединенные ячейки находятся в текущем наборе строк
                if min_row in sheet_rows and max_row in sheet_rows:
                    # Получаем новые номера строк для текущего листа
                    new_min_row = sheet_rows.index(min_row) + 1
                    new_max_row = sheet_rows.index(max_row) + 1

                    current_merged_cells.append(
                        {
                            "min_row": new_min_row,
                            "max_row": new_max_row,
                            "min_col": merge_range.min_col,
                            "max_col": merge_range.max_col,
                        }
                    )

            # Применяем объединение ячеек для текущего листа
            for merge_info in current_merged_cells:
                try:
                    current_sheet.merge_cells(
                        start_row=merge_info["min_row"],
                        start_column=merge_info["min_col"],
                        end_row=merge_info["max_row"],
                        end_column=merge_info["max_col"],
                    )
                except Exception as e:
                    logger.warning(
                        f"Не удалось объединить ячейки на листе {sheet_index + 1}: {str(e)}"
                    )

        # Сохраняем финальный результат
        final_output = BytesIO()
        target_workbook.save(final_output)
        final_output.seek(0)

        safe_filename = f"Protocol_{protocol.registration_number.replace(' ', '_')}"
        safe_filename = "".join(
            c for c in safe_filename if c.isalnum() or c in ("_", "-", ".")
        )
        excel_filename = f"{safe_filename}.xlsx"
        encoded_excel_filename = excel_filename.encode("utf-8").decode("latin-1")

        response = HttpResponse(
            final_output.read(),
            content_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        )
        response["Content-Disposition"] = (
            f"attachment; filename=\"{encoded_excel_filename}\"; filename*=UTF-8''{encoded_excel_filename}"
        )
        return response

    except Exception as e:
        logger.error(f"Ошибка при генерации Excel файла: {str(e)}", exc_info=True)
        return Response(
            {"error": f"Произошла ошибка при генерации файла: {str(e)}"},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )
