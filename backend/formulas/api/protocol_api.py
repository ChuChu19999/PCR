from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from ..models import Protocol, Sample


@api_view(["GET"])
@permission_classes([AllowAny])
def search_protocols(request):
    """
    Поиск протоколов по тексту с поддержкой автодополнения
    """
    search_query = request.query_params.get("search", "")
    laboratory_id = request.query_params.get("laboratory")
    department_id = request.query_params.get("department")

    if len(search_query) < 1:
        return Response([])

    queryset = Protocol.objects.filter(is_deleted=False)

    if laboratory_id:
        queryset = queryset.filter(laboratory_id=laboratory_id)

    if department_id:
        queryset = queryset.filter(department_id=department_id)

    protocols = (
        queryset.filter(test_protocol_number__icontains=search_query)
        .values("id", "test_protocol_number")
        .distinct()
        .order_by("test_protocol_number")[:10]
    )

    return Response(list(protocols))


@api_view(["GET"])
@permission_classes([AllowAny])
def get_sampling_locations(request):
    """
    Получает список мест отбора проб с поддержкой поиска по частичному совпадению.
    Фильтрует по лаборатории и подразделению, если они указаны.
    """
    search_query = request.query_params.get("search", "")
    laboratory_id = request.query_params.get("laboratory")
    department_id = request.query_params.get("department")

    if len(search_query) < 2:
        return Response([])

    queryset = Sample.objects.filter(is_deleted=False)

    if laboratory_id:
        queryset = queryset.filter(laboratory_id=laboratory_id)

    if department_id:
        queryset = queryset.filter(department_id=department_id)

    locations = (
        queryset.filter(sampling_location_detail__icontains=search_query)
        .values_list("sampling_location_detail", flat=True)
        .distinct()
        .order_by("sampling_location_detail")
    )

    return Response(list(locations))


@api_view(["GET"])
@permission_classes([AllowAny])
def get_branches(request):
    """
    Получает список уникальных филиалов с поддержкой поиска по частичному совпадению
    """
    search_query = request.query_params.get("search", "")

    if len(search_query) < 2:
        return Response([])

    branches = (
        Protocol.objects.filter(is_deleted=False, branch__icontains=search_query)
        .values_list("branch", flat=True)
        .distinct()
        .order_by("branch")
    )
    return Response(list(branches))
