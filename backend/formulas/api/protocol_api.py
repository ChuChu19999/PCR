from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from ..models import Protocol


@api_view(["GET"])
@permission_classes([AllowAny])
def get_sampling_locations(request):
    """
    Получает список мест отбора проб с поддержкой поиска по частичному совпадению
    """
    search_query = request.query_params.get("search", "")

    if len(search_query) < 2:
        return Response([])

    locations = (
        Protocol.objects.filter(
            is_deleted=False, sampling_location_detail__icontains=search_query
        )
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
