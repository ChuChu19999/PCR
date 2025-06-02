import json
import logging
from copy import copy
from io import BytesIO
from django.db import models
from django.shortcuts import get_object_or_404
from django.http import HttpResponse, JsonResponse
from openpyxl import load_workbook, Workbook
from openpyxl.styles import Font, Alignment
from openpyxl.cell.cell import MergedCell
from rest_framework import viewsets, status
from rest_framework.decorators import api_view, permission_classes, action
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from ..models import ExcelTemplate, Protocol, Calculation
from ..serializers import ExcelTemplateSerializer
from ..utils.excel_utils import (
    A4_HEIGHT_POINTS,
    DEFAULT_ROW_HEIGHT,
    save_row_dimensions,
    restore_row_dimensions,
    format_result,
    get_content_height,
    find_table_headers,
    get_table_header_rows,
)

logger = logging.getLogger(__name__)


@permission_classes([AllowAny])
class ExcelTemplateViewSet(viewsets.ModelViewSet):
    serializer_class = ExcelTemplateSerializer
    queryset = ExcelTemplate.objects.all()

    def get_queryset(self):
        queryset = ExcelTemplate.objects.all()

        # Получаем параметры из запроса
        laboratory = self.request.query_params.get("laboratory")
        department = self.request.query_params.get("department")

        # Фильтруем по лаборатории
        if laboratory:
            queryset = queryset.filter(laboratory=laboratory)

            # Если указано подразделение, добавляем его в фильтр
            if department:
                queryset = queryset.filter(
                    models.Q(department=department)  # Шаблоны конкретного подразделения
                    | models.Q(department__isnull=True)  # И общие шаблоны лаборатории
                )

        return queryset

    def create(self, request, *args, **kwargs):
        name = request.data.get("name")
        laboratory = request.data.get("laboratory")

        if not laboratory:
            return Response(
                {"error": "Необходимо указать лабораторию"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        file = request.FILES.get("file")
        if not file:
            return Response(
                {"error": "Файл не предоставлен"}, status=status.HTTP_400_BAD_REQUEST
            )

        file_content = file.read()

        data = {
            "name": name,
            "version": "v1",
            "file_name": file.name,
            "is_active": True,
            "laboratory": laboratory,
            "department": request.data.get("department"),
        }

        serializer = self.get_serializer(data=data)
        serializer.is_valid(raise_exception=True)

        # Проверяем существование активного шаблона
        if ExcelTemplate.objects.filter(
            name=name,
            laboratory=laboratory,
            department=request.data.get("department"),
            is_active=True,
        ).exists():
            return Response(
                {
                    "error": "Активный шаблон с таким именем уже существует для данной лаборатории и подразделения"
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        template = serializer.save(file=file_content)

        return Response(serializer.data, status=status.HTTP_201_CREATED)

    def retrieve(self, request, *args, **kwargs):
        instance = self.get_object()
        logger.info(
            f"Запрос шаблона: id={instance.id}, name={instance.name}, version={instance.version}"
        )
        logger.info(f"Параметры запроса: {request.query_params}")

        if request.query_params.get("download") == "true":
            logger.info(f"Скачивание файла: {instance.file_name}")

            response = HttpResponse(
                instance.file,
                content_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            )
            response["Content-Disposition"] = (
                f'attachment; filename="{instance.file_name}"'
            )
            return response
        return super().retrieve(request, *args, **kwargs)

    @action(detail=True, methods=["post"])
    def update_template(self, request, pk=None):
        """
        Обновляет существующий шаблон, создавая новую версию
        """
        current_template = self.get_object()

        next_version = current_template.deactivate()

        new_template = ExcelTemplate.objects.create(
            name=current_template.name,
            version=next_version,
            file=request.data.get("file", current_template.file),
            file_name=current_template.file_name,
            is_active=True,
            laboratory=current_template.laboratory,
            department=current_template.department,
        )

        serializer = self.get_serializer(new_template)
        return Response(serializer.data)

    @action(detail=True, methods=["patch"])
    def update_selection_conditions(self, request, pk=None):
        """
        Обновляет условия отбора для шаблона
        """
        template = self.get_object()

        selection_conditions = request.data.get("selection_conditions")
        if not isinstance(selection_conditions, list):
            return Response(
                {"error": "Условия отбора должны быть списком"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Проверяем, что каждый элемент содержит только name и unit
        for condition in selection_conditions:
            if not isinstance(condition, dict):
                return Response(
                    {"error": "Каждое условие должно быть объектом"},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            if not all(key in condition for key in ["name", "unit"]):
                return Response(
                    {"error": "Каждое условие должно содержать поля 'name' и 'unit'"},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            if len(condition.keys()) > 2:
                return Response(
                    {
                        "error": "Каждое условие должно содержать только поля 'name' и 'unit'"
                    },
                    status=status.HTTP_400_BAD_REQUEST,
                )

        # Создаем новую версию шаблона
        next_version = template.deactivate()

        new_template = ExcelTemplate.objects.create(
            name=template.name,
            version=next_version,
            file=template.file,
            file_name=template.file_name,
            is_active=True,
            laboratory=template.laboratory,
            department=template.department,
            selection_conditions=selection_conditions,
        )

        serializer = self.get_serializer(new_template)
        return Response(serializer.data)

    @action(detail=True, methods=["patch"])
    def update_accreditation_header_row(self, request, pk=None):
        """
        Обновляет номер строки шапки аккредитации для шаблона
        """
        template = self.get_object()

        accreditation_header_row = request.data.get("accreditation_header_row")
        if (
            not isinstance(accreditation_header_row, int)
            or accreditation_header_row < 1
        ):
            return Response(
                {"error": "Номер строки должен быть положительным целым числом"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Обновляем существующий шаблон без создания новой версии
        template.accreditation_header_row = accreditation_header_row
        template.save()

        serializer = self.get_serializer(template)
        return Response(serializer.data)


@api_view(["POST"])
@permission_classes([AllowAny])
def save_excel(request):
    """
    Сохранение изменений шаблона протокола
    """
    try:
        data = json.loads(request.POST.get("data", "[]"))
        styles = json.loads(request.POST.get("styles", "{}"))
        template_id = request.POST.get("template_id")
        section = request.POST.get("section")

        if not template_id:
            return Response({"error": "Не указан ID шаблона"}, status=400)

        # Получаем текущий шаблон
        current_template = ExcelTemplate.objects.get(id=template_id)

        # Деактивируем текущий шаблон и получаем следующую версию
        next_version = current_template.deactivate()

        file_stream = BytesIO(current_template.file)
        workbook = load_workbook(file_stream, data_only=False)
        worksheet = workbook.active

        # В зависимости от типа протокола применяем разную логику
        if section == "header":
            # Находим существующие метки в файле
            start_header_row = None
            end_header_row = None
            for row_idx in range(1, worksheet.max_row + 1):
                cell_value = worksheet.cell(row=row_idx, column=1).value
                if cell_value == "{{start_header}}":
                    start_header_row = row_idx
                elif cell_value == "{{end_header}}":
                    end_header_row = row_idx

            # Проверяем наличие меток
            if start_header_row is None or end_header_row is None:
                error_message = "В файле не найдены метки {{start_header}} и {{end_header}}. Добавьте метки в шаблон для редактирования шапки."
                logger.error(error_message)
                return Response(
                    {"error": error_message},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            # Если нужно больше места между метками
            if end_header_row - start_header_row - 1 < len(data):
                # Сдвигаем данные после end_header вниз
                shift = len(data) - (end_header_row - start_header_row - 1)
                for row_idx in range(worksheet.max_row, end_header_row - 1, -1):
                    for col_idx in range(1, worksheet.max_column + 1):
                        source_cell = worksheet.cell(row=row_idx, column=col_idx)
                        target_cell = worksheet.cell(
                            row=row_idx + shift, column=col_idx
                        )

                        # Если исходная ячейка объединена, находим основную ячейку
                        if isinstance(source_cell, MergedCell):
                            for merge_range in worksheet.merged_cells.ranges:
                                min_row = merge_range.min_row
                                max_row = merge_range.max_row
                                min_col = merge_range.min_col
                                max_col = merge_range.max_col

                                if (
                                    min_row <= row_idx <= max_row
                                    and min_col <= col_idx <= max_col
                                ):
                                    source_cell = worksheet.cell(
                                        row=min_row, column=min_col
                                    )
                                    # Создаем новый диапазон объединения со сдвигом
                                    worksheet.merge_cells(
                                        start_row=min_row + shift,
                                        start_column=min_col,
                                        end_row=max_row + shift,
                                        end_column=max_col,
                                    )
                                    break

                        # Копируем значение и стили
                        if not isinstance(target_cell, MergedCell):
                            target_cell.value = source_cell.value
                            if source_cell.has_style:
                                target_cell._style = copy(source_cell._style)
                end_header_row += shift

            # Сохраняем информацию об объединенных ячейках
            merged_ranges = []
            for merge_range in worksheet.merged_cells.ranges:
                if start_header_row < merge_range.min_row < end_header_row:
                    merged_ranges.append(
                        {
                            "min_row": merge_range.min_row,
                            "max_row": merge_range.max_row,
                            "min_col": merge_range.min_col,
                            "max_col": merge_range.max_col,
                        }
                    )

            # Очищаем старые данные между метками и разъединяем ячейки
            for row_idx in range(start_header_row + 1, end_header_row):
                # Находим и удаляем объединения ячеек в этой области
                ranges_to_remove = []
                for merge_range in worksheet.merged_cells.ranges:
                    min_row = merge_range.min_row
                    max_row = merge_range.max_row

                    if min_row <= row_idx <= max_row:
                        ranges_to_remove.append(merge_range)

                for merge_range in ranges_to_remove:
                    worksheet.unmerge_cells(
                        start_row=merge_range.min_row,
                        start_column=merge_range.min_col,
                        end_row=merge_range.max_row,
                        end_column=merge_range.max_col,
                    )

                worksheet.cell(row=row_idx, column=1).value = None

            # Записываем новые данные
            for idx, row_data in enumerate(data):
                value = str(row_data[0]) if row_data[0] is not None else ""
                target_row = start_header_row + 1 + idx
                target_col = 1
                cell = worksheet.cell(row=target_row, column=target_col)
                cell.value = value

                # Применяем стили, если они есть для данной ячейки
                cell_key = f"{idx}-0"
                if styles and cell_key in styles:
                    style = styles[cell_key]

                    font_size = style.get("fontSize", "14")
                    if isinstance(font_size, str):
                        font_size = font_size.replace("px", "")
                        try:
                            font_size = int(float(font_size))
                        except (ValueError, TypeError):
                            font_size = 14

                    font = Font(
                        name="Times New Roman",
                        bold=style.get("fontWeight") == "bold",
                        italic=style.get("fontStyle") == "italic",
                        size=font_size,
                    )
                    cell.font = font

                    horizontal_align = "center"
                    if style.get("textAlign") == "left":
                        horizontal_align = "left"
                    elif style.get("textAlign") == "right":
                        horizontal_align = "right"

                    alignment = Alignment(
                        horizontal=horizontal_align,
                        vertical="center",
                        wrap_text=True,
                    )
                    cell.alignment = alignment

            # Восстанавливаем объединенные ячейки
            for merge_info in merged_ranges:
                worksheet.merge_cells(
                    start_row=merge_info["min_row"],
                    start_column=merge_info["min_col"],
                    end_row=merge_info["max_row"],
                    end_column=merge_info["max_col"],
                )

        else:
            logger.error(f"Неизвестная секция для редактирования: {section}")
            return Response(
                {"error": f"Неизвестная секция: {section}"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        output = BytesIO()
        workbook.save(output)
        file_content = output.getvalue()

        # Создаем новый шаблон с измененным содержимым
        new_template = ExcelTemplate.objects.create(
            name=current_template.name,
            version=next_version,
            file=file_content,
            file_name=current_template.file_name,
            is_active=True,
            laboratory=current_template.laboratory,
            department=current_template.department,
        )

        return Response(
            {
                "message": "Файл успешно обновлен",
                "version": next_version,
                "template_id": new_template.id,
            },
            status=status.HTTP_200_OK,
        )

    except Exception as e:
        logger.error(f"Ошибка при сохранении Excel файла: {str(e)}", exc_info=True)
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(["GET"])
@permission_classes([AllowAny])
def get_excel_styles(request):
    """
    Получает стили для ячеек в файле
    """
    template_id = request.query_params.get("template_id")
    section = request.query_params.get("section")

    logger.info(f"Запрос стилей Excel: template_id={template_id}, section={section}")

    if not template_id:
        return Response({"error": "Не указан ID шаблона"}, status=400)

    try:
        template = ExcelTemplate.objects.get(id=template_id)
        logger.info(
            f"Найден шаблон: id={template.id}, name={template.name}, version={template.version}"
        )

        file_stream = BytesIO(template.file)
        workbook = load_workbook(file_stream, data_only=False)
        worksheet = workbook.active

        styles = {}

        # Ищем метки в файле
        start_header_row = None
        end_header_row = None
        for row_idx in range(1, worksheet.max_row + 1):
            cell_value = worksheet.cell(row=row_idx, column=1).value
            if cell_value == "{{start_header}}":
                start_header_row = row_idx
            elif cell_value == "{{end_header}}":
                end_header_row = row_idx
                break

        # Проверяем наличие меток
        if start_header_row is None or end_header_row is None:
            error_message = "В файле не найдены метки {{start_header}} и {{end_header}}. Добавьте метки в шаблон для редактирования шапки."
            logger.error(error_message)
            return Response(
                {"error": error_message},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Получаем стили для ячеек между метками
        for row_idx in range(start_header_row + 1, end_header_row):
            cell = worksheet.cell(row=row_idx, column=1)
            cell_key = f"{row_idx - start_header_row - 1}-0"

            if cell.font:
                style = {}
                if cell.font.bold:
                    style["fontWeight"] = "bold"
                if cell.font.italic:
                    style["fontStyle"] = "italic"
                if cell.font.size:
                    style["fontSize"] = f"{cell.font.size}px"

                if style:
                    styles[cell_key] = style

        return Response({"styles": styles}, status=status.HTTP_200_OK)
    except Exception as e:
        logger.error(f"Ошибка при получении стилей Excel: {str(e)}", exc_info=True)
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


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

        # Заполняем данные протокола
        replacements = {
            "{test_protocol_number}": protocol.test_protocol_number,
            "{res_object}": protocol.test_object,
            "{lab_location}": protocol.laboratory_location or "",
            "{subd}": protocol.branch,
            "{sampling_location}": protocol.sampling_location_detail,
            "{tel}": protocol.phone,
            "{sampling_act_number}": protocol.sampling_act_number,
            "{registration_number}": protocol.registration_number,
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
            "{laboratory_activity_dates}": laboratory_activity_dates,
            "{executor}": protocol.executor,
        }

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

                # Получаем общий метод измерения, если он одинаковый
                measurement_methods = set(
                    method.measurement_method for method in group_data["methods"]
                )
                common_measurement_method = (
                    next(iter(measurement_methods))
                    if len(measurement_methods) == 1
                    else None
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

                # В первой строке выводим название группы
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
                        else:
                            # Для остальных полей в первой строке ставим пустые значения
                            for placeholder in [
                                "{result}",
                                "{measurement_error}",
                                "{unit}",
                                "{measurement_method}",
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
                            elif "{result}" in cell.value:
                                cell.value = cell.value.replace(
                                    "{result}", format_result(calc.result)
                                )
                                logger.info(f"Установлен результат: {calc.result}")
                            elif "{measurement_error}" in cell.value:
                                error_value = calc.measurement_error
                                formatted_error = (
                                    f"±{error_value}"
                                    if error_value and error_value != "не указано"
                                    else "не указано"
                                )
                                cell.value = cell.value.replace(
                                    "{measurement_error}",
                                    formatted_error,
                                )
                            elif "{unit}" in cell.value:
                                cell.value = cell.value.replace(
                                    "{unit}", calc.unit or "не указано"
                                )
                            elif "{measurement_method}" in cell.value:
                                if common_measurement_method:
                                    # Выводим метод измерения только для первого метода в группе
                                    cell.value = cell.value.replace(
                                        "{measurement_method}",
                                        common_measurement_method if i == 0 else "",
                                    )
                                else:
                                    # Если методы разные, выводим для каждого свой
                                    cell.value = cell.value.replace(
                                        "{measurement_method}",
                                        calc.research_method.measurement_method
                                        or "не указано",
                                    )
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

                    # Получаем общий метод измерения, если он одинаковый
                    measurement_methods = set(
                        method.measurement_method for method in group_data["methods"]
                    )
                    common_measurement_method = (
                        next(iter(measurement_methods))
                        if len(measurement_methods) == 1
                        else None
                    )

                    logger.info(
                        f"Общий метод измерения для группы: {common_measurement_method}"
                    )

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
                            else:
                                # Для остальных полей в первой строке ставим пустые значения
                                for placeholder in [
                                    "{result}",
                                    "{measurement_error}",
                                    "{unit}",
                                    "{measurement_method}",
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
                                        f"±{error_value}"
                                        if error_value and error_value != "не указано"
                                        else "не указано"
                                    )
                                    cell.value = cell.value.replace(
                                        "{measurement_error}",
                                        formatted_error,
                                    )
                                elif "{unit}" in cell.value:
                                    cell.value = cell.value.replace(
                                        "{unit}", calc.unit or "не указано"
                                    )
                                elif "{measurement_method}" in cell.value:
                                    if common_measurement_method:
                                        # Выводим метод измерения только для первого метода в группе
                                        cell.value = cell.value.replace(
                                            "{measurement_method}",
                                            common_measurement_method if i == 0 else "",
                                        )
                                    else:
                                        # Если методы разные, выводим для каждого свой
                                        cell.value = cell.value.replace(
                                            "{measurement_method}",
                                            calc.research_method.measurement_method
                                            or "не указано",
                                        )
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
                                f"±{error_value}"
                                if error_value and error_value != "не указано"
                                else "не указано"
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

        # Сначала находим все диапазоны с двойными фигурными скобками
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
        skip_rows_with_braces = set()
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
                skip_rows_with_braces.update(range(start_row, end_row + 1))

        # Создаем словарь для маппинга исходных строк в целевые
        row_mapping = {}
        target_row = 1

        # Сначала определяем маппинг строк
        for source_row in range(1, source_worksheet.max_row + 1):
            skip_row = False

            # Проверяем, находится ли строка в списке на пропуск
            if source_row in skip_rows_with_braces:
                skip_row = True
                continue

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
                # Добавляем текущий набор строк в список листов
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


@api_view(["GET"])
@permission_classes([AllowAny])
def get_sampling_locations(request):
    """
    Получает список мест отбора проб
    """
    branch = request.query_params.get("branch")
    if not branch:
        return Response(
            {"error": "Необходимо указать филиал"}, status=status.HTTP_400_BAD_REQUEST
        )

    locations = (
        Protocol.objects.filter(branch=branch, is_deleted=False)
        .values("id", "sampling_location_detail", "phone")
        .distinct()
    )

    return Response(locations)


@api_view(["GET"])
@permission_classes([AllowAny])
def get_branches(request):
    """
    Получает список уникальных филиалов
    """
    branches = (
        Protocol.objects.filter(is_deleted=False)
        .values_list("branch", flat=True)
        .distinct()
        .order_by("branch")
    )
    return Response(list(branches))
