from rest_framework import viewsets, status
from rest_framework.response import Response
from django.db.models import Q
from django.utils import timezone
from rest_framework.decorators import api_view, permission_classes, action
from rest_framework.permissions import AllowAny
from ..models import Equipment
from ..serializers import EquipmentSerializer


@permission_classes([AllowAny])
class EquipmentViewSet(viewsets.ModelViewSet):
    serializer_class = EquipmentSerializer
    queryset = Equipment.objects.all()

    def get_queryset(self):
        queryset = super().get_queryset()
        laboratory = self.request.query_params.get("laboratory")
        department = self.request.query_params.get("department")
        is_active = self.request.query_params.get("is_active")

        if laboratory:
            queryset = queryset.filter(laboratory_id=laboratory)
            if department:
                queryset = queryset.filter(department_id=department)

        queryset = queryset.filter(is_deleted=False)

        if is_active is not None:
            is_active = is_active.lower() == "true"
            queryset = queryset.filter(is_active=is_active)

        return queryset.order_by("name")

    def perform_destroy(self, instance):
        instance.is_deleted = True
        instance.deleted_at = timezone.now()

        try:
            instance.deleted_by = self.request.user.preferred_username
        except (AttributeError, TypeError):
            instance.deleted_by = None

        instance.save()

    def create(self, request, *args, **kwargs):
        # При создании нового прибора устанавливаем версию v1 и активный статус
        request.data["version"] = "v1"
        request.data["is_active"] = True

        return super().create(request, *args, **kwargs)

    def update(self, request, *args, **kwargs):
        instance = self.get_object()

        # Если это запрос на деактивацию
        if request.data.get("is_active") is False:
            instance.is_active = False
            instance.save()
            return Response(status=status.HTTP_200_OK)

        return super().update(request, *args, **kwargs)

    @action(detail=False, methods=["get"])
    def active_equipment(self, request):
        """Получение списка активного оборудования для лаборатории и подразделения"""
        laboratory_id = request.query_params.get("laboratory")
        department_id = request.query_params.get("department")

        if not laboratory_id:
            return Response(
                {"error": "Необходимо указать лабораторию"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        queryset = self.queryset.filter(
            laboratory_id=laboratory_id, is_active=True, is_deleted=False
        )

        if department_id:
            queryset = queryset.filter(department_id=department_id)

        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)
