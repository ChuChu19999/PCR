import json
import logging
from copy import copy
from io import BytesIO
from django.http import HttpResponse
from django.shortcuts import get_object_or_404
from openpyxl import load_workbook, Workbook
from openpyxl.styles import Font, Alignment
from openpyxl.cell.cell import MergedCell
from openpyxl.worksheet.page import PageMargins
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from ..models import (
    ExcelTemplate,
    Protocol,
    Calculation,
    Equipment,
    Sample,
    ResearchObject,
    ResearchObjectMethod,
)
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
    get_object_suffix,
    format_protocol_number,
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
            # Ищем пробу по регистрационному номеру
            sample = Sample.objects.filter(
                registration_number=registration_number, is_deleted=False
            ).first()
            if not sample:
                return Response(
                    {
                        "error": f"Проба с регистрационным номером {registration_number} не найдена"
                    },
                    status=status.HTTP_404_NOT_FOUND,
                )
            protocol = sample.protocol
            if not protocol:
                return Response(
                    {
                        "error": f"Для пробы с регистрационным номером {registration_number} не найден протокол"
                    },
                    status=status.HTTP_404_NOT_FOUND,
                )
        else:
            protocol = Protocol.objects.get(id=protocol_id)

        # Получаем все пробы протокола
        samples = Sample.objects.filter(protocol=protocol, is_deleted=False)
        if not samples.exists():
            return Response(
                {"error": "Для протокола не найдены пробы"},
                status=status.HTTP_404_NOT_FOUND,
            )

        # Собираем все расчеты из всех проб
        calculations = []
        for sample in samples:
            sample_calculations = Calculation.objects.filter(
                sample=sample, is_deleted=False
            ).order_by("laboratory_activity_date")
            calculations.extend(sample_calculations)

        if not calculations:
            return Response(
                {"error": "Для проб протокола не найдены расчеты"},
                status=status.HTTP_404_NOT_FOUND,
            )

        # Получаем данные из available_methods для сравнения
        research_page = ResearchObject.objects.filter(
            laboratory_id=protocol.laboratory_id,
            department_id=protocol.department_id,
            type="oil_products",
            is_deleted=False,
        ).first()

        if not research_page:
            logger.error(
                "Не найдена страница исследований для сравнения порядка методов"
            )
        else:
            # Получаем методы как в available_methods
            research_methods_from_api = (
                ResearchObjectMethod.objects.filter(
                    research_object=research_page, is_active=True, is_deleted=False
                )
                .select_related("research_method")
                .order_by("sort_order", "created_at")
            )

            logger.info("=== СРАВНЕНИЕ ПОРЯДКА МЕТОДОВ ===")
            logger.info("\nМетоды из available_methods:")
            for rom in research_methods_from_api:
                logger.info(
                    f"ID: {rom.research_method_id}, Method: {rom.research_method.name}, sort_order: {rom.sort_order}"
                )

            logger.info("\nТекущие расчеты до сортировки:")
            for calc in calculations:
                logger.info(
                    f"ID: {calc.research_method_id}, Method: {calc.research_method.name}"
                )

            # Создаем словарь для сортировки
            method_order = {
                rom.research_method_id: rom.sort_order
                for rom in research_methods_from_api
            }
            logger.info("\nСловарь сортировки:")
            for method_id, sort_order in method_order.items():
                logger.info(f"Method ID: {method_id}, sort_order: {sort_order}")

            # Сортируем расчеты
            calculations.sort(
                key=lambda x: (
                    method_order.get(x.research_method_id, float("inf")),
                    x.research_method.name,
                )
            )

            logger.info("\nРасчеты после сортировки:")
            for calc in calculations:
                logger.info(
                    f"ID: {calc.research_method_id}, Method: {calc.research_method.name}, sort_order: {method_order.get(calc.research_method_id, 'не найден')}"
                )

            logger.info("=== КОНЕЦ СРАВНЕНИЯ ===\n")

        min_date = calculations[0].laboratory_activity_date
        max_date = calculations[-1].laboratory_activity_date

        laboratory_activity_dates = (
            f"{min_date.strftime('%d.%m.%Y')}-{max_date.strftime('%d.%m.%Y')}"
        )
        if min_date == max_date:
            laboratory_activity_dates = min_date.strftime("%d.%m.%Y")

        if not protocol.excel_template:
            return Response(
                {"error": "Для протокола не выбран шаблон Excel"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Загружаем шаблон
        template_bytes = protocol.excel_template.file
        workbook = load_workbook(BytesIO(template_bytes))
        worksheet = workbook.active

        # Получаем всех исполнителей из расчетов
        executors = list(set([calc.executor for calc in calculations if calc.executor]))
        executors_str = ", ".join(executors)

        # Формируем строки с уникальными регистрационными номерами и объектами испытаний
        unique_registration_numbers = set()
        unique_test_objects = set()

        for sample in samples:
            unique_registration_numbers.add(sample.registration_number)
            unique_test_objects.add(sample.test_object)

        registration_numbers = ", ".join(sorted(unique_registration_numbers))
        test_objects = ", ".join(sorted(unique_test_objects))

        # Подготавливаем данные для замены в шаблоне
        replacements = {
            "{test_protocol_number}": protocol.test_protocol_number or "",
            "{registration_number}": registration_numbers,
            "{test_object}": test_objects,
            "{laboratory_location}": protocol.laboratory_location or "",
            "{branch}": protocol.branch or "",
            "{sampling_location_detail}": protocol.sampling_location_detail or "",
            "{phone}": protocol.phone or "",
            "{sampling_act_number}": protocol.sampling_act_number or "",
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
            "{res_object}": test_objects,
            "{laboratory_activity_dates}": laboratory_activity_dates,
        }

        # Обработка условий отбора
        selection_conditions = protocol.selection_conditions or {}
        selection_conditions_list = []

        # Преобразуем selection_conditions в список, если это словарь
        if isinstance(selection_conditions, dict):
            for name, data in selection_conditions.items():
                if isinstance(data, dict):
                    selection_conditions_list.append(
                        {
                            "name": name,
                            "value": data.get("value"),
                            "unit": data.get("unit"),
                        }
                    )
                else:
                    selection_conditions_list.append(
                        {"name": name, "value": data, "unit": ""}
                    )
        elif isinstance(selection_conditions, list):
            selection_conditions_list = selection_conditions

        has_filled_conditions = False
        rows_to_delete = set()

        # Находим все строки с метками условий отбора
        for row_idx, row in enumerate(worksheet.iter_rows(), 1):
            has_condition_tags = False
            all_tags_empty = True
            bu_cell = None

            # Проверяем аккредитацию и удаляем строку шапки если нужно
            if (
                not protocol.is_accredited
                and protocol.excel_template.accreditation_header_row
            ):
                if row_idx == protocol.excel_template.accreditation_header_row:
                    rows_to_delete.add(row_idx)
                    continue

            # Проверяем наличие меток условий отбора в строке
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
                        if i <= len(selection_conditions_list):
                            condition = selection_conditions_list[i - 1]
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
                            if tag == "{test_protocol_number}":
                                formatted_number = format_protocol_number(
                                    protocol, protocol.excel_template
                                )
                                cell.value = cell.value.replace(tag, formatted_number)
                            else:
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
            rows_needed = len(calculations)

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
                    logger.info(f"  - Метод НЕ имеет атрибут groups")

            # Сначала собираем все методы в группы или как одиночные
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
                            "sort_order": method_order.get(
                                calc.research_method_id, float("inf")
                            ),
                        }
                        logger.info(f"Создана новая группа для расчетов: {group_name}")

                    grouped_calculations[group_id]["calculations"].append(calc)
                    grouped_calculations[group_id]["methods"].append(
                        calc.research_method
                    )
                    # Обновляем sort_order группы минимальным значением из её методов
                    current_sort_order = method_order.get(
                        calc.research_method_id, float("inf")
                    )
                    if (
                        current_sort_order
                        < grouped_calculations[group_id]["sort_order"]
                    ):
                        grouped_calculations[group_id][
                            "sort_order"
                        ] = current_sort_order
                    logger.info(
                        f"Метод {calc.research_method.name} добавлен в группу {group_name}"
                    )
                else:
                    standalone_calculations.append(calc)
                    logger.info(
                        f"Метод {calc.research_method.name} добавлен как отдельный (не в группе)"
                    )

            logger.info(
                f"Итоговые сгруппированные методы: {[(k, v['name'], [m.name for m in v['methods']], v['sort_order']) for k, v in grouped_calculations.items()]}"
            )
            logger.info(
                f"Итоговые одиночные методы: {[c.research_method.name for c in standalone_calculations]}"
            )

            # Проверяем методы на наличие "конденсат" и "нефть"
            def check_method_name(method_name):
                return (
                    "конденсат" in method_name.lower() or "нефть" in method_name.lower()
                )

            # Модифицируем группировку если нужно
            modified_grouped_calculations = {}
            for group_id, group_data in sorted(
                grouped_calculations.items(), key=lambda x: x[1]["sort_order"]
            ):
                logger.info(f"Проверка группы: {group_data['name']}")

                # Проверяем каждый метод в группе
                for calc in group_data["calculations"]:
                    method_name = calc.research_method.name
                    logger.info(f"Проверка метода в группе: {method_name}")

                    if check_method_name(method_name):
                        logger.info(
                            f"Найден метод с ключевым словом (конденсат/нефть): {method_name}"
                        )
                        # Создаем копию первого расчета группы
                        group_calc = copy(group_data["calculations"][0])
                        # Меняем название метода на название группы
                        group_calc.research_method.name = group_data["name"]
                        # Сохраняем sort_order группы
                        group_calc.research_method.sort_order = group_data["sort_order"]
                        logger.info(
                            f"Группа будет выведена как одиночный метод с названием: {group_data['name']} и sort_order: {group_data['sort_order']}"
                        )
                        standalone_calculations.append(group_calc)
                        break
                else:
                    # Если не нашли методы с ключевыми словами, оставляем группу как есть
                    logger.info(f"Группа {group_data['name']} остается без изменений")
                    modified_grouped_calculations[group_id] = group_data

            grouped_calculations = modified_grouped_calculations

            # Сортируем одиночные методы по sort_order
            standalone_calculations.sort(
                key=lambda x: method_order.get(x.research_method_id, float("inf"))
            )

            logger.info(f"Итоговое количество групп: {len(grouped_calculations)}")
            logger.info(
                f"Итоговое количество одиночных методов: {len(standalone_calculations)}"
            )
            logger.info("Отсортированные одиночные методы:")
            for calc in standalone_calculations:
                logger.info(
                    f"  - {calc.research_method.name} (sort_order: {method_order.get(calc.research_method_id, 'не задан')})"
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
                            cell.value = f"{group_data['name']}"
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
                                cell.value = f"{group_data['name']}"
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

        # Обработка таблицы 2 (оборудование)
        start_row_table2 = None
        end_row_table2 = None
        template_row_table2 = None

        # Находим границы таблицы 2
        for row_idx, row in enumerate(worksheet.iter_rows(), 1):
            for cell in row:
                if cell.value == "{start_table2}":
                    start_row_table2 = row_idx
                    logger.info(f"Найдена метка start_table2 в строке {row_idx}")
                elif cell.value == "{end_table2}":
                    end_row_table2 = row_idx
                    logger.info(f"Найдена метка end_table2 в строке {row_idx}")
                    break
            if start_row_table2 and end_row_table2:
                break

        if start_row_table2 and end_row_table2:
            template_row_table2 = start_row_table2 + 1

            # Получаем уникальные приборы из всех расчетов
            unique_equipment = []
            seen_equipment = set()

            # Собираем все ID оборудования из всех расчетов
            equipment_ids = set()
            for calc in calculations:
                if calc.equipment_data:
                    for equipment_item in calc.equipment_data:
                        if isinstance(equipment_item, dict) and "id" in equipment_item:
                            equipment_ids.add(equipment_item["id"])
                        elif isinstance(equipment_item, int):  # Поддержка числовых ID
                            equipment_ids.add(equipment_item)

            # Получаем все оборудование из базы данных
            if equipment_ids:
                equipment_list = Equipment.objects.filter(id__in=equipment_ids)
                for equipment in equipment_list:
                    equipment_key = (equipment.name, equipment.serial_number)
                    if equipment_key not in seen_equipment:
                        seen_equipment.add(equipment_key)
                        unique_equipment.append(equipment)

            rows_needed = len(unique_equipment)

            logger.info(
                f"Найдены границы таблицы 2: start_row={start_row_table2}, end_row={end_row_table2}"
            )
            logger.info(f"Шаблонная строка таблицы 2: {template_row_table2}")
            logger.info(
                f"Необходимо вставить строк для уникального оборудования: {rows_needed}"
            )
            logger.info(
                f"Уникальное оборудование: {[equip.name for equip in unique_equipment]}"
            )

            # Проверяем содержимое шаблонной строки
            for col in range(1, worksheet.max_column + 1):
                cell = worksheet.cell(row=template_row_table2, column=col)
                if cell.value:
                    logger.info(f"Ячейка [{template_row_table2}, {col}]: {cell.value}")

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
                worksheet.insert_rows(template_row_table2 + 1, rows_to_insert)
                logger.info(
                    f"Вставлено {rows_to_insert} новых строк после строки {template_row_table2}"
                )

                # Копируем стили для каждой новой строки
                for idx in range(rows_to_insert):
                    new_row = template_row_table2 + 1 + idx
                    logger.info(f"Копирование стилей для новой строки {new_row}")

                    for col in range(1, worksheet.max_column + 1):
                        source_cell = worksheet.cell(
                            row=template_row_table2, column=col
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
                    if merge_range["max_row"] < template_row_table2:
                        worksheet.merge_cells(
                            start_row=merge_range["min_row"],
                            start_column=merge_range["min_col"],
                            end_row=merge_range["max_row"],
                            end_column=merge_range["max_col"],
                        )
                    elif merge_range["min_row"] > template_row_table2:
                        worksheet.merge_cells(
                            start_row=merge_range["min_row"] + rows_to_insert,
                            start_column=merge_range["min_col"],
                            end_row=merge_range["max_row"] + rows_to_insert,
                            end_column=merge_range["max_col"],
                        )
                    elif merge_range["min_row"] == template_row_table2:
                        for i in range(rows_needed):
                            worksheet.merge_cells(
                                start_row=template_row_table2 + i,
                                start_column=merge_range["min_col"],
                                end_row=template_row_table2 + i,
                                end_column=merge_range["max_col"],
                            )

            # Заполняем данные таблицы 2
            current_row = template_row_table2
            for idx, equipment in enumerate(unique_equipment, 1):
                for col in range(1, worksheet.max_column + 1):
                    cell = worksheet.cell(row=current_row, column=col)
                    if cell.value and isinstance(cell.value, str):
                        # Форматируем даты в нужный формат
                        verification_date = (
                            equipment.verification_date.strftime("%d.%m.%Y")
                            if equipment.verification_date
                            else "не указано"
                        )
                        verification_end_date = (
                            equipment.verification_end_date.strftime("%d.%m.%Y")
                            if equipment.verification_end_date
                            else "не указано"
                        )

                        value = (
                            cell.value.replace("{id_equipment}", str(idx))
                            .replace("{name_equipment}", equipment.name or "не указано")
                            .replace(
                                "{serial_num}", equipment.serial_number or "не указано"
                            )
                            .replace(
                                "{ver_info}",
                                equipment.verification_info or "не указано",
                            )
                            .replace("{ver_date}", verification_date)
                            .replace("{ver_end_date}", verification_end_date)
                        )
                        cell.value = value
                current_row += 1

            # Восстанавливаем размеры строк с учетом сдвига
            restore_row_dimensions(
                worksheet, original_dimensions, template_row_table2, rows_needed - 1
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

        # Копируем настройки страницы из шаблона
        source_page_setup = source_worksheet.page_setup
        source_page_margins = source_worksheet.page_margins

        for sheet in target_workbook.worksheets:
            if (
                hasattr(source_page_setup, "orientation")
                and source_page_setup.orientation is not None
            ):
                sheet.page_setup.orientation = source_page_setup.orientation
            if (
                hasattr(source_page_setup, "paperSize")
                and source_page_setup.paperSize is not None
            ):
                sheet.page_setup.paperSize = source_page_setup.paperSize

            # Устанавливаем базовые настройки страницы для масштабирования
            sheet.page_setup.fitToPage = True
            sheet.page_setup.fitToWidth = 1
            sheet.page_setup.fitToHeight = 0

            # Копируем поля страницы
            if source_page_margins:
                sheet.page_margins = PageMargins(
                    left=(
                        source_page_margins.left
                        if hasattr(source_page_margins, "left")
                        else 0.591
                    ),
                    right=(
                        source_page_margins.right
                        if hasattr(source_page_margins, "right")
                        else 0.394
                    ),
                    top=(
                        source_page_margins.top
                        if hasattr(source_page_margins, "top")
                        else 0.433
                    ),
                    bottom=(
                        source_page_margins.bottom
                        if hasattr(source_page_margins, "bottom")
                        else 0.354
                    ),
                )

                # Копируем header и footer только если они есть в шаблоне
                if hasattr(source_page_margins, "header"):
                    sheet.page_margins.header = source_page_margins.header
                if hasattr(source_page_margins, "footer"):
                    sheet.page_margins.footer = source_page_margins.footer
            else:
                # Устанавливаем стандартные поля если их нет в шаблоне
                sheet.page_margins = PageMargins(
                    left=0.591,  # 1.5 см
                    right=0.394,  # 1.0 см
                    top=0.433,  # 1.1 см
                    bottom=0.354,  # 0.9 см
                )

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
            "{start_table2}",
            "{end_table2}",
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

        # Создаем список маркеров, которые нужно пропустить при маппинге
        skip_markers = [
            "{start_header}",
            "{end_header}",
            "{{start_table}}",
            "{{end_table}}",
        ]

        # Создаем множество для строк с маркерами таблиц
        table_marker_rows = set()

        # Сначала определяем маппинг строк, пропуская строки с пустыми условиями отбора
        for source_row in range(1, source_worksheet.max_row + 1):
            if source_row in skip_rows:
                continue

            skip_row = False
            for col in range(1, source_worksheet.max_column + 1):
                cell = source_worksheet.cell(row=source_row, column=col)
                if cell.value and isinstance(cell.value, str):
                    cell_value = str(cell.value)
                    # Проверяем маркеры таблиц
                    if any(
                        marker in cell_value
                        for marker in [
                            "{start_table1}",
                            "{end_table1}",
                            "{start_table2}",
                            "{end_table2}",
                            "{start_table3}",
                            "{end_table3}",
                        ]
                    ):
                        table_marker_rows.add(source_row)
                        skip_row = True
                        break
                    # Проверяем другие маркеры
                    if any(marker in cell_value for marker in skip_markers):
                        skip_row = True
                        break

            if not skip_row and source_row not in table_marker_rows:
                row_mapping[source_row] = target_row
                target_row += 1

        # Группируем строки по листам с учетом шапок таблиц
        sheets_content = []
        current_sheet_rows = []
        current_sheet_height = 0
        last_header_row = None
        last_header_rows = []
        is_table_complete = False  # Флаг для отслеживания заполненности таблицы
        current_table = None  # Текущая обрабатываемая таблица

        # Создаем словарь для отслеживания состояния таблиц
        table_states = {
            "table1": {"complete": False, "header_rows": []},
            "table2": {"complete": False, "header_rows": []},
            "table3": {"complete": False, "header_rows": []},
        }

        # Создаем временный список для всех строк
        all_rows = []

        for source_row, target_row in row_mapping.items():
            # Получаем высоту строки
            row_height = (
                source_worksheet.row_dimensions[source_row].height
                if source_row in source_worksheet.row_dimensions
                else DEFAULT_ROW_HEIGHT
            )

            # Проверяем маркеры начала и конца таблиц в исходных строках (включая пропущенные)
            for check_row in range(
                source_row - 1, source_row + 2
            ):  # Проверяем текущую строку и соседние
                if check_row < 1 or check_row > source_worksheet.max_row:
                    continue

                for col in range(1, source_worksheet.max_column + 1):
                    cell = source_worksheet.cell(row=check_row, column=col)
                    if cell.value and isinstance(cell.value, str):
                        cell_value = str(cell.value)

                        # Проверяем начало таблиц
                        if "{start_table1}" in cell_value:
                            current_table = "table1"
                            table_states["table1"]["complete"] = False
                        elif "{start_table2}" in cell_value:
                            current_table = "table2"
                            table_states["table2"]["complete"] = False
                        elif "{start_table3}" in cell_value:
                            current_table = "table3"
                            table_states["table3"]["complete"] = False

                        # Проверяем конец таблиц
                        elif "{end_table1}" in cell_value:
                            table_states["table1"]["complete"] = True
                            if current_table == "table1":
                                current_table = None
                        elif "{end_table2}" in cell_value:
                            table_states["table2"]["complete"] = True
                            if current_table == "table2":
                                current_table = None
                        elif "{end_table3}" in cell_value:
                            table_states["table3"]["complete"] = True
                            if current_table == "table3":
                                current_table = None

            # Проверяем, является ли текущая строка частью таблицы
            header_row = find_table_headers(source_worksheet, source_row)

            # Если нашли шапку таблицы, сохраняем её и получаем все строки шапки
            if header_row is not None:
                last_header_row = header_row
                last_header_rows = get_table_header_rows(
                    source_worksheet, header_row, source_row
                )
                if current_table:
                    table_states[current_table]["header_rows"] = last_header_rows

            # Если текущий лист превысит высоту А4
            if (
                current_sheet_height + row_height > A4_HEIGHT_POINTS
                and current_sheet_rows
            ):
                sheets_content.append(current_sheet_rows)
                current_sheet_rows = []
                current_sheet_height = 0

                # Если есть шапка таблицы и текущая таблица не завершена, добавляем шапку в начало нового листа
                if current_table and not table_states[current_table]["complete"]:
                    header_rows = table_states[current_table]["header_rows"]
                    if header_rows:
                        header_height = 0
                        for header_row in header_rows:
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

                # Копируем настройки страницы
                if (
                    hasattr(source_worksheet.page_setup, "orientation")
                    and source_worksheet.page_setup.orientation is not None
                ):
                    current_sheet.page_setup.orientation = (
                        source_worksheet.page_setup.orientation
                    )
                if (
                    hasattr(source_worksheet.page_setup, "paperSize")
                    and source_worksheet.page_setup.paperSize is not None
                ):
                    current_sheet.page_setup.paperSize = (
                        source_worksheet.page_setup.paperSize
                    )

                # Устанавливаем базовые настройки страницы для масштабирования
                current_sheet.page_setup.fitToPage = True
                current_sheet.page_setup.fitToWidth = 1
                current_sheet.page_setup.fitToHeight = 0

                # Копируем поля страницы
                if source_worksheet.page_margins:
                    current_sheet.page_margins = PageMargins(
                        left=(
                            source_worksheet.page_margins.left
                            if hasattr(source_worksheet.page_margins, "left")
                            else 0.591
                        ),
                        right=(
                            source_worksheet.page_margins.right
                            if hasattr(source_worksheet.page_margins, "right")
                            else 0.394
                        ),
                        top=(
                            source_worksheet.page_margins.top
                            if hasattr(source_worksheet.page_margins, "top")
                            else 0.433
                        ),
                        bottom=(
                            source_worksheet.page_margins.bottom
                            if hasattr(source_worksheet.page_margins, "bottom")
                            else 0.354
                        ),
                    )

                    # Копируем header и footer только если они есть в шаблоне
                    if hasattr(source_worksheet.page_margins, "header"):
                        current_sheet.page_margins.header = (
                            source_worksheet.page_margins.header
                        )
                    if hasattr(source_worksheet.page_margins, "footer"):
                        current_sheet.page_margins.footer = (
                            source_worksheet.page_margins.footer
                        )
                else:
                    # Устанавливаем стандартные поля если их нет в шаблоне
                    current_sheet.page_margins = PageMargins(
                        left=0.591,  # 1.5 см
                        right=0.394,  # 1.0 см
                        top=0.433,  # 1.1 см
                        bottom=0.354,  # 0.9 см
                    )

                # Копируем размеры столбцов
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

        # Формируем имя файла из номера протокола или регистрационных номеров проб
        if protocol.test_protocol_number:
            safe_filename = f"Protocol_{protocol.test_protocol_number}"
        else:
            # Берем регистрационные номера из проб
            registration_numbers = [
                sample.registration_number
                for sample in protocol.samples.filter(is_deleted=False)
            ]
            safe_filename = f"Protocol_{'-'.join(registration_numbers)}"

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
