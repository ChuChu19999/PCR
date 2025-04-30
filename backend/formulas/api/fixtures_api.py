import os
import json
import logging
from django.conf import settings
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from ..models import ResearchObject

logger = logging.getLogger(__name__)


@api_view(["GET"])
@permission_classes([AllowAny])
def get_fixtures(request):
    """
    Получает список всех доступных фикстур из папки research_methods_fixtures.

    Параметры запроса:
        object_type (str): Тип объекта (oil_products или condensate)
    """
    try:
        logger.info("Начало получения фикстур")

        object_type = request.query_params.get("object_type")

        if not object_type:
            return Response(
                {"error": "Не указан параметр object_type"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if object_type not in ResearchObject.ObjectType.values:
            return Response(
                {"error": f"Недопустимый тип объекта: {object_type}"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        base_fixtures_path = os.path.join(
            settings.BASE_DIR, "formulas", "research_methods_fixtures"
        )

        fixtures_path = os.path.join(base_fixtures_path, object_type)

        if not os.path.exists(fixtures_path):
            logger.error(f"Папка с фикстурами не найдена: {fixtures_path}")
            return Response(
                {"error": "Папка с фикстурами не найдена"},
                status=status.HTTP_404_NOT_FOUND,
            )

        fixtures_data = {}
        for filename in os.listdir(fixtures_path):
            if filename.endswith(".json"):
                file_path = os.path.join(fixtures_path, filename)
                try:
                    with open(file_path, "r", encoding="utf-8") as file:
                        fixture_name = os.path.splitext(filename)[0]
                        fixtures_data[fixture_name] = json.load(file)
                        logger.info(f"Загружен файл фикстур: {filename}")
                except json.JSONDecodeError as e:
                    logger.error(f"Ошибка при парсинге JSON файла {filename}: {str(e)}")
                    continue
                except Exception as e:
                    logger.error(f"Ошибка при чтении файла {filename}: {str(e)}")
                    continue

        if not fixtures_data:
            logger.warning("Не найдено ни одной фикстуры")
            return Response(
                {"message": "Фикстуры не найдены"}, status=status.HTTP_404_NOT_FOUND
            )

        logger.info(f"Успешно загружено фикстур: {len(fixtures_data)}")
        return Response(fixtures_data, status=status.HTTP_200_OK)

    except Exception as e:
        logger.error(
            f"Необработанная ошибка при получении фикстур: {str(e)}", exc_info=True
        )
        return Response(
            {"error": f"Ошибка при получении фикстур: {str(e)}"},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )
