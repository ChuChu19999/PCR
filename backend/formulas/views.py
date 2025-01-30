from rest_framework import viewsets, status
from rest_framework.response import Response
from django.utils import timezone
from .models import Laboratory, Department
from .serializers import LaboratorySerializer, DepartmentSerializer
from django.shortcuts import get_object_or_404
from rest_framework.decorators import api_view
import os
from django.conf import settings
from openpyxl import load_workbook
from openpyxl.styles import Font
import logging
import requests
from requests.exceptions import RequestException

logger = logging.getLogger(__name__)


class LaboratoryViewSet(viewsets.ModelViewSet):
    serializer_class = LaboratorySerializer

    def get_queryset(self):
        return Laboratory.objects.filter(is_deleted=False)

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        instance.mark_as_deleted()
        return Response(status=status.HTTP_204_NO_CONTENT)


class DepartmentViewSet(viewsets.ModelViewSet):
    serializer_class = DepartmentSerializer

    def get_queryset(self):
        return Department.objects.filter(is_deleted=False).select_related("laboratory")

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        instance.is_deleted = True
        instance.deleted_at = timezone.now()
        instance.save()
        return Response(status=status.HTTP_204_NO_CONTENT)

    def create(self, request, *args, **kwargs):
        laboratory_id = request.data.get("laboratory")
        get_object_or_404(Laboratory, id=laboratory_id)
        return super().create(request, *args, **kwargs)


@api_view(["POST"])
def save_excel(request):
    try:
        data = request.data.get("data")
        styles = request.data.get("styles", {})

        logger.info(f"Получены данные для сохранения: {data}")
        logger.info(f"Получены стили для сохранения: {styles}")

        if not data:
            logger.error("Данные не предоставлены")
            return Response(
                {"error": "Данные не предоставлены"}, status=status.HTTP_400_BAD_REQUEST
            )

        file_path = os.path.join(settings.MEDIA_ROOT, "shablon.xlsx")
        logger.info(f"Путь к файлу Excel: {file_path}")

        if not os.path.exists(file_path):
            logger.error(f"Файл не найден: {file_path}")
            return Response(
                {"error": "Файл шаблона не найден"}, status=status.HTTP_404_NOT_FOUND
            )

        workbook = load_workbook(file_path, data_only=False)
        worksheet = workbook.active

        for row_idx, row_data in enumerate(data):
            if row_idx < 8:  # Обновляем только первые 8 строк
                cell = worksheet.cell(row=row_idx + 1, column=1, value=row_data[0])
                logger.info(
                    f"Обновлена ячейка [{row_idx + 1}, 1] значением: {row_data[0]}"
                )

                # Применяем стили, если они есть для данной ячейки
                cell_key = f"{row_idx}-0"  # Формат ключа как в ExcelEditor
                if cell_key in styles:
                    style = styles[cell_key]
                    logger.info(f"Применение стилей для ячейки {cell_key}: {style}")

                    # Получаем размер шрифта и конвертируем его в целое число
                    font_size = style.get("fontSize", "14")
                    if isinstance(font_size, str):
                        # Удаляем 'px' и конвертируем в float, затем в int
                        font_size = font_size.replace("px", "")
                        try:
                            font_size = int(float(font_size))
                        except (ValueError, TypeError):
                            font_size = 14  # Значение по умолчанию

                    font = Font(
                        name="Times New Roman",
                        bold=style.get("fontWeight") == "bold",
                        italic=style.get("fontStyle") == "italic",
                        size=font_size,
                    )
                    cell.font = font

                    logger.info(
                        f"Стили применены: bold={font.bold}, italic={font.italic}, size={font.size}"
                    )

        logger.info("Сохранение файла...")
        workbook.save(file_path)
        logger.info(f"Excel файл успешно обновлен со стилями")

        return Response(
            {"message": "Файл успешно обновлен", "applied_styles": styles},
            status=status.HTTP_200_OK,
        )
    except Exception as e:
        logger.error(f"Ошибка при сохранении Excel файла: {str(e)}", exc_info=True)
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(["GET"])
def get_excel_styles(request):
    try:
        file_path = os.path.join(settings.MEDIA_ROOT, "shablon.xlsx")
        logger.info(f"Получение стилей из файла: {file_path}")

        workbook = load_workbook(file_path, data_only=False)
        worksheet = workbook.active

        styles = {}

        # Получаем стили для первых 8 строк первой колонки
        for row_idx in range(8):
            cell = worksheet.cell(row=row_idx + 1, column=1)
            cell_key = f"{row_idx}-0"

            if cell.font:
                style = {}
                if cell.font.bold:
                    style["fontWeight"] = "bold"
                    logger.info(f"Ячейка {cell_key}: установлен жирный шрифт")
                if cell.font.italic:
                    style["fontStyle"] = "italic"
                    logger.info(f"Ячейка {cell_key}: установлен курсив")
                if cell.font.size:
                    style["fontSize"] = f"{cell.font.size}px"
                    logger.info(
                        f"Ячейка {cell_key}: установлен размер шрифта {cell.font.size}px"
                    )

                if style:
                    styles[cell_key] = style
                    logger.info(f"Добавлены стили для ячейки {cell_key}: {style}")

        logger.info(f"Всего найдено стилей: {len(styles)}")
        logger.info(f"Возвращаемые стили: {styles}")
        return Response({"styles": styles}, status=status.HTTP_200_OK)
    except Exception as e:
        logger.error(f"Ошибка при получении стилей Excel: {str(e)}", exc_info=True)
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(["GET"])
def check_gazprom_api(request):
    try:
        response = requests.get("https://itc-fhi-dev.gd-urengoy.gazprom.ru/api/", timeout=5)
        if response.status_code == 200:
            return Response(status=status.HTTP_200_OK)
    except RequestException:
        pass
    return None
